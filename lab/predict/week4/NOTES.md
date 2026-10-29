# Week 4 on the kit: notes

Page: `index.html` (Elasticity & Consumer Welfare). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week4/verify.js` (20,000
draws per figure, 5,000 for 4.6 which integrates numerically; all pass, float tolerance 1e-6).
Interaction suite and screenshot scripts live in the scratchpad (`w4work/interact.js`, `snap.js`,
`crop.js`), not in the repo.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 4.1 | Where on the curve does the point elasticity equal the arc elasticity from A to B? | slide C along the demand line | the midpoint M: P $32.50, Q 35, e_d = -1.86 (A $25, B $40 on Q = 100 - 2P) |
| 4.2 | Where is demand unit elastic, and where is \|e_d\| = k? | tap the curve twice (taps snap onto the line), drag to adjust | P $25 (Q 50) and, for k = 3, P $37.50 (Q 25) |
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
- 4.2: the site has no target elasticity; the second step adds one (\|e_d\| = 3 on first load, then
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

## Known limits
- 4.4 explore can push a bar past the frame (e.g. fashion at -30%, +171% quantity); the bar is
  clamped and its label still shows the true value.
- 4.1 and 4.2 both ask about points on a straight demand line; 4.1 is about the arc formula,
  4.2 about where elasticity changes.
- Labels are placed by a deterministic heuristic; with rare draws a tag can sit a little away from
  its point, mostly on phones.
