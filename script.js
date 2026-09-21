(function () {
  "use strict";
  var DEST = "https://forestadmin.autohubmarket.com/login";

  /* ================= Theme ================= */
  var root = document.documentElement;
  var btnLight = document.getElementById("btn-light");
  var btnDark = document.getElementById("btn-dark");
  var btnSystem = document.getElementById("btn-system");

  function applyTheme(mode) {
    if (mode === "light") root.setAttribute("data-theme", "light");
    else if (mode === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");

    [btnLight, btnDark, btnSystem].forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
    });
    if (mode === "light") btnLight.setAttribute("aria-pressed", "true");
    else if (mode === "dark") btnDark.setAttribute("aria-pressed", "true");
    else btnSystem.setAttribute("aria-pressed", "true");

    try { localStorage.setItem("ceyline-theme", mode); } catch (e) {}
  }

  var savedTheme = "system";
  try { savedTheme = localStorage.getItem("ceyline-theme") || "system"; } catch (e) {}
  applyTheme(savedTheme);

  btnLight.addEventListener("click", function () { applyTheme("light"); });
  btnDark.addEventListener("click", function () { applyTheme("dark"); });
  btnSystem.addEventListener("click", function () { applyTheme("system"); });

  /* ================= Animated forest: blinking trees + blinking fairy lights ================= */
  var canvas = document.getElementById("canopy-canvas");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W, H;

  function isDark() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "dark") return true;
    if (explicit === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // Faint static parallax backdrop (unlit, so the blinking foliage reads clearly against it)
  function buildLayer(count, baseY, heightRange, seedOffset) {
    var trees = [];
    for (var i = 0; i < count; i++) {
      var x = (i / count) * (W * 1.3) - W * 0.15 + Math.sin(i * 12.9 + seedOffset) * 30;
      var h = heightRange[0] + Math.abs(Math.sin(i * 3.7 + seedOffset)) * (heightRange[1] - heightRange[0]);
      var w = h * (0.55 + Math.sin(i * 1.7) * 0.12);
      trees.push({ x: x, h: h, w: w });
    }
    return { trees: trees, baseY: baseY };
  }

  var layers = [];
  function rebuildLayers() {
    layers = [
      buildLayer(9, H * 0.62, [H * 0.22, H * 0.34], 1),
      buildLayer(12, H * 0.74, [H * 0.30, H * 0.46], 7),
      buildLayer(8, H * 0.90, [H * 0.42, H * 0.62], 13),
    ];
  }
  rebuildLayers();
  window.addEventListener("resize", rebuildLayers);

  function layerColor(depth) {
    var dark = isDark();
    var palettes = dark ? ["#132419", "#0D1A10", "#08120A"] : ["#96B48C", "#799E67", "#456F4C"];
    return palettes[depth];
  }

  function drawFir(x, baseY, h, w, color, alpha, glow) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    var tiers = 3;
    for (var t = 0; t < tiers; t++) {
      var tierH = h * (0.42 - t * 0.06);
      var tierW = w * (1 - t * 0.26);
      var tierY = baseY - h * 0.15 - t * h * 0.28;
      ctx.beginPath();
      ctx.moveTo(x, tierY - tierH);
      ctx.lineTo(x - tierW / 2, tierY);
      ctx.lineTo(x + tierW / 2, tierY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - w * 0.045, baseY - h * 0.12, w * 0.09, h * 0.16);
    ctx.restore();
  }

  // Small plant / sprout silhouette (a few blades + a stem)
  function drawSprout(x, y, size, color, alpha, glow) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.14);
    ctx.lineCap = "round";
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.6, x - size * 0.15, y - size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.7, x + size * 0.2, y - size * 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x, y - size * 0.5, x, y - size * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // A tiny glowing point of light (firefly / fairy light)
  function drawLight(x, y, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    var grad = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.min(1, alpha * 1.4);
    ctx.fillStyle = "#FFFDF2";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Randomly placed, independently blinking trees + small plants — the whole
  // canvas is their stage, not just the tree line.
  var blinkers = [];
  function makeBlinker() {
    var kind = Math.random() < 0.55 ? "tree" : "sprout";
    return {
      kind: kind,
      x: Math.random() * W,
      y: H * 0.12 + Math.random() * H * 0.82,
      size: kind === "tree" ? 16 + Math.random() * 30 : 9 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.022,
      colorIdx: Math.floor(Math.random() * 3),
    };
  }

  // Randomly placed blinking fairy lights, scattered independently of the trees
  var lights = [];
  function makeLight() {
    return {
      x: Math.random() * W,
      y: H * 0.1 + Math.random() * H * 0.85,
      size: 1.4 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.05,
      hold: Math.random() < 0.5, // some lights flicker fast, some hold longer
      hue: Math.random() < 0.7 ? "#FFE9B8" : "#CFF3D8",
    };
  }

  function rebuildScatter() {
    var area = W * H;
    var treeCount = Math.max(20, Math.round(area / 40000));
    var lightCount = Math.max(26, Math.round(area / 26000));
    blinkers = [];
    for (var i = 0; i < treeCount; i++) blinkers.push(makeBlinker());
    lights = [];
    for (var j = 0; j < lightCount; j++) lights.push(makeLight());
  }
  rebuildScatter();
  window.addEventListener("resize", rebuildScatter);

  function blinkerColor(idx) {
    var dark = isDark();
    var palette = dark ? ["#3B7A4E", "#4F9660", "#8FD79A"] : ["#4A7C59", "#6E9A5E", "#2F5A3C"];
    return palette[idx];
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // faint static backdrop
    layers.forEach(function (layer, depth) {
      var color = layerColor(depth);
      layer.trees.forEach(function (tr) { drawFir(tr.x, layer.baseY, tr.h, tr.w, color, 0.9); });
    });

    // randomly blinking trees + plants, glowing as they brighten
    blinkers.forEach(function (b) {
      if (!reduceMotion) b.phase += b.speed;
      var wave = Math.sin(b.phase) * 0.5 + 0.5;
      var alpha = 0.08 + wave * 0.92;
      var color = blinkerColor(b.colorIdx);
      var glow = wave * 14;
      if (b.kind === "tree") drawFir(b.x, b.y, b.size, b.size * 0.6, color, alpha, glow);
      else drawSprout(b.x, b.y, b.size, color, alpha, glow);
    });

    // randomly blinking fairy lights
    lights.forEach(function (l) {
      if (!reduceMotion) l.phase += l.speed;
      var wave = Math.sin(l.phase) * 0.5 + 0.5;
      var alpha = l.hold ? 0.15 + wave * 0.55 : Math.pow(wave, 3);
      drawLight(l.x, l.y, l.size, l.hue, alpha);
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ================= Sound engine: nature ambience + countdown ticks ================= */
  var Sound = (function () {
    var ctxAudio = null;
    var master = null;
    var running = false;
    var enabled = false;
    var birdTimer = null;

    function ensureContext() {
      if (ctxAudio) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctxAudio = new AC();
      master = ctxAudio.createGain();
      master.gain.value = 0;
      master.connect(ctxAudio.destination);
    }

    function makeNoiseBuffer() {
      var len = ctxAudio.sampleRate * 4;
      var buffer = ctxAudio.createBuffer(1, len, ctxAudio.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function startWind() {
      var noise = ctxAudio.createBufferSource();
      noise.buffer = makeNoiseBuffer();
      noise.loop = true;

      var bandpass = ctxAudio.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 700;
      bandpass.Q.value = 0.6;

      var lowpass = ctxAudio.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1200;

      var windGain = ctxAudio.createGain();
      windGain.gain.value = 0.05;

      noise.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(windGain);
      windGain.connect(master);
      noise.start();

      var lfo = ctxAudio.createOscillator();
      lfo.frequency.value = 0.05;
      var lfoGain = ctxAudio.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();
    }

    function chirp() {
      if (!enabled || !ctxAudio) return;
      var now = ctxAudio.currentTime;
      var baseFreq = 1800 + Math.random() * 1800;
      var notes = 2 + Math.floor(Math.random() * 3);
      var t = now;

      var panner = (ctxAudio.createStereoPanner && ctxAudio.createStereoPanner()) || null;
      var out = master;
      if (panner) {
        panner.pan.value = Math.random() * 2 - 1;
        panner.connect(master);
        out = panner;
      }

      var bp = ctxAudio.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = baseFreq;
      bp.Q.value = 6;
      bp.connect(out);

      for (var n = 0; n < notes; n++) {
        var osc = ctxAudio.createOscillator();
        osc.type = "sine";
        var g = ctxAudio.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(bp);

        var f0 = baseFreq * (0.9 + Math.random() * 0.3);
        var f1 = f0 * (1.15 + Math.random() * 0.35);
        var dur = 0.06 + Math.random() * 0.05;

        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + dur);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.start(t);
        osc.stop(t + dur + 0.02);

        t += dur + 0.04 + Math.random() * 0.05;
      }
    }

    function scheduleBirds() {
      clearTimeout(birdTimer);
      if (!enabled) return;
      var delay = 900 + Math.random() * 2600;
      birdTimer = setTimeout(function () {
        chirp();
        if (Math.random() < 0.4) setTimeout(chirp, 250 + Math.random() * 400);
        scheduleBirds();
      }, delay);
    }

    // A soft, woody tick for each countdown second — pitch rises as it nears zero.
    function tick(secondsLeft, totalSeconds) {
      ensureContext();
      if (!ctxAudio) return;
      if (ctxAudio.state === "suspended") ctxAudio.resume();

      var now = ctxAudio.currentTime;
      var progress = 1 - secondsLeft / totalSeconds; // 0 -> 1 as it counts down
      var freq = 520 + progress * 420;

      var osc = ctxAudio.createOscillator();
      osc.type = "triangle";
      var g = ctxAudio.createGain();
      g.gain.value = 0.0001;

      var bp = ctxAudio.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq * 2;
      bp.Q.value = 4;

      osc.frequency.setValueAtTime(freq, now);
      osc.connect(bp);
      bp.connect(g);
      g.connect(master);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    // A brighter chime when the countdown reaches zero.
    function chime() {
      ensureContext();
      if (!ctxAudio) return;
      if (ctxAudio.state === "suspended") ctxAudio.resume();
      var now = ctxAudio.currentTime;
      [880, 1108.7, 1318.5].forEach(function (freq, i) {
        var osc = ctxAudio.createOscillator();
        osc.type = "sine";
        var g = ctxAudio.createGain();
        g.gain.value = 0.0001;
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(master);
        var t = now + i * 0.09;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        osc.start(t);
        osc.stop(t + 0.75);
      });
    }

    function start() {
      ensureContext();
      if (!ctxAudio) return;
      if (ctxAudio.state === "suspended") ctxAudio.resume();
      if (!running) { startWind(); running = true; }
      enabled = true;
      master.gain.cancelScheduledValues(ctxAudio.currentTime);
      master.gain.setTargetAtTime(0.7, ctxAudio.currentTime, 0.8);
      scheduleBirds();
    }

    function stop() {
      enabled = false;
      clearTimeout(birdTimer);
      if (ctxAudio && master) {
        master.gain.cancelScheduledValues(ctxAudio.currentTime);
        master.gain.setTargetAtTime(0, ctxAudio.currentTime, 0.4);
      }
    }

    function toggle() { if (enabled) stop(); else start(); return enabled; }

    return {
      start: start,
      stop: stop,
      toggle: toggle,
      tick: tick,
      chime: chime,
      isEnabled: function () { return enabled; },
    };
  })();

  var btnSound = document.getElementById("btn-sound");
  function refreshSoundBtn() {
    btnSound.setAttribute("aria-pressed", Sound.isEnabled() ? "true" : "false");
    btnSound.innerHTML = Sound.isEnabled() ? "&#128266;" : "&#128263;";
  }
  btnSound.addEventListener("click", function () {
    Sound.toggle();
    refreshSoundBtn();
  });

  /* ================= Click-to-start countdown ================= */
  var gate = document.getElementById("gate");
  var startBtn = document.getElementById("start-btn");
  var ringWrap = document.getElementById("ring-wrap");
  var countEl = document.getElementById("count");
  var statusEl = document.getElementById("status");
  var ring = document.getElementById("ring");

  var CIRC = 326.7; // 2 * PI * 52
  var TOTAL = 10;
  var remaining = TOTAL;
  var timerId = null;
  var finished = false;
  var started = false;

  function updateRing() {
    var frac = remaining / TOTAL;
    ring.style.strokeDashoffset = String(CIRC * (1 - frac));
  }

  function tick() {
    if (finished) return;
    countEl.textContent = String(remaining);
    countEl.classList.remove("pulse");
    void countEl.offsetWidth;
    countEl.classList.add("pulse");
    updateRing();
    Sound.tick(remaining, TOTAL);
    if (remaining <= 0) {
      finish();
      return;
    }
    remaining -= 1;
    timerId = setTimeout(tick, 1000);
  }

  function finish() {
    finished = true;
    clearTimeout(timerId);
    Sound.chime();
    statusEl.textContent = "Redirecting…";
    setTimeout(function () {
      window.location.href = DEST;
    }, 500);
  }

  function startCountdown() {
    if (started) return;
    started = true;

    // A click is a user gesture — start the nature soundtrack together with the countdown.
    Sound.start();
    refreshSoundBtn();

    gate.hidden = true;
    ringWrap.hidden = false;
    updateRing();
    countEl.textContent = String(remaining);
    timerId = setTimeout(tick, 1000);
  }

  startBtn.addEventListener("click", startCountdown);
})();
