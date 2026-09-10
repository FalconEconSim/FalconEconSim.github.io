/* Week 5 leader testbed.
   ---------------------------------------------------------------------------
   Placement is settled: twelve slots around the anchor, one notch of movement
   at a time, labels sharing an anchor on separate rings. That is approach 1
   from the previous testbed and it is kept here unchanged.

   What is not settled is the dashed leader. Measured on the previous page, 72
   of 328 leaders ended more than 6px from anything drawn, and the cause is
   specific: the curve labels anchor to a real sampled point on their curve and
   land at 0px, while the straight-line labels anchor to a hand-picked
   coordinate that is not on the line at all, and miss by up to 21px in 28 of
   41 frames. The leader is pointing exactly where it was told to; it was told
   the wrong place.

   So the fix is not to nudge the line. It is to stop labels naming a
   coordinate and have them name an OBJECT, and work out the contact point from
   the object itself, every frame. Each label below declares a target:

     { kind: 'poly',  pts: [[x,y], ...] }   a curve or a straight segment
     { kind: 'point', x, y }                a marker

   The five modes differ in what they then do with it.
   --------------------------------------------------------------------------- */
(function (global) {
  'use strict';

  var COL = {
    ink: '#14181b', soft: '#4a5257',
    consumer: '#1b4f72', firm: '#2c5e3f',
    line: '#a8431f', ghost: '#9aa3ae', point: '#7a1f5c', alt: '#8a4b12'
  };
  var PAD = { l: 48, r: 20, t: 22, b: 42 };
  var LBL_H = 19;

  /* ── geometry ───────────────────────────────────────────────────────────── */
  function nearestOnSeg(px, py, x1, y1, x2, y2) {
    var vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy;
    var t = L2 ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / L2)) : 0;
    var qx = x1 + vx * t, qy = y1 + vy * t;
    return { x: qx, y: qy, d: Math.hypot(px - qx, py - qy) };
  }
  /* Closest point on a target to (px,py). This is the whole idea: the contact
     point is derived from the object, so it is on the object by construction. */
  function nearestOnTarget(t, px, py) {
    if (!t) return null;
    if (t.kind === 'point') return { x: t.x, y: t.y, d: Math.hypot(px - t.x, py - t.y) };
    var best = null;
    for (var i = 1; i < t.pts.length; i++) {
      var q = nearestOnSeg(px, py, t.pts[i - 1][0], t.pts[i - 1][1], t.pts[i][0], t.pts[i][1]);
      if (!best || q.d < best.d) best = q;
    }
    return best;
  }
  /* Where a segment from an outside point meets a box, so a leader stops at the
     label rather than running underneath it. */
  function boxEdge(box, fx, fy) {
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    var dx = fx - cx, dy = fy - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var tx = dx ? (box.w / 2 + 2) / Math.abs(dx) : Infinity;
    var ty = dy ? (box.h / 2 + 2) / Math.abs(dy) : Infinity;
    var k = Math.min(tx, ty, 1);
    return { x: cx + dx * k, y: cy + dy * k };
  }
  function rectDist(box, px, py) {
    var dx = Math.max(box.x - px, 0, px - (box.x + box.w));
    var dy = Math.max(box.y - py, 0, py - (box.y + box.h));
    return Math.sqrt(dx * dx + dy * dy);
  }
  function overlap(a, b, pad) {
    pad = pad || 0;
    return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x ||
             a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
  }
  function clearance(box, obs, cap) {
    cap = cap || 26;
    var best = cap;
    for (var i = 0; i < obs.length; i++) {
      var d = rectDist(box, obs[i][0], obs[i][1]);
      if (d < best) { best = d; if (!best) return 0; }
    }
    return best;
  }
  function inside(box, b) {
    return box.x >= b.x0 && box.y >= b.y0 && box.x + box.w <= b.x1 && box.y + box.h <= b.y1;
  }

  /* ── placement: approach 1, unchanged ───────────────────────────────────── */
  function placeSticky(labels, ctx) {
    /* RINGS is 1 on purpose: one ring per label is the placement Zach approved
       on the simpler figure, and this page is about leaders, so the placement
       is held constant. Allowing a boxed-in label to step out a ring clears
       every overlap on this denser figure (0 frames instead of 24) but costs
       steadiness: moves over 25px go from 12 to 46, and the biggest from 49px
       to 92px. That is a separate decision, not one to slip in here. */
    var N = 12, GOOD_ENOUGH = 2, RINGS = 1, RING_STEP = 24;
    /* labels sharing an anchor start on separate rings so they are never
       competing for the same twelve places */
    var claimed = [];
    labels.forEach(function (L) {
      var share = 0;
      claimed.forEach(function (c) { if (Math.hypot(c[0] - L.ax, c[1] - L.ay) < 12) share++; });
      L.ring0 = share;
      claimed.push([L.ax, L.ay]);
    });
    var base = ctx.tight ? 22 : 30;
    var placed = [];
    labels.forEach(function (L) {
      function boxAt(slot, ring) {
        var a = (Math.PI * 2 / N) * slot;
        var rad = base + (L.ring0 + ring) * RING_STEP;
        return { x: L.ax + Math.cos(a) * rad - L.w / 2,
                 y: L.ay - Math.sin(a) * rad - L.h / 2, w: L.w, h: L.h };
      }
      function scoreOf(slot, ring) {
        var box = boxAt(slot, ring);
        var sc = clearance(box, ctx.obstacles);
        if (!inside(box, ctx.bounds)) sc -= 40;
        placed.forEach(function (p) { if (overlap(box, p, 3)) sc -= 30; });
        /* a nearer ring is always preferable, all else equal */
        return { slot: slot, ring: ring, sc: sc - ring * 2, box: box };
      }
      var prev = ctx.prev[L.id], pick;
      if (!prev || prev.slot == null) {
        pick = scoreOf(0, 0);
        for (var ri = 0; ri < RINGS; ri++) {
          for (var i = 0; i < N; i++) {
            var c = scoreOf(i, ri);
            if (c.sc > pick.sc) pick = c;
          }
        }
      } else {
        var ring = prev.ring || 0;
        var here = scoreOf(prev.slot, ring);
        if (here.sc >= GOOD_ENOUGH) {
          pick = here;                       /* still fine: do not touch it */
        } else {
          /* one notch each way on the ring it is on, then the same three
             positions one ring further out, then one ring further in */
          pick = here;
          [ring, ring + 1, ring - 1].forEach(function (r) {
            if (r < 0 || r >= RINGS) return;
            [0, -1, 1].forEach(function (d) {
              var c2 = scoreOf((prev.slot + N + d) % N, r);
              if (c2.sc > pick.sc) pick = c2;
            });
          });
        }
      }
      /* An anchor hard against the edge of the plot can leave every slot
         partly outside. Something has to be chosen, so clamp the winner back
         inside or the label is simply cut off. */
      L.x = Math.max(ctx.bounds.x0, Math.min(ctx.bounds.x1 - L.w, pick.box.x));
      L.y = Math.max(ctx.bounds.y0, Math.min(ctx.bounds.y1 - L.h, pick.box.y));
      L.slot = pick.slot; L.ringUsed = pick.ring;
      placed.push({ x: L.x, y: L.y, w: L.w, h: L.h });
    });
  }

  /* ── the five leader modes ──────────────────────────────────────────────── */
  /* Each returns what to draw for one label: a path of points, and optionally a
     dot to mark where it touches. The label box is already placed. */
  var LEADER = {};

  /* 1. SNAP THE ANCHOR
     Keep the anchor the figure declared, but before drawing anything move it to
     the nearest point on the object it names. A figure is then free to say
     "roughly here" without the leader ending in white space, which is the exact
     fault on the current page: the straight-line labels declare a coordinate
     that was never on the line. */
  LEADER.snap = function (L) {
    var snapped = nearestOnTarget(L.target, L.ax, L.ay) || { x: L.ax, y: L.ay };
    var box = { x: L.x, y: L.y, w: L.w, h: L.h };
    var e = boxEdge(box, snapped.x, snapped.y);
    return { path: [[e.x, e.y], [snapped.x, snapped.y]] };
  };

  /* 2. SHORTEST LINK
     Forget the declared anchor for drawing purposes. Each frame, find the point
     on the object closest to where the label actually ended up, and go there.
     The leader is always the shortest possible connection, so it is short,
     never crosses the object, and cannot miss. */
  LEADER.nearest = function (L) {
    var box = { x: L.x, y: L.y, w: L.w, h: L.h };
    var cx = L.x + L.w / 2, cy = L.y + L.h / 2;
    var hit = nearestOnTarget(L.target, cx, cy) || { x: L.ax, y: L.ay };
    var e = boxEdge(box, hit.x, hit.y);
    return { path: [[e.x, e.y], [hit.x, hit.y]] };
  };

  /* 3. CONTACT DOT
     Draw the shortest link, and put a small filled dot exactly where it lands.
     A hairline ending against a curve of similar colour is easy to lose; a dot
     says "this, here" without the reader having to trace anything. */
  LEADER.dot = function (L) {
    var r = LEADER.nearest(L);
    r.dot = r.path[1];
    return r;
  };

  /* 4. ELBOW
     A two-segment leader: straight out of the side of the label, then a turn
     and a straight run to the object. Right-angled leaders are what boundary
     labelling uses, and they read as deliberate rather than as a stray
     hairline, because a horizontal stub reads as "this label" and the second
     segment reads as "points there". */
  LEADER.elbow = function (L) {
    var box = { x: L.x, y: L.y, w: L.w, h: L.h };
    var cx = L.x + L.w / 2, cy = L.y + L.h / 2;
    var hit = nearestOnTarget(L.target, cx, cy) || { x: L.ax, y: L.ay };
    var goLeft = hit.x < cx;
    var stubX = goLeft ? L.x - 8 : L.x + L.w + 8;
    var stubY = cy;
    return { path: [[goLeft ? L.x : L.x + L.w, cy], [stubX, stubY], [hit.x, hit.y]] };
  };

  /* 5. TOUCH, DO NOT POINT
     Answer the problem by removing most of the leaders. Labels sit close in, so
     a label is usually reading as attached to its object already; a leader is
     drawn only for the ones that had to be pushed away, and then it is the
     shortest link. Fewer lines on the figure, and the ones left mean something.
     The cost is labels sitting nearer the ink they are dodging. */
  LEADER.touch = function (L) {
    var box = { x: L.x, y: L.y, w: L.w, h: L.h };
    var cx = L.x + L.w / 2, cy = L.y + L.h / 2;
    var hit = nearestOnTarget(L.target, cx, cy) || { x: L.ax, y: L.ay };
    var gap = rectDist(box, hit.x, hit.y);
    if (gap <= 10) return { path: null };          /* close enough to read as attached */
    var e = boxEdge(box, hit.x, hit.y);
    return { path: [[e.x, e.y], [hit.x, hit.y]] };
  };

  var NOTES = {
    snap: 'The anchor is moved onto the object before anything is drawn.',
    nearest: 'The leader goes to whichever point of the object is closest to the label.',
    dot: 'The shortest link, with a dot marking exactly where it lands.',
    elbow: 'A right-angled leader: out of the label, turn, then straight to the object.',
    touch: 'Labels sit close enough to read as attached, and only the ones pushed away get a leader.'
  };

  /* ── the figure ─────────────────────────────────────────────────────────── */
  function W5Lead(host, opts) {
    opts = opts || {};
    var mode = opts.mode || 'snap';
    var leader = LEADER[mode] || LEADER.snap;

    var state = { ratio: 1.0, level: 3.0 };
    var memory = { L: {}, R: {} };
    var stats = { adrift: 0, worstGap: 0, checks: 0, jumps: 0, leaders: 0 };
    var lastPos = {}, lastAnch = {};

    host.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'w5-panels';
    host.appendChild(wrap);

    var panels = [
      { key: 'L', title: 'Consumer: three indifference curves, budget line, optimum', accent: COL.consumer, firm: false },
      { key: 'R', title: 'Firm: three isoquants, isocost, optimum', accent: COL.firm, firm: true }
    ].map(function (p) {
      var box = document.createElement('div');
      box.className = 'w5-panel';
      var h = document.createElement('div');
      h.className = 'w5-panel-title';
      h.textContent = p.title;
      box.appendChild(h);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 420 360');
      svg.setAttribute('class', 'w5-svg');
      box.appendChild(svg);
      wrap.appendChild(box);
      return { key: p.key, svg: svg, accent: p.accent, firm: p.firm };
    });

    function el(tag, attrs) {
      var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
      return e;
    }

    function draw() {
      var W = 420, H = 360;
      var plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
      var XMAX = 10, YMAX = 10;
      var sx = function (v) { return PAD.l + (v / XMAX) * plotW; };
      var sy = function (v) { return H - PAD.b - (v / YMAX) * plotH; };
      var bounds = { x0: PAD.l + 2, y0: PAD.t, x1: W - PAD.r, y1: H - PAD.b };
      var frameMax = 0;

      panels.forEach(function (P) {
        while (P.svg.firstChild) P.svg.removeChild(P.svg.firstChild);
        var firm = P.firm;

        var g = el('g');
        [0, 2, 4, 6, 8, 10].forEach(function (v) {
          g.appendChild(el('line', { x1: PAD.l, x2: PAD.l + plotW, y1: sy(v), y2: sy(v), stroke: '#f1f3ef', 'stroke-width': 1 }));
          g.appendChild(el('text', { x: PAD.l - 8, y: sy(v) + 4, 'text-anchor': 'end', fill: COL.soft, 'font-size': 11 })).textContent = v;
          g.appendChild(el('text', { x: sx(v), y: H - PAD.b + 16, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 11 })).textContent = v;
        });
        g.appendChild(el('line', { x1: PAD.l, x2: PAD.l + plotW, y1: sy(0), y2: sy(0), stroke: '#b9c0b6', 'stroke-width': 1.4 }));
        g.appendChild(el('line', { x1: PAD.l, x2: PAD.l, y1: sy(0), y2: PAD.t, stroke: '#b9c0b6', 'stroke-width': 1.4 }));
        g.appendChild(el('text', { x: PAD.l + plotW / 2, y: H - 8, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 12 }))
          .textContent = firm ? 'L (labour)' : 'X (good 1)';
        var yt = el('text', { transform: 'rotate(-90)', x: -(PAD.t + plotH / 2), y: 14, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 12 });
        yt.textContent = firm ? 'K (capital)' : 'Y (good 2)';
        g.appendChild(yt);
        P.svg.appendChild(g);

        var obstacles = [];
        var specs = [];

        /* three level curves: below, at, above */
        var lvl = state.level;
        var levels = [lvl * 0.72, lvl, lvl * 1.28];
        var curveTargets = [];
        levels.forEach(function (q, li) {
          var pts = [];
          for (var x = 0.3; x <= XMAX; x += 0.1) {
            var y = (q * q) / x;
            if (y > YMAX) continue;
            pts.push([sx(x), sy(y)]);
          }
          if (pts.length < 2) { curveTargets.push(null); return; }
          var d = 'M' + pts.map(function (p2) { return p2[0].toFixed(1) + ',' + p2[1].toFixed(1); }).join('L');
          P.svg.appendChild(el('path', {
            d: d, fill: 'none',
            stroke: li === 1 ? P.accent : P.accent,
            'stroke-width': li === 1 ? 2.8 : 1.6,
            opacity: li === 1 ? 1 : 0.42
          }));
          pts.forEach(function (p2) { obstacles.push(p2); });
          curveTargets.push({ kind: 'poly', pts: pts });
        });

        /* the straight line, plus a faded original for contrast */
        var ratio = state.ratio, income = 10;
        function segFor(r) {
          var xi = income / r, yi = income;
          var bx = Math.min(XMAX, xi);
          return [[sx(0), sy(yi)], [sx(bx), sy(Math.max(0, yi - r * bx))]];
        }
        var seg0 = segFor(1.0), seg1 = segFor(ratio);
        P.svg.appendChild(el('line', {
          x1: seg0[0][0], y1: seg0[0][1], x2: seg0[1][0], y2: seg0[1][1],
          stroke: COL.ghost, 'stroke-width': 1.6, 'stroke-dasharray': '6,4', opacity: 0.75
        }));
        P.svg.appendChild(el('line', {
          x1: seg1[0][0], y1: seg1[0][1], x2: seg1[1][0], y2: seg1[1][1],
          stroke: COL.line, 'stroke-width': 2.6
        }));
        for (var t = 0; t <= 1; t += 0.02) {
          obstacles.push([seg1[0][0] + (seg1[1][0] - seg1[0][0]) * t, seg1[0][1] + (seg1[1][1] - seg1[0][1]) * t]);
          obstacles.push([seg0[0][0] + (seg0[1][0] - seg0[0][0]) * t, seg0[0][1] + (seg0[1][1] - seg0[0][1]) * t]);
        }
        var segTarget = { kind: 'poly', pts: seg1 };
        var seg0Target = { kind: 'poly', pts: seg0 };

        /* tangency */
        var xs = Math.max(0.4, Math.min(XMAX - 0.3, lvl / Math.sqrt(ratio)));
        var ys = Math.max(0.4, Math.min(YMAX - 0.3, lvl * Math.sqrt(ratio)));
        var px = sx(xs), py = sy(ys);
        P.svg.appendChild(el('circle', { cx: px, cy: py, r: 5, fill: COL.point, stroke: '#fff', 'stroke-width': 1.5 }));
        var ptTarget = { kind: 'point', x: px, y: py };

        /* the y-intercept marker, a second point label to crowd things */
        var iy = sy(income);
        P.svg.appendChild(el('circle', { cx: sx(0), cy: iy, r: 4, fill: COL.alt, stroke: '#fff', 'stroke-width': 1.4 }));
        var intTarget = { kind: 'point', x: sx(0), y: iy };

        /* Labels. Every one names an OBJECT. The anchor is still a rough
           coordinate, deliberately: the point of the test is that it no longer
           has to be exact. */
        function spec(id, text, colour, target, ax, ay) {
          return { id: P.key + id, text: text, colour: colour, target: target, ax: ax, ay: ay };
        }
        var mid = function (s) { return [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2]; };
        var m1 = mid(seg1), m0 = mid(seg0);
        specs.push(spec('line', firm ? 'Isocost' : 'Budget', COL.line, segTarget, m1[0] * 0.72, m1[1] * 1.1));
        specs.push(spec('line0', firm ? 'Original isocost' : 'Original budget', COL.ghost, seg0Target, m0[0] * 1.2, m0[1] * 0.86));
        [0, 1, 2].forEach(function (li) {
          if (!curveTargets[li]) return;
          var pts = curveTargets[li].pts;
          var a = pts[Math.floor(pts.length * (0.22 + li * 0.16))];
          specs.push(spec('c' + li, (firm ? 'Q' : 'U') + (li + 1), P.accent, curveTargets[li], a[0] + 6, a[1] - 6));
        });
        specs.push(spec('opt', 'Optimum', COL.point, ptTarget, px, py));
        specs.push(spec('rate', (firm ? 'MRTS = ' : 'MRS = ') + ratio.toFixed(2), COL.soft, ptTarget, px, py));
        specs.push(spec('int', firm ? 'Budget K' : 'Income', COL.alt, intTarget, sx(0), iy));

        specs.forEach(function (s) {
          s.w = Math.max(28, s.text.length * 6.3 + 12);
          s.h = LBL_H;
        });

        placeSticky(specs, {
          obstacles: obstacles,
          bounds: bounds,
          prev: memory[P.key],
          tight: mode === 'touch'
        });

        specs.forEach(function (s) {
          var res = leader(s) || {};
          if (res.path) {
            stats.leaders++;
            var d2 = 'M' + res.path.map(function (p2) { return p2[0].toFixed(1) + ',' + p2[1].toFixed(1); }).join('L');
            P.svg.appendChild(el('path', {
              d: d2, fill: 'none', stroke: s.colour, 'stroke-width': 0.9,
              'stroke-dasharray': '3,2.5', opacity: 0.55
            }));
            /* did the leader actually land on the thing it names */
            var endPt = res.path[res.path.length - 1];
            var truth = nearestOnTarget(s.target, endPt[0], endPt[1]);
            stats.checks++;
            var gap = truth ? truth.d : 0;
            if (gap > 6) stats.adrift++;
            if (gap > stats.worstGap) stats.worstGap = gap;
          }
          if (res.dot) {
            P.svg.appendChild(el('circle', { cx: res.dot[0], cy: res.dot[1], r: 2.6, fill: s.colour }));
          }
          P.svg.appendChild(el('rect', {
            x: s.x, y: s.y, width: s.w, height: s.h, rx: 4,
            fill: '#fff', stroke: s.colour, 'stroke-width': 0.9, opacity: 0.97
          }));
          var tx = el('text', {
            x: s.x + s.w / 2, y: s.y + s.h - 5.5, 'text-anchor': 'middle',
            fill: s.colour, 'font-size': 11, 'font-weight': 600
          });
          tx.textContent = s.text;
          P.svg.appendChild(tx);

          memory[P.key][s.id] = { slot: s.slot, ring: s.ringUsed };
          var key = P.key + s.id;
          var now = [s.x + s.w / 2, s.y + s.h / 2];
          if (lastPos[key]) {
            var moved = Math.hypot(now[0] - lastPos[key][0], now[1] - lastPos[key][1]);
            var am = Math.hypot(s.ax - lastAnch[key][0], s.ay - lastAnch[key][1]);
            if (moved > frameMax) frameMax = moved;
            if (moved > 25 && moved > am * 3 + 10) stats.jumps++;
          }
          lastPos[key] = now;
          lastAnch[key] = [s.ax, s.ay];
        });
      });

      stats.lastMax = frameMax;
      if (opts.onStats) opts.onStats(stats);
    }

    return {
      draw: draw,
      set: function (k, v) { state[k] = v; draw(); },
      reset: function () {
        stats.adrift = 0; stats.worstGap = 0; stats.checks = 0; stats.jumps = 0; stats.leaders = 0;
        lastPos = {}; lastAnch = {}; draw();
      },
      note: NOTES[mode] || ''
    };
  }

  global.W5Lead = W5Lead;
  global.W5LeadNotes = NOTES;
})(window);
