# v5 "Predict, then see": notes

## Concept
Every figure is a question first. The graph opens partly drawn and the student commits a guess
ON the graph, always in plum (plum means "you" everywhere on the page):
- 11.1 tap where the market lands, tap where it should be, drag the gold tax handle.
- 11.2 drag the divider that splits the cleanup between Firm A and Firm B.
- 11.3 draw the MSB curve freehand (NYT "You Draw It"), then drag a marker to Q*.
- 11.4 drag two handles so a dashed line shows the three neighbors' combined MB.
- 11.5 drag two markers on rails under the axis: where pollution ends if the factory owns the
  right (starts at Smax) and if the neighbor does (starts at 0).

"Reveal the answer" runs a film-style timeline (curves draw in, points land with a small
overshoot, areas fade in, the tax/subsidy lifts the curve and the market slides to Q*, the
bargain slides both markers to S*). The guess stays as a dashed ghost. Then a big verdict
(Spot on / Very close / Good instinct / Now you know) with a 0 to 100 score that counts up, a
You vs Answer table, and 2 to 3 sentences of why with the round's numbers. Explore unlocks one
on-graph handle plus one big stepper or toggle. "Try a new one" draws new parameters. Per figure
tally (rounds, best, streak at 70+) is kept in localStorage and shown in the header board.
"Not sure? Just show me" reveals without a score.

## Files
- `models.js` pure economics (UMD, also loaded by node for verification). Defaults match
  week11-viz.html: 11.1 QE 45 / Q* 35 / DWL $100 / tax $20; 11.2 A 80, B 20, permit $160,
  $8,000 vs $12,500; 11.3 Q* 55, DWL $100; 11.5 S* 25, payments $625 to $1,875.
  11.4 is new: Ana/Ben/Cai MB = v(1 - G/10) with v = 160/120/80, light costs $180, sum $360,
  G* = 5, nobody buys alone (the site's 11.4 is a bar chart, the brief asks for vertical summation).
- `predict.js` engine: state to SVG string renderer, timeline + tween, pointer/touch/keyboard
  input, label Placer (collision-avoiding label placement), verdict and tally.
- `figs.js` the five figure specs. `style.css`, `index.html`.

## Verification
`scratchpad/v5work/verify.js` checks every randomized draw (20,000 per figure) against
independent numerics: bisection for intersections, brute-force grid minimum for the 11.2 split,
numerical integrals for DWL / abatement cost / Coase payments, Nash check for 11.4 voluntary
provision, frame fit, perfect guess scores 100, defaults match the site. All pass.

## Rounds
1. Built engine + five figures. Screens showed: SMC and tax lines had the wrong slope (end
   point bug), `[hidden]` overridden by `display:flex` (Try a new one visible too early), 11.3
   score ignored the drawing (bins not converted), stepper tweens drifting to 81.93 on double
   clicks, 11.2 knob sitting on a label, tax/subsidy labels colliding with lines and the Q* dot,
   11.5 tolerance too harsh.
2. Fixed all of the above. Added `Placer`: curves, dots, handles and placed labels register as
   obstacles; each label takes the first clear candidate. Sticky graph on desktop. Stress script
   (random rounds with wrong guesses, both widths, contact sheets) found: base curves missing when
   Reveal fired during the draw-in, tax handle on top of Q* for small Q*, label fallbacks
   overlapping other labels, ghosts vanishing the instant Explore unlocked.
3. Reveal forces base curves on; tax arrow position adapts to Q*; ring search fallback for
   labels and a 400 penalty for label-on-label; ghosts persist until the student first touches an
   Explore control; 11.5 explore starts at S* (where the film ended); 11.4 names sit on their
   lines and draws keep 40+ gaps; rail labels get halos; shorter crumb on phones.
4. Touch test (CDP touch events at 390px): swipe on a handle drags it and the page does not
   scroll; swipe on empty graph scrolls the page; tap places a point. Keyboard test: every
   figure can be completed with Tab / arrows / Enter. No console errors in any run.

## Known limits
- During a "tap to place" or "draw" step, a touch that starts inside the plot is captured
  (no scroll) by design; touches outside the plot, or on the plot in other steps, scroll.
- Labels are placed by a heuristic; with rare random draws a label can sit a little away from
  its curve or touch a dashed guide line.
- 11.5 randomization has only ~30 distinct parameter sets (kept to whole-number Smax, tidy S*).
- Freehand drawing on keyboard is approximated (arrow keys raise or lower a straight line).
- Explore steppers change one parameter; the verdict text stays about the round you guessed.
