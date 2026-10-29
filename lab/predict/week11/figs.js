/* Week 11 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Ported from the original prototype lab/week11/v5 (same questions and reveals, on the kit's flow).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week11-viz.html and the fig111 film: MB / demand blue, private cost green (11.1) or
 * orange (11.3), social cost red, social benefit green, tax and subsidy gold, deadweight loss red,
 * Firm A blue and Firm B orange, the factory's MB blue and the neighbor's MD red. Plum always means "you".
 * Keyboard: in multi-handle steps the current step's handle is listed first (see NOTES.md, kit focus). */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, seg = Kit.seg;
  var M = window.W11, PLUM = C.plum;

  // the current step's handle first, so keyboard focus lands on it (kit keeps the focused index)
  function activeFirst(hs) { return hs.filter(function (h) { return h.active; }).concat(hs.filter(function (h) { return !h.active; })); }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  function plus(c, v) { return c ? c + ' + ' + v : v; }          // "10 + Q" or "Q"
  function coef(k, v) { return (k === 1 ? '' : k) + v; }          // "2e" or "e"
  function sub(s) { return Kit.rich(s); }
  // a label beside the vertical edge of a deadweight-loss triangle (edge at x from yLo to yHi), apex at (ax, ay)
  function sideLabel(D, S, s, x, yLo, yHi, ax, o) {
    var px = S.x(x), right = x > ax, mid = S.y((yLo + yHi) / 2) + 6;
    return D.label(s, [{ x: px + (right ? 14 : -14), y: mid, anchor: right ? 'start' : 'end' }, { x: px + (right ? 14 : -14), y: S.y(yLo) + 24, anchor: right ? 'start' : 'end' },
      { x: px, y: S.y(Math.min(yLo, yHi)) + 30, anchor: 'middle' }, { x: px + (right ? 14 : -14), y: S.y(yHi) - 8, anchor: right ? 'start' : 'end' }], Object.assign({ size: S.ls, ring: 90 }, o || {}));
  }
  var AXQ = { xtitle: 'Quantity', ytitle: '$ per unit' };

  /* =====================================================================
     11.1  Negative externality and the Pigouvian tax (has a film)
     ===================================================================== */
  function taxNow(f) { return f.exploring ? f.ex.t : f.predicting ? 0 : f.p.m * f.t('tax'); }
  var f111 = {
    key: 'f111', num: '11.1', topic: 'Negative externality & the Pigouvian tax', short: 'Pigouvian tax', model: M.pigou, axes: AXQ,
    film: { name: 'fig111-pigou', label: 'Animation: negative externality and the Pigouvian tax', title: 'Watch first, 35 seconds',
      caption: 'With MB = 100 - Q, PMC = 10 + Q and $20 of harm per unit, the market makes 45 units, 10 more than the efficient 35, and leaves a $100 deadweight loss. A $20 tax lifts private cost onto SMC, so the market lands on 35 by itself. Then try it below.' },
    question: 'Where will the market end up, and where should it be?',
    setup: function (f) {
      var p = f.p;
      return 'Buyers value each unit along the <b class="c-blue">blue line, MB = ' + p.a + ' - Q</b>. Firms pay the <b class="c-green">green line, PMC = ' + plus(p.c, 'Q') +
        '</b>. Each unit also does <b>' + money(p.m) + ' of harm</b> to people nearby (the marginal external cost, MEC), a cost the firms never pay.';
    },
    steps: [
      { kind: 'place', key: 'mk', handle: false, snap: 1, label: 'Where the market ends up', prompt: 'Tap the graph where buyers and sellers will settle. Drag to adjust.',
        kstart: function (f) { return { x: Math.round(0.25 * f.p.a), y: Math.round(0.5 * f.dom.Y) }; } },
      { kind: 'place', key: 'op', handle: false, snap: 1, label: 'Where it should be', prompt: function (f) { return 'Now tap where output should be, once the ' + money(f.p.m) + ' of harm per unit counts.'; },
        kstart: function (f) { return { x: Math.round(0.15 * f.p.a), y: Math.round(0.6 * f.dom.Y) }; } },
      { kind: 'drag', label: 'The tax that fixes it', prompt: 'Drag the gold handle up to the tax per unit that moves the market to where it should be.',
        check: function (f) { return f.g.tm ? true : 'Drag the gold handle up first.'; } }
    ],
    kbdHint: 'Keyboard: Enter drops a point, arrow keys move it, Enter confirms. Then arrow keys raise the tax.',
    initGuess: function () { return { mk: null, op: null, t: 0, tm: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g, xq = M.pigou.xq(p), top = Math.max(0, S.Y - p.c - xq);
      function taxH(get, setv, col, step, active) {
        return { x: xq, y: p.c + xq + get(), c: col, grip: 'v', step: step, active: active,
          set: function (f, X, Y) { setv(f, Math.round(clamp(Y - p.c - xq, 0, top))); },
          key: function (f, dx, dy) { setv(f, clamp(get() + (dy || dx), 0, top)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
      }
      if (f.predicting) {
        var hs = [];
        if (g.mk) hs.push({ x: g.mk.x, y: g.mk.y, snap: 1, step: 0, active: f.cur === 0, noAutoDone: true, set: function (f, X, Y) { f.g.mk = { x: X, y: Y }; } });
        if (g.op) hs.push({ x: g.op.x, y: g.op.y, snap: 1, step: 1, active: f.cur === 1, noAutoDone: true, set: function (f, X, Y) { f.g.op = { x: X, y: Y }; } });
        if (f.cur >= 2 || f.done[2]) hs.push(taxH(function () { return f.g.t; }, function (f, v) { f.g.t = v; f.g.tm = true; }, C.gold, 2, f.cur === 2));
        return activeFirst(hs);
      }
      if (f.exploring) return [taxH(function () { return f.ex.t; }, function (f, v) { f.ex.t = v; }, C.gold, null, true)];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, X = S.X;
      var MB = function (q) { return p.a - q; }, PMC = function (q) { return p.c + q; }, SMC = function (q) { return p.c + p.m + q; };
      var t = taxNow(f), w = M.pigou.withTax(p, t), xq = M.pigou.xq(p);
      var smc = f.t('smc'), mk = f.t('mk'), op = f.t('op'), dw = f.t('dwl');
      var showTax = (f.predicting && (f.cur >= 2 || f.done[2])) || (f.truth && t > 0.2);
      var tLine = f.predicting ? g.t : t;
      // deadweight loss, following the market as the tax moves it
      if (f.truth && dw > 0 && Math.abs(w.Q - s.Qs) > 0.05)
        D.area([[s.Qs, s.Ps], [w.Q, MB(w.Q)], [w.Q, SMC(w.Q)]], { fill: C.red, fo: 0.3, stroke: C.red, sw: 2, op: dw });
      D.line(0, p.a, p.a, 0, { c: C.blue, w: 5, pr: b });
      D.line(0, p.c, X, p.c + X, { c: C.green, w: 5, pr: b });
      if (smc > 0) D.line(0, p.c + p.m, X, p.c + p.m + X, { c: C.red, w: 5, pr: smc });
      if (showTax && tLine > 0.2) D.line(0, p.c + tLine, X, p.c + tLine + X, { c: C.gold, w: 3.5, dash: '11 9' });
      if (f.ghostOn() && g.tm && Math.abs(g.t - p.m) > 0.5) D.line(0, p.c + g.t, X, p.c + g.t + X, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp() });
      // the tax arrow at xq, from PMC up by the tax
      var tA = f.predicting ? (showTax ? g.t : -1) : t;
      if (tA > 0.2) D.arrow(xq, PMC(xq), xq, PMC(xq) + tA, { c: C.gold, w: 4 });
      if (tA >= 0 && (f.predicting || t > 0.5)) {
        var ax = S.x(xq), ay0 = S.y(PMC(xq)), ay1 = S.y(PMC(xq) + Math.max(0, tA)), my = (ay0 + ay1) / 2;
        D.label('tax ' + money(Math.round(tA)), [{ x: ax + 16, y: my + 7, anchor: 'start' }, { x: ax - 16, y: my + 7, anchor: 'end' }, { x: ax + 14, y: ay0 + 26, anchor: 'start' },
          { x: ax, y: ay1 - 26, anchor: 'middle' }, { x: ax, y: ay0 + 30, anchor: 'middle' }], { c: C.tGold, size: S.ls, prio: 0, ring: 90 });
      }
      // truth: Q*, the market, the deadweight loss
      if (f.truth) {
        if (mk > 0) D.xval(s.QE, 'Q_E = ' + num(s.QE), { c: C.soft, op: mk, anchor: 'start', dx: 8 });
        if (op > 0) {
          D.line(s.Qs, s.Ps, s.Qs, 0, { c: C.red, w: 2.5, dash: '6 6', pr: op, noclip: true, layer: 'over' });
          D.xval(s.Qs, 'Q* = ' + num(s.Qs), { c: C.tRed, op: op, anchor: 'end', dx: -8 });
          D.dot(s.Qs, s.Ps, { c: C.red, r: 10, pr: op });
        }
        if (mk > 0 && Math.abs(w.Q - s.Qs) > 0.3) {
          if (Math.abs(w.Q - s.QE) > 0.3) D.line(w.Q, w.P, w.Q, 0, { c: C.soft, w: 2.5, dash: '6 6', layer: 'over' });
          D.dot(w.Q, w.P, { c: C.ink, r: 10, pr: mk });
        }
        var dwOp = f.exploring ? 1 : dw * (1 - f.t('tax'));
        if (dwOp > 0.05 && w.dwl > 0.5) sideLabel(D, S, 'DWL ' + money(f.exploring ? w.dwl : s.dwl), w.Q, MB(w.Q), SMC(w.Q), s.Qs, { c: C.tRed, op: dwOp });
      }
      if (b > 0.85) {
        D.curveLabel('MB', MB, [0.88, 0.8, 0.7, 0.15, 0.25], { c: C.tBlue });
        D.curveLabel(S.narrow ? 'PMC' : 'PMC (supply)', PMC, [0.72, 0.82, 0.62, 0.5, 0.4], { c: C.tGreen, pref: 'below' });
      }
      if (smc > 0.85) D.curveLabel(f.truth && Math.abs(t - p.m) < 0.5 && t > 0.5 ? 'PMC + tax = SMC' : 'SMC', SMC, [0.5, 0.42, 0.6, 0.32, 0.7, 0.22], { c: C.tRed });
      // the student's points
      if (f.predicting) {
        if (g.mk) D.near(g.mk.x, g.mk.y, 'market', { c: PLUM, size: S.ls, d: 22, prio: 0 });
        if (g.op) D.near(g.op.x, g.op.y, 'best', { c: PLUM, size: S.ls, d: 22, prio: 0 });
      } else if (f.ghostOn()) {
        if (g.mk) { D.ghost(g.mk.x, g.mk.y, { op: f.gOp() }); youTag(f, D, g.mk.x, g.mk.y, 'you: market'); }
        if (g.op) { D.ghost(g.op.x, g.op.y, { op: f.gOp() }); youTag(f, D, g.op.x, g.op.y, 'you: best'); }
      }
    },
    reveal: function () { return [['ghost', 0, 450], ['smc', 250, 900], ['mk', 1000, 450], ['op', 1400, 450], ['dwl', 1850, 600], ['tax', 3200, 1400]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [
          ['Market quantity', g.mk ? num(g.mk.x) : '-', num(s.QE)],
          ['Best quantity, Q*', g.op ? num(g.op.x) : '-', num(s.Qs)],
          ['Tax per unit', money(g.t), money(s.tax)]
        ],
        why: 'Firms stop where their own cost meets MB: ' + plus(p.c, 'Q') + ' = ' + p.a + ' - Q at <b>Q<sub>E</sub> = ' + num(s.QE) + '</b>, price ' + money(s.PE) + '. Count the ' + money(p.m) +
          ' of harm and SMC meets MB sooner, at <b>Q* = ' + num(s.Qs) + '</b>, price ' + money(s.Ps) + '. The units in between cost society more than buyers value them: a deadweight loss of &frac12; &times; ' +
          num(s.QE - s.Qs) + ' &times; ' + money(p.m) + ' = <b>' + money(s.dwl) + '</b>. A tax of <b>' + money(s.tax) + '</b> a unit, exactly the MEC, lifts PMC onto SMC: buyers pay ' + money(s.Ps) + ', firms keep ' + money(s.keep) + ', and the loss is gone.'
      };
    },
    explore: {
      init: function (f) { f.ex.t = f.p.m; },
      hint: 'Drag the gold handle to try any tax, or change the harm each unit does (MEC). If the tax matches the harm, it follows along.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'Harm per unit, MEC', get: function (f) { return f.p.m; }, step: 2, min: 0, max: M.pigou.mMax(f.p), fmt: money, dur: 400,
          set: function (f, v) { if (Math.abs(f.ex.t - f.p.m) < 1e-6) f.ex.t = v; f.p.m = v; } }];
      },
      readout: function (f) {
        var p = f.p, t = Math.round(f.ex.t), w = M.pigou.withTax(p, f.ex.t), s = f.sol;
        if (Math.abs(f.ex.t - p.m) < 0.5) return 'Tax <b>' + money(t) + '</b> = MEC: the market makes <b>' + num(w.Q) + '</b>, which is Q*. <span class="good">No deadweight loss.</span>' +
          (p.m === 0 ? ' With no harm, the market was already efficient.' : '');
        return 'Tax <b>' + money(t) + '</b>: the market makes <b>' + num(w.Q) + '</b>, Q* is ' + num(s.Qs) + '. Deadweight loss <b class="bad">' + money(w.dwl) + '</b>. ' +
          (f.ex.t < p.m ? 'Still too much output.' : 'Now too little.');
      }
    }
  };

  /* =====================================================================
     11.2  Cap-and-trade: equalizing marginal abatement cost
     ===================================================================== */
  function splitText(D, S, x, T, op, ls) {
    D.text(S.x(x) - 10, S.y0 - 12, 'A ' + num(x), { size: ls, c: C.tBlue, anchor: 'end', op: op, reg: true });
    D.text(S.x(x) + 10, S.y0 - 12, 'B ' + num(T - x), { size: ls, c: C.tOrange, anchor: 'start', op: op, reg: true });
  }
  function divider(D, S, x, o) { D.plineP(S.x(x), S.y0, S.x(x), S.y1 + 10, Object.assign({ w: 3.5 }, o)); }
  // a label inside a data triangle, at its centroid, if it fits
  function inTri(D, S, s, pts, o) {
    var cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3, size = (o && o.size) || S.ss;
    var xs = pts.map(function (q) { return S.x(q[0]); }), ys = pts.map(function (q) { return S.y(q[1]); });
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs), h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    if (w < 1.7 * Kit.tw(s, size) || h < 2.6 * size || cy > 0.96 * S.Y) return;
    D.label(s, [{ x: S.x(cx), y: S.y(cy) + size * 0.35, anchor: 'middle' }, { x: S.x(cx), y: S.y(cy) + size * 1.3, anchor: 'middle' }], Object.assign({ prio: 0, ring: 1 }, o || {}));
  }
  var f112 = {
    key: 'f112', num: '11.2', topic: 'Cap-and-trade: equalizing marginal abatement cost', short: 'Cap and trade', model: M.cap,
    axes: function (f) { var n = f.S && f.S.narrow; return { xtitle: n ? 'A abates e_A, B the rest' : 'Units Firm A abates, e_A (Firm B abates the rest)', ytitle: '$ per unit abated' }; },
    question: 'Which split of the cleanup is cheapest?',
    setup: function (f) {
      var p = f.p;
      return 'Two firms must cut <b>' + p.T + ' units</b> of pollution between them. One more unit costs <b class="c-blue">Firm A MAC<sub>A</sub> = ' + coef(p.al, 'e<sub>A</sub>') +
        '</b> and <b class="c-orange">Firm B MAC<sub>B</sub> = ' + coef(p.be, 'e<sub>B</sub>') + '</b> dollars, where e is how much that firm has already cut. Every unit A abates is one B does not have to.';
    },
    steps: [{ kind: 'drag', label: 'Your split', prompt: 'Drag the plum divider. Firm A abates everything to its left, Firm B the rest.',
      check: function (f) { return f.g.moved ? true : 'Drag the divider left or right first.'; } }],
    kbdHint: 'Keyboard: arrow keys move the divider one unit (Shift for five), Enter confirms.',
    initGuess: function (f) { return { x: f.p.T / 2, moved: false }; },
    handles: function (f, S) {
      var T = f.p.T;
      function mk(get, setv, col, step, active) {
        var x = S.x(get());
        return { px: [x, S.y0 - 52], c: col, grip: 'h', step: step, active: active,
          hit: function (pt) { return pt.y > S.y1 - 10 && pt.y < S.y0 + 10 ? Math.abs(pt.x - x) : 1e9; },
          set: function (f, X) { setv(f, Math.round(clamp(X, 0, T))); },
          key: function (f, dx, dy) { setv(f, clamp(get() + (dx || dy), 0, T)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
      }
      if (f.predicting) return [mk(function () { return f.g.x; }, function (f, v) { f.g.x = v; f.g.moved = true; }, PLUM, 0, f.cur === 0)];
      if (f.exploring) return [mk(function () { return f.ex.x; }, function (f, v) { f.ex.x = v; f.ex.share = v / f.p.T; }, C.ink, null, true)];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, T = p.T, ls = S.ls;
      var A = function (x) { return p.al * x; }, B = function (x) { return p.be * (T - x); };
      var xs = f.exploring ? f.ex.x : s.eA, cost = f.t('cost'), opt = f.t('opt'), price = f.t('price'), waste = f.t('waste');
      if (cost > 0) {
        D.area([[0, 0], [xs, 0], [xs, A(xs)]], { fill: C.blue, fo: 0.16, op: cost });
        D.area([[xs, 0], [T, 0], [xs, B(xs)]], { fill: C.orange, fo: 0.16, op: cost });
      }
      var live = f.exploring && f.ex.touched, wx = live ? f.ex.x : g.x;
      var showWaste = f.truth && waste > 0 && Math.abs(wx - s.eA) > 0.4 && (live || f.ghostOn());
      if (showWaste) D.area([[wx, A(wx)], [wx, B(wx)], [s.eA, s.lam]], { fill: C.red, fo: 0.38, stroke: C.red, sw: 2, op: waste });
      D.line(0, 0, T, A(T), { c: C.blue, w: 5, pr: b });
      D.line(T, 0, 0, B(0), { c: C.orange, w: 5, pr: b });
      if (f.predicting) { divider(D, S, g.x, { c: PLUM }); splitText(D, S, g.x, T, 1, ls); }
      else if (f.exploring) {
        if (f.ghostOn()) divider(D, S, g.x, { c: PLUM, w: 3, dash: '5 7', op: 0.6 });
        divider(D, S, f.ex.x, { c: C.ink }); splitText(D, S, f.ex.x, T, 1, ls);
        if (Math.abs(f.ex.x - s.eA) > 0.4) { D.dot(f.ex.x, A(f.ex.x), { c: C.blue, r: 7 }); D.dot(f.ex.x, B(f.ex.x), { c: C.orange, r: 7 }); }
      } else {
        if (f.ghostOn()) divider(D, S, g.x, { c: PLUM, w: 3, dash: '5 7', op: 0.6 * f.gOp() });
        if (opt > 0) { D.plineP(S.x(s.eA), S.y0, S.x(s.eA), lerp(S.y0, S.y(s.lam), opt), { c: C.ink, w: 3.5 }); splitText(D, S, s.eA, T, opt, ls); }
      }
      if (price > 0) {
        D.line(0, s.lam, T, s.lam, { c: C.gold, w: 3, dash: '9 7', pr: price });
        var py = S.y(s.lam), lab = (S.narrow ? 'permit ' : 'permit price ') + 'λ* = ' + money(s.lam);
        D.label(lab, [{ x: S.x0 + 10, y: py - 10, anchor: 'start' }, { x: S.x1 - 8, y: py - 10, anchor: 'end' }, { x: S.x0 + 10, y: py + 26, anchor: 'start' }, { x: S.x1 - 8, y: py + 26, anchor: 'end' }],
          { c: C.tGold, size: ls, op: price, prio: 0 });
      }
      if (opt > 0.6) D.dot(s.eA, s.lam, { c: C.ink, r: 9, pr: f.exploring ? 1 : seg(opt, 0.6, 1) });
      if (cost > 0.5) {
        inTri(D, S, money(0.5 * p.al * xs * xs), [[0, 0], [xs, 0], [xs, A(xs)]], { c: C.tBlue, op: cost });
        inTri(D, S, money(0.5 * p.be * (T - xs) * (T - xs)), [[xs, 0], [T, 0], [xs, B(xs)]], { c: C.tOrange, op: cost });
      }
      if (b > 0.85) {
        // candidates only on the visible part of each line
        var hiA = Math.min(T, 0.95 * S.Y / p.al) / T, loB = Math.max(0, T - 0.95 * S.Y / p.be) / T;
        D.curveLabel('MAC_A = ' + coef(p.al, 'e_A'), A, [0.85, 0.7, 0.55, 0.4, 0.25].map(function (t) { return t * hiA; }), { c: C.tBlue });
        D.curveLabel('MAC_B = ' + coef(p.be, 'e_B'), B, [0.15, 0.3, 0.45, 0.6, 0.75].map(function (t) { return loB + t * (1 - loB); }), { c: C.tOrange });
      }
      if (showWaste && waste > 0.6 && Math.abs(S.x(wx) - S.x(s.eA)) > 24) {
        var top = Math.max(A(wx), B(wx));
        D.label((live ? 'wasted ' : 'extra cost ') + money(Math.round(M.cap.cost(p, wx) - s.ct)), [{ x: S.x((wx + s.eA) / 2), y: S.y(top) - 14, anchor: 'middle' },
          { x: S.x(wx), y: S.y(top) - 14, anchor: wx < s.eA ? 'start' : 'end' }, { x: S.x(wx) + (wx < s.eA ? -12 : 12), y: S.y((A(wx) + B(wx)) / 2) + 6, anchor: wx < s.eA ? 'end' : 'start' }],
          { c: C.tRed, size: ls, op: waste, prio: 0 });
      }
    },
    reveal: function () { return [['ghost', 0, 450], ['opt', 300, 900], ['price', 1200, 700], ['cost', 1700, 700], ['waste', 2300, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, cheap = s.cheap, dear = cheap === 'A' ? 'B' : 'A';
      return {
        rows: [
          ['Firm A abates', num(g.x), num(s.eA)],
          ['Firm B abates', num(p.T - g.x), num(s.eB)],
          ['Total cost', money(M.cap.cost(p, g.x)), money(s.ct)]
        ],
        why: 'The cheapest split is where the two MACs are equal: ' + coef(p.al, '') + (p.al === 1 ? '' : ' &times; ') + num(s.eA) + ' = ' + coef(p.be, '') + (p.be === 1 ? '' : ' &times; ') + num(s.eB) + ' = <b>' + money(s.lam) +
          '</b>, the permit price &lambda;*. If one firm’s next unit were cheaper, moving a unit to it would save money. So Firm ' + cheap + ', the cheaper cleaner, does most of the work and Firm ' + dear +
          ' little. Equal shares would cost ' + money(s.eq) + '; trading permits gets the same cleanup for <b>' + money(s.ct) + '</b>, ' + money(s.save) + ' (' + Math.round(100 * s.pct) + '%) less.'
      };
    },
    explore: {
      init: function (f) { f.ex.x = f.sol.eA; f.ex.share = f.sol.eA / f.p.T; },
      hint: 'Drag the divider: the red sliver is money wasted, and the dots show each firm’s MAC there. Change the total cleanup required.',
      controls: [{ kind: 'stepper', label: 'Total abatement', get: function (f) { return f.p.T; }, step: 5, min: 20, max: 150, fmt: function (v) { return num(v) + ' units'; }, dur: 450,
        set: function (f, v) { f.p.T = v; f.dom = M.cap.domain(f.p); f.ex.x = Math.round(clamp(f.ex.share, 0, 1) * v); } }],
      readout: function (f) {
        var p = f.p, s = f.sol, x = f.ex.x, cst = M.cap.cost(p, x), extra = cst - s.ct;
        var head = 'A abates <b>' + num(x) + '</b>, B abates <b>' + num(p.T - x) + '</b>. ';
        if (extra < 0.5) return head + 'Both MACs are <b>' + money(s.lam) + '</b>, the permit price. Total cost <b>' + money(Math.round(cst)) + '</b>, <span class="good">the cheapest possible.</span>';
        return head + 'Next unit: A ' + money(p.al * x) + ', B ' + money(p.be * (p.T - x)) + '. Total cost <b>' + money(Math.round(cst)) + '</b>, <b class="bad">' + money(Math.round(extra)) + '</b> more than the cheapest split.';
      }
    }
  };

  /* =====================================================================
     11.3  Positive externality and the Pigouvian subsidy
     ===================================================================== */
  var NB = 40;
  function subNow(f) { return f.exploring ? f.ex.s : f.predicting ? 0 : f.p.m * f.t('sub'); }
  var f113 = {
    key: 'f113', num: '11.3', topic: 'Positive externality & the Pigouvian subsidy', short: 'Pigouvian subsidy', model: M.pos, axes: AXQ,
    question: 'Draw the social benefit curve. Where should output be?',
    setup: function (f) {
      var p = f.p;
      return 'Buyers value each dose of a vaccine along the <b class="c-blue">blue line, MB = ' + p.a + ' - Q</b>, and it costs the <b class="c-orange">orange line, MC = ' + plus(p.c, 'Q') +
        '</b>. Each dose also protects other people, worth <b>' + money(p.m) + '</b> to them (the marginal external benefit, MEB), which buyers never count.';
    },
    steps: [
      { kind: 'draw', key: 'msb', bins: NB, label: 'The social benefit curve, MSB', prompt: 'Draw it with your finger or mouse, across the graph: what is each dose worth to everyone?',
        kstart: function (f, x) { return f.p.a - x; },
        check: function (f) { return f.coverage('msb') >= 0.45 ? true : 'Keep going: draw across more of the graph.'; } },
      { kind: 'drag', label: 'Where output should be, Q*', prompt: 'Drag the plum marker to the quantity society should choose.' }
    ],
    kbdHint: 'Keyboard: arrow keys raise or lower a straight line, Enter accepts it. Then arrow keys move the marker, Enter confirms.',
    initGuess: function (f) { return { q: f.sol.QE }; },
    scoreInput: function (f) { return { draw: f.drawn('msb'), q: f.g.q }; },
    handles: function (f, S) {
      var p = f.p, xq = 0.2 * S.X;
      if (f.predicting && (f.cur >= 1 || f.done[1])) {
        var x = S.x(f.g.q);
        return [{ px: [x, S.y1 + 18], grip: 'h', step: 1, active: f.cur === 1,
          hit: function (pt) { return pt.y > S.y1 - 12 && pt.y < S.y0 + 10 ? Math.abs(pt.x - x) : 1e9; },
          set: function (f, X) { f.g.q = Math.round(clamp(X, 0, f.dom.X)); },
          key: function (f, dx, dy) { f.g.q = clamp(f.g.q + (dx || dy), 0, f.dom.X); } }];
      }
      if (f.exploring) {
        var top = Math.max(0, S.Y - (p.a - xq));
        return [{ x: xq, y: p.a - xq + f.ex.s, c: C.gold, grip: 'v', active: true,
          set: function (f, X, Y) { f.ex.s = Math.round(clamp(Y - (p.a - xq), 0, top)); },
          key: function (f, dx, dy) { f.ex.s = clamp(f.ex.s + (dy || dx), 0, top); f.ex.touched = true; f.resolve(); } }];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, X = S.X, xq = 0.2 * X;
      var MB = function (q) { return p.a - q; }, MC = function (q) { return p.c + q; }, MSB = function (q) { return p.a + p.m - q; };
      var sb = subNow(f), w = M.pos.withSub(p, sb), msb = f.t('msb'), mk = f.t('mk'), op = f.t('op'), dw = f.t('dwl');
      if (f.truth && dw > 0 && Math.abs(w.Q - s.Qs) > 0.05)
        D.area([[w.Q, MC(w.Q)], [w.Q, MSB(w.Q)], [s.Qs, s.Ps]], { fill: C.red, fo: 0.3, stroke: C.red, sw: 2, op: dw });
      D.line(0, p.a, p.a, 0, { c: C.blue, w: 5, pr: b });
      D.line(0, p.c, X, p.c + X, { c: C.orange, w: 5, pr: b });
      var runs = D.drawing('msb');
      if (msb > 0) D.line(0, p.a + p.m, p.a + p.m, 0, { c: C.green, w: 5, pr: msb });
      if (f.truth && sb > 0.2) {
        D.line(0, p.a + sb, p.a + sb, 0, { c: C.gold, w: 3.5, dash: '11 9' });
        D.arrow(xq, MB(xq), xq, MB(xq) + sb, { c: C.gold, w: 4 });
        if (sb > 0.5) {
          var ax = S.x(xq), at = S.y(MB(xq) + sb), af = S.y(MB(xq));
          D.label('subsidy ' + money(Math.round(sb)), [{ x: ax + 16, y: (at + af) / 2 + 7, anchor: 'start' }, { x: ax - 16, y: (at + af) / 2 + 7, anchor: 'end' }, { x: ax + 18, y: at - 10, anchor: 'start' },
            { x: ax, y: at - 24, anchor: 'middle' }], { c: C.tGold, size: S.ls, prio: 0, ring: 90 });
        }
      }
      if (f.truth) {
        if (mk > 0) D.xval(s.QE, 'Q_E = ' + num(s.QE), { c: C.soft, op: mk, anchor: 'end', dx: -8 });
        if (op > 0) {
          D.line(s.Qs, s.Ps, s.Qs, 0, { c: C.green, w: 2.5, dash: '6 6', pr: op, noclip: true, layer: 'over' });
          D.xval(s.Qs, 'Q* = ' + num(s.Qs), { c: C.tGreen, op: op, anchor: 'start', dx: 8 });
          D.dot(s.Qs, s.Ps, { c: C.green, r: 10, pr: op });
        }
        if (mk > 0 && Math.abs(w.Q - s.Qs) > 0.3) {
          if (Math.abs(w.Q - s.QE) > 0.3) D.line(w.Q, w.P, w.Q, 0, { c: C.soft, w: 2.5, dash: '6 6', layer: 'over' });
          D.dot(w.Q, w.P, { c: C.ink, r: 10, pr: mk });
        }
        var dwOp = f.exploring ? 1 : dw * (1 - f.t('sub'));
        if (dwOp > 0.05 && w.dwl > 0.5) sideLabel(D, S, 'DWL ' + money(f.exploring ? w.dwl : s.dwl), w.Q, MC(w.Q), MSB(w.Q), s.Qs, { c: C.tRed, op: dwOp });
      }
      // the student's Q* marker
      if (f.predicting && (f.cur >= 1 || f.done[1])) {
        D.plineP(S.x(g.q), S.y0, S.x(g.q), S.y1 + 18, { c: PLUM, w: 3, dash: '7 6' });
        D.xval(g.q, 'your Q* ' + num(g.q), { c: PLUM, anchor: 'start', dx: 8 });
      } else if (f.ghostOn()) {
        D.plineP(S.x(g.q), S.y0, S.x(g.q), S.y1 + 18, { c: PLUM, w: 2.5, dash: '3 7', op: 0.6 * f.gOp(), reg: false });
        if (f.gOp() > 0.5) D.label('your Q*', [{ x: S.x(g.q) + 8, y: S.y1 + 24, anchor: 'start' }, { x: S.x(g.q) - 8, y: S.y1 + 24, anchor: 'end' }], { c: PLUM, size: S.ss, op: 0.85 });
      }
      if (b > 0.85) {
        D.curveLabel('MB', MB, [0.88, 0.8, 0.72, 0.62], { c: C.tBlue, pref: 'below' });
        D.curveLabel('MC', MC, [0.72, 0.82, 0.62, 0.5, 0.4, 0.3], { c: C.tOrange, pref: 'below' });
      }
      if (msb > 0.85) D.curveLabel(S.narrow ? 'MSB' : 'MSB = MB + MEB', MSB, [0.8, 0.72, 0.88, 0.62, 0.2, 0.3], { c: C.tGreen });
      if (f.predicting && runs.length && !f.drag) {
        var lr = runs[runs.length - 1], lp = lr[lr.length - 1];
        D.label('your MSB', D.aroundP(lp[0], lp[1], 16), { c: PLUM, size: S.ls });
      }
    },
    reveal: function () { return [['ghost', 0, 450], ['msb', 250, 1000], ['mk', 1100, 450], ['op', 1500, 450], ['dwl', 1950, 600], ['sub', 3200, 1400]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, sc = f.result;
      var gap = sc && sc.meanErr != null ? (sc.meanErr < 1 ? 'on it' : money(Math.round(sc.meanErr)) + ' off') : '-';
      return {
        rows: [
          ['Your MSB curve', gap, money(p.m) + ' above MB'],
          ['Best quantity, Q*', num(g.q), num(s.Qs)],
          ['Subsidy that fixes it', '', money(s.sub)]
        ],
        why: 'Social benefit is private benefit plus the ' + money(p.m) + ' others get, so MSB = MB + MEB sits ' + money(p.m) + ' above MB everywhere. The market stops at <b>Q<sub>E</sub> = ' + num(s.QE) +
          '</b>, where MB meets MC, but society wants <b>Q* = ' + num(s.Qs) + '</b>, where MSB meets MC. The doses in between are worth more than they cost: a deadweight loss of <b>' + money(s.dwl) +
          '</b>. A subsidy of <b>' + money(s.sub) + '</b> a dose, exactly the MEB, lifts MB onto MSB and closes the gap.'
      };
    },
    explore: {
      init: function (f) { f.ex.s = f.p.m; },
      hint: 'Drag the gold handle to try any subsidy, or change how much each dose helps others (MEB). If the subsidy matches, it follows along.',
      controls: [{ kind: 'stepper', label: 'Benefit to others, MEB', get: function (f) { return f.p.m; }, step: 2, min: 0, max: M.pos.mMax, fmt: money, dur: 400,
        set: function (f, v) { if (Math.abs(f.ex.s - f.p.m) < 1e-6) f.ex.s = v; f.p.m = v; } }],
      readout: function (f) {
        var p = f.p, s = f.sol, sb = Math.round(f.ex.s), w = M.pos.withSub(p, f.ex.s);
        if (Math.abs(f.ex.s - p.m) < 0.5) return 'Subsidy <b>' + money(sb) + '</b> = MEB: output is <b>' + num(w.Q) + '</b>, which is Q*. <span class="good">No deadweight loss.</span>' +
          (p.m === 0 ? ' With no spillover, the market was already efficient.' : '');
        return 'Subsidy <b>' + money(sb) + '</b>: output is <b>' + num(w.Q) + '</b>, Q* is ' + num(s.Qs) + '. Deadweight loss <b class="bad">' + money(w.dwl) + '</b>. ' +
          (f.ex.s < p.m ? 'Still too little.' : 'Now too much.');
      }
    }
  };

  /* =====================================================================
     11.4  Public goods and the free-rider problem
     ===================================================================== */
  var CW = M.pub.cols, HW = CW.w / 2;
  function box(xc, y0, y1) { return [[xc - HW, y0], [xc + HW, y0], [xc + HW, y1], [xc - HW, y1]]; }
  function outcomeText(total, v, c) { return v >= c ? 'built' : total > c ? 'worth it, not built' : 'not worth it'; }
  var f114 = {
    key: 'f114', num: '11.4', topic: 'Public goods & the free-rider problem', short: 'Free riders', model: M.pub,
    axes: { xtitle: '', ytitle: 'Cost of the light ($)', zero: true }, narrowAspect: 1.3,
    question: 'When is the streetlight worth building, and when does someone actually buy it?',
    setup: function (f) {
      var p = f.p;
      return '<b>' + p.N + ' neighbors</b> share a street. Each would pay up to <b class="c-blue">' + money(p.v) + '</b> for a streetlight. Once it is up, everyone gets the light, ' +
        'whether or not they paid. Each neighbor decides on her own whether to buy it.';
    },
    steps: [
      { kind: 'drag', label: 'Worth building up to', prompt: 'Drag the left plum bar to the highest cost at which the light is still worth building for the street as a whole.',
        check: function (f) { return f.g.mw ? true : 'Drag the left bar up or down first.'; } },
      { kind: 'drag', label: 'Someone buys it alone up to', prompt: 'Now the right bar: the highest cost at which one neighbor would still buy it on her own.',
        check: function (f) { return f.g.mb ? true : 'Drag the right bar up or down first.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys raise or lower the highlighted bar by $10 (Shift for $50), Enter confirms.',
    initGuess: function (f) { var y = Math.round(0.3 * f.dom.Y / 10) * 10; return { w: y, b: y, mw: false, mb: false }; },
    handles: function (f, S) {
      function bar(xc, get, setv, step, active, col) {
        return { x: xc, y: get(), grip: 'v', step: step, active: active, c: col,
          set: function (f, X, Y) { setv(f, clamp(Math.round(Y / 10) * 10, 0, S.Y)); },
          key: function (f, dx, dy) { setv(f, clamp(get() + 10 * (dy || dx), 0, S.Y)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
      }
      if (f.predicting) {
        var hs = [bar(CW.worth, function () { return f.g.w; }, function (f, v) { f.g.w = v; f.g.mw = true; }, 0, f.cur === 0)];
        if (f.cur >= 1 || f.done[1]) hs.push(bar(CW.alone, function () { return f.g.b; }, function (f, v) { f.g.b = v; f.g.mb = true; }, 1, f.cur === 1));
        return activeFirst(hs);
      }
      if (f.exploring) {
        var hc = bar(9.55, function () { return f.p.c; }, function (f, v) { f.p.c = clamp(v, 10, 0.94 * S.Y); }, null, true, C.ink);
        return [hc];
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), ss = S.ss;
      var st = f.t('stack'), al = f.t('alone'), tp = f.t('tops'), ct = f.t('cost'), gp = f.t('gap');
      // empty column slots and their captions
      D.area(box(CW.worth, 0, S.Y), { fill: C.grey, fo: 0.07, op: b });
      D.area(box(CW.alone, 0, S.Y), { fill: C.grey, fo: 0.07, op: b });
      D.text(S.x(CW.worth), S.y0 + 26, S.narrow ? 'Worth building' : 'Worth building up to', { anchor: 'middle', size: ss, c: C.soft, halo: false });
      D.text(S.x(CW.alone), S.y0 + 26, S.narrow ? 'Bought alone' : 'Someone buys it alone up to', { anchor: 'middle', size: ss, c: C.soft, halo: false });
      if (f.predicting) {
        [[CW.worth, g.w, 0], [CW.alone, g.b, 1]].forEach(function (q) {
          if (q[2] === 1 && !(f.cur >= 1 || f.done[1])) return;
          D.area(box(q[0], 0, q[1]), { fill: PLUM, fo: 0.16 });
          D.line(q[0] - HW, q[1], q[0] + HW, q[1], { c: PLUM, w: 4 });
          D.label(money(q[1]), [{ x: S.x(q[0] + HW) + 8, y: S.y(q[1]) + 7, anchor: 'start' }, { x: S.x(q[0] - HW) - 8, y: S.y(q[1]) + 7, anchor: 'end' }, { x: S.x(q[0]), y: S.y(q[1]) - 26, anchor: 'middle' }],
            { c: PLUM, size: S.ls, prio: 0, ring: 60 });
        });
        return;
      }
      // the gap where the light is worth building but no one buys it alone
      if (gp > 0 && s.total > p.v) {
        D.area([[0, p.v], [S.X, p.v], [S.X, s.total], [0, s.total]], { fill: C.red, fo: 0.09, op: gp });
        var gy = (p.v + s.total) / 2, gh = S.y(p.v) - S.y(s.total), gl = S.narrow ? 'free-rider gap' : 'worth it, but no one pays';
        if (gh > 30) D.label(gl, [{ x: S.x(CW.alone), y: S.y(gy) + 7, anchor: 'middle' }, { x: S.x(CW.alone), y: S.y(s.total) + 26, anchor: 'middle' }, { x: S.x(CW.alone), y: S.y(p.v) - 10, anchor: 'middle' }],
          { c: C.tRed, size: ss, op: gp, ring: 40 });
      }
      // a block's value, centred, or in its larger part away from the cost line once that is drawn
      function blockLabel(y0, y1, xc) {
        var a = S.y(y0), z = S.y(y1), cy = S.y(p.c), y = (a + z) / 2;
        if (a - z < ss + 8) return;
        if (ct > 0 && Math.abs(y - cy) < ss) { var lo = a - cy, hi = cy - z; if (Math.max(lo, hi) < ss + 10) return; y = lo > hi ? (a + cy) / 2 : (cy + z) / 2; }
        D.text(S.x(xc), y + ss * 0.35, money(p.v), { anchor: 'middle', size: ss, c: '#ffffff', halo: false, reg: true });
      }
      // the stack: every neighbor's value piled on the last (vertical summation)
      for (var k = 0; k < p.N; k++) {
        var lk = Kit.easeOut(seg(st, k / p.N, (k + 1) / p.N)); if (lk <= 0) continue;
        var y0 = k * p.v, y1 = y0 + p.v * lk;
        D.area(box(CW.worth, y0, y1), { fill: C.blue, fo: 0.78, stroke: '#ffffff', sw: 2 });
        if (lk > 0.95) blockLabel(y0, y1, CW.worth);
      }
      if (al > 0) {
        D.area(box(CW.alone, 0, p.v * Kit.easeOut(al)), { fill: C.blue, fo: 0.78, stroke: '#ffffff', sw: 2 });
      }
      // surplus above the cost, if the street values the light more than it costs
      if (ct > 0.5 && s.total > p.c) {
        D.area(box(CW.worth, p.c, s.total), { fill: C.green, fo: 0.55, op: seg(ct, 0.5, 1), stroke: C.green, sw: 2 });
      }
      if (ct > 0) {
        D.line(0, p.c, S.X, p.c, { c: C.ink, w: 3, dash: '10 8', pr: ct, layer: 'over' });
        D.label('cost ' + money(p.c), [{ x: S.x1 - 8, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 8, y: S.y(p.c) + 26, anchor: 'end' }, { x: S.x0 + 8, y: S.y(p.c) - 10, anchor: 'start' }, { x: S.x0 + 8, y: S.y(p.c) + 26, anchor: 'start' }],
          { c: C.ink, size: S.ls, op: ct, prio: 0 });
        if (ct > 0.6 && s.total > p.c) D.label('surplus ' + money(s.total - p.c), [{ x: S.x(CW.worth + HW) + 8, y: S.y((p.c + s.total) / 2) + 7, anchor: 'start' }, { x: S.x(CW.worth - HW) - 8, y: S.y((p.c + s.total) / 2) + 7, anchor: 'end' }],
          { c: C.tGreen, size: ss, op: seg(ct, 0.6, 1), ring: 40 });
      }
      if (tp > 0) {
        D.label((S.narrow ? '' : p.N + ' × ' + money(p.v) + ' = ') + money(s.total), [{ x: S.x(CW.worth), y: S.y(s.total) - 12, anchor: 'middle' }, { x: S.x(CW.worth + HW) + 8, y: S.y(s.total) + 7, anchor: 'start' }],
          { c: C.tBlue, size: S.ls, op: tp, prio: 0, ring: 50 });
        D.label(money(p.v), [{ x: S.x(CW.alone), y: S.y(p.v) - 12, anchor: 'middle' }, { x: S.x(CW.alone + HW) + 8, y: S.y(p.v) + 7, anchor: 'start' }], { c: C.tBlue, size: S.ls, op: tp, prio: 0, ring: 50 });
      }
      if (f.ghostOn()) {
        [[CW.worth, g.w, 'you'], [CW.alone, g.b, 'you']].forEach(function (q) {
          D.line(q[0] - HW - 0.2, q[1], q[0] + HW + 0.2, q[1], { c: PLUM, w: 3.5, dash: '6 6', op: f.gOp(), layer: 'over' });
          if (f.gOp() > 0.5) D.label(S.narrow ? 'you' : 'you ' + money(q[1]), [{ x: S.x(q[0] - HW) - 8, y: S.y(q[1]) + 7, anchor: 'end' }, { x: S.x(q[0] + HW) + 8, y: S.y(q[1]) + 7, anchor: 'start' }], { c: PLUM, size: ss, op: 0.85, ring: 40 });
        });
      }
    },
    reveal: function (f) {
      var n = f.p.N, sd = Math.min(2200, 450 * n);
      return [['ghost', 0, 400], ['stack', 300, sd, 'linear'], ['alone', 400 + sd, 600], ['tops', 900 + sd, 500], ['cost', 1500 + sd, 700], ['gap', 2100 + sd, 600]];
    },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var tail = s.outcome === 'freeride'
        ? 'At ' + money(p.c) + ' the light is worth building (' + money(s.total) + ' &gt; ' + money(p.c) + '), yet no one values it above ' + money(p.c) + ' alone, so each waits for the others and it never goes up: the free-rider problem throws away <b>' + money(s.lost) + '</b> of surplus.'
        : s.outcome === 'none'
          ? 'At ' + money(p.c) + ' even the whole street values it at only ' + money(s.total) + ', so not building it is the right call.'
          : 'At ' + money(p.c) + ' one neighbor values it enough to buy it alone, so it gets built.';
      return {
        rows: [
          ['Worth building up to', money(g.w), money(s.total)],
          ['Someone buys it alone up to', money(g.b), money(p.v)],
          ['At ' + money(p.c) + ', the light is', outcomeText(g.w, g.b, p.c), outcomeText(s.total, p.v, p.c)]
        ],
        why: 'Everyone on the street gets the same light, so you add their values up and down (vertical summation): ' + p.N + ' &times; ' + money(p.v) + ' = <b>' + money(s.total) +
          '</b>. Below that cost, building it leaves the street better off. But each neighbor decides alone, and alone it is worth only <b>' + money(p.v) + '</b> to her. ' + tail
      };
    },
    explore: {
      title: 'Now play with it',
      hint: 'Change the group size and how much each neighbor values the light, as on the course page. Or drag the cost line.',
      controls: [
        { kind: 'stepper', label: 'Neighbors, N', get: function (f) { return f.p.N; }, step: 1, min: 1, max: 8, fmt: function (v) { return num(v); }, dur: 1,
          set: function (f, v) { f.p.N = Math.round(v); f.dom = M.pub.domain(f.p); } },
        { kind: 'stepper', label: 'Value per person', get: function (f) { return f.p.v; }, step: 10, min: 0, max: 200, fmt: money, dur: 1,
          set: function (f, v) { f.p.v = Math.round(v); f.dom = M.pub.domain(f.p); } }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (s.outcome === 'alone') return 'Each neighbor values it at ' + money(p.v) + ', at least the ' + money(p.c) + ' cost, so <span class="good">someone buys it alone</span>: no free-rider problem.';
        if (s.outcome === 'freeride') return 'Worth building: together they value it at <b>' + money(s.total) + '</b>, more than the ' + money(p.c) + ' cost, a ' + money(s.surplus) +
          ' surplus. But no one values it enough to pay alone, so <b class="bad">it is not built</b> and the ' + money(s.lost) + ' is wasted.';
        return 'Together they value it at <b>' + money(s.total) + '</b>, ' + (s.total < p.c ? 'below' : 'only equal to') + ' the ' + money(p.c) + ' cost, so building it creates no surplus. <span class="good">Not building it is right.</span>';
      }
    }
  };

  /* =====================================================================
     11.5  The Coase theorem
     ===================================================================== */
  function rails(S) { return { l1: S.y0 + 84, r1: S.y0 + 106, l2: S.y0 + 142, r2: S.y0 + 164 }; }
  var f115 = {
    key: 'f115', num: '11.5', topic: 'The Coase theorem: bargaining to efficiency', short: 'Coase theorem', model: M.coase,
    axes: { xtitle: 'Pollution, S', ytitle: '$ per unit' }, extraBottom: 128,
    question: 'Who ends up polluting how much?',
    setup: function (f) {
      var p = f.p;
      return 'A factory gains from each extra unit of smoke along the <b class="c-blue">blue line, MB = ' + p.a + ' - ' + coef(p.b, 'S') + '</b>. Its neighbor is harmed along the <b class="c-red">red line, MD = ' +
        coef(p.d, 'S') + '</b>. The right is clearly assigned, and the two can bargain and pay each other at no cost.';
    },
    steps: [
      { kind: 'drag', label: 'If the factory owns the right', prompt: function (f) { return 'It may pollute freely, so it starts at S = ' + num(f.sol.Smax) + '. Drag the top marker to where bargaining ends.'; },
        check: function (f) { return f.g.mf ? true : 'Slide the top marker along its line first.'; } },
      { kind: 'drag', label: 'If the neighbor owns the right', prompt: 'The neighbor can demand clean air, so it starts at S = 0. Drag the bottom marker to where bargaining ends.',
        check: function (f) { return f.g.mn ? true : 'Slide the bottom marker along its line first.'; } }
    ],
    kbdHint: 'Keyboard: arrow keys slide the highlighted marker by 0.5 (Shift for 2.5), Space switches markers, Enter confirms.',
    initGuess: function (f) { return { f: f.sol.Smax, n: 0, mf: false, mn: false }; },
    handles: function (f, S) {
      var R = rails(S), Smax = f.sol.Smax;
      function rail(get, setv, y, step, active, col) {
        var x = S.x(get());
        return { px: [x, y], grip: 'h', step: step, active: active, c: col,
          hit: function (pt) { return Math.abs(pt.y - y) < 24 ? Math.abs(pt.x - x) : 1e9; },
          set: function (f, X) { setv(f, Math.round(clamp(X, 0, Smax) * 2) / 2); },
          key: function (f, dx, dy) { setv(f, clamp(get() + 0.5 * (dx || dy), 0, Smax)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
      }
      if (f.predicting) return activeFirst([
        rail(function () { return f.g.f; }, function (f, v) { f.g.f = v; f.g.mf = true; }, R.r1, 0, f.cur === 0),
        rail(function () { return f.g.n; }, function (f, v) { f.g.n = v; f.g.mn = true; }, R.r2, 1, f.cur === 1)
      ]);
      if (f.exploring) return [rail(function () { return f.ex.S; }, function (f, v) { f.ex.S = v; }, f.ex.who === 'f' ? R.r1 : R.r2, null, true, C.ink)];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, R = rails(S), Smax = s.Smax, ss = S.ss;
      var MB = function (x) { return M.coase.mb(p, x); }, MD = function (x) { return M.coase.md(p, x); };
      function wedge(from, to, op) {
        if (Math.abs(from - to) < 0.05) return;
        var lo = Math.min(from, to), hi = Math.max(from, to);
        D.area([[lo, MB(lo)], [hi, MB(hi)], [hi, MD(hi)], [lo, MD(lo)]], { fill: C.green, fo: 0.24, op: op });
      }
      var sl = f.t('slide'), cr = f.t('cross');
      var posF = lerp(Smax, s.Ss, sl), posN = lerp(0, s.Ss, sl);
      if (f.revealing && sl > 0) { wedge(posF, Smax); wedge(0, posN); }
      if (f.exploring) wedge(f.ex.S, s.Ss);
      D.line(0, p.a, Smax, 0, { c: C.blue, w: 5, pr: b });
      D.line(0, 0, Smax, MD(Smax), { c: C.red, w: 5, pr: b });
      // the two rails under the axis
      var dimF = f.exploring && f.ex.who !== 'f', dimN = f.exploring && f.ex.who !== 'n';
      D.text(S.x0, R.l1, 'If the factory owns the right', { size: ss, c: dimF ? C.mute : C.soft, weight: 700, halo: false });
      D.text(S.x0, R.l2, 'If the neighbor owns the right', { size: ss, c: dimN ? C.mute : C.soft, weight: 700, halo: false });
      [R.r1, R.r2].forEach(function (y) { D.plineP(S.x0, y, S.x1, y, { c: C.line, w: 7, reg: false }); });
      D.add('over', Kit.K.ring(S.x(Smax), R.r1, { r: 6 }) + Kit.K.ring(S.x(0), R.r2, { r: 6 }));
      if (f.predicting) {
        D.plineP(S.x(g.f), S.y1, S.x(g.f), S.y0, { c: PLUM, w: 2.5, dash: '6 7', op: 0.7, layer: 'under' });
        D.plineP(S.x(g.n), S.y1, S.x(g.n), S.y0, { c: PLUM, w: 2.5, dash: '6 7', op: 0.7, layer: 'under' });
        railVal(g.f, R.r1, PLUM); railVal(g.n, R.r2, PLUM);
      }
      function railVal(v, y, c, op) {
        var x = S.x(v), w = Kit.tw('S = ' + num(v), ss), right = x + 24 + w < S.x1 + 20;
        D.text(right ? x + 24 : x - 24, y + 6, 'S = ' + num(v), { size: ss, c: c, anchor: right ? 'start' : 'end', op: op });
      }
      if (f.truth) {
        if (f.ghostOn()) { D.add('over', Kit.K.ghostDot(S.x(g.f), R.r1, { op: f.gOp() }) + Kit.K.ghostDot(S.x(g.n), R.r2, { op: f.gOp() })); }
        if (f.revealing) {
          D.plineP(S.x(Smax), R.r1, S.x(posF), R.r1, { c: C.ink, w: 4, op: 0.5, reg: false });
          D.plineP(S.x(0), R.r2, S.x(posN), R.r2, { c: C.ink, w: 4, op: 0.5, reg: false });
          D.add('over', Kit.K.dot(S.x(posF), R.r1, { c: C.ink, r: 10 }) + Kit.K.dot(S.x(posN), R.r2, { c: C.ink, r: 10 }));
          if (sl > 0.98) { railVal(s.Ss, R.r1, C.ink); railVal(s.Ss, R.r2, C.ink); }
        }
        if (cr > 0) {
          D.plineP(S.x(s.Ss), S.y(s.price), S.x(s.Ss), lerp(S.y(s.price), R.r2, cr), { c: C.purple, w: 2.5, dash: '6 6', layer: 'under' });
          D.xval(s.Ss, 'S* = ' + num(s.Ss), { anchor: s.Ss > S.X * 0.5 ? 'end' : 'start', dx: s.Ss > S.X * 0.5 ? -8 : 8, c: C.tPurple, op: cr });
          D.near(s.Ss, s.price, 'MB = MD = ' + money(s.price), { c: C.tPurple, op: cr, size: S.ls, d: 18, ring: 90 });
          D.dot(s.Ss, s.price, { c: C.purple, r: 10, pr: cr });
        }
        if (f.exploring) {
          var xS = S.x(f.ex.S);
          D.plineP(xS, S.y1, xS, S.y0, { c: C.ink, w: 2.5, dash: '6 7', op: 0.6, layer: 'under' });
          D.dot(f.ex.S, MB(f.ex.S), { c: C.blue, r: 8 }); D.dot(f.ex.S, MD(f.ex.S), { c: C.red, r: 8 });
          railVal(f.ex.S, f.ex.who === 'f' ? R.r1 : R.r2, C.ink);
        }
      }
      if (b > 0.85) {
        D.curveLabel(S.narrow ? 'factory’s MB' : 'MB of polluting', MB, [0.08, 0.15, 0.25, 0.85, 0.75], { c: C.tBlue });
        D.curveLabel(S.narrow ? 'neighbor’s MD' : 'MD to neighbor', MD, [0.92, 0.85, 0.75, 0.65], { c: C.tRed, pref: 'below' });
      }
    },
    reveal: function () { return [['ghost', 0, 450], ['slide', 350, 1900], ['cross', 2200, 550]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var split = !f.skipped && Math.abs(g.f - g.n) > 0.15 * s.Smax ? 'Your two markers ended in different places, the most common hunch. ' : '';
      return {
        rows: [
          ['Factory owns the right', num(g.f), num(s.Ss)],
          ['Neighbor owns the right', num(g.n), num(s.Ss)]
        ],
        why: split + 'Either way they bargain to <b>S* = ' + num(s.Ss) + '</b>, where the factory’s MB equals the neighbor’s MD at ' + money(s.price) +
          '. Whenever the two differ, one side can pay the other and both come out ahead. The right only decides who pays: the neighbor pays the factory between ' + money(s.fLoss) + ' and ' + money(s.nSave) +
          ' to cut back, or the factory pays the neighbor between ' + money(s.nHarm) + ' and ' + money(s.fGain) + ' for permission.'
      };
    },
    explore: {
      init: function (f) { f.ex.who = 'f'; f.ex.S = f.sol.Ss; },
      hint: 'Pick who owns the right, then drag the black marker along its line, one deal at a time. The green wedge is what a deal can still gain.',
      controls: [{ kind: 'seg', label: 'Who owns the right', options: [['f', 'Factory owns it'], ['n', 'Neighbor owns it']], get: function (f) { return f.ex.who; },
        set: function (f, v) { f.ex.who = v; f.tween(f.ex.S, v === 'f' ? f.sol.Smax : 0, 500, function (x) { f.ex.S = x; }); } }],
      readout: function (f) {
        var p = f.p, s = f.sol, S0 = Math.round(f.ex.S * 2) / 2, mb = M.coase.mb(p, S0), md = M.coase.md(p, S0);
        if (Math.abs(S0 - s.Ss) < 0.26) return 'At S* = <b>' + num(s.Ss) + '</b>, MB = MD = <b>' + money(s.price) + '</b>. <span class="good">No deal is left that helps both.</span>';
        if (S0 > s.Ss) return 'At S = <b>' + num(S0) + '</b>, one more unit costs the neighbor <b class="bad">' + money(md) + '</b> but is worth only <b>' + money(mb) + '</b> to the factory. ' +
          (f.ex.who === 'f' ? 'The neighbor can pay the factory to cut back, and both gain.' : 'The factory would not pay that much for this unit, so pollution falls.');
        return 'At S = <b>' + num(S0) + '</b>, one more unit is worth <b>' + money(mb) + '</b> to the factory and costs the neighbor only <b>' + money(md) + '</b>. ' +
          (f.ex.who === 'n' ? 'The factory can pay the neighbor for permission to pollute more, and both gain.' : 'The neighbor would not pay that much to stop it, so pollution rises.');
      }
    }
  };

  window.W11FIGS = [f111, f112, f113, f114, f115];
})();
