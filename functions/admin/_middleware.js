// ============================================================================
//  _middleware.js — the lock on the door of /admin/.
//
//  Cloudflare Pages runs this for EVERY request whose path starts with /admin,
//  including the plain HTML page, before any file is served. So there is no
//  way to reach the admin panel — or any of its API routes — without a valid
//  session. Not by typing the URL, not by guessing a file name.
//
//  Two doors are deliberately left open, and only these two:
//    /admin/login.html   the login screen itself
//    /admin/api/session  the login / logout / "who am I" endpoint
// ============================================================================

import { requireAuth } from "./api/session.js";

const PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/login.html",
  "/admin/api/session"
]);

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/admin";

  if (PUBLIC_PATHS.has(path)) {
    return harden(await next(), request);
  }

  const auth = await requireAuth(request, context.env);
  if (!auth.ok) {
    // A browser asking for a page gets sent to the login screen.
    // Anything else (fetch, curl, a script) gets a plain 401 — never a
    // redirect it might mistake for success.
    if (wantsHTML(request)) {
      const back = url.pathname + url.search;
      return Response.redirect(
        url.origin + "/admin/login.html?next=" + encodeURIComponent(back), 302
      );
    }
    return new Response(
      JSON.stringify({ error: auth.error || "Not signed in.", authenticated: false }),
      {
        status: auth.status || 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  // Signed in — let the request through, then harden whatever comes back.
  return harden(await next(), request);
}

function wantsHTML(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest) return dest === "document" || dest === "iframe";
  return (request.headers.get("Accept") || "").includes("text/html");
}

// Security headers for everything under /admin.
//
// The Content-Security-Policy is the important one: even if a bug somewhere
// let an attacker inject a <script> into this page, the browser would refuse
// to run it, because only scripts served from this same site are allowed and
// inline scripts are forbidden outright.
function harden(response, request) {
  const out = new Response(response.body, response);

  out.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join("; "));

  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("X-Frame-Options", "DENY");
  out.headers.set("Referrer-Policy", "no-referrer");
  out.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  out.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  out.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (new URL(request.url).protocol === "https:") {
    out.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return out;
}
