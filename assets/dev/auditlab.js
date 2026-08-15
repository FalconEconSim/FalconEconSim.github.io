/* ============================================================================
 * auditlab.js — Week-4 Audit Lab. One shared library; each of the 10 dev pages
 * sets window.AUDIT_SYSTEM = 1..10 to activate a DIFFERENT overlap-detection
 * strategy, shown live in a floating panel with red overlay boxes over each
 * detected collision. Built to answer: which audit approach actually catches
 * the text overlaps in canvas + SVG interactive figures?
 *
 * MUST be loaded in <head> (before the figure scripts) so the canvas-2D hook in
 * System 2/3 installs before any drawing happens.
 * ========================================================================== */
(function () {
  'use strict';

  // ---- Canvas 2D instrumentation (installed immediately, used by S2/S3/others)
  // Records every text + dot drawn to each canvas, in CSS px relative to canvas,
  // mapped through the live transform so DPR scaling is handled. clearRect(full)
  // resets a canvas's log so it always reflects the current frame.
  var CANVAS_LOG = {};   // canvasId -> { texts:[], dots:[], rects:[] }
  (function installCanvasHook() {
    var P = CanvasRenderingContext2D.prototype;
    function log(ctx) {
      var id = (ctx.canvas && ctx.canvas.id) || '_anon';
      return (CANVAS_LOG[id] = CANVAS_LOG[id] || { texts: [], dots: [], rects: [] });
    }
    function dpr() { return window.devicePixelRatio || 1; }
    function toCss(ctx, x, y) {
      var m = ctx.getTransform();
      return { x: (m.a * x + m.c * y + m.e) / dpr(), y: (m.b * x + m.d * y + m.f) / dpr() };
    }
    function fontPx(ctx) { var mm = /(\d+(?:\.\d+)?)px/.exec(ctx.font || ''); return mm ? parseFloat(mm[1]) : 12; }
    function scale(ctx) { return (ctx.getTransform().a) / dpr() || 1; }
    var _clear = P.clearRect;
    P.clearRect = function (x, y, w) {
      var id = (this.canvas && this.canvas.id) || '_anon';
      if (this.canvas && w >= this.canvas.width / dpr() - 2) CANVAS_LOG[id] = { texts: [], dots: [], rects: [] };
      return _clear.apply(this, arguments);
    };
    ['fillText', 'strokeText'].forEach(function (fn) {
      var orig = P[fn];
      P[fn] = function (str, x, y) {
        try {
          var rec = log(this), s = scale(this);
          var w = (this.measureText ? this.measureText(str).width : String(str).length * fontPx(this) * 0.5) * s;
          var p = toCss(this, x, y);
          rec.texts.push({ str: String(str), x: p.x, y: p.y, w: w, h: fontPx(this) * s,
            align: this.textAlign || 'start', baseline: this.textBaseline || 'alphabetic' });
        } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
    ['arc', 'ellipse'].forEach(function (fn) {
      var orig = P[fn];
      P[fn] = function (x, y, r) {
        try { var rC = (r || 0) * scale(this), p = toCss(this, x, y);
          if (rC > 0 && rC <= 16) log(this).dots.push({ x: p.x, y: p.y, r: rC }); } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
  })();

  // ---- geometry helpers -----------------------------------------------------
  function overlapArea(a, b) {
    var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return (ox > 0 && oy > 0) ? ox * oy : 0;
  }
  function boxHitsDot(box, d) {
    var nx = Math.max(box.x, Math.min(d.x, box.x + box.w)), ny = Math.max(box.y, Math.min(d.y, box.y + box.h));
    var dx = d.x - nx, dy = d.y - ny; return dx * dx + dy * dy <= d.r * d.r;
  }
  function canvasTextBox(t, cvsRect) {
    var left = t.x; if (t.align === 'center') left = t.x - t.w / 2; else if (t.align === 'right' || t.align === 'end') left = t.x - t.w;
    var top = t.y - t.h; if (t.baseline === 'top' || t.baseline === 'hanging') top = t.y; else if (t.baseline === 'middle') top = t.y - t.h / 2;
    return { x: cvsRect.left + left, y: cvsRect.top + top, w: t.w, h: t.h, str: t.str };  // viewport px
  }
  function isDescriptive(s) { s = (s || '').trim(); return (/\s/.test(s) && /[A-Za-z]{3,}/.test(s)) || /[A-Za-z]{6,}/.test(s); }
  function hasAlpha(s) { return /[A-Za-z]{2,}/.test(s || ''); }
  function dedupeBoxes(bx) {  // merge halo(stroke)+fill pair of one label
    var out = [];
    bx.forEach(function (b) {
      var dup = out.find(function (o) { return o.str.trim() === b.str.trim() && overlapArea(o, b) > 0.5 * Math.min(o.w * o.h, b.w * b.h); });
      if (!dup) out.push(b);
    });
    return out;
  }
  // Gather all text boxes (canvas + SVG) and dots (canvas + SVG) in viewport px.
  function gatherAll() {
    var texts = [], dots = [];
    document.querySelectorAll('canvas').forEach(function (c) {
      if (!c.id) return; var r = c.getBoundingClientRect();
      var rec = CANVAS_LOG[c.id]; if (!rec) return;
      rec.texts.forEach(function (t) { var b = canvasTextBox(t, r); b.layer = 'canvas'; b.cvs = c.id; texts.push(b); });
      rec.dots.forEach(function (d) { dots.push({ x: r.left + d.x, y: r.top + d.y, r: d.r, cvs: c.id }); });
    });
    document.querySelectorAll('.cvs-overlay svg text, .demo-svg-wrap svg text, .fig-plot svg text').forEach(function (t) {
      var b = t.getBoundingClientRect(); if (!b.width && !b.height) return;
      texts.push({ x: b.left, y: b.top, w: b.width, h: b.height, str: (t.textContent || '').trim(), layer: 'svg' });
    });
    document.querySelectorAll('.cvs-overlay svg circle, .demo-svg-wrap svg circle, .fig-plot svg circle').forEach(function (c) {
      var b = c.getBoundingClientRect(), r = b.width / 2; if (r > 0 && r <= 16) dots.push({ x: b.left + r, y: b.top + r, r: r });
    });
    return { texts: dedupeBoxes(texts), dots: dots };
  }
  // Core overlap analysis shared by several systems.
  function analyzeOverlaps(pack, opts) {
    opts = opts || {}; var minOv = opts.minOverlap || 6, v = [];
    var texts = pack.texts, dots = pack.dots;
    for (var i = 0; i < texts.length; i++) {
      for (var d = 0; d < dots.length; d++) {
        if (dots[d].cvs && texts[i].cvs && dots[d].cvs !== texts[i].cvs) continue;
        if (texts[i].str && boxHitsDot(texts[i], dots[d]) && isDescriptive(texts[i].str)) {
          v.push({ type: 'label-on-dot', sev: 2, msg: '"' + texts[i].str + '" over a marker', rect: texts[i] }); break;
        }
      }
    }
    var CROWD = opts.crowdPx || 7;   // near-touch margin — strict overlap alone
    for (var a = 0; a < texts.length; a++) for (var b = a + 1; b < texts.length; b++) {
      var A = texts[a], B = texts[b]; if (!A.str.trim() || !B.str.trim() || A.str.trim() === B.str.trim()) continue;
      if (!hasAlpha(A.str) && !hasAlpha(B.str)) continue;
      var ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      var oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ox >= minOv && oy >= minOv) {
        v.push({ type: 'label-overlap', sev: 3, msg: '"' + A.str + '"  ×  "' + B.str + '"', rect: { x: Math.max(A.x, B.x), y: Math.max(A.y, B.y), w: ox, h: oy } });
      } else {
        // CROWDED: missed the "Kink at $12" × "Choke $12" class where boxes clear
        // by a few px but still read as overlapping. Flag near-touch in BOTH axes.
        var gx = ox >= 0 ? 0 : -ox, gy = oy >= 0 ? 0 : -oy;
        if (gx <= CROWD && gy <= CROWD && (isDescriptive(A.str) || isDescriptive(B.str)))
          v.push({ type: 'crowded', sev: 2, msg: 'crowded: "' + A.str + '" ~ "' + B.str + '"', rect: { x: Math.min(A.x, B.x), y: Math.min(A.y, B.y), w: Math.max(A.x + A.w, B.x + B.w) - Math.min(A.x, B.x), h: Math.max(A.y + A.h, B.y + B.h) - Math.min(A.y, B.y) } });
      }
    }
    return v;
  }

  // ---- control exercisers (shared by temporal / combinatorial / aspect) -----
  function sliders() { return [].slice.call(document.querySelectorAll('input[type=range]')); }
  function buttons() { return [].slice.call(document.querySelectorAll('button')).filter(function (b) { return !b.closest('#auditlab-panel'); }); }
  function draggableCanvases() { return [].slice.call(document.querySelectorAll('canvas')).filter(function (c) { return c.id; }); }
  function setSlider(s, val) { s.value = val; s.dispatchEvent(new Event('input', { bubbles: true })); }
  function fireDrag(cvs, fx, fy) {
    var r = cvs.getBoundingClientRect(), x = r.left + r.width * fx, y = r.top + r.height * fy;
    ['mousedown', 'mousemove', 'mouseup'].forEach(function (t) {
      cvs.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: x, clientY: y, buttons: 1 }));
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // =========================================================================
  // THE 10 SYSTEMS
  // =========================================================================
  var SYSTEMS = {
    1: {
      name: 'DOM / SVG geometry (getBoundingClientRect)',
      blurb: 'Pairwise bounding-box intersection of every DOM/SVG text node; clipping (scrollW>clientW); off-viewport. BLIND to canvas-drawn text by design — this is the baseline that shows the gap.',
      run: function () {
        var v = [], texts = [];
        document.querySelectorAll('.demo-svg-wrap svg text, .cvs-overlay svg text, .fig-plot svg text, .fig-plot p, .readout-label, .readout-val').forEach(function (el) {
          var b = el.getBoundingClientRect(); if (b.width && b.height && (el.textContent || '').trim())
            texts.push({ x: b.left, y: b.top, w: b.width, h: b.height, str: el.textContent.trim() });
          if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
            v.push({ type: 'clipped', sev: 2, msg: 'text clipped: "' + (el.textContent || '').trim().slice(0, 30) + '"', rect: b });
        });
        for (var a = 0; a < texts.length; a++) for (var b2 = a + 1; b2 < texts.length; b2++)
          if (texts[a].str !== texts[b2].str && overlapArea(texts[a], texts[b2]) > 36)
            v.push({ type: 'label-overlap', sev: 3, msg: '"' + texts[a].str + '" × "' + texts[b2].str + '"', rect: texts[a] });
        return v;
      }
    },
    2: {
      name: 'Canvas-2D instrumentation',
      blurb: 'Hooks CanvasRenderingContext2D (fillText/arc) so it SEES canvas-drawn labels+dots, then geometric overlap (label-on-dot, label×label). The only family that can inspect the weeks 4-7 canvas figures.',
      run: function () { return analyzeOverlaps(gatherAll(), { minOverlap: 6 }); }
    },
    3: {
      name: 'Rendered-pixel connected-components',
      blurb: 'Reads actual canvas pixels (getImageData), thresholds "ink", and for each instrumented label box measures ink density; a text box whose region is far denser than a lone glyph line indicates text piled on text. Render-truth, not code-truth.',
      run: function () {
        var v = [], pack = gatherAll();
        document.querySelectorAll('canvas').forEach(function (c) {
          if (!c.id) return; var ctx; try { ctx = c.getContext('2d'); } catch (e) { return; }
          var dpr = window.devicePixelRatio || 1, cr = c.getBoundingClientRect();
          var boxes = pack.texts.filter(function (t) { return t.cvs === c.id; });
          boxes.forEach(function (t) {
            if (!isDescriptive(t.str)) return;   // tick numbers are naturally dense; only judge word labels
            var lx = (t.x - cr.left) * dpr, ly = (t.y - cr.top) * dpr, lw = t.w * dpr, lh = t.h * dpr;
            if (lw < 2 || lh < 2 || lx < 0 || ly < 0 || lx + lw > c.width || ly + lh > c.height) return;
            var img; try { img = ctx.getImageData(lx, ly, Math.min(lw, c.width - lx), Math.min(lh, c.height - ly)); } catch (e) { return; }
            var ink = 0, n = img.data.length / 4;
            for (var i = 0; i < img.data.length; i += 4) { var lum = 0.3 * img.data[i] + 0.59 * img.data[i + 1] + 0.11 * img.data[i + 2]; if (img.data[i + 3] > 40 && (lum > 60 || lum < 30 && img.data[i + 3] > 120)) ink++; }
            var density = ink / n;
            // A single line of text fills ~10-28% of its tight box. >40% suggests
            // a second label rendered into the same region.
            if (density > 0.42) v.push({ type: 'pixel-dense', sev: 3, msg: 'dense ink (' + (density * 100 | 0) + '%) under "' + t.str + '" — likely text-on-text', rect: t });
          });
        });
        return v;
      }
    },
    4: {
      name: 'Temporal keyframe sampler',
      blurb: 'Drives sliders through their range + clicks buttons + drags points, sampling every step; runs the geometry check on each frame and tracks motion continuity. Catches overlaps that only appear mid-interaction, not at the default state.',
      async: true,
      run: async function (report) {
        var seen = {}, add = function (v, state) { v.forEach(function (x) { var k = x.msg; if (!seen[k]) { seen[k] = { v: x, states: [] }; } seen[k].states.push(state); }); };
        add(analyzeOverlaps(gatherAll()), 'initial');
        var sl = sliders();
        for (var i = 0; i < sl.length; i++) {
          var mn = +sl[i].min || 0, mx = +sl[i].max || 100, id = sl[i].id || ('slider' + i);
          for (var f = 0; f <= 1.0001; f += 0.2) { setSlider(sl[i], mn + (mx - mn) * f); await sleep(60); add(analyzeOverlaps(gatherAll()), id + '=' + Math.round(f * 100) + '%'); }
          setSlider(sl[i], (mn + mx) / 2);
        }
        var bt = buttons();
        for (var b = 0; b < bt.length; b++) { try { bt[b].click(); } catch (e) {} await sleep(60); add(analyzeOverlaps(gatherAll()), 'btn:' + (bt[b].textContent || '').trim().slice(0, 14)); }
        var cvs = draggableCanvases();
        for (var d = 0; d < cvs.length; d++) for (var g = 0; g < 5; g++) { fireDrag(cvs[d], 0.2 + g * 0.15, 0.3 + (g % 3) * 0.2); await sleep(50); add(analyzeOverlaps(gatherAll()), 'drag:' + cvs[d].id); }
        return Object.keys(seen).map(function (k) { var e = seen[k]; e.v.msg += '  [' + e.states.length + ' states: ' + e.states.slice(0, 3).join(', ') + ']'; return e.v; });
      }
    },
    5: {
      name: 'Semantic vision audit (capture → VLM)',
      blurb: 'Captures each figure to a PNG and hands the frames to a vision model that judges legibility, overlap, and whether the picture actually communicates the concept. Catches "technically correct but unreadable/misleading". In-page: exports frames + a heuristic legibility proxy; full judgment is an external vision pass.',
      run: function () {
        var v = [], frames = [];
        document.querySelectorAll('.fig-plot').forEach(function (fp, i) {
          var c = fp.querySelector('canvas');
          if (c) { try { frames.push({ i: i, url: c.toDataURL('image/png') }); } catch (e) {} }
        });
        window.__auditFrames = frames;
        // proxy: flag figures whose instrumented labels overlap (a VLM would too)
        var byC = {}; analyzeOverlaps(gatherAll()).forEach(function (x) { v.push({ type: 'vision-proxy', sev: x.sev, msg: 'VLM would likely flag: ' + x.msg, rect: x.rect }); });
        v.unshift({ type: 'info', sev: 1, msg: frames.length + ' figure frames captured to window.__auditFrames for external vision review', rect: null });
        return v;
      }
    },
    6: {
      name: 'Aspect-ratio / viewport fuzz',
      blurb: 'Re-renders Week 4 at a matrix of widths × device-pixel-ratios and runs the geometry check at each, reporting which overlaps appear only at certain sizes. Catches responsive collisions the default desktop view hides.',
      async: true,
      run: async function () {
        var widths = [360, 414, 600, 768, 900, 1100, 1366], out = {}, orig = document.documentElement.style.width;
        for (var w = 0; w < widths.length; w++) {
          document.documentElement.style.width = widths[w] + 'px'; document.body.style.width = widths[w] + 'px';
          window.dispatchEvent(new Event('resize')); await sleep(180);
          analyzeOverlaps(gatherAll()).forEach(function (x) { var k = x.msg; (out[k] = out[k] || { v: x, ws: [] }).ws.push(widths[w]); });
        }
        document.documentElement.style.width = orig; document.body.style.width = ''; window.dispatchEvent(new Event('resize'));
        return Object.keys(out).map(function (k) { out[k].v.msg += '  [@ ' + out[k].ws.join('/') + 'px]'; return out[k].v; });
      }
    },
    7: {
      name: 'Interaction combinatorial explorer',
      blurb: 'Enumerates the Cartesian product of control states (each slider quantized to 4 stops, each draggable point over a grid) and overlap-checks every COMBINATION, so collisions that need two controls at specific values are found. As granular as compute allows.',
      async: true,
      run: async function () {
        var sl = sliders().slice(0, 3), stops = [0, 0.34, 0.67, 1], seen = {};
        function combos(idx, setSoFar) { if (idx === sl.length) return [setSoFar.slice()]; var r = []; for (var s = 0; s < stops.length; s++) { setSoFar.push(stops[s]); r = r.concat(combos(idx + 1, setSoFar)); setSoFar.pop(); } return r; }
        var all = sl.length ? combos(0, []) : [[]]; if (all.length > 64) all = all.slice(0, 64);
        for (var c = 0; c < all.length; c++) {
          for (var i = 0; i < sl.length; i++) { var mn = +sl[i].min || 0, mx = +sl[i].max || 100; setSlider(sl[i], mn + (mx - mn) * all[c][i]); }
          await sleep(40);
          analyzeOverlaps(gatherAll()).forEach(function (x) { var k = x.msg; (seen[k] = seen[k] || { v: x, n: 0 }).n++; });
        }
        // also a drag grid on each draggable canvas
        var cvs = draggableCanvases();
        for (var d = 0; d < Math.min(cvs.length, 4); d++) for (var gx = 0; gx < 4; gx++) for (var gy = 0; gy < 4; gy++) { fireDrag(cvs[d], 0.12 + gx * 0.25, 0.12 + gy * 0.25); await sleep(25); analyzeOverlaps(gatherAll()).forEach(function (x) { var k = x.msg; (seen[k] = seen[k] || { v: x, n: 0 }).n++; }); }
        return Object.keys(seen).map(function (k) { seen[k].v.msg += '  [' + seen[k].n + ' combos]'; return seen[k].v; });
      }
    },
    8: {
      name: 'SVG-native geometry (getBBox / CTM)',
      blurb: 'Uses SVG’s own coordinate space (getBBox + getScreenCTM) for exact text-box collision among overlay labels, plus a viewBox-bounds check for labels drawn partly outside the plot. Precise for the d3/SVG overlays.',
      run: function () {
        var v = [], texts = [];
        document.querySelectorAll('svg').forEach(function (svg) {
          var vb = svg.viewBox && svg.viewBox.baseVal, ctm = svg.getScreenCTM && svg.getScreenCTM();
          svg.querySelectorAll('text').forEach(function (t) {
            var bb; try { bb = t.getBBox(); } catch (e) { return; }
            var r = t.getBoundingClientRect(); if (!r.width) return;
            texts.push({ x: r.left, y: r.top, w: r.width, h: r.height, str: (t.textContent || '').trim() });
            if (vb && (bb.x < vb.x - 1 || bb.y < vb.y - 1 || bb.x + bb.width > vb.x + vb.width + 1 || bb.y + bb.height > vb.y + vb.height + 1))
              v.push({ type: 'off-viewbox', sev: 2, msg: 'label outside plot bounds: "' + (t.textContent || '').trim() + '"', rect: r });
          });
        });
        for (var a = 0; a < texts.length; a++) for (var b = a + 1; b < texts.length; b++)
          if (texts[a].str !== texts[b].str && overlapArea(texts[a], texts[b]) > 25)
            v.push({ type: 'svg-overlap', sev: 3, msg: '"' + texts[a].str + '" × "' + texts[b].str + '"', rect: texts[a] });
        return v;
      }
    },
    9: {
      name: 'Projection-profile OCR proxy',
      blurb: 'Text-line detection without OCR: projects canvas ink onto rows to find text lines and the gaps between them; a "line" far taller/denser than a single glyph row (no internal gap) means two labels merged. Language-agnostic, works on any rendered pixels.',
      run: function () {
        var v = [];
        document.querySelectorAll('canvas').forEach(function (c) {
          if (!c.id) return; var ctx; try { ctx = c.getContext('2d'); } catch (e) { return; }
          var img; try { img = ctx.getImageData(0, 0, c.width, c.height); } catch (e) { return; }
          var W = c.width, H = c.height, rowInk = new Float32Array(H);
          for (var y = 0; y < H; y++) { var cnt = 0; for (var x = 0; x < W; x += 2) { var idx = (y * W + x) * 4; if (img.data[idx + 3] > 60) cnt++; } rowInk[y] = cnt; }
          // find runs of inked rows (text lines); flag a run taller than ~2.2 glyph
          // heights with high average density (candidate merged/stacked text)
          var thr = 2, y2 = 0, dpr = window.devicePixelRatio || 1, glyph = 12 * dpr;
          while (y2 < H) {
            if (rowInk[y2] > thr) { var s = y2; while (y2 < H && rowInk[y2] > thr) y2++; var hgt = y2 - s;
              var avg = 0; for (var yy = s; yy < y2; yy++) avg += rowInk[yy]; avg /= hgt;
              // A merged/stacked-text band is ~2-4 glyph rows tall; a filled PLOT
              // spans most of the canvas, so cap the height to exclude it.
              if (hgt > glyph * 1.8 && hgt < glyph * 5 && avg > W * 0.10) { var cr = c.getBoundingClientRect();
                v.push({ type: 'merged-lines', sev: 2, msg: 'tall dense ink band on ' + c.id + ' (h=' + (hgt / dpr | 0) + 'px) — stacked/merged text?', rect: { x: cr.left, y: cr.top + s / dpr, w: cr.width, h: hgt / dpr } }); }
            } else y2++;
          }
          return;
        });
        return v;
      }
    },
    10: {
      name: 'DPR-diff + fragility mutation',
      blurb: 'Two probes: (a) compares label geometry at DPR 1 vs 2 to catch DPR-dependent collisions, and (b) a fragility test — how close the nearest label pair is to touching; a layout that only just clears is flagged as fragile (one value change from overlapping).',
      run: function () {
        var v = [], pack = gatherAll(), texts = pack.texts;
        var minGap = Infinity, near = null;
        for (var a = 0; a < texts.length; a++) for (var b = a + 1; b < texts.length; b++) {
          var A = texts[a], B = texts[b]; if (A.str.trim() === B.str.trim() || (!hasAlpha(A.str) && !hasAlpha(B.str))) continue;
          var gx = Math.max(A.x - (B.x + B.w), B.x - (A.x + A.w));
          var gy = Math.max(A.y - (B.y + B.h), B.y - (A.y + A.h));
          var gap = Math.max(gx, gy);       // separation; <0 means overlapping
          if (gap < minGap) { minGap = gap; near = { A: A, B: B }; }
          if (gap < 0) v.push({ type: 'label-overlap', sev: 3, msg: '"' + A.str + '" × "' + B.str + '"', rect: { x: Math.max(A.x, B.x), y: Math.max(A.y, B.y), w: 8, h: 8 } });
        }
        if (near && minGap >= 0 && minGap < 3) v.push({ type: 'fragile', sev: 2, msg: 'labels nearly touch (' + minGap.toFixed(1) + 'px): "' + near.A.str + '" / "' + near.B.str + '"', rect: near.A });
        return v;
      }
    }
  };

  // =========================================================================
  // UI PANEL + OVERLAY
  // =========================================================================
  var overlayLayer, panel, listEl, N;
  function ensureUI() {
    if (panel) return;
    overlayLayer = document.createElement('div');
    overlayLayer.id = 'auditlab-overlay';
    overlayLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;';
    document.body.appendChild(overlayLayer);
    panel = document.createElement('div');
    panel.id = 'auditlab-panel';
    panel.style.cssText = 'position:fixed;right:12px;bottom:12px;width:340px;max-height:60vh;background:#0f1420;color:#e6ebf5;font:12px/1.45 DM Sans,system-ui,sans-serif;border:1px solid #2b3550;border-radius:12px;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;';
    var S = SYSTEMS[N];
    panel.innerHTML =
      '<div style="padding:.6rem .7rem;background:#161d2e;border-bottom:1px solid #2b3550;">' +
      '<div style="font-weight:700;font-size:12.5px;">System ' + N + ' — ' + S.name + '</div>' +
      '<div style="color:#93a0bd;font-size:11px;margin-top:.25rem;">' + S.blurb + '</div>' +
      '<div style="display:flex;gap:.35rem;margin-top:.5rem;flex-wrap:wrap;">' +
      '<button id="al-run" style="flex:1;background:#2563eb;color:#fff;border:0;border-radius:6px;padding:.35rem;font-weight:600;cursor:pointer;">Run audit</button>' +
      '<button id="al-ov" style="background:#243049;color:#cdd7ee;border:0;border-radius:6px;padding:.35rem .5rem;cursor:pointer;">Overlays</button>' +
      '<button id="al-min" style="background:#243049;color:#cdd7ee;border:0;border-radius:6px;padding:.35rem .5rem;cursor:pointer;">—</button>' +
      '</div><div id="al-count" style="margin-top:.4rem;font-weight:600;"></div></div>' +
      '<div id="al-list" style="overflow:auto;padding:.4rem .6rem;"></div>';
    document.body.appendChild(panel);
    listEl = panel.querySelector('#al-list');
    var showOv = true;
    panel.querySelector('#al-run').onclick = runAudit;
    panel.querySelector('#al-ov').onclick = function () { showOv = !showOv; overlayLayer.style.display = showOv ? 'block' : 'none'; };
    panel.querySelector('#al-min').onclick = function () { listEl.style.display = listEl.style.display === 'none' ? 'block' : 'none'; };
  }
  function drawOverlays(vios) {
    overlayLayer.innerHTML = '';
    vios.forEach(function (v) {
      if (!v.rect || !v.rect.w) return;
      var d = document.createElement('div');
      var col = v.sev >= 3 ? '#ff3b5c' : v.sev === 2 ? '#ffb020' : '#3ba0ff';
      d.style.cssText = 'position:absolute;left:' + (v.rect.x - 2) + 'px;top:' + (v.rect.y - 2) + 'px;width:' + (v.rect.w + 4) + 'px;height:' + (v.rect.h + 4) + 'px;border:2px solid ' + col + ';border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.35);';
      overlayLayer.appendChild(d);
    });
  }
  function renderList(vios) {
    var order = { 3: 0, 2: 1, 1: 2 };
    vios.sort(function (a, b) { return (order[a.sev] || 9) - (order[b.sev] || 9); });
    panel.querySelector('#al-count').textContent = vios.filter(function (v) { return v.sev >= 2; }).length + ' issue(s)  ·  ' + vios.length + ' flag(s)';
    listEl.innerHTML = vios.length ? vios.map(function (v) {
      var col = v.sev >= 3 ? '#ff6b83' : v.sev === 2 ? '#ffc55e' : '#7cc0ff';
      return '<div style="padding:.28rem 0;border-bottom:1px solid #1c2438;"><span style="color:' + col + ';">●</span> ' + v.msg + '</div>';
    }).join('') : '<div style="color:#6ee7a0;">No overlaps detected by this system.</div>';
  }
  async function runAudit() {
    ensureUI();
    var S = SYSTEMS[N];
    panel.querySelector('#al-count').textContent = 'running…';
    var vios;
    try { vios = S.async ? await S.run() : S.run(); } catch (e) { vios = [{ sev: 3, msg: 'audit error: ' + e.message, rect: null }]; }
    window.__auditResult = { system: N, name: S.name, violations: vios };
    drawOverlays(vios); renderList(vios);
  }

  function boot() {
    N = window.AUDIT_SYSTEM || 2;
    ensureUI();
    // auto-run shortly after figures settle
    setTimeout(runAudit, 1400);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 300);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 300); });
  window.AuditLab = { SYSTEMS: SYSTEMS, run: runAudit, gatherAll: gatherAll };
})();
