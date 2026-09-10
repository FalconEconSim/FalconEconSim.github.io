/* Deterministic label placement.
   ---------------------------------------------------------------------------
   Figures used to lay labels out with a d3 force simulation: scattered at a
   random angle, drifting into place over about a second, draggable, and set
   swimming again by every slider. That is gone. A label is placed outright and
   cannot be moved by hand.

   Two rules, both chosen from side-by-side prototypes.

   WHERE THE LABEL GOES. Twelve positions around its anchor and nowhere else,
   and it keeps the one it is in for as long as that position is still doing
   its job. Only when the position is spoiled, by a curve moving under it, by
   the plot edge, or by another label, does it move, and then only to the next
   position along. It can work its way round its anchor over several frames but
   it can never cross it, so a slider slides a label round its point instead of
   teleporting it across the plot. Labels sharing one anchor sit on separate
   rings so they are never competing for the same twelve places.

   WHERE THE LEADER LANDS. A leader used to be drawn to whatever coordinate the
   figure declared, and figures declare approximate ones: measured on week 5, a
   label anchored to a real point on its curve landed dead on it, while one
   anchored to a hand-picked coordinate missed by up to 21px and the dashed line
   ended in white space. So before placing anything, each anchor is snapped onto
   the nearest piece of geometry drawn in the label's own colour, whether that
   was drawn as svg or painted onto a canvas. The figures do not have to change,
   and the leader they draw from that anchor now arrives. An anchor sitting in
   a filled region is left alone: a label naming an area belongs in the middle
   of it, not dragged onto whichever curve happens to border it.

   WHEN IT HAPPENS. A figure moves its anchors when its slider moves, and most
   call back in here from their own redraw. Not all of them did, so once a
   frame each label layer is asked, cheaply, whether anything has changed since
   it was last placed, and only then is anything re-solved. A figure nobody is
   looking at is left until it scrolls into view.
   ---------------------------------------------------------------------------
   Sizes here are in the coordinate space each figure uses, which differs from
   figure to figure, so the ring radius and the snap radius are given in screen
   pixels and converted per figure. Without that a 30-unit ring is 30px on one
   page and 58px on another.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';
  if (window.EC224Place) return;

  var CELL = 4;          /* occupancy grid resolution, in node units */
  var RINGS = 4;         /* how far out the clearance probe looks */

  /* ── occupancy grid ─────────────────────────────────────────────────────── */
  function Grid(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0;
    this.W = Math.max(1, Math.ceil((x1 - x0) / CELL));
    this.H = Math.max(1, Math.ceil((y1 - y0) / CELL));
    this.a = new Uint8Array(this.W * this.H);
  }
  Grid.prototype.mark = function (x, y) {
    var gx = ((x - this.x0) / CELL) | 0, gy = ((y - this.y0) / CELL) | 0;
    if (gx >= 0 && gy >= 0 && gx < this.W && gy < this.H) this.a[gy * this.W + gx] = 1;
  };
  Grid.prototype.markRect = function (x, y, w, h) {
    for (var yy = y; yy <= y + h; yy += CELL) for (var xx = x; xx <= x + w; xx += CELL) this.mark(xx, yy);
  };
  /* Distance in units from a box to the nearest marked cell, capped. */
  Grid.prototype.clearance = function (x, y, w, h) {
    var gx0 = ((x - this.x0) / CELL) | 0, gy0 = ((y - this.y0) / CELL) | 0;
    var gx1 = ((x + w - this.x0) / CELL) | 0, gy1 = ((y + h - this.y0) / CELL) | 0;
    for (var r = 0; r <= RINGS; r++) {
      for (var gy = gy0 - r; gy <= gy1 + r; gy++) {
        for (var gx = gx0 - r; gx <= gx1 + r; gx++) {
          if (r > 0 && gx !== gx0 - r && gx !== gx1 + r && gy !== gy0 - r && gy !== gy1 + r) continue;
          if (gx < 0 || gy < 0 || gx >= this.W || gy >= this.H) continue;
          if (this.a[gy * this.W + gx]) return r * CELL;
        }
      }
    }
    return (RINGS + 1) * CELL;
  };

  /* ── the drawn ink, sampled in the svg's own user space ─────────────────── */
  function sampleInk(grid, svg) {
    if (!svg) return;
    var el = svg.node ? svg.node() : svg;              /* accept a d3 selection */
    if (!el || !el.querySelectorAll) return;
    /* a group inside the plot only contains labels; the ink is on the svg */
    if (el.tagName && el.tagName.toLowerCase() !== "svg" && el.ownerSVGElement) {
      el = el.ownerSVGElement;
    }
    el.querySelectorAll('line, path, polyline').forEach(function (s) {
      if (s.closest('.tick, .domain')) return;
      if (s.hasAttribute('data-fl-leader') || s.hasAttribute('data-place-leader')) return;
      var stroke = (s.getAttribute('stroke') || '').toLowerCase();
      if (!stroke || stroke === 'none') return;
      /* gridlines are thin and pale; they are not something to dodge */
      if (parseFloat(s.getAttribute('stroke-width') || '1') < 1.5) return;
      var op = parseFloat(s.getAttribute('opacity') || '1');
      if (op < 0.15) return;
      try {
        var L = s.getTotalLength();
        if (!L || !isFinite(L)) return;
        var n = Math.min(240, Math.max(8, Math.round(L / CELL)));
        for (var i = 0; i <= n; i++) {
          var p = s.getPointAtLength(L * i / n);
          grid.mark(p.x, p.y);
        }
      } catch (e) { /* a shape with no length; nothing to sample */ }
    });
    /* filled regions and existing static text are obstacles too */
    el.querySelectorAll('text').forEach(function (t) {
      if (t.closest('.fig-label')) return;
      try {
        var b = t.getBBox();
        if (b.width) grid.markRect(b.x, b.y, b.width, b.height);
      } catch (e) {}
    });
  }

  /* A canvas holds its curves as pixels, not shapes. Sample it on a coarse
     stride: anything neither transparent nor near-white counts as drawn. The
     canvas backing store is usually larger than its CSS box (device pixel
     ratio), and the labels are positioned in CSS pixels, so scale as we go. */
  /* One read per solve. Both the obstacle grid and the anchor snapping want
     these pixels, and getImageData on a retina canvas is the slowest thing
     here by a wide margin, so it happens once and both are handed the result. */
  function readCanvas(cvs, cssW, cssH) {
    if (!cvs || !cvs.width || !cvs.height) return null;
    var data;
    try {
      data = cvs.getContext("2d", { willReadFrequently: true })
                .getImageData(0, 0, cvs.width, cvs.height).data;
    } catch (e) { return null; }
    /* The canvas backing store is bigger than its box on a retina screen, and
       labels are positioned in the box's own units, so ask the element what it
       actually measures. A caller-supplied size is only a last resort: a
       figure that gave no bounds would otherwise scale these by the 1000-unit
       default and put every pixel in the wrong place. */
    return { data: data, w: cvs.width, h: cvs.height,
             sx: (cvs.clientWidth || cssW || cvs.width) / cvs.width,
             sy: (cvs.clientHeight || cssH || cvs.height) / cvs.height };
  }
  function sampleCanvas(grid, cvs, cssW, cssH) {
    var px = (cvs && cvs.data) ? cvs : readCanvas(cvs, cssW, cssH);
    if (!px) return;
    var data = px.data, W = px.w, H = px.h;
    var step = Math.max(1, Math.round(2 / Math.max(px.sx, 0.2)));
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        var i = (y * W + x) * 4;
        if (data[i + 3] < 40) continue;
        if (data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232) continue;
        grid.mark(x * px.sx, y * px.sy);
      }
    }
  }

  /* ── how many screen pixels one unit of this figure is ──────────────────── */
  function rootSvg(any) {
    if (!any) return null;
    var el = any.node ? any.node() : any;
    if (!el || !el.tagName) return null;
    if (el.tagName.toLowerCase() !== "svg" && el.ownerSVGElement) el = el.ownerSVGElement;
    return el.tagName && el.tagName.toLowerCase() === "svg" ? el : null;
  }
  function unitPx(cfg) {
    var svg = rootSvg(cfg.svg);
    if (!svg) return 1;
    try {
      var b = svg.getBoundingClientRect();
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (!b.width) return 1;
      if (vb && vb.width) return b.width / vb.width;
      return 1;
    } catch (e) { return 1; }
  }

  /* ── how big the label text should be ───────────────────────────────────
     The prototype settled on 18px for a curve label and 16px for a tick
     number, and those are what a reader sees, not what a figure declares.
     Nearly every plot here draws into a 680-unit viewBox shown at about 623
     pixels, so a declared 12 arrives at 11, while the little four-panel
     figures draw into a 340-unit box at the same width and arrive at nearly
     double what they asked for. One declared number cannot serve both. So the
     target is stated in screen pixels and converted per figure.

     A crowded plot gets smaller text. Fewer, larger labels are easier to read
     than more, larger ones that have nowhere to sit, so the target steps down
     until the boxes would cover no more than about an eighth of the plot, and
     a small panel is capped whatever its label count. It never goes below 14px:
     under that the size increase stops being worth having. */
  var LABEL_TARGET_PX = 18;
  var LABEL_FLOOR_PX = 15;   /* still comfortably larger than the 12 it replaces */
  var TICK_TARGET_PX = 16;

  /* A rough label box at a given text size, in screen pixels: these labels are
     short names, four or five characters, in a padded box. */
  function boxAt(px) { return (px * 4.0) * (px * 1.5); }

  function targetPx(plotW, plotH, count) {
    var area = Math.max(1, plotW * plotH);
    var px = LABEL_TARGET_PX;
    while (px > LABEL_FLOOR_PX && count * boxAt(px) > area * 0.13) px -= 0.5;
    /* A small panel cannot carry the full size whatever its label count. The
       four-panel comparisons are the case: each panel is barely 300px across
       and was already setting text larger than the target, because its viewBox
       is half the usual width and everything in it is drawn at double scale. */
    var span = Math.min(plotW, plotH);
    if (span < 240) px = Math.min(px, 15);
    else if (span < 320) px = Math.min(px, 16);
    else if (span < 420) px = Math.min(px, 17);
    return px;
  }

  /* The font size and matching box height a figure should use, in its OWN
     units. Pass the label layer (or the svg) and how many labels there are. */
  function labelSize(svgish, count, plotW, plotH) {
    var scale = 1;
    var svg = rootSvg(svgish);
    if (svg) {
      try {
        var b = svg.getBoundingClientRect();
        var vb = svg.viewBox && svg.viewBox.baseVal;
        if (b.width && vb && vb.width) scale = b.width / vb.width;
        if (!plotW) { plotW = b.width; plotH = b.height; }
      } catch (e) {}
    }
    if (!plotW) { plotW = 600; plotH = 500; }
    var px = targetPx(plotW, plotH, count || 6);
    var font = px / (scale || 1);
    return { px: px, font: font, height: Math.round(font * 1.55 * 10) / 10, scale: scale };
  }
  /* Haloed labels name a point or a region and are written straight onto the
     plot rather than into a box. Their sizes were picked one at a time against
     a page that forced everything to 13px anyway, and they run from 7 to 11.
     Lift that range onto 13 to 18 so the smallest is still legible and the
     ordering the author intended survives: a label deliberately set smaller
     than its neighbour stays smaller. */
  function haloFont(svgish, want) {
    var w = +want || 10;
    var px = 13 + (Math.max(7, Math.min(11, w)) - 7) * 1.25;
    var scale = 1;
    var svg = rootSvg(svgish);
    if (svg) {
      try {
        var b = svg.getBoundingClientRect();
        var vb = svg.viewBox && svg.viewBox.baseVal;
        if (b.width && vb && vb.width) scale = b.width / vb.width;
      } catch (e) {}
    }
    return px / (scale || 1);
  }

  function tickSize(svgish) {
    var scale = 1;
    var svg = rootSvg(svgish);
    if (svg) {
      try {
        var b = svg.getBoundingClientRect();
        var vb = svg.viewBox && svg.viewBox.baseVal;
        if (b.width && vb && vb.width) scale = b.width / vb.width;
      } catch (e) {}
    }
    return TICK_TARGET_PX / (scale || 1);
  }

  /* ── the drawn geometry, kept as points with the colour that drew them ──── */
  /* Colours are compared as numbers, not as strings. The same red arrives as
     "#c0392b" from one figure, "rgb(192, 57, 43)" from a computed style, and
     as a smear of neighbouring values along an antialiased canvas curve, and
     all three have to count as the same red. */
  var colCache = {};
  function rgbOf(c) {
    if (!c) return null;
    c = String(c).trim().toLowerCase();
    if (!c || c === "none" || c === "transparent") return null;
    if (colCache[c] !== undefined) return colCache[c];
    var out = null, m;
    if (/^#[0-9a-f]{3}$/.test(c)) {
      out = [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
    } else if (/^#[0-9a-f]{6}$/.test(c)) {
      out = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    } else if ((m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/))) {
      out = [+m[1], +m[2], +m[3]];
    } else if (c.indexOf("var(") !== 0) {
      /* a name like "crimson"; let the browser resolve it, once */
      try {
        var probe = document.createElement("span");
        probe.style.color = c;
        if (probe.style.color) {
          document.body.appendChild(probe);
          var r = getComputedStyle(probe).color.match(/([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
          probe.remove();
          if (r) out = [+r[1], +r[2], +r[3]];
        }
      } catch (e) {}
    }
    colCache[c] = out;
    return out;
  }
  /* var(--red) only means anything once the browser has resolved it, so an
     element's own computed value is asked for first and the attribute is the
     fallback for the cases where there is no layout to compute against. */
  function strokeRGB(el) {
    var v = null;
    try { v = getComputedStyle(el).stroke; } catch (e) {}
    return rgbOf(v) || rgbOf(el.getAttribute("stroke"));
  }
  function fillRGB(el) {
    var v = null;
    try { v = getComputedStyle(el).fill; } catch (e) {}
    return rgbOf(v) || rgbOf(el.getAttribute("fill"));
  }
  function colourGap(a, b) {
    if (!a || !b) return 1e9;
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  }
  var SAME_COLOUR = 90;   /* summed channel difference still reading as one colour */

  function collectGeometry(cfg) {
    var svg = rootSvg(cfg.svg);
    if (!svg) return [];
    var out = [];
    svg.querySelectorAll("path, line, polyline").forEach(function (el) {
      if (el.closest(".tick, .domain")) return;
      if (el.hasAttribute("data-fl-leader") || el.hasAttribute("data-place-leader")) return;
      var rgb = strokeRGB(el);
      if (!rgb) return;
      var w = parseFloat(el.getAttribute("stroke-width") || "1");
      if (w < 1.5) return;                       /* gridlines are not targets */
      /* Dashed used to disqualify a thin line, on the grounds that it was
         probably another label's leader. Leaders carry a marker of their own
         now, and that guess was costing real curves: marginal revenue is drawn
         dashed by convention, and its label could never find it. */
      var op = parseFloat(el.getAttribute("opacity") || "1");
      if (op < 0.2) return;
      try {
        var L = el.getTotalLength();
        if (!L || !isFinite(L)) return;
        var n = Math.min(260, Math.max(6, Math.round(L / 3)));
        var pts = [];
        for (var i = 0; i <= n; i++) { var p = el.getPointAtLength(L * i / n); pts.push([p.x, p.y]); }
        out.push({ rgb: rgb, pts: pts });
      } catch (e) {}
    });
    /* markers count too: a label naming a point should land on the dot */
    svg.querySelectorAll("circle").forEach(function (el) {
      var r = parseFloat(el.getAttribute("r") || "0");
      if (r < 2 || r > 14) return;
      var rgb = fillRGB(el) || strokeRGB(el);
      if (!rgb) return;
      out.push({ rgb: rgb, pts: [[+el.getAttribute("cx"), +el.getAttribute("cy")]] });
    });
    return out;
  }

  /* The same question for a figure that paints its curves onto a canvas: there
     are no shapes to walk, only pixels. Nothing further away than the snap
     radius can ever win, so only the square around the anchor is read, which
     keeps this the same cost whether the canvas is 300px or 1300px across.
     Pass an rgb to accept only pixels of that colour; pass null to take any
     ink. Axis rules and gridlines are grey and are skipped either way: a
     leader that gave up and landed on the axis would look like a mistake. */
  function canvasNear(px, x, y, radius, rgb) {
    if (!px || !(radius > 0)) return null;
    var data = px.data, W = px.w, H = px.h, sx = px.sx || 1, sy = px.sy || 1;
    var cx = x / sx, cy = y / sy, rx = radius / sx, ry = radius / sy;
    var x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx));
    var y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
    var best = null;
    for (var yy = y0; yy <= y1; yy++) {
      for (var xx = x0; xx <= x1; xx++) {
        var i = (yy * W + xx) * 4;
        if (data[i + 3] < 60) continue;
        var r = data[i], g = data[i + 1], bl = data[i + 2];
        if (r > 226 && g > 226 && bl > 226) continue;             /* the paper */
        if (Math.abs(r - g) < 16 && Math.abs(g - bl) < 16 && r > 120) continue;  /* grey rules */
        if (rgb && Math.abs(r - rgb[0]) + Math.abs(g - rgb[1]) + Math.abs(bl - rgb[2]) > SAME_COLOUR) continue;
        var dx = xx - cx, dy = yy - cy, d = dx * dx * sx * sx + dy * dy * sy * sy;
        if (!best || d < best.d) best = { d: d, x: xx * sx, y: yy * sy };
      }
    }
    if (best) best.d = Math.sqrt(best.d);
    return best;
  }

  function nearestIn(geom, x, y) {
    var best = null;
    for (var g = 0; g < geom.length; g++) {
      var pts = geom[g].pts;
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i][0] - x, dy = pts[i][1] - y;
        var d = dx * dx + dy * dy;
        if (!best || d < best.d) best = { d: d, x: pts[i][0], y: pts[i][1] };
      }
    }
    if (best) best.d = Math.sqrt(best.d);
    return best;
  }
  /* A label naming a region, "Transfer", "DWL", "CS", anchors in the middle of
     it. That anchor is already on colour and must be left exactly where it is,
     or it gets dragged onto whichever curve borders the region and the label
     stops meaning what it says. */
  function insideFill(cfg, x, y) {
    var svg = rootSvg(cfg.svg);
    if (!svg) return false;
    var hit = false;
    var shapes = svg.querySelectorAll("polygon, rect, path");
    for (var i = 0; i < shapes.length && !hit; i++) {
      var el = shapes[i];
      if (typeof el.isPointInFill !== "function") continue;
      var rgb = fillRGB(el);
      if (!rgb) continue;
      if (rgb[0] > 244 && rgb[1] > 244 && rgb[2] > 244) continue;   /* white backing */
      if (parseFloat(el.getAttribute("opacity") || "1") < 0.05) continue;
      try {
        var p = svg.createSVGPoint();
        p.x = x; p.y = y;
        var ctm = el.getCTM();
        if (ctm) p = p.matrixTransform(ctm.inverse());
        hit = el.isPointInFill(p);
      } catch (e) {}
    }
    return hit;
  }

  /* Move an anchor onto the thing its label names, so the leader the figure
     draws from it actually arrives. Geometry drawn in the label's own colour
     is tried first, which on this site is decisive: a label is coloured to
     match its curve. Failing that, any nearby geometry, but only for a small
     miss, because guessing across a large gap is how a leader ends up pointing
     at the wrong curve. An anchor already sitting on its object does not move,
     so running this every frame changes nothing once it is right. */
  function snapAnchors(nodes, cfg, upx, px) {
    var geom = collectGeometry(cfg);
    if (!geom.length && !px) return;
    var ON_IT = 2.5 / upx;                 /* already touching: leave alone */
    var FAR_MATCHED = 34 / upx;            /* colour matches: trust it further */
    var FAR_ANY = 13 / upx;                /* no colour to go on: small fixes */
    var haveFills = geom.length > 0;
    nodes.forEach(function (d) {
      if (d.fx_anchor == null || d.fy_anchor == null) return;
      if (d.noSnap) return;
      if (d.fx != null && d.fy != null) return;   /* pinned: the figure decides */
      var x = d.fx_anchor, y = d.fy_anchor;
      if (haveFills && insideFill(cfg, x, y)) return;
      /* on a canvas, a pixel right under the anchor says the same thing */
      if (px && canvasNear(px, x, y, ON_IT, null)) return;

      var rgb = rgbOf(d.color || d.colour);
      var hit = null, limit = FAR_MATCHED;
      if (rgb) {
        var mine = geom.filter(function (g) { return colourGap(g.rgb, rgb) <= SAME_COLOUR; });
        if (mine.length) hit = nearestIn(mine, x, y);
        var chit = canvasNear(px, x, y, FAR_MATCHED, rgb);
        if (chit && (!hit || chit.d < hit.d)) hit = chit;
      }
      if (!hit) {
        limit = FAR_ANY;
        if (geom.length) hit = nearestIn(geom, x, y);
        var cany = canvasNear(px, x, y, FAR_ANY, null);
        if (cany && (!hit || cany.d < hit.d)) hit = cany;
      }
      if (!hit || hit.d <= ON_IT || hit.d > limit) return;
      d.fx_anchor = hit.x; d.fy_anchor = hit.y;
      if (d.ax != null) { d.ax = hit.x; d.ay = hit.y; }
    });
  }

  /* ── placement ──────────────────────────────────────────────────────────── */
  var SLOTS = 12;
  var RING_PX = 42;          /* first ring, in screen pixels */
  var RING_STEP_PX = 30;     /* extra ring for each label sharing one anchor */
  var GOOD_ENOUGH = 2;       /* clearance at which a position is left alone */

  function solve(nodes, cfg) {
    cfg = cfg || {};
    if (!nodes || !nodes.length) return;
    solveCount++;

    var wOf = cfg.w || function (d) { return d.lw || 60; };
    var hOf = cfg.h || function () { return cfg.labelHeight || 16; };
    var anchorOf = cfg.anchor || function (d) {
      return { x: d.fx_anchor != null ? d.fx_anchor : d.x, y: d.fy_anchor != null ? d.fy_anchor : d.y };
    };
    /* Bounds may be given per label, not just per figure. Fig 7.7 draws three
       panels side by side into one svg, and with a single set of bounds its six
       labels were free to wander across the whole thing: each panel's D and S
       had settled inside the panel to its right, with a leader crossing the
       divider to reach the curve it named. A bounds function is called with
       the node, so a figure that ignores the argument is unaffected. */
    var boundsFn = typeof cfg.bounds === "function" ? cfg.bounds : null;
    var b = boundsFn ? boundsFn() : cfg.bounds;
    if (!b) b = { x0: 0, y0: 0, x1: cfg.width || 1000, y1: cfg.height || 1000 };
    function boundsFor(d) {
      if (!boundsFn) return b;
      var nb = boundsFn(d);
      return nb || b;
    }
    var centred = cfg.origin === "center";
    var upx = unitPx(cfg) || 1;

    var px = null;
    if (cfg.canvas) {
      px = readCanvas(typeof cfg.canvas === "function" ? cfg.canvas() : cfg.canvas, b.x1, b.y1);
    }

    /* the leader has to arrive, so fix the anchors before using them */
    if (cfg.snap !== false) { try { snapAnchors(nodes, cfg, upx, px); } catch (e) {} }

    var grid = new Grid(b.x0 - 40, b.y0 - 40, b.x1 + 40, b.y1 + 40);
    sampleInk(grid, cfg.svg);
    if (px) sampleCanvas(grid, px);
    if (cfg.obstacles) cfg.obstacles.forEach(function (p) { grid.mark(p[0], p[1]); });

    /* an anchor is a fixed point no label may cover */
    nodes.forEach(function (d) {
      var a = anchorOf(d);
      grid.markRect(a.x - 4, a.y - 4, 8, 8);
    });

    /* labels sharing an anchor go on separate rings, or they spend the whole
       time shoving each other off the same twelve places */
    var ring = RING_PX / upx, step = RING_STEP_PX / upx;
    var claimed = [];
    nodes.forEach(function (d) {
      var a = anchorOf(d), share = 0;
      claimed.forEach(function (c) { if (Math.hypot(c[0] - a.x, c[1] - a.y) < 12 / upx) share++; });
      d._ring = ring + share * step;
      claimed.push([a.x, a.y]);
    });

    var placed = [];
    nodes.forEach(function (d) {
      var a = anchorOf(d), w = wOf(d), h = hOf(d);
      var want = cfg.prefer && cfg.prefer(d);
      var nb = boundsFor(d);
      /* remembered so the figure's own clamp keeps it in the same panel */
      d._b = nb;

      /* A figure can pin a label outright with fx/fy, the same convention the
         force simulation used. Week 3's SE and IE sit under brackets of their
         own at a known spot; searching for somewhere better only floats them
         off the bracket they belong to. A pin is honoured exactly, and since
         these are pinned onto their own anchor the leader collapses to
         nothing, which is the intended look. */
      if (d.fx != null && d.fy != null) {
        d.x = d.fx; d.y = d.fy;
        d.vx = 0; d.vy = 0;
        var px = centred ? d.x - w / 2 : d.x, py = centred ? d.y - h / 2 : d.y;
        placed.push({ x: px, y: py, w: w, h: h });
        grid.markRect(px, py, w, h);
        return;
      }

      function boxAt(slot) {
        var ang = (Math.PI * 2 / SLOTS) * slot;
        return { x: a.x + Math.cos(ang) * d._ring - w / 2,
                 y: a.y - Math.sin(ang) * d._ring - h / 2, w: w, h: h };
      }
      function scoreBox(box) {
        var sc = grid.clearance(box.x, box.y, box.w, box.h);
        if (box.x < nb.x0 || box.y < nb.y0 || box.x + box.w > nb.x1 || box.y + box.h > nb.y1) sc -= 40;
        for (var i = 0; i < placed.length; i++) {
          var p = placed[i];
          if (!(box.x + box.w + 3 <= p.x || p.x + p.w + 3 <= box.x ||
                box.y + box.h + 3 <= p.y || p.y + p.h + 3 <= box.y)) sc -= 30;
        }
        return sc;
      }
      function scoreOf(slot) {
        var box = boxAt(slot);
        return { slot: slot, sc: scoreBox(box), box: box };
      }

      var pick;
      if (d._slot == null) {
        /* first sight of this label: any of the twelve is fair game, and a
           figure that asked for a particular offset gets first refusal */
        pick = scoreOf(0);
        for (var i = 1; i < SLOTS; i++) { var c = scoreOf(i); if (c.sc > pick.sc) pick = c; }
        if (want) {
          var wbox = { x: a.x + want.x, y: a.y + want.y, w: w, h: h };
          if (scoreBox(wbox) + 3 > pick.sc) pick = { slot: null, sc: scoreBox(wbox), box: wbox };
        }
      } else {
        var here = scoreOf(d._slot);
        if (here.sc >= GOOD_ENOUGH) {
          pick = here;                       /* still fine: do not touch it */
        } else {
          /* spoiled, so step one notch, to whichever side is better. Never
             across the anchor: that is what stops the label teleporting. */
          pick = here;
          var l = scoreOf((d._slot + SLOTS - 1) % SLOTS);
          var r = scoreOf((d._slot + 1) % SLOTS);
          if (l.sc > pick.sc) pick = l;
          if (r.sc > pick.sc) pick = r;
        }
      }

      /* An anchor hard against the edge can leave every position partly
         outside. Something has to be chosen, so clamp it back in or the label
         is simply cut off. */
      var bx = Math.max(nb.x0, Math.min(nb.x1 - w, pick.box.x));
      var by = Math.max(nb.y0, Math.min(nb.y1 - h, pick.box.y));
      if (pick.slot != null) d._slot = pick.slot;

      placed.push({ x: bx, y: by, w: w, h: h });
      grid.markRect(bx, by, w, h);
      if (centred) { d.x = bx + w / 2; d.y = by + h / 2; }
      else { d.x = bx; d.y = by; }
      d.vx = 0; d.vy = 0;
    });
  }

  var busy = false;
  var solveCount = 0;

  /* Called from a figure's own repaint, once the curves for this frame are
     drawn. Skipped while settle() is already solving, so one redraw never
     costs two solves. */
  function reflow(nodes, cfg) {
    if (busy || !nodes || !cfg) return;
    try { solve(nodes, cfg); } catch (e) {}
  }

  /* ── keeping up with the figure ─────────────────────────────────────────
     A figure moves its anchors when its slider moves, and something then has
     to re-place the labels. Most figures call back into here from their own
     redraw, but not all of them did, and the ones that did not looked fine
     until you moved the slider: the curves swept away and the labels sat
     exactly where they had first been put, with their leaders pointing at
     where the curve used to be. Eight figures were in that state.

     Rather than rely on every figure to remember, watch the anchors. Once a
     frame, cheaply, ask each label layer whether any anchor or any label width
     has changed since it was last placed; only then is anything re-solved. A
     figure at rest costs one string comparison per frame, and a figure being
     dragged is re-placed exactly once per frame it actually changed. */
  var watched = [];
  var ticking = false;

  /* An anchor moving is not the only reason to think again. A slider can leave
     every anchor exactly where it was and still sweep a curve straight under a
     label: week 3's income slider moves the budget line while the expansion
     path it labels stays put. Watching the ink for that would mean re-reading
     every curve every frame. Watching for the input that caused it costs
     nothing, so any interaction with the page marks every visible figure as
     worth re-placing once. */
  var inputSeq = 0;
  if (typeof document !== "undefined" && document.addEventListener) {
    ["input", "change", "pointerup", "keyup"].forEach(function (ev) {
      document.addEventListener(ev, function () { inputSeq++; }, true);
    });
  }

  function signature(nodes) {
    var s = '';
    for (var i = 0; i < nodes.length; i++) {
      var d = nodes[i];
      s += (d.fx_anchor | 0) + ',' + (d.fy_anchor | 0) + ',' + (d.lw | 0) + ',' +
           (d.fx == null ? 'f' : d.fx | 0) + ';';
    }
    return s;
  }

  function onScreen(cfg) {
    var el = rootSvg(cfg && cfg.svg);
    if (!el) return true;                 /* nothing to go on: assume it is */
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return r.bottom > -400 && r.top < (window.innerHeight || 800) + 400;
  }

  function frame() {
    for (var i = 0; i < watched.length; i++) {
      var sim = watched[i];
      var nodes = sim.nodes();
      if (!nodes || !nodes.length) continue;
      var sig = signature(nodes);
      if (sig === sim._sig && sim._seq === inputSeq) continue;
      /* Out of view: leave the signature alone rather than recording it, or a
         figure that changed while scrolled past would be considered settled
         and would never be re-placed once the reader reached it. */
      if (!onScreen(sim._cfg)) continue;
      sim._sig = sig;
      sim._seq = inputSeq;
      /* A page whose own tick handler re-solves is left to do it: calling
         settle as well would place everything twice for one frame. Which
         shape this figure is only has to be worked out once. */
      if (sim._selfSolves === undefined) {
        var n0 = solveCount;
        sim.emit();
        sim._selfSolves = solveCount > n0;
        if (!sim._selfSolves) sim.settle();
      } else if (sim._selfSolves) {
        sim.emit();
      } else {
        sim.settle();
      }
      sim._sig = signature(nodes);
    }
    requestAnimationFrame(frame);
  }

  function watch(sim) {
    if (!sim || sim._watched) return;
    sim._watched = true;
    watched.push(sim);
    if (!ticking && typeof requestAnimationFrame === 'function') {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  /* ── a stand-in for the force simulation the pages used to build ────────── */
  /* Same surface the figures call, so their draw code does not change: on,
     alpha, alphaTarget, restart, stop, nodes. Every one of those that used to
     wake the physics now just re-solves and repaints, once. */
  function staticSim(nodes, cfg) {
    var handlers = { tick: [], end: [] };
    var sim = {
      _static: true,
      _nodes: nodes,
      _cfg: cfg || {},
      nodes: function (n) { if (!arguments.length) return nodes; nodes = n; return sim; },
      force: function () { return sim; },
      alpha: function () { return sim; },
      alphaTarget: function () { return sim; },
      alphaDecay: function () { return sim; },
      velocityDecay: function () { return sim; },
      stop: function () { return sim; },
      tick: function () { sim.settle(); return sim; },
      restart: function () { sim.settle(); return sim; },
      on: function (name, fn) {
        var key = String(name).split('.')[0];
        if (!handlers[key]) handlers[key] = [];
        if (fn) { handlers[key].push(fn); if (key === 'tick') { sim.settle(); watch(sim); } }
        return sim;
      },
      /* run the figure's own repaint without solving first */
      emit: function () {
        handlers.tick.forEach(function (f) { try { f(); } catch (e) {} });
        handlers.end.forEach(function (f) { try { f(); } catch (e) {} });
        return sim;
      },
      settle: function () {
        busy = true;
        try { solve(nodes, sim._cfg); } catch (e) {}
        busy = false;
        return sim.emit();
      }
    };
    return sim;
  }

  window.EC224Place = { solve: solve, reflow: reflow, staticSim: staticSim, watch: watch,
                       labelSize: labelSize, tickSize: tickSize, haloFont: haloFont,
                       Grid: Grid, sampleInk: sampleInk, sampleCanvas: sampleCanvas };
})();
