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

The terminal is just a text-based way to talk to your computer — instead of clicking icons, you type commands and press Enter. It looks intimidating at first but you'll only need a small, repeated set of commands for this project.

### What terminal to use on Mac

Mac's terminal app is literally called **Terminal**. Open it via Spotlight: press `Cmd + Space`, type `Terminal`, press Enter. It uses a shell called **zsh** by default (modern Macs) — all the commands in this README work in it as-is.

You'll see a prompt like:
```
(base) Hrants-MacBook-Pro:Physics_and_we hrant$
```
That's just: `(base)` = a Python environment indicator (from Anaconda, ignore it), your computer's name, your **current folder**, your username, then `$` marks where you type.

### What terminal to use on Windows

Windows' built-in terminals (Command Prompt, PowerShell) use different commands than Mac/Linux (e.g. `dir` instead of `ls`). To avoid confusion, use **Git Bash** instead — it comes bundled with Git for Windows (see setup section above) and understands the same commands as Mac Terminal.

Open it via the Start menu: type `Git Bash`, press Enter. You'll see a similar prompt:
```
hrant@DESKTOP-XXXX MINGW64 ~/Desktop/Physics_and_we
$
```
Same idea — type commands, press Enter, `$` marks where you type. Every command in this README works the same way in Git Bash as it does in Mac Terminal.

### Commands you'll use constantly

| Command | What it does |
|---|---|
| `pwd` | Prints your current folder location ("print working directory") — use this if you feel lost |
| `ls` | Lists files/folders in your current location |
| `ls -la` | Same as `ls`, but shows hidden files too (like `.git`) and more detail (permissions, size, date) |
| `cd folder-name` | Moves ("change directory") into a folder |
| `cd ..` | Moves up one folder, out of the current one |
| `cd ../..` | Moves up two folders at once |
| `cd ~` | Jumps straight to your home folder |
| `cd -` | Jumps back to whichever folder you were just in before your last `cd` |
| `mkdir name` | Creates a new folder |
| `mkdir -p a/b/c` | Creates nested folders in one go (`a`, then `b` inside it, then `c` inside that) |
| `touch file.txt` | Creates a new empty file (on Windows Git Bash, `touch` also works — no need for the `type nul` workaround) |
| `rm file.txt` | Deletes a file — **permanently, no trash bin, no undo**. Use carefully |
| `rm -r folder-name` | Deletes a folder and everything inside it — **also permanent** |
| `mv old-name new-name` | Renames a file, or moves it into a different folder |
| `cp file.txt copy.txt` | Copies a file |
| `cat file.txt` | Prints a file's entire content directly in the terminal (fine for small files) |
| `open file.html` | (Mac only) Opens a file with its default app. On Windows Git Bash, use `start file.html` instead |
| `clear` | Clears the terminal screen for a fresh view — doesn't affect your files at all |
| `history` | Shows a list of commands you've typed recently — handy if you forget what you just ran |
| `Ctrl + C` | Stops/cancels whatever is currently running (e.g. the local server) |
| `↑` (up arrow) | Cycles back through your previous commands, so you don't have to retype them |
| `Tab` | Auto-completes a file/folder name as you type — start typing a name and press Tab instead of typing it all out |

**Getting into the project folder:** wherever you saved/cloned it, use `cd` to navigate there. On Mac, if it's on your Desktop:
```bash
cd Desktop/Physics_and_we
```
On Windows Git Bash, your Desktop is usually reached the same way:
```bash
cd Desktop/Physics_and_we
```
If `cd` says "No such file or directory," run `ls` first to see what's actually in your current folder, and navigate step by step until you find it.

---

## 5. A little bit of vim (only if you get stuck in it)

Occasionally a Git command (like resolving a merge, or `git commit` without `-m`) opens a text editor called **vim** directly inside the terminal. It feels frozen because vim has "modes" — you're not typing normally by default, and clicking/typing randomly can look like nothing is happening (or worse, accidentally edit the file).

Vim works the same way on Mac Terminal, Windows Git Bash, and Linux — so everything below applies no matter which one you're using.

### The two modes that matter

- **Normal mode** (the default when vim opens) — your keystrokes are treated as *commands*, not text. Pressing `i` doesn't type the letter "i," it switches you into Insert mode.
- **Insert mode** — now you're actually typing text into the file, like a normal text editor.

You move between them with `i` (enter Insert mode) and `Esc` (go back to Normal mode).

### Getting out safely (the important part)

If you ever see vim open and don't know what to do, this always works:

1. Press `Esc` a couple of times — guarantees you're in Normal mode, not accidentally typing into the file
2. Type `:q!` and press Enter — this quits **without saving any changes**, completely safe, can't break anything

### Common situations you'll actually run into

**Writing a commit message inside vim** (happens if you run `git commit` without `-m`):
1. Press `i` to enter Insert mode
2. Type your commit message
3. Press `Esc` to leave Insert mode
4. Type `:wq` and press Enter — this **w**rites (saves) and **q**uits

**Resolving a merge commit message** (happens after `git pull` when branches diverge): same as above — `i`, type/edit the message, `Esc`, `:wq`, Enter.

**You opened a file by mistake and just want out, no changes:**
`Esc`, then `:q!`, then Enter.

**You made changes in Insert mode by accident and want to undo them before quitting:**
Press `Esc` to get to Normal mode, then press `u` (undo) repeatedly to step backward through your changes, then `:wq` to save the cleaned-up version, or `:q!` to abandon everything and quit without saving at all.

### A few more vim commands, if you ever need to actually edit inside it

| Key(s) | What it does (must be in Normal mode) |
|---|---|
| `i` | Enter Insert mode at the cursor |
| `Esc` | Leave Insert mode, back to Normal mode |
| `:w` | Save (write) without quitting |
| `:wq` | Save and quit |
| `:q!` | Quit without saving |
| `dd` | Delete the current line |
| `ggdG` | Delete everything in the file (go to top, delete to bottom) |
| `u` | Undo last change |
| `Ctrl + r` | Redo (undo the undo) |
| `gg` | Jump to the very first line |
| `G` | Jump to the very last line |
| `/word` then Enter | Search for "word" in the file |

**You can avoid vim almost entirely** by always including your message directly in the command, e.g.:
```bash
git commit -m "your message here"
```
This never opens vim, since you already gave Git the message it would've otherwise asked for inside the editor.

If vim ever opens and you're unsure what state you're in, `Esc` then `:q!` then Enter always gets you out safely without saving or breaking anything.

---

## 6. Getting the project & making changes

### First time (cloning the repo)
```bash
git clone https://github.com/hrantmuradyann/Physics-and-we.git
(git clone creates a brand new folder on that person's computer, named after the repo (Physics-and-we), and downloads the entire project into it: all files, plus the full commit history and all branches that exist on GitHub.)
cd Physics-and-we
```
(You need to be added as a collaborator first.)

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

### The day after something gets merged into `main` — what to actually do

Say `feature/site-shell` (or any branch) just got merged into `main` on GitHub. Here's exactly what happens and what you do next, step by step.

**Step 1 — Get the merged content onto your machine:**
```bash
git checkout main
git pull
```
`git pull` downloads whatever changed on GitHub's `main` and applies it to your local `main`. After this, your local `main` folder will contain everything that was in the merged branch — all the HTML, CSS, JS, JSON files. Run `ls` and you'll see them all sitting there now.

**Step 2 — Never edit directly on `main`.** Even though the files are technically sitting right there and you *could* start typing, don't. The very next thing you do is start a new branch for whatever you're about to work on:
```bash
git checkout -b feature/camp-registration
```

**Step 3 — Now you edit.** You might open `camp.html` and add the curriculum section, create a brand-new file `js/registration.js` for the form logic, add new CSS rules to `css/style.css`, and add new `data-i18n` keys to all three JSON files. All of this happens on `feature/camp-registration`, not `main`.

**Step 4 — Commit, push, PR, merge** — same cycle as always (see sections 6 and 8).

### How do new files actually connect to the existing ones?

Nothing links automatically — every connection is something you write explicitly. Here's how each type of new addition plugs into what already exists:

- **A new JS file** (e.g. `js/registration.js`) → you manually add a `<script src="js/registration.js"></script>` tag inside whichever HTML page needs it (e.g. `camp.html`), right before `</body>`, the same way `main.js` is already linked in every page.
- **New CSS rules** → just typed into the existing `css/style.css`. No linking needed — every page already has `<link rel="stylesheet" href="css/style.css">` in its `<head>`, so any new rule you add applies immediately across the whole site.
- **New translation keys** → added to all three files in `js/lang/` (`en.json`, `hy.json`, `ru.json`), then referenced in HTML with `data-i18n="your_key"`. You don't need to touch `main.js` for this — its `loadLanguage()` function already loops through every element with a `data-i18n` attribute on the page and fills in the right text automatically.
- **A brand-new page** (e.g. a student login page you haven't built yet) → create the `.html` file following the same skeleton as the existing 6 pages (empty `<header id="site-header">` and `<footer id="site-footer">`, a `<link>` to `style.css`, a `<script>` for `main.js`), then add a new `<li><a href="...">...</a></li>` entry inside the `insertHeader()` function in `main.js` so it shows up in the nav bar on every page.

In short: `main.js`, `style.css`, and the `js/lang/*.json` files are the **shared glue** that every page already plugs into. New work almost always means *adding to* these shared files, plus creating focused new files (new HTML pages, new feature-specific JS files) rather than duplicating shared logic.

### What actually happens to `main` and the old branch after a merge

There's no magic — merging just means `main` becomes a snapshot that includes everything from the merged branch, as of that moment. Right after merging, `main` and the old branch (e.g. `feature/site-shell`) have **identical content**. From then on:

- The old branch (`feature/site-shell`) is done — delete it (GitHub offers a button for this right on the PR page after merging). It won't get any more commits.
- `main` keeps moving forward as more branches get merged into it over time.
- Every future branch starts fresh from `main`, as described in Step 1–2 above — never from an already-merged, retired branch.

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

### A branch is not a permanent home for a file — it's a temporary workspace for one task

A common confusion: **"if I need to change `index.html`, do I always work on `feature/site-shell`?"** No. A branch isn't tied to a specific file forever — it's tied to a specific *task*, for a limited time.

- **While `feature/site-shell` is still open (not yet merged):** any changes related to the shell — including edits to `index.html` — happen on that branch, because that's the task currently in progress.
- **Once `feature/site-shell` is merged into `main`:** that branch has done its job and is retired (delete it on GitHub after merging). It does **not** stay open forever waiting for more shell-related changes.
- **Any future change — even to the same file, like `index.html`** — gets its own new branch, created fresh off the latest `main`:
  ```bash
  git checkout main
  git pull
  git checkout -b feature/home-hero-banner
  ```
  Edit `index.html` there, commit, push, open a PR, merge, then delete that branch too.

So the same file (`index.html`, `style.css`, whatever) will be edited on many different branches over the life of the project — once per task, not once per file. The branch name should describe **what you're doing**, not **which file you're touching**: `feature/home-hero-banner` is a better name than `feature/index-html`, since one task might touch several files (HTML + CSS + a JSON translation file) at once.

**Rule of thumb:** one branch = one task = merge it = delete it = move on to the next branch for the next task.

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
