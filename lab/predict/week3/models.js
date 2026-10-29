/* Week 3 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week3-viz.html (and the fig31 / fig32 films):
 *   3.1  I = 60, PY = 3, Cobb-Douglas a = 0.5: X* = 30 / PX, Y* = 10. The question: PX falls $6 -> $2,
 *        X* goes 5 -> 15 (two of the page's four steps, 6, 4, 2, 1).
 *   3.2  I = 60, PY = 3, PX $3 -> $1.50, a = 0.5. A = (10, 10), C = (14.14, 7.07), B = (20, 10),
 *        SE = +4.14, IE = +5.86, TE = +10. C is the textbook's (Hicks) construction: the compensated
 *        line has the new slope and just touches the ORIGINAL indifference curve. Kept on purpose.
 *   3.3  PX = 2, PY = 3. Normal: X* = 0.5 I / PX. Inferior: X* = 20 - 0.05 I. Income $80 -> $120.
 *   3.4  The page's 25 shift-vs-movement scenarios, on a demand curve Q = 24 - 2 P.
 *   3.5  I = 100, PX = 4, base PY = 4. Share of income on X: s = 0.5 +/- 0.06 (PY - 4)
 *        (+ substitutes, - complements); X* = s I / PX. The question: PY $4 -> $6, substitutes.
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function niceCeil(v, step) { return Math.ceil(v / step - 1e-9) * step; }
  function niceStep(D, max) { var c = [1, 2, 5, 10, 20, 50]; max = max || 8; for (var i = 0; i < c.length; i++) if (D / c[i] <= max + 1e-9) return c[i]; return 100; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function sgn(v, eps) { return Math.abs(v) <= (eps || 1e-9) ? 0 : v > 0 ? 1 : -1; }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  function cd(a, U, x) { return x > 0 ? Math.pow(U / Math.pow(x, a), 1 / (1 - a)) : Infinity; }   // Cobb-Douglas IC: Y at X
  function cdU(a, x, y) { return Math.pow(x, a) * Math.pow(y, 1 - a); }

  /* ---------- 3.1 Deriving the demand curve ---------- */
  var derive = {
    LEVELS: [0.82, 1.22],   // background ICs, as multiples of the new optimum's utility
    defaults: function () { return { I: 60, Py: 3, a: 0.5, P0: 6, P1: 2 }; },
    gen: function (rng) {
      return { I: pick(rng, range(40, 120, 10)), Py: pick(rng, range(2, 6, 1)), a: pick(rng, [0.3, 0.4, 0.5, 0.6, 0.7]),
        P0: pick(rng, range(1, 8, 0.5)), P1: pick(rng, range(1, 8, 0.5)) };
    },
    valid: function (p) {
      if (p.P0 === p.P1) return false;
      var s = derive.solve(p), d = derive.domain(p);
      return isMult(s.X0, 0.5) && isMult(s.X1, 0.5) && isMult(s.Ys, 0.5) && Math.abs(s.X1 - s.X0) >= 3 && Math.min(s.X0, s.X1) >= 2 &&
        d.X <= 60 && d.Yt <= 50 && s.yI >= 8 && Math.max(p.P0, p.P1) / Math.min(p.P0, p.P1) <= 4 && Math.max(p.P0, p.P1) / Math.min(p.P0, p.P1) >= 1.5;
    },
    random: function (rng, prev) { return draw(derive.gen, derive.valid, prev, rng); },
    xAt: function (p, P) { return p.a * p.I / P; },          // the demand curve: X* = a I / PX
    solve: function (p) {
      var X0 = derive.xAt(p, p.P0), X1 = derive.xAt(p, p.P1), Ys = (1 - p.a) * p.I / p.Py;
      return { X0: X0, X1: X1, Ys: Ys, U0: cdU(p.a, X0, Ys), U1: cdU(p.a, X1, Ys), yI: p.I / p.Py, xI0: p.I / p.P0, xI1: p.I / p.P1,
        k: p.a * p.I, spend: p.a * p.I, dir: sgn(X1 - X0) };
    },
    domain: function (p) {
      var X0 = derive.xAt(p, p.P0), X1 = derive.xAt(p, p.P1), yI = p.I / p.Py;
      var X = niceCeil(Math.max(X0, X1) * 1.5, 5), Yt = niceCeil(yI * 1.2, 5), P = Math.max(3, niceCeil(Math.max(p.P0, p.P1) * 1.25, 1)), xs = niceStep(X);
      X = niceCeil(X, xs);
      return { X: X, Y: 100, xs: xs, ys: 1e9, Yt: Yt, yts: niceStep(Yt, 5), P: P, ps: P <= 6 ? 1 : 2 };
    },
    ic: function (p, U, x) { return cd(p.a, U, x); },
    // g: { opt: {x, y} best bundle (good X, good Y), dem: {x, p} demand point (quantity, price) }
    score: function (p, g) {
      var s = derive.solve(p), d = derive.domain(p), s1 = 0, s2 = 0;
      if (g.opt) s1 = lin(Math.hypot((g.opt.x - s.X1) / d.X, (g.opt.y - s.Ys) / d.Yt), 0.03, 0.3);
      if (g.dem) s2 = 0.5 * lin((g.dem.x - s.X1) / d.X, 0.02, 0.25) + 0.5 * lin((g.dem.p - p.P1) / d.P, 0.03, 0.3);
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 3.2 Slutsky decomposition (textbook's Hicks construction) ---------- */
  var slutsky = {
    defaults: function () { return { I: 60, Py: 3, P0: 3, P1: 1.5, a: 0.5 }; },
    gen: function (rng) {
      return { I: pick(rng, range(40, 120, 10)), Py: pick(rng, range(2, 6, 1)), P0: pick(rng, range(1.5, 6, 0.5)), P1: pick(rng, range(1, 6, 0.5)), a: pick(rng, [0.4, 0.5, 0.6]) };
    },
    valid: function (p) {
      if (Math.max(p.P0, p.P1) / Math.min(p.P0, p.P1) < 1.4) return false;
      var s = slutsky.solve(p), D = slutsky.domain(p).X;
      return Math.abs(s.SE) >= Math.max(1.5, 0.06 * D) && Math.abs(s.IE) >= 1.5 && isMult(s.XA, 0.5) && isMult(s.XB, 0.5) && isMult(s.YA, 0.5) &&
        Math.max(s.XA, s.XB, s.XC, s.YA, s.YC) <= 0.85 * D && D <= 60 && s.Mc >= 0.3 * p.I && s.Mc <= 1.7 * p.I && Math.abs(p.I - s.Mc) >= 0.08 * p.I;
    },
    random: function (rng, prev) { return draw(slutsky.gen, slutsky.valid, prev, rng); },
    // Hicksian (compensated) demand at price P for utility U
    hicks: function (p, U, P) {
      var a = p.a, x = U * Math.pow(a * p.Py / ((1 - a) * P), 1 - a), y = x * (1 - a) * P / (a * p.Py);
      return { x: x, y: y, M: P * x + p.Py * y };
    },
    solve: function (p) {
      var a = p.a, XA = a * p.I / p.P0, YA = (1 - a) * p.I / p.Py, XB = a * p.I / p.P1, YB = YA, UA = cdU(a, XA, YA), UB = cdU(a, XB, YB);
      var h = slutsky.hicks(p, UA, p.P1);
      return { XA: XA, YA: YA, XB: XB, YB: YB, UA: UA, UB: UB, XC: h.x, YC: h.y, Mc: h.M, SE: h.x - XA, IE: XB - h.x, TE: XB - XA,
        yI: p.I / p.Py, xIA: p.I / p.P0, xIB: p.I / p.P1, normal: (XB - h.x) * (XB - XA) > 0 || Math.abs(XB - h.x) < 1e-12, fall: p.P1 < p.P0 };
    },
    domain: function (p) {
      var s0 = { XA: p.a * p.I / p.P0, XB: p.a * p.I / p.P1, YA: (1 - p.a) * p.I / p.Py }, h = slutsky.hicks(p, cdU(p.a, s0.XA, s0.YA), p.P1);
      var D = niceCeil(Math.max(s0.XA, s0.XB, h.x, s0.YA, h.y, p.I / p.Py) * 1.18, 5);
      return { X: D, Y: D, xs: niceStep(D), ys: niceStep(D) };
    },
    ic: function (p, U, x) { return cd(p.a, U, x); },
    // g: { M: income behind the student's compensated line, cx: X of the student's C on U1 }
    score: function (p, g) {
      var s = slutsky.solve(p), D = slutsky.domain(p).X;
      var s1 = g.M > 0 ? lin(Math.log(g.M / s.Mc), Math.log(1.02), Math.log(1.3)) : 0;
      var s2 = g.cx != null ? lin((g.cx - s.XC) / D, 0.012, 0.15) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 3.3 Income effects: normal and inferior goods ---------- */
  var income = {
    Px: 2, Py: 3,
    defaults: function () { return { type: 'normal', I0: 80, I1: 120 }; },
    gen: function (rng) {
      var I0 = pick(rng, range(40, 120, 10));
      return { type: rng() < 0.5 ? 'normal' : 'inferior', I0: I0, I1: I0 + pick(rng, [20, 30, 40, 40, -20, -30]) };
    },
    valid: function (p) { return p.I1 >= 40 && p.I1 <= 160 && p.I1 !== p.I0; },
    random: function (rng, prev) { return draw(income.gen, income.valid, prev, rng); },
    x: function (type, I) { return type === 'normal' ? 0.5 * I / income.Px : 20 - 0.05 * I; },
    y: function (type, I) { return (I - income.Px * income.x(type, I)) / income.Py; },
    dxdi: function (type) { return type === 'normal' ? 0.5 / income.Px : -0.05; },
    // her IC through the bundle at income I: Cobb-Douglas XY = const for the normal good; for the
    // inferior good the page's convex curve, tangent to the budget line there (slope -PX/PY)
    ic: function (type, I) {
      var xs = income.x(type, I), ys = income.y(type, I), m = -income.Px / income.Py;
      if (type === 'normal') return { fn: function (x) { return x > 0 ? xs * ys / x : Infinity; }, a: 0.05, b: Infinity };
      return { fn: function (x) { return ys + m * (x - xs) + 0.025 * (x - xs) * (x - xs); }, a: 0, b: xs - m / 0.05 };
    },
    solve: function (p) {
      var Px = income.Px, X0 = income.x(p.type, p.I0), X1 = income.x(p.type, p.I1);
      return { X0: X0, Y0: income.y(p.type, p.I0), X1: X1, Y1: income.y(p.type, p.I1), dX: X1 - X0, dir: sgn(X1 - X0),
        k0: Px * X0, k1: Px * X1, dxdi: income.dxdi(p.type), shift: sgn(X1 - X0) > 0 ? 'right' : 'left', rise: p.I1 > p.I0 };
    },
    // the frame depends only on the type, so every income from $40 to $160 fits it
    domain: function (p) {
      return p.type === 'normal' ? { X: 50, Y: 100, xs: 10, ys: 1e9, Yt: 30, yts: 10, P: 6, ps: 2 }
        : { X: 25, Y: 100, xs: 5, ys: 1e9, Yt: 50, yts: 10, P: 6, ps: 2 };
    },
    // g: { x: X of her new bundle on the new budget line, q: quantity on her shifted demand curve at PX }
    score: function (p, g) {
      var s = income.solve(p), size = Math.abs(s.dX);
      function part(v) { return sgn(v - s.X0, 1e-6) === s.dir ? 0.4 + 0.6 * lin((v - s.X1) / size, 0.12, 1) : 0; }
      var s1 = part(g.x), s2 = part(g.q);
      return { total: Math.round(100 * (0.6 * s1 + 0.4 * s2)), parts: [s1, s2] };
    }
  };

  /* ---------- 3.4 Shift vs. movement ---------- */
  // kind 'movement': own price goes P0 -> P1. kind 'shift': dir +1 right, -1 left (at the starting price $4).
  var SCEN = [
    { t: 'P_X rises from $3 to $5.', kind: 'movement', P0: 3, P1: 5, why: 'A change in the good\'s own price causes a movement along the demand curve: the consumer slides to a new point on the existing curve.' },
    { t: 'Her income increases by 25% (X is a normal good).', kind: 'shift', dir: 1, why: 'Income changes shift the entire demand curve: at every price, demand changes. For a normal good, demand shifts rightward.' },
    { t: 'The price of a complement good falls.', kind: 'shift', dir: 1, why: 'A complement\'s price change shifts the demand curve. Cheaper complements increase demand for X, shifting the curve right.' },
    { t: 'Her tastes shift toward good X.', kind: 'shift', dir: 1, why: 'Preference changes shift the demand curve. Stronger tastes for X mean more is demanded at every price: a rightward shift.' },
    { t: 'P_X falls from $4 to $2.', kind: 'movement', P0: 4, P1: 2, why: 'A change in own price causes a movement along the existing demand curve: quantity demanded increases, but the curve itself does not shift.' },
    { t: 'The price of a substitute good rises.', kind: 'shift', dir: 1, why: 'When a substitute becomes more expensive, consumers switch to X: demand for X increases at every price, shifting the curve rightward.' },
    { t: 'Her income falls by 30% (X is a normal good).', kind: 'shift', dir: -1, why: 'Lower income shifts the demand curve. For a normal good, demand shifts leftward (less demanded at every price).' },
    { t: 'The government puts a $2 per-unit tax on good X, raising its price from $4 to $6.', kind: 'movement', P0: 4, P1: 6, why: 'A per-unit tax raises the effective price of X for the consumer: this causes a movement along the existing demand curve, not a shift.' },
    { t: 'A new scientific study shows X has major health benefits.', kind: 'shift', dir: 1, why: 'Improved perceptions of X shift demand rightward: at every price, consumers now demand more of X.' },
    { t: 'P_X rises from $2 to $6.', kind: 'movement', P0: 2, P1: 6, why: 'Own-price change: movement along the demand curve. Quantity demanded falls as you move up the curve.' },
    { t: 'The price of a complement good rises.', kind: 'shift', dir: -1, why: 'A costlier complement means demand for X falls: a leftward shift of the demand curve.' },
    { t: 'The number of buyers in the market doubles.', kind: 'shift', dir: 1, why: 'More buyers means more total demand at every price: a rightward shift of the market demand curve.' },
    { t: 'A government subsidy cuts P_X by $1 per unit, from $4 to $3.', kind: 'movement', P0: 4, P1: 3, why: 'A subsidy that lowers the effective price of X causes movement along the demand curve: the own price changed, so quantity adjusts along the existing curve.' },
    { t: 'Consumers expect P_X to rise sharply next month.', kind: 'shift', dir: 1, why: 'Expectations of future price increases cause consumers to buy more today, shifting demand for X rightward right now.' },
    { t: 'A new advertising campaign makes X more fashionable.', kind: 'shift', dir: 1, why: 'Advertising shifts tastes and preferences: more demand for X at every price, shifting the curve rightward.' },
    { t: 'P_X falls from $10 to $6.', kind: 'movement', P0: 10, P1: 6, why: 'Only the own price of X changed. The consumer moves down along the existing demand curve to a higher quantity.' },
    { t: 'The price of a substitute good falls sharply.', kind: 'shift', dir: -1, why: 'When a substitute becomes cheaper, consumers switch away from X: demand for X decreases at every price, shifting the curve leftward.' },
    { t: 'A recession cuts household incomes by 15% (X is a normal good).', kind: 'shift', dir: -1, why: 'For a normal good, lower income shifts demand leftward: less demanded at every price.' },
    { t: 'P_X is unchanged but P_Y doubles (Y is a complement).', kind: 'shift', dir: -1, why: 'P_Y is NOT the own price of X. A change in the price of a complement shifts the demand curve for X leftward.' },
    { t: 'The population in the market grows by 10%.', kind: 'shift', dir: 1, why: 'More potential buyers shifts market demand rightward: at every price, total quantity demanded is higher.' },
    { t: 'P_X rises from $5 to $5.50.', kind: 'movement', P0: 5, P1: 5.5, why: 'Even a small change in own price causes a movement along the demand curve: quantity falls slightly, but the curve itself does not shift.' },
    { t: 'A social media trend makes X less desirable.', kind: 'shift', dir: -1, why: 'Changing tastes shift demand. If X becomes less desirable, demand shifts leftward at every price.' },
    { t: 'A competing substitute good is pulled from the shelves.', kind: 'shift', dir: 1, why: 'Removing a substitute reduces the alternatives available: consumers demand more X at every price, shifting the curve rightward.' },
    { t: 'P_X falls from $8 to $3.', kind: 'movement', P0: 8, P1: 3, why: 'Own-price change: movement along the demand curve. As price falls, quantity demanded rises along the existing curve.' },
    { t: 'Consumer credit becomes easier to get.', kind: 'shift', dir: 1, why: 'Easier credit effectively raises purchasing power (like an income increase): demand shifts rightward for normal goods.' }
  ];
  var drill = {
    SCEN: SCEN, A: 24, B: 2, PSTART: 4, SHOW: 6,   // Q = A - B P; shifts start at $4 and the answer slides 6 units
    defaults: function () { return { i: 2 }; },
    random: function (rng, prev) { var i; do { i = Math.floor(rng() * SCEN.length); } while (prev && i === prev.i); return { i: i }; },
    q: function (P, dq) { return drill.A - drill.B * P + (dq || 0); },
    solve: function (p) {
      var sc = SCEN[p.i], P0 = sc.kind === 'movement' ? sc.P0 : drill.PSTART, Q0 = drill.q(P0);
      var out = { sc: sc, kind: sc.kind, P0: P0, Q0: Q0 };
      if (sc.kind === 'movement') { out.P1 = sc.P1; out.Q1 = drill.q(sc.P1); out.qdir = sgn(out.Q1 - Q0); out.pdir = sgn(sc.P1 - P0); out.dq = 0; }
      else { out.P1 = P0; out.dq = sc.dir * drill.SHOW; out.Q1 = Q0 + out.dq; out.qdir = sc.dir; out.pdir = 0; }
      return out;
    },
    domain: function () { return { X: 36, Y: 12, xs: 6, ys: 2 }; },
    // g: { mode: 'move' | 'shift' | null, P: price after a movement, dq: horizontal shift of the curve }
    score: function (p, g) {
      var s = drill.solve(p), kind = 0, dir = 0;
      if (s.kind === 'movement' && g.mode === 'move') {
        kind = 1;
        if (sgn(g.P - s.P0, 1e-6) === s.pdir) dir = 0.5 + 0.5 * lin(g.P - s.P1, 0.25, 2.5);
      }
      if (s.kind === 'shift' && g.mode === 'shift') { kind = 1; if (sgn(g.dq, 0.5) === s.sc.dir) dir = 1; }
      return { total: Math.round(100 * (0.6 * kind + 0.4 * dir * kind)), kind: kind, dir: dir };
    }
  };

  /* ---------- 3.5 Cross-price effects ---------- */
  var cross = {
    PYBASE: 4,
    defaults: function () { return { rel: 'sub', I: 100, Px: 4, Py0: 4, Py1: 6 }; },
    gen: function (rng) {
      return { rel: rng() < 0.5 ? 'sub' : 'comp', I: pick(rng, range(60, 150, 10)), Px: pick(rng, range(2, 6, 1)), Py0: pick(rng, range(2, 7, 1)), Py1: pick(rng, range(1, 8, 1)) };
    },
    valid: function (p) {
      if (Math.abs(p.Py1 - p.Py0) < 2) return false;
      var s = cross.solve(p), d = cross.domain(p);
      return isMult(s.X0, 0.5) && isMult(s.X1, 0.5) && Math.abs(s.X1 - s.X0) / s.X0 >= 0.1 && Math.min(s.s0, s.s1) >= 0.2 && Math.max(s.s0, s.s1) <= 0.8 &&
        d.X <= 80 && Math.max(s.X0, s.X1) <= 0.7 * d.X;
    },
    random: function (rng, prev) { return draw(cross.gen, cross.valid, prev, rng); },
    share: function (rel, Py) { return 0.5 + (rel === 'sub' ? 1 : -1) * 0.06 * (Py - cross.PYBASE); },
    solve: function (p) {
      var s0 = cross.share(p.rel, p.Py0), s1 = cross.share(p.rel, p.Py1);
      var X0 = s0 * p.I / p.Px, X1 = s1 * p.I / p.Px;
      return { s0: s0, s1: s1, X0: X0, X1: X1, k0: s0 * p.I, k1: s1 * p.I, Y0: (1 - s0) * p.I / p.Py0, Y1: (1 - s1) * p.I / p.Py1,
        dir: Math.abs(X1 - X0) < 1e-9 ? 0 : X1 > X0 ? 1 : -1, shift: X1 > X0 ? 'right' : 'left' };
    },
    domain: function (p) {
      var s = cross.solve(p), X = niceCeil(Math.max(s.X0, s.X1) * 1.8, 10), P = niceCeil(p.Px * 1.75, 1);
      return { X: X, Y: P, xs: niceStep(X), ys: P <= 8 ? 1 : 2 };
    },
    // g: { x: quantity where the student's shifted curve crosses the current PX }
    score: function (p, g) {
      var s = cross.solve(p), ok = sgn(g.x - s.X0, 1e-6) === s.dir;
      var v = ok ? 0.4 + 0.6 * lin((g.x - s.X1) / Math.abs(s.X1 - s.X0), 0.1, 1) : 0;
      return { total: Math.round(100 * v), dirOK: ok };
    }
  };

  var W3 = { derive: derive, slutsky: slutsky, income: income, drill: drill, cross: cross,
    util: { niceStep: niceStep, pick: pick, range: range, niceCeil: niceCeil, isMult: isMult, lin: lin, cd: cd, cdU: cdU, sgn: sgn } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W3;
  else root.W3 = W3;
})(this);
