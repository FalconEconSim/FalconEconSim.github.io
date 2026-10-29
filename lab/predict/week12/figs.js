/* Week 12 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week12-viz.html: buyers' average offer E[WTP] blue, the peach owner's reserve orange
 * (dashed), separating region red, pooling region green; in 12.2 the high type blue, the low type
 * orange, the outside option grey (dashed), the separating band green. Plum always means "you". */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, seg = Kit.seg;
  var M = window.W12, PLUM = C.plum;

  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) side(D, x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, prio: 1 }, 'UL UR DL DR L R'); }
  // label beside a data point, tried in a fixed order of sides; pref is a string of R L UR UL DR DL
  function side(D, x, y, s, o, pref) {
    var S = D.S, px = S.x(x), py = S.y(y), d = (o && o.d) || 18, at = {
      R: { x: px + d, y: py + 6, anchor: 'start' }, L: { x: px - d, y: py + 6, anchor: 'end' },
      UR: { x: px + d * 0.6, y: py - d * 0.8, anchor: 'start' }, UL: { x: px - d * 0.6, y: py - d * 0.8, anchor: 'end' },
      DR: { x: px + d * 0.6, y: py + d + 12, anchor: 'start' }, DL: { x: px - d * 0.6, y: py + d + 12, anchor: 'end' } };
    var order = (pref || 'R L UR UL DR DL').split(' ');
    ['R', 'L', 'UR', 'UL', 'DR', 'DL'].forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    return D.label(s, order.map(function (k) { return at[k]; }), Object.assign({ ring: 26, prio: 0 }, o || {}));
  }
  function cornerText(S, D, ytxt) {
    var fs = S.narrow ? 15 : 16;
    D.text(S.x0 - 10, S.y0 + 5.5, ytxt, { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
    D.text(S.x0, S.y0 + 25, '0', { size: fs, weight: 500, c: C.soft, anchor: 'middle', halo: false });
  }

  /* =====================================================================
     12.1  The market for lemons (has a film)
     ===================================================================== */
  var L = M.lemons;
  function kfmt(d) { return '$' + (d / 1000).toFixed(1) + 'k'; }
  // p* as a fraction when it is a simple one (2/3), else three decimals
  function psTxt(s) { return s.fd <= 6 ? s.fn + '/' + s.fd : num(s.ps, 3); }
  function psEq(s) { return s.fd <= 6 ? ' = ' + s.fn + '/' + s.fd : ' ≈ ' + num(s.ps, 3); }
  function pTxt(v) { return (+v).toFixed(2); }
  function eqTxt(p) { return num(p.WL) + ' + ' + num(p.WH - p.WL) + 'p'; }
  function isKnife(f) { return Math.abs(f.ex.p - f.sol.ps) < 1e-9; }
  var f121 = {
    key: 'f121', num: '12.1', topic: 'The market for lemons', short: 'Lemons', model: L,
    axes: function (f) { var Y0 = f.dom.Y0; return { xtitle: 'Fraction of peaches p', ytitle: 'Dollars', zero: false, xfmt: function (v) { return num(v, 1); }, yfmt: function (v) { return kfmt(v + Y0); } }; },
    film: { name: 'fig121-lemons', label: 'Animation: the market for lemons', title: 'Watch first, 37 seconds',
      caption: 'Buyers cannot tell a peach from a lemon, so they pay at most the average value, E[WTP] = 1,200 + 1,200p. Peach owners need $2,000, so both types trade only when at least 2/3 of the cars are peaches; with half peaches the offer is $1,800, peaches exit, and the market unravels until only lemons trade. Then try one yourself.' },
    question: function (f) { return 'How many peaches does the market need to keep them for sale? And at p = ' + pTxt(f.p.p0) + ', what does a car sell for?'; },
    setup: function (f) {
      var p = f.p;
      return 'A <b>lemon</b> is worth ' + money(p.WL) + ' to a buyer; its owner sells for ' + money(p.vL) + '. A <b>peach</b> is worth ' + money(p.WH) + ' to a buyer; its owner needs <b class="c-orange">' + money(p.vH) +
        '</b> (the dashed line). Buyers cannot tell them apart, so they offer the average value of a car from the pool. p is the share of peaches.';
    },
    steps: [
      { kind: 'drag', label: 'Knife-edge p*', prompt: 'Slide the plum point along the dashed reserve line to the smallest share of peaches at which peach owners still sell.',
        check: function (f) { return f.g.m1 ? (Math.abs(f.g.ps - L.start(f.dom).ps) > 0.005 ? true : 'Slide it along the line first.') : false; } },
      { kind: 'drag', label: function (f) { return 'Price at p = ' + pTxt(f.p.p0); },
        prompt: function (f) { return 'On the dotted line at p = ' + pTxt(f.p.p0) + ', drag the plum point up or down to the most a buyer will pay for a car that is actually for sale.'; },
        check: function (f) { return f.g.m2; } }
    ],
    kbdHint: 'Keyboard: left and right arrows slide the first point (Shift for bigger steps), Enter confirms. Then up and down arrows move the price point, Enter confirms. Space switches points.',
    initGuess: function (f) { var st = L.start(f.dom); return { ps: st.ps, m1: false, top: st.top, m2: false }; },
    handles: function (f, S) {
      var p = f.p, g = f.g, Y0 = f.dom.Y0, top = Y0 + f.dom.Y;
      if (f.predicting) {
        var hs = [{ x: g.ps, y: p.vH - Y0, c: PLUM, grip: 'h', step: 0, active: f.cur === 0, noAutoDone: true,
          hit: function (pt) { return Math.abs(pt.y - S.y(p.vH - Y0)) < 34 ? Math.abs(pt.x - S.x(g.ps)) : 1e9; },
          set: function (f, X) { f.g.ps = clamp(Math.round(X * 100) / 100, 0.01, 0.99); f.g.m1 = true; },
          key: function (f, dx, dy) { f.g.ps = clamp(Math.round((f.g.ps + 0.01 * (dx || dy)) * 100) / 100, 0.01, 0.99); f.g.m1 = true; } }];
        if (f.cur >= 1 || f.done[1]) hs.push({ x: p.p0, y: g.top - Y0, c: PLUM, grip: 'v', step: 1, active: f.cur === 1, noAutoDone: true,
          hit: function (pt) { return Math.abs(pt.x - S.x(p.p0)) < 34 ? Math.abs(pt.y - S.y(g.top - Y0)) : 1e9; },
          set: function (f, X, Y) { f.g.top = clamp(Math.round((Y + Y0) / 10) * 10, Y0, top); f.g.m2 = true; },
          key: function (f, dx, dy) { f.g.top = clamp(Math.round((f.g.top + 10 * (dy || dx)) / 10) * 10, Y0, top); f.g.m2 = true; } });
        return f.cur >= 1 ? hs.reverse() : hs;   // the new step's handle first, so keyboard focus moves to it
      }
      if (!f.exploring) return [];
      var x = f.ex.p;
      return [{ x: x, y: L.E(p, x) - Y0, c: C.ink, grip: 'h', active: true,
        set: function (f, X) { var v = clamp(Math.round(X * 100) / 100, 0, 1); if (Math.abs(X - f.sol.ps) < 0.008) v = f.sol.ps; f.ex.p = v; },
        key: function (f, dx, dy) {
          var d = dx || dy, cur = f.ex.p, ps = f.sol.ps, v = clamp(Math.round((cur + 0.01 * d) * 100) / 100, 0, 1);
          if (cur !== ps && (cur - ps) * (v - ps) <= 0) v = ps;   // stop on the knife-edge on the way past
          else if (cur === ps) v = clamp(d > 0 ? Math.ceil((ps + 1e-9) * 100) / 100 + (Math.abs(d) - 1) * 0.01 : Math.floor((ps - 1e-9) * 100) / 100 - (Math.abs(d) - 1) * 0.01, 0, 1);
          f.ex.p = v; f.ex.touched = true; f.resolve();
        } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, Y0 = f.dom.Y0, N = S.narrow;
      function y(d) { return d - Y0; }
      cornerText(S, D, kfmt(Y0));
      var zn = f.t('zones'), ln = f.t('line'), kn = f.t('ps'), of = f.t('offer'), ex = f.t('exit');
      // pooling / separating regions
      if (zn > 0) {
        D.area([[0, 0], [s.ps, 0], [s.ps, S.Y], [0, S.Y]], { fill: C.red, fo: 0.09, op: zn });
        D.area([[s.ps, 0], [1, 0], [1, S.Y], [s.ps, S.Y]], { fill: C.green, fo: 0.12, op: zn });
        var lx = S.x(s.ps / 2), rx = S.x((s.ps + 1) / 2), ty = S.y1 + 22;
        D.label(N ? 'Separating' : 'Separating: peaches exit', [{ x: lx, y: ty, anchor: 'middle' }, { x: lx, y: ty + 26, anchor: 'middle' }], { c: C.tRed, op: zn, size: S.ss, weight: 700, prio: 0 });
        D.label(N ? 'Pooling' : 'Pooling: both trade', [{ x: rx, y: ty, anchor: 'middle' }, { x: rx, y: ty + 26, anchor: 'middle' }], { c: C.tGreen, op: zn, size: S.ss, weight: 700, prio: 0 });
      }
      // the peach owner's reserve
      D.line(0, y(p.vH), 1, y(p.vH), { c: C.orange, w: 3.5, dash: '11 7', pr: b });
      if (b > 0.5) {
        var ry = S.y(y(p.vH)), rs = (N ? 'peach reserve ' : 'peach owner\'s reserve ') + money(p.vH);
        D.label(rs, [{ x: S.x1 - 6, y: ry + 26, anchor: 'end' }, { x: S.x1 - 6, y: ry - 12, anchor: 'end' }, { x: S.x0 + 10, y: ry + 26, anchor: 'start' }, { x: S.x0 + 10, y: ry - 12, anchor: 'start' }], { c: C.tOrange, size: S.ls, prio: 0, ring: 30 });
      }
      // the share of peaches the second question is about
      if (!(f.exploring && f.ex.touched)) {
        D.line(p.p0, 0, p.p0, S.Y, { c: C.soft, w: 2, dash: '3 6', pr: b, layer: 'under', reg: false });
        if (b > 0.5) D.label('p = ' + pTxt(p.p0), [{ x: S.x(p.p0) + 8, y: S.y1 - 6, anchor: 'start' }, { x: S.x(p.p0) - 8, y: S.y1 - 6, anchor: 'end' }], { c: C.soft, size: S.ss, prio: 0, fixed: true });
      }
      if (f.predicting) {
        if (g.m1) {
          D.drop(g.ps, y(p.vH), { c: PLUM, op: 0.55, y: false });
          side(D, g.ps, y(p.vH), 'p* = ' + pTxt(g.ps), { c: PLUM, size: S.ls }, 'UR UL DR DL');
        }
        if (f.cur >= 1 || f.done[1]) { if (g.m2) side(D, p.p0, y(g.top), money(g.top), { c: PLUM, size: S.ls, d: 22 }, 'L R'); }
        return;
      }
      // the buyers' average offer
      if (ln > 0) {
        D.line(0, y(p.WL), 1, y(p.WH), { c: C.blue, w: 5, pr: ln });
        D.dot(0, y(p.WL), { c: C.blue, r: 7, pr: ln, reg: false });
        D.dot(1, y(p.WH), { c: C.blue, r: 7, pr: seg(ln, 0.9, 1), reg: false });
      }
      if (ln > 0.9) {
        var fn = function (x) { return y(L.E(p, x)); }, lo = seg(ln, 0.9, 1);
        // spots along the line away from the p0 marker and the knife-edge
        var fr = (N ? [0.86, 0.78, 0.92, 0.3, 0.22, 0.14] : [0.3, 0.22, 0.4, 0.14, 0.5, 0.08, 0.86, 0.62, 0.74]).filter(function (v) { return Math.abs(v - p.p0) > 0.12 && Math.abs(v - s.ps) > 0.1; });
        D.curveLabel(N ? 'E[WTP]' : 'E[WTP] = ' + eqTxt(p), fn, fr, { c: C.tBlue, op: lo, pref: N ? 'below' : 'aboveOnly', d: 14, ring: 40 });
        // phones: the end values are in the setup text; naming them on a 320px plot only crowds the line
        if (!N) D.label((N ? 'lemons ' : 'all lemons ') + money(p.WL), [{ x: S.x(0) + 12, y: S.y(y(p.WL)) + 26, anchor: 'start' }, { x: S.x(0) + 12, y: S.y(y(p.WL)) - 14, anchor: 'start' }], { c: C.tBlue, op: lo, size: S.ss, ring: 30 });
        if (!N) D.label((N ? 'peaches ' : 'all peaches ') + money(p.WH), [{ x: S.x(1) - 14, y: S.y(y(p.WH)) + 30, anchor: 'end' }, { x: S.x(1) - 12, y: S.y(y(p.WH)) - 14, anchor: 'end' }], { c: C.tBlue, op: lo, size: S.ss, ring: 30 });
      }
      if (f.ghostOn()) {
        D.ghost(g.ps, y(p.vH), { op: f.gOp() }); youTag(f, D, g.ps, y(p.vH), 'your p*');
        if (g.m2) D.ghost(p.p0, y(g.top), { op: f.gOp() });
      }
      // the knife-edge
      if (kn > 0) {
        D.line(s.ps, y(p.vH), s.ps, lerp(y(p.vH), 0, kn), { c: C.ink, w: 2.5, dash: '6 6', layer: 'over', reg: false });   // unregistered so labels may cross it
        D.dot(s.ps, y(p.vH), { c: C.ink, r: 10, pr: kn });
        D.xval(s.ps, 'p*' + psEq(s), { c: C.ink, op: kn, anchor: (f.exploring && f.ex.touched ? s.ps > 0.5 : p.p0 > s.ps) ? 'end' : 'start', dx: (f.exploring && f.ex.touched ? s.ps > 0.5 : p.p0 > s.ps) ? -10 : 10 });
      }
      if (f.exploring && f.ex.touched) { exploreMarks(f, S, D, y); return; }
      // at p0: the average offer, then (if it falls short) the unravelling down to the lemon value
      if (of > 0) {
        var yo = lerp(Y0, s.E0, of);
        D.line(p.p0, 0, p.p0, y(yo), { c: C.blue, w: 3, dash: '6 5', reg: false });
        D.dot(p.p0, y(yo), { c: C.blue, r: 9 });
        if (of > 0.8) side(D, p.p0, y(s.E0), (N ? 'offer ' : 'average offer ') + money(s.E0), { c: C.tBlue, op: seg(of, 0.8, 1), d: 22 }, 'L UL R');
      }
      if (ex > 0) {
        if (!s.pool) {
          var ye = lerp(s.E0, p.WL, ex);
          if (ex < 1) D.arrow(p.p0, y(s.E0), p.p0, y(ye), { c: C.tRed, w: 3.5 });
          else D.arrow(p.p0, y(s.E0) - 0.0, p.p0, y(p.WL + 0.06 * (s.E0 - p.WL)), { c: C.tRed, w: 3.5 });
          D.dot(p.p0, y(p.WL), { c: C.ink, r: 10, pr: seg(ex, 0.7, 1) });
          side(D, p.p0, y(p.WL), N ? 'lemons: ' + money(p.WL) : 'peaches exit: lemons only, at most ' + money(p.WL), { c: C.tRed, op: seg(ex, 0.6, 1), d: 22 }, 'R DR L DL');
        } else {
          D.dot(p.p0, y(s.E0), { c: C.ink, r: 10, pr: ex });
          side(D, p.p0, y(s.E0), N ? 'both trade' : 'covers ' + money(p.vH) + ': both types trade', { c: C.tGreen, op: ex, d: 24 }, 'DR R UL L');
        }
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['line', 300, 1100], ['ps', 1350, 650], ['zones', 1850, 600], ['offer', 2450, 800], ['exit', 3350, 1000]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, pp = pTxt(p.p0);
      var why = 'Buyers cannot tell the cars apart, so they offer the average value: E[WTP] = p &times; ' + money(p.WH) + ' + (1 - p) &times; ' + money(p.WL) + ' = ' + eqTxt(p) +
        '. Peach owners sell only if that covers their ' + money(p.vH) + ' reserve: ' + eqTxt(p).replace('p', 'p*') + ' = ' + num(p.vH) + ', so p* = ' + num(s.num) + '/' + num(s.den) + '<b>' + psEq(s) + '</b>. ';
      why += s.pool
        ? 'At p = ' + pp + ' the offer is ' + money(s.E0) + ', which covers ' + money(p.vH) + ', so both types trade at one price between ' + money(p.vH) + ' and <b>' + money(s.E0) + '</b> (pooling). Buyers who get a lemon overpay.'
        : 'At p = ' + pp + ' the offer is only ' + money(s.E0) + ', short of ' + money(p.vH) + ', so peach owners keep their cars. Buyers know every car left is a lemon and pay at most <b>' + money(p.WL) + '</b>: lemons trade between ' + money(p.vL) + ' and ' + money(p.WL) + ', and the ' + money(s.gainH) + ' gain on every peach is lost.';
      return {
        rows: [['Knife-edge p*', pTxt(g.ps), psTxt(s)], ['Most a buyer pays at p = ' + pp, g.m2 ? money(g.top) : '', money(s.top)], ['Outcome at p = ' + pp, '', s.pool ? 'pooling, both trade' : 'separating, lemons only']],
        why: why
      };
    },
    explore: {
      init: function (f) { f.ex.p = f.p.p0; },
      hint: 'Drag the point along the blue line to change the share of peaches (it stops on p*), or step the peach owners\' reserve. Left of p* peaches exit and the price falls to the lemon value.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'Peach owner\'s reserve', get: function (f) { return f.p.vH; }, set: function (f, v) { f.p.vH = Math.round(v); },
          step: 100, min: f.p.WL + 100, max: f.p.WH - 100, fmt: money, dur: 350 }];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, x = f.ex.p, E = L.E(p, x), knife = isKnife(f);
        if (knife) return 'p = p*' + psEq(s) + ': buyers offer exactly <b>' + money(p.vH) + '</b>, the reserve. Peach owners are just willing to sell; any fewer peaches and they leave.';
        if (E >= p.vH) return 'p = ' + pTxt(x) + ': buyers offer <b>' + money(E) + '</b>, which covers the <b>' + money(p.vH) + '</b> reserve. <b class="c-green">Pooling</b>: both types trade at a price between ' + money(p.vH) + ' and ' + money(E) + '.';
        return 'p = ' + pTxt(x) + ': buyers offer <b>' + money(E) + '</b>, below the <b>' + money(p.vH) + '</b> reserve. <b class="c-red">Separating</b>: peaches exit, and lemons trade between ' + money(p.vL) + ' and ' + money(p.WL) + '. Here p*' + psEq(s) + '.';
      }
    }
  };
  function exploreMarks(f, S, D, y) {
    var p = f.p, s = f.sol, x = f.ex.p, E = L.E(p, x), knife = isKnife(f), pool = knife || E >= p.vH, N = S.narrow;
    D.drop(x, y(E), { y: false });
    if (pool) side(D, x, y(knife ? p.vH : E), (knife ? 'knife-edge: ' : 'offer ') + money(knife ? p.vH : E), { c: knife ? C.ink : C.tGreen, d: 24, size: S.ls }, 'L UL DR R');
    else {
      D.arrow(x, y(E), x, y(p.WL + 0.06 * (E - p.WL)), { c: C.tRed, w: 3.5 });
      D.dot(x, y(p.WL), { c: C.ink, r: 9 });
      side(D, x, y(E), 'offer ' + money(E), { c: C.tBlue, d: 24 }, 'L UL R');
      side(D, x, y(p.WL), N ? 'lemons only' : 'peaches exit: ' + money(p.WL), { c: C.tRed, d: 22 }, 'R DR L DL');
    }
  }

  /* =====================================================================
     12.2  Spence signaling: the separating range
     ===================================================================== */
  var SP = M.spence;
  function kv(v) { return (v < 0 ? '-$' : '$') + num(Math.abs(v), 1) + 'k'; }
  function cost(c) { return c === 1 ? 's' : num(c, 1) + 's'; }
  function edgeHandle(f, S, x, set, step, act) {
    var ky = 0.16 * f.dom.Y;
    return { x: x, y: ky, c: PLUM, grip: 'h', step: step, active: act, noAutoDone: true,
      hit: function (pt) { return pt.y > S.y1 - 10 && pt.y < S.y0 + 10 ? Math.abs(pt.x - S.x(x)) : 1e9; },
      set: function (f, X) { set(f, clamp(Math.round(X), 0, f.dom.X)); },
      key: function (f, dx, dy) { set(f, clamp(Math.round(x + (dx || dy)), 0, f.dom.X)); } };
  }
  function edgeLabel(D, S, x, s, c, op, right) {
    var px = S.x(x), y = S.y1 + 18;
    D.label(s, right ? [{ x: px + 10, y: y, anchor: 'start' }, { x: px - 10, y: y, anchor: 'end' }] : [{ x: px - 10, y: y, anchor: 'end' }, { x: px + 10, y: y, anchor: 'start' }], { c: c, op: op, size: S.ls, prio: 0, ring: 40 });
  }
  var f122 = {
    key: 'f122', num: '12.2', topic: 'Spence signaling', short: 'Spence signaling', model: SP,
    axes: { xtitle: 'Education threshold s*', ytitle: 'Net pay ($000)', yfmt: function (v) { return '$' + num(v) + 'k'; } },
    question: 'Which education thresholds s* separate the two types?',
    setup: function (f) {
      var p = f.p;
      return 'An employer pays <b>' + kv(p.yH) + '</b> to anyone with education of at least s* and <b>' + kv(p.yL) + '</b> otherwise. Education costs the high type <b class="c-blue">c<sub>H</sub> = ' + cost(p.a) +
        '</b> and the low type <b class="c-orange">c<sub>L</sub> = ' + cost(p.b) + '</b>, and adds nothing to anyone\'s productivity. A threshold separates the types when the high type gets the education and the low type does not.';
    },
    steps: [
      { kind: 'drag', label: 'Left edge of the range', prompt: 'Drag the plum line to the smallest s* at which the low type no longer fakes the education.',
        check: function (f) { return f.g.m1 ? (f.g.lo !== SP.start(f.dom).lo ? true : 'Drag it to a new spot first.') : false; } },
      { kind: 'drag', label: 'Right edge of the range', prompt: 'Now drag the second plum line to the largest s* the high type will still pay for.',
        check: function (f) { return f.g.m2 ? (f.g.hi !== SP.start(f.dom).hi ? true : 'Drag it to a new spot first.') : false; } }
    ],
    kbdHint: 'Keyboard: left and right arrows move the highlighted line (Shift for 5), Enter confirms. Space switches lines.',
    initGuess: function (f) { var st = SP.start(f.dom); return { lo: st.lo, m1: false, hi: st.hi, m2: false }; },
    handles: function (f, S) {
      var g = f.g;
      if (f.predicting) {
        var hs = [edgeHandle(f, S, g.lo, function (f, v) { f.g.lo = v; f.g.m1 = true; }, 0, f.cur === 0)];
        if (f.cur >= 1 || f.done[1]) hs.push(edgeHandle(f, S, g.hi, function (f, v) { f.g.hi = v; f.g.m2 = true; }, 1, f.cur === 1));
        return f.cur >= 1 ? hs.reverse() : hs;   // the new step's handle first, so keyboard focus moves to it
      }
      if (!f.exploring) return [];
      var x = f.ex.s;
      return [{ x: x, y: 0.05 * f.dom.Y, c: C.ink, grip: 'h', active: true,
        hit: function (pt) { return pt.y > S.y1 - 10 && pt.y < S.y0 + 10 ? Math.abs(pt.x - S.x(x)) : 1e9; },
        set: function (f, X) { f.ex.s = clamp(Math.round(X), 0, f.dom.X); },
        key: function (f, dx, dy) { f.ex.s = clamp(Math.round(f.ex.s + (dx || dy)), 0, f.dom.X); f.ex.touched = true; f.resolve(); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, N = S.narrow;
      var th = f.t('high'), he = f.t('hiEdge'), tl = f.t('low'), le = f.t('loEdge'), bd = f.t('band');
      // the separating band
      if (bd > 0 && s.hi > s.lo) {
        D.area([[s.lo, 0], [s.hi, 0], [s.hi, S.Y], [s.lo, S.Y]], { fill: C.green, fo: 0.14, op: bd });
      }
      // the wage with the diploma and the outside option
      D.line(0, p.yH, S.X, p.yH, { c: C.soft, w: 2, dash: '2 6', pr: b, layer: 'under', reg: false });
      D.line(0, p.yL, S.X, p.yL, { c: C.grey, w: 3.5, dash: '10 7', pr: b });
      if (b > 0.5) {
        D.label((N ? 'diploma pays ' : 'diploma wage ') + kv(p.yH), [{ x: S.x1 - 6, y: S.y(p.yH) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.yH) + 24, anchor: 'end' }], { c: C.soft, size: S.ss });
        D.label((N ? 'outside option ' : 'no diploma: outside option ') + kv(p.yL), [{ x: S.x1 - 6, y: S.y(p.yL) + 24, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.yL) - 10, anchor: 'end' }], { c: C.soft, size: S.ls, prio: 0, ring: 30 });
      }
      if (f.predicting) {
        var both = f.cur >= 1 || f.done[1];
        if (both) D.area([[Math.min(g.lo, g.hi), 0], [Math.max(g.lo, g.hi), 0], [Math.max(g.lo, g.hi), S.Y], [Math.min(g.lo, g.hi), S.Y]], { fill: PLUM, fo: 0.12 });
        D.line(g.lo, 0, g.lo, S.Y, { c: PLUM, w: 3.5, layer: 'over', reg: false });
        if (g.m1) edgeLabel(D, S, g.lo, 's* = ' + num(g.lo), PLUM, 1, g.lo > (both ? g.hi : -1));
        if (both) {
          D.line(g.hi, 0, g.hi, S.Y, { c: PLUM, w: 3.5, layer: 'over', reg: false });
          if (g.m2) edgeLabel(D, S, g.hi, 's* = ' + num(g.hi), PLUM, 1, g.hi >= g.lo);
        }
        return;
      }
      var hiEnd = Math.min(S.X, p.yH / p.a), loEnd = Math.min(S.X, p.yH / p.b);
      if (th > 0) {
        D.line(0, p.yH, lerp(0, hiEnd, th), p.yH - p.a * lerp(0, hiEnd, th), { c: C.blue, w: 5 });
        if (th > 0.9) D.curveLabel(N ? 'High: ' + num(p.yH) + ' - ' + cost(p.a) : 'High type: ' + num(p.yH) + ' - ' + cost(p.a), function (x) { return SP.high(p, x); }, [0.82, 0.7, 0.9, 0.6, 0.5, 0.95], { c: C.tBlue, op: seg(th, 0.9, 1), ring: 40 });
      }
      if (tl > 0) {
        D.line(0, p.yH, lerp(0, loEnd, tl), p.yH - p.b * lerp(0, loEnd, tl), { c: C.orange, w: 5 });
        if (tl > 0.9) {
          // left of the steep line first (the open triangle under it), then along it
          var lc = [0.82, 0.72, 0.9, 0.62].map(function (t) { var x = t * loEnd; return { x: S.x(x) - 14, y: S.y(SP.low(p, x)) + 6, anchor: 'end' }; });
          D.label((N ? 'Low, faking: ' : 'Low type, faking: ') + num(p.yH) + ' - ' + cost(p.b), lc.concat(D.along(function (x) { return SP.low(p, x); }, [0.45, 0.6, 0.3, 0.75].map(function (t) { return t * loEnd; }), 12)), { c: C.tOrange, op: seg(tl, 0.9, 1), size: S.fs, ring: 40 });
        }
      }
      if (f.ghostOn()) {
        [g.lo, g.hi].forEach(function (x, i) {
          D.line(x, 0, x, S.Y, { c: PLUM, w: 3, dash: '5 6', op: f.gOp(), layer: 'over', reg: false });
          D.ghost(x, 0.16 * f.dom.Y, { op: f.gOp() });
          if (!i) youTag(f, D, x, 0.16 * f.dom.Y);
        });
      }
      if (bd > 0) {
        var cx = S.x((s.lo + s.hi) / 2), bl = s.hi - s.lo < 1e-9 ? 'no separating range' : (N ? 'separates: ' : 'separating range: ') + num(s.lo, 1) + ' to ' + num(s.hi, 1);
        D.label(bl, [{ x: cx, y: S.y1 + 18, anchor: 'middle' }, { x: cx, y: S.y1 + 44, anchor: 'middle' }], { c: s.hi > s.lo ? C.tGreen : C.tRed, op: bd, size: S.ls, weight: 700, prio: 0 });
      }
      if (f.exploring && f.ex.touched) { spenceExplore(f, S, D); return; }
      if (he > 0) {
        D.line(s.hi, 0, s.hi, S.Y, { c: C.green, w: 3, pr: he, layer: 'over', reg: false });
        D.dot(s.hi, p.yL, { c: C.blue, r: 10, pr: he });
        
      }
      if (le > 0) {
        D.line(s.lo, 0, s.lo, S.Y, { c: C.green, w: 3, pr: le, layer: 'over', reg: false });
        D.dot(s.lo, p.yL, { c: C.orange, r: 10, pr: le });
        
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['high', 300, 900], ['hiEdge', 1150, 600], ['low', 1700, 900], ['loEdge', 2550, 600], ['band', 3100, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, yH = num(p.yH), yL = num(p.yL);
      return {
        rows: [['Left edge: lowest s*', num(g.lo), num(s.lo)], ['Right edge: highest s*', num(g.hi), num(s.hi)], ['High type nets at s* = ' + num(s.lo), '', kv(s.hiLo)]],
        why: 'The low type fakes the education only if ' + yH + ' - ' + cost(p.b) + '* &gt; ' + yL + ', so it stays out once ' + cost(p.b) + '* &ge; ' + num(s.gap) + ': <b>s* &ge; ' + num(s.lo) + '</b>. The high type still signals while ' + yH + ' - ' + cost(p.a) + '* &ge; ' + yL + ': <b>s* &le; ' + num(s.hi) +
          '</b>. In between, only the high type pays for it, because education is cheaper for that type (single crossing). It adds no output, so every unit of s is waste, and the least-cost threshold s* = ' + num(s.lo) + ' separates the types with the least of it.'
      };
    },
    explore: {
      init: function (f) { f.ex.s = f.sol.lo; },
      hint: 'Drag the threshold line, or change how costly education is for the low type. The green band is every threshold that separates.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'Low type\'s cost c_L', get: function (f) { return f.p.b; }, set: function (f, v) { f.p.b = Math.round(v * 2) / 2; },
          step: 0.5, min: f.p.a, max: 8, fmt: function (v) { return cost(Math.round(v * 2) / 2); }, dur: 350 }];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, t = f.ex.s, hv = SP.high(p, t), lv = SP.low(p, t), yL = kv(p.yL);
        var head = 'At s* = ' + num(t) + ': the high type nets <b>' + kv(hv) + '</b>; the low type would net <b>' + kv(lv) + '</b> by faking it; the outside option is <b>' + yL + '</b>. ';
        if (p.b <= p.a) return head + '<b class="c-red">No separation.</b> With equal costs, any threshold the high type will pay for, the low type will too: single crossing fails.';
        if (lv > p.yL) return head + '<b class="c-red">Too low</b>: the low type copies the high type, so the diploma tells the employer nothing.';
        if (hv < p.yL) return head + '<b class="c-red">Too high</b>: even the high type skips the education. Nobody signals.';
        return head + '<b class="c-green">Separates</b>: only the high type gets it. ' + (t === s.lo ? 'This is the least-cost threshold.' : 'Anything above ' + num(s.lo, 1) + ' is extra waste.') + ' Range now ' + num(s.lo, 1) + ' to ' + num(s.hi, 1) + '.';
      }
    }
  };
  function spenceExplore(f, S, D) {
    var p = f.p, s = f.sol, t = f.ex.s, hv = SP.high(p, t), lv = SP.low(p, t);
    if (s.hi > s.lo) [s.lo, s.hi].forEach(function (x) { D.line(x, 0, x, S.Y, { c: C.green, w: 2.5, layer: 'under', reg: false }); });
    D.line(t, 0, t, S.Y, { c: C.ink, w: 2.5, dash: '4 5', layer: 'over', reg: false });
    if (hv >= 0) { D.dot(t, hv, { c: C.blue, r: 9 }); side(D, t, hv, kv(hv), { c: C.tBlue, size: S.ls }, 'UR R UL L'); }
    if (lv >= 0) { D.dot(t, lv, { c: C.orange, r: 9 }); side(D, t, lv, kv(lv), { c: C.tOrange, size: S.ls }, 'R DR L DL'); }
  }

  window.W12FIGS = [f121, f122];
})();
