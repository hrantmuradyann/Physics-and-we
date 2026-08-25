# Physics and We

This README is written for collaborators. Read it before you start.

Other guides live in the **`Instructions/`** folder:

| If you are here to… | Read |
|---|---|
| write or translate **content** (no programming) | `Instructions/EDITING-GUIDE.md` |
| build an **interactive lab** (a simulation) | `Instructions/LABS-GUIDE.md` |
| touch the **HTML or CSS** | `Instructions/HTML-CLASSES.md` (for whatever reason in Russian) |
| run the **admin panel** | `Instructions/ADMIN-SETUP.md` |
| put the site **online** | `Instructions/SECURITY.md` — read before deploying |

---

## 1. What's built so far

The whole public site works: home, summer camp, interactive labs, research,
news, partners, FAQ and about — in **three languages** (Armenian, English,
Russian), with a shared header, footer and design.

The important thing to understand is **how it is put together**, because it is
not the usual "one HTML file per page with the text typed into it".

### One page, swapped in and out

`index.html` is the only real web page in the project. It holds **no content at
all** — just the CSS and JS links, and three empty slots:

```html
<header id="site-header"></header>   <!-- built by js/main.js -->
<main   id="app"></main>             <!-- pages are swapped in here -->
<footer id="site-footer"></footer>   <!-- built by js/main.js -->
```

The files in `sections/` are **not** web pages. They have no `<!DOCTYPE>`, no
`<head>`, no `<body>` — they are fragments that get dropped inside `#app`. You
cannot open one in a browser on its own.

When a visitor clicks a menu item, `js/router.js` catches the click, cancels the
browser's normal navigation, fetches that section, and shows it. **The browser
never reloads.** That is why the header, the language choice and the news
already fetched all survive as you move around the site.

### Layout and words are separate

Every page is two files that never mix:

```
sections/faq.html    the SHAPE   — empty boxes, no text
data/faq.json        the WORDS   — hy / en / ru, no markup
```

`js/content.js` pours the second into the first.

**Why it is done this way:** the people writing the content never open HTML,
never need to know what a `<div>` is, and cannot break the layout. They open one
JSON file, change the words in three languages, and that is it. Several people
can work on different pages at the same time without touching the same file.

### How a page actually appears, step by step

1. The browser loads `index.html` — the only time it ever does.
2. `js/main.js` reads `data/site.json` and builds the menu and the footer.
3. `js/router.js` reads the address, then fetches `sections/<page>.html` and
   `data/<page>.json`.
4. It wraps the markup in `<section class="view" id="view-<page>">` inside
   `#app`, and `js/content.js` fills in the text.
5. `js/anim.js` starts the fade-ins and the counting numbers.
6. In the background the router quietly pre-loads every other page, so the menu
   feels instant.

After a few clicks, `#app` contains **every page at once** — CSS shows one:
`.view { display: none }` / `.view.active { display: block }`.

Two consequences worth knowing:

- A `<script>` inside a `sections/*.html` file **will never run**. Markup added
  with `innerHTML` never executes scripts. All JavaScript lives in `js/` and
  hooks in through the `section:ready` event.
- Every `id` must be unique across the **whole site**, not just one page,
  because all the pages share one document.

> **Note:** because the site loads its content from files, it will not work when
> you open `index.html` by double-clicking it. Start a local server instead —
> see section 6, "Preview the site locally".

### News

News items are a special case: they are written through the admin panel at
`/admin/`, which saves `news.json` for you — see `Instructions/ADMIN-SETUP.md`.
Each item gets **its own page** at `?view=post&id=<address>`; the news page
itself is a feed of cards leading to them.

Careful — there are two files called `news.json` and they are unrelated:

| | |
|---|---|
| `news.json` (main folder) | the news items. Written by the admin panel. **Never edit by hand.** |
| `data/news.json` | only the heading of the news page. Edited by you. |

The panel is behind a username and password, checked on the server before the
page is ever sent. **`Instructions/SECURITY.md` lists what must be changed
before the site goes online** — read it before deploying.

### Interactive labs

A lab is a physics simulation that runs on its own page at
`?view=lab&id=<address>`, for example `?view=lab&id=pendulum`.

Labs follow the same split as everything else — code and words apart:

```
js/labs/pendulum.js       the physics   (a programmer writes this)
data/labs/pendulum.json   the words     (a translator writes this)
```

`js/labs.js` is the shell they all run inside. It draws the page around the
simulation — title, sliders, readings, Play and Reset, the explanation — gives
the lab a canvas that is always the right size and sharp on a retina screen,
runs its drawing loop, and **stops that loop the moment the lab leaves the
screen** so a laptop fan never spins for a page nobody is looking at.

So writing a lab means writing physics and words. Nothing else.
`js/labs/pendulum.js` is written to be copied — see
`Instructions/LABS-GUIDE.md`.

---

## 2. Project structure

```
Physics-and-we/
├── index.html           → the shell. Loads css + js, contains no text
├── README.md            → this file
├── news.json            → the news items (written by /admin/, not by hand)
├── .gitignore           → keeps passwords and tokens out of the repository
├── .dev.vars.example    → template for local settings; copy to .dev.vars
│
├── Instructions/        → the guides for humans
│   ├── EDITING-GUIDE.md     → how to change content (written for non-coders)
│   ├── LABS-GUIDE.md        → how to write an interactive lab
│   ├── HTML-CLASSES.md      → every CSS class in the markup, explained (RU)
│   ├── ADMIN-SETUP.md       → running the admin panel, locally and deployed
│   └── SECURITY.md          → what protects /admin/ — READ BEFORE DEPLOYING
│
├── images/
│   ├── mainphoto.jpg    → the picture on the home page
│   ├── history*.jpg     → the photographs on the inner pages
│   ├── logo-light.png   → the logo on the dark public pages
│   ├── logo-dark.png    → the logo on the light admin pages
│   ├── logo-mark.png    → the browser-tab icon
│   └── news/            → the main photo of each news item
│
├── sections/            → ONE FILE PER PAGE — layout only, no text
│   ├── home.html
│   ├── camp.html
│   ├── labs.html        → the list of labs (both kinds)
│   ├── lab.html         → ONE interactive lab, on its own page
│   ├── research.html
│   ├── news.html        → the news feed
│   ├── post.html        → ONE news item, on its own page
│   ├── partners.html
│   ├── faq.html
│   └── about.html
│
├── data/                → ONE FILE PER PAGE — text only, all 3 languages
│   ├── site.json        → the menu, the footer, words shared by every page
│   ├── home.json
│   ├── camp.json
│   ├── labs.json        → the labs page: "simulations" + "cards"
│   ├── lab.json         → almost empty on purpose (see the note inside)
│   ├── labs/            → ONE FILE PER LAB — the words of that lab
│   │   └── pendulum.json
│   ├── research.json
│   ├── news.json        → only the heading of the news page
│   ├── partners.json
│   ├── faq.json
│   └── about.json
│
├── css/
│   ├── style.css        → reset, colours, header, footer (shared with /admin/)
│   ├── site.css         → the look of every public page — the design system
│   ├── home.css         → only the big opening screen of the home page
│   ├── labs.css         → only the page of one interactive lab
│   └── admin.css        → only the admin page
│
├── js/
│   ├── content.js       → puts data/*.json into sections/*.html
│   ├── main.js          → language switching, header and footer
│   ├── router.js        → shows one page at a time, loads sections on demand
│   ├── anim.js          → fade-in on scroll, numbers counting up
│   ├── home.js          → the moving constellation on the home page
│   ├── news.js          → the news feed and the page of one news item
│   ├── labs.js          → the shell every interactive lab runs inside
│   ├── labs/            → ONE FILE PER LAB — the physics of that lab
│   │   └── pendulum.js
│   ├── admin.js         → the admin panel (not loaded by the public site)
│   └── admin-login.js   → the login screen
│
├── admin/
│   ├── index.html       → the admin panel  (behind the login)
│   └── login.html       → the login screen (the only page that is not)
│
└── functions/           → the server side, run by Cloudflare
    └── admin/
        ├── _middleware.js      → the lock: checks every /admin request
        └── api/
            ├── session.js      → log in / log out + the shared security code
            ├── publish.js      → writes news.json to GitHub
            └── upload.js       → stores one photo
```

### The three folders that matter

**`data/` — the text.** One file per page. Every piece of text is an object with
the three languages side by side:

```json
"title": {
  "hy": "Ինտերակտիվ լաբորատորիաներ",
  "en": "Interactive Labs",
  "ru": "Интерактивные лаборатории"
}
```

There is no separate `en.json` / `hy.json` / `ru.json`, and no
`translations.json`. A translator opens the page they are translating and sees
the original right next to the empty line they need to fill. A value that is
missing is **hidden** on the site rather than shown as an empty box, so a
half-finished translation never looks broken.

**`sections/` — the layout.** Plain HTML with class names and no text. Where a
text goes, the element carries a `data-text` attribute naming the value it wants
out of that page's JSON:

```html
<h1 class="page-head__title" data-text="page.title"></h1>
```

Repeating things (cards, questions, days) use a `<template>` that is copied once
per item in the JSON list:

```html
<div class="grid grid--cards" data-list="cards">
  <template>
    <article class="card">
      <span class="card__icon" data-icon="icon"></span>
      <h3 class="card__title" data-text="title"></h3>
      <p  class="card__text"  data-text="text"></p>
    </article>
  </template>
</div>
```

So adding a lab card means adding a block to `data/labs.json` — the HTML never
changes. The whole set of attributes:

| Attribute | What it does |
|---|---|
| `data-text="hero.title"` | plain text |
| `data-rich="story.text"` | same, but a blank line starts a paragraph, `**word**` is bold, `[word](url)` is a link |
| `data-list="cards"` | repeat the inner `<template>` once per item |
| `data-icon="icon"` | draw the icon whose **name** is in the JSON |
| `data-image` / `data-alt` | a picture and its description |
| `data-route="button.route"` | make it a link to another page |
| `data-route-id="slug"` | …to **one thing** on that page, e.g. one lab |
| `data-number="number"` | a number that counts up when scrolled to |
| `data-ui="learnMore"` | a word shared by all pages (`data/site.json`) |

The full explanation is at the top of `js/content.js`; there is nothing else to
learn.

**`css/` — the look.** `css/site.css` is the design system: a handful of blocks
(`.page-head`, `.band`, `.grid--cards`, `.card`, `.steps`, `.timeline`, `.faq`,
`.cta`, `.showcase`, `.post-card`, `.reveal`) that every page is built from.
Because all pages use the same blocks, a new page looks right without any new
CSS. Colours and sizes are CSS variables in the `:root { }` block of
`css/style.css` — reuse them instead of hardcoding new values.

Keep CSS in the CSS files: no `style="..."` attributes in the HTML, and no
`<style>` blocks inside pages.

### Adding a new page

1. Add an entry to `"nav"` in `data/site.json`:
   ```json
   { "route": "library", "label": { "hy": "Գրադարան", "en": "Library", "ru": "Библиотека" } }
   ```
2. Create `sections/library.html` — copy an existing page as a starting point.
3. Create `data/library.json` with the text.

No JavaScript changes are needed; the router picks it up from the nav entry.
A page that should exist but not appear in the menu gets `"hidden": true` — that
is how `about`, `post` and `lab` work.

### Adding a new interactive lab

Four steps, and the fastest way is to copy the pendulum:

```bash
cp js/labs/pendulum.js    js/labs/optics.js
cp data/labs/pendulum.json data/labs/optics.json
```

1. In `js/labs/optics.js`, change `Labs.register("pendulum", …)` to
   `Labs.register("optics", …)` and replace the physics.
2. In `data/labs/optics.json`, replace the words.
3. In `data/labs.json`, copy a block inside `"simulations"` → `"items"` and set
   `"slug": "optics"`.
4. In `index.html`, add one line next to the others:
   ```html
   <script src="js/labs/optics.js"></script>
   ```

The name must match in all four places — it is also the address,
`?view=lab&id=optics`. Use lowercase letters, digits and hyphens only.

Full reference, including everything the shell hands your lab:
**`Instructions/LABS-GUIDE.md`**.

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
(base) Hrants-MacBook-Pro:Physics-and-we hrant$
```
That's just: `(base)` = a Python environment indicator (from Anaconda, ignore it), your computer's name, your **current folder**, your username, then `$` marks where you type.

### What terminal to use on Windows

Windows' built-in terminals (Command Prompt, PowerShell) use different commands than Mac/Linux (e.g. `dir` instead of `ls`). To avoid confusion, use **Git Bash** instead — it comes bundled with Git for Windows (see setup section above) and understands the same commands as Mac Terminal.

Open it via the Start menu: type `Git Bash`, press Enter. You'll see a similar prompt:
```
hrant@DESKTOP-XXXX MINGW64 ~/Desktop/Physics-and-we
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
cd Desktop/Physics-and-we
```
On Windows Git Bash, your Desktop is usually reached the same way:
```bash
cd Desktop/Physics-and-we
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
cd Physics-and-we
```

**What `git clone` actually does:** it creates a brand new folder on your computer, named after the repo (`Physics-and-we`), in whatever directory you ran the command from. Inside that new folder, it downloads the entire project — every file, plus the complete commit history and every branch that exists on GitHub. You only need to run `clone` **once ever**, on each computer you work from. After that, you use `git pull` to get updates into that same folder — running `clone` again would try to create the folder a second time and fail (or duplicate it) since it already exists.


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

**What actually happens when you create a branch:** `git checkout -b` takes a full snapshot of whatever branch you're currently on (`main`, if you just ran `git checkout main && git pull`) and creates a brand new, independent copy of it under a new name. So your new branch starts out **identical** to `main` — every file, all the content — nothing is missing and nothing needs to be re-downloaded. From that moment on, the new branch and `main` are separate: any changes you make and commit only exist on your new branch, and `main` stays exactly as it was until you merge your branch back into it later.

Think of it like duplicating a folder on your computer, renaming the copy, and only working inside the copy — the original stays untouched until you deliberately copy your changes back into it (which is what merging does).

**Why do we use branches instead of just editing files directly?**
1. **Isolation** — if you're mid-way through building something and it's broken, `main` (the "real," working version of the site) is never affected, since your changes only exist on your own branch until merged.
2. **Parallel work** — multiple people can build totally different features at the same time without their half-finished work colliding.
3. **Review before it counts** — a Pull Request lets someone look over your changes before they become part of `main`, catching mistakes early.
4. **Clean history** — you can always look back and see exactly which branch/PR introduced any given feature.

### Preview the site locally
```bash
python3 -m http.server 8000
```
Then open your browser to:
```
http://localhost:8000
```
**Important:** don't just double-click `index.html` or use `open index.html` — you will get a blank page. Every page's layout and text is loaded with `fetch()`, which browsers block on files opened directly (`file://...`). It only works when served through `http://localhost`.

Stop the server anytime with `Ctrl + C` in that terminal window.

### You don't have to edit files in the terminal — VS Code (or any editor) works fine

Terminal is only needed for the **Git commands** — `clone`, `pull`, `checkout`, `add`, `commit`, `push` — not for actually writing or editing your HTML/CSS/JS. Most people do their real editing in a proper code editor like **VS Code**, and only switch to Terminal for the Git steps. A normal working session looks like this:

1. Open your project folder in VS Code: `File → Open Folder` → select `Physics-and-we`
2. Make sure you've already pulled the latest `main` and created your branch (Terminal, as above)
3. Edit your files in VS Code — full syntax highlighting, autocomplete, much easier to read/write than editing directly in Terminal
4. Save normally (`Cmd + S` / `Ctrl + S`)
5. Switch back to Terminal (or use VS Code's **built-in terminal** — press `` Ctrl + ` `` or go to `Terminal → New Terminal`, so you don't even need to leave the app) and commit/push as usual:
   ```bash
   git add .
   git commit -m "your message"
   git push
   ```

VS Code also has a **Source Control tab** (branch-shaped icon in the left sidebar) that shows which files changed and lets you stage/commit by clicking instead of typing — works exactly the same as typing the commands, just a visual alternative if you prefer it.

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

**Step 3 — Now you edit.** You might add a curriculum block to `sections/camp.html` and its text to `data/camp.json`, create a brand-new file `js/registration.js` for the form logic, and add new CSS rules to `css/site.css`. All of this happens on `feature/camp-registration`, not `main`.

**Step 4 — Commit, push, PR, merge** — same cycle as always (see sections 6 and 8).

### How do new files actually connect to the existing ones?

Nothing links automatically — every connection is something you write explicitly. Here's how each type of new addition plugs into what already exists:

- **A new JS file** (e.g. `js/registration.js`) → add one `<script src="js/registration.js"></script>` tag at the bottom of `index.html`, next to the others. There is only one HTML shell, so you do this once. Have it listen for the `section:ready` event (see `js/news.js` for the pattern) so it runs when its page is put on screen. **A `<script>` written inside a `sections/*.html` file will never run** — that is a browser rule, not a project one.
- **A new interactive lab** → two files (`js/labs/<name>.js` and `data/labs/<name>.json`), one block in `data/labs.json`, one `<script>` line. See `Instructions/LABS-GUIDE.md`.
- **New CSS rules** → typed into `css/site.css`. No linking needed — `index.html` already loads it, so the rule applies across the whole site immediately. Reuse the existing blocks (`.card`, `.band`, `.grid--cards`, …) before inventing new ones.
- **New text** → add it to that page's file in `data/`, as an object with `hy`, `en` and `ru`. Then reference it from the layout with `data-text="your.key"`. If you only speak one of the languages, fill in the one you know and leave the others as empty strings — an empty value is hidden on the site, and whoever handles translations fills it in later.
- **A brand-new page** → three small steps, no JavaScript: an entry in `"nav"` in `data/site.json`, a `sections/<route>.html` layout (copy an existing one), and a `data/<route>.json` with the text. It appears in the menu and matches the site's design automatically.

In short: `index.html`, `data/site.json` and `css/site.css` are the **shared glue** that every page already plugs into. New work almost always means *adding to* these shared files, plus creating focused new files (a new section, a new data file, a new lab) rather than duplicating shared logic.

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

## 9. What is `feature/site-shell`, and how do branches really work?

`feature/site-shell` is the name of the Git **branch** where the site's foundation (layout, nav, footer, base styles, language switching) was built. You can view its exact state on GitHub here:

https://github.com/hrantmuradyann/Physics-and-we/tree/feature/site-shell

A **branch** is a full, independent copy of the project at a specific point in time — created from whatever branch you were on when you ran `git checkout -b`. Every new feature (registration, submissions, labs, student portal, admin panel) will live on its own branch, following the same pattern:

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

So the same file (`index.html`, `style.css`, whatever) will be edited on many different branches over the life of the project — once per task, not once per file. The branch name should describe **what you're doing**, not **which file you're touching**: `feature/home-hero-banner` is a better name than `feature/index-html`, since one task might touch several files (HTML + CSS + a JSON translation key) at once.

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
