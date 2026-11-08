# Predict-then-see kit

Shared engine for the course's "Predict, then see" figures. Extracted from `lab/week11/v5` and
hardened while building week 2. A week defines only its figures: model, question, guess input,
answer, explanation, randomizer, explore controls. Everything else (layout, type scale, the
predict / reveal / verdict / explore / try-again flow, scoring tiers, tally and streak, SVG
helpers, label collision avoidance, draggable handles with snapping, tap-to-place, freehand draw,
live coordinate tags, the hover readout, pullable level curves, touch / scroll handling, keyboard,
reduced motion, film-style reveal timelines) lives here.

## Where things live (single source since the switchover, Nov 2026)

| path | what |
| --- | --- |
| `assets/predict/kit/kit.js` | the engine (this README) |
| `assets/predict/kit/kit.css` | figure styles, every rule scoped under `.kfig` (the class the kit puts on each figure root), tokens on `.kfig` too: safe to link from any site page |
| `assets/predict/kit/kit-page.css` | chrome of the standalone preview pages only (body, header, figure index, footer, `:root` tokens) |
| `assets/predict/kit/kit-site.css` | placement of kit figures inside the live site pages (`weekN-viz.html`): page grid, sticky offsets, heading weight |
| `assets/predict/weekN/` | that week's `models.js`, `figs.js`, `verify.js`, `NOTES.md` |
| `lab/predict/weekN/index.html` | the standalone preview page of week N (loads the files above) |
| `weekN-viz.html` | the live course page; see `lab/predict/SWITCHOVER.md`, "Integration pattern" |
| `lab/predict/tools/build-live.js` | builds a live page from the classic one (same document) |

Plain HTML/CSS/JS, no build step, no dependencies. Load order on a preview page
(`lab/predict/weekN/index.html`):

```html
<link rel="stylesheet" href="../../../assets/predict/kit/kit.css">
<link rel="stylesheet" href="../../../assets/predict/kit/kit-page.css">
...
<nav class="board" aria-label="Figures" data-kit-board></nav>   <!-- figure index, filled by the kit -->
<main><section id="f21"></section> ...</main>
<script src="../../../assets/predict/kit/kit.js"></script>
<script src="../../../assets/predict/weekN/models.js"></script>   <!-- pure economics, UMD, also loaded by verify.js in node -->
<script src="../../../assets/predict/weekN/figs.js"></script>     <!-- the figure specs: window.WNFIGS = [...] -->
<script>Kit.mount(window.WNFIGS, { store: 'ec224-wN-predict' });</script>
```

On a live page the same three scripts load from `assets/predict/...`, kit.css plus kit-site.css
replace kit.css plus kit-page.css, and the mount gets `films: false` (the page keeps the site's own
film player). `Kit.mount(specs, opts)` options: `store` (localStorage key for tallies, one per week),
`board` (selector of the figure index, default `[data-kit-board]`), `filmBase` (default
`../../../media/films/`), `films` (false: do not render `spec.film`).

`assets/predict/week2/` is the reference week: read its `figs.js` next to this file.

## The flow (what the kit does for every figure)

1. **Predict.** Question (big), setup paragraph, numbered steps. Each step is answered on the
   graph: `place` (tap a point, then drag to adjust), `drag` (move handles you define), or `draw`
   (freehand). "Reveal the answer" lights up when every step is done. "Not sure? Just show me"
   reveals without scoring.
2. **Reveal.** Your `reveal(f)` timeline runs (film-style: lines draw in, dots land with a small
   overshoot, areas fade). The student's guess stays as a dashed plum ghost.
3. **Verdict.** Headline by score (Spot on 90+, Very close 70+, Good instinct 45+, Now you
   know), a 0-100 score that counts up, a You vs Answer table, your 2-3 sentences of why.
4. **Explore.** Your declarative controls (stepper, segmented chips) plus any on-graph handles.
   The ghost disappears the first time the student touches an explore control.
5. **Try a new one.** `model.random()` draws new parameters; the base curves draw in again.
   Per-figure tally (rounds, best, streak at 70+) is kept in `localStorage[store]` and shown in
   the figure index.

## A figure spec

```js
{
  key: 'f23', num: '2.3', topic: 'The budget constraint', short: 'Budget line',   // short = index label
  model: M.budget,                 // see "Model" below
  axes: { xtitle: 'Good X', ytitle: 'Good Y' },  // or fn(f); also xfmt / yfmt (v => string), zero: false
  aspect: 0.8,                     // plot H/W on desktop (default 0.74); narrowAspect (1.02), maxH (640), extraBottom (px)
  film: { name: 'fig25-consumer-optimum', title: 'Watch first, 36 seconds', caption: '...', label: 'aria label' },  // optional
  question: 'Where does her budget line hit each axis?',   // string or fn(f); "P_X" -> P<sub>X</sub>
  setup: function (f) { return 'HTML ...'; },            // string or fn(f), raw HTML
  steps: [ ... ],                  // see "Steps"
  initGuess: function (f) { return { x: 10, y: 10 }; },   // -> f.g
  handles: function (f, S) { return [ ... ]; },           // see "Handles"; predict and explore both
  render: function (f, S, D) { ... },                     // draw with the Pen D, see "Drawing"
  reveal: function (f) { return [['ghost', 0, 400], ['line', 300, 1000]]; },   // timeline
  verdict: function (f) { return { rows: [['Label', 'you', 'answer']], why: 'HTML' }; },  // optional head, cheer
  score: function (f) { return { total: 0..100 }; },      // optional; default model.score(f.p, scoreInput(f) || f.g, f.sol)
  scoreInput: function (f) { ... },                       // optional
  kbdHint: 'Keyboard: ...',                                // optional screen-reader hint
  hover: { value: fn(f, x, y), label: 'U', dp, snap, when, text },   // optional hover readout, see "Hover readout"
  coords: false | { x, y, xdp, ydp, xfmt, yfmt } | fn(f, x, y, o),   // optional, live coordinate tags, see "Live coordinates"
  exploreFirst: true,                                     // optional: no question step, opens in Explore (rule 4)
  explore: {
    init: function (f) { f.ex.x = f.sol.xs; },            // optional, runs when the reveal ends
    hint: 'HTML',                                         // string or fn(f)
    controls: [ ... ],                                    // array or fn(f); see "Explore controls"
    readout: function (f) { return 'HTML'; },             // re-rendered on every change
    act: function (f, action, btn) { }                    // optional, for your own [data-act] buttons
  }
}
```

### Model

A plain object with pure functions (keep it in `models.js`, UMD, so `verify.js` can load it in node):

| function | returns |
| --- | --- |
| `defaults()` | parameters for the first round; must equal the site's `weekN-viz.html` defaults |
| `random(rng, prev)` | new valid parameters, different from `prev` (loop gen + valid, see week2/models.js `draw`) |
| `solve(p)` | the answer object -> `f.sol` |
| `domain(p)` | `{ X, Y, xs, ys }` plot ranges and tick steps -> `f.dom` (fixed for the round) |
| `score(p, g, sol)` | `{ total: 0..100, ... }` (unless the spec has its own `score(f)`). The kit calls `model.score(f.p, spec.scoreInput ? spec.scoreInput(f) : f.g, f.sol)`: the third argument is always the solved answer `f.sol`, so do not give `score` a third parameter of your own (optional settings, a tolerance); put those in `p` or close over them. |

### State on the figure `f`

`f.p` parameters, `f.p0` the round's starting copy, `f.sol` = `solve(p)`, `f.dom`, `f.g` the guess,
`f.ex` explore state, `f.result` the score object (null when skipped), `f.done[]`, `f.cur`.
Mode flags: `f.predicting`, `f.revealing`, `f.exploring`, `f.truth` (not predicting), `f.skipped`.

Progress helpers for render:
- `f.base()` draw-in progress of the base picture (0..1; animates on first view and on new rounds).
- `f.t('key')` progress of a reveal timeline key: 0 while predicting, the eased tween while
  revealing, 1 in explore. Use it for every truth element: `D.line(..., { pr: f.t('line') })`.
- `f.ghostOn()` true while the guess should show as a ghost; `f.gOp()` its opacity.
- `f.drawn(key)` a `draw` step's points as `[{x, y} | null]`; `f.coverage(key, a, b)` fraction filled.
- `f.resolve(rescale)` re-solve after changing `f.p` (the kit calls it after every explore change).
- `f.play(seq, done)`, `f.tween(from, to, ms, each(v, final), after)` for your own animations.

### Steps

```js
{ kind: 'place', key: 'pt', label: 'Her best bundle', prompt: 'Tap ...', snap: 0.1,
  kstart: function (f) { return { x, y }; },   // where Enter / arrows drop the point
  check: function (f) { return true | false | 'message shown in red' } }
{ kind: 'drag', label: '...', prompt: fn(f) or string, check: fn(f) }   // handles carry step: i
{ kind: 'draw', key: 'curve', bins: 48, mode: 'fn' | 'free', label, prompt,
  kstart: function (f, x) { return y; },      // keyboard start line ('fn' mode)
  kshapes: function (f) { return [[{x, y}, ...], ...]; },   // 'free' mode: keyboard sketches (see below)
  single: true,                               // 'free' mode: each new stroke replaces the drawing
  check: function (f) { return f.coverage('curve') >= 0.45 || 'Keep going'; } }
```

- `place` with a `key` stores `f.g[key] = {x, y}` and the kit adds a plum handle for it, so
  placed points can be dragged. Use `place: fn(f, X, Y)` instead of `key` for custom storage.
- `draw` mode `'fn'` stores one y per bin over the x range (a curve y(x), drawn in any order,
  redrawable before reveal). Mode `'free'` stores raw points (L-shapes, vertical lines).
  Render it with `D.drawing(key)` (plum while predicting, a dashed ghost after).
- A step completes on pointer-up (or Enter / an arrow key on its handle) if `check` passes.
- Keyboard and `free` drawings: a freehand stroke cannot be typed, so give the step `kshapes(f)`, a list of
  candidate sketches (arrays of `{x, y}`; an optional `.name` on each array is read to screen readers). Arrow
  keys cycle the sketches, Enter accepts. Without `kshapes` the keys do nothing on a free step (before, they
  wrote 'fn' bins into the free drawing and broke it). `coverage()` is for 'fn' mode only; check a free
  drawing's points yourself. Week 5 (5.10) uses both `kshapes` and `single`.

### Handles

Return them from `spec.handles(f, S)` for whatever mode you are in (check `f.predicting` /
`f.exploring`). Data coordinates; the kit converts.

```js
{ x: 20, y: 0,                 // data position (or px: [px, py] for off-plot rails)
  set: function (f, X, Y) { ... },   // pointer position in data units, clamped to the frame, snapped
  snap: 0.5 | { x: 0.5, y: 0 },     // snap before set
  step: 0,                     // which predict step this handle answers
  active: true,                // breathing ring: "move me"
  c: C.ink, grip: 'h' | 'v' | 'r',
  hit: function (pt) { return pixelDistance; },   // custom hit test (rails, axis handles)
  key: function (f, dx, dy) { ... },               // custom keyboard nudge (else arrows move x / y)
  kstep: 0.1 | { x, y },        // arrow-key step when there is no snap
  grab / drop: function (f) { },
  tag: false | 'text' | function (f, h) { },   // live coordinate tag (see "Live coordinates"); tagValue: false; tagColor: 2nd-line color
  tool: true }                  // set by Kit.pull: a helper knob, never a step answer
```

Constrain a handle to a curve inside `set` (see week2 `nearX`: nearest point measured in pixels,
so steep curves behave). Explore handles may change `f.p`; the kit re-solves.

### Drawing: the Pen `D` (`render(f, S, D)`)

`S` is the frame: `S.x(v)`, `S.y(v)` data -> px, `S.ix`, `S.iy` back, `S.X`, `S.Y`, `S.x0..S.x1`,
`S.y1..S.y0`, `S.W`, `S.H`, `S.narrow` (< 560px), sizes `S.fs` (curve names 20/18), `S.ls` (value
labels 19/17), `S.ss` (small tags 17/16).

All data-space. Every mark registers itself as an obstacle for labels; **labels are queued and
placed after everything else (including handles)**, so call order does not matter.

| call | what |
| --- | --- |
| `D.line(x1, y1, x2, y2, o)` | clipped segment; `o.pr` draw progress, `o.c`, `o.w` (4.5), `o.dash`, `o.op`, `o.layer`, `o.noclip`, `o.reg: false` |
| `D.fn(fn, a, b, o)` | y = fn(x); infinite / huge values become gaps; `o.pr` by length |
| `D.param(fn, t0, t1, o)` / `D.path(pts, o)` | parametric curve / data polyline (nulls split) |
| `D.area(pts, o)` | filled polygon (`fill`, `fo`, `op`), under layer |
| `D.dot(x, y, o)` | dot; `o.pr` makes it land with an overshoot |
| `D.ghost(x, y, o)` | dashed plum ghost of a guess |
| `D.drop(x, y, o)` | dashed guides to both axes (`o.x: false` / `o.y: false`; `o.reg: false` keeps them out of the label placer) |
| `D.arrow(...)`, `D.arrowP(...)`, `D.plineP(...)` | data / pixel arrow, pixel line |
| `D.text(px, py, s, o)` | raw pixel text, exactly there (`o.reg` registers it) |
| `D.label(s, cands, o)` | collision-avoiding label; `cands` = `[{x, y, anchor}]` pixels, best first |
| `D.near(x, y, s, o)` | label around a data point |
| `D.curveLabel(s, fn, fracs, o)` | label along y = fn(x) at fractions of the x range |
| `D.pathLabel(s, pts, fracs, o)` | label along any polyline (L-shapes, vertical lines) |
| `D.along(fn, xs, d, pref)`, `D.around(x, y, d)`, `D.aroundP(px, py, d)` | candidate lists |
| `D.xval(v, s, o)`, `D.yval(v, s, o)` | fixed value labels on the axes, placed first |
| `D.drawing(key)` | the student's freehand curve |
| `D.add(layer, svg)` | raw SVG into `under`, `curves` (clipped), `over` or `top` |

Label options: `c`, `size`, `weight`, `op`, `prio` (0 = place first), `fixed` (no search),
`ring` (max search radius, default 260), `anchor`. Text supports `P_X` subscripts.
Placed labels are clamped inside the frame horizontally.

### Explore controls

```js
controls: [
  { kind: 'stepper', label: 'P_X', get: f => f.p.Px, set: (f, v, final) => { f.p.Px = v; },
    step: 1, min: 1, max: 12, fmt: Kit.money, dur: 400 },
  { kind: 'seg', label: 'Her tastes', options: [['cobb', 'Cobb-Douglas'], ['subs', 'Substitutes']],
    get: f => f.p.type, set: (f, v) => { f.p.type = v; } }
]
```

Steppers tween: `set` runs every frame with in-between values and once more with `final = true`.
`min` and `max` may be numbers or `fn(f)`, read again on every click (bounds that depend on the round or on
another control). The steppers' values and disabled state are refreshed after each stepper / seg click and
whenever an on-graph Explore handle moves (drag or arrow keys); the clamp at click time uses the current bounds. A `controls` array built
by `fn(f)` is evaluated once per reveal (call `f.buildExplore()` from a seg's `set` to rebuild it).
Rapid clicks step from the pending target, so values never drift. Buttons disable at min / max.

### Utilities

`Kit.C` palette (`blue orange green red gold purple grey ink soft plum paper` plus text-safe
`tBlue tOrange tGreen tRed tGold tPurple`), `Kit.num(v, dp)` (drops trailing zeros), `Kit.money`,
`Kit.esc`, `Kit.sub` (escape + subscripts), `Kit.rich` (subscripts only), `Kit.clamp`, `lerp`,
`ease`, `easeOut`, `seg`, `snapTo`, `tw` (label width estimate), `Kit.G` geometry (`clipSeg`,
`sample`, `nearest(px, py, pts, sx, sy)`, `cross(f, g, a, b)`, `bisect`), `Kit.Score` (`lin(e,
full, zero)`, `point`, `ratio`, `curve` chamfer score for drawings), `Kit.K` raw SVG strings.

## Live coordinates on every handle (SWITCHOVER rule 1)

While a handle is dragged, slid, moved by the arrow keys, or hovered by the mouse, the kit shows a
tag beside it: a white pill with big bold text, "X = 4.0, Y = 6.5". It is automatic for every
handle that has data coordinates (`x`, `y`), in the question step and in Explore, and for a point
being placed by a `place` step. The tag sits beside the knob (never on it), stays inside the SVG,
dodges placed labels, dots and other knobs, prefers the side it used last frame (no flicker), and
on touch prefers the side above the finger. Screen readers hear the same text after each arrow key.

Default text, from the figure's axes:
- **Names.** `axes.xname` / `axes.yname` if given; else read from the axis title: the first
  stand-alone one- or two-letter token ('Good X' -> X, 'Quantity, q' -> q, 'K (capital)' -> K,
  'Output Q' -> Q, 'Total product TP' -> TP), a title with "price" -> P (or P_X for "Price of X"),
  'Quantity' -> Q, '$ per unit' -> P. Both names known: "Q = 40, P = $55.00"; otherwise "(40, $55.00)".
- **Money.** An axis title containing `$` (but not `$000`) formats as dollars (2 decimals when the
  precision is below 1).
- **Precision.** The handle's `snap` per axis (0.5 -> 1 decimal, 0.25 -> 2), else its `kstep`,
  else about 1% of the axis range. Fixed decimals ("4.0"), so the number does not jitter.
- **Axis grips.** `grip: 'h'` shows only x ("X = 20.0"), `grip: 'v'` only y; `grip: 'r'`
  (rotation) and handles placed by pixel (`px`) get no automatic tag.
- **Value line.** If the figure has a hover readout with a `value` (rule 2) and it is on, the
  tag gets a second line with that value ("U = 4.90"), except on grip handles or with
  `tagValue: false`.

Override per handle or per figure:

```js
{ x, y, set, ...,
  tag: false,                                   // no tag on this handle
  tag: 'slope -1.4',                            // fixed text
  tag: function (f, h) { return 'P_X = ' + Kit.money(f.p.Px) + '\nends at X = ' + Kit.num(f.sol.xI, 2); },   // '\n' = second line
  tagValue: false }                             // keep the coordinates, drop the value line

// figure level
axes: { xtitle: 'Quantity', ytitle: 'Price ($)', xname: 'Q', yname: 'P' },   // just set the names
coords: { x: 'L', y: 'K', xdp: 1, ydp: 1, xfmt: v => ..., yfmt: v => ..., xmoney: false, ymoney: true },
coords: function (f, x, y, o) { return '...'; },   // full control; o.only 'x'|'y', o.dx / o.dy decimals, o.h the handle
coords: false                                       // no automatic tags in this figure (custom tags still show)
```

Use `coords: false` (or a `coords` function) when one SVG holds several panels with their own
scales: the kit's data space is then the frame, not the economics (weeks 3.1, 3.3, 6.2, 7.7, 7.9
have `coords: false` until their tags are written; week 3 `stack()` is the pattern to map back).
`f.coordText(x, y, o)`, `f.valueText(x, y)` and `f.tagText(h)` give the same strings for readouts.
`Kit.fixed(v, dp)` is the fixed-decimals formatter, `Kit.dpOf(step)` the decimals of a step.
When a static label already shows the dragged number (week 2's "X = 20" end labels), hide that
label while the handle is busy: week 2 `busy(f, test)` reads `f.drag` and `f.kbd && f._kh`.

## Hover readout (SWITCHOVER rule 2)

```js
hover: {
  value: function (f, x, y) { return M.prefs.U(f.p, x, y); },   // number, or a ready string, or null (no value line)
  label: 'U',              // string or fn(f): "U = 4.90"
  dp: 2,                   // decimals of the value (default 2), or fmt: function (v, f) { return Kit.money(v); }
  snap: 0.1,               // the readout point snaps to this grid (number or {x, y}); default about 1% of each axis
  when: function (f) { return f.exploring; },   // optional gate; default: always except during the reveal
  text: function (f, x, y) { return '...'; },   // optional: the whole pill text ('\n' for two lines)
  at: function (f, x, y) { return [x, 0]; },    // optional: where the ring sits (a value of x only rides on the axis / a curve)
  guides: function (f, x, y) { return { x: 0, y: T.tl }; },   // optional: data x / y where the dashed guides stop (the
                                                // hovered panel's own axes when one frame holds several panels); false: none
  vc: C.tGold                                   // optional: color of the pill's second line (default blue)
}
hover: true                // coordinates only
```

Mouse: moving over the plot shows a ring at the (snapped) point, dashed guides to both axes and a
pill with "X = 4.0, Y = 6.5" and the value line. Over a handle the handle's own tag shows instead;
leaving the stage hides it. Touch: there is no hover, so the readout shows only while a finger is
already captured by the kit: drawing in a `draw` step (the readout rides on the pen), and placing
or dragging a point (its tag carries the value line). A touch that the kit does not capture still
scrolls the page; the hover adds no touch capture at all.

Do not leak the answer. A value that IS the asked-for number goes behind `when: f => f.exploring`
(week 2: cost on 2.3 / 2.4, U on 2.6 where the curves are hidden on purpose, MRS on 2.8). A value
the student would compute by hand on the way to the answer (utility on an IC map, cost of a
bundle) may show in the question step: that is what the professor asked for on 2.1.

## Pullable level curves (SWITCHOVER rule 3)

```js
var pullIC = Kit.pull({
  key: 'ic', name: 'U',                                             // f.lv.ic holds the state; the tag reads "U = 8.9"
  curve: function (f, U) { return function (x) { return M.optimum.ic(f.p, U, x); }; },   // the family, y = curve(level)(x)
  levelAt: function (f, x, y) { return M.util.cdU(f.p.a, x, y); },  // optional: the level through a point (else bisection on curve)
  range: function (f) { return [0.3 * f.sol.U, 1.9 * f.sol.U]; },  // levels it can take
  start: function (f) { return 0.72 * f.sol.U; },                  // first level each round (inside: it cuts the line)
  step: function (f) { return 0.1; },                               // level snap and arrow-key step (number or fn)
  active: true,               // breathing ring until first moved
  // optional: when (default f.predicting), label(f, L), dp, ray(f) -> [dx, dy] start direction of the knob,
  // origin(f) -> [x, y] ray origin, pts(f, L) -> [[x, y]|null] for families that are not y(x) (L-shaped
  // isoquants; give levelAt too), draw(f, S, D, L, pts) custom drawing, c / w / dash / op / tc look,
  // showLabel: false, change(f, L) callback, X(f) / Y(f) data extent, ty(f, y) / iy(f, Y) data <-> frame
  // y for stacked panels (the default drawing is then cut at the panel's edges, X(f) by Y(f)),
  // park(f, x, y) -> [x, y] | null: on release, if the knob sits on a spot the student must tap next (it was pulled
  // to the tangency), slide it along its own curve (same level) to where the ray through [x, y] meets it (week 9)
});
// in the spec
handles: function (f, S) { if (f.predicting) return [pullIC.handle(f, S)].filter(Boolean).concat(myHandles); ... },
render: function (f, S, D) { ...; if (f.predicting) pullIC.render(f, S, D); }
```

A plum dashed curve with a knob on it. Dragging the knob anywhere makes the curve pass through the
pointer (the level is `levelAt` of the pointer, snapped to `step`, kept in `range`), and the knob
stays under the finger: it sits where the curve meets the ray from the origin through the pointer.
Arrow keys step the level (Space selects the knob when other handles exist; a selected knob keeps
the arrows even during a tap step; Enter puts it down and hands the keys back to the current step). While it moves its tag shows "U = 8.9"; at rest a small label
does. It is a tool, not an answer: `step` is undefined, so it never completes a step and is never
scored; it disappears with the reveal (`when`). Accessors: `pullIC.level(f)`, `.moved(f)`,
`.set(f, L)`, `.label(f)`. Week 2 uses it on 2.5 (Cobb-Douglas IC vs budget line) and 2.10
(straight ICs vs the budget set, a corner). The start level should not leak the answer: start
inside (cutting the line) and keep `range` well beyond the answer on both sides.

## Explore-first figures (SWITCHOVER rule 4)

```js
{ key: 'f42', ..., exploreFirst: true,
  question: 'Slide the point along the demand curve: where is it elastic?',   // a heading, not a quiz
  steps: [],                                   // no predict steps
  verdict: function (f) { return { why: 'e_d = -bP/Q ...' }; },   // optional: only `why` is shown (no headline, score or table)
  explore: { init, hint, controls, readout } }  // the whole figure; handles come from spec.handles when f.exploring
```

Every round (first load and "Try a new one") opens straight in Explore with the truth drawn (`f.t(k)`
is 1), no ghost, no score, no tally. On first view the base picture draws in (`f.base()`) as in any
figure; an `explore.init` needs no workaround for it any more. Use it where the question would only be "read the value at a
point" (week 4's 4.2: slide along the demand curve and read the elasticity); put the value in the
handle's `tag` and the readout. Keep a light question instead only when it asks for more than the
reading. Record the change in the week's NOTES.md.

## Minimal example figure

```js
// models.js (UMD)
var line = {
  defaults: function () { return { I: 100, Px: 5 }; },
  random: function (rng, prev) { var p; do { p = { I: 40 + 10 * Math.floor(rng() * 17), Px: 2 + Math.floor(rng() * 9) }; } while (prev && p.I === prev.I && p.Px === prev.Px); return p; },
  solve: function (p) { return { xI: p.I / p.Px }; },
  domain: function () { return { X: 100, Y: 10, xs: 20, ys: 2 }; },
  score: function (p, g, s) { return { total: Math.round(100 * Kit.Score.lin(g.pt ? g.pt.x - s.xI : 99, 0.5, 15)) }; }
};

// figs.js
var fig = {
  key: 'fx', num: '9.9', topic: 'Example', short: 'Example', model: line,
  axes: { xtitle: 'Good X', ytitle: '' },
  question: 'How much X can she buy?',
  setup: function (f) { return 'Income ' + Kit.money(f.p.I) + ', P<sub>X</sub> = ' + Kit.money(f.p.Px) + '.'; },
  steps: [{ kind: 'place', key: 'pt', label: 'Her X', prompt: 'Tap the most X she can afford.' }],
  initGuess: function () { return { pt: null }; },
  render: function (f, S, D) {
    if (f.ghostOn() && f.g.pt) D.ghost(f.g.pt.x, 0);
    var t = f.t('ans');
    if (t > 0) { D.dot(f.sol.xI, 0, { pr: t }); D.xval(f.sol.xI, 'X = ' + Kit.num(f.sol.xI), { op: t }); }
  },
  reveal: function () { return [['ghost', 0, 300], ['ans', 200, 600]]; },
  verdict: function (f) { return { rows: [['X', f.g.pt ? Kit.num(f.g.pt.x) : '-', Kit.num(f.sol.xI)]], why: 'All income on X: I / P<sub>X</sub>.' }; },
  explore: { hint: 'Change the price.', controls: [{ kind: 'stepper', label: 'P_X', get: function (f) { return f.p.Px; }, set: function (f, v) { f.p.Px = v; }, step: 1, min: 2, max: 10, fmt: Kit.money }],
    readout: function (f) { return 'She can buy <b>' + Kit.num(f.sol.xI) + '</b>.'; } }
};
Kit.mount([fig], { store: 'example' });
```

## Gotchas

- `f.t(key)` is 0 while predicting: never use it for things that must show before the reveal.
  Use `f.base()` for the base picture and plain `f.predicting` branches for the guess.
- `domain(p)` is computed once per round. If an explore control can push the picture off the
  frame, clamp the control (or call `f.resolve(true)` to rescale, which makes axes jump).
- Handle `set(f, X, Y)` gets values already clamped to `[0, X] x [0, Y]`; handles on the axes need
  a `hit` that accepts touches slightly outside the plot (see week2 `endHandles`).
- `question`, step labels / prompts, hints, table row labels and seg option text are raw HTML with
  `_X` subscript shorthand: do not put untrusted text in them. SVG labels are escaped.
- Keep `models.js` free of DOM and of `Kit` (node loads it). Duplicate tiny helpers there.
- The kit stores tallies under `opts.store`; give every week its own key.
- Reduced motion: timelines and tweens jump to their end; nothing to do in specs.
- Touch: Chromium ignores `touch-action` on SVG children, and some touch paths fire no
  `touchstart`. The kit therefore lays HTML hit targets (`.k-hits > .k-hit`, `touch-action: none`)
  over every handle, and over the plot during place / draw steps. Pointer listeners live on the
  `.stage`, not the `<svg>`. A handle's custom `hit` area (a strip along a line or an axis) works in full
  for the mouse; on touch (and pen) the kit takes a press only within 44px of the knob, so a swipe across
  the plot still scrolls the page (week 11's own coarse-pointer test is gone). The hit targets are clipped
  to the plot (`.k-hits` overflow clip), so a knob at the plot's edge never makes the page scroll sideways.
- Keyboard: arrows move the active handle (focus then sticks to it), Space cycles handles,
  Enter places or confirms. Focus follows a step, not a list index: arrows keep moving the handle you are
  on even after they complete its step, and Enter then moves focus to the next step's handle as soon as it
  exists. When the next step has no handle yet (a place or draw step), arrows keep moving the finished
  handle and Enter hands the keys to the new step (so a drag step followed by a tap step no longer drops the
  point on the second arrow press). Any pointer press resets the keyboard pick to the active handle. Specs
  no longer need to list the new step's handle first (week 3 did, as a workaround; that order still works). Give handles a `key(f, dx, dy)` when arrows should mean something
  other than x / y (rotations, sliding along a curve).
- Embedding in a site page: kit.css is scoped to `.kfig`, but host pages also style bare elements
  (weekN-viz.html has global `table`, `th`, `td`, `* { margin: 0; padding: 0 }`, `h2` in the display
  weight with `!important`). The kit resets the verdict table itself and kit-site.css restores the
  question's weight; if a new kit element relies on a browser default, set it explicitly in kit.css.
  MathJax on the host page would read "$80 ... $5" in a setup as math: the figure's element carries
  `class="mathjax_ignore tex2jax_ignore"` (build-live.js writes it).
- Sticky offsets: `--kit-top` (on the figure or any ancestor) is the height of sticky chrome above
  the figure; the sticky plot and the "Try a new one" scroll stop below it (the scroll runs after the next
  layout and fires when the question's top is above `--kit-top`, also when a short page shrank under it).
  kit-site.css sets it, and on phones (<= 560px) puts the figure on a 16px gutter from the screen edge
  whatever padding the page's `<main>` has.
- Test hook: `Kit.mount` sets `window.__figs[key]` to each Figure, handy for scripts
  (`f.handles()`, `f.S`, `f.sol`, `f.reveal(false)`).

## Changelog

- Week 5 round (kit owner: the week 5 builder). All backward compatible; weeks 2, 3, 4 verify and load clean.
  1. Keyboard focus in multi-step figures follows the step (also fixes drag-then-place: arrows no longer drop
     the next step's point) (`f.kstep`, `P.focusStep`): Enter on a finished
     step moves focus to the newly activated step's handle; arrow presses that complete a step keep focus
     where it is (`completeStep(i, stay)`). Before, focus stayed on handle index 0.
  2. Free-mode drawings: `kshapes` keyboard sketches and the `single` stroke option (above).
  3. Stepper `min` / `max` accept `fn(f)`.
  4. `D.drop` honors `reg: false` (it always registered its guides before).
  5. Enter on a step whose check refuses keeps focus on the handle you were on (it used to jump to the
     step's first handle).
  6. `noAutoDone: true` on a handle still means arrows never complete its step; only Enter (or a pointer
     release) does. The focus fix above does not change that.
  7. kit.css: on narrow screens verdict table cells wrap instead of overflowing the panel.
  8. Documented the `model.score(p, g, sol)` call signature.
- Switchover round (Nov 2026, kit owner: the week 2 pilot). Backward compatible; weeks 2 to 12 verify and their
  preview pages load clean (zero console errors).
  1. Moved to `assets/predict/kit/` (from `lab/predict/kit/`); week files to `assets/predict/weekN/`.
  2. CSS split: kit.css is now scoped (`.kfig` root class instead of `.fig`, tokens on `.kfig`); the
     standalone page chrome moved to kit-page.css (preview pages link both); kit-site.css places figures
     in the live pages. A page style that targeted `#fNN.fig` must say `#fNN.kfig` (week 7 updated).
  3. Rule 1, live coordinate tags on every handle (`tag`, `tagValue`, `coords`, `axes.xname / yname`,
     `f.coordText`, `f.tagText`), also read to screen readers after each arrow key. On by default; figures
     with several panels in one frame (3.1, 3.3, 6.2, 7.7, 7.9) got `coords: false` until their tags exist.
  4. Rule 2, hover readout (`spec.hover`, `f.valueText`, `f.hoverPoint`), mouse hover plus touch while drawing.
  5. Rule 3, `Kit.pull(o)`: pullable level curve with a knob (`tool: true` handles: never a step, keep the
     arrows when picked with Space, never the default arrow target).
  6. `Kit.mount(..., { films: false })`; `--kit-top` sticky offset; `target()` returns the handle index;
     `Kit.fixed`, `Kit.dpOf`, `Kit.pill`, `Kit.axisInfo`; the verdict table resets host table styles.
  7. `exploreFirst: true` (rule 4): a figure that opens in Explore every round, no score; `verdict` optional.
- Kit-fix round (Nov 2026, after the switchover; one pass over the shared bugs the week agents had worked around).
  Backward compatible; weeks 2 to 12 verify, their preview and live pages load clean.
  1. Explore-first figures draw their base picture in on first view (the in-view observer only did it while
     predicting, so 4.2 and 5.3 opened blank). Their `explore.init` workarounds are gone.
  2. "Try a new one" scrolls the question back below `--kit-top` (read from the question's scroll-margin-top, after
     the next layout); before it only reacted to a question above 0. Week 9's `bindNewone` is gone.
  3. Touch: a custom `hit` (a strip) grabs only within 44px of the knob, so a swipe over the plot scrolls (week 11's
     coarse-pointer hits are gone). kit.css clips the hit-target layer to the plot (week 11's stage clip is gone).
  4. kit.css verdict table: cells wrap at spaces at every width and never inside a number (break-word, not anywhere):
     week 7's, week 9's and week 12's per-figure table rules are gone.
  5. `D.label(..., { prio: 0 })` really places first (`(o && o.prio) || 1` turned 0 into 1).
  6. The hover readout follows the mouse during and after a handle drag (it showed the pre-drag point on release).
  7. `hover.guides` (where the dashed guides stop, or false) and `hover.at` (where the ring sits); `hover.vc` and a
     handle's `tagColor` color the pill's second line. 3.1, 3.3 and 6.2 stop the guides at the hovered panel's
     axes; 7.7 and 7.9 too, so their hover now also works on narrow (stacked) layouts. Week 10 uses `at` on 10.2 and
     10.3 instead of a huge y snap.
  8. `Kit.pull`: with `ty` the default drawing is cut at the panel's edges; `park(f, x, y)` slides a released knob
     along its curve off a spot the student must tap next (week 9's hand-made `drop` now uses it); Enter on a picked
     knob puts it down and hands the keys back to the current step (week 10's "keyboard users get the knob alone" is
     gone; its kbdHint says Space, arrows, Enter).
  9. Explore steppers refresh while an on-graph handle moves (drag or keys), and a handle's own `key` in Explore now
     re-solves like a drag does.
  10. The screen-reader live region gets plain text: tags dropped and entities decoded (`&times;`, `&ge;`, `&lt;`
      were read out literally in the why text and the step prompts).
  11. kit-site.css: on phones the figure sits on a 16px gutter from the screen edge on every page (the -0.75rem bleed
      assumed week 2's `main.main-content` padding; weeks 4 to 12 have none, so plots started 4px from the edge).
      Weeks 10 and 12's page-style workarounds are gone.
