# CLAUDE.md

Technical map of this repo for Claude Code (or any AI agent) starting a fresh session. Human docs live in `README.md` (long, narrative, onboarding-focused) and `Instructions/` (task-specific guides); this file is the dense/skimmable equivalent for an agent — architecture, file map, gotchas, pointers.

**Keep this file current.** If a change alters the architecture, file layout, data schema, the data-binding attribute vocabulary, or a security-relevant behavior, update the relevant section here in the same change (or PR) — don't leave it to a later cleanup.

## What this is

Physics and We: a bilingual (Armenian `hy` / English `en`) static website for a physics-education program — home, summer camp, interactive labs, research, news, partners, FAQ, about. **No framework, no build step, no `package.json`/`node_modules`.** Plain HTML/CSS/JS, deployed as-is to **Cloudflare Pages**. Local dev: `npx wrangler pages dev .` (required for `/admin/` — see "Local dev" below).

## Architecture

- `index.html` is the **only real page**. It has no content — just `<link>`/`<script>` tags and three empty slots: `#site-header`, `#app` (main content), `#site-footer`.
- `sections/*.html` are HTML **fragments** — no `<!DOCTYPE>`, `<head>`, or `<body>` — one per page/view. `js/router.js` fetches the right one and injects it into `#app` on navigation (`history.pushState`, `?view=<route>` query param, no full page reload). All fetched fragments accumulate in `#app` at once; visibility toggles via `.view` / `.view.active` CSS classes, not add/remove from DOM.
- `data/*.json` hold **all text**, bilingual side by side per key (`{ "hy": "...", "en": "..." }`). One JSON file per page, paired 1:1 with its `sections/*.html`.
- `js/content.js` binds `data/*.json` values into a fragment's `data-*` attributes (see table below) and defines the inline SVG icon set.
- This layout/text split exists so non-programmers can edit `data/*.json` without touching HTML/CSS/JS (see `Instructions/EDITING-GUIDE.md`).

### Data-binding attributes (`js/content.js`)

| Attribute | Effect |
|---|---|
| `data-text="hero.title"` | plain text from JSON key |
| `data-rich="story.text"` | like `data-text` but supports blank-line paragraphs, `**bold**`, `[text](url)` |
| `data-list="cards"` | repeats the element's inner `<template>` once per array item |
| `data-icon="icon"` | renders the named inline SVG icon |
| `data-image` / `data-alt` | image src + alt text |
| `data-route="button.route"` | turns element into a link to another page/route |
| `data-route-id="slug"` | links to one specific item on that route (a lab, a news post) |
| `data-number="number"` | number that counts up when scrolled into view (`js/anim.js`) |
| `data-ui="learnMore"` | pulls a shared short string from `data/site.json` (`ui` block) |

A missing/empty JSON value **hides** that element rather than rendering empty — a half-finished translation never looks broken.

### Request/render flow

1. Browser loads `index.html` (only time it ever does a full load).
2. `js/main.js` reads `data/site.json` → builds header nav + footer.
3. `js/router.js` parses the route → fetches `sections/<route>.html` + `data/<route>.json`.
4. Fragment wrapped in `<section class="view" id="view-<route>">`, injected into `#app`; `js/content.js` fills in text via the attributes above.
5. `js/anim.js` handles scroll reveals + counting numbers.
6. Router idle-prefetches every other route so subsequent nav feels instant.

Corollary: `<script>` tags inside a `sections/*.html` fragment **never execute** (browsers don't run scripts injected via `innerHTML`). All JS lives in `js/`; page-specific logic hooks the `section:ready` event (pattern: `js/news.js`).

## File map

```
index.html              shell only — CSS/JS links + #site-header/#app/#site-footer
news.json                (root) news ITEMS — written only by admin panel, never hand-edit
data/news.json           only the news PAGE heading text — hand-edit this one

Instructions/            human docs (see "Pointers" below)
sections/*.html          one layout fragment per page (no text, no <script> effect)
data/*.json              one text file per page (bilingual, no markup); data/site.json = nav/footer/shared UI strings
data/labs.json           lab registry: simulations.items[].slug must match js/labs/<slug>.js + data/labs/<slug>.json
data/labs/*.json         per-lab text (pendulum, refraction)

css/style.css            reset, CSS vars, shared header/footer (also used by admin)
css/site.css             design system for all public pages (.page-head, .band, .card, .grid--cards, ...)
css/home.css             home hero only
css/labs.css             lab page shell only
css/admin.css            admin panel only (light theme)

js/content.js            data-* attribute binder + icon set
js/main.js               language switch (hy/en, localStorage) + header/footer build
js/router.js             SPA router (fetch section+data, swap views, prefetch)
js/anim.js               scroll reveals, counting numbers
js/home.js               animated particle background (home hero)
js/news.js               news feed + single-post render (root news.json); always textContent, never innerHTML
js/labs.js               shared lab runtime: canvas sizing/retina, Play/Reset, anim-loop lifecycle, stops loop off-screen
js/labs/pendulum.js       one lab's physics/drawing, via Labs.register(name, {...})
js/labs/refraction.js
js/admin.js              admin panel CRUD logic, talks to /admin/api/*
js/admin-login.js        admin login form handling

admin/index.html         admin UI (behind auth), loaded only if _middleware.js allows it
admin/login.html         only /admin/ page reachable unauthenticated

functions/admin/_middleware.js   gatekeeper for every /admin/* request; adds security headers
functions/admin/api/session.js   login/logout/whoami; PBKDF2 password check, signed session cookie, rate limiting
functions/admin/api/publish.js   reads/writes root news.json via GitHub Contents API; validates fields; optimistic concurrency (baseSha)
functions/admin/api/upload.js    one photo upload; magic-byte type sniffing; rejects SVG; random filename

.dev.vars.example        template for local secrets → copy to .dev.vars (gitignored)
```

## Critical gotchas

- **Two unrelated `news.json` files.** `news.json` (repo root) = actual news items, written only by the admin panel (`functions/admin/api/publish.js`). `data/news.json` = just the news page's heading/lead text. Never hand-edit the root one.
- **Fragments have no working `<script>`.** Any JS for a `sections/*.html` page must live in `js/` and hook `section:ready`.
- **Multi-file additions must stay in lockstep.** New page = entry in `data/site.json` nav + `sections/<route>.html` + `data/<route>.json`. New lab = `js/labs/<slug>.js` (with matching `Labs.register("<slug>", …)` name) + `data/labs/<slug>.json` + a block in `data/labs.json` + a `<script>` line in `index.html`. Full walkthroughs: README §2 "Adding a new page" / "Adding a new interactive lab", and `Instructions/LABS-GUIDE.md`.
- **No build step, no dependencies.** Don't introduce a bundler, npm package, or `package.json` casually — this is a deliberate project constraint, not an oversight.
- **README may reference a third language, `ru` (Russian), in a couple of places** (e.g. the data-attribute/text-format section and the "how do new files connect" section). This looks stale after commit `f956d38` ("Deleted russian") — the site and `data/*.json` are currently hy/en only. Don't trust that specific detail in the README without checking the actual JSON files; fix the README wording if you're already editing that section.
- **CSS lives in CSS files only** — no `style="..."` attributes or `<style>` blocks in HTML/fragments; reuse `css/site.css` blocks and `css/style.css` variables before adding new ones.

## Security-sensitive code

`functions/admin/_middleware.js` and `functions/admin/api/*.js` implement the entire auth/authorization layer: PBKDF2 password hashing, HMAC-signed HttpOnly/Secure/SameSite=Strict session cookies, per-IP rate limiting, CSRF/origin checks, field validation on publish, magic-byte validation on upload, and security response headers. Treat changes here as security-critical — cross-check against `Instructions/SECURITY.md` before and after, and don't weaken validation, auth checks, or the deliberate SVG-upload rejection (stored-XSS prevention) without a clear reason.

## Local dev

- Public site only: `python3 -m http.server 8000` → `http://localhost:8000`. Fine for iterating on `sections/`, `data/`, `css/`, `js/` (non-admin).
- Anything involving `/admin/`: must use `npx wrangler pages dev .` — a plain static server doesn't run `functions/`, so the middleware never executes and `/admin/` is broken/unprotected. Requires a local `.dev.vars` (copy from `.dev.vars.example`); default localhost-only login is `admin` / `password` unless overridden.
- Opening `index.html` directly via `file://` (double-click) always shows a blank page — everything loads via `fetch()`, which browsers block on `file://`.

## Pointers (don't duplicate these — read them)

| Task | Doc |
|---|---|
| Write/translate content, no code | `Instructions/EDITING-GUIDE.md` |
| Build an interactive lab | `Instructions/LABS-GUIDE.md` |
| Touch HTML/CSS classes | `Instructions/HTML-CLASSES.md` |
| Run/deploy the admin panel | `Instructions/ADMIN-SETUP.md` |
| Deploy to production | `Instructions/SECURITY.md` — read before deploying |
| Git workflow, branching, terminal basics | `README.md` |
