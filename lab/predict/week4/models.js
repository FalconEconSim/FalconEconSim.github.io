/* Week 4 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 * Demand is linear, Q = a - bP, unless noted; point elasticity e_d = -bP/Q (textbook eq. 4.1).
 *
 * Defaults match week4-viz.html:
 *   4.1  Q = 100 - 2P, A at P = $25 (Q 50), B at P = $40 (Q 20) -> arc e_d = -1.857, midpoint P 32.5, Q 35
 *   4.2  Q = 100 - 2P; unit elastic at P = $25, Q = 50. Target |e_d| = 3 -> P = $37.5, Q = 25
 *   4.3  Q = 100 - 2P (film). The site's P_old = $25 is already the revenue peak, so the question
 *        starts from its P_new = $35 (|e_d| = 2.33): a cut to $25 raises TR from $1,050 to $1,250.
 *   4.4  Pharmaceuticals e_d = -0.3, %dP = +10: %dQ = -2.82%, exact %dTR = +6.90% (shortcut +7%)
 *   4.6  Q = 120 - 2P, P rises $15 -> $25: CS $2,025 -> $1,225, lost $800 = rectangle $700 + triangle $100
 *   4.7  Q = 40 - 2P (rides), normal fare $5: TR $150, peak at $10 (TR $200), back to $150 at $15
 *   4.8  Consumer 1 Q = 30 - P, Consumer 2 Q = 24 - 2P (film): kink at P = $12, Q = 18; Qm(0) = 54
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most 7 ticks on a 1-2-5 step
  function niceAxis(vmax) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 200) * 200, s: 200 };
  }
  // plot range for a demand line with quantity intercept a and choke price c
  function lineDom(a, c) { var x = niceAxis(a * 1.06), y = niceAxis(c * 1.1); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; }
  function Q(p, P) { return Math.max(0, p.a - p.b * P); }
  function el(p, P) { var q = Q(p, P); return q > 0 ? -p.b * P / q : -Infinity; }
  // linear demands with a whole-dollar choke price
  var LINES = [[100, 2], [60, 1], [80, 2], [120, 3], [150, 3], [200, 4], [60, 2], [80, 1], [120, 4], [40, 1], [90, 2], [120, 2], [100, 4], [160, 4]];

  /* ---------- 4.1 Point vs arc elasticity ---------- */
  var arc = {
    defaults: function () { return { a: 100, b: 2, P1: 25, P2: 40 }; },
    gen: function (rng) {
      var l = pick(rng, LINES), c = l[0] / l[1], j1 = 2 + Math.floor(rng() * 15), j2 = 2 + Math.floor(rng() * 15);
      return { a: l[0], b: l[1], P1: c * Math.min(j1, j2) / 20, P2: c * Math.max(j1, j2) / 20 };
    },
    valid: function (p) {
      var c = p.a / p.b, d = (p.P2 - p.P1) / c;
      return isMult(p.P1, 0.5) && isMult(p.P2, 0.5) && d >= 0.25 && d <= 0.6 && p.P1 >= 0.1 * c && p.P2 <= 0.9 * c && (p.P1 + p.P2) / 2 >= 0.32 * c;
    },
    random: function (rng, prev) { return draw(arc.gen, arc.valid, prev, rng); },
    solve: function (p) {
      var c = p.a / p.b, Q1 = Q(p, p.P1), Q2 = Q(p, p.P2), Pm = (p.P1 + p.P2) / 2, Qm = (Q1 + Q2) / 2;
      var arcE = ((Q2 - Q1) / Qm) / ((p.P2 - p.P1) / Pm);
      return { c: c, Q1: Q1, Q2: Q2, Pm: Pm, Qm: Qm, arc: arcE, e1: el(p, p.P1), e2: el(p, p.P2), em: el(p, Pm), start: Math.round(c * 0.1 * 10) / 10 };
    },
    domain: function (p) { return lineDom(p.a, p.a / p.b); },
    score: function (p, g) {
      var s = arc.solve(p); if (g.P == null) return { total: 0 };
      return { total: Math.round(100 * lin((g.P - s.Pm) / s.c, 0.012, 0.2)) };
    }
  };

  /* ---------- 4.2 Elasticity along the curve (heatmap) ---------- */
  var KS = [0.25, 0.5, 1.5, 2, 3, 4];
  var heat = {
    KS: KS,
    defaults: function () { return { a: 100, b: 2, k: 3 }; },
    gen: function (rng) { var l = pick(rng, LINES); return { a: l[0], b: l[1], k: pick(rng, KS) }; },
    valid: function (p) { return p.a / p.b >= 20; },
    random: function (rng, prev) { return draw(heat.gen, heat.valid, prev, rng); },
    // |e_d| = k  <=>  bP / (a - bP) = k  <=>  P = k/(1+k) x a/b
    priceFor: function (p, k) { return k / (1 + k) * p.a / p.b; },
    solve: function (p) {
      var c = p.a / p.b, Pu = c / 2, Pk = heat.priceFor(p, p.k);
      return { c: c, Pu: Pu, Qu: p.a / 2, Pk: Pk, Qk: Q(p, Pk), ek: el(p, Pk) };
    },
    domain: function (p) { return lineDom(p.a, p.a / p.b); },
    score: function (p, g) {
      var s = heat.solve(p);
      var s1 = g.u ? lin((g.u.y - s.Pu) / s.c, 0.012, 0.2) : 0, s2 = g.k ? lin((g.k.y - s.Pk) / s.c, 0.012, 0.2) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 4.3 The revenue rectangle (has a film) ---------- */
  var revenue = {
    BS: [1, 1.25, 2, 2.5, 4, 5],
    defaults: function () { return { a: 100, b: 2, P0: 35 }; },
    gen: function (rng) { var b = pick(rng, revenue.BS), c = 100 / b; return { a: 100, b: b, P0: c * (2 + Math.floor(rng() * 17)) / 20 }; },
    valid: function (p) { var c = p.a / p.b, j = p.P0 / c * 20; return isMult(p.P0, 0.5) && Math.abs(j - 10) >= 4 - 1e-9; },
    random: function (rng, prev) { return draw(revenue.gen, revenue.valid, prev, rng); },
    solve: function (p) {
      var c = p.a / p.b, Ps = c / 2, Qs = p.a / 2, Q0 = Q(p, p.P0);
      return { c: c, Ps: Ps, Qs: Qs, TRmax: Ps * Qs, Q0: Q0, TR0: p.P0 * Q0, e0: el(p, p.P0), dir: Ps > p.P0 ? 1 : -1 };
    },
    TR: function (p, P) { return P * Q(p, P); },
    domain: function (p) { return lineDom(p.a, p.a / p.b); },
    score: function (p, g) {
      var s = revenue.solve(p), moved = g.P - p.P0;
      var sd = Math.abs(moved) > 1e-9 && Math.sign(moved) === s.dir ? 1 : 0, sc = lin((g.P - s.Ps) / s.c, 0.012, 0.25);
      return { total: Math.round(100 * (0.3 * sd + 0.7 * sc)), parts: [sd, sc] };
    }
  };

  /* ---------- 4.4 Pricing strategy: constant-elasticity demand ---------- */
  var IND = [
    { key: 'pharma', name: 'Pharmaceuticals', e: -0.3 }, { key: 'petrol', name: 'Gasoline', e: -0.2 },
    { key: 'electric', name: 'Electricity', e: -0.1 }, { key: 'airline', name: 'Airline tickets', e: -1.4 },
    { key: 'coffee', name: 'Coffee shop', e: -2.3 }, { key: 'fashion', name: 'Fashion clothing', e: -2.8 },
    { key: 'hotel', name: 'Hotel rooms', e: -1.8 }
  ];
  var pricing = {
    IND: IND,   // plot y = percent + H, so the frame runs from -H% to +H% (H = domain(p).Y / 2)
    ind: function (key) { for (var i = 0; i < IND.length; i++) if (IND[i].key === key) return IND[i]; return IND[0]; },
    defaults: function () { return { ind: 'pharma', dp: 10 }; },
    gen: function (rng) { return { ind: pick(rng, IND).key, dp: pick(rng, [-30, -25, -20, -15, -10, -5, 5, 10, 15, 20, 25, 30]) }; },
    valid: function (p) { var s = pricing.solve(p); return Math.abs(s.dTR) >= 1.5 && Math.abs(s.dQ) <= 55 && Math.abs(s.dTR) <= 55; },
    random: function (rng, prev) { return draw(pricing.gen, pricing.valid, prev, rng); },
    // exact: Q_new = Q_old (P_new/P_old)^e, so %dQ = r^e - 1 and %dTR = r^(1+e) - 1 with r = 1 + %dP
    solve: function (p) {
      var e = pricing.ind(p.ind).e, r = 1 + p.dp / 100;
      return { e: e, dQ: 100 * (Math.pow(r, e) - 1), dTR: 100 * (Math.pow(r, 1 + e) - 1), approx: p.dp * (1 + e), elastic: Math.abs(e) > 1 };
    },
    // half-height H: at least 30, room for twice the price change and the answers with a margin
    domain: function (p) {
      var s = pricing.solve(p), need = Math.max(30, 2 * Math.abs(p.dp), 1.25 * Math.max(Math.abs(s.dQ), Math.abs(s.dTR)));
      var H = [30, 40, 60, 80].filter(function (h) { return h >= need - 1e-9; })[0] || 80;
      return { X: 5, Y: 2 * H, xs: 100, ys: H === 30 ? 10 : 20 };
    },
    score: function (p, g) {
      var s = pricing.solve(p);
      var sq = lin(g.q - s.dQ, 1, 12), st = lin(g.tr - s.dTR, 1, 12);
      return { total: Math.round(100 * (0.4 * sq + 0.6 * st)), parts: [sq, st] };
    }
  };

  /* ---------- 4.6 Consumer surplus lost (or gained) ---------- */
  var CSL = [[120, 2], [100, 2], [80, 1], [60, 1], [150, 3], [120, 4], [80, 2], [60, 2], [160, 4], [100, 4], [90, 2]];
  var surplus = {
    defaults: function () { return { a: 120, b: 2, P0: 15, P1: 25 }; },
    gen: function (rng) {
      var l = pick(rng, CSL), c = l[0] / l[1], lo = Math.ceil(0.1 * c), hi = Math.floor(0.8 * c);
      var x = lo + Math.floor(rng() * (hi - lo + 1)), y = lo + Math.floor(rng() * (hi - lo + 1)), rise = rng() < 0.7;
      return { a: l[0], b: l[1], P0: rise ? Math.min(x, y) : Math.max(x, y), P1: rise ? Math.max(x, y) : Math.min(x, y) };
    },
    valid: function (p) { var c = p.a / p.b, d = Math.abs(p.P1 - p.P0) / c; return d >= 0.15 && d <= 0.5; },
    random: function (rng, prev) { return draw(surplus.gen, surplus.valid, prev, rng); },
    CS: function (p, P) { return 0.5 * Q(p, P) * (p.a / p.b - P); },
    solve: function (p) {
      var c = p.a / p.b, Plo = Math.min(p.P0, p.P1), Phi = Math.max(p.P0, p.P1), Qhi = Q(p, Plo), Qlo = Q(p, Phi);
      var rect = (Phi - Plo) * Qlo, tri = 0.5 * (Phi - Plo) * (Qhi - Qlo);
      return { c: c, rise: p.P1 > p.P0, Plo: Plo, Phi: Phi, Qhi: Qhi, Qlo: Qlo, Q0: Q(p, p.P0), Q1: Q(p, p.P1),
        CS0: surplus.CS(p, p.P0), CS1: surplus.CS(p, p.P1), rect: rect, tri: tri, area: rect + tri };
    },
    domain: function (p) { return lineDom(p.a, p.a / p.b); },
    // area between the guessed right edge (xb at Plo to xt at Phi) and the true one (the demand curve)
    symdiff: function (p, g) {
      var s = surplus.solve(p), h = s.Phi - s.Plo, d0 = g.xb - s.Qhi, d1 = g.xt - s.Qlo, A = Math.abs(d0), B = Math.abs(d1);
      if (A + B === 0) return 0;
      return (d0 >= 0) === (d1 >= 0) || d0 === 0 || d1 === 0 ? h * (A + B) / 2 : h * (d0 * d0 + d1 * d1) / (2 * (A + B));
    },
    score: function (p, g) {
      var s = surplus.solve(p), sd = surplus.symdiff(p, g);
      return { total: Math.round(100 * lin(sd / s.area, 0.03, 0.25)), off: sd / s.area };
    }
  };

  /* ---------- 4.7 Surge pricing ---------- */
  var SL = [[40, 2], [30, 1], [48, 2], [32, 2], [60, 3], [40, 1], [60, 2], [50, 2], [36, 2], [80, 4]];
  var surge = {
    defaults: function () { return { a: 40, b: 2, Pn: 5 }; },
    gen: function (rng) { var l = pick(rng, SL), c = l[0] / l[1]; return { a: l[0], b: l[1], Pn: pick(rng, range(Math.ceil(0.15 * c * 2) / 2, 0.4 * c, 0.5)) }; },
    valid: function (p) { var c = p.a / p.b; return p.Pn >= 0.15 * c && p.Pn <= 0.4 * c; },
    random: function (rng, prev) { return draw(surge.gen, surge.valid, prev, rng); },
    TR: function (p, P) { return P * Q(p, P); },
    CS: function (p, P) { return 0.5 * Q(p, P) * (p.a / p.b - P); },
    // TR(P) = P(a - bP) is a parabola symmetric about c/2, so TR(P) = TR(Pn) again at P = c - Pn
    solve: function (p) {
      var c = p.a / p.b, Pm = c / 2, Pb = c - p.Pn;
      return { c: c, Pm: Pm, Pb: Pb, Qn: Q(p, p.Pn), TRn: surge.TR(p, p.Pn), TRm: surge.TR(p, Pm), Qm: Q(p, Pm), Qb: Q(p, Pb), TRb: surge.TR(p, Pb),
        CSn: surge.CS(p, p.Pn), CSm: surge.CS(p, Pm), CSb: surge.CS(p, Pb) };
    },
    domain: function (p) { return lineDom(p.a, p.a / p.b); },
    score: function (p, g) {
      var s = surge.solve(p);
      var s1 = g.m != null ? lin((g.m - s.Pm) / s.c, 0.012, 0.2) : 0, s2 = g.bk != null ? lin((g.bk - s.Pb) / s.c, 0.012, 0.2) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 4.8 Market demand: the horizontal sum (has a film) ---------- */
  var market = {
    defaults: function () { return { a1: 30, b1: 1, a2: 24, b2: 2 }; },
    gen: function (rng) {
      var b1 = pick(rng, [0.5, 1, 2, 3]), b2 = pick(rng, [0.5, 1, 2, 3]), c1 = pick(rng, range(10, 50, 2)), c2 = pick(rng, range(10, 50, 2));
      return { a1: b1 * c1, b1: b1, a2: b2 * c2, b2: b2 };
    },
    valid: function (p) {
      var s = market.solve(p);
      return Math.abs(Math.log(s.c1 / s.c2)) >= Math.log(1.4) && s.Qsum >= 30 && s.Qsum <= 120 && s.Qk >= 0.15 * s.Qsum && s.Qk <= 0.7 * s.Qsum &&
        p.a1 <= 90 && p.a2 <= 90 && isMult(s.Qk, 1);
    },
    random: function (rng, prev) { return draw(market.gen, market.valid, prev, rng); },
    q1: function (p, P) { return Math.max(0, p.a1 - p.b1 * P); },
    q2: function (p, P) { return Math.max(0, p.a2 - p.b2 * P); },
    Qm: function (p, P) { return market.q1(p, P) + market.q2(p, P); },
    solve: function (p) {
      var c1 = p.a1 / p.b1, c2 = p.a2 / p.b2, hi = c1 >= c2 ? 1 : 2, top = Math.max(c1, c2), Pk = Math.min(c1, c2);
      var ah = hi === 1 ? p.a1 : p.a2, bh = hi === 1 ? p.b1 : p.b2;
      return { c1: c1, c2: c2, hi: hi, top: top, Pk: Pk, Qk: ah - bh * Pk, Qsum: p.a1 + p.a2, ah: ah, bh: bh, bsum: p.b1 + p.b2 };
    },
    domain: function (p) { var s = market.solve(p), x = niceAxis(s.Qsum * 1.08), y = niceAxis(s.top * 1.12); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    start: function (D) { return { top: Math.round(D.Y * 0.45 * 2) / 2, kx: Math.round(D.X * 0.6 * 2) / 2, ky: Math.round(D.Y * 0.62 * 2) / 2, bot: Math.round(D.X * 0.35 * 2) / 2 }; },
    score: function (p, g) {
      var s = market.solve(p), D = market.domain(p);
      var st = lin((g.top - s.top) / D.Y, 0.015, 0.2), sk = lin(Math.hypot((g.kx - s.Qk) / D.X, (g.ky - s.Pk) / D.Y), 0.02, 0.2), sb = lin((g.bot - s.Qsum) / D.X, 0.015, 0.2);
      return { total: Math.round(100 * (0.25 * st + 0.4 * sk + 0.35 * sb)), parts: [st, sk, sb] };
    }
  };

  var W4 = { arc: arc, heat: heat, revenue: revenue, pricing: pricing, surplus: surplus, surge: surge, market: market,
    util: { Q: Q, el: el, lin: lin, niceAxis: niceAxis, lineDom: lineDom, isMult: isMult, pick: pick, range: range } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W4;
  else root.W4 = W4;
})(this);
