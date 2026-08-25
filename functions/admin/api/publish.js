// ============================================================================
//  publish.js — writes news.json.   Route: /admin/api/publish
//
//    GET   → the current news list, plus the file's SHA (its version stamp)
//    POST  → save a new news list        { news: [...], baseSha: "..." }
//
//  The GitHub token lives ONLY here, as an encrypted environment variable. It
//  is never sent to the browser, and no value from the request is ever used to
//  build the file path — that comes from the server's own configuration.
//
//  Every request must pass requireWriteAuth(): same origin, valid session,
//  matching CSRF token.
// ============================================================================

import { requireAuth, requireWriteAuth, readJSON, isJSONRequest, json, ghConfigured } from "./session.js";

const MAX_ITEMS = 300;
const MAX_BODY_BYTES = 1024 * 1024;         // 1 MB of JSON
const LANGS = ["hy", "en"];

const LIMITS = {
  title: 300,
  excerpt: 600,
  content: 20000,
  imageAlt: 300,
  image: 500,
  slug: 80
};

// ------------------------------------------------------------------ routes --

export async function onRequestGet(context) {
  const auth = await requireAuth(context.request, context.env);
  if (!auth.ok) return json({ error: auth.error }, auth.status || 401);

  const cfg = ghConfig(context.env);
  if (!cfg) return json({ ok: true, configured: false, news: null, sha: null });

  try {
    const file = await readFile(cfg);
    return json({ ok: true, configured: true, news: file.news, sha: file.sha });
  } catch (e) {
    console.error("publish GET:", e.message);
    return json({ error: "Could not read the news file from GitHub." }, 502);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = await requireWriteAuth(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status || 401);
  if (!isJSONRequest(request)) return json({ error: "Expected application/json." }, 415);

  let payload;
  try {
    payload = await readJSON(request, MAX_BODY_BYTES);
  } catch (e) {
    return json({ error: e.message === "body too large" ? "Too much data." : "Invalid JSON body." }, 400);
  }

  const checked = validateNews(payload && payload.news);
  if (checked.error) return json({ error: checked.error }, 400);

  const cfg = ghConfig(env);
  if (!cfg) {
    return json({
      error: "Publishing to GitHub is not configured on this server. " +
             "Use the download button and commit news.json yourself."
    }, 503);
  }

  const content = JSON.stringify(checked.news, null, 2) + "\n";
  if (content.length > MAX_BODY_BYTES) return json({ error: "Too much data." }, 400);

  // The commit message is built here, from the VERIFIED signed-in user.
  // Nothing the browser sends can influence it, so the git history cannot be
  // used to impersonate anyone.
  const action = payload && payload.action === "delete" ? "Delete news item"
               : payload && payload.action === "edit"   ? "Edit news item"
               : "Update news";
  const message = action + " (" + checked.news.length + " items, by " +
                  safeForCommitMessage(auth.user) + ")";

  try {
    const result = await commitFile(cfg, content, message, payload && payload.baseSha);
    return json({ ok: true, sha: result.sha, count: checked.news.length });
  } catch (e) {
    if (e.code === "CONFLICT") {
      return json({
        error: "Someone else saved a change while you were editing. " +
               "Reload the page so you do not overwrite their work.",
        conflict: true
      }, 409);
    }
    // The real GitHub response is logged for the operator but never returned:
    // it can contain repository names, paths and token scope hints.
    console.error("publish POST:", e.message);
    return json({ error: "Could not save to GitHub. Check the server logs." }, 502);
  }
}

// -------------------------------------------------------------- validation --

// Everything that lands in news.json is checked here, field by field. Anything
// unexpected is rejected rather than "cleaned up", and unknown keys are
// dropped — the file can only ever contain the shape we describe below.
function validateNews(news) {
  if (!Array.isArray(news)) return { error: "Body must be { news: [ ... ] }." };
  if (news.length > MAX_ITEMS) return { error: "Too many news items (limit " + MAX_ITEMS + ")." };

  const clean = [];
  const seenIds = new Set();
  const seenSlugs = new Set();

  for (let i = 0; i < news.length; i++) {
    const item = news[i];
    const where = "Item " + (i + 1) + ": ";

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { error: where + "must be an object." };
    }

    const id = Number(item.id);
    if (!Number.isInteger(id) || id < 1 || id > 1e9) return { error: where + "bad id." };
    if (seenIds.has(id)) return { error: where + "duplicate id " + id + "." };
    seenIds.add(id);

    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      return { error: where + "date must look like 2026-08-22." };
    }
    if (isNaN(new Date(item.date + "T00:00:00Z").getTime())) {
      return { error: where + "that date does not exist." };
    }

    const slug = String(item.slug || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
      return { error: where + "slug may use only a-z, 0-9 and hyphens." };
    }
    if (seenSlugs.has(slug)) return { error: where + "duplicate address \"" + slug + "\"." };
    seenSlugs.add(slug);

    const title = translations(item.title, LIMITS.title);
    if (title.error) return { error: where + "title — " + title.error };
    if (!Object.keys(title.value).length) return { error: where + "needs a title." };

    const content = translations(item.content, LIMITS.content);
    if (content.error) return { error: where + "content — " + content.error };
    if (!Object.keys(content.value).length) return { error: where + "needs some content." };

    const excerpt = translations(item.excerpt, LIMITS.excerpt);
    if (excerpt.error) return { error: where + "summary — " + excerpt.error };

    const imageAlt = translations(item.imageAlt, LIMITS.imageAlt);
    if (imageAlt.error) return { error: where + "photo description — " + imageAlt.error };

    const image = String(item.image || "").trim();
    if (image && !isSafeImageRef(image)) {
      return { error: where + "the photo must be an https:// address or a file inside this site." };
    }
    if (image.length > LIMITS.image) return { error: where + "photo address is too long." };

    clean.push({
      id: id,
      slug: slug,
      date: item.date,
      image: image,
      imageAlt: imageAlt.value,
      title: title.value,
      excerpt: excerpt.value,
      content: content.value
    });
  }

  return { news: clean };
}

// A { hy, en, ru } block: only those three keys, only strings, length-capped.
function translations(value, max) {
  if (value === undefined || value === null) return { value: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "must be a set of languages." };

  const out = {};
  for (const key of Object.keys(value)) {
    if (!LANGS.includes(key)) continue;                 // silently drop the rest
    const text = value[key];
    if (text === undefined || text === null || text === "") continue;
    if (typeof text !== "string") return { error: "the " + key + " text must be text." };
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (trimmed.length > max) return { error: "the " + key + " text is too long (limit " + max + ")." };
    out[key] = trimmed;
  }
  return { value: out };
}

// Blocks javascript:, data:, vbscript: and anything else clever. Only a plain
// https address or a file path inside this site is allowed.
function isSafeImageRef(value) {
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(value)) return true;
  if (/^[a-z0-9][a-z0-9._\/-]*\.(jpg|jpeg|png|webp|gif|avif)$/i.test(value) &&
      !value.includes("..")) return true;
  return false;
}

function safeForCommitMessage(user) {
  return String(user || "unknown").replace(/[\r\n]+/g, " ").slice(0, 80);
}

// ------------------------------------------------------------------ GitHub --

function ghConfig(env) {
  if (!ghConfigured(env)) return null;
  return {
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH || "main",
    path: env.GITHUB_PATH || "news.json"
  };
}

function ghHeaders(cfg) {
  return {
    "Authorization": "Bearer " + cfg.token,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "physics-and-we-admin",
    "Content-Type": "application/json"
  };
}

function contentsURL(cfg) {
  return "https://api.github.com/repos/" +
    encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
    "/contents/" + cfg.path.split("/").map(encodeURIComponent).join("/");
}

async function readFile(cfg) {
  const res = await fetch(contentsURL(cfg) + "?ref=" + encodeURIComponent(cfg.branch),
    { headers: ghHeaders(cfg) });

  if (res.status === 404) return { news: [], sha: null };
  if (!res.ok) throw new Error("read " + res.status);

  const data = await res.json();
  let parsed = [];
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(data.content || "")));
  } catch {
    parsed = [];
  }
  return { news: Array.isArray(parsed) ? parsed : (parsed && parsed.news) || [], sha: data.sha };
}

// baseSha is the version the editor started from. If the file has moved on
// since, we refuse the write instead of silently overwriting someone's work.
async function commitFile(cfg, content, message, baseSha) {
  const current = await readFile(cfg);

  if (current.sha && baseSha && current.sha !== baseSha) {
    const err = new Error("version conflict");
    err.code = "CONFLICT";
    throw err;
  }

  const body = {
    message: message,
    content: bytesToBase64(new TextEncoder().encode(content)),
    branch: cfg.branch
  };
  if (current.sha) body.sha = current.sha;

  const res = await fetch(contentsURL(cfg), {
    method: "PUT", headers: ghHeaders(cfg), body: JSON.stringify(body)
  });

  if (res.status === 409 || res.status === 422) {
    const err = new Error("version conflict");
    err.code = "CONFLICT";
    throw err;
  }
  if (!res.ok) throw new Error("write " + res.status + " " + (await res.text()).slice(0, 300));

  const out = await res.json();
  return { sha: out.content && out.content.sha };
}

function base64ToBytes(s) {
  const bin = atob(String(s).replace(/\s/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes) {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
