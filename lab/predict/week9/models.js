/* Week 9 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week9-viz.html and the Chapter 9 textbook:
 *   9.1  Two-part pricing, P = 3 - Q/10, MC = AC = $1: p* = MC = $1, Q = 20, F* = CS = $20 = total
 *        profit; the single-price monopolist sells Q = 10 at $2 and earns $10 (half of it).
 *   9.2  Natural monopoly, P = 60 - Q, TC = 200 + 5Q (MC = $5, AC = 200/Q + 5): unregulated MR = MC
 *        at Q 27.5, P $32.50, profit $556.25; MC pricing Q 55, P $5, loss $200; AC pricing at the
 *        larger root of Q^2 - 55Q + 200 = 0: Q 51.08, P $8.92; two-part p = $5 plus a $200 fee.
 *   9.3  The circle method on a 2x2 game. First load: the textbook Prisoner's Dilemma
 *        (Confess, Silent; -3/-3, -1/-10, -10/-1, -2/-2): Confess is dominant for both, NE (Confess, Confess).
 *   9.4  Block pricing, P = 3 - Q/10, MC = $1, 3 blocks over Q 0 to 20, each block priced at the
 *        demand price of its last unit: $2.33, $1.67, $1.00; profit 20 (n - 1) / n = $13.33 of $20.
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most 7 ticks on a 1-2-5 step (fractional steps allowed)
  function niceAxis(vmax) {
    var steps = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7 + 1e-9) return { D: +D.toFixed(6), s: s }; }
    return { D: Math.ceil(vmax / 500) * 500, s: 500 };
  }

  /* linear demand P = a - bQ with constant MC = mc; parameter sets with tidy numbers.
   * [a, b, mc]: Q_eff = (a - mc) / b is a whole number in every set. */
  var SETS = [[3, 0.1, 1], [3, 0.1, 0.5], [3, 0.1, 1.5], [3, 0.1, 2], [4, 0.1, 1], [4, 0.1, 2], [4, 0.2, 1], [4, 0.2, 2],
    [5, 0.2, 1], [5, 0.2, 2], [6, 0.2, 2], [6, 0.2, 1], [6, 0.3, 1.5], [2, 0.1, 0.5], [5, 0.1, 2], [6, 0.25, 1]];
  function Qd(p, P) { return Math.max(0, (p.a - P) / p.b); }   // quantity demanded at price P
  function Pd(p, Q) { return p.a - p.b * Q; }                    // demand price of the Q-th unit
  function demDom(p) { var x = niceAxis(p.a / p.b * 1.06), y = niceAxis(p.a * 1.07); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; }

  /* ---------- 9.1 Two-part pricing ---------- */
  var twopart = {
    defaults: function () { return { a: 3, b: 0.1, mc: 1 }; },
    gen: function (rng) { var s = pick(rng, SETS); return { a: s[0], b: s[1], mc: s[2] }; },
    valid: function (p) { return p.mc > 0 && p.mc < p.a; },
    random: function (rng, prev) { return draw(twopart.gen, twopart.valid, prev, rng); },
    // fee, usage profit, total and deadweight loss at a per-unit charge p (fee = CS at p)
    at: function (p, P) {
      var q = Qd(p, P), F = 0.5 * Math.max(0, p.a - P) * q, use = (P - p.mc) * q, Qe = (p.a - p.mc) / p.b;
      var dwl = 0.5 * Math.abs(P - p.mc) * Math.abs(Qe - q);
      return { Q: q, F: F, use: use, total: F + use, dwl: P < p.a ? dwl : 0.5 * (p.a - p.mc) * Qe };
    },
    solve: function (p) {
      var Qe = (p.a - p.mc) / p.b, F = 0.5 * (p.a - p.mc) * Qe, Qm = Qe / 2, Pm = (p.a + p.mc) / 2;
      var piM = (Pm - p.mc) * Qm, csM = 0.5 * (p.a - Pm) * Qm, dwlM = 0.5 * (Pm - p.mc) * (Qe - Qm);
      return { Qe: Qe, F: F, total: F, Qm: Qm, Pm: Pm, piM: piM, csM: csM, dwlM: dwlM, choke: p.a / p.b, start: +(p.a - 0.2 * (p.a - p.mc)).toFixed(2) };
    },
    domain: demDom,
    score: function (p, g, s) {
      s = s || twopart.solve(p);
      var sp = g.p == null ? 0 : lin((g.p - p.mc) / p.a, 0.02, 0.3);
      var sm = g.m ? lin(Math.hypot((g.m.x - s.Qm) / s.choke, (g.m.y - s.Pm) / p.a), 0.03, 0.25) : 0;
      return { total: Math.round(100 * (0.6 * sp + 0.4 * sm)), parts: [sp, sm] };
    }
  };

  /* ---------- 9.2 Natural monopoly ---------- */
  // P = a - bQ, TC = F + cQ: MC = c, AC = F/Q + c
  var natmon = {
    defaults: function () { return { a: 60, b: 1, c: 5, F: 200 }; },
    gen: function (rng) {
      var a = pick(rng, [40, 50, 60, 80, 100]), b = pick(rng, [1, 1, 0.5, 2]), c = pick(rng, [2, 4, 5, 6, 8, 10]);
      var cap = (a - c) * (a - c) / (4 * b), k = 0.15 + rng() * 0.45, step = cap > 1500 ? 100 : 50;
      return { a: a, b: b, c: c, F: Math.max(step, Math.round(k * cap / step) * step) };
    },
    valid: function (p) {
      if (!(p.c > 0 && p.c <= p.a / 4)) return false;
      var r = natmon.disc(p) / ((p.a - p.c) * (p.a - p.c));
      return r >= 0.4 && r <= 0.85;
    },
    random: function (rng, prev) { return draw(natmon.gen, natmon.valid, prev, rng); },
    disc: function (p) { return (p.a - p.c) * (p.a - p.c) - 4 * p.b * p.F; },
    AC: function (p, Q) { return p.F / Q + p.c; },
    // the largest fixed cost that still lets AC pricing break even, kept off the tangency
    Fmax: function (p) { return (p.a - p.c) * (p.a - p.c) / (4 * p.b); },
    solve: function (p) {
      var Qmc = (p.a - p.c) / p.b, Qu = Qmc / 2, Pu = (p.a + p.c) / 2, d = natmon.disc(p);
      var Qac = d >= 0 ? ((p.a - p.c) + Math.sqrt(d)) / (2 * p.b) : NaN, Pac = p.a - p.b * Qac;
      var piU = (Pu - p.c) * Qu - p.F;
      return { Qmc: Qmc, Pmc: p.c, Qu: Qu, Pu: Pu, piU: piU, ACu: natmon.AC(p, Qu), Qac: Qac, Pac: Pac, lossMC: -p.F, choke: p.a / p.b,
        // the four regimes for Explore: Q, P, AC at Q, profit (two-part counts the fee)
        reg: {
          unreg: { Q: Qu, P: Pu, AC: natmon.AC(p, Qu), pi: piU },
          mc: { Q: Qmc, P: p.c, AC: natmon.AC(p, Qmc), pi: -p.F },
          ac: { Q: Qac, P: Pac, AC: natmon.AC(p, Qac), pi: (Pac - natmon.AC(p, Qac)) * Qac },
          tp: { Q: Qmc, P: p.c, AC: natmon.AC(p, Qmc), pi: 0, fee: p.F }
        },
        // deadweight loss against the efficient output Qmc (triangle between demand and MC)
        dwl: function (Q) { return 0.5 * (p.a - p.b * Q - p.c) * (Qmc - Q); } };
    },
    domain: function (p) { var x = niceAxis(p.a / p.b), y = niceAxis(p.a * 1.04); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g, s) {
      s = s || natmon.solve(p);
      var su = g.u ? lin((g.u.x - s.Qu) / s.choke, 0.015, 0.2) : 0, sa = g.ac ? lin((g.ac.x - s.Qac) / s.choke, 0.015, 0.2) : 0;
      return { total: Math.round(100 * (0.5 * su + 0.5 * sa)), parts: [su, sa] };
    }
  };

  /* ---------- 9.3 The circle method (2x2 games) ---------- */
  // pay[row][col] = [A's payoff, B's payoff]; A picks the row, B picks the column
  var PRESETS = {
    pd: { name: 'pd', labels: { a: 'Prisoner A', b: 'Prisoner B', r: ['Confess', 'Silent'], c: ['Confess', 'Silent'] }, pay: [[[-3, -3], [-1, -10]], [[-10, -1], [-2, -2]]], unit: 1 },
    opec: { name: 'opec', labels: { a: 'Country A', b: 'Country B', r: ['Restrict', 'Overproduce'], c: ['Restrict', 'Overproduce'] }, pay: [[[900, 900], [300, 1200]], [[1200, 300], [600, 600]]], unit: 100 },
    coord: { name: 'coord', labels: { a: 'Apple', b: 'Samsung', r: ['Standard A', 'Standard B'], c: ['Standard A', 'Standard B'] }, pay: [[[8, 8], [2, 3]], [[3, 2], [6, 6]]], unit: 1 },
    adv: { name: 'adv', labels: { a: 'Coca-Cola', b: 'Pepsi', r: ['Advertise', "Don't"], c: ['Advertise', "Don't"] }, pay: [[[3, 3], [8, 1]], [[1, 8], [5, 5]]], unit: 1 }
  };
  // the live page's practice-game archetypes: which row wins A's comparison in each column, which
  // column wins B's comparison in each row
  var ARCH = {
    dominant: { aWin: [0, 0], bWin: [0, 0] },   // both have a dominant strategy: 1 NE
    iterated: { aWin: [0, 0], bWin: [0, 1] },   // only A has one; B best-responds: 1 NE
    coord: { aWin: [0, 1], bWin: [0, 1] },      // two NE on the diagonal
    none: { aWin: [0, 1], bWin: [1, 0] }        // best replies never meet: no pure NE
  };
  var game = {
    presets: PRESETS,
    defaults: function () { return clone(PRESETS.pd); },
    gen: function (rng) {
      if (rng() < 0.25) return clone(PRESETS[pick(rng, ['pd', 'opec', 'coord', 'adv'])]);
      var kind = pick(rng, ['dominant', 'iterated', 'coord', 'none']), A = ARCH[kind];
      var rnd = function (lo, hi) { return Math.floor(rng() * (hi - lo + 1)) + lo; };
      var hilo = function () { var x = rnd(0, 9), y = rnd(0, 9); while (y === x) y = rnd(0, 9); return x > y ? [x, y] : [y, x]; };
      var pay = [[[0, 0], [0, 0]], [[0, 0], [0, 0]]], j, i, w;
      for (j = 0; j < 2; j++) { var h = hilo(); w = A.aWin[j]; pay[w][j][0] = h[0]; pay[1 - w][j][0] = h[1]; }
      for (i = 0; i < 2; i++) { var q = hilo(); w = A.bWin[i]; pay[i][w][1] = q[0]; pay[i][1 - w][1] = q[1]; }
      if (rng() < 0.5) pay = [pay[1], pay[0]];                                                  // relabel A's rows
      if (rng() < 0.5) for (var r = 0; r < 2; r++) { var t = pay[r][0]; pay[r][0] = pay[r][1]; pay[r][1] = t; }   // relabel B's columns
      return { name: 'random', kind: kind, labels: { a: 'Player A', b: 'Player B', r: ['Top', 'Bottom'], c: ['Left', 'Right'] }, pay: pay, unit: 1 };
    },
    // no ties inside any comparison, so every best reply is unique
    valid: function (p) {
      var P = p.pay;
      return P[0][0][0] !== P[1][0][0] && P[0][1][0] !== P[1][1][0] && P[0][0][1] !== P[0][1][1] && P[1][0][1] !== P[1][1][1];
    },
    // a new game whose payoffs differ from the last one
    random: function (rng, prev) {
      for (var k = 0; k < 20000; k++) { var p = game.gen(rng); if (game.valid(p) && (!prev || !same(p.pay, prev.pay))) return p; }
      throw new Error('no valid draw');
    },
    // best replies, allowing ties (Explore lets students type equal payoffs)
    solve: function (p) {
      var P = p.pay, aBR = [], bBR = [], aTie = [], bTie = [], nash = [], j, i;
      for (j = 0; j < 2; j++) { aTie[j] = P[0][j][0] === P[1][j][0]; aBR[j] = P[0][j][0] >= P[1][j][0] ? 0 : 1; }
      for (i = 0; i < 2; i++) { bTie[i] = P[i][0][1] === P[i][1][1]; bBR[i] = P[i][0][1] >= P[i][1][1] ? 0 : 1; }
      var aIs = function (i, j) { return aBR[j] === i || aTie[j]; }, bIs = function (i, j) { return bBR[i] === j || bTie[i]; };
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) if (aIs(i, j) && bIs(i, j)) nash.push([i, j]);
      var domA = !aTie[0] && !aTie[1] && aBR[0] === aBR[1] ? aBR[0] : null, domB = !bTie[0] && !bTie[1] && bBR[0] === bBR[1] ? bBR[0] : null;
      return { aBR: aBR, bBR: bBR, aTie: aTie, bTie: bTie, aIs: aIs, bIs: bIs, nash: nash, domA: domA, domB: domB };
    },
    // the cells your circles imply: both payoffs circled
    implied: function (g) {
      var out = [];
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) if (g.a[j] === i && g.b[i] === j) out.push([i, j]);
      return out;
    },
    domain: function () { return { X: 100, Y: 100, xs: 1000, ys: 1000 }; },
    score: function (p, g, s) {
      s = s || game.solve(p);
      var k = 0;
      for (var j = 0; j < 2; j++) if (g.a[j] === s.aBR[j]) k++;
      for (var i = 0; i < 2; i++) if (g.b[i] === s.bBR[i]) k++;
      return { total: 25 * k, right: k };
    }
  };

  /* ---------- 9.4 Block pricing ---------- */
  // n equal blocks over 0..Q_eff, block i priced at the demand price of its last unit
  var blocks = {
    defaults: function () { return { a: 3, b: 0.1, mc: 1, n: 3 }; },
    gen: function (rng) { var s = pick(rng, SETS); return { a: s[0], b: s[1], mc: s[2], n: pick(rng, [2, 3, 4, 5]) }; },
    valid: function (p) { return p.mc > 0 && p.mc < p.a && p.n >= 1 && p.n <= 10; },
    random: function (rng, prev) { return draw(blocks.gen, blocks.valid, prev, rng); },
    solve: function (p) {
      var Qe = (p.a - p.mc) / p.b, w = Qe / p.n, pr = [], profit = 0;
      for (var i = 1; i <= p.n; i++) { var P = Pd(p, i * w); pr.push(P); profit += (P - p.mc) * w; }
      var max = 0.5 * (p.a - p.mc) * Qe;
      return { Qe: Qe, w: w, pr: pr, profit: profit, max: max, choke: p.a / p.b, share: profit / max, start: +(p.a - 0.06 * (p.a - p.mc)).toFixed(2) };
    },
    domain: demDom,
    score: function (p, g, s) {
      s = s || blocks.solve(p);
      var sum = 0;
      for (var i = 0; i < p.n; i++) sum += g.pr && g.pr[i] != null ? lin((g.pr[i] - s.pr[i]) / (p.a - p.mc), 0.03, 0.35) : 0;
      return { total: Math.round(100 * sum / p.n) };
    }
  };

  var W9 = { twopart: twopart, natmon: natmon, game: game, blocks: blocks,
    util: { Qd: Qd, Pd: Pd, lin: lin, niceAxis: niceAxis, pick: pick, clone: clone, SETS: SETS, ARCH: ARCH } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W9;
  else root.W9 = W9;
})(this);
