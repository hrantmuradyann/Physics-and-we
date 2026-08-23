# Security — how the admin panel is protected

This file explains what protects `/admin/`, what you must do before putting the
site on the internet, and what to do if something goes wrong.

**Read section 1 before you deploy.** The rest is reference.

---

## 1. Before you go live — the short checklist

The site is safe to run on your own machine right now. Before it is reachable
from the internet, do these five things:

- [ ] **Serve the site with Cloudflare** (deployed, or `wrangler pages dev`).
      A plain file server leaves `/admin/` wide open — see section 1a.
- [ ] **Change the password.** It is currently `admin`, which is public
      knowledge — it is written in this repository. See section 3.
- [ ] **Set your own `SESSION_SECRET`.** Anyone who knows it can forge a login
      without knowing the password. See section 3.
- [ ] **Set `ENVIRONMENT=production`.** This switches off the convenience
      login described in section 2.
- [ ] **Check that `.dev.vars` is not in git.** Run `git status`. If you see
      `.dev.vars` listed, stop and read section 7.
- [ ] **Make the GitHub token fine-grained** — one repository, `Contents:
      Read and write`, nothing else, with an expiry date.

---

## 1a. The lock only exists when a server is running it

**This is the most important thing to understand about the admin panel.**

The check that stops people reaching `/admin/` lives in
`functions/admin/_middleware.js`, which is a **Cloudflare Function** — server
code. It runs in exactly two situations:

* on the deployed site, because Cloudflare Pages runs the `functions/` folder, and
* on your machine, when you start the site with `npx wrangler pages dev .`

It does **not** run if you open the site any other way. A plain file server —
VS Code's Live Server, `python -m http.server`, dragging `index.html` onto a
browser — just hands out files. Asked for `/admin/index.html`, it serves it,
because nothing is there to say no.

| How you started the site | `/admin/` | The login |
|---|---|---|
| `npx wrangler pages dev .` | asks for the password | works |
| Cloudflare Pages (deployed) | asks for the password | works |
| Live Server / `http.server` / double-click | **opens straight away** | cannot work — the API is not there |

So if you type `/admin` and find yourself inside with no password asked, that
is the signal that **the site is not being served by Cloudflare** — not that
the lock is broken. In that state the panel is also useless: it cannot read or
publish anything, because the API it talks to does not exist. It now detects
this and replaces itself with an explanation rather than showing an editor that
looks like it works.

The practical rule: **always start the site with `npx wrangler pages dev .`**
and use the address it prints (`http://127.0.0.1:8788`). Never serve this
project with a plain static server and expect `/admin/` to be private.

---

## 2. The login as it stands today

| | |
|---|---|
| Username | `password` |
| Password | `admin` |
| Where it works | `http://localhost` and `http://127.0.0.1` only |

These are built into `functions/admin/api/session.js` as a development
convenience so the panel works the moment you clone the project. They are
switched off automatically whenever **any** of the following is true:

* the site is served from a real hostname (anything that is not localhost),
* `ENVIRONMENT` is set to `production`,
* `ADMIN_PASSWORD_HASH` is set (your own password always wins),
* `GITHUB_TOKEN` or `CF_ACCESS_TEAM_DOMAIN` is set — that means a real
  deployment, not a laptop.

In every one of those cases the server answers `503 Login is not configured`
rather than letting anyone in. **It fails closed, never open.**

> The tests in section 9 include this exact case: the same username and
> password are refused when the request arrives on a non-localhost hostname.

---

## 3. Setting your own username and password

Passwords are never stored anywhere — only a PBKDF2-SHA256 hash of one. Make
your own hash:

```bash
python -c "import hashlib,base64,os;s=os.urandom(16);d=hashlib.pbkdf2_hmac('sha256',b'YOUR-PASSWORD-HERE',s,310000,32);print('pbkdf2$sha256$310000$'+base64.b64encode(s).decode()+'$'+base64.b64encode(d).decode())"
```

Generate a signing key for the login cookie as well:

```bash
python -c "import base64,os;print(base64.b64encode(os.urandom(32)).decode())"
```

**Locally**, put both into `.dev.vars` (copy `.dev.vars.example` first). That
file is in `.gitignore` and must stay there.

**Deployed**, set them in Cloudflare → Workers & Pages → your project →
Settings → Environment variables, and mark `ADMIN_PASSWORD_HASH` and
`SESSION_SECRET` as **Secret / Encrypt**:

| Name | Example | Mark as |
|---|---|---|
| `ADMIN_USERNAME` | `redaktor` | plaintext |
| `ADMIN_PASSWORD_HASH` | `pbkdf2$sha256$310000$…$…` | **Secret** |
| `SESSION_SECRET` | 32 random bytes, base64 | **Secret** |
| `SESSION_TTL` | `43200` (12 hours) | plaintext |
| `ENVIRONMENT` | `production` | plaintext |

> **A note on PBKDF2 and the Cloudflare free plan.** 310,000 iterations is
> deliberately slow — that is what makes a stolen hash hard to crack. Workers
> on the free plan cap CPU time per request, and a login may exceed it there.
> If logins fail on the deployed site but work locally, regenerate the hash
> with a lower count (change both `310000` values in the command above to
> `100000`), or put Cloudflare Access in front instead (section 6).

---

## 4. What protects the panel, layer by layer

**The door is locked on the server, not in the browser.**
`functions/admin/_middleware.js` runs for *every* request whose path starts
with `/admin` — before any file is sent. There is no URL you can type to get
around it, and no file name you can guess. Only two paths are open without a
session: the login page, and the login API itself.

**The session cookie cannot be edited.** It is signed with HMAC-SHA256. Change
one character and the signature no longer matches, so the server treats it as
no session at all. The cookie is:

* `HttpOnly` — JavaScript cannot read it, so even a scripting bug could not steal it,
* `SameSite=Strict` — the browser will not send it from another site,
* `Secure` — sent over HTTPS only (localhost is exempt, as browsers allow),
* `Path=/admin` — never sent to the public pages,
* time-limited — it stops working after `SESSION_TTL` seconds.

**Every save is checked three ways.** A request that changes anything must
(1) come from this same site (`Origin` and `Sec-Fetch-Site` are checked),
(2) carry a valid session cookie, and (3) carry a CSRF token that matches the
one inside that session. This is what stops another website from making your
browser publish something while you are logged in.

**Guessing the password is slowed down.** Five wrong attempts and the delay
starts doubling, up to an hour. Every attempt takes at least 350 ms whether it
succeeds or fails, and the username and password are always both checked, so
timing the response tells an attacker nothing about which half was wrong.

**What goes into news.json is checked field by field.** `publish.js` rejects
anything that is not the exact shape it expects — bad dates, addresses with
slashes or `..`, text over the length limits, more than 300 items, duplicate
ids. Unknown fields are dropped rather than stored.

**Photos are checked by their contents, not their name.** `upload.js` reads
the first bytes of the file to decide what it really is. The name the browser
sent is thrown away entirely and replaced with a random one, so a file called
`../../index.html` cannot go anywhere it should not. SVG is refused on
purpose: an SVG can contain a script.

**Nothing typed into the panel becomes code.** Every value that comes back out
of `news.json` is put on the page with `textContent`. Even if a strange value
reached the file, it would appear as visible text, never run. On top of that,
`/admin/` is served with a Content-Security-Policy that forbids inline scripts
and any script from another domain.

**The GitHub token never reaches the browser.** It exists only as an encrypted
environment variable used by the server. Nothing in the request can influence
which file gets written — the path comes from the server's own settings.

**Two people cannot overwrite each other.** The editor remembers which version
of `news.json` it loaded. If someone else saved in the meantime, the server
answers `409` and asks you to reload instead of silently discarding their work.

**Nothing is published from a page that failed to load.** If the current list
could not be fetched, saving is disabled — otherwise publishing would replace
every existing item with just the new one.

---

## 5. What is NOT protected, and what to do about it

**Rate limiting is best-effort.** It lives in one server instance's memory, so
a determined attacker using many connections could get more attempts than the
counter suggests. If the site is public, add a Cloudflare WAF rate-limiting
rule on `/admin/api/*` — for example 10 requests per minute per IP. That is a
few clicks in the dashboard and costs nothing on the free plan.

**One password means one person.** There is no per-user account, no audit
trail beyond the commit messages, and no way to revoke one editor without
changing the password for everybody. If more than two or three people need
access, use Cloudflare Access (section 6) instead.

**A compromised GitHub token is worse than a compromised password.** The
password only lets someone edit news. The token can rewrite *any* file in the
repository — and because Cloudflare Pages deploys from that repository, that
means the whole site. Keep the token fine-grained, give it an expiry, and
consider committing news to a separate branch or repository that Pages does
not build from.

**Photos are committed to the repository.** They are public forever, and
public in git history even if deleted later. Do not upload anything that is
not meant to be seen — and be careful with photographs of children if your
school requires consent.

---

## 6. Optional second lock: Cloudflare Access

For a public deployment you can put a real identity provider in front of the
whole `/admin` path, so a visitor must sign in with an approved email address
*before* they ever see the login page. `ADMIN-SETUP.md` has the steps.

If you use it, `CF_ACCESS_AUD` is **required** — the code refuses to accept an
Access token without it. Without that check, a token issued for any other
application in the same Cloudflare team would be accepted here. Set
`ADMIN_EMAILS` as well to name exactly who may publish.

---

## 7. If a secret leaks

**A password or session secret got committed.** Change both immediately
(section 3) and redeploy. Removing the file in a later commit is *not* enough —
git keeps the old version, and anyone who cloned the repository still has it.

**A GitHub token got committed.** Revoke it first, at GitHub → Settings →
Developer settings → Personal access tokens. Do that before anything else;
rewriting history is slower than an attacker. Then create a new token and
update `GITHUB_TOKEN`.

**Someone published something you did not.** Every change is a git commit.
`git log news.json` shows what happened and when, and `git revert` puts it
back. Then change the password.

---

## 8. Files that must never be committed

`.gitignore` already covers these. Check with `git status` before every push.

| File | What is in it |
|---|---|
| `.dev.vars` | your local password hash, session secret, GitHub token |
| `.env`, `.env.*` | the same, under other names |
| `*.pem`, `*.key` | keys and certificates |
| `.wrangler/` | local server state |
| `node_modules/` | not secret, just enormous |

`.dev.vars.example` **is** committed on purpose. It is a template — never put
a real secret in it.

---

## 9. Checking that it all still works

The protections above are covered by tests that run against a real local
server. After changing anything under `functions/`, start the site with
`npx wrangler pages dev .` and confirm:

| Check | Expected |
|---|---|
| `curl -sI localhost:8788/admin/ -H "Sec-Fetch-Dest: document"` | `302` to the login page |
| `curl -s -o /dev/null -w "%{http_code}" localhost:8788/admin/api/publish` | `401` |
| Log in with the wrong password | `401`, no cookie |
| Log in with the right password | `200` and a `Set-Cookie` with `HttpOnly`, `SameSite=Strict` |
| Publish without the `X-CSRF-Token` header | `403` |
| Publish with `Origin: https://evil.example` | `403` |
| Log out, then open `/admin/` | `302` to the login page |

The same credentials sent to a non-localhost hostname must return `503`.

---

## 10. Reporting a problem

If you find a way past any of this, do not open a public GitHub issue —
that tells everyone else how to do it too. Contact the project maintainer
directly, describe the steps, and give them time to fix it first.
