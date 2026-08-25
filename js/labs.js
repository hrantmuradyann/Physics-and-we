/* ============================================================================
   labs.js — the shell that every interactive lab runs inside.

   YOU DO NOT NEED TO READ THIS FILE TO WRITE A LAB.
   Read  Instructions/LABS-GUIDE.md  instead — it is the short version of everything below.

   WHAT THIS FILE DOES FOR A LAB, SO THE LAB DOES NOT HAVE TO
     · draws the page around it: title, back link, sliders, readings, buttons
     · gives it a canvas that is always the right size and sharp on a retina
       screen, and re-sizes itself when the window changes
     · runs its drawing loop, and STOPS that loop the moment the lab scrolls
       off the screen or the visitor goes to another page — a lab that is not
       being looked at must never keep a laptop fan running
     · reads the visitor's language and hands the lab its own words
     · rebuilds the whole thing when the language is switched

   ONE LAB IS TWO FILES
     js/labs/pendulum.js      the physics   — registers itself here
     data/labs/pendulum.json  the words     — in Armenian and English

   Both are found by the same name, which is also what appears in the address:
       ?view=lab&id=pendulum
   ========================================================================== */
(function (global) {
  "use strict";

  var TEXT_DIR = "data/labs/";
  var MAX_STEP = 0.05;        // seconds — the biggest jump a lab is ever given

  var registry = {};          // name -> the lab's definition
  var order = [];             // the order labs were registered in
  var textCache = {};         // name -> promise of that lab's words
  var active = null;          // the lab currently built, so it can be taken down
  var generation = 0;         // counts builds, so a slow one cannot come back

  var reduceMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================================================================
     1. Registering a lab
     ====================================================================== */

  // Called by js/labs/<name>.js at the bottom of the file.
  function register(name, definition) {
    if (!name || !definition || typeof definition.frame !== "function") {
      console.error('Labs.register("' + name + '"): a lab must have a frame() function.');
      return;
    }
    if (!registry[name]) order.push(name);
    registry[name] = definition;
  }

  /* ======================================================================
     2. The words of one lab
     ====================================================================== */

  // Only a lab that has registered itself is ever fetched, so nothing typed
  // into the address bar can turn into a request for some other file.
  function loadText(name) {
    if (textCache[name]) return textCache[name];
    textCache[name] = fetch(TEXT_DIR + name + ".json", { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : {}; })
      .catch(function (err) {
        console.error("Could not load " + TEXT_DIR + name + ".json:", err);
        return {};
      });
    return textCache[name];
  }

  /* ======================================================================
     3. Small helpers
     ====================================================================== */

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function word(key, fallback) {
    return Site.word(key) || fallback || "";
  }

  // The colours of a lab come from the site's own palette, so a change in
  // css/style.css moves the drawings too.
  function palette() {
    var style = getComputedStyle(document.documentElement);
    function read(name, fallback) {
      return (style.getPropertyValue(name) || "").trim() || fallback;
    }
    return {
      accent: read("--dark-accent", "#2f80ed"),
      accent2: read("--dark-accent-2", "#6f5cff"),
      soft: read("--dark-accent-soft", "#7ea8ff"),
      muted: read("--dark-muted", "#9aa6c4"),
      text: read("--dark-text", "#e8ecf6"),
      background: read("--dark-bg-3", "#0a1024"),
      line: "rgba(255, 255, 255, 0.10)",
      grid: "rgba(255, 255, 255, 0.05)"
    };
  }

  // How many decimal places a slider's number should be shown with, worked
  // out from its step so a lab never has to say.
  function decimalsFor(step) {
    var text = String(step === undefined ? 1 : step);
    var dot = text.indexOf(".");
    return dot === -1 ? 0 : Math.min(text.length - dot - 1, 4);
  }

  /* ======================================================================
     4. Building the page of one lab
     ====================================================================== */

  function mount(host, name, definition, words) {
    var colors = palette();
    var lang = Site.lang;
    var controls = definition.controls || [];
    var readouts = definition.readouts || [];

    var inputs = {};      // control name -> the <input>
    var values = {};      // control name -> the number or true/false
    var outputs = {};     // readout name -> the <span> its value goes in

    /* ---------- the words of this lab ---------- */

    function labWord(path, fallback) {
      var value = Content.inLang(Content.valueAt(words, path), lang);
      return value || fallback || "";
    }

    /* ---------- heading ---------- */

    var article = element("article", "lab");

    var head = element("header", "lab__head reveal");
    head.appendChild(backLink());
    head.appendChild(element("h1", "lab__title", labWord("title", name)));
    var lead = labWord("lead");
    if (lead) head.appendChild(element("p", "lab__lead", lead));
    article.appendChild(head);

    /* ---------- the canvas and the panel beside it ---------- */

    var stage = element("div", "lab__stage reveal");

    var frame = element("div", "lab__frame");
    var canvas = document.createElement("canvas");
    canvas.className = "lab__canvas";
    // A lab is a picture, and a picture needs a description. Labs that draw
    // something a blind visitor cannot use say so in their own words.
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", labWord("canvasAlt", labWord("title", name)));
    frame.appendChild(canvas);
    stage.appendChild(frame);

    var panel = element("div", "lab__panel");

    /* ---------- sliders and switches ---------- */

    if (controls.length) {
      var controlBox = element("div", "lab__controls");
      controls.forEach(function (control) {
        controlBox.appendChild(buildControl(control));
      });
      panel.appendChild(controlBox);
    }

    /* ---------- the numbers the lab writes out ---------- */

    if (readouts.length) {
      var readoutBox = element("div", "lab__readouts");
      readouts.forEach(function (key) {
        var row = element("div", "lab-readout");
        row.appendChild(element("span", "lab-readout__label",
          labWord("readouts." + key, key)));
        var value = element("span", "lab-readout__value", "—");
        outputs[key] = value;
        row.appendChild(value);
        readoutBox.appendChild(row);
      });
      panel.appendChild(readoutBox);
    }

    /* ---------- play / pause / reset ---------- */

    var buttons = element("div", "lab__buttons");

    var playButton = element("button", "btn btn--ghost btn--sm");
    playButton.type = "button";
    buttons.appendChild(playButton);

    var resetButton = element("button", "btn btn--ghost btn--sm",
      word("labReset", "Reset"));
    resetButton.type = "button";
    buttons.appendChild(resetButton);

    panel.appendChild(buttons);
    stage.appendChild(panel);
    article.appendChild(stage);

    /* ---------- the sentence under the canvas ---------- */

    var hint = labWord("hint");
    if (hint) article.appendChild(element("p", "lab__hint reveal", hint));

    /* ---------- the explanation ---------- */

    var theory = Content.inLang(Content.valueAt(words, "theory"), lang);
    if (theory) {
      var theoryBox = element("section", "lab__theory reveal");
      var theoryTitle = labWord("theoryTitle");
      if (theoryTitle) {
        theoryBox.appendChild(element("h2", "lab__theory-title", theoryTitle));
      }
      var prose = element("div", "prose");
      // The explanation is written by us, in the JSON file, and goes through
      // the same small formatting language as the rest of the site.
      prose.innerHTML = richText(theory);
      theoryBox.appendChild(prose);
      article.appendChild(theoryBox);
    }

    /* ---------- the way back ---------- */

    var foot = element("footer", "lab__foot reveal");
    foot.appendChild(backLink());
    article.appendChild(foot);

    host.appendChild(article);

    /* ------------------------------------------------------------------
       The moving part
       ------------------------------------------------------------------ */

    var g = canvas.getContext("2d");
    var aspect = definition.aspect || 1.7;
    var minHeight = definition.minHeight || 240;
    var maxHeight = definition.maxHeight || 560;

    var wantRun = !reduceMotion;   // what the visitor asked for
    var onScreen = false;          // whether the canvas can actually be seen
    var rafId = null;
    var lastTime = 0;
    var state = null;

    var api = {
      g: g,                        // the 2D drawing context
      canvas: canvas,
      w: 0,                        // width in ordinary pixels
      h: 0,                        // height in ordinary pixels
      dpr: 1,
      t: 0,                        // seconds since the lab was built
      lang: lang,
      color: colors,
      pointer: { x: 0, y: 0, down: false, inside: false },

      value: function (key) { return values[key]; },

      setValue: function (key, next) {
        var input = inputs[key];
        if (!input) return;
        if (input.type === "checkbox") input.checked = !!next;
        else input.value = String(next);
        readControl(key);
      },

      show: function (key, text) {
        if (outputs[key]) outputs[key].textContent = String(text);
      },

      word: labWord,

      clear: function () {
        g.clearRect(0, 0, api.w, api.h);
      },

      // Handy for a lab that wants to stop itself, e.g. when a run finishes.
      pause: function () { setWantRun(false); },
      play: function () { setWantRun(true); }
    };

    /* ---------- sizing ---------- */

    var lastWidth = 0;
    var lastDpr = 0;

    function measure() {
      var box = frame.getBoundingClientRect();
      // While the lab is on a page the visitor is not looking at, the frame
      // has no size at all. Keep the last good measurement rather than
      // collapsing the canvas to nothing.
      if (!box.width) return;

      var width = box.width;
      // Setting the height below changes the frame, which calls this again.
      // Nothing has really changed unless the width or the screen did.
      if (width === lastWidth && Math.min(global.devicePixelRatio || 1, 2) === lastDpr) return;
      lastWidth = width;
      var height = Math.max(minHeight, Math.min(width / aspect, maxHeight));
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      lastDpr = dpr;

      api.w = width;
      api.h = height;
      api.dpr = dpr;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = height + "px";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (definition.resize) definition.resize(api, state);
      drawOnce();
    }

    /* ---------- the loop ---------- */

    function drawOnce() {
      if (!api.w) return;
      definition.frame(api, state, 0);
    }

    function step(now) {
      rafId = requestAnimationFrame(step);
      var dt = lastTime ? (now - lastTime) / 1000 : 0;
      lastTime = now;
      // A tab that was in the background hands back an enormous jump. Feeding
      // that to a simulation makes it explode, so it is capped here once, for
      // every lab, rather than in each of them.
      if (dt > MAX_STEP) dt = MAX_STEP;
      api.t += dt;
      definition.frame(api, state, dt);
    }

    function startLoop() {
      if (rafId !== null) return;
      lastTime = 0;
      rafId = requestAnimationFrame(step);
    }

    function stopLoop() {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    function sync() {
      if (wantRun && onScreen) startLoop();
      else stopLoop();
    }

    function setWantRun(next) {
      wantRun = !!next;
      playButton.textContent = wantRun ? word("labPause", "Pause") : word("labPlay", "Play");
      playButton.setAttribute("aria-pressed", wantRun ? "true" : "false");
      sync();
    }

    /* ---------- controls ---------- */

    function buildControl(control) {
      var key = control.key;
      var label = labWord("controls." + key, key);

      if (control.type === "toggle") {
        var toggle = element("label", "lab-toggle");
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = control.value !== false;
        box.addEventListener("change", function () { readControl(key); });
        toggle.appendChild(box);
        toggle.appendChild(element("span", "lab-toggle__mark"));
        toggle.appendChild(element("span", "lab-toggle__label", label));
        inputs[key] = box;
        values[key] = box.checked;
        return toggle;
      }

      var wrap = element("div", "lab-control");

      var top = element("label", "lab-control__label");
      top.appendChild(element("span", "lab-control__name", label));
      var out = element("output", "lab-control__value");
      top.appendChild(out);
      wrap.appendChild(top);

      var input = document.createElement("input");
      input.type = "range";
      input.className = "lab-control__input";
      input.min = control.min;
      input.max = control.max;
      input.step = control.step === undefined ? "any" : control.step;
      input.value = control.value;
      input.setAttribute("aria-label", label);
      top.setAttribute("for", input.id = "lab-" + name + "-" + key);

      input.addEventListener("input", function () { readControl(key); });
      wrap.appendChild(input);

      inputs[key] = input;
      input.__labOutput = out;
      input.__labControl = control;
      values[key] = Number(control.value);
      showControlValue(key);
      return wrap;
    }

    function showControlValue(key) {
      var input = inputs[key];
      if (!input || !input.__labOutput) return;
      var control = input.__labControl;
      var places = control.decimals === undefined
        ? decimalsFor(control.step)
        : control.decimals;
      var text = Number(values[key]).toFixed(places);
      input.__labOutput.textContent = control.unit ? text + " " + control.unit : text;
    }

    function readControl(key) {
      var input = inputs[key];
      if (!input) return;
      if (input.type === "checkbox") {
        values[key] = input.checked;
      } else {
        values[key] = Number(input.value);
        showControlValue(key);
      }
      if (definition.change) definition.change(api, state, key);
      // A change made while the lab is paused must still be visible.
      if (rafId === null) drawOnce();
    }

    /* ---------- the pointer ---------- */

    function pointerAt(event) {
      var box = canvas.getBoundingClientRect();
      api.pointer.x = event.clientX - box.left;
      api.pointer.y = event.clientY - box.top;
      api.pointer.inside = api.pointer.x >= 0 && api.pointer.x <= box.width &&
                           api.pointer.y >= 0 && api.pointer.y <= box.height;
    }

    function onPointerDown(event) {
      pointerAt(event);
      api.pointer.down = true;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
      }
      if (definition.pointer) definition.pointer(api, state, "down");
      if (rafId === null) drawOnce();
    }

    function onPointerMove(event) {
      pointerAt(event);
      if (definition.pointer) definition.pointer(api, state, "move");
      if (rafId === null) drawOnce();
    }

    function onPointerUp(event) {
      pointerAt(event);
      api.pointer.down = false;
      if (definition.pointer) definition.pointer(api, state, "up");
      if (rafId === null) drawOnce();
    }

    function onPointerLeave() {
      api.pointer.inside = false;
      if (api.pointer.down) {
        api.pointer.down = false;
        if (definition.pointer) definition.pointer(api, state, "up");
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    /* ---------- buttons ---------- */

    playButton.addEventListener("click", function () { setWantRun(!wantRun); });

    resetButton.addEventListener("click", function () {
      controls.forEach(function (control) {
        api.setValue(control.key, control.value);
      });
      api.t = 0;
      if (definition.reset) definition.reset(api, state);
      else state = definition.setup ? definition.setup(api) : null;
      drawOnce();
    });

    /* ---------- watching the size and the visibility ---------- */

    var sizeWatcher = null;
    if ("ResizeObserver" in global) {
      sizeWatcher = new ResizeObserver(function () { measure(); });
      sizeWatcher.observe(frame);
    }
    global.addEventListener("resize", measure);

    // The important one. A hidden page has no size and cannot intersect
    // anything, so leaving the lab — or simply scrolling past it — pauses the
    // drawing loop by itself.
    var seenWatcher = null;
    if ("IntersectionObserver" in global) {
      seenWatcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          onScreen = entry.isIntersecting;
          if (onScreen) measure();
          sync();
        });
      }, { threshold: 0.01 });
      seenWatcher.observe(canvas);
    } else {
      onScreen = true;
    }

    /* ---------- go ---------- */

    state = definition.setup ? definition.setup(api) : null;
    setWantRun(wantRun);
    measure();

    if (global.Anim) global.Anim.scan(host);

    // Handed back to the caller, and called before anything is built again.
    return function unmount() {
      stopLoop();
      if (definition.stop) definition.stop(api, state);
      if (sizeWatcher) sizeWatcher.disconnect();
      if (seenWatcher) seenWatcher.disconnect();
      global.removeEventListener("resize", measure);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }

  /* ======================================================================
     5. The pieces shared by every lab page
     ====================================================================== */

  function backLink() {
    var link = document.createElement("a");
    link.className = "lab__back";
    link.href = "?view=labs";
    link.setAttribute("data-goto", "labs");
    link.textContent = word("backToLabs", "← All labs");
    return link;
  }

  // The same tiny formatting language as data-rich: blank line = paragraph,
  // **word** = bold, [word](address) = link. The text comes from our own JSON
  // files, never from a visitor.
  function richText(text) {
    var holder = document.createElement("div");
    var block = document.createElement("div");
    block.setAttribute("data-rich", "text");
    holder.appendChild(block);
    Content.bind(holder, { text: text }, { lang: Site.lang, ui: Site.ui });
    return block.innerHTML;
  }

  // Shown at ?view=lab with no lab named, and when the name is not one of ours.
  function chooser(host, unknown) {
    var box = element("div", "lab-chooser reveal");
    box.appendChild(element("h1", "lab-chooser__title",
      unknown ? word("labMissing", "That lab does not exist.")
              : word("labChoose", "Choose a lab")));

    if (order.length) {
      var grid = element("div", "grid grid--cards lab-chooser__grid");
      order.forEach(function (name, index) {
        var card = document.createElement("a");
        card.className = "card card--link reveal";
        card.href = "?view=lab&id=" + encodeURIComponent(name);
        card.setAttribute("data-goto", "lab");
        card.setAttribute("data-id", name);
        card.style.setProperty("--i", index);

        var icon = element("span", "card__icon");
        icon.innerHTML = Content.icon(registry[name].icon || "atom");
        card.appendChild(icon);

        var title = element("h3", "card__title", name);
        card.appendChild(title);
        var text = element("p", "card__text", "");
        card.appendChild(text);

        // The name of a lab lives with the lab, in its own words file.
        loadText(name).then(function (words) {
          title.textContent = Content.inLang(Content.valueAt(words, "title"), Site.lang) || name;
          text.textContent = Content.inLang(Content.valueAt(words, "lead"), Site.lang) || "";
        });

        grid.appendChild(card);
      });
      box.appendChild(grid);
    }

    box.appendChild(backLink());
    host.appendChild(box);
    if (global.Anim) global.Anim.scan(host);
  }

  /* ======================================================================
     6. Wiring into the site
     ====================================================================== */

  global.addEventListener("section:ready", function (event) {
    if (event.detail.route !== "lab") return;

    var host = event.detail.container.querySelector("#lab-host");
    if (!host) return;

    // Whatever was running before is taken down first. This matters when the
    // visitor switches language: the router builds the whole section again,
    // and without this the old loop would go on drawing into a canvas that is
    // no longer on the page.
    if (active) { active(); active = null; }
    host.textContent = "";

    var mine = ++generation;

    var name = event.detail.id;
    if (!name || !registry[name]) {
      chooser(host, !!name);
      return;
    }

    var definition = registry[name];
    loadText(name).then(function (words) {
      // The words are fetched, so another lab may have been asked for in the
      // meantime. Building this one now would leave a drawing loop running
      // that nothing can ever stop.
      if (mine !== generation || !host.isConnected) return;
      host.textContent = "";
      active = mount(host, name, definition, words);
    });
  });

  global.Labs = { register: register };
})(window);
