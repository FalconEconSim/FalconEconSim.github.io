# Week 8 on the kit: notes

Page: `index.html` (Welfare, Monopoly & Price Discrimination). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week8/verify.js` (20,000 draws per
figure, 5,000 for 8.8 whose brute-force block search is slow; all pass, float tolerance 1e-6 unless a grid
sets it). Interaction suite and screenshot scripts live in the scratchpad (`wk8/interact.js`, `snap.js`,
`sheet.js`), not in the repo.

The live page lists 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9, 8.10, 8.11 (there is no 8.6 on the page; the
textbook's Figure 8.6 is the PPD diagram that the page numbers 8.7). Same order and numbering here.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 8.1 | The price is held at $15. How many units actually change hands? | slide a vertical line along the price line | buyers want 5, sellers offer 11, 5 trade; CS $12.50, PS $42.50, DWL $9 |
| 8.2 | Output held at Q = 4: split what consumers lose into transfer and DWL | drag the top of the plum rectangle (price), then the far corner of the plum triangle along MC | P $6, transfer $16, DWL ends at Q* = 8, DWL $8 |
| 8.3 | World price $6, add a $2 tariff: where do price, production, consumption go? | drag the domestic price line, then both ends of the import gap | P $8, Q_s 4, Q_d 12, imports 8; revenue $16, DWL $2 + $2 |
| 8.4 (film) | Draw MR, set MR = MC, read the price | drag MR's end on the quantity axis, then Q along MC, then the price on the price axis | MR = 0 at 5, Q_M 4, P_M $6, profit $16 |
| 8.5 | A monopolist takes over; without MR, find the price with the biggest profit rectangle | slide a point along demand; the plum rectangle (P - MC) x Q follows (no numbers shown) | $6: CS $8 + profit $16 + DWL $8 = $32 |
| 8.7 | With perfect price discrimination, how far down demand does it sell? | slide a point along demand from the one-price point | Q 8, last unit at $2, profit $32, CS 0, DWL 0 |
| 8.8 | Three price blocks: where should each block end? | slide three points along demand; plum staircase follows | ends 2, 4, 6 (prices $8, $6, $4), profit $24, CS $6, DWL $2 |
| 8.9 | Price business and leisure separately | slide a point on each demand (both start at the uniform price $43.33) | P_1 $60 (Q 40), P_2 $35 (Q 30), profit $2,050 vs $1,633.33 |
| 8.10 | Unregulated price, and the lowest price without a subsidy | slide a point along demand, then a second one up from P = MC | $11 (profit $31, DWL $40.50); P = AC $5.43 at Q 14.57 (DWL $5.89) |
| 8.11 | Low tier pays $2: how low can P_A go before the firm stops breaking even? | slide P_A down demand; green and red rectangles follow (no numbers) | P_A = 11 - sqrt(31) = $5.43, green = red = $9.53 |

Explore per figure: 8.1 drag the trade point up and down (or a price stepper), buyer and seller amounts
stay marked; 8.2 drag the restriction along demand (the triangle overtakes the rectangle below Q*/3);
8.3 P_W and tariff steppers, readout shows gains from trade vs autarky and the tariff decomposition
(prohibitive tariffs handled as on the live page); 8.4 a and MC steppers plus the "read price from MR"
mistake toggle; 8.5 competition / monopoly toggle, MC and a steppers; 8.7 competitive / uniform /
perfect PD toggle, MC and a steppers; 8.8 number of blocks 1 to 10 with DWL = TS/(n+1)^2; 8.9 separate /
uniform toggle and MC stepper; 8.10 the three regimes; 8.11 drag P_A, P_R stepper with the break-even P_A.

Scoring: 8.1 error over Q* (full within 3%, zero at 35%: answering Q* scores at most 31, the long side 0).
8.2 half price, half corner. 8.3 price 40, production 30, consumption 30, each scaled by the tariff
(ignoring the tariff scores under 45). 8.4 MR end 25, Q 40, P 35 (a price read off MR loses the price
part). 8.5 / 8.7 / 8.11 one point each, scaled by the relevant price range. 8.8 mean distance of the
sorted block ends from the answer over Q*. 8.9 the two prices equally. 8.10 monopoly 40, break-even 60.

## Decisions to know about
- First rounds that differ from the live default, because the live default is not a question:
  8.1 the live price slider starts at P* = $12 (nothing to find), so the price is held at $15 (a floor);
  the curves are the live a = 20, b = 4. 8.3 the live tariff starts at $0, so the first round adds $2
  (P_W stays $6). 8.8 the live tier slider starts at n = 1 (the plain monopoly of 8.4), so the first
  round asks for 3 blocks; n = 1 is in Explore and checked by verify.js. 8.11 the handle starts at the
  live P_A = $9 and the question is the live "Find min P_A for break-even" button.
- 8.3 is one panel instead of the live page's four (autarky, free trade, free trade, tariff): the
  question is Part B; Part A's gains from trade are in the Explore readout. The frame is zoomed on the
  trade band, so the top of demand can sit above the frame. Notation P_t as on the live page (the
  textbook writes P_R).
- 8.4 adds a first step (draw MR) before the live page's two steps; MR is hidden until the reveal.
  The Q handle starts at the competitive quantity and the price handle starts on MC, so the classic
  "read P off MR" answer must be actively left in place to be scored, and the verdict names it.
- 8.5 asks the comparator question without MR: the profit rectangle (P - MC) x Q under demand. MR is
  drawn in during the reveal to show it lands on the same price. The live page's competitive state
  shows as the faint blue triangle and in Explore.
- 8.7 the uniform-monopoly picture is shown faded as the "before"; the reveal fills the triangle with
  24 slivers, each priced at its buyers' willingness to pay.
- 8.8 block ends are equally spaced at i Q*/(n+1) (the live page's schedule, each block priced at its
  last unit's WTP); verify.js finds them by brute-force coordinate search from a bad start. Random
  rounds choose n in 2..4 and a demand where the answers sit on the 0.25 handle grid. The handles move
  freely and re-sort on release, so blocks never need untangling. The Spotify static illustration is
  left out (no question in it).
- 8.9 both markets are drawn on one set of axes (the live page uses two panels): business blue,
  leisure green, MR dashed in each market's color. Random rounds keep business at least $20 higher
  in intercept, both markets served, the uniform price serving both, and both answers at least 20% of
  each market's markup range away from the shared start.
- 8.10 MC is green dashed and AC orange, as on the live page (elsewhere MC is orange as in the fig84
  film). Random rounds draw demand, MC and the fixed cost with 4F/(a - c)^2 in [0.56, 0.85] so that
  monopoly profit is positive, the P = AC root exists, and P = MC as the break-even guess scores low.
- 8.11 the frame is zoomed on the low prices (the top of demand sits above it). Random rounds vary
  demand, F, MC and P_R (P_R from MC to MC + 4) with a real cross-subsidy (P_R below AC(Q_R)), the
  answer above P_R + 1.5, and a profitable start.
- Colors: CS blue, profit / transfer / PS gold, DWL red, tariff revenue slate, as in the live page's
  welfare convention; MC orange and MR purple as in the fig84 film.

## Rounds
1. Built all ten. Screens at 1440 and 390 (question, guessing, revealed, explore, new draw).
   Found: 8.3 and 8.11 action squeezed into a thin band of a tall price axis, unreadable at 390;
   8.9 crowded at 390 with elasticity tags drifting from their points; 8.4's starting plum MR sat on top
   of demand (looked like a purple demand curve); demand-curve names collided with the x-value tags in
   8.5 / 8.7; 8.1's price tag overlapped the CS label.
2. Zoomed 8.3 (frame fitted to the import band, taller phone aspect) and 8.11 (frame fitted to the
   tiers); 8.9 taller on phones, price tags pinned beside their points, elasticities moved to the
   verdict; MR starts at 0.8a; demand names moved up the line; 8.1 price tag at the right end, and
   buyers' / sellers' amounts stay marked in Explore. verify.js gained frame-fit checks for the zooms.
3. Interaction suite (mouse to the exact answers, 6 rounds per figure, every explore button and handle
   including drags out of the frame, keyboard only, CDP touch at 390 with scroll checks, NaN scans):
   mouse scores 100 on all 60 rounds, touch 100 on all 20 with no page scroll during handle drags and
   swipes on empty plot area scrolling normally, keyboard completes every figure, no NaN text, no
   console errors, no horizontal overflow at 1440 or 390. Fixed along the way: 8.8's neighbour-fenced
   handles made the natural left-to-right drag impossible (the first point could not pass the
   second), so the fences were replaced by re-sorting on release. Phone screens of 8.1 showed the
   "buyers want" and "sellers offer" tags overprinting each other; they now sit on fixed sides of
   their points (short side left), and the price line counts as an obstacle for labels.
4. Motion check without reduced motion (8.4, 8.7, 8.8, 8.11): MR draws in, Q then P land in order,
   the PPD slivers fill left to right, block steps appear one by one.

## Kit issues
- Keyboard focus after a step completes stays on the old handle (the week 5 agent is fixing it). Worked
  around as week 3 did: every multi-step figure lists the current step's handle first (8.2, 8.3, 8.4,
  8.9, 8.10).
- Related: pressing Enter on a step whose check fails (8.8 "move every point", 8.3 "both ends") sends
  keyboard focus back to the step's first handle, so a keyboard user should Space through the
  handles and press Enter last. Not worked around (reordering handles would make focus jump mid-use).

## Known limits
- 8.3 Explore can push P_W low enough that domestic supply is zero; the picture stays correct but the
  free-trade dots crowd the axis.
- 8.5 and 8.7 share the same base picture as 8.4 (they do on the live page too); each asks a
  different question of it.
- Labels are placed by a deterministic heuristic; with rare draws a tag can sit a little away from its
  point, mostly on phones.
