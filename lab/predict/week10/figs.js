/* Week 10 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow the fig101 film: Firm A blue, Firm B orange-red, Stackelberg green, Cournot ink.
 * Hotelling: Vendor A blue, Vendor B orange. Profit green, consumer surplus blue, deadweight loss red.
 * Plum always means "you".
 * Kit quirk worked around here: once arrow keys were used, keyboard focus stays on a handle index.
 * Every multi-handle question therefore lists the current step's handle first (byStep below).
 * Predict handles also carry noAutoDone, so arrow keys only move them and Enter confirms the step
 * (otherwise the first arrow press would complete the step and the next one would start the next). */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg;
  var M = window.W10, PLUM = C.plum;
  var CA = C.blue, CAT = C.tBlue, CB = C.orange, CBT = C.tOrange, CST = C.green, CSTT = C.tGreen;

  function pct(v, dp) { return num(v, dp == null ? 1 : dp) + '%'; }
  function bq(b) { return b === 1 ? '' : num(b, 2); }
  function demP(p) { return 'P = ' + num(p.a) + ' - ' + bq(p.b) + 'Q'; }
  function pair(x, y, dp) { return '(' + num(x, dp == null ? 1 : dp) + ', ' + num(y, dp == null ? 1 : dp) + ')'; }
  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  // put the handle of the step being worked on first, so the keyboard lands on it (kit focus quirk)
  function byStep(f, hs) {
    hs = hs.filter(Boolean);
    hs.forEach(function (h) { h.noAutoDone = true; });
    return hs.filter(function (h) { return h.step === f.cur; }).concat(hs.filter(function (h) { return h.step !== f.cur; }));
  }
  // a handle that slides up and down the vertical line x (hit test near that line)
  function vHandle(S, x, y, setY, o) {
    o = o || {};
    return { x: x, y: y, c: o.c || PLUM, grip: 'v', snap: { x: 0, y: o.snap || 0.5 }, step: o.step, active: o.active, kstep: { x: 0, y: o.kstep || o.snap || 0.5 },
      hit: function (pt) { return Math.abs(pt.x - S.x(x)) < 30 ? Math.abs(pt.y - S.y(y)) : 1e9; },
      set: function (f, X, Y) { setY(f, Y); },
      key: o.key };
  }
  // a handle that slides along the horizontal line y (hit test near that line)
  function hHandle(S, x, y, setX, o) {
    o = o || {};
    return { x: x, y: y, c: o.c || PLUM, grip: 'h', snap: { x: o.snap || 0.5, y: 0 }, step: o.step, active: o.active, kstep: { x: o.kstep || o.snap || 0.5, y: 0 },
      hit: function (pt) { return Math.abs(pt.y - S.y(y)) < 30 ? Math.abs(pt.x - S.x(x)) : 1e9; },
      set: function (f, X) { setX(f, X); },
      key: o.key };
  }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // label centred in a data rectangle if it fits there
  function inRect(D, S, s, x0, y0, x1, y1, o) {
    var w = Math.abs(S.x(x1) - S.x(x0)), h = Math.abs(S.y(y1) - S.y(y0)), size = (o && o.size) || S.ls;
    if (w < Kit.tw(s, size) + 12 || h < size + 8) return false;
    var cx = S.x((x0 + x1) / 2), cands = [0.5, 0.3, 0.7, 0.2, 0.8].map(function (t) { return { x: cx, y: S.y(lerp(y0, y1, t)) + size * 0.35, anchor: 'middle' }; });
    D.label(s, cands, Object.assign({ prio: 0, ring: 1 }, o || {}));
    return true;
  }

  /* =====================================================================
     10.1  Cournot and Stackelberg on the best-response diagram (film)
     ===================================================================== */
  var MC1 = M.cournot;
  function brTxt(s, who) { return who === 'A' ? 'q_A = ' + num(s.half, 2) + ' - q_B/2' : 'q_B = ' + num(s.half, 2) + ' - q_A/2'; }
  function presetKey(p) { var P = MC1.PRESETS; for (var k in P) if (P[k].a === p.a && P[k].b === p.b) return k; return ''; }
  function setQA(f, X) { var s = f.sol; X = clamp(Math.round(X * 2) / 2, 0, s.c); if (Math.abs(X - s.qc) < 0.6) X = s.qc; f.ex.qA = X; f.ex.stair = null; }
  var f101 = {
    key: 'f101', num: '10.1', topic: 'Cournot and Stackelberg best responses', short: 'Cournot &amp; Stackelberg', model: MC1,
    axes: { xtitle: 'Firm A\'s output, q_A', ytitle: 'Firm B\'s output, q_B' }, aspect: 0.86, narrowAspect: 1.08,
    film: { name: 'fig101-cournot', label: 'Animation: Cournot best responses', title: 'Watch first, 43 seconds',
      caption: 'With P = 120 - Q and zero costs, two firms take turns best-responding, and the zig-zag settles at the Cournot-Nash point: 40 each at $40. If A can commit first it moves along B\'s line to 60, B replies with 30, and P = $30. Then draw it yourself.' },
    question: 'Draw Firm B\'s best response, then find where a Stackelberg leader takes the market.',
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Market demand is <b>' + demP(p) + '</b> with Q = q<sub>A</sub> + q<sub>B</sub> and MC = 0. Firm A\'s best response, <b class="c-blue">' + Kit.rich(brTxt(s, 'A')) + '</b>, is drawn in blue: ' +
        'for every output of B it gives A\'s profit-maximizing output.';
    },
    steps: [
      { kind: 'drag', label: 'Firm B\'s best response',
        prompt: function (f) { return f.g.m1 || f.g.m2 ? 'Good. Now drag the other end.' : 'Drag the two plum ends: where B\'s line meets the q<sub>B</sub> axis, and where it meets the q<sub>A</sub> axis.'; },
        check: function (f) { return f.g.m1 && f.g.m2; } },
      { kind: 'place', key: 's', snap: 0.5, label: 'The Stackelberg outcome',
        prompt: 'Now A commits to its output first and B replies. Tap the point (q<sub>A</sub>, q<sub>B</sub>) where the market ends up. Drag it to adjust.',
        kstart: function (f) { return { x: Math.round(f.dom.X * 0.3), y: Math.round(f.dom.Y * 0.6) }; } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the end on the q_B axis, Space switches to the other end (left and right arrows), Enter confirms. For the Stackelberg point Enter drops it and arrows move it.',
    initGuess: function (f) { var st = MC1.start(f.dom); return { top: st.top, bot: st.bot, m1: false, m2: false, s: null }; },
    handles: function (f, S) {
      var g = f.g;
      if (f.predicting) return byStep(f, [
        vHandle(S, 0, g.top, function (f, Y) { f.g.top = Y; f.g.m1 = true; }, { step: 0, active: f.cur === 0 && !g.m1, snap: 1 }),
        hHandle(S, g.bot, 0, function (f, X) { f.g.bot = Math.max(1, X); f.g.m2 = true; }, { step: 0, active: f.cur === 0 && !g.m2, snap: 1 })
      ]);
      if (!f.exploring || (f.ex.stair && f.ex.sp < 1)) return [];
      var qA = f.ex.qA;
      return [{ x: qA, y: MC1.brB(f.p, qA), c: C.ink, active: !f.ex.touched, snap: { x: 0.5, y: 0 },
        set: function (f, X) { setQA(f, X); },
        key: function (f, dx, dy) { setQA(f, f.ex.qA + (dx || dy)); f.ex.touched = true; f.resolve(); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.line(0, s.c, s.half, 0, { c: CA, w: 5, pr: b });
      if (b > 0.9) D.label(S.narrow ? 'A\'s best response' : 'A\'s best response, ' + brTxt(s, 'A'), D.along(function (q) { return s.c - 2 * q; }, [0.12, 0.18, 0.08, 0.24].map(function (t) { return t * s.c; }), 12), { c: CAT, size: S.ls, prio: 0 });
      if (f.predicting) {
        D.line(0, g.top, g.bot, 0, { c: PLUM, w: 4.5, layer: 'over', op: g.m1 || g.m2 ? 1 : 0.55, dash: g.m1 || g.m2 ? null : '8 7' });
        if (g.m1 && g.m2) {
          var x = MC1.crossing(p, g.top, g.bot);
          if (x) { D.add('over', Kit.K.ring(S.x(x.qA), S.y(x.qB), { r: 9, c: PLUM, w: 3, fill: C.paper })); D.near(x.qA, x.qB, 'your crossing', { c: PLUM, size: S.ss, d: 20, ring: 90 }); }
        }
        D.label('your B line', D.along(function (q) { return g.top * (1 - q / g.bot); }, [0.5, 0.65, 0.35, 0.8].map(function (t) { return t * g.bot; }), 12), { c: PLUM, size: S.ss, op: 0.9 });
        if (g.s) D.near(g.s.x, g.s.y, 'Stackelberg?', { c: PLUM, size: S.ss, d: 22 });
        return;
      }
      var bl = f.t('bline'), cn = f.t('cn'), sk = f.t('st');
      if (f.ghostOn()) {
        D.line(0, g.top, g.bot, 0, { c: PLUM, w: 3.5, dash: '5 6', op: 0.7 * f.gOp(), layer: 'over', reg: false });
        if (g.s) { D.ghost(g.s.x, g.s.y, { op: f.gOp() }); if (!S.narrow) youTag(f, D, g.s.x, g.s.y, 'your S'); }
      }
      if (bl > 0) {
        D.line(0, s.half, s.c, 0, { c: CB, w: 5, pr: bl });
        if (bl > 0.9) D.label(S.narrow ? 'B\'s best response' : 'B\'s best response, ' + brTxt(s, 'B'), D.along(function (q) { return (s.c - q) / 2; }, [0.8, 0.72, 0.88, 0.64].map(function (t) { return t * s.c; }), 12), { c: CBT, size: S.ls, op: seg(bl, 0.9, 1), prio: 0 });
      }
      // best-response staircase in explore
      if (f.exploring && f.ex.stair) {
        var st = f.ex.stair, u = (f.ex.sp == null ? 1 : f.ex.sp) * (st.length - 1), k = Math.floor(u), pts = st.slice(0, k + 1);
        if (k < st.length - 1) pts.push([lerp(st[k][0], st[k + 1][0], u - k), lerp(st[k][1], st[k + 1][1], u - k)]);
        D.path(pts, { c: C.soft, w: 3, layer: 'over', reg: false });
      }
      if (cn > 0) {
        D.drop(s.qc, s.qc, { pr: cn, c: C.soft });
        D.dot(s.qc, s.qc, { c: C.ink, r: 11, pr: cn });
        var px = S.x(s.qc), py = S.y(s.qc);
        D.label(S.narrow ? 'Cournot-Nash' : 'Cournot-Nash: ' + num(s.qc, 2) + ' each, P = ' + money(s.Pc), [{ x: px + 20, y: py - 16, anchor: 'start' }, { x: px - 20, y: py - 16, anchor: 'end' }, { x: px + 22, y: py + 6, anchor: 'start' }].concat(D.around(s.qc, s.qc, 22)), { c: C.ink, op: cn, prio: 0, fixed: true });
      }
      if (sk > 0) {
        D.drop(s.qL, s.qF, { pr: sk, c: CST });
        D.dot(s.qL, s.qF, { c: CST, r: 11, pr: sk });
        var sx = S.x(s.qL), sy = S.y(s.qF);
        D.label(S.narrow ? 'Stackelberg' : 'Stackelberg: ' + num(s.qL, 2) + ' and ' + num(s.qF, 2) + ', P = ' + money(s.Ps), [{ x: sx + 16, y: sy + 30, anchor: 'start' }, { x: sx + 20, y: sy - 14, anchor: 'start' }, { x: sx - 16, y: sy + 30, anchor: 'end' }].concat(D.around(s.qL, s.qF, 22)), { c: CSTT, op: sk, prio: 0, fixed: true });
      }
      if (f.exploring) {
        var qA = f.ex.stair && f.ex.sp < 1 ? null : f.ex.qA;
        if (qA != null) {
          var qB = MC1.brB(p, qA);
          D.drop(qA, qB, { c: C.ink, op: 0.6 });
          if (Math.abs(qA - s.qc) > 1e-9 && Math.abs(qA - s.qL) > 1e-9) D.label(pair(qA, qB, 1), [{ x: S.x(qA) - 20, y: S.y(qB) - 20, anchor: 'end' }, { x: S.x(qA) + 20, y: S.y(qB) + 30, anchor: 'start' }].concat(D.around(qA, qB, 24)), { c: C.ink, prio: 0, size: S.ss, ring: 50 });
        }
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['bline', 300, 1100], ['cn', 1400, 600], ['st', 2100, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, x = MC1.crossing(p, g.top, g.bot);
      return {
        rows: [['B\'s line meets the q<sub>B</sub> axis at', num(g.top, 1), num(s.half, 2)], ['B\'s line meets the q<sub>A</sub> axis at', num(g.bot, 1), num(s.c, 2)],
          ['Cournot-Nash (the crossing)', x ? pair(x.qA, x.qB) : 'none', pair(s.qc, s.qc, 2)], ['Stackelberg (q<sub>A</sub>, q<sub>B</sub>)', g.s ? pair(g.s.x, g.s.y) : '', pair(s.qL, s.qF, 2)]],
        why: 'B\'s best response is the mirror image of A\'s: <b>' + Kit.rich(brTxt(s, 'B')) + '</b>. It starts at ' + num(s.half, 2) + ' (B alone would act as a monopolist) and reaches zero at ' + num(s.c, 2) +
          ' (A alone would push the price to zero). The lines cross at ' + num(s.qc, 2) + ' each: Q = ' + num(s.Qc, 2) + ', P = ' + money(s.Pc) + ', ' + money(s.pic) + ' each. ' +
          'A leader that commits first picks the point on B\'s line it likes best: q<sub>A</sub> = ' + num(s.qL, 2) + ', B replies ' + num(s.qF, 2) + ', P = ' + money(s.Ps) + '. A earns <b>' + money(s.piL) + '</b>, B only ' + money(s.piF) + ': moving first pays.'
      };
    },
    explore: {
      init: function (f) { f.ex.qA = Math.round(f.sol.c * 0.2); },
      hint: 'Drag A\'s output: B always replies along its own line, but only the crossing is an equilibrium. From any starting point the firms take turns replying:<button type="button" class="btn ghost ex-act" data-act="adjust">Watch them adjust</button>',
      controls: [{ kind: 'seg', label: 'Market demand', options: [['base', 'P = 120 - Q'], ['small', 'P = 90 - Q'], ['steep', 'P = 120 - 2Q'], ['large', 'P = 160 - Q']],
        get: function (f) { return presetKey(f.p); },
        set: function (f, v) { var q = MC1.PRESETS[v]; f.p = { a: q.a, b: q.b }; f.dom = MC1.domain(f.p); f.sol = MC1.solve(f.p); f.ex.qA = f.sol.qc; f.ex.stair = null; } }],
      act: function (f, a) {
        if (a !== 'adjust') return;
        var s = f.sol, from = Math.abs(f.ex.qA - s.qc) < 2 ? Math.round(s.c * 0.1) : f.ex.qA;
        f.ex.stair = MC1.stairs(f.p, from, 6); f.ex.sp = 0; f.ex.qA = from;
        f.tween(0, 1, 3600, function (v) { f.ex.sp = v; }, function () { f.ex.qA = s.qc; f.render(); });
      },
      readout: function (f) {
        var p = f.p, s = f.sol, qA = f.ex.qA, qB = MC1.brB(p, qA), P = MC1.price(p, qA, qB);
        if (f.ex.stair && f.ex.sp < 1) return 'The firms take turns best-responding, starting from q<sub>A</sub> = ' + num(f.ex.stair[0][0], 1) + '. Each step is shorter than the last.';
        var atC = Math.abs(qA - s.qc) < 1e-9, atS = Math.abs(qA - s.qL) < 1e-9;
        var head = 'q<sub>A</sub> = ' + num(qA, 2) + ', B replies q<sub>B</sub> = ' + num(qB, 2) + ', P = ' + money(P) + '. Profit: A <b>' + money(P * qA) + '</b>, B <b>' + money(P * qB) + '</b>. ';
        if (atC) return head + (f.ex.stair ? 'The staircase spiralled into the crossing: ' : '') + '<span class="good">Both are best-responding: the Cournot-Nash equilibrium.</span>';
        if (atS) return head + 'A commits to the leader output and out-earns B: the first-mover advantage. But A is off its own best response, so without commitment it would cut back.';
        return head + 'B is best-responding, but A is off its own line, so this is not an equilibrium.';
      }
    }
  };

  /* =====================================================================
     10.2  The Hotelling beach
     ===================================================================== */
  var MB = M.beach, share = MB.share;
  function people(D, S, a, b, op, mode) {
    // 50 evenly spread sunbathers; colored by the vendor they walk to (grey before the reveal)
    var r = S.narrow ? 3 : 4.5, y = S.y0 - (S.narrow ? 12 : 15), out = '';
    for (var i = 0; i < 50; i++) {
      var x = (i + 0.5) / 50, col = C.grey;
      if (mode) { var dA = Math.abs(x - a), dB = Math.abs(x - b); col = Math.abs(dA - dB) < 1e-9 ? C.grey : dA < dB ? CA : CB; }
      out += '<circle cx="' + S.x(x).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : '') + '/>';
    }
    D.add('under', out);
    D.L.rect(S.x0, y - r - 2, S.x1 - S.x0, 2 * r + 4);
  }
  // A's share for every spot A might take, with B at b: a jump at b (two runs)
  function shareCurve(D, b, o) {
    D.path([[0, 100 * share(0, b)], [b - 1e-6, 100 * share(b - 1e-6, b)], null, [b + 1e-6, 100 * share(b + 1e-6, b)], [1, 100 * share(1, b)]], o);
  }
  function vendor(D, S, x, name, col, colT, op, below) {
    D.dot(x, 0, { c: col, r: 12, op: op });
    D.label(name, [{ x: S.x(x), y: S.y0 - (S.narrow ? 30 : 36), anchor: 'middle' }, { x: S.x(x) + 16, y: S.y0 - 30, anchor: 'start' }, { x: S.x(x) - 16, y: S.y0 - 30, anchor: 'end' }], { c: colT, size: S.fs, op: op, prio: 0 });
  }
  function leapPos(p, s, t) {
    // both vendors creep inward to 0.5, A staying on its side of B
    var side = s.right ? 1 : -1;
    return { a: lerp(s.best, 0.5, t), b: lerp(p.b, 0.5, t), side: side };
  }
  var f102 = {
    key: 'f102', num: '10.2', topic: 'The Hotelling beach', short: 'Hotelling beach', model: MB,
    axes: { xtitle: 'Location on the beach (miles)', ytitle: 'A\'s share of the beach', yfmt: function (v) { return num(v, 0) + '%'; }, xfmt: function (v) { return num(v, 2); } },
    aspect: 0.62, narrowAspect: 0.95,
    question: function (f) { return 'Vendor B stands at ' + num(f.p.b, 2) + '. Where should A stand, and where do both end up?'; },
    setup: function (f) {
      return 'A one-mile beach, sunbathers spread evenly, same ice cream at the same price. Everyone walks to the <b>nearer</b> vendor. Each vendor wants as many customers as it can get.';
    },
    steps: [
      { kind: 'drag', label: 'Where A should stand', prompt: 'Drag the plum vendor A along the beach to the spot that wins A the most sunbathers, with B where it is.',
        check: function (f) { return f.g.ma ? true : 'Drag A first.'; } },
      { kind: 'place', key: 'end', handle: false, label: 'Where both end up', prompt: 'Then B answers, A answers back, and so on. Tap the spot on the beach where they both end up.',
        place: function (f, X) { f.g.end = { x: clamp(Math.round(X * 100) / 100, 0, 1), y: 0 }; },
        kstart: function (f) { return { x: f.p.b > 0.5 ? 0.15 : 0.85, y: 0 }; } }
    ],
    kbdHint: 'Keyboard: left and right arrows move vendor A, Enter confirms. For the second step Enter drops the marker, arrows move it, Enter confirms.',
    initGuess: function (f) { return { a: f.p.a, ma: false, end: null }; },
    handles: function (f, S) {
      var g = f.g;
      if (f.predicting) return byStep(f, [
        hHandle(S, g.a, 0, function (f, X) { f.g.a = clamp(Math.round(X * 100) / 100, 0, 1); f.g.ma = true; }, { step: 0, active: f.cur === 0, snap: 0.01 }),
        g.end ? hHandle(S, g.end.x, 0, function (f, X) { f.g.end = { x: clamp(Math.round(X * 100) / 100, 0, 1), y: 0 }; }, { step: 1, active: f.cur === 1, snap: 0.01 }) : null
      ]);
      if (!f.exploring) return [];
      return [
        hHandle(S, f.p.a, 0, function (f, X) { f.p.a = clamp(Math.round(X * 100) / 100, 0, 1); }, { c: CA, snap: 0.01, active: !f.ex.touched }),
        hHandle(S, f.p.b, 0, function (f, X) { f.p.b = clamp(Math.round(X * 100) / 100, 0, 1); }, { c: CB, snap: 0.01 })
      ];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      if (f.predicting) {
        people(D, S, 0, 0, b, false);
        vendor(D, S, p.b, 'B', CB, CBT, b);
        D.label('A', [{ x: S.x(g.a), y: S.y0 - (S.narrow ? 30 : 36), anchor: 'middle' }], { c: PLUM, size: S.fs, prio: 0, fixed: true });
        if (g.end) D.label('both end here?', [{ x: S.x(g.end.x), y: S.y0 - 58, anchor: 'middle' }, { x: S.x(g.end.x), y: S.y0 - 84, anchor: 'middle' }], { c: PLUM, size: S.ss });
        if (b > 0.9) D.label('sunbathers, spread evenly', [{ x: S.x(0.5), y: S.y0 - 80, anchor: 'middle' }, { x: S.x(0.5), y: S.y0 - 110, anchor: 'middle' }], { c: C.soft, size: S.ss });
        return;
      }
      var cv = f.t('curve'), bs = f.t('best'), lp = f.t('leap'), ns = f.t('nash');
      if (f.exploring) {
        var a = p.a, bb = p.b, mid = (a + bb) / 2;
        people(D, S, a, bb, 1, true);
        shareCurve(D, bb, { c: CA, w: 4.5 });
        D.line(mid, 0, mid, S.Y * 0.16, { c: C.ink, w: 2.5, dash: '5 5', layer: 'over' });
        D.label('split ' + num(mid, 3), [{ x: S.x(mid), y: S.y(S.Y * 0.16) - 8, anchor: 'middle' }, { x: S.x(mid), y: S.y(S.Y * 0.16) - 34, anchor: 'middle' }], { c: C.ink, size: S.ss, prio: 0, ring: 60 });
        var sh = share(a, bb);
        D.dot(a, 100 * sh, { c: CA, r: 9 });
        D.near(a, 100 * sh, 'A: ' + pct(100 * sh), { c: CAT, d: 20, prio: 0, ring: 100 });
        vendor(D, S, bb, 'B', CB, CBT, 1); vendor(D, S, a, 'A', CA, CAT, 1);
        D.label('A\'s share as A moves', D.along(function (x) { return 100 * share(x, bb); }, [0.08, 0.92, 0.2, 0.8], 12, 'aboveOnly'), { c: CAT, size: S.ss });
        return;
      }
      // revealing: curve of A's share given B, the best spot, then the creep inward
      var pos = lp > 0 ? leapPos(p, s, lp) : { a: bs > 0.5 ? s.best : g.a, b: p.b };
      people(D, S, pos.a, pos.b, 1, true);
      if (cv > 0) {
        shareCurve(D, p.b, { c: CA, w: 4.5, pr: cv, op: lp > 0 ? 1 - 0.6 * lp : 1 });
        if (cv > 0.9 && lp <= 0) D.label('A\'s share as A moves', D.along(function (x) { return 100 * share(x, p.b); }, [0.08, 0.92, 0.2, 0.8], 12, 'aboveOnly'), { c: CAT, size: S.ss, op: seg(cv, 0.9, 1) });
      }
      if (f.ghostOn() && lp <= 0) {
        D.ghost(g.a, 100 * share(g.a, p.b), { op: f.gOp() });
        D.near(g.a, 100 * share(g.a, p.b), 'you: ' + pct(100 * share(g.a, p.b)), { c: PLUM, size: S.ss, op: f.gOp(), d: 20, ring: 90 });
      }
      if (f.ghostOn() && g.end) D.ghost(g.end.x, 0, { op: f.gOp(), r: 14 });
      if (f.ghostOn() && lp <= 0 && Math.abs(g.a - s.best) > 0.005) D.ghost(g.a, 0, { op: f.gOp(), r: 12 });
      if (bs > 0 && lp <= 0) {
        D.dot(s.best, 100 * s.bestShare, { c: C.ink, r: 10, pr: bs });
        D.near(s.best, 100 * s.bestShare, 'best: ' + num(s.best, 2) + ', ' + pct(100 * s.bestShare), { c: C.ink, op: bs, d: 22, prio: 0, ring: 120 });
      }
      vendor(D, S, pos.b, 'B', CB, CBT, 1);
      if (lp > 0 || bs > 0.5) vendor(D, S, lp > 0 ? pos.a : s.best, 'A', CA, CAT, 1);
      if (ns > 0) {
        D.line(0.5, 0, 0.5, S.Y * 0.62, { c: C.ink, w: 2.5, dash: '6 6', layer: 'over', op: ns });
        D.label(S.narrow ? 'Nash: both at 0.5' : 'Nash: both at 0.5, half the beach each', [{ x: S.x(0.5), y: S.y(S.Y * 0.62) - 10, anchor: 'middle' }], { c: C.ink, op: ns, prio: 0, size: S.ls });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['curve', 300, 1200, 'linear'], ['best', 1500, 600], ['leap', 2700, 1800], ['nash', 4400, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, side = s.right ? 'right' : 'left';
      return {
        rows: [['A stands at', num(g.a, 2), num(s.best, 2) + ', beside B'], ['A\'s share there', pct(100 * share(g.a, p.b)), pct(100 * s.bestShare)], ['Both end up at', g.end ? num(g.end.x, 2) : '', '0.5']],
        why: 'A serves everyone up to the midpoint between the two vendors. With B at ' + num(p.b, 2) + ', A does best standing right beside B on the long side (the ' + side + '), at ' + num(s.best, 2) + ' on this 0.01 grid: ' + pct(100 * s.bestShare) + ' of the beach. ' +
          'But B then jumps to A\'s other side, and so on: every step toward the middle steals customers. They stop only when both stand at <b>0.5</b> with half each, where neither can gain by moving: the Nash equilibrium, minimum differentiation. ' +
          'Customers walk twice as far there (0.25 miles on average) as with the vendors at the quarter points (0.125).'
      };
    },
    explore: {
      hint: 'Drag vendor A (blue) or B (orange) along the beach. The blue curve is A\'s share wherever A might stand, with B where it is.',
      controls: [{ kind: 'seg', label: 'Jump to', options: [['nash', 'Nash: both at 0.5'], ['eff', 'Efficient: 0.25 and 0.75']],
        get: function (f) { return f.p.a === 0.5 && f.p.b === 0.5 ? 'nash' : f.p.a === 0.25 && f.p.b === 0.75 ? 'eff' : ''; },
        set: function (f, v) { if (v === 'nash') { f.p.a = 0.5; f.p.b = 0.5; } else { f.p.a = 0.25; f.p.b = 0.75; } } }],
      readout: function (f) {
        var a = f.p.a, b = f.p.b, sa = share(a, b), w = MB.walk(a, b), nash = a === 0.5 && b === 0.5;
        var head = 'A at ' + num(a, 2) + ': <b>' + pct(100 * sa) + '</b> of the beach. B at ' + num(b, 2) + ': <b>' + pct(100 * (1 - sa)) + '</b>. Average walk <b>' + num(w, 3) + ' miles</b>. ';
        if (nash) return head + '<span class="good">Neither can gain by moving: the Nash equilibrium.</span>';
        if (a === 0.25 && b === 0.75 || a === 0.75 && b === 0.25) return head + 'The shortest walks of all, but each vendor gains by creeping toward the middle, so it does not last.';
        if (a === b) return head + 'Side by side away from the middle: either one gains by stepping to the longer side.';
        return head + 'Whoever steps toward the middle steals customers from the other.';
      }
    }
  };

  /* =====================================================================
     10.3  n-firm Cournot: from monopoly to competition
     ===================================================================== */
  var MN = M.nfirm;
  var f103 = {
    key: 'f103', num: '10.3', topic: 'n-firm Cournot', short: 'n-firm Cournot', model: MN,
    axes: function (f) {
      var k = f.p.k;
      return { xtitle: 'Number of firms, n', ytitle: 'Market price ($)', yfmt: function (v) { return '$' + num(v, 2); },
        xfmt: function (v) { return v === 1 || v === 2 || v === 5 || v === 10 || v === 15 || v === k ? num(v) : ''; } };
    },
    aspect: 0.7,
    question: function (f) { return 'What is the market price with one firm, with ' + f.p.k + ' firms, and where does it head as more firms enter?'; },
    setup: function (f) {
      var p = f.p;
      return 'Market demand is <b>P = ' + num(p.a) + ' - Q</b> and every firm has the same marginal cost, <b>MC = ' + money(p.c) + '</b>. The firms compete in quantities (Cournot), each taking the others\' output as given.';
    },
    steps: [
      { kind: 'drag', label: 'One firm (monopoly)', prompt: 'Drag the plum point on the n = 1 line to the market price.', check: function (f) { return f.g.m1; } },
      { kind: 'drag', label: function (f) { return f.p.k + ' firms'; }, prompt: function (f) { return 'Drag the plum point on the n = ' + f.p.k + ' line to the price with ' + f.p.k + ' firms.'; }, check: function (f) { return f.g.mk; } },
      { kind: 'drag', label: 'Many firms', prompt: 'Drag the dashed plum line to the price the market heads toward as n keeps growing.', check: function (f) { return f.g.mf; } }
    ],
    kbdHint: 'Keyboard: up and down arrows move the highlighted point (Shift for bigger steps), Enter confirms and moves to the next one.',
    initGuess: function (f) { var st = MN.start(f.dom); return { p1: st.p1, pk: st.pk, floor: st.floor, m1: false, mk: false, mf: false }; },
    handles: function (f, S) {
      var g = f.g, p = f.p;
      if (f.predicting) return byStep(f, [
        vHandle(S, 1, g.p1, function (f, Y) { f.g.p1 = Y; f.g.m1 = true; }, { step: 0, active: f.cur === 0 }),
        vHandle(S, p.k, g.pk, function (f, Y) { f.g.pk = Y; f.g.mk = true; }, { step: 1, active: f.cur === 1 }),
        vHandle(S, 14, g.floor, function (f, Y) { f.g.floor = Y; f.g.mf = true; }, { step: 2, active: f.cur === 2 })
      ]);
      if (!f.exploring) return [];
      var n = Math.round(f.ex.n);
      return [{ x: f.ex.n, y: MN.P(p, f.ex.n), c: C.ink, active: !f.ex.touched, snap: { x: 1, y: 0 }, kstep: { x: 1, y: 0 },
        set: function (f, X) { f.ex.n = clamp(Math.round(X), 1, MN.NMAX); },
        key: function (f, dx, dy) { f.ex.n = clamp(Math.round(f.ex.n) + (dx || dy), 1, MN.NMAX); f.ex.touched = true; } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.line(0, p.c, S.X, p.c, { c: C.soft, w: 3, dash: '9 7', pr: b, layer: 'over' });
      if (b > 0.9) D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: C.soft, size: S.ls, prio: 0 });
      if (f.predicting) {
        [1, p.k].forEach(function (n) { D.line(n, 0, n, S.Y, { c: C.line, w: 2.5, dash: '4 6', layer: 'under', reg: false }); });
        D.line(0, g.floor, S.X, g.floor, { c: PLUM, w: 3.5, dash: '10 8', layer: 'over', op: g.mf ? 1 : 0.6 });
        if (g.m1) D.near(1, g.p1, money(g.p1), { c: PLUM, d: 22, ring: 80 });
        if (g.mk) D.near(p.k, g.pk, money(g.pk), { c: PLUM, d: 22, ring: 80 });
        D.label(g.mf ? 'heads to ' + money(g.floor) : 'many firms', [{ x: S.x(14) - 22, y: S.y(g.floor) - 12, anchor: 'end' }, { x: S.x(14) - 22, y: S.y(g.floor) + 28, anchor: 'end' }], { c: PLUM, size: S.ss });
        return;
      }
      var dt = f.t('dots'), lb = f.t('labs'), fl = f.t('floor');
      if (f.ghostOn()) {
        D.ghost(1, g.p1, { op: f.gOp() }); D.ghost(p.k, g.pk, { op: f.gOp() });
        D.line(0, g.floor, S.X, g.floor, { c: PLUM, w: 3, dash: '4 8', op: 0.7 * f.gOp(), layer: 'over', reg: false });
        youTag(f, D, p.k, g.pk);
      }
      if (dt > 0) {
        var u = dt * (MN.NMAX - 1), pts = [];
        for (var n = 1; n <= MN.NMAX; n++) {
          if (n - 1 > u + 1e-9) break;
          pts.push([n, MN.P(p, n)]);
        }
        var last = Math.floor(u) + 1;
        if (last < MN.NMAX) pts.push([lerp(last, last + 1, u - Math.floor(u)), MN.P(p, lerp(last, last + 1, u - Math.floor(u)))]);
        D.path(pts, { c: C.blue, w: 4 });
        for (var m = 1; m <= MN.NMAX; m++) if (m - 1 <= u + 1e-9) D.dot(m, MN.P(p, m), { c: C.blue, r: m === 1 || m === p.k ? 9 : 6, pr: Math.min(1, (u - (m - 1)) * 2 + 0.2) });
      }
      if (lb > 0) {
        D.near(1, s.P1, S.narrow ? money(s.P1) : 'monopoly: ' + money(s.P1), { c: C.tBlue, op: lb, d: 20, prio: 0, ring: 110 });
        if (!f.exploring) D.near(p.k, s.Pk, 'n = ' + p.k + ': ' + money(s.Pk), { c: C.tBlue, op: lb, d: 20, prio: 0, ring: 110 });
      }
      if (fl > 0) {
        D.line(0, p.c, S.X, p.c, { c: C.green, w: 5, pr: fl, layer: 'over' });
        D.label('P falls toward MC', [{ x: S.x(12), y: S.y(p.c) - 14, anchor: 'middle' }, { x: S.x(10), y: S.y(p.c) - 14, anchor: 'middle' }, { x: S.x(12), y: S.y(p.c) - 44, anchor: 'middle' }], { c: C.tGreen, op: fl, prio: 0, size: S.ls });
      }
      if (f.exploring) {
        var nn = f.ex.n, P = MN.P(p, nn);
        D.drop(nn, P, { c: C.ink, op: 0.6 });
        D.near(nn, P, 'n = ' + Math.round(nn) + ': ' + money(MN.P(p, Math.round(nn))), { c: C.ink, d: 24, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['dots', 300, 2000, 'linear'], ['labs', 1900, 500], ['floor', 2500, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var form = p.c ? '(' + num(p.a) + ' + n &times; ' + num(p.c) + ')/(n + 1)' : num(p.a) + '/(n + 1)', qf = p.c ? '(' + num(p.a) + ' - ' + num(p.c) + ')/(n + 1)' : num(p.a) + '/(n + 1)';
      return {
        rows: [['Price with 1 firm', money(g.p1), money(s.P1)], ['Price with ' + p.k + ' firms', money(g.pk), money(s.Pk)], ['As n grows, P heads to', money(g.floor), money(p.c) + ' (MC)']],
        why: 'With n identical Cournot firms each makes q = ' + qf + ', so P* = ' + form + '. One firm is the monopoly: <b>' + money(s.P1) + '</b>. With ' + p.k + ' firms, P* = <b>' + money(s.Pk) + '</b>. ' +
          'Each new firm pulls the price further down, toward MC = ' + money(p.c) + ', but it never quite gets there: competition is a limit, not a switch.'
      };
    },
    explore: {
      init: function (f) { f.ex.n = f.p.k; },
      hint: 'Drag the point along the curve, or step the number of firms. Raising MC lifts the floor the price falls toward.',
      controls: function (f) {
        var cmax = Math.max(0, Math.floor(Math.min(0.25 * f.p.a, 2 * 0.95 * f.dom.Y - f.p.a) / 10) * 10);
        return [
          { kind: 'stepper', label: 'Firms, n', get: function (f) { return f.ex.n; }, set: function (f, v) { f.ex.n = v; }, step: 1, min: 1, max: MN.NMAX, fmt: function (v) { return num(Math.round(v)); }, dur: 350 },
          { kind: 'stepper', label: 'MC', get: function (f) { return f.p.c; }, set: function (f, v) { f.p.c = v; }, step: 10, min: 0, max: Math.max(cmax, f.p0.c), fmt: money, dur: 350 }
        ];
      },
      readout: function (f) {
        var p = f.p, n = Math.round(f.ex.n), q = MN.q(p, n), P = MN.P(p, n);
        var tail = n === 1 ? 'One firm is the monopoly, the least competitive outcome.' : n === 2 ? 'Two firms: the Cournot duopoly, between monopoly and competition.' :
          P - p.c < 0.1 * (p.a - p.c) ? 'Close to MC: nearly the competitive outcome.' : 'Still above MC, so some market power remains.';
        return 'n = ' + n + ': each firm makes q = <b>' + num(q, 2) + '</b>, total Q = <b>' + num(n * q, 2) + '</b>, price P* = <b>' + money(P) + '</b>. ' + tail;
      }
    }
  };

  /* =====================================================================
     10.4  Four models, one market
     ===================================================================== */
  var M4 = M.four, MODS = M4.MODELS, MCOL = { cournot: C.ink, stackelberg: C.green, collusion: C.gold, bertrand: C.purple },
    MCOLT = { cournot: C.ink, stackelberg: C.tGreen, collusion: C.tGold, bertrand: C.tPurple };
  function projQ(S, p, X, Y) {
    var top = p.a / p.b, n = G.nearest(X, Y, [[0, p.a], [top, 0]], (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    return clamp(Math.round(n.x * 2) / 2, 0, top);
  }
  function onDemand(f, Q, setQ, o) {
    var p = f.p;
    return { x: Q, y: p.a - p.b * Q, c: o.c || PLUM, step: o.step, active: o.active,
      set: function (f, X, Y) { setQ(f, projQ(f.S, f.p, X, Y)); },
      key: function (f, dx, dy) { setQ(f, clamp(Q + (dx - dy) * 0.5, 0, p.a / p.b)); } };
  }
  function f4place(m) {
    return function (f, X, Y) { var Q = projQ(f.S, f.p, X, Y); f.g[m] = { x: Q, y: f.p.a - f.p.b * Q }; };
  }
  var f104 = {
    key: 'f104', num: '10.4', topic: 'Four models, one market', short: 'Four models', model: M4,
    axes: { xtitle: 'Total quantity, Q', ytitle: 'Price ($)', yfmt: function (v) { return '$' + num(v, 2); } }, aspect: 0.78,
    question: 'Same market, four ways to compete. Where on the demand curve does each one land?',
    setup: function (f) {
      var p = f.p;
      return 'Two firms, market demand <b>' + demP(p) + '</b>, MC = ' + money(p.c) + '. <b>Cournot</b>: both pick quantities at once. <b>Stackelberg</b>: A commits its quantity first. <b>Collusion</b>: they act as one monopoly and split it. <b>Bertrand</b>: they set prices.';
    },
    steps: MODS.map(function (m, i) {
      return { kind: 'place', key: m, handle: false, label: M4.NAMES[m], prompt: (i ? 'Next: ' : '') + 'Tap the demand curve where the ' + M4.NAMES[m] + ' market ends up. Drag to adjust.',
        place: f4place(m), kstart: function (f) { var Q = Math.round(f.sol.top * 0.25 * 2) / 2; return { x: Q, y: f.p.a - f.p.b * Q }; },
        check: function (f) {
          for (var j = 0; j < i; j++) { var o = f.g[MODS[j]]; if (o && Math.abs(o.x - f.g[m].x) < 1e-9) return 'That spot is taken by ' + M4.NAMES[MODS[j]] + '. Pick another.'; }
          return true;
        } };
    }),
    kbdHint: 'Keyboard: Enter drops the point on the curve, arrow keys slide it, Enter confirms and moves to the next model.',
    initGuess: function () { return { cournot: null, stackelberg: null, collusion: null, bertrand: null }; },
    handles: function (f) {
      if (!f.predicting) return [];
      return byStep(f, MODS.map(function (m, i) {
        var g = f.g[m]; if (!g) return null;
        return onDemand(f, g.x, function (f, Q) { f.g[m] = { x: Q, y: f.p.a - f.p.b * Q }; }, { step: i, active: f.cur === i });
      }));
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, top = s.top, fn = function (q) { return p.a - p.b * q; };
      if (f.exploring) {
        var o = s[p.m];
        if (o.P > p.c && o.Q > 0) D.area(box(0, p.c, o.Q, o.P), { fill: C.green, fo: 0.3 });
        D.area([[0, p.a], [o.Q, o.P], [0, o.P]], { fill: C.blue, fo: 0.15 });
        if (o.DWL > 1e-9) D.area([[o.Q, o.P], [s.cm, p.c], [o.Q, p.c]], { fill: C.red, fo: 0.28 });
        if (o.P > p.c) inRect(D, S, 'profit ' + money(o.pi), 0, p.c, o.Q, o.P, { c: C.tGreen });
        D.label('CS ' + money(o.CS), [{ x: S.x(o.Q * 0.3), y: S.y(lerp(o.P, p.a, 0.3)) + 6, anchor: 'start' }].concat(D.around(o.Q * 0.25, lerp(o.P, p.a, 0.25), 4)), { c: C.tBlue, size: S.ss, prio: 0, ring: 60 });
        if (o.DWL > 1e-9) D.label('DWL ' + money(o.DWL), [{ x: S.x(lerp(o.Q, s.cm, 0.35)), y: S.y(lerp(p.c, o.P, 0.25)) + 6, anchor: 'start' }].concat(D.around(o.Q, p.c, 30)), { c: C.tRed, size: S.ss, prio: 0, ring: 80 });
      }
      D.line(0, p.a, top, 0, { c: C.blue, w: 5, pr: b });
      if (b > 0.9) D.label('Demand, ' + demP(p), D.along(fn, [0.12, 0.2, 0.06].map(function (t) { return t * top; }), 12), { c: C.tBlue, size: S.ls, prio: 0 });
      if (p.c > 0) {
        D.line(0, p.c, S.X, p.c, { c: C.soft, w: 2.5, dash: '8 6', pr: b, layer: 'over' });
        if (b > 0.9) D.label('MC = ' + money(p.c), [{ x: S.x1 - 6, y: S.y(p.c) - 10, anchor: 'end' }, { x: S.x1 - 6, y: S.y(p.c) + 26, anchor: 'end' }], { c: C.soft, size: S.ss, prio: 0 });
      }
      if (f.predicting) {
        MODS.forEach(function (m) { var q = g[m]; if (q) D.near(q.x, q.y, M4.NAMES[m], { c: PLUM, size: S.ss, d: 20, ring: 110 }); });
        return;
      }
      if (f.ghostOn()) MODS.forEach(function (m) { var q = g[m]; if (q) D.ghost(q.x, q.y, { op: f.gOp() }); });
      MODS.forEach(function (m, i) {
        var t = f.t('m' + i), o = s[m]; if (t <= 0) return;
        var cur = f.exploring && p.m === m;
        if (cur) D.drop(o.Q, o.P, { c: C.ink, op: 0.7 });
        D.dot(o.Q, o.P, { c: MCOL[m], r: cur ? 12 : 9, pr: t, op: f.exploring && !cur ? 0.6 : 1 });
        var lab = S.narrow || !f.revealing ? M4.NAMES[m] : M4.NAMES[m] + ': Q ' + num(o.Q, 2) + ', ' + money(o.P);
        if (cur) lab = M4.NAMES[m] + ': Q ' + num(o.Q, 2) + ', ' + money(o.P);
        if (f.exploring && !cur && S.narrow) return;
        D.label(lab, [{ x: S.x(o.Q) + 16, y: S.y(o.P) - 12, anchor: 'start' }, { x: S.x(o.Q) + 16, y: S.y(o.P) + 6, anchor: 'start' }].concat(D.around(o.Q, o.P, 18)), { c: MCOLT[m], op: f.exploring && !cur ? 0.7 * t : t, prio: cur ? 0 : 1, size: cur ? S.ls : S.ss, ring: 80 });
      });
    },
    reveal: function () { return [['ghost', 0, 400], ['m0', 300, 600], ['m1', 900, 600], ['m2', 1500, 600], ['m3', 2100, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var rows = MODS.map(function (m) { var o = s[m]; return [M4.NAMES[m], g[m] ? 'Q ' + num(g[m].x, 1) : '', 'Q ' + num(o.Q, 2) + ' at ' + money(o.P)]; });
      var c = s.cournot, k = s.stackelberg, l = s.collusion, bt = s.bertrand;
      return {
        rows: rows,
        why: 'Collusion splits the monopoly output: Q = ' + num(l.Q, 2) + ' at ' + money(l.P) + ', industry profit <b>' + money(l.pi) + '</b>. Cournot firms make ' + num(c.qA, 2) + ' each: Q = ' + num(c.Q, 2) + ' at ' + money(c.P) + ', profit ' + money(c.pi) + '. ' +
          'A Stackelberg leader commits to ' + num(k.qA, 2) + ' and the follower replies ' + num(k.qB, 2) + ': Q = ' + num(k.Q, 2) + ' at ' + money(k.P) + ', profit ' + money(k.pi) + '. Bertrand price-setters undercut until P = MC = ' + money(p.c) + ': Q = ' + num(bt.Q, 2) + ', profit <b>$0</b>. ' +
          'Same demand, same costs: how firms compete decides the outcome.'
      };
    },
    explore: {
      init: function (f) { f.p.m = 'cournot'; f.resolve(); },
      hint: 'Pick a model. Green is industry profit, blue consumer surplus, red the deadweight loss against the competitive outcome.',
      controls: [{ kind: 'seg', label: 'Model', options: MODS.map(function (m) { return [m, M4.NAMES[m]]; }), get: function (f) { return f.p.m; }, set: function (f, v) { f.p.m = v; } }],
      readout: function (f) {
        var p = f.p, o = f.sol[p.m], mg = p.c ? '(' + num(o.P, 2) + ' - ' + num(p.c) + ')' : num(o.P, 2);
        var first = p.m === 'stackelberg' ? 'Leader q<sub>A</sub> = ' + num(o.qA, 2) + ', follower q<sub>B</sub> = ' + num(o.qB, 2) : p.m === 'collusion' ? 'The cartel makes the monopoly output and splits it: ' + num(o.qA, 2) + ' each' :
          p.m === 'bertrand' ? 'Undercutting drives the price to MC, and the market buys ' + num(o.Q, 2) + ' (' + num(o.qA, 2) + ' each)' : 'Each firm makes ' + num(o.qA, 2);
        return first + '. Q = ' + num(o.Q, 2) + ', P = ' + money(o.P) + '. Industry profit ' + mg + ' &times; ' + num(o.Q, 2) + ' = <b>' + money(o.pi) + '</b>' +
          (p.m === 'stackelberg' ? ' (leader ' + money(o.piA) + ', follower ' + money(o.piB) + ')' : '') + '. Consumer surplus <b>' + money(o.CS) + '</b>, deadweight loss <b>' + money(o.DWL) + '</b>.';
      }
    }
  };

  /* =====================================================================
     10.5  Bertrand: the incentive to undercut
     ===================================================================== */
  var MBT = M.bertrand;
  var f105 = {
    key: 'f105', num: '10.5', topic: 'Bertrand: the incentive to undercut', short: 'Bertrand undercutting', model: MBT,
    axes: { xtitle: 'Your price ($)', ytitle: 'Your profit ($)', xfmt: function (v) { return '$' + num(v); }, yfmt: function (v) { return v >= 1000 ? '$' + num(v / 1000, 1) + 'k' : '$' + num(v); } }, aspect: 0.72,
    question: function (f) { return 'Your rival charges ' + money(f.p.pr) + '. Draw your profit at every price, then pick your best price.'; },
    setup: function (f) {
      var p = f.p;
      return 'Identical products: buyers all go to the cheaper seller, and split evenly if the prices match. Market demand is <b>Q = ' + num(p.a) + ' - P</b>, your marginal cost is <b>MC = ' + money(p.c) + '</b>. Prices move in $1 steps.';
    },
    steps: [
      { kind: 'draw', key: 'curve', bins: 60, label: 'Your profit at every price',
        prompt: function (f) { return 'Draw it with your finger or mouse, from MC = ' + money(f.p.c) + ' to the right edge. Redraw any part.'; },
        kstart: function (f, x) { return x < f.p.c ? null : f.dom.Y * 0.3; },
        check: function (f) { return f.coverage('curve', f.p.c, f.dom.X) >= 0.6 ? true : 'Keep going: draw across more prices.'; } },
      { kind: 'place', key: 'P', handle: false, label: 'Your best price', prompt: 'Tap the price on the horizontal axis that earns you the most. Drag to adjust.',
        place: function (f, X) { f.g.P = clamp(Math.round(X), f.p.c, f.dom.X); },
        kstart: function (f) { return { x: Math.round((f.p.c + f.dom.X) / 2), y: 0 }; } }
    ],
    kbdHint: 'Keyboard: arrow keys raise or lower a flat line for the drawing, Enter accepts it. Then Enter drops your price, arrows move it, Enter confirms.',
    initGuess: function () { return { P: null }; },
    scoreInput: function (f) { return { drawn: f.drawn('curve'), P: f.g.P }; },
    handles: function (f, S) {
      var g = f.g, p = f.p;
      if (f.predicting) return byStep(f, [g.P != null ? hHandle(S, g.P, 0, function (f, X) { f.g.P = clamp(Math.round(X), f.p.c, f.dom.X); }, { step: 1, active: f.cur === 1, snap: 1 }) : null]);
      if (!f.exploring) return [];
      var yr = S.Y * 0.9;
      return [
        { x: f.ex.P, y: MBT.profit(p, f.ex.P), c: C.ink, active: !f.ex.touched, snap: { x: 1, y: 0 }, kstep: { x: 1, y: 0 },
          set: function (f, X) { f.ex.war = null; f.ex.P = clamp(Math.round(X), 0, f.dom.X); },
          key: function (f, dx, dy) { f.ex.war = null; f.ex.P = clamp(f.ex.P + (dx || dy), 0, f.dom.X); f.ex.touched = true; } },
        hHandle(S, p.pr, yr, function (f, X) { f.ex.war = null; f.p.pr = clamp(Math.round(X), f.p.c, f.dom.X); }, { c: CB, snap: 1 })
      ];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      D.area(box(0, 0, p.c, S.Y), { fill: C.grey, fo: 0.16, op: b });
      if (b > 0.9) {
        var lx = (S.x(0) + S.x(p.c)) / 2 + S.ss * 0.35, ly = (S.y0 + S.y1) / 2;
        D.add('over', '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" transform="rotate(-90 ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')" text-anchor="middle" font-size="' + S.ss + '" font-weight="700" fill="' + C.soft + '" paint-order="stroke" stroke="#e4e7e6" stroke-width="5" stroke-linejoin="round">' + (S.narrow ? 'below MC: a loss' : 'below MC: a loss on every sale') + '</text>');
      }
      D.line(p.c, 0, p.c, S.Y, { c: C.soft, w: 2.5, dash: '7 6', pr: b, layer: 'under' });
      if (b > 0.9) D.label('MC = ' + money(p.c), [{ x: S.x(p.c) + 8, y: S.y1 + 18, anchor: 'start' }], { c: C.soft, size: S.ss, prio: 0, fixed: true });
      var yr = S.Y * 0.9;
      D.line(p.pr, 0, p.pr, yr, { c: CB, w: 3, dash: '8 6', pr: b, layer: 'over' });
      if (b > 0.9) D.label('rival ' + money(p.pr), [{ x: S.x(p.pr) + (f.exploring ? 22 : 10), y: S.y(yr) + 6, anchor: 'start' }, { x: S.x(p.pr) - 10, y: S.y(yr) + 6, anchor: 'end' }], { c: CBT, size: S.ls, prio: 0 });
      if (f.predicting) {
        D.drawing('curve');
        if (g.P != null) D.label('best? ' + money(g.P), [{ x: S.x(g.P), y: S.y0 - 26, anchor: 'middle' }, { x: S.x(g.P) + 18, y: S.y0 - 24, anchor: 'start' }], { c: PLUM, size: S.ls, prio: 0 });
        return;
      }
      var cv = f.t('curve'), cl = f.t('cliff'), bs = f.t('best');
      if (f.ghostOn()) { D.drawing('curve'); if (g.P != null) D.ghost(g.P, 0, { op: f.gOp() }); }
      var pr = p.pr;
      if (cv > 0) {
        var up = [];
        for (var i = 0; i <= 80; i++) { var P = p.c + (pr - p.c) * i / 80 * cv; up.push([P, MBT.full(p, Math.min(P, pr - 1e-9))]); }
        D.path(up, { c: C.blue, w: 5 });
        if (cv > 0.9) D.label(S.narrow ? 'undercut: all buyers' : 'undercut: you get every buyer', D.along(function (P) { return MBT.full(p, P); }, [0.45, 0.3, 0.6].map(function (t) { return lerp(p.c, pr, t); }), 12, 'aboveOnly'), { c: C.tBlue, size: S.ss, op: seg(cv, 0.9, 1) });
      }
      if (cl > 0) {
        D.line(pr, 0, S.X, 0, { c: C.red, w: 6, pr: cl, layer: 'over' });
        D.add('over', Kit.K.ring(S.x(pr), S.y(s.match), { r: 9, c: C.purple, w: 3.5, fill: C.paper, op: cl }));
        D.L.dot(S.x(pr), S.y(s.match), 12);
        D.label('match: split, ' + money(s.match), [{ x: S.x(pr) + 16, y: S.y(s.match) + 6, anchor: 'start' }, { x: S.x(pr) - 16, y: S.y(s.match) + 6, anchor: 'end' }], { c: C.tPurple, op: cl, size: S.ss, prio: 0 });
        D.label(S.narrow ? 'above: no sales' : 'above the rival: no sales', [{ x: S.x((pr + S.X) / 2), y: S.y0 - 16, anchor: 'middle' }, { x: S.x1 - 4, y: S.y0 - 16, anchor: 'end' }], { c: C.tRed, op: cl, size: S.ss, prio: 0 });
      }
      if (bs > 0 && !f.exploring) {
        D.drop(s.Pb, s.pib, { pr: bs });
        D.dot(s.Pb, s.pib, { c: C.ink, r: 11, pr: bs });
        D.near(s.Pb, s.pib, 'best: ' + money(s.Pb) + ', profit ' + money(s.pib), { c: C.ink, op: bs, d: 22, prio: 0, ring: 120 });
      }
      if (f.exploring) {
        var Pn = f.ex.P, pn = MBT.profit(p, Pn);
        D.drop(Pn, pn, { c: C.ink, op: 0.6, y: pn > 0 });
        D.near(Pn, pn, money(Pn) + ': ' + money(pn), { c: C.ink, d: 24, prio: 0, ring: 110 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['curve', 300, 1300, 'linear'], ['cliff', 1600, 600], ['best', 2200, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, r = f.result || {};
      var cs = MBT.curveScore(p, f.drawn('curve'), f.dom);
      var rows = [['Your best price', g.P != null ? money(g.P) : '', money(s.Pb)], ['Profit there', g.P != null ? money(MBT.profit(p, g.P)) : '', money(s.pib)],
        ['Your curve, average miss', cs.dy != null ? money(cs.dy) : '', '$0']];
      var why = s.above
        ? 'Below the rival you get every buyer, and your profit (P - ' + num(p.c) + ')(' + num(p.a) + ' - P) peaks at the monopoly price, ' + money(s.Pm) + '. The rival is above that, so charge <b>' + money(s.Pm) + '</b> and take the whole market: ' + money(s.pim) + '. Matching at ' + money(p.pr) + ' would split it (' + money(s.match) + '); above ' + money(p.pr) + ' you sell nothing.'
        : 'Below the rival you get every buyer: profit (P - ' + num(p.c) + ')(' + num(p.a) + ' - P), still rising at ' + money(p.pr) + ' because the monopoly price is ' + money(s.Pm) + '. Match and you split the market: ' + money(s.match) + '. Go above and you sell nothing. ' +
          'So undercut by the smallest step: <b>' + money(s.Pb) + '</b> (a penny under, with real prices) for <b>' + money(s.pib) + '</b>. Your rival reasons the same way, so the price is pushed down until it hits MC = ' + money(p.c) + '.';
      return { rows: rows, why: why };
    },
    explore: {
      init: function (f) { f.ex.P = f.sol.Pb; },
      hint: 'Drag your price (black) or the rival\'s (orange). What happens when both keep undercutting?<button type="button" class="btn ghost ex-act" data-act="war">Start a price war</button>',
      controls: [],
      act: function (f, a) {
        if (a !== 'war') return;
        var p = f.p, from = p.pr;
        f.ex.war = true;
        f.tween(from, p.c, Math.max(900, 70 * (from - p.c)), function (v, fin) {
          var pr = fin ? p.c : Math.round(v);
          f.p.pr = pr; f.ex.P = fin ? p.c : Math.max(p.c, MBT.best(f.p, pr));
        }, function () { f.ex.war = 'done'; f.render(); });
      },
      readout: function (f) {
        var p = f.p, P = f.ex.P, pr = p.pr, pf = MBT.profit(p, P);
        if (f.ex.war === 'done') return 'Each undercut is answered by another until both charge MC = ' + money(p.c) + '. Profit <b>$0</b> for both, and neither can gain by moving: the Bertrand equilibrium. Two firms are enough to reach the competitive price.';
        var share = P > pr ? '0% (priced out)' : P === pr ? '50% (split)' : '100% (undercut)';
        var note = P > pr ? 'Above the rival you sell nothing.' : P === pr ? 'Matching splits the market.' : P <= p.c ? 'At MC you win every buyer but earn nothing on them.' :
          'You take the whole market, but the rival has exactly the same reason to undercut you.';
        return 'Your price ' + money(P) + ', rival ' + money(pr) + ': share ' + share + ', profit <b>' + money(pf) + '</b>. ' + note;
      }
    }
  };

  window.W10FIGS = [f101, f102, f103, f104, f105];
})();
