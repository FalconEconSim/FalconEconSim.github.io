/* "Predict, then see" engine (v5).
 * One figure = a spec object (see figs.js) + this engine:
 *   predict  -> the student commits guesses ON the graph (place, drag, draw)
 *   reveal   -> a film-style timeline animates the true answer, the guess stays as a ghost
 *   explore  -> big controls unlock for free play; "Try a new one" draws fresh parameters
 * The whole SVG is a pure function of state and is rebuilt on every change, so a tween is just
 * "change a number, render". Pointer input is captured on the persistent <svg> root and hit-tested
 * here; touches that do not start on a handle (or inside the plot during a place/draw step) are
 * left alone so the page still scrolls.
 */
(function () {
  'use strict';

  var C = {
    blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800',
    purple: '#6b52a8', grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257', plum: '#7a1f5c', paper: '#eff1ee',
    tBlue: '#14568c', tOrange: '#a8431f', tGreen: '#256647', tRed: '#93301f', tGold: '#7d5a00', tPurple: '#5a4590'
  };
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- formatting ---------- */
  function num(v) { var r = Math.round(v * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r.toFixed(1)).toLocaleString('en-US'); }
  function money(v) {
    var r = Math.round(v * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 1e-9) return '$' + Math.round(r).toLocaleString('en-US');
    return '$' + r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- SVG string kit ---------- */
  var K = {
    C: C, num: num, money: money, esc: esc, clamp: clamp, lerp: lerp, ease: ease,
    // clip the data-space segment to [0,X]x[0,Y] (Liang-Barsky) so draw-in progress runs over the visible part
    clipSeg: function (S, x1, y1, x2, y2) {
      var t0 = 0, t1 = 1, dx = x2 - x1, dy = y2 - y1, X = S.X, Y = S.Y;
      var p = [-dx, dx, -dy, dy], q = [x1, X - x1, y1, Y - y1];
      for (var i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return null; }
        else { var r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
      }
      return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
    },
    // a data-space line, clipped, drawn to progress `pr` (0..1)
    line: function (S, x1, y1, x2, y2, o) {
      o = o || {}; var pr = o.pr == null ? 1 : o.pr; if (pr <= 0.001) return '';
      var c = o.noclip ? [x1, y1, x2, y2] : K.clipSeg(S, x1, y1, x2, y2); if (!c) return '';
      var ex = lerp(c[0], c[2], pr), ey = lerp(c[1], c[3], pr);
      return '<line x1="' + S.x(c[0]).toFixed(1) + '" y1="' + S.y(c[1]).toFixed(1) + '" x2="' + S.x(ex).toFixed(1) + '" y2="' + S.y(ey).toFixed(1) +
        '" stroke="' + (o.c || C.ink) + '" stroke-width="' + (o.w || 4.5) + '" stroke-linecap="round"' +
        (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    // pixel-space line
    pline: function (x1, y1, x2, y2, o) {
      o = o || {};
      return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + (o.c || C.ink) + '" stroke-width="' + (o.w || 2) + '" stroke-linecap="' + (o.cap || 'round') + '"' +
        (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    poly: function (S, pts, o) {
      o = o || {};
      if (o.op != null && o.op <= 0.001) return '';
      return '<polygon points="' + pts.map(function (p) { return S.x(p[0]).toFixed(1) + ',' + S.y(p[1]).toFixed(1); }).join(' ') +
        '" fill="' + (o.fill || C.red) + '" fill-opacity="' + (o.fo == null ? 0.25 : o.fo) + '"' +
        (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 2) + '" stroke-linejoin="round"' : '') +
        (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    polyline: function (pts, o) {
      if (pts.length < 2) return '';
      return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + (o.c || C.plum) + '" stroke-width="' + (o.w || 5) + '" stroke-linecap="round" stroke-linejoin="round"' +
        (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    // text in pixel space, with a paper halo so it stays legible over lines
    text: function (x, y, s, o) {
      o = o || {}; if (o.op != null && o.op <= 0.01) return '';
      var size = o.size || 19;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + size + '" font-weight="' + (o.weight || 700) +
        '" fill="' + (o.c || C.ink) + '" text-anchor="' + (o.anchor || 'start') + '"' +
        (o.halo === false ? '' : ' paint-order="stroke" stroke="' + (o.haloC || C.paper) + '" stroke-width="' + (o.hw || 6) + '" stroke-linejoin="round"') +
        (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.cls ? ' class="' + o.cls + '"' : '') + '>' + esc(s) + '</text>';
    },
    // rough width of a label (Libre Franklin bold), used to keep labels inside the frame
    tw: function (s, size) { return String(s).length * (size || 19) * 0.58; },
    dot: function (x, y, o) {
      o = o || {}; var sc = o.pr == null ? 1 : o.pr; if (sc <= 0.01) return '';
      var k = sc < 1 ? 1 + 0.35 * Math.sin(Math.PI * sc) : 1;   // a little overshoot as it lands
      var r = (o.r || 9) * Math.min(1, sc * 1.6) * k;
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (o.c || C.ink) +
        '" stroke="' + (o.ring || '#fff') + '" stroke-width="' + (o.sw || 3) + '"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    ghostDot: function (x, y, o) {
      o = o || {};
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (o.r || 10) + '" fill="' + C.paper + '" fill-opacity="0.6" stroke="' + (o.c || C.plum) +
        '" stroke-width="3" stroke-dasharray="4 3"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    // a draggable knob. `active` adds the breathing ring that says "move me"
    handle: function (x, y, o) {
      o = o || {}; var col = o.c || C.plum, s = '';
      if (o.active) s += '<circle class="breath" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="21" fill="' + col + '" fill-opacity="0.16"/>';
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (o.r || 13) + '" fill="' + col + '" stroke="#fff" stroke-width="3.5"/>';
      if (o.grip === 'v') s += '<path d="M' + (x - 4.5) + ' ' + (y - 2) + 'l4.5 -4.5l4.5 4.5M' + (x - 4.5) + ' ' + (y + 2) + 'l4.5 4.5l4.5 -4.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (o.grip === 'h') s += '<path d="M' + (x - 2) + ' ' + (y - 4.5) + 'l-4.5 4.5l4.5 4.5M' + (x + 2) + ' ' + (y - 4.5) + 'l4.5 4.5l-4.5 4.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      return s;
    },
    arrow: function (x1, y1, x2, y2, o) {
      o = o || {}; var col = o.c || C.gold, w = o.w || 4;
      var a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 3) return '';
      var h = Math.min(13, L * 0.45), bx = x2 - h * Math.cos(a), by = y2 - h * Math.sin(a);
      var p1x = bx + h * 0.6 * Math.sin(a), p1y = by - h * 0.6 * Math.cos(a), p2x = bx - h * 0.6 * Math.sin(a), p2y = by + h * 0.6 * Math.cos(a);
      return K.pline(x1, y1, bx, by, { c: col, w: w, op: o.op }) +
        '<polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' + p1x.toFixed(1) + ',' + p1y.toFixed(1) + ' ' + p2x.toFixed(1) + ',' + p2y.toFixed(1) + '" fill="' + col + '"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + '/>';
    },
    // axes with ticks; y title sits above the axis, x title at the right end below it (film layout)
    axes: function (S, o) {
      o = o || {}; var s = '', i, v, fs = S.narrow ? 15 : 16;
      for (v = 0; v <= S.Y + 1e-9; v += S.ys) {
        var y = S.y(v);
        if (v > 0) s += K.pline(S.x0 - 6, y, S.x0, y, { c: C.soft, w: 2, cap: 'butt' });
        if (v > 0 || o.zeroY) s += K.text(S.x0 - 10, y + 5.5, (o.ymoney === false ? '' : '$') + num(v).replace(/,/g, S.Y >= 10000 ? ',' : ','), { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
      }
      for (v = S.xs; v <= S.X + 1e-9; v += S.xs) {
        var x = S.x(v);
        s += K.pline(x, S.y0, x, S.y0 + 6, { c: C.soft, w: 2, cap: 'butt' });
        s += K.text(x, S.y0 + 25, num(v), { size: fs, weight: 500, c: C.soft, anchor: 'middle', halo: false });
      }
      s += K.pline(S.x0, S.y0, S.x1 + 4, S.y0, { c: C.ink, w: 2.5, cap: 'square' });
      s += K.pline(S.x0, S.y0, S.x0, S.y1 - 4, { c: C.ink, w: 2.5, cap: 'square' });
      s += K.text(4, S.y1 - 18, o.ytitle || '$ per unit', { size: S.narrow ? 16 : 17, weight: 500, c: C.soft, anchor: 'start', halo: false });
      s += K.text(S.x1, S.y0 + 50, o.xtitle || 'Quantity', { size: S.narrow ? 16 : 17, weight: 500, c: C.soft, anchor: 'end', halo: false });
      return s;
    },
    // a label for a value on the x axis, inside the plot just above the axis line
    xlabel: function (S, v, s, o) {
      o = o || {}; var size = S.narrow ? 17 : 19, w = K.tw(s, size), x = S.x(v) + (o.dx || 0), anchor = o.anchor || 'middle';
      var left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
      if (left < S.x0 + 4) { x += S.x0 + 4 - left; }
      if (left + w > S.x1) { x -= left + w - S.x1; }
      if (o.L && (o.op == null || o.op > 0.05)) { var l2 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x; o.L.rect(l2 - 3, S.y0 - 10 - size * 0.8, w + 6, size * 1.05); }
      return K.text(x, S.y0 - 10, s, { size: size, c: o.c || C.ink, anchor: anchor, op: o.op });
    }
  };

  /* ---------- label placer ----------
   * Every curve, dot and placed label registers itself as an obstacle; each label then takes the
   * first candidate position whose box touches nothing and stays in frame (or, failing that, the
   * least-bad one). This keeps labels clear under any randomized parameters. */
  function Placer(S) { this.S = S; this.r = [[0, S.y1 - 40, 190, 30]]; this.p = []; }   // the y-axis title
  Placer.prototype.pline = function (ax, ay, bx, by) {
    var n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 5));
    for (var i = 0; i <= n; i++) this.p.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
  };
  Placer.prototype.line = function (x1, y1, x2, y2) {
    var c = K.clipSeg(this.S, x1, y1, x2, y2), S = this.S; if (!c) return;
    this.pline(S.x(c[0]), S.y(c[1]), S.x(c[2]), S.y(c[3]));
  };
  Placer.prototype.rect = function (x, y, w, h) { this.r.push([x, y, w, h]); };
  Placer.prototype.dot = function (x, y, r) { this.r.push([x - r, y - r, 2 * r, 2 * r]); };
  Placer.prototype.box = function (s, size, c) {
    var w = K.tw(s, size), x = c.anchor === 'end' ? c.x - w : c.anchor === 'middle' ? c.x - w / 2 : c.x;
    return [x - 5, c.y - size * 0.85, w + 10, size * 1.15];
  };
  Placer.prototype.cost = function (b) {
    var S = this.S, n = 0, i;
    if (b[0] < S.x0 + 3 || b[0] + b[2] > S.W - 2 || b[1] < S.y1 - 40 || b[1] + b[3] > S.y0 - 1) n += 1000;
    if (b[0] < S.x0 + 3 && b[1] + b[3] > S.y1) n += 1000;
    for (i = 0; i < this.p.length; i++) { var q = this.p[i]; if (q[0] > b[0] && q[0] < b[0] + b[2] && q[1] > b[1] && q[1] < b[1] + b[3]) n += 3; }
    for (i = 0; i < this.r.length; i++) { var r = this.r[i]; if (r[0] < b[0] + b[2] && r[0] + r[2] > b[0] && r[1] < b[1] + b[3] && r[1] + r[3] > b[1]) n += 400; }
    return n;
  };
  Placer.prototype.text = function (s, cands, o) {
    o = o || {}; var size = o.size || 19, best = null, bk = Infinity;
    for (var i = 0; i < cands.length; i++) {
      var k = this.cost(this.box(s, size, cands[i])) + i * 0.01;
      if (k < bk) { bk = k; best = cands[i]; if (k < 1) break; }
    }
    if (!best) return '';
    // nothing clear among the preferred spots: search outward in rings around the first one
    if (bk >= 1) {
      var c0 = cands[0], found = null;
      for (var rad = 24; rad <= (o.ring || 260) && !found; rad += 18) for (var a = 0; a < 16 && !found; a++) {
        var ang = a * Math.PI / 8, cand = { x: c0.x + rad * Math.cos(ang), y: c0.y + rad * Math.sin(ang), anchor: c0.anchor };
        if (this.cost(this.box(s, size, cand)) < 1) found = cand;
      }
      if (found) best = found;
    }
    var b = this.box(s, size, best); this.rect(b[0], b[1], b[2], b[3]);
    var oo = {}; for (var key in o) oo[key] = o[key]; oo.anchor = best.anchor;
    return K.text(best.x, best.y, s, oo);
  };
  // candidate spots around points on a data-space curve fn(q), at the given q values
  Placer.prototype.along = function (fn, qs, d, pref) {
    var S = this.S, out = []; d = d || 10;
    qs.forEach(function (q) {
      var v = fn(q); if (v == null || v < 0 || v > S.Y || q < 0 || q > S.X) return;
      var px = S.x(q), py = S.y(v);
      var up = [{ x: px + d, y: py - d, anchor: 'start' }, { x: px - d, y: py - d, anchor: 'end' }],
        dn = [{ x: px + d, y: py + d + 15, anchor: 'start' }, { x: px - d, y: py + d + 15, anchor: 'end' }];
      out.push.apply(out, pref === 'below' ? dn.concat(up) : pref === 'aboveOnly' ? up : up.concat(dn));
    });
    return out;
  };
  // candidate spots around a pixel point
  Placer.prototype.around = function (px, py, d) {
    d = d || 18;
    return [{ x: px + d, y: py + 6, anchor: 'start' }, { x: px - d, y: py + 6, anchor: 'end' }, { x: px, y: py - d - 2, anchor: 'middle' },
      { x: px, y: py + d + 16, anchor: 'middle' }, { x: px + d, y: py - d, anchor: 'start' }, { x: px - d, y: py - d, anchor: 'end' },
      { x: px + d, y: py + d + 12, anchor: 'start' }, { x: px - d, y: py + d + 12, anchor: 'end' }];
  };
  K.Placer = Placer;

  /* ---------- tally (per-figure score, kept per viewer) ---------- */
  var STORE = 'ec224-w11-v5-tally';
  function loadTally() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveTally(t) { try { localStorage.setItem(STORE, JSON.stringify(t)); } catch (e) { /* private mode: keep in memory */ } }
  var TALLY = loadTally();

  function tier(score) {
    if (score >= 90) return { head: 'Spot on.', tone: 'great' };
    if (score >= 70) return { head: 'Very close.', tone: 'good' };
    if (score >= 45) return { head: 'Good instinct.', tone: 'ok' };
    return { head: 'Now you know.', tone: 'learn' };
  }
  function encourage(score, t) {
    if (score >= 90) return t.streak >= 2 ? t.streak + ' strong rounds in a row. You have this one.' : 'That is the answer, give or take a hair.';
    if (score >= 70) return 'Close enough that the idea is clearly there.';
    if (score >= 45) return 'The right direction. The picture below shows the last step.';
    return 'Most people miss this one the first time. Try a new one and see if it clicks.';
  }

  /* ---------- the figure ---------- */
  function Figure(spec, root) {
    var f = this;
    f.spec = spec; f.model = spec.model; f.root = root; f.rv = {}; f.ex = {}; f.round = 0;
    f.id = spec.key;
    root.innerHTML =
      '<header class="fig-head">' +
      '<p class="fig-num">Figure ' + spec.num + '<span>' + esc(spec.topic) + '</span></p>' +
      '<h2 class="q" id="q-' + f.id + '">' + esc(spec.question) + '</h2>' +
      '<p class="setup"></p>' +
      '</header>' +
      '<div class="stage"><svg class="plot" tabindex="0" role="application" aria-labelledby="q-' + f.id + '" aria-describedby="sr-' + f.id + '"></svg>' +
      '<p class="sr" id="sr-' + f.id + '" aria-live="polite"></p></div>' +
      '<div class="panel">' +
      '<div class="predict"><ol class="steps"></ol>' +
      '<div class="actions"><button type="button" class="btn reveal" disabled>Reveal the answer</button>' +
      '<button type="button" class="linkish skip">Not sure? Just show me</button></div></div>' +
      '<div class="verdict" hidden></div>' +
      '<div class="explore" hidden></div>' +
      '<div class="again" hidden><button type="button" class="btn ghost newone">Try a new one</button><p class="tally"></p></div>' +
      '</div>';
    f.svg = root.querySelector('svg'); f.stage = root.querySelector('.stage');
    f.$ = function (sel) { return root.querySelector(sel); };
    f.bind();
    f.newRound(false);
    if ('ResizeObserver' in window) new ResizeObserver(function () { f.render(); }).observe(f.stage);
    else window.addEventListener('resize', function () { f.render(); });
  }

  var P = Figure.prototype;

  P.newRound = function (randomize) {
    var f = this, spec = f.spec;
    cancelAnimationFrame(f.raf);
    f.p = randomize ? f.model.random(Math.random, f.p) : f.model.defaults();
    f.p0 = JSON.parse(JSON.stringify(f.p));
    f.sol = f.model.solve(f.p);
    f.dom = f.model.domain(f.p);
    f.g = spec.initGuess(f);
    f.done = spec.steps.map(function () { return false; });
    f.cur = 0; f.mode = 'predict'; f.rv = {}; f.ex = {}; f.result = null; f.round++;
    f.$('.setup').innerHTML = spec.setup(f);
    f.$('.predict').hidden = false; f.$('.verdict').hidden = true; f.$('.explore').hidden = true; f.$('.again').hidden = true;
    f.root.classList.remove('is-explore', 'is-revealing');
    f.updateSteps();
    if (randomize) { f.rv.base = 0; f.play([['base', 0, 900]]); }
    else f.rv.base = f.seen || RM ? 1 : 0;
    f.render();
  };

  P.updateSteps = function () {
    var f = this, spec = f.spec;
    f.$('.steps').innerHTML = spec.steps.map(function (st, i) {
      var state = f.done[i] ? 'done' : i === f.cur ? 'now' : 'later';
      return '<li class="' + state + '"><span class="lbl">' + esc(st.label) + '</span>' +
        (i === f.cur && !f.done[i] ? '<span class="how">' + esc(typeof st.prompt === 'function' ? st.prompt(f) : st.prompt) + '</span>' : '') + '</li>';
    }).join('');
    var all = f.done.every(Boolean);
    var btn = f.$('.reveal'); btn.disabled = !all;
    btn.classList.toggle('ready', all);
    var sr = all ? 'All guesses in. Press Reveal the answer.' : (spec.steps[f.cur] ? 'Step ' + (f.cur + 1) + ': ' + (typeof spec.steps[f.cur].prompt === 'function' ? spec.steps[f.cur].prompt(f) : spec.steps[f.cur].prompt) : '');
    f.$('.sr').textContent = sr + (spec.kbdHint ? ' ' + spec.kbdHint : ' Keyboard: arrow keys move the highlighted handle, Enter places a point.');
  };

  P.completeStep = function (i) {
    var f = this; if (i == null || f.mode !== 'predict') return;
    if (f.spec.steps[i].check && !f.spec.steps[i].check(f)) { f.updateSteps(); return; }
    f.done[i] = true;
    var next = f.done.indexOf(false);
    f.cur = next < 0 ? f.spec.steps.length : next;
    f.updateSteps();
  };

  /* geometry */
  P.layout = function () {
    var f = this, spec = f.spec, W = Math.max(280, Math.round(f.stage.clientWidth));
    var narrow = W < 560;
    var H = narrow ? Math.round(W * 1.02) : Math.round(Math.min(640, Math.max(420, W * 0.74)));
    var m = { l: narrow ? 50 : 66, r: narrow ? 16 : 26, t: 50, b: 62 };
    if (spec.extraBottom) { H += spec.extraBottom; m.b += spec.extraBottom; }
    var d = f.dom;
    var S = {
      W: W, H: H, narrow: narrow, X: d.X, Y: d.Y, xs: d.xs, ys: d.ys,
      x0: m.l, x1: W - m.r, y0: H - m.b, y1: m.t
    };
    S.x = function (v) { return S.x0 + v / S.X * (S.x1 - S.x0); };
    S.y = function (v) { return S.y0 - v / S.Y * (S.y0 - S.y1); };
    S.ix = function (px) { return (px - S.x0) / (S.x1 - S.x0) * S.X; };
    S.iy = function (py) { return (S.y0 - py) / (S.y0 - S.y1) * S.Y; };
    S.fs = narrow ? 18 : 20;           // curve labels
    f.S = S;
    return S;
  };

  P.render = function () {
    var f = this, S = f.layout();
    f.svg.setAttribute('viewBox', '0 0 ' + S.W + ' ' + S.H);
    f.svg.setAttribute('width', S.W); f.svg.setAttribute('height', S.H);
    var clipId = 'clip-' + f.id;
    var body = '<defs><clipPath id="' + clipId + '"><rect x="' + S.x0 + '" y="' + (S.y1 - 2) + '" width="' + (S.x1 - S.x0 + 2) + '" height="' + (S.y0 - S.y1 + 2) + '"/></clipPath></defs>';
    var parts = f.spec.render(f, S);   // {under, curves, over}
    body += '<g clip-path="url(#' + clipId + ')">' + (parts.under || '') + '</g>' + K.axes(S, f.spec.axes ? f.spec.axes(f) : {}) +
      '<g clip-path="url(#' + clipId + ')">' + (parts.curves || '') + '</g>' + (parts.over || '');
    var hs = f.handles();
    hs.forEach(function (h) { body += K.handle(h.x, h.y, { c: h.c, active: h.active && !f.drag, grip: h.grip }); });
    f.svg.innerHTML = body;
    f.root.classList.toggle('dragging', !!f.drag);
    if (f.mode === 'explore' && f.spec.explore && f.spec.explore.readout) {
      var ro = f.$('.ex-readout'); if (ro) ro.innerHTML = f.spec.explore.readout(f);
    }
  };

  P.handles = function () { return (this.spec.handles(this, this.S) || []).filter(Boolean); };

  /* timelines: seq = [[key, startMs, durMs], ...]; values in f.rv go 0 -> 1 */
  P.play = function (seq, done) {
    var f = this;
    cancelAnimationFrame(f.raf);
    if (RM) { seq.forEach(function (s) { f.rv[s[0]] = 1; }); f.render(); if (done) done(); return; }
    var t0 = performance.now(), end = 0;
    seq.forEach(function (s) { end = Math.max(end, s[1] + s[2]); if (f.rv[s[0]] == null) f.rv[s[0]] = 0; });
    function tick(now) {
      var t = now - t0;
      seq.forEach(function (s) { f.rv[s[0]] = ease((t - s[1]) / s[2]); });
      f.render();
      if (t < end) f.raf = requestAnimationFrame(tick); else if (done) done();
    }
    f.raf = requestAnimationFrame(tick);
  };

  /* tween explore values (e.g. a stepper press) so changes glide instead of jumping */
  P.tween = function (obj, key, to, dur, after) {
    var f = this, from = obj[key];
    cancelAnimationFrame(f.traf);
    if (RM || from === to) { obj[key] = to; if (after) after(); f.render(); return; }
    var t0 = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - t0) / (dur || 450));
      obj[key] = lerp(from, to, ease(t)); if (after) after();
      f.render();
      if (t < 1) f.traf = requestAnimationFrame(tick);
    }
    f.traf = requestAnimationFrame(tick);
  };

  P.reveal = function (skipped) {
    var f = this, spec = f.spec;
    if (f.mode !== 'predict') return;
    f.mode = 'revealing'; f.skipped = !!skipped; f.seen = true;
    f.rv.base = 1;   // a reveal mid draw-in must not leave the base curves half drawn
    f.root.classList.add('is-revealing');
    f.$('.predict').hidden = true;
    var res = skipped ? null : f.model.score(f.p, spec.scoreInput ? spec.scoreInput(f) : f.g);
    f.result = res;
    var seq = spec.revealSeq(f);
    f.play(seq, function () { f.finishReveal(); });
  };

  P.finishReveal = function () {
    var f = this, spec = f.spec, res = f.result;
    f.mode = 'explore';
    f.root.classList.remove('is-revealing'); f.root.classList.add('is-explore');
    spec.exInit(f);
    var t = TALLY[f.id] || { played: 0, best: 0, streak: 0 };
    var v = spec.verdict(f);
    var html = '';
    if (res) {
      t.played++; t.best = Math.max(t.best, res.total); t.streak = res.total >= 70 ? t.streak + 1 : 0;
      TALLY[f.id] = t; saveTally(TALLY);
      var tr = tier(res.total);
      html += '<div class="v-top tone-' + tr.tone + '"><p class="v-head">' + tr.head + '</p>' +
        '<p class="v-score"><span class="v-num" data-to="' + res.total + '">0</span><span class="v-of"> of 100</span></p></div>' +
        '<p class="v-cheer">' + encourage(res.total, t) + '</p>';
    } else {
      html += '<div class="v-top tone-learn"><p class="v-head">Here is how it works.</p></div>' +
        '<p class="v-cheer">No score this round. Try a new one when you are ready to guess.</p>';
    }
    if (v.rows && v.rows.length) {
      html += '<table class="v-table"><thead><tr><th></th>' + (res ? '<th>You</th>' : '') + '<th>Answer</th></tr></thead><tbody>' +
        v.rows.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th>' + (res ? '<td class="you">' + r[1] + '</td>' : '') + '<td class="ans">' + r[2] + '</td></tr>'; }).join('') +
        '</tbody></table>';
    }
    html += '<p class="why">' + v.why + '</p>';
    var vd = f.$('.verdict'); vd.innerHTML = html; vd.hidden = false;
    var ex = f.$('.explore');
    ex.innerHTML = '<p class="ex-title">Now play with it</p><p class="ex-hint">' + spec.explore.hint(f) + '</p>' +
      '<div class="ex-controls">' + spec.explore.controls(f) + '</div><p class="ex-readout" aria-live="polite"></p>';
    ex.hidden = false;
    f.$('.again').hidden = false;
    f.$('.tally').innerHTML = t.played ? '<span><b>' + t.played + '</b> ' + (t.played === 1 ? 'round' : 'rounds') + '</span><span>best <b>' + t.best + '</b></span>' +
      (t.streak >= 2 ? '<span><b>' + t.streak + '</b> in a row at 70+</span>' : '') : '';
    f.$('.sr').textContent = (res ? tier(res.total).head + ' ' + res.total + ' of 100. ' : '') + v.why.replace(/<[^>]+>/g, '');
    // count the score up
    var n = vd.querySelector('.v-num');
    if (n) {
      var to = +n.getAttribute('data-to');
      if (RM) n.textContent = to;
      else {
        var t0 = performance.now();
        (function up(now) { var k = Math.min(1, (now - t0) / 700); n.textContent = Math.round(to * ease(k)); if (k < 1) requestAnimationFrame(up); })(t0);
      }
    }
    f.render();
    document.dispatchEvent(new CustomEvent('w11tally'));
  };

  /* ---------- input ---------- */
  P.local = function (e) {
    var r = this.svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (this.S.W / r.width), y: (e.clientY - r.top) * (this.S.H / r.height) };
  };
  P.inPlot = function (pt, pad) {
    var S = this.S; pad = pad || 0;
    return pt.x >= S.x0 - pad && pt.x <= S.x1 + pad && pt.y >= S.y1 - pad && pt.y <= S.y0 + pad;
  };
  // what would a press at pt grab? (shared by pointerdown and the touchstart scroll guard)
  P.target = function (pt, touch) {
    var f = this; if (f.mode === 'revealing') return null;
    var hs = f.handles(), best = null, bd = touch ? 32 : 22;
    hs.forEach(function (h) {
      var d = h.hit ? h.hit(pt) : Math.hypot(pt.x - h.x, pt.y - h.y);
      if (d < bd) { bd = d; best = h; }
    });
    if (best) return { kind: 'handle', h: best };
    if (f.mode === 'predict') {
      var st = f.spec.steps[f.cur];
      if (st && st.kind === 'place' && f.inPlot(pt, 6)) return { kind: 'place', step: f.cur };
      if (st && st.kind === 'draw' && f.inPlot(pt, 6)) return { kind: 'draw', step: f.cur };
      // a finished drawing can be redrawn any time before the reveal
      var di = f.spec.steps.findIndex(function (s) { return s.kind === 'draw'; });
      if (di >= 0 && f.done[di] && f.inPlot(pt, 0)) return { kind: 'draw', step: di };
    }
    return null;
  };

  P.bind = function () {
    var f = this, svg = f.svg;
    svg.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      if (f.target(f.local(e.touches[0]), true)) e.preventDefault();   // ours: no scroll. Otherwise the page scrolls.
    }, { passive: false });
    svg.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      var pt = f.local(e), t = f.target(pt, e.pointerType !== 'mouse');
      if (!t) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      f.drag = t; f.dragId = e.pointerId; f.lastPt = null;
      if (t.kind === 'handle' && t.h.grab) t.h.grab(f, f.S.ix(pt.x), f.S.iy(pt.y));
      f.move(pt);
    });
    svg.addEventListener('pointermove', function (e) {
      if (f.drag && e.pointerId === f.dragId) { e.preventDefault(); f.move(f.local(e)); }
      else if (!f.drag && e.pointerType === 'mouse') {
        var t = f.target(f.local(e), false);
        svg.style.cursor = t ? (t.kind === 'handle' ? 'grab' : 'crosshair') : '';
      }
    });
    function end(e) {
      if (!f.drag || e.pointerId !== f.dragId) return;
      var t = f.drag; f.drag = null;
      var step = t.kind === 'handle' ? t.h.step : t.step;
      if (t.kind === 'draw' && f.spec.drawEnd) f.spec.drawEnd(f);
      if (f.mode === 'predict' && step != null) f.completeStep(step);
      f.render();
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', function (e) { f.key(e); });
    f.$('.reveal').addEventListener('click', function () { f.reveal(false); });
    f.$('.skip').addEventListener('click', function () { f.reveal(true); });
    f.$('.newone').addEventListener('click', function () {
      f.newRound(true);
      var q = f.$('.fig-head'); var r = q.getBoundingClientRect();
      if (r.top < 0) q.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    });
    f.root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || f.mode !== 'explore') return;
      f.ex.touched = true; f.spec.explore.act(f, b.getAttribute('data-act'), b);
    });
    // first time on screen: draw the curves in
    if ('IntersectionObserver' in window && !RM) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && !f.seen) { f.seen = true; io.disconnect(); if (f.rv.base < 1) f.play([['base', 0, 1000]]); }
        });
      }, { threshold: 0.35 });
      io.observe(f.stage);
    } else f.seen = true;
  };

  P.move = function (pt) {
    var f = this, S = f.S, t = f.drag;
    if (f.mode === 'explore') f.ex.touched = true;
    var X = clamp(S.ix(pt.x), 0, S.X), Y = clamp(S.iy(pt.y), 0, S.Y);
    if (t.kind === 'handle') t.h.set(f, X, Y);
    else if (t.kind === 'place') f.spec.steps[t.step].place(f, X, Y);
    else if (t.kind === 'draw') { f.spec.draw(f, X, Y, f.lastPt); f.lastPt = { x: X, y: Y }; }
    f.render();
  };

  P.key = function (e) {
    var f = this, S = f.S, k = e.key;
    if (f.mode === 'revealing') return;
    var dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dy = k === 'ArrowUp' ? 1 : k === 'ArrowDown' ? -1 : 0;
    var big = e.shiftKey ? 5 : 1;
    if (f.mode === 'predict') {
      var st = f.spec.steps[f.cur];
      if (k === 'Enter' && st && st.kind === 'place') { st.place(f, S.X * 0.5, S.Y * 0.5); f.completeStep(f.cur); f.render(); e.preventDefault(); return; }
      if (st && st.kind === 'draw' && (dx || dy || k === 'Enter')) {
        f.spec.keyDraw(f, dy * big); if (k === 'Enter') { f.spec.drawEnd && f.spec.drawEnd(f); f.completeStep(f.cur); }
        f.render(); e.preventDefault(); return;
      }
    }
    if (!dx && !dy && k !== 'Enter') return;
    var hs = f.handles(), h = hs.filter(function (q) { return q.active; })[0] || hs[hs.length - 1];
    if (!h) return;
    e.preventDefault();
    if (k === 'Enter') { if (h.step != null) f.completeStep(h.step); f.render(); return; }
    var nx = h.dx != null ? h.dx : S.ix(h.x), ny = h.dy != null ? h.dy : S.iy(h.y);
    if (f.mode === 'explore') f.ex.touched = true;
    h.set(f, clamp(nx + dx * big * S.X / 100, 0, S.X), clamp(ny + dy * big * S.Y / 100, 0, S.Y));
    if (h.step != null && f.mode === 'predict') f.completeStep(h.step);
    f.render();
  };

  window.Predict = { Figure: Figure, K: K, C: C, tally: function () { return TALLY; } };
})();
