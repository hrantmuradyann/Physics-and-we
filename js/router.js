/* ============================================================================
   router.js — shows one page at a time without reloading the browser.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.

   How a page is put together:
     the menu entry   data/site.json  ->  "nav": [ { "route": "labs" } ]
     the layout       sections/labs.html
     the words        data/labs.json

   So "adding a page" means: add one entry to the nav in data/site.json, then
   create sections/<route>.html and data/<route>.json. Nothing here changes.
   ========================================================================== */
(function (global) {
  "use strict";

  var DEFAULT_ROUTE = "home";
  var SITE_NAME = "Physics and We";

  var routes = {};        // route -> { label: {hy,en,ru} }
  var loaded = {};        // route -> { html, data, container }
  var current = null;
  var currentId = null;   // the news item being read, when route === "post"
  var app = null;

  /* ---------- Which route is the URL pointing at? ---------- */

  function isRoute(route) {
    return !!route && Object.prototype.hasOwnProperty.call(routes, route);
  }

  // A page can carry one extra name in the URL: ?view=post&id=my-news-item .
  // Only letters, digits and hyphens are ever accepted, so nothing typed in
  // the address bar can turn into a file path or a piece of markup.
  function cleanId(value) {
    var id = String(value || "").trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]{0,80}$/.test(id) ? id : null;
  }

  function routeFromURL() {
    var params = new URLSearchParams(location.search);
    var id = cleanId(params.get("id"));

    if (history.state && isRoute(history.state.route)) {
      return { route: history.state.route, id: cleanId(history.state.id) || id };
    }
    var query = params.get("view");
    if (isRoute(query)) return { route: query, id: id };

    var hash = location.hash.replace(/^#\/?/, "");
    if (isRoute(hash)) return { route: hash, id: id };
    return { route: DEFAULT_ROUTE, id: null };
  }

  function updateURL(route, id, replace) {
    var url = location.pathname;
    if (route !== DEFAULT_ROUTE) {
      url += "?view=" + encodeURIComponent(route);
      if (id) url += "&id=" + encodeURIComponent(id);
    }
    try {
      var state = { route: route, id: id || null };
      if (replace) history.replaceState(state, "", url);
      else history.pushState(state, "", url);
    } catch (e) {
      location.hash = route === DEFAULT_ROUTE ? "" : route;
    }
  }

  /* ---------- Loading a section ---------- */

  function container(route) {
    var existing = document.getElementById("view-" + route);
    if (existing) return existing;
    var section = document.createElement("section");
    section.className = "view";
    section.id = "view-" + route;
    app.appendChild(section);
    return section;
  }

  function fetchText(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
      return res.text();
    });
  }

  // The page's own JSON is optional: a section may be pure layout.
  function fetchData(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  }

  function load(route) {
    if (loaded[route]) return Promise.resolve(loaded[route]);

    return Promise.all([
      fetchText("sections/" + route + ".html"),
      fetchData("data/" + route + ".json")
    ]).then(function (results) {
      loaded[route] = {
        html: results[0],
        data: results[1] || {},
        container: container(route)
      };
      return loaded[route];
    });
  }

  // Put the layout on the page and fill in the words. Called again whenever
  // the visitor switches language, so the section is rebuilt from scratch.
  function render(route, id) {
    var entry = loaded[route];
    if (!entry) return;

    // Which item this build of the section is showing. Remembered on the entry
    // so navigate() below can tell whether the section already on the page is
    // the right one, or was built for a different news item / lab.
    var itemId = id === undefined ? (route === current ? currentId : null) : id;
    entry.renderedId = itemId;

    entry.container.innerHTML = entry.html;
    Content.bind(entry.container, entry.data, {
      lang: Site.lang,
      ui: Site.ui
    });

    global.dispatchEvent(new CustomEvent("section:ready", {
      detail: {
        route: route,
        id: itemId,
        container: entry.container,
        data: entry.data
      }
    }));
  }

  function showError(route) {
    var host = container(route);
    host.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "container page__error";
    var text = document.createElement("p");
    text.textContent = Site.word("loadError") || "This content could not be loaded.";
    wrap.appendChild(text);
    host.appendChild(wrap);
  }

  /* ---------- Switching pages ---------- */

  function activate(route) {
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (view) {
      view.classList.toggle("active", view.id === "view-" + route);
    });

    // The home page is the only one with the full-screen hero on top.
    document.body.classList.toggle("home", route === DEFAULT_ROUTE);

    markCurrentLink(route);
    applyTitle(route);
  }

  function markCurrentLink(route) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (link) {
      var isCurrent = link.getAttribute("data-goto") === route;
      link.classList.toggle("current", isCurrent);
      if (link.closest("nav")) {
        if (isCurrent) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    });
  }

  function applyTitle(route) {
    var label = Content.inLang(routes[route] && routes[route].label, Site.lang);
    document.title = label ? label + " — " + SITE_NAME : SITE_NAME;
  }

  function navigate(route, addToHistory, id) {
    if (!isRoute(route)) route = DEFAULT_ROUTE;
    id = cleanId(id);

    var changed = route !== current || id !== currentId;
    current = route;
    currentId = id;

    var show = function () {
      activate(route);
      global.scrollTo(0, 0);
      if (addToHistory && changed) updateURL(route, id, false);
    };

    if (loaded[route]) {
      // The section is already on the page. Build it again only if the copy
      // sitting there was built for a different item — another news article,
      // another lab — or for no item at all, which is how the quiet
      // background prefetch below leaves it.
      if (loaded[route].renderedId !== id) render(route, id);
      show();
      return Promise.resolve();
    }

    document.body.classList.add("is-loading");
    return load(route)
      .then(function () {
        render(route, id);
        show();
      })
      .catch(function (err) {
        console.error("Could not load the page \"" + route + "\".", err);
        showError(route);
        show();
      })
      .then(function () {
        document.body.classList.remove("is-loading");
      });
  }

  /* ---------- Events ---------- */

  // Any link carrying data-goto navigates without reloading the browser.
  document.addEventListener("click", function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    var link = event.target.closest ? event.target.closest("[data-goto]") : null;
    if (!link) return;
    var route = link.getAttribute("data-goto");
    if (!isRoute(route)) return;
    event.preventDefault();
    navigate(route, true, link.getAttribute("data-id"));
  });

  function navigateFromURL(addToHistory) {
    var target = routeFromURL();
    navigate(target.route, addToHistory, target.id);
  }

  global.addEventListener("popstate", function () { navigateFromURL(false); });
  global.addEventListener("hashchange", function () { navigateFromURL(false); });

  // The header is rebuilt on every language switch — re-mark the current link.
  global.addEventListener("header:rendered", function () {
    if (current) markCurrentLink(current);
  });

  // Language switched: rebuild every page that has already been loaded, so
  // going back to it does not show the previous language.
  global.addEventListener("lang:changed", function () {
    Object.keys(loaded).forEach(function (route) {
      render(route, route === current ? currentId : null);
    });
    if (current) applyTitle(current);
  });

  /* ---------- Start ---------- */

  Site.ready.then(function (site) {
    app = document.getElementById("app");
    if (!app) return;

    (site.nav || []).forEach(function (entry) {
      routes[entry.route] = { label: entry.label };
    });
    if (!isRoute(DEFAULT_ROUTE)) routes[DEFAULT_ROUTE] = { label: { hy: SITE_NAME } };

    var target = routeFromURL();
    updateURL(target.route, target.id, true);
    navigate(target.route, false, target.id).then(function () {
      // Quietly fetch the other pages so the menu feels instant.
      var idle = global.requestIdleCallback || function (fn) { setTimeout(fn, 1200); };
      idle(function () {
        Object.keys(routes).forEach(function (other) {
          if (!loaded[other]) load(other).then(function () { render(other, null); });
        });
      });
    });
  }).catch(function () {
    /* main.js already reported the failure to the console. */
  });
})(window);
