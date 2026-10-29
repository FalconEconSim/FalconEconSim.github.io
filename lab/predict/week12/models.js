/* Week 12 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week12-viz.html and the textbook (ch. 12, eq. 12.1 and the Spence figure):
 *   12.1  Lemons. Buyers value a lemon at $1,200 and a peach at $2,400; a lemon owner sells for $1,000,
 *         a peach owner needs $2,000. E[WTP] = 1,200 + 1,200p, knife-edge p* = 800 / 1,200 = 2/3.
 *         The question asks about p = 0.50 (the live slider's start and the film's case): the average
 *         offer is $1,800 < $2,000, peaches exit, and the most a buyer pays for a car on sale is $1,200.
 *   12.2  Spence. y_H = $100k, y_L = $40k, c_H = s, c_L = 3s. The low type will not mimic when
 *         100 - 3s <= 40 (s >= 20); the high type still signals when 100 - s >= 40 (s <= 60).
 *         Separating range 20 <= s* <= 60, least-cost threshold 20.
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function gcd(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { var t = a % b; a = b; b = t; } return a; }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis from 0 that reaches past vmax with at most 8 ticks
  function niceAxis(vmax, steps) {
    steps = steps || [1, 2, 5, 10, 20, 25, 50, 100];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 8) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 200) * 200, s: 200 };
  }

  /* ---------- 12.1 The market for lemons ----------
   * p = (WL, WH, vL, vH, p0): buyers' value of a lemon / peach, owners' reserve for a lemon / peach,
   * and the share of peaches p0 the second question asks about. */
  var P0S = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8];
  var lemons = {
    defaults: function () { return { WL: 1200, WH: 2400, vL: 1000, vH: 2000, p0: 0.5 }; },
    gen: function (rng) {
      var WL = pick(rng, range(600, 1600, 100)), WH = WL + pick(rng, range(800, 2000, 100));
      return { WL: WL, WH: WH, vL: WL - pick(rng, [100, 200, 300, 400]), vH: pick(rng, range(WL + 100, WH - 200, 100)), p0: pick(rng, P0S) };
    },
    valid: function (p) {
      var s = lemons.solve(p);
      return p.vL > 0 && p.vL < p.WL && p.WL < p.vH && p.vH < p.WH && p.WH - p.vH >= 200 &&
        s.ps >= 0.35 && s.ps <= 0.85 && Math.abs(p.p0 - s.ps) >= 0.1 - 1e-9 && lemons.domain(p).Y / lemons.domain(p).ys <= 8 &&
        lemons.start(lemons.domain(p)).top - s.top > 0.26 * (p.WH - p.WL);
    },
    random: function (rng, prev) { return draw(lemons.gen, lemons.valid, prev, rng); },
    // the buyers' offer: the average value of a car drawn from the pool
    E: function (p, x) { return x * p.WH + (1 - x) * p.WL; },
    solve: function (p) {
      var num = p.vH - p.WL, den = p.WH - p.WL, g = gcd(num, den), ps = num / den, E0 = lemons.E(p, p.p0), pool = E0 >= p.vH;
      return { ps: ps, fn: num / g, fd: den / g, num: num, den: den, E0: E0, pool: pool,
        // the most a buyer pays for a car that is actually on sale at p0
        top: pool ? E0 : p.WL, lo: pool ? p.vH : p.vL, gainL: p.WL - p.vL, gainH: p.WH - p.vH };
    },
    // plot y = dollars - Y0; ticks every ys dollars (200, 400, 500 or 1,000)
    domain: function (p) {
      var steps = [200, 400, 500, 1000];
      for (var i = 0; i < steps.length; i++) {
        var s = steps[i], Y0 = Math.floor((p.WL - 150) / s) * s, top = Math.ceil((p.WH + 150) / s) * s;
        if ((top - Y0) / s <= 8 || i === steps.length - 1) return { X: 1, xs: 0.2, Y: top - Y0, ys: s, Y0: Y0 };
      }
    },
    start: function (D) { return { ps: 0.06, top: D.Y0 + Math.round(0.92 * D.Y / 10) * 10 }; },
    score: function (p, g) {
      var s = lemons.solve(p);
      var s1 = g.ps != null ? lin(g.ps - s.ps, 0.015, 0.2) : 0, s2 = g.top != null ? lin((g.top - s.top) / (p.WH - p.WL), 0.02, 0.25) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 12.2 Spence signaling: the separating range ----------
   * p = (yH, yL, a, b): wages in $000, education cost c_H = a s for the high type, c_L = b s for the low type. */
  var spence = {
    defaults: function () { return { yH: 100, yL: 40, a: 1, b: 3 }; },
    gen: function (rng) {
      var yH = pick(rng, range(70, 150, 10)), a = pick(rng, [1, 2]);
      return { yH: yH, yL: pick(rng, range(20, yH - 30, 10)), a: a, b: pick(rng, a === 1 ? [2, 3, 4] : [3, 4, 5, 6, 8]) };
    },
    valid: function (p) {
      var s = spence.solve(p), D = spence.domain(p);
      return s.lo === Math.round(s.lo) && s.hi === Math.round(s.hi) && s.hi - s.lo >= 12 && s.lo >= 0.18 * D.X && s.hi <= 0.82 * D.X && D.Y / D.ys <= 8;
    },
    random: function (rng, prev) { return draw(spence.gen, spence.valid, prev, rng); },
    high: function (p, s) { return p.yH - p.a * s; },   // high type's net pay with the diploma
    low: function (p, s) { return p.yH - p.b * s; },    // low type's net pay if it mimics
    // low type stays out when yH - b s <= yL; high type signals when yH - a s >= yL
    solve: function (p) {
      var gap = p.yH - p.yL, lo = gap / p.b, hi = gap / p.a;
      return { gap: gap, lo: lo, hi: hi, sep: p.b > p.a, hiLo: spence.high(p, lo) };
    },
    domain: function (p) {
      var s = spence.solve(p), x = niceAxis(s.hi * 1.25, [5, 10, 20, 25, 50]), y = niceAxis(p.yH * 1.08, [10, 20, 25, 50]);
      return { X: x.D, xs: x.s, Y: y.D, ys: y.s };
    },
    start: function (D) { return { lo: Math.round(0.06 * D.X), hi: Math.round(0.94 * D.X) }; },
    score: function (p, g) {
      var s = spence.solve(p), D = spence.domain(p);
      var s1 = g.lo != null ? lin((g.lo - s.lo) / D.X, 0.015, 0.2) : 0, s2 = g.hi != null ? lin((g.hi - s.hi) / D.X, 0.015, 0.2) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  var W12 = { lemons: lemons, spence: spence, util: { lin: lin, gcd: gcd, niceAxis: niceAxis, pick: pick, range: range, clamp: clamp } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W12;
  else root.W12 = W12;
})(this);
