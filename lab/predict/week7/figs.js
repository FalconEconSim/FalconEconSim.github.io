/* Week 7 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow the fig75 / fig79 films: SMC and supply orange, SAC purple, SAVC gold, demand blue,
 * TR blue, TC orange, profit green, loss red, long-run supply gold. Plum always means "you".
 * 7.7 and 7.9 draw several panels inside the kit's one frame: panels() splits a 0..100 data space
 * side by side on wide screens and stacked on phones, and each panel maps its own units into it. */
(function () {
  'use strict';
  var C = Kit.C, K = Kit.K, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg;
  var M = window.W7, F = M.firm, PLUM = C.plum;
  var SMC = C.orange, SMCT = C.tOrange, SAC = C.purple, SACT = C.tPurple, SAVC = C.gold, SAVCT = C.tGold;
  var DEM = C.blue, DEMT = C.tBlue, GAIN = C.green, GAINT = C.tGreen, LOSS = C.red, LOSST = C.tRed;
  var AXQ = { xtitle: 'Quantity, q', ytitle: '$ per unit' };

  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  function smcEq(p) { return 'q<sup>2</sup> - 4q + ' + num(p.c); }
  function savcEq(p) { return 'q<sup>2</sup>/3 - 2q + ' + num(p.c); }
  function sign$(v) { return (v < -0.004 ? '-' : '') + money(Math.abs(v)); }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // Kit quirk workaround: after Enter completes a step the kit keeps keyboard focus on the handle that was
  // just used (kpick), so arrows would keep moving it instead of the next step's handle. A passing check
  // drops the pick when Enter confirmed it (index.html notes the last key), and the kit's keyHandle()
  // then falls back to the active (next) handle. Arrow presses also complete steps, so they keep the pick.
  function adv(f, ok) { if (ok === true && f._enter) f.kpick = false; return ok; }
  // the largest q (scanning down from the right edge) where a curve is still inside the frame
  function endQ(fn, X, Y, frac) { for (var q = X * 0.96; q > 0.2; q -= X / 200) { var v = fn(q); if (isFinite(v) && v <= frac * Y && v >= 0) return q; } return X * 0.5; }
  function curveName(D, S, s, fn, c, fracY, o) {
    var q = endQ(fn, S.X, S.Y, fracY || 0.9), d = S.X / 40;
    D.label(s, D.along(fn, [q, q - d, q - 2 * d, q - 4 * d], 10, o && o.pref), Object.assign({ c: c, size: S.fs }, o || {}));
  }
  // label at the centre of a data rectangle if it fits there
  function inRect(D, S, s, x0, y0, x1, y1, o) {
    var w = Math.abs(S.x(x1) - S.x(x0)), h = Math.abs(S.y(y1) - S.y(y0)), size = (o && o.size) || S.ls;
    if (w < Kit.tw(s, size) + 12 || h < size + 6) return false;
    var cx = S.x((x0 + x1) / 2), cands = [0.5, 0.3, 0.7].map(function (t) { return { x: cx, y: S.y(lerp(y0, y1, t)) + size * 0.35, anchor: 'middle' }; });
    D.label(s, cands, Object.assign({ prio: 0, ring: 1 }, o || {}));
    return true;
  }
  // a handle on the price axis (data x = 0), dragged up and down
  function axisHandle(f, S, P, setP, o) {
    o = o || {};
    return { x: 0, y: P, c: o.c || C.ink, grip: 'v', snap: { x: 0, y: o.snap || 0.05 }, step: o.step, active: o.active, kstep: { x: 0, y: o.kstep || 0.1 },
      hit: function (pt) { return Math.abs(pt.x - S.x0) < 34 ? Math.abs(pt.y - S.y(P)) : 1e9; },
      set: function (f, X, Y) { setP(f, Y); } };
  }
  // a handle sliding along a horizontal line at price P
  function rowHandle(f, S, x, P, setX, o) {
    o = o || {};
    return { x: x, y: P, c: o.c || PLUM, grip: 'h', snap: { x: o.snap || 0.05, y: 0 }, step: o.step, active: o.active, kstep: { x: o.kstep || 0.05, y: 0 },
      hit: function (pt) { return Math.abs(pt.y - S.y(P)) < 30 ? Math.abs(pt.x - S.x(x)) : 1e9; },
      set: function (f, X) { setX(f, X); } };
  }
  // the cost curves of the course model; o: { smc, sac, savc, pr, op, names }
  function costCurves(D, S, p, o) {
    var b = o.pr == null ? 1 : o.pr, op = o.op == null ? 1 : o.op;
    var fsavc = function (q) { return F.savc(p, q); }, fsac = function (q) { return F.sac(p, q); }, fsmc = function (q) { return F.smc(p, q); };
    if (o.savc) D.fn(fsavc, 0.02, S.X, { c: SAVC, w: 4.5, pr: b, op: op });
    if (o.sac) D.fn(fsac, 0.25, S.X, { c: SAC, w: 4.5, pr: b, op: op });
    if (o.smc) D.fn(fsmc, 0.02, S.X, { c: SMC, w: 5, pr: b, op: op });
    if (b > 0.9 && o.names !== false) {
      if (o.smc) curveName(D, S, 'SMC', fsmc, SMCT, 0.92, { op: op });
      if (o.sac) curveName(D, S, 'SAC', fsac, SACT, 0.84, { op: op, pref: 'below' });
      if (o.savc) curveName(D, S, 'SAVC', fsavc, SAVCT, 0.7, { op: op, pref: 'below' });
    }
  }
  function priceLine(D, S, P, o) {
    o = o || {};
    D.line(0, P, S.X, P, { c: o.c || C.ink, w: o.w || 3, dash: o.dash || '10 7', pr: o.pr, op: o.op, layer: o.layer || 'curves' });
    if (o.label && (o.pr == null || o.pr > 0.6)) D.label(o.label, [{ x: S.x1 - 6, y: S.y(P) - 9, anchor: 'end' }, { x: S.x1 - 6, y: S.y(P) + 24, anchor: 'end' }], { c: o.tc || C.ink, size: S.ls, prio: 0, op: o.op });
  }

  /* =====================================================================
     Panels: several small graphs inside the kit's one frame (7.7, 7.9)
     ===================================================================== */
  // defs: [{ X, Y, w, h }] in each panel's own units; returns the panels with maps into the 0..100 data space
  function panels(S, defs, o) {
    o = o || {};
    var n = defs.length, out = [], W = S.x1 - S.x0, H = S.y0 - S.y1;
    if (!S.narrow) {
      var gap = o.gap || 78, ws = defs.reduce(function (a, d) { return a + (d.w || 1); }, 0), tot = W - gap * (n - 1), x = S.x0;
      defs.forEach(function (d) { var pw = tot * (d.w || 1) / ws; out.push(mk(d, x, x + pw, S.y0, S.y1 + (o.top || 0))); x += pw + gap; });
    } else {
      var gv = o.gapV || 100, hs = defs.reduce(function (a, d) { return a + (d.h || 1); }, 0), toth = H - gv * (n - 1), y = S.y1;
      defs.forEach(function (d) { var ph = toth * (d.h || 1) / hs; out.push(mk(d, S.x0, S.x1, y + ph, y)); y += ph + gv; });
    }
    function mk(d, px0, px1, py0, py1) {
      var x0 = S.ix(px0), x1 = S.ix(px1), y0 = S.iy(py0), y1 = S.iy(py1);
      var P = { X: d.X, Y: d.Y, x0: x0, x1: x1, y0: y0, y1: y1, px0: px0, px1: px1, py0: py0, py1: py1 };
      P.gx = function (v) { return x0 + v / d.X * (x1 - x0); };
      P.gy = function (v) { return y0 + v / d.Y * (y1 - y0); };
      P.lx = function (X) { return (X - x0) / (x1 - x0) * d.X; };
      P.ly = function (Y) { return (Y - y0) / (y1 - y0) * d.Y; };
      P.pt = function (q, v) { return [P.gx(q), P.gy(v)]; };
      P.sx = function (v) { return S.x(P.gx(v)); };
      P.sy = function (v) { return S.y(P.gy(v)); };
      return P;
    }
    return out;
  }
  // map local points into a panel; points outside it become gaps (edges interpolated so curves reach the frame)
  function pMap(P, pts) {
    var out = [], inside = function (p) { return p && isFinite(p[0]) && isFinite(p[1]) && p[0] >= -1e-9 && p[0] <= P.X + 1e-9 && p[1] >= -1e-9 && p[1] <= P.Y + 1e-9; };
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i];
      if (inside(a)) {
        var prev = pts[i - 1];
        if (i > 0 && prev && !inside(prev) && isFinite(prev[0]) && isFinite(prev[1])) out.push(edge(a, prev));
        out.push(P.pt(a[0], a[1]));
      } else {
        var pv = pts[i - 1];
        if (i > 0 && inside(pv) && a && isFinite(a[0]) && isFinite(a[1])) out.push(edge(pv, a));
        out.push(null);
      }
    }
    function edge(inn, outp) {   // walk from the inside point toward the outside one until the border
      var lo = 0, hi = 1;
      for (var k = 0; k < 30; k++) { var m = (lo + hi) / 2, q = [lerp(inn[0], outp[0], m), lerp(inn[1], outp[1], m)]; if (inside(q)) lo = m; else hi = m; }
      return P.pt(lerp(inn[0], outp[0], lo), lerp(inn[1], outp[1], lo));
    }
    return out;
  }
  function pFn(D, P, fn, a, b, o) { var pts = []; for (var i = 0, n = (o && o.n) || 160; i <= n; i++) { var x = a + (b - a) * i / n; pts.push([x, fn(x)]); } return D.path(pMap(P, pts), o || {}); }
  // a curve given as quantity at each price (supply, demand): x = fn(v) for v in [a, b]
  function pFnP(D, P, fn, a, b, o) { var pts = []; for (var i = 0, n = (o && o.n) || 160; i <= n; i++) { var v = a + (b - a) * i / n, x = fn(v); pts.push(x == null ? null : [x, v]); } return D.path(pMap(P, pts), o || {}); }
  function pLine(D, P, x1, y1, x2, y2, o) { return pFn(D, P, function (x) { return y1 + (y2 - y1) * (x - x1) / ((x2 - x1) || 1e-9); }, x1, x2, Object.assign({ n: 2 }, o || {})); }
  function pHLine(D, P, v, o) { o = o || {}; var a = P.pt(0, v), b = P.pt(lerp(0, P.X, o.pr == null ? 1 : o.pr), v); return D.line(a[0], a[1], b[0], b[1], Object.assign({ w: 3, dash: '10 7', c: C.ink }, o, { pr: 1 })); }
  function pVLine(D, P, x, v0, v1, o) { var a = P.pt(x, v0), b = P.pt(x, v1); return D.line(a[0], a[1], b[0], b[1], o || {}); }
  function pDot(D, P, x, v, o) { var a = P.pt(x, v); return D.dot(a[0], a[1], o || {}); }
  function pArea(D, P, pts, o) { return D.area(pts.map(function (q) { return P.pt(q[0], q[1]); }), o || {}); }
  function pNear(D, P, x, v, s, o) { var a = P.pt(x, v); return D.near(a[0], a[1], s, o || {}); }
  // a value label just inside the panel, right of its price axis
  function pYval(D, S, P, v, s, o) {
    o = o || {}; var size = o.size || S.ss, y = clamp(P.sy(v) + (o.dy == null ? -8 : o.dy), P.py1 + size, P.py0 - 6);
    return D.label(s, [{ x: P.px0 + 8, y: y, anchor: 'start' }, { x: P.px0 + 8, y: clamp(P.sy(v) + 22, P.py1 + size, P.py0 - 6), anchor: 'start' }], Object.assign({ prio: 0, size: size }, o));
  }
  // cover the kit's own axis lines (they would run across the gaps between panels)
  function hideKitAxes(D, S) {
    D.add('over', '<rect x="' + (S.x0 - 4) + '" y="' + (S.y0 - 3) + '" width="' + (S.x1 - S.x0 + 12) + '" height="6" fill="' + C.paper + '"/>' +
      '<rect x="' + (S.x0 - 3) + '" y="' + (S.y1 - 8) + '" width="6" height="' + (S.y0 - S.y1 + 11) + '" fill="' + C.paper + '"/>');
  }
  // a panel's axes: o = { title, xt, xs, ys, xfmt, yfmt, xskip }
  function pAxes(D, S, P, o) {
    var s = '', fs = S.narrow ? 15 : 16, x0 = P.px0, y0 = P.py0, x1 = P.px1, y1 = P.py1, v, k = 0;
    s += K.pline(x0, y0, x1 + 4, y0, { c: C.ink, w: 2.5, cap: 'square' }) + K.pline(x0, y0, x0, y1 - 4, { c: C.ink, w: 2.5, cap: 'square' });
    if (o.xs) for (v = o.xs; v <= P.X + 1e-9; v += o.xs) {
      var x = P.sx(v); k++;
      s += K.pline(x, y0, x, y0 + 6, { c: C.soft, w: 2, cap: 'butt' });
      var lab = (o.xfmt || function (u) { return num(u, 2); })(v), edge = x + Kit.tw(lab, fs) / 2 > S.W - 4;
      if (!(o.xskip && k % 2)) s += K.text(edge ? S.W - 4 : x, y0 + 25, lab, { size: fs, weight: 500, c: C.soft, anchor: edge ? 'end' : 'middle', halo: false });
    }
    if (o.ys) for (v = o.ys; v <= P.Y + 1e-9; v += o.ys) {
      var y = P.sy(v);
      s += K.pline(x0 - 6, y, x0, y, { c: C.soft, w: 2, cap: 'butt' }) + K.text(x0 - 10, y + 5.5, (o.yfmt || function (u) { return num(u, 2); })(v), { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
    }
    if (o.xs || o.ys) s += K.text(x0 - 8, y0 + 22, '0', { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
    if (o.xt) s += K.text(x1, y0 + (o.xs ? 48 : 26), o.xt, { size: S.narrow ? 16 : 17, weight: 600, c: C.soft, anchor: 'end', halo: false });
    if (o.title) s += K.text(x0 - (o.ys ? 0 : 0), y1 - 16, o.title, { size: S.narrow ? 17 : 18, weight: 700, c: C.ink, anchor: 'start', halo: false });
    D.L.rect(x0 - 4, y0, x1 - x0 + 8, o.xs ? 54 : 30);
    if (o.title) D.L.rect(x0 - 4, y1 - 38, Kit.tw(o.title, 18) + 12, 30);
    D.add('over', s);
  }

  /* =====================================================================
     7.1  Profit landscape: TR vs TC
     ===================================================================== */
  var L71 = M.landscape;
  function pi71(p, q) { return F.profit(p, p.P, q); }
  var f71 = {
    key: 'f71', num: '7.1', topic: 'Profit landscape (TR vs TC)', short: 'TR vs TC', model: L71,
    axes: { xtitle: 'Quantity, q', ytitle: 'Revenue and cost ($)' }, aspect: 0.7,
    question: function (f) { return 'The market price is ' + money(f.p.P) + '. Which output gives this firm the most profit?'; },
    setup: function (f) {
      var p = f.p;
      return 'A price taker sells every unit at ' + money(p.P) + ', so total revenue is the straight line <b class="c-blue">TR = ' + num(p.P) + 'q</b>. Its total cost is <b class="c-orange">TC = q<sup>3</sup>/3 - 2q<sup>2</sup> + ' + num(p.c) + 'q + ' + num(p.F) +
        '</b>, which starts at the fixed cost, TFC = ' + money(p.F) + '. Profit is the vertical gap TR - TC.';
    },
    steps: [{ kind: 'drag', label: 'The best output q*', prompt: 'Drag the plum marker along the quantity axis to the output where profit is highest. The plum bar is the gap TR - TC at your output.',
      check: function (f) { return Math.abs(f.g.q - L71.start(f.dom)) >= 0.2 ? true : 'Slide it further along the axis.'; } }],
    kbdHint: 'Keyboard: left and right arrows move the output marker (Shift for bigger steps), Enter confirms.',
    initGuess: function (f) { return { q: L71.start(f.dom) }; },
    handles: function (f, S) {
      if (f.predicting) return [rowHandle(f, S, f.g.q, 0, function (f, X) { f.g.q = clamp(X, 0, 0.98 * f.dom.X); }, { step: 0, active: !f.done[0], kstep: 0.1 })];
      if (f.exploring) return [rowHandle(f, S, f.ex.q, 0, function (f, X) { f.ex.q = clamp(X, 0.05, 0.98 * f.dom.X); }, { c: C.ink, active: true, kstep: 0.1 })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, tc = function (q) { return F.tc(p, q); }, tr = function (q) { return p.P * q; };
      D.fn(tc, 0, S.X, { c: SMC, w: 5, pr: b });
      D.line(0, 0, S.X, p.P * S.X, { c: DEM, w: 5, pr: b });
      if (b > 0.9) {
        var qT = Math.min(0.9 * S.X, 0.86 * S.Y / p.P);
        D.label('TR = ' + num(p.P) + 'q', D.along(tr, [qT, qT * 0.92, qT * 0.8], 10, 'aboveOnly'), { c: DEMT, size: S.fs });
        curveName(D, S, 'TC', tc, SMCT, 0.88, { pref: 'below' });
        D.label('TFC ' + money(p.F), [{ x: S.x0 + 10, y: S.y(p.F) - 10, anchor: 'start' }, { x: S.x0 + 10, y: S.y(p.F) + 24, anchor: 'start' }], { c: SMCT, size: S.ss, prio: 0 });
      }
      function gapBar(q, col, w, op, layer) {
        var a = tr(q), c = tc(q);
        D.line(q, Math.min(a, c), q, Math.max(a, c), { c: col, w: w, op: op, layer: layer || 'over', cap: 'butt' });
      }
      if (f.predicting) {
        D.line(g.q, 0, g.q, S.Y, { c: PLUM, w: 2, dash: '4 7', op: 0.55, layer: 'under', reg: false });
        gapBar(g.q, PLUM, 8, 0.75);
        return;
      }
      var tan = f.t('tan'), gp = f.t('gap'), qq = f.t('q');
      if (f.ghostOn()) {
        D.line(g.q, 0, g.q, S.Y, { c: PLUM, w: 2.5, dash: '4 7', op: 0.7 * f.gOp(), layer: 'under', reg: false });
        gapBar(g.q, PLUM, 5, 0.45 * f.gOp());
        youTag(f, D, g.q, Math.max(tr(g.q), tc(g.q)));
      }
      var q = s.q, col = s.pi >= 0 ? GAIN : LOSS, colT = s.pi >= 0 ? GAINT : LOSST;
      if (s.shut) {
        if (f.exploring) {
          D.line(0, 0, 0, p.F, { c: LOSS, w: 9, layer: 'over', cap: 'butt' });
          D.label('shut down: q = 0, profit -' + money(p.F) + ' (the TFC)', [{ x: S.x0 + 16, y: S.y(p.F) - 12, anchor: 'start' }, { x: S.x0 + 16, y: S.y(p.F) + 30, anchor: 'start' }], { c: LOSST, prio: 0 });
        }
      } else {
        if (tan > 0) {
          var d = 0.24 * S.X;
          D.line(q - d, s.TC - p.P * d, q + d, s.TC + p.P * d, { c: SMC, w: 3, dash: '8 6', pr: tan, layer: 'over' });
          if (tan > 0.6) D.near(q + d * 0.7, s.TC + p.P * d * 0.7, (S.narrow ? 'MC = ' : 'slope MC = ') + money(s.mc), { c: SMCT, size: S.ss, op: seg(tan, 0.6, 1), d: 12, ring: 90 });
        }
        if (gp > 0) {
          D.line(q, s.TC, q, lerp(s.TC, s.TR, gp), { c: col, w: 9, layer: 'over', cap: 'butt' });
          D.dot(q, s.TR, { c: DEM, r: 8, pr: gp }); D.dot(q, s.TC, { c: SMC, r: 8, pr: gp });
          if (gp > 0.7) {
            // the wedge beside the bar is narrow: try under the lower curve, right of the bar, first
            var lo = Math.min(s.TR, s.TC), hi = Math.max(s.TR, s.TC), cands = [{ x: S.x(q) + 12, y: S.y(lo) + 28, anchor: 'start' }, { x: S.x(q) + 12, y: S.y(lo) + 52, anchor: 'start' }];
            [0.5, 0.35, 0.65, 0.2, 0.8].forEach(function (t) { var y = S.y(lerp(lo, hi, t)) + 7; cands.push({ x: S.x(q) - 14, y: y, anchor: 'end' }, { x: S.x(q) + 14, y: y, anchor: 'start' }); });
            D.label((s.pi >= 0 ? 'profit ' : 'loss ') + money(Math.abs(s.pi)), cands, { c: colT, op: seg(gp, 0.7, 1), prio: 0, size: S.fs, ring: 120 });
          }
        }
        if (qq > 0) {
          D.line(q, 0, q, Math.min(s.TR, s.TC), { c: C.soft, w: 2.5, dash: '6 6', pr: qq, layer: 'over' });
          D.xval(q, 'q* = ' + num(q, 2), { c: C.ink, op: qq });
        }
      }
      if (f.exploring) {
        var x = f.ex.q, mc = F.smc(p, x), dd = 0.07 * S.X;
        D.line(x, 0, x, S.Y, { c: C.soft, w: 2, dash: '4 7', layer: 'under', reg: false });
        D.line(x - dd, tr(x) - p.P * dd, x + dd, tr(x) + p.P * dd, { c: DEM, w: 7, layer: 'over', op: 0.55 });
        D.line(x - dd, tc(x) - mc * dd, x + dd, tc(x) + mc * dd, { c: SMC, w: 7, layer: 'over', op: 0.55 });
        D.dot(x, tr(x), { c: DEM, r: 6 }); D.dot(x, tc(x), { c: SMC, r: 6 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['tan', 300, 900], ['gap', 1200, 800], ['q', 1900, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, pg = pi71(p, g.q);
      var why = 'Profit is the gap TR - TC, and it is widest where the two curves run parallel. TR rises by the price, MR = ' + money(p.P) + ', with each unit; TC rises by marginal cost, SMC = ' + smcEq(p) +
        '. Setting ' + num(p.P) + ' = ' + smcEq(p) + ' on its rising part gives <b>q* = 2 + &radic;(' + num(p.P) + ' - ' + num(p.c - 4) + ') = ' + num(s.q, 2) + '</b>. ';
      why += s.pi >= 0 ? 'There TR = ' + money(s.TR) + ' and TC = ' + money(s.TC) + ', so profit is <b>' + money(s.pi) + '</b>.'
        : 'TC is above TR everywhere, so the best the firm can do is the smallest gap: a loss of <b>' + money(-s.pi) + '</b>, still better than shutting down and losing the ' + money(p.F) + ' fixed cost.';
      return { rows: [['Output', num(g.q, 2), num(s.q, 2)], ['Profit at that output', sign$(pg), sign$(s.pi)]], why: why };
    },
    explore: {
      init: function (f) { f.ex.q = Math.round(f.sol.q * 0.6 * 20) / 20; },
      hint: 'Drag the grey marker to compare slopes: left of q* MR is steeper than MC (expand), right of it MC is steeper (cut back). Change the price, or the fixed cost: TFC lifts TC but never moves q*.',
      controls: function (f) {
        var r = L71.pRange(f.p0);
        return [
          { kind: 'stepper', label: 'Price P', get: function (f) { return f.p.P; }, set: function (f, v) { f.p.P = v; }, step: 1, min: r.lo, max: r.hi, fmt: money },
          { kind: 'stepper', label: 'Fixed cost TFC', get: function (f) { return f.p.F; }, set: function (f, v) { f.p.F = v; }, step: 2.5, min: 0, max: f.p0.F + 10, fmt: money }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, x = f.ex.q, mc = F.smc(p, x), pix = pi71(p, x);
        var at = 'At q = ' + num(x, 2) + ': MR = ' + money(p.P) + ', MC = ' + money(mc) + ' (' + (mc < p.P - 0.005 ? 'MR &gt; MC, expand' : mc > p.P + 0.005 ? 'MC &gt; MR, cut back' : 'MR = MC') + '), profit ' + sign$(pix) + '. ';
        return at + (s.shut ? 'At ' + money(p.P) + ' price is below min SAVC (' + money(s.psd) + '): <b>shut down</b> and lose only TFC, ' + money(p.F) + '.'
          : 'Best: <b>q* = ' + num(s.q, 2) + '</b>, profit <b>' + sign$(s.pi) + '</b>.');
      }
    }
  };

  /* =====================================================================
     7.2  Profit rectangle
     ===================================================================== */
  var R72 = M.rect;
  var f72 = {
    key: 'f72', num: '7.2', topic: 'Profit rectangle anatomy', short: 'Profit rectangle', model: R72, axes: AXQ,
    question: function (f) { return 'At P = ' + money(f.p.P) + ', draw this firm\'s profit rectangle.'; },
    setup: function (f) {
      var p = f.p;
      return 'The firm takes the price ' + money(p.P) + ' as given (the dashed line, P = MR). Its costs: <b class="c-orange">SMC = ' + smcEq(p) + '</b>, <b class="c-gold">SAVC = ' + savcEq(p) +
        '</b>, and <b class="c-purple">SAC = SAVC + ' + num(p.F) + '/q</b>. The rectangle\'s top edge is the price; you choose its width and its bottom edge.';
    },
    steps: [{ kind: 'drag', label: 'Width and bottom edge', prompt: 'Drag the plum corner: across to the output the firm picks, and up or down to the cost per unit that profit is measured against.',
      check: function (f) { return Math.hypot(f.g.x - R72.start.x, f.g.y - R72.start.y) > 0.3 ? true : 'Drag the corner to a new spot.'; } }],
    kbdHint: 'Keyboard: arrow keys move the corner (Shift for bigger steps), Enter confirms.',
    initGuess: function () { return { x: R72.start.x, y: R72.start.y }; },
    handles: function (f, S) {
      if (f.predicting) return [{ x: f.g.x, y: f.g.y, c: PLUM, snap: 0.05, kstep: 0.05, step: 0, active: !f.done[0], set: function (f, X, Y) { f.g.x = clamp(X, 0.1, f.dom.X * 0.97); f.g.y = Y; } }];
      if (f.exploring) return [axisHandle(f, S, f.p.P, function (f, Y) { f.p.P = clamp(Math.round(Y * 20) / 20, 1, f.dom.Y - 0.5); }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      costCurves(D, S, p, { smc: true, sac: true, savc: true, pr: b });
      priceLine(D, S, p.P, { pr: b, label: 'P = MR = ' + money(p.P) });
      if (f.predicting) {
        D.area(box(0, g.y, g.x, p.P), { fill: PLUM, fo: 0.2, stroke: PLUM, sw: 3, layer: 'over' });
        return;
      }
      var tq = f.t('q'), th = f.t('h'), tr = f.t('rect');
      if (f.ghostOn()) {
        D.path(box(0, g.y, g.x, p.P).concat([[0, g.y]]), { c: PLUM, w: 3.5, dash: '5 6', op: f.gOp(), layer: 'over', reg: false });
        youTag(f, D, g.x, g.y);
      }
      if (s.shut) {
        if (f.exploring) D.label('below min SAVC (' + money(s.psd) + '): shut down, q = 0, loss = TFC ' + money(p.F), [{ x: S.x0 + 12, y: S.y(p.P) + 28, anchor: 'start' }, { x: S.x0 + 12, y: S.y(p.P) - 12, anchor: 'start' }], { c: LOSST, prio: 0, size: S.ss });
        return;
      }
      var q = s.q, col = s.pi >= 0 ? GAIN : LOSS, colT = s.pi >= 0 ? GAINT : LOSST;
      if (f.exploring && f.ex.mis === 'savc') {
        D.add('over', K.polygon(box(0, s.savc, q, p.P).map(function (c) { return [S.x(c[0]), S.y(c[1])]; }), { fill: SAVC, fo: 0.12, stroke: SAVCT, sw: 2.5 }).replace('/>', ' stroke-dasharray="7 5"/>'));
        D.label('wrong: SAVC bottom, ' + money(q * (p.P - s.savc)), [{ x: S.x(q) + 12, y: S.y(s.savc) + 22, anchor: 'start' }, { x: S.x(q) + 12, y: S.y(s.savc) - 8, anchor: 'start' }], { c: SAVCT, size: S.ss, prio: 0 });
      }
      if (tr > 0) {
        D.area(box(0, s.sac, q, p.P), { fill: col, fo: 0.3 * tr, stroke: col, sw: 2.5, op: tr });
        if (tr > 0.6) inRect(D, S, (s.pi >= 0 ? 'profit ' : 'loss ') + money(Math.abs(s.pi)), 0, s.sac, q, p.P, { c: colT, op: seg(tr, 0.6, 1) }) ||
          D.label((s.pi >= 0 ? 'profit ' : 'loss ') + money(Math.abs(s.pi)), [{ x: S.x0 + 10, y: S.y(Math.max(p.P, s.sac)) - 10, anchor: 'start' }], { c: colT, op: seg(tr, 0.6, 1), prio: 0 });
      }
      if (tq > 0) {
        D.line(q, 0, q, p.P, { c: C.soft, w: 2.5, dash: '6 6', pr: tq, layer: 'over' });
        D.dot(q, p.P, { c: SMC, r: 9, pr: tq });
        D.xval(q, 'q* = ' + num(q, 2), { c: C.ink, op: tq });
      }
      if (th > 0) {
        D.line(0, s.sac, q, s.sac, { c: SAC, w: 3, dash: '6 6', pr: th, layer: 'over' });
        D.dot(q, s.sac, { c: SAC, r: 9, pr: th });
        D.yval(s.sac, 'SAC(q*) = ' + money(s.sac), { c: SACT, op: th, dy: s.pi >= 0 ? 22 : -10, size: S.ss });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['q', 300, 700], ['h', 1000, 600], ['rect', 1500, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, mine = g.x * (p.P - g.y);
      var why = 'The firm produces where P = SMC: ' + num(p.P, 2) + ' = ' + smcEq(p) + ' gives <b>q* = ' + num(s.q, 2) + '</b> (the rising branch). The height is profit per unit, P - SAC(q*) = ' + money(p.P) + ' - ' + money(s.sac) + ' = ' + sign$(s.margin) +
        ', and the width is q*, so ' + (s.pi >= 0 ? 'profit' : 'the loss') + ' = ' + num(s.q, 2) + ' &times; ' + money(Math.abs(s.margin)) + ' = <b>' + money(Math.abs(s.pi)) + '</b>.';
      if (s.pi < 0) why += ' Price is below SAC but above SAVC (' + money(s.savc) + '), so the firm still produces: it covers its variable cost and part of the fixed cost.';
      if (!f.skipped && Math.abs(g.y - s.savc) < 0.35 && Math.abs(g.y - s.sac) > 0.35) why += ' Your bottom edge sits on SAVC: that leaves out the fixed cost and overstates profit.';
      return { rows: [['Width, q*', num(g.x, 2), num(s.q, 2)], ['Bottom edge, SAC(q*)', money(g.y), money(s.sac)], [s.pi >= 0 ? 'Profit' : 'Profit (a loss)', sign$(mine), sign$(s.pi)]], why: why };
    },
    explore: {
      init: function (f) { f.ex.mis = 'none'; },
      hint: 'Drag the price up and down its axis. The rectangle turns red below min SAC and disappears below min SAVC, where the firm shuts down.',
      controls: [{ kind: 'seg', label: 'Compare', options: [['none', 'Just the answer'], ['savc', 'The SAVC mistake']], get: function (f) { return f.ex.mis; }, set: function (f, v) { f.ex.mis = v; } }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (s.shut) return 'At ' + money(p.P) + ' price is below min SAVC (' + money(s.psd) + '): the firm shuts down and loses its fixed cost, ' + money(p.F) + '.';
        return 'At ' + money(p.P) + ': q* = ' + num(s.q, 2) + ', SAC = ' + money(s.sac) + ', ' + (s.pi >= 0 ? 'profit' : 'loss') + ' = (' + money(p.P) + ' - ' + money(s.sac) + ') &times; ' + num(s.q, 2) + ' = <b class="' + (s.pi >= 0 ? 'c-green' : 'c-red') + '">' + sign$(s.pi) + '</b>.' +
          (f.ex.mis === 'savc' ? ' With SAVC as the bottom you would get ' + money(s.q * (p.P - s.savc)) + ', off by exactly the fixed cost, ' + money(p.F) + '.' : '');
      }
    }
  };

  /* =====================================================================
     7.3  Shutdown and break-even prices
     ===================================================================== */
  var Z73 = M.zones;
  function zoneLine(f, S, key, flag, step, c) {
    var v = f.g[key];
    return { x: 0.35, y: v, c: c || PLUM, grip: 'v', snap: { x: 0, y: 0.05 }, kstep: { x: 0, y: 0.05 }, step: step, active: f.cur === step,
      hit: function (pt) { return pt.x > S.x0 - 34 && pt.x < S.x1 ? Math.abs(pt.y - S.y(f.g[key])) : 1e9; },
      set: function (f, X, Y) { f.g[key] = clamp(Y, 0.1, f.dom.Y - 0.1); f.g[flag] = true; } };
  }
  var f73 = {
    key: 'f73', num: '7.3', topic: 'Shutdown decision zone map', short: 'Shutdown zones', model: Z73, axes: AXQ,
    question: 'Below what price does this firm shut down, and above what price does it make a profit?',
    setup: function (f) {
      var p = f.p;
      return 'Short-run costs: <b class="c-orange">SMC = ' + smcEq(p) + '</b>, <b class="c-gold">SAVC = ' + savcEq(p) + '</b>, <b class="c-purple">SAC = SAVC + ' + num(p.F) + '/q</b> (fixed cost ' + money(p.F) +
        '). The firm takes the market price as given and picks its output where P = SMC, or produces nothing.';
    },
    steps: [
      { kind: 'drag', label: 'The shutdown price', prompt: 'Drag the plum "shutdown?" line to the price below which the firm should produce nothing.', check: function (f) { return adv(f, !!f.g.msd); } },
      { kind: 'drag', label: 'The break-even price', prompt: 'Now drag the "break-even?" line to the price above which the firm makes a profit.', check: function (f) { return adv(f, !!f.g.mbe); } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the highlighted line, Space switches lines, Enter confirms.',
    initGuess: function (f) { var st = Z73.start(f.dom); return { sd: st.sd, be: st.be, msd: false, mbe: false }; },
    handles: function (f, S) {
      if (f.predicting) return [zoneLine(f, S, 'sd', 'msd', 0), zoneLine(f, S, 'be', 'mbe', 1)];
      if (f.exploring) return [axisHandle(f, S, f.ex.P, function (f, Y) { f.ex.P = clamp(Math.round(Y * 20) / 20, 0.5, f.dom.Y - 0.5); }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, zt = f.t('zones'), ts = f.t('sd'), tb = f.t('be'), tn = f.t('names');
      if (zt > 0) {
        D.area(box(0, 0, S.X, s.psd), { fill: LOSS, fo: 0.11, op: zt });
        D.area(box(0, s.psd, S.X, s.be.P), { fill: SAVC, fo: 0.16, op: zt });
        D.area(box(0, s.be.P, S.X, S.Y), { fill: GAIN, fo: 0.09, op: zt });
      }
      costCurves(D, S, p, { smc: true, sac: true, savc: true, pr: b });
      if (f.predicting) {
        [['sd', 'shutdown?'], ['be', 'break-even?']].forEach(function (z, i) {
          D.line(0, g[z[0]], S.X, g[z[0]], { c: PLUM, w: 3, dash: '8 7', op: f.cur === i || g[i ? 'mbe' : 'msd'] ? 0.95 : 0.6, layer: 'over', reg: false });
          D.label(z[1] + (g[i ? 'mbe' : 'msd'] ? ' ' + money(g[z[0]]) : ''), [{ x: S.x1 - 6, y: S.y(g[z[0]]) - 9, anchor: 'end' }, { x: S.x1 - 6, y: S.y(g[z[0]]) + 24, anchor: 'end' }], { c: PLUM, size: S.ls, prio: 0 });
        });
        return;
      }
      if (f.ghostOn()) {
        ['sd', 'be'].forEach(function (k) { D.line(0, g[k], S.X, g[k], { c: PLUM, w: 3, dash: '3 8', op: 0.75 * f.gOp(), layer: 'over', reg: false }); });
        D.label('you', [{ x: S.x1 - 6, y: S.y(g.sd) - 9, anchor: 'end' }, { x: S.x1 - 6, y: S.y(g.sd) + 24, anchor: 'end' }], { c: PLUM, size: S.ss, op: 0.85 * f.gOp() });
      }
      if (ts > 0) {
        D.line(0, s.psd, s.qsd, s.psd, { c: LOSS, w: 2.5, dash: '6 6', pr: ts, layer: 'over' });
        D.dot(s.qsd, s.psd, { c: LOSS, r: 10, pr: ts });
        D.yval(s.psd, 'shutdown ' + money(s.psd) + ' = min SAVC', { c: LOSST, op: ts, dy: 24, size: S.ss });
      }
      if (tb > 0) {
        D.line(0, s.be.P, s.be.q, s.be.P, { c: GAIN, w: 2.5, dash: '6 6', pr: tb, layer: 'over' });
        D.dot(s.be.q, s.be.P, { c: GAIN, r: 10, pr: tb });
        D.yval(s.be.P, 'break-even ' + money(s.be.P) + ' = min SAC', { c: GAINT, op: tb, dy: -10, size: S.ss });
      }
      if (tn > 0) {
        var zl = function (s1, lo, hi, c) { if (S.y(lo) - S.y(hi) > 26) D.label(s1, [{ x: S.x1 - 8, y: S.y((lo + hi) / 2) + 6, anchor: 'end' }, { x: S.x1 - 8, y: S.y(lerp(lo, hi, 0.25)) + 6, anchor: 'end' }], { c: c, op: tn, size: S.ss, prio: 0, ring: 40 }); };
        zl('shut down', 0, s.psd, LOSST); zl('run at a loss', s.psd, s.be.P, SAVCT); zl('profit', s.be.P, Math.min(S.Y, s.be.P + 3), GAINT);
      }
      if (f.exploring) {
        var P = f.ex.P, q = F.supply(p, P);
        priceLine(D, S, P, { label: 'P = ' + money(P) });
        if (q > 0) {
          var sac = F.sac(p, q), pi = q * (P - sac);
          D.area(box(0, sac, q, P), { fill: pi >= 0 ? GAIN : LOSS, fo: 0.3, stroke: pi >= 0 ? GAIN : LOSS, sw: 2 });
          D.dot(q, P, { c: SMC, r: 8 });
        }
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['zones', 300, 800], ['sd', 900, 600], ['be', 1400, 600], ['names', 1900, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Shutdown price', money(g.sd), money(s.psd)], ['Break-even price', money(g.be), money(s.be.P)]],
        why: 'Shutting down still costs the fixed ' + money(p.F) + ', so the firm compares two losses. It produces whenever the price covers average variable cost, P &ge; SAVC: the shutdown price is <b>min SAVC = ' + money(s.psd) + '</b> (at q = 3). ' +
          'Profit needs the price to cover average total cost too: the break-even price is <b>min SAC = ' + money(s.be.P) + '</b> (at q = ' + num(s.be.q, 2) + '). In between, the firm runs at a loss smaller than ' + money(p.F) +
          '. SMC passes through both minimums.'
      };
    },
    explore: {
      init: function (f) { f.ex.P = Math.round((f.sol.psd + f.sol.be.P) / 2 * 20) / 20; },
      hint: 'Drag the price up and down its axis. Inside each zone, compare the loss from producing with the loss from shutting down.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, P = f.ex.P, q = F.supply(p, P), z = Z73.zone(p, P);
        if (!q) return 'At ' + money(P) + ' price is below min SAVC: producing any amount loses more than ' + money(p.F) + ', so the firm <b>shuts down</b> (q = 0) and loses the fixed cost, ' + money(p.F) + '.';
        var pi = q * (P - F.sac(p, q));
        return 'At ' + money(P) + ' the firm produces q = ' + num(q, 2) + ' (P = SMC). Profit: <b class="' + (pi >= 0 ? 'c-green' : 'c-red') + '">' + sign$(pi) + '</b>, versus ' + sign$(-p.F) + ' if it shut down. ' +
          (z === 'loss' ? 'A loss, but a smaller one: keep producing.' : z === 'even' ? 'Break-even.' : 'A profit.');
      }
    }
  };

  /* =====================================================================
     7.5  The firm's supply curve (has a film)
     ===================================================================== */
  var S75 = M.supply;
  var f75 = {
    key: 'f75', num: '7.5', topic: 'Supply curve emergence', short: 'Firm supply', model: S75,
    axes: { xtitle: 'Quantity supplied, q', ytitle: 'Price and cost ($)' },
    film: { name: 'fig75-supply-emergence', label: 'Animation: where supply comes from', title: 'Watch first, 44 seconds',
      caption: 'A price line rises across the firm\'s cost curves. Below the $4 shutdown price the firm supplies nothing; above it, it produces where P = SMC, and each (q, P) pair traces the supply curve. Then build it yourself.' },
    question: function (f) { return 'Where does this firm\'s supply curve start, and how much does it supply at ' + money(f.p.Pt) + '?'; },
    setup: function (f) {
      var p = f.p;
      return 'Costs: <b class="c-orange">SMC = ' + smcEq(p) + '</b> and <b class="c-gold">SAVC = ' + savcEq(p) + '</b> (fixed cost ' + money(p.F) + ', <span class="c-purple">SAC</span> faint). A supply curve answers one question at every price: how many units does the firm offer?';
    },
    steps: [
      { kind: 'drag', label: 'Where supply starts', prompt: 'Drag the plum point to the lowest price at which the firm produces anything, and the output it produces there. Below that price it supplies zero.',
        check: function (f) { return adv(f, f.g.m0 || 'Drag the point first.'); } },
      { kind: 'drag', label: function (f) { return 'Quantity supplied at ' + money(f.p.Pt); }, prompt: function (f) { return 'Slide the second plum point along the dashed line at ' + money(f.p.Pt) + ' to the quantity the firm supplies there.'; },
        check: function (f) { return f.g.m1 || 'Slide it along the line.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys move the highlighted point, Space switches points, Enter confirms.',
    initGuess: function () { var st = S75.start; return { sx: st.sx, sy: st.sy, qt: st.qt, m0: false, m1: false }; },
    handles: function (f, S) {
      var g = f.g;
      if (f.predicting) return [
        { x: g.sx, y: g.sy, c: PLUM, snap: 0.05, kstep: 0.05, step: 0, active: f.cur === 0, set: function (f, X, Y) { f.g.sx = X; f.g.sy = Y; f.g.m0 = true; } },
        rowHandle(f, S, g.qt, f.p.Pt, function (f, X) { f.g.qt = X; f.g.m1 = true; }, { step: 1, active: f.cur === 1 })
      ];
      if (f.exploring) return [axisHandle(f, S, f.ex.P, function (f, Y) {
        f.ex.P = clamp(Math.round(Y * 20) / 20, 0.5, f.dom.Y - 0.5);
        var tr = f.ex.trail, P = f.ex.P;
        if (!tr.some(function (t) { return Math.abs(t - P) < 0.24; })) tr.push(P);
      }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.fn(function (q) { return F.sac(p, q); }, 0.25, S.X, { c: SAC, w: 3, pr: b, op: 0.35, reg: false });
      costCurves(D, S, p, { smc: true, savc: true, pr: b });
      if (!f.exploring) {
        D.line(0, p.Pt, S.X, p.Pt, { c: C.ink, w: 2.5, dash: '8 7', pr: b, layer: 'under' });
        if (b > 0.6) D.label('P = ' + money(p.Pt), [{ x: S.x1 - 6, y: S.y(p.Pt) - 9, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.Pt) + 24, anchor: 'end' }], { c: C.ink, size: S.ls, prio: 0 });
      }
      if (f.predicting) {
        if (g.m0) {
          D.line(0, 0, 0, g.sy, { c: PLUM, w: 7, op: 0.55, layer: 'over', noclip: true, reg: false, cap: 'butt' });
          D.line(0, g.sy, g.sx, g.sy, { c: PLUM, w: 2.5, dash: '5 6', op: 0.8, layer: 'over', reg: false });
        }
        D.near(g.sx, g.sy, g.m0 ? 'starts: q ' + num(g.sx, 2) + ' at ' + money(g.sy) : 'supply starts?', { c: PLUM, size: S.ss, d: 22 });
        D.near(g.qt, p.Pt, g.m1 ? 'q = ' + num(g.qt, 2) : 'q here?', { c: PLUM, size: S.ss, d: 22 });
        return;
      }
      var tz = f.t('zero'), tj = f.t('jump'), tu = f.t('up'), tp = f.t('pt');
      if (f.ghostOn()) {
        D.ghost(g.sx, g.sy, { op: f.gOp() }); D.ghost(g.qt, p.Pt, { op: f.gOp() });
        youTag(f, D, g.sx, g.sy);
      }
      var top = endQ(function (q) { return F.smc(p, q); }, S.X, S.Y, 0.97);
      if (tz > 0) {
        D.line(0, 0, 0, s.psd * tz, { c: SMC, w: 10, layer: 'over', noclip: true, cap: 'butt' });
        if (tz > 0.6) D.label('q = 0 below ' + money(s.psd), [{ x: S.x0 + 14, y: S.y(s.psd * 0.45) + 6, anchor: 'start' }], { c: SMCT, op: seg(tz, 0.6, 1), prio: 0, size: S.ls });
      }
      if (tj > 0) {
        D.line(0, s.psd, s.qsd, s.psd, { c: SMC, w: 2.5, dash: '6 6', pr: tj, layer: 'over' });
        D.dot(s.qsd, s.psd, { c: LOSS, r: 10, pr: tj });
        D.near(s.qsd, s.psd, 'shutdown: q ' + num(s.qsd) + ' at ' + money(s.psd), { c: LOSST, op: tj, d: 20, prio: 0, size: S.ss, ring: 110 });
      }
      if (tu > 0) {
        D.fn(function (q) { return F.smc(p, q); }, s.qsd, top, { c: SMC, w: 13, op: 0.32, pr: tu, layer: 'under', reg: false });
        if (tu > 0.8) D.label('supply S', D.along(function (q) { return F.smc(p, q); }, [top * 0.97, top * 0.94], 14, 'below'), { c: SMCT, op: seg(tu, 0.8, 1), size: S.fs, prio: 0 });
      }
      if (tp > 0 && !f.exploring) {
        var qt = s.qt;
        D.dot(qt, p.Pt, { c: C.ink, r: 10, pr: tp });
        if (qt > 0) D.line(qt, 0, qt, p.Pt, { c: C.soft, w: 2.5, dash: '6 6', pr: tp, layer: 'over' });
        D.near(qt, p.Pt, s.below ? 'q = 0: shut down at ' + money(p.Pt) : 'q = ' + num(qt, 2) + ' at ' + money(p.Pt), { c: C.ink, op: tp, d: 20, prio: 0, ring: 110 });
      }
      if (f.exploring) {
        f.ex.trail.forEach(function (P) { D.dot(F.supply(p, P), P, { c: C.ink, r: 5, op: 0.6, reg: false }); });
        var P = f.ex.P, q = F.supply(p, P);
        priceLine(D, S, P, { w: 2.5 });
        D.dot(q, P, { c: C.ink, r: 10 });
        D.near(q, P, q > 0 ? '(' + num(q, 2) + ', ' + money(P) + ')' : 'q = 0 at ' + money(P), { c: C.ink, d: 20, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['zero', 300, 700], ['jump', 900, 600], ['up', 1400, 1100], ['pt', 2400, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var why = 'Below min SAVC, ' + money(s.psd) + ', price does not cover variable cost, so the firm shuts down: <b>q = 0</b>. At ' + money(s.psd) + ' SMC crosses SAVC at its minimum, q = 3, so supply jumps from 0 to 3. ' +
        'Above that the firm produces where P = SMC: the supply curve is the rising part of SMC. ';
      why += s.below ? 'At ' + money(p.Pt) + ', below ' + money(s.psd) + ', it supplies <b>nothing</b>, even though SMC dips that low: those outputs lose more than shutting down.'
        : 'At ' + money(p.Pt) + ': ' + num(p.Pt, 2) + ' = ' + smcEq(p) + ' gives <b>q = 2 + &radic;(' + num(p.Pt, 2) + ' - ' + num(p.c - 4) + ') = ' + num(s.qt, 2) + '</b>.';
      return { rows: [['Supply starts at', 'q ' + num(g.sx, 2) + ' at ' + money(g.sy), 'q 3 at ' + money(s.psd)], ['Quantity at ' + money(p.Pt), num(g.qt, 2), num(s.qt, 2)]], why: why };
    },
    explore: {
      init: function (f) { f.ex.P = Math.max(0.5, f.sol.psd - 1.5); f.ex.trail = []; },
      hint: 'Drag the price up its axis. Each price leaves a dot at the quantity the firm supplies: they stack up on the price axis, jump at the shutdown price, then climb SMC.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, P = f.ex.P, q = F.supply(p, P);
        if (!q) return 'At ' + money(P) + ' (below min SAVC ' + money(s.psd) + ') the firm supplies <b>q = 0</b>.';
        var pi = q * (P - F.sac(p, q));
        return 'At ' + money(P) + ' the firm supplies <b>q = ' + num(q, 2) + '</b>, where P = SMC. Profit ' + sign$(pi) + (P < s.be.P - 0.005 ? ' (a loss, but smaller than the ' + money(p.F) + ' from shutting down).' : '.');
      }
    }
  };

  /* =====================================================================
     7.7  Three panels: firm, market, consumer
     ===================================================================== */
  var CH = M.chain, R = CH.R;
  var SHORT = { sub: 'Substitute dearer', sub_fall: 'Substitute cheaper', income: 'Income up', income_fall: 'Income down', input: 'Input price up', input_fall: 'Input price down' };
  var TQ = 4.2, TP = 8;   // where the cause handle sits: on the firm's SMC at q = 4.2, on the consumer's d at P = $8
  var PF0 = { c: CH.c0, F: CH.F };
  function chainPanels(S) { return panels(S, [{ X: R.q, Y: R.P }, { X: R.Q, Y: R.P }, { X: R.x, Y: R.P }], { gap: 64, gapV: 76 }); }
  function smc0(q) { return F.smc(PF0, q); }
  function dShift(sh) { return sh * CH.base().Q0 / CH.N; }   // a market shift of sh x Q0 is this many units for one consumer
  // pointer (global data) to the nearest point of a local polyline, measured in pixels
  function nearestOn(f, P, pts, X, Y) {
    var S = f.S, n = G.nearest(X, Y, pts.map(function (q) { return P.pt(q[0], q[1]); }), (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return [P.lx(n.x), P.ly(n.y)];
  }
  // a textbook axis mark: a tick and a short name (P_1, q_2) just outside a panel's axis
  function pMark(D, S, P, axis, v, s, o) {
    o = o || {}; var c = o.c || C.ink, op = o.op == null ? 1 : o.op; if (op <= 0.02) return;
    var size = S.narrow ? 16 : 17, out = '';
    if (axis === 'x') { var x = P.sx(v); out = K.pline(x, P.py0, x, P.py0 + 7, { c: c, w: 2.5, op: op, cap: 'butt' }) + K.text(x + (o.dx || 0), P.py0 + 26, s, { size: size, c: c, anchor: o.anchor || 'middle', op: op, hw: 5 }); D.L.rect(x - 16, P.py0 + 8, 32, 24); }
    else { var y = P.sy(v) + (o.dy || 0); out = K.pline(P.px0 - 7, P.sy(v), P.px0, P.sy(v), { c: c, w: 2.5, op: op, cap: 'butt' }) + K.text(P.px0 - 10, y + 6, s, { size: size, c: c, anchor: 'end', op: op, hw: 5 }); }
    D.add('over', out);
  }
  var f77 = {
    key: 'f77', num: '7.7', topic: 'Three-panel demand shock', short: 'Three panels', model: CH,
    axes: { xtitle: '', ytitle: '', zero: false }, aspect: 0.56, narrowAspect: 2.3, maxH: 560,
    question: function (f) { return CH.SC[f.p.sc].name + '. Trace it through all three panels.'; },
    setup: function (f) {
      var b = CH.base();
      return 'One market, ' + CH.n + ' identical firms and ' + CH.N + ' identical consumers, in long-run equilibrium at P<sub>1</sub> = <b>' + money(b.P0) + '</b> (min SAC): each firm makes ' + num(b.q0, 2) +
        ', each consumer buys ' + num(CH.d(0, b.P0), 2) + '. Firms and consumers take the market price as given; only the market panel has both supply and demand.';
    },
    steps: [
      { kind: 'drag', label: function (f) { return CH.SC[f.p.sc].dem ? 'Shift the consumer\'s demand d' : 'Shift the firm\'s marginal cost SMC'; },
        prompt: function (f) { return CH.SC[f.p.sc].dem ? 'Drag the plum handle on the consumer\'s d left or right, whichever way this news moves it.' : 'Drag the plum handle on the firm\'s SMC up or down, whichever way this news moves it.'; },
        check: function (f) { return adv(f, Math.abs(f.g.cause) > 0.02 ? true : 'Move it further.'); } },
      { kind: 'drag', label: 'The new market price', prompt: 'Drag the plum marker on the market\'s price axis to where the price ends up.',
        check: function (f) { return adv(f, Math.abs(f.g.dp) >= 0.05 ? true : 'Move it up or down.'); } },
      { kind: 'drag', label: function (f) { return CH.SC[f.p.sc].dem ? 'What the firm does' : 'What the consumer does'; },
        prompt: function (f) { return CH.SC[f.p.sc].dem ? 'Slide the plum dot along the firm\'s SMC to its output at the new price.' : 'Slide the plum dot along the consumer\'s d to what she buys at the new price.'; },
        check: function (f) { return Math.abs(f.g.dq) > 0.005 ? true : 'Slide it along the curve.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function () { return { cause: 0, dp: 0, dq: 0 }; },
    handles: function (f, S) {
      if (!f.predicting) return [];
      var Pn = chainPanels(S), Fp = Pn[0], Mp = Pn[1], Cp = Pn[2], g = f.g, b = CH.base(), dem = CH.SC[f.p.sc].dem, hs = [];
      if (dem) {
        var xc = CH.d(0, TP) + g.cause;
        hs.push({ x: Cp.gx(xc), y: Cp.gy(TP), c: PLUM, grip: 'h', step: 0, active: f.cur === 0,
          hit: function (pt) { return Math.abs(pt.y - Cp.sy(TP)) < 30 ? Math.abs(pt.x - Cp.sx(xc)) : 1e9; },
          set: function (f, X) { f.g.cause = clamp(Math.round((Cp.lx(X) - CH.d(0, TP)) * 50) / 50, -1, 1.2); },
          key: function (f, dx, dy) { f.g.cause = clamp(Math.round((f.g.cause + 0.04 * (dx || dy)) * 50) / 50, -1, 1.2); } });
      } else {
        var yc = smc0(TQ) + g.cause;
        hs.push({ x: Fp.gx(TQ), y: Fp.gy(yc), c: PLUM, grip: 'v', step: 0, active: f.cur === 0,
          hit: function (pt) { return Math.abs(pt.x - Fp.sx(TQ)) < 30 ? Math.abs(pt.y - Fp.sy(yc)) : 1e9; },
          set: function (f, X, Y) { f.g.cause = clamp(Math.round((Fp.ly(Y) - smc0(TQ)) * 20) / 20, -2.5, 2); },
          key: function (f, dx, dy) { f.g.cause = clamp(Math.round((f.g.cause + 0.1 * (dy || dx)) * 20) / 20, -2.5, 2); } });
      }
      var Pg = b.P0 + g.dp;
      hs.push({ x: Mp.gx(0), y: Mp.gy(Pg), c: PLUM, grip: 'v', step: 1, active: f.cur === 1,
        hit: function (pt) { return Math.abs(pt.x - Mp.px0) < 34 ? Math.abs(pt.y - Mp.sy(Pg)) : 1e9; },
        set: function (f, X, Y) { f.g.dp = clamp(Math.round(Mp.ly(Y) * 20) / 20, 1, R.P - 0.5) - b.P0; },
        key: function (f, dx, dy) { f.g.dp = clamp(Math.round((b.P0 + f.g.dp + 0.05 * (dy || dx)) * 100) / 100, 1, R.P - 0.5) - b.P0; } });
      if (dem) {
        var q = b.q0 + g.dq, pts = []; for (var u = 3; u <= 6.401; u += 0.05) pts.push([u, smc0(u)]);
        hs.push({ x: Fp.gx(q), y: Fp.gy(smc0(q)), c: PLUM, step: 2, active: f.cur === 2,
          set: function (f, X, Y) { var l = nearestOn(f, Fp, pts, X, Y); f.g.dq = clamp(Math.round(l[0] * 100) / 100, 3, 6.4) - b.q0; },
          key: function (f, dx, dy) { f.g.dq = clamp(Math.round((b.q0 + f.g.dq + 0.02 * (dx + dy)) * 100) / 100, 3, 6.4) - b.q0; } });
      } else {
        var x0 = CH.d(0, b.P0), x = x0 + g.dq, dpts = []; for (var v = 0.5; v <= 9.81; v += 0.1) dpts.push([CH.d(0, v), v]);
        var xlo = CH.d(0, 9.8), xhi = CH.d(0, 0.5);
        hs.push({ x: Cp.gx(x), y: Cp.gy(CH.dInv(0, x)), c: PLUM, step: 2, active: f.cur === 2,
          set: function (f, X, Y) { var l = nearestOn(f, Cp, dpts, X, Y); f.g.dq = clamp(Math.round(l[0] * 100) / 100, xlo, xhi) - x0; },
          key: function (f, dx, dy) { f.g.dq = clamp(Math.round((x0 + f.g.dq + 0.02 * (dx - dy)) * 100) / 100, xlo, xhi) - x0; } });
      }
      return hs;
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = CH.base(), g = f.g, bp = f.base(), dem = s.dem, P0 = b.P0;
      var Pn = chainPanels(S), Fp = Pn[0], Mp = Pn[1], Cp = Pn[2];
      hideKitAxes(D, S);
      pAxes(D, S, Fp, { title: 'Typical firm', xt: 'q' });
      pAxes(D, S, Mp, { title: 'Market', xt: 'Q' });
      pAxes(D, S, Cp, { title: 'Typical consumer', xt: 'q' });
      // how far each stage of the story has run (all 0 while predicting)
      var tc = f.t('cause'), tm = f.t('mkt'), tt = f.t('taker'), tpi = f.t('pi');
      var cF = dem ? CH.c0 : lerp(CH.c0, s.c1, tc), pfN = { c: cF, F: CH.F };              // firm costs shown
      var cM = dem ? CH.c0 : lerp(CH.c0, s.c1, tm), shM = dem ? s.sh * tm : 0;              // market curves shown
      var shC = dem ? s.sh * tc : 0;                                                       // consumer demand shown
      var Pm = f.predicting ? P0 : CH.eqP(shM, cM);                                        // market price shown
      var Ptk = lerp(P0, s.P1, tt);                                                        // the price takers see
      var Pfirm = dem ? Ptk : Pm, Pcons = dem ? Pm : Ptk;
      // starting price, faint, across all three panels
      [Fp, Mp, Cp].forEach(function (P) { pHLine(D, P, P0, { c: C.soft, w: 2.5, dash: '7 7', op: 0.75 * bp, layer: 'under', reg: false }); if (!(f.predicting && P === Mp && Math.abs(g.dp) < 0.3)) pMark(D, S, P, 'y', P0, 'P_1', { c: C.soft, op: bp, dy: !f.predicting && Math.abs(s.P1 - P0) < 1 ? (s.P1 > P0 ? 8 : -8) : 0 }); });
      // firm: SMC and SAC (old ones faint once a cost shock has moved them)
      var smcF = function (pp) { return function (q) { return F.smc(pp, q); }; }, sacF = function (pp) { return function (q) { return F.sac(pp, q); }; };
      if (!dem && tc > 0) { pFn(D, Fp, smcF(PF0), 0.05, R.q, { c: SMC, w: 3, op: 0.32, reg: false }); pFn(D, Fp, sacF(PF0), 0.3, R.q, { c: SAC, w: 3, op: 0.28, reg: false }); }
      pFn(D, Fp, smcF(pfN), 0.05, R.q, { c: SMC, w: 4.5, pr: bp });
      pFn(D, Fp, sacF(pfN), 0.3, R.q, { c: SAC, w: 4, pr: bp });
      if (bp > 0.9) {
        var qs = 2 + Math.sqrt(Math.max(0, 9.3 - cF + 4));
        pNear(D, Fp, qs, 9.3, !dem && tc > 0.5 ? 'SMC′' : 'SMC', { c: SMCT, size: S.ss, d: 10, ring: 60 });
        pNear(D, Fp, 6.3, F.sac(pfN, 6.3), 'SAC', { c: SACT, size: S.ss, d: 10, ring: 60 });
      }
      // market: D and S (old ones faint once shifted)
      var Dm = function (sh) { return function (P) { return CH.D(sh, P); }; }, Sm = function (c) { return function (P) { var q = CH.S(c, P); return q > 0 ? q : null; }; };
      if (tm > 0) { if (dem) pFnP(D, Mp, Dm(0), 0, R.P, { c: DEM, w: 3, op: 0.32, reg: false }); else pFnP(D, Mp, Sm(CH.c0), CH.c0 - 3, R.P, { c: SMC, w: 3, op: 0.32, reg: false }); }
      pFnP(D, Mp, Dm(shM), 0, R.P, { c: DEM, w: 4.5, pr: bp });
      pFnP(D, Mp, Sm(cM), cM - 3, R.P, { c: SMC, w: 4.5, pr: bp });
      if (bp > 0.9) {
        pNear(D, Mp, CH.D(shM, 8.8), 8.8, dem && tm > 0.5 ? 'D′' : 'D', { c: DEMT, size: S.ss, d: 10, ring: 60 });
        pNear(D, Mp, CH.S(cM, 9.4), 9.4, !dem && tm > 0.5 ? 'S′' : 'S', { c: SMCT, size: S.ss, d: 10, ring: 60 });
      }
      // consumer: d
      var dC = function (sh) { return function (P) { return CH.d(sh, P); }; };
      if (dem && tc > 0) pFnP(D, Cp, dC(0), 0, R.P, { c: DEM, w: 3, op: 0.32, reg: false });
      pFnP(D, Cp, dC(shC), 0, R.P, { c: DEM, w: 4.5, pr: bp });
      if (bp > 0.9) pNear(D, Cp, CH.d(shC, 8.9), 8.9, dem && tc > 0.5 ? 'd′' : 'd', { c: DEMT, size: S.ss, d: 10, ring: 60 });
      // where everyone is
      var qF = F.supply(pfN, Pfirm), xC = CH.d(shC, Pcons), QM = CH.D(shM, Pm);
      pDot(D, Fp, qF, Pfirm, { c: C.ink, r: 7, pr: bp }); pDot(D, Mp, QM, Pm, { c: C.ink, r: 7, pr: bp }); pDot(D, Cp, xC, Pcons, { c: C.ink, r: 7, pr: bp });
      // q_1 marks; once q_2 is near, the two names sit either side of their ticks
      var apart = function (P, v1, v2) { if (f.predicting || Math.abs(P.sx(v2) - P.sx(v1)) >= 30) return [{}, {}]; var r = v2 > v1; return [{ anchor: r ? 'end' : 'start', dx: r ? 3 : -3 }, { anchor: r ? 'start' : 'end', dx: r ? -3 : 3 }]; };
      var aF = apart(Fp, b.q0, s.q1), aM = apart(Mp, b.Q0, s.Q1), aC = apart(Cp, CH.d(0, P0), s.x1);
      pMark(D, S, Fp, 'x', b.q0, 'q_1', Object.assign({ c: C.soft, op: bp }, aF[0])); pMark(D, S, Mp, 'x', b.Q0, 'Q_1', Object.assign({ c: C.soft, op: bp }, aM[0])); pMark(D, S, Cp, 'x', CH.d(0, P0), 'q_1', Object.assign({ c: C.soft, op: bp }, aC[0]));
      if (f.predicting) {
        // the student's chain in plum: the shifted curve carries into the market automatically
        if (Math.abs(g.cause) > 1e-9) {
          if (dem) {
            pFnP(D, Cp, function (P) { return CH.d(0, P) + g.cause; }, 0, R.P, { c: PLUM, w: 3.5, dash: '8 6', layer: 'over', reg: false });
            pFnP(D, Mp, function (P) { return CH.D(0, P) + CH.N * g.cause; }, 0, R.P, { c: PLUM, w: 3, dash: '8 6', op: 0.7, layer: 'over', reg: false });
          } else {
            var pg = { c: CH.c0 + g.cause, F: CH.F };
            pFn(D, Fp, smcF(pg), 0.05, R.q, { c: PLUM, w: 3.5, dash: '8 6', layer: 'over', reg: false });
            pFnP(D, Mp, Sm(pg.c), pg.c - 3, R.P, { c: PLUM, w: 3, dash: '8 6', op: 0.7, layer: 'over', reg: false });
          }
        }
        if (Math.abs(g.dp) > 1e-9) { pHLine(D, Mp, P0 + g.dp, { c: PLUM, w: 3, dash: '6 6', layer: 'over', reg: false }); pMark(D, S, Mp, 'y', P0 + g.dp, money(P0 + g.dp), { c: PLUM, dy: g.dp > 0 ? -10 : 10 }); }
        return;
      }
      if (f.ghostOn()) {
        var go = 0.8 * f.gOp();
        if (dem) pFnP(D, Cp, function (P) { return CH.d(0, P) + g.cause; }, 0, R.P, { c: PLUM, w: 3, dash: '3 7', op: go, layer: 'over', reg: false });
        else pFn(D, Fp, smcF({ c: CH.c0 + g.cause, F: CH.F }), 0.05, R.q, { c: PLUM, w: 3, dash: '3 7', op: go, layer: 'over', reg: false });
        pHLine(D, Mp, P0 + g.dp, { c: PLUM, w: 3, dash: '3 7', op: go, layer: 'over', reg: false });
        if (dem) D.ghost(Fp.gx(b.q0 + g.dq), Fp.gy(smc0(b.q0 + g.dq)), { op: f.gOp() });
        else { var xg = CH.d(0, P0) + g.dq; D.ghost(Cp.gx(xg), Cp.gy(CH.dInv(0, xg)), { op: f.gOp() }); }
      }
      // the new price in each panel once it has reached it
      var mk = function (P, Pnow, t) { if (t > 0) { pHLine(D, P, Pnow, { c: C.ink, w: 3, dash: '10 6', op: Math.min(1, t * 2), layer: 'over', reg: false }); pMark(D, S, P, 'y', s.P1, 'P_2', { op: seg(t, 0.85, 1), dy: s.P1 > P0 ? -8 : 8 }); } };
      mk(Mp, Pm, tm);
      if (dem) { mk(Cp, Pcons, tm); mk(Fp, Pfirm, tt); } else { mk(Fp, Pfirm, tm); mk(Cp, Pcons, tt); }
      var tq = dem ? tt : tm, tx = dem ? tm : tt;
      pMark(D, S, Fp, 'x', s.q1, 'q_2', Object.assign({ op: seg(tq, 0.85, 1) }, aF[1])); pMark(D, S, Mp, 'x', s.Q1, 'Q_2', Object.assign({ op: seg(tm, 0.85, 1) }, aM[1])); pMark(D, S, Cp, 'x', s.x1, 'q_2', Object.assign({ op: seg(tx, 0.85, 1) }, aC[1]));
      if (tpi > 0) {
        var sac1 = F.sac(pfN, qF), pi = qF * (Pfirm - sac1), good = pi >= 0;
        pArea(D, Fp, box(0, sac1, qF, Pfirm), { fill: good ? GAIN : LOSS, fo: 0.32, op: tpi, stroke: good ? GAIN : LOSS, sw: 2 });
        if (tpi > 0.7) pNear(D, Fp, qF * 0.45, Math.min(Pfirm, sac1), (good ? 'profit ' : 'loss ') + money(Math.abs(s.pi1)), { c: good ? GAINT : LOSST, size: S.ss, d: 16, op: seg(tpi, 0.7, 1), prio: 0, ring: 90 });
      }
      // causal arrows in the gaps, low down where nothing else lives
      var arrow = function (from, to, t) {
        if (t <= 0) return;
        var a, z;
        if (!S.narrow) { var y = lerp(from.py0, from.py1, 0.16), r = to.px0 > from.px0; a = [r ? from.px1 + 8 : from.px0 - 8, y]; z = [r ? to.px0 - 8 : to.px1 + 8, y]; }
        else { var x = from.px1 - 38, dn = to.py0 > from.py0; a = [x, dn ? from.py0 + 14 : from.py1 + 12]; z = [x, dn ? to.py1 + 12 : to.py0 + 14]; }
        D.arrowP(a[0], a[1], lerp(a[0], z[0], t), lerp(a[1], z[1], t), { c: C.gold, w: 4 });
      };
      if (dem) { arrow(Cp, Mp, tm); arrow(Mp, Fp, tt); } else { arrow(Fp, Mp, tm); arrow(Mp, Cp, tt); }
    },
    reveal: function () { return [['ghost', 0, 400], ['cause', 300, 900], ['mkt', 1300, 1100], ['taker', 2500, 900], ['pi', 3300, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, sc = CH.SC[p.sc], dem = sc.dem;
      var dw = function (v, a, b2) { return Math.abs(v) < 1e-9 ? 'no move' : v > 0 ? a : b2; };
      var rows = [
        [dem ? 'Consumer demand d' : 'Firm SMC', dem ? dw(g.cause, 'right', 'left') : dw(g.cause, 'up', 'down'), dem ? (s.dirs[0] > 0 ? 'shifts right' : 'shifts left') : (s.dirs[0] > 0 ? 'up ' : 'down ') + money(Math.abs(s.shift))],
        ['Market price', dw(g.dp, 'up', 'down'), (s.dirs[1] > 0 ? 'up, ' : 'down, ') + money(s.P0) + ' to ' + money(s.P1)],
        [dem ? 'Firm output' : 'What she buys', dw(g.dq, 'more', 'less'), (s.dirs[2] > 0 ? 'more, ' : 'less, ') + num(dem ? s.q0 : s.x0, 2) + ' to ' + num(dem ? s.q1 : s.x1, 2)]
      ];
      var why;
      if (dem) {
        var cause = p.sc.indexOf('sub') === 0 ? (sc.up ? 'A dearer substitute pushes buyers toward this good' : 'A cheaper substitute pulls buyers away from this good') : (sc.up ? 'Higher income raises demand for a normal good' : 'Lower income cuts demand for a normal good');
        why = cause + ': each consumer\'s d shifts ' + (sc.up ? 'right' : 'left') + ', and so does market demand, the sum of ' + CH.N + ' of them. With the number of firms fixed in the short run, the price ' + (sc.up ? 'rises' : 'falls') + ' from ' + money(s.P0) + ' to <b>' + money(s.P1) + '</b>. ' +
          'Each firm takes the new price and moves ' + (sc.up ? 'up' : 'down') + ' its SMC, from ' + num(s.q0, 2) + ' to ' + num(s.q1, 2) + ' units, where price is ' + (s.pi1 >= 0 ? 'above SAC: a profit of ' : 'below SAC: a loss of ') + money(Math.abs(s.pi1)) + '. Causality runs consumer, market, firm.';
      } else {
        why = (sc.up ? 'A dearer' : 'A cheaper') + ' input moves every firm\'s cost curves ' + (sc.up ? 'up' : 'down') + ' by ' + money(Math.abs(s.shift)) + '. Market supply is the firms\' SMC curves added up, so it shifts ' + (sc.up ? 'left' : 'right') + ' and the price ' + (sc.up ? 'rises' : 'falls') + ' from ' + money(s.P0) + ' to <b>' + money(s.P1) + '</b>. ' +
          'A consumer\'s d does not move: she slides along it and buys ' + (s.dirs[2] > 0 ? 'more' : 'less') + ', ' + num(s.x0, 2) + ' to ' + num(s.x1, 2) + '. The price moves by less than cost, so firms ' + (s.pi1 >= 0 ? 'earn a profit of ' : 'make a loss of ') + money(Math.abs(s.pi1)) + '. Causality runs firm, market, consumer.';
      }
      return { rows: rows, why: why };
    },
    explore: {
      hint: 'Pick another shock. Watch which panel moves first, which way the price goes, and who simply slides along a curve.',
      controls: [{ kind: 'seg', label: 'Shock', options: CH.SCK.map(function (k) { return [k, SHORT[k]]; }), get: function (f) { return f.p.sc; },
        set: function (f, v) { f.p.sc = v; f.p.m = CH.mag(v)[2]; } }],
      readout: function (f) {
        var s = f.sol;
        return CH.SC[f.p.sc].name + ': price ' + money(s.P0) + ' to <b>' + money(s.P1) + '</b>; market Q ' + num(s.Q0, 0) + ' to ' + num(s.Q1, 0) + '; each firm ' + num(s.q0, 2) + ' to ' + num(s.q1, 2) +
          ' (' + (s.pi1 >= 0 ? 'profit ' : 'loss ') + money(Math.abs(s.pi1)) + '); each consumer ' + num(s.x0, 2) + ' to ' + num(s.x1, 2) + '.';
      }
    }
  };

  /* =====================================================================
     7.8  Market supply: the horizontal sum
     ===================================================================== */
  var M78 = M.market;
  var f78 = {
    key: 'f78', num: '7.8', topic: 'Market supply builder', short: 'Market supply', model: M78,
    axes: { xtitle: 'Market quantity, Q', ytitle: 'Price ($)' },
    question: function (f) { return f.p.n + ' identical firms. Where does the market supply curve start, and how much does the market supply at ' + money(f.p.Pt) + '?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Each firm has the course\'s costs: it supplies <b class="c-orange">q = 2 + &radic;(P - 3)</b> at prices of $4 (min SAVC) or more and nothing below. The thin orange curve near the axis is <b>one</b> firm; at ' + money(p.Pt) + ' it supplies ' + num(s.qt, 2) + '.';
    },
    steps: [
      { kind: 'drag', label: 'Where market supply starts', prompt: 'Drag the plum point to the lowest price at which the market supplies anything, and the market quantity there.', check: function (f) { return adv(f, f.g.m0 || 'Drag the point first.'); } },
      { kind: 'drag', label: function (f) { return 'Market quantity at ' + money(f.p.Pt); }, prompt: function (f) { return 'Slide the second plum point along the line at ' + money(f.p.Pt) + ' to the market quantity supplied.'; },
        check: function (f) { return f.g.m1 || 'Slide it along the line.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys move the highlighted point (Shift for bigger steps), Space switches points, Enter confirms.',
    initGuess: function (f) {
      var st = M78.start(f.dom), s = f.sol, qt = Math.abs(st.qt - s.Qt) < 0.2 * f.dom.X ? Math.round(f.dom.X * 0.9) : st.qt;
      return { sx: st.sx, sy: st.sy, qt: qt, m0: false, m1: false };
    },
    handles: function (f, S) {
      var g = f.g, sn = f.dom.X <= 30 ? 0.05 : f.dom.X <= 150 ? 0.1 : 0.5;
      if (f.predicting) return [
        { x: g.sx, y: g.sy, c: PLUM, snap: { x: sn, y: 0.05 }, kstep: { x: sn * 2, y: 0.1 }, step: 0, active: f.cur === 0, set: function (f, X, Y) { f.g.sx = X; f.g.sy = Y; f.g.m0 = true; } },
        rowHandle(f, S, g.qt, f.p.Pt, function (f, X) { f.g.qt = X; f.g.m1 = true; }, { step: 1, active: f.cur === 1, snap: sn, kstep: sn * 2 })
      ];
      if (f.exploring) return [axisHandle(f, S, f.ex.P, function (f, Y) { f.ex.P = clamp(Math.round(Y * 20) / 20, 0.5, f.dom.Y - 0.5); }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, top = S.Y * 0.97;
      var one = function (P) { return M78.q(P); }, mk = function (n) { return function (P) { return n * M78.q(P); }; };
      var curve = function (fn, P0, P1) { var pts = []; for (var i = 0; i <= 120; i++) { var P = lerp(P0, P1, i / 120); pts.push([fn(P), P]); } return pts; };
      D.path(curve(one, 4, top), { c: SMC, w: 3.5, pr: b });
      D.dot(3, 4, { c: SMC, r: 5, pr: b });
      if (b > 0.9) D.label('one firm', [{ x: S.x(one(top)) + 12, y: S.y(top) + 16, anchor: 'start' }, { x: S.x(one(top * 0.9)) + 12, y: S.y(top * 0.9) + 6, anchor: 'start' }], { c: SMCT, size: S.ss, prio: 0 });
      if (!f.exploring) {
        D.line(0, p.Pt, S.X, p.Pt, { c: C.ink, w: 2.5, dash: '8 7', pr: b, layer: 'under' });
        D.dot(s.qt, p.Pt, { c: SMC, r: 6, pr: b });
        if (b > 0.6) D.label('P = ' + money(p.Pt), [{ x: S.x1 - 6, y: S.y(p.Pt) - 9, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.Pt) + 24, anchor: 'end' }], { c: C.ink, size: S.ls, prio: 0 });
      }
      if (f.predicting) {
        if (g.m0) D.line(0, g.sy, g.sx, g.sy, { c: PLUM, w: 2.5, dash: '5 6', op: 0.8, layer: 'over', reg: false });
        D.near(g.sx, g.sy, g.m0 ? 'starts: Q ' + num(g.sx, 1) + ' at ' + money(g.sy) : 'market supply starts?', { c: PLUM, size: S.ss, d: 22 });
        D.near(g.qt, p.Pt, g.m1 ? 'Q = ' + num(g.qt, 1) : 'Q here?', { c: PLUM, size: S.ss, d: 22 });
        return;
      }
      var tst = f.t('start'), tsw = f.t('sweep'), tpt = f.t('pt'), n = p.n;
      if (f.ghostOn()) { D.ghost(g.sx, g.sy, { op: f.gOp() }); D.ghost(g.qt, p.Pt, { op: f.gOp() }); youTag(f, D, g.sx, g.sy); }
      if (tst > 0) {
        D.line(0, 4, s.Qsd, 4, { c: SMC, w: 2.5, dash: '6 6', pr: tst, layer: 'over' });
        D.dot(s.Qsd, 4, { c: LOSS, r: 9, pr: tst });
        D.near(s.Qsd, 4, 'starts at $4: ' + n + ' × 3 = ' + num(s.Qsd, 1), { c: LOSST, op: tst, d: 20, prio: 0, size: S.ss, ring: 110 });
      }
      var Pw = f.exploring ? top : lerp(4, top, tsw);
      if (tsw > 0 || f.exploring) {
        D.path(curve(mk(n), 4, Pw), { c: SMC, w: 6 });
        if (tsw > 0.95 || f.exploring) D.label('S, ' + n + ' firms', D.along(function (Q) { return 3 + Math.pow(Q / n - 2, 2); }, [mk(n)(top * 0.92), mk(n)(top * 0.85)], 12, 'below'), { c: SMCT, size: S.fs, prio: 0 });
      }
      var bars = function (P, op) {
        var q = M78.q(P); if (q <= 0) return;
        for (var i = 0; i < n; i++) D.line(i * q, P, (i + 1) * q, P, { c: i % 2 ? SMC : C.gold, w: 9, op: op, layer: 'over', cap: 'butt', reg: i === 0 });
      };
      if (f.revealing && tsw > 0 && tsw < 1) bars(Pw, 0.85);
      if (tpt > 0 && !f.exploring) {
        D.dot(s.Qt, p.Pt, { c: C.ink, r: 10, pr: tpt });
        D.line(s.Qt, 0, s.Qt, p.Pt, { c: C.soft, w: 2.5, dash: '6 6', pr: tpt, layer: 'over' });
        D.near(s.Qt, p.Pt, n + ' × ' + num(s.qt, 2) + ' = ' + num(s.Qt, 1), { c: C.ink, op: tpt, d: 20, prio: 0, ring: 110 });
      }
      if (f.exploring) {
        var P = f.ex.P, q = M78.q(P);
        priceLine(D, S, P, { w: 2.5 });
        bars(P, 0.9);
        if (q > 0) D.near(n * q, P, n + ' × ' + num(q, 2) + ' = ' + num(n * q, 1), { c: C.ink, d: 20, prio: 0, ring: 110 });
        else D.label('nobody supplies at ' + money(P), [{ x: S.x0 + 40, y: S.y(P) - 10, anchor: 'start' }], { c: C.soft, prio: 0 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['start', 300, 700], ['sweep', 1000, 2000, 'linear'], ['pt', 3000, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Market supply starts at', 'Q ' + num(g.sx, 1) + ' at ' + money(g.sy), 'Q ' + num(s.Qsd, 1) + ' at $4'], ['Market quantity at ' + money(p.Pt), num(g.qt, 1), num(s.Qt, 1)]],
        why: 'Add quantities at each price, never prices. Every firm starts producing at the same shutdown price, $4 (min SAVC), with 3 units, so the market starts at <b>$4</b> too, with ' + p.n + ' &times; 3 = <b>' + num(s.Qsd, 1) + '</b>. ' +
          'At ' + money(p.Pt) + ' each firm supplies 2 + &radic;(' + num(p.Pt) + ' - 3) = ' + num(s.qt, 2) + ', so the market supplies ' + p.n + ' &times; ' + num(s.qt, 2) + ' = <b>' + num(s.Qt, 1) + '</b>. The market curve is ' + p.n + ' times as far from the price axis at every price: flatter, same starting price.'
      };
    },
    explore: {
      init: function (f) { f.ex.P = f.p.Pt; },
      hint: 'Drag the price, or change the number of firms. Each firm\'s quantity is a stripe; the market quantity is the stripes laid end to end.',
      controls: function (f) { return [{ kind: 'stepper', label: 'Firms n', get: function (f) { return f.p.n; }, set: function (f, v, fin) { f.p.n = fin ? v : Math.round(v); }, step: 1, min: 1, max: M78.nMax(f.p0), fmt: function (v) { return num(Math.round(v)); }, dur: 300 }]; },
      readout: function (f) {
        var p = f.p, P = f.ex.P, q = M78.q(P);
        if (!q) return 'At ' + money(P) + ' (below $4) no firm produces: Q = 0.';
        return 'At ' + money(P) + ': ' + p.n + ' firm' + (p.n === 1 ? '' : 's') + ' &times; ' + num(q, 2) + ' = <b>Q = ' + num(p.n * q, 1) + '</b>. Market supply Q = ' + p.n + '(2 + &radic;(P - 3)) for P &ge; $4.';
      }
    }
  };

  /* =====================================================================
     7.9  Long-run entry and exit (has a film)
     ===================================================================== */
  var LR = M.longrun;
  function lrPanels(f, S) {
    var d = f.dom;
    return panels(S, [{ X: d.qX, Y: d.PY, w: 0.72, h: 0.8 }, { X: d.QX, Y: d.PY, w: 1.28, h: 1 }], { gap: 86, gapV: 100 });
  }
  function lrSup(p, n) { return function (P) { var q = F.supply(p, P); return q > 0 ? n * q : null; }; }
  function lrDem(p, A) { return function (P) { var Q = A - p.B * P; return Q >= 0 ? Q : null; }; }
  var f79 = {
    key: 'f79', num: '7.9', topic: 'Long-run entry and exit', short: 'Entry and exit', model: LR,
    axes: { xtitle: '', ytitle: '', zero: false }, aspect: 0.62, narrowAspect: 1.95, maxH: 640,
    film: { name: 'fig79-entry-exit', label: 'Animation: long-run entry and exit', title: 'Watch first, 35 seconds',
      caption: 'Demand rises in a competitive industry in long-run equilibrium. Price jumps to $6.40 and each firm earns a profit; new firms enter and push supply right until price is back at the $5.51 minimum of average cost. Then predict it yourself.' },
    question: function (f) { return 'Demand has ' + (f.sol.rise ? 'risen' : 'fallen') + ' to D′. Where does the market end up in the long run, and with how many firms?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Each firm: <b class="c-orange">SMC = ' + smcEq(p) + '</b>, <b class="c-purple">SAC</b> with fixed cost ' + money(p.F) + ', min SAC <b>' + money(s.Pstar) + '</b> at q = ' + num(s.qstar, 2) + '. ' + p.n0 + ' firms were in long-run equilibrium with D. Now demand is <b class="c-blue">D′: Q = ' + num(p.A1, 1) + ' - ' + num(p.B, 1) + 'P</b>, ' +
        'and in the short run price ' + (s.rise ? 'jumps' : 'drops') + ' to <b>' + money(s.P1) + '</b>: each firm ' + (s.pi1 >= 0 ? 'earns ' : 'loses ') + money(Math.abs(s.pi1)) + '. Firms can enter and exit in the long run.';
    },
    steps: [
      { kind: 'drag', label: 'The long-run equilibrium', prompt: 'Slide the plum point along D′ to where the market ends up once entry or exit has finished.', check: function (f) { return adv(f, f.g.m0 || 'Slide it along D′.'); } },
      { kind: 'drag', label: 'How many firms', prompt: 'Drag the plum supply curve S′ sideways until it has the right number of firms for that equilibrium.', check: function (f) { return f.g.m1 || 'Drag S′ sideways.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys move the highlighted handle (Shift for bigger steps), Space switches handles, Enter confirms.',
    initGuess: function (f) { return { P: Math.round(f.sol.P1 * 100) / 100, n: f.p.n0, m0: false, m1: false }; },
    handles: function (f, S) {
      var p = f.p, d = f.dom, Pn = lrPanels(f, S), Mp = Pn[1], g = f.g, qh = F.supply(p, d.Ph), nMax = Math.floor(d.QX / qh);
      var sHandle = function (n, setN, o) {
        return { x: Mp.gx(n * qh), y: Mp.gy(d.Ph), c: o.c, grip: 'h', snap: { x: 0, y: 0 }, step: o.step, active: o.active,
          hit: function (pt) { return Math.abs(pt.y - Mp.sy(d.Ph)) < 30 ? Math.abs(pt.x - Mp.sx(n * qh)) : 1e9; },
          set: function (f, X) { setN(f, clamp(Math.round(Mp.lx(X) / qh), 10, nMax)); },
          key: function (f, dx, dy) { setN(f, clamp(Math.round(n + (dx || dy) * (Math.abs(dx || dy) > 1 ? 2 : 1) * 1), 10, nMax)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
      };
      if (f.predicting) {
        var lo = Math.max(0.2, (p.A1 - d.QX) / p.B), hi = Math.min(d.PY - 0.1, p.A1 / p.B - 0.05);
        return [
          { x: Mp.gx(p.A1 - p.B * g.P), y: Mp.gy(g.P), c: PLUM, step: 0, active: f.cur === 0,
            set: function (f, X, Y) {
              var a = Mp.pt(p.A1 - p.B * lo, lo), b2 = Mp.pt(p.A1 - p.B * hi, hi), n = G.nearest(X, Y, [a, b2], (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
              f.g.P = clamp(Math.round(Mp.ly(n.y) * 100) / 100, lo, hi); f.g.m0 = true;
            },
            key: function (f, dx, dy) { f.g.P = clamp(Math.round((f.g.P + 0.01 * (dy - dx)) * 100) / 100, lo, hi); f.g.m0 = true; } },
          sHandle(g.n, function (f, n) { f.g.n = n; f.g.m1 = true; }, { c: PLUM, step: 1, active: f.cur === 1 })
        ];
      }
      if (f.exploring) return [sHandle(Math.round(f.ex.n), function (f, n) { f.ex.n = n; }, { c: C.ink, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, d = f.dom, b = f.base(), g = f.g, Pn = lrPanels(f, S), Fp = Pn[0], Mp = Pn[1];
      hideKitAxes(D, S);
      pAxes(D, S, Fp, { title: 'One firm ($ per unit)', xt: 'q', xs: 2, ys: d.Ps, yfmt: function (v) { return num(v); } });
      pAxes(D, S, Mp, { title: 'The market', xt: 'Q', xs: d.Qs, ys: d.Ps, xskip: S.narrow || (Mp.px1 - Mp.px0) / (d.QX / d.Qs) < 58, xfmt: function (v) { return num(v); } });
      var te = f.t('entry'), tl = f.t('lrs'), tn = f.t('nums');
      var n = f.exploring ? f.ex.n : f.revealing ? lerp(p.n0, s.nLR, te) : p.n0, st = LR.at(p, n, p.A1);
      // firm panel
      pFn(D, Fp, function (q) { return F.smc(p, q); }, 0.05, d.qX, { c: SMC, w: 4.5, pr: b });
      pFn(D, Fp, function (q) { return F.sac(p, q); }, 0.3, d.qX, { c: SAC, w: 4.5, pr: b });
      if (b > 0.9) {
        var qs = 2 + Math.sqrt(Math.max(0, 0.9 * d.PY - p.c + 4)), qa = qs; while (qa < d.qX * 0.96 && F.sac(p, qa + 0.05) <= 0.88 * d.PY) qa += 0.05;
        pNear(D, Fp, qs, F.smc(p, qs), 'SMC', { c: SMCT, size: S.ss, d: 10, ring: 50 });
        pNear(D, Fp, qa, F.sac(p, qa), 'SAC', { c: SACT, size: S.ss, d: 10, ring: 50 });
      }
      pHLine(D, Fp, st.P, { c: C.ink, w: 3, dash: '10 6', layer: 'over', reg: false, op: b });
      if (st.q > 0 && Math.abs(st.P - st.sac) > 0.004) pArea(D, Fp, box(0, st.sac, st.q, st.P), { fill: st.pi >= 0 ? GAIN : LOSS, fo: 0.32, stroke: st.pi >= 0 ? GAIN : LOSS, sw: 2, op: b });
      pDot(D, Fp, st.q, st.P, { c: C.ink, r: 8, pr: b });
      if (b > 0.9) pYval(D, S, Fp, st.P, money(st.P) + (Math.abs(st.pi) < 0.005 ? ', profit $0' : st.pi > 0 ? ', profit ' + money(st.pi) : ', loss ' + money(-st.pi)),
        { c: Math.abs(st.pi) < 0.005 ? C.ink : st.pi > 0 ? GAINT : LOSST, dy: st.P >= s.Pstar ? -10 : 24 });
      // market panel: D (faded), D', supply, equilibria
      pFnP(D, Mp, lrDem(p, p.A0), 0, d.PY, { c: DEM, w: 3, op: 0.4, pr: b, reg: false });
      pFnP(D, Mp, lrDem(p, p.A1), 0, d.PY, { c: DEM, w: 5, pr: b });
      if (n !== p.n0) pFnP(D, Mp, lrSup(p, p.n0), s.psd, d.PY, { c: SMC, w: 3, op: 0.35, reg: false });
      pFnP(D, Mp, lrSup(p, n), s.psd, d.PY, { c: SMC, w: 4.5, pr: b });
      if (b > 0.9) {
        // at the right end of the panel; the higher of D and D' is labelled above its line, the lower one below
        var dLab = function (A, s1, up) {
          var Qe = Math.min(0.97 * d.QX, A - p.B * 0.3), P = (A - Qe) / p.B, x = Mp.sx(Qe), y = Mp.sy(P);
          D.label(s1, up ? [{ x: x, y: y - 12, anchor: 'end' }, { x: x - 30, y: y - 14, anchor: 'end' }] : [{ x: x, y: y + 28, anchor: 'end' }, { x: x - 30, y: y + 30, anchor: 'end' }], { c: up || s1 === 'D′' ? DEMT : C.blue, size: S.ss, ring: 40 });
        };
        dLab(p.A1, 'D′', p.A1 > p.A0); dLab(p.A0, 'D', p.A0 > p.A1);
        pNear(D, Mp, n * F.supply(p, d.PY * 0.97), d.PY * 0.97, n === p.n0 ? 'S' : 'S′', { c: SMCT, size: S.ss, d: 10, ring: 50 });
      }
      pDot(D, Mp, s.Q0, s.Pstar, { c: C.soft, r: 7, pr: b });
      pDot(D, Mp, st.Q, st.P, { c: C.ink, r: 8, pr: b });
      if (f.predicting) {
        if (b > 0.9) pNear(D, Mp, s.Q1, s.P1, 'short run ' + money(s.P1), { c: C.ink, size: S.ss, d: 16, prio: 0, ring: 90 });
        if (g.m1 || f.cur === 1) pFnP(D, Mp, lrSup(p, g.n), s.psd, d.PY, { c: PLUM, w: 3.5, dash: '8 6', layer: 'over', reg: false });
        var qh = F.supply(p, d.Ph);
        pNear(D, Mp, g.n * qh, d.Ph, 'S′: n = ' + g.n, { c: PLUM, size: S.ss, d: 22, prio: 0, ring: 80 });
        if (g.m0) { pNear(D, Mp, p.A1 - p.B * g.P, g.P, money(g.P), { c: PLUM, size: S.ss, d: 22, prio: 0, ring: 80 }); pVLine(D, Mp, p.A1 - p.B * g.P, 0, g.P, { c: PLUM, w: 2, dash: '4 6', op: 0.6, layer: 'under', reg: false }); }
        return;
      }
      if (f.ghostOn()) {
        D.ghost(Mp.gx(p.A1 - p.B * g.P), Mp.gy(g.P), { op: f.gOp() });
        pFnP(D, Mp, lrSup(p, g.n), s.psd, d.PY, { c: PLUM, w: 3, dash: '3 7', op: 0.75 * f.gOp(), layer: 'over', reg: false });
      }
      if (tl > 0) {
        pHLine(D, Mp, s.Pstar, { c: SAVC, w: 5, dash: null, op: tl, layer: 'under', reg: false });
        pYval(D, S, Mp, s.Pstar, 'LRS ' + money(s.Pstar), { c: SAVCT, op: tl, dy: s.rise ? 24 : -10, size: S.ss });
        pDot(D, Mp, s.QLR, s.Pstar, { c: C.ink, r: 9, pr: tl });
      }
      if (tn > 0 && !f.exploring) pNear(D, Mp, s.QLR, s.Pstar, 'n ≈ ' + Math.round(s.nLR) + ', Q = ' + num(s.QLR, 0), { c: C.ink, size: S.ss, d: 18, op: tn, prio: 0, ring: 110 });
    },
    reveal: function () { return [['ghost', 0, 400], ['entry', 300, 2600, 'linear'], ['lrs', 2900, 600], ['nums', 3300, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, rise = s.rise;
      return {
        rows: [['Long-run price', money(g.P), money(s.Pstar)], ['Market quantity', num(p.A1 - p.B * g.P, 0), num(s.QLR, 0)], ['Firms', num(g.n), '&asymp; ' + Math.round(s.nLR)]],
        why: (rise ? 'A profit of ' + money(s.pi1) + ' per firm draws new firms in. Each entrant shifts supply right and pushes the price down D′' : 'A loss of ' + money(-s.pi1) + ' per firm drives firms out. Each exit shifts supply left and lifts the price up D′') +
          ', and it stops only when profit is zero: price back at <b>min SAC, ' + money(s.Pstar) + '</b>, each firm making ' + num(s.qstar, 2) + '. D′ buys ' + num(p.A1, 1) + ' - ' + num(p.B, 1) + ' &times; ' + num(s.Pstar, 2) + ' = <b>' + num(s.QLR, 0) + '</b> units there, which takes ' +
          num(s.QLR, 0) + ' / ' + num(s.qstar, 2) + ' &asymp; <b>' + Math.round(s.nLR) + ' firms</b>. The long-run supply curve (LRS) is flat at ' + money(s.Pstar) + ': more demand means more firms, not a higher price.'
      };
    },
    explore: {
      init: function (f) { f.ex.n = Math.round(f.sol.nLR); },
      hint: function (f) { return 'Drag S′ or step the number of firms and watch the firm\'s profit rectangle. <button type="button" class="btn ghost ex-play" data-act="play">Replay ' + (f.sol.rise ? 'entry' : 'exit') + '</button>'; },
      act: function (f, a) {
        if (a !== 'play') return;
        var to = Math.round(f.sol.nLR);
        f.tween(f.p.n0, to, 2400, function (v) { f.ex.n = v; }, function () { f.ex.n = to; f.syncControls(); f.render(); });
      },
      controls: function (f) {
        var d = f.dom, nMax = Math.floor(d.QX / F.supply(f.p, d.Ph));
        return [{ kind: 'stepper', label: 'Firms n', get: function (f) { return Math.round(f.ex.n); }, set: function (f, v) { f.ex.n = v; }, step: 10, min: 10, max: nMax, fmt: function (v) { return num(Math.round(v)); }, dur: 350 }];
      },
      readout: function (f) {
        var p = f.p, n = Math.round(f.ex.n), st = LR.at(p, n, p.A1), pi = Math.abs(st.pi) < 0.005 ? 0 : st.pi;
        return n + ' firms: price <b>' + money(st.P) + '</b>, each firm makes ' + num(st.q, 2) + ' at SAC ' + money(st.sac) + ', profit <b class="' + (pi > 0 ? 'c-green' : pi < 0 ? 'c-red' : '') + '">' + sign$(pi) + '</b>. Market Q ' + num(st.Q, 0) + '. ' +
          (pi > 0 ? 'Profit: more firms will enter.' : pi < 0 ? 'Losses: firms will exit.' : 'Zero profit: no reason to enter or exit.');
      }
    }
  };

  window.W7FIGS = [f71, f72, f73, f75, f77, f78, f79];
})();
