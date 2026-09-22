/*
 * Reelscape (vanilla port) — an infinite, scattered, zoomable canvas of
 * Instagram reels/posts. Ported from the React component in
 * reelscape-portfolio/components/Reelscape.jsx for this static Webflow site.
 * The render / drag / wheel-dolly / inertia logic is unchanged; only the React
 * shell (useRef / JSX / <style>) is replaced with plain DOM creation.
 *
 *   initReelscape(mountEl, { reels, handle, height });
 *
 *   reels   Array<{ url, cover }>   cover = path to image (relative here)
 *   handle  string   label top-left (pass "" to hide)
 *   height  string   CSS height of the canvas (default "100vh")
 *
 * Drag to pan · scroll to fly in/out (endless) · click a tile to open it.
 */
(function () {
  "use strict";

  var CSS = "" +
    ".rs-root{position:relative;width:100%;overflow:hidden;background:#0b0b0e;color:#f4f1ea;" +
    "  font-family:\"Bricolage Grotesque\",-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased;}" +
    ".rs-stage{position:absolute;inset:0;cursor:grab;touch-action:none;" +
    "  background:radial-gradient(120% 90% at 50% 42%,rgba(255,255,255,.05),transparent 58%)," +
    "             radial-gradient(160% 140% at 50% 125%,rgba(255,92,122,.12),transparent 55%),#0b0b0e;}" +
    ".rs-stage.rs-dragging{cursor:grabbing;}" +
    ".rs-world{position:absolute;inset:0;pointer-events:none;}" +
    ".rs-tile{position:absolute;top:0;left:0;display:block;transform-origin:0 0;border-radius:14px;" +
    "  background-size:cover;background-position:center;background-color:#141419;overflow:hidden;pointer-events:auto;" +
    "  box-shadow:0 22px 50px -20px rgba(0,0,0,.8),0 4px 12px -4px rgba(0,0,0,.5);" +
    "  outline:none;-webkit-tap-highlight-color:transparent;transition:box-shadow .25s ease;will-change:transform,opacity;}" +
    ".rs-tile::after{content:\"\";position:absolute;inset:0;border-radius:inherit;" +
    "  box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);pointer-events:none;}" +
    "@media (hover:hover){" +
    "  .rs-tile:hover{box-shadow:0 40px 90px -22px rgba(0,0,0,.92),0 0 0 1px rgba(255,255,255,.14);" +
    "    filter:brightness(1.15) saturate(1.1)!important;z-index:99999!important;}" +
    "  .rs-tile:hover .rs-badge{opacity:1;transform:translateY(0);}" +
    "}" +
    ".rs-badge{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;" +
    "  display:grid;place-items:center;background:rgba(11,11,14,.55);backdrop-filter:blur(6px);" +
    "  color:#f4f1ea;opacity:0;transform:translateY(-4px);transition:opacity .22s,transform .22s;}" +
    ".rs-badge svg{width:14px;height:14px;}" +
    ".rs-overlay{position:absolute;z-index:20;pointer-events:none;}" +
    ".rs-brand{top:20px;left:22px;}" +
    ".rs-handle{font-weight:800;font-size:clamp(19px,2.4vw,26px);letter-spacing:-.02em;display:flex;align-items:center;gap:9px;}" +
    ".rs-dot{width:9px;height:9px;border-radius:50%;background:#ff5c7a;box-shadow:0 0 14px #ff5c7a;}" +
    ".rs-sub{margin-top:5px;font-family:\"Space Mono\",ui-monospace,Menlo,monospace;font-size:11px;" +
    "  letter-spacing:.06em;text-transform:uppercase;color:#9a96a6;}" +
    ".rs-hint{left:50%;transform:translateX(-50%);bottom:18px;font-family:\"Space Mono\",ui-monospace,Menlo,monospace;" +
    "  font-size:11px;letter-spacing:.05em;color:#9a96a6;text-align:center;background:rgba(11,11,14,.42);" +
    "  backdrop-filter:blur(6px);padding:8px 15px;border-radius:999px;border:1px solid rgba(255,255,255,.06);}" +
    ".rs-hint b{color:#f4f1ea;font-weight:700;font-family:inherit;}" +
    ".rs-zoom{top:20px;right:22px;font-family:\"Space Mono\",ui-monospace,Menlo,monospace;font-size:11px;" +
    "  letter-spacing:.05em;color:#9a96a6;text-align:right;}" +
    ".rs-zoom .rs-n{color:#f4f1ea;font-size:15px;font-weight:700;font-family:\"Bricolage Grotesque\",system-ui,sans-serif;}" +
    ".rs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}" +
    "@media (max-width:520px){.rs-handle{font-size:18px;}.rs-zoom{display:none;}.rs-hint{font-size:10px;}}";

  function injectCSS() {
    if (document.getElementById("rs-style")) return;
    var s = document.createElement("style");
    s.id = "rs-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildDOM(mount, handle, height) {
    injectCSS();
    mount.classList.add("rs-root");
    mount.style.height = height;

    var stage = document.createElement("div");
    stage.className = "rs-stage";
    stage.setAttribute("aria-label",
      "Infinite canvas of Instagram posts. Drag to pan, scroll to zoom, click a tile to open it on Instagram.");
    var world = document.createElement("div");
    world.className = "rs-world";
    stage.appendChild(world);
    mount.appendChild(stage);

    if (handle) {
      var brand = document.createElement("div");
      brand.className = "rs-overlay rs-brand";
      brand.innerHTML =
        '<div class="rs-handle"><span class="rs-dot"></span>' + handle + "</div>" +
        '<div class="rs-sub">reelscape · depth canvas</div>';
      mount.appendChild(brand);
    }

    var zoom = document.createElement("div");
    zoom.className = "rs-overlay rs-zoom";
    zoom.innerHTML = '<span class="rs-n">100</span>%<br>zoom';
    mount.appendChild(zoom);

    var hint = document.createElement("div");
    hint.className = "rs-overlay rs-hint";
    hint.innerHTML = "<b>Drag</b> to roam &nbsp;·&nbsp; <b>scroll</b> to fly in / out &nbsp;·&nbsp; <b>click</b> to open";
    mount.appendChild(hint);

    return { stage: stage, world: world, zoomN: zoom.querySelector(".rs-n") };
  }

  function initReelscape(mount, opts) {
    opts = opts || {};
    var reels = opts.reels;
    var handle = opts.handle || "";
    var height = opts.height || "100vh";
    if (!mount || !reels || reels.length === 0) return;

    var refs = buildDOM(mount, handle, height);
    var stage = refs.stage, world = refs.world, zoomNode = refs.zoomN;

    var N = reels.length;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

    // deterministic hash with a layer index k -> [0,1)
    function rk(c, r, k, s) {
      var h = (((c + 9999) * 374761393 + (r + 9999) * 668265263 + (k + 4096) * 40503 + s * 2246822519) >>> 0);
      h = (h ^ (h >>> 13)) >>> 0;
      h = (h * 1274126177) >>> 0;
      h = (h ^ (h >>> 16)) >>> 0;
      return h / 4294967296;
    }

    // perspective + repeating depth (endless dolly)
    var FOCAL = 1.7, DPERIOD = 2.15, NEARCULL = 0.17, FARCULL = 4.0, DPAN = 1.6, PANMAG = FOCAL / DPAN;
    var RATIO = 1.46;
    var BASE, CELL;
    function sizes() {
      var w = window.innerWidth;
      BASE = w < 560 ? 120 : w < 1000 ? 145 : 158;
      CELL = BASE * 2.15;
    }
    sizes();

    var camX = -window.innerWidth * 0.06, camY = -window.innerHeight * 0.04;
    var camXT = camX, camYT = camY, camZ = 0, camZT = 0;
    var velX = 0, velY = 0;

    var pool = new Map();
    var key = function (c, r, k) { return c + "|" + r + "|" + k; };

    function makeTile(c, r, k) {
      var idx = Math.floor(rk(c, r, k, 7) * N);
      var reel = reels[idx];
      var a = document.createElement("a");
      a.className = "rs-tile";
      a.style.width = BASE + "px";
      a.style.height = BASE * RATIO + "px";
      a.style.backgroundImage = 'url("' + reel.cover + '")';
      a.href = reel.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", "Open post " + (idx + 1) + " on Instagram");
      a.innerHTML =
        '<span class="rs-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg></span>';
      a.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
      a._sm = 0.78 + rk(c, r, k, 2) * 0.5;
      a._rot = (rk(c, r, k, 5) - 0.5) * 0.05;
      return a;
    }

    function render() {
      var W = window.innerWidth, H = stage.clientHeight;
      var magMin = FOCAL / FARCULL;
      var halfW = W / 2 / magMin + CELL, halfH = H / 2 / magMin + CELL;
      var c0 = Math.floor((camX - halfW) / CELL), c1 = Math.ceil((camX + halfW) / CELL);
      var r0 = Math.floor((camY - halfH) / CELL), r1 = Math.ceil((camY + halfH) / CELL);
      var need = new Set();
      for (var c = c0; c <= c1; c++) {
        for (var r = r0; r <= r1; r++) {
          var base = rk(c, r, 0, 1) * DPERIOD;
          var kMin = Math.floor((camZ + NEARCULL - base) / DPERIOD);
          var kMax = Math.floor((camZ + FARCULL - base) / DPERIOD);
          for (var k = kMin; k <= kMax; k++) {
            if (rk(c, r, k, 9) < 0.18) continue;
            var dist = base + k * DPERIOD - camZ;
            if (dist < NEARCULL || dist > FARCULL) continue;
            var mag = FOCAL / dist;
            var jx = (rk(c, r, k, 3) - 0.5) * CELL * 0.72;
            var jy = (rk(c, r, k, 4) - 0.5) * CELL * 0.72;
            var cx = c * CELL + jx, cy = r * CELL + jy;
            var sx = (cx - camX) * mag + W / 2, sy = (cy - camY) * mag + H / 2;
            var kk = key(c, r, k);
            var el = pool.get(kk);
            var sm = el ? el._sm : 0.78 + rk(c, r, k, 2) * 0.5;
            var half = BASE * mag * sm * 0.9;
            if (sx < -half || sx > W + half || sy < -half * RATIO || sy > H + half * RATIO) continue;
            need.add(kk);
            if (!el) {
              el = makeTile(c, r, k);
              pool.set(kk, el);
              world.appendChild(el);
            }
            var t = clamp((dist - NEARCULL) / (FARCULL - NEARCULL), 0, 1);
            var fadeNear = clamp((dist - NEARCULL) / 0.45, 0, 1);
            var fadeFar = clamp((FARCULL - dist) / 0.7, 0, 1);
            var op = (1 - 0.5 * t) * Math.min(fadeNear, fadeFar);
            var blur = t > 0.5 ? ((t - 0.5) * 6).toFixed(2) : 0;
            el.style.transform =
              "translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) rotate(" + el._rot +
              "rad) scale(" + (mag * el._sm).toFixed(4) + ") translate(-50%,-50%)";
            el.style.zIndex = Math.round((FARCULL - dist) * 1000);
            el.style.opacity = op.toFixed(3);
            el.style.filter = "brightness(" + (1.2 - 0.55 * t).toFixed(2) + ")" + (blur > 0 ? " blur(" + blur + "px)" : "");
          }
        }
      }
      pool.forEach(function (el, k) {
        if (!need.has(k)) {
          el.remove();
          pool.delete(k);
        }
      });
      if (zoomNode) zoomNode.textContent = Math.round(100 * Math.exp(camZ * 0.62));
    }

    function rebuild() {
      pool.forEach(function (el) { el.remove(); });
      pool.clear();
      sizes();
      render();
    }

    // ---- tap-to-open (pointer capture can eat the native click) ----
    var lastOpen = 0;
    function openReel(url) {
      if (!url) return;
      var now = Date.now();
      if (now - lastOpen < 500) return;
      lastOpen = now;
      var w = null;
      try {
        w = window.open(url, "_blank", "noopener");
      } catch (e) {}
      if (!w) {
        var t = document.createElement("a");
        t.href = url;
        t.target = "_blank";
        t.rel = "noopener noreferrer";
        document.body.appendChild(t);
        t.click();
        t.remove();
      }
    }
    function tileAt(x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest(".rs-tile") : null;
    }

    // ---- drag ----
    var dragging = false, lastX = 0, lastY = 0, moved = false, sX = 0, sY = 0;
    var onDown = function (e) {
      dragging = true;
      moved = false;
      lastX = sX = e.clientX;
      lastY = sY = e.clientY;
      velX = velY = 0;
      stage.classList.add("rs-dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    };
    var onMove = function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camXT -= dx / PANMAG;
      camYT -= dy / PANMAG;
      camX = camXT;
      camY = camYT;
      velX = dx / PANMAG;
      velY = dy / PANMAG;
      if (Math.abs(e.clientX - sX) + Math.abs(e.clientY - sY) > 6) moved = true;
    };
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("rs-dragging");
      try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    var onUp = function (e) {
      var wasTap = !moved;
      endDrag(e);
      if (wasTap) {
        var tile = tileAt(e.clientX, e.clientY);
        if (tile) {
          var u = tile.getAttribute("href");
          if (u) openReel(u);
        }
      }
    };

    // ---- wheel = endless dolly, centered (no drift) ----
    var onWheel = function (e) {
      e.preventDefault();
      camZT -= e.deltaY * 0.001;
    };
    // ---- keyboard ----
    var onKey = function (e) {
      var step = CELL * 0.32;
      if (e.key === "ArrowLeft") camXT -= step;
      else if (e.key === "ArrowRight") camXT += step;
      else if (e.key === "ArrowUp") camYT -= step;
      else if (e.key === "ArrowDown") camYT += step;
      else if (e.key === "+" || e.key === "=") camZT += 0.14;
      else if (e.key === "-" || e.key === "_") camZT -= 0.14;
      else return;
    };

    var interacted = false;
    var markInteract = function () { interacted = true; };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    stage.addEventListener("pointerdown", markInteract, { once: true });
    stage.addEventListener("wheel", markInteract, { once: true });
    window.addEventListener("resize", rebuild);

    // ---- loop: ease scale + cam, inertia, idle drift ----
    var raf = 0, tt = 0;
    function frame() {
      if (!dragging) {
        camXT -= velX; camYT -= velY; velX *= 0.92; velY *= 0.92;
        if (Math.abs(velX) < 0.02) velX = 0;
        if (Math.abs(velY) < 0.02) velY = 0;
        if (!interacted && !reduce) {
          tt += 0.004;
          camZT += 0.0016;
          camXT += Math.cos(tt) * 0.5;
          camYT += Math.sin(tt * 0.8) * 0.4;
        }
      }
      camZ += (camZT - camZ) * 0.13;
      camX += (camXT - camX) * (dragging ? 1 : 0.2);
      camY += (camYT - camY) * (dragging ? 1 : 0.2);
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  window.initReelscape = initReelscape;
})();
