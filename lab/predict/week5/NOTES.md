# Week 5 on the kit: notes

Page: `index.html` (Production Theory). Engine: `../kit/` (README there; this round's kit changes are in
its Changelog). Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week5/verify.js`
(20,000 draws per figure, 3,000 for 5.10 which scores drawings; all pass, float tolerance 1e-6).
Interaction and screenshot scripts live in the scratchpad (`wk5/interact.js`, `snap.js`, `oldweeks.js`),
not in the repo.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 5.1 | Where do diminishing marginal returns set in, and where does one more worker add nothing? (film on top) | slide two points along TP (a plum tangent follows); MPL panel below fills in on reveal | MPL peaks at L = 5 (MPL 7.5, TP 25); MPL = 0 at L = 10 (TP max 50) on TP = 1.5L² - 0.1L³ |
| 5.2 | Bundle A makes Q = 4. Find two other bundles with the same output. | tap two points, drag to adjust | any (L, K) with L K = 16 for Q = L^0.5 K^0.5, e.g. (2, 8), (8, 2) |
| 5.3 | Where on the Q = 4 isoquant is MRTS = 4? | slide a point along the isoquant (a tangent follows) | L = 2, K = 8 (start at L = 4, MRTS 1) |
| 5.4 | Double both inputs, then only labor: where does output land? | drag two points up and down at λ = 2 | Q 5.28 -> 12.13 (x2.30, IRS) and 8.00 (x1.52) for a = b = 0.6, K = L = 4 |
| 5.5 | Q = 1 crosses the ray L = K at 1. Where do Q = 2 and Q = 3 cross it? | slide two points along the ray | L = K = 2 and 3 (CRS, a = b = 0.5) |
| 5.6 | Substitute to L = 2, then A rises to 1.4: how much capital at each stage? | drag a point up and down the line L = 2, twice | K = 8 (same isoquant), then K = 16/(1.96 x 2) = 4.08 |
| 5.7 | Cheapest way to make Q = 3? | tap the isoquant (snaps onto it), slide | (3, 3), cost $60 with w = r = $10 |
| 5.8 | How steep is the isoquant through P = (4, 4)? | turn a line through P with a round handle | MRTS = (b/a)(K/L) = 1 for A = 1, a = b = 0.5 |
| 5.9 | The bakery buys another oven (K 2 -> 3). Draw the new TP. | freehand curve over 0 to 12 workers | TP = (3L)^0.5: 3.46 at L = 4, 5.20 at L = 9 |
| 5.10 | Sketch the isoquant of Q = L^0.5 K^0.5 through P = (4, 4). | one freehand stroke (keyboard: pick one of three sketches) | K = 16/L, smooth and bowed in |

Explore per figure: 5.1 drag L along TP, the tangent's slope is the MPL dot below, optional AP curve
(MPL crosses AP at AP's peak, as in the film); 5.2 technology chips (Cobb-Douglas, substitutes,
complements, the page's three panels) and a firm / consumer reading, drag P along the isoquant for
MRTS (MRS); 5.3 drag along the isoquant, output stepper; 5.4 exponent steppers and a draggable λ;
5.5 exponent steppers; 5.6 technology stepper and the bundle dragged along the current isoquant;
5.7 wage stepper and firm / consumer reading; 5.8 drag P, steppers A, a, b and λ (the page's lab);
5.9 bakers, ovens and wage steppers, an orange bar shows the last baker's marginal product (the
page's hire / fire / buy machine buttons); 5.10 all ten of the page's functions as chips.

## Decisions to know about (deviations from the live defaults)
- 5.1: the page opens on its Cobb-Douglas form (Q = K^0.5 L^0.5, K = 4), which has no MPL peak and no
  MPL = 0, so nothing to ask. The question uses the page's S-curve form TP = 1.5L² - 0.1L³, the same
  curve as the fig51 film. The frame runs to L = 12 (page: 10) so the MPL = 0 point is not on the edge,
  and the MPL panel shows negative values beyond L = 10 (the page clamps MPL at 0). Random rounds keep
  the cubic form with new coefficients (MPL peak at L = 3 to 7, a with two decimals). Two panels are
  drawn in one SVG: the MPL panel sits under the TP plot (`extraBottom`) on the same x scale.
- 5.2: the page has no question; this asks for bundles on the same isoquant (the definition). Random
  rounds use the page's three technologies (Q = L^0.5 K^0.5, Q = 2L + K, Q = min(L, K/2)) with other
  levels and starting bundles. Score: each bundle's output within 4% of q is full marks, zero at 35%.
- 5.3: the page starts at L = 4 (MRTS 1); that stays the starting point, and the target MRTS = 4 is the
  textbook's point A (2, 8). Random rounds: Q 3 to 6, MRTS 1/9, 1/4, 4/9, 9/4, 4 or 9 (whole or simple
  fraction answers). Score on the log of L (full within 3%, zero at 60%).
- 5.4: the page's two panels become one: output against the scale factor λ for "both inputs x λ" and
  "only L x λ (K = 4)". That puts diminishing MPL and returns to scale side by side, which is the page's
  point. Random rounds keep b >= 0.3 (doubling L alone must visibly raise output) and include IRS,
  CRS and DRS. Score per answer: 70% closeness (full within 4% of today's Q, zero at 50%), 30% being on
  the right side of "double", counted only once the point has moved.
- 5.5: the Q = 2 and Q = 3 isoquants are hidden while predicting (they would show the answer). The
  frame is 0 to 10 as on the page, or 0 to 5 when Q = 3 crosses below L = 2.6 (strong IRS), so the
  points do not crowd. Random a, b from 0.25 to 0.9 (sum 0.6 to 1.6, at least 0.15 from 1 unless CRS).
- 5.6: the page's buttons move L by +0.5 per press; the question uses a bigger move, L 4 -> 2 (the
  textbook's point A, K = 8), then the page's "Improve Technology" step A x 1.4. Random rounds: L 2 to 8,
  A 1.2 to 2. The verdict names the 1/A mistake (K enters as A²).
- 5.7: the page draws a symmetric case (equal prices, level 3); the first round matches it, so the
  answer is (3, 3). Prices are named w and r as in the textbook (the page's readout says w/v). One plot
  with a firm / consumer toggle instead of two identical panels. Random rounds have unequal prices.
- 5.8: the question is the slope of the hidden isoquant at P (MRTS = MPL/MPK with general exponents).
  The line starts flat (slope 0.2), or steep (4) when the answer is flat. Random rounds keep b/a at least
  1.3 away from 1, so MRTS = K/L (ignoring the exponents) scores under 90.
- 5.9: the page is a hire / fire simulator with no question; this asks for the shifted TP after a
  machine is bought (the page's "Buy Machine"). Random rounds include losing ovens; K changes by a factor
  of 1.3 or more so the shift is visible (redrawing the old curve scores under 60).
- 5.10: the page's quiz picks a function and offers three buttons. Here the student draws the
  isoquant through a point P. Keyboard users cycle three sketches through P (straight line, smooth curve,
  L shape), which is the page's three-way choice: the right family's sketch is the true isoquant.

## Rounds
1. Built all ten. Screens at 1440: the MPL panel axes were invisible (drawn in the clipped `under`
   layer); the 5.4 orange label sat above the blue curve; 5.5's gap label ran over the ray and quoted
   distances along the ray (1.41) instead of steps in L; 5.10's verdict table overflowed with long text.
   verify.js (first run) found: untouched 5.4 guesses scoring 40+ in DRS rounds (the side-of-double bonus
   was free), 5.8 rounds where a and b were too close for the exponents to matter, 5.9 shifts too small
   to tell from the old curve, the keyboard sketches never matching linear / Leontief geometry, and
   Q = 3L + K never drawn (its steep line had too few samples). All fixed in the models.
2. Phone screens (390): the MPL panel's ticks crowded (now every other tick when there are more than 5).
   Interaction suite (mouse to the exact answer, keyboard only, CDP touch, a touch outside the plot left
   to the page, every explore control, six random rounds with a NaN scan) found two keyboard problems:
   5.5's second point started below the first after arrowing, and 5.6's first handle vanished once its
   step was done, so focus jumped. Both fixed (5.5 starts Q = 3 just beyond your Q = 2; 5.6 keeps both
   handles, the new one listed first so it wins the grab where they overlap).
3. Film-style reveals checked mid-animation (motion on), map labels in 5.8 moved near their own curves.
   Final runs: 1440 and 390 interaction suites all pass, zero console errors, no horizontal overflow.

## Known limits
- 5.10's verdict cannot say which shape you drew; it reports the average gap from the true isoquant.
- 5.2 accepts any bundle on the isoquant, including Leontief bundles that waste an input (they do make
  q); the verdict points out the corner.
- 5.1's MPL panel is drawn in pixel space under the plot, so its labels are placed by hand, not by the
  kit's label placer; with unusual coefficients a panel label can sit close to a dashed guide.
- In 5.4 and 5.6 the second handle starts on top of the first answer's level; the newer handle wins the
  grab, so to re-adjust the first, move the second away first.
- Labels are placed by the kit's heuristic; with rare draws a tag can sit a little away from its point.
