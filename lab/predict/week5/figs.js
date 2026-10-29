/* Week 5 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week5-viz.html: blue is the production relationship (TP, isoquants; lighter blues
 * for the other levels of a map), orange-red the marginal quantity derived from it (MPL, MRTS
 * tangents, isocost lines), dark green the bundle you control in Explore, gold a shift. Plum
 * always means "you". */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg, K = Kit.K;
  var M = window.W5, PLUM = C.plum;
  var BLUE = C.blue, BLT = C.tBlue, MARG = C.orange, MARGT = C.tOrange, BUN = C.green, BUNT = C.tGreen;
  var MAP = ['#9dc0dc', '#4e93c2', C.blue];
  var AXLK = { xtitle: 'Labor L', ytitle: 'Capital K' };

  function pxs(S) { return { sx: (S.x1 - S.x0) / S.X, sy: (S.y0 - S.y1) / S.Y }; }
  // nearest point on a data polyline, measured in pixels so steep curves behave
  function nearestOn(S, pts, X, Y) { var k = pxs(S); return G.nearest(X, Y, pts, k.sx, k.sy); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function pt(L, K, dp) { return '(' + num(L, dp == null ? 2 : dp) + ', ' + num(K, dp == null ? 2 : dp) + ')'; }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // a tangent segment through (x, y) with data slope -m, about len px each way
  function tanSeg(S, x, y, m, len) {
    var k = pxs(S), ux = k.sx, uy = m * k.sy, n = Math.hypot(ux, uy), d = (len || 130) / n;
    return [x - d, y + m * d, x + d, y - m * d];
  }
  function exps(v) { return num(v, 2); }
  // "Q = A K^a L^b" as HTML
  function cdHTML(A, a, b) { return 'Q = ' + (A === 1 ? '' : num(A, 2)) + 'K<sup>' + exps(a) + '</sup>L<sup>' + exps(b) + '</sup>'; }
  function rtsName(s) { return s > 1 + 1e-9 ? 'increasing returns to scale' : s < 1 - 1e-9 ? 'decreasing returns to scale' : 'constant returns to scale'; }
  function rtsShort(s) { return s > 1 + 1e-9 ? 'IRS' : s < 1 - 1e-9 ? 'DRS' : 'CRS'; }
  function times(v) { return '&times;' + num(v, 2); }
  var KBD_CURVE = 'Keyboard: arrow keys slide the point along the curve (Shift for bigger steps), Enter confirms and moves to the next step.';

  /* =====================================================================
     5.1  Total product and marginal product (has a film)
     ===================================================================== */
  var TPM = M.product, EXB = 250;
  function tpPts(f) { var X = f.dom.X, out = []; for (var i = 0; i <= 200; i++) { var L = X * i / 200; out.push([L, TPM.TP(f.p, L)]); } return out; }
  function tpHandle(f, get, put, o) {
    var L = get(f), X = f.dom.X;
    return { x: L, y: TPM.TP(f.p, L), c: o.c || PLUM, step: o.step, active: o.active,
      set: function (f, x, y) { put(f, clamp(r1(nearestOn(f.S, tpPts(f), x, y).x), 0.1, X)); },
      key: function (f, dx, dy) { put(f, clamp(r1(L + (dx + dy) * 0.1), 0.1, X)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  // the MPL panel under the TP plot (pixel space, same x scale)
  function mplPanel(f, S) {
    var d = f.dom, top = S.y0 + 86, bot = S.H - 42, lo = Math.floor(d.mlo / d.ms - 1e-9) * d.ms, hi = d.mY;
    return { top: top, bot: bot, lo: lo, hi: hi, y: function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); } };
  }
  function drawPanel(f, S, D, P) {
    var d = f.dom, s = '', fs = S.narrow ? 15 : 16, st = (P.hi - P.lo) / d.ms > (S.narrow ? 5 : 7) ? 2 * d.ms : d.ms;
    for (var v = Math.ceil(P.lo / st - 1e-9) * st; v <= P.hi + 1e-9; v += st) {
      var y = P.y(v);
      s += K.pline(S.x0 - 6, y, S.x0, y, { c: C.soft, w: 2, cap: 'butt' });
      s += K.text(S.x0 - 10, y + 5.5, num(v, 2), { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
      if (Math.abs(v) > 1e-9) s += K.pline(S.x0, y, S.x1, y, { c: C.line, w: 1 });
    }
    for (v = d.xs; v <= d.X + 1e-9; v += d.xs) { var x = S.x(v); s += K.pline(x, P.bot, x, P.bot + 6, { c: C.soft, w: 2, cap: 'butt' }); s += K.text(x, P.bot + 25, num(v, 2), { size: fs, weight: 500, c: C.soft, anchor: 'middle', halo: false }); }
    s += K.pline(S.x0, P.y(0), S.x1 + 4, P.y(0), { c: C.ink, w: 2.5, cap: 'square' });
    s += K.pline(S.x0, P.bot, S.x0, P.top - 4, { c: C.ink, w: 2.5, cap: 'square' });
    s += K.pline(S.x0, P.bot, S.x1, P.bot, { c: C.line, w: 1.5 });
    s += K.text(4, P.top - 16, 'MPL, the slope of TP', { size: S.narrow ? 16 : 17, weight: 600, c: C.soft, anchor: 'start', halo: false });
    D.add('over', s);   // not 'under': that layer is clipped to the TP plot
  }
  function panelCurve(f, S, D, P, fn, o) {
    var X = f.dom.X, pts = [], n = 160, pr = o.pr == null ? 1 : o.pr;
    for (var i = 0; i <= n * pr; i++) { var L = X * i / n, v = fn(L); if (v >= P.lo && v <= P.hi) pts.push([S.x(L), P.y(v)]); }
    if (pts.length > 1) D.add('over', K.polyline(pts, { c: o.c, w: o.w || 4.5, op: o.op, dash: o.dash }));
  }
  function phase(p, s, L) {
    if (L < s.Li - 0.05) return 'MPL rising: each worker adds more than the last';
    if (L <= s.Li + 0.05) return 'MPL at its peak: diminishing returns start here';
    if (L < s.Lz - 0.05) return 'diminishing marginal returns: MPL falling but positive';
    if (L <= s.Lz + 0.05) return 'MPL = 0: total product at its maximum';
    return 'MPL negative: another worker lowers output';
  }
  function tpEq(p) { return 'TP = ' + num(p.a, 2) + 'L² − ' + num(p.b, 2) + 'L³'; }
  var f51 = {
    key: 'f51', num: '5.1', topic: 'Total product and marginal product', short: 'TP and MPL', model: TPM,
    axes: { xtitle: 'Workers L', ytitle: 'Total product TP' }, aspect: 0.5, narrowAspect: 0.92, extraBottom: EXB,
    film: { name: 'fig51-product-curves', label: 'Animation: total, marginal and average product', title: 'Watch first, 46 seconds',
      caption: 'A tangent slides along TP = 1.5L&sup2; &minus; 0.1L&sup3; while its slope traces marginal product below. MPL peaks at L = 5 and then falls; a ray from the origin traces average product, which peaks at L = 7.5 where MPL crosses it.' },
    question: 'Where do diminishing marginal returns set in, and where does one more worker add nothing at all?',
    setup: function (f) {
      var p = f.p;
      return 'Capital is fixed, so output depends only on the number of workers: <b>TP = ' + num(p.a, 2) + 'L<sup>2</sup> &minus; ' + num(p.b, 2) + 'L<sup>3</sup></b>. Marginal product MPL is the slope of TP, the extra output from one more worker. The dashed plum line is the tangent at your point.';
    },
    steps: [
      { kind: 'drag', label: 'Where MPL peaks', prompt: 'Slide the plum point along TP to where the curve is steepest, the point where each extra worker starts adding less.',
        check: function (f) {
          if (Math.abs(f.g.L1 - TPM.start(f.p).L1) < 0.05) return 'Slide it along the curve first.';
          if (f.g.L2 == null) f.g.L2 = Math.abs(TPM.start(f.p).L2 - f.g.L1) < 0.1 * f.dom.X ? r1(f.dom.X * 0.55) : TPM.start(f.p).L2;
          return true;
        } },
      { kind: 'drag', label: 'Where MPL = 0', prompt: 'Now slide the second point to where one more worker adds nothing to output.',
        check: function (f) { return Math.abs(f.g.L2 - f.g.L1) < 0.3 ? 'Pick a different spot from your first point.' : true; } }
    ],
    kbdHint: KBD_CURVE,
    initGuess: function (f) { return { L1: TPM.start(f.p).L1, L2: null }; },
    handles: function (f) {
      if (f.predicting) {
        var h1 = tpHandle(f, function (f) { return f.g.L1; }, function (f, L) { f.g.L1 = L; }, { step: 0, active: f.cur === 0 });
        if (f.g.L2 == null) return [h1];
        var h2 = tpHandle(f, function (f) { return f.g.L2; }, function (f, L) { f.g.L2 = L; }, { step: 1, active: f.cur === 1 });
        return f.cur === 1 ? [h2, h1] : [h1, h2];
      }
      if (f.exploring) return [tpHandle(f, function (f) { return f.ex.L; }, function (f, L) { f.ex.L = L; }, { c: BUN, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, P = mplPanel(f, S), TP = function (L) { return TPM.TP(p, L); }, MPL = function (L) { return TPM.MPL(p, L); };
      drawPanel(f, S, D, P);
      D.fn(TP, 0, f.dom.X, { c: BLUE, w: 5, pr: b });
      if (b > 0.9) D.curveLabel(S.narrow ? 'TP' : tpEq(p), TP, [0.25, 0.18, 0.32], { c: BLT, pref: 'aboveOnly' });
      function guess(L, lab, op) {
        var y = TP(L), t = tanSeg(S, L, y, -MPL(L), S.narrow ? 70 : 110);
        D.line(t[0], t[1], t[2], t[3], { c: PLUM, w: 3, dash: '8 6', op: op * 0.75, layer: 'over' });
        D.add('over', K.pline(S.x(L), P.top, S.x(L), P.bot, { c: PLUM, w: 2.5, dash: '4 6', op: op * 0.6 }));
        if (lab) D.near(L, y, lab, { c: PLUM, d: 22, op: op, ring: 90 });
      }
      if (f.predicting) {
        guess(g.L1, 'L = ' + num(g.L1, 1), 1);
        if (g.L2 != null) guess(g.L2, 'L = ' + num(g.L2, 1), 1);
        D.add('over', K.text((S.x0 + S.x1) / 2, (P.top + P.bot) / 2, 'MPL draws in here when you reveal', { size: S.ss, weight: 600, c: C.mute, anchor: 'middle' }));
        return;
      }
      var mp = f.t('mpl'), pk = f.t('peak'), zr = f.t('zero');
      if (f.ghostOn()) {
        [g.L1, g.L2].forEach(function (L) { if (L == null) return; D.ghost(L, TP(L), { op: f.gOp() }); D.add('over', K.pline(S.x(L), P.top, S.x(L), P.bot, { c: PLUM, w: 2.5, dash: '4 6', op: 0.6 * f.gOp() })); });
        youTag(f, D, g.L1, TP(g.L1));
      }
      if (f.exploring && f.ex.ap) {
        panelCurve(f, S, D, P, function (L) { return L > 0 ? TPM.AP(p, L) : null; }, { c: BUN, w: 4 });
        D.add('over', K.text(S.x(s.La * 1.25 > f.dom.X ? s.La * 0.6 : s.La * 1.25), P.y(TPM.AP(p, s.La * 1.25 > f.dom.X ? s.La * 0.6 : s.La * 1.25)) - 10, 'AP', { size: S.fs, c: BUNT }));
      }
      panelCurve(f, S, D, P, MPL, { c: MARG, pr: mp });
      if (mp > 0.95) D.add('over', K.text(S.x(s.Li * 0.35) + 6, P.y(MPL(s.Li * 0.35)) - 14, 'MPL', { size: S.fs, c: MARGT, anchor: 'end' }));
      if (pk > 0) {
        D.dot(s.Li, s.TPi, { c: C.ink, r: 9, pr: pk });
        D.add('over', K.pline(S.x(s.Li), S.y(s.TPi), S.x(s.Li), P.y(s.MPmax), { c: C.ink, w: 2.5, dash: '6 6', op: 0.7 * pk }));
        D.add('over', K.dot(S.x(s.Li), P.y(s.MPmax), { c: MARG, r: 8, pr: pk }));
        D.add('over', K.text(S.x(s.Li) + 14, P.y(s.MPmax) + 6, 'MPL peak ' + num(s.MPmax, 2), { size: S.ls, c: MARGT, op: pk }));
        D.near(s.Li, s.TPi, S.narrow ? 'steepest: L = ' + num(s.Li, 2) : 'steepest point: L = ' + num(s.Li, 2), { c: C.ink, op: pk, d: 22, prio: 0, ring: 120 });
      }
      if (zr > 0) {
        D.dot(s.Lz, s.TPmax, { c: C.ink, r: 9, pr: zr });
        D.add('over', K.pline(S.x(s.Lz), S.y(s.TPmax), S.x(s.Lz), P.y(0), { c: C.ink, w: 2.5, dash: '6 6', op: 0.7 * zr }));
        D.add('over', K.dot(S.x(s.Lz), P.y(0), { c: MARG, r: 8, pr: zr }));
        D.add('over', K.text(S.x(s.Lz) - 14, P.y(0) - 12, 'MPL = 0', { size: S.ls, c: MARGT, anchor: 'end', op: zr }));
        D.near(s.Lz, s.TPmax, 'TP max ' + num(s.TPmax, 2) + ' at L = ' + num(s.Lz, 2), { c: C.ink, op: zr, d: 22, prio: 0, ring: 120 });
      }
      if (f.exploring) {
        var L = f.ex.L, y = TP(L), m = MPL(L), t = tanSeg(S, L, y, -m, S.narrow ? 80 : 130);
        D.line(t[0], t[1], t[2], t[3], { c: MARG, w: 3.5, dash: '9 6', layer: 'over' });
        D.drop(L, y, { y: false });
        D.add('over', K.pline(S.x(L), P.top, S.x(L), P.bot, { c: C.soft, w: 2, dash: '4 6', op: 0.7 }));
        if (m >= P.lo && m <= P.hi) D.add('over', K.dot(S.x(L), P.y(m), { c: MARG, r: 9 }));
        if (f.ex.ap && L > 0) {
          D.line(0, 0, L * 1.15, y * 1.15, { c: BUN, w: 3, dash: '3 6', layer: 'over' });
          var ap = TPM.AP(p, L); if (ap >= P.lo && ap <= P.hi) D.add('over', K.dot(S.x(L), P.y(ap), { c: BUN, r: 7 }));
        }
        D.near(L, y, 'slope = MPL = ' + num(m, 2), { c: MARGT, d: 22, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['mpl', 300, 1300], ['peak', 1550, 650], ['zero', 2150, 650]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['MPL peaks at L', num(g.L1, 1), num(s.Li, 2)], ['MPL = 0 at L', g.L2 == null ? '' : num(g.L2, 1), num(s.Lz, 2)], ['Output there', g.L2 == null ? '' : num(TPM.TP(p, g.L2), 2), num(s.TPmax, 2)]],
        why: 'MPL is the slope of TP: MPL = ' + num(2 * p.a, 2) + 'L &minus; ' + num(3 * p.b, 2) + 'L<sup>2</sup>. It is highest where TP is steepest, at the bend: ' + num(2 * p.a, 2) + ' &minus; ' + num(6 * p.b, 2) + 'L = 0 gives <b>L = ' + num(s.Li, 2) +
          '</b> (MPL ' + num(s.MPmax, 2) + '). Past that each worker adds less: diminishing marginal returns. MPL reaches zero at <b>L = ' + num(s.Lz, 2) + '</b>, where TP tops out at ' + num(s.TPmax, 2) + '; one more worker would lower output.'
      };
    },
    explore: {
      init: function (f) { f.ex.L = r1(f.sol.Li * 0.6); f.ex.ap = false; },
      hint: 'Drag the green point along TP. The dashed tangent is the slope; its value is the dot on MPL below. Switch on AP to see average product: MPL crosses it at its peak.',
      controls: [{ kind: 'seg', label: 'Curves below', options: [[false, 'MPL'], [true, 'MPL and AP']], get: function (f) { return !!f.ex.ap; }, set: function (f, v) { f.ex.ap = v; } }],
      readout: function (f) {
        var p = f.p, s = f.sol, L = f.ex.L;
        return 'At L = ' + num(L, 1) + ': TP = <b>' + num(TPM.TP(p, L), 2) + '</b>, MPL = <b class="c-orange">' + num(TPM.MPL(p, L), 2) + '</b>' + (f.ex.ap ? ', AP = <b class="c-green">' + num(TPM.AP(p, L), 2) + '</b> (AP peaks at L = ' + num(s.La, 2) + ', where AP = MPL = ' + num(s.APmax, 2) + ')' : '') + '. ' + phase(p, s, L) + '.';
      }
    }
  };

  /* =====================================================================
     5.2  Isoquant explorer: other bundles that make the same output
     ===================================================================== */
  var ISO = M.iso, LVL = { cd: 4, linear: 8, leontief: 3 };
  function isoPts(type, q, X, Y) {
    if (type === 'linear') return [[0, q], [q / 2, 0]];
    if (type === 'leontief') return [[q, Y * 1.3], [q, 2 * q], [X * 1.3, 2 * q]];
    var out = []; for (var i = 0; i <= 200; i++) { var L = q * q / (Y * 1.3) + (X - q * q / (Y * 1.3)) * i / 200; out.push([L, q * q / L]); } return out;
  }
  function techHTML(type, mode) {
    var x = mode === 'ic' ? 'X' : 'L', y = mode === 'ic' ? 'Y' : 'K', q = mode === 'ic' ? 'U' : 'Q';
    if (type === 'cd') return q + ' = ' + x + '<sup>0.5</sup>' + y + '<sup>0.5</sup>';
    if (type === 'linear') return q + ' = 2' + x + ' + ' + y;
    return q + ' = min(' + x + ', ' + y + '/2)';
  }
  function isoMRTS(type, q, L, K) {
    if (type === 'cd') return { v: K / L, t: num(K / L, 2) };
    if (type === 'linear') return { v: 2, t: '2' };
    if (Math.abs(L - q) < 0.05 && Math.abs(K - 2 * q) < 0.1) return { v: NaN, t: 'not defined at the corner' };
    return K > 2 * q ? { v: Infinity, t: 'infinite (capital is in excess)' } : { v: 0, t: '0 (labor is in excess)' };
  }
  function isoWhy(p) {
    var q = p.q, ex = ISO.examples(p), e = ex.map(function (b) { return pt(b[0], b[1]); }).join(' and ');
    if (p.type === 'cd') return 'Output is &radic;(L K), so every bundle with L &times; K = ' + num(q * q) + ' makes Q = ' + q + ': ' + e + ' work as well as A. Together they trace a smooth isoquant bowed toward the origin.';
    if (p.type === 'linear') return 'Q = 2L + K: one worker does the work of two machines, so giving up 2 K for 1 more L keeps output at ' + q + '. Every bundle on the straight line K = ' + q + ' &minus; 2L works, such as ' + e + '.';
    return 'Q = min(L, K/2): each unit of output needs 1 worker and 2 machines. More of one input without the other adds nothing, so the isoquant is L-shaped with its corner at ' + pt(q, 2 * q) + '. Bundles such as ' + e + ' also make ' + q + ', the corner with no input wasted.';
  }
  function placeB(key) { return function (f, X, Y) { f.g[key] = { x: r1(X), y: r1(Y) }; }; }
  function farFrom(a, b) { return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) >= 0.4; }
  var f52 = {
    key: 'f52', num: '5.2', topic: 'Isoquants', short: 'Isoquant explorer', model: ISO,
    axes: function (f) { return f.exploring && f.ex.mode === 'ic' ? { xtitle: 'Good X', ytitle: 'Good Y' } : AXLK; }, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'Bundle A makes Q = ' + f.p.q + '. Find two other bundles that make exactly the same output.'; },
    setup: function (f) {
      var p = f.p;
      return 'The firm\'s technology is <b>' + techHTML(p.type, 'iq') + '</b>' + (p.type === 'cd' ? '' : p.type === 'linear' ? ' (perfect substitutes)' : ' (perfect complements)') + '. Bundle A uses L = ' + num(p.L, 2) + ' workers and K = ' + num(p.K, 2) + ' machines. Every bundle that makes the same output lies on one isoquant.';
    },
    steps: [
      { kind: 'place', key: 'b1', label: 'A second bundle', prompt: 'Tap a bundle that makes the same output as A. Drag it to adjust.', place: placeB('b1'),
        kstart: function (f) { return { x: f.p.L > 5 ? 2 : 7, y: f.p.K > 5 ? 2 : 7 }; },
        check: function (f) { return farFrom(f.g.b1, { x: f.p.L, y: f.p.K }) ? true : 'That is A itself. Pick a different bundle.'; } },
      { kind: 'place', key: 'b2', label: 'A third bundle', prompt: 'Tap one more bundle with the same output.', place: placeB('b2'),
        kstart: function (f) { return { x: f.p.L > 5 ? 3 : 8, y: f.p.K > 5 ? 3 : 8 }; },
        check: function (f) { return farFrom(f.g.b2, { x: f.p.L, y: f.p.K }) && farFrom(f.g.b2, f.g.b1) ? true : 'Pick a bundle different from A and from your first one.'; } }
    ],
    kbdHint: 'Keyboard: Enter drops a point, arrow keys move it, Enter confirms.',
    initGuess: function () { return { b1: null, b2: null }; },
    handles: function (f) {
      if (!f.exploring) return [];
      var p = f.p, pts = isoPts(p.type, p.q, f.dom.X, f.dom.Y), P = f.ex.P;
      return [{ x: P.x, y: P.y, c: BUN, active: true,
        set: function (f, X, Y) { var n = nearestOn(f.S, isoPts(f.p.type, f.p.q, f.dom.X, f.dom.Y), X, Y); f.ex.P = { x: n.x, y: n.y }; },
        key: function (f, dx, dy) {
          var n = nearestOn(f.S, pts, P.x + (dx - dy) * 0.25 * (p.type === 'leontief' && P.y > 2 * p.q + 0.01 ? 0 : 1), P.y + (dy - dx) * 0.25 * (p.type === 'leontief' && P.y <= 2 * p.q + 0.01 && P.x > p.q + 0.01 ? 0 : 1));
          f.ex.P = { x: n.x, y: n.y }; f.ex.touched = true;
        } }];
    },
    render: function (f, S, D) {
      var p = f.p, b = f.base(), g = f.g, ic = f.exploring && f.ex.mode === 'ic', Qn = ic ? 'U' : 'Q';
      var cv = f.t('curve'), ck = f.t('check');
      if (f.exploring) {
        [p.q / 2, p.q, 1.5 * p.q].forEach(function (q, i) {
          var pts = isoPts(p.type, q, S.X, S.Y);
          D.path(pts, { c: MAP[i], w: i === 1 ? 5 : 3.5 });
          D.pathLabel(Qn + ' = ' + num(q, 2), pts, p.type === 'leontief' ? [0.05, 0.15] : [0.06, 0.12, 0.2], { c: i === 1 ? BLT : '#3b6f96', size: S.ss, ring: 80 });
        });
        var P = f.ex.P, mr = isoMRTS(p.type, p.q, P.x, P.y);
        if (p.type === 'cd') { var t = tanSeg(S, P.x, P.y, P.y / P.x, 110); D.line(t[0], t[1], t[2], t[3], { c: MARG, w: 3, dash: '8 6', layer: 'over' }); }
        if (f.ghostOn()) ['b1', 'b2'].forEach(function (k) { if (g[k]) D.ghost(g[k].x, g[k].y, { op: f.gOp() }); });
        D.near(P.x, P.y, (ic ? 'MRS' : 'MRTS') + ' = ' + (isFinite(mr.v) ? mr.t : mr.v === Infinity ? '∞' : 'n/a'), { c: MARGT, d: 24, prio: 0, ring: 100 });
        return;
      }
      if (cv > 0) { var tp = isoPts(p.type, p.q, S.X, S.Y); D.path(tp, { c: BLUE, w: 5, pr: cv }); if (cv > 0.9) D.pathLabel('Q = ' + p.q, tp, p.type === 'leontief' ? [0.05, 0.1] : [0.08, 0.15, 0.9], { c: BLT, ring: 90 }); }
      D.dot(p.L, p.K, { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(p.L, p.K, 'A ' + pt(p.L, p.K, 1), { c: C.ink, d: 20, prio: 0, ring: 90 });
      if (f.predicting) {
        if (g.b1) D.near(g.b1.x, g.b1.y, pt(g.b1.x, g.b1.y, 1), { c: PLUM, d: 22 });
        if (g.b2) D.near(g.b2.x, g.b2.y, pt(g.b2.x, g.b2.y, 1), { c: PLUM, d: 22 });
        return;
      }
      if (f.ghostOn()) ['b1', 'b2'].forEach(function (k) {
        var q = g[k]; if (!q) return;
        D.ghost(q.x, q.y, { op: f.gOp() });
        if (ck > 0) { var Q = ISO.Q(p, q.x, q.y), okk = Math.abs(Q - p.q) / p.q <= 0.04; D.near(q.x, q.y, 'Q = ' + num(Q, 2), { c: okk ? C.tGreen : C.tRed, op: ck, d: 22, ring: 90 }); }
      });
    },
    reveal: function () { return [['ghost', 0, 400], ['curve', 300, 1200], ['check', 1500, 500]]; },
    verdict: function (f) {
      var p = f.p, g = f.g;
      function row(k, n) { var q = g[k]; return [n, q ? pt(q.x, q.y, 1) + ': Q = ' + num(ISO.Q(p, q.x, q.y), 2) : '', 'Q = ' + p.q]; }
      return { rows: [row('b1', 'Second bundle'), row('b2', 'Third bundle')], why: isoWhy(p) };
    },
    explore: {
      init: function (f) { f.ex.mode = 'iq'; f.ex.P = { x: f.p.L, y: f.p.K }; },
      hint: function (f) { return 'Drag the green point along the isoquant and watch its slope. Switch the technology, or read the same picture as a consumer\'s indifference curves.'; },
      controls: [
        { kind: 'seg', label: 'Technology', options: [['cd', 'Cobb-Douglas'], ['linear', 'Substitutes'], ['leontief', 'Complements']], get: function (f) { return f.p.type; },
          set: function (f, v) { f.p.type = v; f.p.q = LVL[v]; var P0 = { cd: [4, 4], linear: [2, 4], leontief: [3, 6] }[v]; f.p.L = P0[0]; f.p.K = P0[1]; f.ex.P = { x: P0[0], y: P0[1] }; } },
        { kind: 'seg', label: 'Read it as', options: [['iq', 'A firm'], ['ic', 'A consumer']], get: function (f) { return f.ex.mode; }, set: function (f, v) { f.ex.mode = v; } }
      ],
      readout: function (f) {
        var p = f.p, P = f.ex.P, ic = f.ex.mode === 'ic', mr = isoMRTS(p.type, p.q, P.x, P.y);
        var who = ic ? 'Indifference curves of ' + techHTML(p.type, 'ic') + ': the same math as the firm\'s isoquants, with utility in place of output.' : 'Isoquants of ' + techHTML(p.type, 'iq') + '.';
        return who + ' At ' + pt(P.x, P.y) + ', ' + (ic ? 'MRS' : 'MRTS') + ' = <b>' + mr.t + '</b>.';
      }
    }
  };

  /* =====================================================================
     5.3  MRTS along the isoquant
     ===================================================================== */
  var MR = M.mrts;
  function mTxt(m) { var r = { '0.111111': '1/9', '0.25': '1/4', '0.444444': '4/9', '2.25': '9/4' }[String(Math.round(m * 1e6) / 1e6)]; return r || num(m, 2); }
  function hypPts(q, X, Y) { var out = [], a = q * q / (Y * 1.2); for (var i = 0; i <= 240; i++) { var L = a + (X - a) * i / 240; out.push([L, q * q / L]); } return out; }
  function hypHandle(f, get, put, o) {
    var L = get(f), q = f.p.q, lo = Math.max(0.3, q * q / f.dom.Y), hi = f.dom.X;
    return { x: L, y: q * q / L, c: o.c || PLUM, step: o.step, active: o.active,
      set: function (f, X, Y) { put(f, clamp(Math.round(nearestOn(f.S, hypPts(q, f.dom.X, f.dom.Y), X, Y).x * 20) / 20, lo, hi)); },
      key: function (f, dx, dy) { put(f, clamp(Math.round((L + (dx - dy) * 0.05) * 20) / 20, lo, hi)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  var f53 = {
    key: 'f53', num: '5.3', topic: 'The marginal rate of technical substitution', short: 'MRTS calculator', model: MR,
    axes: { xtitle: 'Workers L', ytitle: 'Machines K' }, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'Where on this isoquant can one more worker replace ' + mTxt(f.p.m) + ' machine' + (f.p.m === 1 ? '' : 's') + '? That is, where is MRTS = ' + mTxt(f.p.m) + '?'; },
    setup: function (f) {
      var q = f.p.q;
      return 'Output is <b>Q = K<sup>0.5</sup>L<sup>0.5</sup></b>, and the curve is the Q = ' + q + ' isoquant, K = ' + (q * q) + '/L. MRTS = MPL/MPK is how many machines one more worker can replace with output unchanged; on the graph it is the steepness of the isoquant (the dashed tangent).';
    },
    steps: [{ kind: 'drag', label: function (f) { return 'MRTS = ' + mTxt(f.p.m); }, prompt: 'Slide the plum point along the isoquant to where its slope is the one asked for.',
      check: function (f) { return Math.abs(f.g.L - f.sol.L0) > 0.05 ? true : 'Slide it along the curve first.'; } }],
    kbdHint: KBD_CURVE,
    initGuess: function (f) { return { L: f.p.q }; },
    handles: function (f) {
      if (f.predicting) return [hypHandle(f, function (f) { return f.g.L; }, function (f, L) { f.g.L = L; }, { step: 0, active: !f.done[0] })];
      if (f.exploring) return [hypHandle(f, function (f) { return f.ex.L; }, function (f, L) { f.ex.L = L; }, { c: BUN, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, q = p.q, Kf = function (L) { return q * q / L; };
      D.fn(Kf, q * q / (S.Y * 3), S.X, { c: BLUE, w: 5, pr: b });
      if (b > 0.9) D.curveLabel('Q = ' + q, Kf, [0.82, 0.9, 0.7], { c: BLT, pref: 'aboveOnly' });
      function tangent(L, c, op, w, dash) { var t = tanSeg(S, L, Kf(L), Kf(L) / L, S.narrow ? 90 : 140); D.line(t[0], t[1], t[2], t[3], { c: c, w: w || 3, dash: dash || '8 6', op: op, layer: 'over' }); }
      if (f.predicting) {
        tangent(g.L, PLUM, 0.75);
        D.near(g.L, Kf(g.L), 'L = ' + num(g.L, 2) + ', K = ' + num(Kf(g.L), 2), { c: PLUM, d: 22, ring: 100 });
        return;
      }
      var tn = f.t('tan'), pp = f.t('pt'), al = f.t('also');
      if (f.ghostOn()) { D.ghost(g.L, Kf(g.L), { op: f.gOp() }); tangent(g.L, PLUM, 0.45 * f.gOp(), 2.5, '3 6'); youTag(f, D, g.L, Kf(g.L), 'you: MRTS ' + num(Kf(g.L) / g.L, 2)); }
      if (f.exploring) {
        var L = f.ex.L, Kv = Kf(L);
        tangent(L, MARG, 1, 3.5);
        D.drop(L, Kv, {});
        D.near(L, Kv, 'MRTS = K/L = ' + num(Kv / L, 2), { c: MARGT, d: 22, prio: 0, ring: 100 });
        return;
      }
      if (tn > 0) tangent(s.L, MARG, tn, 3.5);
      if (pp > 0) {
        D.drop(s.L, s.K, { pr: pp });
        D.dot(s.L, s.K, { c: C.ink, r: 10, pr: pp });
        D.near(s.L, s.K, 'MRTS = ' + num(s.K, 2) + '/' + num(s.L, 2) + ' = ' + mTxt(p.m), { c: MARGT, op: pp, d: 22, prio: 0, ring: 110 });
      }
      if (al > 0) { D.dot(q, q, { c: C.soft, r: 7, pr: al }); D.near(q, q, 'MRTS = 1', { c: C.soft, op: al, d: 18, size: S.ss, ring: 80 }); }
    },
    reveal: function () { return [['ghost', 0, 400], ['tan', 300, 900], ['pt', 1100, 600], ['also', 1600, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, q = p.q, gK = q * q / g.L;
      return {
        rows: [['Workers L', num(g.L, 2), num(s.L, 2)], ['Machines K', num(gK, 2), num(s.K, 2)], ['MRTS = K/L', num(gK / g.L, 2), mTxt(p.m)]],
        why: 'MRTS = MPL/MPK = (0.5K<sup>0.5</sup>L<sup>-0.5</sup>)/(0.5K<sup>-0.5</sup>L<sup>0.5</sup>) = K/L. On this isoquant K = ' + (q * q) + '/L, so K/L = ' + (q * q) + '/L<sup>2</sup> = ' + mTxt(p.m) + ' at <b>L = ' + num(s.L, 2) + ', K = ' + num(s.K, 2) +
          '</b>. Moving right along the curve the firm is more labor-intensive, so each extra worker replaces fewer machines: diminishing MRTS, which is why isoquants bow toward the origin.'
      };
    },
    explore: {
      init: function (f) { f.ex.L = f.sol.L; },
      hint: 'Drag the green point along the isoquant, or change the output level. MRTS depends only on the ratio K/L.',
      controls: [{ kind: 'stepper', label: 'Output Q', get: function (f) { return f.p.q; }, set: function (f, v, fin) { f.p.q = fin ? Math.round(v) : v; }, step: 1, min: 2, max: 6, fmt: function (v) { return num(v, 0); }, dur: 400 }],
      readout: function (f) {
        var q = f.p.q, L = f.ex.L, Kv = q * q / L, m = Kv / L;
        return 'At L = ' + num(L, 2) + ', K = ' + num(Kv, 2) + ': MRTS = K/L = <b class="c-orange">' + num(m, 2) + '</b>. One more worker can replace about ' + num(m, 2) + ' machine' + (Math.abs(m - 1) < 0.005 ? '' : 's') + ' with output held at Q = ' + num(q, 2) + '.';
      }
    }
  };

  /* =====================================================================
     5.4  Diminishing MPL vs returns to scale
     ===================================================================== */
  var DR = M.dimret;
  function vHandle(f, x, get, put, o) {
    var v = get(f), Y = f.dom.Y;
    return { x: x, y: v, c: o.c || PLUM, grip: 'v', step: o.step, active: o.active, kstep: o.kstep || Y / 100,
      set: function (f, X, y) { put(f, clamp(r2(y), o.lo == null ? 0.05 : o.lo, Y)); } };
  }
  var f54 = {
    key: 'f54', num: '5.4', topic: 'Diminishing MPL vs returns to scale', short: 'MPL vs scale', model: DR,
    axes: { xtitle: 'Scale factor λ', ytitle: 'Output Q', xfmt: function (v) { return num(v, 1); } }, aspect: 0.8, narrowAspect: 1.05,
    question: 'Double both inputs, then double only labor. Where does output land each time?',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Technology <b>' + cdHTML(1, p.a, p.b) + '</b>. Today the firm uses K = 4 and L = 4, so Q = 4<sup>' + exps(p.a + p.b) + '</sup> = <b>' + num(s.Q1, 2) + '</b> (the dot at &lambda; = 1). The gold line marks double that output.';
    },
    steps: [
      { kind: 'drag', label: 'Both inputs &times;2 (K = 8, L = 8)', prompt: 'Drag the plum point at &lambda; = 2 to the output with twice the machines and twice the workers.',
        check: function (f) { if (Math.abs(f.g.qb - f.sol.Q1) < 0.2 * f.sol.Q1) return 'Drag it: output changes when both inputs double.'; if (f.g.ql == null) f.g.ql = r2(f.sol.Q1); return true; } },
      { kind: 'drag', label: 'Only labor &times;2 (K = 4, L = 8)', prompt: 'Now drag the second point to the output with twice the workers but the same 4 machines.',
        check: function (f) { return Math.abs(f.g.ql - f.sol.Q1) < 0.05 * f.sol.Q1 ? 'Drag it: more workers do add some output.' : true; } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the point (Shift for bigger steps), Enter confirms and moves to the next step.',
    initGuess: function (f) { return { qb: r2(f.sol.Q1), ql: null }; },
    handles: function (f) {
      if (f.predicting) {
        var hb = vHandle(f, 2, function (f) { return f.g.qb; }, function (f, v) { f.g.qb = v; }, { step: 0, active: f.cur === 0 });
        if (f.g.ql == null) return [hb];
        var hl = vHandle(f, 2, function (f) { return f.g.ql; }, function (f, v) { f.g.ql = v; }, { step: 1, active: f.cur === 1 });
        return f.cur === 1 ? [hl, hb] : [hb, hl];
      }
      if (f.exploring) {
        var lam = f.ex.lam;
        return [{ x: lam, y: DR.both(f.p, lam), c: BUN, grip: 'h', active: true,
          set: function (f, X) { f.ex.lam = clamp(Math.round(X * 20) / 20, 0.25, f.dom.X); },
          key: function (f, dx, dy) { f.ex.lam = clamp(Math.round((lam + (dx + dy) * 0.05) * 20) / 20, 0.25, f.dom.X); f.ex.touched = true; } }];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, dbl = 2 * s.Q1;
      D.line(2, 0, 2, S.Y, { c: C.line, w: 2, dash: '4 6', reg: false });
      D.line(0, dbl, S.X, dbl, { c: C.gold, w: 3, dash: '10 7', pr: b });
      if (b > 0.9) D.label('double: ' + num(dbl, 2), [{ x: S.x0 + 10, y: S.y(dbl) - 10, anchor: 'start' }, { x: S.x0 + 10, y: S.y(dbl) + 24, anchor: 'start' }], { c: C.tGold, prio: 0 });
      D.dot(1, s.Q1, { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(1, s.Q1, 'now: Q = ' + num(s.Q1, 2), { c: C.ink, d: 20, prio: 0, ring: 90 });
      var tb = f.t('both'), tl = f.t('only'), tv = f.t('vals');
      var both = function (l) { return DR.both(p, l); }, only = function (l) { return DR.onlyL(p, l); };
      if (f.predicting) {
        D.near(2, g.qb, 'both: ' + num(g.qb, 2), { c: PLUM, d: 24, ring: 90 });
        if (g.ql != null) D.near(2, g.ql, 'only L: ' + num(g.ql, 2), { c: PLUM, d: 24, ring: 90 });
        return;
      }
      if (f.ghostOn()) { D.ghost(2, g.qb, { op: f.gOp() }); if (g.ql != null) D.ghost(2, g.ql, { op: f.gOp() }); }
      D.fn(both, 0, S.X, { c: BLUE, w: 5, pr: tb });
      D.fn(only, 0, S.X, { c: MARG, w: 5, pr: tl });
      if (tb > 0.9) D.label(S.narrow ? 'both ×λ' : 'K and L both ×λ', D.along(both, [2.3, 2.2, 2.4, 1.6].map(function (x) { return x; }), 12, 'aboveOnly').filter(function (c) { return c.anchor === 'end'; }).concat(D.along(both, [1.6, 1.4], 12, 'aboveOnly')), { c: BLT, size: S.fs, ring: 80 });
      if (tl > 0.9) D.label(S.narrow ? 'only L ×λ' : 'only L ×λ (K = 4)', D.along(only, [2.3, 2.2, 2.4, 1.6], 12, 'belowOnly').filter(function (c) { return c.anchor === 'end'; }).concat(D.along(only, [1.6, 1.4], 12, 'belowOnly')), { c: MARGT, size: S.fs, ring: 80 });
      if (tv > 0 && !f.exploring) {
        D.dot(2, s.Qb, { c: BLUE, r: 9, pr: tv }); D.dot(2, s.Ql, { c: MARG, r: 9, pr: tv });
        D.near(2, s.Qb, num(s.Qb, 2) + ' (×' + num(s.rb, 2) + ')', { c: BLT, op: tv, d: 22, prio: 0, ring: 100 });
        D.near(2, s.Ql, num(s.Ql, 2) + ' (×' + num(s.rl, 2) + ')', { c: MARGT, op: tv, d: 22, prio: 0, ring: 100 });
      }
      if (f.exploring) {
        var lam = f.ex.lam;
        D.dot(lam, only(lam), { c: MARG, r: 8 });
        D.line(lam, 0, lam, Math.max(both(lam), only(lam)), { c: C.soft, w: 2, dash: '4 6', layer: 'over' });
        D.near(lam, both(lam), num(both(lam), 2), { c: BLT, d: 24, prio: 0, ring: 90 });
        D.near(lam, only(lam), num(only(lam), 2), { c: MARGT, d: 24, prio: 0, ring: 90 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['both', 300, 1100], ['only', 1200, 1000], ['vals', 2100, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, S1 = num(p.a + p.b, 2);
      return {
        rows: [['Both inputs &times;2', num(g.qb, 2), num(s.Qb, 2) + ' (' + times(s.rb) + ')'], ['Only labor &times;2', g.ql == null ? '' : num(g.ql, 2), num(s.Ql, 2) + ' (' + times(s.rl) + ')']],
        why: 'Doubling everything multiplies output by 2<sup>a+b</sup> = 2<sup>' + S1 + '</sup> = ' + num(s.rb, 2) + ': ' + rtsName(p.a + p.b) + (s.rts === 'CRS' ? ', exactly double' : s.rts === 'IRS' ? ', more than double' : ', less than double') + '. Doubling only labor multiplies it by 2<sup>b</sup> = 2<sup>' + exps(p.b) + '</sup> = ' + num(s.rl, 2) +
          ', less than double because b &lt; 1: diminishing marginal product. ' + (s.rts === 'IRS' ? 'No contradiction: diminishing MPL is about one input, returns to scale about all of them together.' : 'Diminishing MPL is about one input; returns to scale is about all of them together.')
      };
    },
    explore: {
      init: function (f) { f.ex.lam = 2; },
      hint: 'Change the exponents, and drag the green point to any scale &lambda;. The blue curve scales both inputs, the orange one only labor.',
      controls: [
        { kind: 'stepper', label: 'a (capital)', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 10) / 10 : v; if (fin) f.dom = DR.domain(f.p); }, step: 0.1, min: 0.1, max: 0.9, fmt: function (v) { return num(v, 2); } },
        { kind: 'stepper', label: 'b (labor)', get: function (f) { return f.p.b; }, set: function (f, v, fin) { f.p.b = fin ? Math.round(v * 10) / 10 : v; if (fin) f.dom = DR.domain(f.p); }, step: 0.1, min: 0.1, max: 0.9, fmt: function (v) { return num(v, 2); } }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol, lam = f.ex.lam;
        return 'a + b = <b>' + num(p.a + p.b, 2) + '</b>: ' + rtsShort(p.a + p.b) + '. At &lambda; = ' + num(lam, 2) + ': both inputs give Q = <b>' + num(DR.both(p, lam), 2) + '</b> (' + times(Math.pow(lam, p.a + p.b)) + '), only labor gives <b>' + num(DR.onlyL(p, lam), 2) + '</b> (' + times(Math.pow(lam, p.b)) + ').';
      }
    }
  };

  /* =====================================================================
     5.5  Returns to scale: isoquant spacing along a ray
     ===================================================================== */
  var SP = M.spacing;
  function rayHandle(f, get, put, o) {
    var t = get(f), X = f.dom.X;
    return { x: t, y: t, c: o.c || PLUM, step: o.step, active: o.active,
      set: function (f, x, y) { put(f, clamp(Math.round((x + y) / 2 * 20) / 20, 0.1, X * 0.98)); },
      key: function (f, dx, dy) { put(f, clamp(Math.round((t + (dx + dy) * 0.05) * 20) / 20, 0.1, X * 0.98)); } };
  }
  function isoQ(p, q) { return function (L) { return Math.pow(q / Math.pow(L, p.b), 1 / p.a); }; }
  var f55 = {
    key: 'f55', num: '5.5', topic: 'Returns to scale and isoquant spacing', short: 'Isoquant spacing', model: SP,
    axes: AXLK, aspect: 0.86, narrowAspect: 1.02,
    question: 'The Q = 1 isoquant crosses the ray at L = K = 1. Where do Q = 2 and Q = 3 cross it?',
    setup: function (f) {
      var p = f.p;
      return 'Technology <b>' + cdHTML(1, p.a, p.b) + '</b>. The dashed ray is L = K: along it both inputs grow in the same proportion. Each step from Q = 1 to 2 to 3 is the same step in output; how far apart are the isoquants?';
    },
    steps: [
      { kind: 'drag', label: 'Where Q = 2 crosses', prompt: 'Slide the plum point along the ray to where output is 2.',
        check: function (f) {
          if (Math.abs(f.g.L2 - SP.start(f.p).L2) < 0.05) return 'Slide it along the ray first.';
          if (f.g.L2 <= 1.02) return 'Q = 2 needs more inputs than Q = 1.';
          if (f.g.L3 == null) f.g.L3 = r2(Math.min(f.dom.X * 0.98, f.g.L2 + 0.15 * f.dom.X));   // starts just beyond your Q = 2
          return true;
        } },
      { kind: 'drag', label: 'Where Q = 3 crosses', prompt: 'Now slide the second point to where output is 3.',
        check: function (f) { return f.g.L3 > f.g.L2 + 0.02 ? true : 'Q = 3 needs more inputs than Q = 2.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys slide the point along the ray, Enter confirms and moves to the next step.',
    initGuess: function (f) { return { L2: SP.start(f.p).L2, L3: null }; },
    handles: function (f) {
      if (!f.predicting) return [];
      var h2 = rayHandle(f, function (f) { return f.g.L2; }, function (f, v) { f.g.L2 = v; }, { step: 0, active: f.cur === 0 });
      if (f.g.L3 == null) return [h2];
      var h3 = rayHandle(f, function (f) { return f.g.L3; }, function (f, v) { f.g.L3 = v; }, { step: 1, active: f.cur === 1 });
      return f.cur === 1 ? [h3, h2] : [h2, h3];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.line(0, 0, S.X, S.Y, { c: C.grey, w: 2.5, dash: '6 6', pr: b });
      if (b > 0.9) D.label('ray L = K', [{ x: S.x(S.X * 0.86) - 12, y: S.y(S.X * 0.86) + 4, anchor: 'end' }, { x: S.x(S.X * 0.8) + 12, y: S.y(S.X * 0.8) + 20, anchor: 'start' }], { c: C.soft, size: S.ss });
      D.fn(isoQ(p, 1), 0.01, S.X, { c: MAP[0], w: 4.5, pr: b });
      D.dot(1, 1, { c: MAP[0], r: 8, pr: b });
      if (b > 0.9) D.near(1, 1, 'Q = 1', { c: '#3b6f96', d: 18, prio: 0, ring: 70 });
      var cv = f.t('curves'), dt = f.t('dots'), gp = f.t('gaps');
      if (f.predicting) {
        D.near(g.L2, g.L2, 'Q = 2?', { c: PLUM, d: 22, ring: 90 });
        if (g.L3 != null) D.near(g.L3, g.L3, 'Q = 3?', { c: PLUM, d: 22, ring: 90 });
        return;
      }
      if (f.ghostOn()) { D.ghost(g.L2, g.L2, { op: f.gOp() }); if (g.L3 != null) D.ghost(g.L3, g.L3, { op: f.gOp() }); }
      [[2, s.L2, MAP[1]], [3, s.L3, MAP[2]]].forEach(function (z, i) {
        D.fn(isoQ(p, z[0]), 0.01, S.X, { c: z[2], w: 4.5, pr: seg(cv, i * 0.3, 0.7 + i * 0.3) });
        D.dot(z[1], z[1], { c: z[2], r: 8, pr: seg(dt, i * 0.4, 0.6 + i * 0.4) });
        if (dt > 0.5) D.near(z[1], z[1], 'Q = ' + z[0], { c: i ? BLT : '#3b6f96', d: 18, prio: 0, ring: 70, op: dt });
      });
      if (gp > 0) {
        var yy = S.y(S.Y * 0.5);
        D.label('steps in L: ' + num(s.L2 - 1, 2) + ', then ' + num(s.L3 - s.L2, 2), [{ x: S.x1 - 6, y: yy, anchor: 'end' }], { c: C.ink, op: gp, prio: 0, fixed: true, size: S.narrow ? S.ss : S.ls });
        D.label(s.rts + (s.rts === 'CRS' ? ': equal spacing' : s.rts === 'IRS' ? ': isoquants bunch up' : ': isoquants spread out'), [{ x: S.x1 - 6, y: yy + 28, anchor: 'end' }], { c: s.rts === 'DRS' ? C.tRed : s.rts === 'IRS' ? C.tGreen : C.ink, op: gp, prio: 0, fixed: true });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['curves', 300, 1300], ['dots', 900, 900], ['gaps', 1900, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, e = num(p.a + p.b, 2);
      return {
        rows: [['Q = 2 at L = K =', num(g.L2, 2), num(s.L2, 2)], ['Q = 3 at L = K =', g.L3 == null ? '' : num(g.L3, 2), num(s.L3, 2)]],
        why: 'On the ray L = K = t, output is t<sup>a</sup>t<sup>b</sup> = t<sup>' + e + '</sup>, so Q = n where t = n<sup>1/' + e + '</sup>: <b>' + num(s.L2, 2) + '</b> for Q = 2 and <b>' + num(s.L3, 2) + '</b> for Q = 3. a + b = ' + e + ' means ' + rtsName(p.a + p.b) +
          (s.rts === 'CRS' ? ': equal steps in output need equal steps in inputs, so the isoquants are evenly spaced.' : s.rts === 'IRS' ? ': each extra unit of output needs a smaller step in inputs, so the isoquants bunch up.' : ': each extra unit of output needs a bigger step in inputs, so the isoquants spread out.')
      };
    },
    explore: {
      hint: 'Change the exponents and watch the spacing. What matters is only the sum a + b.',
      controls: [
        { kind: 'stepper', label: 'a', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 20) / 20 : v; if (fin) f.dom = SP.domain(f.p); }, step: 0.05, min: 0.25, max: 0.9, fmt: function (v) { return num(v, 2); }, dur: 350 },
        { kind: 'stepper', label: 'b', get: function (f) { return f.p.b; }, set: function (f, v, fin) { f.p.b = fin ? Math.round(v * 20) / 20 : v; if (fin) f.dom = SP.domain(f.p); }, step: 0.05, min: 0.25, max: 0.9, fmt: function (v) { return num(v, 2); }, dur: 350 }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol;
        return 'a + b = <b>' + num(p.a + p.b, 2) + '</b> (' + rtsShort(p.a + p.b) + '). Along L = K: Q = 1 at 1, Q = 2 at <b>' + num(s.L2, 2) + '</b>, Q = 3 at <b>' + num(s.L3, 2) + '</b>.';
      }
    }
  };

  /* =====================================================================
     5.6  Input substitution vs technological change
     ===================================================================== */
  var TC = M.tech;
  var f56 = {
    key: 'f56', num: '5.6', topic: 'Input substitution vs technological change', short: 'Substitution vs tech', model: TC,
    axes: AXLK, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'The firm moves to L = ' + num(f.p.L1, 2) + ' workers, then its technology improves. How much capital does it need at each stage?'; },
    setup: function (f) {
      var p = f.p;
      return 'The firm always makes <b>Q = 4</b> with Q = A K<sup>0.5</sup>L<sup>0.5</sup>. It starts at L = 4, K = 4 with A = 1. First it ' + (p.L1 < 4 ? 'switches to a more capital-intensive mix' : 'switches to a more labor-intensive mix') + ' with the same technology, ending at L = ' + num(p.L1, 2) +
        '. Then a better technology arrives: A rises from 1 to <b>' + num(p.A, 2) + '</b>, and it keeps L = ' + num(p.L1, 2) + '.';
    },
    steps: [
      { kind: 'drag', label: 'Same technology, L = %L', prompt: 'Drag the plum point up or down to the capital that keeps output at 4.',
        check: function (f) { if (Math.abs(f.g.K1 - 4) < 0.1) return 'Drag it: with a new L, K has to change too.'; if (f.g.K2 == null) f.g.K2 = f.g.K1; return true; } },
      { kind: 'drag', label: 'Better technology, A = %A', prompt: 'Now drag the point to the capital it needs with the better technology.',
        check: function (f) { return Math.abs(f.g.K2 - f.g.K1) < 0.05 ? 'Drag it: better technology changes what it needs.' : true; } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the point (Shift for bigger steps), Enter confirms and moves to the next step.',
    initGuess: function () { return { K1: 4, K2: null }; },
    handles: function (f) {
      if (f.predicting) {
        var h1 = vHandle(f, f.p.L1, function (f) { return f.g.K1; }, function (f, v) { f.g.K1 = v; }, { step: 0, active: f.cur === 0, kstep: 0.05 });
        if (f.g.K2 == null) return [h1];
        // the second handle starts on top of the first; listed first, it wins the grab
        return [vHandle(f, f.p.L1, function (f) { return f.g.K2; }, function (f, v) { f.g.K2 = v; }, { step: 1, active: f.cur === 1, kstep: 0.05 }), h1];
      }
      if (f.exploring) {
        var A = f.p.A, L = f.ex.L, pts = []; for (var i = 0; i <= 200; i++) { var x = 0.3 + 9.7 * i / 200; pts.push([x, TC.K(A, x)]); }
        return [{ x: L, y: TC.K(A, L), c: BUN, active: true,
          set: function (f, X, Y) { f.ex.L = clamp(Math.round(nearestOn(f.S, pts, X, Y).x * 20) / 20, 0.5, 9.8); },
          key: function (f, dx, dy) { f.ex.L = clamp(Math.round((L + (dx - dy) * 0.05) * 20) / 20, 0.5, 9.8); f.ex.touched = true; } }];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, old = function (L) { return TC.K(1, L); };
      var sb = f.t('sub'), sh = f.t('shift'), vl = f.t('vals');
      var oldOp = f.exploring || sh > 0 ? 0.55 : 1;
      D.fn(old, 0.3, S.X, { c: BLUE, w: f.exploring || sh > 0 ? 3.5 : 5, pr: b, op: oldOp });
      if (b > 0.9) D.curveLabel(f.exploring || sh > 0 ? 'A = 1' : 'Q = 4 with A = 1', old, [0.88, 0.8, 0.94], { c: BLT, pref: 'aboveOnly', op: oldOp });
      D.line(p.L1, 0, p.L1, S.Y, { c: C.grey, w: 2, dash: '4 6', pr: b, reg: false });
      if (b > 0.9) D.xval(p.L1, 'L = ' + num(p.L1, 2), { c: C.soft, anchor: p.L1 < 4 ? 'end' : 'start', dx: p.L1 < 4 ? -8 : 8 });
      D.dot(4, 4, { c: C.ink, r: 9, pr: b });
      if (b > 0.5 && !f.exploring) D.near(4, 4, 'start (4, 4)', { c: C.ink, d: 20, prio: 0, ring: 90 });
      if (f.predicting) {
        D.near(p.L1, g.K1, (g.K2 != null ? 'same tech: ' : '') + 'K = ' + num(g.K1, 2), { c: PLUM, d: 22, ring: 100 });
        if (g.K2 != null && Math.abs(g.K2 - g.K1) > 1e-9) D.near(p.L1, g.K2, 'new tech: K = ' + num(g.K2, 2), { c: PLUM, d: 22, ring: 100 });
        return;
      }
      if (f.ghostOn()) { D.ghost(p.L1, g.K1, { op: f.gOp() }); if (g.K2 != null) D.ghost(p.L1, g.K2, { op: f.gOp() }); }
      if (f.exploring) {
        var A = p.A, L = f.ex.L, Kv = TC.K(A, L), cur = function (x) { return TC.K(A, x); };
        D.fn(cur, 0.3, S.X, { c: BLUE, w: 5 });
        D.curveLabel('Q = 4 with A = ' + num(A, 2), cur, [0.3, 0.22, 0.4], { c: BLT, pref: 'belowOnly' });
        D.drop(L, Kv, {});
        D.near(L, Kv, pt(L, Kv), { c: BUNT, d: 22, prio: 0, ring: 100 });
        return;
      }
      if (sb > 0) {
        var Lt = lerp(4, p.L1, sb), trail = []; for (var i = 0; i <= 40; i++) { var x = lerp(4, Lt, i / 40); trail.push([x, old(x)]); }
        D.path(trail, { c: MARG, w: 4.5, layer: 'over' });
        D.dot(Lt, old(Lt), { c: MARG, r: 9 });
        if (sb > 0.6) D.near(p.L1, s.K1, 'substitution: K = ' + num(s.K1, 2), { c: MARGT, op: seg(sb, 0.6, 1), d: 22, prio: 0, ring: 110 });
      }
      if (sh > 0) {
        var At = lerp(1, p.A, sh), nw = function (x) { return TC.K(At, x); };
        D.fn(nw, 0.3, S.X, { c: C.gold, w: 5 });
        D.arrow(p.L1, s.K1, p.L1, TC.K(At, p.L1) + (sh > 0.2 ? 0.15 : 0), { c: C.gold, w: 4, op: sh });
        D.dot(p.L1, TC.K(At, p.L1), { c: C.gold, r: 9 });
        if (sh > 0.9) D.curveLabel('Q = 4 with A = ' + num(p.A, 2), nw, [0.3, 0.22, 0.4, 0.5], { c: C.tGold, pref: 'belowOnly' });
      }
      if (vl > 0) D.near(p.L1, s.K2, 'new tech: K = ' + num(s.K2, 2), { c: C.tGold, op: vl, d: 22, prio: 0, ring: 110 });
    },
    reveal: function () { return [['ghost', 0, 400], ['sub', 300, 1100], ['shift', 1500, 1200], ['vals', 2600, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, A2 = p.A * p.A;
      return {
        rows: [['K after substituting', num(g.K1, 2), num(s.K1, 2)], ['K after the new technology', g.K2 == null ? '' : num(g.K2, 2), num(s.K2, 2)]],
        why: 'Substitution is a move along the same isoquant: K<sup>0.5</sup>L<sup>0.5</sup> = 4 means K = 16/L = 16/' + num(p.L1, 2) + ' = <b>' + num(s.K1, 2) + '</b>. Better technology shifts the isoquant in: A K<sup>0.5</sup>L<sup>0.5</sup> = 4 gives K = 16/(A<sup>2</sup>L) = 16/(' + num(A2, 4) + ' &times; ' + num(p.L1, 2) + ') = <b>' + num(s.K2, 2) +
          '</b>. A enters squared because K has exponent 0.5, so K falls by more than the 1/A guess (' + num(s.Kwrong, 2) + ').'
      };
    },
    explore: {
      init: function (f) { f.ex.L = f.p.L1; },
      hint: 'Raise or lower technology A: the isoquant for Q = 4 shifts. Drag the green bundle along it: that is substitution, and the curve stays put.',
      controls: [{ kind: 'stepper', label: 'Technology A', get: function (f) { return f.p.A; }, set: function (f, v, fin) { f.p.A = fin ? Math.round(v * 10) / 10 : v; }, step: 0.1, min: 0.8, max: 2.5, fmt: function (v) { return num(v, 2); } }],
      readout: function (f) {
        var p = f.p, L = f.ex.L, Kv = TC.K(p.A, L);
        return 'With A = ' + num(p.A, 2) + ', Q = 4 at L = ' + num(L, 2) + ' needs K = <b>' + num(Kv, 2) + '</b> (with A = 1 it needed ' + num(TC.K(1, L), 2) + '). Output stays 4 everywhere on the curve.';
      }
    }
  };
  // step labels with numbers
  f56.steps[0].label = function (f) { return 'Same technology, L = ' + num(f.p.L1, 2); };
  f56.steps[1].label = function (f) { return 'Better technology, A = ' + num(f.p.A, 2); };

  /* =====================================================================
     5.7  Consumer-production analogy: the cheapest bundle
     ===================================================================== */
  var AN = M.analogy;
  function anPlace(f, X, Y) { var q = f.p.q, n = nearestOn(f.S, hypPts(q, f.dom.X, f.dom.Y), X, Y), L = clamp(r2(n.x), q * q / f.dom.Y, f.dom.X); f.g.pt = { x: L, y: q * q / L }; }
  function anWords(f) {
    var ic = f.exploring && f.ex.mode === 'ic';
    return ic ? { x: 'X', y: 'Y', Q: 'U', curve: 'indifference curve', line: 'budget', w: 'P_X', r: 'P_Y', C: 'income', m: 'MRS' }
      : { x: 'L', y: 'K', Q: 'Q', curve: 'isoquant', line: 'isocost', w: 'w', r: 'r', C: 'cost', m: 'MRTS' };
  }
  var f57 = {
    key: 'f57', num: '5.7', topic: 'The consumer and the firm, side by side', short: 'Consumer-firm analogy', model: AN,
    axes: function (f) { return f.exploring && f.ex.mode === 'ic' ? { xtitle: 'Good X', ytitle: 'Good Y' } : AXLK; }, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'What is the cheapest way to make Q = ' + f.p.q + '? Tap the bundle on the isoquant.'; },
    setup: function (f) {
      var p = f.p;
      return 'Technology Q = K<sup>0.5</sup>L<sup>0.5</sup>, so the isoquant is L K = ' + (p.q * p.q) + '. A worker costs <b>w = ' + money(p.w) + '</b> and a machine <b>r = ' + money(p.r) + '</b>. This is the consumer\'s problem in reverse: the budget line becomes the isocost line wL + rK, and MRS becomes MRTS.';
    },
    steps: [{ kind: 'place', key: 'pt', handle: false, label: 'The cheapest bundle', prompt: 'Tap the point on the isoquant where making Q costs the least. Drag it to adjust.', place: anPlace,
      kstart: function (f) { var q = f.p.q, L = Math.min(f.dom.X * 0.85, q * 2.4); return { x: L, y: q * q / L }; } }],
    kbdHint: 'Keyboard: Enter drops the point on the curve, arrow keys slide it, Enter confirms.',
    initGuess: function () { return { pt: null }; },
    handles: function (f) {
      var q = f.p.q;
      if (f.predicting && f.g.pt) return [hypHandle(f, function (f) { return f.g.pt.x; }, function (f, L) { f.g.pt = { x: L, y: q * q / L }; }, { step: 0, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, w = anWords(f), q = p.q, Kf = function (L) { return q * q / L; };
      if (f.exploring) {
        [q - 1, q + 1.5].forEach(function (z) { if (z > 0) D.fn(function (L) { return z * z / L; }, 0.1, S.X, { c: MAP[0], w: 3 }); });
      }
      D.fn(Kf, 0.1, S.X, { c: BLUE, w: 5, pr: b });
      if (b > 0.9) D.curveLabel(w.Q + ' = ' + q, Kf, [0.86, 0.92, 0.78], { c: BLT, pref: 'aboveOnly' });
      if (f.predicting) {
        if (g.pt) D.near(g.pt.x, g.pt.y, pt(g.pt.x, g.pt.y), { c: PLUM, d: 22, ring: 100 });
        return;
      }
      var ln = f.t('line'), op = f.t('opt'), yl = f.t('yours');
      var C0 = s.C;
      D.line(0, C0 / p.r, C0 / p.w, 0, { c: MARG, w: 5, pr: ln });
      if (ln > 0.9) D.label(w.line + ': ' + money(C0), D.along(function (L) { return (C0 - p.w * L) / p.r; }, [0.15 * C0 / p.w, 0.25 * C0 / p.w, 0.75 * C0 / p.w], 14, 'below'), { c: MARGT, size: S.ls, ring: 100 });
      if (f.ghostOn() && g.pt) {
        D.ghost(g.pt.x, g.pt.y, { op: f.gOp() });
        var Cg = AN.cost(p, g.pt.x, g.pt.y);
        if (yl > 0 && Cg - C0 > 0.005 * C0) {
          D.line(0, Cg / p.r, Cg / p.w, 0, { c: PLUM, w: 3, dash: '7 7', op: yl * 0.8, layer: 'over' });
          D.near(g.pt.x, g.pt.y, 'yours costs ' + money(Cg), { c: PLUM, op: yl, d: 22, ring: 110 });
        }
      }
      if (op > 0) {
        var L = f.exploring ? s.L : s.L, Kv = s.K;
        D.drop(L, Kv, { pr: op });
        D.dot(L, Kv, { c: f.exploring ? BUN : C.ink, r: 10, pr: op });
        D.near(L, Kv, pt(L, Kv) + ': ' + w.m + ' = ' + num(Kv / L, 2), { c: f.exploring ? BUNT : C.ink, op: op, d: 22, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['line', 300, 1000], ['opt', 1200, 600], ['yours', 1700, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, Cg = g.pt ? AN.cost(p, g.pt.x, g.pt.y) : NaN;
      return {
        rows: [['Bundle (L, K)', g.pt ? pt(g.pt.x, g.pt.y) : '', pt(s.L, s.K)], ['Cost', g.pt ? money(Cg) : '', money(s.C)]],
        why: 'The cheapest bundle is where the isocost line just touches the isoquant: MRTS = w/r, as the consumer sets MRS = P<sub>X</sub>/P<sub>Y</sub>. Here MRTS = K/L, so K/L = ' + money(p.w) + '/' + money(p.r) + ' = ' + num(s.ratio, 2) + ' and L K = ' + (p.q * p.q) +
          ', giving <b>L = ' + num(s.L, 2) + ', K = ' + num(s.K, 2) + '</b> at a cost of ' + money(p.w) + ' &times; ' + num(s.L, 2) + ' + ' + money(p.r) + ' &times; ' + num(s.K, 2) + ' = <b>' + money(s.C) + '</b>. Any other point on the isoquant sits on a higher isocost line.'
      };
    },
    explore: {
      init: function (f) { f.ex.mode = 'iq'; },
      hint: 'Change the wage: the isocost line tilts and the tangency slides along the isoquant. Switch to the consumer reading: same picture, new names.',
      controls: function (f) {
        var q = f.p.q, r = f.p.r;
        return [
          { kind: 'stepper', label: function (f) { return anWords(f).w + ' (' + (f.ex.mode === 'ic' ? 'price of X' : 'wage') + ')'; }, get: function (f) { return f.p.w; }, set: function (f, v, fin) { f.p.w = fin ? Math.round(v) : v; }, step: 1,
            min: Math.max(1, Math.ceil(r * q * q / 81)), max: Math.min(60, Math.floor(r * 81 / (q * q))), fmt: money },
          { kind: 'seg', label: 'Read it as', options: [['iq', 'A firm'], ['ic', 'A consumer']], get: function (f) { return f.ex.mode; }, set: function (f, v) { f.ex.mode = v; f.buildExplore(); } }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, w = anWords(f), ic = f.ex.mode === 'ic';
        return (ic ? 'Consumer: P<sub>X</sub> = ' + money(p.w) + ', P<sub>Y</sub> = ' + money(p.r) + ', income ' + money(s.C) + '. Best bundle X = ' + num(s.L, 2) + ', Y = ' + num(s.K, 2) + ', where MRS = P<sub>X</sub>/P<sub>Y</sub> = '
          : 'Firm: w = ' + money(p.w) + ', r = ' + money(p.r) + '. Cheapest way to make Q = ' + p.q + ': L = ' + num(s.L, 2) + ', K = ' + num(s.K, 2) + ', cost <b>' + money(s.C) + '</b>, where MRTS = w/r = ') + '<b class="c-orange">' + num(s.ratio, 2) + '</b>.';
      }
    }
  };

  /* =====================================================================
     5.8  Cobb-Douglas lab: the isoquant's slope at a point
     ===================================================================== */
  var LB = M.lab;
  function slopeHandle(f) {
    var S = f.S, p = f.p, m = f.g.m, k = pxs(S), P = [S.x(p.L), S.y(p.K)];
    var ux = k.sx, uy = m * k.sy, n = Math.hypot(ux, uy); ux /= n; uy /= n;   // px direction of more L along the line (y down)
    var R = S.narrow ? 92 : 125, side = (P[0] + R * ux > S.x1 - 14 || P[1] + R * uy > S.y0 - 14) ? -1 : 1;
    return { px: [P[0] + side * R * ux, P[1] + side * R * uy], c: PLUM, grip: 'r', step: 0, active: !f.done[0],
      set: function (f, X, Y) {
        var dx = (X - p.L) * k.sx, dy = -(Y - p.K) * k.sy;   // px, y down
        if (Math.hypot(dx, dy) < 12) return;
        var a = Math.atan2(dy, dx); if (a < 0) a += Math.PI;   // fold onto [0, pi)
        if (a >= Math.PI / 2) a = a > 3 * Math.PI / 4 ? 0.0001 : Math.PI / 2 - 0.0001;   // rising lines clamp to flat or vertical
        f.g.m = clamp(Math.tan(a) * k.sx / k.sy, 0.03, 30);
      },
      key: function (f, dx, dy) { f.g.m = clamp(f.g.m * Math.pow(1.04, dy - dx), 0.03, 30); } };
  }
  var f58 = {
    key: 'f58', num: '5.8', topic: 'Cobb-Douglas production lab', short: 'Cobb-Douglas lab', model: LB,
    axes: AXLK, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'How steep is the isoquant through P = ' + pt(f.p.L, f.p.K, 0) + '? Turn the line until it matches.'; },
    setup: function (f) {
      var p = f.p;
      return 'Technology <b>' + cdHTML(p.A, p.a, p.b) + '</b>. At P, MPL = &part;Q/&part;L and MPK = &part;Q/&part;K. The isoquant through P is hidden; its slope there is &minus;MRTS = &minus;MPL/MPK.';
    },
    steps: [{ kind: 'drag', label: 'The tangent at P', prompt: 'Drag the round handle to turn the plum line through P until it has the isoquant\'s slope.',
      check: function (f) { return Math.abs(Math.log(f.g.m / f.sol.start)) > 0.04 ? true : 'Turn the line first.'; } }],
    kbdHint: 'Keyboard: up arrow makes the line steeper, down arrow flatter (Shift for bigger steps), Enter confirms.',
    initGuess: function (f) { return { m: f.sol.start }; },
    handles: function (f) {
      if (f.predicting) return [slopeHandle(f)];
      if (f.exploring) {
        var p = f.p;
        return [{ x: p.L, y: p.K, c: BUN, active: true, snap: 0.5, set: function (f, X, Y) { f.p.L = clamp(X, 1, 9); f.p.K = clamp(Y, 1, 9); } }];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      var io = f.t('iso'), tn = f.t('tan'), mp = f.t('map'), vl = f.t('vals');
      if (mp > 0) [0.5, 2].forEach(function (z) { D.fn(function (L) { return LB.Kiso(p, L, z * s.Q); }, 0.05, S.X, { c: MAP[0], w: 3, op: mp }); });
      if (mp > 0.9) [0.5, 2].forEach(function (z) { D.curveLabel('Q = ' + num(z * s.Q, 2), function (L) { return LB.Kiso(p, L, z * s.Q); }, z < 1 ? [0.08, 0.12, 0.05] : [0.88, 0.8, 0.94, 0.7], { c: '#3b6f96', size: S.ss, ring: 45 }); });
      if (io > 0) { var Kf = function (L) { return LB.Kiso(p, L); }; D.fn(Kf, 0.05, S.X, { c: BLUE, w: 5, pr: io }); if (io > 0.9) D.curveLabel('Q = ' + num(s.Q, 2), Kf, [0.86, 0.78, 0.93, 0.15], { c: BLT }); }
      if (f.exploring) {
        var lam = f.ex.lam;
        if (Math.abs(lam - 1) > 1e-9) {
          D.line(p.L, p.K, lam * p.L, lam * p.K, { c: C.grey, w: 2.5, dash: '5 6', layer: 'over' });
          D.dot(lam * p.L, lam * p.K, { c: MARG, r: 8 });
          D.near(lam * p.L, lam * p.K, 'λ = ' + num(lam, 2) + ': Q = ' + num(LB.Q(p, lam * p.L, lam * p.K), 2), { c: MARGT, d: 22, prio: 0, ring: 100 });
        }
      }
      var line = function (m, o) { D.line(p.L - 40, p.K + 40 * m, p.L + 40, p.K - 40 * m, o); };
      if (f.predicting) line(g.m, { c: PLUM, w: 4, layer: 'over' });
      if (f.ghostOn()) line(g.m, { c: PLUM, w: 3, dash: '3 7', op: 0.7 * f.gOp(), layer: 'over' });
      if (tn > 0) line(s.mrts, { c: MARG, w: 4, pr: tn, layer: 'over' });
      D.dot(p.L, p.K, { c: f.exploring ? BUN : C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(p.L, p.K, 'P ' + pt(p.L, p.K, 1), { c: f.exploring ? BUNT : C.ink, d: 22, prio: 0, ring: 100 });
      if (f.predicting) { var h = slopeHandle(f); D.label('slope −' + num(g.m, 2), D.aroundP(h.px[0], h.px[1], 24), { c: PLUM, ring: 90 }); return; }
      if (vl > 0 || f.exploring) D.label('MRTS = ' + num(s.mrts, 2), [{ x: S.x1 - 6, y: S.y1 + 14, anchor: 'end' }], { c: MARGT, op: f.exploring ? 1 : vl, prio: 0, fixed: true });
    },
    reveal: function () { return [['ghost', 0, 400], ['iso', 300, 1100], ['tan', 1300, 700], ['map', 1900, 600], ['vals', 2000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['MRTS (steepness)', num(g.m, 2), num(s.mrts, 2)]],
        why: 'MPL = bQ/L = ' + num(p.b, 2) + ' &times; ' + num(s.Q, 3) + '/' + num(p.L, 2) + ' = ' + num(s.MPL, 3) + ' and MPK = aQ/K = ' + num(p.a, 2) + ' &times; ' + num(s.Q, 3) + '/' + num(p.K, 2) + ' = ' + num(s.MPK, 3) + ', so MRTS = MPL/MPK = (b/a)(K/L) = <b>' + num(s.mrts, 2) +
          '</b>. A cancels out: total factor productivity scales output, not the trade-off between inputs. a + b = ' + num(p.a + p.b, 2) + ': ' + rtsName(p.a + p.b) + ', which you can see in the spacing of the lighter isoquants (half and double the output).'
      };
    },
    explore: {
      init: function (f) { f.ex.lam = 1; },
      hint: 'Drag P, change the exponents or A, and scale both inputs by &lambda;. Output scales by &lambda;<sup>a+b</sup>.',
      controls: [
        { kind: 'stepper', label: 'A', get: function (f) { return f.p.A; }, set: function (f, v, fin) { f.p.A = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 0.5, max: 4, fmt: function (v) { return num(v, 2); } },
        { kind: 'stepper', label: 'a (capital)', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 10) / 10 : v; }, step: 0.1, min: 0.1, max: 0.9, fmt: function (v) { return num(v, 2); } },
        { kind: 'stepper', label: 'b (labor)', get: function (f) { return f.p.b; }, set: function (f, v, fin) { f.p.b = fin ? Math.round(v * 10) / 10 : v; }, step: 0.1, min: 0.1, max: 0.9, fmt: function (v) { return num(v, 2); } },
        { kind: 'stepper', label: 'Scale λ', get: function (f) { return f.ex.lam; }, set: function (f, v, fin) { f.ex.lam = fin ? Math.round(v * 4) / 4 : v; }, step: 0.25, min: 0.5, max: 2.5, fmt: function (v) { return num(v, 2); } }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol, lam = f.ex.lam, Ql = LB.Q(p, lam * p.L, lam * p.K);
        return 'Q = <b>' + num(s.Q, 3) + '</b>, MPL = ' + num(s.MPL, 3) + ', MPK = ' + num(s.MPK, 3) + ', MRTS = <b class="c-orange">' + num(s.mrts, 3) + '</b>. a + b = ' + num(p.a + p.b, 2) + ' (' + rtsShort(p.a + p.b) + ')' +
          (Math.abs(lam - 1) > 1e-9 ? '; scaling by &lambda; = ' + num(lam, 2) + ' gives Q = ' + num(Ql, 3) + ', ' + times(Ql / s.Q) + ' = &lambda;<sup>' + num(p.a + p.b, 2) + '</sup>.' : '.');
      }
    }
  };

  /* =====================================================================
     5.9  Bakery: a new machine shifts TP
     ===================================================================== */
  var BK = M.bakery;
  function bin(f, L) { var d = f.drawn('curve'), i = Math.round(L / (f.dom.X / BK.BINS)); return d[i] ? d[i].y : null; }
  var f59 = {
    key: 'f59', num: '5.9', topic: 'The bakery: adding a machine', short: 'Bakery simulator', model: BK,
    axes: { xtitle: 'Workers L', ytitle: 'Output (units)' }, aspect: 0.74, narrowAspect: 1.0,
    question: function (f) { var p = f.p; return p.K1 > p.K0 ? 'The bakery buys ' + (p.K1 - p.K0 === 1 ? 'another oven' : (p.K1 - p.K0) + ' more ovens') + '. Draw its new total product curve.' : 'The bakery loses ' + (p.K0 - p.K1 === 1 ? 'an oven' : (p.K0 - p.K1) + ' ovens') + '. Draw its new total product curve.'; },
    setup: function (f) {
      var p = f.p;
      return 'Output is <b>Q = K<sup>0.5</sup>L<sup>0.5</sup></b>. With K = ' + p.K0 + ' oven' + (p.K0 === 1 ? '' : 's') + ' the blue curve shows output as bakers are hired: each one adds less than the one before. Now K becomes <b>' + p.K1 + '</b>.';
    },
    steps: [{ kind: 'draw', key: 'curve', bins: 48, label: function (f) { return 'TP with K = ' + f.p.K1; }, prompt: 'Draw the new curve with your finger or mouse, from 0 to 12 workers.',
      kstart: function (f, x) { return BK.TP(f.p.K0, x); },
      check: function (f) { return f.coverage('curve', 0, 12) >= 0.5 ? true : 'Keep going: draw across more of the graph.'; } }],
    kbdHint: 'Keyboard: arrow keys raise or lower a copy of the blue curve, Enter accepts it.',
    initGuess: function () { return {}; },
    scoreInput: function (f) { return { drawn: f.drawn('curve') }; },
    render: function (f, S, D) {
      var p = f.p, b = f.base(), nw = f.t('new'), ar = f.t('gap');
      var old = function (L) { return BK.TP(p.K0, L); };
      if (f.exploring) {
        var K = f.ex.K, L = f.ex.L, cur = function (x) { return BK.TP(K, x); };
        D.drawing('curve');
        if (K !== p.K0) D.fn(old, 0, S.X, { c: BLUE, w: 3, dash: '8 7', op: 0.55 });
        D.fn(cur, 0, S.X, { c: BLUE, w: 5 });
        D.curveLabel('K = ' + K, cur, [0.9, 0.82, 0.95], { c: BLT, pref: 'aboveOnly' });
        if (K !== p.K0) D.curveLabel('K = ' + p.K0, old, [0.9, 0.82, 0.95], { c: '#3b6f96', size: S.ss, pref: 'belowOnly' });
        if (L > 0) {
          D.drop(L, cur(L), { y: false });
          D.line(L, cur(L - 1), L, cur(L), { c: MARG, w: 7, layer: 'over', cap: 'butt' });
          D.dot(L, cur(L), { c: BUN, r: 9 });
          D.near(L, cur(L), 'TP = ' + num(cur(L), 2), { c: BUNT, d: 22, prio: 0, ring: 100 });
        }
        return;
      }
      D.fn(old, 0, S.X, { c: BLUE, w: nw > 0 ? 3 : 5, dash: nw > 0 ? '8 7' : null, op: nw > 0 ? 0.6 : 1, pr: b });
      if (b > 0.9) D.curveLabel('K = ' + p.K0, old, [0.9, 0.82, 0.95], { c: BLT, pref: p.K1 > p.K0 ? 'belowOnly' : 'aboveOnly' });
      D.drawing('curve');
      if (nw > 0) {
        var cur2 = function (L) { return BK.TP(p.K1, L); };
        D.fn(cur2, 0, S.X, { c: BLUE, w: 5, pr: nw });
        if (nw > 0.9) D.curveLabel('K = ' + p.K1, cur2, [0.9, 0.82, 0.95], { c: BLT, pref: p.K1 > p.K0 ? 'aboveOnly' : 'belowOnly' });
      }
      if (ar > 0) [4, 9].forEach(function (L) {
        var y0 = BK.TP(p.K0, L), y1 = BK.TP(p.K1, L);
        D.arrow(L, y0, L, y1, { c: C.gold, w: 4, op: ar });
        D.label((y1 > y0 ? '+' : '') + num(y1 - y0, 2), D.around(L, (y0 + y1) / 2, 14).slice(0, 2), { c: C.tGold, op: ar, size: S.ss, ring: 60 });
      });
    },
    reveal: function () { return [['ghost', 0, 300], ['new', 200, 1200], ['gap', 1400, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, y4 = bin(f, 4), y9 = bin(f, 9), up = p.K1 > p.K0;
      return {
        rows: [['Output with 4 bakers', y4 == null ? '' : num(y4, 2), num(s.at4, 2)], ['Output with 9 bakers', y9 == null ? '' : num(y9, 2), num(s.at9, 2)]],
        why: 'TP = (' + p.K1 + 'L)<sup>0.5</sup>: every point on the curve is &radic;(' + p.K1 + '/' + p.K0 + ') = ' + num(Math.sqrt(p.K1 / p.K0), 3) + ' times the old one, so the curve ' + (up ? 'shifts up' : 'shifts down') + ', more at large L (by ' + num(Math.abs(s.at4 - s.old4), 2) + ' at L = 4 and ' + num(Math.abs(s.at9 - s.old9), 2) +
          ' at L = 9). MPL = 0.5(K/L)<sup>0.5</sup> ' + (up ? 'rises' : 'falls') + ' at every L: each baker has ' + (up ? 'more' : 'less') + ' capital to work with. It still falls as L grows (diminishing MPL), and it never turns negative here.'
      };
    },
    explore: {
      init: function (f) { f.ex.K = f.p.K1; f.ex.L = 4; f.ex.w = 15; },
      hint: 'Hire and fire bakers, buy or sell ovens, and set the wage. The orange bar is what the last baker added.',
      controls: [
        { kind: 'stepper', label: 'Bakers L', get: function (f) { return f.ex.L; }, set: function (f, v, fin) { f.ex.L = Math.round(v); }, step: 1, min: 0, max: 12, fmt: function (v) { return num(v, 0); }, dur: 1 },
        { kind: 'stepper', label: 'Ovens K', get: function (f) { return f.ex.K; }, set: function (f, v, fin) { f.ex.K = Math.round(v); }, step: 1, min: 1, max: 7, fmt: function (v) { return num(v, 0); }, dur: 1 },
        { kind: 'stepper', label: 'Wage w', get: function (f) { return f.ex.w; }, set: function (f, v, fin) { f.ex.w = Math.round(v); }, step: 5, min: 5, max: 50, fmt: money, dur: 1 }
      ],
      readout: function (f) {
        var K = f.ex.K, L = f.ex.L, w = f.ex.w, tp = BK.TP(K, L), last = BK.MPL(K, L), next = BK.TP(K, L + 1) - tp;
        return 'TP = <b>' + num(tp, 2) + '</b>. ' + (L > 0 ? 'The last baker added <b class="c-orange">' + num(last, 3) + '</b>; ' : '') + 'the next would add ' + num(next, 3) + '. Wage bill ' + money(w * L) + ' (the wage changes costs, not the TP curve).';
      }
    }
  };

  /* =====================================================================
     5.10  Isoquant shape identifier
     ===================================================================== */
  var SH = M.shapes;
  function fnHTML(s) { return s.replace(/\^([0-9.]+)/g, '<sup>$1</sup>'); }
  function shapeName(k) { return k === 'cd' ? 'smooth and bowed in (Cobb-Douglas)' : k === 'linear' ? 'a straight line (perfect substitutes)' : 'L-shaped (fixed proportions)'; }
  function sketches(f) {
    var L0 = f.p.L, K0 = f.p.K, a, i, out = [];
    a = []; for (i = 0; i <= 40; i++) { var x = 2 * L0 * i / 40; a.push({ x: x, y: K0 * (2 - x / L0) }); } a = a.filter(function (q) { return q.x <= 10 && q.y <= 10 && q.y >= 0; }); a.name = 'a straight line through P'; out.push(a);
    a = []; for (i = 0; i <= 60; i++) { var L = L0 * K0 / 10 + (10 - L0 * K0 / 10) * i / 60; a.push({ x: L, y: L0 * K0 / L }); } a.name = 'a smooth curve bowed toward the origin'; out.push(a);
    a = []; for (i = 0; i <= 20; i++) a.push({ x: L0, y: 10 - (10 - K0) * i / 20 }); for (i = 1; i <= 20; i++) a.push({ x: L0 + (10 - L0) * i / 20, y: K0 }); a.name = 'an L shape with its corner at P'; out.push(a);
    // the right family's sketch is the true isoquant: picking a sketch by keyboard is the page's three-way quiz
    var tr = SH.truth(f.p).filter(Boolean).map(function (t) { return { x: t[0], y: t[1] }; }), k = { linear: 0, cd: 1, leontief: 2 }[f.sol.F.kind];
    tr.name = out[k].name; out[k] = tr;
    return out;
  }
  var f510 = {
    key: 'f510', num: '5.10', topic: 'Isoquant shapes', short: 'Shape identifier', model: SH,
    axes: { xtitle: 'L', ytitle: 'K' }, aspect: 0.86, narrowAspect: 1.02,
    question: function (f) { return 'Sketch the isoquant of ' + fnHTML(SH.FUNS[f.p.i].fn) + ' through P.'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'P uses L = ' + p.L + ' and K = ' + p.K + ', so it makes Q = ' + num(s.q, 2) + '. Draw every bundle that makes the same output: is it a smooth curve, a straight line, or an L?';
    },
    steps: [{ kind: 'draw', key: 'curve', mode: 'free', single: true, label: 'The isoquant through P', prompt: 'Draw it in one stroke with your finger or mouse. Drawing again replaces it.',
      kshapes: sketches,
      check: function (f) {
        var d = (f.g.curve || []).filter(Boolean); if (d.length < 8) return 'Keep going: draw a longer line.';
        var xs = d.map(function (q) { return q.x; }), ys = d.map(function (q) { return q.y; });
        return Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys)) >= 3 ? true : 'Keep going: draw across more of the graph.';
      } }],
    kbdHint: 'Keyboard: arrow keys switch between three sketches through P (a line, a curve, an L), Enter accepts one.',
    initGuess: function () { return {}; },
    scoreInput: function (f) { return { drawn: f.drawn('curve') }; },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, F = s.F, b = f.base(), cv = f.t('curve'), mp = f.t('map');
      function isoAt(q, o) {
        if (F.kind === 'cd') return D.fn(function (L) { return Math.pow(q / (F.A * Math.pow(L, F.b)), 1 / F.a); }, 0.02, S.X, o);
        if (F.kind === 'linear') return D.line(0, q / F.cK, q / F.cL, 0, o);
        return D.path([[q / F.cL, S.Y * 1.3], [q / F.cL, q / F.cK], [S.X * 1.3, q / F.cK]], o);
      }
      if (mp > 0) [0.5, 1.5].forEach(function (z) { isoAt(z * s.q, { c: MAP[0], w: 3, op: mp }); });
      if (cv > 0) isoAt(s.q, { c: BLUE, w: 5, pr: cv });
      D.drawing('curve');
      D.dot(p.L, p.K, { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(p.L, p.K, 'P (' + p.L + ', ' + p.K + ')', { c: C.ink, d: 20, prio: 0, ring: 90 });
      if (cv > 0.9) D.label('Q = ' + num(s.q, 2) + ': ' + (F.kind === 'cd' ? 'smooth, bowed in' : F.kind === 'linear' ? 'straight line' : 'L-shaped'), [{ x: S.x1 - 6, y: S.y1 + 14, anchor: 'end' }], { c: BLT, op: cv, prio: 0, fixed: true });
    },
    reveal: function () { return [['ghost', 0, 300], ['curve', 200, 1300], ['map', 1500, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, F = s.F, res = f.result;
      var mr = F.kind === 'cd' ? 'MRTS = (' + num(F.b, 2) + '/' + num(F.a, 2) + ')(K/L), falling along the curve (' + num(s.mrts, 2) + ' at P)' : F.kind === 'linear' ? 'MRTS = ' + num(F.cL, 2) + '/' + num(F.cK, 2) + ' = ' + num(s.mrts, 2) + ' everywhere' : 'no substitution: infinite on the vertical arm, 0 on the horizontal one';
      var why = F.kind === 'cd' ? 'Cobb-Douglas: inputs substitute, but at a falling rate, so the isoquant is smooth and bowed toward the origin. Here it is K = ' + (F.A === 1 ? '' : '(1/' + num(F.A, 2) + ')<sup>' + num(1 / F.a, 3) + '</sup> ') + num(s.q, 2) + '<sup>' + num(1 / F.a, 3) + '</sup> / L<sup>' + num(F.b / F.a, 3) + '</sup>.'
        : F.kind === 'linear' ? 'Linear: perfect substitutes at a fixed rate, so the isoquant is the straight line ' + num(F.cL, 2) + 'L + ' + num(F.cK, 2) + 'K = ' + num(s.q, 2) + ', from K = ' + num(s.kI, 2) + ' on the K axis to L = ' + num(s.lI, 2) + ' on the L axis.'
          : 'Leontief: inputs are used in fixed proportions, so extra L or extra K alone adds nothing. The isoquant is an L with its corner at (' + num(s.cL, 2) + ', ' + num(s.cK, 2) + ')' + (Math.abs(s.cL - p.L) > 1e-9 || Math.abs(s.cK - p.K) > 1e-9 ? ': P sits on an arm, wasting some ' + (p.L > s.cL + 1e-9 ? 'labor' : 'capital') + '.' : ', exactly at P.');
      return {
        rows: [['Average gap from the isoquant', res ? num(res.err * 10, 2) : '', '0'], ['Shape', '', F.kind === 'cd' ? 'smooth, bowed in' : F.kind === 'linear' ? 'straight line' : 'L-shaped']],
        why: why + ' ' + mr.charAt(0).toUpperCase() + mr.slice(1) + '.'
      };
    },
    explore: {
      hint: 'Try the other functions from the quiz list. Each shows the isoquant through P and the ones for half and 1.5 times the output.',
      controls: [{ kind: 'seg', label: 'Function', options: SH.FUNS.map(function (F, i) { return [i, fnHTML(F.fn)]; }), get: function (f) { return f.p.i; }, set: function (f, v) { f.p.i = v; } }],
      readout: function (f) { var s = f.sol; return Kit.rich(fnHTML(s.F.fn)) + ' through P makes Q = <b>' + num(s.q, 2) + '</b>: the isoquant is ' + shapeName(s.F.kind) + '.'; }
    }
  };

  window.W5FIGS = [f51, f52, f53, f54, f55, f56, f57, f58, f59, f510];
})();
