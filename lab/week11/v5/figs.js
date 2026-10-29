/* The five Week 11 figures as "Predict, then see" specs. Economics lives in models.js.
 * Each render registers its curves, dots and handles with a Placer, then places labels in the
 * first clear candidate spot, so labels stay readable for every randomized round. */
(function () {
  'use strict';
  var K = Predict.K, C = Predict.C, M = window.W11;
  var num = K.num, money = K.money, clamp = K.clamp, lerp = K.lerp;
  var PLUM = C.plum;

  function pr(v) { return v == null ? 0 : v; }
  function ex(f) { return f.mode === 'explore'; }
  // the student's guess stays on screen as a ghost through the reveal and until they start exploring
  function ghostOn(f) { return !f.skipped && (f.mode === 'revealing' || (f.mode === 'explore' && !f.ex.touched)); }
  function gOp(f) { return f.mode === 'explore' ? 1 : pr(f.rv.ghost); }
  function lab(S) { return S.narrow ? 17 : 19; }
  function stepper(id, label, value) {
    return '<div class="stepper"><span class="st-lbl">' + label + '</span>' +
      '<button type="button" class="st-btn" data-act="' + id + '-" aria-label="Decrease ' + label + '">&minus;</button>' +
      '<output class="st-val">' + value + '</output>' +
      '<button type="button" class="st-btn" data-act="' + id + '+" aria-label="Increase ' + label + '">+</button></div>';
  }
  function setStepper(f, value) { var o = f.root.querySelector('.st-val'); if (o) o.textContent = value; }
  function regHandles(f, L) { f.handles().forEach(function (h) { L.dot(h.x, h.y, 17); }); }
  // a few q positions spread over the visible part of a line, preferring the middle-right
  function qs(X, list) { return list.map(function (t) { return t * X; }); }

  /* =====================================================================
     11.1  Negative externality and the Pigouvian tax
     ===================================================================== */
  var pigou = {
    key: 'f111', num: '11.1', topic: 'Negative externality', model: M.pigou,
    question: 'Where will the market end up, and where should it be?',
    setup: function (f) {
      var p = f.p;
      return 'Buyers value each unit along the <b class="c-blue">blue line, MB = ' + p.a + ' - Q</b>. Firms pay the <b class="c-orange">orange line, PMC = ' +
        (p.c ? p.c + ' + Q' : 'Q') + '</b>. Each unit also does <b>' + money(p.m) + ' of harm</b> to people nearby, a cost the firms never pay.';
    },
    steps: [
      { kind: 'place', label: 'Where the market ends up', prompt: 'Tap the graph where buyers and sellers will settle.',
        place: function (f, X, Y) { f.g.mk = { x: X, y: Y }; } },
      { kind: 'place', label: 'Where it should be', prompt: function (f) { return 'Now tap where output should be, once the ' + money(f.p.m) + ' of harm per unit counts.'; },
        place: function (f, X, Y) { f.g.op = { x: X, y: Y }; } },
      { kind: 'drag', label: 'The tax that fixes it', prompt: 'Drag the gold handle up to the tax per unit that moves the market there.' }
    ],
    initGuess: function () { return { mk: null, op: null, t: 0 }; },
    // the tax arrow sits left of Q*, far enough from it that the handle never covers the answer
    xq: function (f) { var X = f.dom.X, Qs = f.sol.Qs; return Qs < 0.33 * X ? Math.max(0.06 * X, Qs - 0.13 * X) : 0.2 * X; },
    tNow: function (f) { return ex(f) ? f.ex.t : f.mode === 'predict' ? 0 : f.p.m * pr(f.rv.tax); },
    handles: function (f, S) {
      var p = f.p, g = f.g, hs = [], xq = pigou.xq(f);
      function taxSet(obj, key) { return function (f, X, Y) { obj[key] = Math.round(clamp(Y - p.c - xq, 0, S.Y - p.c - xq)); }; }
      if (f.mode === 'predict') {
        if (g.mk) hs.push({ x: S.x(g.mk.x), y: S.y(g.mk.y), dx: g.mk.x, dy: g.mk.y, step: 0, active: f.cur === 0, set: function (f, X, Y) { f.g.mk = { x: X, y: Y }; } });
        if (g.op) hs.push({ x: S.x(g.op.x), y: S.y(g.op.y), dx: g.op.x, dy: g.op.y, step: 1, active: f.cur === 1, set: function (f, X, Y) { f.g.op = { x: X, y: Y }; } });
        if (f.cur >= 2 || f.done[2]) hs.push({ x: S.x(xq), y: S.y(p.c + xq + g.t), dx: xq, dy: p.c + xq + g.t, c: C.gold, grip: 'v', step: 2, active: f.cur === 2, set: taxSet(g, 't') });
      } else if (ex(f)) {
        hs.push({ x: S.x(xq), y: S.y(p.c + xq + f.ex.t), dx: xq, dy: p.c + xq + f.ex.t, c: C.gold, grip: 'v', active: true, set: taxSet(f.ex, 't') });
      }
      return hs;
    },
    render: function (f, S) {
      var p = f.p, s = f.sol, rv = f.rv, b = pr(rv.base), g = f.g, X = S.X, Y = S.Y, fs = S.fs;
      var u = '', c = '', o = '', L = new K.Placer(S);
      var MB = function (q) { return p.a - q; }, PMC = function (q) { return p.c + q; }, SMC = function (q) { return p.c + p.m + q; };
      var truth = f.mode !== 'predict';
      var smcPr = ex(f) ? 1 : pr(rv.smc);
      var t = pigou.tNow(f), w = M.pigou.withTax(p, t), xq = pigou.xq(f);
      var showTax = (f.mode === 'predict' && (f.cur >= 2 || f.done[2])) || (truth && t > 0.2);
      var tLine = f.mode === 'predict' ? g.t : t;
      // deadweight loss triangle, following the market as the tax moves it
      var dwlOp = ex(f) ? 1 : pr(rv.dwl);
      if (truth && dwlOp > 0 && Math.abs(w.Q - s.Qs) > 0.05)
        u += K.poly(S, [[s.Qs, s.Ps], [w.Q, MB(w.Q)], [w.Q, SMC(w.Q)]], { fill: C.red, fo: 0.3, stroke: C.red, sw: 2, op: dwlOp });
      // curves (all slope +1 or -1)
      c += K.line(S, 0, p.a, p.a, 0, { c: C.blue, pr: b, w: 5 }); L.line(0, p.a, p.a, 0);
      c += K.line(S, 0, p.c, Y, Y + p.c, { c: C.orange, pr: b, w: 5 }); L.line(0, p.c, Y, Y + p.c);
      if (smcPr > 0) { c += K.line(S, 0, p.c + p.m, Y, Y + p.c + p.m, { c: C.purple, pr: smcPr, w: 5 }); L.line(0, p.c + p.m, Y, Y + p.c + p.m); }
      if (showTax) { c += K.line(S, 0, p.c + tLine, Y, Y + p.c + tLine, { c: C.gold, w: 3.5, dash: '11 9' }); L.line(0, p.c + tLine, Y, Y + p.c + tLine); }
      if (truth && ghostOn(f) && g.t !== p.m) c += K.line(S, 0, p.c + g.t, Y, Y + p.c + g.t, { c: PLUM, w: 3, dash: '4 7', op: 0.55 * gOp(f) });
      // the tax arrow at xq
      var tA = f.mode === 'predict' ? (showTax ? g.t : -1) : t;
      var ax = S.x(xq), ay0 = S.y(PMC(xq)), ay1 = S.y(PMC(xq) + Math.max(0, tA));
      if (tA >= 0) { o += K.arrow(ax, ay0, ax, ay1, { c: C.gold, w: 4 }); L.pline(ax, ay0, ax, ay1); }
      // truth points
      var mkP = ex(f) ? 1 : pr(rv.mk), opP = ex(f) ? 1 : pr(rv.op);
      if (truth) {
        if (opP > 0) { c += K.line(S, s.Qs, s.Ps, s.Qs, 0, { c: C.purple, w: 2.5, dash: '6 6', pr: opP, noclip: true }); L.line(s.Qs, s.Ps, s.Qs, 0); L.dot(S.x(s.Qs), S.y(s.Ps), 12); }
        if (mkP > 0) L.dot(S.x(w.Q), S.y(w.P), 12);
        if (ghostOn(f)) { if (g.mk) L.dot(S.x(g.mk.x), S.y(g.mk.y), 12); if (g.op) L.dot(S.x(g.op.x), S.y(g.op.y), 12); }
      }
      regHandles(f, L);
      // axis labels first (they are fixed)
      if (truth) {
        if (opP > 0) o += K.xlabel(S, s.Qs, 'Q* = ' + num(s.Qs), { anchor: 'end', c: C.tPurple, op: opP, dx: -8, L: L });
        if (mkP > 0 && Math.abs(w.Q - s.Qs) > 0.5) o += K.xlabel(S, w.Q, 'Q = ' + num(w.Q), { anchor: 'start', op: mkP, dx: 8, L: L });
      }
      // tax label
      if (tA >= 0 && (f.mode === 'predict' || t > 0.5)) {
        var my = (ay0 + ay1) / 2;
        o += L.text('tax ' + money(tA), [{ x: ax + 14, y: ay0 + 26, anchor: 'start' }, { x: ax + 16, y: my + 7, anchor: 'start' }, { x: ax - 16, y: my + 7, anchor: 'end' },
          { x: ax, y: ay1 - 24, anchor: 'middle' }, { x: ax - 18, y: ay1 - 6, anchor: 'end' }, { x: ax, y: ay0 + 30, anchor: 'middle' }], { size: lab(S), c: C.tGold });
      }
      if (b > 0.85) {
        o += L.text('MB', L.along(MB, qs(X, [0.88, 0.8, 0.7, 0.15, 0.25])), { size: fs, c: C.tBlue });
        o += L.text('PMC', L.along(PMC, qs(X, [0.75, 0.85, 0.65, 0.55, 0.4, 0.3]), 10, 'below'), { size: fs, c: C.tOrange });
      }
      if (smcPr > 0.85) {
        var smcName = t > 0.5 && Math.abs(t - p.m) < 0.5 ? 'SMC = PMC + tax' : 'SMC';
        o += L.text(smcName, L.along(SMC, qs(X, [0.62, 0.72, 0.52, 0.8, 0.42, 0.3, 0.2])), { size: fs, c: C.tPurple });
      }
      if (truth && dwlOp > 0.05 && !ex(f) && pr(rv.tax) < 0.95) {
        var dx = S.x(s.QE), dy = S.y(s.PE);
        o += L.text('DWL ' + money(s.dwl), [{ x: dx, y: dy + 0.17 * (S.y0 - S.y1), anchor: 'middle' }, { x: dx + 14, y: S.y((s.PE + SMC(s.QE)) / 2) + 7, anchor: 'start' },
          { x: dx, y: dy + 0.24 * (S.y0 - S.y1), anchor: 'middle' }], { size: lab(S), c: C.tRed, op: dwlOp * (1 - pr(rv.tax)) });
      }
      // the student's points
      if (f.mode === 'predict') {
        if (g.mk) o += L.text('will be', L.around(S.x(g.mk.x), S.y(g.mk.y), 22), { size: lab(S), c: PLUM });
        if (g.op) o += L.text('should be', L.around(S.x(g.op.x), S.y(g.op.y), 22), { size: lab(S), c: PLUM });
      } else {
        if (ghostOn(f)) {
          var gop = gOp(f);
          if (g.mk) o += K.ghostDot(S.x(g.mk.x), S.y(g.mk.y), { op: gop });
          if (g.op) o += K.ghostDot(S.x(g.op.x), S.y(g.op.y), { op: gop });
          if (gop > 0.5) {
            if (g.mk) o += L.text('you: market', L.around(S.x(g.mk.x), S.y(g.mk.y), 18), { size: S.narrow ? 16 : 17, c: PLUM, op: 0.8 });
            if (g.op) o += L.text('you: best', L.around(S.x(g.op.x), S.y(g.op.y), 18), { size: S.narrow ? 16 : 17, c: PLUM, op: 0.8 });
          }
        }
        if (opP > 0) o += K.dot(S.x(s.Qs), S.y(s.Ps), { c: C.purple, pr: opP, r: 10 });
        if (mkP > 0) o += K.dot(S.x(w.Q), S.y(w.P), { c: C.ink, pr: mkP, r: 10 });
      }
      return { under: u, curves: c, over: o };
    },
    revealSeq: function () { return [['ghost', 0, 450], ['smc', 250, 900], ['mk', 1000, 450], ['op', 1400, 450], ['dwl', 1850, 600], ['tax', 3300, 1400]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [
          ['Market quantity', g.mk ? num(g.mk.x) : '-', num(s.QE)],
          ['Best quantity', g.op ? num(g.op.x) : '-', num(s.Qs)],
          ['Tax per unit', money(g.t), money(s.tax)]
        ],
        why: 'Firms stop where their own cost meets MB, at Q = ' + num(s.QE) + '. Count the ' + money(p.m) + ' of harm and cost meets MB sooner, at Q* = ' + num(s.Qs) +
          '. A tax of ' + money(s.tax) + ' a unit, exactly the harm, makes firms feel that cost and wipes out the ' + money(s.dwl) + ' deadweight loss.'
      };
    },
    exInit: function (f) { f.ex.t = f.p.m; },
    explore: {
      hint: function () { return 'Drag the gold handle to try any tax, or change how much harm each unit does.'; },
      controls: function (f) { return stepper('mec', 'Harm per unit', money(f.p.m)); },
      act: function (f, a) {
        var m = clamp(f.p.m + (a === 'mec+' ? 2 : -2), 2, 40); if (m === f.p.m) return;
        var follow = Math.abs(f.ex.t - f.p.m) < 0.5;   // if the tax was set right, keep it right
        f.p.m = m; f.sol = M.pigou.solve(f.p); f.skipped = true; setStepper(f, money(m));
        if (follow) f.tween(f.ex, 't', m, 450, function () { if (Math.abs(f.ex.t - m) < 1e-6) f.ex.t = m; }); else f.render();
      },
      readout: function (f) {
        var w = M.pigou.withTax(f.p, f.ex.t), ok = Math.abs(f.ex.t - f.p.m) < 0.5;
        return 'Tax <b>' + money(Math.round(f.ex.t)) + '</b>: the market makes <b>' + num(w.Q) + '</b>. ' +
          (ok ? '<span class="good">That is Q*. No deadweight loss.</span>' : 'Deadweight loss <b class="bad">' + money(w.dwl) + '</b>. ' + (f.ex.t < f.p.m ? 'Still too much output.' : 'Now too little.'));
      }
    }
  };

  /* =====================================================================
     11.2  Cap-and-trade: equalize marginal abatement cost
     ===================================================================== */
  var cap = {
    key: 'f112', num: '11.2', topic: 'Cap and trade', model: M.cap,
    question: 'Which split of the cleanup is cheapest?',
    setup: function (f) {
      var p = f.p;
      return 'Two firms must cut <b>' + p.T + ' units</b> of pollution between them. Cutting one more unit costs <b class="c-blue">Firm A ' + (p.al === 1 ? '' : p.al) + 'e</b> and <b class="c-orange">Firm B ' + (p.be === 1 ? '' : p.be) +
        'e</b> dollars, where e is how much that firm has already cut. Every unit A cleans is one B does not have to.';
    },
    steps: [{ kind: 'drag', label: 'Your split', prompt: 'Drag the plum divider. A cleans everything to its left, B cleans the rest.' }],
    initGuess: function (f) { return { x: f.p.T / 2 }; },
    axes: function () { return { xtitle: 'Units cleaned by A', ytitle: '$ per unit cleaned' }; },
    knobY: function (S) { return S.y0 - 52; },
    handles: function (f, S) {
      var mk = function (get, setv, col, step, active) {
        var x = S.x(get());
        return { x: x, y: cap.knobY(S), dx: get(), dy: 0, c: col, grip: 'h', step: step, active: active,
          hit: function (pt) { return pt.y > S.y1 - 10 && pt.y < S.y0 + 10 ? Math.abs(pt.x - x) : 1e9; },
          set: function (f, X) { setv(Math.round(clamp(X, 0, f.p.T))); } };
      };
      if (f.mode === 'predict') return [mk(function () { return f.g.x; }, function (v) { f.g.x = v; }, PLUM, 0, f.cur === 0)];
      if (ex(f)) return [mk(function () { return f.ex.x; }, function (v) { f.ex.x = v; }, C.ink, null, true)];
      return [];
    },
    render: function (f, S) {
      var p = f.p, s = f.sol, rv = f.rv, b = pr(rv.base), Y = S.Y, fs = S.fs, g = f.g;
      var u = '', c = '', o = '', L = new K.Placer(S), ls = lab(S);
      var A = function (x) { return p.al * x; }, B = function (x) { return p.be * (p.T - x); };
      var truth = f.mode !== 'predict';
      var xs = ex(f) ? f.ex.x : s.eA;
      var costP = ex(f) ? 1 : pr(rv.cost);
      if (truth && costP > 0) {
        u += K.poly(S, [[0, 0], [xs, 0], [xs, A(xs)]], { fill: C.blue, fo: 0.16, op: costP });
        u += K.poly(S, [[xs, 0], [p.T, 0], [xs, B(xs)]], { fill: C.orange, fo: 0.16, op: costP });
      }
      var live = ex(f) && f.ex.touched, wx = live ? f.ex.x : g.x, wOp = ex(f) ? 1 : pr(rv.waste);
      var showWaste = truth && wOp > 0 && Math.abs(wx - s.eA) > 0.4 && (live || ghostOn(f));
      if (showWaste) u += K.poly(S, [[wx, A(wx)], [wx, B(wx)], [s.eA, s.lam]], { fill: C.red, fo: 0.38, stroke: C.red, sw: 2, op: wOp });
      c += K.line(S, 0, 0, p.T, A(p.T), { c: C.blue, pr: b, w: 5 }); L.line(0, 0, p.T, A(p.T));
      c += K.line(S, p.T, 0, 0, B(0), { c: C.orange, pr: b, w: 5 }); L.line(p.T, 0, 0, B(0));
      // dividers
      function divider(x, col, op, dash) { L.pline(S.x(x), S.y0, S.x(x), S.y1 + 20); return K.pline(S.x(x), S.y0, S.x(x), S.y1 + 10, { c: col, w: 3.5, dash: dash, op: op }); }
      function splitLabels(x, op) {
        L.rect(S.x(x) - 70, S.y0 - 32, 140, 26);
        return K.text(S.x(x) - 10, S.y0 - 12, 'A ' + num(x), { size: ls, c: C.tBlue, anchor: 'end', op: op }) +
          K.text(S.x(x) + 10, S.y0 - 12, 'B ' + num(p.T - x), { size: ls, c: C.tOrange, anchor: 'start', op: op });
      }
      var opP = ex(f) ? 1 : pr(rv.opt), priceP = ex(f) ? 1 : pr(rv.price);
      if (f.mode === 'predict') { o = divider(g.x, PLUM, 1) + o; o += splitLabels(g.x, 1); }
      else if (ex(f)) { if (ghostOn(f)) { o = K.pline(S.x(g.x), S.y0, S.x(g.x), S.y1 + 10, { c: PLUM, w: 3, dash: '5 7', op: 0.6 }) + o; L.pline(S.x(g.x), S.y0, S.x(g.x), S.y1 + 10); } o = divider(f.ex.x, C.ink, 1) + o; o += splitLabels(f.ex.x, 1); }
      else {
        if (!f.skipped) { o = K.pline(S.x(g.x), S.y0, S.x(g.x), S.y1 + 10, { c: PLUM, w: 3, dash: '5 7', op: 0.6 * pr(rv.ghost) }) + o; L.pline(S.x(g.x), S.y0, S.x(g.x), S.y1 + 10); }
        if (opP > 0) { o += K.pline(S.x(s.eA), S.y0, S.x(s.eA), lerp(S.y0, S.y(s.lam), opP), { c: C.ink, w: 3.5 }); L.pline(S.x(s.eA), S.y0, S.x(s.eA), S.y(s.lam)); o += splitLabels(s.eA, opP); }
      }
      if (truth && priceP > 0) { c += K.line(S, 0, s.lam, s.eA, s.lam, { c: C.gold, w: 3, dash: '9 7', pr: priceP }); L.line(0, s.lam, s.eA, s.lam); }
      if (truth) L.dot(S.x(s.eA), S.y(s.lam), 12);
      regHandles(f, L);
      if (b > 0.85) {
        o += L.text('MAC of A', L.along(A, qs(p.T, [0.9, 0.75, 0.6, 0.45, 0.3])), { size: fs, c: C.tBlue });
        o += L.text('MAC of B', L.along(B, qs(p.T, [0.1, 0.25, 0.4, 0.55, 0.7])), { size: fs, c: C.tOrange });
      }
      if (truth && priceP > 0.3) {
        var py = S.y(s.lam);
        o += L.text('permit price ' + money(s.lam), [{ x: S.x0 + 8, y: py - 10, anchor: 'start' }, { x: S.x0 + 8, y: py + 26, anchor: 'start' },
          { x: S.x(s.eA) - 18, y: py - 10, anchor: 'end' }, { x: S.x(s.eA) - 18, y: py + 26, anchor: 'end' }, { x: S.x(s.eA) + 18, y: py - 10, anchor: 'start' }], { size: ls, c: C.tGold, op: priceP });
      }
      if (showWaste && wOp > 0.6) {
        var top = Math.max(A(wx), B(wx)), xm = S.x((wx + s.eA) / 2);
        if (Math.abs(S.x(wx) - S.x(s.eA)) > 26)
          o += L.text((live ? 'wasted ' : 'extra cost ') + money(M.cap.cost(p, wx) - s.ct), [{ x: xm, y: S.y(top) - 14, anchor: 'middle' }, { x: S.x(wx), y: S.y(top) - 14, anchor: wx < s.eA ? 'start' : 'end' },
            { x: S.x(wx) + (wx < s.eA ? -12 : 12), y: S.y((A(wx) + B(wx)) / 2) + 6, anchor: wx < s.eA ? 'end' : 'start' }], { size: ls, c: C.tRed, op: wOp });
      }
      if (truth && (opP > 0.6 || ex(f))) o += K.dot(S.x(s.eA), S.y(s.lam), { c: C.ink, r: 9, pr: ex(f) ? 1 : (opP - 0.6) / 0.4 });
      return { under: u, curves: c, over: o };
    },
    revealSeq: function () { return [['ghost', 0, 450], ['opt', 300, 900], ['price', 1200, 700], ['cost', 1700, 700], ['waste', 2300, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var cheap = s.eA >= s.eB ? 'A' : 'B';
      return {
        rows: [
          ['A cleans', num(g.x), num(s.eA)],
          ['B cleans', num(p.T - g.x), num(s.eB)],
          ['Total cost', money(M.cap.cost(p, g.x)), money(s.ct)]
        ],
        why: 'The cheapest split is where both firms’ MAC are equal, here at ' + money(s.lam) + ': if one firm’s next unit were cheaper, shifting a unit to it would save money. ' +
          'So Firm ' + cheap + ', the cheaper cleaner, does most of the work. Equal shares would cost ' + money(s.eq) + '; one permit price gets the same cleanup for ' + money(s.ct) + ', ' + Math.round(100 * s.pct) + '% less.'
      };
    },
    exInit: function (f) { f.ex.x = f.sol.eA; f.ex.T = f.p.T; },
    explore: {
      hint: function () { return 'Drag the divider: the red sliver is money wasted. Change the total cleanup required.'; },
      controls: function (f) { return stepper('T', 'Total cleanup', f.p.T + ' units'); },
      act: function (f, a) {
        var T = clamp(f.ex.T + (a === 'T+' ? 10 : -10), 40, 150); if (T === f.ex.T) return;
        var share = f.ex.x / f.p.T; f.ex.T = T; f.skipped = true;
        setStepper(f, T + ' units');
        var o = { v: f.p.T };
        f.tween(o, 'v', T, 450, function () {
          var v = Math.abs(o.v - T) < 1e-6 ? T : o.v;
          f.p.T = v; f.sol = M.cap.solve(f.p); f.dom = M.cap.domain(f.p); f.ex.x = Math.round(share * v);
        });
      },
      readout: function (f) {
        var p = f.p, s = f.sol, x = f.ex.x, cst = M.cap.cost(p, x), extra = cst - s.ct;
        return 'A cleans <b>' + num(x) + '</b>, B cleans <b>' + num(p.T - x) + '</b>. Total cost <b>' + money(Math.round(cst)) + '</b>' +
          (extra < 0.5 ? ', <span class="good">the cheapest possible.</span>' : ', <b class="bad">' + money(Math.round(extra)) + '</b> more than the cheapest split.');
      }
    }
  };

  /* =====================================================================
     11.3  Positive externality and the Pigouvian subsidy
     ===================================================================== */
  var NB = 40;
  var pos = {
    key: 'f113', num: '11.3', topic: 'Positive externality', model: M.pos,
    question: 'Draw the social benefit curve.',
    setup: function (f) {
      var p = f.p;
      return 'Buyers value each dose of a vaccine along the <b class="c-blue">blue line, MB = ' + p.a + ' - Q</b>, and it costs the <b class="c-orange">orange line, MC = ' + (p.c ? p.c + ' + Q' : 'Q') +
        '</b>. Each dose also protects other people, worth <b>' + money(p.m) + '</b> to them, which buyers never count.';
    },
    steps: [
      { kind: 'draw', label: 'The social benefit curve', prompt: 'Draw with your finger or mouse, left to right: what is each dose worth to everyone?',
        check: function (f) { return f.g.bins.filter(function (v) { return v != null; }).length >= NB * 0.45; } },
      { kind: 'drag', label: 'Where output should be', prompt: 'Drag the plum marker to the quantity society should choose.' }
    ],
    kbdHint: 'Keyboard: arrow keys raise or lower a straight line, Enter accepts it. Then arrow keys move the marker.',
    initGuess: function (f) { return { bins: new Array(NB + 1).fill(null), q: f.sol.QE }; },
    scoreInput: function (f) { return { draw: pos.toPts(f), q: f.g.q }; },
    draw: function (f, X, Y, last) {
      var bw = f.dom.X / NB, i1 = Math.round(X / bw);
      if (last) {
        var i0 = Math.round(last.x / bw), lo = Math.min(i0, i1), hi = Math.max(i0, i1);
        for (var i = lo; i <= hi; i++) f.g.bins[i] = i1 === i0 ? Y : lerp(last.y, Y, (i - i0) / (i1 - i0));
      } else f.g.bins[i1] = Y;
    },
    keyDraw: function (f, dy) {
      var p = f.p, bw = f.dom.X / NB, bins = f.g.bins;
      if (bins.every(function (v) { return v == null; })) for (var i = 0; i <= NB; i++) bins[i] = Math.max(0, p.a - i * bw);
      for (var j = 0; j <= NB; j++) if (bins[j] != null) bins[j] = clamp(bins[j] + dy * f.dom.Y / 100, 0, f.dom.Y);
    },
    toPts: function (f) { var bw = f.dom.X / NB; return f.g.bins.map(function (v, i) { return v == null ? null : { x: i * bw, y: v }; }); },
    xq: function (f) { return 0.2 * f.dom.X; },
    handles: function (f, S) {
      var p = f.p, xq = pos.xq(f);
      if (f.mode === 'predict' && (f.cur >= 1 || f.done[1])) {
        var x = S.x(f.g.q);
        return [{ x: x, y: S.y1 + 20, dx: f.g.q, dy: S.Y, grip: 'h', step: 1, active: f.cur === 1,
          hit: function (pt) { return pt.y > S.y1 - 10 && pt.y < S.y1 + 70 ? Math.abs(pt.x - x) : Math.hypot(pt.x - x, pt.y - (S.y1 + 20)); },
          set: function (f, X) { f.g.q = Math.round(clamp(X, 0, f.dom.X)); } }];
      }
      if (ex(f)) return [{ x: S.x(xq), y: S.y(p.a - xq + f.ex.s), dx: xq, dy: p.a - xq + f.ex.s, c: C.gold, grip: 'v', active: true,
        set: function (f, X, Y) { f.ex.s = Math.round(clamp(Y - (p.a - xq), 0, S.Y - (p.a - xq))); } }];
      return [];
    },
    render: function (f, S) {
      var p = f.p, s = f.sol, rv = f.rv, b = pr(rv.base), X = S.X, fs = S.fs, g = f.g;
      var u = '', c = '', o = '', L = new K.Placer(S), ls = lab(S);
      var MB = function (q) { return p.a - q; }, MC = function (q) { return p.c + q; }, MSB = function (q) { return p.a + p.m - q; };
      var truth = f.mode !== 'predict';
      var sub = ex(f) ? f.ex.s : truth ? p.m * pr(rv.sub) : 0, w = M.pos.withSub(p, sub);
      var dwlOp = ex(f) ? 1 : pr(rv.dwl);
      if (truth && dwlOp > 0 && Math.abs(w.Q - s.Qs) > 0.05)
        u += K.poly(S, [[w.Q, MC(w.Q)], [w.Q, MSB(w.Q)], [s.Qs, s.Ps]], { fill: C.red, fo: 0.3, stroke: C.red, sw: 2, op: dwlOp });
      c += K.line(S, 0, p.a, p.a, 0, { c: C.blue, pr: b, w: 5 }); L.line(0, p.a, p.a, 0);
      c += K.line(S, 0, p.c, S.Y, S.Y + p.c, { c: C.orange, pr: b, w: 5 }); L.line(0, p.c, S.Y, S.Y + p.c);
      // the student's drawing
      var pts = pos.toPts(f), run = [], runs = [];
      pts.forEach(function (pt) { if (pt) run.push([S.x(pt.x), S.y(pt.y)]); else if (run.length) { runs.push(run); run = []; } });
      if (run.length) runs.push(run);
      var dOp = f.mode === 'predict' ? 1 : (ghostOn(f) ? 1 - 0.5 * gOp(f) : 0);
      runs.forEach(function (r) {
        if (r.length === 1) o += '<circle cx="' + r[0][0] + '" cy="' + r[0][1] + '" r="3" fill="' + PLUM + '"/>';
        o += K.polyline(r, { c: PLUM, w: f.mode === 'predict' ? 5 : 4, op: dOp, dash: f.mode === 'predict' ? null : '2 8' });
        if (f.mode === 'predict') for (var i = 1; i < r.length; i++) L.pline(r[i - 1][0], r[i - 1][1], r[i][0], r[i][1]);
      });
      var msbP = ex(f) ? 1 : pr(rv.msb);
      if (msbP > 0) { c += K.line(S, 0, p.a + p.m, p.a + p.m, 0, { c: C.purple, pr: msbP, w: 5 }); L.line(0, p.a + p.m, p.a + p.m, 0); }
      if (truth && sub > 0.2) { c += K.line(S, 0, p.a + sub, p.a + sub, 0, { c: C.gold, w: 3.5, dash: '11 9' }); L.line(0, p.a + sub, p.a + sub, 0); }
      var mkP = ex(f) ? 1 : pr(rv.mk), opP = ex(f) ? 1 : pr(rv.op), xq = pos.xq(f);
      if (truth) {
        if (opP > 0) { c += K.line(S, s.Qs, s.Ps, s.Qs, 0, { c: C.purple, w: 2.5, dash: '6 6', pr: opP, noclip: true }); L.line(s.Qs, s.Ps, s.Qs, 0); L.dot(S.x(s.Qs), S.y(s.Ps), 12); }
        if (mkP > 0) L.dot(S.x(w.Q), S.y(w.P), 12);
        if (sub > 0.2) { o += K.arrow(S.x(xq), S.y(MB(xq)), S.x(xq), S.y(MB(xq) + sub), { c: C.gold, w: 4 }); L.pline(S.x(xq), S.y(MB(xq)), S.x(xq), S.y(MB(xq) + sub)); }
      }
      // the student's Q* marker
      if (f.mode === 'predict' && (f.cur >= 1 || f.done[1])) {
        o = K.pline(S.x(g.q), S.y0, S.x(g.q), S.y1 + 20, { c: PLUM, w: 3, dash: '7 6' }) + o;
        L.pline(S.x(g.q), S.y0, S.x(g.q), S.y1 + 20);
        o += K.xlabel(S, g.q, 'your Q* ' + num(g.q), { anchor: 'start', c: PLUM, dx: 8, L: L });
      } else if (truth && ghostOn(f)) {
        o = K.pline(S.x(g.q), S.y0, S.x(g.q), S.y1 + 20, { c: PLUM, w: 2.5, dash: '3 7', op: 0.6 * gOp(f) }) + o;
      }
      regHandles(f, L);
      if (truth) {
        if (opP > 0) o += K.xlabel(S, s.Qs, 'Q* = ' + num(s.Qs), { anchor: 'start', c: C.tPurple, op: opP, dx: 8, L: L });
        if (mkP > 0 && Math.abs(w.Q - s.Qs) > 0.5) o += K.xlabel(S, w.Q, 'Q = ' + num(w.Q), { anchor: 'end', op: mkP, dx: -8, L: L });
      }
      if (truth && sub > 0.5) {
        var ax = S.x(xq), at = S.y(MB(xq) + sub), af = S.y(MB(xq));
        o += L.text('subsidy ' + money(Math.round(sub)), [{ x: ax + 18, y: at - 10, anchor: 'start' }, { x: ax + 16, y: (at + af) / 2 + 7, anchor: 'start' },
          { x: ax, y: at - 24, anchor: 'middle' }, { x: ax - 16, y: (at + af) / 2 + 7, anchor: 'end' }], { size: ls, c: C.tGold });
      }
      if (b > 0.85) {
        o += L.text('MB', L.along(MB, qs(X, [0.88, 0.8, 0.7, 0.6])), { size: fs, c: C.tBlue });
        o += L.text('MC', L.along(MC, qs(X, [0.75, 0.85, 0.65, 0.55, 0.4, 0.3]), 10, 'below'), { size: fs, c: C.tOrange });
      }
      if (msbP > 0.85) o += L.text('MSB', L.along(MSB, qs(X, [0.8, 0.88, 0.7, 0.15, 0.25])), { size: fs, c: C.tPurple });
      if (truth && !ex(f) && dwlOp > 0.05 && pr(rv.sub) < 0.95) {
        var mid = S.y((s.PE + MSB(s.QE)) / 2);
        o += L.text('DWL ' + money(s.dwl), [{ x: S.x(s.Qs) + 14, y: S.y(s.PE) + 7, anchor: 'start' }, { x: S.x(s.QE) - 14, y: mid + 7, anchor: 'end' },
          { x: S.x(s.Qs) + 14, y: S.y(s.PE) + 30, anchor: 'start' }, { x: S.x(s.QE), y: S.y(s.PE) + 0.2 * (S.y0 - S.y1), anchor: 'middle' }], { size: ls, c: C.tRed, op: dwlOp * (1 - pr(rv.sub)) });
      }
      if (runs.length && f.mode === 'predict' && !f.drag) {
        var lr = runs[runs.length - 1], lp = lr[lr.length - 1];
        o += L.text('your MSB', L.around(lp[0], lp[1], 16), { size: ls, c: PLUM });
      }
      if (truth) {
        if (opP > 0) o += K.dot(S.x(s.Qs), S.y(s.Ps), { c: C.purple, pr: opP, r: 10 });
        if (mkP > 0) o += K.dot(S.x(w.Q), S.y(w.P), { c: C.ink, pr: mkP, r: 10 });
      }
      return { under: u, curves: c, over: o };
    },
    revealSeq: function () { return [['ghost', 0, 450], ['msb', 250, 1000], ['mk', 1100, 450], ['op', 1500, 450], ['dwl', 1950, 600], ['sub', 3300, 1400]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, sc = f.result;
      var gap = sc && sc.meanErr != null ? (sc.meanErr < 1 ? 'on it' : money(Math.round(sc.meanErr)) + ' off') : '-';
      return {
        rows: [
          ['Your curve', gap, money(p.m) + ' above MB'],
          ['Best quantity', num(g.q), num(s.Qs)],
          ['Subsidy that fixes it', '', money(s.sub)]
        ],
        why: 'Social benefit is private benefit plus the ' + money(p.m) + ' others get, so MSB sits ' + money(p.m) + ' above MB everywhere. The market stops at Q = ' + num(s.QE) +
          ', where MB meets MC, but society wants Q* = ' + num(s.Qs) + ', where MSB meets MC. A subsidy of ' + money(s.sub) + ' a dose closes the gap and recovers the ' + money(s.dwl) + ' deadweight loss.'
      };
    },
    exInit: function (f) { f.ex.s = f.p.m; },
    explore: {
      hint: function () { return 'Drag the gold handle to try any subsidy, or change how much each dose helps others.'; },
      controls: function (f) { return stepper('meb', 'Benefit to others', money(f.p.m)); },
      act: function (f, a) {
        var m = clamp(f.p.m + (a === 'meb+' ? 2 : -2), 2, 40); if (m === f.p.m) return;
        var follow = Math.abs(f.ex.s - f.p.m) < 0.5;
        f.p.m = m; f.sol = M.pos.solve(f.p); f.dom = M.pos.domain(f.p); f.skipped = true; setStepper(f, money(m));
        if (follow) f.tween(f.ex, 's', m, 450, function () { if (Math.abs(f.ex.s - m) < 1e-6) f.ex.s = m; }); else f.render();
      },
      readout: function (f) {
        var w = M.pos.withSub(f.p, f.ex.s), ok = Math.abs(f.ex.s - f.p.m) < 0.5;
        return 'Subsidy <b>' + money(Math.round(f.ex.s)) + '</b>: output is <b>' + num(w.Q) + '</b>. ' +
          (ok ? '<span class="good">That is Q*. No deadweight loss.</span>' : 'Deadweight loss <b class="bad">' + money(w.dwl) + '</b>. ' + (f.ex.s < f.p.m ? 'Still too little.' : 'Now too much.'));
      }
    }
  };

  /* =====================================================================
     11.4  Public goods: add willingness to pay vertically
     ===================================================================== */
  var NCOL = [C.blue, C.gold, C.green], NTXT = [C.tBlue, C.tGold, C.tGreen];
  var pub = {
    key: 'f114', num: '11.4', topic: 'Public goods', model: M.pub,
    question: 'How much would the three neighbors pay together?',
    setup: function (f) {
      var p = f.p, n = M.pub.names;
      return 'Three neighbors share a street. Each line is what one of them would pay for one more streetlight: <b class="c-blue">' + n[0] + ' ' + money(p.v[0]) +
        '</b>, <b class="c-gold">' + n[1] + ' ' + money(p.v[1]) + '</b> and <b class="c-green">' + n[2] + ' ' + money(p.v[2]) + '</b> for the first. A light costs <b>' + money(p.k) + '</b>.';
    },
    steps: [{ kind: 'drag', label: 'Their combined value', prompt: function (f) {
      return f.g.m0 || f.g.m6 ? 'Good. Now move the other plum handle too.' : 'Drag both plum handles so the dashed line shows what all three would pay together.'; },
      check: function (f) { return f.g.m0 && f.g.m6; } }],
    initGuess: function (f) { var y = M.niceCeil(f.dom.Y * 0.5, 10); return { y0: y, y6: y, m0: false, m6: false }; },
    axes: function () { return { xtitle: 'Streetlights', ytitle: '$ per light' }; },
    stacks: function (s) {
      return [1.6, 4.4, 7.2].map(function (x) {
        [s.Gs, s.Galone].forEach(function (avoid) { if (avoid > 0 && Math.abs(x - avoid) < 0.7) x = avoid + (x <= avoid ? -0.75 : 0.75); });
        return clamp(x, 1.2, 9);
      });
    },
    handles: function (f, S) {
      var g = f.g, G2 = M.pub.G2;
      if (f.mode === 'predict') return [
        { x: S.x(0), y: S.y(g.y0), dx: 0, dy: g.y0, grip: 'v', step: 0, active: !g.m0, set: function (f, X, Y) { f.g.y0 = Math.round(Y / 5) * 5; f.g.m0 = true; } },
        { x: S.x(G2), y: S.y(g.y6), dx: G2, dy: g.y6, grip: 'v', step: 0, active: g.m0 && !g.m6, set: function (f, X, Y) { f.g.y6 = Math.round(Y / 5) * 5; f.g.m6 = true; } }
      ];
      if (ex(f)) return [{ x: S.x(0.94 * S.X), y: S.y(f.p.k), dx: 0.94 * S.X, dy: f.p.k, c: C.ink, grip: 'v', active: true,
        set: function (f, X, Y) { var k = clamp(Math.round(Y / 10) * 10, 10, S.Y); f.p.k = k; f.ex.k = k; f.sol = M.pub.solve(f.p); setStepper(f, money(k)); } }];
      return [];
    },
    render: function (f, S) {
      var p = f.p, s = f.sol, rv = f.rv, b = pr(rv.base), X = S.X, fs = S.fs, g = f.g, G2 = M.pub.G2;
      var u = '', c = '', o = '', i, L = new K.Placer(S), ls = lab(S);
      var truth = f.mode !== 'predict';
      for (i = 0; i < 3; i++) { c += K.line(S, 0, p.v[i], p.Gm, 0, { c: NCOL[i], pr: b, w: 4.5 }); L.line(0, p.v[i], p.Gm, 0); }
      // the student's line through (0, y0) and (G2, y6), extended across the frame
      var yEnd = g.y0 + (g.y6 - g.y0) / G2 * X;
      var uOp = f.mode === 'predict' ? 1 : (ghostOn(f) ? 1 - 0.55 * gOp(f) : 0);
      if (uOp > 0) { c += K.line(S, 0, g.y0, X, yEnd, { c: PLUM, w: f.mode === 'predict' ? 4.5 : 3.5, dash: f.mode === 'predict' ? '13 8' : '3 8', op: uOp }); if (f.mode === 'predict') L.line(0, g.y0, X, yEnd); }
      // vertical stacks: each neighbor's value piled on the last
      var stP = ex(f) ? 1 : pr(rv.stack);
      if (truth && stP > 0) {
        pub.stacks(s).forEach(function (G, k) {
          var base = 0, bw = S.narrow ? 10 : 14;
          for (var j = 0; j < 3; j++) {
            var seg = M.pub.mb(p, j, G), local = clamp(stP * 3.6 - j - k * 0.3, 0, 1);
            if (local > 0) u += '<rect x="' + (S.x(G) - bw / 2).toFixed(1) + '" y="' + S.y(base + seg * local).toFixed(1) + '" width="' + bw + '" height="' + (S.y(base) - S.y(base + seg * local)).toFixed(1) + '" fill="' + NCOL[j] + '" opacity="0.88"/>';
            base += seg;
          }
          L.rect(S.x(G) - bw / 2 - 2, S.y(base), bw + 4, S.y(0) - S.y(base));
        });
      }
      var sumP = ex(f) ? 1 : pr(rv.sum);
      if (sumP > 0) { c += K.line(S, 0, s.A, p.Gm, 0, { c: C.purple, w: 5.5, pr: sumP }); L.line(0, s.A, p.Gm, 0); }
      var mcP = ex(f) ? 1 : pr(rv.mc), opP = ex(f) ? 1 : pr(rv.opt);
      if (truth && mcP > 0) { c += K.line(S, 0, p.k, X, p.k, { c: C.ink, w: 3, dash: '10 8', pr: mcP }); L.line(0, p.k, X, p.k); }
      if (truth && opP > 0 && s.Gs > 0) {
        c += K.line(S, s.Gs, p.k, s.Gs, 0, { c: C.purple, w: 2.5, dash: '6 6', pr: opP, noclip: true }); L.line(s.Gs, p.k, s.Gs, 0);
        L.dot(S.x(s.Gs), S.y(p.k), 12); if (s.Galone > 0) L.dot(S.x(s.Galone), S.y(p.k), 11);
      }
      regHandles(f, L);
      if (truth && opP > 0 && s.Gs > 0) o += K.xlabel(S, s.Gs, num(s.Gs) + ' lights', { anchor: 'start', c: C.tPurple, op: opP, dx: 8, L: L });
      if (b > 0.85) for (i = 0; i < 3; i++) {
        var fn = (function (j) { return function (G) { return M.pub.mb(p, j, G); }; })(i);
        // names sit right on their own line (paper halo), near the left where the lines are furthest apart
        var gx = S.narrow ? 1.0 : 0.8, nx = S.x(gx), ny = S.y(fn(gx)) + 6;
        L.rect(nx - 5, ny - ls * 0.85, K.tw(M.pub.names[i], ls) + 10, ls * 1.15);
        o += K.text(nx, ny, M.pub.names[i], { size: ls, c: NTXT[i], hw: 8 });
      }
      if (sumP > 0.85) o += L.text('Total MB', L.along(function (G) { return M.pub.sum(p, G); }, [0.6, 1.2, 2, 3, 4.2, 5.4]), { size: fs, c: C.tPurple });
      if (truth && mcP > 0.5) {
        var ky = S.y(p.k);
        o += L.text('cost ' + money(Math.round(p.k)), [{ x: S.x1 - 40, y: ky - 12, anchor: 'end' }, { x: S.x1 - 40, y: ky + 26, anchor: 'end' }, { x: S.x0 + 10, y: ky - 12, anchor: 'start' },
          { x: S.x0 + 10, y: ky + 26, anchor: 'start' }, { x: S.x(X * 0.6), y: ky - 12, anchor: 'middle' }], { size: ls, c: C.ink, op: mcP });
      }
      if (truth && opP > 0.5 && s.Galone > 0)
        o += L.text(M.pub.names[0] + ' alone', L.around(S.x(s.Galone), S.y(p.k), 16), { size: S.narrow ? 16 : 18, c: C.tBlue, op: opP, ring: 60 });
      if (f.mode === 'predict') o += L.text('your total', L.around(S.x(G2), S.y(g.y6), 22), { size: ls, c: PLUM });
      if (truth && opP > 0 && s.Gs > 0) {
        if (s.Galone > 0) o += K.dot(S.x(s.Galone), S.y(p.k), { c: C.blue, pr: opP, r: 8 });
        o += K.dot(S.x(s.Gs), S.y(p.k), { c: C.purple, pr: opP, r: 10 });
      }
      return { under: u, curves: c, over: o };
    },
    revealSeq: function () { return [['ghost', 0, 450], ['stack', 300, 2100], ['sum', 2300, 800], ['mc', 3100, 600], ['opt', 3600, 450]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, n = M.pub.names;
      var tail = s.Galone > 0
        ? 'Only ' + n[0] + ' values a light above ' + money(p.k) + ', so she buys ' + num(s.Galone) + ' on her own and the others free-ride: ' + num(s.Galone) + ' lights instead of ' + num(s.Gs) + '.'
        : 'But no one values even the first light above ' + money(p.k) + ' alone, so each waits for the others and none get built: the free-rider problem.';
      return {
        rows: [
          ['First light', money(g.y0), money(s.A)],
          ['At ' + M.pub.G2 + ' lights', money(g.y6), money(M.pub.sum(p, M.pub.G2))],
          ['Lights worth building', '', num(s.Gs)]
        ],
        why: 'Everyone enjoys the same light, so you add what each would pay up and down: ' + money(p.v[0]) + ' + ' + money(p.v[1]) + ' + ' + money(p.v[2]) + ' = ' + money(s.A) +
          ' for the first one. Lights are worth building until that total falls to the ' + money(p.k) + ' cost, at ' + num(s.Gs) + '. ' + tail
      };
    },
    exInit: function (f) { f.ex.k = f.p.k; },
    explore: {
      hint: function () { return 'Drag the cost line or step it, and see who would pay for lights on their own.'; },
      controls: function (f) { return stepper('k', 'Cost per light', money(f.p.k)); },
      act: function (f, a) {
        var k = clamp(f.ex.k + (a === 'k+' ? 10 : -10), 10, f.dom.Y); if (k === f.ex.k) return;
        f.ex.k = k; setStepper(f, money(k));
        f.tween(f.p, 'k', k, 350, function () { if (Math.abs(f.p.k - k) < 1e-6) f.p.k = k; f.sol = M.pub.solve(f.p); });
      },
      readout: function (f) {
        var p = f.p, s = f.sol, n = M.pub.names;
        if (s.Gs <= 0) return 'At <b>' + money(Math.round(p.k)) + '</b> a light, even the first is worth less than it costs. <span class="good">Building none is right.</span>';
        var alone = s.Galone > 0 ? n[0] + ' would buy <b>' + num(s.Galone) + '</b> on her own; the others free-ride.' : '<b class="bad">No one buys any alone</b>, so the street stays dark.';
        return 'At <b>' + money(Math.round(p.k)) + '</b> a light, <b>' + num(s.Gs) + '</b> are worth building. ' + alone;
      }
    }
  };

  /* =====================================================================
     11.5  The Coase theorem
     ===================================================================== */
  var coase = {
    key: 'f115', num: '11.5', topic: 'The Coase theorem', model: M.coase,
    question: 'Who ends up polluting how much?',
    extraBottom: 128,
    setup: function (f) {
      var p = f.p;
      return 'A factory gains from each extra unit of smoke along the <b class="c-blue">blue line, MB = ' + p.a + ' - ' + (p.b === 1 ? '' : p.b) + 'S</b>. Its neighbor is harmed along the <b class="c-red">red line, MD = ' +
        (p.d === 1 ? '' : p.d) + 'S</b>. They can bargain and pay each other.';
    },
    steps: [
      { kind: 'drag', label: 'If the factory owns the right', prompt: function (f) { return 'It may pollute freely, so it starts at S = ' + num(f.sol.Smax) + '. Drag the top marker to where bargaining ends.'; } },
      { kind: 'drag', label: 'If the neighbor owns the right', prompt: 'The neighbor can demand clean air, so it starts at S = 0. Drag the bottom marker to where bargaining ends.' }
    ],
    initGuess: function (f) { return { f: f.sol.Smax, n: 0 }; },
    axes: function () { return { xtitle: 'Pollution, S', ytitle: '$ per unit' }; },
    rails: function (S) { return { l1: S.y0 + 82, r1: S.y0 + 104, l2: S.y0 + 140, r2: S.y0 + 162 }; },
    handles: function (f, S) {
      var R = coase.rails(S), Smax = f.sol.Smax;
      function rail(get, setv, y, step, active, col) {
        return { x: S.x(get()), y: y, dx: get(), dy: 0, grip: 'h', step: step, active: active, c: col,
          hit: function (pt) { return Math.abs(pt.y - y) < 22 ? Math.abs(pt.x - S.x(get())) : 1e9; },
          set: function (f, X) { setv(Math.round(clamp(X, 0, Smax) * 2) / 2); } };
      }
      if (f.mode === 'predict') return [
        rail(function () { return f.g.f; }, function (v) { f.g.f = v; }, R.r1, 0, f.cur === 0),
        rail(function () { return f.g.n; }, function (v) { f.g.n = v; }, R.r2, 1, f.cur === 1)
      ];
      if (ex(f)) return [rail(function () { return f.ex.S; }, function (v) { f.ex.S = v; }, f.ex.who === 'f' ? R.r1 : R.r2, null, true, C.ink)];
      return [];
    },
    render: function (f, S) {
      var p = f.p, s = f.sol, rv = f.rv, b = pr(rv.base), X = S.X, fs = S.fs, g = f.g, R = coase.rails(S);
      var u = '', c = '', o = '', L = new K.Placer(S), ls = lab(S);
      var MB = function (x) { return M.coase.mb(p, x); }, MD = function (x) { return M.coase.md(p, x); };
      var truth = f.mode !== 'predict', Smax = s.Smax;
      function wedge(from, to) {
        if (Math.abs(from - to) < 0.05) return '';
        var lo = Math.min(from, to), hi = Math.max(from, to);
        return K.poly(S, [[lo, MB(lo)], [hi, MB(hi)], [hi, MD(hi)], [lo, MD(lo)]], { fill: C.green, fo: 0.24 });
      }
      var sl = ex(f) ? 1 : pr(rv.slide);
      var posF = lerp(Smax, s.Ss, sl), posN = lerp(0, s.Ss, sl);
      if (truth && !ex(f) && sl > 0) { u += wedge(posF, Smax); u += wedge(0, posN); }
      if (ex(f)) u += wedge(f.ex.S, s.Ss);
      c += K.line(S, 0, p.a, Smax, 0, { c: C.blue, pr: b, w: 5 }); L.line(0, p.a, Smax, 0);
      c += K.line(S, 0, 0, Smax, MD(Smax), { c: C.red, pr: b, w: 5 }); L.line(0, 0, Smax, MD(Smax));
      // rails under the axis
      var dimF = ex(f) && f.ex.who !== 'f', dimN = ex(f) && f.ex.who !== 'n';
      o += K.text(S.x0, R.l1, 'If the factory owns the right', { size: S.narrow ? 16 : 17, c: dimF ? '#8b9396' : C.soft, weight: 700 });
      o += K.text(S.x0, R.l2, 'If the neighbor owns the right', { size: S.narrow ? 16 : 17, c: dimN ? '#8b9396' : C.soft, weight: 700 });
      [R.r1, R.r2].forEach(function (y) { o += K.pline(S.x0, y, S.x1, y, { c: '#d3d8d4', w: 7 }); });
      o += '<circle cx="' + S.x(Smax) + '" cy="' + R.r1 + '" r="6" fill="#fff" stroke="' + C.soft + '" stroke-width="2.5"/>';
      o += '<circle cx="' + S.x(0) + '" cy="' + R.r2 + '" r="6" fill="#fff" stroke="' + C.soft + '" stroke-width="2.5"/>';
      if (f.mode === 'predict') {
        u += K.pline(S.x(g.f), S.y1, S.x(g.f), S.y0, { c: PLUM, w: 2.5, dash: '6 7', op: 0.7 });
        u += K.pline(S.x(g.n), S.y1, S.x(g.n), S.y0, { c: PLUM, w: 2.5, dash: '6 7', op: 0.7 });
        L.pline(S.x(g.f), S.y1, S.x(g.f), S.y0); L.pline(S.x(g.n), S.y1, S.x(g.n), S.y0);
      }
      var cr = ex(f) ? 1 : pr(rv.cross);
      if (truth) {
        var gop = pr(rv.ghost);
        if (ghostOn(f)) { o += K.ghostDot(S.x(g.f), R.r1, { op: gOp(f) }); o += K.ghostDot(S.x(g.n), R.r2, { op: gOp(f) }); }
        if (!ex(f)) {
          o += K.pline(S.x(Smax), R.r1, S.x(posF), R.r1, { c: C.ink, w: 4, op: 0.5 });
          o += K.pline(S.x(0), R.r2, S.x(posN), R.r2, { c: C.ink, w: 4, op: 0.5 });
          o += K.dot(S.x(posF), R.r1, { c: C.ink, r: 10, pr: sl > 0 ? 1 : 0 });
          o += K.dot(S.x(posN), R.r2, { c: C.ink, r: 10, pr: sl > 0 ? 1 : 0 });
        }
        if (cr > 0) {
          o = K.pline(S.x(s.Ss), S.y(s.price), S.x(s.Ss), lerp(S.y(s.price), R.r2, cr), { c: C.purple, w: 2.5, dash: '6 6' }) + o;
          L.pline(S.x(s.Ss), S.y(s.price), S.x(s.Ss), S.y0); L.dot(S.x(s.Ss), S.y(s.price), 12);
        }
        if (ex(f)) {
          var xS = S.x(f.ex.S);
          u += K.pline(xS, S.y1, xS, S.y0, { c: C.ink, w: 2.5, dash: '6 7', op: 0.6 });
          L.pline(xS, S.y1, xS, S.y0); L.dot(xS, S.y(MB(f.ex.S)), 10); L.dot(xS, S.y(MD(f.ex.S)), 10);
        }
      }
      regHandles(f, L);
      if (truth && cr > 0) o += K.xlabel(S, s.Ss, 'S* = ' + num(s.Ss), { anchor: s.Ss > X * 0.5 ? 'end' : 'start', dx: s.Ss > X * 0.5 ? -8 : 8, c: C.tPurple, op: cr, L: L });
      if (b > 0.85) {
        o += L.text('factory’s MB', L.along(MB, qs(X, [0.08, 0.15, 0.25, 0.85, 0.75])), { size: fs, c: C.tBlue });
        o += L.text('neighbor’s MD', L.along(MD, qs(X, [0.92, 0.85, 0.75, 0.65])), { size: fs, c: C.tRed });
      }
      if (truth && cr > 0.3) o += L.text(money(s.price), L.around(S.x(s.Ss), S.y(s.price), 18).slice(2).concat(L.around(S.x(s.Ss), S.y(s.price), 18).slice(0, 2)), { size: ls, c: C.tPurple, op: cr });
      if (truth && cr > 0) o += K.dot(S.x(s.Ss), S.y(s.price), { c: C.purple, r: 10, pr: cr });
      if (ex(f)) { var xx = S.x(f.ex.S); o += K.dot(xx, S.y(MB(f.ex.S)), { c: C.blue, r: 8 }) + K.dot(xx, S.y(MD(f.ex.S)), { c: C.red, r: 8 }); }
      return { under: u, curves: c, over: o };
    },
    revealSeq: function () { return [['ghost', 0, 450], ['slide', 350, 1900], ['cross', 2200, 550]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var split = !f.skipped && Math.abs(g.f - g.n) > 0.15 * s.Smax ? 'Your two markers ended in different places, the most common hunch. ' : '';
      return {
        rows: [
          ['Factory owns the right', num(g.f), num(s.Ss)],
          ['Neighbor owns the right', num(g.n), num(s.Ss)]
        ],
        why: split + 'Either way they bargain to S* = ' + num(s.Ss) + ', where the factory’s MB equals the neighbor’s MD at ' + money(s.price) +
          '. Whenever the two differ, one side can pay the other and both come out ahead. The right only decides who pays: the neighbor pays ' + money(s.fLoss) + ' to ' + money(s.nSave) +
          ' to cut pollution, or the factory pays ' + money(s.nHarm) + ' to ' + money(s.fGain) + ' for permission.'
      };
    },
    exInit: function (f) { f.ex.who = 'f'; f.ex.S = f.sol.Ss; },
    explore: {
      hint: function () { return 'Pick who owns the right, then drag the black marker along its line, one deal at a time.'; },
      controls: function () {
        return '<div class="seg" role="group" aria-label="Who owns the right">' +
          '<button type="button" data-act="who-f" aria-pressed="true">Factory owns it</button>' +
          '<button type="button" data-act="who-n" aria-pressed="false">Neighbor owns it</button></div>';
      },
      act: function (f, a, btn) {
        var who = a === 'who-f' ? 'f' : 'n'; if (who === f.ex.who) return;
        f.ex.who = who;
        f.root.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        f.tween(f.ex, 'S', who === 'f' ? f.sol.Smax : 0, 500);
      },
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

  window.W11FIGS = [pigou, cap, pos, pub, coase];
})();
