# Week 6 on the kit: notes

Preview page: `lab/predict/week6/index.html`; live page `week6-viz.html`. This folder (`assets/predict/week6/`) holds models.js, figs.js, verify.js. Topic: Cost Theory. Engine: `../kit/` (README there), not edited. Economics:
`models.js`. Figures: `figs.js`. Checks: `node assets/predict/week6/verify.js` (20,000 draws for 6.1,
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

## Switchover round (Nov 2026): Naveen's rules and the live page

What changed per figure (lab/predict/SWITCHOVER.md rules 1 to 4):

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 6.1 | the point on the isoquant: "L = 1.40, K = 6.43" + "TC = $31.31" (question and Explore); the static "(1.2, 7.5)" label hides while it moves | **cost and output of any bundle, always**: "TC = $32.00, Q = 3.46" (the number a student works out by hand; the question is where it is lowest along one isoquant) | **yes: dashed isocost wL + vK = TC**, knob tag "TC = $30"; starts at 1.25 TC* (cuts the isoquant), range 0.35 to 2.2 TC* (capped so the line stays in the frame), $1 steps ($0.50 when TC* < $20); setup and prompt say to pull it in until it just touches | no |
| 6.2 | `coords: false` removed. A `coords` function maps the stacked frame back to each panel: top "L = 3.0, K = 3.0", bottom "q = 3.0, TC = $24.00", nothing in the gap. Handle tags: the bundle "L = 3.0, K = 3.0" + "TC = $24.00, Q = 3.00", the cost point "q = 3, TC = $24.00", the Explore point on the TC line "q = 4.5, TC = $36.00" + its bundle; the static labels hide while their handle moves | top panel: coordinates + "TC = $..., Q = ..." always; bottom panel: q and TC | **yes: the same isocost pull in the top panel** (`ty` / `iy` to the stacked frame, `X` / `Y` = the input box), in both predict steps; its level is the cost the second step asks for, so it is how a student finds that number | no |
| 6.5 | the placed point: "q = 12.0, ATC = $24.00"; the corner "you: q ..., $..." readout hides while it moves; Explore point on SMC: "TFC = $64.00" + "min ATC $16.00 at q = 8.0" | ATC, SMC, AVC and AFC at the pointer's q **for the curves on screen** (the old TFC while predicting, so it never shows the new ATC) | no tangency | no |
| 6.6 | Explore point on the LRAC: "q = 7.1, AC = $10.48" + "cheapest plant K = 4"; the static "K=4: $10.48" hides while it moves | pointer q and AC (rides on the pen while drawing on touch); the LRAC value and its plant, **Explore only** (in the question that is the drawing's answer) | no tangency (a drawing) | no |
| 6.8 | step 1 point: "L = 2.00, K = 8.00" + "TC = $48.00 at w = $12"; step 2 K-axis end: "TC = $48.00" + "K-axis end 16.00" (the dollar level of the student's own isocost); the static labels hide while they move | cost at the new wage and output of any bundle, always | **yes: the isocost at the new slope**, step 1 only (in step 2 the student's own isocost is the answer and its grip shows the dollar level the same way); starts at 1.25 TC1, knob starts lower right, away from the answer | no |
| 6.10 | predict: "q = 6.0" only (an AC value in the tag would let a slide find the minimum to the cent); Explore: "q = 9.0" + "AC = $13.00, MC = $18.00" | AC and MC at the pointer's q, **Explore only** | no tangency | considered: the question is to predict the minimum of a curve, not read a value printed along it, and the reveal's point (MC crosses AC there) needs the prediction first; stays a question |

Rule 4 (read-off figures become explore-first): none in week 6. Every question asks for a
prediction (a tangency, a shifted minimum, an envelope, a new tangency after a price change, a
minimum), not for a value read off a curve.

Shared helpers in figs.js: `isoPullLine(o)` (the pull for 6.1, 6.2, 6.8; range, start and step from
`W6.isoPull` in models.js, which verify.js checks for every random round: the range brackets TC*, the
start is above TC* on the dollar grid, every level in range still crosses the frame), `busy` (week 2's),
`costQ`, `m2` (fixed 2-decimal dollars so tags do not jitter).

Live page (`week6-viz.html`): built by `lab/predict/tools/build-live.js` from the classic page (tag
`classic-site-2026-11-07`), every figure section mapped, no ids kept (nothing in the repo links to
`week6-viz.html#...` beyond the section ids, which stay). Exact command:

```
node lab/predict/tools/build-live.js 6 sec-6-1=f61 sec-6-2=f62 sec-6-5=f65 sec-6-6=f66 sec-6-8=f68 sec-6-10=f610 \
  --edits lab/predict/week6/live-edits.json
```

No `--lede`: the classic week 6 header has no lede paragraph, so the lede is added by the first edit
(after the byline). The edits (`lab/predict/week6/live-edits.json`) rewrite the six intros that named
the old sliders, buttons, dropdown and toggles ("Show Optimal Bundle", "Step through", "Use the wage
slider below", "Toggle Show Marginal Cost"...), remove the empty 6.1 step-by-step box and the two empty
6.2 canvases that sat in the prose, give 6.6 back its "Fig 6.6" heading (the classic heading sat outside
the prose, so the builder dropped it with the stray headers), turn "the animation above" into "below"
(the film now follows the prose), and drop the CSS rules those removals left dead (the builder prunes
CSS before it applies edits). The 6.6 film keeps the site's player. 102 KB -> 15 KB.

Checks this round: verify.js passes (20,000 draws; new pull checks); loadcheck on the live and the
preview page (zero console errors, no failed requests, no overflow at 1440 and 390); livecheck with the
keyboard check pointed at 6.1 (rail anchors, nav drawer, ask widget, keyboard tag, touch swipe scroll,
every figure's skip / explore / new round at 1440 and 390; its one complaint, "f62 not exploring after
skip", is its 4.5 s wait against 6.2's 4.9 s reveal: 6.2 is in Explore a moment later); screenshot
rounds at 1440 and 390 (hover, drag tags, pulls, reveals, explore, page top, film section) on the
preview and the live page; keyboard only on 6.1, 6.2 and 6.8 (Space to the knob, arrows change TC,
Space back, step flow to Reveal).

## Known limits
- 6.2: the kit's hover guides run to the frame's bottom and left edge, so in the top panel the vertical
  guide continues through the gap and the cost panel (a kit limit for stacked frames).
- 6.6 is a drawing: the score measures closeness to the envelope, not the shape words; a smooth curve
  through the minima loses only the bumps and the tail.
- 6.2's shared x scale means the top panel's L and the bottom panel's q line up only by coincidence
  (they do when w = v); the stacked layout is about the mapping bundle -> cost, not a shared axis.
- Labels are placed by the kit's deterministic heuristic; with rare draws a tag can sit a little away
  from its point, mostly on phones.

## Kit-fix round (Nov 2026, after the switchover)

The live page was rebuilt with the command above after the builder change; its `.fig-hd` headings are now section headings (`§ N.M` + h2), as in weeks 2, 3 and 12, so the figure number no longer shows twice (the kit prints "Figure N.M"). live-edits.json lost the 6.6 heading edit and the three CSS edits (`.two-col`, `.v61-steps`, `canvas`): the builder prunes CSS again after the edits. 6.2 hover guides stop at the hovered panel's axes (`hover.guides`), which removes the first known limit.
