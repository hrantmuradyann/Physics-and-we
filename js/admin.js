/* ============================================================================
   admin.js — the news editor at /admin/.

   Talks to three server routes, all of them behind the login:
     GET/DELETE /admin/api/session   who am I / log out
     GET/POST   /admin/api/publish   read and write news.json
     POST       /admin/api/upload    store one photo

   Two things this file deliberately does NOT do:
     · it never holds the GitHub token — only the server has it;
     · it never builds HTML out of typed text. Everything goes in through
       textContent, so a news item can never turn into working code.
   ========================================================================== */
(function () {
  "use strict";

  var LANGS = ["hy", "en"];

  var state = {
    news: [],           // the full list, as it will be saved
    baseSha: null,      // the version we loaded, for conflict detection
    csrf: null,
    canPublish: false,
    loaded: false,      // did the list load cleanly? nothing is saved if not
    lang: "hy",         // which language the form is showing
    editingId: null,    // null = writing a new item
    draft: blankDraft()
  };

  /* ---------------------------------------------------------------- utils -- */

  function el(id) { return document.getElementById(id); }
  function value(id) { var e = el(id); return e ? e.value.trim() : ""; }
  function setValue(id, v) { var e = el(id); if (e) e.value = v || ""; }

  function status(message, kind) {
    var box = el("admin-status");
    if (!box) return;
    box.textContent = message;
    box.className = "admin-status" + (kind ? " " + kind : "");
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function blankDraft() {
    return {
      id: null,
      date: todayISO(),
      slug: "",
      slugTouched: false,
      image: "",
      title: {}, excerpt: {}, content: {}, imageAlt: {}
    };
  }

  function firstText(block) {
    if (!block) return "";
    for (var i = 0; i < LANGS.length; i++) if (block[LANGS[i]]) return block[LANGS[i]];
    return "";
  }

  /* ------------------------------------------------------- making a slug -- */

  // Armenian letters written with Latin ones, so the address of a news page
  // stays readable: "Ամառային ճամբար" -> "amarayin-champar".
  var TRANSLIT = {
    "ա":"a","բ":"b","գ":"g","դ":"d","ե":"e","զ":"z","է":"e","ը":"y","թ":"t","ժ":"zh",
    "ի":"i","լ":"l","խ":"kh","ծ":"ts","կ":"k","հ":"h","ձ":"dz","ղ":"gh","ճ":"ch","մ":"m",
    "յ":"y","ն":"n","շ":"sh","ո":"o","չ":"ch","պ":"p","ջ":"j","ռ":"r","ս":"s","վ":"v",
    "տ":"t","ր":"r","ց":"ts","ւ":"v","փ":"p","ք":"q","օ":"o","ֆ":"f","և":"ev"
  };

  function slugify(text) {
    var lower = String(text || "").toLowerCase();
    var out = "";
    for (var i = 0; i < lower.length; i++) {
      var ch = lower[i];
      out += TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch;
    }
    // Strip accents (é -> e) where the browser supports it.
    if (String.prototype.normalize) {
      out = out.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function uniqueSlug(base, exceptId) {
    var slug = base || "news";
    var taken = {};
    state.news.forEach(function (item) {
      if (item.id !== exceptId) taken[item.slug] = true;
    });
    if (!taken[slug]) return slug;
    var n = 2;
    while (taken[slug + "-" + n]) n++;
    return slug + "-" + n;
  }

  function nextId() {
    return state.news.reduce(function (max, item) {
      return Math.max(max, Number(item.id) || 0);
    }, 0) + 1;
  }

  /* ------------------------------------------------------------- network -- */

  function api(path, options) {
    var opts = options || {};
    var headers = opts.headers || {};
    headers["Accept"] = "application/json";
    if (state.csrf) headers["X-CSRF-Token"] = state.csrf;

    return fetch(path, {
      method: opts.method || "GET",
      credentials: "same-origin",
      headers: headers,
      body: opts.body
    }).then(function (response) {
      if (response.status === 401) {
        location.replace("/admin/login.html?next=" + encodeURIComponent("/admin/"));
        throw new Error("signed out");
      }
      return response.json()
        .catch(function () { return {}; })
        .then(function (data) { return { status: response.status, data: data }; });
    });
  }

  function apiJSON(path, method, payload) {
    return api(path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  /* ---------------------------------------------------------- loading up -- */

  // Replace the whole page with an explanation, and make sure the editor is
  // not left sitting there looking usable.
  function blockPage(heading, detail, command) {
    var main = document.querySelector("main");
    if (!main) return;
    main.textContent = "";

    var title = document.createElement("h1");
    title.textContent = heading;
    main.appendChild(title);

    var text = document.createElement("p");
    text.className = "admin-intro";
    text.textContent = detail;
    main.appendChild(text);

    if (command) {
      var code = document.createElement("code");
      code.className = "login__cmd";
      code.textContent = command;
      main.appendChild(code);
    }
  }

  function loadSession() {
    return api("/admin/api/session").then(function (result) {
      // No API at all: the site is being served by a plain file server, so
      // nothing checked who is opening this page. Refuse to show the editor.
      if (result.status === 404 || result.status === 501 || result.status === 405) {
        blockPage(
          "Մուտքի ստուգումը չի աշխատում",
          "Այս էջը բացված է սովորական ֆայլային սերվերով։ " +
          "Փակեք այն և գործարկեք տերմինալում՝ ապա բացեք http://127.0.0.1:8788/admin/",
          "npx wrangler pages dev ."
        );
        throw new Error("no admin api");
      }
      if (result.status !== 200 || !result.data.ok) throw new Error("not signed in");
      state.csrf = result.data.csrf;
      state.canPublish = !!result.data.canPublish;
      var who = el("admin-user");
      if (who) who.textContent = "✓ " + (result.data.user || "signed in");
      if (!state.canPublish) {
        status("Այս սերվերին GitHub-ը միացված չէ։ Փոփոխությունները պահվում են " +
               "միայն այս էջում — օգտագործե՛ք «Ներբեռնել news.json» կոճակը։", "info");
      }
    });
  }

  // Prefer the API, because it also gives us the file version (sha) we need
  // to detect someone else saving at the same time. Fall back to the public
  // file when GitHub is not configured (offline / local work).
  function loadNews() {
    return api("/admin/api/publish").then(function (result) {
      if (result.status === 200 && result.data.ok && result.data.configured) {
        state.news = normaliseAll(result.data.news || []);
        state.baseSha = result.data.sha || null;
        state.loaded = true;
        return;
      }
      return fetch("/news.json", { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          state.news = normaliseAll(Array.isArray(data) ? data : (data && data.news) || []);
          state.baseSha = null;
          state.loaded = true;
        });
    }).catch(function (error) {
      if (error.message === "signed out") return;
      console.error("load news:", error);
      state.news = [];
      state.loaded = false;      // ← nothing may be published from here
      status("Ընթացիկ նորությունները չհաջողվեց բեռնել։ Հրապարակումն " +
             "անջատված է, որպեսզի եղածը չջնջվի։ Թարմացրե՛ք էջը։", "error");
      var save = el("admin-save");
      if (save) save.disabled = true;
    });
  }

  // Older items had no slug, excerpt or photo. Fill the gaps in so the rest of
  // the panel — and the website — can rely on the fields being there.
  function normaliseAll(list) {
    return list.map(function (item, index) {
      var id = Number(item.id) || (index + 1);
      var title = asBlock(item.title);
      var content = asBlock(item.content);
      return {
        id: id,
        slug: String(item.slug || "").trim() || slugify(firstText(title)) || ("news-" + id),
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : todayISO(),
        image: String(item.image || "").trim(),
        imageAlt: asBlock(item.imageAlt),
        title: title,
        excerpt: asBlock(item.excerpt),
        content: content
      };
    });
  }

  function asBlock(value) {
    var out = {};
    if (typeof value === "string") { out.hy = value; return out; }
    if (!value || typeof value !== "object") return out;
    LANGS.forEach(function (lang) {
      if (typeof value[lang] === "string" && value[lang].trim()) out[lang] = value[lang].trim();
    });
    return out;
  }

  /* ------------------------------------------------------- the language -- */

  function readFormIntoDraft() {
    var lang = state.lang;
    setBlock(state.draft.title, lang, value("admin-title"));
    setBlock(state.draft.excerpt, lang, value("admin-excerpt"));
    setBlock(state.draft.content, lang, value("admin-content"));
    setBlock(state.draft.imageAlt, lang, value("admin-image-alt"));
    state.draft.date = value("admin-date") || todayISO();
    var typedSlug = value("admin-slug");
    if (typedSlug) { state.draft.slug = slugify(typedSlug); state.draft.slugTouched = true; }
  }

  function setBlock(block, lang, text) {
    if (text) block[lang] = text;
    else delete block[lang];
  }

  function writeDraftIntoForm() {
    var lang = state.lang;
    setValue("admin-title", state.draft.title[lang]);
    setValue("admin-excerpt", state.draft.excerpt[lang]);
    setValue("admin-content", state.draft.content[lang]);
    setValue("admin-image-alt", state.draft.imageAlt[lang]);
    setValue("admin-date", state.draft.date);
    setValue("admin-slug", state.draft.slug);
    setValue("admin-image-path", state.draft.image);
    updatePhotoPreview();
    updateSlugPreview();

    Array.prototype.forEach.call(document.querySelectorAll("[data-lang-label]"), function (span) {
      span.textContent = { hy: "ՀՅ", en: "EN" }[lang];
    });
    Array.prototype.forEach.call(document.querySelectorAll(".admin-lang"), function (button) {
      var code = button.getAttribute("data-lang");
      button.classList.toggle("is-active", code === lang);
      button.classList.toggle("is-filled", !!state.draft.title[code]);
    });
  }

  function switchLanguage(lang) {
    if (LANGS.indexOf(lang) === -1 || lang === state.lang) return;
    readFormIntoDraft();
    state.lang = lang;
    writeDraftIntoForm();
  }

  /* ------------------------------------------------------------- photos -- */

  function updatePhotoPreview(objectURL) {
    var box = el("admin-photo-preview");
    if (!box) return;
    box.textContent = "";
    var source = objectURL || state.draft.image;
    if (!source) {
      var empty = document.createElement("span");
      empty.className = "admin-photo__empty";
      empty.textContent = "Լուսանկար չկա";
      box.appendChild(empty);
      return;
    }
    var img = document.createElement("img");
    img.alt = "";
    img.src = objectURL || resolvePhoto(source);
    img.addEventListener("error", function () {
      box.textContent = "";
      var bad = document.createElement("span");
      bad.className = "admin-photo__empty";
      bad.textContent = "Չհաջողվեց բեռնել՝ " + source;
      box.appendChild(bad);
    });
    box.appendChild(img);
  }

  function resolvePhoto(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return "/" + String(path).replace(/^\/+/, "");
  }

  function uploadPhoto(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      status("Լուսանկարը 5 ՄԲ-ից մեծ է։", "error");
      return;
    }

    var preview = URL.createObjectURL(file);
    updatePhotoPreview(preview);
    status("Լուսանկարը վերբեռնվում է…", "info");

    var form = new FormData();
    form.append("photo", file);

    api("/admin/api/upload", { method: "POST", body: form })
      .then(function (result) {
        URL.revokeObjectURL(preview);
        if (result.status === 200 && result.data.ok) {
          state.draft.image = result.data.path;
          setValue("admin-image-path", result.data.path);
          updatePhotoPreview();
          status("Լուսանկարը պահվեց՝ " + result.data.path, "ok");
          return;
        }
        if (result.data.error === "notConfigured") {
          updatePhotoPreview();
          status("Այս սերվերը լուսանկար չի պահում։ Դրե՛ք ֆայլը images/news/ " +
                 "պանակում և ներքևի դաշտում գրե՛ք ուղին։", "info");
          return;
        }
        updatePhotoPreview();
        status("Չհաջողվեց՝ " + (result.data.error || result.status), "error");
      })
      .catch(function (error) {
        if (error.message === "signed out") return;
        URL.revokeObjectURL(preview);
        updatePhotoPreview();
        status("Ցանցի սխալ լուսանկարը վերբեռնելիս։", "error");
      });
  }

  /* ------------------------------------------------------------ the list -- */

  function sorted() {
    return state.news.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || (b.id - a.id);
    });
  }

  function renderList() {
    var box = el("admin-news-list");
    var count = el("admin-count");
    if (!box) return;
    box.textContent = "";
    if (count) count.textContent = state.news.length ? "(" + state.news.length + ")" : "";

    if (!state.news.length) {
      var empty = document.createElement("p");
      empty.className = "news-empty";
      empty.textContent = "Դեռ նորություններ չկան։";
      box.appendChild(empty);
      return;
    }

    sorted().forEach(function (item) {
      var row = document.createElement("div");
      row.className = "admin-item" + (item.id === state.editingId ? " is-editing" : "");

      var thumb = document.createElement("div");
      thumb.className = "admin-item__thumb";
      if (item.image) {
        var img = document.createElement("img");
        img.src = resolvePhoto(item.image);
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);
      } else {
        thumb.classList.add("is-empty");
      }

      var text = document.createElement("div");
      text.className = "admin-item__text";

      var title = document.createElement("span");
      title.className = "admin-item__label";
      title.textContent = firstText(item.title) || "(առանց վերնագրի)";

      var meta = document.createElement("span");
      meta.className = "admin-item__meta";
      meta.textContent = item.date + " · /" + item.slug + " · " +
        LANGS.filter(function (l) { return item.title[l]; }).join(" ").toUpperCase();

      text.appendChild(title);
      text.appendChild(meta);

      var actions = document.createElement("div");
      actions.className = "admin-item__actions";

      var view = document.createElement("a");
      view.className = "admin-item__link";
      view.href = "/?view=post&id=" + encodeURIComponent(item.slug);
      view.target = "_blank";
      view.rel = "noopener noreferrer";
      view.textContent = "Դիտել";

      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "admin-item__edit";
      edit.textContent = "Խմբագրել";
      edit.addEventListener("click", function () { startEditing(item.id); });

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-item__del";
      remove.textContent = "Ջնջել";
      remove.addEventListener("click", function () { deleteItem(item.id); });

      actions.appendChild(view);
      actions.appendChild(edit);
      actions.appendChild(remove);

      row.appendChild(thumb);
      row.appendChild(text);
      row.appendChild(actions);
      box.appendChild(row);
    });
  }

  /* ------------------------------------------------------------ editing -- */

  function startEditing(id) {
    var item = state.news.filter(function (x) { return x.id === id; })[0];
    if (!item) return;

    state.editingId = id;
    state.draft = {
      id: item.id,
      date: item.date,
      slug: item.slug,
      slugTouched: true,
      image: item.image,
      title: Object.assign({}, item.title),
      excerpt: Object.assign({}, item.excerpt),
      content: Object.assign({}, item.content),
      imageAlt: Object.assign({}, item.imageAlt)
    };

    writeDraftIntoForm();
    el("admin-cancel").classList.remove("admin-hidden");
    el("admin-save").textContent = "Պահպանել փոփոխությունը";
    renderList();
    status("Խմբագրում եք՝ " + (firstText(item.title) || item.slug), "info");
    el("admin-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditing() {
    state.editingId = null;
    state.draft = blankDraft();
    var file = el("admin-photo");
    if (file) file.value = "";
    writeDraftIntoForm();
    el("admin-cancel").classList.add("admin-hidden");
    el("admin-save").textContent = "Պահպանել և հրապարակել";
    renderList();
    status("", "");
  }

  function saveItem() {
    if (!state.loaded) {
      status("Ընթացիկ ցանկը բեռնված չէ — պահպանելը կջնջեր եղած նորությունները։ " +
             "Թարմացրե՛ք էջը։", "error");
      return;
    }

    readFormIntoDraft();
    var draft = state.draft;

    if (!Object.keys(draft.title).length) {
      status("Գրե՛ք գոնե մեկ լեզվով վերնագիր։", "error");
      switchLanguage("hy");
      return;
    }
    if (!Object.keys(draft.content).length) {
      status("Գրե՛ք գոնե մեկ լեզվով տեքստ։", "error");
      return;
    }

    var id = state.editingId !== null ? state.editingId : nextId();
    var slug = draft.slug || slugify(firstText(draft.title)) || ("news-" + id);
    slug = uniqueSlug(slug, id);

    var item = {
      id: id,
      slug: slug,
      date: draft.date || todayISO(),
      image: draft.image || "",
      imageAlt: draft.imageAlt,
      title: draft.title,
      excerpt: draft.excerpt,
      content: draft.content
    };

    var index = state.news.findIndex(function (x) { return x.id === id; });
    if (index === -1) state.news.push(item);
    else state.news[index] = item;

    var wasEditing = state.editingId !== null;
    publish(wasEditing ? "edit" : "add", function () {
      cancelEditing();
    });
  }

  function deleteItem(id) {
    var item = state.news.filter(function (x) { return x.id === id; })[0];
    if (!item) return;
    if (!confirm("Ջնջե՞լ «" + (firstText(item.title) || item.slug) + "» նորությունը։")) return;
    if (!state.loaded) {
      status("Ընթացիկ ցանկը բեռնված չէ։ Թարմացրե՛ք էջը։", "error");
      return;
    }

    var backup = state.news.slice();
    state.news = state.news.filter(function (x) { return x.id !== id; });
    if (state.editingId === id) cancelEditing();
    renderList();

    publish("delete", null, function () {
      state.news = backup;      // put it back if the server said no
      renderList();
    });
  }

  /* ---------------------------------------------------------- publishing -- */

  function publish(action, onSuccess, onFailure) {
    if (!state.canPublish) {
      renderList();
      status("Պահվեց այս էջում։ GitHub-ը միացված չէ — ներբեռնե՛ք news.json-ը " +
             "և ավելացրե՛ք այն ինքներդ։", "info");
      if (onSuccess) onSuccess();
      return;
    }

    status("Հրապարակվում է…", "info");
    apiJSON("/admin/api/publish", "POST", {
      news: state.news,
      baseSha: state.baseSha,
      action: action
    })
      .then(function (result) {
        if (result.status === 200 && result.data.ok) {
          state.baseSha = result.data.sha || state.baseSha;
          renderList();
          status("Հրապարակվեց ✓ Կայքը կթարմացվի մի քանի վայրկյանում։", "ok");
          if (onSuccess) onSuccess();
          return;
        }
        if (onFailure) onFailure();
        if (result.status === 409) {
          status(result.data.error || "Ֆայլը փոխվել է։ Թարմացրե՛ք էջը։", "error");
        } else if (result.status === 403) {
          status("Նստաշրջանը հնացել է։ Թարմացրե՛ք էջը։", "error");
        } else {
          status("Սխալ՝ " + (result.data.error || ("HTTP " + result.status)), "error");
        }
      })
      .catch(function (error) {
        if (error.message === "signed out") return;
        if (onFailure) onFailure();
        status("Ցանցի սխալ՝ " + error.message, "error");
      });
  }

  function download() {
    var blob = new Blob([JSON.stringify(state.news, null, 2) + "\n"],
      { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "news.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status("news.json ներբեռնվեց։", "ok");
  }

  function logout() {
    api("/admin/api/session", { method: "DELETE" })
      .then(function () { location.replace("/admin/login.html"); })
      .catch(function () { location.replace("/admin/login.html"); });
  }

  /* --------------------------------------------------------------- boot -- */

  function updateSlugPreview() {
    var hint = el("admin-slug-preview");
    if (!hint) return;
    var slug = value("admin-slug") || slugify(value("admin-title")) || "…";
    hint.textContent = "/?view=post&id=" + slug;
  }

  document.addEventListener("DOMContentLoaded", function () {
    setValue("admin-date", todayISO());

    el("admin-form").addEventListener("submit", function (event) {
      event.preventDefault();
      saveItem();
    });

    Array.prototype.forEach.call(document.querySelectorAll(".admin-lang"), function (button) {
      button.addEventListener("click", function () {
        switchLanguage(button.getAttribute("data-lang"));
      });
    });

    el("admin-title").addEventListener("input", function () {
      if (!state.draft.slugTouched && state.editingId === null) {
        setValue("admin-slug", slugify(value("admin-title")));
      }
      updateSlugPreview();
    });

    el("admin-slug").addEventListener("input", function () {
      state.draft.slugTouched = true;
      updateSlugPreview();
    });

    el("admin-photo").addEventListener("change", function (event) {
      uploadPhoto(event.target.files && event.target.files[0]);
    });

    el("admin-image-path").addEventListener("change", function () {
      state.draft.image = value("admin-image-path");
      updatePhotoPreview();
    });

    el("admin-photo-clear").addEventListener("click", function () {
      state.draft.image = "";
      setValue("admin-image-path", "");
      var file = el("admin-photo");
      if (file) file.value = "";
      updatePhotoPreview();
    });

    el("admin-cancel").addEventListener("click", cancelEditing);
    el("admin-download").addEventListener("click", download);
    el("admin-logout").addEventListener("click", logout);

    loadSession()
      .then(loadNews)
      .then(function () {
        writeDraftIntoForm();
        renderList();
      })
      .catch(function (error) {
        if (error.message === "signed out" ||
            error.message === "not signed in" ||
            error.message === "no admin api") return;
        console.error(error);
      });
  });
})();
