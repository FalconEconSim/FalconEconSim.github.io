/* Week 5 label testbed.
   ---------------------------------------------------------------------------
   One figure, five label strategies, so they can be compared on the same
   content. The figure is Fig 5.7's shape: the consumer's problem on the left,
   the firm's identical problem on the right, one slider moving both.

   Why this figure: it is where the current placement breaks worst. Sweeping the
   slider through 24 steps teleports 8 of its 27 labels a total of 66 times,
   with single jumps up to 197px. Two of its labels ("Optimum" and the MRS
   readout) even share one anchor, which is the hardest case there is.

   What every strategy here has in common, because it is what was asked for:
   placement is worked out once per redraw and applied immediately. Nothing
   animates, nothing settles, nothing can be dragged. They differ only in HOW
   the position is decided, and therefore in how steady a label looks while the
   slider moves.
   --------------------------------------------------------------------------- */
(function (global) {
  'use strict';

  var COL = {
    ink: '#14181b', soft: '#4a5257', rule: '#d8dcd6',
    consumer: '#1b4f72', firm: '#2c5e3f',
    line: '#a8431f', point: '#7a1f5c', ghost: '#9aa3ae'
  };
  var PAD = { l: 46, r: 18, t: 20, b: 40 };
  var LBL_H = 20;

  /* ── small geometry helpers ─────────────────────────────────────────────── */
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
  /* How close the nearest drawn point is to this box, capped: bigger is safer. */
  function clearance(box, obstacles, cap) {
    cap = cap || 26;
    var best = cap;
    for (var i = 0; i < obstacles.length; i++) {
      var d = rectDist(box, obstacles[i][0], obstacles[i][1]);
      if (d < best) { best = d; if (best === 0) return 0; }
    }
    return best;
  }
  function inside(box, b) {
    return box.x >= b.x0 && box.y >= b.y0 && box.x + box.w <= b.x1 && box.y + box.h <= b.y1;
  }

  /* ── the five strategies ────────────────────────────────────────────────── */
  /* Each is handed the labels (with anchor ax/ay and measured w/h), the drawn
     curve points to avoid, the plot box, and whatever it recorded last frame.
     Each writes x/y (top-left) onto every label, and may set .leader or
     .hidden. None of them is allowed to animate or to be dragged. */
  var STRATEGY = {};

  /* 1. STICKY SLOTS
     The classic eight-position model from cartography: a label may sit in one
     of eight places around its anchor, nowhere else. On its own that still
     flickers, because two slots often score within a hair of each other and the
     winner flips every frame. So add hysteresis, the standard fix: the slot it
     is already in wins ties, and only loses if another beats it by a clear
     margin. The label then stays put through small changes and moves only when
     staying would genuinely be worse. */
  STRATEGY.sticky = function (labels, ctx) {
    var N = 12, GOOD_ENOUGH = 2;
    /* Labels sharing an anchor go on separate rings, so they are not
       competing for the same twelve places and cannot settle on top of each
       other. Fig 5.7 has exactly this: "Optimum" and the MRS reading both
       point at the tangency. */
    var claimed = [];
    labels.forEach(function (L) {
      var ring = 0;
      claimed.forEach(function (cl) {
        if (Math.hypot(cl[0] - L.ax, cl[1] - L.ay) < 12) ring++;
      });
      L.ring = 30 + ring * 26;
      claimed.push([L.ax, L.ay]);
    });
    var placed = [];
    labels.forEach(function (L) {
      function scoreOf(i) {
        var a = (Math.PI * 2 / N) * i;
        var sl = [Math.cos(a) * L.ring, -Math.sin(a) * L.ring];
        var box = { x: L.ax + sl[0] - L.w / 2, y: L.ay + sl[1] - L.h / 2, w: L.w, h: L.h };
        var sc = clearance(box, ctx.obstacles);
        if (!inside(box, ctx.bounds)) sc -= 40;
        placed.forEach(function (p) { if (overlap(box, p, 3)) sc -= 30; });
        return { i: i, sc: sc, box: box };
      }
      var prev = ctx.prev[L.id];
      var pick;
      if (!prev || prev.slot == null) {
        /* first sight of this label: any position is fair game */
        pick = scoreOf(0);
        for (var i = 1; i < N; i++) { var c = scoreOf(i); if (c.sc > pick.sc) pick = c; }
      } else {
        var here = scoreOf(prev.slot);
        if (here.sc >= GOOD_ENOUGH) {
          pick = here;                    /* still doing its job: leave it alone */
        } else {
          /* Compromised, so look outward from where it is: one notch each way,
             then two, then three, stopping as soon as something is genuinely
             clear. Searching outward keeps the move small when a small move is
             enough and only grows when it has to, and because it never crosses
             the anchor the label walks round its point instead of teleporting
             past it. */
          pick = here;
          for (var step = 1; step <= 1; step++) {
            var lft = scoreOf((prev.slot + N - step) % N);
            var rgt = scoreOf((prev.slot + step) % N);
            var better = (lft.sc >= rgt.sc) ? lft : rgt;
            if (better.sc > pick.sc) pick = better;
            if (pick.sc >= GOOD_ENOUGH) break;
          }
        }
      }
      L.x = pick.box.x; L.y = pick.box.y; L.leader = true; L.slot = pick.i;
      placed.push(pick.box);
    });
  };

  /* 2. CURVE-END LABELS
     The house style of most newsrooms, and the one every data-visualisation
     guide recommends over a legend: put the name at the end of the line it
     names. There is no search at all. A curve's end moves smoothly as the
     slider moves, so the label does too, and it cannot flip anywhere because
     there is nowhere else for it to be. Labels that would collide in the
     right-hand margin are pushed apart vertically, in a fixed order. */
  STRATEGY.curveEnd = function (labels, ctx) {
    /* the thing this label is tied to IS the end of its line */
    labels.forEach(function (L) {
      if (L.endX != null) { L.ax = L.endX; L.ay = L.endY; }
    });
    var byY = labels.slice().sort(function (p, q) { return p.ay - q.ay; });
    var put = [];
    byY.forEach(function (L) {
      var x = Math.min(L.endX != null ? L.endX + 8 : L.ax + 10, ctx.bounds.x1 - L.w);
      var want = (L.endY != null ? L.endY : L.ay) - L.h / 2;
      var y = Math.max(ctx.bounds.y0, Math.min(ctx.bounds.y1 - L.h, want));
      /* only labels that actually share horizontal space need separating */
      function clash(yy) {
        return put.some(function (p) {
          return !(x + L.w + 2 <= p.x || p.x + p.w + 2 <= x ||
                   yy + L.h + 2 <= p.y || p.y + p.h + 2 <= yy);
        });
      }
      if (clash(y)) {
        /* try below, then above: stacking everything downward piled labels up
           at the bottom edge once the room ran out */
        var found = false;
        for (var d = 1; d <= 12 && !found; d++) {
          var down = y + d * (LBL_H + 3), up = y - d * (LBL_H + 3);
          if (down + L.h <= ctx.bounds.y1 && !clash(down)) { y = down; found = true; }
          else if (up >= ctx.bounds.y0 && !clash(up)) { y = up; found = true; }
        }
      }
      L.x = x; L.y = y;
      L.leader = Math.abs((L.endY != null ? L.endY : L.ay) - (y + L.h / 2)) > 6;
      put.push({ x: x, y: y, w: L.w, h: L.h });
    });
  };

  /* 3. BOUNDARY RAIL
     From the boundary-labeling literature: every label lives outside the plot,
     in a fixed column, and a leader connects it to its anchor. The column order
     is decided once and never changes, so a label's vertical position is
     constant for the life of the figure. Nothing about the label can jump; only
     the leader swings. The cost is that the words are further from the thing
     they name, and the plot has to give up a strip of width. */
  STRATEGY.rail = function (labels, ctx) {
    var railX = ctx.bounds.x1 - ctx.railW + 6;
    var top = ctx.bounds.y0 + 6;
    var gap = Math.min(30, (ctx.bounds.y1 - top - LBL_H) / Math.max(1, labels.length - 1));
    labels.forEach(function (L, i) {
      L.x = railX;
      L.y = top + i * gap;         /* order fixed at build time, never re-sorted */
      L.leader = true;
    });
  };

  /* 4. RIGID RIDE-ALONG
     Decide the offset once, when the label first appears, then never decide
     again: the label is welded to its anchor and moves exactly as the anchor
     moves. Perfectly steady by construction, because there is no per-frame
     decision left to flip. When two labels do end up on top of each other the
     one with lower priority is hidden rather than moved, which is the activity
     model the temporal-labeling literature uses: better to drop a label than to
     make it jump. */
  STRATEGY.rigid = function (labels, ctx) {
    var placed = [];
    labels.forEach(function (L) {
      var prev = ctx.prev[L.id];
      if (!prev || prev.ox == null) {
        /* one search, on the first frame only */
        var best = null;
        for (var k = 0; k < 12; k++) {
          var a = (Math.PI / 6) * k;
          var ox = Math.cos(a) * 34, oy = -Math.sin(a) * 34;
          var box = { x: L.ax + ox - L.w / 2, y: L.ay + oy - L.h / 2, w: L.w, h: L.h };
          var sc = clearance(box, ctx.obstacles) - (inside(box, ctx.bounds) ? 0 : 40);
          /* two labels can share an anchor, so the offset chosen for the
             first must not be offered to the second */
          for (var q = 0; q < placed.length; q++) if (overlap(box, placed[q], 3)) sc -= 40;
          if (!best || sc > best.sc) best = { sc: sc, ox: ox, oy: oy };
        }
        L.ox = best.ox; L.oy = best.oy;
      } else { L.ox = prev.ox; L.oy = prev.oy; }
      L.x = L.ax + L.ox - L.w / 2;
      L.y = L.ay + L.oy - L.h / 2;
      L.x = Math.max(ctx.bounds.x0, Math.min(ctx.bounds.x1 - L.w, L.x));
      L.y = Math.max(ctx.bounds.y0, Math.min(ctx.bounds.y1 - L.h, L.y));
      L.leader = true;
      var box2 = { x: L.x, y: L.y, w: L.w, h: L.h };
      L.hidden = placed.some(function (p) { return overlap(box2, p, 2); });
      if (!L.hidden) placed.push(box2);
    });
  };

  /* 5. LANES
     Borrowed from timeline labelling, where labels are stacked into rows rather
     than scattered. Each label owns a horizontal band, assigned once. Inside
     its band it tracks its anchor left and right, but it can never leave it, so
     two labels can never swap places and nothing can move vertically. The
     result reads like a set of shelves: motion is horizontal only, which the
     eye follows far more easily than a jump across the plot. */
  STRATEGY.lanes = function (labels, ctx) {
    var top = ctx.bounds.y0 + 4;
    var gap = LBL_H + 6;
    labels.forEach(function (L, i) {
      L.y = top + i * gap;
      L.x = L.ax - L.w / 2;
      L.x = Math.max(ctx.bounds.x0, Math.min(ctx.bounds.x1 - L.w, L.x));
      L.leader = true;
    });
  };

  var NOTES = {
    sticky: 'Eight fixed positions around the anchor, and the one it is already in keeps it unless another is clearly better.',
    curveEnd: 'The name sits at the end of the line it names, the way most newsrooms label a line chart.',
    rail: 'Every label lives in a fixed column outside the plot, joined to its anchor by a leader.',
    rigid: 'The offset is chosen once and then welded to the anchor. Clashes hide a label rather than move it.',
    lanes: 'Each label owns a horizontal band. It slides left and right with its anchor but never changes row.'
  };

  /* ── the figure ─────────────────────────────────────────────────────────── */
  function W5Fig(host, opts) {
    opts = opts || {};
    var mode = opts.mode || 'sticky';
    var strategy = STRATEGY[mode] || STRATEGY.sticky;
    var railW = (mode === 'rail') ? 110 : 0;

    var state = { ratio: 1.0, level: 3.0 };
    var memory = { L: {}, R: {} };      /* what each panel recorded last frame */
    var stats = { lastMax: 0, frames: 0, worst: 0, jumps: 0, worstJump: 0 };
    var lastPos = {}, lastAnch = {};

    host.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'w5-panels';
    host.appendChild(wrap);

    var panels = [
      { key: 'L', title: 'Consumer: budget line + indifference curve', accent: COL.consumer },
      { key: 'R', title: 'Firm: isocost + isoquant', accent: COL.firm }
    ].map(function (p) {
      var box = document.createElement('div');
      box.className = 'w5-panel';
      var h = document.createElement('div');
      h.className = 'w5-panel-title';
      h.textContent = p.title;
      box.appendChild(h);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 400 340');
      svg.setAttribute('class', 'w5-svg');
      box.appendChild(svg);
      wrap.appendChild(box);
      return { key: p.key, svg: svg, accent: p.accent };
    });

    function el(tag, attrs) {
      var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
      return e;
    }

    function draw() {
      var W = 400, H = 340;
      var bounds = { x0: PAD.l + 2, y0: PAD.t, x1: W - PAD.r, y1: H - PAD.b };
      var plotW = W - PAD.l - PAD.r - railW, plotH = H - PAD.t - PAD.b;
      var XMAX = 10, YMAX = 10;
      var sx = function (v) { return PAD.l + (v / XMAX) * plotW; };
      var sy = function (v) { return H - PAD.b - (v / YMAX) * plotH; };

      var frameMax = 0;

      panels.forEach(function (P) {
        while (P.svg.firstChild) P.svg.removeChild(P.svg.firstChild);
        var isFirm = P.key === 'R';

        /* axes */
        var g = el('g');
        [0, 2, 4, 6, 8, 10].forEach(function (v) {
          g.appendChild(el('line', { x1: PAD.l, x2: PAD.l + plotW, y1: sy(v), y2: sy(v), stroke: '#f1f3ef', 'stroke-width': 1 }));
          g.appendChild(el('text', { x: PAD.l - 8, y: sy(v) + 4, 'text-anchor': 'end', fill: COL.soft, 'font-size': 11 })).textContent = v;
          g.appendChild(el('text', { x: sx(v), y: H - PAD.b + 16, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 11 })).textContent = v;
        });
        g.appendChild(el('line', { x1: PAD.l, x2: PAD.l + plotW, y1: sy(0), y2: sy(0), stroke: '#b9c0b6', 'stroke-width': 1.4 }));
        g.appendChild(el('line', { x1: PAD.l, x2: PAD.l, y1: sy(0), y2: PAD.t, stroke: '#b9c0b6', 'stroke-width': 1.4 }));
        g.appendChild(el('text', { x: PAD.l + plotW / 2, y: H - 8, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 12 }))
          .textContent = isFirm ? 'L (labour)' : 'X (good 1)';
        var yt = el('text', { transform: 'rotate(-90)', x: -(PAD.t + plotH / 2), y: 14, 'text-anchor': 'middle', fill: COL.soft, 'font-size': 12 });
        yt.textContent = isFirm ? 'K (capital)' : 'Y (good 2)';
        g.appendChild(yt);
        P.svg.appendChild(g);

        /* the straight line: budget or isocost. state.ratio tilts it. */
        var ratio = state.ratio;
        var income = 10;
        var xInt = income / ratio, yInt = income;
        var lineA = [Math.max(0, Math.min(XMAX, 0)), yInt];
        var lineB = [Math.min(XMAX, xInt), Math.max(0, yInt - ratio * Math.min(XMAX, xInt))];
        var straight = el('line', {
          x1: sx(lineA[0]), y1: sy(lineA[1]), x2: sx(lineB[0]), y2: sy(lineB[1]),
          stroke: COL.line, 'stroke-width': 2.4
        });
        P.svg.appendChild(straight);

        /* the curve: indifference curve or isoquant, level set of sqrt(xy) */
        var lvl = state.level;
        var pts = [], obstacles = [];
        for (var x = 0.35; x <= XMAX; x += 0.12) {
          var y = (lvl * lvl) / x;
          if (y > YMAX * 1.3) continue;
          if (y < 0.02) break;
          pts.push([sx(x), sy(Math.min(y, YMAX * 1.2))]);
        }
        if (pts.length > 1) {
          var d = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L');
          P.svg.appendChild(el('path', { d: d, fill: 'none', stroke: P.accent, 'stroke-width': 2.6 }));
        }

        /* obstacles: the two drawn things, sampled */
        pts.forEach(function (q) { obstacles.push(q); });
        for (var t = 0; t <= 1; t += 0.03) {
          obstacles.push([sx(lineA[0] + (lineB[0] - lineA[0]) * t), sy(lineA[1] + (lineB[1] - lineA[1]) * t)]);
        }

        /* the tangency: where the curve's slope equals the line's */
        var xStar = lvl / Math.sqrt(ratio), yStar = lvl * Math.sqrt(ratio);
        xStar = Math.max(0.4, Math.min(XMAX - 0.3, xStar));
        yStar = Math.max(0.4, Math.min(YMAX - 0.3, yStar));
        var px = sx(xStar), py = sy(yStar);
        P.svg.appendChild(el('circle', { cx: px, cy: py, r: 5, fill: COL.point, stroke: '#fff', 'stroke-width': 1.5 }));

        /* the labels. Two of them share the tangency anchor on purpose: it is
           the case that breaks a naive placer. */
        /* Evaluate the curve at the right edge rather than taking the last
           sampled point: the sample array gains and loses points as the
           curve slides out of the top, which made the "end" jump. */
        var curveEndX = sx(XMAX);
        var curveEndY = sy(Math.min(YMAX, (lvl * lvl) / XMAX));
        var specs = [
          { id: P.key + 'line', text: isFirm ? 'Isocost' : 'Budget', colour: COL.line,
            ax: sx((lineA[0] + lineB[0]) / 2 * 0.65), ay: sy((lineA[1] + lineB[1]) / 2 * 1.15),
            endX: sx(lineB[0]), endY: sy(lineB[1]) },
          { id: P.key + 'curve', text: isFirm ? 'Isoquant' : 'IC', colour: P.accent,
            ax: pts.length ? pts[Math.floor(pts.length * 0.3)][0] : px,
            ay: pts.length ? pts[Math.floor(pts.length * 0.3)][1] : py,
            endX: curveEndX, endY: curveEndY },
          { id: P.key + 'opt', text: 'Optimum', colour: COL.point, ax: px, ay: py, endX: px, endY: py },
          { id: P.key + 'rate', text: (isFirm ? 'MRTS = ' : 'MRS = ') + ratio.toFixed(2),
            colour: COL.soft, ax: px, ay: py, endX: px, endY: py }
        ];

        specs.forEach(function (s) {
          s.w = Math.max(30, s.text.length * 6.4 + 12);
          s.h = LBL_H;
        });

        strategy(specs, {
          obstacles: obstacles,
          bounds: { x0: bounds.x0, y0: bounds.y0, x1: W - PAD.r, y1: bounds.y1 },
          railW: railW,
          prev: memory[P.key]
        });

        /* paint, and remember for next frame */
        specs.forEach(function (s) {
          if (s.hidden) { memory[P.key][s.id] = { slot: s.slot, ox: s.ox, oy: s.oy }; return; }
          if (s.leader) {
            P.svg.appendChild(el('line', {
              x1: s.ax, y1: s.ay, x2: s.x + s.w / 2, y2: s.y + s.h / 2,
              stroke: s.colour, 'stroke-width': 0.9, 'stroke-dasharray': '3,2.5', opacity: 0.5
            }));
          }
          P.svg.appendChild(el('rect', {
            x: s.x, y: s.y, width: s.w, height: s.h, rx: 4,
            fill: '#fff', stroke: s.colour, 'stroke-width': 0.9, opacity: 0.97
          }));
          var t2 = el('text', {
            x: s.x + s.w / 2, y: s.y + s.h - 6, 'text-anchor': 'middle',
            fill: s.colour, 'font-size': 11.5, 'font-weight': 600
          });
          t2.textContent = s.text;
          P.svg.appendChild(t2);

          memory[P.key][s.id] = { slot: s.slot, ox: s.ox, oy: s.oy };
          var key = P.key + s.id;
          var now = [s.x + s.w / 2, s.y + s.h / 2];
          if (lastPos[key]) {
            var moved = Math.hypot(now[0] - lastPos[key][0], now[1] - lastPos[key][1]);
            var anchMoved = Math.hypot(s.ax - lastAnch[key][0], s.ay - lastAnch[key][1]);
            if (moved > frameMax) frameMax = moved;
            /* moving with the anchor is the label doing its job; moving far
               further than the anchor did is a re-decision, and that is the
               jump the eye catches */
            if (moved > 25 && moved > anchMoved * 3 + 10) {
              stats.jumps++;
              var excess = moved - anchMoved;
              if (excess > stats.worstJump) stats.worstJump = excess;
            }
          }
          lastPos[key] = now;
          lastAnch[key] = [s.ax, s.ay];
        });
      });

      stats.frames++;
      stats.lastMax = frameMax;
      if (frameMax > stats.worst) stats.worst = frameMax;
      if (opts.onStats) opts.onStats(stats);
    }

    return {
      draw: draw,
      set: function (k, v) { state[k] = v; draw(); },
      reset: function () { stats.jumps = 0; stats.worstJump = 0; stats.worst = 0; stats.frames = 0; lastPos = {}; lastAnch = {}; draw(); },
      note: NOTES[mode] || ''
    };
  }

  global.W5Fig = W5Fig;
  global.W5Notes = NOTES;
})(window);
