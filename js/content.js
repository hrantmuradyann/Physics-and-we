/* ============================================================================
   content.js — puts the words from data/*.json into the page.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.
   Text lives in  data/*.json .  Layout lives in  sections/*.html .

   For whoever maintains the code: this is the whole "template language" that
   the section files use. Each attribute reads a value out of that section's
   JSON file and puts it into the element.

     data-text="hero.title"       the plain text of the element
     data-rich="story.text"       same, but a blank line = new paragraph,
                                  **word** = bold, [word](https://…) = link
     data-list="cards"            repeat the <template> inside, once per item
                                  (inside the template the names are relative
                                   to that one item, e.g. data-text="title")
     data-icon="icon"             draw the icon whose NAME is in the JSON
     data-image="showcase.image"  picture file name    -> src
     data-alt="showcase.imageAlt" picture description  -> alt
     data-route="button.route"    turn it into a link to another page
     data-route-id="slug"         ...to ONE thing on that page, e.g. one
                                  lab. The page itself is written in the
                                  layout: data-goto="lab"
     data-number="number"         a number that counts up when scrolled to
     data-ui="learnMore"          a word shared by all pages (data/site.json)

   An element whose value is missing from the JSON is removed, so a half
   finished data file never shows empty boxes on the live site.
   ========================================================================== */
(function (global) {
  "use strict";

  var LANGS = ["hy", "en"];

  /* ---------- The icon set -------------------------------------------------
     The names below are what you type in the JSON files, for example
     "icon": "flask" . To add a new icon, add one line here and tell the
     editors what it is called.                                             */
  var ICONS = {
    atom:
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',

    orbit:
      '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>' +
      '<ellipse cx="12" cy="12" rx="10" ry="4.4"/>' +
      '<ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(60 12 12)"/>' +
      '<ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(120 12 12)"/>',

    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',

    people:
      '<circle cx="9" cy="8" r="3"/>' +
      '<path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>' +
      '<path d="M16 5.5a3 3 0 0 1 0 5.8M18.5 20c0-2.4-1-4.5-2.6-6"/>',

    flask:
      '<path d="M9 2.5h6M10.5 2.5v6.2L5.4 18.4A2 2 0 0 0 7.2 21.5h9.6a2 2 0 0 0 1.8-3.1L13.5 8.7V2.5"/>' +
      '<path d="M7.8 15h8.4"/>',

    bulb:
      '<path d="M9.5 18.5h5M10.5 21.5h3"/>' +
      '<path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8v1.7h7.6v-1.7A6.5 6.5 0 0 0 12 2.5z"/>',

    telescope:
      '<path d="M2.6 13.8 18 5.6l2.4 4.6-15.4 8.2z"/>' +
      '<path d="M8.4 16.6V22M5.4 22h6"/>',

    wave:
      '<path d="M2 9c2.7-5 5.3-5 8 0s5.3 5 8 0"/>' +
      '<path d="M2 16c2.7-5 5.3-5 8 0s5.3 5 8 0"/>',

    magnet:
      '<path d="M5 4v8a7 7 0 0 0 14 0V4h-5v8a2 2 0 0 1-4 0V4z"/>' +
      '<path d="M5 8h5M14 8h5"/>',

    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2.5"/>' +
      '<path d="M8 2.5v4M16 2.5v4M3 10.5h18"/>'
  };

  function iconSVG(name) {
    var body = ICONS[name] || ICONS.atom;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + body + '</svg>';
  }

  /* ---------- Reading a value out of the JSON ---------- */

  // "features.items.0.title" -> the value at that place, or undefined.
  function valueAt(data, path) {
    if (!data || !path) return undefined;
    var parts = String(path).split(".");
    var node = data;
    for (var i = 0; i < parts.length; i++) {
      if (node === null || node === undefined) return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  // Turn {hy,en,ru} into one string for the current language.
  // Plain strings and numbers pass through untouched.
  function inLang(value, lang) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value !== "object") return "";
    if (value[lang]) return String(value[lang]);
    for (var i = 0; i < LANGS.length; i++) {
      if (value[LANGS[i]]) return String(value[LANGS[i]]);
    }
    return "";
  }

  /* ---------- The small formatting language used by data-rich ---------- */

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Blank line = new paragraph, **word** = bold, [word](url) = link.
  function richHTML(text) {
    return String(text)
      .split(/\n\s*\n/)
      .map(function (block) {
        var html = escapeHTML(block.trim())
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
            // Only ordinary web links and mail links are allowed.
            if (!/^(https?:|mailto:|\/|#|\?)/i.test(href)) return label;
            return '<a href="' + href + '" class="link">' + label + "</a>";
          })
          .replace(/\n/g, "<br>");
        return "<p>" + html + "</p>";
      })
      .join("");
  }

  /* ---------- Putting the values into the page ---------- */

  // Applies every data-* binding found inside `root`.
  //   root – the element to fill in
  //   data – the JSON object the names are looked up in
  //   opts – { lang: "hy", ui: { …words shared by all pages… } }
  function bind(root, data, opts) {
    opts = opts || {};
    var lang = opts.lang || LANGS[0];
    var ui = opts.ui || {};

    // Note on the order: the repeating lists are filled in LAST, at the end of
    // this function. Everything a list creates belongs to one item of that
    // list and is filled in from that item — so it must not be touched by the
    // passes below, which read from the page as a whole.

    // 2. Words shared by every page (data/site.json -> "ui").
    each(root, "[data-ui]", function (el) {
      el.textContent = inLang(ui[el.getAttribute("data-ui")], lang);
    });

    // 3. Plain text.
    each(root, "[data-text]", function (el) {
      var text = inLang(valueAt(data, el.getAttribute("data-text")), lang);
      if (!text) return dropOrEmpty(el);
      el.textContent = text;
    });

    // 4. Text with paragraphs / bold / links.
    each(root, "[data-rich]", function (el) {
      var text = inLang(valueAt(data, el.getAttribute("data-rich")), lang);
      if (!text) return dropOrEmpty(el);
      el.innerHTML = richHTML(text);
    });

    // 5. Icons, looked up by name.
    each(root, "[data-icon]", function (el) {
      el.innerHTML = iconSVG(inLang(valueAt(data, el.getAttribute("data-icon")), lang));
    });

    // 6. Pictures.
    each(root, "[data-image]", function (el) {
      var src = inLang(valueAt(data, el.getAttribute("data-image")), lang);
      if (src) el.setAttribute("src", src);
    });
    each(root, "[data-alt]", function (el) {
      el.setAttribute("alt", inLang(valueAt(data, el.getAttribute("data-alt")), lang));
    });

    // 7. Links to another page of this site.
    each(root, "[data-route]", function (el) {
      var route = valueAt(data, el.getAttribute("data-route"));
      if (typeof route !== "string" || !route) return;
      el.setAttribute("href", "?view=" + route);
      el.setAttribute("data-goto", route);   // the router listens for this
    });

    // 7b. A link to ONE thing on another page — one lab, one news item.
    //     The page it goes to is written in the layout (data-goto="lab"),
    //     because that is layout; only the name of the thing comes from the
    //     JSON. An entry with no name is not a link, so it is removed.
    each(root, "[data-route-id]", function (el) {
      var id = valueAt(data, el.getAttribute("data-route-id"));
      if (typeof id !== "string" || !id) return dropOrEmpty(el);
      var route = el.getAttribute("data-goto") || "";
      el.setAttribute("data-id", id);
      if (route) {
        el.setAttribute("href", "?view=" + encodeURIComponent(route) +
                                "&id=" + encodeURIComponent(id));
      }
    });

    // 8. Numbers that count up (the animation lives in js/anim.js).
    each(root, "[data-number]", function (el) {
      var n = valueAt(data, el.getAttribute("data-number"));
      el.setAttribute("data-count", n === undefined || n === null ? "0" : String(n));
      el.setAttribute(
        "data-count-suffix",
        inLang(valueAt(data, el.getAttribute("data-suffix")), lang)
      );
      el.textContent = "0";
    });

    // 9. Repeating lists, last of all (see the note at the top of bind).
    //    Each copy is filled in from its own item, so inside a <template>
    //    the names are short: data-text="title", not data-text="cards.0.title".
    each(root, "[data-list]", function (host) {
      var template = host.querySelector("template");
      if (!template) return;
      var items = valueAt(data, host.getAttribute("data-list"));

      host.innerHTML = "";
      host.appendChild(template);          // kept, so the next language switch
                                           // can build the list again
      if (!Array.isArray(items) || !items.length) {
        host.setAttribute("data-empty", "true");
        return;
      }
      host.removeAttribute("data-empty");

      items.forEach(function (item, index) {
        var copy = template.content.cloneNode(true);
        bind(copy, item, opts);
        var first = copy.firstElementChild;
        if (first) first.style.setProperty("--i", index);
        host.appendChild(copy);
      });
    });
  }

  // querySelectorAll that also works on a DocumentFragment.
  function each(root, selector, fn) {
    Array.prototype.forEach.call(root.querySelectorAll(selector), fn);
  }

  // A value the JSON does not have: hide the element instead of leaving a
  // blank line on the live site. Wrappers marked data-keep stay visible.
  function dropOrEmpty(el) {
    if (el.hasAttribute("data-keep")) {
      el.textContent = "";
      return;
    }
    el.remove();
  }

  global.Content = { bind: bind, inLang: inLang, valueAt: valueAt, icon: iconSVG };
})(window);
