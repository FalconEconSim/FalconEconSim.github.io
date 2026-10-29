# Week 3 on the kit: notes

Page: `index.html` (Demand Curves & Comparative Statics). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week3/verify.js` (20,000 draws for
3.3 to 3.5, 5,000 for the brute-force ones, float tolerance 1e-6; all pass) and
`node lab/predict/week3/interact.js` with the server on port 4383 (all pass).

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

## Known limits
- 3.3's inferior-good indifference curve is the page's stand-in (a parabola), not from a utility
  function; it is tangent and convex where drawn, and visibly close to the budget line.
- 3.3 inferior changes are small (0.05 per dollar: 1 to 2 units), so the direction carries the score.
- 3.4 has 25 fixed scenarios (no numbers randomized); shifts are scored on direction only.
- 3.2: below the price that puts B off the frame, the new-price stepper stops (B drag likewise).
- Labels are placed by the kit's heuristic; with rare draws a tag can sit a little away from its point.
