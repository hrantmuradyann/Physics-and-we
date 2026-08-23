/* ============================================================================
   home.js — the moving constellation behind the title on the home page.

   YOU DO NOT NEED TO READ THIS FILE TO EDIT THE WEBSITE.
   The words on the home page are in  data/home.json .
   ========================================================================== */
(function (global) {
  "use strict";

  var reduceMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var active = null;   // the running animation, so we never start two at once

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

  global.addEventListener("section:ready", function (event) {
    if (event.detail.route !== "home") return;

    if (active) { active(); active = null; }      // the page was rebuilt
    var canvas = event.detail.container.querySelector(".hero__canvas");
    if (canvas) active = startParticles(canvas);
  });
})(window);
