(function () {
  "use strict";
  var DEST = "https://forestadmin.autohubmarket.com/login";

  /* ---------------- Theme ---------------- */
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

  /* ---------------- Animated forest + blinking trees/plants ---------------- */
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

  // Parallax fir silhouette layers (back to front)
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
    var palettes = dark ? ["#16281A", "#0F1D12", "#0A140C"] : ["#8FAE85", "#6E9A5E", "#3E6B4A"];
    return palettes[depth];
  }

  function drawFir(x, baseY, h, w, color, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
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
    ctx.globalAlpha = 1;
  }

  // Small plant / sprout silhouette (a few blades + a stem)
  function drawSprout(x, y, size, color, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.lineCap = "round";
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
    ctx.globalAlpha = 1;
  }

  // Random blinking foliage scattered across the whole canvas —
  // a mix of tiny trees and small plants that fade in and out like fireflies.
  var blinkers = [];
  function makeBlinker() {
    var kind = Math.random() < 0.5 ? "tree" : "sprout";
    return {
      kind: kind,
      x: Math.random() * W,
      y: H * 0.15 + Math.random() * H * 0.8,
      size: kind === "tree" ? 14 + Math.random() * 26 : 8 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      speed: 0.006 + Math.random() * 0.014,
      colorIdx: Math.floor(Math.random() * 3),
    };
  }
  function rebuildBlinkers() {
    var count = Math.max(18, Math.round((W * H) / 42000));
    blinkers = [];
    for (var i = 0; i < count; i++) blinkers.push(makeBlinker());
  }
  rebuildBlinkers();
  window.addEventListener("resize", rebuildBlinkers);

  function blinkerColor(idx) {
    var dark = isDark();
    var palette = dark ? ["#2F5A3C", "#3E6B4A", "#7EB584"] : ["#4A7C59", "#6E9A5E", "#B98B4E"];
    return palette[idx];
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Parallax background firs
    layers.forEach(function (layer, depth) {
      var color = layerColor(depth);
      layer.trees.forEach(function (tr) {
        drawFir(tr.x, layer.baseY, tr.h, tr.w, color);
      });
    });

    // Randomly blinking trees + small plants across the whole scene
    blinkers.forEach(function (b) {
      if (!reduceMotion) b.phase += b.speed;
      var alpha = 0.15 + (Math.sin(b.phase) * 0.5 + 0.5) * 0.75;
      var color = blinkerColor(b.colorIdx);
      if (b.kind === "tree") {
        drawFir(b.x, b.y, b.size, b.size * 0.6, color, alpha);
      } else {
        drawSprout(b.x, b.y, b.size, color, alpha);
      }
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var mo = new MutationObserver(function () {});
  mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------------- Click-to-start countdown ---------------- */
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
    statusEl.textContent = "Opening Forest Admin now…";
    setTimeout(function () {
      window.location.href = DEST;
    }, 350);
  }

  function startCountdown() {
    if (started) return;
    started = true;
    gate.hidden = true;
    ringWrap.hidden = false;
    statusEl.hidden = false;
    statusEl.textContent = "Redirecting to Forest Admin…";
    updateRing();
    countEl.textContent = String(remaining);
    timerId = setTimeout(tick, 1000);
  }

  startBtn.addEventListener("click", startCountdown);
})();
