/* fig-shift2.js
 * Fig 2.4 again, this time to compare TEN WAYS OF PLACING THE CURVE LABELS.
 * The layout is held constant (the ratio split from variant 1) so the label
 * treatment is the only thing that changes between the ten pages.
 *
 * WHY THE LABELS MOVED OUT OF JSXGRAPH
 * The previous pass placed labels as JSXGraph text at computed data
 * coordinates. That can push a label off its own curve, but it cannot know how
 * WIDE the rendered label is, so a label still ran into the axis, the tick
 * numbers or the other label. Real collision needs real font metrics.
 * So labels are now absolutely positioned DOM elements in an overlay above the
 * board. They are created, measured, then placed. Every mode below gets the
 * same measured obstacle set:
 *     the two budget lines, both axes, every tick number's box,
 *     the plot bounds, and the other labels.
 *
 * ALSO FIXED HERE, FOR ALL TEN
 *   - Curve label type was 13px. It is 15px now, and the tick numbers are 14px.
 *   - The Y axis title was clipped by the top of the board: the bounding box
 *     now reserves explicit headroom in pixels for it.
 *   - The X axis title sat in the same lane as the tick numbers and collided
 *     with the last one. Axis titles now sit past the end of each axis arrow,
 *     in room reserved for them, not in the tick lane.
 */
(function (global) {
  'use strict';

  var COL = {
    ink: '#14181b', soft: '#4a5257', grid: '#e3e6e2', axis: '#9aa39c',
    orig: '#3d5a80', nu: '#a8431f', move: '#7a1f5c', paper: '#ffffff'
  };

  var MAX = 50;
  var PX = {
    tickGap: 18, arrowLane: 42, gutterPad: 18,
    titleRoom: 30,      /* room past the arrowhead for an axis title */
    headroom: 44,       /* room above MAX so the Y title is never clipped */
    labelFont: 15, tickFont: 14, platePad: '3px 8px',
    minGap: 10          /* smallest acceptable clearance, in pixels */
  };

  /* Line weights, pulled out of the draw calls so a page can ask for a heavier
     figure through opts.stroke instead of forking the file. */
  var STROKE = { curve0: 2.6, curve1: 3.2, axis: 1.4, tick: 1, arrow: 2.6, grid: 1, leader: 1, dot: 2.6, plateBorder: 1 };

  var I0 = 100, PX0 = 5, PY0 = 4;
  function lineFor(I, px, py) { return { xi: I / px, yi: I / py, slope: -(px / py) }; }

  /* ---------- geometry ---------- */
  function segDist(px, py, x1, y1, x2, y2) {
    var vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy;
    var t = L2 ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / L2)) : 0;
    return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
  }
  function rectSegDist(R, s) {
    var best = Infinity, N = 24;
    for (var i = 0; i <= N; i++) {
      var t = i / N, x = s[0] + (s[2] - s[0]) * t, y = s[1] + (s[3] - s[1]) * t;
      var cx = Math.max(R.x, Math.min(x, R.x + R.w)), cy = Math.max(R.y, Math.min(y, R.y + R.h));
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
    return best;
  }
  function rectsOverlap(a, b, pad) {
    pad = pad || 0;
    return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
  }
  function rectRectGap(a, b) {
    var dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
    var dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
    return Math.hypot(dx, dy);
  }

  function Fig(hostEl, opts) {
    opts = opts || {};
    var mode = opts.mode || 'plate';
    var onData = opts.onData;

    /* Per-instance so two figures on one page can be sized differently. */
    var S = Object.assign({}, PX, opts.px || {});
    var W = Object.assign({}, STROKE, opts.stroke || {});

    var host = typeof hostEl === 'string' ? document.getElementById(hostEl) : hostEl;
    host.style.position = 'relative';

    var boardEl = document.createElement('div');
    /* JSXGraph looks its container up BY ID (getDimensions does a lookup), so a
       bare element with no id makes setBoundingBox throw. */
    boardEl.id = 'jxgb-' + Math.random().toString(36).slice(2, 10);
    boardEl.style.cssText = 'position:absolute;inset:0;';
    host.appendChild(boardEl);

    var overlay = document.createElement('div');
    overlay.className = 'fig-labels';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;';
    host.appendChild(overlay);

    var leaderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaderSvg.setAttribute('class', 'fig-leaders');
    leaderSvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
    overlay.appendChild(leaderSvg);

    var board = JXG.JSXGraph.initBoard(boardEl, {
      boundingbox: [-12, MAX + 8, MAX + 8, -12],
      keepAspectRatio: false, axis: false, showNavigation: false, showCopyright: false,
      pan: { enabled: false }, zoom: { enabled: false }
    });

    var furniture = [], series = [], lane = {};
    var state = { type: 'income-up', mag: 30 };

    function clear(list) { list.forEach(function (o) { try { board.removeObject(o, false); } catch (e) {} }); list.length = 0; }
    function scr(x, y) { var c = new JXG.Coords(JXG.COORDS_BY_USER, [x, y], board).scrCoords; return { x: c[1], y: c[2] }; }

    function computeLanes() {
      var ux = board.unitX || 1, uy = board.unitY || 1;
      var gutY = (S.arrowLane + S.gutterPad) / uy, gutX = (S.arrowLane + S.gutterPad) / ux;
      /* Explicit room past the end of each axis for its title, plus headroom so
         the Y title cannot be clipped by the top edge. */
      var topY = MAX + S.headroom / uy, rightX = MAX + (S.titleRoom + 14) / ux;
      board.setBoundingBox([-gutX, topY, rightX, -gutY], false);
      ux = board.unitX || ux; uy = board.unitY || uy;
      lane = {
        tickY: -S.tickGap / uy, tickX: -S.tickGap / ux,
        arrowY: -S.arrowLane / uy, arrowX: -S.arrowLane / ux,
        titleX: MAX + S.titleRoom / ux * 0.62, titleY: MAX + (S.headroom * 0.48) / uy
      };
    }

    function drawFurniture() {
      clear(furniture);
      var g;
      for (g = 10; g <= MAX; g += 10) {
        furniture.push(board.create('segment', [[0, g], [MAX, g]], { strokeColor: COL.grid, strokeWidth: W.grid, fixed: true, highlight: false, layer: 1 }));
        furniture.push(board.create('segment', [[g, 0], [g, MAX]], { strokeColor: COL.grid, strokeWidth: W.grid, fixed: true, highlight: false, layer: 1 }));
      }
      furniture.push(board.create('segment', [[0, 0], [MAX + 1.5, 0]], { strokeColor: COL.axis, strokeWidth: W.axis, fixed: true, highlight: false, lastArrow: { type: 2, size: 5 } }));
      furniture.push(board.create('segment', [[0, 0], [0, MAX + 1.5]], { strokeColor: COL.axis, strokeWidth: W.axis, fixed: true, highlight: false, lastArrow: { type: 2, size: 5 } }));

      var tly = Math.abs(lane.tickY) * 0.3, tlx = Math.abs(lane.tickX) * 0.3;
      for (g = 10; g <= MAX; g += 10) {
        furniture.push(board.create('segment', [[g, 0], [g, -tly]], { strokeColor: COL.axis, strokeWidth: W.tick, fixed: true, highlight: false }));
        furniture.push(board.create('text', [g, lane.tickY, String(g)], { fontSize: S.tickFont, color: COL.soft, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false, cssStyle: 'font-family:inherit' }));
        furniture.push(board.create('segment', [[0, g], [-tlx, g]], { strokeColor: COL.axis, strokeWidth: W.tick, fixed: true, highlight: false }));
        furniture.push(board.create('text', [lane.tickX, g, String(g)], { fontSize: S.tickFont, color: COL.soft, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false, cssStyle: 'font-family:inherit' }));
      }
      /* Axis titles: past the arrowhead, in their own reserved room, never in
         the tick lane and never against the top edge. */
      furniture.push(board.create('text', [lane.titleX, 0, 'X'], { fontSize: S.tickFont + 1, color: COL.ink, anchorX: 'left', anchorY: 'middle', fixed: true, highlight: false, cssStyle: 'font-family:inherit;font-weight:600' }));
      furniture.push(board.create('text', [0, lane.titleY, 'Y'], { fontSize: S.tickFont + 1, color: COL.ink, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false, cssStyle: 'font-family:inherit;font-weight:600' }));
    }

    /* ---------- the label layer ---------- */
    var labelEls = [];
    function resetLabels() {
      labelEls.forEach(function (e) { e.remove(); });
      labelEls = [];
      while (leaderSvg.firstChild) leaderSvg.removeChild(leaderSvg.firstChild);
    }
    function makeLabelEl(text, colour) {
      var d = document.createElement('div');
      d.className = 'fl fl-' + mode;
      d.textContent = text;
      d.style.cssText = 'position:absolute;white-space:nowrap;font-size:' + S.labelFont +
        'px;font-weight:600;line-height:1.25;color:' + colour + ';';
      overlay.appendChild(d);
      labelEls.push(d);
      return d;
    }
    function leader(x1, y1, x2, y2, colour) {
      var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', colour); l.setAttribute('stroke-width', String(W.leader));
      l.setAttribute('stroke-dasharray', '3 2'); l.setAttribute('opacity', '.85');
      leaderSvg.appendChild(l);
    }
    function dot(x, y, colour) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', String(W.dot));
      c.setAttribute('fill', colour);
      leaderSvg.appendChild(c);
    }

    /* Obstacles, in overlay-local pixel coordinates. */
    function obstacles(L0, L1) {
      var hostR = host.getBoundingClientRect();
      var segs = [];
      [[L0, 'curve'], [L1, 'curve']].forEach(function (p) {
        var a = scr(0, p[0].yi), b = scr(p[0].xi, 0);
        segs.push([a.x, a.y, b.x, b.y]);
      });
      var o = scr(0, 0), xe = scr(MAX + 1.5, 0), ye = scr(0, MAX + 1.5);
      segs.push([o.x, o.y, xe.x, xe.y]);      /* x axis */
      segs.push([o.x, o.y, ye.x, ye.y]);      /* y axis */

      var rects = [];
      host.querySelectorAll('.JXGtext').forEach(function (t) {
        var r = t.getBoundingClientRect();
        if (!r.width) return;
        rects.push({ x: r.x - hostR.x, y: r.y - hostR.y, w: r.width, h: r.height });
      });
      return { segs: segs, rects: rects, w: hostR.width, h: hostR.height };
    }

    function clearanceAt(R, ob, others) {
      var best = Infinity, i;
      for (i = 0; i < ob.segs.length; i++) best = Math.min(best, rectSegDist(R, ob.segs[i]));
      for (i = 0; i < ob.rects.length; i++) best = Math.min(best, rectRectGap(R, ob.rects[i]));
      for (i = 0; i < others.length; i++) best = Math.min(best, rectRectGap(R, others[i]));
      /* staying inside the plot counts as clearance too */
      best = Math.min(best, R.x, R.y, ob.w - (R.x + R.w), ob.h - (R.y + R.h));
      return best;
    }

    var MODES = {};

    /* 1. Opaque plate. The label carries its own background so nothing behind
          it can interfere, placed on the normal to its curve. */
    MODES.plate = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.background = COL.paper;
        el.style.border = '1px solid ' + s.colour;
        el.style.borderRadius = '5px';
        el.style.padding = '3px 7px';
        var p = offsetPos(el, s, ob, placed, 44);
        put(el, p); placed.push(rectOf(el, p));
        dot(s.ax, s.ay, s.colour); leader(s.ax, s.ay, p.x + p.w / 2, p.y + p.h / 2, s.colour);
      });
    };

    /* 2. Halo. No box: the glyphs are ringed in the paper colour so they stay
          legible over a line without adding another rectangle to the figure. */
    MODES.halo = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.textShadow = ['-2px -2px 0 ' + COL.paper, '2px -2px 0 ' + COL.paper,
          '-2px 2px 0 ' + COL.paper, '2px 2px 0 ' + COL.paper, '0 3px 0 ' + COL.paper,
          '0 -3px 0 ' + COL.paper, '3px 0 0 ' + COL.paper, '-3px 0 0 ' + COL.paper].join(',');
        var p = offsetPos(el, s, ob, placed, 40);
        put(el, p); placed.push(rectOf(el, p));
        dot(s.ax, s.ay, s.colour);
      });
    };

    /* 3. Relaxation. The label starts on the normal then is pushed out of every
          obstacle it touches, iteratively, with a weak spring back to its
          anchor. This is the d3-force idea without the dependency, and it is
          the only mode that reacts to the actual rendered box. */
    MODES.collide = function (specs, ob) {
      var items = specs.map(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.textShadow = '0 0 3px ' + COL.paper + ',0 0 3px ' + COL.paper;
        var m = measure(el);
        return { s: s, el: el, w: m.w, h: m.h, x: s.ax + s.nx * 40 - m.w / 2, y: s.ay + s.ny * 40 - m.h / 2 };
      });
      for (var it = 0; it < 220; it++) {
        items.forEach(function (a) {
          var R = { x: a.x, y: a.y, w: a.w, h: a.h };
          var fx = 0, fy = 0;
          ob.segs.forEach(function (sg) {
            var d = rectSegDist(R, sg);
            if (d < S.minGap + 6) {
              var cx = R.x + R.w / 2, cy = R.y + R.h / 2;
              var t = closestT(cx, cy, sg);
              var px2 = sg[0] + (sg[2] - sg[0]) * t, py2 = sg[1] + (sg[3] - sg[1]) * t;
              var dx = cx - px2, dy = cy - py2, L = Math.hypot(dx, dy) || 1;
              var push = (S.minGap + 6 - d) * 0.5;
              fx += (dx / L) * push; fy += (dy / L) * push;
            }
          });
          ob.rects.concat(items.filter(function (b) { return b !== a; })
            .map(function (b) { return { x: b.x, y: b.y, w: b.w, h: b.h }; }))
            .forEach(function (r) {
              if (!rectsOverlap(R, r, S.minGap)) return;
              var dx = (R.x + R.w / 2) - (r.x + r.w / 2), dy = (R.y + R.h / 2) - (r.y + r.h / 2);
              var L = Math.hypot(dx, dy) || 1;
              fx += (dx / L) * 4; fy += (dy / L) * 4;
            });
          /* weak spring home, so labels do not wander far from their curve */
          fx += (a.s.ax + a.s.nx * 40 - (a.x + a.w / 2)) * 0.02;
          fy += (a.s.ay + a.s.ny * 40 - (a.y + a.h / 2)) * 0.02;
          a.x = Math.max(2, Math.min(ob.w - a.w - 2, a.x + fx * 0.5));
          a.y = Math.max(2, Math.min(ob.h - a.h - 2, a.y + fy * 0.5));
        });
      }
      /* A relaxation is not guaranteed to satisfy its constraints. If a label
         has not cleared the floor after 220 iterations, fall back to the
         deterministic compass search rather than shipping a touching label. */
      var settled = [];
      items.forEach(function (a) {
        var R = { x: a.x, y: a.y, w: a.w, h: a.h };
        if (clearanceAt(R, ob, settled) < S.minGap) {
          var best = null;
          for (var k = 0; k < 16; k++) {
            for (var d2 = 0; d2 < 4; d2++) {
              var ang = (Math.PI / 8) * k, dist2 = 34 + d2 * 20;
              var C = { x: a.s.ax + Math.cos(ang) * dist2 - a.w / 2, y: a.s.ay - Math.sin(ang) * dist2 - a.h / 2, w: a.w, h: a.h };
              if (C.x < 3 || C.y < 3 || C.x + C.w > ob.w - 3 || C.y + C.h > ob.h - 3) continue;
              var sc = clearanceAt(C, ob, settled);
              if (!best || sc > best.sc) best = { R: C, sc: sc };
            }
          }
          if (best) { a.x = best.R.x; a.y = best.R.y; }
        }
        settled.push({ x: a.x, y: a.y, w: a.w, h: a.h });
        put(a.el, { x: a.x, y: a.y, w: a.w, h: a.h });
        dot(a.s.ax, a.s.ay, a.s.colour);
        leader(a.s.ax, a.s.ay, a.x + a.w / 2, a.y + a.h / 2, a.s.colour);
      });
    };

    /* 4. Right margin. Labels leave the plot entirely and stack in the space to
          the right, each connected to its curve by a leader. Overlap becomes
          impossible rather than merely unlikely. */
    MODES.margin = function (specs, ob) {
      var used = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.background = COL.paper; el.style.padding = '2px 6px'; el.style.borderRadius = '4px';
        var m = measure(el);
        var x = ob.w - m.w - 4, y = Math.max(2, Math.min(ob.h - m.h - 2, s.ay - m.h / 2));
        used.forEach(function (u) { if (Math.abs(y - u) < m.h + 6) y = u + m.h + 8; });
        used.push(y);
        put(el, { x: x, y: y, w: m.w, h: m.h });
        dot(s.ax, s.ay, s.colour); leader(s.ax, s.ay, x - 3, y + m.h / 2, s.colour);
      });
    };

    /* 5. At the end of the line, the way a time series is labelled: no leader,
          the label simply continues past where its curve stops. */
    MODES.endpoint = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.textShadow = '0 0 3px ' + COL.paper + ',0 0 3px ' + COL.paper;
        var m = measure(el);
        var e = scr(s.line.xi, 0);
        var R = null;
        /* Walk up and out from the intercept until the box is clear of the axis,
           the curves and anything already placed. */
        for (var lift = 18; lift <= 120 && !R; lift += 14) {
          for (var dx = 8; dx <= 40; dx += 16) {
            var cand = { x: Math.min(ob.w - m.w - 3, e.x + dx), y: Math.max(3, e.y - m.h - lift), w: m.w, h: m.h };
            if (clearanceAt(cand, ob, placed) >= S.minGap) { R = cand; break; }
          }
        }
        if (!R) R = { x: Math.min(ob.w - m.w - 3, e.x + 8), y: Math.max(3, e.y - m.h - 26), w: m.w, h: m.h };
        put(el, R); placed.push(R);
      });
    };

    /* 6. Set into the curve. The plate sits ON the line and masks the segment
          underneath, the way a contour map breaks a contour for its number. */
    MODES.oncurve = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.background = COL.paper; el.style.padding = '2px 8px'; el.style.borderRadius = '3px';
        var m = measure(el);
        var R = { x: s.ax - m.w / 2, y: s.ay - m.h / 2, w: m.w, h: m.h };
        var slide = 0;
        while (placed.some(function (p) { return rectsOverlap(R, p, 6); }) && slide < 14) {
          slide++;
          var f = Math.min(0.88, s.frac + slide * 0.06);
          var q = scr(s.line.xi * f, s.line.slope * (s.line.xi * f) + s.line.yi);
          R.x = q.x - m.w / 2; R.y = q.y - m.h / 2;
        }
        put(el, R); placed.push(R);
      });
    };

    /* 7. One legend block in the corner the data never reaches. No per-curve
          labels at all, so nothing can collide with anything. */
    MODES.legend = function (specs, ob) {
      var box = document.createElement('div');
      box.className = 'fl fl-legend';
      box.style.cssText = 'position:absolute;right:10px;top:10px;background:' + COL.paper +
        ';border:1px solid ' + COL.grid + ';border-radius:6px;padding:8px 10px;display:grid;gap:5px;font-size:' +
        S.labelFont + 'px;line-height:1.25';
      specs.forEach(function (s) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:7px;white-space:nowrap;color:' + COL.ink;
        row.innerHTML = '<span style="display:inline-block;width:22px;height:0;border-top:3px ' +
          (s.dash ? 'dashed' : 'solid') + ' ' + s.colour + '"></span>' + s.text;
        box.appendChild(row);
      });
      overlay.appendChild(box); labelEls.push(box);
      specs.forEach(function (s) { dot(s.ax, s.ay, s.colour); });
    };

    /* 8. Compass search. Eight directions times three distances around the
          anchor, every candidate scored on measured clearance, best wins.
          Deterministic: the same input always gives the same placement, which
          a relaxation cannot promise. */
    MODES.compass = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.textShadow = '0 0 3px ' + COL.paper + ',0 0 3px ' + COL.paper;
        var m = measure(el), best = null;
        for (var a = 0; a < 8; a++) {
          for (var d = 0; d < 3; d++) {
            var ang = (Math.PI / 4) * a, dist = 34 + d * 22;
            var cx = s.ax + Math.cos(ang) * dist, cy = s.ay - Math.sin(ang) * dist;
            var R = { x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h };
            if (R.x < 2 || R.y < 2 || R.x + R.w > ob.w - 2 || R.y + R.h > ob.h - 2) continue;
            var sc = clearanceAt(R, ob, placed) - dist * 0.05;
            if (!best || sc > best.sc) best = { R: R, sc: sc };
          }
        }
        if (!best) best = { R: { x: s.ax + 12, y: s.ay - m.h / 2, w: m.w, h: m.h } };
        put(el, best.R); placed.push(best.R);
        dot(s.ax, s.ay, s.colour); leader(s.ax, s.ay, best.R.x + best.R.w / 2, best.R.y + best.R.h / 2, s.colour);
      });
    };

    /* 9. A rail down the right edge, inside the figure but outside the plot,
          each label vertically aligned with where its curve leaves. */
    MODES.rail = function (specs, ob) {
      var railX = ob.w - 4;
      var used = [];
      specs.slice().sort(function (a, b) { return a.ay - b.ay; }).forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        var m = measure(el);
        var y = Math.max(2, Math.min(ob.h - m.h - 2, s.ay - m.h / 2));
        used.forEach(function (u) { if (y < u + m.h + 6) y = u + m.h + 6; });
        used.push(y);
        var x = railX - m.w;
        put(el, { x: x, y: y, w: m.w, h: m.h });
        dot(s.ax, s.ay, s.colour); leader(s.ax, s.ay, x - 4, y + m.h / 2, s.colour);
      });
    };

    /* 10. Plate plus compass search: the box from mode 1 placed by the scoring
           from mode 8. The candidate for production. */
    MODES.hybrid = function (specs, ob) {
      var placed = [];
      specs.forEach(function (s) {
        var el = makeLabelEl(s.text, s.colour);
        el.style.background = COL.paper;
        el.style.border = W.plateBorder + 'px solid ' + s.colour;
        el.style.borderRadius = '6px'; el.style.padding = S.platePad;
        el.style.boxShadow = '0 1px 3px rgba(20,24,27,.10)';
        var m = measure(el), best = null;
        for (var a = 0; a < 12; a++) {
          for (var d = 0; d < 4; d++) {
            var ang = (Math.PI / 6) * a, dist = 32 + d * 20;
            var cx = s.ax + Math.cos(ang) * dist, cy = s.ay - Math.sin(ang) * dist;
            var R = { x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h };
            if (R.x < 3 || R.y < 3 || R.x + R.w > ob.w - 3 || R.y + R.h > ob.h - 3) continue;
            var sc = clearanceAt(R, ob, placed) - dist * 0.04;
            if (!best || sc > best.sc) best = { R: R, sc: sc };
          }
        }
        if (!best) best = { R: { x: s.ax + 12, y: s.ay - m.h / 2, w: m.w, h: m.h } };
        put(el, best.R); placed.push(best.R);
        dot(s.ax, s.ay, s.colour); leader(s.ax, s.ay, best.R.x + best.R.w / 2, best.R.y + best.R.h / 2, s.colour);
      });
    };

    function closestT(px, py, s) {
      var vx = s[2] - s[0], vy = s[3] - s[1], L2 = vx * vx + vy * vy;
      return L2 ? Math.max(0, Math.min(1, ((px - s[0]) * vx + (py - s[1]) * vy) / L2)) : 0;
    }
    function measure(el) { el.style.left = '-9999px'; el.style.top = '0'; var r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }
    function rectOf(el, p) { return { x: p.x, y: p.y, w: p.w, h: p.h }; }
    function put(el, p) { el.style.left = Math.round(p.x) + 'px'; el.style.top = Math.round(p.y) + 'px'; }
    function offsetPos(el, s, ob, placed, dist) {
      var m = measure(el);
      var best = null;
      [1, -1].forEach(function (side) {
        [dist, dist * 1.3, dist * 1.7, dist * 2.2, dist * 2.8].forEach(function (d) {
          var cx = s.ax + s.nx * d * side, cy = s.ay + s.ny * d * side;
          var R = { x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h };
          if (R.x < 2 || R.y < 2 || R.x + R.w > ob.w - 2 || R.y + R.h > ob.h - 2) return;
          var sc = clearanceAt(R, ob, placed);
          if (!best || sc > best.sc) best = { x: R.x, y: R.y, w: m.w, h: m.h, sc: sc };
        });
      });
      return best || { x: s.ax + 10, y: s.ay - m.h / 2, w: m.w, h: m.h };
    }

    var LABELS = {
      'income-up': 'Income up', 'income-down': 'Income down',
      'px-up': 'Price of X up', 'px-down': 'Price of X down',
      'py-up': 'Price of Y up', 'py-down': 'Price of Y down'
    };

    function draw() {
      clear(series); resetLabels();
      var mag = state.mag / 100, t = state.type;
      var I2 = I0, px2 = PX0, py2 = PY0;
      if (t === 'income-up') I2 = I0 * (1 + mag);
      if (t === 'income-down') I2 = I0 * (1 - mag);
      if (t === 'px-up') px2 = PX0 * (1 + mag);
      if (t === 'px-down') px2 = PX0 * (1 - mag);
      if (t === 'py-up') py2 = PY0 * (1 + mag);
      if (t === 'py-down') py2 = PY0 * (1 - mag);

      var L0 = lineFor(I0, PX0, PY0), L1 = lineFor(I2, px2, py2);

      board.suspendUpdate();
      series.push(board.create('segment', [[0, L0.yi], [L0.xi, 0]], { strokeColor: COL.orig, strokeWidth: W.curve0, dash: 2, fixed: true, highlight: false }));
      series.push(board.create('segment', [[0, L1.yi], [L1.xi, 0]], { strokeColor: COL.nu, strokeWidth: W.curve1, fixed: true, highlight: false }));
      if (Math.abs(L1.xi - L0.xi) > 0.6) series.push(board.create('arrow', [[L0.xi, lane.arrowY], [L1.xi, lane.arrowY]], { strokeColor: COL.move, strokeWidth: W.arrow, fixed: true, highlight: false }));
      if (Math.abs(L1.yi - L0.yi) > 0.6) series.push(board.create('arrow', [[lane.arrowX, L0.yi], [lane.arrowX, L1.yi]], { strokeColor: COL.move, strokeWidth: W.arrow, fixed: true, highlight: false }));
      board.unsuspendUpdate();

      var ob = obstacles(L0, L1);
      var specs = [
        mkSpec(L0, 0.30, 'B₀ original', COL.orig, true),
        mkSpec(L1, 0.64, 'B₁ new', COL.nu, false)
      ];
      (MODES[mode] || MODES.plate)(specs, ob);

      if (onData) onData({
        type: t, mag: state.mag, label: LABELS[t] + ' ' + state.mag + '%',
        xi0: L0.xi, xi1: L1.xi, yi0: L0.yi, yi1: L1.yi,
        slope0: L0.slope, slope1: L1.slope,
        slopeChanged: Math.abs(L1.slope - L0.slope) > 1e-9,
        fixed: t.indexOf('income') === 0 ? 'neither intercept' : (t.indexOf('px') === 0 ? 'Y-intercept' : 'X-intercept'),
        kind: t.indexOf('income') === 0 ? 'parallel shift' : 'pivot'
      });
    }

    function mkSpec(line, frac, text, colour, dash) {
      var x = line.xi * frac, y = line.slope * x + line.yi;
      var a = scr(x, y);
      var p1 = scr(0, line.yi), p2 = scr(line.xi, 0);
      var vx = p2.x - p1.x, vy = p2.y - p1.y, L = Math.hypot(vx, vy) || 1;
      return { line: line, frac: frac, text: text, colour: colour, dash: dash,
               ax: a.x, ay: a.y, nx: -vy / L, ny: vx / L };
    }

    function relayout() { computeLanes(); drawFurniture(); draw(); }

    this.setType = function (t) { state.type = t; draw(); };
    this.setMag = function (m) { state.mag = m; draw(); };
    this.resize = function () {
      try { board.resizeContainer(host.clientWidth, host.clientHeight, true); } catch (e) {}
      relayout();
    };
    relayout();
    if (global.ResizeObserver) {
      var pending = null, self = this;
      new ResizeObserver(function () { clearTimeout(pending); pending = setTimeout(function () { self.resize(); }, 90); }).observe(host);
    }
  }

  global.FigShift2 = { create: function (el, o) { return new Fig(el, o); }, MODES: ['plate', 'halo', 'collide', 'margin', 'endpoint', 'oncurve', 'legend', 'compass', 'rail', 'hybrid'] };
})(window);
