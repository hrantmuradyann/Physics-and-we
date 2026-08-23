/* ============================================================================
   news.js — the news feed and the page of a single news item.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.

   The items come from  news.json  in the MAIN project folder, written for you
   by the admin panel at  /admin/ . The headings of the two pages are in
   data/news.json  and  data/post.json .

   Two views, one data file:
     ?view=news            the feed  — a photo, a title and a summary per item
     ?view=post&id=<slug>  one item  — the big photo and the whole text

   SAFETY NOTE
   Every piece of text that comes out of news.json is placed with textContent,
   never with innerHTML. So even if someone got a strange value into that file,
   it would show up as plain text on the page — it could never run.
   ========================================================================== */
(function (global) {
  "use strict";

  var NEWS_FILE = "news.json";
  var LOCALES = { hy: "hy-AM", en: "en-GB", ru: "ru-RU" };
  var RELATED_COUNT = 3;

  var items = null;      // null = not fetched yet, [] = fetched and empty
  var failed = false;

  /* ------------------------------------------------------------- loading -- */

  function loadOnce() {
    if (items !== null || failed) return Promise.resolve();
    return fetch(NEWS_FILE, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.news) || [];
        items = list.map(normalise);
      })
      .catch(function (err) {
        console.error("Could not load news.json:", err);
        failed = true;
        items = [];
      });
  }

  // Items written before the photo/summary fields existed still work: the
  // missing pieces are filled in here rather than all over the rest of the file.
  function normalise(item, index) {
    var id = Number(item.id) || (index + 1);
    return {
      id: id,
      slug: String(item.slug || "").trim() || ("news-" + id),
      date: String(item.date || ""),
      image: safeImage(item.image),
      imageAlt: item.imageAlt || {},
      title: item.title || {},
      excerpt: item.excerpt || {},
      content: item.content || {}
    };
  }

  // Only a plain https address or a file inside this site is used as a photo.
  // Anything else (javascript:, data:, a protocol-relative //host) is dropped.
  function safeImage(value) {
    var src = String(value || "").trim();
    if (!src) return "";
    if (/^https:\/\/[^\s"'<>\\]+$/i.test(src)) return src;
    if (/^[a-z0-9][a-z0-9._\/-]*\.(jpg|jpeg|png|webp|gif|avif)$/i.test(src) &&
        src.indexOf("..") === -1) {
      return src;
    }
    return "";
  }

  function photoURL(src) {
    return /^https:\/\//i.test(src) ? src : (src.charAt(0) === "/" ? src : "/" + src);
  }

  /* ------------------------------------------------------------- helpers -- */

  function newestFirst(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || (Number(b.id) - Number(a.id));
    });
  }

  function bySlug(id) {
    if (!id) return null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].slug === id || String(items[i].id) === id) return items[i];
    }
    return null;
  }

  // "2026-08-10" -> "10 August 2026" in the language being read.
  function readableDate(value, lang) {
    if (!value) return "";
    var parsed = new Date(value + "T00:00:00");
    if (isNaN(parsed.getTime())) return value;
    try {
      return new Intl.DateTimeFormat(LOCALES[lang] || lang, {
        day: "numeric", month: "long", year: "numeric"
      }).format(parsed);
    } catch (e) {
      return value;
    }
  }

  // No summary typed in? Use the opening of the text.
  function summaryOf(item, lang) {
    var written = Content.inLang(item.excerpt, lang);
    if (written) return written;
    var body = Content.inLang(item.content, lang).replace(/\s+/g, " ").trim();
    if (body.length <= 180) return body;
    var cut = body.slice(0, 180);
    var lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // A blank line in the text starts a new paragraph. Every paragraph is added
  // as plain text, so nothing typed into the admin panel can become markup.
  function paragraphs(into, text) {
    String(text).split(/\n\s*\n/).forEach(function (block) {
      var trimmed = block.trim();
      if (trimmed) into.appendChild(element("p", null, trimmed));
    });
  }

  function photoFigure(item, lang, className) {
    var figure = element("div", className);
    var img = document.createElement("img");
    img.src = photoURL(item.image);
    img.alt = Content.inLang(item.imageAlt, lang) || "";
    img.loading = "lazy";
    img.decoding = "async";
    figure.appendChild(img);
    return figure;
  }

  /* ---------------------------------------------------------- the feed --- */

  function renderFeed(container) {
    var list = container.querySelector("#news-list");
    if (!list) return;

    var lang = Site.lang;
    list.textContent = "";

    if (!items || !items.length) {
      list.appendChild(element("p", "news-empty",
        failed ? Site.word("loadError") : Site.word("newsEmpty")));
      return;
    }

    newestFirst(items).forEach(function (item, index) {
      list.appendChild(feedCard(item, lang, index));
    });

    if (global.Anim) global.Anim.scan(list);
  }

  function feedCard(item, lang, index) {
    var card = element("article", "post-card reveal");
    card.style.setProperty("--i", index);

    // The whole card is one link, so a tap anywhere opens the item.
    var link = document.createElement("a");
    link.className = "post-card__link";
    link.href = "?view=post&id=" + encodeURIComponent(item.slug);
    link.setAttribute("data-goto", "post");
    link.setAttribute("data-id", item.slug);

    if (item.image) link.appendChild(photoFigure(item, lang, "post-card__media"));

    var body = element("div", "post-card__body");

    var meta = element("div", "post-card__meta");
    var time = element("time", "post-card__date", readableDate(item.date, lang));
    time.dateTime = item.date;
    meta.appendChild(time);

    body.appendChild(meta);
    body.appendChild(element("h3", "post-card__title", Content.inLang(item.title, lang)));

    var summary = summaryOf(item, lang);
    if (summary) body.appendChild(element("p", "post-card__excerpt", summary));

    var more = element("span", "post-card__more");
    more.appendChild(element("span", null, Site.word("readMore") || "Read more"));
    body.appendChild(more);

    link.appendChild(body);
    card.appendChild(link);
    return card;
  }

  /* ------------------------------------------------------ a single item --- */

  function renderPost(container, id) {
    var host = container.querySelector("#news-post");
    if (!host) return;

    var lang = Site.lang;
    host.textContent = "";

    var item = bySlug(id);
    if (!item) {
      host.appendChild(notFound(lang));
      if (global.Anim) global.Anim.scan(host);
      return;
    }

    document.title = Content.inLang(item.title, lang) + " — Physics and We";

    var article = element("article", "post");

    // ---- heading -----------------------------------------------------------
    var head = element("header", "post__head reveal");
    head.appendChild(backLink());

    var time = element("time", "post__date", readableDate(item.date, lang));
    time.dateTime = item.date;
    head.appendChild(time);
    head.appendChild(element("h1", "post__title", Content.inLang(item.title, lang)));

    var summary = Content.inLang(item.excerpt, lang);
    if (summary) head.appendChild(element("p", "post__lead", summary));
    article.appendChild(head);

    // ---- the big photo -----------------------------------------------------
    if (item.image) {
      var figure = photoFigure(item, lang, "post__media reveal");
      var caption = Content.inLang(item.imageAlt, lang);
      if (caption) figure.appendChild(element("figcaption", "post__caption", caption));
      article.appendChild(figure);
    }

    // ---- the text ----------------------------------------------------------
    var body = element("div", "post__body reveal");
    paragraphs(body, Content.inLang(item.content, lang));
    article.appendChild(body);

    // ---- back to the list --------------------------------------------------
    var foot = element("footer", "post__foot reveal");
    foot.appendChild(backLink());
    article.appendChild(foot);

    host.appendChild(article);

    // ---- other news --------------------------------------------------------
    var others = newestFirst(items).filter(function (other) { return other.id !== item.id; });
    if (others.length) {
      var related = element("section", "post-related");
      related.appendChild(element("h2", "post-related__title",
        Site.word("moreNews") || "More news"));

      var grid = element("div", "post-related__grid");
      others.slice(0, RELATED_COUNT).forEach(function (other, index) {
        grid.appendChild(feedCard(other, lang, index));
      });
      related.appendChild(grid);
      host.appendChild(related);
    }

    if (global.Anim) global.Anim.scan(host);
  }

  function backLink() {
    var link = document.createElement("a");
    link.className = "post__back";
    link.href = "?view=news";
    link.setAttribute("data-goto", "news");
    link.textContent = Site.word("backToNews") || "All news";
    return link;
  }

  function notFound(lang) {
    var box = element("div", "post-missing reveal");
    box.appendChild(element("h1", "post-missing__title",
      Site.word("postMissing") || "This news item no longer exists."));
    box.appendChild(backLink());
    return box;
  }

  /* --------------------------------------------------------------- wire --- */

  global.addEventListener("section:ready", function (event) {
    var route = event.detail.route;
    if (route !== "news" && route !== "post") return;

    loadOnce().then(function () {
      if (route === "news") renderFeed(event.detail.container);
      else renderPost(event.detail.container, event.detail.id);
    });
  });
})(window);
