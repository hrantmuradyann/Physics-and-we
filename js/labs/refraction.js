/* ============================================================================
   refraction.js — Snell's law, and total internal reflection.

   A beam comes down onto the boundary between two materials. Part of it
   bounces back, part of it carries on bent. Open the angle far enough with
   the denser material on top and nothing gets through at all.

   The moving dots are the point of the lab: they travel at c/n, so they
   visibly slow down as they cross into the denser material. That change of
   speed IS the bending — everything else follows from it.

   The words of this lab are in  data/labs/refraction.json .
   How to write your own: Instructions/LABS-GUIDE.md
   ========================================================================== */
(function () {
  "use strict";

  var DEG = Math.PI / 180;
  var PULSES = 7;            // dots running along the beam at any moment
  var PULSE_SPEED = 300;     // pixels per second in a material of n = 1
  var ARC_RADIUS = 44;       // where the angle arcs are drawn

  Labs.register("refraction", {

    icon: "bulb",
    aspect: 1.6,

    controls: [
      { key: "angle", min: 0,   max: 89,  step: 1,    value: 45,   unit: "°" },
      { key: "n1",    min: 1.0, max: 2.6, step: 0.01, value: 1.00 },
      { key: "n2",    min: 1.0, max: 2.6, step: 0.01, value: 1.50 },
      { key: "reflected", type: "toggle", value: true }
    ],

    readouts: ["refracted", "critical", "share"],

    /* ======================================================================
       What this lab remembers between frames
       ====================================================================== */
    setup: function () {
      return {
        travel: 0,        // how far the leading dot has come, in medium-1 pixels
        dragging: false
      };
    },

    /* travel is measured in pixels, so it means nothing after a resize. */
    resize: function (ctx, state) {
      state.travel = 0;
    },

    /* ======================================================================
       Dragging the beam
       ====================================================================== */
    pointer: function (ctx, state, phase) {
      if (phase === "up") {
        state.dragging = false;
        return;
      }

      var view = geometry(ctx);
      var dx = ctx.pointer.x - view.ox;
      var dy = ctx.pointer.y - view.oy;

      // Only the upper half aims the beam — that is where it comes from.
      if (phase === "down") {
        if (dy > -8) return;
        state.dragging = true;
      }
      if (!state.dragging) return;

      // Angle away from the normal, which points straight up out of the surface.
      var angle = Math.atan2(Math.abs(dx), -dy) / DEG;
      ctx.setValue("angle", Math.max(0, Math.min(89, Math.round(angle))));
    },

    /* ======================================================================
       One frame: work out the angles, then draw
       ====================================================================== */
    frame: function (ctx, state, dt) {
      var n1 = ctx.value("n1");
      var n2 = ctx.value("n2");
      var th1 = ctx.value("angle") * DEG;

      /* ---------- the physics ----------
             n₁ · sin θ₁ = n₂ · sin θ₂

         If that asks for sin θ₂ greater than 1 there is no such angle, and
         nothing crosses the boundary at all: total internal reflection.     */
      var sin2 = (n1 / n2) * Math.sin(th1);
      var trapped = sin2 > 1;
      var th2 = trapped ? null : Math.asin(sin2);

      // A critical angle only exists going into the thinner material.
      var critical = n1 > n2 ? Math.asin(n2 / n1) : null;
      var share = reflectedShare(n1, n2, th1, th2, trapped);

      ctx.show("refracted", trapped ? "—" : (th2 / DEG).toFixed(1) + "°");
      ctx.show("critical", critical === null ? "—" : (critical / DEG).toFixed(1) + "°");
      ctx.show("share", Math.round(share * 100) + " %");

      // The dots move at c/n, so they crawl in the denser material.
      if (dt > 0) state.travel += (PULSE_SPEED / n1) * dt;

      draw(ctx, state, {
        th1: th1, th2: th2, trapped: trapped,
        n1: n1, n2: n2, share: share
      });
    },

    reset: function (ctx, state) {
      state.travel = 0;
      state.dragging = false;
    }
  });

  /* ==========================================================================
     Fresnel's answer to "how much bounces off?", averaged over polarisation.
     At a straight-on hit into glass this is about 4% — a window you can see
     through, and still see yourself in.
     ========================================================================= */
  function reflectedShare(n1, n2, th1, th2, trapped) {
    if (trapped) return 1;
    var c1 = Math.cos(th1);
    var c2 = Math.cos(th2);
    var s = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
    var p = (n1 * c2 - n2 * c1) / (n1 * c2 + n2 * c1);
    return (s * s + p * p) / 2;
  }

  /* ==========================================================================
     Where everything sits on the canvas.
     Worked out fresh each frame, so it is always right after a resize.
     ========================================================================= */
  function geometry(ctx) {
    return { ox: ctx.w / 2, oy: ctx.h * 0.46 };
  }

  // How far a ray travels before it runs off the edge of the picture.
  function toEdge(x, y, dx, dy, w, h) {
    var best = Infinity;
    if (dx > 1e-9) best = Math.min(best, (w - x) / dx);
    if (dx < -1e-9) best = Math.min(best, -x / dx);
    if (dy > 1e-9) best = Math.min(best, (h - y) / dy);
    if (dy < -1e-9) best = Math.min(best, -y / dy);
    return best === Infinity ? 0 : best;
  }

  /* ==========================================================================
     Drawing
     ========================================================================= */
  function draw(ctx, state, phys) {
    var g = ctx.g;
    var view = geometry(ctx);
    var showReflected = ctx.value("reflected");

    var sin1 = Math.sin(phys.th1);
    var cos1 = Math.cos(phys.th1);

    // Unit directions. Canvas y grows downwards, so "up" is negative.
    var inDir  = { x: sin1,  y: cos1 };     // the way the beam travels
    var refDir = { x: sin1,  y: -cos1 };    // bounced back up
    var outDir = phys.trapped ? null
               : { x: Math.sin(phys.th2), y: Math.cos(phys.th2) };

    var inLen  = toEdge(view.ox, view.oy, -inDir.x, -inDir.y, ctx.w, ctx.h);
    var refLen = toEdge(view.ox, view.oy, refDir.x, refDir.y, ctx.w, ctx.h);
    var outLen = outDir ? toEdge(view.ox, view.oy, outDir.x, outDir.y, ctx.w, ctx.h) : 0;

    ctx.clear();

    drawMedia(g, ctx, view, phys);
    drawNormal(g, ctx, view);
    drawAngles(g, ctx, view, phys);

    // Incoming beam, always at full strength.
    ray(g, view.ox - inDir.x * inLen, view.oy - inDir.y * inLen,
        view.ox, view.oy, ctx.color.soft, 2.2, 1);

    // What bounces back, and what carries on, share the light between them.
    if (showReflected) {
      ray(g, view.ox, view.oy,
          view.ox + refDir.x * refLen, view.oy + refDir.y * refLen,
          ctx.color.soft, 2.2, 0.25 + 0.75 * phys.share);
    }
    if (outDir) {
      ray(g, view.ox, view.oy,
          view.ox + outDir.x * outLen, view.oy + outDir.y * outLen,
          ctx.color.accent2, 2.4, 0.3 + 0.7 * (1 - phys.share));
    }

    drawPulses(g, ctx, state, view, {
      inDir: inDir, refDir: refDir, outDir: outDir,
      inLen: inLen, refLen: refLen, outLen: outLen,
      showReflected: showReflected, phys: phys
    });

    drawSurface(g, ctx, view);
    drawLabels(g, ctx, view, phys);
  }

  // A faint tint on each half, heavier for the material that slows light more.
  function drawMedia(g, ctx, view, phys) {
    g.fillStyle = "rgba(126, 168, 255, " + (0.030 * (phys.n1 - 1) + 0.012).toFixed(4) + ")";
    g.fillRect(0, 0, ctx.w, view.oy);

    g.fillStyle = "rgba(126, 168, 255, " + (0.030 * (phys.n2 - 1) + 0.012).toFixed(4) + ")";
    g.fillRect(0, view.oy, ctx.w, ctx.h - view.oy);
  }

  function drawSurface(g, ctx, view) {
    g.strokeStyle = "rgba(255, 255, 255, 0.28)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, view.oy);
    g.lineTo(ctx.w, view.oy);
    g.stroke();
  }

  // The dashed line every angle in this lab is measured from.
  function drawNormal(g, ctx, view) {
    g.save();
    g.setLineDash([4, 6]);
    g.strokeStyle = ctx.color.grid;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(view.ox, 0);
    g.lineTo(view.ox, ctx.h);
    g.stroke();
    g.restore();
  }

  function ray(g, x1, y1, x2, y2, color, width, alpha) {
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, alpha));
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = "round";
    g.shadowColor = color;
    g.shadowBlur = 10;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.restore();
  }

  /* The dots. One number, state.travel, carries all of them: how far the
     light has come measured in medium-1 pixels. After the boundary the same
     elapsed time covers n₁/n₂ as much ground, which is the whole reason the
     beam bends — so the dots and the angle can never disagree. */
  function drawPulses(g, ctx, state, view, r) {
    var ratio = r.phys.n1 / r.phys.n2;
    var beyond = Math.max(
      r.showReflected ? r.refLen : 0,
      r.outDir ? r.outLen / ratio : 0
    );
    var total = r.inLen + beyond;
    if (total < 1) return;

    for (var i = 0; i < PULSES; i++) {
      var s = (state.travel + (i * total) / PULSES) % total;

      if (s < r.inLen) {
        dot(g, ctx.color.text,
            view.ox - r.inDir.x * (r.inLen - s),
            view.oy - r.inDir.y * (r.inLen - s), 1);
        continue;
      }

      var past = s - r.inLen;   // time since it reached the boundary, in pixels

      if (r.showReflected && past <= r.refLen) {
        dot(g, ctx.color.text,
            view.ox + r.refDir.x * past,
            view.oy + r.refDir.y * past,
            0.25 + 0.75 * r.phys.share);
      }
      if (r.outDir && past * ratio <= r.outLen) {
        dot(g, "#cfe0ff",
            view.ox + r.outDir.x * past * ratio,
            view.oy + r.outDir.y * past * ratio,
            0.3 + 0.7 * (1 - r.phys.share));
      }
    }
  }

  function dot(g, color, x, y, alpha) {
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, alpha));
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 12;
    g.beginPath();
    g.arc(x, y, 3.4, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  /* The two angles, drawn as arcs off the normal with the number beside them.
     Digits and ° mean the same thing in every language, so they can live in
     the drawing without breaking the translations. */
  function drawAngles(g, ctx, view, phys) {
    arcTo(g, ctx, view, -Math.PI / 2, Math.atan2(-Math.cos(phys.th1), -Math.sin(phys.th1)),
          phys.th1, ctx.color.soft, -1);

    if (!phys.trapped) {
      arcTo(g, ctx, view, Math.PI / 2, Math.atan2(Math.cos(phys.th2), Math.sin(phys.th2)),
            phys.th2, ctx.color.accent2, 1);
    }
  }

  function arcTo(g, ctx, view, fromAngle, toAngle, value, color, side) {
    if (value < 0.04) return;

    var start = Math.min(fromAngle, toAngle);
    var end = Math.max(fromAngle, toAngle);

    g.save();
    g.globalAlpha = 0.55;
    g.strokeStyle = color;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(view.ox, view.oy, ARC_RADIUS, start, end);
    g.stroke();
    g.restore();

    // Halfway round the arc, pushed out a little, is where the number goes.
    var middle = (start + end) / 2;
    var tx = view.ox + Math.cos(middle) * (ARC_RADIUS + 17);
    var ty = view.oy + Math.sin(middle) * (ARC_RADIUS + 17);

    g.save();
    g.fillStyle = color;
    g.font = "600 12px ui-sans-serif, system-ui, -apple-system, sans-serif";
    g.textAlign = "center";
    g.textBaseline = side < 0 ? "bottom" : "top";
    g.fillText((value / DEG).toFixed(0) + "°", tx, ty);
    g.restore();
  }

  // n₁ and n₂ are symbols, not words — no translation needed.
  function drawLabels(g, ctx, view, phys) {
    g.save();
    g.font = "600 12px ui-sans-serif, system-ui, -apple-system, sans-serif";
    g.fillStyle = ctx.color.muted;
    g.textAlign = "left";

    g.textBaseline = "top";
    g.fillText("n₁ = " + phys.n1.toFixed(2), 14, 12);

    g.textBaseline = "bottom";
    g.fillText("n₂ = " + phys.n2.toFixed(2), 14, ctx.h - 12);
    g.restore();
  }
})();
