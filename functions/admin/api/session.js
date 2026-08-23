// ============================================================================
//  session.js — the login for /admin/.   Route: /admin/api/session
//
//    POST   /admin/api/session   { username, password }  → log in  (sets cookie)
//    GET    /admin/api/session                           → who am I + CSRF token
//    DELETE /admin/api/session                           → log out (clears cookie)
//
//  This file is also the shared security library for the other admin
//  endpoints — they import requireAuth() from here.
//
//  HOW THE LOGIN IS KEPT SAFE
//  --------------------------------------------------------------------------
//  · The password is never stored, only a PBKDF2-SHA256 hash of it.
//  · The hash comparison is constant-time, so it leaks no timing information.
//  · A successful login returns a cookie that is SIGNED with HMAC-SHA256.
//    Nothing about the logged-in state is stored in the browser in a form the
//    browser could tamper with — change one byte and the signature fails.
//  · The cookie is HttpOnly (JavaScript cannot read it, so an XSS bug cannot
//    steal the session), Secure, SameSite=Strict and scoped to /admin.
//  · Every state-changing request must ALSO carry a matching CSRF token and
//    come from this same origin.
//  · Failed logins are rate-limited per IP with an increasing lockout.
//  · If the server is misconfigured, login FAILS. It never falls back to
//    "let everyone in".
// ============================================================================

const COOKIE_NAME = "pw_admin_session";
const COOKIE_PATH = "/admin";
const DEFAULT_TTL = 43200;            // 12 hours, in seconds
const MIN_LOGIN_MS = 350;             // every login attempt takes at least this

// Convenience credentials that work ONLY on http://localhost while developing.
// They are ignored the moment the site runs on a real hostname, and ignored
// as soon as you configure ADMIN_PASSWORD_HASH yourself.
const DEV_USERNAME = "password";
const DEV_PASSWORD_HASH =
  "pbkdf2$sha256$310000$H/mMpkarxzu3YkN/SmvUvQ==$tV5N+0AnZjnQyzBHopiiNob0Mk9vNWCIESo+eTy9VM4=";

// ------------------------------------------------------------------ routes --

export async function onRequestPost(context) {
  const { request, env } = context;
  const startedAt = Date.now();

  if (!sameOrigin(request)) return json({ error: "Cross-site request refused." }, 403);
  if (!isJSONRequest(request)) return json({ error: "Expected application/json." }, 415);

  const ip = clientIP(request);
  const limit = rateLimit.check(ip);
  if (!limit.allowed) {
    return json({ error: "Too many attempts. Try again in " + limit.retryAfter + "s." },
      429, { "Retry-After": String(limit.retryAfter) });
  }

  let body;
  try {
    body = await readJSON(request, 4096);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const creds = credentials(request, env);
  if (!creds) {
    // Misconfigured on purpose-fail-closed: no password configured, and we are
    // not on localhost, so there is nothing safe to check against.
    return json({ error: "Login is not configured on this server." }, 503);
  }

  let ok = false;
  try {
    // Both checks always run, so a wrong username costs the same as a wrong
    // password — an attacker cannot learn which half they got right.
    const userOK = timingSafeEqualStr(username, creds.username);
    const passOK = await verifyPassword(password, creds.passwordHash);
    ok = userOK && passOK;
  } catch (e) {
    console.error("login: password hash is unusable —", e.message);
    return json({ error: "Login is not configured on this server." }, 503);
  }

  if (!ok) {
    rateLimit.fail(ip);
    await padTo(startedAt, MIN_LOGIN_MS);
    return json({ error: "Wrong username or password." }, 401);
  }

  const secret = await sessionSecret(request, env);
  if (!secret) return json({ error: "Login is not configured on this server." }, 503);

  rateLimit.success(ip);
  const ttl = clampInt(env.SESSION_TTL, DEFAULT_TTL, 60, 60 * 60 * 24 * 7);
  const csrf = randomToken();
  const token = await signSession({ u: creds.username, csrf }, secret, ttl);

  await padTo(startedAt, MIN_LOGIN_MS);
  return json({ ok: true, user: creds.username, csrf: csrf, expiresIn: ttl }, 200, {
    "Set-Cookie": buildCookie(token, ttl, isSecureRequest(request))
  });
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context.request, context.env);
  if (!auth.ok) return json({ error: auth.error, authenticated: false }, 401);
  return json({
    ok: true,
    authenticated: true,
    user: auth.user,
    csrf: auth.csrf,
    via: auth.via,
    canPublish: !!ghConfigured(context.env)
  });
}

export async function onRequestDelete(context) {
  const { request } = context;
  if (!sameOrigin(request)) return json({ error: "Cross-site request refused." }, 403);
  return json({ ok: true }, 200, {
    "Set-Cookie": buildCookie("", 0, isSecureRequest(request))
  });
}

// ============================================================================
//  Shared helpers — imported by publish.js, upload.js and _middleware.js
// ============================================================================

// The single gate every protected admin route goes through.
// Returns { ok, user, csrf, via } or { ok:false, error, status }.
export async function requireAuth(request, env) {
  // Route 1 — Cloudflare Access, if the deployment uses it.
  const accessJWT = request.headers.get("Cf-Access-Jwt-Assertion");
  if (accessJWT && env.CF_ACCESS_TEAM_DOMAIN) {
    try {
      const payload = await verifyAccessJWT(accessJWT, env);
      const email = String(payload.email || "").toLowerCase();
      const allowed = listEnv(env.ADMIN_EMAILS).map((s) => s.toLowerCase());
      if (allowed.length && !allowed.includes(email)) {
        return { ok: false, error: "This account is not allowed to publish.", status: 403 };
      }
      return { ok: true, user: payload.email || "access-user", csrf: null, via: "access" };
    } catch (e) {
      return { ok: false, error: "Access token rejected: " + e.message, status: 401 };
    }
  }

  // Route 2 — the username/password session cookie.
  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return { ok: false, error: "Not signed in.", status: 401 };

  const secret = await sessionSecret(request, env);
  if (!secret) return { ok: false, error: "Login is not configured.", status: 503 };

  const payload = await verifySession(raw, secret);
  if (!payload) return { ok: false, error: "Session expired or invalid.", status: 401 };

  return { ok: true, user: payload.u, csrf: payload.csrf, via: "password" };
}

// For anything that CHANGES data: same-origin + valid session + CSRF token.
export async function requireWriteAuth(request, env) {
  if (!sameOrigin(request)) {
    return { ok: false, error: "Cross-site request refused.", status: 403 };
  }
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth;

  // Cloudflare Access sessions carry no CSRF token of ours; they are already
  // protected by Access's own origin-bound cookie.
  if (auth.via === "password") {
    const sent = request.headers.get("X-CSRF-Token") || "";
    if (!auth.csrf || !timingSafeEqualStr(sent, auth.csrf)) {
      return { ok: false, error: "Missing or wrong CSRF token. Reload the page.", status: 403 };
    }
  }
  return auth;
}

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }, extraHeaders)
  });
}

// Reject anything that did not start on this site. Blocks classic CSRF, and
// also blocks a form POST smuggled in as text/plain from another page.
export function sameOrigin(request) {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function isJSONRequest(request) {
  return /^application\/json\s*(;|$)/i.test(request.headers.get("Content-Type") || "");
}

// Read a JSON body, refusing anything larger than `limit` bytes.
export async function readJSON(request, limit) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared && declared > limit) throw new Error("body too large");
  const text = await request.text();
  if (text.length > limit) throw new Error("body too large");
  return JSON.parse(text);
}

export function listEnv(value) {
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function ghConfigured(env) {
  return !!(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO);
}

export const SESSION_COOKIE = COOKIE_NAME;

// ------------------------------------------------------- credentials --------

function credentials(request, env) {
  const hash = String(env.ADMIN_PASSWORD_HASH || "").trim();
  if (hash) {
    return {
      username: String(env.ADMIN_USERNAME || "admin").trim(),
      passwordHash: hash
    };
  }
  // No password configured. Allow the built-in development pair ONLY when the
  // site is being served from localhost AND nothing about this deployment
  // looks like production.
  if (devDefaultsAllowed(request, env)) {
    console.warn(
      "[admin] Using the built-in localhost development login " +
      "(username \"" + DEV_USERNAME + "\"). Set ADMIN_PASSWORD_HASH before deploying."
    );
    return { username: DEV_USERNAME, passwordHash: DEV_PASSWORD_HASH };
  }
  return null;
}

function devDefaultsAllowed(request, env) {
  if (String(env.ENVIRONMENT || "").toLowerCase() === "production") return false;
  if (env.GITHUB_TOKEN) return false;          // a configured deployment
  if (env.CF_ACCESS_TEAM_DOMAIN) return false; // a configured deployment
  return isLocalHost(request);
}

function isLocalHost(request) {
  let host;
  try {
    host = new URL(request.url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === "localhost" || host === "127.0.0.1" || host === "::1" ||
         host === "[::1]" || host.endsWith(".localhost");
}

function isSecureRequest(request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}

// ------------------------------------------------------- password hashing ---

// Format:  pbkdf2$sha256$<iterations>$<saltBase64>$<hashBase64>
async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") throw new Error("bad hash format");
  const hashName = parts[1].toLowerCase() === "sha512" ? "SHA-512" : "SHA-256";
  const iterations = parseInt(parts[2], 10);
  if (!(iterations > 0 && iterations <= 2000000)) throw new Error("bad iteration count");

  const salt = base64ToBytes(parts[3]);
  const expected = base64ToBytes(parts[4]);

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: hashName }, key, expected.length * 8
  );
  return timingSafeEqualBytes(new Uint8Array(bits), expected);
}

// ------------------------------------------------------- signed sessions ----

let cachedSecretKey = null;
let cachedSecretSource = null;
let ephemeralSecret = null;

async function sessionSecret(request, env) {
  let raw = String(env.SESSION_SECRET || "").trim();

  if (!raw || raw.startsWith("CHANGE-ME")) {
    // No signing key configured. On localhost, invent one that lives as long
    // as this dev server does — restarting wrangler simply logs you out.
    if (!devDefaultsAllowed(request, env)) return null;
    if (!ephemeralSecret) {
      ephemeralSecret = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
      console.warn("[admin] No SESSION_SECRET set — using a temporary one for this dev session.");
    }
    raw = ephemeralSecret;
  }

  if (cachedSecretKey && cachedSecretSource === raw) return cachedSecretKey;
  cachedSecretKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(raw),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  cachedSecretSource = raw;
  return cachedSecretKey;
}

async function signSession(data, key, ttl) {
  const now = Math.floor(Date.now() / 1000);
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
    u: data.u, csrf: data.csrf, iat: now, exp: now + ttl
  })));
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return payload + "." + bytesToB64url(new Uint8Array(sig));
}

async function verifySession(token, key) {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let sigBytes;
  try {
    sigBytes = b64urlToBytes(sig);
  } catch {
    return null;
  }
  const valid = await crypto.subtle.verify(
    "HMAC", key, sigBytes, new TextEncoder().encode(payload)
  );
  if (!valid) return null;

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!data.exp || now >= data.exp) return null;
  if (data.iat && data.iat > now + 60) return null;   // issued in the future
  if (!data.u) return null;
  return data;
}

function buildCookie(value, maxAge, secure) {
  return [
    COOKIE_NAME + "=" + value,
    "Path=" + COOKIE_PATH,
    "Max-Age=" + maxAge,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : null
  ].filter(Boolean).join("; ");
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// -------------------------------------------------- Cloudflare Access -------

async function verifyAccessJWT(token, env) {
  // An audience is mandatory. Without it ANY token minted for ANY application
  // in the same Zero Trust team would be accepted here.
  const expectedAud = listEnv(env.CF_ACCESS_AUD);
  if (!expectedAud.length) throw new Error("server missing CF_ACCESS_AUD");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed");

  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const teamDomain = String(env.CF_ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const jwk = await accessSigningKey(teamDomain, header.kid);

  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!valid) throw new Error("bad signature");

  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) throw new Error("expired");
  if (payload.nbf && now < payload.nbf) throw new Error("not yet valid");
  if (payload.iss && payload.iss !== "https://" + teamDomain) throw new Error("wrong issuer");

  const got = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!got.some((a) => expectedAud.includes(a))) throw new Error("audience mismatch");

  return payload;
}

// Cache the signing keys so a flood of bad tokens cannot make us hammer
// Cloudflare (and so a real login is not slowed down by a network round trip).
const jwksCache = { at: 0, keys: null, domain: null };

async function accessSigningKey(teamDomain, kid) {
  const fresh = jwksCache.keys && jwksCache.domain === teamDomain &&
                (Date.now() - jwksCache.at) < 3600000;
  if (fresh) {
    const hit = jwksCache.keys.find((k) => k.kid === kid);
    if (hit) return hit;
  }
  const res = await fetch("https://" + teamDomain + "/cdn-cgi/access/certs");
  if (!res.ok) throw new Error("cannot read signing keys");
  const certs = await res.json();
  jwksCache.keys = certs.keys || [];
  jwksCache.at = Date.now();
  jwksCache.domain = teamDomain;

  const jwk = jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error("unknown signing key");
  return jwk;
}

// ------------------------------------------------------- rate limiting ------

// Best effort: this lives in one server instance's memory, so it slows down a
// determined attacker rather than stopping them outright. For a public
// deployment add a Cloudflare WAF rate-limiting rule on /admin/api/* as well.
const rateLimit = (function () {
  const WINDOW_MS = 15 * 60 * 1000;
  const FREE_ATTEMPTS = 5;
  const MAX_LOCK_MS = 60 * 60 * 1000;
  const attempts = new Map();

  function sweep(now) {
    if (attempts.size < 500) return;
    for (const [key, rec] of attempts) {
      if (now - rec.seen > WINDOW_MS && now > rec.until) attempts.delete(key);
    }
  }

  return {
    check(ip) {
      const now = Date.now();
      const rec = attempts.get(ip);
      if (rec && now < rec.until) {
        return { allowed: false, retryAfter: Math.ceil((rec.until - now) / 1000) };
      }
      return { allowed: true, retryAfter: 0 };
    },
    fail(ip) {
      const now = Date.now();
      sweep(now);
      const rec = attempts.get(ip) || { count: 0, until: 0, seen: now };
      if (now - rec.seen > WINDOW_MS) rec.count = 0;
      rec.count += 1;
      rec.seen = now;
      if (rec.count > FREE_ATTEMPTS) {
        const over = rec.count - FREE_ATTEMPTS;
        rec.until = now + Math.min(1000 * Math.pow(2, over), MAX_LOCK_MS);
      }
      attempts.set(ip, rec);
    },
    success(ip) {
      attempts.delete(ip);
    }
  };
})();

function clientIP(request) {
  return request.headers.get("CF-Connecting-IP") ||
         request.headers.get("X-Forwarded-For") ||
         "unknown";
}

// ------------------------------------------------------------- utilities ----

function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(String(a));
  const eb = new TextEncoder().encode(String(b));
  // Compare a fixed-length digest so differing lengths do not short-circuit.
  let diff = ea.length ^ eb.length;
  const max = Math.max(ea.length, eb.length);
  for (let i = 0; i < max; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

function randomToken() {
  return bytesToB64url(crypto.getRandomValues(new Uint8Array(24)));
}

function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Make every login attempt take the same minimum time.
function padTo(startedAt, ms) {
  const wait = ms - (Date.now() - startedAt);
  return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
}

function base64ToBytes(s) {
  const bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64urlToBytes(s) {
  let t = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return base64ToBytes(t);
}

function bytesToB64url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
