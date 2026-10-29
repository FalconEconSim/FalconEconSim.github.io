# Predict-then-see kit

Shared engine for the course's "Predict, then see" figure pages (`lab/predict/weekN/`). Extracted
from `lab/week11/v5` and hardened while building week 2. A week page defines only its figures:
model, question, guess input, answer, explanation, randomizer, explore controls. Everything else
(layout, type scale, the predict / reveal / verdict / explore / try-again flow, scoring tiers,
tally and streak, SVG helpers, label collision avoidance, draggable handles with snapping,
tap-to-place, freehand draw, touch / scroll handling, keyboard, reduced motion, film-style reveal
timelines) lives here.

Plain HTML/CSS/JS, no build step, no dependencies. Load order on a week page:

```html
<link rel="stylesheet" href="../kit/kit.css">
...
<nav class="board" aria-label="Figures" data-kit-board></nav>   <!-- figure index, filled by the kit -->
<main><section id="f21"></section> ...</main>
<script src="../kit/kit.js"></script>
<script src="models.js"></script>   <!-- pure economics, UMD, also loaded by verify.js in node -->
<script src="figs.js"></script>     <!-- the figure specs: window.WNFIGS = [...] -->
<script>Kit.mount(window.WNFIGS, { store: 'ec224-wN-predict' });</script>
```

`lab/predict/week2/` is the reference week: read its `figs.js` next to this file.

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
| `score(p, g, sol)` | `{ total: 0..100, ... }` (unless the spec has its own `score(f)`) |

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
  kstart: function (f, x) { return y; },      // keyboard start line
  check: function (f) { return f.coverage('curve') >= 0.45 || 'Keep going'; } }
```

- `place` with a `key` stores `f.g[key] = {x, y}` and the kit adds a plum handle for it, so
  placed points can be dragged. Use `place: fn(f, X, Y)` instead of `key` for custom storage.
- `draw` mode `'fn'` stores one y per bin over the x range (a curve y(x), drawn in any order,
  redrawable before reveal). Mode `'free'` stores raw points (L-shapes, vertical lines).
  Render it with `D.drawing(key)` (plum while predicting, a dashed ghost after).
- A step completes on pointer-up (or Enter / an arrow key on its handle) if `check` passes.

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
  grab / drop: function (f) { } }
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
| `D.drop(x, y, o)` | dashed guides to both axes (`o.x: false` / `o.y: false`) |
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
Rapid clicks step from the pending target, so values never drift. Buttons disable at min / max.

### Utilities

`Kit.C` palette (`blue orange green red gold purple grey ink soft plum paper` plus text-safe
`tBlue tOrange tGreen tRed tGold tPurple`), `Kit.num(v, dp)` (drops trailing zeros), `Kit.money`,
`Kit.esc`, `Kit.sub` (escape + subscripts), `Kit.rich` (subscripts only), `Kit.clamp`, `lerp`,
`ease`, `easeOut`, `seg`, `snapTo`, `tw` (label width estimate), `Kit.G` geometry (`clipSeg`,
`sample`, `nearest(px, py, pts, sx, sy)`, `cross(f, g, a, b)`, `bisect`), `Kit.Score` (`lin(e,
full, zero)`, `point`, `ratio`, `curve` chamfer score for drawings), `Kit.K` raw SVG strings.

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
  `.stage`, not the `<svg>`. A handle's custom `hit` area larger than 64px is still usable by
  mouse, but on touch only its 64px disc blocks scrolling: keep custom hit areas near the knob.
- Keyboard: arrows move the active handle (focus then sticks to it), Space cycles handles,
  Enter places or confirms. Give handles a `key(f, dx, dy)` when arrows should mean something
  other than x / y (rotations, sliding along a curve).
- Test hook: `Kit.mount` sets `window.__figs[key]` to each Figure, handy for scripts
  (`f.handles()`, `f.S`, `f.sol`, `f.reveal(false)`).
