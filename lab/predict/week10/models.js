/* Week 10 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week10-viz.html and the chapter 10 textbook:
 *   10.1  P = 120 - Q, MC = 0. BR_A: q_A = 60 - q_B/2, BR_B: q_B = 60 - q_A/2. Cournot 40 each,
 *         P = $40, $1,600 each. Stackelberg (A leads): 60 and 30, P = $30, $1,800 and $900.
 *   10.2  One-mile beach, A at 0.30, B at 0.70. A's share (a + b)/2 = 50%. A's best reply to B at
 *         0.70 is to stand right beside B on the long side (0.69 on the 0.01 grid, 69.5%).
 *         Nash: both at 0.5. Average walk 0.25 there vs 0.125 at the quarter points.
 *   10.3  n firms, P = 120 - Q, MC = 0: P* = 120/(n + 1). n = 1: $60, n = 3: $30, P -> MC = $0.
 *   10.4  P = 120 - Q, MC = 0: Cournot Q 80 at $40 ($3,200), Stackelberg 90 at $30 ($2,700),
 *         collusion 60 at $60 ($3,600), Bertrand 120 at $0 ($0).
 *   10.5  Q = 120 - P, MC = $20, rival at $60: best reply $59 (undercut by the $1 grid step),
 *         profit (59 - 20)(120 - 59) = $2,379. Above the monopoly price $70, charge $70 ($2,500).
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
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
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 2000) * 2000, s: 2000 };
  }
  // distance from a point to a polyline (nulls split it), in scaled units
  function distPoly(px, py, pts, sx, sy) {
    var best = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      var ax = a[0] * sx, ay = a[1] * sy, bx = b[0] * sx, by = b[1] * sy, X = px * sx, Y = py * sy;
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? clamp01(((X - ax) * dx + (Y - ay) * dy) / L2) : 0;
      best = Math.min(best, Math.hypot(X - (ax + t * dx), Y - (ay + t * dy)));
    }
    return best;
  }

  /* ---------- 10.1 Cournot and Stackelberg on the best-response diagram ---------- */
  // P = a - bQ, MC = 0; c = a/b is the quantity at which price hits zero.
  var CS = [60, 72, 84, 90, 96, 108, 120, 132, 144, 150, 156, 168, 180];
  var cournot = {
    PRESETS: { base: { a: 120, b: 1 }, small: { a: 90, b: 1 }, steep: { a: 120, b: 2 }, large: { a: 160, b: 1 } },
    defaults: function () { return { a: 120, b: 1 }; },
    gen: function (rng) { var c = pick(rng, CS), b = pick(rng, [1, 1, 2]); return { a: b * c, b: b }; },
    valid: function (p) { return p.a <= 240; },
    random: function (rng, prev) { return draw(cournot.gen, cournot.valid, prev, rng); },
    brA: function (p, qB) { return Math.max(0, (p.a / p.b - qB) / 2); },
    brB: function (p, qA) { return Math.max(0, (p.a / p.b - qA) / 2); },
    price: function (p, qA, qB) { return Math.max(0, p.a - p.b * (qA + qB)); },
    solve: function (p) {
      var c = p.a / p.b, qc = c / 3, Pc = p.a - p.b * 2 * qc, qL = c / 2, qF = c / 4, Ps = p.a - p.b * (qL + qF);
      return { c: c, half: c / 2, qc: qc, Qc: 2 * qc, Pc: Pc, pic: Pc * qc, qL: qL, qF: qF, Qs: qL + qF, Ps: Ps, piL: Ps * qL, piF: Ps * qF };
    },
    domain: function (p) { var x = niceAxis(p.a / p.b * 1.04); return { X: x.D, Y: x.D, xs: x.s, ys: x.s }; },
    // where the student's B line (top on the q_B axis, bot on the q_A axis) meets A's best response
    crossing: function (p, top, bot) {
      var c = p.a / p.b;
      if (!(top > 0) || !(bot > 0)) return null;
      var den = 2 - top / bot; if (Math.abs(den) < 1e-9) return null;
      var qA = (c - top) / den, qB = c - 2 * qA;
      if (qA < -1e-9 || qB < -1e-9 || qA > bot + 1e-9) return null;
      return { qA: qA, qB: qB };
    },
    start: function (D) { return { top: Math.round(D.Y * 0.18), bot: Math.round(D.X * 0.3) }; },
    score: function (p, g) {
      var s = cournot.solve(p), D = cournot.domain(p);
      var st = lin((g.top - s.half) / D.Y, 0.015, 0.2), sb = lin((g.bot - s.c) / D.X, 0.015, 0.2);
      var ss = g.s ? lin(Math.hypot((g.s.x - s.qL) / D.X, (g.s.y - s.qF) / D.Y), 0.02, 0.2) : 0;
      return { total: Math.round(100 * (0.25 * st + 0.25 * sb + 0.5 * ss)), parts: [st, sb, ss] };
    },
    // best-response dynamics from qA: corners of the staircase, B replies first (as the film)
    stairs: function (p, qA, n) {
      var pts = [[qA, 0]], qB = cournot.brB(p, qA); pts.push([qA, qB]);
      for (var i = 0; i < (n || 7); i++) { qA = cournot.brA(p, qB); pts.push([qA, qB]); qB = cournot.brB(p, qA); pts.push([qA, qB]); }
      return pts;
    }
  };

  /* ---------- 10.2 Hotelling beach ---------- */
  // share of the vendor at x when the other is at y (beach [0, 1], uniform, nearest vendor)
  function share(x, y) { return x === y || Math.abs(x - y) < 1e-12 ? 0.5 : x < y ? (x + y) / 2 : 1 - (x + y) / 2; }
  var beach = {
    share: share,
    defaults: function () { return { a: 0.3, b: 0.7 }; },
    gen: function (rng) {
      var b = pick(rng, range(0.1, 0.9, 0.05)), a = b > 0.5 ? pick(rng, range(0.05, 0.4, 0.05)) : pick(rng, range(0.6, 0.95, 0.05));
      return { a: +a.toFixed(2), b: +b.toFixed(2) };
    },
    valid: function (p) { return Math.abs(p.b - 0.5) >= 0.1 - 1e-9 && Math.abs(p.a - p.b) >= 0.2 - 1e-9; },
    random: function (rng, prev) { return draw(beach.gen, beach.valid, prev, rng); },
    // average distance walked, vendors at x and y (closed form for a uniform beach)
    walk: function (x, y) { var a = Math.min(x, y), b = Math.max(x, y); return a * a / 2 + (1 - b) * (1 - b) / 2 + (b - a) * (b - a) / 4; },
    solve: function (p) {
      var right = p.b < 0.5, best = +(right ? p.b + 0.01 : p.b - 0.01).toFixed(2);
      return { right: right, best: best, bestShare: share(best, p.b), sup: right ? 1 - p.b : p.b, share0: share(p.a, p.b), mid0: (p.a + p.b) / 2, nash: 0.5 };
    },
    domain: function () { return { X: 1, Y: 100, xs: 0.25, ys: 25 }; },
    score: function (p, g) {
      var s = beach.solve(p);
      var s1 = g.a == null ? 0 : lin(s.bestShare - share(g.a, p.b), 0.012, 0.15);
      var s2 = g.end == null ? 0 : lin(g.end.x - 0.5, 0.02, 0.2);
      return { total: Math.round(100 * (0.6 * s1 + 0.4 * s2)), parts: [s1, s2] };
    }
  };

  /* ---------- 10.3 n-firm Cournot ---------- */
  // P = a - Q (the slope does not change the price), MC = c: P*(n) = (a + n c)/(n + 1)
  var nfirm = {
    NMAX: 15,
    defaults: function () { return { a: 120, c: 0, k: 3 }; },
    gen: function (rng) { return { a: pick(rng, [60, 80, 90, 100, 120, 120, 150, 180, 200, 240]), c: pick(rng, [0, 0, 10, 20, 30]), k: pick(rng, [3, 4, 5, 6, 7, 8, 9]) }; },
    valid: function (p) { return p.c <= 0.25 * p.a; },
    random: function (rng, prev) { return draw(nfirm.gen, nfirm.valid, prev, rng); },
    P: function (p, n) { return (p.a + n * p.c) / (n + 1); },
    q: function (p, n) { return (p.a - p.c) / (n + 1); },
    solve: function (p) { return { P1: nfirm.P(p, 1), Pk: nfirm.P(p, p.k), floor: p.c, P2: nfirm.P(p, 2) }; },
    domain: function (p) { var y = niceAxis(nfirm.P(p, 1) * 1.12); return { X: 16, Y: y.D, xs: 1, ys: y.s }; },
    start: function (D) { return { p1: Math.round(D.Y * 0.32), pk: Math.round(D.Y * 0.78), floor: Math.round(D.Y * 0.55) }; },
    score: function (p, g) {
      var s = nfirm.solve(p), D = nfirm.domain(p);
      var s1 = lin((g.p1 - s.P1) / D.Y, 0.015, 0.2), sk = lin((g.pk - s.Pk) / D.Y, 0.015, 0.2), sf = lin((g.floor - s.floor) / D.Y, 0.015, 0.2);
      return { total: Math.round(100 * (0.35 * s1 + 0.4 * sk + 0.25 * sf)), parts: [s1, sk, sf] };
    }
  };

  /* ---------- 10.4 Four models, one market ---------- */
  // P = a - bQ, MC = c, two firms. cm = (a - c)/b is the competitive quantity.
  var MODELS = ['cournot', 'stackelberg', 'collusion', 'bertrand'];
  var NAMES = { cournot: 'Cournot', stackelberg: 'Stackelberg', collusion: 'Collusion', bertrand: 'Bertrand' };
  var four = {
    MODELS: MODELS, NAMES: NAMES,
    defaults: function () { return { a: 120, b: 1, c: 0, m: 'cournot' }; },
    gen: function (rng) { var b = pick(rng, [0.5, 1, 1, 2]), cm = pick(rng, [60, 72, 84, 96, 108, 120, 132, 144, 168, 180]), c = pick(rng, [0, 0, 10, 20, 30]); return { a: b * cm + c, b: b, c: c, m: 'cournot' }; },
    valid: function (p) { return p.a <= 240 && p.c <= 0.3 * p.a; },
    random: function (rng, prev) { return draw(four.gen, four.valid, prev, rng); },
    one: function (p, m) {
      var cm = (p.a - p.c) / p.b, qA, qB;
      if (m === 'cournot') { qA = qB = cm / 3; }
      else if (m === 'stackelberg') { qA = cm / 2; qB = cm / 4; }
      else if (m === 'collusion') { qA = qB = cm / 4; }
      else { qA = qB = cm / 2; }
      var Q = qA + qB, P = p.a - p.b * Q, m1 = P - p.c;
      return { qA: qA, qB: qB, Q: Q, P: P, piA: m1 * qA, piB: m1 * qB, pi: m1 * Q, CS: 0.5 * p.b * Q * Q, DWL: 0.5 * m1 * (cm - Q) };
    },
    solve: function (p) {
      var out = { cm: (p.a - p.c) / p.b, top: p.a / p.b }, i;
      for (i = 0; i < MODELS.length; i++) out[MODELS[i]] = four.one(p, MODELS[i]);
      out.cur = out[p.m || 'cournot'];
      return out;
    },
    domain: function (p) { var x = niceAxis(p.a / p.b * 1.04), y = niceAxis(p.a * 1.08); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = four.solve(p), parts = MODELS.map(function (m) { return g[m] ? lin((g[m].x - s[m].Q) / s.cm, 0.015, 0.2) : 0; });
      return { total: Math.round(100 * (parts[0] + parts[1] + parts[2] + parts[3]) / 4), parts: parts };
    }
  };

  /* ---------- 10.5 Bertrand undercutting ---------- */
  // Q = a - P, MC = c, identical products: the cheaper firm takes the market, a tie splits it.
  var bertrand = {
    defaults: function () { return { a: 120, c: 20, pr: 60 }; },
    gen: function (rng) { var a = pick(rng, [100, 120, 120, 140]), c = pick(rng, [10, 20, 20, 30]); return { a: a, c: c, pr: pick(rng, range(c + 10, a - 15, 5)) }; },
    valid: function (p) { return p.pr >= p.c + 10 && p.pr <= p.a - 15; },
    random: function (rng, prev) { return draw(bertrand.gen, bertrand.valid, prev, rng); },
    Q: function (p, P) { return Math.max(0, p.a - P); },
    // your profit at price P when the rival charges pr
    profit: function (p, P, pr) {
      pr = pr == null ? p.pr : pr;
      var m = (P - p.c) * bertrand.Q(p, P);
      return P > pr + 1e-9 ? 0 : Math.abs(P - pr) <= 1e-9 ? 0.5 * m : m;
    },
    full: function (p, P) { return (P - p.c) * bertrand.Q(p, P); },   // profit with the whole market
    // best reply on the $1 grid: the monopoly price if the rival is above it, else $1 under the rival
    best: function (p, pr) { var Pm = (p.a + p.c) / 2; return pr > Pm ? Pm : pr - 1; },
    solve: function (p) {
      var Pm = (p.a + p.c) / 2, Pb = bertrand.best(p, p.pr);
      return { Pm: Pm, pim: bertrand.full(p, Pm), Pb: Pb, pib: bertrand.profit(p, Pb), match: bertrand.profit(p, p.pr), above: p.pr > Pm };
    },
    domain: function (p) { var x = niceAxis(p.a), y = niceAxis(bertrand.full(p, (p.a + p.c) / 2) * 1.12); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    // the true profit curve over [c, X], with a gap at the cliff
    truth: function (p, X) {
      var pts = [], n = 120, i, P;
      for (i = 0; i <= n; i++) { P = p.c + (p.pr - p.c) * i / n; pts.push([P, bertrand.full(p, Math.min(P, p.pr - 1e-9))]); }
      pts.push(null); pts.push([p.pr, 0]); pts.push([X, 0]);
      return pts;
    },
    // a drawn curve ({x, y} | null, the 'fn' bins) vs the truth, distances in units of the frame
    curveScore: function (p, drawn, D) {
      var pts = (drawn || []).filter(function (q) { return q && q.x >= p.c - 1e-9 && q.x <= D.X + 1e-9; });
      if (!pts.length) return { s: 0, err: 1, cover: 0, dy: null };
      var tr = bertrand.truth(p, D.X), sx = 1 / D.X, sy = 1 / D.Y, sum = 0;
      pts.forEach(function (q) { sum += distPoly(q.x, q.y, tr, sx, sy); });
      var err = sum / pts.length, span = D.X - p.c, bins = {};
      pts.forEach(function (q) { bins[Math.floor((q.x - p.c) / span * 20 - 1e-9)] = 1; });
      var cover = Math.min(1, Object.keys(bins).length / 20);
      // average vertical miss in dollars, away from the cliff (where any jump is a fair drawing)
      var dys = pts.filter(function (q) { return Math.abs(q.x - p.pr) > 0.02 * D.X; }).map(function (q) { return Math.abs(q.y - (q.x < p.pr ? bertrand.full(p, q.x) : 0)); });
      var dy = dys.length ? dys.reduce(function (a, b) { return a + b; }, 0) / dys.length : null;
      return { s: lin(err, 0.015, 0.12) * (0.4 + 0.6 * clamp01(cover / 0.8)), err: err, cover: cover, dy: dy };
    },
    score: function (p, g) {
      var s = bertrand.solve(p), D = bertrand.domain(p);
      var cs = bertrand.curveScore(p, g.drawn, D).s;
      var sp = g.P == null ? 0 : lin(1 - bertrand.profit(p, g.P) / s.pib, 0.03, 0.6);
      return { total: Math.round(100 * (0.4 * cs + 0.6 * sp)), parts: [cs, sp] };
    }
  };

  var W10 = { cournot: cournot, beach: beach, nfirm: nfirm, four: four, bertrand: bertrand,
    util: { lin: lin, niceAxis: niceAxis, pick: pick, range: range, distPoly: distPoly, share: share } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W10;
  else root.W10 = W10;
})(this);
