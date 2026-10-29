/* Week 11 figures as scroll stories. Each figure = story states + one scene() that draws
 * any state (story or "your turn") + a scoreboard + the your-turn controls.
 * Models and defaults follow week11-viz.html and the Week 11 textbook. */
(function () {
  'use strict';
  var S = window.Scrolly, K = S.K;
  var C = { blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800', purple: '#6b52a8', grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257' };
  var T = { blue: '#14568c', orange: '#a8431f', green: '#256647', red: '#93301f', gold: '#7d5a00', purple: '#5a4590', ink: '#14181b', soft: '#4a5257' };
  var STEP_MS = 1100, TRY_MS = 750;

  function frame(D, xd, yd) {
    var m = D.narrow ? { l: 50, r: 16, t: 30, b: 54 } : { l: 74, r: 34, t: 44, b: 70 };
    return {
      sx: d3.scaleLinear().domain(xd).range([m.l, D.w - m.r]),
      sy: d3.scaleLinear().domain(yd).range([D.h - m.b, m.t]),
      m: m
    };
  }
  function range(a, b, s) { var r = []; for (var v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(6)); return r; }
  function assign(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function money(v) { return K.money(v); }

  /* ---------- controls ---------- */
  function seg(host, label, opts, get, set) {
    var wrap = document.createElement('div'); wrap.className = 'ctl';
    var lab = document.createElement('div'); lab.className = 'ctl-k'; lab.textContent = label; wrap.appendChild(lab);
    var row = document.createElement('div'); row.className = 'seg'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
    var btns = opts.map(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o.t;
      b.addEventListener('click', function () { set(o.v); });
      row.appendChild(b); return { b: b, v: o.v };
    });
    wrap.appendChild(row); host.appendChild(wrap);
    return function () { var cur = get(); btns.forEach(function (x) { x.b.setAttribute('aria-pressed', String(x.v === cur)); }); };
  }
  function stepper(host, label, get, set, min, max, step, fmt) {
    var wrap = document.createElement('div'); wrap.className = 'ctl';
    var lab = document.createElement('div'); lab.className = 'ctl-k'; lab.textContent = label; wrap.appendChild(lab);
    var row = document.createElement('div'); row.className = 'stepper';
    var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Less: ' + label);
    var val = document.createElement('output'); val.className = 'stepper-v'; val.setAttribute('aria-live', 'polite');
    var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'More: ' + label);
    minus.addEventListener('click', function () { set(Math.max(min, get() - step)); });
    plus.addEventListener('click', function () { set(Math.min(max, get() + step)); });
    row.appendChild(minus); row.appendChild(val); row.appendChild(plus);
    wrap.appendChild(row); host.appendChild(wrap);
    return function () { var v = get(); val.textContent = fmt(v); minus.disabled = v <= min; plus.disabled = v >= max; };
  }
  function action(host, text, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.textContent = text;
    b.addEventListener('click', fn); host.appendChild(b);
    return b;
  }

  /* ---------- scoreboard ---------- */
  function Board(el) { this.el = el; this.items = {}; }
  Board.prototype.render = function (rows, dur) {
    var self = this, seen = {};
    rows.forEach(function (r, idx) {
      seen[r.k] = true;
      var it = self.items[r.k];
      if (!it) {
        var d = document.createElement('div'); d.className = 'bd';
        d.innerHTML = '<div class="bd-k"></div><div class="bd-v"></div>';
        self.el.appendChild(d);
        it = self.items[r.k] = { el: d, k: d.firstChild, v: d.lastChild, num: null };
      }
      it.k.textContent = r.label;
      it.el.style.order = idx;

      var shown = r.value !== null && r.value !== undefined;
      it.el.classList.toggle('is-empty', !shown);
      if (!shown) { it.v.textContent = ' '; it.num = null; it.v.style.color = r.color || T.ink; return; }
      if (!r.delay || S.REDUCED) it.v.style.color = r.color || T.ink;
      it.v.classList.toggle('txt', typeof r.value === 'string');
      if (typeof r.value === 'string') { it.v.textContent = r.value; it.num = null; it.v.style.color = r.color || T.ink; return; }
      var col = r.color || T.ink;
      var from = it.num === null ? r.value : it.num, to = r.value, fmt = r.fmt || K.int;
      it.num = to;
      d3.select(it.v).interrupt().transition().delay(S.REDUCED ? 0 : (r.delay || 0)).duration(S.REDUCED ? 0 : dur).ease(d3.easeCubicInOut)
        .on('start', function () { this.style.color = col; })
        .tween('t', function () { var el = this, i = d3.interpolateNumber(from, to); return function (u) { el.textContent = fmt(i(u)); }; });
    });
    Object.keys(this.items).forEach(function (k) { self.items[k].el.style.display = seen[k] ? '' : 'none'; });
  };

  /* ---------- figure wiring ---------- */
  function mount(def) {
    var section = document.getElementById(def.id);
    var stage = new S.Stage(section.querySelector('.chart'), def.aria);
    var board = new Board(section.querySelector('.board'));
    var tryState = assign(def.tryInit, {});
    var cur = -1, nSteps = section.querySelectorAll('.step').length;
    function stateFor(i) {
      if (i < 0) return def.blank;
      if (i >= nSteps - 1) return assign(tryState, { isTry: true });
      return def.story[i];
    }
    function paint(dur) {
      var D = stage.measure(), st = stateFor(cur);
      stage.render(def.scene(st, D), dur);
      board.render(def.board(st), dur);
      section.querySelector('.chart svg').setAttribute('aria-label', def.aria + '. ' + (def.alt ? def.alt(st) : ''));
      if (sync) sync();
    }
    var api = {
      get: function () { return tryState; },
      set: function (patch, dur) { tryState = assign(tryState, patch); if (cur >= nSteps - 1) paint(dur === undefined ? TRY_MS : dur); else if (sync) sync(); }
    };
    var sync = null;
    var host = section.querySelector('.ctrls');
    if (host && def.controls) sync = def.controls(host, api);
    var fig = {
      go: function (i) { cur = i; paint(STEP_MS); },
      redraw: function () { paint(0); }
    };
    new S.Story(section, fig);
    paint(0);
    return fig;
  }

  /* =====================================================================
   * 11.1  Negative externality and the Pigouvian tax
   * MB = 100 - Q, PMC = 10 + Q, SMC = PMC + MEC. Market Q = 45, optimum (90 - MEC)/2.
   * ===================================================================== */
  var F111 = {
    id: 'f111',
    aria: 'Graph of a negative externality and a Pigouvian tax',
    blank: { mec: 20 },
    story: [
      { mec: 20, mb: 1 },
      { mec: 20, mb: 1, pmc: 1, mkt: 1 },
      { mec: 20, mb: 1, pmc: 1, mkt: 1, smc: 1, gap: 1 },
      { mec: 20, mb: 1, pmc: 1, mkt: 1, smc: 1, opt: 1 },
      { mec: 20, mb: 1, pmc: 1, mkt: 1, smc: 1, opt: 1, dwl: 1 },
      { mec: 20, mb: 1, pmc: 1, mkt: 1, smc: 1, opt: 1, dwl: 1, tax: 1, gap: 1, settle: 1 }
    ],
    tryInit: { mec: 20, tax: false },
    scene: function (st, D) {
      var f = frame(D, [0, 100], [0, 105]), sx = f.sx, sy = f.sy, n = D.narrow;
      var full = st.isTry, m = st.mec, Qs = (90 - m) / 2;
      var tax = full ? st.tax : !!st.tax;
      var settled = full ? st.tax : !!st.settle;
      var on = function (k) { return full || !!st[k]; };
      var sp = {};
      K.axes(sp, D, sx, sy, { xt: range(0, 100, 20), yt: range(0, 100, 20), yf: function (v) { return '$' + v; }, xl: 'Quantity', yl: '$ per unit',
        xhide: function (v) { return v === 0; } });
      var pmcPts = [[0, 10], [95, 105]], smcPts = [[0, 10 + m], [95 - m, 105]];
      var dly = settled && !full ? 900 : 0;
      if (on('mb')) {
        sp.mb = K.curve(K.line([[0, 100], [100, 0]], sx, sy), C.blue);
        sp.mbL = K.label(sx(82), sy(28), n ? 'MB' : 'MB (demand)', T.blue, 'start');
      }
      if (on('pmc')) {
        if (tax && m > 0) {
          sp.pmcGhost = { tag: 'path', layer: 'curve', set: { class: 'curve ghost' }, attrs: { d: K.line(pmcPts, sx, sy), stroke: C.orange }, opacity: 0.35 };
          sp.pmcGhostL = K.label(sx(78) + 6, sy(80), 'PMC', C.orange, 'start', { opacity: 0.6 });
        } else {
          sp.pmcL = K.label(sx(78) + 6, sy(80), n ? 'PMC' : 'PMC (supply)', T.orange, 'start');
        }
        sp.pmc = K.curve(K.line(tax ? smcPts : pmcPts, sx, sy), tax && m > 0 ? C.purple : C.orange);
      }
      var longSmc = !n;
      if (on('smc') && m > 0) {
        if (!tax) {
          sp.smc = { tag: 'path', layer: 'curve', set: { class: 'curve' }, attrs: { d: K.line(smcPts, sx, sy), stroke: C.purple }, from: { d: K.line(pmcPts, sx, sy) } };
          sp.smcL = K.label(sx(85 - m) - 12, sy(95), longSmc ? 'SMC = PMC + MEC' : 'SMC', T.purple, 'end');
        } else {
          sp.taxL = K.label(sx(85 - m) - 12, sy(95), longSmc ? 'PMC + tax = SMC' : 'PMC + tax', T.purple, 'end');
        }
      }
      if ((on('gap') || (full && m > 0)) && m > 0) {
        var a = K.arrow(sx(20), sy(30), sy(30 + m), C.gold);
        a.from = { d: K.arrow(sx(20), sy(30), sy(30.5), C.gold).attrs.d };
        sp.gap = a;
        sp.gapL = n ? K.label(sx(20) + 7, sy(30 + m / 2) + 7, '$' + m, T.gold, 'start')
          : K.label(sx(20) - 12, sy(30) + 36, (tax ? 'tax $' : 'MEC $') + m, T.gold, 'start');
      }
      var Qm = settled ? Qs : 45;
      if (on('opt') && m > 0) {
        sp.opt = K.dot(sx(Qs), sy(100 - Qs), C.purple);
        sp.optG = K.guide(sx(Qs), sy(0), sx(Qs), sy(100 - Qs), C.purple);
        sp.optL = K.label(sx(Qs) - 10, sy(0) - 14, 'Q* = ' + fmtQ(Qs), T.purple, 'end');
      }
      if (on('mkt')) {
        var col = settled && m > 0 ? C.purple : C.ink;
        sp.mkt = assign(K.dot(sx(Qm), sy(100 - Qm), col), { delay: dly });
        sp.mktG = assign(K.guide(sx(Qm), sy(0), sx(Qm), sy(100 - Qm), col), { delay: dly });
        if (!settled || m === 0) sp.mktL = K.label(sx(45) + 10, sy(0) - 14, m === 0 ? 'Q = Q* = 45' : 'Q = 45', T.ink, 'start');
        if (settled && m > 0 && full) sp.optL = K.label(sx(Qs) - 10, sy(0) - 14, 'Q* = ' + fmtQ(Qs), T.purple, 'end');
      }
      if (on('dwl') && m > 0) {
        var tri = [[Qs, 100 - Qs], [45, 55], [45, 55 + m]], pt = [[Qs, 100 - Qs], [Qs, 100 - Qs], [Qs, 100 - Qs]];
        sp.dwl = { tag: 'path', layer: 'area', set: { class: 'area' }, attrs: { d: K.poly(settled ? pt : tri, sx, sy), fill: C.red }, from: { d: K.poly(pt, sx, sy) }, opacity: settled ? 0 : 0.32, delay: dly };
        sp.dwlL = K.label(sx(57), sy(56), (n ? 'DWL ' : 'Deadweight loss ') + money(m * m / 4), T.red, 'start', { opacity: settled ? 0 : 1, delay: settled ? 0 : 250 });
      }
      return sp;
    },
    board: function (st) {
      var full = st.isTry, m = st.mec, Qs = (90 - m) / 2;
      var settled = full ? st.tax : !!st.settle;
      var Qm = settled ? Qs : 45;
      var show = full || st.mkt, dl = settled && !full ? 900 : 0;
      return [
        { k: 'q', label: 'Quantity', value: show ? Qm : null, delay: dl },
        { k: 'p', label: 'Buyers pay', value: show ? 100 - Qm : null, fmt: money, delay: dl },
        { k: 'd', label: 'Deadweight loss', value: full || st.dwl ? (settled ? 0 : m * m / 4) : null, fmt: money, delay: dl, color: (settled || m === 0) ? T.green : T.red }
      ];
    },
    alt: function (st) {
      var m = st.mec, Qs = (90 - m) / 2;
      return 'MEC $' + m + '. Market quantity 45, efficient quantity ' + fmtQ(Qs) + (st.tax || st.settle ? ', tax applied.' : '.');
    },
    controls: function (host, api) {
      var a = seg(host, 'Harm per unit (MEC)', [0, 10, 20, 30, 40].map(function (v) { return { v: v, t: '$' + v }; }),
        function () { return api.get().mec; }, function (v) { api.set({ mec: v }); });
      var b = seg(host, 'Pigouvian tax', [{ v: false, t: 'No tax' }, { v: true, t: 'Tax = MEC' }],
        function () { return api.get().tax; }, function (v) { api.set({ tax: v }); });
      return function () { a(); b(); };
    }
  };
  function money2(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? money(v) : '$' + v.toFixed(2); }
  function share300(N) { return 300 / N; }
  function fmtQ(v) { return (Math.round(v * 10) / 10).toString(); }

  /* =====================================================================
   * 11.2  Cap-and-trade: MAC_A = 2e, MAC_B = 8e, 100 units of cleanup in total.
   * Least cost where 2eA = 8eB: eA = 80, eB = 20, permit price $160, cost $8,000 vs $12,500.
   * ===================================================================== */
  var TOT = 100;
  function cost112(eA) { var eB = TOT - eA; return eA * eA + 4 * eB * eB; }
  var F112 = {
    id: 'f112',
    aria: 'Graph of marginal abatement cost for two firms under cap-and-trade',
    blank: {},
    story: [
      { goal: 1 },
      { goal: 1, a: 1, b: 1 },
      { a: 1, b: 1, eA: 50 },
      { a: 1, b: 1, eA: 65, ghost: 50 },
      { a: 1, b: 1, eA: 80, lam: 1, ghost: 50 },
      { a: 1, b: 1, eA: 80, lam: 1, ghost: 50, saved: 1 }
    ],
    tryInit: { eA: 50 },
    scene: function (st, D) {
      var f = frame(D, [0, 100], [0, 500]), sx = f.sx, sy = f.sy, n = D.narrow;
      var full = st.isTry, sp = {};
      K.axes(sp, D, sx, sy, { xt: range(0, 100, 20), yt: range(0, 500, 100), yf: function (v) { return '$' + v; }, xl: 'Units cleaned up by a firm', yl: '$ per unit cleaned',
        xhide: function (v) { return v === 0; } });
      if (st.goal && !full && !st.a) {
        sp.goal = K.label(sx(50), sy(300), 'Goal: 100 units, shared by two firms', T.soft, 'middle', { set: { class: 'lbl big', 'text-anchor': 'middle' } });
      }
      if (full || st.a) {
        sp.a = K.curve(K.line([[0, 0], [100, 200]], sx, sy), C.blue);
        sp.aL = K.label(sx(99), sy(198) - 16, n ? 'A: MAC = 2e' : 'Firm A: MAC = 2e', T.blue, 'end');
      }
      if (full || st.b) {
        sp.b = K.curve(K.line([[0, 0], [62.5, 500]], sx, sy), C.orange, { delay: full ? 0 : 450 });
        sp.bL = K.label(sx(380 / 8) - 14, sy(380), n ? 'B: MAC = 8e' : 'Firm B: MAC = 8e', T.orange, 'end', { delay: full ? 0 : 450 });
      }
      var eA = st.eA;
      if (eA !== undefined) {
        var eB = TOT - eA, pa = 2 * eA, pb = 8 * eB, atLam = Math.abs(pa - pb) < 1e-9;
        if (st.ghost !== undefined && !full) {
          sp.gA = { tag: 'circle', layer: 'mark', set: { class: 'ghostdot', style: 'stroke:' + C.blue }, attrs: { cx: sx(50), cy: sy(100), r: 8 } };
          sp.gB = { tag: 'circle', layer: 'mark', set: { class: 'ghostdot', style: 'stroke:' + C.orange }, attrs: { cx: sx(50), cy: sy(400), r: 8 } };
        }
        sp.gdA = K.guide(sx(eA), sy(0), sx(eA), sy(pa), C.blue);
        sp.gdB = K.guide(sx(eB), sy(0), sx(eB), sy(pb), C.orange);
        sp.dA = K.dot(sx(eA), sy(pa), C.blue);
        sp.dB = K.dot(sx(eB), sy(pb), C.orange);
        if (eA === eB) {
          sp.cA = K.label(sx(50) + 10, sy(0) - 14, n ? 'each: 50' : 'each cuts 50', T.ink, 'start');
        } else {
          var txA = n ? 'A: ' + eA : 'A cuts ' + eA, txB = n ? 'B: ' + eB : 'B cuts ' + eB;
          if (eB < eA) {
            var aEnd = eA > 84;
            sp.cA = K.label(sx(eA) + (aEnd ? -10 : 10), sy(0) - 14, txA, T.blue, aEnd ? 'end' : 'start');
            if (eB >= 15) sp.cB = K.label(sx(eB) + 8, sy(4 * eB) + 7, txB, T.orange, 'start');
          } else {
            sp.cA = K.label(sx(eA) - 10, sy(0) - 14, txA, T.blue, 'end');
            sp.cB = K.label(sx(eB) + 10, sy(0) - 14, txB, T.orange, 'start');
          }
        }
        if (st.lam || (full && atLam)) {
          sp.lam = K.curve(K.line([[0, 160], [100, 160]], sx, sy), C.gold, { set: { class: 'curve thin' } });
          sp.lamL = K.label(sx(50), sy(160) - 14, n ? 'price $160' : 'permit price $160', T.gold, 'middle');
        } else {
          sp.vA = K.label(sx(eA) - 12, sy(pa) - 12, money(pa), T.blue, 'end');
          sp.vB = K.label(sx(eB) + 16, sy(pb) + 7, money(pb), T.orange, 'start');
        }
      }
      return sp;
    },
    board: function (st) {
      var eA = st.eA, has = eA !== undefined, c = has ? cost112(eA) : null;
      var rows = [
        { k: 'a', label: 'A cuts', value: has ? eA : null, color: T.blue },
        { k: 'b', label: 'B cuts', value: has ? TOT - eA : null, color: T.orange },
        { k: 'c', label: 'Total cost', value: c, fmt: money, color: c === 8000 ? T.green : T.ink }
      ];
      if (st.saved || (st.isTry && eA !== 50)) rows.push({ k: 's', label: 'Saved vs equal', value: 12500 - c, fmt: function (v) { return (v < -0.5 ? '\u2212' : '') + money(Math.abs(v)); }, color: 12500 - c >= 0 ? T.green : T.red });
      return rows;
    },
    alt: function (st) { return st.eA !== undefined ? 'Firm A cleans ' + st.eA + ', Firm B ' + (TOT - st.eA) + ', total cost ' + money(cost112(st.eA)) : ''; },
    controls: function (host, api) {
      var a = stepper(host, 'Units Firm A cleans up (B does the rest)', function () { return api.get().eA; }, function (v) { api.set({ eA: v }); }, 40, 100, 5, function (v) { return v + ' / ' + (TOT - v); });
      var row = document.createElement('div'); row.className = 'ctl-acts'; host.appendChild(row);
      action(row, 'Equal shares', function () { api.set({ eA: 50 }); });
      action(row, 'Let permits decide', function () { api.set({ eA: 80 }, 1200); });
      return a;
    }
  };

  /* =====================================================================
   * 11.3  Positive externality and the subsidy. MB = 100 - Q, MC = 10 + Q, MSB = MB + MEB.
   * Market Q = 45, optimum (90 + MEB)/2, DWL = MEB^2 / 4.
   * ===================================================================== */
  var F113 = {
    id: 'f113',
    aria: 'Graph of a positive externality and a Pigouvian subsidy',
    blank: { meb: 20 },
    story: [
      { meb: 20, mb: 1 },
      { meb: 20, mb: 1, mc: 1, mkt: 1 },
      { meb: 20, mb: 1, mc: 1, mkt: 1, msb: 1, gap: 1 },
      { meb: 20, mb: 1, mc: 1, mkt: 1, msb: 1, opt: 1 },
      { meb: 20, mb: 1, mc: 1, mkt: 1, msb: 1, opt: 1, dwl: 1 },
      { meb: 20, mb: 1, mc: 1, mkt: 1, msb: 1, opt: 1, dwl: 1, sub: 1, gap: 1, settle: 1 }
    ],
    tryInit: { meb: 20, sub: false },
    scene: function (st, D) {
      var f = frame(D, [0, 100], [0, 140]), sx = f.sx, sy = f.sy, n = D.narrow;
      var full = st.isTry, e = st.meb, Qs = (90 + e) / 2;
      var sub = full ? st.sub : !!st.sub, settled = full ? st.sub : !!st.settle;
      var on = function (k) { return full || !!st[k]; };
      var sp = {};
      K.axes(sp, D, sx, sy, { xt: range(0, 100, 20), yt: range(0, 140, 20), yf: function (v) { return '$' + v; }, xl: 'Flu shots', yl: '$ per shot',
        xhide: function (v) { return v === 0; } });
      var mbPts = [[0, 100], [100, 0]], msbPts = [[0, 100 + e], [100, e]];
      var dly = settled && !full ? 900 : 0;
      if (on('mc')) {
        sp.mc = K.curve(K.line([[0, 10], [100, 110]], sx, sy), C.orange);
        sp.mcL = K.label(sx(84) + 4, sy(80), n ? 'MC' : 'MC (supply)', T.orange, 'start');
      }
      if (on('mb')) {
        if (sub && e > 0) {
          sp.mbGhost = { tag: 'path', layer: 'curve', set: { class: 'curve ghost' }, attrs: { d: K.line(mbPts, sx, sy), stroke: C.blue }, opacity: 0.35 };
        } else {
          sp.mbL = n ? K.label(sx(2), sy(78), 'MB', T.blue, 'start') : K.label(sx(30), sy(70) + 34, 'MB (demand)', T.blue, 'end');
        }
        sp.mb = K.curve(K.line(sub ? msbPts : mbPts, sx, sy), sub && e > 0 ? C.green : C.blue);
      }
      var longL = !n;
      if (on('msb') && e > 0) {
        if (!sub) {
          sp.msb = { tag: 'path', layer: 'curve', set: { class: 'curve' }, attrs: { d: K.line(msbPts, sx, sy), stroke: C.green }, from: { d: K.line(mbPts, sx, sy) } };
          sp.msbL = K.label(sx(24), sy(100 + e - 24) - 16, longL ? 'MSB = MB + MEB' : 'MSB', T.green, 'start');
        } else {
          sp.subL = K.label(sx(24), sy(100 + e - 24) - 16, longL ? 'MB + subsidy = MSB' : 'MB + subsidy', T.green, 'start');
        }
      }
      if ((on('gap') || full) && e > 0) {
        var a = K.arrow(sx(75), sy(25), sy(25 + e), C.gold);
        a.from = { d: K.arrow(sx(75), sy(25), sy(25.5), C.gold).attrs.d };
        sp.gap = a;
        sp.gapL = n ? K.label(sx(75) + 7, sy(25 + e / 2) + 7, '$' + e, T.gold, 'start')
          : K.label(sx(75) + 10, sy(25) + 34, (sub ? 'subsidy $' : 'MEB $') + e, T.gold, 'end');
      }
      var Qm = settled ? Qs : 45;
      if (on('opt') && e > 0) {
        sp.opt = K.dot(sx(Qs), sy(10 + Qs), C.green);
        sp.optG = K.guide(sx(Qs), sy(0), sx(Qs), sy(10 + Qs), C.green);
        sp.optL = K.label(sx(Qs) + 10, sy(0) - 14, 'Q* = ' + fmtQ(Qs), T.green, 'start');
      }
      if (on('mkt')) {
        var col = settled && e > 0 ? C.green : C.ink;
        sp.mkt = assign(K.dot(sx(Qm), sy(10 + Qm), col), { delay: dly });
        sp.mktG = assign(K.guide(sx(Qm), sy(0), sx(Qm), sy(10 + Qm), col), { delay: dly });
        if (!settled || e === 0) sp.mktL = K.label(sx(45) - 10, sy(0) - 14, e === 0 ? 'Q = Q* = 45' : 'Q = 45', T.ink, 'end');
        if (settled && e > 0 && full) sp.optL = K.label(sx(Qs) + 10, sy(0) - 14, 'Q* = ' + fmtQ(Qs), T.green, 'start');
      }
      if (on('dwl') && e > 0) {
        var tri = [[45, 55], [45, 55 + e], [Qs, 10 + Qs]], pt = [[Qs, 10 + Qs], [Qs, 10 + Qs], [Qs, 10 + Qs]];
        sp.dwl = { tag: 'path', layer: 'area', set: { class: 'area' }, attrs: { d: K.poly(settled ? pt : tri, sx, sy), fill: C.red }, from: { d: K.poly([[45, 55], [45, 55], [45, 55]], sx, sy) }, opacity: settled ? 0 : 0.32, delay: dly };
        sp.dwlL = K.label(sx(40), sy(52), (n ? 'DWL ' : 'Deadweight loss ') + money(e * e / 4), T.red, 'end', { opacity: settled ? 0 : 1, delay: settled ? 0 : 250 });
      }
      return sp;
    },
    board: function (st) {
      var full = st.isTry, e = st.meb, Qs = (90 + e) / 2;
      var settled = full ? st.sub : !!st.settle, Qm = settled ? Qs : 45, show = full || st.mkt, dl = settled && !full ? 900 : 0;
      return [
        { k: 'q', label: 'Shots', value: show ? Qm : null, delay: dl },
        { k: 'p', label: 'Buyers pay', value: show ? 100 - Qm : null, fmt: money, delay: dl },
        { k: 'd', label: 'Deadweight loss', value: full || st.dwl ? (settled ? 0 : e * e / 4) : null, fmt: money, delay: dl, color: (settled || e === 0) ? T.green : T.red }
      ];
    },
    alt: function (st) { var e = st.meb; return 'MEB $' + e + '. Market 45 shots, efficient ' + fmtQ((90 + e) / 2) + '.'; },
    controls: function (host, api) {
      var a = seg(host, 'Spillover benefit per shot (MEB)', [0, 10, 20, 30, 40].map(function (v) { return { v: v, t: '$' + v }; }),
        function () { return api.get().meb; }, function (v) { api.set({ meb: v }); });
      var b = seg(host, 'Pigouvian subsidy', [{ v: false, t: 'No subsidy' }, { v: true, t: 'Subsidy = MEB' }],
        function () { return api.get().sub; }, function (v) { api.set({ sub: v }); });
      return function () { a(); b(); };
    }
  };

  /* =====================================================================
   * 11.4  Public good: $300 streetlight, N neighbors each valuing it at v (default 3 x $120).
   * Values add vertically: provision is efficient when N v > 300.
   * ===================================================================== */
  var NAMES = ['Amara', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana'];
  var PCOL = [C.blue, C.purple, C.gold, C.green, C.orange, '#14568c', '#5a4590', '#7d5a00'];
  var F114 = {
    id: 'f114',
    aria: 'Bar chart of a public good: each neighbor\'s value and the values added up against the cost',
    blank: { N: 3, v: 120, shown: 0 },
    story: [
      { N: 3, v: 120, shown: 0, cost: 1 },
      { N: 3, v: 120, shown: 1, cost: 1 },
      { N: 3, v: 120, shown: 3, cost: 1 },
      { N: 3, v: 120, shown: 3, cost: 1, stack: 1 },
      { N: 3, v: 120, shown: 3, cost: 1, stack: 1, ride: 1 },
      { N: 3, v: 120, shown: 3, cost: 1, stack: 1, fix: 1 }
    ],
    tryInit: { N: 3, v: 120 },
    scene: function (st, D) {
      var full = st.isTry, N = st.N, v = st.v, total = N * v, n = D.narrow;
      var yMax = full ? Math.max(400, Math.ceil(Math.max(total, 300) * 1.18 / 100) * 100) : 400;
      var f = frame(D, [0, 1], [0, yMax]), sx = f.sx, sy = f.sy, sp = {};
      var step = yMax <= 500 ? 100 : yMax <= 1000 ? 200 : 400;
      K.axes(sp, D, sx, sy, { xt: [], yt: range(0, yMax, step), yf: function (v) { return '$' + v; }, yl: 'Value of the light' });
      var shown = full ? N : st.shown, efficient = total > 300;
      var stack = full || st.stack, ride = !full && st.ride, fix = full ? efficient : !!st.fix;
      var share = 300 / N;
      var L = 0.6, g = L / N, bw = Math.min(g * 0.66, 0.15);
      for (var i = 0; i < 8; i++) {
        if (i >= shown) continue;
        var cx = g * i + g / 2, x0 = cx - bw / 2;
        var r = { x: sx(x0), y: sy(v), width: Math.max(2, sx(x0 + bw) - sx(x0)), height: Math.max(0, sy(0) - sy(v)), fill: PCOL[i] };
        sp['p' + i] = { tag: 'rect', layer: 'area', set: { class: 'bar' }, attrs: r, from: { y: sy(0), height: 0 }, delay: full ? 0 : i * 140 };
        var nameTxt = (n || N > 4) ? NAMES[i].charAt(0) : NAMES[i];
        sp['pn' + i] = K.label(sx(cx), sy(0) + (n ? 24 : 28), nameTxt, T.ink, 'middle', { set: { class: 'lbl small', 'text-anchor': 'middle' } });
        var top = fix ? '+' + money2(v - share) : money(v);
        if (N <= 4 || (!fix && N <= 6) || (!n && !fix)) sp['pv' + i] = K.label(sx(cx), sy(v) - 10, top, fix ? T.green : T.ink, 'middle', { set: { class: 'lbl ' + (N > 4 ? 'small' : ''), 'text-anchor': 'middle' }, delay: full ? 0 : i * 140 + 200 });
        if (fix) {
          var pw = r.width, ptxt = pw >= 96 ? 'pays ' + money2(share) : pw >= 44 && Number.isInteger(share) ? money(share) : '';
          if (ptxt && sy(0) - sy(share) > 26) sp['pt' + i] = { tag: 'text', layer: 'label', set: { class: 'inbar', 'text-anchor': 'middle' }, attrs: { x: sx(cx), y: sy(share) + 24 }, text: ptxt };
          sp['ps' + i] = { tag: 'rect', layer: 'mark', set: { class: 'share' }, attrs: { x: r.x, y: sy(share), width: r.width, height: sy(0) - sy(share) }, from: { y: sy(0), height: 0 } };
        }
      }
      if (stack) {
        var X0 = 0.68, X1 = 0.86;
        for (var j = 0; j < N; j++) {
          var gx = g * j + g / 2 - bw / 2;
          sp['s' + j] = { tag: 'rect', layer: 'area', set: { class: 'bar stackbar' + (ride ? ' dim' : '') },
            attrs: { x: sx(X0), y: sy(v * (j + 1)), width: sx(X1) - sx(X0), height: Math.max(0, sy(0) - sy(v)), fill: ride ? C.grey : PCOL[j] },
            from: { x: sx(gx), width: Math.max(2, sx(gx + bw) - sx(gx)), y: sy(v), height: Math.max(0, sy(0) - sy(v)) },
            pop: !full, delay: full ? 0 : j * 260 };
        }
        sp.stL = K.label(sx((X0 + X1) / 2), sy(0) + (n ? 24 : 28), n ? 'All' : 'Added up', T.ink, 'middle', { set: { class: 'lbl small', 'text-anchor': 'middle' } });
        sp.stV = K.label(sx((X0 + X1) / 2), sy(total) - 10, money(total), efficient && !ride ? T.green : T.soft, 'middle', { delay: full ? 0 : 700 });
        if (efficient && !ride) {
          sp.sur = { tag: 'path', layer: 'mark', set: { class: 'bracket' }, attrs: { d: 'M' + (sx(X0) - 6) + ',' + sy(total) + 'h-8V' + sy(300) + 'h8', stroke: C.green }, delay: full ? 0 : 900 };
          sp.surL = K.label(sx(X0) - 18, Math.min((sy(total) + sy(300)) / 2 + 7, sy(300) - 10), '+' + money(total - 300), T.green, 'end', { delay: full ? 0 : 900 });
        }
        if (ride) sp.rideL = K.label(sx((X0 + X1) / 2), sy(Math.min(total, 300) / 2) + 8, n ? 'Unbuilt' : 'Never built', T.red, 'middle', { set: { class: 'lbl big', 'text-anchor': 'middle' } });
      }
      if (st.cost || full) {
        sp.cost = K.curve(K.line([[0, 300], [0.98, 300]], sx, sy), C.ink, { set: { class: 'curve thin costline' } });
        sp.costL = K.label(sx(0.01), sy(300) - 12, n ? 'Cost $300' : 'Streetlight costs $300', T.ink, 'start');
      }
      return sp;
    },
    board: function (st) {
      var N = st.N, v = st.v, total = N * v, full = st.isTry, eff = total > 300;
      var rows = full ? [] : [{ k: 'n', label: 'Neighbors', value: st.shown || null }];
      rows.push({ k: 't', label: 'Total value', value: full || st.stack ? total : null, fmt: money, color: eff ? T.green : T.ink });
      var out = null, col = T.ink;
      if (full) {
        if (v >= 300) { out = 'Built by one person'; col = T.green; }
        else if (eff) { out = 'Built only with a deal'; col = T.gold; }
        else { out = 'Not worth building'; col = T.soft; }
      } else if (st.fix) { out = 'Built'; col = T.green; }
      else if (st.ride) { out = 'Not built'; col = T.red; }
      else if (st.stack) { out = 'Worth building'; col = T.green; }
      if (full) rows.push({ k: 'e', label: 'Each pays', value: money2(share300(N)), color: eff ? T.ink : T.soft });
      rows.push({ k: 'o', label: 'Outcome', value: out, color: col });
      return rows;
    },
    alt: function (st) { return st.N + ' neighbors each value it at $' + st.v + ', total $' + st.N * st.v + ' against a $300 cost.'; },
    controls: function (host, api) {
      var a = stepper(host, 'Neighbors', function () { return api.get().N; }, function (v) { api.set({ N: v }); }, 1, 8, 1, String);
      var b = stepper(host, 'Value to each', function () { return api.get().v; }, function (v) { api.set({ v: v }); }, 0, 200, 10, function (v) { return '$' + v; });
      return function () { a(); b(); };
    }
  };

  /* =====================================================================
   * 11.5  Coase: MB = 100 - 2S (factory), MD = 2S (neighbor), S* = 25.
   * Gains from a deal from either corner: 1/2 x 25 x 100 = $1,250. Deal range $625 to $1,875.
   * ===================================================================== */
  var F115 = {
    id: 'f115',
    aria: 'Graph of the Coase theorem: the factory\'s marginal benefit and the neighbor\'s marginal damage',
    blank: {},
    story: [
      { mb: 1, md: 1 },
      { mb: 1, md: 1, opt: 1 },
      { mb: 1, md: 1, opt: 1, right: 'factory', S: 50 },
      { mb: 1, md: 1, opt: 1, right: 'factory', S: 25, start: 50 },
      { mb: 1, md: 1, opt: 1, right: 'neighbor', S: 0 },
      { mb: 1, md: 1, opt: 1, right: 'neighbor', S: 25, start: 0 }
    ],
    tryInit: { right: 'factory', S: 50 },
    scene: function (st, D) {
      var f = frame(D, [0, 50], [0, 105]), sx = f.sx, sy = f.sy, n = D.narrow, full = st.isTry, sp = {};
      K.axes(sp, D, sx, sy, { xt: range(0, 50, 10), yt: range(0, 100, 20), yf: function (v) { return '$' + v; }, xl: 'Pollution, S', yl: '$ per unit',
        xhide: function (v) { return v === 0; } });
      var MB = function (s) { return 100 - 2 * s; }, MD = function (s) { return 2 * s; };
      if (full || st.mb) {
        sp.mb = K.curve(K.line([[0, 100], [50, 0]], sx, sy), C.blue);
        sp.mbL = K.label(sx(5), sy(98), n ? 'MB, factory' : 'MB, factory\'s gain', T.blue, 'start');
      }
      if (full || st.md) {
        sp.md = K.curve(K.line([[0, 0], [50, 100]], sx, sy), C.red, { delay: full ? 0 : 400 });
        sp.mdL = K.label(sx(41), sy(92), n ? 'MD, neighbor' : 'MD, neighbor\'s harm', T.red, 'end', { delay: full ? 0 : 400 });
      }
      if (full || st.opt) {
        sp.opt = K.dot(sx(25), sy(50), C.ink);
        sp.optG = K.guide(sx(25), sy(0), sx(25), sy(50), C.ink);
        sp.optL = K.label(sx(25) + 10, sy(0) - 14, 'S* = 25', T.ink, 'start');
        if (!st.right) sp.optV = K.label(sx(25), sy(50) - 20, '$50', T.ink, 'middle');
      }
      if (st.right) {
        var Sv = st.S, start = st.start !== undefined ? st.start : (st.right === 'factory' ? 50 : 0);
        var lo = Math.min(Sv, 25), hi = Math.max(Sv, 25);
        var wedge = [[lo, MB(lo)], [hi, MB(hi)], [hi, MD(hi)], [lo, MD(lo)]];
        if (Sv > 25) wedge = [[lo, MD(lo)], [hi, MD(hi)], [hi, MB(hi)], [lo, MB(lo)]];
        var gain = 0.5 * (hi - lo) * Math.abs(MB(Sv) - MD(Sv));
        var dly = st.start !== undefined && !full ? 250 : 0;
        sp.wedge = { tag: 'path', layer: 'area', set: { class: 'area' }, attrs: { d: K.poly(wedge, sx, sy), fill: C.green }, opacity: gain > 0 ? 0.3 : 0, delay: dly, dur: full ? 1400 : undefined };
        if (gain > 0) {
          var wx = Sv > 25 ? 41 : 9;
          sp.wedgeL = K.label(sx(wx), sy(50) + 8, money(gain), T.green, 'middle', { set: { class: 'lbl big', 'text-anchor': 'middle' } });
        }
        if (Sv !== start) sp.startG = { tag: 'line', layer: 'guide', set: { class: 'guide faint' }, attrs: { x1: sx(start), y1: sy(0), x2: sx(start), y2: sy(100), stroke: C.soft } };
        sp.sG = assign(K.guide(sx(Sv), sy(0), sx(Sv), sy(Math.max(MB(Sv), MD(Sv))), C.ink), { delay: dly, dur: full ? 1400 : undefined });
        sp.sMB = assign(K.dot(sx(Sv), sy(MB(Sv)), C.blue, 8), { delay: dly, dur: full ? 1400 : undefined });
        sp.sMD = assign(K.dot(sx(Sv), sy(MD(Sv)), C.red, 8), { delay: dly, dur: full ? 1400 : undefined });
      }
      return sp;
    },
    board: function (st) {
      if (!st.right) return [{ k: 's', label: 'Pollution', value: st.opt ? 25 : null }, { k: 'w', label: 'Who pays', value: null }, { k: 'r', label: 'Payment', value: null }];
      var done = st.S === 25;
      var who = st.right === 'factory' ? 'Neighbor' : 'Factory';
      return [
        { k: 's', label: 'Pollution', value: st.S },
        { k: 'w', label: 'Who pays', value: who, color: done ? T.green : T.ink },
        { k: 'r', label: 'Payment', value: '$625 to $1,875', color: done ? T.green : T.ink }
      ];
    },
    alt: function (st) { return st.right ? ('The ' + st.right + ' owns the right; pollution at ' + st.S + '.') : 'Efficient pollution S* = 25.'; },
    controls: function (host, api) {
      var a = seg(host, 'Who owns the right?', [{ v: 'factory', t: 'Factory' }, { v: 'neighbor', t: 'Neighbor' }],
        function () { return api.get().right; }, function (v) { api.set({ right: v, S: v === 'factory' ? 50 : 0 }); });
      var row = document.createElement('div'); row.className = 'ctl-acts'; host.appendChild(row);
      var go = action(row, 'Let them bargain', function () { api.set({ S: 25 }); });
      go.classList.add('primary');
      return function () { a(); go.disabled = api.get().S === 25; };
    }
  };

  function boot() { [F111, F112, F113, F114, F115].forEach(mount); S.poke(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
