# Physics and We

Website for YSO (Young Scientists Organization) — public site, summer camp registration, research hub, interactive physics labs, student portal, and admin panel.

This README is written for collaborators who are new to Git/Terminal. Read it before you start.

---

## 1. What's built so far

The **site shell** is done and merged (or about to be merged) into `main`. This means:

- 6 pages exist: `index.html` (Home), `about.html`, `camp.html`, `research.html`, `labs.html`, `news.html`
- Every page shares the same header, navigation bar, and footer — but you won't see that HTML written out in each file. Instead:
  - Each page has two **empty** placeholders: `<header id="site-header"></header>` and `<footer id="site-footer"></footer>`
  - `js/main.js` fills those in automatically when the page loads, using JavaScript
  - **Why:** if we ever need to change the nav (add a link, rename something), we edit it in ONE place (`main.js`) instead of 6+ files
- The site supports **3 languages**: English, Armenian (Հայերեն), Russian (Русский)
  - A language switcher (EN / ՀՅ / РУ) sits in the header
  - All translatable text lives in JSON files: `js/lang/en.json`, `js/lang/hy.json`, `js/lang/ru.json`
  - Clicking a language button swaps the visible text without reloading the page
- Base styling (colors, fonts, spacing, responsive nav) lives in `css/style.css`

**Nothing else is built yet** — camp registration, submissions, labs, student portal, and admin panel are all still placeholder pages with just a heading. That's next.

---

## 2. Project structure

```
Physics_and_we/
├── index.html          → Home page
├── about.html           → About YSO & Outreach
├── camp.html            → Summer Camp
├── research.html        → Research & Studies
├── labs.html             → Interactive Labs
├── news.html             → News & Events
├── css/
│   └── style.css        → ALL styling for the whole site lives here (for now)
├── js/
│   ├── main.js           → Shared logic: header/footer injection, nav highlighting, language switching
│   └── lang/
│       ├── en.json       → English text
│       ├── hy.json       → Armenian text
│       └── ru.json       → Russian text
└── README.md             → You are here
```

As new features get built (registration form, uploads, labs simulations, admin panel), they'll mostly get **their own JS files** (e.g. `js/registration.js`) instead of being piled into `main.js`, so each file stays focused and easy to read. New HTML pages will also get added (login, signup, dashboards, etc.).

### About `css/style.css`
This one file controls the look of every page — colors, fonts, header/nav styling, spacing, responsive behavior. At the top there's a `:root { }` block with CSS variables like `--color-primary` — reuse these instead of hardcoding new colors, so the site stays visually consistent. If this file gets too large as we add more sections, we may split it into multiple files later (e.g. `camp.css`, `admin.css`) — but for now, everything goes here.

### About `js/main.js`
This file runs on every page. It currently handles:
- Injecting the header/nav and footer into the empty placeholders
- Highlighting the current page's nav link
- Loading the correct language JSON and swapping text on the page

**Don't dump unrelated feature logic into this file.** If you're building the camp registration form, create `js/registration.js` and link it in `camp.html` with its own `<script>` tag. Keep `main.js` about shared, sitewide behavior only.

### About `js/lang/*.json`
Every visible piece of text on the site should be translatable. **This is a rule, not a suggestion**:

- Never hardcode visible text directly in HTML without a `data-i18n` tag, and never hardcode it only in one language.
- **Every time you add new text to a page**, you must:
  1. Add a `data-i18n="your_key_name"` attribute to that HTML element
  2. Add the matching `"your_key_name": "..."` entry to **all three** files: `en.json`, `hy.json`, `ru.json`
  3. If you don't have the Armenian/Russian translation yet, ask before merging — don't leave it in English "temporarily," since it's easy to forget later

Example:
```html
<h1 data-i18n="camp_title">Summer Camp</h1>
```
```json
// en.json
"camp_title": "Summer Camp"

// hy.json
"camp_title": "Ամառային ճամբար"

// ru.json
"camp_title": "Летний лагерь"
```

---

## 3. Setting up on your computer

You need two things installed: **Git** (to sync with GitHub) and **Python 3** (just to preview the site locally — not because the site uses Python).

### On Mac
1. Open **Terminal** (search for it with Spotlight: `Cmd + Space`, type "Terminal")
2. Check if Git is installed:
   ```bash
   git --version
   ```
   If it's missing, macOS will prompt you to install Xcode Command Line Tools — accept and wait for it to finish.
3. Check Python:
   ```bash
   python3 --version
   ```
   Macs usually have this pre-installed.

### On Windows
1. Install **Git for Windows**: https://git-scm.com/download/win — this also gives you "Git Bash," a terminal that behaves like Mac/Linux Terminal (recommended over Command Prompt for these instructions)
2. Install **Python**: https://www.python.org/downloads/ — during install, check the box "Add Python to PATH"
3. Open **Git Bash** (search for it in the Start menu) and check both:
   ```bash
   git --version
   python --version
   ```
   (On Windows it may be `python` instead of `python3` — try both if one doesn't work)

---

## 4. Terminal basics (if you've never used it)

The terminal lets you navigate folders and run commands by typing instead of clicking. A few commands you'll use constantly:

| Command | What it does |
|---|---|
| `pwd` | Prints your current folder location ("print working directory") |
| `ls` | Lists files/folders in your current location (Windows Git Bash: also `ls`) |
| `cd folder-name` | Moves ("change directory") into a folder |
| `cd ..` | Moves up one folder (out of the current one) |
| `cd ~` | Jumps straight to your home folder |
| `mkdir name` | Creates a new folder |
| `touch file.txt` | Creates a new empty file (Windows: use `type nul > file.txt` in Git Bash, or just create it in a text editor) |
| `open file.html` | (Mac only) Opens a file with its default app |
| `clear` | Clears the terminal screen (doesn't affect your files) |

**Getting into the project folder:** wherever you saved/cloned it, use `cd` to navigate there, e.g.:
```bash
cd Desktop/Physics_and_we
```

---

## 5. A little bit of vim (only if you get stuck in it)

Occasionally a Git command (like resolving a merge, or `git commit` without `-m`) opens a text editor called **vim** directly inside the terminal. It feels frozen because vim has "modes" — you're not typing normally by default.

If you ever see a screen like this and don't know what to do:

1. Press `Esc` (make sure you're not accidentally typing into the file)
2. To just get out **without saving**: type `:q!` and press Enter
3. To save and quit (e.g. after typing a commit message): press `i` to type, write your message, then press `Esc`, type `:wq`, press Enter

**You can avoid vim almost entirely** by always including your message directly in the command, e.g.:
```bash
git commit -m "your message here"
```
This never opens vim, since you already gave it the message.

If vim ever opens and you're unsure, `Esc` then `:q!` then Enter always gets you out safely without breaking anything.

---

## 6. Getting the project & making changes

### First time (cloning the repo)
```bash
git clone https://github.com/hrantmuradyann/Physics-and-we.git
cd Physics-and-we
```
(You need to be added as a collaborator first — ask Hrant to add your GitHub username.)

### Every time you start working
```bash
git checkout main
git pull
```
This makes sure you're starting from the latest version before creating a new branch.

### Create your own branch for whatever you're working on
```bash
git checkout -b feature/your-task-name
```
Example: `feature/camp-registration`, `feature/about-page`. Never work directly on `main`.

### Preview the site locally
```bash
python3 -m http.server 8000
```
Then open your browser to:
```
http://localhost:8000
```
**Important:** don't just double-click `index.html` or use `open index.html` — the language switcher uses `fetch()`, which browsers block on files opened directly (`file://...`). It only works when served through `http://localhost`.

Stop the server anytime with `Ctrl + C` in that terminal window.

### Save your changes
```bash
git add .
git commit -m "Add camp curriculum section with age tracks"
git push
```

First time pushing a new branch, use:
```bash
git push -u origin feature/your-task-name
```
After that, plain `git push` works.

---

## 7. Commit messages — please write real ones

**"stuff", "update", "fix", "asdf"** — these tell nobody anything. A good commit message describes *what changed and why*, so anyone (including future-you) can scan the project's history and understand it without opening every file.

Bad:
```
git commit -m "changes"
```

Good:
```
git commit -m "Add age-based track routing to camp registration form"
git commit -m "Fix nav bar overlapping on mobile screens"
git commit -m "Translate About page into Armenian and Russian"
```

Rule of thumb: if someone read only your commit messages (never opened the code), they should roughly understand what happened to the project over time.

---

## 8. DO NOT push straight to `main`

This is important. **Never** run `git push` while on the `main` branch, and never merge your own branch into `main` the second you finish a feature, even if it "works on your machine."

Why this matters:
- `main` should always be the safe, working version of the site — the one that's actually live/deployable
- If everyone pushes directly to `main`, changes collide, conflicts pile up, and one person's half-finished form can break someone else's finished page
- A second pair of eyes on a Pull Request catches bugs, typos, and missing translations before they reach everyone else

### The correct flow, every time:
1. Branch off `main`: `git checkout -b feature/your-task`
2. Do your work, commit as you go (small, clear commits are better than one giant one)
3. Push your branch: `git push -u origin feature/your-task`
4. Go to GitHub → your repo → you'll see a banner to **"Compare & pull request"** — click it
5. Write a short description of what the PR does
6. Ask someone (or Hrant) to glance over it
7. Only after review, merge it into `main` — GitHub has a "Merge pull request" button for this
8. Delete the branch after merging (GitHub offers a button right there) to keep things tidy

If you're genuinely the only person who will ever touch a specific branch and you're confident, you can merge your own PR — but still open the PR first rather than pushing directly to `main`. It keeps a clean record of what changed and when.

---

## 9. What is `feature/site-shell`?

This is the name of the Git **branch** where the site's foundation (layout, nav, footer, base styles, language switching) was built. You can view its exact state on GitHub here:

https://github.com/hrantmuradyann/Physics-and-we/tree/feature/site-shell

A **branch** is basically a parallel, isolated copy of the project where you can make changes without affecting `main` until you're ready to merge them in. Every new feature (registration, submissions, labs, student portal, admin panel) will live on its own branch, following the same pattern:

```
feature/camp-registration
feature/submissions
feature/research-hub
feature/interactive-labs
feature/student-portal
feature/admin-cms
```

Once `feature/site-shell` is merged into `main`, every new branch should be created from the updated `main` (`git checkout main && git pull` first), not from `feature/site-shell` directly — otherwise you might be missing other people's merged changes.

---

## 10. Quick command cheat sheet

```bash
# Get latest main
git checkout main
git pull

# Start new work
git checkout -b feature/my-task

# Save progress
git add .
git commit -m "Clear description of what changed"
git push

# First push of a new branch
git push -u origin feature/my-task

# Check what branch you're on
git branch

# Check status of changes
git status

# Preview site locally
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

---

Questions or stuck on something? Ask before force-pushing, deleting branches, or resolving conflicts you're unsure about — it's much easier to fix things before they're merged into `main`.
