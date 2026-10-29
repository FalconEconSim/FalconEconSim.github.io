/* Week 3 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow the fig31 / fig32 films: budget lines orange (the original line in 3.2 blue),
 * indifference curves purple, demand curves blue, answers in ink. Plum always means "you".
 * 3.1 and 3.3 stack two panels in one SVG (choice on top, demand below, same X axis): see stack(). */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, K = Kit.K, snapTo = Kit.snapTo;
  var M = window.W3, PLUM = C.plum;
  var BUD = C.orange, BUDT = C.tOrange, IC = C.purple, ICT = C.tPurple, ICF = '#c9c0e2', DEM = C.blue, DEMT = C.tBlue, VAL = C.tBlue;
  var AX = { xtitle: 'Good X', ytitle: 'Good Y' };
  var PX = 'P<sub>X</sub>', PY = 'P<sub>Y</sub>';

  function pt(x, y, dp) { return '(' + num(x, dp == null ? 2 : dp) + ', ' + num(y, dp == null ? 2 : dp) + ')'; }
  function signed(v, dp) { var s = num(v, dp == null ? 2 : dp); return s === '0' || s.charAt(0) === '-' ? s : '+' + s; }
  function uCD(a) { return 'X<sup>' + num(a, 2) + '</sup>Y<sup>' + num(1 - a, 2) + '</sup>'; }
  function segLabel(D, s, x1, y1, x2, y2, fracs, o) {
    var c = []; fracs.forEach(function (t) { c.push.apply(c, D.along(function () { return lerp(y1, y2, t); }, [lerp(x1, x2, t)], o && o.d, o && o.pref)); });
    return D.label(s, c, Object.assign({ size: D.S.fs }, o || {}));
  }
  // nearest x on y = fn(x) to a pointer at data (X, Y), measured in pixels
  function nearX(S, fn, a, b, X, Y) {
    var pts = G.sample(fn, a, b, 400).map(function (p) { return p && p[1] >= 0 && p[1] <= S.Y ? p : null; });
    var n = G.nearest(X, Y, pts, (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return n.x == null ? null : n.x;
  }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }

  /* ---------- two stacked panels in one frame ----------
   * The kit's data space is 0..100 in y. The top panel (good Y) sits on [tl, 100], the bottom panel
   * (price of X) on [0, bh], with a gap between them for the top panel's X ticks. X is shared, so a
   * bundle drops straight down onto its demand point. The domain carries Yt / yts (top) and P / ps
   * (bottom); dom.ys is huge so the kit draws no y ticks of its own. */
  function stack(f, S) {
    var d = f.dom, ph = S.y0 - S.y1, gap = (S.narrow ? 70 : 78) / ph * 100, bh = (100 - gap) * 0.44, tl = bh + gap;
    return { gap: gap, bh: bh, tl: tl,
      ty: function (y) { return tl + y / d.Yt * (100 - tl); },
      by: function (p) { return p / d.P * bh; },
      iy: function (Y) { return (Y - tl) / (100 - tl) * d.Yt; },
      ip: function (Y) { return Y / bh * d.P; } };
  }
  function stackAxes(f, S, D, T, o) {
    var d = f.dom, fs = S.narrow ? 15 : 16, ts = S.narrow ? 16 : 17, s = '', v, yb = S.y(T.tl), yt = S.y(T.bh);
    var tick = function (x1, y1, x2, y2) { return K.pline(x1, y1, x2, y2, { c: C.soft, w: 2, cap: 'butt' }); };
    var lab = function (x, y, t, a) { return K.text(x, y, t, { size: fs, weight: 500, c: C.soft, anchor: a, hw: 5 }); };
    s += '<rect x="' + (S.x0 - 5) + '" y="' + (yb + 2).toFixed(1) + '" width="10" height="' + Math.max(0, yt - yb - 8).toFixed(1) + '" fill="' + C.paper + '"/>';
    s += K.pline(S.x0, yb, S.x1 + 4, yb, { c: C.ink, w: 2.5, cap: 'square' });
    for (v = d.xs; v <= d.X + 1e-9; v += d.xs) { var x = S.x(v); s += tick(x, yb, x, yb + 6) + lab(x, yb + 25, num(v, 2), 'middle'); }
    s += lab(S.x0 - 8, yb + 22, '0', 'end');
    for (v = d.yts; v <= d.Yt + 1e-9; v += d.yts) { var y = S.y(T.ty(v)); s += tick(S.x0 - 6, y, S.x0, y) + lab(S.x0 - 10, y + 5.5, num(v, 2), 'end'); }
    for (v = d.ps; v <= d.P + 1e-9; v += d.ps) { var y2 = S.y(T.by(v)); s += tick(S.x0 - 6, y2, S.x0, y2) + lab(S.x0 - 10, y2 + 5.5, num(v, 2), 'end'); }
    s += K.text(S.x1, yb + 50, o.ttitle || 'Good X', { size: ts, weight: 600, c: C.soft, anchor: 'end', halo: false });
    s += K.text(4, yt - 18, o.btitle || 'Price of X ($)', { size: ts, weight: 600, c: C.soft, anchor: 'start', halo: false });
    D.L.rect(S.x0 - 4, yb, S.x1 - S.x0 + 8, 30); D.L.rect(S.x1 - 120, yb + 30, 124, 26); D.L.rect(0, yt - 40, 190, 30);
    D.add('over', s);
  }
  function stackSpec(o) { return Object.assign({ aspect: 1.1, maxH: 820, narrowAspect: 1.8 }, o); }

  /* =====================================================================
     3.1  Two-panel demand derivation (has a film)
     ===================================================================== */
  // a placed point that stays in its own panel: top = {x, y} in goods, bottom = {x, p} quantity and price
  function placeIn(key, top) {
    return function (f, X, Y) {
      var T = stack(f, f.S), d = f.dom;
      if (top ? Y < T.tl - 1.5 : Y > T.bh + 1.5) return;   // a tap in the other panel does nothing
      if (top) f.g[key] = { x: clamp(snapTo(X, 0.5), 0.5, d.X), y: clamp(snapTo(T.iy(Y), 0.5), 0, d.Yt) };
      else f.g[key] = { x: clamp(snapTo(X, 0.5), 0.5, d.X), p: clamp(snapTo(T.ip(Y), 0.25), 0.25, d.P) };
    };
  }
  function f31Words(p) { return p.P1 < p.P0 ? 'falls' : 'rises'; }
  var f31 = stackSpec({
    key: 'f31', num: '3.1', topic: 'Two-panel demand derivation', short: 'Deriving demand', model: M.derive,
    axes: { xtitle: 'Quantity of X', ytitle: 'Good Y' },
    film: { name: 'fig31-demand', label: 'Animation: building a demand curve', title: 'Watch first, 40 seconds',
      caption: 'The price of X falls from $6 to $1. Each time the budget line pivots outward, her best bundle moves, and that bundle drops straight down onto the demand curve below.' },
    question: function (f) { return PX + ' ' + f31Words(f.p) + ' from ' + money(f.p.P0) + ' to ' + money(f.p.P1) + '. Where does she end up, on both graphs?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Income <b>' + money(p.I) + '</b>, ' + PY + ' = <b>' + money(p.Py) + '</b>, U = ' + uCD(p.a) + '. At ' + PX + ' = ' + money(p.P0) + ' her best bundle is <b>A ' + pt(s.X0, s.Ys) +
        '</b> (top). Below, that choice is one point on her demand curve: at ' + money(p.P0) + ' she buys ' + num(s.X0, 2) + '. The orange line is her budget line at the new price, ' + money(p.P1) + '.';
    },
    steps: [
      { kind: 'place', place: placeIn('opt', true), label: 'Her new best bundle',
        prompt: 'Tap it in the top graph: where an indifference curve would just touch the orange line. Drag to fine-tune.',
        check: function (f) { return f.g.opt ? true : 'Tap in the top graph.'; },
        kstart: function (f) { var T = stack(f, f.S); return { x: f.dom.X * 0.5, y: T.ty(f.dom.Yt * 0.7) }; } },
      { kind: 'place', place: placeIn('dem', false), label: function (f) { return 'Its point on the demand curve'; },
        prompt: function (f) { return 'Tap the bottom graph: the price is ' + money(f.p.P1) + ', and how much X does she buy?'; },
        check: function (f) { return f.g.dem ? true : 'Tap in the bottom graph.'; },
        kstart: function (f) { var T = stack(f, f.S); return { x: f.dom.X * 0.5, y: T.by(f.dom.P * 0.5) }; } }
    ],
    kbdHint: 'Keyboard: Enter drops a point, arrow keys move it, Enter confirms.',
    initGuess: function () { return { opt: null, dem: null }; },
    handles: function (f, S) {
      var T = stack(f, S), d = f.dom, g = f.g, hs = [];
      if (f.predicting) {
        if (g.opt) hs.push({ x: g.opt.x, y: T.ty(g.opt.y), step: 0, active: f.cur === 0, noAutoDone: true,
          set: function (f, X, Y) { f.g.opt = { x: clamp(snapTo(X, 0.5), 0.5, d.X), y: clamp(snapTo(T.iy(Y), 0.5), 0, d.Yt) }; },
          key: function (f, dx, dy) { f.g.opt = { x: clamp(f.g.opt.x + 0.5 * dx, 0.5, d.X), y: clamp(f.g.opt.y + 0.5 * dy, 0, d.Yt) }; } });
        if (g.dem) hs.push({ x: g.dem.x, y: T.by(g.dem.p), step: 1, active: f.cur === 1, noAutoDone: true,
          set: function (f, X, Y) { f.g.dem = { x: clamp(snapTo(X, 0.5), 0.5, d.X), p: clamp(snapTo(T.ip(Y), 0.25), 0.25, d.P) }; },
          key: function (f, dx, dy) { f.g.dem = { x: clamp(f.g.dem.x + 0.5 * dx, 0.5, d.X), p: clamp(f.g.dem.p + 0.25 * dy, 0.25, d.P) }; } });
        return hs;
      }
      if (!f.exploring) return [];
      var p = f.p, s = f.sol, pmin = f31.pmin(f);
      var setP = function (f, P) { f.p.P1 = clamp(Math.round(P * 4) / 4, pmin, d.P); };
      return [
        { x: s.X1, y: T.by(p.P1), c: C.ink, grip: 'v', active: true, set: function (f, X, Y) { setP(f, T.ip(Y)); },
          key: function (f, dx, dy) { setP(f, f.p.P1 + 0.25 * (dy || dx)); f.ex.touched = true; f.resolve(); } },
        { x: s.X1, y: T.ty(s.Ys), c: C.ink, grip: 'h', set: function (f, X) { setP(f, s.k / Math.max(X, 0.5)); },
          key: function (f, dx, dy) { setP(f, f.p.P1 - 0.25 * (dx || dy)); f.ex.touched = true; f.resolve(); } }
      ];
    },
    pmin: function (f) { return Math.max(0.5, Math.ceil(f.sol.k / (0.96 * f.dom.X) * 4) / 4); },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), d = f.dom, T = stack(f, S), ty = T.ty, by = T.by;
      stackAxes(f, S, D, T, {});
      var icAt = function (U) { return function (x) { return ty(M.derive.ic(p, U, x)); }; };
      var demFn = function (x) { return s.k / x <= d.P ? by(s.k / x) : NaN; }, xlo = s.k / d.P;
      var s0 = M.derive.solve(f.p0);
      // top: faint ICs around the new optimum, the old line and A's curve, the new line
      if (!f.exploring) M.derive.LEVELS.forEach(function (k) { D.fn(icAt(s0.U1 * k), 0.05, d.X, { c: ICF, w: 3, pr: b }); });
      D.fn(icAt(s.U0), 0.05, d.X, { c: IC, w: 3.5, op: f.exploring ? 0.55 : 0.8, pr: b });
      D.line(0, ty(s.yI), s.xI0, ty(0), { c: C.grey, w: 3.5, dash: '9 8', pr: b });
      D.line(0, ty(s.yI), s.xI1, ty(0), { c: BUD, w: 5, pr: b });
      if (b > 0.9) {
        segLabel(D, money(p.P0), 0, ty(s.yI), s.xI0, ty(0), [0.86, 0.72, 0.6], { c: C.soft, size: S.ls, pref: 'below' });
        segLabel(D, money(p.P1), 0, ty(s.yI), s.xI1, ty(0), [0.55, 0.7, 0.4, 0.85], { c: BUDT, size: S.ls });
      }
      D.dot(s.X0, ty(s.Ys), { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(s.X0, ty(s.Ys), 'A', { c: C.ink, size: S.fs, d: 16 });
      // bottom: A's demand point, the dashed drop that links the panels
      D.line(s.X0, ty(s.Ys), s.X0, by(p.P0), { c: C.soft, w: 2.5, dash: '6 6', pr: b, reg: false });
      D.line(0, by(p.P0), s.X0, by(p.P0), { c: C.soft, w: 2.5, dash: '6 6', pr: b, layer: 'over' });
      D.dot(s.X0, by(p.P0), { c: DEM, r: 9, pr: b });
      if (b > 0.5) D.near(s.X0, by(p.P0), 'A', { c: DEMT, size: S.fs, d: 16 });
      if (f.predicting) return;
      var tan = f.t('tan'), dr = f.t('drop'), lp = f.t('pt'), cv = f.t('curve'), pc = f.t('pcc');
      if (f.ghostOn()) {
        if (g.opt) { D.ghost(g.opt.x, ty(g.opt.y), { op: f.gOp() }); youTag(f, D, g.opt.x, ty(g.opt.y)); }
        if (g.dem) { D.ghost(g.dem.x, by(g.dem.p), { op: f.gOp() }); youTag(f, D, g.dem.x, by(g.dem.p)); }
      }
      if (cv > 0) {
        D.fn(demFn, xlo, d.X, { c: DEM, w: 5, pr: cv });
        if (cv > 0.9) D.curveLabel('D', demFn, [0.95, 0.88, 0.8], { c: DEMT, pref: 'aboveOnly' });
      }
      if (pc > 0) {
        D.line(0, ty(s.Ys), d.X, ty(s.Ys), { c: C.soft, w: 2.5, dash: '8 7', op: 0.8 * pc, layer: 'under' });
        D.label('price-consumption curve', D.along(function () { return ty(s.Ys); }, [d.X * 0.62, d.X * 0.3, d.X * 0.8, d.X * 0.12], 8, 'below'), { c: C.soft, op: pc, size: S.ss, ring: 40 });
      }
      if (tan > 0) {
        D.fn(icAt(s.U1), 0.05, d.X, { c: IC, w: 5, pr: tan });
        D.dot(s.X1, ty(s.Ys), { c: C.ink, r: 10, pr: tan });
        if (tan > 0.6) D.near(s.X1, ty(s.Ys), 'B', { c: C.ink, size: S.fs, d: 16, op: tan });
      }
      if (dr > 0) D.line(s.X1, ty(s.Ys), s.X1, lerp(ty(s.Ys), by(p.P1), dr), { c: C.ink, w: 2.5, dash: '6 6', reg: false });
      if (lp > 0) {
        D.line(0, by(p.P1), s.X1, by(p.P1), { c: C.ink, w: 2.5, dash: '6 6', pr: lp, layer: 'over' });
        D.dot(s.X1, by(p.P1), { c: DEM, r: 10, pr: lp });
        D.near(s.X1, by(p.P1), 'B', { c: DEMT, size: S.fs, d: 16, op: lp });
        D.xval(s.X1, 'X* = ' + num(s.X1, 2), { c: VAL, op: lp, anchor: 'start', dx: 8 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['tan', 300, 900], ['drop', 1200, 700], ['pt', 1850, 500], ['curve', 2350, 1100], ['pcc', 3300, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, pct = Math.round(p.a * 100);
      return {
        rows: [['Best bundle', g.opt ? pt(g.opt.x, g.opt.y, 1) : '-', pt(s.X1, s.Ys)],
          ['Demand point', g.dem ? num(g.dem.x, 1) + ' at ' + money(g.dem.p) : '-', num(s.X1, 2) + ' at ' + money(p.P1)]],
        why: 'At ' + money(p.P1) + ' her budget line pivots ' + (p.P1 < p.P0 ? 'out' : 'in') + ' around its Y end. Her best bundle is where an indifference curve just touches it. With U = ' + uCD(p.a) +
          ' she always spends ' + pct + '% of her income on X, so X* = ' + num(p.a, 2) + ' x ' + num(p.I) + ' / ' + num(p.P1, 2) + ' = <b>' + num(s.X1, 2) + '</b>, and Y* stays ' + num(s.Ys, 2) +
          '. Drop straight down: at a price of ' + money(p.P1) + ' she buys ' + num(s.X1, 2) + '. That is a second point on her demand curve; every price gives one, and joined up they make D: X = ' + num(s.k, 2) + ' / ' + PX + '.'
      };
    },
    explore: {
      hint: 'Drag the blue point up or down her demand curve to set ' + PX + ' (or drag B sideways). The budget line pivots, and the best bundle above slides along the dashed price-consumption curve.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'P_X', get: function (f) { return f.p.P1; }, set: function (f, v) { f.p.P1 = v; }, step: 0.5, min: f31.pmin(f), max: f.dom.P, fmt: money, dur: 400 }];
      },
      readout: function (f) {
        var p = f.p, s = f.sol;
        return 'At ' + PX + ' = <b>' + money(p.P1) + '</b> she buys X* = <b>' + num(s.X1, 2) + '</b> and Y* = <b>' + num(s.Ys, 2) + '</b>. She spends ' + money(s.k) + ' on X at every price, so X* = ' + num(s.k, 2) + ' / ' + PX + '.';
      }
    }
  });

  /* =====================================================================
     3.2  Slutsky decomposition explorer (has a film). The textbook's construction:
     the compensated line has the NEW slope and just touches the ORIGINAL curve U1 at C.
     A to C is the substitution effect, C to B the income effect. Lettering as on the page.
     ===================================================================== */
  var CB = C.blue, CBT = C.tBlue, NB = C.orange, NBT = C.tOrange;
  function f32Line(p, M) { return function (x) { return (M - p.P1 * x) / p.Py; }; }
  // the arrows under the picture: SE (A to C) and IE (C to B). Labels are pinned over their arrows;
  // when the two would overlap, the IE label steps up a row.
  function f32Arrows(D, S, xa, xc, xb, o) {
    var row = S.y0 - (S.narrow ? 16 : 20), lab = row - 12, op = o.op == null ? 1 : o.op, size = S.ls, prev = null;
    var put = function (x1, x2, col, tcol, txt, pr) {
      if (pr <= 0 || Math.abs(S.x(x2) - S.x(x1)) < 6) return;
      D.arrowP(S.x(x1), row, S.x(lerp(x1, x2, pr)), row, { c: col, w: 5, head: 12, op: op });
      if (pr > 0.7 && txt) {
        var w = Kit.tw(txt, size), mx = clamp(S.x((x1 + x2) / 2), S.x0 + w / 2 + 4, S.x1 - w / 2), y = lab;
        if (prev && Math.abs(mx - prev.x) < (w + prev.w) / 2 + 8) y = prev.y - 24;
        D.label(txt, [{ x: mx, y: y, anchor: 'middle' }], { c: tcol, size: size, op: op, prio: 0, fixed: true });
        prev = { x: mx, w: w, y: y };
      }
    };
    put(xa, xc, IC, ICT, o.seT, o.se == null ? 1 : o.se);
    var top = prev ? prev.y : lab;
    put(xc, xb, NB, NBT, o.ieT, o.ie == null ? 1 : o.ie);
    if (o.tot > 0 && prev && !S.narrow) {   // phones: the total is in the verdict and the readout
      var tt = 'total ' + o.totT, tw2 = Kit.tw(tt, size), tx = clamp(S.x((xa + xb) / 2), S.x0 + tw2 / 2 + 4, S.x1 - tw2 / 2);
      D.label(tt, [{ x: tx, y: Math.min(top, prev.y) - 26, anchor: 'middle' }], { c: C.ink, size: size, op: o.tot, prio: 0, fixed: true });
    }
  }
  var f32 = {
    key: 'f32', num: '3.2', topic: 'Slutsky decomposition explorer', short: 'Slutsky decomposition', model: M.slutsky, axes: AX, aspect: 0.86,
    film: { name: 'fig32-slutsky', label: 'Animation: Slutsky decomposition', title: 'Watch first, 39 seconds',
      caption: 'The price of X falls from $3 to $1.50 and her best bundle moves from A to B. A compensated budget line at the new prices, tangent to the original indifference curve at C, splits the move into a substitution effect (A to C) and an income effect (C to B).' },
    question: 'Split her move from A to B into a substitution effect and an income effect.',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Income <b>' + money(p.I) + '</b>, ' + PY + ' = <b>' + money(p.Py) + '</b>, U = ' + uCD(p.a) + '. ' + PX + ' ' + (s.fall ? 'falls' : 'rises') + ' from <b>' + money(p.P0) + '</b> to <b>' + money(p.P1) +
        '</b>, so her best bundle moves from <b>A ' + pt(s.XA, s.YA) + '</b> on U1 (blue budget line) to <b>B ' + pt(s.XB, s.YB) + '</b> on U2 (orange line).';
    },
    steps: [
      { kind: 'drag', label: 'The compensated budget line',
        prompt: function (f) { return 'The plum line has the new prices. Slide it ' + (f.sol.fall ? 'in' : 'out') + ' until it just touches U1, the curve through A.'; },
        check: function (f) { return f.g.mM ? (Math.abs(f.g.M - f.p.I) >= 0.5 ? true : 'Slide it further: that is still her new budget line.') : false; } },
      { kind: 'drag', label: 'Point C, and with it SE and IE',
        prompt: 'Slide the plum point along U1 to where your line touches it. The arrows under the graph are your SE (A to C) and IE (C to B).',
        check: function (f) { return f.g.mC; } }
    ],
    kbdHint: 'Keyboard: up and down arrows slide the line, Enter confirms. Then left and right slide C along U1, Enter confirms. Space switches between the two.',
    initGuess: function (f) { return { M: f.p.I, hx: 0.22 * Math.min(f.p.I / f.p.P1, f.dom.X), mM: false, cx: f.sol.XA, mC: false }; },
    lineHandleX: function (f, M) {
      var p = f.p, D = f.dom.X, hi = Math.min((M - p.Py * 0.06 * D) / p.P1, 0.94 * D), lo = Math.max((M - p.Py * 0.94 * D) / p.P1, 0.06 * D);
      return clamp(f.g.hx, lo, Math.max(lo, hi));
    },
    handles: function (f, S) {
      var p = f.p, s = f.sol, g = f.g, D = f.dom.X, u1 = function (x) { return M.slutsky.ic(p, s.UA, x); };
      var xmin = G.bisect(function (x) { return u1(x) - D; }, 0.01, D);
      if (f.predicting) {
        var hx = f32.lineHandleX(f, g.M), hs = [];
        hs.push({ x: hx, y: f32Line(p, g.M)(hx), step: 0, active: f.cur === 0,
          set: function (f, X, Y) { f.g.M = clamp(Math.round((p.P1 * X + p.Py * Y) * 4) / 4, 0.25 * p.I, 1.8 * p.I); f.g.hx = X; f.g.mM = true; },
          key: function (f, dx, dy) { f.g.M = clamp(f.g.M + 0.25 * (dy || dx), 0.25 * p.I, 1.8 * p.I); f.g.mM = true; } });
        if (f.cur >= 1 || f.done[1]) hs.push({ x: g.cx, y: u1(g.cx), step: 1, active: f.cur === 1,
          set: function (f, X, Y) { var nx = nearX(S, u1, xmin, D, X, Y); if (nx != null) { f.g.cx = Math.round(nx * 20) / 20; f.g.mC = true; } },
          key: function (f, dx, dy) { f.g.cx = clamp(Math.round((f.g.cx + 0.1 * (dx || dy)) * 20) / 20, xmin, D); f.g.mC = true; } });
        return f.cur >= 1 ? hs.reverse() : hs;   // the new step's handle first, so keyboard focus moves to it
      }
      if (!f.exploring) return [];
      var lo = f32.pmin(f);
      return [{ x: s.XB, y: s.YB, c: C.ink, grip: 'h', active: true,
        set: function (f, X) { f.p.P1 = clamp(Math.round(f.p.a * f.p.I / Math.max(X, 0.5) * 20) / 20, lo, 8); },
        key: function (f, dx, dy) { f.p.P1 = clamp(Math.round((f.p.P1 - 0.05 * (dx || dy)) * 20) / 20, lo, 8); f.ex.touched = true; f.resolve(); } }];
    },
    pmin: function (f) { return Math.ceil(f.p.a * f.p.I / (0.92 * f.dom.X) * 4) / 4; },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), DX = f.dom.X, u = function (U) { return function (x) { return M.slutsky.ic(p, U, x); }; };
      // the two budget lines and the two curves
      D.line(0, s.yI, s.xIA, 0, { c: CB, w: 4.5, pr: b });
      D.line(0, s.yI, s.xIB, 0, { c: NB, w: 4.5, pr: b });
      D.fn(u(s.UA), 0.05, DX, { c: IC, w: 4.5, pr: b });
      D.fn(u(s.UB), 0.05, DX, { c: IC, w: 4.5, pr: b });
      if (b > 0.9) {
        D.curveLabel('U1', u(s.UA), [0.9, 0.82, 0.96, 0.7], { c: ICT, pref: 'belowOnly' });
        D.curveLabel('U2', u(s.UB), [0.9, 0.82, 0.96, 0.7], { c: ICT, pref: 'aboveOnly' });
        segLabel(D, 'at ' + money(p.P0), 0, s.yI, s.xIA, 0, [0.62, 0.5, 0.75, 0.3], { c: CBT, size: S.ls, pref: 'below' });
        segLabel(D, 'at ' + money(p.P1), 0, s.yI, s.xIB, 0, [0.35, 0.22, 0.5], { c: NBT, size: S.ls });
      }
      // drops from A and B mark where the arrows start and end
      D.drop(s.XA, s.YA, { y: false, pr: b, op: 0.8 }); D.drop(s.XB, s.YB, { y: false, pr: b, op: 0.8 });
      D.dot(s.XA, s.YA, { c: CB, r: 9, pr: b }); D.dot(s.XB, s.YB, { c: NB, r: 9, pr: b });
      if (b > 0.5) { D.near(s.XA, s.YA, 'A', { c: CBT, size: S.fs, d: 16 }); D.near(s.XB, s.YB, 'B', { c: NBT, size: S.fs, d: 16 }); }
      if (f.predicting) {
        var fl = f32Line(p, g.M);
        D.line(0, fl(0), g.M / p.P1, 0, { c: PLUM, w: 4.5, dash: '12 7' });
        segLabel(D, 'your compensated line', 0, fl(0), g.M / p.P1, 0, [0.12, 0.25, 0.08], { c: PLUM, size: S.ss, pref: 'below' });
        if (f.cur >= 1 || f.done[1]) {
          D.drop(g.cx, M.slutsky.ic(p, s.UA, g.cx), { y: false, c: PLUM, op: 0.8 });
          f32Arrows(D, S, s.XA, g.cx, s.XB, { seT: 'SE', ieT: 'IE' });
        }
        return;
      }
      var cm = f.t('comp'), cc = f.t('C'), se = f.t('se'), ie = f.t('ie'), tot = f.t('tot');
      if (f.ghostOn()) {
        var gl = f32Line(p, g.M);
        D.line(0, gl(0), g.M / p.P1, 0, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        if (g.mC) { var gy = M.slutsky.ic(p, s.UA, g.cx); D.ghost(g.cx, gy, { op: f.gOp() }); youTag(f, D, g.cx, gy, 'your C'); }
      }
      if (cm > 0) {
        var Mv = f.exploring || f.skipped ? s.Mc : lerp(g.M, s.Mc, cm), cl = f32Line(p, Mv);
        D.line(0, cl(0), Mv / p.P1, 0, { c: IC, w: 4, dash: '12 8', op: f.exploring ? 1 : Math.min(1, cm * 3) });
        if (cm > 0.95) segLabel(D, 'compensated', 0, cl(0), Mv / p.P1, 0, [0.1, 0.2, 0.06, 0.3, 0.75, 0.85], { c: ICT, size: S.ls, pref: 'below', ring: 50 });
      }
      if (cc > 0) {
        D.drop(s.XC, s.YC, { y: false, pr: cc, op: 0.8 });
        D.dot(s.XC, s.YC, { c: IC, r: 9, pr: cc });
        D.near(s.XC, s.YC, 'C', { c: ICT, size: S.fs, d: 16, op: cc });
      }
      if (se > 0) {
        f32Arrows(D, S, s.XA, s.XC, s.XB, { se: se, ie: ie, seT: 'SE ' + signed(s.SE), ieT: 'IE ' + signed(s.IE), tot: tot, totT: signed(s.TE) });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['comp', 350, 1100], ['C', 1450, 500], ['se', 1900, 650], ['ie', 2500, 650], ['tot', 3100, 450]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, gc = g.mC ? g.cx : null;
      var take = p.I - s.Mc;
      return {
        rows: [['Compensated income', money(g.M), money(s.Mc)], ['C', gc == null ? '-' : pt(gc, M.slutsky.ic(p, s.UA, gc)), pt(s.XC, s.YC)],
          ['SE, A to C', gc == null ? '-' : signed(gc - s.XA), signed(s.SE)], ['IE, C to B', gc == null ? '-' : signed(s.XB - gc), signed(s.IE)]],
        why: (take > 0 ? 'Take ' + money(take) + ' away' : 'Give her ' + money(-take) + ' more') + ' so that at the new prices she can just reach U1 again: the compensated line has the new slope, -' + num(p.P1, 2) + '/' + num(p.Py, 2) +
          ', and income ' + money(s.Mc) + '. It touches U1 at <b>C ' + pt(s.XC, s.YC) + '</b>. A to C is the substitution effect, <b>' + signed(s.SE) + '</b>: same happiness, ' +
          (s.fall ? 'and X is now relatively cheaper' : 'and X is now relatively dearer') + '. C to B is the income effect, <b>' + signed(s.IE) + '</b>. X is a normal good, so both push the same way: ' +
          signed(s.SE) + ' ' + (s.IE >= 0 ? '+ ' + num(s.IE, 2) : '- ' + num(-s.IE, 2)) + ' = ' + signed(s.TE) + '.'
      };
    },
    explore: {
      hint: 'Drag B sideways (or step the new ' + PX + ') and watch C and both effects update. Try a price rise too: both arrows flip.',
      controls: function (f) {
        return [{ kind: 'stepper', label: 'New P_X', get: function (f) { return f.p.P1; }, set: function (f, v) { f.p.P1 = v; }, step: 0.25, min: f32.pmin(f), max: 8, fmt: money, dur: 400 }];
      },
      readout: function (f) {
        var s = f.sol;
        return 'SE <b class="c-purple">' + signed(s.SE) + '</b> (A to C) and IE <b class="c-orange">' + signed(s.IE) + '</b> (C to B) make the total <b>' + signed(s.TE) + '</b>. Compensated income ' + money(s.Mc) + '.';
      }
    }
  };

  /* =====================================================================
     3.3  Income effects and demand shifts (stacked panels)
     ===================================================================== */
  function f33Type(p) {
    return p.type === 'normal' ? 'X is a <b>normal good</b> for her, like restaurant meals: she spends half her income on it, <span class="nw">X* = 0.5 I / ' + PX + '</span>.'
      : 'X is an <b>inferior good</b> for her, like instant noodles: <span class="nw">X* = 20 - 0.05 I</span>.';
  }
  var f33 = stackSpec({
    key: 'f33', num: '3.3', topic: 'Income effects and demand shifts', short: 'Normal or inferior', model: M.income,
    axes: { xtitle: 'Quantity of X', ytitle: 'Good Y' },
    question: function (f) { return 'Her income ' + (f.sol.rise ? 'rises' : 'falls') + ' to ' + money(f.p.I1) + '. Where do her bundle and her demand curve go?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return f33Type(p) + ' ' + PX + ' = $2, ' + PY + ' = $3. With income ' + money(p.I0) + ' she buys <b>A ' + pt(s.X0, s.Y0) + '</b> (top), so her demand curve passes through ' + num(s.X0, 2) + ' units at $2 (bottom).';
    },
    steps: [
      { kind: 'drag', label: 'Her new bundle', prompt: 'Slide the plum point along her new budget line (orange) to the bundle she buys now.',
        check: function (f) { return Math.abs(f.g.x - f.sol.X0) >= 0.25 ? true : 'Slide it: straight above A is only where it starts.'; } },
      { kind: 'drag', label: 'Her new demand curve', prompt: 'Drag the plum demand curve left or right so it shows what she buys at $2 now.',
        check: function (f) { return Math.abs(f.g.q - f.sol.X0) >= 0.25 ? true : 'Drag it: that is still her old demand curve.'; } }
    ],
    kbdHint: 'Keyboard: left and right arrows slide the point along the line, Enter confirms. Then left and right shift the demand curve, Enter confirms.',
    initGuess: function (f) { return { x: clamp(f.sol.X0, 0.5, f.p.I1 / 2 - 0.5), q: f.sol.X0 }; },
    handles: function (f, S) {
      var p = f.p, s = f.sol, g = f.g, d = f.dom, T = stack(f, S), Px = M.income.Px, Py = M.income.Py;
      var bl = function (x) { return T.ty((p.I1 - Px * x) / Py); }, xmax = Math.min(d.X, p.I1 / Px);
      if (f.predicting) {
        var hs = [{ x: g.x, y: bl(g.x), step: 0, active: f.cur === 0,
          set: function (f, X, Y) { var nx = nearX(S, bl, 0, xmax, X, Y); if (nx != null) f.g.x = clamp(snapTo(nx, 0.5), 0.5, xmax - 0.5); },
          key: function (f, dx, dy) { f.g.x = clamp(f.g.x + 0.5 * (dx || dy), 0.5, xmax - 0.5); } }];
        if (f.cur >= 1 || f.done[1]) hs.push({ x: g.q, y: T.by(Px), grip: 'h', step: 1, active: f.cur === 1,
          set: function (f, X) { f.g.q = clamp(snapTo(X, 0.5), 1, d.X - 1); },
          key: function (f, dx, dy) { f.g.q = clamp(f.g.q + 0.5 * (dx || dy), 1, d.X - 1); } });
        return f.cur >= 1 ? hs.reverse() : hs;   // the new step's handle first, so keyboard focus moves to it
      }
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), d = f.dom, T = stack(f, S), ty = T.ty, by = T.by, Px = M.income.Px, Py = M.income.Py, I0 = f.p0.I0;
      stackAxes(f, S, D, T, {});
      var icA = M.income.ic(p.type, p.I0), icB = M.income.ic(p.type, p.I1);
      var icFn = function (ic) { return function (x) { var y = ic.fn(x); return x > ic.b ? NaN : ty(y); }; };
      var dem = function (k) { return function (x) { return k / x <= d.P ? by(k / x) : NaN; }; };
      var xI0 = p.I0 / Px, xI1 = p.I1 / Px;
      // top: the old and new budget lines, A and its curve
      D.line(0, ty(p.I0 / Py), xI0, ty(0), { c: C.grey, w: 3.5, dash: '9 8', pr: b });
      D.line(0, ty(p.I1 / Py), xI1, ty(0), { c: BUD, w: 5, pr: b });
      D.fn(icFn(icA), Math.max(icA.a, 0.05), Math.min(d.X, icA.b), { c: IC, w: 3.5, op: 0.8, pr: b });
      if (b > 0.9) {
        segLabel(D, money(p.I0), 0, ty(p.I0 / Py), xI0, ty(0), [0.15, 0.3, 0.08], { c: C.soft, size: S.ls, pref: 'below' });
        segLabel(D, money(p.I1), 0, ty(p.I1 / Py), xI1, ty(0), [0.12, 0.25, 0.06, 0.4], { c: BUDT, size: S.ls });
      }
      D.dot(s.X0, ty(s.Y0), { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(s.X0, ty(s.Y0), 'A', { c: C.ink, size: S.fs, d: 16 });
      // bottom: the old demand curve through A's quantity at $2
      D.line(0, by(Px), d.X, by(Px), { c: C.soft, w: 2, dash: '4 7', pr: b, op: 0.8, layer: 'under' });
      D.fn(dem(s.k0), s.k0 / d.P, d.X, { c: DEM, w: 4.5, pr: b, op: f.truth ? 0.55 : 1 });
      D.dot(s.X0, by(Px), { c: DEM, r: 8, pr: b });
      if (b > 0.9) {
        D.curveLabel('D at ' + money(p.I0), dem(s.k0), [0.12, 0.2, 0.3], { c: DEMT, size: S.ls, op: f.truth ? 0.7 : 1 });
        D.label('P_X = $2', [{ x: S.x1 - 4, y: S.y(by(Px)) - 8, anchor: 'end' }, { x: S.x1 - 4, y: S.y(by(Px)) + 24, anchor: 'end' }], { c: C.soft, size: S.ss });
      }
      if (f.predicting) {
        if (f.cur >= 1 || f.done[1]) {
          D.fn(dem(Px * g.q), Px * g.q / d.P, d.X, { c: PLUM, w: 4.5 });
          D.curveLabel('yours', dem(Px * g.q), [0.82, 0.7, 0.92], { c: PLUM, size: S.ss });
        }
        return;
      }
      var mv = f.t('B'), ph = f.t('path'), dr = f.t('drop'), sh = f.t('shift');
      if (f.ghostOn()) {
        var gy = (p.I1 - Px * g.x) / Py;
        D.ghost(g.x, ty(gy), { op: f.gOp() }); youTag(f, D, g.x, ty(gy));
        D.fn(dem(Px * g.q), Px * g.q / d.P, d.X, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        D.ghost(g.q, by(Px), { op: f.gOp() });
      }
      if (ph > 0) {
        var path = []; for (var I = 40; I <= 160.001; I += 2) path.push([M.income.x(p.type, I), ty(M.income.y(p.type, I))]);
        D.path(path, { c: IC, w: 3, dash: '7 7', pr: ph, layer: 'under' });
        if (ph > 0.9) D.pathLabel('income expansion path', path, [0.9, 0.75, 0.6], { c: ICT, size: S.ss });
      }
      if (mv > 0) {
        D.fn(icFn(icB), Math.max(icB.a, 0.05), Math.min(d.X, icB.b), { c: IC, w: 4.5, pr: mv });
        D.dot(s.X1, ty(s.Y1), { c: C.ink, r: 10, pr: mv });
        if (mv > 0.6) D.near(s.X1, ty(s.Y1), 'B', { c: C.ink, size: S.fs, d: 16, op: mv });
      }
      if (dr > 0) D.line(s.X1, ty(s.Y1), s.X1, lerp(ty(s.Y1), by(Px), dr), { c: C.ink, w: 2.5, dash: '6 6', reg: false });
      if (sh > 0) {
        var k = lerp(s.k0, s.k1, sh), xq = k / Px;
        D.fn(dem(k), k / d.P, d.X, { c: DEM, w: 5 });
        D.dot(xq, by(Px), { c: DEM, r: 10 });
        if (Math.abs(s.X1 - s.X0) > 0.3) D.arrowP(S.x(s.X0), S.y(by(Px)) - 18, S.x(lerp(s.X0, s.X1, sh)), S.y(by(Px)) - 18, { c: C.gold, w: 4 });
        if (sh > 0.9) {
          D.curveLabel('D at ' + money(p.I1), dem(s.k1), [0.55, 0.45, 0.7, 0.35], { c: DEMT, size: S.ls });
          D.xval(s.X1, 'X* = ' + num(s.X1, 2), { c: VAL, anchor: s.dir > 0 ? 'start' : 'end', dx: s.dir > 0 ? 8 : -8 });
        }
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['B', 300, 800], ['path', 1050, 700], ['drop', 1700, 600], ['shift', 2250, 1100]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, Px = M.income.Px, Py = M.income.Py, dI = p.I1 - p.I0;
      var dirW = function (v) { return Math.abs(v) < 1e-9 ? 'no shift' : v > 0 ? 'right' : 'left'; };
      var why = p.type === 'normal'
        ? 'She spends half of every dollar on X, so X* = 0.5 x ' + num(p.I1) + ' / 2 = <b>' + num(s.X1, 2) + '</b>: ' + (s.rise ? 'more' : 'less') + ' X when income ' + (s.rise ? 'rises' : 'falls') +
          ' (dX*/dI = +0.25). That is a normal good. At the same $2 she buys ' + (s.rise ? 'more' : 'less') + ', and the same happens at every price, so the whole demand curve shifts <b>' + s.shift + '</b>.'
        : 'X* = 20 - 0.05 x ' + num(p.I1) + ' = <b>' + num(s.X1, 2) + '</b>: ' + (s.rise ? 'richer, she buys less' : 'poorer, she buys more') + ' X (dX*/dI = -0.05), and the extra ' + (s.rise ? 'money goes' : 'cut comes out of') +
          ' Y. That is an inferior good. Her demand curve shifts <b>' + s.shift + '</b>, the opposite of a normal good.';
      return {
        rows: [['New X*', num(g.x, 1), num(s.X1, 2)], ['New Y*', num((p.I1 - Px * g.x) / Py, 2), num(s.Y1, 2)], ['Demand shifts', dirW(g.q - s.X0), dirW(s.dX)]],
        why: why + ' A change in income moves the curve; only ' + PX + ' moves her along it.'
      };
    },
    explore: {
      hint: 'Step her income and switch the type of good. Watch B ride the expansion path and the demand curve shift with it.',
      controls: [
        { kind: 'stepper', label: 'Income', get: function (f) { return f.p.I1; }, set: function (f, v) { f.p.I1 = v; }, step: 10, min: 40, max: 160, fmt: money, dur: 400 },
        { kind: 'seg', label: 'X is', options: [['normal', 'Normal'], ['inferior', 'Inferior']], get: function (f) { return f.p.type; }, set: function (f, v) { f.p.type = v; f.resolve(true); } }
      ],
      readout: function (f) {
        var p = f.p, s = f.sol;
        return 'At ' + money(p.I1) + ' she buys X* = <b>' + num(s.X1, 2) + '</b>, Y* = <b>' + num(s.Y1, 2) + '</b>. dX*/dI = <b>' + (p.type === 'normal' ? '+0.25' : '-0.05') + '</b>: ' +
          (p.type === 'normal' ? 'more income, more X, demand shifts right.' : 'more income, less X, demand shifts left.');
      }
    }
  });

  /* =====================================================================
     3.4  Shift vs. movement drill
     ===================================================================== */
  var DRL = M.drill;
  function dLine(dq) { return function (q) { return (DRL.A + (dq || 0) - q) / DRL.B; }; }   // P as a function of Q
  function f34Psh(s) { return s.P0 >= 7 ? 2 : 9; }   // where the curve's own handle sits, away from the dot
  var f34 = {
    key: 'f34', num: '3.4', topic: 'Shift vs. movement drill', short: 'Shift or movement', model: DRL,
    axes: { xtitle: 'Quantity of X', ytitle: 'Price of X ($)' }, aspect: 0.74,
    question: function (f) { return f.sol.sc.t + ' Show it on the graph.'; },
    setup: function (f) {
      var s = f.sol;
      return 'The blue line is her demand curve for X, Q = 24 - 2' + PX + '. The black dot is where she is now: ' + money(s.P0) + ', ' + num(s.Q0) + ' units. ' +
        '<b>Drag the dot</b> if she slides along the curve, or <b>drag the curve</b> by its handle if the whole curve moves.';
    },
    steps: [{ kind: 'drag', label: 'Movement along D, or a shift of D?', prompt: 'Drag the dot along the curve, or drag the curve itself. Moving one resets the other.',
      check: function (f) { var g = f.g; return g.mode === 'move' ? Math.abs(g.P - f.sol.P0) >= 0.25 : g.mode === 'shift' ? Math.abs(g.dq) >= 1 : false; } }],
    kbdHint: 'Keyboard: Space picks the dot or the curve. Up and down slide the dot along the curve; left and right shift the curve. Enter confirms.',
    initGuess: function (f) { return { mode: null, P: f.sol.P0, dq: 0 }; },
    handles: function (f, S) {
      var s = f.sol, g = f.g, st = f.predicting ? g : f.ex, ps = f34Psh(s), lineP = function (dq) { return dLine(dq); };
      if (!f.predicting && !f.exploring) return [];
      var dot = { x: DRL.q(st.P, st.dq), y: st.P, step: 0, active: f.predicting ? !f.done[0] : true, c: f.predicting ? PLUM : C.ink,
        set: function (f, X, Y) {
          var o = f.predicting ? f.g : f.ex;
          if (f.predicting && o.mode !== 'move') { o.mode = 'move'; o.dq = 0; }
          var nx = nearX(S, lineP(o.dq), 0, S.X, X, Y); if (nx == null) return;
          o.P = clamp(Math.round(lineP(o.dq)(nx) * 4) / 4, 0.5, 11.5);
        },
        key: function (f, dx, dy) {
          var o = f.predicting ? f.g : f.ex;
          if (f.predicting && o.mode !== 'move') { o.mode = 'move'; o.dq = 0; }
          o.P = clamp(o.P + 0.25 * (dy || dx), 0.5, 11.5); if (f.exploring) f.ex.touched = true;
        } };
      var crv = { x: DRL.q(ps, st.dq), y: ps, grip: 'h', step: 0, active: f.predicting ? !f.done[0] : true, c: f.predicting ? PLUM : C.ink,
        set: function (f, X) {
          var o = f.predicting ? f.g : f.ex;
          if (f.predicting && o.mode !== 'shift') { o.mode = 'shift'; o.P = s.P0; }
          o.dq = clamp(Math.round(X - DRL.q(ps)), -14, 12);
        },
        key: function (f, dx, dy) {
          var o = f.predicting ? f.g : f.ex;
          if (f.predicting && o.mode !== 'shift') { o.mode = 'shift'; o.P = s.P0; }
          o.dq = clamp(o.dq + (dx || dy), -14, 12); if (f.exploring) f.ex.touched = true;
        } };
      return [dot, crv];
    },
    render: function (f, S, D) {
      var s = f.sol, g = f.g, b = f.base(), ps = f34Psh(s);
      D.line(0, DRL.A / DRL.B, DRL.A, 0, { c: DEM, w: 5, pr: b, op: f.exploring && f.ex.dq ? 0.45 : 1 });
      if (b > 0.9) D.curveLabel('D', dLine(0), [0.62, 0.5, 0.75], { c: DEMT, pref: 'below' });
      D.drop(s.Q0, s.P0, { pr: b, op: 0.7 });
      if (!(f.exploring)) D.dot(s.Q0, s.P0, { c: C.ink, r: 9, pr: b });
      if (b > 0.9 && !f.exploring) D.near(s.Q0, s.P0, 'now', { c: C.ink, size: S.ss, d: 18 });
      D.xval(s.Q0, num(s.Q0), { c: C.soft, size: S.ss, op: b > 0.9 ? 0.9 : 0 });
      D.yval(s.P0, money(s.P0), { c: C.soft, size: S.ss, op: b > 0.9 ? 0.9 : 0 });
      if (f.predicting) {
        if (g.mode === 'shift' && g.dq) {
          D.line(g.dq, DRL.A / DRL.B, DRL.A + g.dq, 0, { c: PLUM, w: 4.5 });
          D.curveLabel('your new D', dLine(g.dq), [0.72, 0.6, 0.85], { c: PLUM, size: S.ss });
        }
        if (!g.mode) {
          D.near(DRL.q(ps), ps, 'drag to shift D', { c: PLUM, size: S.ss, d: 22 });
        }
        return;
      }
      var an = f.t('ans'), tg = f.t('tag');
      if (f.ghostOn()) {
        if (g.mode === 'shift' && g.dq) D.line(g.dq, DRL.A / DRL.B, DRL.A + g.dq, 0, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        if (g.mode) { D.ghost(DRL.q(g.P, g.dq), g.P, { op: f.gOp() }); youTag(f, D, DRL.q(g.P, g.dq), g.P); }
      }
      if (f.exploring) {
        var e = f.ex;
        if (e.dq) { D.line(e.dq, DRL.A / DRL.B, DRL.A + e.dq, 0, { c: DEM, w: 5 }); D.curveLabel(e.dq > 0 ? 'D shifted right' : 'D shifted left', dLine(e.dq), [0.75, 0.62, 0.86], { c: DEMT, size: S.ls }); }
        D.drop(DRL.q(e.P, e.dq), e.P, { op: 0.8 });
        D.xval(DRL.q(e.P, e.dq), num(DRL.q(e.P, e.dq)), { c: VAL });
        return;
      }
      if (s.kind === 'movement') {
        var Pm = lerp(s.P0, s.P1, an), Qm = DRL.q(Pm);
        if (an > 0) {
          D.arrow(s.Q0, s.P0, Qm, Pm, { c: C.gold, w: 4.5 });
          D.dot(Qm, Pm, { c: C.ink, r: 10 });
          if (an > 0.95) { D.drop(s.Q1, s.P1, { op: 0.8 }); D.near(s.Q1, s.P1, money(s.P1) + ', ' + num(s.Q1) + ' units', { c: VAL, d: 22 }); }
        }
        if (tg > 0) D.label('movement along D', [{ x: S.x1 - 4, y: S.y1 + 20, anchor: 'end' }], { c: C.tGold, op: tg, size: S.fs, prio: 0, fixed: true });
      } else {
        var dq = s.dq * an;
        if (an > 0) {
          D.line(dq, DRL.A / DRL.B, DRL.A + dq, 0, { c: DEM, w: 5 });
          D.arrow(s.Q0, s.P0, s.Q0 + dq, s.P0, { c: C.gold, w: 4.5 });
          D.dot(s.Q0 + dq, s.P0, { c: C.ink, r: 10 });
          if (an > 0.95) D.curveLabel('D′', dLine(s.dq), [0.75, 0.62, 0.86], { c: DEMT });
        }
        if (tg > 0) D.label('the whole curve shifts ' + (s.sc.dir > 0 ? 'right' : 'left'), [{ x: S.x1 - 4, y: S.y1 + 20, anchor: 'end' }], { c: C.tGold, op: tg, size: S.fs, prio: 0, fixed: true });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['ans', 350, 1300], ['tag', 1650, 500]]; },
    verdict: function (f) {
      var s = f.sol, g = f.g;
      var you = g.mode === 'move' ? 'movement' : g.mode === 'shift' ? 'shift' : '-';
      var youDir = g.mode === 'move' ? (g.P > s.P0 ? 'up' : 'down') + ' to ' + money(g.P) : g.mode === 'shift' ? (g.dq > 0 ? 'right' : 'left') : '-';
      var ansDir = s.kind === 'movement' ? (s.P1 > s.P0 ? 'up' : 'down') + ' to ' + money(s.P1) + ', ' + num(s.Q1) + ' units' : (s.sc.dir > 0 ? 'right' : 'left');
      return {
        rows: [['What happens', you, s.kind === 'movement' ? 'movement along D' : 'shift of D'], ['Which way', youDir, ansDir]],
        why: Kit.rich(s.sc.why) + ' The demand curve holds income, other prices, tastes and the number of buyers fixed; only ' + PX + ' itself moves her along it.'
      };
    },
    explore: {
      init: function (f) { var s = f.sol; f.ex.P = s.P1; f.ex.dq = s.kind === 'shift' ? s.dq : 0; },
      hint: 'Both handles work now. Slide the dot to change ' + PX + ' (a movement), or drag the curve (anything else changing). Then try another scenario.',
      controls: [],
      readout: function (f) {
        var e = f.ex, q = DRL.q(e.P, e.dq);
        return 'At ' + PX + ' = <b>' + money(e.P) + '</b> she buys <b>' + num(q) + '</b>. ' +
          (e.dq ? 'The curve has shifted ' + (e.dq > 0 ? 'right' : 'left') + ' by ' + Math.abs(e.dq) + ': at every price she buys ' + Math.abs(e.dq) + ' ' + (e.dq > 0 ? 'more' : 'fewer') + ' units.' : 'The curve is where it started.');
      }
    }
  };

  /* =====================================================================
     3.5  Cross-price effects: substitutes and complements
     ===================================================================== */
  var CR = M.cross;
  function relText(p) {
    return p.rel === 'sub' ? 'X and Y are <b>substitutes</b> for her, like Pepsi and Coke.' : 'X and Y are <b>complements</b> for her, like coffee and milk.';
  }
  function shareEq(p) { return '<span class="nw">s = 0.5 ' + (p.rel === 'sub' ? '+' : '-') + ' 0.06 (' + PY + ' - 4)</span>'; }
  var f35 = {
    key: 'f35', num: '3.5', topic: 'Cross-price and demand function explorer', short: 'Substitutes or complements', model: CR,
    axes: { xtitle: 'Quantity of X', ytitle: 'Price of X ($)' }, aspect: 0.74,
    question: function (f) { var p = f.p; return PY + ' ' + (p.Py1 > p.Py0 ? 'rises' : 'falls') + ' from ' + money(p.Py0) + ' to ' + money(p.Py1) + '. Where does her demand curve for X go?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return relText(p) + ' Income <b>' + money(p.I) + '</b>, ' + PX + ' = <b>' + money(p.Px) + '</b>. She spends a share ' + shareEq(p) + ' of her income on X, so <span class="nw">X* = s I / ' + PX + '</span>' +
        '. At ' + PY + ' = ' + money(p.Py0) + ', s = ' + num(s.s0, 2) + ' and she buys <b>' + num(s.X0, 2) + '</b>: the blue curve.';
    },
    steps: [{ kind: 'drag', label: 'Her new demand curve', prompt: 'Drag the plum curve left or right to where it sits at the new ' + PY + '.',
      check: function (f) { return Math.abs(f.g.x - f.sol.X0) >= 0.5 ? true : 'Drag it: that is still the old curve.'; } }],
    kbdHint: 'Keyboard: left and right arrows shift the curve, Enter confirms.',
    initGuess: function (f) { return { x: f.sol.X0 }; },
    handles: function (f, S) {
      var g = f.g, p = f.p, s = f.sol, X = f.dom.X;
      if (f.predicting) return [{ x: g.x, y: p.Px, grip: 'h', step: 0, active: !f.done[0],
        set: function (f, Xv) { f.g.x = clamp(snapTo(Xv, 0.5), 1, X - 1); }, key: function (f, dx, dy) { f.g.x = clamp(f.g.x + 0.5 * (dx || dy), 1, X - 1); } }];
      if (!f.exploring) return [];
      return [{ x: s.X1, y: p.Px, c: C.ink, grip: 'v', active: true,
        set: function (f, Xv, Y) { f.p.Px = clamp(Math.round(Y * 4) / 4, f35.pxmin(f), f.dom.Y - 0.25); },
        key: function (f, dx, dy) { f.p.Px = clamp(f.p.Px + 0.25 * (dy || dx), f35.pxmin(f), f.dom.Y - 0.25); f.ex.touched = true; f.resolve(); } }];
    },
    pxmin: function (f) { return Math.max(0.5, Math.ceil(Math.max(f.sol.k0, f.sol.k1) / (0.96 * f.dom.X) * 4) / 4); },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), X = f.dom.X, P = f.dom.Y;
      var dem = function (k) { return function (x) { return k / x; }; };
      D.line(0, p.Px, X, p.Px, { c: C.soft, w: 2, dash: '4 7', op: 0.8 * b, layer: 'under' });
      D.fn(dem(s.k0), s.k0 / P, X, { c: DEM, w: 5, pr: b, op: f.truth ? 0.5 : 1, dash: f.truth ? '10 8' : null });
      if (b > 0.9) D.curveLabel('D at ' + 'P_Y' + ' = ' + money(p.Py0), dem(s.k0), [0.62, 0.75, 0.5, 0.86], { c: DEMT, size: S.ls, op: f.truth ? 0.75 : 1 });
      if (!f.exploring) D.dot(s.X0, p.Px, { c: C.ink, r: 9, pr: b });
      if (b > 0.9) D.label('P_X = ' + money(p.Px), [{ x: S.x1 - 4, y: S.y(p.Px) - 10, anchor: 'end' }, { x: S.x1 - 4, y: S.y(p.Px) + 26, anchor: 'end' }], { c: C.soft, size: S.ss });
      if (f.predicting) {
        if (Math.abs(g.x - s.X0) > 0.01) {
          D.fn(dem(p.Px * g.x), p.Px * g.x / P, X, { c: PLUM, w: 4.5 });
          D.curveLabel('yours', dem(p.Px * g.x), [0.3, 0.2, 0.42], { c: PLUM, size: S.ss });
        }
        D.xval(g.x, num(g.x, 1), { c: PLUM, size: S.ss });
        return;
      }
      var sh = f.t('shift'), vl = f.t('vals');
      if (f.ghostOn()) {
        D.fn(dem(p.Px * g.x), p.Px * g.x / P, X, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        D.ghost(g.x, p.Px, { op: f.gOp() }); youTag(f, D, g.x, p.Px);
      }
      var k = f.exploring ? s.k1 : lerp(s.k0, s.k1, sh), xq = k / p.Px;
      if (sh > 0) {
        D.fn(dem(k), k / P, X, { c: DEM, w: 5 });
        D.dot(xq, p.Px, { c: C.ink, r: 10 });
        if (!f.exploring && Math.abs(s.X1 - s.X0) > 0.3) D.arrowP(S.x(s.X0), S.y(p.Px) - 18, S.x(lerp(s.X0, s.X1, sh)), S.y(p.Px) - 18, { c: C.gold, w: 4 });
        if (sh > 0.9) D.curveLabel('D′ at P_Y = ' + money(p.Py1), dem(s.k1), [0.42, 0.3, 0.55, 0.2], { c: DEMT, size: S.ls, pref: s.dir > 0 ? 'aboveOnly' : 'below' });
      }
      if (vl > 0) D.xval(xq, 'X* = ' + num(xq, 2), { c: VAL, op: vl, anchor: s.dir > 0 ? 'start' : 'end', dx: s.dir > 0 ? 8 : -8 });
    },
    reveal: function () { return [['ghost', 0, 400], ['shift', 350, 1300], ['vals', 1600, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, dw = function (v) { return Math.abs(v) < 1e-9 ? 'no shift' : v > 0 ? 'right' : 'left'; };
      var dPy = p.Py1 - p.Py0, pctX = Math.round((s.X1 / s.X0 - 1) * 100);
      var reason = p.rel === 'sub'
        ? (dPy > 0 ? 'A dearer substitute pushes her toward X' : 'A cheaper substitute pulls her away from X')
        : (dPy > 0 ? 'A dearer complement makes the pair costlier, so she wants less X' : 'A cheaper complement makes the pair cheaper, so she wants more X');
      return {
        rows: [['Quantity at ' + money(p.Px), num(g.x, 1), num(s.X1, 2)], ['Demand shifts', dw(g.x - s.X0), dw(s.X1 - s.X0)]],
        why: 'At ' + PY + ' = ' + money(p.Py1) + ' her share on X is ' + num(s.s1, 2) + ' instead of ' + num(s.s0, 2) + ', so at every ' + PX + ' she buys ' + Math.abs(pctX) + '% ' + (pctX > 0 ? 'more' : 'less') +
          ': at ' + money(p.Px) + ', X* = ' + num(s.s1, 2) + ' x ' + num(p.I) + ' / ' + num(p.Px, 2) + ' = <b>' + num(s.X1, 2) + '</b>. ' + reason + ', so her demand curve for X shifts <b>' + s.shift + '</b>. ' +
          PY + ' is on neither axis, so it shifts the curve; ' + PX + ' only moves her along it.'
      };
    },
    explore: {
      hint: 'Step ' + PY + ' to shift the curve, or drag the black point (or step ' + PX + ') to move along it. Switch to the other relationship and the shift reverses.',
      controls: function (f) {
        return [
          { kind: 'stepper', label: 'P_Y', get: function (f) { return f.p.Py1; }, set: function (f, v) { f.p.Py1 = v; }, step: 1, min: 1, max: 8, fmt: money, dur: 400 },
          { kind: 'stepper', label: 'P_X', get: function (f) { return f.p.Px; }, set: function (f, v) { f.p.Px = v; }, step: 0.5, min: f35.pxmin(f), max: f.dom.Y - 0.5, fmt: money, dur: 400 },
          { kind: 'seg', label: 'X and Y are', options: [['sub', 'Substitutes'], ['comp', 'Complements']], get: function (f) { return f.p.rel; }, set: function (f, v) { f.p.rel = v; } }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol;
        var eff = Math.abs(s.k1 - s.k0) < 1e-9 ? 'No shift: ' + PY + ' is back at ' + money(p.Py0) + '.' : 'The curve sits <b>' + s.shift + '</b> of where it started.';
        return PY + ' = ' + money(p.Py1) + ': s = <b>' + num(s.s1, 2) + '</b>, X* = ' + num(s.s1, 2) + ' x ' + num(p.I) + ' / ' + num(p.Px, 2) + ' = <b>' + num(s.X1, 2) + '</b>. ' + eff;
      }
    }
  };

  window.W3FIGS = [f31, f32, f33, f34, f35];
})();
