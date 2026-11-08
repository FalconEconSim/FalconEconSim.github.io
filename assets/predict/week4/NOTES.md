# Week 4 on the kit: notes

Preview page: `lab/predict/week4/index.html`; live page `week4-viz.html`. This folder (`assets/predict/week4/`) holds models.js, figs.js, verify.js. Topic: Elasticity & Consumer Welfare. Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week4/verify.js` (20,000
draws per figure, 5,000 for 4.6 which integrates numerically; all pass, float tolerance 1e-6).
Interaction suite and screenshot scripts live in the scratchpad (`w4work/interact.js`, `snap.js`,
`crop.js`), not in the repo.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 4.1 | Where on the curve does the point elasticity equal the arc elasticity from A to B? | slide C along the demand line | the midpoint M: P $32.50, Q 35, e_d = -1.86 (A $25, B $40 on Q = 100 - 2P) |
| 4.2 | Explore-first since the switchover (no question): slide the point along the demand curve, where is demand elastic, unit elastic, inelastic? | one point slides along the heat-colored line; its tag and the readout show P, Q, e_d and the region | unit elastic at P $25 (Q 50); opens at P $40, e_d = -4 |
| 4.3 | The price is $35. Would a cut raise or lower revenue? Drag to the revenue peak. (film on top) | slide the price along the curve; direction and distance both score | cut, to $25: TR $1,050 to $1,250 |
| 4.4 | Pharmaceuticals, price +10%: what happens to quantity and to revenue? | drag the %dQ bar, then the %dTR bar | %dQ -2.82%, exact %dTR +6.90% (shortcut +7%) |
| 4.6 | The price rises $15 to $25. Shade the consumer surplus buyers lose. | drag the right edge of a plum area along each price line | rectangle $700 + triangle $100 = $800 |
| 4.7 | At what surge fare does revenue peak, and where does it fall back to $150? | two points slid along the curve | peak $10 (TR $200); back to $150 at $15 |
| 4.8 | Build the market demand curve: start, kink, end. (film on top) | drag top end (price axis), kink, bottom end (quantity axis) | top $30, kink Q 18 at $12, Qm(0) = 54 |

Explore per figure: 4.1 drag A and B (arc always equals the point value at M); 4.2 drag a point over
the heat-colored curve; 4.3 drag the old and new price, green / red revenue strips; 4.4 industry
chips, %dP stepper and a draggable %dP bar, with the shortcut outline; 4.6 drag either price along
the curve, rectangle + triangle readout; 4.7 drag the fare, live revenue and riders' surplus; 4.8
drag the price on the vertical axis, Q1 and Q2 laid end to end.

## Decisions to know about
- 4.3: the site's default P_old = $25 is already the revenue peak, so the question starts from the
  site's P_new = $35. a = 100 as on the site; random rounds vary the slope b (1 to 5) and the start.
- 4.2 (until the switchover, now Explore-first): the site has no target elasticity; the second step added one (\|e_d\| = 3 on first load, then
  0.25, 0.5, 1.5, 2, 3 or 4). The heat colors are hidden while predicting (they would give the answer
  away) and paint down the line on reveal.
- 4.1: the site toggles arc / point mode; here the question is the link between them (on a straight
  line the arc value is the point value at the midpoint). The arc box is shaded as on the site.
- 4.4: constant-elasticity demand and the exact %dTR, as the site now shows. The frame grows per
  round (+-30, 40, 60 or 80%) so small changes are readable; random rounds keep both answers within
  85% of the frame and \|%dTR\| >= 1.5 so the direction matters. Answers scored on absolute
  percentage points (full marks within 1 point, zero at 12).
- 4.6: random rounds include price falls (about 30%), asking for the surplus gained; same geometry.
  Score is the area between your edge and the demand curve over the true area (full within 3%,
  zero at 25%), so forgetting the triangle costs real points.
- 4.7: the site is a slider with no question; this asks for the revenue peak and the second fare
  with the same revenue as the normal fare (TR is symmetric around the peak), and the verdict
  shows what riders lose there. Fares sweep in half-dollar steps during the reveal so every label
  is a real fare.
- 4.8: one P-Q plot instead of the site's three panels: both consumers' curves are on the same
  axes, so the horizontal sum can be drawn directly. Colors match the fig48 film (Consumer 1
  orange, Consumer 2 purple, market blue).
- Elasticity colors as on the site: red elastic, gold unit, blue inelastic (log scale).

## Rounds
1. Built all seven figures. Screens at 1440: 4.4 bars tiny on the fixed +-60% frame; reveal walks
   in 4.3 / 4.7 printed odd cents ($1,208.51); 4.7 TR label sat on the dashed normal-fare line;
   4.8 Consumer 2 green did not match the film's purple.
2. Adaptive 4.4 frame; half-dollar steps in reveal sweeps; in-rectangle labels now try several
   heights and avoid registered lines; film colors. Phone screens: labels in 4.1, 4.2, 4.8 drifted
   far from their points (the "inelastic" tag landed at the top of the plot): label search radii
   capped, shorter labels on narrow screens, 4.8's sum readout pinned top right on phones.
3. Interaction suite (mouse, keyboard only, CDP touch, 6 new rounds per figure, NaN scan) found that
   4.7's second handle appeared exactly on top of the first, so it could not be grabbed; it now
   starts at the normal fare.

## Switchover round (Nov 2026): Naveen's rules and the live page

Naveen's two week 4 comments were about this week directly: 4.2 ("instead of making it a question ... when the
point is slid on the demand curve then it shows the elasticity at each point") and 4.8 ("when a point is being
dragged the current coordinates of the point should be visible"). Per figure (lab/predict/SWITCHOVER.md rules):

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 4.1 | C: "C: Q = 41, P = $29.50" + "e_d = -1.44, elastic" (the number the student matches against the arc value they work out; the prompt says so); Explore A / B the same, their static e_d labels hide while the tag shows | coordinates (a point off the line has no elasticity) | no tangency | considered: the arc value is never shown before the reveal, so the student still has to compute it; stays a question |
| 4.2 | the slider point: "Q = 45, P = $27.50" + "e_d = -1.22, elastic"; the static e_d label hides while the tag shows | coordinates | no | **yes: Explore-first** (Naveen's request). No question, steps, score or tally; opens with the point at 0.8 of the choke price (default P $40, e_d = -4), heat line, unit-elastic midpoint and the elastic / inelastic labels drawn; the readout names the region and where it sits relative to the midpoint. The old second question (\|e_d\| = k) is gone: with the value shown live it would be a pure read-off; the verdict text keeps the formula P = k/(1 + k) &times; a/b |
| 4.3 | the guess and Explore old / new: "Q = 30, P = $35.00" + "TR = P &times; Q = $1,050"; the static price labels hide while their tag shows | P &times; Q of the point under the pointer (the area of its rectangle), always, like U and cost on week 2's 2.5: revenue is what a student computes by hand on the way | considered (iso-revenue hyperbola PQ = TR tangent to demand at the peak) and not added: the course frames revenue with the rectangle, not iso-revenue curves, and the TR in the tag already tells the student when to stop | no |
| 4.4 | the bars were tagged in frame units (y = percent + half-height): now "%&Delta;Q = -8.0%", "%&Delta;TR = +5.0%"; Explore %&Delta;P bar: "%&Delta;P = +20%" + "%&Delta;Q -5.32%, %&Delta;TR +13.61%"; the static bar values hide while the tag shows | none (a bar chart: no point value) | no | no |
| 4.6 | edges: "Q = 92.0 at P = $15.00" + "shaded $795" (the student's own area, not the answer); Explore prices: "after: Q = 76, P = $22.00" + "CS = $1,444"; the static "before / after" label hides while its tag shows | coordinates | no | no |
| 4.7 | both guesses and Explore: "fare $9.00, 22 rides" + "TR = $198"; the static "peak? / back?" labels hide while the tag shows | fare &times; rides of the point under the pointer, always; coordinates read "rides = 20, fare = $10.00" | no (see 4.3) | no |
| 4.8 | **Naveen's comment**: "start: Q = 0, P = $28.00", "kink: Q = 20.0, P = $13.00", "end: Q = 51.0, P = $0" (snap $0.50 / 0.5 unit); Explore price grip: "P = $7.00" + "Q_1 + Q_2 = 23 + 10 = 33" | coordinates always (snapped to 0.5); Q_1 + Q_2 at the pointer's price **Explore only** (in the question it is the answer) | no | no (a construction, not a read-off) |

Also: quantities in tags and the 4.8 sums now print to 2 decimals (with b = 0.5 and $0.50 steps a
quantity can be 12.25; the old 1-decimal sum read "12.3 + 12.3 = 24.5"). Elasticity text comes from
`W4.util.eText` / `zone` in models.js: 2 decimals, but never a "-1.00" next to "elastic" or "inelastic"
(more decimals then, e.g. -0.995 on Q = 80 - P at $39.90). verify.js gained a "4.2 tags" block: every
$0.10 slider stop on every demand line the rounds can draw (the printed e_d matches the numerical
derivative to its decimals, the region matches, unit elastic only at the midpoint).

Kit workaround in 4.2: the in-view observer only draws the base picture in while predicting, so an
explore-first figure kept `f.base()` at 0 on first load (blank plot). `explore.init` sets `f.rv.base = 1`
when the figure has not been seen yet; new rounds still animate. (Reported to the lead.)

Live page (`week4-viz.html`): built by `lab/predict/tools/build-live.js` from the classic page (tag
`classic-site-2026-11-07`) with `lab/predict/week4/live-edits.json` (13 edits). Exact command:

```
node lab/predict/tools/build-live.js 4 sec-4-1=f41 sec-4-2=f42 sec-4-3=f43 sec-4-4=f44 sec-4-6=f46 sec-4-7=f47 \
  sec-4-8=f48 --edits lab/predict/week4/live-edits.json --lede "Most figures ask one question. Answer it on the graph by dragging (your guess shows in plum), then press Reveal and watch the answer draw itself in; Fig 4.2 is for exploring, with no question. Point at a graph to read the numbers under the pointer; a dragged point always shows where it is."
```

The edits (live-edits.json; regenerate it from a build with an empty edits file if the classic markup
ever changes, the exact strings are long): prose in 4.1, 4.2, 4.3, 4.4, 4.6 that named the old toggle,
sliders, orange dot, "Show Calculation" button and equation inputs; 4.3's "Fig 4.3" heading put back (the
classic page had it outside the prose, so the builder dropped it as a stray header); the empty
`#v6-calc-box`; 4.8, whose section had no `.fig-prose`: its intro (now "The animation below shows", since
the film follows the prose) and the price-range formula box are wrapped as prose with the heading restored,
and the old three-panel canvas board and the equation builder (their scripts are gone) are removed. Three
CSS blocks the prune kept are removed by edits too: `.toc` (no TOC on the page; kept only because "toc" is a
substring of words in the kept scripts), the canvas / three-panel / overlay rules (their markup goes in an
edit, after the prune ran), and the old `.verdict` rules (the kit's verdict box also has class `verdict`,
so they would have restyled it). No ids needed keeping: the only inbound link is lab/predict/index.html
-> `week4-viz.html#sec-4-3`, a section id. 108 KB -> 19 KB.

Checks this round: verify.js passes; loadcheck (live page and preview: zero console errors, no failed
requests, no overflow); livecheck at 1440 and 390 with the keyboard-tag figure changed to 4.8 and two local
fixes to the script (an explore-first figure has no "Just show me" and stays in Explore after a new round;
the swipe point moved off 4.8's kink knob, which sits at 60% / 38% of the plot): rail anchors, drawer, ask
widget, keyboard tag ("start: Q = 0, P = $16.00"), touch swipe scrolls, every figure reveal / explore /
new round: all OK. CDP touch drags with tags on 4.2, 4.4, 4.6, 4.7, 4.8; keyboard on 4.2 (tag and readout
follow); deep links to every section land below the top bar at both widths. Screenshots at 1440 and 390
(hover, drag tags, revealed, explore, film sections, top of page), two rounds; round 1 found the blank 4.2
(kit base issue above) and a doubled "elastic" label next to the 4.2 point (the region now lives in the tag
and the readout only).

## Known limits
- 4.4 explore can push a bar past the frame (e.g. fashion at -30%, +171% quantity); the bar is
  clamped and its label still shows the true value.
- 4.1 and 4.2 both ask about points on a straight demand line; 4.1 is about the arc formula,
  4.2 about where elasticity changes.
- Labels are placed by a deterministic heuristic; with rare draws a tag can sit a little away from
  its point, mostly on phones.
