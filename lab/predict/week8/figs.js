/* Week 8 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week8-viz.html and the fig84 film: demand blue, supply green, MC orange (green and
 * dashed in 8.10 / 8.11, where orange is the AC curve, as on the live page), MR purple dashed;
 * consumer surplus blue, profit / transfer / producer surplus gold, deadweight loss red, tariff
 * revenue slate. In 8.9 the business market is blue and the leisure market green.
 * Plum always means "you". */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg;
  var M = window.W8, PLUM = C.plum;
  var DEM = C.blue, DEMT = C.tBlue, SUP = C.green, MC = C.orange, MCT = C.tOrange, MR = C.purple, MRT = C.tPurple;
  var SLATE = '#2c3e50';
  var AX = { xtitle: 'Quantity', ytitle: 'Price ($)' };

  function r6(v) { return +v.toFixed(6); }
  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  function bnum(b) { return b === 1 ? '' : num(b, 2); }
  function pEq(a, b) { return 'P = ' + num(a, 2) + ' - ' + (b === 0.5 ? 'Q/2' : bnum(b) + 'Q'); }
  // a downward demand line P = a - bQ
  function dm(a, b) { return { a: a, b: b == null ? 1 : b }; }
  function qOf(d, P) { return (d.a - P) / d.b; }
  function demPts(d) { return [[0, d.a], [d.a / d.b, 0]]; }
  // price of the point on line d nearest the pointer (measured in pixels), on a grid of st
  function projP(S, d, X, Y, lo, hi, st) {
    var n = G.nearest(X, Y, demPts(d), (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return clamp(r6(Math.round(n.y / st) * st), lo, hi);
  }
  // a handle that slides along demand line d; setP(f, P) stores the price
  function onDem(f, d, P, setP, o) {
    o = o || {};
    var lo = o.lo == null ? 0.02 * d.a : o.lo, hi = o.hi == null ? 0.98 * d.a : o.hi, st = o.st || 0.1, ks = o.ks || Math.max(st, Math.round(d.a / 100 * 10) / 10);
    return { x: qOf(d, P), y: P, c: o.c || C.ink, step: o.step, active: o.active,
      set: function (f, X, Y) { setP(f, projP(f.S, d, X, Y, lo, hi, st)); },
      key: function (f, dx, dy) { setP(f, clamp(r6(Math.round((P + (dy - dx) * ks) / st) * st), lo, hi)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  function lineLabel(D, S, s, d, fracs, o) {
    var fn = function (q) { return d.a - d.b * q; }, X = d.a / d.b;
    return D.label(s, D.along(fn, fracs.map(function (t) { return t * X; }), 12, o && o.pref), Object.assign({ c: DEMT, size: S.fs }, o || {}));
  }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // label centred in a data region if it fits, else nearby
  function inArea(D, S, s, cx, cy, o) {
    o = o || {}; var size = o.size || S.ls, px = S.x(cx), py = S.y(cy) + size * 0.35;
    var c = [{ x: px, y: py, anchor: 'middle' }, { x: px, y: py - size - 4, anchor: 'middle' }, { x: px, y: py + size + 4, anchor: 'middle' }];
    D.label(s, c.concat(o.more || []), Object.assign({ prio: 0, ring: o.ring || 60 }, o));
  }
  // a horizontal cost line (MC) across the frame
  function hline(D, S, y, o) { D.line(0, y, S.X, y, o); }
  // the welfare triplet at a single price Pm on demand d with constant MC c (used by 8.4, 8.5, 8.7)
  function welfareAreas(D, d, c, Pm, op, which) {
    var Qm = qOf(d, Pm), Qc = qOf(d, c);
    if (!which || which.cs) D.area([[0, d.a], [Qm, Pm], [0, Pm]], { fill: C.blue, fo: 0.2, op: op });
    if (!which || which.pi) D.area(box(0, c, Qm, Pm), { fill: C.gold, fo: 0.32, op: op });
    if (!which || which.dwl) D.area([[Qm, Pm], [Qc, c], [Qm, c]], { fill: C.red, fo: 0.3, op: op });
  }
  function corner(D, S, s, o) {
    return D.label(s, [{ x: S.x1 - 6, y: S.y1 + 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 70, anchor: 'end' }], Object.assign({ c: C.ink, prio: 0 }, o || {}));
  }
  var KBD_LINE = 'Keyboard: arrow keys slide the point along the curve (Shift for bigger steps), Enter confirms.';

  /* =====================================================================
     8.1  CS / PS triangle anatomy: a price held away from P*
     ===================================================================== */
  var f81 = {
    key: 'f81', num: '8.1', topic: 'CS/PS triangle anatomy', short: 'CS, PS and DWL', model: M.welfare, axes: AX,
    question: function (f) { return 'The price is held at ' + money(f.p.P) + '. How many units actually change hands?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>P = ' + p.a + ' - Q</b> and supply is <b>P = ' + p.b + ' + Q</b>. They cross at P* = ' + money(s.Ps) + ', Q* = ' + num(s.Qe, 2) +
        ', where total surplus is ' + money(s.TSmax) + '. A rule now holds the price at <b>' + money(p.P) + '</b>, ' + (s.above ? 'above' : 'below') + ' P* (a price ' + (s.above ? 'floor' : 'ceiling') + ').';
    },
    steps: [{ kind: 'drag', label: 'Units that trade', prompt: function (f) { return 'Drag the plum handle along the ' + money(f.p.P) + ' price line to the number of units that are actually bought and sold.'; },
      check: function (f) { return Math.abs(f.g.Q - 0.5) > 0.2 ? true : 'Drag it along the price line first.'; } }],
    kbdHint: 'Keyboard: left and right arrows move the handle along the price line, Enter confirms.',
    initGuess: function () { return { Q: 0.5 }; },
    handles: function (f) {
      var p = f.p;
      if (f.predicting) return [{ x: f.g.Q, y: p.P, c: PLUM, grip: 'h', step: 0, active: !f.done[0], snap: { x: 0.5, y: 0 }, kstep: { x: 0.5, y: 0 },
        set: function (f, X) { f.g.Q = clamp(X, 0, f.dom.X); } }];
      if (!f.exploring) return [];
      return [{ x: f.sol.Qt, y: p.P, c: C.ink, grip: 'v', active: !f.ex.touched, snap: { x: 0, y: 0.5 }, kstep: { x: 0, y: 0.5 },
        set: function (f, X, Y) { f.p.P = clamp(Y, f.p.b + 0.5, f.p.a - 0.5); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1);
      var ar = f.t('areas');
      if (ar > 0) {
        D.area([[0, p.a], [s.Qt, s.Pd], [s.Qt, p.P], [0, p.P]], { fill: C.blue, fo: 0.2, op: ar });
        D.area([[0, p.b], [s.Qt, s.Psup], [s.Qt, p.P], [0, p.P]], { fill: C.gold, fo: 0.32, op: ar });
        if (s.DWL > 0.01) D.area([[s.Qt, s.Pd], [s.Qe, s.Ps], [s.Qt, s.Psup]], { fill: C.red, fo: 0.32, op: ar });
      }
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      D.line(0, p.b, S.X, p.b + S.X, { c: SUP, w: 5, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D: P = ' + p.a + ' - Q', d, [0.62, 0.7, 0.55, 0.78], { pref: 'aboveOnly' });
        D.label('S: P = ' + p.b + ' + Q', D.along(function (q) { return p.b + q; }, [0.7 * S.X, 0.6 * S.X, 0.8 * S.X, 0.5 * S.X].filter(function (q) { return p.b + q < S.Y * 0.95; }), 12), { c: C.tGreen, size: S.fs });
      }
      D.dot(s.Qe, s.Ps, { c: C.ink, r: 7, pr: b, op: 0.75 });
      if (b > 0.5 && !f.exploring) D.near(s.Qe, s.Ps, 'P* ' + money(s.Ps), { c: C.soft, size: S.ss, d: 16, ring: 80 });
      // the price line, across the whole frame so it gives nothing away
      D.line(0, p.P, S.X, p.P, { c: C.ink, w: 2.5, dash: '8 7', pr: b, layer: 'over' });
      if (b > 0.5) D.label((s.above ? 'floor ' : 'ceiling ') + money(p.P), [{ x: S.x1 - 6, y: S.y(p.P) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.P) + 26, anchor: 'end' }], { c: C.ink, prio: 0, size: S.ls });
      if (f.predicting) {
        D.line(g.Q, 0, g.Q, p.P, { c: PLUM, w: 3.5, dash: '6 6', layer: 'over', reg: false });
        if (f.done[0] || g.Q > 0.6) D.xval(g.Q, 'Q = ' + num(g.Q, 1), { c: PLUM });
        return;
      }
      var sd = f.t('sides'), tr = f.t('trade');
      if (f.ghostOn()) { D.line(g.Q, 0, g.Q, p.P, { c: PLUM, w: 3, dash: '4 7', op: f.gOp(), layer: 'over', reg: false }); D.ghost(g.Q, p.P, { op: f.gOp() }); youTag(f, D, g.Q, p.P); }
      if (sd > 0) {
        D.dot(s.Qd, p.P, { c: DEM, r: 9, pr: sd }); D.dot(s.Qs, p.P, { c: SUP, r: 9, pr: seg(sd, 0.3, 1) });
        // the short side sits left of the long side: label it to the left, the long side to the right
        var side = function (x, left) { var px = S.x(x), py = S.y(p.P), dx = left ? -16 : 16, an = left ? 'end' : 'start'; return [{ x: px + dx, y: py + 28, anchor: an }, { x: px + dx, y: py - 12, anchor: an }, { x: px + dx, y: py + 52, anchor: an }]; };
        D.label((S.narrow ? 'want ' : 'buyers want ') + num(s.Qd, 2), side(s.Qd, s.Qd <= s.Qs), { c: DEMT, op: sd, prio: 0, ring: 60, size: S.ss });
        D.label((S.narrow ? 'offer ' : 'sellers offer ') + num(s.Qs, 2), side(s.Qs, s.Qs < s.Qd), { c: C.tGreen, op: seg(sd, 0.3, 1), prio: 0, ring: 60, size: S.ss });
      }
      if (tr > 0) {
        D.line(s.Qt, 0, s.Qt, lerp(0, p.P, tr), { c: C.ink, w: 3, layer: 'over' });
        D.xval(s.Qt, (S.narrow ? '' : 'traded ') + num(s.Qt, 2), { c: C.ink, op: tr });
      }
      if (ar > 0.3) {
        var o = seg(ar, 0.3, 1);
        inArea(D, S, 'CS ' + money(s.CS), s.Qt * 0.3, lerp(p.P, s.Pd, 0.5) + (p.a - s.Pd) * 0.3, { c: DEMT, op: o, size: S.ss, more: D.around(s.Qt * 0.25, (p.a + p.P) / 2, 30) });
        inArea(D, S, 'PS ' + money(s.PS), s.Qt * 0.3, lerp(p.P, p.b, 0.3), { c: C.tGold, op: o, size: S.ss });
        if (s.DWL > 0.01) D.label('DWL ' + money(s.DWL), D.around((s.Qt * 2 + s.Qe) / 3, s.Ps, 30).concat(D.around(s.Qe, s.Ps, 40)), { c: C.tRed, op: o, size: S.ss, prio: 0, ring: 90 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['sides', 300, 900], ['trade', 1200, 700], ['areas', 1800, 900]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, short = s.above ? 'buyers' : 'sellers', other = s.above ? 'sellers' : 'buyers';
      return {
        rows: [['Units traded', num(g.Q, 1), num(s.Qt, 2)], ['Consumer surplus', '', money(s.CS)], ['Producer surplus', '', money(s.PS)], ['Deadweight loss', '', money(s.DWL)]],
        why: 'At ' + money(p.P) + ' buyers want ' + num(s.Qd, 2) + ' units and sellers offer ' + num(s.Qs, 2) + '. A trade needs both, so only the smaller amount, <b>' + num(s.Qt, 2) + '</b>, changes hands: the ' + short + ' are the short side and the extra ' + other + ' go unmatched. ' +
          'Units ' + num(s.Qt, 2) + ' to ' + num(s.Qe, 2) + ' are worth more to buyers than they cost sellers, yet never trade: DWL = &frac12; &times; ' + num(s.Qe - s.Qt, 2) + ' &times; ' + money(s.Pd - s.Psup) + ' = <b>' + money(s.DWL) + '</b>. Total surplus falls from ' + money(s.TSmax) + ' to ' + money(s.TS) + '.'
      };
    },
    explore: {
      hint: 'Drag the black point up and down to move the price. Only at P* do the blue and gold areas fill the whole triangle and the red DWL vanish.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'Price', get: function (f) { return f.p.P; }, set: function (f, v, fin) { f.p.P = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: f.p.b + 0.5, max: f.p.a - 0.5, fmt: money, dur: 300 }];
      },
      readout: function (f) {
        var s = f.sol;
        return 'At ' + money(f.p.P) + ': ' + num(s.Qt, 2) + ' units trade. CS <b class="c-blue">' + money(s.CS) + '</b> + PS <b class="c-gold">' + money(s.PS) + '</b> = TS ' + money(s.TS) +
          (s.DWL > 0.005 ? '; DWL <b class="c-red">' + money(s.DWL) + '</b>.' : '. DWL is zero: this is the competitive equilibrium.');
      }
    }
  };

  /* =====================================================================
     8.2  Transfer vs destruction
     ===================================================================== */
  var f82 = {
    key: 'f82', num: '8.2', topic: 'Transfer vs. destruction: the DWL decomposition', short: 'Transfer vs DWL', model: M.transfer, axes: AX,
    question: function (f) { return 'Output is held at Q = ' + num(f.p.Q, 2) + '. Split what consumers lose: the transfer, and the value destroyed.'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>' + pEq(p.a, p.b) + '</b> and marginal cost is <b>' + money(p.c) + '</b>, so the efficient output is Q* = ' + num(s.Qs, 2) + ', where consumers enjoy ' + money(s.CSc) + ' of surplus. ' +
        'Now only ' + num(p.Q, 2) + ' units are made. Shade the gold <b>transfer</b> rectangle (to the seller) and the red <b>DWL</b> triangle (lost to everyone).';
    },
    steps: [
      { kind: 'drag', label: 'Top of the transfer rectangle', prompt: 'Drag the plum handle up to the price buyers now pay for the ' + 'restricted output.', check: function (f) { return f.g.mp; } },
      { kind: 'drag', label: 'Far corner of the DWL triangle', prompt: 'Now drag the triangle\'s corner along MC to where the lost trades end.', check: function (f) { return f.g.mx; } }
    ],
    kbdHint: 'Keyboard: arrows move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function (f) { return { P: f.p.c, X: f.p.Q, mp: false, mx: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g;
      if (f.predicting) {
        var hp = { x: p.Q / 2, y: g.P, c: PLUM, grip: 'v', step: 0, active: f.cur === 0, snap: { x: 0, y: 0.5 }, kstep: { x: 0, y: 0.5 },
          set: function (f, X, Y) { f.g.P = clamp(Y, f.p.c, f.dom.Y); f.g.mp = Math.abs(f.g.P - f.p.c) > 0.2 || f.g.mp; } };
        var hx = { x: g.X, y: p.c, c: PLUM, grip: 'h', step: 1, active: f.cur === 1, snap: { x: 0.5, y: 0 }, kstep: { x: 0.5, y: 0 },
          set: function (f, X) { f.g.X = clamp(X, f.p.Q, f.dom.X); f.g.mx = Math.abs(f.g.X - f.p.Q) > 0.2 || f.g.mx; } };
        return f.cur === 1 ? [hx, hp] : [hp, hx];
      }
      if (!f.exploring) return [];
      var d = dm(p.a, p.b), Qs = f.sol.Qs;
      return [onDem(f, d, f.sol.PQ, function (f, P) { f.p.Q = r6(Math.round(qOf(d, P) * 4) / 4); }, { lo: p.c + 0.05 * (p.a - p.c), hi: p.a - p.b * 0.25, st: 0.05, active: !f.ex.touched })];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, p.b);
      var rc = f.t('rect'), tr = f.t('tri'), cs = f.t('cs');
      if (cs > 0) D.area([[0, p.a], [p.Q, s.PQ], [0, s.PQ]], { fill: C.blue, fo: 0.2, op: cs });
      if (rc > 0) D.area(box(0, p.c, p.Q, lerp(p.c, s.PQ, rc)), { fill: C.gold, fo: 0.34 });
      if (tr > 0) D.area([[p.Q, s.PQ], [lerp(p.Q, s.Qs, tr), lerp(s.PQ, p.c, tr)], [p.Q, p.c]], { fill: C.red, fo: 0.32 });
      D.line(0, p.a, p.a / p.b, 0, { c: DEM, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D: ' + pEq(p.a, p.b), d, [0.9, 0.82, 0.95, 0.75]);
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (!f.exploring) {
        D.dot(s.Qs, p.c, { c: C.ink, r: 7, pr: b });
        if (b > 0.5) D.near(s.Qs, p.c, 'Q* = ' + num(s.Qs, 2), { c: C.soft, size: S.ss, d: 18, ring: 80 });
      }
      // the output restriction
      D.line(p.Q, 0, p.Q, S.Y * 0.98, { c: C.ink, w: 2.5, dash: '8 7', pr: b, layer: 'over', reg: !f.predicting });
      if (b > 0.5) D.label('Q = ' + num(p.Q, 2) + ' (held)', [{ x: S.x(p.Q) + 8, y: S.y1 + 18, anchor: 'start' }, { x: S.x(p.Q) - 8, y: S.y1 + 18, anchor: 'end' }], { c: C.ink, size: S.ss, prio: 0 });
      var poly = [[p.Q, g.P], [g.X, p.c], [p.Q, p.c]];
      if (f.predicting) {
        if (g.P > p.c + 1e-9) D.area(box(0, p.c, p.Q, g.P), { fill: PLUM, fo: 0.2, stroke: PLUM, sw: 2.5, layer: 'over' });
        if (g.P > p.c + 1e-9 && g.X > p.Q + 1e-9) D.area(poly, { fill: PLUM, fo: 0.1, stroke: PLUM, sw: 2.5, layer: 'over' });
        if (g.mp) D.near(p.Q / 2, g.P, money(g.P), { c: PLUM, d: 24, ring: 60 });
        return;
      }
      if (f.ghostOn()) {
        D.path(box(0, p.c, p.Q, g.P).concat([[0, p.c]]), { c: PLUM, w: 3, dash: '5 6', op: f.gOp(), layer: 'over', reg: false });
        D.path(poly.concat([poly[0]]), { c: PLUM, w: 3, dash: '5 6', op: f.gOp(), layer: 'over', reg: false });
        youTag(f, D, g.X, p.c);
      }
      if (rc > 0.7) {
        D.dot(p.Q, s.PQ, { c: C.ink, r: 8 });
        inArea(D, S, (S.narrow ? '' : 'transfer ') + money(s.transfer), p.Q / 2, (p.c + s.PQ) / 2, { c: C.tGold, op: seg(rc, 0.7, 1) });
        D.yval(s.PQ, money(s.PQ), { c: C.ink, op: seg(rc, 0.7, 1), dy: -9 });
      }
      if (tr > 0.7) D.label('DWL ' + money(s.dwl), D.around((2 * p.Q + s.Qs) / 3, (s.PQ + 2 * p.c) / 3, 4).concat(D.around(lerp(p.Q, s.Qs, 0.6), lerp(s.PQ, p.c, 0.6), 34)), { c: C.tRed, op: seg(tr, 0.7, 1), prio: 0, ring: 80 });
      if (cs > 0.5) inArea(D, S, 'CS ' + money(s.csRem), p.Q * 0.3, lerp(s.PQ, p.a, 0.3), { c: DEMT, op: seg(cs, 0.5, 1), size: S.ss });
    },
    reveal: function () { return [['ghost', 0, 400], ['rect', 300, 900], ['tri', 1200, 900], ['cs', 2000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, myR = p.Q * (g.P - p.c), myT = 0.5 * (g.X - p.Q) * (g.P - p.c);
      return {
        rows: [['Price buyers pay', money(g.P), money(s.PQ)], ['Transfer (rectangle)', money(myR), money(s.transfer)], ['Lost trades end at', num(g.X, 1), num(s.Qs, 2)], ['DWL (triangle)', money(myT), money(s.dwl)]],
        why: 'With only ' + num(p.Q, 2) + ' units, buyers bid the price up the demand curve to <b>' + money(s.PQ) + '</b>. On the units still sold they pay ' + money(s.PQ - p.c) + ' over cost: the transfer, ' + num(p.Q, 2) + ' &times; ' + money(s.PQ - p.c) + ' = ' + money(s.transfer) + ', which the seller gains. ' +
          'Units ' + num(p.Q, 2) + ' to ' + num(s.Qs, 2) + ' (where demand meets MC) are never made: DWL = &frac12; &times; ' + num(s.Qs - p.Q, 2) + ' &times; ' + money(s.PQ - p.c) + ' = <b>' + money(s.dwl) + '</b>, gone for everyone. Together they are the ' + money(s.lost) + ' consumers lose.'
      };
    },
    explore: {
      hint: function (f) { return 'Drag the black point along demand to change the restriction. Below Q = ' + num(f.sol.Qeq, 2) + ' (one third of Q*) the destroyed triangle outgrows the transfer.'; },
      controls: [],
      readout: function (f) {
        var s = f.sol;
        return 'At Q = ' + num(f.p.Q, 2) + ' the price is ' + money(s.PQ) + '. Transfer <b class="c-gold">' + money(s.transfer) + '</b>, DWL <b class="c-red">' + money(s.dwl) + '</b>, CS left <b class="c-blue">' + money(s.csRem) + '</b>' +
          (s.dwl > s.transfer + 1e-9 ? '. The triangle is now bigger than the rectangle.' : '.');
      }
    }
  };

  /* =====================================================================
     8.3  Trade and tariffs
     ===================================================================== */
  var f83 = {
    key: 'f83', num: '8.3', topic: 'Trade and tariffs: welfare effects', short: 'Trade and tariffs', model: M.tariff, axes: AX, aspect: 0.82, narrowAspect: 1.25,
    question: function (f) { return 'The country trades at a world price of ' + money(f.p.Pw) + '. Add a ' + money(f.p.t) + ' tariff: where do the domestic price, production and consumption go?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Domestic demand is <b>P = ' + p.a + ' - Q</b> and supply is <b>P = ' + p.b + ' + Q</b> (on its own the market would clear at ' + money(s.Ps) + '). At the world price of ' + money(p.Pw) + ' home firms make ' + num(s.Qs0, 2) +
        ', consumers buy ' + num(s.Qd0, 2) + ' and imports fill the gap of ' + num(s.imp0, 2) + '. The government now charges <b>' + money(p.t) + '</b> on every imported unit.';
    },
    steps: [
      { kind: 'drag', label: 'The domestic price', prompt: 'Drag the plum price line to the price buyers pay once the tariff is in place.', check: function (f) { return f.g.mp; } },
      { kind: 'drag', label: 'Production and consumption', prompt: function (f) { return f.g.ms || f.g.md ? 'Good. Now the other end.' : 'Drag the two ends of the plum import gap to domestic production (left) and consumption (right) at your price.'; },
        check: function (f) { return f.g.ms && f.g.md; } }
    ],
    kbdHint: 'Keyboard: arrows move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function (f) { var s = f.sol; return { P: f.p.Pw, qs: s.Qs0, qd: s.Qd0, mp: false, ms: false, md: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g, s = f.sol;
      if (f.predicting) {
        var xh = clamp(s.Qd0 + 0.12 * S.X, 0, S.X * 0.97);
        var hp = { x: xh, y: g.P, c: PLUM, grip: 'v', step: 0, active: f.cur === 0, snap: { x: 0, y: 0.5 }, kstep: { x: 0, y: 0.5 },
          set: function (f, X, Y) { f.g.P = clamp(Y, f.p.Pw, s.Ps + 2); f.g.mp = f.g.mp || Math.abs(f.g.P - f.p.Pw) > 0.2; } };
        var hs = [hp];
        if (f.cur >= 1) {
          var a = { x: g.qs, y: g.P, c: PLUM, grip: 'h', step: 1, active: f.cur === 1 && !g.ms, snap: { x: 0.5, y: 0 }, kstep: { x: 0.5, y: 0 },
            set: function (f, X) { f.g.qs = clamp(X, 0, f.g.qd - 0.5); f.g.ms = true; } };
          var z = { x: g.qd, y: g.P, c: PLUM, grip: 'h', step: 1, active: f.cur === 1 && !g.md, snap: { x: 0.5, y: 0 }, kstep: { x: 0.5, y: 0 },
            set: function (f, X) { f.g.qd = clamp(X, f.g.qs + 0.5, f.dom.X); f.g.md = true; } };
          hs = [a, z, hp];
        }
        return hs;
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1);
      var pr = f.t('price'), qt = f.t('qty'), ar = f.t('areas');
      var Pt = f.predicting ? p.Pw : lerp(p.Pw, s.Pt, pr);
      if (ar > 0 && s.ta > 0) {
        if (s.imp > 0) D.area(box(s.Qs, p.Pw, s.Qd, s.Pt), { fill: SLATE, fo: 0.24, op: ar });
        D.area([[s.Qs0, p.Pw], [s.Qs, s.Pt], [s.Qs, p.Pw]], { fill: C.red, fo: 0.34, op: ar });
        D.area([[s.Qd, s.Pt], [s.Qd0, p.Pw], [s.Qd, p.Pw]], { fill: C.red, fo: 0.34, op: ar });
      }
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      D.line(0, p.b, S.X, p.b + S.X, { c: SUP, w: 5, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D', d, [0.92, 0.85, 0.96]);
        D.label('S', D.along(function (q) { return p.b + q; }, [0.75 * S.X, 0.65 * S.X, 0.55 * S.X].filter(function (q) { return p.b + q < S.Y * 0.95; }), 12), { c: C.tGreen, size: S.fs });
      }
      // world price and the free-trade import gap
      D.line(0, p.Pw, S.X, p.Pw, { c: C.purple, w: 3, dash: '9 6', pr: b, layer: 'over' });
      if (b > 0.5) D.yval(p.Pw, 'P_W ' + money(p.Pw), { c: C.tPurple, dy: 22 });
      if (!f.exploring) {
        D.dot(s.Qs0, p.Pw, { c: C.purple, r: 7, pr: b }); D.dot(s.Qd0, p.Pw, { c: C.purple, r: 7, pr: b });
        if (b > 0.9 && (f.predicting || qt < 0.5)) D.label('imports ' + num(s.imp0, 2), [{ x: S.x((s.Qs0 + s.Qd0) / 2), y: S.y(p.Pw) + 24, anchor: 'middle' }], { c: C.tPurple, size: S.ss, prio: 0, ring: 40 });
      }
      if (f.predicting) {
        if (g.mp || f.cur >= 1) {
          D.line(0, g.P, S.X, g.P, { c: PLUM, w: 3, layer: 'over', reg: false });
          D.yval(g.P, money(g.P), { c: PLUM, dy: -9 });
        }
        if (f.cur >= 1) {
          D.line(g.qs, g.P, g.qd, g.P, { c: PLUM, w: 7, op: 0.45, layer: 'over', reg: false });
          D.line(g.qs, 0, g.qs, g.P, { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false });
          D.line(g.qd, 0, g.qd, g.P, { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false });
          D.label(num(g.qs, 1), [{ x: S.x(g.qs), y: S.y0 - 10, anchor: 'middle' }], { c: PLUM, fixed: true, prio: 0, size: S.ss });
          D.label(num(g.qd, 1), [{ x: S.x(g.qd), y: S.y0 - 10, anchor: 'middle' }], { c: PLUM, fixed: true, prio: 0, size: S.ss });
        }
        return;
      }
      if (f.ghostOn()) {
        D.line(0, g.P, S.X, g.P, { c: PLUM, w: 3, dash: '4 7', op: f.gOp(), layer: 'over', reg: false });
        D.ghost(g.qs, g.P, { op: f.gOp() }); D.ghost(g.qd, g.P, { op: f.gOp() }); youTag(f, D, g.qd, g.P);
      }
      if (pr > 0 && s.ta > 0) {
        D.line(0, Pt, S.X, Pt, { c: C.red, w: 3.5, layer: 'over' });
        D.yval(Pt, 'P_t ' + money(Pt), { c: C.tRed, dy: -9, op: pr });
      }
      if (qt > 0) {
        D.dot(s.Qs, s.Pt, { c: SUP, r: 9, pr: qt }); D.dot(s.Qd, s.Pt, { c: DEM, r: 9, pr: qt });
        D.drop(s.Qs, s.Pt, { y: false, pr: qt }); D.drop(s.Qd, s.Pt, { y: false, pr: qt });
        D.xval(s.Qs, num(s.Qs, 2), { c: C.tGreen, op: qt }); D.xval(s.Qd, num(s.Qd, 2), { c: DEMT, op: qt });
      }
      if (ar > 0.3 && s.ta > 0) {
        var o = seg(ar, 0.3, 1);
        if (s.imp > 0) inArea(D, S, 'revenue ' + money(s.rev), (s.Qs + s.Qd) / 2, (p.Pw + s.Pt) / 2, { c: SLATE, op: o, size: S.ss, more: [{ x: S.x((s.Qs + s.Qd) / 2), y: S.y(s.Pt) - 10, anchor: 'middle' }] });
        D.label('DWL ' + money(s.dwlP), [{ x: S.x((s.Qs0 + s.Qs) / 2), y: S.y(p.Pw) + 24, anchor: 'middle' }].concat(D.around(s.Qs0, p.Pw, 26).filter(function (c) { return c.y > S.y(p.Pw); })), { c: C.tRed, op: o, size: S.ss, prio: 0, ring: 90 });
        D.label('DWL ' + money(s.dwlC), [{ x: S.x((s.Qd + s.Qd0) / 2), y: S.y(p.Pw) + 24, anchor: 'middle' }].concat(D.around(s.Qd0, p.Pw, 26).filter(function (c) { return c.y > S.y(p.Pw); })), { c: C.tRed, op: o, size: S.ss, prio: 0, ring: 90 });
      }
      if (f.exploring && s.ta <= 0) corner(D, S, 'free trade: net gain ' + money(s.gain), { c: C.tPurple, size: S.ss });
    },
    reveal: function () { return [['ghost', 0, 400], ['price', 300, 800], ['qty', 1100, 800], ['areas', 1800, 900]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Domestic price', money(g.P), money(s.Pt)], ['Home production', num(g.qs, 1), num(s.Qs, 2)], ['Consumption', num(g.qd, 1), num(s.Qd, 2)], ['Imports', num(g.qd - g.qs, 1), num(s.imp, 2)]],
        why: 'Imports now cost ' + money(p.Pw) + ' + ' + money(p.t) + ', so the home price rises to <b>' + money(s.Pt) + '</b>. Home firms expand to ' + num(s.Qs, 2) + ', buyers cut back to ' + num(s.Qd, 2) + ', and imports shrink from ' + num(s.imp0, 2) + ' to ' + num(s.imp, 2) + '. ' +
          'Consumers lose ' + money(-s.dCS) + ', producers gain ' + money(s.dPS) + ', the government collects ' + money(p.t) + ' &times; ' + num(s.imp, 2) + ' = ' + money(s.rev) + '. That leaves <b>' + money(s.dwl) + '</b> lost to no one: the two red triangles. Revenue is a transfer, it does not offset them.'
      };
    },
    explore: {
      hint: 'Step the world price and the tariff. At t = $0 the readout shows the gains from trade over no trade; any tariff gives some back and burns the two red triangles.',
      controls: function (f) {
        var p = f.p, Ps = (p.a + p.b) / 2;
        return [
          { kind: 'stepper', label: 'P_W', get: function (f) { return f.p.Pw; }, set: function (f, v, fin) { f.p.Pw = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: Math.max(p.b + 0.5, Math.ceil((p.a - 0.95 * f.dom.X) * 2) / 2), max: Ps - 0.5, fmt: money, dur: 300 },
          { kind: 'stepper', label: 'Tariff t', get: function (f) { return f.p.t; }, set: function (f, v, fin) { f.p.t = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 0, max: 6, fmt: money, dur: 300 }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol;
        var trade = 'Free trade at ' + money(p.Pw) + ' vs no trade (' + money(s.Ps) + '): CS +' + money(s.CS0 - s.CSa) + ', PS -' + money(s.PSa - s.PS0) + ', net <b class="c-green">+' + money(s.gain) + '</b>.';
        if (s.ta <= 0) return trade;
        return trade + ' Tariff ' + money(p.t) + (s.prohibitive ? ' (prohibitive: imports stop at ' + money(s.Ps) + ')' : '') + ': CS -' + money(-s.dCS) + ', PS +' + money(s.dPS) + ', revenue +' + money(s.rev) + ', DWL <b class="c-red">-' + money(s.dwl) + '</b>.';
      }
    }
  };

  /* =====================================================================
     8.4  Monopoly two-step rule (has a film)
     ===================================================================== */
  var f84 = {
    key: 'f84', num: '8.4', topic: 'Monopoly two-step rule', short: 'Monopoly two-step', model: M.mono, axes: AX, aspect: 0.8,
    film: { name: 'fig84-monopoly', label: 'Animation: Monopoly in two steps', title: 'Watch first, 41 seconds',
      caption: 'With demand P = 10 - Q and marginal cost $2, the monopolist sets MR = MC to choose Q = 4, then reads the price, $6, off the demand curve. Then do it yourself on new numbers.' },
    question: 'Find the monopoly outcome: draw MR, set MR = MC, then read the price.',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'A single seller faces demand <b>P = ' + p.a + ' - Q</b> and makes each unit at <b>MC = ' + money(p.c) + '</b>. A competitive market would sell ' + num(s.Qc, 2) + ' units at ' + money(p.c) + '.';
    },
    steps: [
      { kind: 'drag', label: 'Draw MR', prompt: 'MR starts where demand starts. Drag its lower end along the quantity axis to where MR hits zero.', check: function (f) { return f.g.mm; } },
      { kind: 'drag', label: 'Step 1: the quantity', prompt: 'Drag the plum point along MC to the quantity where MR = MC.', check: function (f) { return f.g.mq; } },
      { kind: 'drag', label: 'Step 2: the price', prompt: 'Drag the price up the axis to what buyers will pay for that quantity.', check: function (f) { return f.g.mp; } }
    ],
    kbdHint: 'Keyboard: arrows move the highlighted handle, Space switches handles, Enter confirms.',
    initGuess: function (f) { return { mr: Math.round(f.p.a * 0.8 * 4) / 4, q: f.sol.Qc, p: f.p.c, mm: false, mq: false, mp: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g;
      if (f.predicting) {
        var h0 = { x: g.mr, y: 0, c: PLUM, grip: 'h', step: 0, active: f.cur === 0, snap: { x: 0.25, y: 0 }, kstep: { x: 0.25, y: 0 },
          set: function (f, X) { f.g.mr = clamp(X, 0.5, f.dom.X); f.g.mm = f.g.mm || Math.abs(f.g.mr - Math.round(f.p.a * 0.8 * 4) / 4) > 0.2; } };
        var h1 = { x: g.q, y: p.c, c: PLUM, grip: 'h', step: 1, active: f.cur === 1, snap: { x: 0.25, y: 0 }, kstep: { x: 0.25, y: 0 },
          set: function (f, X) { f.g.q = clamp(X, 0.25, f.dom.X); f.g.mq = f.g.mq || Math.abs(f.g.q - f.sol.Qc) > 0.2; } };
        var h2 = { x: 0, y: g.p, c: PLUM, grip: 'v', step: 2, active: f.cur === 2, snap: { x: 0, y: 0.25 }, kstep: { x: 0, y: 0.25 },
          hit: function (pt) { return Math.abs(pt.x - S.x0) < 40 ? Math.abs(pt.y - S.y(f.g.p)) : 1e9; },
          set: function (f, X, Y) { f.g.p = clamp(Y, 0, f.dom.Y); f.g.mp = f.g.mp || Math.abs(f.g.p - f.p.c) > 0.2; } };
        var hs = [h0];
        if (f.cur >= 1) hs = [h1, h0];
        if (f.cur >= 2) hs = [h2, h1, h0];
        return hs;
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1);
      var mr = f.t('mr'), tq = f.t('q'), tp = f.t('p'), ar = f.t('areas');
      var wrong = f.exploring && f.ex.mode === 'mr';
      if (ar > 0) welfareAreas(D, d, p.c, s.Pm, ar);
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D: P = ' + p.a + ' - Q', d, [0.62, 0.7, 0.55, 0.78], { pref: 'aboveOnly' });
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (f.predicting) {
        D.line(0, p.a, g.mr, 0, { c: PLUM, w: 3.5, dash: '9 6', layer: 'over', reg: false });
        if (g.mm) D.label('your MR', D.along(function (q) { return p.a - p.a / g.mr * q; }, [0.55 * g.mr, 0.4 * g.mr, 0.7 * g.mr], 12, 'below'), { c: PLUM, size: S.ss });
        if (f.cur >= 1) { D.line(g.q, 0, g.q, S.Y * 0.98, { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false }); D.xval(g.q, 'Q = ' + num(g.q, 2), { c: PLUM }); }
        if (f.cur >= 2) { D.line(0, g.p, g.q, g.p, { c: PLUM, w: 3, layer: 'over', reg: false }); D.dot(g.q, g.p, { c: PLUM, r: 7 }); D.near(g.q, g.p, money(g.p), { c: PLUM, d: 18, ring: 60 }); }
        return;
      }
      if (f.ghostOn()) {
        D.line(0, p.a, g.mr, 0, { c: PLUM, w: 3, dash: '4 7', op: f.gOp(), layer: 'over', reg: false });
        D.ghost(g.q, g.p, { op: f.gOp() }); youTag(f, D, g.q, g.p);
      }
      if (mr > 0) {
        D.line(0, p.a, s.mr0, 0, { c: MR, w: 4, dash: '11 7', pr: mr });
        if (mr > 0.8) D.label('MR', D.along(function (q) { return p.a - 2 * q; }, [0.85 * s.mr0, 0.75 * s.mr0, 0.65 * s.mr0], 12, 'below'), { c: MRT, size: S.fs, op: seg(mr, 0.8, 1) });
      }
      if (tq > 0) {
        D.dot(s.Qm, p.c, { c: MR, r: 9, pr: tq });
        D.line(s.Qm, 0, s.Qm, p.c, { c: C.soft, w: 2.5, dash: '6 6', pr: tq, layer: 'over' });
        if (!f.exploring) D.label('MR = MC', D.around(s.Qm, p.c, 22).filter(function (c) { return c.y > S.y(p.c); }), { c: MRT, op: tq, size: S.ss, prio: 0, ring: 70 });
        D.xval(s.Qm, 'Q_M = ' + num(s.Qm, 2), { c: C.ink, op: tq });
      }
      if (tp > 0) {
        D.line(s.Qm, p.c, s.Qm, lerp(p.c, s.Pm, tp), { c: C.ink, w: 3, layer: 'over' });
        D.dot(s.Qm, s.Pm, { c: DEM, r: 10, pr: seg(tp, 0.6, 1) });
        D.line(0, s.Pm, s.Qm, s.Pm, { c: C.soft, w: 2.5, dash: '6 6', pr: seg(tp, 0.6, 1), layer: 'over' });
        D.yval(s.Pm, 'P_M = ' + money(s.Pm), { c: C.ink, op: seg(tp, 0.6, 1), dy: -9 });
      }
      if (ar > 0.3) {
        var o = seg(ar, 0.3, 1);
        inArea(D, S, 'CS ' + money(s.CS), s.Qm * 0.3, lerp(s.Pm, p.a, 0.3), { c: DEMT, op: o, size: S.ss });
        inArea(D, S, 'profit ' + money(s.pi), s.Qm / 2, (s.Pm + p.c) / 2, { c: C.tGold, op: o, size: S.ss });
        D.label('DWL ' + money(s.DWL), D.around((2 * s.Qm + s.Qc) / 3, (s.Pm + 2 * p.c) / 3, 4).concat(D.around(lerp(s.Qm, s.Qc, 0.55), lerp(s.Pm, p.c, 0.55), 30)), { c: C.tRed, op: o, size: S.ss, prio: 0, ring: 80 });
      }
      if (wrong) {
        D.dot(s.Qm, p.c, { c: C.red, r: 10 });
        D.label('wrong: P read off MR = ' + money(p.c), [{ x: S.x(s.Qm) + 16, y: S.y(p.c) + 30, anchor: 'start' }, { x: S.x(s.Qm) - 16, y: S.y(p.c) + 30, anchor: 'end' }], { c: C.tRed, prio: 0, size: S.ss });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['mr', 300, 900], ['q', 1150, 700], ['p', 1800, 900], ['areas', 2600, 800]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['MR hits zero at', num(g.mr, 2), num(s.mr0, 2)], ['Q<sub>M</sub> (MR = MC)', num(g.q, 2), num(s.Qm, 2)], ['P<sub>M</sub> (from demand)', money(g.p), money(s.Pm)], ['Profit', '', money(s.pi)]],
        why: 'For P = ' + p.a + ' - Q, MR = ' + p.a + ' - 2Q: same start, twice as steep, zero at ' + num(s.mr0, 2) + '. Step 1: ' + p.a + ' - 2Q = ' + num(p.c, 2) + ' gives <b>Q<sub>M</sub> = ' + num(s.Qm, 2) + '</b>. Step 2: go up to demand, not MR: <b>P<sub>M</sub> = ' + p.a + ' - ' + num(s.Qm, 2) + ' = ' + money(s.Pm) + '</b>. ' +
          'Profit is the gold rectangle, ' + num(s.Qm, 2) + ' &times; (' + money(s.Pm) + ' - ' + money(p.c) + ') = ' + money(s.pi) + '. Reading the price off MR would give ' + money(p.c) + ', just MC.' +
          (!f.skipped && Math.abs(g.p - p.c) < 0.3 ? ' Your price sits on MC: that is the classic mistake.' : '')
      };
    },
    explore: {
      init: function (f) { f.ex.mode = 'demand'; },
      hint: 'Step the demand intercept a and the cost c. Flip to the common mistake to see how reading the price from MR understates it.',
      controls: function (f) {
        var amax = Math.min(16, Math.floor(f.dom.Y * 0.95));
        return [
          { kind: 'stepper', label: 'a', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: Math.max(6, f.p.c + 2), max: amax, fmt: function (v) { return num(v, 2); }, dur: 300 },
          { kind: 'stepper', label: 'MC', get: function (f) { return f.p.c; }, set: function (f, v, fin) { f.p.c = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 0, max: 6, fmt: money, dur: 300 },
          { kind: 'seg', label: 'Price read from', options: [['demand', 'Demand'], ['mr', 'MR (the mistake)']], get: function (f) { return f.ex.mode; }, set: function (f, v) { f.ex.mode = v; } }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (p.c >= p.a - 0.5) return 'MC is at or above the demand intercept: nothing is worth making.';
        return 'Q<sub>M</sub> = (' + num(p.a, 2) + ' - ' + num(p.c, 2) + ')/2 = <b>' + num(s.Qm, 2) + '</b>, P<sub>M</sub> = <b>' + money(s.Pm) + '</b>, profit <b class="c-gold">' + money(s.pi) + '</b>, CS ' + money(s.CS) + ', DWL <b class="c-red">' + money(s.DWL) + '</b>.';
      }
    }
  };

  /* =====================================================================
     8.5  Competition vs monopoly: the biggest profit rectangle
     ===================================================================== */
  var f85 = {
    key: 'f85', num: '8.5', topic: 'Competition vs. monopoly welfare comparator', short: 'Competition vs monopoly', model: M.compare, axes: AX,
    question: 'A monopolist takes over this competitive market. Without MR: drag the price to where its profit rectangle is biggest.',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>P = ' + p.a + ' - Q</b> and MC = <b>' + money(p.c) + '</b>. Under competition the price is ' + money(p.c) + ', buyers take ' + num(s.Qc, 2) + ' units and keep all ' + money(s.CSc) + ' of surplus (blue). ' +
        'A monopolist earns (P - MC) &times; Q: the plum rectangle under demand.';
    },
    steps: [{ kind: 'drag', label: 'The profit-maximizing price', prompt: 'Slide the plum point along demand. Make the rectangle as big as you can.', check: function (f) { return Math.abs(f.g.P - M.compare.start(f.p)) > 0.2 ? true : 'Slide it along the curve first.'; } }],
    kbdHint: KBD_LINE,
    initGuess: function (f) { return { P: M.compare.start(f.p) }; },
    handles: function (f) {
      var p = f.p, d = dm(p.a, 1);
      if (f.predicting) return [onDem(f, d, f.g.P, function (f, P) { f.g.P = P; }, { c: PLUM, step: 0, active: !f.done[0], lo: p.c, hi: p.a - 0.1 })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1), st = f.exploring ? f.ex.state : 'mono';
      var mr = f.t('mr'), mo = f.t('mono'), ar = f.t('areas'), sm = f.t('sum');
      if (f.predicting || ar < 1 && !f.exploring) D.area([[0, p.a], [s.Qc, p.c], [0, p.c]], { fill: C.blue, fo: 0.11 * (1 - ar), op: b });
      if (ar > 0 && st === 'mono') welfareAreas(D, d, p.c, s.Pm, ar);
      if (f.exploring && st === 'comp') D.area([[0, p.a], [s.Qc, p.c], [0, p.c]], { fill: C.blue, fo: 0.2 });
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D: P = ' + p.a + ' - Q', d, [0.62, 0.7, 0.55, 0.78], { pref: 'aboveOnly' });
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (!f.exploring || st === 'comp') {
        D.dot(s.Qc, p.c, { c: C.ink, r: 8, pr: b });
        if (b > 0.5) D.near(s.Qc, p.c, 'competition', { c: C.soft, size: S.ss, d: 18, ring: 80 });
      }
      if (f.predicting) {
        var q = qOf(d, g.P);
        D.area(box(0, p.c, q, g.P), { fill: PLUM, fo: 0.22, stroke: PLUM, sw: 2.5, layer: 'over' });
        D.near(q, g.P, money(g.P), { c: PLUM, d: 22, ring: 70 });
        return;
      }
      if (f.ghostOn()) { var gq = qOf(d, g.P); D.path(box(0, p.c, gq, g.P).concat([[0, p.c]]), { c: PLUM, w: 3, dash: '5 6', op: f.gOp(), layer: 'over', reg: false }); D.ghost(gq, g.P, { op: f.gOp() }); youTag(f, D, gq, g.P); }
      if (st !== 'mono') {
        if (f.exploring) corner(D, S, 'CS ' + money(s.CSc) + ', DWL $0', { c: DEMT, size: S.ss });
        return;
      }
      if (mr > 0) {
        D.line(0, p.a, s.mr0, 0, { c: MR, w: 3.5, dash: '11 7', pr: mr });
        if (mr > 0.8) D.label('MR', D.along(function (q) { return p.a - 2 * q; }, [0.85 * s.mr0, 0.75 * s.mr0, 0.65 * s.mr0], 12, 'below'), { c: MRT, size: S.fs, op: seg(mr, 0.8, 1) });
      }
      if (mo > 0) {
        D.dot(s.Qm, s.Pm, { c: DEM, r: 10, pr: mo });
        D.drop(s.Qm, s.Pm, { pr: mo });
        D.near(s.Qm, s.Pm, 'monopoly ' + money(s.Pm), { c: C.ink, op: mo, d: 20, prio: 0, ring: 80 });
      }
      if (ar > 0.3) {
        var o = seg(ar, 0.3, 1);
        inArea(D, S, 'CS ' + money(s.CS), s.Qm * 0.3, lerp(s.Pm, p.a, 0.3), { c: DEMT, op: o, size: S.ss });
        inArea(D, S, 'profit ' + money(s.pi), s.Qm / 2, (s.Pm + p.c) / 2, { c: C.tGold, op: o, size: S.ss });
        D.label('DWL ' + money(s.DWL), D.around((2 * s.Qm + s.Qc) / 3, (s.Pm + 2 * p.c) / 3, 4).concat(D.around(lerp(s.Qm, s.Qc, 0.55), lerp(s.Pm, p.c, 0.55), 30)), { c: C.tRed, op: o, size: S.ss, prio: 0, ring: 80 });
      }
      if (sm > 0) corner(D, S, money(s.CS) + ' + ' + money(s.pi) + ' + ' + money(s.DWL) + ' = ' + money(s.CSc), { op: sm, size: S.ss });
    },
    reveal: function () { return [['ghost', 0, 400], ['mono', 300, 700], ['mr', 900, 800], ['areas', 1600, 800], ['sum', 2300, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, q = qOf(dm(p.a, 1), g.P);
      return {
        rows: [['Price', money(g.P), money(s.Pm)], ['Profit (rectangle)', money(M.compare.profit(p, g.P)), money(s.pi)], ['CS left', '', money(s.CS)], ['DWL', '', money(s.DWL)]],
        why: 'Profit (P - ' + money(p.c) + ') &times; (' + p.a + ' - P) is biggest halfway between MC and the top of demand: P = (' + p.a + ' + ' + num(p.c, 2) + ')/2 = <b>' + money(s.Pm) + '</b>, the same answer MR = MC gives (MR is drawn in to show it). ' +
          'Of the ' + money(s.CSc) + ' consumers had under competition, ' + money(s.CS) + ' is left, ' + money(s.pi) + ' becomes profit (a transfer) and <b>' + money(s.DWL) + '</b> is destroyed. CS + profit + DWL = ' + money(s.CSc) + ', always.' +
          (!f.skipped && q > s.Qm + 0.05 ? ' Your price was too low: past Q = ' + num(s.Qm, 2) + ' each extra sale cuts the price on every unit.' : '')
      };
    },
    explore: {
      init: function (f) { f.ex.state = 'mono'; },
      hint: 'Toggle competition and monopoly, and step MC or the demand intercept. DWL grows with the gap between demand and MC.',
      controls: function (f) {
        return [
          { kind: 'seg', label: 'Market', options: [['comp', 'Competition'], ['mono', 'Monopoly']], get: function (f) { return f.ex.state; }, set: function (f, v) { f.ex.state = v; } },
          { kind: 'stepper', label: 'MC', get: function (f) { return f.p.c; }, set: function (f, v, fin) { f.p.c = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 0, max: 8, fmt: money, dur: 300 },
          { kind: 'stepper', label: 'a', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 8, max: Math.min(16, Math.floor(f.dom.Y * 0.95)), fmt: function (v) { return num(v, 2); }, dur: 300 }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (p.c >= p.a - 0.25) return 'MC is at or above the top of demand: no trade.';
        if (f.ex.state === 'comp') return 'Competition: P = MC = ' + money(p.c) + ', Q = ' + num(s.Qc, 2) + '. CS <b class="c-blue">' + money(s.CSc) + '</b>, profit $0, DWL $0.';
        return 'Monopoly: P = ' + money(s.Pm) + ', Q = ' + num(s.Qm, 2) + '. CS <b class="c-blue">' + money(s.CS) + '</b> + profit <b class="c-gold">' + money(s.pi) + '</b> + DWL <b class="c-red">' + money(s.DWL) + '</b> = ' + money(s.CSc) + '.';
      }
    }
  };

  /* =====================================================================
     8.7  Perfect price discrimination
     ===================================================================== */
  function slivers(D, d, c, Qend, pr, n, o) {
    o = o || {}; var w = Qend / n, k = Math.min(n, Math.ceil(pr * n - 1e-9));
    for (var i = 0; i < k; i++) {
      var q0 = i * w, q1 = (i + 1) * w, P = d.a - d.b * (q0 + q1) / 2, op = i === k - 1 ? clamp(pr * n - i, 0, 1) : 1;
      D.area(box(q0 + w * 0.06, c, q1 - w * 0.06, P), { fill: o.fill || C.gold, fo: o.fo || 0.42, op: op * (o.op == null ? 1 : o.op) });
    }
  }
  var f87 = {
    key: 'f87', num: '8.7', topic: 'Perfect price discrimination: anatomy', short: 'Perfect price discrimination', model: M.ppd, axes: AX,
    question: 'The monopolist can now charge every buyer exactly their willingness to pay. How far down demand does it sell?',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>P = ' + p.a + ' - Q</b> and MC = <b>' + money(p.c) + '</b>. With one price for everyone the monopolist sells ' + num(s.Qm, 2) + ' units at ' + money(s.Pm) + ' (faded picture). ' +
        'Perfect price discrimination (first degree) sells each unit separately at the most that buyer will pay.';
    },
    steps: [{ kind: 'drag', label: 'The last unit sold', prompt: 'Slide the plum point along demand to the last unit the firm sells.', check: function (f) { return Math.abs(f.g.Q - f.sol.Qm) > 0.2 ? true : 'Slide it along demand first.'; } }],
    kbdHint: KBD_LINE,
    initGuess: function (f) { return { Q: f.sol.Qm }; },
    handles: function (f) {
      var p = f.p, d = dm(p.a, 1);
      if (f.predicting) return [onDem(f, d, p.a - f.g.Q, function (f, P) { f.g.Q = r6(p.a - P); }, { c: PLUM, step: 0, active: !f.done[0], lo: 0.1, hi: p.a - 0.25 })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1), st = f.exploring ? f.ex.state : 'ppd';
      var fd = f.t('fade'), sl = f.t('slivers'), en = f.t('end');
      // the uniform-price picture as the "before"
      var uop = f.exploring ? (st === 'mono' ? 1 : 0) : 0.45 * (1 - fd);
      if (uop > 0.01) welfareAreas(D, d, p.c, s.Pm, uop * b);
      if (f.exploring && st === 'comp') D.area([[0, p.a], [s.Qc, p.c], [0, p.c]], { fill: C.blue, fo: 0.2 });
      if (sl > 0 && st === 'ppd') slivers(D, d, p.c, s.Qc, sl, 24);
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b, dash: '10 6' });
      if (b > 0.9) {
        lineLabel(D, S, 'D: P = ' + p.a + ' - Q', d, [0.62, 0.7, 0.55, 0.78], { pref: 'aboveOnly' });
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (!f.exploring || st === 'mono') {
        D.dot(s.Qm, s.Pm, { c: C.ink, r: 7, pr: b, op: f.exploring ? 1 : 0.6 });
        if (b > 0.5) D.near(s.Qm, s.Pm, 'one price ' + money(s.Pm), { c: C.soft, size: S.ss, d: 18, ring: 80, op: f.exploring ? 1 : 0.85 * (1 - fd) });
      }
      if (f.predicting) {
        if (g.Q > 0.05) D.area([[0, p.a], [g.Q, p.a - g.Q], [g.Q, p.c], [0, p.c]].map(function (q) { return [q[0], Math.max(q[1], p.c)]; }), { fill: PLUM, fo: 0.14, layer: 'under' });
        D.line(g.Q, 0, g.Q, p.a - g.Q, { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false });
        D.xval(g.Q, 'Q = ' + num(g.Q, 2), { c: PLUM });
        return;
      }
      if (f.ghostOn()) { D.ghost(g.Q, p.a - g.Q, { op: f.gOp() }); youTag(f, D, g.Q, p.a - g.Q); }
      if (en > 0 && st === 'ppd') {
        D.dot(s.Qc, p.c, { c: C.ink, r: 10, pr: en });
        D.xval(s.Qc, 'Q = ' + num(s.Qc, 2), { c: C.ink, op: en });
        D.label('last unit sells at ' + money(p.c), D.around(s.Qc, p.c, 22).filter(function (c) { return c.y < S.y(p.c); }), { c: C.ink, op: en, size: S.ss, prio: 0, ring: 90 });
        corner(D, S, 'profit ' + money(s.CSc) + ', CS $0, DWL $0', { op: en, size: S.ss, c: C.tGold });
      }
      if (f.exploring && st === 'mono') corner(D, S, 'CS ' + money(s.CS) + ', profit ' + money(s.pi) + ', DWL ' + money(s.DWL), { size: S.ss });
      if (f.exploring && st === 'comp') corner(D, S, 'CS ' + money(s.CSc) + ', profit $0, DWL $0', { size: S.ss, c: DEMT });
    },
    reveal: function () { return [['ghost', 0, 400], ['fade', 300, 500], ['slivers', 600, 1800, 'linear'], ['end', 2400, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Units sold', num(g.Q, 2), num(s.Qc, 2)], ['Price of the last unit', money(p.a - g.Q), money(p.c)], ['Profit', '', money(s.CSc)], ['CS and DWL', '', '$0 and $0']],
        why: 'A seller who prices each unit separately never has to cut the price on earlier units, so the extra revenue from one more unit is just its own price: demand becomes MR. It keeps selling while a buyer will pay more than MC, down to <b>Q = ' + num(s.Qc, 2) + '</b>, where the last unit sells for ' + money(p.c) + '. ' +
          'That is the competitive output, so DWL is zero, but the whole ' + money(s.CSc) + ' of surplus becomes profit and CS is zero: efficient, and as unequal as it gets.' +
          (!f.skipped && g.Q < s.Qm + 0.3 ? ' You stopped near the one-price output: that is where MR = MC only when every buyer pays the same price.' : '')
      };
    },
    explore: {
      init: function (f) { f.ex.state = 'ppd'; },
      hint: 'Cycle through the three states, and step MC or the demand intercept.',
      controls: function (f) {
        return [
          { kind: 'seg', label: 'Pricing', options: [['comp', 'Competitive'], ['mono', 'Uniform monopoly'], ['ppd', 'Perfect PD']], get: function (f) { return f.ex.state; }, set: function (f, v) { f.ex.state = v; } },
          { kind: 'stepper', label: 'MC', get: function (f) { return f.p.c; }, set: function (f, v, fin) { f.p.c = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 0, max: 6, fmt: money, dur: 300 },
          { kind: 'stepper', label: 'a', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? Math.round(v * 2) / 2 : v; }, step: 0.5, min: 8, max: Math.min(16, Math.floor(f.dom.Y * 0.95)), fmt: function (v) { return num(v, 2); }, dur: 300 }
        ];
      },
      readout: function (f) {
        var s = f.sol, st = f.ex.state;
        if (st === 'comp') return 'Competitive: CS <b class="c-blue">' + money(s.CSc) + '</b>, profit $0, DWL $0, TS ' + money(s.CSc) + '.';
        if (st === 'mono') return 'Uniform monopoly: CS <b class="c-blue">' + money(s.CS) + '</b>, profit <b class="c-gold">' + money(s.pi) + '</b>, DWL <b class="c-red">' + money(s.DWL) + '</b>, TS ' + money(s.CS + s.pi) + '.';
        return 'Perfect PD: CS $0, profit <b class="c-gold">' + money(s.CSc) + '</b>, DWL $0, TS ' + money(s.CSc) + '. Efficient, but buyers keep nothing.';
      }
    }
  };

  /* =====================================================================
     8.8  Block pricing (second degree)
     ===================================================================== */
  function stairs(D, p, qs, o) {
    var prev = 0;
    qs.forEach(function (q) { var P = p.a - q; if (P > p.c && q > prev) D.area(box(prev, p.c, q, P), o); prev = q; });
  }
  var f88 = {
    key: 'f88', num: '8.8', topic: 'Block pricing: approaching PPD from 2nd degree', short: 'Block pricing', model: M.blocks, axes: AX,
    question: function (f) { return 'The firm sells in ' + f.p.n + ' price blocks. Where should each block end?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>P = ' + num(p.a, 2) + ' - Q</b> and MC = <b>' + money(p.c) + '</b> (efficient output ' + num(s.Qs, 2) + '). Each block sells to the next group of buyers at the willingness to pay of its <b>last</b> unit, so everyone in the block buys. ' +
        'With one block this is the plain monopoly (' + num(s.Qs / 2, 2) + ' units, profit ' + money(s.piM) + ').';
    },
    steps: [{ kind: 'drag', label: function (f) { return 'Where the ' + f.p.n + ' blocks end'; },
      prompt: function (f) { var n = f.g.m.filter(Boolean).length; return n ? 'Good. Move every point (' + n + ' of ' + f.p.n + ' so far).' : 'Slide each plum point along demand to where its block ends. The plum steps show your price schedule.'; },
      check: function (f) { return f.g.m.every(Boolean) ? true : 'Move every point.'; } }],
    kbdHint: 'Keyboard: arrows slide the highlighted point along demand, Space switches points, Enter confirms.',
    initGuess: function (f) { var q = M.blocks.start(f.p); return { q: q, m: q.map(function () { return false; }) }; },
    handles: function (f) {
      var p = f.p, d = dm(p.a, 1), g = f.g;
      if (!f.predicting) return [];
      // handles move freely (no neighbour fences); a pointer drop re-sorts them so block i stays block i
      return g.q.map(function (q, i) {
        var h = onDem(f, d, p.a - q, function (f, P) { f.g.q[i] = r6(Math.round((p.a - P) * 4) / 4); f.g.m[i] = true; }, { c: PLUM, step: 0, active: !g.m[i], st: 0.25, ks: 0.25, lo: 0.25, hi: p.a - 0.25 });
        h.drop = function (f) { var o = f.g.q.map(function (v, j) { return [v, f.g.m[j]]; }).sort(function (x, y) { return x[0] - y[0]; }); f.g.q = o.map(function (v) { return v[0]; }); f.g.m = o.map(function (v) { return v[1]; }); };
        return h;
      });
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1), n = f.exploring ? f.ex.n : p.n;
      var bl = f.t('blocks'), cs = f.t('cs'), dw = f.t('dwl'), sm = f.t('sum');
      var qs = M.blocks.ends(p, n), Qn = qs[n - 1];
      if (bl > 0) {
        var k = f.exploring ? n : Math.min(n, Math.ceil(bl * n - 1e-9)), prev = 0;
        for (var i = 0; i < k; i++) {
          var P = p.a - qs[i], op = f.exploring ? 1 : clamp(bl * n - i, 0, 1);
          D.area(box(prev, p.c, qs[i], P), { fill: C.gold, fo: 0.4, op: op, stroke: C.gold, sw: 1.5 });
          prev = qs[i];
        }
      }
      if (cs > 0) { var pv = 0; qs.forEach(function (q) { D.area([[pv, p.a - pv], [q, p.a - q], [pv, p.a - q]], { fill: C.blue, fo: 0.22, op: cs }); pv = q; }); }
      if (dw > 0) D.area([[Qn, p.a - Qn], [s.Qs, p.c], [Qn, p.c]], { fill: C.red, fo: 0.32, op: dw });
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b, dash: '10 6' });
      if (b > 0.9) {
        lineLabel(D, S, 'D: P = ' + num(p.a, 2) + ' - Q', d, [0.7, 0.62, 0.78, 0.55], { pref: 'aboveOnly' });
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (f.predicting) {
        stairs(D, p, g.q.slice().sort(function (x, y) { return x - y; }), { fill: PLUM, fo: 0.16, stroke: PLUM, sw: 2.5, layer: 'over' });
        g.q.forEach(function (q, i) { if (g.m[i]) D.near(q, p.a - q, money(p.a - q), { c: PLUM, d: 22, ring: 60, size: S.ss }); });
        return;
      }
      if (f.ghostOn()) { var gs = g.q.slice().sort(function (x, y) { return x - y; }); var pv2 = 0; gs.forEach(function (q) { D.path(box(pv2, p.c, q, p.a - q).concat([[pv2, p.c]]), { c: PLUM, w: 3, dash: '5 6', op: f.gOp(), layer: 'over', reg: false }); pv2 = q; }); youTag(f, D, gs[0], p.a - gs[0]); }
      if (bl > 0.5 && n <= 5) {
        qs.forEach(function (q, i) {
          if (!f.exploring && bl * n < i + 0.8) return;
          D.dot(q, p.a - q, { c: C.ink, r: 7 });
          D.label(money(p.a - q), D.around(q, p.a - q, 18).filter(function (c) { return c.x > S.x(q) - 4; }), { c: C.ink, size: S.ss, prio: 0, ring: 50 });
        });
      }
      if (dw > 0.3 && s.Qs - Qn > 0.01) D.label('DWL ' + money(0.5 * (s.Qs - Qn) * (s.Qs - Qn)), D.around((2 * Qn + s.Qs) / 3, (p.a - Qn + 2 * p.c) / 3, 4).concat(D.around(s.Qs, p.c, 34)), { c: C.tRed, op: seg(dw, 0.3, 1), size: S.ss, prio: 0, ring: 80 });
      var TS = s.TS, pi = TS * n / (n + 1), csv = TS * n / ((n + 1) * (n + 1));
      if (sm > 0) corner(D, S, 'profit ' + money(pi) + ', CS ' + money(csv), { op: sm, size: S.ss, c: C.tGold });
    },
    reveal: function () { return [['ghost', 0, 400], ['blocks', 300, 1500, 'linear'], ['cs', 1800, 500], ['dwl', 2200, 500], ['sum', 2600, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gs = g.q.slice().sort(function (x, y) { return x - y; }), mine = M.blocks.outcome(p, gs);
      return {
        rows: [['Block ends', gs.map(function (q) { return num(q, 2); }).join(', '), s.q.map(function (q) { return num(q, 2); }).join(', ')], ['Block prices', gs.map(function (q) { return money(p.a - q); }).join(', '), s.prices.map(money).join(', ')],
          ['Profit', money(mine.pi), money(s.pi)], ['DWL', money(mine.dwl + mine.excess), money(s.dwl)]],
        why: 'The best blocks split the efficient output ' + num(s.Qs, 2) + ' into ' + (p.n + 1) + ' equal steps and sell the first ' + p.n + ': ends at ' + s.q.map(function (q) { return num(q, 2); }).join(', ') + ', each step ' + num(s.Qs / (p.n + 1), 2) + ' wide. ' +
          'Profit ' + money(s.TS) + ' &times; ' + p.n + '/' + (p.n + 1) + ' = <b>' + money(s.pi) + '</b> (one price: ' + money(s.piM) + '); DWL ' + money(s.TS) + '/' + (p.n + 1) + '&sup2; = <b>' + money(s.dwl) + '</b>. More blocks trace demand more closely, so output rises toward ' + num(s.Qs, 2) + ' and DWL shrinks toward zero.'
      };
    },
    explore: {
      init: function (f) { f.ex.n = f.p.n; },
      hint: 'Step the number of blocks. One block is the plain monopoly; many blocks approach perfect price discrimination.',
      controls: [{ kind: 'stepper', label: 'Blocks n', get: function (f) { return f.ex.n; }, set: function (f, v, fin) { f.ex.n = Math.max(1, Math.round(v)); }, step: 1, min: 1, max: 10, fmt: function (v) { return String(Math.round(v)); }, dur: 200 }],
      readout: function (f) {
        var s = f.sol, n = f.ex.n, TS = s.TS, Qn = s.Qs * n / (n + 1);
        return n + (n === 1 ? ' block' : ' blocks') + ': output ' + num(Qn, 2) + ' of ' + num(s.Qs, 2) + ', profit <b class="c-gold">' + money(TS * n / (n + 1)) + '</b>, CS <b class="c-blue">' + money(TS * n / ((n + 1) * (n + 1))) + '</b>, DWL = ' + money(TS) + '/(n+1)&sup2; = <b class="c-red">' + money(TS / ((n + 1) * (n + 1))) + '</b>.';
      }
    }
  };

  /* =====================================================================
     8.9  Market separation (third degree)
     ===================================================================== */
  var LEI = C.green, LEIT = C.tGreen;
  var f89 = {
    key: 'f89', num: '8.9', topic: 'Market separation: 3rd degree PD', short: 'Market separation', model: M.separate, axes: AX, narrowAspect: 1.3,
    question: 'The airline can price business and leisure travellers separately. Set the profit-maximizing price in each market.',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Business: <b>P = ' + p.a1 + ' - Q</b> (blue). Leisure: <b>P = ' + p.a2 + ' - Q/2</b> (green). MC = <b>' + money(p.c) + '</b> per seat. ' +
        'Right now everyone pays one price, ' + money(s.uP) + ' (dashed). Both points start there.';
    },
    steps: [
      { kind: 'drag', label: 'Business price', prompt: 'Slide the plum point on the blue business demand to its best price.', check: function (f) { return f.g.m1; } },
      { kind: 'drag', label: 'Leisure price', prompt: 'Now slide the plum point on the green leisure demand.', check: function (f) { return f.g.m2; } }
    ],
    kbdHint: KBD_LINE + ' Space switches points.',
    initGuess: function (f) { var P0 = f.sol.start; return { P1: P0, P2: P0, m1: false, m2: false }; },
    handles: function (f) {
      var p = f.p, g = f.g, d1 = dm(p.a1, 1), d2 = dm(p.a2, 0.5);
      if (!f.predicting) return [];
      var h1 = onDem(f, d1, g.P1, function (f, P) { f.g.P1 = P; f.g.m1 = f.g.m1 || Math.abs(P - f.sol.start) > 0.2; }, { c: PLUM, step: 0, active: f.cur === 0, st: 0.5, ks: 0.5, lo: p.c, hi: p.a1 - 1 });
      var h2 = onDem(f, d2, g.P2, function (f, P) { f.g.P2 = P; f.g.m2 = f.g.m2 || Math.abs(P - f.sol.start) > 0.2; }, { c: PLUM, step: 1, active: f.cur === 1, st: 0.5, ks: 0.5, lo: p.c, hi: p.a2 - 0.5 });
      return f.cur === 1 ? [h2, h1] : [h1, h2];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d1 = dm(p.a1, 1), d2 = dm(p.a2, 0.5), uni = f.exploring && f.ex.mode === 'uni';
      var mr = f.t('mr'), tq = f.t('q'), tp = f.t('p');
      D.line(0, p.a1, p.a1, 0, { c: DEM, w: 5, pr: b });
      D.line(0, p.a2, 2 * p.a2, 0, { c: LEI, w: 5, pr: b });
      hline(D, S, p.c, { c: MC, w: 4, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, S.narrow ? 'business' : 'business: P = ' + p.a1 + ' - Q', d1, [0.12, 0.2, 0.06, 0.3]);
        lineLabel(D, S, S.narrow ? 'leisure' : 'leisure: P = ' + p.a2 + ' - Q/2', d2, [0.86, 0.78, 0.92, 0.7], { c: LEIT, pref: 'below' });
        D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: MCT, size: S.fs, prio: 0 });
      }
      if (!f.exploring || uni) {
        var uop = f.exploring ? 1 : f.predicting ? 1 : 1 - f.t('q');
        D.line(0, s.uP, S.X, s.uP, { c: C.soft, w: 2.5, dash: '4 6', pr: b, op: uop, layer: 'over', reg: false });
        if (b > 0.5 && uop > 0.05) D.label('one price ' + money(s.uP), [{ x: S.x1 - 6, y: S.y(s.uP) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(s.uP) + 26, anchor: 'end' }], { c: C.soft, op: uop, prio: 0, size: S.ss });
      }
      if (f.predicting) {
        [[d1, g.P1, g.m1], [d2, g.P2, g.m2]].forEach(function (h) { var q = qOf(h[0], h[1]); D.line(q, 0, q, h[1], { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false }); if (h[2]) D.near(q, h[1], money(h[1]), { c: PLUM, d: 22, ring: 60, size: S.ss }); });
        return;
      }
      if (f.ghostOn()) { D.ghost(qOf(d1, g.P1), g.P1, { op: f.gOp() }); D.ghost(qOf(d2, g.P2), g.P2, { op: f.gOp() }); youTag(f, D, qOf(d2, g.P2), g.P2); }
      if (uni) {
        D.dot(s.uQ1, s.uP, { c: DEM, r: 9 }); if (s.uQ2 > 0) D.dot(s.uQ2, s.uP, { c: LEI, r: 9 });
        corner(D, S, 'one price: profit ' + money(s.uPi), { size: S.ss });
        return;
      }
      if (mr > 0) {
        D.line(0, p.a1, p.a1 / 2, 0, { c: DEM, w: 3, dash: '10 7', pr: mr, op: 0.85 });
        if (s.served2) D.line(0, p.a2, p.a2, 0, { c: LEI, w: 3, dash: '10 7', pr: mr, op: 0.85 });
        if (mr > 0.8) {
          D.label('MR_1', D.along(function (q) { return p.a1 - 2 * q; }, [0.42 * p.a1, 0.36 * p.a1, 0.3 * p.a1], 12, 'below'), { c: DEMT, size: S.ss, op: seg(mr, 0.8, 1) });
          if (s.served2) D.label('MR_2', D.along(function (q) { return p.a2 - q; }, [0.85 * p.a2, 0.75 * p.a2, 0.65 * p.a2], 12, 'below'), { c: LEIT, size: S.ss, op: seg(mr, 0.8, 1) });
        }
      }
      if (tq > 0) {
        D.dot(s.Q1, p.c, { c: DEM, r: 8, pr: tq }); D.line(s.Q1, p.c, s.Q1, lerp(p.c, s.P1, tp), { c: DEM, w: 3, layer: 'over' });
        if (s.served2) { D.dot(s.Q2, p.c, { c: LEI, r: 8, pr: tq }); D.line(s.Q2, p.c, s.Q2, lerp(p.c, s.P2, tp), { c: LEI, w: 3, layer: 'over' }); }
      }
      if (tp > 0) {
        var o = seg(tp, 0.6, 1);
        D.dot(s.Q1, s.P1, { c: DEM, r: 10, pr: o });
        D.label('P_1 = ' + money(s.P1), [{ x: S.x(s.Q1) + 16, y: S.y(s.P1) - 10, anchor: 'start' }].concat(D.around(s.Q1, s.P1, 20)), { c: DEMT, op: o, d: 20, prio: 0, ring: 90, size: S.ss });
        if (s.served2) { D.dot(s.Q2, s.P2, { c: LEI, r: 10, pr: o }); D.label('P_2 = ' + money(s.P2), [{ x: S.x(s.Q2) - 16, y: S.y(s.P2) - 10, anchor: 'end' }].concat(D.around(s.Q2, s.P2, 20)), { c: LEIT, op: o, d: 20, prio: 0, ring: 90, size: S.ss }); }
        if (f.exploring) corner(D, S, 'separate prices: profit ' + money(s.pi), { size: S.ss });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['mr', 300, 900], ['q', 1200, 600], ['p', 1700, 900]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Business price', money(g.P1), money(s.P1)], ['Leisure price', money(g.P2), money(s.P2)], ['Profit', '', money(s.pi)], ['vs one price', '', money(s.uPi)]],
        why: 'Treat each market as its own monopoly: MR<sub>1</sub> = ' + p.a1 + ' - 2Q = ' + num(p.c, 2) + ' gives Q<sub>1</sub> = ' + num(s.Q1, 2) + ' and <b>P<sub>1</sub> = ' + money(s.P1) + '</b>; MR<sub>2</sub> = ' + p.a2 + ' - Q = ' + num(p.c, 2) + ' gives Q<sub>2</sub> = ' + num(s.Q2, 2) + ' and <b>P<sub>2</sub> = ' + money(s.P2) + '</b>. ' +
          'At those prices business demand is less elastic (|e| = ' + num(-s.e1, 2) + ' vs ' + num(-s.e2, 2) + '), so it pays the bigger markup: Lerner ' + num(s.L1, 2) + ' vs ' + num(s.L2, 2) + '. Profit ' + money(s.pi) + ' beats the single price by ' + money(s.gain) + '.'
      };
    },
    explore: {
      init: function (f) { f.ex.mode = 'sep'; },
      hint: 'Switch between separate prices and one uniform price, and step MC.',
      controls: function (f) {
        return [
          { kind: 'seg', label: 'Pricing', options: [['sep', 'Separate prices'], ['uni', 'One uniform price']], get: function (f) { return f.ex.mode; }, set: function (f, v) { f.ex.mode = v; } },
          { kind: 'stepper', label: 'MC', get: function (f) { return f.p.c; }, set: function (f, v, fin) { f.p.c = fin ? Math.round(v) : v; }, step: 1, min: 5, max: Math.min(40, f.p.a2 - 2), fmt: money, dur: 300 }
        ];
      },
      readout: function (f) {
        var s = f.sol;
        if (f.ex.mode === 'uni') return 'One price ' + money(s.uP) + ': business buys ' + num(s.uQ1, 2) + ', leisure ' + num(s.uQ2, 2) + ', profit <b class="c-gold">' + money(s.uPi) + '</b>.';
        return 'Business ' + money(s.P1) + ' (' + num(s.Q1, 2) + ' seats), leisure ' + money(s.P2) + ' (' + num(s.Q2, 2) + ' seats). Profit <b class="c-gold">' + money(s.pi) + '</b>, ' + money(s.gain) + ' more than one price.';
      }
    }
  };

  /* =====================================================================
     8.10  Natural monopoly regulation
     ===================================================================== */
  var ACC = C.orange, ACT = C.tOrange, MCG = C.green;
  function acFn(p) { return function (q) { return q > 0 ? p.F / q + p.c : Infinity; }; }
  var f810 = {
    key: 'f810', num: '8.10', topic: 'Natural monopoly regulation dilemma', short: 'Natural monopoly', model: M.natmono, axes: AX,
    question: 'A natural monopoly: what price would it charge on its own, and what is the lowest price a regulator can set without a subsidy?',
    setup: function (f) {
      var p = f.p;
      return 'Demand is <b>P = ' + p.a + ' - Q</b>; costs are <b>TC = ' + p.F + ' + ' + bnum(p.c) + 'Q</b>, so MC = ' + money(p.c) + ' and AC = ' + p.F + '/Q + ' + p.c + ' falls forever: one firm serves the market most cheaply. ' +
        'Pricing at MC would be efficient but lose the fixed cost.';
    },
    steps: [
      { kind: 'drag', label: 'Unregulated price', prompt: 'Slide the plum point along demand to the price the monopolist picks on its own.', check: function (f) { return f.g.mm; } },
      { kind: 'drag', label: 'Lowest break-even price', prompt: 'Now slide the second point, which starts at P = MC, to the lowest price at which the firm still covers its costs.', check: function (f) { return f.g.ma; } }
    ],
    kbdHint: KBD_LINE + ' Space switches points.',
    initGuess: function (f) { var p = f.p; return { Pm: Math.round((p.a - 0.18 * (p.a - p.c)) * 2) / 2, Pa: p.c, mm: false, ma: false }; },
    handles: function (f) {
      var p = f.p, g = f.g, d = dm(p.a, 1);
      if (!f.predicting) return [];
      var h1 = onDem(f, d, g.Pm, function (f, P) { f.g.Pm = P; f.g.mm = true; }, { c: PLUM, step: 0, active: f.cur === 0, lo: p.c, hi: p.a - 0.5 });
      if (f.cur < 1) return [h1];
      var h2 = onDem(f, d, g.Pa, function (f, P) { f.g.Pa = P; f.g.ma = f.g.ma || Math.abs(P - f.p.c) > 0.15; }, { c: PLUM, step: 1, active: f.cur === 1, lo: p.c, hi: p.a - 0.5 });
      return [h2, h1];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1), ac = acFn(p);
      var reg = f.exploring ? f.ex.reg : null, tm = f.t('mono'), ta = f.t('ac');
      var showM = reg === 'mono' || (!f.exploring && tm > 0), showA = reg === 'ac' || (!f.exploring && ta > 0), showC = reg === 'mc';
      var om = f.exploring ? 1 : tm * (1 - ta * 0.75), oa = f.exploring ? 1 : ta;
      if (showM) {
        D.area([[0, p.a], [s.Qm, s.Pm], [0, s.Pm]], { fill: C.blue, fo: 0.18, op: om });
        D.area(box(0, s.ACm, s.Qm, s.Pm), { fill: C.gold, fo: 0.34, op: om });
        D.area([[s.Qm, s.Pm], [s.Qc, p.c], [s.Qm, p.c]], { fill: C.red, fo: 0.3, op: om });
      }
      if (showA) {
        D.area([[0, p.a], [s.Qa, s.Pa], [0, s.Pa]], { fill: C.blue, fo: 0.2, op: oa });
        D.area([[s.Qa, s.Pa], [s.Qc, p.c], [s.Qa, p.c]], { fill: C.red, fo: 0.34, op: oa });
      }
      if (showC) {
        D.area([[0, p.a], [s.Qc, p.c], [0, p.c]], { fill: C.blue, fo: 0.2 });
        D.area(box(0, p.c, s.Qc, s.ACc), { fill: C.red, fo: 0.3, stroke: C.red, sw: 2 });
      }
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      D.line(0, p.a, p.a / 2, 0, { c: MR, w: 3, dash: '10 7', pr: b, op: 0.8 });
      hline(D, S, p.c, { c: MCG, w: 3.5, dash: '10 6', pr: b });
      D.fn(ac, p.F / (S.Y - p.c) * 1.02, S.X, { c: ACC, w: 4.5, pr: b });
      if (b > 0.9) {
        lineLabel(D, S, 'D', d, [0.9, 0.85, 0.95]);
        D.label('MR', D.along(function (q) { return p.a - 2 * q; }, [0.44 * p.a, 0.4 * p.a, 0.36 * p.a], 10, 'below'), { c: MRT, size: S.ss });
        D.label('MC', [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: C.tGreen, size: S.fs, prio: 0 });
        D.label('AC', D.along(ac, [0.18 * S.X, 0.24 * S.X, 0.3 * S.X, 0.12 * S.X].filter(function (q) { return ac(q) < S.Y * 0.95; }), 12), { c: ACT, size: S.fs });
      }
      if (f.predicting) {
        D.near(qOf(d, g.Pm), g.Pm, f.cur === 0 && !g.mm ? 'drag me' : money(g.Pm), { c: PLUM, d: 22, ring: 60, size: S.ss });
        if (f.cur >= 1) { var qa = qOf(d, g.Pa); D.line(0, g.Pa, qa, g.Pa, { c: PLUM, w: 2, dash: '5 6', layer: 'over', reg: false }); D.near(qa, g.Pa, money(g.Pa), { c: PLUM, d: 22, ring: 60, size: S.ss }); }
        return;
      }
      if (f.ghostOn()) { D.ghost(qOf(d, g.Pm), g.Pm, { op: f.gOp() }); D.ghost(qOf(d, g.Pa), g.Pa, { op: f.gOp() }); youTag(f, D, qOf(d, g.Pa), g.Pa); }
      if (showM) {
        D.dot(s.Qm, s.Pm, { c: C.ink, r: 9, pr: f.exploring ? 1 : tm });
        D.near(s.Qm, s.Pm, 'monopoly ' + money(s.Pm), { c: C.ink, op: om, d: 20, prio: 0, ring: 90, size: S.ss });
      }
      if (showA) {
        D.dot(s.Qa, s.Pa, { c: C.ink, r: 10, pr: oa });
        D.drop(s.Qa, s.Pa, { pr: oa });
        D.near(s.Qa, s.Pa, 'P = AC ' + money(s.Pa), { c: C.ink, op: oa, d: 20, prio: 0, ring: 90, size: S.ss });
      }
      if (showC) { D.dot(s.Qc, p.c, { c: C.ink, r: 9 }); D.label('loss ' + money(s.lossC), [{ x: S.x(s.Qc / 2), y: S.y((p.c + s.ACc) / 2) + 6, anchor: 'middle' }], { c: C.tRed, prio: 0, size: S.ss, ring: 40 }); }
      if (f.exploring) corner(D, S, reg === 'mono' ? 'profit ' + money(s.piM) + ', DWL ' + money(s.dwlM) : reg === 'ac' ? 'profit $0, DWL ' + money(s.dwlA) : 'loss ' + money(s.lossC) + ', DWL $0', { size: S.ss });
    },
    reveal: function () { return [['ghost', 0, 400], ['mono', 300, 1000], ['ac', 1600, 1000]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Unregulated price', money(g.Pm), money(s.Pm)], ['Lowest break-even price', money(g.Pa), money(s.Pa)], ['P = MC', '', 'loss ' + money(s.lossC)], ['DWL: unregulated, P = AC', '', money(s.dwlM) + ', ' + money(s.dwlA)]],
        why: 'On its own the firm sets MR = MC: Q = ' + num(s.Qm, 2) + ', <b>P = ' + money(s.Pm) + '</b>, profit ' + money(s.piM) + ' and DWL ' + money(s.dwlM) + '. At P = MC it would sell ' + num(s.Qc, 2) + ' but lose its whole fixed cost, ' + money(s.lossC) + '. ' +
          'Average-cost pricing sets P where demand cuts AC on the right: (' + p.a + ' - Q - ' + p.c + ')Q = ' + p.F + ' gives Q = ' + num(s.Qa, 2) + ', <b>P = ' + money(s.Pa) + '</b>. Zero profit, no subsidy, and DWL falls to ' + money(s.dwlA) + ': the second best.'
      };
    },
    explore: {
      init: function (f) { f.ex.reg = 'ac'; },
      hint: 'Click each regime to compare. There is no free lunch: efficiency needs a subsidy, viability leaves some DWL.',
      controls: [{ kind: 'seg', label: 'Regime', options: [['mono', 'Unregulated'], ['mc', 'Regulate: P = MC'], ['ac', 'Regulate: P = AC']], get: function (f) { return f.ex.reg; }, set: function (f, v) { f.ex.reg = v; } }],
      readout: function (f) {
        var s = f.sol, r = f.ex.reg;
        if (r === 'mono') return 'Unregulated: Q = ' + num(s.Qm, 2) + ', P = ' + money(s.Pm) + ', profit <b class="c-gold">' + money(s.piM) + '</b> (AC ' + money(s.ACm) + '), DWL <b class="c-red">' + money(s.dwlM) + '</b>. Efficient? No. Profitable? Yes.';
        if (r === 'mc') return 'P = MC: Q = ' + num(s.Qc, 2) + ', P = ' + money(f.p.c) + ', loss <b class="c-red">' + money(s.lossC) + '</b> (needs a subsidy), DWL $0. Efficient? Yes. Viable? No.';
        return 'P = AC: Q = ' + num(s.Qa, 2) + ', P = ' + money(s.Pa) + ', profit $0, DWL <b class="c-red">' + money(s.dwlA) + '</b>. Second best, and viable.';
      }
    }
  };

  /* =====================================================================
     8.11  Two-tier pricing and cross-subsidy
     ===================================================================== */
  function tiers(D, S, p, PA, op, labels) {
    var w = M.twotier.parts(p, PA), o = op == null ? 1 : op;
    if (w.QA > 0) D.area(PA >= w.ACR ? box(0, w.ACR, w.QA, PA) : box(0, PA, w.QA, w.ACR), { fill: PA >= w.ACR ? C.green : C.red, fo: 0.34, op: o, stroke: PA >= w.ACR ? C.green : C.red, sw: 1.5 });
    if (w.QR > w.QA) D.area(p.PR <= w.ACR ? box(w.QA, p.PR, w.QR, w.ACR) : box(w.QA, w.ACR, w.QR, p.PR), { fill: p.PR <= w.ACR ? C.red : C.green, fo: 0.32, op: o, stroke: p.PR <= w.ACR ? C.red : C.green, sw: 1.5 });
    if (labels) {
      if (w.QA > 0) inArea(D, S, (w.hi >= 0 ? '+' : '-') + money(Math.abs(w.hi)), w.QA / 2, (PA + w.ACR) / 2, { c: w.hi >= 0 ? C.tGreen : C.tRed, op: o, size: S.ss, more: [{ x: S.x(w.QA / 2), y: S.y(Math.max(PA, w.ACR)) - 10, anchor: 'middle' }] });
      if (w.QR > w.QA) D.label((w.lo >= 0 ? '+' : '-') + money(Math.abs(w.lo)), [{ x: S.x((w.QA + w.QR) / 2), y: S.y(Math.min(p.PR, w.ACR)) + 24, anchor: 'middle' }, { x: S.x(w.QR) + 12, y: S.y((p.PR + w.ACR) / 2) + 6, anchor: 'start' }], { c: w.lo >= 0 ? C.tGreen : C.tRed, op: o, size: S.ss, prio: 0, ring: 50 });
    }
    return w;
  }
  var f811 = {
    key: 'f811', num: '8.11', topic: 'Two-tier pricing and cross-subsidization', short: 'Two-tier pricing', model: M.twotier, axes: AX, narrowAspect: 1.15,
    question: function (f) { return 'Low-tier customers pay ' + money(f.p.PR) + '. How low can the high-tier price P_A go before the firm stops breaking even?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>P = ' + p.a + ' - Q</b>, <b>TC = ' + p.F + ' + ' + bnum(p.c) + 'Q</b>. The ' + num(s.QR, 2) + ' customers with the highest values are split: the first Q<sub>A</sub> = ' + p.a + ' - P<sub>A</sub> pay the high price P<sub>A</sub>, the rest pay P<sub>R</sub> = ' + money(p.PR) + '. ' +
        'Against average cost AC(' + num(s.QR, 2) + ') = ' + money(s.ACR) + ', the high tier earns the green area and the low tier loses the red one.';
    },
    steps: [{ kind: 'drag', label: 'The lowest break-even P_A', prompt: 'Slide P<sub>A</sub> down the demand curve until the green profit just covers the red loss.', check: function (f) { return Math.abs(f.g.PA - f.p.PA0) > 0.2 ? true : 'Slide it along the curve first.'; } }],
    kbdHint: KBD_LINE,
    initGuess: function (f) { return { PA: f.p.PA0 }; },
    handles: function (f) {
      var p = f.p, d = dm(p.a, 1);
      if (f.predicting) return [onDem(f, d, f.g.PA, function (f, P) { f.g.PA = P; }, { c: PLUM, step: 0, active: !f.done[0], lo: p.PR + 0.1, hi: p.a - 0.5 })];
      if (f.exploring) return [onDem(f, d, f.ex.PA, function (f, P) { f.ex.PA = P; }, { lo: p.PR + 0.1, hi: p.a - 0.5, active: !f.ex.touched })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, d = dm(p.a, 1), ac = acFn(p), bal = f.t('bal');
      var PA = f.predicting ? g.PA : f.exploring ? f.ex.PA : lerp(g.PA, s.PA, bal);
      var w = tiers(D, S, p, PA, b * (f.predicting ? 0.85 : 1), !f.predicting && (f.exploring || bal > 0.95));
      D.line(0, p.a, p.a, 0, { c: DEM, w: 5, pr: b });
      D.line(0, p.a, p.a / 2, 0, { c: MR, w: 2.5, dash: '10 7', pr: b, op: 0.55 });
      hline(D, S, p.c, { c: MCG, w: 3.5, dash: '10 6', pr: b });
      D.fn(ac, p.F / (S.Y - p.c) * 1.02, S.X, { c: ACC, w: 4.5, pr: b });
      D.line(0, w.ACR, w.QR, w.ACR, { c: ACC, w: 2.5, dash: '4 6', pr: b, layer: 'over' });
      if (b > 0.9) {
        lineLabel(D, S, 'D', d, [0.92, 0.86, 0.96]);
        D.label('MC', [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: C.tGreen, size: S.fs, prio: 0 });
        D.label('AC', D.along(ac, [0.14 * S.X, 0.2 * S.X, 0.26 * S.X, 0.1 * S.X].filter(function (q) { return ac(q) < S.Y * 0.95; }), 12), { c: ACT, size: S.fs });
        D.label('AC(Q_R) ' + money(w.ACR), [{ x: S.x(w.QR) + 10, y: S.y(w.ACR) + 6, anchor: 'start' }, { x: S.x(w.QR) + 10, y: S.y(w.ACR) - 10, anchor: 'start' }], { c: ACT, size: S.ss, prio: 0 });
      }
      // the low tier
      D.line(0, p.PR, w.QR, p.PR, { c: C.ink, w: 2.5, dash: '8 6', pr: b, layer: 'over' });
      D.dot(w.QR, p.PR, { c: C.ink, r: 7, pr: b });
      if (b > 0.5) D.yval(p.PR, 'P_R ' + money(p.PR), { c: C.ink, dy: 22 });
      var qa = qOf(d, PA);
      D.line(0, PA, qa, PA, { c: f.predicting ? PLUM : C.ink, w: 2.5, dash: '8 6', layer: 'over', reg: false });
      if (f.predicting) { D.yval(PA, 'P_A ' + money(PA), { c: PLUM, dy: -9 }); return; }
      if (f.ghostOn()) { D.ghost(qOf(d, g.PA), g.PA, { op: f.gOp() }); youTag(f, D, qOf(d, g.PA), g.PA); }
      D.dot(qa, PA, { c: C.ink, r: 9 });
      D.yval(PA, 'P_A ' + money(PA), { c: C.ink, dy: -9 });
      if (bal > 0.95 && !f.exploring) corner(D, S, 'green = red: net profit $0', { size: S.ss });
    },
    reveal: function () { return [['ghost', 0, 400], ['bal', 300, 1600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, mine = M.twotier.profit(p, g.PA);
      return {
        rows: [['Lowest break-even P<sub>A</sub>', money(g.PA), money(s.PA)], ['Net profit there', money(mine), '$0'], ['Green = red', '', money(s.green)]],
        why: 'Net profit is P<sub>A</sub>Q<sub>A</sub> + P<sub>R</sub>(Q<sub>R</sub> - Q<sub>A</sub>) - TC(Q<sub>R</sub>), which equals green minus red. Setting it to zero: P<sub>A</sub>&sup2; - ' + num(p.a + p.PR, 2) + 'P<sub>A</sub> + ' + num(p.PR * p.PR + p.F + p.c * p.a - p.c * p.PR, 2) + ' = 0, and the smaller root is <b>P<sub>A</sub> = ' + money(s.PA) + '</b>. ' +
          'Above it the high tier\'s markup over AC covers the low tier\'s shortfall (' + money(p.PR) + ' is below AC = ' + money(s.ACR) + '); below it the firm runs a loss.' +
          (p.PR === p.c ? ' With P<sub>R</sub> = MC the low tier adds nothing, so the answer equals the single P = AC price of Fig 8.10.' : '')
      };
    },
    explore: {
      init: function (f) { f.ex.PA = f.sol.PA; },
      hint: 'Drag P<sub>A</sub> along demand and step the low-tier price P<sub>R</sub>. Cross-subsidy works while green is at least red.',
      controls: function (f) {
        var p = f.p;
        return [{ kind: 'stepper', label: 'P_R', get: function (f) { return f.p.PR; }, set: function (f, v, fin) { f.p.PR = fin ? Math.round(v * 2) / 2 : v; if (f.ex.PA < f.p.PR + 0.1) f.ex.PA = f.p.PR + 0.1; }, step: 0.5, min: p.c, max: p.c + 5, fmt: money, dur: 300 }];
      },
      readout: function (f) {
        var p = f.p, w = M.twotier.parts(p, f.ex.PA), net = M.twotier.profit(p, f.ex.PA), r = M.twotier.root(p);
        return 'P<sub>A</sub> ' + money(f.ex.PA) + ': green <b class="c-green">' + money(w.green) + '</b>, red <b class="c-red">' + money(w.red) + '</b>, net <b>' + money(net) + '</b>. ' +
          (isFinite(r) && r > p.PR ? 'Break-even P<sub>A</sub> at this P<sub>R</sub>: ' + money(r) + '.' : 'No high-tier price breaks even at this P<sub>R</sub>.');
      }
    }
  };

  window.W8FIGS = [f81, f82, f83, f84, f85, f87, f88, f89, f810, f811];
})();
