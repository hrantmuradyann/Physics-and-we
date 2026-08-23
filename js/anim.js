/* ============================================================================
   anim.js — the two effects every page shares:
     · things fade in as you scroll to them   (class "reveal" in the layout)
     · numbers count up from zero             (data-number in the layout)

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.
   ========================================================================== */
(function (global) {
  "use strict";

  var reduceMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supported = "IntersectionObserver" in global;

  /* ---------- Fade in on scroll ---------- */

  var revealObserver = supported && !reduceMotion
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : null;

  function setUpReveals(container) {
    var items = container.querySelectorAll(".reveal");

    // Give neighbours a slightly later start, so a row of cards appears one
    // after another instead of all at once. (The delay itself is in the CSS.)
    Array.prototype.forEach.call(items, function (el) {
      if (!el.style.getPropertyValue("--i")) {
        var siblings = el.parentElement
          ? el.parentElement.querySelectorAll(":scope > .reveal")
          : [el];
        el.style.setProperty("--i", Array.prototype.indexOf.call(siblings, el));
      }
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add("is-visible");
    });
  }

  /* ---------- Numbers counting up ---------- */

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-count-suffix") || "";
    var duration = 1600;
    var start = null;

    function step(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var countObserver = supported && !reduceMotion
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.6 })
    : null;

  function setUpCounters(container) {
    var items = container.querySelectorAll("[data-count]");
    Array.prototype.forEach.call(items, function (el) {
      if (countObserver) countObserver.observe(el);
      else el.textContent = (el.getAttribute("data-count") || "0") +
                            (el.getAttribute("data-count-suffix") || "");
    });
  }

  /* ---------- Header turns solid once you scroll ---------- */

  var header = document.getElementById("site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", global.scrollY > 40);
  }
  global.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Run for every section the router puts on the page ---------- */

  function scan(container) {
    setUpReveals(container);
    setUpCounters(container);
  }

  global.addEventListener("section:ready", function (event) {
    scan(event.detail.container);
  });

  // For anything added to the page later (the news list arrives after its
  // section, because it is fetched separately).
  global.Anim = { scan: scan };
})(window);
