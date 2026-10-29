/* Week 4 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week4-viz.html: demand blue; elasticity red (elastic), gold (unit), blue (inelastic);
 * revenue gained green, lost red; consumer surplus blue, its rectangle green and triangle gold;
 * Consumer 1 orange, Consumer 2 purple, market blue (as in the fig48 film). Plum always means "you". */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg;
  var M = window.W4, PLUM = C.plum, Qd = M.util.Q, el = M.util.el;
  var DEM = C.blue, DEMT = C.tBlue, VAL = C.tBlue;
  var AX = { xtitle: 'Quantity', ytitle: 'Price ($)' };

  function bnum(b) { return b === 1 ? '' : num(b, 2); }
  function demEq(a, b, lhs) { return (lhs || 'Q') + ' = ' + num(a, 2) + ' - ' + bnum(b) + 'P'; }
  function linePts(p) { return [[0, p.a / p.b], [p.a, 0]]; }
  function pFn(p) { return function (q) { return (p.a - q) / p.b; }; }   // inverse demand: P at quantity q
  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  function absE(p, P) { return Math.abs(el(p, P)); }
  function zone(e) { e = Math.abs(e); return e > 1 + 1e-9 ? 'elastic' : e < 1 - 1e-9 ? 'inelastic' : 'unit elastic'; }
  // elasticity color: red elastic, gold unit, blue inelastic (log scale, saturating at 3 and 1/3)
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(lerp(x[i], y[i], t)).toString(16)).slice(-2); }).join(''); }
  function eCol(e, text) {
    e = Math.abs(e); var t = clamp(Math.log(e) / Math.log(3), -1, 1);
    var R = text ? C.tRed : C.red, Gd = text ? C.tGold : C.gold, B = text ? C.tBlue : C.blue;
    return t >= 0 ? mix(Gd, R, t) : mix(Gd, B, -t);
  }
  // price of the point on the demand line nearest the pointer (measured in pixels), rounded to $0.10
  function projP(S, p, X, Y, lo, hi) {
    var n = G.nearest(X, Y, linePts(p), (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return clamp(Math.round(n.y * 10) / 10, lo, hi);
  }
  // a handle that slides along the demand line; setP(f, P) stores the price
  function onLine(f, P, setP, o) {
    o = o || {}; var c = f.p.a / f.p.b, lo = o.lo == null ? 0.02 * c : o.lo, hi = o.hi == null ? 0.98 * c : o.hi;
    var ks = o.ks || Math.max(0.1, Math.round(c / 50 * 10) / 10);
    return { x: Qd(f.p, P), y: P, c: o.c || C.ink, step: o.step, active: o.active,
      set: function (f, X, Y) { setP(f, projP(f.S, f.p, X, Y, lo, hi)); },
      key: function (f, dx, dy) { setP(f, clamp(Math.round((P + (dy - dx) * ks) * 10) / 10, lo, hi)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  function lineLabel(D, S, s, p, fracs, o) {
    var fn = pFn(p);
    return D.label(s, D.along(fn, fracs.map(function (t) { return t * p.a; }), 12, o && o.pref), Object.assign({ c: DEMT, size: S.fs }, o || {}));
  }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // label at the centre of a data rectangle if it fits there
  function inRect(D, S, s, x0, y0, x1, y1, o) {
    var w = Math.abs(S.x(x1) - S.x(x0)), h = Math.abs(S.y(y1) - S.y(y0)), size = (o && o.size) || S.ls;
    if (w < Kit.tw(s, size) + 12 || h < size + 8) return false;
    var cx = S.x((x0 + x1) / 2), cands = [0.5, 0.3, 0.7, 0.2, 0.8].map(function (t) { return { x: cx, y: S.y(lerp(y0, y1, t)) + size * 0.35, anchor: 'middle' }; });
    D.label(s, cands, Object.assign({ prio: 0, ring: 1 }, o || {}));
    return true;
  }
  var KBD_LINE = 'Keyboard: arrow keys slide the point along the curve (Shift for bigger steps), Enter confirms.';

  /* =====================================================================
     4.1  Point vs arc elasticity
     ===================================================================== */
  var f41 = {
    key: 'f41', num: '4.1', topic: 'Point vs arc elasticity', short: 'Point vs arc', model: M.arc, axes: AX,
    question: 'Where on the curve does the point elasticity equal the arc elasticity from A to B?',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>' + demEq(p.a, p.b) + '</b>. A is P = ' + money(p.P1) + ', Q = ' + num(s.Q1, 2) + '; B is P = ' + money(p.P2) + ', Q = ' + num(s.Q2, 2) +
        '. The arc (midpoint) elasticity from A to B divides by the <b>average</b> price and the <b>average</b> quantity. The point elasticity at one spot is e<sub>d</sub> = -bP/Q = -' + bnum(p.b) + (p.b === 1 ? '' : '&middot;') + 'P/Q.';
    },
    steps: [{ kind: 'drag', label: 'Point C', prompt: 'Slide the plum point C along the demand curve to where its point elasticity equals the arc elasticity from A to B.',
      check: function (f) { return Math.abs(f.g.P - f.sol.start) > 0.05 ? true : 'Slide it along the curve first.'; } }],
    kbdHint: KBD_LINE,
    initGuess: function (f) { return { P: f.sol.start }; },
    handles: function (f) {
      var p = f.p, c = p.a / p.b;
      if (f.predicting) return [onLine(f, f.g.P, function (f, P) { f.g.P = P; }, { c: PLUM, step: 0, active: !f.done[0] })];
      if (!f.exploring) return [];
      return [
        onLine(f, p.P1, function (f, P) { f.p.P1 = P; }, { lo: 0.02 * c, hi: p.P2 - 0.5 }),
        onLine(f, p.P2, function (f, P) { f.p.P2 = P; }, { lo: p.P1 + 0.5, hi: 0.98 * c })
      ];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.area(box(s.Q2, p.P1, s.Q1, p.P2), { fill: C.gold, fo: 0.09, op: b });
      D.line(0, s.c, p.a, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) lineLabel(D, S, demEq(p.a, p.b), p, [0.86, 0.76, 0.93, 0.66]);
      [['A', s.Q1, p.P1], ['B', s.Q2, p.P2]].forEach(function (q) {
        if (!f.exploring) D.dot(q[1], q[2], { c: C.ink, r: 9, pr: b });
        if (b > 0.5) D.label(q[0], D.around(q[1], q[2], 20).slice(0, 2).concat(D.around(q[1], q[2], 20).slice(4)), { c: C.ink, size: S.fs, prio: 0 });
      });
      if (f.predicting) {
        D.drop(Qd(p, g.P), g.P, { c: PLUM, op: 0.5 });
        D.near(Qd(p, g.P), g.P, 'C', { c: PLUM, size: S.fs, d: 20 });
        return;
      }
      var mid = f.t('mid'), lab = f.t('vals');
      if (f.ghostOn()) { D.ghost(Qd(p, g.P), g.P, { op: f.gOp() }); youTag(f, D, Qd(p, g.P), g.P, 'your C'); }
      if (mid > 0) {
        D.line(0, s.Pm, lerp(0, s.Qm, mid), s.Pm, { c: C.gold, w: 3, dash: '7 6', layer: 'over' });
        D.line(s.Qm, 0, s.Qm, lerp(0, s.Pm, mid), { c: C.gold, w: 3, dash: '7 6', layer: 'over' });
        D.dot(s.Qm, s.Pm, { c: C.ink, r: 10, pr: seg(mid, 0.55, 1) });
        D.yval(s.Pm, (S.narrow ? 'avg P ' : 'average P = ') + money(s.Pm), { c: C.tGold, op: mid, dy: -9 });
        D.xval(s.Qm, (S.narrow ? 'avg Q ' : 'average Q = ') + num(s.Qm, 2), { c: C.tGold, op: mid, anchor: 'start', dx: 8 });
      }
      if (lab > 0) {
        D.near(s.Qm, s.Pm, 'M: e_d = ' + num(s.em, 2), { c: C.ink, op: lab, d: 22, prio: 0, size: S.ls, ring: 90 });
        D.near(s.Q1, p.P1, 'e_d = ' + num(s.e1, 2), { c: eCol(s.e1, true), op: lab, d: 22, ring: 90 });
        D.near(s.Q2, p.P2, 'e_d = ' + num(s.e2, 2), { c: eCol(s.e2, true), op: lab, d: 22, ring: 90 });
        D.label('arc A to B: ' + num(s.arc, 2), [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.ink, op: lab, prio: 0 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['mid', 300, 1300], ['vals', 1500, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Price at C', money(g.P), money(s.Pm)], ['Quantity at C', num(Qd(p, g.P), 1), num(s.Qm, 2)], ['e<sub>d</sub> at C', num(el(p, g.P), 2), num(s.arc, 2)]],
        why: 'The arc formula divides by the average quantity, ' + num(s.Qm, 2) + ', and the average price, ' + money(s.Pm) + '. On a straight demand line that average point M lies on the line, so the arc elasticity is the point elasticity at M: -' +
          num(p.b, 2) + ' &times; ' + num(s.Pm, 2) + ' / ' + num(s.Qm, 2) + ' = <b>' + num(s.arc, 2) + '</b>. The endpoints disagree with it: e<sub>d</sub> = ' + num(s.e1, 2) + ' at A and ' + num(s.e2, 2) + ' at B.'
      };
    },
    explore: {
      hint: 'Drag A or B along the curve. The arc number always matches the point elasticity at the midpoint M, and drifts further from the values at A and B as they spread apart.',
      controls: [],
      readout: function (f) {
        var s = f.sol;
        return 'Arc A to B: <b>' + num(s.arc, 2) + '</b>. Point e<sub>d</sub>: at A ' + num(s.e1, 2) + ', at M <b>' + num(s.em, 2) + '</b>, at B ' + num(s.e2, 2) + '.';
      }
    }
  };

  /* =====================================================================
     4.2  Elasticity along the curve: the heatmap
     ===================================================================== */
  function heatLine(D, p, pr, w) {
    var N = 72, c = p.a / p.b;
    for (var i = 0; i < N; i++) {
      if (i / N >= pr) break;
      var P1 = c * (1 - i / N), P2 = c * (1 - Math.min(1, (i + 1) / N, pr)), Pm = (P1 + P2) / 2;
      D.line(Qd(p, P1), P1, Qd(p, P2), P2, { c: eCol(el(p, Pm)), w: w || 8, cap: 'butt' });
    }
  }
  function kTxt(k) { return num(k, 2); }
  function placeOnLine(key) {
    return function (f, X, Y) { var c = f.p.a / f.p.b, P = projP(f.S, f.p, X, Y, 0.02 * c, 0.98 * c); f.g[key] = { x: Qd(f.p, P), y: P }; };
  }
  var f42 = {
    key: 'f42', num: '4.2', topic: 'Elasticity along a demand curve', short: 'Elasticity heatmap', model: M.heat, axes: AX,
    question: function (f) { return 'Where on this curve is demand unit elastic, and where is |e_d| = ' + kTxt(f.p.k) + '?'; },
    setup: function (f) {
      var p = f.p;
      return 'Demand is <b>' + demEq(p.a, p.b) + '</b>. The slope of a straight demand line never changes, but its elasticity e<sub>d</sub> = -bP/Q does, point by point.';
    },
    steps: [
      { kind: 'place', key: 'u', handle: false, label: 'Unit elastic, |e_d| = 1', prompt: 'Tap the point on the demand curve where demand is unit elastic. Drag it to adjust.',
        place: placeOnLine('u'), kstart: function (f) { return { x: f.p.a * 0.85, y: pFn(f.p)(f.p.a * 0.85) }; } },
      { kind: 'place', key: 'k', handle: false, label: function (f) { return '|e_d| = ' + kTxt(f.p.k); }, prompt: function (f) { return 'Now tap the point where |e<sub>d</sub>| = ' + kTxt(f.p.k) + '.'; },
        place: placeOnLine('k'), kstart: function (f) { return { x: f.p.a * 0.15, y: pFn(f.p)(f.p.a * 0.15) }; },
        check: function (f) { return f.g.k && f.g.u && Math.abs(f.g.k.y - f.g.u.y) < 0.02 * f.sol.c ? 'That is your unit-elastic point. Pick a different spot.' : true; } }
    ],
    kbdHint: 'Keyboard: Enter drops the point on the curve, arrow keys slide it, Enter confirms.',
    initGuess: function () { return { u: null, k: null }; },
    handles: function (f) {
      var g = f.g;
      if (f.predicting) {
        var hs = [];
        if (g.u) hs.push(onLine(f, g.u.y, function (f, P) { f.g.u = { x: Qd(f.p, P), y: P }; }, { c: PLUM, step: 0, active: f.cur === 0 }));
        if (g.k) hs.push(onLine(f, g.k.y, function (f, P) { f.g.k = { x: Qd(f.p, P), y: P }; }, { c: PLUM, step: 1, active: f.cur === 1 }));
        return hs;
      }
      if (f.exploring) return [onLine(f, f.ex.P, function (f, P) { f.ex.P = P; }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, ht = f.t('heat');
      D.line(0, s.c, p.a, 0, { c: DEM, w: 5, pr: b, op: ht >= 1 ? 0 : 1, reg: ht < 1 });
      if (ht > 0) heatLine(D, p, ht);
      if (b > 0.9) lineLabel(D, S, demEq(p.a, p.b), p, [0.9, 0.82, 0.95]);
      if (f.predicting) {
        if (g.u) D.near(g.u.x, g.u.y, '|e_d| = 1', { c: PLUM, d: 22 });
        if (g.k) D.near(g.k.x, g.k.y, '|e_d| = ' + kTxt(p.k), { c: PLUM, d: 22 });
        return;
      }
      var un = f.t('unit'), kk = f.t('k'), zn = f.t('zones');
      if (f.ghostOn()) {
        if (g.u) D.ghost(g.u.x, g.u.y, { op: f.gOp() });
        if (g.k) D.ghost(g.k.x, g.k.y, { op: f.gOp() });
        if (g.u) youTag(f, D, g.u.x, g.u.y);
      }
      if (un > 0) {
        D.drop(s.Qu, s.Pu, { pr: un });
        D.dot(s.Qu, s.Pu, { c: C.ink, r: 10, pr: un });
        D.near(s.Qu, s.Pu, S.narrow ? 'e_d = -1' : 'unit elastic: e_d = -1', { c: C.tGold, op: un, d: 22, prio: 0, ring: 90 });
      }
      if (kk > 0 && !f.exploring) {
        D.dot(s.Qk, s.Pk, { c: C.ink, r: 10, pr: kk });
        D.near(s.Qk, s.Pk, 'e_d = -' + kTxt(p.k) + ' at ' + money(s.Pk), { c: eCol(s.ek, true), op: kk, d: 22, prio: 0, ring: 90 });
      }
      if (zn > 0) {
        var fn = pFn(p);
        D.label(S.narrow ? 'elastic' : 'elastic, |e_d| > 1', D.along(fn, [0.18 * p.a, 0.26 * p.a, 0.12 * p.a, 0.32 * p.a], 14), { c: C.tRed, op: zn, size: S.ls, ring: 70 });
        D.label(S.narrow ? 'inelastic' : 'inelastic, |e_d| < 1', D.along(fn, [0.8 * p.a, 0.72 * p.a, 0.86 * p.a, 0.66 * p.a], 14), { c: C.tBlue, op: zn, size: S.ls, ring: 70 });
      }
      if (f.exploring) {
        var e = el(p, f.ex.P), q = Qd(p, f.ex.P);
        D.drop(q, f.ex.P, {});
        D.near(q, f.ex.P, 'e_d = ' + num(e, 2), { c: eCol(e, true), d: 24, prio: 0, size: S.fs, ring: 90 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['heat', 300, 1400, 'linear'], ['unit', 1500, 600], ['k', 2000, 600], ['zones', 2400, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gu = g.u || { y: NaN }, gk = g.k || { y: NaN };
      return {
        rows: [['Unit elastic at', g.u ? money(gu.y) : '', money(s.Pu)], ['|e<sub>d</sub>| = ' + kTxt(p.k) + ' at', g.k ? money(gk.y) : '', money(s.Pk)],
          ['Your two points', g.u && g.k ? num(el(p, gu.y), 2) + ', ' + num(el(p, gk.y), 2) : '', '-1, -' + kTxt(p.k)]],
        why: 'e<sub>d</sub> = -bP/Q. At the midpoint of the line, P = a/(2b) = ' + num(p.a) + '/(2 &times; ' + num(p.b, 2) + ') = <b>' + money(s.Pu) + '</b> and Q = ' + num(s.Qu, 2) +
          ', so bP = Q and e<sub>d</sub> = -1. Above it price is high and quantity low, so demand is elastic; below it, inelastic. |e<sub>d</sub>| = ' + kTxt(p.k) + ' where bP = ' + kTxt(p.k) +
          'Q, which gives P = ' + kTxt(p.k) + '/' + kTxt(1 + p.k) + ' &times; ' + num(s.c, 2) + ' = <b>' + money(s.Pk) + '</b>, Q = ' + num(s.Qk, 2) + '.'
      };
    },
    explore: {
      init: function (f) { f.ex.P = f.sol.Pk; },
      hint: 'Drag the point along the curve. Red is elastic, gold unit elastic, blue inelastic.',
      controls: [],
      readout: function (f) {
        var p = f.p, P = f.ex.P, e = el(p, P);
        return 'At P = ' + money(P) + ', Q = ' + num(Qd(p, P), 1) + ': <b>e<sub>d</sub> = ' + num(e, 2) + '</b>, ' + zone(e) + (Math.abs(e) > 1 ? ' (above the midpoint).' : Math.abs(e) < 1 ? ' (below the midpoint).' : '.');
      }
    }
  };

  /* =====================================================================
     4.3  The revenue rectangle (has a film)
     ===================================================================== */
  // revenue strips when the price moves from Pa to Pb: kept (blue), gained (green), lost (red)
  function strips(D, S, p, Pa, Pb, op, labels) {
    var Qa = Qd(p, Pa), Qb = Qd(p, Pb), o = op == null ? 1 : op;
    D.area(box(0, 0, Math.min(Qa, Qb), Math.min(Pa, Pb)), { fill: C.blue, fo: 0.13, op: o });
    if (Math.abs(Pb - Pa) < 1e-9) return;
    var gain, loss;
    if (Pb > Pa) { gain = [0, Pa, Qb, Pb]; loss = [Qb, 0, Qa, Pa]; }
    else { gain = [Qa, 0, Qb, Pb]; loss = [0, Pb, Qa, Pa]; }
    D.area(box(gain[0], gain[1], gain[2], gain[3]), { fill: C.green, fo: 0.34, op: o });
    D.area(box(loss[0], loss[1], loss[2], loss[3]), { fill: C.red, fo: 0.3, op: o });
    if (labels) {
      var gv = Math.abs((gain[2] - gain[0]) * (gain[3] - gain[1])), lv = Math.abs((loss[2] - loss[0]) * (loss[3] - loss[1]));
      inRect(D, S, '+' + money(gv), gain[0], gain[1], gain[2], gain[3], { c: C.tGreen, op: o, size: S.ss });
      inRect(D, S, '-' + money(lv), loss[0], loss[1], loss[2], loss[3], { c: C.tRed, op: o, size: S.ss });
    }
  }
  var f43 = {
    key: 'f43', num: '4.3', topic: 'Elasticity and total revenue', short: 'Revenue rectangle', model: M.revenue, axes: AX,
    film: { name: 'fig43-elasticity-revenue', label: 'Animation: elasticity and revenue', title: 'Watch first, 43 seconds',
      caption: 'Along Q = 100 - 2P the revenue rectangle P x Q grows while demand is elastic, peaks at $1,250 at the unit-elastic midpoint, and shrinks once demand turns inelastic. Then find the peak yourself.' },
    question: function (f) { return 'The price is ' + money(f.p.P0) + '. Would a cut raise or lower revenue? Drag the price to where revenue is highest.'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>' + demEq(p.a, p.b) + '</b>. At ' + money(p.P0) + ' buyers take ' + num(s.Q0, 2) + ' units, so total revenue TR = P &times; Q = <b>' + money(s.TR0) + '</b>: the shaded rectangle.';
    },
    steps: [{ kind: 'drag', label: 'The revenue-maximizing price', prompt: 'Slide the plum point along the demand curve to the price that makes the revenue rectangle as big as it can be.',
      check: function (f) { return Math.abs(f.g.P - f.p.P0) >= 0.5 ? true : 'Slide it further: that is still the current price.'; } }],
    kbdHint: KBD_LINE,
    initGuess: function (f) { return { P: f.p.P0 }; },
    handles: function (f) {
      var p = f.p;
      if (f.predicting) return [onLine(f, f.g.P, function (f, P) { f.g.P = P; }, { c: PLUM, step: 0, active: !f.done[0] })];
      if (!f.exploring) return [];
      return [onLine(f, p.P0, function (f, P) { f.p.P0 = P; }), onLine(f, f.ex.P, function (f, P) { f.ex.P = P; }, { active: true })];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      if (!f.exploring && !(f.revealing && f.t('walk') > 0)) {
        D.area(box(0, 0, s.Q0, p.P0), { fill: C.blue, fo: 0.13, op: b });
        if (b > 0.9) inRect(D, S, 'TR = ' + money(s.TR0), 0, 0, s.Q0, p.P0, { c: DEMT });
      }
      D.line(0, s.c, p.a, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) lineLabel(D, S, demEq(p.a, p.b), p, [0.88, 0.8, 0.94]);
      if (!f.exploring) { D.dot(s.Q0, p.P0, { c: C.ink, r: 9, pr: b }); if (b > 0.5) D.near(s.Q0, p.P0, 'now ' + money(p.P0), { c: C.ink, d: 20 }); }
      if (f.predicting) {
        if (Math.abs(g.P - p.P0) > 1e-9) { D.drop(Qd(p, g.P), g.P, { c: PLUM, op: 0.55 }); D.near(Qd(p, g.P), g.P, money(g.P), { c: PLUM, d: 22 }); }
        return;
      }
      var w = f.t('walk'), pk = f.t('peak');
      if (f.ghostOn()) { D.ghost(Qd(p, g.P), g.P, { op: f.gOp() }); youTag(f, D, Qd(p, g.P), g.P); }
      if (f.revealing && w > 0) {
        var Pw = Math.round(lerp(p.P0, s.Ps, w) * 2) / 2;   // whole half-dollars, so every label is a real price
        strips(D, S, p, p.P0, Pw, 1, w > 0.3);
        if (pk <= 0) { D.dot(Qd(p, Pw), Pw, { c: C.ink, r: 9 }); D.near(Qd(p, Pw), Pw, 'TR = ' + money(M.revenue.TR(p, Pw)), { c: C.ink, d: 22, prio: 0 }); }
      }
      if (pk > 0 && !f.exploring) {
        D.drop(s.Qs, s.Ps, { pr: pk });
        D.dot(s.Qs, s.Ps, { c: C.ink, r: 10, pr: pk });
        D.near(s.Qs, s.Ps, 'TR max = ' + money(s.TRmax) + ', |e_d| = 1', { c: C.ink, op: pk, d: 22, prio: 0 });
      }
      if (f.exploring) {
        var Pn = f.ex.P;
        strips(D, S, p, p.P0, Pn, 1, true);
        D.near(Qd(p, p.P0), p.P0, 'old ' + money(p.P0), { c: C.soft, d: 24, prio: 0 });
        D.near(Qd(p, Pn), Pn, 'new ' + money(Pn) + ': TR ' + money(M.revenue.TR(p, Pn)), { c: C.ink, d: 24, prio: 0 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['walk', 350, 1900], ['peak', 2350, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, el0 = Math.abs(s.e0);
      var dirG = g.P < p.P0 ? 'cut' : 'raise', dirT = s.dir < 0 ? 'cut' : 'raise';
      return {
        rows: [['Cut or raise', dirG, dirT], ['Price', money(g.P), money(s.Ps)], ['Revenue', money(M.revenue.TR(p, g.P)), money(s.TRmax)]],
        why: 'At ' + money(p.P0) + ', |e<sub>d</sub>| = ' + num(el0, 2) + (el0 > 1 ? ' &gt; 1: demand is elastic, so a 1% cut raises quantity by more than 1% and revenue rises (green beats red).' :
          ' &lt; 1: demand is inelastic, so a price rise loses proportionally fewer buyers and revenue rises.') +
          ' Revenue peaks where |e<sub>d</sub>| = 1, the midpoint of the line: P = ' + num(s.c, 2) + '/2 = <b>' + money(s.Ps) + '</b>, Q = ' + num(s.Qs, 2) + ', TR = <b>' + money(s.TRmax) + '</b>.' +
          (dirG !== dirT && !f.skipped ? ' You moved the price the wrong way.' : '')
      };
    },
    explore: {
      init: function (f) { f.ex.P = f.sol.Ps; },
      hint: 'Drag the new price, or the old one. Green is revenue gained, red revenue lost; whichever is bigger decides the change.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, Pn = f.ex.P, T0 = M.revenue.TR(p, p.P0), T1 = M.revenue.TR(p, Pn), d = T1 - T0;
        return 'TR at ' + money(p.P0) + ': <b>' + money(T0) + '</b>; at ' + money(Pn) + ': <b>' + money(T1) + '</b>' + (Math.abs(d) < 0.005 ? ', no change' : ', a change of <b class="' + (d >= 0 ? 'c-green' : 'c-red') + '">' + (d >= 0 ? '+' : '') + money(d) + '</b>') + '. |e<sub>d</sub>| at the old price: ' + num(Math.abs(s.e0), 2) + ' (' + zone(s.e0) + ').';
      }
    }
  };

  /* =====================================================================
     4.4  Pricing strategy: %dQ and %dTR for a price change
     ===================================================================== */
  var OFF = 30, HW = 0.42;   // OFF: the zero line, half the frame height; set per round from f.dom
  var XP = 1, XQ = 2.5, XT = 4;
  function pct(v, dp) { var r = Math.round(v * Math.pow(10, dp == null ? 1 : dp)); return (r > 0 ? '+' : '') + num(v, dp == null ? 1 : dp) + '%'; }
  function bar(D, S, x, v, o) {
    var vv = clamp(v, -OFF + 1, OFF - 1);
    D.area(box(x - HW, OFF, x + HW, OFF + vv), { fill: o.fill, fo: o.fo == null ? 0.85 : o.fo, op: o.op, stroke: o.stroke, sw: 3, layer: o.layer || 'under' });
    var y0 = S.y(OFF), y1 = S.y(OFF + vv); D.L.rect(S.x(x - HW), Math.min(y0, y1), S.x(x + HW) - S.x(x - HW), Math.abs(y1 - y0));
    return vv;
  }
  function barVal(D, S, x, v, s, o) {
    var vv = clamp(v, -OFF + 1, OFF - 1), y = S.y(OFF + vv), up = v >= 0;
    var c1 = { x: S.x(x), y: up ? y - 10 : y + 26, anchor: 'middle' }, c2 = { x: S.x(x), y: up ? y + 26 : y - 10, anchor: 'middle' };
    D.label(s, [c1, { x: S.x(x + HW) + 8, y: y + 6, anchor: 'start' }, c2], Object.assign({ prio: 0, size: S.ls }, o));
  }
  function barHandle(f, S, x, v, setv, step, act, col) {
    return { x: x, y: OFF + clamp(v, -OFF, OFF), c: col || PLUM, grip: 'v', snap: { x: 0, y: 0.5 }, step: step, active: act, kstep: { x: 0, y: 0.5 },
      hit: function (pt) { return Math.abs(pt.x - S.x(x)) < (S.x(HW) - S.x(0)) + 6 ? Math.abs(pt.y - S.y(OFF + clamp(v, -OFF, OFF))) : 1e9; },
      set: function (f, X, Y) { setv(f, clamp(Y - OFF, -OFF, OFF)); } };
  }
  var f44 = {
    key: 'f44', num: '4.4', topic: 'Pricing strategy and elasticity', short: 'Pricing strategy', model: M.pricing,
    axes: function (f) { var H = f.dom.Y / 2; return { xtitle: '', ytitle: '% change', zero: false, yfmt: function (v) { return pct(v - H, 0); } }; },
    question: function (f) { var i = M.pricing.ind(f.p.ind); return i.name + ': the price ' + (f.p.dp > 0 ? 'rises' : 'falls') + ' ' + Math.abs(f.p.dp) + '%. What happens to quantity and to total revenue?'; },
    setup: function (f) {
      var i = M.pricing.ind(f.p.ind);
      return 'Demand for ' + i.name.toLowerCase() + ' has the empirical elasticity <b>e<sub>d</sub> = ' + num(i.e, 2) + '</b>, constant along the curve: Q<sub>new</sub> = Q<sub>old</sub> &times; (P<sub>new</sub>/P<sub>old</sub>)<sup>e<sub>d</sub></sup>. ' +
        'The grey bar is the price change. Predict the exact percentage changes.';
    },
    steps: [
      { kind: 'drag', label: '%&Delta;Q', prompt: 'Drag the top of the plum %&Delta;Q bar up or down to your prediction.', check: function (f) { return f.g.mq; } },
      { kind: 'drag', label: '%&Delta;TR', prompt: 'Now drag the plum %&Delta;TR bar.', check: function (f) { return f.g.mt; } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the highlighted bar by half a point (Shift for 2.5), Space switches bars, Enter confirms.',
    initGuess: function () { return { q: 0, tr: 0, mq: false, mt: false }; },
    handles: function (f, S) {
      var g = f.g; OFF = f.dom.Y / 2;
      if (f.predicting) return [
        barHandle(f, S, XQ, g.q, function (f, v) { f.g.q = v; f.g.mq = true; }, 0, f.cur === 0),
        barHandle(f, S, XT, g.tr, function (f, v) { f.g.tr = v; f.g.mt = true; }, 1, f.cur === 1)
      ];
      if (f.exploring) {
        var h = barHandle(f, S, XP, f.p.dp, function (f, v) { var d = clamp(Math.round(v / 5) * 5, -30, 30); f.p.dp = d; }, null, true, C.ink);
        h.snap = { x: 0, y: 5 }; h.key = function (f, dx, dy) { f.p.dp = clamp(f.p.dp + 5 * (dy || dx), -30, 30); f.ex.touched = true; f.resolve(); };
        return [h];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), fs = S.narrow ? 15 : 16;
      OFF = S.Y / 2;
      for (var v = S.ys; v < S.Y - 1e-9; v += S.ys) if (Math.abs(v - OFF) > 1e-9) D.line(0, v, S.X, v, { c: C.line, w: 1.5, reg: false, layer: 'under' });
      D.text(S.x0 - 10, S.y0 + 5.5, pct(-OFF, 0), { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
      [[XP, '%ΔP'], [XQ, '%ΔQ'], [XT, '%ΔTR']].forEach(function (c) { D.text(S.x(c[0]), S.y0 + 30, c[1], { anchor: 'middle', c: C.ink, size: S.ls }); });
      var i = M.pricing.ind(p.ind);
      D.label(i.name + ', e_d = ' + num(i.e, 2), [{ x: S.x1 - 6, y: S.y1 + 8, anchor: 'end' }], { c: C.ink, fixed: true, prio: 0, size: S.ls, op: b });
      bar(D, S, XP, p.dp * b, { fill: C.grey, fo: 0.9 });
      if (b > 0.9) barVal(D, S, XP, p.dp, pct(p.dp, 0), { c: C.soft });
      if (f.predicting) {
        bar(D, S, XQ, g.q, { fill: PLUM, fo: 0.22, stroke: PLUM }); bar(D, S, XT, g.tr, { fill: PLUM, fo: 0.22, stroke: PLUM });
        if (g.mq) barVal(D, S, XQ, g.q, pct(g.q), { c: PLUM });
        if (g.mt) barVal(D, S, XT, g.tr, pct(g.tr), { c: PLUM });
      } else {
        var tq = f.t('q'), tt = f.t('tr'), ta = f.t('approx');
        if (f.ghostOn()) {
          [[XQ, g.q], [XT, g.tr]].forEach(function (c) {
            D.line(c[0] - HW - 0.08, OFF + c[1], c[0] + HW + 0.08, OFF + c[1], { c: PLUM, w: 3.5, dash: '5 5', op: f.gOp(), layer: 'over', reg: false });
            D.ghost(c[0] - HW - 0.08, OFF + c[1], { op: f.gOp(), r: 7 });
          });
          youTag(f, D, XQ - HW - 0.08, OFF + g.q);
        }
        if (tq > 0) { bar(D, S, XQ, s.dQ * tq, { fill: C.blue }); if (tq > 0.6) barVal(D, S, XQ, s.dQ, pct(s.dQ, 2), { c: C.tBlue, op: seg(tq, 0.6, 1) }); }
        if (tt > 0) { bar(D, S, XT, s.dTR * tt, { fill: s.dTR >= 0 ? C.green : C.red }); if (tt > 0.6) barVal(D, S, XT, s.dTR, pct(s.dTR, 2), { c: s.dTR >= 0 ? C.tGreen : C.tRed, op: seg(tt, 0.6, 1) }); }
        if (ta > 0 && Math.abs(s.approx - s.dTR) > 0.05) {
          var ay = OFF + clamp(s.approx, -OFF + 1, OFF - 1);
          D.add('over', Kit.K.polygon(box(XT - HW - 0.1, OFF, XT + HW + 0.1, ay).map(function (q) { return [S.x(q[0]), S.y(q[1])]; }), { fill: 'none', fo: 0, stroke: C.soft, sw: 2.5, op: ta }).replace('/>', ' stroke-dasharray="6 5"/>'));
          D.label('shortcut ' + pct(s.approx, 1), [{ x: S.x(XT + HW) + 14, y: S.y(ay) + 6, anchor: 'start' }, { x: S.x(XT - HW) - 14, y: S.y(ay) + 6, anchor: 'end' }], { c: C.soft, op: ta, size: S.ss });
        }
      }
      D.line(0, OFF, S.X, OFF, { c: C.ink, w: 2.5, reg: false, layer: 'over' });
    },
    reveal: function () { return [['ghost', 0, 400], ['q', 300, 900], ['tr', 1100, 900], ['approx', 2000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, r = 1 + p.dp / 100, rs = num(r, 2);
      return {
        rows: [['%&Delta;Q', pct(g.q), pct(s.dQ, 2)], ['%&Delta;TR', pct(g.tr), pct(s.dTR, 2)], ['Shortcut %&Delta;P &times; (1 + e<sub>d</sub>)', '', pct(s.approx, 1)]],
        why: 'Quantity: ' + rs + '<sup>' + num(s.e, 2) + '</sup> - 1 = ' + pct(s.dQ, 2) + '. Revenue is price times quantity: ' + rs + ' &times; ' + rs + '<sup>' + num(s.e, 2) + '</sup> - 1 = ' + rs + '<sup>' + num(1 + s.e, 2) + '</sup> - 1 = <b>' + pct(s.dTR, 2) + '</b>. ' +
          (s.elastic ? '|e<sub>d</sub>| &gt; 1, so quantity moves by a bigger percentage than price and revenue moves against the price.' : '|e<sub>d</sub>| &lt; 1, so quantity moves by a smaller percentage than price and revenue moves with the price.') +
          ' The shortcut %&Delta;P &times; (1 + e<sub>d</sub>) = ' + pct(s.approx, 1) + ' is close for small changes and drifts for big ones.'
      };
    },
    explore: {
      hint: 'Switch industries, or drag the grey %&Delta;P bar (or step it). The dashed outline is the shortcut %&Delta;P &times; (1 + e<sub>d</sub>).',
      controls: [
        { kind: 'seg', label: 'Industry', options: M.pricing.IND.map(function (i) { return [i.key, i.name + ' ' + num(i.e, 2)]; }),
          get: function (f) { return f.p.ind; }, set: function (f, v) { f.p.ind = v; } },
        { kind: 'stepper', label: '%&Delta;P', get: function (f) { return f.p.dp; }, set: function (f, v, fin) { f.p.dp = fin ? v : v; }, step: 5, min: -30, max: 30, fmt: function (v) { return pct(Math.round(v), 0); }, dur: 350 }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol, i = M.pricing.ind(p.ind);
        if (p.dp === 0) return i.name + ' (e<sub>d</sub> = ' + num(i.e, 2) + '): no price change, no revenue change.';
        return i.name + ', e<sub>d</sub> = ' + num(i.e, 2) + '. Price ' + pct(p.dp, 0) + ': quantity <b>' + pct(s.dQ, 2) + '</b>, revenue <b class="' + (s.dTR >= 0 ? 'c-green' : 'c-red') + '">' + pct(s.dTR, 2) + '</b> (shortcut ' + pct(s.approx, 1) + '). ' +
          (s.elastic ? 'Elastic: a ' + (p.dp > 0 ? 'rise hurts' : 'cut grows') + ' revenue.' : 'Inelastic: a ' + (p.dp > 0 ? 'rise grows' : 'cut hurts') + ' revenue.');
      }
    }
  };

  /* =====================================================================
     4.6  Consumer surplus lost when the price rises
     ===================================================================== */
  function edgeHandle(f, S, P, x, setx, step, act) {
    return { x: x, y: P, c: PLUM, grip: 'h', snap: { x: 0.5, y: 0 }, step: step, active: act, kstep: { x: 0.5, y: 0 },
      hit: function (pt) { return Math.abs(pt.y - S.y(P)) < 30 ? Math.abs(pt.x - S.x(x)) : 1e9; },
      set: function (f, X) { setx(f, clamp(X, 0, f.dom.X)); } };
  }
  var f46 = {
    key: 'f46', num: '4.6', topic: 'Consumer surplus', short: 'Consumer surplus', model: M.surplus, axes: AX,
    question: function (f) { var p = f.p; return p.P1 > p.P0 ? 'The price rises from ' + money(p.P0) + ' to ' + money(p.P1) + '. Shade the consumer surplus buyers lose.' : 'The price falls from ' + money(p.P0) + ' to ' + money(p.P1) + '. Shade the consumer surplus buyers gain.'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>' + demEq(p.a, p.b) + '</b>. Consumer surplus is the area below the demand curve and above the price: at ' + money(p.P0) + ' it is the blue triangle, <b>' + money(s.CS0) + '</b>.';
    },
    steps: [{ kind: 'drag', label: function (f) { return f.p.P1 > f.p.P0 ? 'The surplus lost' : 'The surplus gained'; },
      prompt: function (f) { return f.g.mb || f.g.mt ? 'Good. Now drag the other handle.' : 'Drag the two plum handles along the two price lines until the plum area covers exactly the surplus that ' + (f.p.P1 > f.p.P0 ? 'buyers lose.' : 'buyers gain.'); },
      check: function (f) { return f.g.mb && f.g.mt; } }],
    kbdHint: 'Keyboard: left and right arrows move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function (f) { var x0 = Math.round(f.dom.X * 0.12); return { xb: x0, xt: x0, mb: false, mt: false }; },
    handles: function (f, S) {
      var p = f.p, s = f.sol, c = s.c;
      if (f.predicting) return [
        edgeHandle(f, S, s.Phi, f.g.xt, function (f, x) { f.g.xt = x; f.g.mt = true; }, 0, !f.g.mt),
        edgeHandle(f, S, s.Plo, f.g.xb, function (f, x) { f.g.xb = x; f.g.mb = true; }, 0, !f.g.mb)
      ];
      if (!f.exploring) return [];
      var keep = function (key) { return function (f, P) { var o = key === 'P0' ? f.p.P1 : f.p.P0; if (Math.abs(P - o) >= 0.5) f.p[key] = Math.round(P * 2) / 2; }; };
      return [onLine(f, p.P0, keep('P0'), { lo: 0.03 * c, hi: 0.95 * c }), onLine(f, p.P1, keep('P1'), { lo: 0.03 * c, hi: 0.95 * c, active: true })];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      var rc = f.t('rect'), tr = f.t('tri'), sm = f.t('sum');
      // surplus that survives at the higher price (blue), the triangle at the old price before the reveal
      var Ptop = f.truth && rc > 0 ? s.Phi : p.P0;
      D.area([[0, s.c], [Qd(p, Ptop), Ptop], [0, Ptop]], { fill: C.blue, fo: 0.16, op: b });
      if (b > 0.9) D.label(f.truth && rc > 0 ? 'CS at ' + money(s.Phi) : 'CS at ' + money(p.P0), D.around(Qd(p, Ptop) * 0.28, lerp(Ptop, s.c, 0.28), 4), { c: DEMT, size: S.ss });
      D.line(0, s.c, p.a, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) lineLabel(D, S, demEq(p.a, p.b), p, [0.9, 0.82, 0.95]);
      [[p.P0, s.Q0, 'before'], [p.P1, s.Q1, 'after']].forEach(function (q) {
        D.line(0, q[0], q[1], q[0], { c: C.soft, w: 2.5, dash: '6 6', pr: b, layer: 'over' });
        if (!f.exploring) D.dot(q[1], q[0], { c: C.ink, r: 8, pr: b });
        if (b > 0.5) D.label(q[2] + ' ' + money(q[0]), [{ x: S.x(q[1]) + 18, y: S.y(q[0]) + 6, anchor: 'start' }, { x: S.x(q[1]) + 16, y: S.y(q[0]) - 14, anchor: 'start' }, { x: S.x(q[1]) + 16, y: S.y(q[0]) + 28, anchor: 'start' }], { c: C.ink, prio: 0 });
      });
      var poly = [[0, s.Plo], [g.xb, s.Plo], [g.xt, s.Phi], [0, s.Phi]];
      if (f.predicting) {
        D.area(poly, { fill: PLUM, fo: 0.24, stroke: PLUM, sw: 2.5, layer: 'over' });
        return;
      }
      if (rc > 0) {
        D.area(box(0, s.Plo, lerp(0, s.Qlo, rc), s.Phi), { fill: C.green, fo: 0.4 });
        if (rc > 0.8) inRect(D, S, 'rectangle ' + money(s.rect), 0, s.Plo, s.Qlo, s.Phi, { c: C.tGreen, op: seg(rc, 0.8, 1), size: S.ss });
      }
      if (tr > 0) {
        D.area([[s.Qlo, s.Plo], [s.Qhi, s.Plo], [s.Qlo, s.Phi]], { fill: C.gold, fo: 0.45, op: tr });
        D.label('triangle ' + money(s.tri), [{ x: S.x(s.Qhi) + 14, y: S.y(s.Plo) - 6, anchor: 'start' }, { x: S.x(s.Qhi) + 14, y: S.y(s.Plo) + 24, anchor: 'start' }].concat(D.around(s.Qhi, s.Plo, 30)), { c: C.tGold, op: tr, size: S.ss, prio: 0 });
      }
      if (f.ghostOn()) {
        D.path(poly.concat([poly[0]]), { c: PLUM, w: 3.5, dash: '5 6', op: f.gOp(), layer: 'over', reg: false });
        youTag(f, D, (g.xb + g.xt) / 2, (s.Plo + s.Phi) / 2);
      }
      if (sm > 0) D.label((s.rise ? 'CS lost = ' : 'CS gained = ') + money(s.area), [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.ink, op: sm, prio: 0, size: S.fs });
    },
    reveal: function () { return [['ghost', 0, 400], ['rect', 300, 1000], ['tri', 1300, 700], ['sum', 1900, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, d = s.Phi - s.Plo, mine = d * (g.xb + g.xt) / 2;
      var why = s.rise
        ? 'Buyers who still buy (' + num(s.Qlo, 2) + ' units) now pay ' + money(d) + ' more each: the rectangle, ' + num(s.Qlo, 2) + ' &times; ' + num(d, 2) + ' = ' + money(s.rect) + '. Buyers priced out (' + num(s.Qhi - s.Qlo, 2) +
          ' units) lose the surplus they had: the triangle, &frac12; &times; ' + num(s.Qhi - s.Qlo, 2) + ' &times; ' + num(d, 2) + ' = ' + money(s.tri) + '. CS falls from ' + money(s.CS0) + ' to ' + money(s.CS1) + ', by <b>' + money(s.area) + '</b>.'
        : 'Buyers who were already buying (' + num(s.Qlo, 2) + ' units) pay ' + money(d) + ' less each: the rectangle, ' + num(s.Qlo, 2) + ' &times; ' + num(d, 2) + ' = ' + money(s.rect) + '. New buyers drawn in (' + num(s.Qhi - s.Qlo, 2) +
          ' units) gain the triangle, &frac12; &times; ' + num(s.Qhi - s.Qlo, 2) + ' &times; ' + num(d, 2) + ' = ' + money(s.tri) + '. CS rises from ' + money(s.CS0) + ' to ' + money(s.CS1) + ', by <b>' + money(s.area) + '</b>.';
      return { rows: [['Area you shaded', money(mine), money(s.area)], ['Rectangle', '', money(s.rect)], ['Triangle', '', money(s.tri)]], why: why };
    },
    explore: {
      hint: 'Drag either price along the curve. The green rectangle plus the gold triangle is always the change in consumer surplus.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, d = s.CS1 - s.CS0;
        return 'CS at ' + money(p.P0) + ': <b>' + money(s.CS0) + '</b>; at ' + money(p.P1) + ': <b>' + money(s.CS1) + '</b>. Change <b class="' + (d >= 0 ? 'c-green' : 'c-red') + '">' + (d >= 0 ? '+' : '') + money(d) + '</b> = rectangle ' + money(s.rect) + ' + triangle ' + money(s.tri) + '.';
      }
    }
  };

  /* =====================================================================
     4.7  Surge pricing
     ===================================================================== */
  var f47 = {
    key: 'f47', num: '4.7', topic: 'Surge pricing', short: 'Surge pricing', model: M.surge, axes: { xtitle: 'Rides', ytitle: 'Fare ($ per ride)' },
    question: function (f) { return 'At what surge fare does revenue peak, and where does it fall back to ' + money(f.sol.TRn) + '?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Rider demand is <b>' + demEq(p.a, p.b) + '</b> rides. At the normal fare of ' + money(p.Pn) + ' riders take ' + num(s.Qn, 2) + ' rides and the app earns <b>' + money(s.TRn) + '</b>, the green rectangle. Surge pricing raises the fare.';
    },
    steps: [
      { kind: 'drag', label: 'Revenue peaks here', prompt: 'Slide the plum point up the demand curve to the fare where the app earns the most.', check: function (f) { return f.g.mm; } },
      { kind: 'drag', label: function (f) { return 'Back to ' + money(f.sol.TRn); }, prompt: function (f) { return 'Now slide the second plum point to the highest fare at which revenue is still ' + money(f.sol.TRn) + '.'; }, check: function (f) { return f.g.mb; } }
    ],
    kbdHint: KBD_LINE + ' Space switches points.',
    initGuess: function (f) { return { m: f.p.Pn, mm: false, bk: null, mb: false }; },
    handles: function (f) {
      var g = f.g, c = f.sol.c;
      if (f.predicting) {
        var hs = [onLine(f, g.m, function (f, P) { f.g.m = P; f.g.mm = true; }, { c: PLUM, step: 0, active: f.cur === 0, lo: 0.02 * c })];
        if (f.cur >= 1 || f.done[1]) hs.push(onLine(f, g.bk == null ? f.p.Pn : g.bk, function (f, P) { f.g.bk = P; f.g.mb = true; }, { c: PLUM, step: 1, active: f.cur === 1 }));
        return hs;
      }
      if (f.exploring) return [onLine(f, f.ex.P, function (f, P) { f.ex.P = P; }, { active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, sw = f.t('sweep'), pk = f.t('peak'), bk = f.t('back');
      var cur = f.exploring ? f.ex.P : f.revealing && sw > 0 ? Math.round(lerp(p.Pn, s.Pb, sw) * 2) / 2 : null;
      if (cur == null) {
        D.area(box(0, 0, s.Qn, p.Pn), { fill: C.green, fo: 0.22, op: b });
        if (b > 0.9) inRect(D, S, 'TR = ' + money(s.TRn), 0, 0, s.Qn, p.Pn, { c: C.tGreen });
      } else {
        var Qc = Qd(p, cur);
        D.area([[0, s.c], [Qc, cur], [0, cur]], { fill: C.blue, fo: 0.16 });
        D.area(box(0, 0, Qc, cur), { fill: C.green, fo: 0.3 });
        D.L.pline(S.x(0), S.y(p.Pn), S.x(s.Qn), S.y(p.Pn)); D.L.pline(S.x(s.Qn), S.y(p.Pn), S.x(s.Qn), S.y(0));
        D.add('under', Kit.K.polygon(box(0, 0, s.Qn, p.Pn).map(function (q) { return [S.x(q[0]), S.y(q[1])]; }), { fill: 'none', fo: 0, stroke: C.tGreen, sw: 2.5 }).replace('/>', ' stroke-dasharray="6 5"/>'));
        if (!inRect(D, S, 'TR = ' + money(M.surge.TR(p, cur)), 0, 0, Qc, cur, { c: C.tGreen })) D.near(Qc, cur * 0.5, 'TR = ' + money(M.surge.TR(p, cur)), { c: C.tGreen, prio: 0 });
        inRect(D, S, 'CS ' + money(M.surge.CS(p, cur)), 0, cur, Qc * 0.5, lerp(cur, s.c, 0.5), { c: DEMT, size: S.ss });
        if (f.revealing && bk <= 0) D.dot(Qc, cur, { c: C.ink, r: 9 });
      }
      D.line(0, s.c, p.a, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) lineLabel(D, S, demEq(p.a, p.b), p, [0.88, 0.8, 0.94]);
      D.line(0, p.Pn, S.X * 0.98, p.Pn, { c: C.soft, w: 2, dash: '4 6', pr: b, layer: 'under' });
      if (b > 0.5) D.label('normal ' + money(p.Pn), [{ x: S.x1 - 6, y: S.y(p.Pn) - 8, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.Pn) + 24, anchor: 'end' }], { c: C.soft, size: S.ss });
      if (f.predicting) {
        if (g.mm) D.near(Qd(p, g.m), g.m, 'peak? ' + money(g.m), { c: PLUM, d: 22 });
        if (f.cur >= 1 || f.done[1]) { var gb = g.bk == null ? p.Pn : g.bk; if (g.mb) D.near(Qd(p, gb), gb, 'back? ' + money(gb), { c: PLUM, d: 22 }); }
        return;
      }
      if (f.ghostOn()) {
        D.ghost(Qd(p, g.m), g.m, { op: f.gOp() }); youTag(f, D, Qd(p, g.m), g.m);
        if (g.bk != null) D.ghost(Qd(p, g.bk), g.bk, { op: f.gOp() });
      }
      if (pk > 0) { D.dot(s.Qm, s.Pm, { c: C.ink, r: 10, pr: pk }); D.near(s.Qm, s.Pm, 'peak: TR ' + money(s.TRm) + ' at ' + money(s.Pm), { c: C.ink, op: pk, d: 22, prio: 0 }); }
      if (bk > 0) { D.dot(s.Qb, s.Pb, { c: C.ink, r: 10, pr: bk }); D.near(s.Qb, s.Pb, 'TR ' + money(s.TRb) + ' again at ' + money(s.Pb), { c: C.ink, op: bk, d: 22, prio: 0 }); }
    },
    reveal: function (f) {
      var s = f.sol, p = f.p, total = 2600, tPk = 350 + total * (s.Pm - p.Pn) / (s.Pb - p.Pn);
      return [['ghost', 0, 400], ['sweep', 350, total, 'linear'], ['peak', tPk - 150, 500], ['back', 350 + total - 100, 600]];
    },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Revenue peaks at', money(g.m), money(s.Pm)], ['Back to ' + money(s.TRn) + ' at', g.bk == null ? '' : money(g.bk), money(s.Pb)], ['Riders\' surplus', '', money(s.CSn) + ' to ' + money(s.CSb)]],
        why: 'Revenue P &times; Q peaks where |e<sub>d</sub>| = 1, the midpoint of the demand line: P = ' + num(s.c, 2) + '/2 = <b>' + money(s.Pm) + '</b>, ' + num(s.Qm, 2) + ' rides, TR = ' + money(s.TRm) +
          '. TR = P(' + num(p.a) + ' - ' + bnum(p.b) + 'P) is symmetric around that peak, so it is back to ' + money(s.TRn) + ' at ' + num(s.c, 2) + ' - ' + num(p.Pn, 2) + ' = <b>' + money(s.Pb) + '</b>. ' +
          'The app earns the same there as at ' + money(p.Pn) + ', but ' + num(s.Qn - s.Qb, 2) + ' rides are priced out and riders\' surplus falls from ' + money(s.CSn) + ' to ' + money(s.CSb) + '.'
      };
    },
    explore: {
      init: function (f) { f.ex.P = f.sol.Pm; },
      hint: 'Drag the fare along the curve. Green is the app\'s revenue, blue the riders\' surplus; the dashed box is revenue at the normal fare.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, P = f.ex.P, q = Qd(p, P), T = M.surge.TR(p, P), d = T - s.TRn;
        return 'Fare ' + money(P) + ' (' + num(P / p.Pn, 2) + ' &times; normal): ' + num(q, 1) + ' rides, ' + num(Math.max(0, s.Qn - q), 1) + ' priced out. Revenue <b>' + money(T) + '</b> (' + (Math.abs(d) < 0.005 ? 'same as normal' : (d > 0 ? '+' : '') + money(d) + ' vs normal') +
          '), riders\' surplus <b>' + money(M.surge.CS(p, P)) + '</b>.';
      }
    }
  };

  /* =====================================================================
     4.8  Market demand: the horizontal sum (has a film)
     ===================================================================== */
  var C1 = C.orange, C1T = C.tOrange, C2 = C.purple, C2T = C.tPurple, MK = C.blue, MKT = C.tBlue;
  function mktPts(p, s, Pw) {   // the market curve from the top down to price Pw
    var pts = [[0, s.top]];
    if (Pw < s.Pk) pts.push([s.Qk, s.Pk]);
    pts.push([M.market.Qm(p, Pw), Pw]);
    return pts;
  }
  function sumBars(D, S, p, P, op) {
    var q1 = M.market.q1(p, P), q2 = M.market.q2(p, P);
    if (q1 > 0) D.line(0, P, q1, P, { c: C1, w: 8, op: op, layer: 'over', cap: 'butt' });
    if (q2 > 0) D.line(q1, P, q1 + q2, P, { c: C2, w: 8, op: op, layer: 'over', cap: 'butt' });
    if (q1 > 0) D.dot(q1, P, { c: C1, r: 6, op: op });
    if (q2 > 0) D.dot(q2, P, { c: C2, r: 6, op: op });
    if (q1 + q2 > 0) D.dot(q1 + q2, P, { c: MK, r: 9, op: op });
  }
  function upEq(s) { return 'Q_m = ' + num(s.ah, 2) + ' - ' + bnum(s.bh) + 'P'; }
  function loEq(s) { return 'Q_m = ' + num(s.Qsum, 2) + ' - ' + bnum(s.bsum) + 'P'; }
  function axisHandle(f, S, P, setP, o) {
    return { x: 0, y: P, c: o.c, grip: 'v', snap: { x: 0, y: 0.5 }, step: o.step, active: o.active, kstep: { x: 0, y: 0.5 },
      hit: function (pt) { return Math.abs(pt.x - S.x0) < 30 ? Math.abs(pt.y - S.y(P)) : 1e9; }, set: function (f, X, Y) { setP(f, Y); } };
  }
  var f48 = {
    key: 'f48', num: '4.8', topic: 'Market demand', short: 'Market demand', model: M.market, axes: AX,
    film: { name: 'fig48-market-demand', label: 'Animation: market demand, horizontal summation', title: 'Watch first, 40 seconds',
      caption: 'A price line sweeps down. At each price the two buyers\' quantities are laid end to end, and the market curve kinks at $12, where Consumer 2 starts to buy. Then build one yourself.' },
    question: 'Build the market demand curve: where does it start, where does it kink, and where does it end?',
    setup: function (f) {
      var p = f.p;
      return 'Two buyers. Consumer 1: <b class="c-orange">' + demEq(p.a1, p.b1, 'Q<sub>1</sub>') + '</b>. Consumer 2: <b class="c-purple">' + demEq(p.a2, p.b2, 'Q<sub>2</sub>') + '</b>. Market demand Q<sub>m</sub> is how much they buy in total at each price.';
    },
    steps: [{ kind: 'drag', label: 'The market demand curve',
      prompt: function (f) { var n = (f.g.m1 ? 1 : 0) + (f.g.m2 ? 1 : 0) + (f.g.m3 ? 1 : 0); return n ? 'Keep going: ' + (3 - n) + ' plum handle' + (n === 2 ? '' : 's') + ' left.' : 'Drag the three plum handles: the top end on the price axis, the kink, and the bottom end on the quantity axis.'; },
      check: function (f) { return f.g.m1 && f.g.m2 && f.g.m3; } }],
    kbdHint: 'Keyboard: arrow keys move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function (f) { var st = M.market.start(f.dom); return { top: st.top, kx: st.kx, ky: st.ky, bot: st.bot, m1: false, m2: false, m3: false }; },
    handles: function (f, S) {
      var g = f.g;
      if (f.predicting) return [
        axisHandle(f, S, g.top, function (f, Y) { f.g.top = Y; f.g.m1 = true; }, { c: PLUM, step: 0, active: !g.m1 }),
        { x: g.kx, y: g.ky, c: PLUM, snap: 0.5, step: 0, active: !g.m2, set: function (f, X, Y) { f.g.kx = X; f.g.ky = Y; f.g.m2 = true; } },
        { x: g.bot, y: 0, c: PLUM, grip: 'h', snap: { x: 0.5, y: 0 }, step: 0, active: !g.m3, kstep: { x: 0.5, y: 0 },
          hit: function (pt) { return Math.abs(pt.y - S.y0) < 30 ? Math.abs(pt.x - S.x(g.bot)) : 1e9; }, set: function (f, X) { f.g.bot = X; f.g.m3 = true; } }
      ];
      if (f.exploring) return [axisHandle(f, S, f.ex.P, function (f, Y) { f.ex.P = clamp(Y, 0, f.dom.Y); }, { c: C.ink, active: true })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.line(0, s.c1, p.a1, 0, { c: C1, w: 4, pr: b });
      D.line(0, s.c2, p.a2, 0, { c: C2, w: 4, pr: b });
      if (b > 0.9) {
        var lab1 = S.narrow ? 'Consumer 1' : 'Consumer 1: ' + demEq(p.a1, p.b1, 'Q_1'), lab2 = S.narrow ? 'Consumer 2' : 'Consumer 2: ' + demEq(p.a2, p.b2, 'Q_2');
        D.label(lab1, D.along(function (q) { return (p.a1 - q) / p.b1; }, [0.5, 0.35, 0.65, 0.2, 0.8].map(function (t) { return t * p.a1; }), 10), { c: C1T, size: S.ls });
        D.label(lab2, D.along(function (q) { return (p.a2 - q) / p.b2; }, [0.5, 0.35, 0.65, 0.2, 0.8].map(function (t) { return t * p.a2; }), 10), { c: C2T, size: S.ls });
      }
      var gp = [[0, g.top], [g.kx, g.ky], [g.bot, 0]];
      if (f.predicting) {
        D.path(gp, { c: PLUM, w: 4.5, layer: 'over' });
        return;
      }
      var sw = f.t('sweep'), kk = f.t('kink'), eq = f.t('eqs');
      if (f.ghostOn()) {
        D.path(gp, { c: PLUM, w: 3, dash: '4 7', op: 0.65 * f.gOp(), layer: 'over', reg: false });
        gp.forEach(function (q) { D.ghost(q[0], q[1], { op: f.gOp(), r: 8 }); });
        youTag(f, D, g.kx, g.ky);
      }
      var Pw = f.exploring ? 0 : lerp(s.top, 0, sw);
      if (sw > 0 || f.exploring) D.path(mktPts(p, s, Pw), { c: MK, w: 6 });
      if (f.revealing && sw > 0 && sw < 1) sumBars(D, S, p, Pw, 1);
      if (kk > 0) {
        D.dot(s.Qk, s.Pk, { c: C.ink, r: 10, pr: kk });
        D.near(s.Qk, s.Pk, S.narrow ? 'kink at ' + money(s.Pk) : 'kink at ' + money(s.Pk) + ': Consumer ' + (s.hi === 1 ? 2 : 1) + ' starts buying', { c: C.ink, op: kk, d: 22, prio: 0, size: S.ss, ring: 110 });
      }
      if (eq > 0) {
        D.label(upEq(s), D.along(function (q) { return (s.ah - q) / s.bh; }, [0.5, 0.3, 0.7].map(function (t) { return t * s.Qk; }), 14), { c: MKT, op: eq, size: S.ls, ring: 90 });
        D.label(loEq(s), D.along(function (q) { return (s.Qsum - q) / s.bsum; }, [0.6, 0.75, 0.45].map(function (t) { return lerp(s.Qk, s.Qsum, t); }), 14), { c: MKT, op: eq, size: S.ls, ring: 90 });
      }
      if (f.exploring) {
        var P = f.ex.P, q1 = M.market.q1(p, P), q2 = M.market.q2(p, P);
        D.line(0, P, S.X, P, { c: C.soft, w: 2, dash: '4 6', layer: 'under' });
        sumBars(D, S, p, P, 1);
        var sumTxt = num(q1, 1) + ' + ' + num(q2, 1) + ' = ' + num(q1 + q2, 1);
        if (q1 + q2 > 0 && S.narrow) D.label('at ' + money(P) + ': ' + sumTxt, [{ x: S.x1 - 4, y: S.y1 + 8, anchor: 'end' }], { c: MKT, fixed: true, prio: 0 });
        else if (q1 + q2 > 0) D.near(q1 + q2, P, sumTxt, { c: MKT, d: 22, prio: 0, ring: 90 });
        else D.label('nobody buys at ' + money(P), [{ x: S.x0 + 40, y: S.y(P) - 10, anchor: 'start' }], { c: C.soft, prio: 0 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['sweep', 350, 2600, 'linear'], ['kink', 3000, 500], ['eqs', 3350, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, lo = s.hi === 1 ? 2 : 1;
      return {
        rows: [['Top (choke) price', money(g.top), money(s.top)], ['Kink', 'Q ' + num(g.kx, 1) + ' at ' + money(g.ky), 'Q ' + num(s.Qk, 2) + ' at ' + money(s.Pk)], ['Quantity at P = 0', num(g.bot, 1), num(s.Qsum, 2)]],
        why: 'Market demand adds quantities sideways at each price, not prices. Above ' + money(s.top) + ' nobody buys. Between ' + money(s.Pk) + ' and ' + money(s.top) + ' only Consumer ' + s.hi + ' buys, so the market curve is that curve, ' +
          Kit.rich(upEq(s)) + '. At ' + money(s.Pk) + ' Consumer ' + lo + ' reaches the choke price and starts buying, so the curve kinks at Q = ' + num(s.Qk, 2) + ' and gets flatter: ' + Kit.rich(loEq(s)) + ', reaching <b>' + num(s.Qsum, 2) + '</b> at a price of zero.'
      };
    },
    explore: {
      init: function (f) { f.ex.P = Math.round(f.sol.Pk * 0.5 * 2) / 2; },
      hint: 'Drag the price up and down the vertical axis. At each price Consumer 1\'s and Consumer 2\'s quantities are laid end to end.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, P = f.ex.P, q1 = M.market.q1(p, P), q2 = M.market.q2(p, P);
        var reg = P >= s.top ? 'Nobody buys.' : P >= s.Pk ? 'Only Consumer ' + s.hi + ' buys.' : 'Both buy.';
        return 'At ' + money(P) + ': Q<sub>1</sub> = ' + num(q1, 1) + ' + Q<sub>2</sub> = ' + num(q2, 1) + ' = <b>Q<sub>m</sub> = ' + num(q1 + q2, 1) + '</b>. ' + reg;
      }
    }
  };

  window.W4FIGS = [f41, f42, f43, f44, f46, f47, f48];
})();
