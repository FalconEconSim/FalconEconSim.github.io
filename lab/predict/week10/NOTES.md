# Week 10 on the kit: notes

Page: `index.html` (Oligopoly Models & Spatial Competition). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week10/verify.js` (20,000 draws for
10.1, 10.3, 10.4, 10.5; 3,000 for 10.2, which counts 20,000 sunbathers per draw; all pass, float
tolerance 1e-6). Interaction suite and screenshot scripts live in the scratchpad (`wk10/interact.js`,
`snap.js`, `guess.js`), not in the repo.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 10.1 (film) | Draw Firm B's best response, then find where a Stackelberg leader takes the market. | drag B's line by its two ends (one on each axis), then tap the Stackelberg point | B's line from 60 on the q_B axis to 120 on the q_A axis; Cournot (40, 40), P $40, $1,600 each; Stackelberg (60, 30), P $30, $1,800 / $900 |
| 10.2 | B stands at 0.70. Where should A stand, and where do both end up? | drag vendor A along the beach, then tap where both end up | 0.69, right beside B (69.5% of the beach); both end at 0.5 |
| 10.3 | Market price with one firm, with 3 firms, and where it heads as more firms enter | drag the price on the n = 1 and n = 3 lines, then drag a dashed "floor" line | $60, $30, MC = $0 |
| 10.4 | Same market, four ways to compete: where on the demand curve does each one land? | four taps on the demand curve (taps project onto it), in the page's order | Cournot Q 80 at $40, Stackelberg 90 at $30, collusion 60 at $60, Bertrand 120 at $0 |
| 10.5 | Rival charges $60: draw your profit at every price, then pick your best price. | freehand drawing, then tap a price on the axis | profit rises to $2,379 at $59, half ($1,200) at $60, zero above; best $59 |

Explore per figure: 10.1 drag A's output along B's line (B always replies), "Watch them adjust" runs
the best-response staircase from wherever A is (into the Cournot crossing), demand chips with the
page's four demands; 10.2 drag both vendors, A's share curve, sunbathers colored by vendor, average
walk, jump to Nash or the efficient quarter points; 10.3 drag the point along the dots or step n,
MC stepper lifts the floor; 10.4 model chips, profit (green), consumer surplus (blue) and deadweight
loss (red) with a worked readout; 10.5 drag your price and the rival's price, "Start a price war"
walks the rival down to MC with you $1 under it.

Scoring: 10.1 B's line ends 25 + 25 (distance over the frame, full within 1.5%, zero at 20%),
Stackelberg point 50. 10.2 A's spot scored by the share it wins (full within 1.2 points of the best,
zero 15 points short), 60; the end point 40 (full within 0.02, zero at 0.2). 10.3 35 / 40 / 25 by
price error over the frame. 10.4 average over the four models of the quantity error over the
competitive quantity. 10.5 drawing 40 (mean distance to the true curve plus coverage), best price 60
(by the profit it earns relative to the best).

## Decisions to know about
- Numbers and models are the page's: P = 120 - Q, MC = 0 for 10.1, 10.3 and 10.4; the beach at
  0.30 / 0.70; Bertrand Q = 120 - P, MC = $20, rival $60. The defaults reproduce the textbook tables
  (n-firm $60 / $40 / $30, welfare table CS and DWL in 10.4), checked in verify.js.
- 10.1: the page's interaction is a slider with A riding B's line. The question asks the student to
  draw B's line (A's is given) and place the Stackelberg point; the Cournot crossing of their own line
  is shown live and in the verdict. Colors follow the fig101 film (A blue, B orange, Stackelberg
  green). Random rounds use other linear demands (P = a - bQ, total-output intercept 60 to 180, b 1
  or 2) so every answer sits on the snap grid. The page's demand chips are in Explore.
- 10.2: the page shows only the beach. Here the beach is the x axis and the y axis is A's share, so
  the reveal can draw A's share for every spot A might take (a jump at B). Sunbathers (50 dots) are
  grey while predicting and turn blue / orange by vendor after. The page's 0.01 slider grid is kept,
  so A's best reply is 0.01 beside B (0.69, 69.5%); the verdict says so. Random rounds move B (0.10
  to 0.90, never within 0.1 of the middle) so the long side switches.
- 10.3: the page's slider default is n = 2; the question uses n = 1, n = 3 (the textbook's triopoly
  row, $30) and the limit, because n = 2 is already the answer of 10.1. Random rounds vary the demand
  intercept, MC ($0 to $30) and the middle n (3 to 9); x labels at 1, 2, 5, 10, 15 and that n.
- 10.4: the page has no question; the student places all four on the demand curve. Explore adds CS
  and DWL (textbook welfare table) to the page's profit rectangle. Random rounds vary demand and add
  MC up to $30 (profit is then (P - MC) x Q); quantities stay whole or half units.
- 10.5: the page's interaction is two sliders. Here the student draws the whole profit curve (the
  cliff at the rival's price is the point) and then picks a price. The page's $1 slider step is kept,
  so "a penny below" becomes $1 below ($59); the verdict says a penny with real prices. When the
  rival is above the monopoly price ($70 by default) the answer is the monopoly price, as on the
  page. Random rounds vary demand ($100 to $140), MC ($10 to $30) and the rival ($10 above MC up to
  $15 below the choke price). Y ticks use $2.5k style so they fit the phone margin.
- Keyboard focus quirk in the kit (focus stays on handle index 0 once arrows were used): every
  multi-handle figure lists the current step's handle first (`byStep` in figs.js), so after Enter the
  arrows move the new step's handle. The kit is not edited.

## Rounds
1. Built all five. Screens at 1440 and 390: 10.5 verdict printed the drawing miss in odd units
   ($127.52 from a normalized distance); the "below MC" note sat on the profit curve instead of in
   the grey zone; the Explore button in 10.1 wrapped mid-sentence; the 10.2 Explore opened with A
   on top of B (handles overlapping); 10.2 scoring too lenient (A at 0.55 vs 0.69 scored 81);
   10.3 why-text printed "(120 - 0)".
2. Drawing miss now an average vertical miss in dollars (checked: a perfect drawing misses by $0),
   rotated "below MC" note inside the zone, buttons on their own line, 10.2 Explore starts from the
   round's original spots, tighter 10.2 scoring. Phone screens: Cournot / Stackelberg labels drifted
   far from their dots in 10.1 (three lines meet there), 10.4 Explore names floated away from their
   dots, 10.5 y ticks clipped by the narrow left margin, 10.2 split marker crossed the share curve.
3. 10.1 equilibrium labels pinned to fixed spots (Cournot up-right, Stackelberg down-right), Explore
   starts off equilibrium at q_A = 0.2 x (a/b) so the point is not hidden under a dot; 10.4 names only
   the chosen model on phones; compact $k ticks; short split marker through the sunbathers.
   Interaction suite (mouse, keyboard only, CDP touch, 8 new rounds per figure, NaN / dash scan).
4. The keyboard-only runs failed in 10.1, 10.2 and 10.4: the kit completes a drag step on the first
   arrow press, so the second press already started the next step (in 10.1 it dropped the
   Stackelberg point while the student was still moving B's line). Predict handles now carry
   `noAutoDone` (set in `byStep`): arrows only move, Enter confirms. Suite: 71 of 71 pass, zero
   console errors, no horizontal overflow at 390; final screens at 1440 and 390 re-read.

## Known limits
- 10.1 and 10.4 at phone width are dense (three lines and several labelled dots); labels may sit on
  a line, with a paper halo.
- 10.2 Explore: when both vendors stand on the same spot the A handle is grabbed first.
- 10.5 drawing score is forgiving near the cliff (any jump within 2% of the rival's price is fine).
