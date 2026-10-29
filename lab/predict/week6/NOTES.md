# Week 6 on the kit: notes

Page: `index.html` (Cost Theory). Engine: `../kit/` (README there), not edited. Economics:
`models.js`. Figures: `figs.js`. Checks: `node lab/predict/week6/verify.js` (20,000 draws for 6.1,
6.5, 6.8, 6.10; 5,000 for 6.2 and 6.6, which brute-force over grids; float tolerance 1e-6; all pass).
The interaction suite and screenshot scripts live in the scratchpad (`wk6/interact.js`, `snap.js`,
`guess.js`), not in the repo.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 6.1 | What is the cheapest way to make 3 units? (w = v = $4) | slide a point along the isoquant | L* = 3, K* = 3, TC* = $24 |
| 6.2 | What is the cheapest way to make 3 units, and what does it cost? | tap the bundle in the top (isoquant) panel, then drag the cost point in the bottom (TC) panel | (3, 3), TC $24; the TC curve is TC = 8q |
| 6.5 | TFC rises from $100 to $144. Where is the new minimum of ATC? | tap the point, drag to adjust | q = 12, ATC $24 (was q = 10, $20) |
| 6.6 (film) | Draw the LRAC when the firm can build any of these 4 plants | draw the curve freehand | the lower envelope of SRAC = 4q/K + 6K/q, K = 1..4; floor $9.80 at q = 1.22K, $12.40 at q = 10 |
| 6.8 | The minimum wage rises from $3 to $12. Where does the firm produce now, and what does it cost? | slide the bundle along the isoquant, then drag the new isocost's K-axis end (slope fixed at -w/v) | L 4 -> 2, K 4 -> 8, TC $24 -> $48, K/L 1 -> 4 |
| 6.10 | Where is this firm's efficient scale? (AC = q + 36/q) | slide a point along AC | q* = 6, min AC $12 |

Explore per figure: 6.1 drag a test bundle along the isoquant (its dashed isocost and cost vs the
minimum), wage and rental-rate steppers; 6.2 drag along the TC line (top panel shows that output's
isoquant, isocost and bundle), production-function chips (Cobb-Douglas, substitutes, complements, as
on the page); 6.5 drag the ATC minimum along SMC, which sets TFC = q^2; 6.6 plant-size stepper (1 to
8, the page's slider) and a point on the LRAC that names the cheapest plant; 6.8 wage and rental-rate
steppers (old isocost and bundle stay at the round's starting prices); 6.10 the page's AC presets as
chips (8 of the 10) and a point on AC with its MC.

Scoring: 6.1 log distance of L from L* (full within 4%, zero at a factor of 2); 6.2 half the
bundle (distance to the cheapest bundle, or to the whole isoquant when substitutes tie), half the
cost (full within 3%); 6.5 distance in frame units; 6.6 mean vertical miss over the envelope's range
as a share of the frame (full within 1%, zero at 6%), times coverage; 6.8 bundle 60 (log distance),
cost 40 (relative); 6.10 distance in q as a share of the frame.

## Decisions to know about
- 6.5 and 6.8 start with nothing changed on the page (TFC slider at its $100 base; wage slider at
  the $3 base). A question needs a change, so the first round uses one the page's own sliders allow:
  TFC to $144 (a perfect square, so the new minimum is a whole number, q = 12) and the wage to $12 (the
  slider's top; L and K halve and double exactly). Everything else is the page's model and numbers.
- 6.5: the y axis runs to $40 instead of the page's $80, so the curves fill the frame (the minimum
  ATC never passes $28 in any round). The page's "Show LRAC" toggle is left out here: Fig 6.6 is the
  LRAC figure, and in this cost family the flat LRAC would move with TFC, which reads as wrong in an
  explore that changes TFC. Random rounds use perfect-square TFCs from $25 to $196, rises and falls.
- 6.1: frame 0 to 10 for the default round (the page's 16 left the answer in a corner); random
  rounds pick 12 to 24 so the answer and the starting point fit. Random rounds use w and v with wv a
  perfect square and w != v (non-symmetric), so L* and K* are multiples of 0.25.
- 6.2: one SVG, two stacked panels (week 3's stack() approach): isoquants on top, TC below, one
  shared x scale (L on top, q below; they are different variables, and the setup says which is
  which). The page steps through q = 0.5 to 5; the reveal does the same, building the TC line point by
  point after the question's bundle. w and v vary in random rounds (the page fixes $4 / $4);
  substitutes with w = v (the page's own tie) appear only in Explore, where the whole isoquant is
  shaded as cheapest.
- 6.6: the default is the page's 4 plants and w = 4, v = 6; the frame (q to 10, AC to $20) matches
  the film. SRACs are the film's light orange, the LRAC blue. Random rounds vary w, v and the number
  of plants (3 to 6), keeping a visible rising tail past the biggest plant so a flat line through the
  minima does not score well (verify.js checks it stays under 75).
- 6.8: the page's base (w = v = $3, q = 4). Random rounds raise the wage by at least half, with v x w
  a perfect square both before and after, so bundles are multiples of 0.25, and K/L stays between
  0.25 and 6 so the tangency is readable. The reveal turns the old
  budget to the new slope (same dollars no longer reach the isoquant), then shifts it out to the
  tangency.
- 6.10: half the random rounds are the page's presets that have a minimum (classic, flatter, steep,
  fixed-cost heavy, cubic, textbook), half fresh U-shapes AC = aq + c + F/q with a whole-number q*.
  The presets with no minimum (constant, linear, economies, diseconomies) have no answer to predict,
  so they appear only as Explore chips (constant and linear are left out of the chips; economies and
  diseconomies make the same points).
- Keyboard: in the two-step figures (6.2, 6.8) the new step's handle is listed first once that step
  is current. Kit quirk (not fixed here, the kit is owned elsewhere this round): after Enter the kit
  keeps keyboard focus on handle index 0, so without this the arrows would keep moving step 1's
  handle. Same workaround as week 3.
- Stepper limits in 6.1 and 6.8 are ES5 getters on the control objects (`get min()`), so they follow
  the other stepper's value and keep the bundle and the isocost inside the frame.

## Rounds
1. Built all six. Desktop screens: 6.6 scored a near-perfect drawing 0 (the kit passes the solution
   as the model score's third argument and my score took a third argument for the plant count;
   fixed, and verify.js now calls score the way the kit does); 6.1 answer lost in a corner of the
   page's 16 x 16 frame; 6.2 ghost missing in Explore and "^" in an SVG label; 6.5 "ATC, TFC $144"
   label shown while ATC was still moving; 6.8 Explore moved the "old" isocost when v changed; a
   duplicated cost label in 6.1 Explore.
2. Adaptive 6.1 frame, fixes above. Phone screens: 6.5 guess coordinates collided with the SMC label
   (now a fixed plum readout in the corner, and SMC labeled on the empty left side); 6.6 "K =" prefix
   floated under the plant numbers (removed on phones); 6.10 Explore value label sat on the ghost.
3. Interaction suite (mouse, keyboard only for 6.8 including the second-step handle, CDP touch:
   scroll vs drag, taps in the stacked 6.2 panel, finger drawing in 6.6; 6 new rounds per figure; NaN
   scan; overflow at 1440 and 390): 54 of 54 pass, zero console errors. Random-round screens at 1440:
   6.8 draws with v = $1 squeezed the answer against the K axis (K/L 9), so random rounds now keep
   K/L between 0.25 and 6.
4. Final phone screens of 6.5, 6.6, 6.10 after the label fixes; verify.js at full size passes.

## Known limits
- 6.6 is a drawing: the score measures closeness to the envelope, not the shape words; a smooth curve
  through the minima loses only the bumps and the tail.
- 6.2's shared x scale means the top panel's L and the bottom panel's q line up only by coincidence
  (they do when w = v); the stacked layout is about the mapping bundle -> cost, not a shared axis.
- Labels are placed by the kit's deterministic heuristic; with rare draws a tag can sit a little away
  from its point, mostly on phones.
