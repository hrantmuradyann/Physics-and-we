# The admin panel — setup

The admin panel at `/admin/` is where news items are written: title, date,
photo and text, in both languages. Each item gets its own page on the site.

There are two ways to run it.

* **[Part A — on your own computer](#part-a--on-your-own-computer)** — five
  minutes, nothing to sign up for. Start here.
* **[Part B — on the internet](#part-b--on-the-internet)** — publishing with
  one click, with the site updating itself.

Before Part B, read **`SECURITY.md`**. It has a five-item checklist that must
be done before the panel is reachable from outside your house.

---

## Part A — on your own computer

### What you need

[Node.js](https://nodejs.org) installed. Nothing else.

### Step 1 — settings file

The panel reads its password from a file that is **not** in the repository.
Create it by copying the template:

```bash
cp .dev.vars.example .dev.vars        # Mac / Linux / Git Bash
copy .dev.vars.example .dev.vars      # Windows cmd
```

`.dev.vars` is listed in `.gitignore`, so it can never be committed by accident.

### Step 2 — start the site

```bash
npx wrangler pages dev .
```

The first run downloads the tool and takes a minute. When it finishes it prints:

```
[wrangler:inf] Ready on http://127.0.0.1:8788
```

Open that address. **Note that this is not the same as opening `index.html` by
double-clicking it** — the site loads its content from files, and the admin
panel needs a server, so it only works this way.

### Step 3 — sign in

Go to `http://127.0.0.1:8788/admin/`. You will be sent to a login screen.

| | |
|---|---|
| Username | `password` |
| Password | `admin` |

These built-in credentials work **only on localhost**. On any real address the
server refuses them and answers "Login is not configured" — so the panel cannot
accidentally go online with a password everybody knows. Section 3 of
`SECURITY.md` explains how to set your own.

### Step 4 — write a news item

Fill in the form and press **Պահպանել** (Save).

* **Language tabs (ՀՅ / EN)** — both languages are held at once and
  saved together. Switching tabs never loses what you typed. A green dot marks
  a language that already has a title.
* **Photo** — choose a file, or type a path like `images/news/photo.jpg`.
  On your own computer there is nowhere to upload to, so put the picture in the
  `images/news/` folder yourself and type its path. The preview updates as you
  type.
* **Page address** — filled in automatically from the title (Armenian letters
  are transliterated), and you can edit it. This is what
  appears in the URL: `?view=post&id=your-address`.
* **Short description** — one or two sentences, shown on the news feed. Leave
  it empty and the opening of the text is used instead.

Because GitHub is not connected in Part A, saving keeps the item in the page
only. Use **Ներբեռնել news.json** to download the finished file and replace
the `news.json` in the project folder with it.

---

## Part B — on the internet

Now publishing becomes one click: you press Save, the server commits
`news.json` to GitHub, and Cloudflare rebuilds the site.

```
you  →  /admin/  (password login, or Cloudflare Access)
     →  Save     →  /admin/api/publish   (server, holds the GitHub token)
     →  commits news.json to GitHub  →  Cloudflare Pages redeploys  →  live
```

The GitHub token stays on Cloudflare's servers and is **never** sent to the
browser.

### Step 1 — put the project on GitHub

1. Create a repository at https://github.com (e.g. `physics-and-we`).
2. Push this folder to it.
3. **Check that `.dev.vars` was not pushed.** `git status` must not list it.

### Step 2 — deploy to Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick your repository.
2. Build settings:
   * **Framework preset:** None
   * **Build command:** *(leave empty)*
   * **Build output directory:** `/`
3. **Save and Deploy.** Cloudflare finds the `functions/` folder by itself.

### Step 3 — set your own password

Follow section 3 of `SECURITY.md` to generate a password hash and a session
secret, then add them in **Settings → Environment variables**:

| Name | Value | Mark as |
|---|---|---|
| `ADMIN_USERNAME` | whatever you like | plaintext |
| `ADMIN_PASSWORD_HASH` | the `pbkdf2$…` string you generated | **Secret** |
| `SESSION_SECRET` | 32 random bytes, base64 | **Secret** |
| `ENVIRONMENT` | `production` | plaintext |

Without these the panel refuses every login on the deployed site. That is
deliberate — see `SECURITY.md`, section 2.

### Step 4 — a GitHub token, so Save can publish

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Repository access:** Only select repositories → the one from Step 1.
3. **Permissions → Repository permissions → Contents:** **Read and write**.
   Nothing else.
4. Set a short expiry, generate, and copy the token (`github_pat_…`).

Add these variables:

| Name | Value | Mark as |
|---|---|---|
| `GITHUB_TOKEN` | the token | **Secret** |
| `GITHUB_OWNER` | your GitHub username | plaintext |
| `GITHUB_REPO` | the repository name | plaintext |
| `GITHUB_BRANCH` | `main` | plaintext |
| `GITHUB_PATH` | `news.json` | plaintext |
| `GITHUB_IMAGE_DIR` | `images/news` | plaintext |

Then **redeploy** (Deployments → ⋯ → Retry deployment) so the change takes
effect. Photo uploads now work too: choosing a file commits it to
`images/news/` with a random name and fills in the path for you.

### Step 5 — use it

1. Open `https://your-site/admin/` and sign in.
2. Write the item, choose a photo, press Save.
3. Cloudflare redeploys; the news page shows it within about a minute.

---

## Optional — a second lock in front of everything

For a public site you can require an approved email address *before* the login
page is even shown, using Cloudflare Access (free).

1. Cloudflare dashboard → **Zero Trust**. The first time you pick a **team
   name**, which gives you `yourteam.cloudflareaccess.com`. Write it down.
2. **Access → Applications → Add an application → Self-hosted.**
   * **Application name:** `Physics admin`
   * **Application domain:** your site + path `/admin` (add your custom domain
     too, if you have one)
3. **Add a policy:** Action **Allow**, **Include → Emails →** your address.
   Login method **One-time PIN** is the simplest.
4. Open the application's **Overview** and copy the **Application Audience
   (AUD) Tag**.

Then add:

| Name | Value |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | the AUD tag |
| `ADMIN_EMAILS` | `you@example.com,colleague@example.com` |

`CF_ACCESS_AUD` is **not optional**. Without it, a token issued for any other
application in your Cloudflare team would be accepted here, and the server
refuses to start an Access session rather than allow that.

---

## When something does not work

**"Login is not configured on this server."**
You are not on localhost, and `ADMIN_PASSWORD_HASH` / `SESSION_SECRET` are not
set. Do Step 3 of Part B.

**Login works locally but not on the deployed site.**
Most likely the free-plan CPU limit while hashing the password. See the note at
the end of section 3 of `SECURITY.md`.

**"Someone else saved a change while you were editing."**
Someone published from another tab or another computer. Reload the page — this
message means your work was *not* silently thrown away.

**Saving is disabled and the page says the list could not be loaded.**
The panel could not read the current news, and it will not publish from an
unknown starting point, because that would wipe the existing items. Reload.

**The photo will not upload.**
Uploading needs `GITHUB_TOKEN` (Part B, Step 4). Without it, put the file in
`images/news/` yourself and type the path.

**You are signed out immediately after signing in.**
`SESSION_SECRET` changes on every restart when it is not set. Set it in
`.dev.vars`.
