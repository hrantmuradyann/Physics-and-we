# How to change the website

This guide is for everyone who edits the site — you do **not** need to know
programming. It should take about ten minutes to read once.

---
__________________________________________________________________________________
Կրճատ
Section ներում բլոկերնա data ում տեքստերը
__________________________________________________________________________________
## The one rule

> **Text lives in the `data` folder. Nothing else.**

If you only want to change words — in Armenian or English — the `data`
folder is the only place you ever open. You never touch `js`, and almost never
touch `sections` or `css`.

---

## Where is what?

| I want to change… | Open this |
|---|---|
| any text on the **home** page | `data/home.json` |
| any text on the **labs** page | `data/labs.json` |
| the words of one **interactive lab** | `data/labs/<lab>.json` |
| the **summer camp** page | `data/camp.json` |
| the **research** page | `data/research.json` |
| the **partners** page | `data/partners.json` |
| the **FAQ** questions and answers | `data/faq.json` |
| the **about us** page | `data/about.json` |
| the heading of the **news** page | `data/news.json` |
| a **news item** | the admin page at `/admin/` — see `ADMIN-SETUP.md` |
| the **menu**, the **footer**, the **site name** | `data/site.json` |
| the **order of blocks** on a page | `sections/<page>.html` |
| **colours, sizes, spacing** | `css/site.css` |

`index.html` contains no text at all. There is nothing to edit there.

---

## Editing text — the basics

Open the file for your page. You will see blocks that look like this:

```json
"title": {
  "hy": "Ինտերակտիվ լաբորատորիաներ",
  "en": "Interactive Labs"
}
```

- `hy` = Armenian, `en` = English.
- **Change only what is between the quotation marks.**
- Keep the quotation marks, the colons and the commas exactly where they are.
- Both languages sit next to each other, so a translator can see the
  original and the translation at the same time.

Every file starts with a `"_readme"` line explaining what that file is for.
It is a note to you — it never appears on the website.

### The text in asterisks

Most of the site is currently filled with **placeholders** — short notes wrapped
in asterisks that say what belongs on that line instead of being real text:

```json
"title": {
  "hy": "*Ծրագրի անվանումը (1–3 բառ)*",
  "en": "*Program name (1–3 words)*"
}
```

Replace the whole value, asterisks included, with the real words — in both
languages. Anything still showing up in asterisks on the site has not been
written yet, so they are also your to-do list.

Some placeholders describe the text (`*One sentence about this program.*`) and
some show the shape of the answer instead (`*your@email.com*`, `*City, Country*`,
`*Duration · grades*`) — in that case follow the shape. Where a placeholder
mentions a length, such as *(1–3 words)*, it is because that line sits somewhere
narrow and a long answer will not fit.

The four numbers that count up on the home and camp pages are set to `0`. Those
are numbers rather than text, so they carry no asterisks — the `_readme` line
just above them explains the three parts of each one.

---

### Three small formatting tricks

Inside any long text you may use:

| You type | What appears |
|---|---|
| `\n\n` | a new paragraph |
| `**important**` | **important** in bold |
| `[our labs](?view=labs)` | a link to another page of the site |
| `[write to us](mailto:hello@physicsandwe.am)` | a link that opens the mail app |

Example:

```json
"text": {
  "en": "We started in one classroom.\n\nToday we work with **dozens** of schools."
}
```

---

## Adding one more card, question or day

Every list works the same way: find the list in the JSON file, copy one whole
block from `{` to `}`, paste it, put a comma between the blocks, and change the
words.

Before:

```json
"cards": [
  {
    "icon": "bulb",
    "title": { "hy": "Օպտիկա", "en": "Optics" },
    "text":  { "hy": "…", "en": "…" }
  }
]
```

After (one new lab added):

```json
"cards": [
  {
    "icon": "bulb",
    "title": { "hy": "Օպտիկա", "en": "Optics" },
    "text":  { "hy": "…", "en": "…" }
  },
  {
    "icon": "magnet",
    "title": { "hy": "Նոր լաբորատորիա", "en": "New lab" },
    "text":  { "hy": "…", "en": "…" }
  }
]
```

Note the comma **between** the two blocks, and **no comma after the last one**.
That single comma is the most common mistake — see "If the page goes blank"
below.

### The icons you can choose from

Type one of these names as the `"icon"`:

`atom` · `orbit` · `chart` · `people` · `flask` · `bulb` · `telescope` ·
`wave` · `magnet` · `calendar`

If you type a name that does not exist, the `atom` icon is used.

---

## Removing something

Delete the whole block from `{` to `}`, plus the comma that separated it from
its neighbour. If you delete the last block in a list, make sure the block
before it no longer ends with a comma.

You can also just empty the text (`"title": { "hy": "" }`) — an empty value is
hidden on the site instead of leaving a blank space.

---

## Adding a whole new page

Three steps:

1. **`data/site.json`** — add an entry to `"nav"`:
   ```json
   { "route": "library", "label": { "hy": "Գրադարան", "en": "Library" } }
   ```
2. **`sections/library.html`** — copy an existing page, for example
   `sections/labs.html`, and rename it. It is already in the right style.
3. **`data/library.json`** — copy `data/labs.json`, rename it, and put your
   own words in.

Nothing in the `js` folder has to change. The new page appears in the menu and
looks like the rest of the site automatically.

To keep a page but hide it from the menu, add `"hidden": true` to its nav entry
(that is how the "About us" page works — it is reachable from the footer).

---

## Looking at your changes

The site loads its text from files, and browsers refuse to do that when a page
is opened by double-clicking it. So **do not double-click `index.html`** — you
would see an empty page. Start a small local server instead:

Open a terminal in the project folder and run **one** of these:

```
python -m http.server 8000
```
```
npx serve .
```

Then open <http://localhost:8000> in your browser.

In VS Code you can also install the **Live Server** extension and click
"Go Live" at the bottom right — that does the same thing.

---

## If the page goes blank

Almost always a missing or extra comma in a JSON file.

1. Open the site in the browser.
2. Press **F12**, then click the **Console** tab.
3. A red line will name the file with the problem, e.g. `data/labs.json`.

You can also paste the file's contents into <https://jsonlint.com> — it points
at the exact line.

Checklist for the usual mistakes:

- a comma between blocks, but **not** after the last one
- every `"` opened is closed
- every `{` has a matching `}` and every `[` a matching `]`
- use straight quotes `"` — not the curly `"` `"` that Word inserts

---

## Who edits what — suggested split

Because every page has its own file, several people can work at the same time
without getting in each other's way:

| Person | Files they own |
|---|---|
| Labs coordinator | `data/labs.json` |
| Camp coordinator | `data/camp.json` |x
| Research mentor | `data/research.json` |
| Partnerships | `data/partners.json` |
| Anyone, via the admin page | news items |
| Translator | the `en` and `ru` lines in every `data/*.json` |
| Whoever maintains the site | `data/site.json`, `sections/`, `css/`, `js/` |

---

## For whoever maintains the code

The site is plain HTML, CSS and JavaScript — no build step, no frameworks, no
installation. Deploying means copying the folder to any static host.

```
index.html          the shell: loads the css and js, holds no content
sections/*.html     one file per page: layout only, no text
data/*.json         one file per page: text only, both languages
news.json           the news items (written by /admin/, do not hand-edit)
css/style.css       reset, colours, header, footer (shared with /admin/)
css/site.css        the look of every public page: the design system
css/home.css        only the big opening screen of the home page
css/admin.css       only the admin page
js/content.js       puts data/*.json into sections/*.html
js/main.js          language switching, header and footer
js/router.js        shows one page at a time, loads sections on demand
js/anim.js          fade-in on scroll, numbers counting up
js/home.js          the moving constellation on the home page
js/news.js          renders the news items
zibil/              old pages, kept only as redirects to the new ones
```

`js/content.js` documents the whole set of `data-*` attributes the section
files may use. There is no other template syntax to learn.
