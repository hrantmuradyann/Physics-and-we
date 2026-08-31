/* ============================================================================
   home.js — the moving constellation behind the title on the home page.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.
   The words on the home page are in  data/home.json .
   ========================================================================== */
(function (global) {
  "use strict";

  var reduceMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var active = null;         // the running star animation, so we never start two at once
  var activeGallery = null;  // the running photo rotation, same idea

  function startParticles(canvas) {
    var parent = canvas.parentElement;
    var ctx = canvas.getContext("2d");
    var width = 0, height = 0;
    var particles = [];
    var frame = null;
    var running = false;
    var mouse = { x: null, y: null };
    var resizeTimer = null;

    function measure() {
      // While the home page is not on screen the canvas has no size — keep
      // the last good measurement instead of collapsing to zero.
      if (!parent.clientWidth || !parent.clientHeight) return;

      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(Math.floor((width * height) / 14000), 110);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,190,255,0.75)";
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(90,130,240," + (1 - distance / 130) * 0.35 + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        if (mouse.x !== null) {
          var mx = p.x - mouse.x, my = p.y - mouse.y;
          var toMouse = Math.sqrt(mx * mx + my * my);
          if (toMouse < 170) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = "rgba(120,160,255," + (1 - toMouse / 170) * 0.5 + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (running && !reduceMotion) frame = requestAnimationFrame(draw);
    }

    function play() {
      if (running) return;
      running = true;
      if (!width) measure();
      draw();
    }

    function pause() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var wasRunning = running;
        pause();
        measure();
        if (wasRunning) play();
      }, 180);
    }

    function onMouseMove(event) {
      var rect = parent.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }

    function onMouseLeave() {
      mouse.x = null;
      mouse.y = null;
    }

    global.addEventListener("resize", onResize);
    parent.addEventListener("mousemove", onMouseMove);
    parent.addEventListener("mouseleave", onMouseLeave);

    // Only animate while the hero is actually on screen — that keeps the
    // laptop fan quiet when the visitor is reading another page.
    var watcher = null;
    if ("IntersectionObserver" in global) {
      watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { measure(); play(); }
          else pause();
        });
      }, { threshold: 0.01 });
      watcher.observe(canvas);
    } else {
      measure();
      play();
    }

    return function stop() {
      pause();
      if (watcher) watcher.disconnect();
      global.removeEventListener("resize", onResize);
      parent.removeEventListener("mousemove", onMouseMove);
      parent.removeEventListener("mouseleave", onMouseLeave);
    };
  }

  /* -------------------------------------------------------------------------
     The "Students & We" gallery next to "How everyday tech works": three
     photo frames, each cycling through its own list of pictures once every
     10 seconds, crossfading between them.

     Which photos belong to which frame lives in data/home.json, under
     showcase.gallery.groups — see the "_readmeGallery" note there.
  -------------------------------------------------------------------------- */
  function startGalleryRotation(container, data) {
    var groups = data && data.showcase && data.showcase.gallery && data.showcase.gallery.groups;
    if (!Array.isArray(groups)) return null;

    var items = container.querySelectorAll(".showcase__gallery-item");
    var stops = [];

    // One flat list of EVERY photo in the whole gallery, in the order the
    // frames appear on the page. This is what the lightbox pages through —
    // it's what lets you open any frame and keep scrolling straight into
    // the next frame's photos instead of getting stuck inside just one.
    var flatImages = [];
    var flatAlts = [];

    Array.prototype.forEach.call(items, function (item) {
      var group = groups[Number(item.getAttribute("data-gallery-group"))];
      var images = group && Array.isArray(group.images) ? group.images.filter(Boolean) : [];
      if (!images.length) return; // no photos configured for this frame yet

      var imgA = item.querySelector(".showcase__gallery-img--a");
      var imgB = item.querySelector(".showcase__gallery-img--b");
      var frame = item.querySelector(".showcase__gallery-frame");
      if (!imgA || !imgB) return;

      var alt = global.Content ? global.Content.inLang(group.alt, global.Site && global.Site.lang) : "";
      imgA.src = images[0];
      imgA.alt = alt;
      imgB.alt = alt;

      // The caption above this frame, same source as the alt text
      var labelEl = item.querySelector(".showcase__gallery-label");
      if (labelEl) {
        labelEl.textContent = global.Content
          ? global.Content.inLang(group.label, global.Site && global.Site.lang)
          : "";
      }

      // This frame's photos start right after whatever's already in the
      // flat list — so "offset + i" always points at the photo this frame
      // is showing right now, wherever that lands in the combined list.
      var offset = flatImages.length;
      images.forEach(function (src) { flatImages.push(src); flatAlts.push(alt); });

      var i = 0;

      if (frame) {
        frame.classList.add("showcase__gallery-frame--clickable");
        frame.addEventListener("click", function () {
          openLightbox(flatImages, flatAlts, offset + i);
        });
      }

      if (images.length < 2) return; // only one photo here — nothing to rotate to

      var timer = setInterval(function () {
        i = (i + 1) % images.length;

        // Bring the next photo in on the top layer, fading it over the
        // bottom layer (which still shows the current photo)...
        imgB.src = images[i];
        imgB.classList.remove("is-visible");
        void imgB.offsetWidth; // reflow, so the fade-in plays every time
        imgB.classList.add("is-visible");

        // ...then, once the fade has finished, copy the new photo onto the
        // bottom layer and hide the top layer again — same picture underneath,
        // so nothing visibly changes — ready to fade in the photo after next.
        global.setTimeout(function () {
          imgA.src = images[i];
          imgB.classList.remove("is-visible");
        }, 1150); // a touch longer than the 1.1s CSS transition

      }, 10000); // 10 seconds per photo

      stops.push(function () { clearInterval(timer); });
    });

    if (!stops.length) return null;
    return function stopAll() { stops.forEach(function (fn) { fn(); }); };
  }

  /* -------------------------------------------------------------------------
     Fullscreen photo viewer. Click any gallery photo to open it full-size,
     then use the arrow buttons, the ← / → keys, or a swipe on touch
     screens to page through every photo in the gallery — not just the
     frame you clicked. Built once and reused (not rebuilt) every time the
     home page is revisited, so we don't pile up duplicate elements or
     duplicate click listeners.
  -------------------------------------------------------------------------- */
  var lightboxEl = null;
  var lightboxImages = [];
  var lightboxAlts = [];
  var lightboxIndex = 0;

  function buildLightbox() {
    if (lightboxEl) return lightboxEl;

    var el = document.createElement("div");
    el.className = "gallery-lightbox";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<button type="button" class="gallery-lightbox__close" aria-label="Close">&times;</button>' +
      '<button type="button" class="gallery-lightbox__nav gallery-lightbox__nav--prev" aria-label="Previous photo">&#8249;</button>' +
      '<div class="gallery-lightbox__stage"><img class="gallery-lightbox__img" alt=""></div>' +
      '<button type="button" class="gallery-lightbox__nav gallery-lightbox__nav--next" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(el);

    el.querySelector(".gallery-lightbox__close").addEventListener("click", closeLightbox);
    el.querySelector(".gallery-lightbox__nav--prev").addEventListener("click", function () {
      showLightboxPhoto(lightboxIndex - 1);
    });
    el.querySelector(".gallery-lightbox__nav--next").addEventListener("click", function () {
      showLightboxPhoto(lightboxIndex + 1);
    });

    // Clicking the dark backdrop (not the photo itself) closes it too
    el.addEventListener("click", function (event) {
      if (event.target === el) closeLightbox();
    });

    // Swipe left/right to move between photos on touch devices
    var touchStartX = null;
    el.addEventListener("touchstart", function (event) {
      touchStartX = event.touches[0].clientX;
    }, { passive: true });
    el.addEventListener("touchend", function (event) {
      if (touchStartX === null) return;
      var dx = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 40) return; // too small to count as a deliberate swipe
      showLightboxPhoto(lightboxIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });

    lightboxEl = el;
    return el;
  }

  function showLightboxPhoto(index) {
    var count = lightboxImages.length;
    lightboxIndex = ((index % count) + count) % count; // wrap around at both ends
    var img = lightboxEl.querySelector(".gallery-lightbox__img");
    img.src = lightboxImages[lightboxIndex];
    img.alt = lightboxAlts[lightboxIndex] || "";
  }

  function onLightboxKeydown(event) {
    if (event.key === "Escape") closeLightbox();
    else if (event.key === "ArrowRight") showLightboxPhoto(lightboxIndex + 1);
    else if (event.key === "ArrowLeft") showLightboxPhoto(lightboxIndex - 1);
  }

  function openLightbox(images, alts, startIndex) {
    if (!images.length) return;
    buildLightbox();
    lightboxImages = images;
    lightboxAlts = alts;
    showLightboxPhoto(startIndex);
    lightboxEl.classList.add("is-open");
    lightboxEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-lightbox-open"); // stop the page behind it scrolling
    document.addEventListener("keydown", onLightboxKeydown);
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove("is-open");
    lightboxEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-lightbox-open");
    document.removeEventListener("keydown", onLightboxKeydown);
  }

  global.addEventListener("section:ready", function (event) {
    if (event.detail.route !== "home") return;

    if (active) { active(); active = null; }      // the page was rebuilt
    var canvas = event.detail.container.querySelector(".hero__canvas");
    if (canvas) active = startParticles(canvas);

    if (activeGallery) { activeGallery(); activeGallery = null; }
    activeGallery = startGalleryRotation(event.detail.container, event.detail.data);
  });
})(window);
