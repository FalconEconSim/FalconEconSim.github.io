/* Week 6 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week6-viz.html and the fig66 film: isoquants blue, isocost lines orange-red, the
 * cheapest bundle green; SMC orange-red, ATC blue, AVC green, AFC grey; SRAC curves light orange,
 * LRAC blue; MC orange-red over a blue AC. Plum always means "you".
 * 6.2 stacks two panels in one SVG (isoquants on top, total cost below): see stack(). */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, K = Kit.K, snapTo = Kit.snapTo, seg = Kit.seg;
  var M = window.W6, PLUM = C.plum;
  var IQ = C.blue, IQT = C.tBlue, ISO = C.orange, ISOT = C.tOrange, OPT = C.green, OPTT = C.tGreen;
  var AXLK = { xtitle: 'L (labor)', ytitle: 'K (capital)' };
  var AXQ = { xtitle: 'q (output)', ytitle: '$ per unit' };
  var SRF = '#e3a995';   // SRAC curves: the film's light orange

  function pt(x, y, dp) { return '(' + num(x, dp == null ? 2 : dp) + ', ' + num(y, dp == null ? 2 : dp) + ')'; }
  function pct(v) { return (v >= 0 ? '+' : '') + num(v * 100, 1) + '%'; }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // nearest x on y = fn(x) to a pointer at data (X, Y), measured in pixels
  function nearX(S, fn, a, b, X, Y, ymax) {
    var top = ymax == null ? S.Y : ymax;
    var pts = G.sample(fn, a, b, 500).map(function (p) { return p && p[1] >= 0 && p[1] <= top ? p : null; });
    var n = G.nearest(X, Y, pts, (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return n.x == null ? null : n.x;
  }
  // a line w L + v K = c inside a box [0, X] x [0, Y]: returns [[L, K], [L, K]] or null
  function isoSeg(w, v, c, X, Y) {
    var a = [0, c / v], b = [c / w, 0];
    if (a[1] > Y) a = [(c - v * Y) / w, Y];
    if (b[0] > X) b = [X, (c - w * X) / v];
    if (a[0] > X || b[1] > Y || a[0] < -1e-9 || b[1] < -1e-9) return null;
    return [a, b];
  }
  var CD = 'Q = K<sup>0.5</sup>L<sup>0.5</sup>';

  // a handle sliding along the isoquant K = q^2 / L; get / put read and write L
  function iqHandle(f, q, L, put, o) {
    o = o || {}; var S = f.S, lo = Math.max(0.2, q * q / (0.97 * S.Y)), hi = 0.97 * S.X, iq = function (x) { return q * q / x; };
    var st = o.ks || 0.05;
    return { x: L, y: iq(L), c: o.c || C.ink, step: o.step, active: o.active,
      set: function (f, X, Y) { var x = nearX(f.S, iq, lo, hi, X, Y); if (x != null) put(f, clamp(Math.round(x / 0.05) * 0.05, lo, hi)); },
      key: function (f, dx, dy) { put(f, clamp(Math.round((L + (dx - dy) * st * 2) / 0.05) * 0.05, lo, hi)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  var KBD_IQ = 'Keyboard: arrow keys slide the point along the isoquant (Shift for bigger steps), Enter confirms.';

  /* =====================================================================
     6.1  Cost minimization
     ===================================================================== */
  var f61 = {
    key: 'f61', num: '6.1', topic: 'Cost minimization', short: 'Cost minimization', model: M.costmin, axes: AXLK, aspect: 0.86,
    question: function (f) { return 'What is the cheapest way to make ' + num(f.p.q) + ' units?'; },
    setup: function (f) {
      var p = f.p;
      return 'Production is ' + CD + '. Labor costs <b>w = ' + money(p.w) + '</b> an hour and capital rents for <b>v = ' + money(p.v) + '</b>. Every bundle on the blue isoquant makes q = ' + num(p.q) +
        '; an isocost line wL + vK = TC has slope -w/v = <b>-' + num(p.w / p.v, 2) + '</b>.';
    },
    steps: [{ kind: 'drag', label: 'The cheapest bundle', prompt: 'Slide the plum point along the isoquant to the bundle that makes the output at the lowest total cost.',
      check: function (f) { return Math.abs(f.g.L - f.sol.start) > 0.04 ? true : 'Slide it along the isoquant first.'; } }],
    kbdHint: KBD_IQ,
    initGuess: function (f) { return { L: f.sol.start }; },
    handles: function (f) {
      if (f.predicting) return [iqHandle(f, f.p.q, f.g.L, function (f, L) { f.g.L = L; }, { c: PLUM, step: 0, active: !f.done[0] })];
      if (f.exploring) return [iqHandle(f, f.p.q, f.ex.L, function (f, L) { f.ex.L = L; }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, q = p.q, iq = function (x) { return q * q / x; };
      D.fn(iq, 0.05, S.X, { c: IQ, w: 5, pr: b });
      if (b > 0.9) D.curveLabel('isoquant q = ' + num(q), iq, [0.86, 0.78, 0.93, 0.7], { c: IQT });
      if (f.predicting) {
        var gK = iq(g.L);
        D.drop(g.L, gK, { c: PLUM, op: 0.5 });
        D.near(g.L, gK, pt(g.L, gK, 2), { c: PLUM, d: 22, size: S.ls });
        return;
      }
      var sw = f.t('sweep'), tp = f.t('tan'), yc = f.t('yours');
      // the isocost family: lines too cheap to reach the isoquant, then the one that just touches it
      if (sw > 0) {
        [0.6, 0.8].forEach(function (m, i) {
          var sg = isoSeg(p.w, p.v, s.TC * m, S.X, S.Y), op = seg(sw, 0.25 * i, 0.25 * i + 0.3);
          if (sg && op > 0 && !f.exploring) {
            D.line(sg[0][0], sg[0][1], sg[1][0], sg[1][1], { c: C.grey, w: 2.5, op: op, layer: 'under' });
            if (sw > 0.9 && i === 0) D.label(money(s.TC * m) + ': too little', D.around(lerp(sg[0][0], sg[1][0], 0.82), lerp(sg[0][1], sg[1][1], 0.82), 8).slice(4, 8), { c: C.soft, size: S.ss, op: tp });
          }
        });
        var cNow = f.revealing ? Math.round(lerp(0.5, 1, sw) * s.TC) : s.TC;
        if (f.revealing && sw >= 1) cNow = s.TC;
        var sn = isoSeg(p.w, p.v, cNow, S.X, S.Y);
        if (sn) D.line(sn[0][0], sn[0][1], sn[1][0], sn[1][1], { c: ISO, w: 4.5 });
        if (sn && f.revealing && sw < 1) D.label('TC = ' + money(cNow), [{ x: S.x(sn[0][0]) + 10, y: S.y(sn[0][1]) + 6, anchor: 'start' }], { c: ISOT, fixed: true, prio: 0 });
      }
      if (f.ghostOn()) {
        var gk = iq(g.L); D.ghost(g.L, gk, { op: f.gOp() }); youTag(f, D, g.L, gk);
        if (yc > 0) {
          var gc = M.costmin.cost(p, g.L), sy = isoSeg(p.w, p.v, gc, S.X, S.Y);
          if (sy && gc > s.TC * 1.005) {
            D.line(sy[0][0], sy[0][1], sy[1][0], sy[1][1], { c: PLUM, w: 3, dash: '6 6', op: yc * f.gOp(), layer: 'under' });
            D.label('your bundle costs ' + money(gc), D.around(lerp(sy[0][0], sy[1][0], 0.75), lerp(sy[0][1], sy[1][1], 0.75), 10).slice(0, 4), { c: PLUM, size: S.ss, op: yc * f.gOp() });
          }
        }
      }
      if (tp > 0) {
        D.drop(s.L, s.K, { pr: tp });
        D.dot(s.L, s.K, { c: OPT, r: 11, pr: tp });
        D.near(s.L, s.K, 'L* = ' + num(s.L, 2) + ', K* = ' + num(s.K, 2), { c: OPTT, op: tp, d: 22, prio: 0, ring: 100 });
        var sl = isoSeg(p.w, p.v, s.TC, S.X, S.Y);
        if (sl) D.label('TC* = ' + money(s.TC), [{ x: S.x(sl[0][0]) + 10, y: S.y(sl[0][1]) + 6, anchor: 'start' }, { x: S.x(sl[0][0]) + 10, y: S.y(sl[0][1]) + 30, anchor: 'start' }], { c: ISOT, op: tp, prio: 0 });
      }
      if (f.exploring) {
        var L = f.ex.L, Kx = iq(L), cx = M.costmin.cost(p, L), se = isoSeg(p.w, p.v, cx, S.X, S.Y);
        if (se && cx > s.TC * 1.002) D.line(se[0][0], se[0][1], se[1][0], se[1][1], { c: C.soft, w: 2.5, dash: '6 6', layer: 'under' });
        D.drop(L, Kx, {});
        if (Math.abs(L - s.L) > 0.06 && !f.ghostOn()) D.near(L, Kx, money(cx), { c: C.ink, d: 22, prio: 0, ring: 90 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['sweep', 300, 1800], ['tan', 2000, 600], ['yours', 2400, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gK = p.q * p.q / g.L, gc = M.costmin.cost(p, g.L);
      var mine = !f.skipped && gc > s.TC * 1.005 ? ' Your bundle costs ' + money(gc) + ', ' + num((gc / s.TC - 1) * 100, 1) + '% more: its MRTS, K/L = ' + num(gK / g.L, 2) + ', ' + (gK / g.L > p.w / p.v ? 'is above' : 'is below') + ' w/v, so trading ' + (gK / g.L > p.w / p.v ? 'capital for labor' : 'labor for capital') + ' would make the same output for less.' : '';
      return {
        rows: [['Labor L', num(g.L, 2), num(s.L, 2)], ['Capital K', num(gK, 2), num(s.K, 2)], ['Total cost', money(gc), money(s.TC)]],
        why: 'The cheapest bundle is where the isocost line just touches the isoquant: MRTS = w/v. For ' + CD + ' the MRTS is K/L, so K/L = ' + num(p.w) + '/' + num(p.v) + ' = ' + num(p.w / p.v, 2) +
          '. With &radic;(KL) = ' + num(p.q) + ' that gives L* = q&radic;(v/w) = <b>' + num(s.L, 2) + '</b> and K* = <b>' + num(s.K, 2) + '</b>, so TC* = ' + money(p.w) + ' &times; ' + num(s.L, 2) + ' + ' + money(p.v) + ' &times; ' + num(s.K, 2) + ' = <b>' + money(s.TC) + '</b>.' + mine
      };
    },
    explore: {
      init: function (f) { f.ex.L = Math.round(f.g.L / 0.05) * 0.05; },
      hint: 'Drag the black point along the isoquant: the dashed isocost through it always costs more than the orange one. Then change the input prices and watch the cheapest bundle move.',
      controls: function (f) {
        return [
          { kind: 'stepper', label: 'Wage w', get: function (f) { return f.p.w; }, set: function (f, v) { f.p.w = v; }, step: 1, get min() { return M.costmin.wRange(f.p, f.dom.X)[0]; }, get max() { return M.costmin.wRange(f.p, f.dom.X)[1]; }, fmt: money, dur: 400 },
          { kind: 'stepper', label: 'Rental rate v', get: function (f) { return f.p.v; }, set: function (f, v) { f.p.v = v; }, step: 1, get min() { return M.costmin.vRange(f.p, f.dom.X)[0]; }, get max() { return M.costmin.vRange(f.p, f.dom.X)[1]; }, fmt: money, dur: 400 }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, L = f.ex.L, Kx = p.q * p.q / L, c = M.costmin.cost(p, L);
        return 'Cheapest: L* = <b>' + num(s.L, 2) + '</b>, K* = <b>' + num(s.K, 2) + '</b>, TC* = <b class="c-green">' + money(s.TC) + '</b> (w/v = ' + num(p.w / p.v, 2) + '). Your black point ' + pt(L, Kx, 2) + ' costs <b>' + money(c) + '</b>' +
          (c > s.TC * 1.002 ? ', ' + money(c - s.TC) + ' more.' : ', the minimum.');
      }
    }
  };

  /* =====================================================================
     6.2  From isoquants to the total cost curve (two stacked panels)
     ===================================================================== */
  // The kit's data space is 0..100 in y. Top panel (K) on [tl, 100], bottom panel (TC) on [0, bh], a gap
  // between for the top panel's L ticks. One x scale: L in the top panel, q in the bottom one.
  function stack(f, S) {
    var d = f.dom, ph = S.y0 - S.y1, gap = (S.narrow ? 74 : 82) / ph * 100, bh = (100 - gap) * 0.44, tl = bh + gap;
    return { gap: gap, bh: bh, tl: tl,
      ty: function (y) { return tl + y / d.Yt * (100 - tl); },
      by: function (p) { return p / d.P * bh; },
      iy: function (Y) { return (Y - tl) / (100 - tl) * d.Yt; },
      ip: function (Y) { return Y / bh * d.P; } };
  }
  function stackAxes(f, S, D, T) {
    var d = f.dom, fs = S.narrow ? 15 : 16, ts = S.narrow ? 16 : 17, s = '', v, yb = S.y(T.tl), yt = S.y(T.bh);
    var tick = function (x1, y1, x2, y2) { return K.pline(x1, y1, x2, y2, { c: C.soft, w: 2, cap: 'butt' }); };
    var lab = function (x, y, t, a) { return K.text(x, y, t, { size: fs, weight: 500, c: C.soft, anchor: a, hw: 5 }); };
    s += '<rect x="' + (S.x0 - 5) + '" y="' + (yb + 2).toFixed(1) + '" width="10" height="' + Math.max(0, yt - yb - 8).toFixed(1) + '" fill="' + C.paper + '"/>';
    s += K.pline(S.x0, yb, S.x1 + 4, yb, { c: C.ink, w: 2.5, cap: 'square' });
    for (v = d.xs; v <= d.X + 1e-9; v += d.xs) { var x = S.x(v); s += tick(x, yb, x, yb + 6) + lab(x, yb + 25, num(v, 2), 'middle'); }
    s += lab(S.x0 - 8, yb + 22, '0', 'end');
    for (v = d.yts; v <= d.Yt + 1e-9; v += d.yts) { var y = S.y(T.ty(v)); s += tick(S.x0 - 6, y, S.x0, y) + lab(S.x0 - 10, y + 5.5, num(v, 2), 'end'); }
    for (v = d.ps; v <= d.P + 1e-9; v += d.ps) { var y2 = S.y(T.by(v)); s += tick(S.x0 - 6, y2, S.x0, y2) + lab(S.x0 - 10, y2 + 5.5, num(v, 2), 'end'); }
    s += K.text(S.x1, yb + 50, 'L (labor)', { size: ts, weight: 600, c: C.soft, anchor: 'end', halo: false });
    s += K.text(4, yt - 18, 'TC ($)', { size: ts, weight: 600, c: C.soft, anchor: 'start', halo: false });
    D.L.rect(S.x0 - 4, yb, S.x1 - S.x0 + 8, 30); D.L.rect(S.x1 - 120, yb + 30, 124, 26); D.L.rect(0, yt - 40, 120, 30);
    D.add('over', s);
  }
  // an isoquant of the chosen form, as data points in the top panel (K above the panel becomes a gap)
  function iqPts(p, q, T, X, Yt) {
    var pts = [];
    if (p.form === 'cd') { for (var i = 0; i <= 160; i++) { var L = q * q / Yt + (X - q * q / Yt) * i / 160, Kk = q * q / L; pts.push(Kk <= Yt + 1e-9 ? [L, T.ty(Kk)] : null); } }
    else if (p.form === 'subs') { pts.push([0, T.ty(Math.min(q, Yt))]); pts.push([Math.min(q, X), T.ty(Math.max(0, q - Math.min(q, X)))]); if (q > Yt) pts[0] = [q - Yt, T.ty(Yt)]; }
    else { pts.push([q, T.ty(Yt)]); pts.push([q, T.ty(q)]); pts.push([X, T.ty(q)]); }
    return pts;
  }
  function formName(form) { return form === 'cd' ? CD : form === 'subs' ? 'Q = L + K (perfect substitutes)' : 'Q = min(L, K) (perfect complements)'; }
  function formSvg(form) { return form === 'cd' ? 'Q = √(KL)' : form === 'subs' ? 'Q = L + K' : 'Q = min(L, K)'; }
  function tcEq(p) { return 'TC = ' + num(M.deriv.slope(p), 2) + 'q'; }
  function placeTop(f, X, Y) {
    var T = stack(f, f.S), d = f.dom;
    if (Y < T.tl - 1.5) return;   // a tap in the cost panel does nothing in this step
    f.g.b = { x: clamp(snapTo(X, 0.1), 0, d.X), y: clamp(snapTo(T.iy(Y), 0.1), 0, d.Yt) };
  }
  var f62 = {
    key: 'f62', num: '6.2', topic: 'From isoquants to total cost', short: 'Isoquants to TC', model: M.deriv, axes: { xtitle: 'q (output)', ytitle: 'K (capital)' },
    aspect: 1.1, maxH: 820, narrowAspect: 1.8,
    question: function (f) { return 'What is the cheapest way to make ' + num(f.p.q0) + ' units, and what does it cost?'; },
    setup: function (f) {
      var p = f.p;
      return 'Production is <b>' + formName(p.form) + '</b>. Wage <b>w = ' + money(p.w) + '</b>, rental rate <b>v = ' + money(p.v) + '</b>. Top: the isoquants for q = 1 to 5. Bottom: total cost against output, still empty.';
    },
    steps: [
      { kind: 'place', label: function (f) { return 'Cheapest bundle for q = ' + num(f.p.q0); }, prompt: function (f) { return 'Tap the cheapest bundle on the q = ' + num(f.p.q0) + ' isoquant (top panel). Drag it to adjust.'; },
        place: placeTop, kstart: function (f) { var T = stack(f, f.S); return { x: f.dom.X * 0.5, y: T.ty(f.dom.Yt * 0.6) }; },
        check: function (f) { return !!f.g.b; } },
      { kind: 'drag', label: 'Its total cost', prompt: function (f) { return 'Drag the plum point in the cost panel up to the total cost of making ' + num(f.p.q0) + ' units.'; },
        check: function (f) { return f.g.mt ? true : 'Drag the point to your total cost first.'; } }
    ],
    kbdHint: 'Keyboard: Enter drops the bundle, arrow keys move it, Enter confirms; then up and down arrows move the cost point, Enter confirms.',
    initGuess: function (f) { return { b: null, tc: Math.round(f.dom.P * 0.12 * 2) / 2, mt: false }; },
    handles: function (f, S) {
      var T = stack(f, S), g = f.g, hs = [];
      if (f.predicting) {
        var tcH = { x: f.p.q0, y: T.by(g.tc), c: PLUM, grip: 'v', step: 1, active: f.cur === 1, kstep: { x: 0, y: 0.5 * T.bh / f.dom.P },
          hit: function (pt) { return Math.abs(pt.x - S.x(f.p.q0)) < 30 && pt.y > S.y(T.bh) - 20 ? Math.abs(pt.y - S.y(T.by(g.tc))) : 1e9; },
          set: function (f, X, Y) { f.g.tc = clamp(Math.round(T.ip(clamp(Y, 0, T.bh)) * 2) / 2, 0, f.dom.P); f.g.mt = true; } };
        var bH = g.b ? { x: g.b.x, y: T.ty(g.b.y), c: PLUM, step: 0, active: f.cur === 0, kstep: { x: 0.1, y: 0.1 * (100 - T.tl) / f.dom.Yt }, noAutoDone: true, set: function (f, X, Y) { placeTop(f, X, Math.max(Y, T.tl)); } } : null;
        // keyboard: the current step's handle first (kit focus quirk, see NOTES)
        if (f.cur >= 1 || f.done[1]) hs.push(tcH);
        if (bH) { if (f.cur === 0) hs.unshift(bH); else hs.push(bH); }
        return hs;
      }
      if (f.exploring) {
        var c = M.deriv.slope(f.p);
        return [{ x: f.ex.q, y: T.by(c * f.ex.q), c: C.ink, active: true, kstep: { x: 0.5, y: 0 },
          hit: function (pt) { return pt.y > S.y(T.bh) - 24 ? Math.hypot(pt.x - S.x(f.ex.q), pt.y - S.y(T.by(c * f.ex.q))) : 1e9; },
          set: function (f, X) { f.ex.q = clamp(Math.round(X * 2) / 2, 0.5, 5); },
          key: function (f, dx, dy) { f.ex.q = clamp(f.ex.q + 0.5 * (dx || dy), 0.5, 5); f.ex.touched = true; } }];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = f.dom, T = stack(f, S), ty = T.ty, by = T.by, c = M.deriv.slope(p);
      stackAxes(f, S, D, T);
      // top panel: isoquants q = 1..5, the question's one bold
      for (var q = 1; q <= 5; q++) {
        var main = q === p.q0 && !f.exploring, ex = f.exploring && Math.abs(q - f.ex.q) < 1e-9;
        D.path(iqPts(p, q, T, d.X, d.Yt), { c: IQ, w: main || ex ? 5 : 2.5, op: main || ex ? 1 : 0.4, pr: b });
        if (b > 0.9) {
          var lp = p.form === 'cd' ? [Math.min(d.X * 0.9, q * q / (d.Yt * 0.12)), null] : p.form === 'subs' ? [q * 0.5, null] : [Math.min(d.X * 0.92, q + 0.6 * (d.X - q)), null];
          lp[1] = p.form === 'cd' ? q * q / lp[0] : p.form === 'subs' ? q * 0.5 : q;
          if (lp[1] <= d.Yt && lp[0] <= d.X) D.label('q = ' + q, D.around(lp[0], ty(lp[1]), 6).slice(0, 4), { c: IQT, size: main ? S.ls : S.ss, op: main ? 1 : 0.8, ring: 40 });
        }
      }
      if (b > 0.9) D.label(formSvg(p.form), [{ x: S.x1 - 6, y: S.y(100) + 8, anchor: 'end' }], { c: C.ink, fixed: true, prio: 0, size: S.ss });
      if (f.ghostOn()) {
        if (g.b) { D.ghost(g.b.x, ty(g.b.y), { op: f.gOp() }); youTag(f, D, g.b.x, ty(g.b.y)); }
        D.ghost(p.q0, by(g.tc), { op: f.gOp() });
      }
      if (f.ex.q != null && f.exploring) {
        var be = M.deriv.bundle(p, f.ex.q), sg = isoSeg(p.w, p.v, be.TC, d.X, d.Yt);
        if (sg) D.line(sg[0][0], ty(sg[0][1]), sg[1][0], ty(sg[1][1]), { c: ISO, w: 3.5 });
        if (be.A[0] !== be.B[0] || be.A[1] !== be.B[1]) D.line(be.A[0], ty(be.A[1]), be.B[0], ty(be.B[1]), { c: OPT, w: 7, op: 0.7 });
        else D.dot(be.L, ty(be.K), { c: OPT, r: 10 });
        D.near(be.L, ty(be.K), 'L = ' + num(be.L, 2) + ', K = ' + num(be.K, 2), { c: OPTT, d: 20, prio: 0, size: S.ss, ring: 110 });
        D.line(0, 0, d.X, by(c * d.X), { c: OPT, w: 4.5 });
        D.line(f.ex.q, 0, f.ex.q, by(be.TC), { c: C.soft, w: 2, dash: '4 5', layer: 'under' });
        D.near(f.ex.q, by(be.TC), 'TC = ' + money(be.TC), { c: OPTT, d: 22, prio: 0, ring: 100 });
        D.label(tcEq(p), [{ x: S.x0 + 14, y: S.y(T.bh) + 10, anchor: 'start' }], { c: OPTT, fixed: true, prio: 0, size: S.ls });
        return;
      }
      if (f.predicting) {
        if (g.b) { D.near(g.b.x, ty(g.b.y), pt(g.b.x, g.b.y, 1), { c: PLUM, d: 22, size: S.ss, ring: 70 }); }
        if (f.cur >= 1 || f.done[1]) {
          D.line(p.q0, 0, p.q0, by(g.tc), { c: PLUM, w: 2.5, dash: '4 5', op: 0.6, layer: 'under' });
          D.near(p.q0, by(g.tc), 'q = ' + num(p.q0) + ': ' + money(g.tc), { c: PLUM, d: 22, size: S.ls });
        }
        return;
      }
      var iso = f.t('iso'), bp = f.t('pt'), dr = f.t('drop'), bu = f.t('build'), eq = f.t('eq');
      if (iso > 0) {
        var cNow = f.revealing && iso < 1 ? lerp(0.45, 1, iso) * s.TC : s.TC, si = isoSeg(p.w, p.v, cNow, d.X, d.Yt);
        if (si) D.line(si[0][0], ty(si[0][1]), si[1][0], ty(si[1][1]), { c: ISO, w: 4 });
        if (si && iso >= 1) D.label('isocost ' + money(s.TC), D.around(lerp(si[0][0], si[1][0], 0.2), ty(lerp(si[0][1], si[1][1], 0.2)), 10).slice(0, 4), { c: ISOT, size: S.ss, prio: 0, ring: 60 });
      }
      if (bp > 0) {
        if (s.tie) D.line(s.A[0], ty(s.A[1]), s.B[0], ty(s.B[1]), { c: OPT, w: 8, op: 0.75 * bp });
        D.dot(s.L, ty(s.K), { c: OPT, r: 11, pr: bp });
        D.near(s.L, ty(s.K), (s.tie ? 'any point, e.g. ' : '') + pt(s.L, s.K, 2), { c: OPTT, op: bp, d: 22, prio: 0, ring: 100 });
      }
      if (dr > 0) {
        D.line(p.q0, 0, p.q0, by(s.TC) * dr, { c: C.soft, w: 2, dash: '4 5', layer: 'under' });
        D.dot(p.q0, by(s.TC), { c: OPT, r: 11, pr: seg(dr, 0.4, 1) });
        if (dr > 0.6) D.near(p.q0, by(s.TC), 'TC(' + num(p.q0) + ') = ' + money(s.TC), { c: OPTT, op: seg(dr, 0.6, 1), d: 22, prio: 0, ring: 100 });
      }
      if (bu > 0) {
        var qs = M.deriv.QS, n = Math.min(qs.length, Math.floor(bu * qs.length + 1e-9)), path = [];
        for (var i = 0; i < n; i++) {
          var bq = M.deriv.bundle(p, qs[i]);
          if (Math.abs(qs[i] - p.q0) > 1e-9) { D.dot(bq.L, ty(bq.K), { c: OPT, r: 6 }); D.dot(qs[i], by(bq.TC), { c: OPT, r: 7 }); }
          path.push([bq.L, ty(bq.K)]);
        }
        if (path.length > 1 && !s.tie) D.path([[0, ty(0)]].concat(path), { c: OPT, w: 2.5, dash: '5 6', op: 0.8, reg: false });
        if (eq > 0) D.line(0, 0, Math.min(d.X, d.P / c), by(Math.min(c * d.X, d.P)), { c: OPT, w: 4.5, pr: eq });
        if (eq > 0.8) D.label(tcEq(p), [{ x: S.x0 + 14, y: S.y(T.bh) + 10, anchor: 'start' }], { c: OPTT, fixed: true, prio: 0, size: S.ls, op: seg(eq, 0.8, 1) });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['iso', 300, 1200], ['pt', 1400, 500], ['drop', 1800, 800], ['build', 2700, 1500, 'linear'], ['eq', 4200, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gb = g.b || { x: NaN, y: NaN };
      var how = p.form === 'cd' ? 'Cost is lowest where the isocost line is tangent to the isoquant: MRTS = K/L = w/v = ' + num(p.w / p.v, 2) + ', so L = ' + num(p.q0) + '&radic;(v/w) = ' + num(s.L, 2) + ' and K = ' + num(s.K, 2) + '.' :
        p.form === 'subs' ? (s.tie ? 'Labor and capital do the same job and cost the same, so every bundle on the isoquant costs the same: any point on it is cheapest.' : 'Labor and capital do the same job, so the firm uses only the cheaper one, ' + (p.w < p.v ? 'labor at ' + money(p.w) : 'capital at ' + money(p.v)) + ': a corner solution.') :
        'The inputs only work in a 1:1 ratio, so the cheapest bundle is the corner of the L-shaped isoquant, L = K = ' + num(p.q0) + '; extra of either input adds nothing.';
      return {
        rows: [['Bundle (L, K)', g.b ? pt(gb.x, gb.y, 1) : '', s.tie ? 'any with L + K = ' + num(p.q0) : pt(s.L, s.K, 2)], ['Total cost of ' + num(p.q0), money(g.tc), money(s.TC)], ['TC curve', '', tcEq(p)]],
        why: how + ' Its cost is wL + vK = ' + money(p.w) + ' &times; ' + num(s.L, 2) + ' + ' + money(p.v) + ' &times; ' + num(s.K, 2) + ' = <b>' + money(s.TC) + '</b>. Doing the same at every output traces the TC curve; with constant returns and no fixed cost it is a straight line, <b>' + tcEq(p) + '</b>.'
      };
    },
    explore: {
      init: function (f) { f.ex.q = f.p.q0; },
      hint: 'Drag the black point along the TC line (or use the arrow keys): the top panel shows the isoquant and the cheapest bundle for that output. Switch the production function to compare.',
      controls: [{ kind: 'seg', label: 'Production function', options: [['cd', '&radic;(KL)'], ['subs', 'L + K'], ['comp', 'min(L, K)']],
        get: function (f) { return f.p.form; }, set: function (f, v) { f.p.form = v; f.dom = M.deriv.domain(f.p); } }],
      readout: function (f) {
        var p = f.p, q = f.ex.q, be = M.deriv.bundle(p, q);
        return 'q = ' + num(q, 2) + ': cheapest bundle ' + (be.tie ? 'any with L + K = ' + num(q, 2) : 'L = <b>' + num(be.L, 2) + '</b>, K = <b>' + num(be.K, 2) + '</b>') + ', TC = ' + money(p.w) + ' &times; ' + num(be.L, 2) + ' + ' + money(p.v) + ' &times; ' + num(be.K, 2) + ' = <b class="c-green">' + money(be.TC) + '</b>. ' + Kit.rich(tcEq(p)) + '.';
      }
    }
  };

  /* =====================================================================
     6.5  Short-run cost curves
     ===================================================================== */
  var SMC = C.orange, SMCT = C.tOrange, ATC = C.blue, ATCT = C.tBlue, AVC = C.green, AVCT = C.tGreen, AFC = C.soft;
  var f65 = {
    key: 'f65', num: '6.5', topic: 'Short-run cost curves', short: 'SR cost curves', model: M.srcost, axes: AXQ, aspect: 0.8,
    question: function (f) { return 'Total fixed cost ' + (f.p.F1 > f.p.F0 ? 'rises' : 'falls') + ' from ' + money(f.p.F0) + ' to ' + money(f.p.F1) + '. Where is the new minimum of ATC?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Short-run total cost is <b>TC = TFC + q<sup>2</sup></b>, so SMC = 2q, AVC = q, AFC = TFC/q and ATC = AVC + AFC = q + TFC/q. Right now TFC = ' + money(p.F0) + ' and ATC bottoms out at <b>' + money(s.a0) + '</b>, at q = ' + num(s.q0, 2) + '.';
    },
    steps: [{ kind: 'place', key: 'pt', snap: 0.1, label: 'The new minimum of ATC', prompt: 'Tap where the lowest point of the new ATC curve will be. Drag it to adjust.',
      kstart: function (f) { return { x: f.sol.q0, y: f.sol.a0 }; },
      check: function (f) { return f.g.pt && Math.hypot(f.g.pt.x - f.sol.q0, f.g.pt.y - f.sol.a0) < 0.2 ? 'That is the old minimum. Where does it go?' : true; } }],
    initGuess: function () { return { pt: null }; },
    handles: function (f, S) {
      if (!f.exploring) return [];
      var q = Math.sqrt(f.p.F1);
      return [{ x: q, y: 2 * q, c: C.blue, active: true,
        set: function (f, X, Y) { var x = nearX(f.S, function (t) { return 2 * t; }, 2, 15, X, Y); if (x != null) f.p.F1 = Math.pow(clamp(Math.round(x * 2) / 2, 2.5, 14), 2); },
        key: function (f, dx, dy) { f.p.F1 = Math.pow(clamp(Math.sqrt(f.p.F1) + 0.5 * (dx + dy), 2.5, 14), 2); f.ex.touched = true; f.resolve(); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, mv = f.t('move'), lb = f.t('lab');
      var F = f.predicting ? p.F0 : f.exploring ? p.F1 : lerp(p.F0, p.F1, mv);
      var lo = 0.2;
      // AFC and ATC at the current TFC; the old ATC stays as a faint dashed ghost once it moves
      if (!f.predicting && mv > 0) D.fn(function (q) { return M.srcost.ATC(p.F0, q); }, lo, S.X, { c: ATC, w: 2.5, dash: '6 7', op: 0.45, layer: 'under', reg: false });
      D.fn(function (q) { return M.srcost.AFC(F, q); }, lo, S.X, { c: AFC, w: 3, dash: '7 6', pr: b });
      D.fn(function (q) { return q; }, 0, S.X, { c: AVC, w: 4, pr: b });
      D.fn(function (q) { return 2 * q; }, 0, S.X, { c: SMC, w: 4.5, pr: b });
      D.fn(function (q) { return M.srcost.ATC(F, q); }, lo, S.X, { c: ATC, w: 5.5, pr: b });
      if (b > 0.9) {
        D.label('SMC = 2q', D.along(function (q) { return 2 * q; }, [0.24, 0.3, 0.19, 0.36].map(function (t) { return t * S.X; }), 12, 'aboveOnly').filter(function (c) { return c.anchor === 'end'; }), { c: SMCT, size: S.fs, prio: 0 });
        D.curveLabel('AVC = q', function (q) { return q; }, [0.9, 0.8, 0.95], { c: AVCT, pref: 'below' });
        D.curveLabel(f.truth && mv >= 1 ? 'ATC, TFC ' + money(p.F1) : 'ATC', function (q) { return M.srcost.ATC(F, q); }, [0.94, 0.86, 0.97], { c: ATCT });
        var aq = clamp(F / (0.75 * S.Y), 1.2, 6);
        D.label('AFC', D.around(aq, M.srcost.AFC(F, aq), 10).slice(0, 4), { c: AFC, size: S.fs });
      }
      var q0 = Math.sqrt(F);
      if (f.predicting) {
        D.dot(s.q0, s.a0, { c: ATC, r: 9, pr: b });
        if (b > 0.5) D.near(s.q0, s.a0, 'min ATC ' + money(s.a0), { c: ATCT, d: 20, size: S.ls, prio: 0 });
        if (g.pt) { D.drop(g.pt.x, g.pt.y, { c: PLUM, op: 0.5 }); D.label('you: q ' + num(g.pt.x, 1) + ', ' + money(g.pt.y), [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }], { c: PLUM, fixed: true, prio: 0, size: S.ls }); }
        return;
      }
      if (f.ghostOn() && g.pt) { D.ghost(g.pt.x, g.pt.y, { op: f.gOp() }); youTag(f, D, g.pt.x, g.pt.y); }
      if (!f.exploring) {
        D.dot(s.q0, s.a0, { c: C.grey, r: 7, op: mv > 0 ? 0.7 : 1 });
        // the minimum rides along SMC as TFC changes: (sqrt F, 2 sqrt F) is always on SMC = 2q
        D.dot(q0, 2 * q0, { c: ATC, r: 11 });
      }
      if (lb > 0 || f.exploring) {
        var o = f.exploring ? 1 : lb, qn = f.exploring ? Math.sqrt(p.F1) : s.q1;
        D.drop(qn, 2 * qn, { op: o });
        if (f.exploring) D.dot(qn, 2 * qn, { c: ATC, r: 9 });
        D.near(qn, 2 * qn, 'min ATC ' + money(2 * qn) + ' at q = ' + num(qn, 2), { c: ATCT, op: o, d: 24, prio: 0, ring: 120, size: S.ls });
        if (!f.exploring) D.label('SMC and AVC did not move', [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.soft, op: o, prio: 0, size: S.ss });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['move', 350, 1800], ['lab', 2200, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gp = g.pt || { x: NaN, y: NaN };
      return {
        rows: [['Output at min ATC', g.pt ? num(gp.x, 1) : '', num(s.q1, 2)], ['Lowest ATC', g.pt ? money(gp.y) : '', money(s.a1)], ['SMC, AVC', '', 'unchanged']],
        why: 'Fixed cost is not part of SMC = 2q or AVC = q, so those curves stay put; only AFC = TFC/q and ATC ' + (s.up ? 'rise' : 'fall') + '. SMC always crosses ATC at its minimum: q + ' + num(p.F1) + '/q = 2q gives q = &radic;' + num(p.F1) + ' = <b>' + num(s.q1, 2) + '</b> and ATC = <b>' + money(s.a1) +
          '</b>. So the minimum slides ' + (s.up ? 'up and to the right' : 'down and to the left') + ' along the SMC line, from ' + pt(s.q0, s.a0, 2) + ' to ' + pt(s.q1, s.a1, 2) + '.'
      };
    },
    explore: {
      hint: 'Drag the blue dot along SMC: that sets TFC (TFC = q<sup>2</sup> at the minimum). Watch ATC and AFC move while SMC and AVC stay still.',
      controls: [],
      readout: function (f) {
        var F = f.p.F1, q = Math.sqrt(F);
        return 'TFC = <b>' + money(F) + '</b>: ATC is lowest at q = <b>' + num(q, 2) + '</b>, where ATC = SMC = <b>' + money(2 * q) + '</b> (AVC ' + money(q) + ' + AFC ' + money(F / q) + ').';
      }
    }
  };

  /* =====================================================================
     6.6  The LRAC envelope (has a film)
     ===================================================================== */
  var LR = C.blue, LRT = C.tBlue;
  function envPts(p, X, n, upto) {
    var out = [], s = M.env.solve(p), a = s.qa, N = 240, end = upto == null ? X : upto;
    for (var i = 0; i <= N; i++) { var q = a + (X - a) * i / N; if (q > end + 1e-9) break; out.push([q, M.env.at(p, q, n)]); }
    if (upto != null && out.length && out[out.length - 1][0] < end) out.push([end, M.env.at(p, end, n)]);
    return out;
  }
  var f66 = {
    key: 'f66', num: '6.6', topic: 'Long-run average cost', short: 'LRAC envelope', model: M.env, axes: { xtitle: 'Output, q', ytitle: 'Average cost ($)' }, aspect: 0.8,
    film: { name: 'fig66-lrac-envelope', label: 'Animation: long-run average cost', title: 'Watch first, 50 seconds',
      caption: 'Six plant sizes give six U-shaped SRAC curves. As output grows, the marker always sits on the cheapest plant and traces the lower envelope: the LRAC. Then draw one yourself.' },
    question: function (f) { return 'Draw the long-run average cost curve when the firm can build any of these ' + f.p.n + ' plants.'; },
    setup: function (f) {
      var p = f.p;
      return 'Production is ' + CD + ' with w = ' + money(p.w) + ' and v = ' + money(p.v) + '. In the short run the plant size K is fixed, so each plant has its own U-shaped curve, <b>SRAC = ' + num(p.w) + 'q/K + ' + num(p.v) + 'K/q</b>. In the long run the firm picks the plant, K = 1 to ' + p.n + '.';
    },
    steps: [{ kind: 'draw', key: 'lrac', bins: 48, label: 'The LRAC curve', prompt: 'Draw it with your finger or mouse, across the whole graph. You can redraw any part.',
      kstart: function (f, x) { return x >= f.sol.qa ? f.sol.acmin * 1.15 : null; },
      check: function (f) { return f.coverage('lrac', f.sol.qa + 0.05 * f.dom.X, f.dom.X) >= 0.6 ? true : 'Keep going: draw across more of the graph.'; } }],
    kbdHint: 'Keyboard: arrow keys raise or lower a flat line across the graph, Enter accepts it.',
    initGuess: function () { return {}; },
    scoreInput: function (f) { return { drawn: f.drawn('lrac') }; },
    handles: function (f, S) {
      if (!f.exploring) return [];
      var p = f.p, q = f.ex.q, y = M.env.at(p, q, f.ex.n);
      return [{ x: q, y: y, c: C.ink, active: true, kstep: { x: 0.1, y: 0 },
        set: function (f, X, Y) { var x = nearX(f.S, function (t) { return M.env.at(f.p, t, f.ex.n); }, f.sol.qa, f.dom.X, X, Y); if (x != null) f.ex.q = clamp(Math.round(x * 10) / 10, Math.ceil(f.sol.qa * 10) / 10, f.dom.X); },
        key: function (f, dx, dy) { f.ex.q = clamp(Math.round((f.ex.q + 0.1 * (dx + dy)) * 10) / 10, Math.ceil(f.sol.qa * 10) / 10, f.dom.X); f.ex.touched = true; } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), n = f.exploring ? f.ex.n : p.n, tr = f.t('trace'), dm = f.t('mins'), fl = f.t('floor');
      var hot = f.revealing && tr > 0 && tr < 1 ? M.env.best(p, lerp(s.qa, S.X, tr), n) : f.exploring ? M.env.best(p, f.ex.q, n) : 0;
      for (var Kp = 1; Kp <= n; Kp++) {
        (function (Kp) {
          var fn = function (q) { return M.env.sr(p, Kp, q); }, on = Kp === hot;
          D.fn(fn, 0.05, S.X, { c: on ? ISO : SRF, w: on ? 4 : 3, pr: b, layer: 'under', reg: false });
          var qm = M.env.qmin(p, Kp);
          if (b > 0.9 && qm <= S.X) D.label(S.narrow ? '' + Kp : 'K=' + Kp, [{ x: S.x(qm), y: S.y(s.acmin) + 34, anchor: 'middle' }], { c: ISOT, fixed: true, prio: 0, size: S.narrow ? S.ss : S.ls });
        })(Kp);
      }
      if (b > 0.9) D.label(S.narrow ? 'SRAC' : 'SRAC curves', D.along(function (q) { return M.env.sr(p, 1, q); }, [0.55 * M.env.qmin(p, 1), 0.7 * M.env.qmin(p, 1)], 10), { c: ISOT, size: S.fs, ring: 120 });
      D.drawing('lrac');
      if (f.predicting) return;
      if (tr > 0) {
        var upto = f.revealing ? lerp(s.qa, S.X, tr) : S.X, pts = envPts(p, S.X, n, upto);
        D.path(pts, { c: LR, w: 6 });
        if (f.revealing && tr < 1) { var e = pts[pts.length - 1]; D.dot(e[0], e[1], { c: LR, r: 10 }); }
        if (tr >= 1 || f.exploring) D.pathLabel('LRAC', envPts(p, S.X, n), [0.92, 0.85, 0.97], { c: LRT, prio: 0 });
      }
      if (dm > 0) for (var k = 1; k <= n; k++) { var qm2 = M.env.qmin(p, k); if (qm2 <= S.X) D.dot(qm2, s.acmin, { c: LR, r: 7, pr: seg(dm, (k - 1) / (n + 1), (k + 1) / (n + 1)) }); }
      if (fl > 0) {
        D.line(0, s.acmin, S.X, s.acmin, { c: LR, w: 2.5, dash: '7 6', op: 0.8 * fl, layer: 'under', reg: false });
        D.label((S.narrow ? 'any plant: ' : 'any plant size: LRAC = ') + money(s.acmin), [{ x: S.x1 - 6, y: S.y(s.acmin) + 62, anchor: 'end' }, { x: S.x1 - 6, y: S.y(s.acmin) - 12, anchor: 'end' }], { c: LRT, op: fl, prio: 0, size: S.ls });
      }
      if (f.exploring) {
        var q = f.ex.q, kb = M.env.best(p, q, n), ac = M.env.at(p, q, n);
        D.drop(q, ac, { x: true, y: false });
        D.near(q, ac, 'K=' + kb + ': ' + money(ac), { c: C.ink, d: 24, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['trace', 350, 2600, 'linear'], ['mins', 3000, 700], ['floor', 3600, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, r = f.result || {}, d = f.dom, mine = null, dr = f.drawn('lrac');
      for (var i = dr.length - 1; i >= 0; i--) if (dr[i] && dr[i].x >= d.X * 0.9) { mine = dr[i].y; break; }
      var rows = [['Typical miss', r.err == null ? '' : money(r.err * d.Y), 'on the envelope'], ['LRAC at q = ' + num(d.X), mine == null ? '' : money(mine), money(s.atX)], ['Lowest possible AC', '', money(s.acmin)]];
      var mins = []; for (var k = 1; k <= Math.min(p.n, 3); k++) mins.push(num(M.env.qmin(p, k), 2));
      return { rows: rows,
        why: 'At each output the long-run firm builds whichever plant is cheapest, so the LRAC is the <b>lower envelope</b> of the SRAC curves: it never lies above any of them. Every plant here bottoms out at the same 2&radic;(wv) = <b>' + money(s.acmin) + '</b> (at q = ' + mins.join(', ') + (p.n > 3 ? ', ...' : '') +
          '): constant returns to scale. Between those minima the envelope bumps up a little, and past the biggest plant (K = ' + p.n + ', best at q = ' + num(s.qn, 2) + ') it rises along that plant\'s SRAC, to ' + money(s.atX) + ' at q = ' + num(d.X) + '. Allow every plant size and the bumps vanish: LRAC is flat at ' + money(s.acmin) + '.' };
    },
    explore: {
      init: function (f) { f.ex.n = f.p.n; f.ex.q = Math.round(Math.min(f.dom.X * 0.8, M.env.qmin(f.p, f.p.n) * 1.3) * 10) / 10; },
      hint: 'Add or remove plant sizes, and drag the black point along the LRAC to see which plant is cheapest at each output.',
      controls: [{ kind: 'stepper', label: 'Plant sizes', get: function (f) { return f.ex.n; }, set: function (f, v, fin) { f.ex.n = Math.round(v); }, step: 1, min: 1, max: 8, fmt: function (v) { return num(Math.round(v)); }, dur: 250 }],
      readout: function (f) {
        var p = f.p, q = f.ex.q, n = f.ex.n, kb = M.env.best(p, q, n), ac = M.env.at(p, q, n), s = f.sol;
        return 'At q = ' + num(q, 2) + ' the cheapest of ' + n + ' plant' + (n === 1 ? '' : 's') + ' is <b>K = ' + kb + '</b>: AC <b>' + money(ac) + '</b>, ' + (ac - s.acmin < 0.005 ? 'right at the floor.' : money(ac - s.acmin) + ' above the ' + money(s.acmin) + ' floor.');
      }
    }
  };

  /* =====================================================================
     6.8  A minimum wage rise and automation
     ===================================================================== */
  var f68 = {
    key: 'f68', num: '6.8', topic: 'Minimum wage and automation', short: 'Minimum wage', model: M.minwage, axes: AXLK, aspect: 0.86,
    question: function (f) { return 'The minimum wage rises from ' + money(f.p.w0) + ' to ' + money(f.p.w1) + '. Where does the firm produce now, and what does it cost?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'The firm makes q = ' + num(p.q) + ' with ' + CD + '. At w = ' + money(p.w0) + ' and v = ' + money(p.v) + ' its cheapest bundle is <b>L = ' + num(s.L0, 2) + ', K = ' + num(s.K0, 2) + '</b> on the grey isocost, costing ' + money(s.TC0) +
        '. The wage rises to <b>' + money(p.w1) + '</b>; capital still rents for ' + money(p.v) + '. Output stays at ' + num(p.q) + '.';
    },
    steps: [
      { kind: 'drag', label: 'The new cheapest bundle', prompt: 'Slide the plum point along the isoquant to the cheapest bundle at the new wage.',
        check: function (f) { return Math.abs(f.g.L - f.sol.L0) > 0.04 ? true : 'Slide it along the isoquant first.'; } },
      { kind: 'drag', label: 'The new isocost', prompt: function (f) { return 'The plum line has the new slope, -w/v = -' + num(f.p.w1 / f.p.v, 2) + '. Drag its end on the K axis until it is the cheapest isocost that still reaches the isoquant.'; },
        check: function (f) { return f.g.mk ? true : 'Drag the end of the plum line on the K axis first.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys slide the point along the isoquant, Enter confirms; then up and down arrows move the isocost, Enter confirms.',
    initGuess: function (f) { return { L: f.sol.L0, Ki: Math.round(f.sol.Kint0 * 4) / 4, mk: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g;
      if (f.predicting) {
        var hb = iqHandle(f, p.q, g.L, function (f, L) { f.g.L = L; }, { c: PLUM, step: 0, active: f.cur === 0 });
        var hk = { x: 0, y: g.Ki, c: PLUM, grip: 'v', step: 1, active: f.cur === 1, snap: { x: 0, y: 0.25 }, kstep: { x: 0, y: 0.25 },
          hit: function (pt) { return Math.abs(pt.x - S.x0) < 30 ? Math.abs(pt.y - S.y(g.Ki)) : 1e9; },
          set: function (f, X, Y) { f.g.Ki = clamp(Y, 0.5, f.dom.Y); f.g.mk = true; } };
        // keyboard: the current step's handle first (kit focus quirk, see NOTES)
        if (f.cur >= 1 || f.done[1]) return f.cur === 1 ? [hk, hb] : [hb, hk];
        return [hb];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, iq = function (x) { return p.q * p.q / x; };
      var p0 = f.p0, s0 = M.minwage.solve(p0), rt = f.t('rot'), pu = f.t('push'), np = f.t('pt'), lb = f.t('lab');
      D.fn(iq, 0.05, S.X, { c: IQ, w: 5, pr: b });
      if (b > 0.9) D.curveLabel('isoquant q = ' + num(p.q), iq, [0.88, 0.8, 0.94], { c: IQT });
      var so = isoSeg(p0.w0, p0.v, s0.TC0, S.X, S.Y);
      if (so) {
        D.line(so[0][0], so[0][1], so[1][0], so[1][1], { c: C.grey, w: 3, dash: '7 6', pr: b, layer: 'under' });
        if (b > 0.9) D.label('old: w ' + money(p0.w0) + ', TC ' + money(s0.TC0), D.around(lerp(so[0][0], so[1][0], 0.8), lerp(so[0][1], so[1][1], 0.8), 8).slice(0, 8), { c: C.soft, size: S.ss });
      }
      D.dot(s0.L0, s0.K0, { c: C.ink, r: 8, pr: b, op: f.exploring ? 0.6 : 1 });
      if (b > 0.5 && !f.exploring) D.near(s.L0, s.K0, 'old ' + pt(s.L0, s.K0, 2), { c: C.ink, d: 18, size: S.ss, ring: 70 });
      if (f.predicting) {
        var gK = iq(g.L);
        if (Math.abs(g.L - s.L0) > 0.04) { D.drop(g.L, gK, { c: PLUM, op: 0.5 }); D.near(g.L, gK, pt(g.L, gK, 2), { c: PLUM, d: 22, size: S.ls }); }
        if (f.cur >= 1 || f.done[1]) {
          var sg = isoSeg(p.w1, p.v, g.Ki * p.v, S.X, S.Y);
          if (sg) D.line(sg[0][0], sg[0][1], sg[1][0], sg[1][1], { c: PLUM, w: 4, layer: 'over' });
          D.label('costs ' + money(g.Ki * p.v), [{ x: S.x0 + 26, y: S.y(g.Ki) - 10, anchor: 'start' }, { x: S.x0 + 26, y: S.y(g.Ki) + 26, anchor: 'start' }], { c: PLUM, prio: 0, size: S.ls });
        }
        return;
      }
      if (f.ghostOn()) {
        var gk = iq(g.L); D.ghost(g.L, gk, { op: f.gOp() }); youTag(f, D, g.L, gk);
        var gs = isoSeg(p.w1, p.v, g.Ki * p.v, S.X, S.Y);
        if (gs) D.line(gs[0][0], gs[0][1], gs[1][0], gs[1][1], { c: PLUM, w: 3, dash: '5 6', op: 0.8 * f.gOp(), layer: 'under', reg: false });
      }
      if (f.exploring) {
        var se = isoSeg(p.w1, p.v, s.TC1, S.X, S.Y);
        if (se) D.line(se[0][0], se[0][1], se[1][0], se[1][1], { c: ISO, w: 4.5 });
      } else if (rt > 0) {
        // first the wage turns the old budget steeper (same $ spent), then the line shifts out to touch the isoquant
        var w = lerp(p.w0, p.w1, rt), c = pu > 0 ? lerp(s.TC0, s.TC1, pu) : s.TC0, sr = isoSeg(w, p.v, c, S.X, S.Y);
        if (sr) D.line(sr[0][0], sr[0][1], sr[1][0], sr[1][1], { c: ISO, w: 4.5 });
        if (rt >= 1 && pu <= 0.02 && sr) D.label(money(s.TC0) + ' no longer reaches it', D.around(lerp(sr[0][0], sr[1][0], 0.3), lerp(sr[0][1], sr[1][1], 0.3), 8).slice(4, 8), { c: ISOT, size: S.ss, prio: 0 });
      }
      if (np > 0 || f.exploring) {
        var o = f.exploring ? 1 : np;
        D.arrow(s0.L0, s0.K0, lerp(s0.L0, s.L1, 0.82), lerp(s0.K0, s.K1, 0.82), { c: OPT, w: 3, op: 0.75 * o });
        D.dot(s.L1, s.K1, { c: OPT, r: 11, pr: f.exploring ? 1 : np });
        D.drop(s.L1, s.K1, { op: o });
        D.near(s.L1, s.K1, 'new ' + pt(s.L1, s.K1, 2), { c: OPTT, op: o, d: 22, prio: 0, ring: 100 });
      }
      if (lb > 0 || f.exploring) {
        var o2 = f.exploring ? 1 : lb, sl = isoSeg(p.w1, p.v, s.TC1, S.X, S.Y);
        if (sl) D.label('TC ' + money(s.TC1), [{ x: S.x0 + 26, y: S.y(sl[0][1]) + 6, anchor: 'start' }, { x: S.x0 + 26, y: S.y(sl[0][1]) + 30, anchor: 'start' }], { c: ISOT, op: o2, prio: 0 });
        D.label('K/L: ' + num(s0.kl0, 2) + ' to ' + num(s.kl1, 2), [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.ink, op: o2, prio: 0, size: S.ls });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['rot', 300, 1100], ['push', 1700, 1100], ['pt', 2700, 600], ['lab', 3100, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gK = p.q * p.q / g.L;
      return {
        rows: [['Labor L', num(g.L, 2), num(s.L1, 2)], ['Capital K', num(gK, 2), num(s.K1, 2)], ['Total cost', money(g.Ki * p.v), money(s.TC1)], ['K/L', num(gK / g.L, 2), num(s.kl0, 2) + ' to ' + num(s.kl1, 2)]],
        why: 'Labor is now relatively dearer, so the isocost line is steeper (w/v = ' + num(p.w1 / p.v, 2) + ' instead of ' + num(p.w0 / p.v, 2) + ') and the tangency slides up the isoquant: the firm swaps workers for machines. MRTS = K/L = w/v gives L = ' + num(p.q) + '&radic;(' + num(p.v) + '/' + num(p.w1) +
          ') = <b>' + num(s.L1, 2) + '</b> and K = <b>' + num(s.K1, 2) + '</b>. Making the same output now costs ' + money(p.w1) + ' &times; ' + num(s.L1, 2) + ' + ' + money(p.v) + ' &times; ' + num(s.K1, 2) + ' = <b>' + money(s.TC1) + '</b>, up from ' + money(s.TC0) + ', even after the switch.'
      };
    },
    explore: {
      hint: 'Change the wage or the price of capital. The orange isocost and the green bundle follow; the grey line and black dot stay at the old prices.',
      controls: function (f) {
        var fit = function (p) { var D = M.minwage.domain(p).X, a = 0.92 * D / (2 * p.q), b2 = 0.92 * D / p.q; return { a: a, b: b2 }; };
        return [
          { kind: 'stepper', label: 'Minimum wage w', get: function (f) { return f.p.w1; }, set: function (f, v) { f.p.w1 = v; }, step: 1, fmt: money, dur: 350,
            get min() { var r = fit(f.p); return Math.max(1, Math.ceil(f.p.v / (r.b * r.b) - 1e-9)); },
            get max() { var r = fit(f.p); return Math.min(16, Math.floor(f.p.v * r.a * r.a + 1e-9)); } },
          { kind: 'stepper', label: 'Rental rate v', get: function (f) { return f.p.v; }, set: function (f, v) { f.p.v = v; }, step: 1, fmt: money, dur: 350,
            get min() { var r = fit(f.p); return Math.max(1, Math.ceil(f.p.w1 / (r.a * r.a) - 1e-9)); },
            get max() { var r = fit(f.p); return Math.min(12, Math.floor(f.p.w1 * r.b * r.b + 1e-9)); } }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, base = M.minwage.solve({ w0: f.p0.w0, w1: f.p0.w0, v: f.p0.v, q: p.q });
        return 'At w = ' + money(p.w1) + ', v = ' + money(p.v) + ': L = <b>' + num(s.L1, 2) + '</b>, K = <b>' + num(s.K1, 2) + '</b>, K/L = <b>' + num(s.kl1, 2) + '</b>, TC = <b>' + money(s.TC1) + '</b>. The old prices (w ' + money(f.p0.w0) + ', v ' + money(f.p0.v) + ') gave K/L ' + num(base.kl0, 2) + ' and TC ' + money(base.TC0) + '.';
      }
    }
  };

  /* =====================================================================
     6.10  Efficient scale
     ===================================================================== */
  function coef(v, first) { var a = Math.abs(v), s = a === 1 ? '' : num(a, 2); return (first ? (v < 0 ? '-' : '') : (v < 0 ? ' - ' : ' + ')) + s; }
  function acTxt(p, html) {
    var t = [], sq = html ? '<sup>2</sup>' : '²';
    if (p.a2) t.push(coef(p.a2, !t.length) + 'q' + sq);
    if (p.a1) t.push(coef(p.a1, !t.length) + 'q');
    if (p.a0) t.push((t.length ? ' + ' : '') + num(p.a0, 2));
    if (p.F) t.push((t.length ? ' + ' : '') + num(p.F, 2) + '/q');
    return 'AC = ' + t.join('');
  }
  function polyTxt(lhs, terms, html) {   // terms: [[coef, power]]
    var t = [];
    terms.forEach(function (c) { if (!c[0]) return; var pw = c[1] === 0 ? '' : c[1] === 1 ? 'q' : 'q' + (html ? '<sup>' + c[1] + '</sup>' : (c[1] === 2 ? '²' : '³'));
      var a = Math.abs(c[0]), s = a === 1 && c[1] ? '' : num(a, 2); t.push((t.length ? (c[0] < 0 ? ' - ' : ' + ') : (c[0] < 0 ? '-' : '')) + s + pw); });
    return lhs + ' = ' + (t.length ? t.join('') : '0');
  }
  function tcTxt(p, html) { return polyTxt('TC', [[p.a2, 3], [p.a1, 2], [p.a0, 1], [p.F, 0]], html); }
  function mcTxt(p, html) { return polyTxt('MC', [[3 * p.a2, 2], [2 * p.a1, 1], [p.a0, 0]], html); }
  var MCC = C.orange, MCT = C.tOrange;
  function acLo(p, S) { var lo = 0.04 * S.X; while (M.scale.AC(p, lo) > 3 * S.Y && lo < S.X) lo += 0.01 * S.X; return lo; }
  var f610 = {
    key: 'f610', num: '6.10', topic: 'Efficient scale', short: 'Efficient scale', model: M.scale, axes: AXQ, aspect: 0.8,
    question: 'Where is this firm\'s efficient scale?',
    setup: function (f) {
      var p = f.p, c = M.scale.preset(p.key);
      return (c ? c.name.split(':')[0] + ': ' : '') + '<b>' + acTxt(p, true) + '</b>, from ' + tcTxt(p, true) + '. The efficient scale is the output where average cost is lowest.';
    },
    steps: [{ kind: 'drag', label: 'The efficient scale', prompt: 'Slide the plum point along the AC curve to the output where a unit is cheapest to make.',
      check: function (f) { return Math.abs(f.g.q - f.sol.start) > 0.05 ? true : 'Slide it along the curve first.'; } }],
    kbdHint: 'Keyboard: arrow keys slide the point along the curve (Shift for bigger steps), Enter confirms.',
    initGuess: function (f) { return { q: f.sol.start }; },
    handles: function (f, S) {
      var p = f.p, lo = acLo(p, S), ac = function (q) { return M.scale.AC(p, q); };
      var mk = function (q, put, o) {
        return { x: q, y: ac(q), c: o.c, step: o.step, active: o.active, kstep: { x: 0.1, y: 0 },
          set: function (f, X, Y) { var x = nearX(f.S, ac, lo, 0.98 * f.S.X, X, Y); if (x != null) put(f, clamp(Math.round(x * 10) / 10, Math.ceil(lo * 10) / 10, 0.98 * f.S.X)); },
          key: function (f, dx, dy) { put(f, clamp(Math.round((q + (S.X / 100) * (dx + dy)) * 10) / 10, Math.ceil(lo * 10) / 10, 0.98 * f.S.X)); if (f.exploring) f.ex.touched = true; } };
      };
      if (f.predicting) return [mk(f.g.q, function (f, q) { f.g.q = q; }, { c: PLUM, step: 0, active: !f.done[0] })];
      if (f.exploring) return [mk(f.ex.q, function (f, q) { f.ex.q = q; }, { c: C.ink, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, ac = function (q) { return M.scale.AC(p, q); }, mc = function (q) { return M.scale.MC(p, q); };
      var lo = acLo(p, S), sh = f.t('shade'), mt = f.t('mc'), pk = f.t('pt'), lb = f.t('lab');
      if (sh > 0) {
        var left = [], right = [], N = 80, qs = s.qs;
        var a = lo, z = S.X, cut = qs == null ? (s.kind === 'falling' ? z : a) : qs;
        for (var i = 0; i <= N; i++) { var q = a + (cut - a) * i / N; left.push([q, Math.min(ac(q), S.Y)]); }
        for (var j = 0; j <= N; j++) { var q2 = cut + (z - cut) * j / N; right.push([q2, Math.min(ac(q2), S.Y)]); }
        if (s.kind !== 'flat') {
          if (cut > a + 1e-9) D.area([[a, 0]].concat(left, [[cut, 0]]), { fill: C.green, fo: 0.16, op: sh });
          if (z > cut + 1e-9) D.area([[cut, 0]].concat(right, [[z, 0]]), { fill: C.red, fo: 0.13, op: sh });
          var yl = Math.min(S.Y * 0.18, (s.acmin || ac(S.X * 0.5)) * 0.4);
          if (cut - a > S.X * 0.25) D.label(S.narrow ? 'economies' : 'economies of scale', [{ x: S.x((a + cut) / 2), y: S.y(yl), anchor: 'middle' }], { c: C.tGreen, op: sh, size: S.ss, ring: 30 });
          if (z - cut > S.X * 0.25) D.label(S.narrow ? 'diseconomies' : 'diseconomies of scale', [{ x: S.x((cut + z) / 2), y: S.y(yl), anchor: 'middle' }], { c: C.tRed, op: sh, size: S.ss, ring: 30 });
        }
      }
      D.fn(ac, lo, S.X, { c: C.blue, w: 5.5, pr: b });
      if (b > 0.9) D.curveLabel('AC', ac, [0.95, 0.9, 0.85], { c: C.tBlue });
      if (f.predicting) {
        D.drop(g.q, ac(g.q), { c: PLUM, op: 0.5, y: false });
        D.near(g.q, ac(g.q), 'q = ' + num(g.q, 1), { c: PLUM, d: 22, size: S.ls });
        return;
      }
      if (mt > 0) {
        D.fn(mc, 0.02, S.X, { c: MCC, w: 4.5, pr: mt });
        if (mt > 0.9) D.curveLabel('MC', mc, [0.86, 0.8, 0.92, 0.7], { c: MCT, op: seg(mt, 0.9, 1) });
      }
      if (f.ghostOn()) { D.ghost(g.q, ac(g.q), { op: f.gOp() }); youTag(f, D, g.q, ac(g.q)); }
      if (pk > 0 && s.qs != null) {
        D.drop(s.qs, s.acmin, { pr: pk });
        D.dot(s.qs, s.acmin, { c: C.ink, r: 11, pr: pk });
        D.near(s.qs, s.acmin, 'q* = ' + num(s.qs, 2) + ', AC = ' + money(s.acmin), { c: C.ink, op: lb, d: 24, prio: 0, ring: 110, size: S.ls });
      }
      if (lb > 0 && s.qs != null && !S.narrow) D.label('MC = AC at the minimum', [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.soft, op: lb, prio: 0, size: S.ss });
      if (s.qs == null && f.exploring) D.label(s.kind === 'falling' ? 'AC falls forever: no efficient scale' : s.kind === 'rising' ? 'AC rises from the start' : 'every output is equally efficient', [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }], { c: C.soft, prio: 0, fixed: true, size: S.ss });
      if (f.exploring) {
        var q = f.ex.q;
        D.drop(q, ac(q), { y: false });
        if ((s.qs == null || Math.abs(q - s.qs) > S.X * 0.04) && !f.ghostOn()) D.near(q, ac(q), 'AC ' + money(ac(q)) + ', MC ' + money(mc(q)), { c: C.ink, d: 22, prio: 0, ring: 110, size: S.ss });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['mc', 300, 1100], ['pt', 1300, 600], ['shade', 1700, 600], ['lab', 2000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Efficient scale q*', num(g.q, 1), num(s.qs, 2)], ['AC there', money(M.scale.AC(p, g.q)), money(s.acmin)]],
        why: 'AC falls while MC is below it and rises once MC is above it, so the lowest point is where they cross. Here ' + mcTxt(p, true) + '; setting MC = AC (or dAC/dq = 0) gives <b>q* = ' + num(s.qs, 2) + '</b>, where a unit costs <b>' + money(s.acmin) +
          '</b>. Below q* the firm has economies of scale (green), above it diseconomies (red).'
      };
    },
    explore: {
      init: function (f) { f.ex.q = Math.round(f.sol.qs * 0.6 * 10) / 10; },
      hint: 'Drag the black point along AC and compare MC with AC: below AC it pulls AC down, above it pulls AC up. Try other cost functions from the page.',
      controls: [{ kind: 'seg', label: 'Average cost', options: ['classic', 'flat', 'steep', 'fixed', 'cubic', 'tb', 'econ', 'dis'].map(function (k) { return [k, M.scale.preset(k).short]; }),
        get: function (f) { return f.p.key; },
        set: function (f, v) { f.p = M.scale.of(v); f.dom = M.scale.domain(f.p); var s = M.scale.solve(f.p); f.ex.q = Math.round((s.qs != null ? s.qs * 0.6 : f.dom.X * 0.5) * 10) / 10; } }],
      readout: function (f) {
        var p = f.p, s = f.sol, q = f.ex.q, a = M.scale.AC(p, q), m = M.scale.MC(p, q);
        var where = s.qs == null ? (s.kind === 'falling' ? 'AC falls at every output (economies of scale throughout).' : s.kind === 'rising' ? 'AC rises at every output (diseconomies throughout).' : 'AC is flat: every output is equally efficient.') :
          'Efficient scale q* = <b>' + num(s.qs, 2) + '</b>, min AC <b>' + money(s.acmin) + '</b>.';
        return Kit.rich(acTxt(p, true)) + '. At q = ' + num(q, 2) + ': AC ' + money(a) + ', MC ' + money(m) + (Math.abs(m - a) < 0.005 ? ' (equal).' : m < a ? ' (MC below AC: AC falling).' : ' (MC above AC: AC rising).') + ' ' + where;
      }
    }
  };

  window.W6FIGS = [f61, f62, f65, f66, f68, f610];
})();
