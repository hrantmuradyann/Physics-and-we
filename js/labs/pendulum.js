/* ============================================================================
   pendulum.js — the simple pendulum.

   This is the lab the other labs are copied from. It is written to be read:
   every part of it is one of the six things a lab can do, in the order the
   shell calls them.

     setup()    make the numbers this lab remembers
     resize()   the canvas changed size
     change()   a slider was moved
     pointer()  the visitor pressed, dragged or released
     frame()    move the physics on by dt seconds and draw
     reset()    the Reset button

   The words of this lab are in  data/labs/pendulum.json .
   The shell that runs it is  js/labs.js .  How to write your own: Instructions/LABS-GUIDE.md
   ========================================================================== */
(function () {
  "use strict";

  var MAX_LENGTH = 2.5;      // metres — the longest the slider goes
  var TRAIL_POINTS = 90;     // how much of the path stays drawn behind the bob
  var CHART_SECONDS = 8;     // how much of the graph is on screen at once
  var SUBSTEPS = 8;          // physics steps per drawn frame, for a steady swing

  Labs.register("pendulum", {

    icon: "orbit",
    aspect: 1.55,

    /* ---------- the sliders and switches beside the picture ----------
       "key" is the name used below in ctx.value(), and also the name of the
       label in data/labs/pendulum.json under "controls".                   */
    controls: [
      { key: "length",  min: 0.2, max: MAX_LENGTH, step: 0.01, value: 1.00, unit: "m" },
      { key: "gravity", min: 1.0, max: 25,         step: 0.1,  value: 9.81, unit: "m/s²" },
      { key: "damping", min: 0,   max: 1.5,        step: 0.01, value: 0.10, unit: "1/s" },
      { key: "trail",   type: "toggle", value: true }
    ],

    /* ---------- the numbers written out under the sliders ---------- */
    readouts: ["measured", "theory", "angle", "amplitude"],

    /* ======================================================================
       What this lab remembers between frames
       ====================================================================== */
    setup: function () {
      return {
        angle: 0.6,          // radians from straight down, positive to the right
        speed: 0,            // radians per second
        dragging: false,
        trail: [],           // recent positions of the bob, in pixels
        history: [],         // { t, angle } for the graph
        clock: 0,            // seconds since the last reset
        lastCross: null,     // when the bob last passed through the bottom
        measured: null,      // the period we actually timed, in seconds
        amplitude: 0.6       // the widest angle of the current swing
      };
    },

    /* The trail is remembered in pixels, so it is meaningless after the
       canvas changes shape. The graph is remembered in seconds and radians,
       so it survives. */
    resize: function (ctx, state) {
      state.trail.length = 0;
    },

    /* Changing the length or gravity makes any period we timed before wrong. */
    change: function (ctx, state, key) {
      if (key === "length" || key === "gravity") {
        state.measured = null;
        state.lastCross = null;
      }
      if (key === "trail" && !ctx.value("trail")) state.trail.length = 0;
    },

    /* ======================================================================
       Dragging the bob
       ====================================================================== */
    pointer: function (ctx, state, phase) {
      if (phase === "up") {
        state.dragging = false;
        return;
      }

      var view = geometry(ctx);
      var dx = ctx.pointer.x - view.pivotX;
      var dy = ctx.pointer.y - view.pivotY;

      if (phase === "down") {
        // Anywhere near the rod or the bob starts a drag — asking for a
        // 14-pixel bullseye on a phone would be unkind.
        var reach = view.rodLength + view.bobRadius * 2.5;
        if (Math.hypot(dx, dy) > reach || dy < -view.bobRadius) return;
        state.dragging = true;
      }

      if (!state.dragging) return;

      state.angle = Math.atan2(dx, dy);
      state.speed = 0;
      state.amplitude = Math.abs(state.angle);
      state.measured = null;
      state.lastCross = null;
      state.trail.length = 0;
    },

    /* ======================================================================
       One frame: move, then draw
       ====================================================================== */
    frame: function (ctx, state, dt) {
      var length = ctx.value("length");
      var gravity = ctx.value("gravity");
      var damping = ctx.value("damping");

      /* ---------- the physics ----------
         The equation of a pendulum with friction:

             angle'' = -(g / L) · sin(angle) − b · angle'

         There is no sin(angle) ≈ angle here, so the simulation stays honest
         at wide swings — which is the whole point of the lab.               */
      if (dt > 0 && !state.dragging) {
        var h = dt / SUBSTEPS;
        for (var i = 0; i < SUBSTEPS; i++) {
          var before = state.angle;
          state.speed += (-(gravity / length) * Math.sin(state.angle) - damping * state.speed) * h;
          state.angle += state.speed * h;

          // Passing through the bottom, moving the same way as last time, is
          // one whole period. Timing it is how a real experiment is done.
          if (before < 0 && state.angle >= 0) {
            var now = state.clock + (i + 1) * h;
            if (state.lastCross !== null) state.measured = now - state.lastCross;
            state.lastCross = now;
          }
        }
        state.clock += dt;
        state.amplitude = Math.max(Math.abs(state.angle), state.amplitude * 0.995);

        state.history.push({ t: state.clock, angle: state.angle });
        while (state.history.length && state.history[0].t < state.clock - CHART_SECONDS) {
          state.history.shift();
        }
      }

      /* ---------- the numbers ---------- */
      var theory = 2 * Math.PI * Math.sqrt(length / gravity);
      ctx.show("theory", theory.toFixed(2) + " s");
      ctx.show("measured", state.measured ? state.measured.toFixed(2) + " s" : "—");
      ctx.show("angle", (state.angle * 180 / Math.PI).toFixed(1) + "°");
      ctx.show("amplitude", (state.amplitude * 180 / Math.PI).toFixed(0) + "°");

      /* ---------- the picture ---------- */
      draw(ctx, state);
    },

    reset: function (ctx, state) {
      state.angle = 0.6;
      state.speed = 0;
      state.dragging = false;
      state.trail.length = 0;
      state.history.length = 0;
      state.clock = 0;
      state.lastCross = null;
      state.measured = null;
      state.amplitude = 0.6;
    }
  });

  /* ==========================================================================
     Where everything sits on the canvas.
     Worked out fresh each frame, so it is always right after a resize.
     ========================================================================= */
  function geometry(ctx) {
    var chartHeight = Math.min(ctx.h * 0.28, 130);
    var stageHeight = ctx.h - chartHeight;
    var pivotY = stageHeight * 0.13;
    var perMetre = (stageHeight * 0.74) / MAX_LENGTH;

    return {
      chartHeight: chartHeight,
      stageHeight: stageHeight,
      pivotX: ctx.w / 2,
      pivotY: pivotY,
      perMetre: perMetre,
      rodLength: perMetre * MAX_LENGTH,
      bobRadius: Math.max(11, Math.min(ctx.w, ctx.h) * 0.035)
    };
  }

  /* ==========================================================================
     Drawing
     ========================================================================= */
  function draw(ctx, state) {
    var g = ctx.g;
    var view = geometry(ctx);
    var length = ctx.value("length");
    var rod = view.perMetre * length;

    var bobX = view.pivotX + Math.sin(state.angle) * rod;
    var bobY = view.pivotY + Math.cos(state.angle) * rod;

    ctx.clear();

    drawCeiling(g, ctx, view);
    drawSwingArc(g, ctx, view, state, rod);

    if (ctx.value("trail")) {
      state.trail.push({ x: bobX, y: bobY });
      while (state.trail.length > TRAIL_POINTS) state.trail.shift();
      drawTrail(g, ctx, state);
    }

    drawRod(g, ctx, view, bobX, bobY);
    drawBob(g, ctx, view, bobX, bobY, state.dragging);
    drawChart(g, ctx, view, state);
  }

  function drawCeiling(g, ctx, view) {
    g.strokeStyle = ctx.color.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(view.pivotX - 70, view.pivotY);
    g.lineTo(view.pivotX + 70, view.pivotY);
    g.stroke();

    // The hatching that means "this is fixed to the ceiling".
    g.beginPath();
    for (var x = -66; x <= 62; x += 11) {
      g.moveTo(view.pivotX + x, view.pivotY);
      g.lineTo(view.pivotX + x + 8, view.pivotY - 9);
    }
    g.stroke();
  }

  // The faint straight-down line and the arc the bob swings between.
  function drawSwingArc(g, ctx, view, state, rod) {
    g.save();
    g.setLineDash([4, 6]);
    g.strokeStyle = ctx.color.grid;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(view.pivotX, view.pivotY);
    g.lineTo(view.pivotX, view.pivotY + rod + 26);
    g.stroke();
    g.restore();

    var spread = Math.min(state.amplitude, Math.PI * 0.95);
    if (spread < 0.05) return;

    g.strokeStyle = "rgba(126, 168, 255, 0.22)";
    g.lineWidth = 1.4;
    g.beginPath();
    // Canvas angles start at three o'clock; the pendulum's start straight
    // down, which is a quarter turn later.
    g.arc(view.pivotX, view.pivotY, rod, Math.PI / 2 - spread, Math.PI / 2 + spread);
    g.stroke();
  }

  function drawTrail(g, ctx, state) {
    var points = state.trail;
    for (var i = 1; i < points.length; i++) {
      var fade = i / points.length;
      g.strokeStyle = "rgba(126, 168, 255, " + (fade * 0.5).toFixed(3) + ")";
      g.lineWidth = 1 + fade * 2;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(points[i - 1].x, points[i - 1].y);
      g.lineTo(points[i].x, points[i].y);
      g.stroke();
    }
  }

  function drawRod(g, ctx, view, bobX, bobY) {
    var line = g.createLinearGradient(view.pivotX, view.pivotY, bobX, bobY);
    line.addColorStop(0, "rgba(255,255,255,0.20)");
    line.addColorStop(1, ctx.color.soft);

    g.strokeStyle = line;
    g.lineWidth = 2;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(view.pivotX, view.pivotY);
    g.lineTo(bobX, bobY);
    g.stroke();

    g.fillStyle = ctx.color.muted;
    g.beginPath();
    g.arc(view.pivotX, view.pivotY, 4, 0, Math.PI * 2);
    g.fill();
  }

  function drawBob(g, ctx, view, bobX, bobY, held) {
    var r = view.bobRadius;

    g.save();
    g.shadowColor = "rgba(47, 128, 237, 0.75)";
    g.shadowBlur = held ? 30 : 18;

    var ball = g.createRadialGradient(bobX - r * 0.35, bobY - r * 0.4, r * 0.15,
                                      bobX, bobY, r);
    ball.addColorStop(0, "#cfe0ff");
    ball.addColorStop(0.55, ctx.color.accent);
    ball.addColorStop(1, ctx.color.accent2);
    g.fillStyle = ball;
    g.beginPath();
    g.arc(bobX, bobY, r, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // A ring while it is being held, so it is obvious the bob can be grabbed.
    if (held) {
      g.strokeStyle = "rgba(255,255,255,0.7)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(bobX, bobY, r + 6, 0, Math.PI * 2);
      g.stroke();
    }
  }

  /* The angle against time, scrolling by underneath — the graph a student
     would tape into a notebook. */
  function drawChart(g, ctx, view, state) {
    var top = view.stageHeight + 6;
    var height = view.chartHeight - 12;
    var middle = top + height / 2;
    if (height < 30) return;

    g.strokeStyle = ctx.color.grid;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, middle);
    g.lineTo(ctx.w, middle);
    g.stroke();

    if (state.history.length < 2) return;

    var scale = Math.max(state.amplitude, 0.15);
    var start = state.clock - CHART_SECONDS;

    g.strokeStyle = ctx.color.soft;
    g.lineWidth = 1.6;
    g.lineJoin = "round";
    g.beginPath();
    for (var i = 0; i < state.history.length; i++) {
      var point = state.history[i];
      var x = ((point.t - start) / CHART_SECONDS) * ctx.w;
      var y = middle - (point.angle / scale) * (height / 2) * 0.9;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
})();
