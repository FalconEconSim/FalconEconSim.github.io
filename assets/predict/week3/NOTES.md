# Week 3 on the kit: notes

Preview page: `lab/predict/week3/index.html`; live page `week3-viz.html`. This folder (`assets/predict/week3/`) holds models.js, figs.js, verify.js. Topic: Demand Curves & Comparative Statics. Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week3/verify.js` (20,000 draws for
3.3 to 3.5, 5,000 for the brute-force ones, float tolerance 1e-6; all pass) and
`PORT=4363 node lab/predict/week3/interact.js` (add `PAGE=week3-viz.html` to run it on the live page; all pass).

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 3.1 (film) | P_X falls from $6 to $2. Where does she end up, on both graphs? | tap her new best bundle in the top panel, then tap its point in the demand panel below | B = (15, 10); demand point 15 at $2 |
| 3.2 (film) | Split her move from A to B into SE and IE | drag the compensated line (new slope) in until it touches U1, then slide C along U1; live SE / IE arrows follow | income $42.43, C = (14.14, 7.07), SE +4.14, IE +5.86 |
| 3.3 | Her income rises to $120. Where do her bundle and her demand curve go? (normal or inferior, stated with its X* formula) | slide the new bundle along the new budget line, then drag the demand curve sideways | normal: (30, 20), D shifts right to 30 at $2 |
| 3.4 | One of the page's 25 scenarios. Show it on the graph | drag the dot along D (movement) or drag D by its own handle (shift); moving one resets the other | first round: a complement gets cheaper, D shifts right |
| 3.5 | P_Y rises from $4 to $6. Where does her demand curve for X go? | drag the demand curve sideways | substitutes: 12.5 -> 15.5 at P_X = $4, shifts right |

Explore: 3.1 drag the demand point up and down (or B sideways), P_X stepper; 3.2 drag B sideways, new
P_X stepper (rises flip both arrows); 3.3 income stepper, normal / inferior chips (expansion path and
demand shift update); 3.4 both handles free, readout says movement or shift; 3.5 P_Y and P_X steppers,
drag the point along the curve, substitutes / complements chips.

Scoring: 3.1 half bundle, half demand point. 3.2 half compensated income (log error), half C. 3.3 and
3.5 a wrong direction scores 0, the right direction earns 40 plus up to 60 for the size (relative to
the true change). 3.3 weights bundle 60, demand 40. 3.4: right kind 60, right direction 40 (for a
movement half of that is how close the new price is); the wrong kind scores 0.

## Decisions to know about
- Stacked panels (3.1, 3.3). The kit has one frame, so `stack()` in figs.js splits its 0..100 data
  space: choice panel on top, demand panel below, a gap for the top axis ticks, X shared so a bundle
  drops straight down onto its demand point (like the fig31 film). `dom.ys` is huge so the kit draws no
  y ticks; `stackAxes()` draws both panels' axes and hides the kit's y axis across the gap.
  Desktop aspect 1.1 (max 820px), phone 1.8.
- 3.1: the page's walk is $6, $4, $2, $1; the question is one step of it, $6 to $2. Faint ICs at 0.82
  and 1.22 of the new utility bracket the tangency (checked for every draw). Random rounds include
  price rises.
- 3.2: textbook (Hicks) construction and the page's lettering, kept on purpose: A, then compensated C
  on the original U1 at the new slope, then B; SE = A to C, IE = C to B. Matches the page's computeV2
  at a = 0.5 over its whole slider (checked); random rounds also vary a (0.4 to 0.6), income, P_Y and
  include price rises. Colors follow the fig32 film (original budget blue, new orange, compensated
  dashed purple). On phones the "total" tag is left off the graph (it collided); it is in the verdict
  and readout.
- 3.3: the page's models: normal X* = 0.5 I / P_X (Cobb-Douglas, IC XY = const), inferior
  X* = 20 - 0.05 I with the page's convex stand-in IC tangent at the bundle (verify.js checks the
  tangency and that no affordable bundle on it beats B). P_X = $2, P_Y = $3 fixed as on the page. The
  frame depends only on the type, so every income from $40 to $160 fits; switching type rescales.
- 3.4: the page's 25 scenarios and answer key (verify.js checks the key in order). Small wording
  changes so each has a definite answer on the graph: "(X is a normal good)" on the income ones, the
  tax and subsidy say the price change ($4 to $6, $4 to $3). Demand curve Q = 24 - 2P_X; shifts start
  at $4 and the reveal slides the curve 6 units. The page's drill has no graph or default; the first
  round here is "The price of a complement good falls."
- 3.5: the page's share model s = 0.5 +/- 0.06 (P_Y - 4) is given in the setup so the size of the
  shift can be worked out; verify.js checks it against the page formula.
- Keyboard: in two-handle steps (3.2, 3.3) the new step's handle is listed first, so keyboard focus
  moves to it after Enter (the kit keeps focus on handle index 0 once arrows were used).

## Rounds
1. Built all five. Screens at 1440 and 390: "price-consumption curve" label fell into the demand
   panel, the demand formula label collided with X*, tick labels crossed by drop lines, HTML
   `P<sub>X</sub>` leaking into SVG labels in 3.3 / 3.5.
2. verify.js (first run) found frames whose ticks did not divide, 3.3 bundles near the frame edge at
   I = $160, and draws whose change was too small to tell from "no change" (staying at A scored 70+).
   Fixed in models (minimum price ratios, tick-aligned frames, wider frames). Interaction suite found
   keyboard focus stuck on the first handle in 3.2 / 3.3 (fixed by handle order).
3. Phone screens: 3.3's demand-curve label landed in the top panel (demand values above the price
   frame now become gaps), SE / IE labels overlapped on phones (now pinned, IE steps up a row when they
   would touch), the total tag collided. Formulas no longer wrap at their minus signs. Final runs:
   zero console errors at 1440 / 390, with and without reduced motion.

## Switchover round (Nov 2026): Naveen's rules and the live page

Naveen on 3.1: "they should be able to pull the IC's so that they can see where the IC is tangent to the
budget line and find the exact point of optimum"; 3.3: "similar to 3.1". Per figure:

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 3.1 | `coords: false` removed. Per-panel tags: the placed bundle "X = 15.0, Y = 10.0" + "U = 12.25, costs $60" (U and cost at the new price), the demand point "X = 15.0, P_X = $2.00"; Explore: demand point "P_X = $2.00 / X* = 15.00", B "X* = 15.00, Y* = 10.00 / P_X = $2.00" (the static X* label hides while either moves). Fallback `coords` = `stackCoords` maps frame y back to the panel under it | top panel: X, Y, U and cost at the new price, always (what she computes by hand; as 2.5); demand panel: X and P_X, plus "spends $30 on X" in Explore only (in the question it would hand over X = k / P); nothing in the gap | **yes**: `pull31` (Kit.pull with `ty` / `iy` / `X` / `Y` for the top panel), Cobb-Douglas IC, starts at 0.72 U1 (cuts the new line), range 0.3 to 1.9 U1, step a power of ten near U1/40; setup and step 1 say to pull it until it just touches, then tap | no |
| 3.2 | compensated line knob: "income $42.25 / at P_X = $1.50"; C on U1: "X = 14.15, Y = 7.07 / SE +4.15, IE +5.85"; Explore B: "new P_X = $1.50, X_B = 20.00 / SE, IE" | U always; cost at the new prices **Explore only** (the cheapest point of U1 at the new prices IS the compensated income asked for) | not added: the student already pulls the compensated line (an iso-expenditure line with its income in its tag) to tangency with the fixed U1, which is the same tool the other way round | no |
| 3.3 | `coords: false` removed. Bundle on the new line "X = 30.0, Y = 20.00"; demand curve grip "X = 30.0 at P_X = $2" | top panel: X, Y and cost (2X + 3Y), always (every bundle on the orange line costs the new income, so nothing leaks); demand panel: X and P_X | **yes**: `pull33`, starts at 0.75 I1, range 0.4 to 1.8 I1, step $1, knob starts low on the right (away from the plum point). The level is "costs at least $L": the least income that reaches that curve at P_X = $2, P_Y = $3. Reason: the page's inferior-good curve is a stand-in with no utility function, so there is no U to show; the least cost is exact for both types (normal XY = L^2/24; inferior = the page's curve for income L) and verify.js checks it | no |
| 3.4 | dot "Q = 16.5, P_X = $3.75"; curve handle "shifted right 3 units" / "not shifted" (predict and Explore) | none: a straight demand line has no natural value at a point | no tangency | no |
| 3.5 | predict grip "X = 15.5 at P_X = $4.00" (the plum X label hides while it moves); Explore grip "P_X = $4.50 / X* = 13.78" (the X* and P_X labels hide while it moves) | none (no natural value) | no tangency | no |

Rule 4 (explore-first): none. Every week 3 question is a prediction (a new optimum, a decomposition, a
shift), not a value read along a curve.

models.js: `income.icL(type, L)` and `income.need(type, x, y)` (the 3.3 pull family and its inverse).
verify.js: new "3.1 pull" and "3.3 pull" blocks (start level cuts the line, the tangent level touches,
one step above misses, range spans the answer, 3.3 family nested, least cost of level L = L, need inverts
icL). lab/predict/week3/interact.js: port from env (default 4363), `PAGE` for the live page, pulls the knob
out of the way when it sits within 60px of the tap, scrolls figures below the sticky chrome on the live page.

Live page (`week3-viz.html`), built from the classic page (tag `classic-site-2026-11-07`):

```
node lab/predict/tools/build-live.js 3 sec-demand=f31 sec-slutsky=f32 sec-income=f33 sec-drill=f34 sec-cross=f35 \
  --edits lab/predict/week3/live-edits.json
```

No `--lede`: week 3's hero is `<p class="intro">` in `div.week-hero`, which the builder's lede regex does not
match, so the lede is the first edit in live-edits.json. The edits (13): the lede; section headings
`§ 3.N` + the classic figure titles for all five sections (the builder drops the top-level `.fig-hd` of 3.1,
3.2, 3.4 but keeps the ones inside `.fig-prose` in 3.3 and 3.5; now every section has the same sec-hd);
3.1's dead step-through player (narration box, Play / Back / Next / speed buttons, v1-* ids) removed and
the intro rewritten to point at Fig 3.1 and the pull curve; 3.2 "Use the slider"; 3.3 "Toggle between" and
its dead readout grid (v3-xstar, v3-ystar, v3-dxi, v3-shift); 3.4 "Read each scenario below" and the
empty `#drill-root`; 3.5 "Try this" and the "P_X slider" callout. No external links point into week3-viz.html
anchors (grep), so no `--keep-id`. The 3.1 and 3.2 films keep the site player. MathJax config and script are in
the page; week 3's prose has no TeX, so nothing to typeset. 105 KB -> 19 KB; 55 dead CSS rules dropped.
To regenerate live-edits.json after a builder change, the exact strings were cut from a build without
edits (see the round's scratch script); edit the JSON by hand otherwise.

Checks: verify.js (all pass), interact.js on the preview and on the live page (mouse 7 rounds per figure at
the exact answer, keyboard only, touch via CDP with scroll checks), loadcheck.js (both pages, zero errors, no
overflow), livecheck.js with the keyboard-tag figure switched from 2.3 to 3.5 (a scratch copy; the tool
hardcodes f23): rail, drawer, ask widget, touch scroll, every figure reveal / explore / new round at 1440 and
390. Screenshots at 1440 and 390 of hover, pull mid-drag, place / drag tags, revealed, explore drag, explore
hover, page top and section starts.

## Known limits
- 3.1 / 3.3 hover: the kit draws the hover guides to the frame's left and bottom edges, so a guide from the
  top panel runs down through the demand panel to its quantity axis (same X, so it reads as a drop line).
- Explore steppers do not refresh while an on-graph handle moves (kit behavior): after dragging 3.5's point
  the P_X stepper shows its old value until the next click.
- 3.3's inferior-good indifference curve is the page's stand-in (a parabola), not from a utility
  function; it is tangent and convex where drawn, and visibly close to the budget line.
- 3.3 inferior changes are small (0.05 per dollar: 1 to 2 units), so the direction carries the score.
- 3.4 has 25 fixed scenarios (no numbers randomized); shifts are scored on direction only.
- 3.2: below the price that puts B off the frame, the new-price stepper stops (B drag likewise).
- Labels are placed by the kit's heuristic; with rare draws a tag can sit a little away from its point.

## Kit-fix round (Nov 2026, after the switchover)

The live page was rebuilt with the command above after the builder change; its `.fig-hd` headings are now section headings (`§ N.M` + h2), as in weeks 2, 3 and 12, so the figure number no longer shows twice (the kit prints "Figure N.M"). The hand-made `§ 3.N` headings in live-edits.json are gone (the builder writes them now). 3.1 and 3.3 hover guides stop at the hovered panel's axes (`hover.guides`, `stackGuides`), which removes the first known limit; Explore steppers now follow an on-graph handle (kit), which removes the second.
