// ============================================================================
//  upload.js — the main photo of a news item.   Route: /admin/api/upload
//
//  Takes one image file, checks that it really IS an image, gives it a fresh
//  random name and commits it to the repository. Returns the path to store in
//  news.json.
//
//  WHY THE NAME IS THROWN AWAY
//  The name the browser sends is never used. A file called "../../index.html"
//  or "evil.svg" or "photo.jpg.html" cannot do anything here, because the
//  server invents the whole path itself: images/news/<random>.<ext>, where the
//  extension comes from what the bytes actually are — not from the name.
// ============================================================================

import { requireWriteAuth, json, ghConfigured } from "./session.js";

const MAX_BYTES = 5 * 1024 * 1024;      // 5 MB

// Only these. SVG is deliberately absent: an SVG can contain <script>, and
// serving one from our own domain would be a stored cross-site-scripting hole.
const TYPES = [
  { ext: "jpg",  mime: "image/jpeg", test: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { ext: "png",  mime: "image/png",  test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
                                                  b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A },
  { ext: "gif",  mime: "image/gif",  test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { ext: "webp", mime: "image/webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP" },
  { ext: "avif", mime: "image/avif", test: (b) => ascii(b, 4, 4) === "ftyp" && ascii(b, 8, 4).startsWith("avif") }
];

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = await requireWriteAuth(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status || 401);

  if (!ghConfigured(env)) {
    return json({
      error: "notConfigured",
      message: "This server cannot store photos. Put the picture in the " +
               "images/news/ folder yourself and type its path instead."
    }, 503);
  }

  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared && declared > MAX_BYTES + 8192) {
    return json({ error: "That photo is larger than 5 MB." }, 413);
  }

  let file;
  try {
    const form = await request.formData();
    file = form.get("photo");
  } catch {
    return json({ error: "Could not read the upload." }, 400);
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "No photo was sent." }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) return json({ error: "That file is empty." }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: "That photo is larger than 5 MB." }, 413);

  // The bytes decide what this is — not the file name, not the Content-Type
  // header the browser claimed.
  const kind = TYPES.find((t) => t.test(bytes));
  if (!kind) {
    return json({ error: "That is not a JPEG, PNG, WebP, GIF or AVIF image." }, 415);
  }

  const dir = safeDir(env.GITHUB_IMAGE_DIR || "images/news");
  const name = randomName() + "." + kind.ext;
  const path = dir + "/" + name;

  try {
    await commitBinary(env, path, bytes, "Add news photo (by " + safeUser(auth.user) + ")");
  } catch (e) {
    console.error("upload:", e.message);
    return json({ error: "Could not save the photo. Check the server logs." }, 502);
  }

  return json({ ok: true, path: path, type: kind.mime, bytes: bytes.length });
}

// ------------------------------------------------------------------ helpers --

function ascii(bytes, at, len) {
  let out = "";
  for (let i = at; i < at + len && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

// 16 random hex characters — unguessable, and no character that could mean
// anything special in a path or a URL.
function randomName() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(r).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The folder comes from the server's own settings, but normalise it anyway so
// a typo in the configuration cannot climb out of the repository.
function safeDir(value) {
  const parts = String(value).split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .filter((s) => /^[a-zA-Z0-9._-]+$/.test(s));
  return parts.length ? parts.join("/") : "images/news";
}

function safeUser(user) {
  return String(user || "unknown").replace(/[\r\n]+/g, " ").slice(0, 80);
}

async function commitBinary(env, path, bytes, message) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  const branch = env.GITHUB_BRANCH || "main";
  const url = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" +
              path.split("/").map(encodeURIComponent).join("/");

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "physics-and-we-admin",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, content: toBase64(bytes), branch })
  });

  if (!res.ok) throw new Error("write " + res.status + " " + (await res.text()).slice(0, 300));
  return res.json();
}

function toBase64(bytes) {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
