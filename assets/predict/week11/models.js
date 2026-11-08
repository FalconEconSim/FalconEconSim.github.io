/* Week 11 economics for "Predict, then see" (ported from lab/week11/v5 onto the shared kit).
 * Pure functions, no DOM. Loaded by the page and by verify.js in node (module.exports), so every
 * number the page shows is a number the script checked.
 *
 * Defaults match week11-viz.html and the textbook (ch. 11 benchmarks):
 *   11.1  MB = 100 - Q, PMC = 10 + Q, MEC $20 -> Q_E 45 at $55, Q* 35 at $65, DWL $100, tax $20
 *   11.2  MAC_A = 2e_A, MAC_B = 8e_B, total 100 -> A 80, B 20, permit $160, $8,000 vs $12,500 (saves 36%)
 *   11.3  MB = 100 - Q, MC = 10 + Q, MEB $20 -> Q_E 45, Q* 55, DWL $100, subsidy $20
 *   11.4  N = 3 neighbors, each values the light at $120, it costs $300 -> together $360 > $300
 *         (worth building) but $120 < $300 (no one buys it alone): not provided, $60 surplus lost
 *   11.5  MB = 100 - 2S, MD = 2S -> S* 25 at $50 from either starting right; payments $625 to $1,875
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  // full marks within `full`, zero at `zero`, linear between (absolute error e)
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
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 1000) * 1000, s: 1000 };
  }

  /* ---------- 11.1 Negative externality, Pigouvian tax (has a film) ----------
   * MB = a - Q, PMC = c + Q, constant MEC m, SMC = PMC + MEC. */
  var pigou = {
    defaults: function () { return { a: 100, c: 10, m: 20 }; },
    gen: function (rng) { return { a: pick(rng, range(80, 120, 10)), c: pick(rng, [0, 10, 20, 30]), m: pick(rng, range(10, 40, 2)) }; },
    valid: function (p) {
      var s = pigou.solve(p);
      return s.Qs >= Math.max(15, 0.18 * p.a) && s.QE - s.Qs >= 5 && s.QE <= 0.6 * p.a;
    },
    random: function (rng, prev) { return draw(pigou.gen, pigou.valid, prev, rng); },
    solve: function (p) {
      var QE = (p.a - p.c) / 2, Qs = (p.a - p.c - p.m) / 2;
      return {
        QE: QE, PE: p.a - QE,              // market: PMC = MB
        Qs: Qs, Ps: p.a - Qs,              // optimum: SMC = MB
        tax: p.m,                           // t* = MEC(Q*), constant MEC
        keep: p.a - Qs - p.m,               // what firms keep per unit under the tax
        smcE: p.c + p.m + QE,               // SMC at the market quantity (top of the DWL triangle)
        dwl: p.m * p.m / 4                  // 1/2 x (QE - Q*) x MEC, and QE - Q* = MEC / 2
      };
    },
    // the market under an arbitrary per-unit tax t: PMC + t = MB
    withTax: function (p, t) {
      var Q = Math.max(0, (p.a - p.c - t) / 2), Qs = (p.a - p.c - p.m) / 2;
      return { Q: Q, P: p.a - Q, dwl: (Q - Qs) * (Q - Qs) };   // triangle with base |Q - Q*| and height 2|Q - Q*|
    },
    // the explore stepper's top: keep Q* at least 5
    mMax: function (p) { return Math.min(50, p.a - p.c - 10); },
    // the tax arrow sits left of Q*, far enough from it that the handle never covers the answer
    xq: function (p) { var s = pigou.solve(p); return s.Qs < 0.33 * p.a ? Math.max(0.06 * p.a, s.Qs - 0.13 * p.a) : 0.2 * p.a; },
    domain: function (p) { var y = niceAxis(p.a + 15); return { X: p.a, Y: y.D, xs: 20, ys: y.s }; },
    score: function (p, g) {
      var s = pigou.solve(p), d = pigou.domain(p);
      function pt(gp, Q, P) { return gp ? lin(Math.hypot((gp.x - Q) / d.X, (gp.y - P) / d.Y), 0.02, 0.14) : 0; }
      var sm = pt(g.mk, s.QE, s.PE), so = pt(g.op, s.Qs, s.Ps);
      var st = g.t == null ? 0 : lin(g.t - p.m, 1, Math.max(p.m, 10));
      return { total: Math.round(100 * (0.25 * sm + 0.4 * so + 0.35 * st)), parts: [sm, so, st] };
    }
  };

  /* ---------- 11.2 Cap-and-trade: equalize marginal abatement cost ----------
   * MAC_A = al e_A, MAC_B = be e_B, e_A + e_B = T. The graph is the textbook "split" picture:
   * x = e_A from the left, so B's abatement T - x runs from the right. */
  var cap = {
    defaults: function () { return { al: 2, be: 8, T: 100 }; },
    gen: function (rng) {
      var lo = pick(rng, [1, 2, 3]), hi = lo * pick(rng, [2, 3, 4]), swap = rng() < 0.4;
      return { al: swap ? hi : lo, be: swap ? lo : hi, T: pick(rng, [60, 80, 100, 120]) };
    },
    valid: function (p) { return Number.isInteger(cap.solve(p).eA); },
    random: function (rng, prev) { return draw(cap.gen, cap.valid, prev, rng); },
    // total abatement cost when A cleans x: areas under each MAC line
    cost: function (p, x) { return 0.5 * p.al * x * x + 0.5 * p.be * (p.T - x) * (p.T - x); },
    solve: function (p) {
      var eA = p.be * p.T / (p.al + p.be), eB = p.T - eA, lam = p.al * eA;
      var ct = cap.cost(p, eA), eq = cap.cost(p, p.T / 2);
      return { eA: eA, eB: eB, lam: lam, costA: 0.5 * p.al * eA * eA, costB: 0.5 * p.be * eB * eB,
        ct: ct, eq: eq, save: eq - ct, pct: (eq - ct) / eq, cheap: p.al < p.be ? 'A' : 'B' };
    },
    domain: function (p) {
      var s = cap.solve(p), y = niceAxis(1.8 * s.lam);
      return { X: p.T, Y: y.D, xs: p.T <= 35 ? 5 : p.T <= 70 ? 10 : p.T <= 140 ? 20 : 25, ys: y.s };
    },
    score: function (p, g) {
      var s = cap.solve(p), e = lin(g.x - s.eA, 0.5, 0.3 * p.T);
      return { total: Math.round(100 * e), parts: [e] };
    }
  };

  /* ---------- 11.3 Positive externality, Pigouvian subsidy ----------
   * MB = a - Q, MC = c + Q, constant MEB m, MSB = MB + MEB. */
  var pos = {
    defaults: function () { return { a: 100, c: 10, m: 20 }; },
    gen: function (rng) { return { a: pick(rng, range(80, 120, 10)), c: pick(rng, [0, 10, 20]), m: pick(rng, range(14, 40, 2)) }; },
    valid: function (p) { var s = pos.solve(p); return s.Qs <= 0.75 * p.a && s.QE >= 0.3 * p.a; },
    random: function (rng, prev) { return draw(pos.gen, pos.valid, prev, rng); },
    msb: function (p, q) { return p.a + p.m - q; },
    solve: function (p) {
      var QE = (p.a - p.c) / 2, Qs = (p.a - p.c + p.m) / 2;
      return { QE: QE, PE: p.c + QE, Qs: Qs, Ps: p.c + Qs, sub: p.m, msbE: p.a + p.m - QE, dwl: p.m * p.m / 4 };
    },
    // the market under a per-unit subsidy s: MB + s = MC
    withSub: function (p, s) {
      var Q = (p.a - p.c + s) / 2, Qs = (p.a - p.c + p.m) / 2;
      return { Q: Q, P: p.c + Q, dwl: (Q - Qs) * (Q - Qs) };
    },
    mMax: 40,
    // the frame fits MEB up to $40 in Explore, and does not depend on this round's MEB (no hint)
    domain: function (p) { var y = niceAxis(p.a + pos.mMax + 8); return { X: p.a, Y: y.D, xs: 20, ys: y.s }; },
    // g.draw: [{x, y} | null] samples of the student's MSB; g.q: their Q*
    score: function (p, g) {
      var s = pos.solve(p), errs = 0, n = 0;
      (g.draw || []).forEach(function (pt) { if (pt) { errs += Math.abs(pt.y - pos.msb(p, pt.x)); n++; } });
      var meanErr = n ? errs / n : null;
      var sd = n ? lin(meanErr, 2, Math.max(p.m, 15)) : 0;
      var sq = g.q == null ? 0 : lin(g.q - s.Qs, 0.5, 0.1 * p.a);
      return { total: Math.round(100 * (0.6 * sd + 0.4 * sq)), parts: [sd, sq], meanErr: meanErr };
    }
  };

  /* ---------- 11.4 Public good and the free-rider problem ----------
   * As on week11-viz.html: N neighbors each value one streetlight at v; it costs c ($300).
   * Worth building iff the vertical sum N v exceeds c. Someone buys it alone iff v >= c. */
  var pub = {
    defaults: function () { return { N: 3, v: 120, c: 300 }; },
    gen: function (rng) { return { N: 2 + Math.floor(rng() * 7), v: pick(rng, range(40, 200, 10)), c: 300 }; },
    valid: function (p) { var t = p.N * p.v; return t !== p.c && t <= 1200 && Math.abs(t - p.c) >= 40 && t - p.v >= 0.15 * pub.domain(p).Y; },
    random: function (rng, prev) { return draw(pub.gen, pub.valid, prev, rng); },
    solve: function (p) {
      var total = p.N * p.v, worth = total > p.c, alone = p.v >= p.c;
      return {
        total: total, worth: worth, alone: alone, built: alone,
        surplus: total - p.c,                          // if it is built
        lost: worth && !alone ? total - p.c : 0,       // surplus thrown away by free-riding
        outcome: alone ? 'alone' : worth ? 'freeride' : 'none'
      };
    },
    // y: dollars; x: two columns (left "worth building", right "someone buys it alone") in a 0..10 frame
    domain: function (p) { var y = niceAxis(Math.max(p.N * p.v, p.c) * 1.12); return { X: 10, Y: y.D, xs: 1000, ys: y.s }; },
    cols: { worth: 3.1, alone: 7.4, w: 2.6 },
    score: function (p, g) {
      // relative errors: full marks within 3% (4% for one neighbor's value), zero at 40% (60%)
      var s = pub.solve(p);
      var sw = g.w == null || s.total <= 0 ? 0 : lin((g.w - s.total) / s.total, 0.03, 0.4), sb = g.b == null || p.v <= 0 ? 0 : lin((g.b - p.v) / p.v, 0.04, 0.6);
      return { total: Math.round(100 * (0.5 * sw + 0.5 * sb)), parts: [sw, sb] };
    }
  };

  /* ---------- 11.5 The Coase theorem ----------
   * Factory MB = a - bS, neighbor MD = dS. */
  var coase = {
    defaults: function () { return { a: 100, b: 2, d: 2 }; },
    gen: function (rng) { return { a: pick(rng, range(60, 120, 10)), b: pick(rng, [1, 2, 3, 4]), d: pick(rng, [1, 2, 3, 4]) }; },
    valid: function (p) {
      var r = p.d / p.b, s;
      if (r < 0.5 || r > 2) return false;
      s = coase.solve(p);
      return Number.isInteger(s.Smax) && isMult(s.Ss, 0.5) && s.Smax <= 80 && s.Smax >= 20;
    },
    random: function (rng, prev) { return draw(coase.gen, coase.valid, prev, rng); },
    mb: function (p, S) { return Math.max(0, p.a - p.b * S); },
    md: function (p, S) { return p.d * S; },
    solve: function (p) {
      var Smax = p.a / p.b, Ss = p.a / (p.b + p.d), price = p.d * Ss;
      return {
        Smax: Smax, Ss: Ss, price: price,
        // factory owns the right: starts at Smax; the neighbor pays it to cut back to S*
        fLoss: 0.5 * (Smax - Ss) * price,               // factory's lost benefit: area under MB from S* to Smax
        nSave: 0.5 * p.d * (Smax * Smax - Ss * Ss),     // neighbor's avoided damage: area under MD from S* to Smax
        // neighbor owns the right: starts at 0; the factory pays for permission up to S*
        nHarm: 0.5 * p.d * Ss * Ss,                     // neighbor's damage from 0 to S*
        fGain: p.a * Ss - 0.5 * p.b * Ss * Ss           // factory's benefit from 0 to S*
      };
    },
    domain: function (p) {
      var s = coase.solve(p), y = niceAxis(Math.max(p.a, p.d * s.Smax) * 1.06);
      return { X: s.Smax, Y: y.D, xs: s.Smax <= 35 ? 5 : 10, ys: y.s };
    },
    score: function (p, g) {
      var s = coase.solve(p), sf = lin(g.f - s.Ss, 0.5, 0.3 * s.Smax), sn = lin(g.n - s.Ss, 0.5, 0.3 * s.Smax);
      return { total: Math.round(100 * (sf + sn) / 2), parts: [sf, sn] };
    }
  };

  var api = { pigou: pigou, cap: cap, pos: pos, pub: pub, coase: coase, util: { lin: lin, niceAxis: niceAxis, isMult: isMult, clamp: clamp } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.W11 = api;
})(this);
