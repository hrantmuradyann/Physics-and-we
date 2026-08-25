# How to write an interactive lab

An interactive lab is a small physics simulation that runs on its own page of
the site, at an address like `?view=lab&id=pendulum`.

This guide is for whoever writes the code. If you only want to change the
**words** of a lab that already exists, you do not need any of this — open
`data/labs/<name>.json` and read `EDITING-GUIDE.md` instead.

---

## The one rule

> **The physics goes in `js/labs/`. Every word a visitor reads goes in
> `data/labs/`.**

The site is in two languages. The moment you type `"Reset"` or `"Length"`
into a `.js` file, that lab stops being translatable and the editors can no
longer fix it without you.

---

## One lab is three files and one line

| | |
|---|---|
| `js/labs/pendulum.js` | the physics and the drawing |
| `data/labs/pendulum.json` | the title, the explanation, every label — in hy / en / ru |
| `data/labs.json` → `simulations.items` | the card that links to it from the Labs page |
| `index.html` | one `<script>` line so the browser loads it |

All three files use the **same name**, and that name is also the address:
`?view=lab&id=pendulum`. Use only lowercase letters, digits and hyphens.

---

## The fastest way: copy the pendulum

`js/labs/pendulum.js` is written to be copied. It uses every feature there is,
and each part is commented.

```bash
cp js/labs/pendulum.js   js/labs/optics.js
cp data/labs/pendulum.json data/labs/optics.json
```

Then:

1. In `js/labs/optics.js`, change `Labs.register("pendulum", …)` to
   `Labs.register("optics", …)` and replace the physics.
2. In `data/labs/optics.json`, replace the words.
3. In `data/labs.json`, copy the block inside `"simulations"` → `"items"` and
   change `"slug"` to `"optics"`.
4. In `index.html`, add one line next to the others:
   ```html
   <script src="js/labs/optics.js"></script>
   ```

Reload the page. That is the whole process.

---

## What the shell does for you

You never write any of this — `js/labs.js` does it for every lab:

- draws the page: title, back link, sliders, readings, **Play** and **Reset**
- gives you a canvas that is **always the right size** and sharp on a retina
  screen, and re-sizes itself when the window changes
- runs your drawing loop, and **stops it** the moment the lab scrolls off the
  screen or the visitor opens another page
- reads the visitor's language and hands you the words for it
- rebuilds the lab from scratch when the language is switched
- caps the time step, so a tab left in the background does not come back and
  blow your simulation up

---

## The lab definition

```js
Labs.register("pendulum", {

  icon:   "orbit",     // one of the icon names listed in EDITING-GUIDE.md
  aspect: 1.55,        // canvas width ÷ height

  controls: [ … ],     // the sliders and switches   (optional)
  readouts: [ … ],     // the numbers you write out  (optional)

  setup:   function (ctx)            { return state; },  // optional
  resize:  function (ctx, state)     { },                // optional
  change:  function (ctx, state, key){ },                // optional
  pointer: function (ctx, state, phase) { },             // optional
  frame:   function (ctx, state, dt) { },                // REQUIRED
  reset:   function (ctx, state)     { },                // optional
  stop:    function (ctx, state)     { }                 // optional
});
```

`frame` is the only one you must write. It is called about sixty times a
second: move the physics on by `dt` **seconds**, then draw.

`state` is whatever `setup` returned — the numbers your lab remembers between
frames. Keep everything there, not in variables outside the function, or a
second copy of the lab would share them.

### When each one is called

| | |
|---|---|
| `setup` | once, when the lab is built, and again on **Reset** if you have no `reset` |
| `resize` | the canvas changed shape — throw away anything you stored in pixels |
| `change` | a slider was moved; `key` is which one |
| `pointer` | the visitor pressed, dragged or released; `phase` is `"down"`, `"move"` or `"up"` |
| `frame` | every frame while the lab is on screen, and once whenever it is paused and something changes |
| `reset` | the **Reset** button. The sliders are already back at their starting values |
| `stop` | the lab is being taken down. Only needed if you started something the shell does not know about |

---

## `ctx` — everything you are given

| | |
|---|---|
| `ctx.g` | the ordinary canvas 2D context — `ctx.g.beginPath()`, `ctx.g.arc(…)`, … |
| `ctx.w`, `ctx.h` | the size to draw in. **Always use these**, never `canvas.width` |
| `ctx.clear()` | wipe the canvas — call it first, every frame |
| `ctx.value("length")` | where a slider is now (a number), or a switch (`true` / `false`) |
| `ctx.setValue("length", 2)` | move a slider from code |
| `ctx.show("period", "1.98 s")` | write one of your readouts |
| `ctx.word("hint")` | a word from this lab's JSON, in the visitor's language |
| `ctx.color` | the site's palette: `accent`, `accent2`, `soft`, `muted`, `text`, `line`, `grid` |
| `ctx.pointer` | `{ x, y, down, inside }` — in the same pixels as `ctx.w` and `ctx.h` |
| `ctx.t` | seconds since the lab started |
| `ctx.lang` | `"hy"` or `"en"`, if you ever need to know |
| `ctx.play()`, `ctx.pause()` | start or stop the loop yourself |

---

## Adding a slider

In `js/labs/<name>.js`:

```js
controls: [
  { key: "length", min: 0.2, max: 2.5, step: 0.01, value: 1.0, unit: "m" }
]
```

In `data/labs/<name>.json`:

```json
"controls": {
  "length": { "hy": "Թելի երկարություն", "en": "String length" }
}
```

Read it with `ctx.value("length")`. An on/off switch is the same, with
`type: "toggle"` and `value: true` instead of `min` / `max` / `step`.

## Adding a number the lab writes out

```js
readouts: ["period", "angle"]
```

```json
"readouts": {
  "period": { "hy": "Պարբերություն", "en": "Period" }
}
```

Write to it from `frame` with `ctx.show("period", value.toFixed(2) + " s")`.

---

## The words file

```json
{
  "title":       { "hy": "…", "en": "…" },
  "lead":        { … },   "canvasAlt": { … },   "hint": { … },
  "theoryTitle": { … },   "theory":    { … },
  "controls":    { "length": { … } },
  "readouts":    { "period": { … } }
}
```

`theory` is the explanation under the lab. It takes the same formatting as the
rest of the site: a blank line (`\n\n`) starts a paragraph, `**word**` is bold.

`canvasAlt` is what a blind visitor's screen reader says instead of the
picture. Please write it.

The buttons every lab shares — **Play**, **Pause**, **Reset**, **← All labs** —
are not here. They are in `data/site.json` under `"ui"`, so that changing one
changes it everywhere.

---

## Rules that will bite you if you break them

**Never start your own `requestAnimationFrame`.** The shell runs your `frame`
and stops it when nobody is looking. A loop of your own would keep running
after the visitor has left the page, on every lab they ever opened, until they
close the tab.

**Never store pixels across a resize.** Anything measured in pixels — a trail,
a stored click position — is wrong the moment the canvas changes shape. Clear
it in `resize`. Anything stored in real units (seconds, metres, radians)
survives, so prefer those.

**`dt` can be `0`.** The shell draws a single frame when the lab is paused and
a slider moves. Your `frame` must be able to just draw, without moving
anything.

**`dt` is capped at 0.05 s.** A tab that was in the background hands back a
jump of several seconds, which makes any simulation explode. The shell caps it
for you — but it does mean a slow computer runs your lab in slow motion rather
than skipping. If your physics needs finer steps than that, do what the
pendulum does and take several small steps inside one frame.

**Draw with `ctx.w` and `ctx.h`.** The canvas is bigger than that on a retina
screen, and the shell has already scaled the drawing to match.

**Nothing typed by a visitor ever reaches a lab.** The address is checked
before your file is even asked for. Keep it that way: never put anything from
the URL into `innerHTML`.

---

## The smallest lab that works

```js
(function () {
  "use strict";

  Labs.register("hello", {
    icon: "atom",
    controls: [{ key: "speed", min: 0.2, max: 4, step: 0.1, value: 1 }],
    readouts: ["position"],

    setup: function () {
      return { x: 0 };
    },

    frame: function (ctx, state, dt) {
      state.x += ctx.value("speed") * 60 * dt;
      if (state.x > ctx.w) state.x = 0;

      ctx.show("position", Math.round(state.x) + " px");

      ctx.clear();
      ctx.g.fillStyle = ctx.color.accent;
      ctx.g.beginPath();
      ctx.g.arc(state.x, ctx.h / 2, 18, 0, Math.PI * 2);
      ctx.g.fill();
    }
  });
})();
```

---

## When it does not work

| What you see | What it usually is |
|---|---|
| "Choose a lab" instead of your lab | the name in the address does not match `Labs.register("…")`, or you forgot the `<script>` line in `index.html` |
| The page is empty | open the browser console (F12). A mistake in your `.js` file is printed there |
| Labels show as `length`, `period` | that name is missing from `"controls"` / `"readouts"` in your JSON |
| Nothing moves | is the button showing **Play**? A visitor whose device asks for reduced motion starts paused on purpose |
| It works alone but not from the Labs page | the `"slug"` in `data/labs.json` does not match the file names |
| Everything is blurry | you drew with `canvas.width` instead of `ctx.w` |

Remember that opening `index.html` by double-clicking never works — the site
has to be served. `python3 -m http.server 8000`, then
`http://localhost:8000`. See `../README.md`.
