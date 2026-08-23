/* ============================================================================
   main.js — language switching + the header and footer that every page shares.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.
   The menu, the footer and the shared words are in  data/site.json .
   ========================================================================== */
(function (global) {
  "use strict";

  var SUPPORTED_LANGS = ["hy", "en", "ru"];
  var DEFAULT_LANG = "hy";          // Armenian is the site's main language

  // First-time visitors see the main language. Set this to true to instead
  // start in the visitor's own browser language when we support it.
  var PREFER_BROWSER_LANG = false;

  var LANG_BUTTONS = { hy: "ՀՅ", en: "EN", ru: "РУ" };

  var site = null;                  // data/site.json once loaded
  var lang = resolveInitialLang();

  /* ---------- Language ---------- */

  function resolveInitialLang() {
    var saved = null;
    try { saved = localStorage.getItem("lang"); } catch (e) { /* private mode */ }
    if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;

    if (PREFER_BROWSER_LANG) {
      var browser = (navigator.language || "").slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.indexOf(browser) !== -1) return browser;
    }
    return DEFAULT_LANG;
  }

  function setLanguage(next) {
    if (SUPPORTED_LANGS.indexOf(next) === -1) next = DEFAULT_LANG;
    if (next === lang && document.documentElement.lang === next) return;

    lang = next;
    try { localStorage.setItem("lang", lang); } catch (e) { /* private mode */ }
    document.documentElement.setAttribute("lang", lang);

    renderHeader();
    renderFooter();
    global.dispatchEvent(new CustomEvent("lang:changed", { detail: { lang: lang } }));
  }

  /* ---------- Header ---------- */

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host || !site) return;

    host.innerHTML = "";

    var logo = document.createElement("div");
    logo.className = "logo";
    var logoLink = document.createElement("a");
    logoLink.href = "?view=home";
    logoLink.setAttribute("data-goto", "home");
    logoLink.className = "logo__link";

    // The mark itself. The white version is used because every public page is
    // dark; the navy original is for the light admin pages.
    var mark = document.createElement("img");
    mark.className = "logo__img";
    mark.src = "images/logo-light.png";
    mark.alt = site.siteName || "Physics and We";
    mark.width = 852;
    mark.height = 204;
    logoLink.appendChild(mark);

    logo.appendChild(logoLink);

    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Main");
    var list = document.createElement("ul");
    (site.nav || []).forEach(function (entry) {
      if (entry.hidden) return;                 // in site.json, not in the menu
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "?view=" + entry.route;
      a.setAttribute("data-goto", entry.route);
      a.textContent = Content.inLang(entry.label, lang);
      li.appendChild(a);
      list.appendChild(li);
    });
    nav.appendChild(list);

    var switcher = document.createElement("div");
    switcher.className = "lang-switcher";
    SUPPORTED_LANGS.forEach(function (code) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = LANG_BUTTONS[code] || code.toUpperCase();
      button.setAttribute("lang", code);
      button.setAttribute("aria-label", code);
      if (code === lang) button.classList.add("active-lang");
      button.addEventListener("click", function () { setLanguage(code); });
      switcher.appendChild(button);
    });

    host.appendChild(logo);
    host.appendChild(nav);
    host.appendChild(switcher);

    // The router re-marks the current page after the header is rebuilt.
    global.dispatchEvent(new CustomEvent("header:rendered"));
  }

  /* ---------- Footer ---------- */

  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host || !site) return;

    host.innerHTML = "";
    var footer = site.footer || {};

    if (footer.links && footer.links.length) {
      var links = document.createElement("nav");
      links.className = "footer__links";
      links.setAttribute("aria-label", "Footer");
      footer.links.forEach(function (entry) {
        var a = document.createElement("a");
        a.href = "?view=" + entry.route;
        a.setAttribute("data-goto", entry.route);
        a.textContent = Content.inLang(entry.label, lang);
        links.appendChild(a);
      });
      host.appendChild(links);
    }

    var text = document.createElement("p");
    text.className = "footer__text";
    text.textContent = Content.inLang(footer.text, lang);
    host.appendChild(text);
  }

  /* ---------- Boot ---------- */

  var ready = fetch("data/site.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      site = data;
      document.documentElement.setAttribute("lang", lang);
      renderHeader();
      renderFooter();
      global.dispatchEvent(new CustomEvent("site:ready", { detail: { site: site } }));
      return site;
    })
    .catch(function (err) {
      console.error(
        "Could not load data/site.json. If you opened index.html by " +
        "double-clicking it, run a local server instead — see Instructions/EDITING-GUIDE.md.",
        err
      );
      var header = document.getElementById("site-header");
      if (header) {
        header.innerHTML = '<div class="logo"><a href="?view=home" class="logo__link">' +
          '<img class="logo__img" src="images/logo-light.png" alt="Physics and We"></a></div>';
      }
      throw err;
    });

  /* The one thing other scripts use. */
  global.Site = {
    ready: ready,
    get lang() { return lang; },
    get data() { return site; },
    get ui() { return (site && site.ui) || {}; },
    get languages() { return SUPPORTED_LANGS.slice(); },
    setLanguage: setLanguage,
    // Shortcut for a shared word: Site.word("learnMore")
    word: function (key) {
      return Content.inLang(((site && site.ui) || {})[key], lang);
    }
  };
})(window);
