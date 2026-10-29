# Week 9 on the kit: notes

Page: `index.html` (Non-Linear Pricing, Natural Monopoly & Game Theory). Engine: `../kit/`
(README there), unchanged. Economics: `models.js`. Figures: `figs.js`. Checks:
`node lab/predict/week9/verify.js` (20,000 draws for 9.2, 9.3 and 9.4; 9.1 runs at most 4,000
because each draw does a 600-step grid search with numerical integration; all pass, float
tolerance 1e-6). Interaction suite and screenshot scripts live in the scratchpad
(`wk9/interact.js`, `wk9/snap.js`), not in the repo. No week 9 film exists, so no film blocks.

## Per figure: the question and how it is answered on the figure

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 9.1 | Which usage charge p earns the most when a fixed fee comes on top? Then: where would a single-price monopolist sell? | slide p along demand (snaps to $0.05, down to $0); tap the one-price point | p = MC = $1, F = CS = $20 = total profit; one price Q 10 at $2, profit $10 (half) |
| 9.2 | Where does the firm end up if left alone, and under average-cost pricing? | two taps that snap onto demand (to $0.50), drag to adjust | left alone Q 27.5, $32.50, profit $556.25; P = AC at Q 51.08, $8.92 |
| 9.3 | Circle each player's best replies. Where is the Nash equilibrium? | tap payoffs in the matrix: A's (blue) in each column, B's (orange) in each row; any order, re-tap to change; the cell(s) with both circled shade plum as "your equilibrium" | textbook Prisoner's Dilemma: Confess dominant for both, NE (Confess, Confess) |
| 9.4 | Three price blocks. What should each block charge per unit? | drag one plum bar per block up or down | $2.33, $1.67, $1.00 (demand price of each block's last unit); profit $13.33 of $20 |

Explore per figure: 9.1 drag p anywhere on demand (also below MC: red loss on units and the
over-production DWL), live fee / usage / total / DWL, the one-price rectangle stays as a dashed
outline; 9.2 the site's four regime chips (left alone, P = MC, P = AC, two-part) plus a fixed-cost
stepper; 9.3 the site's classic games as chips (plus "This round"), tap any payoff and change it
with a stepper (or Enter then + / - on the keyboard), circles and Nash cells follow, ties allowed;
9.4 the site's block-count stepper, 1 to 10. Explore keeps the revealed answer on screen until the
student first touches a control (9.1, 9.2).

## Decisions to know about
- 9.1: the live page is a slider with no question. The question is the optimal usage charge (the
  textbook's exam mistake is p = 0, which the handle allows). The second step asks for the
  single-price monopoly point so the reveal can show the textbook's doubling result (gold $10
  rectangle inside the blue $20 triangle). MR is drawn dashed, as in textbook Figure 9.1 (the live
  page does not draw MR on this figure). The handle starts at a - 0.2(a - MC), never at MC.
  Score: 60% p (full within 2% of a), 40% the monopoly point.
- 9.2: the live page is four regime buttons with no question. The question asks for the two
  regimes that need work (MR = MC then read up to demand; the larger root of P = AC); MC pricing
  appears on the reveal as a reference ring. MR is shown while predicting, as on the live page.
  Random rounds vary a, b (0.5, 1, 2), MC and F so that the discriminant ratio
  ((a - c)^2 - 4bF) / (a - c)^2 lies in [0.4, 0.85]: P = AC is well right of the monopoly point
  and visibly short of P = MC.
- 9.3: the live "New practice game" generator (four archetypes: both dominant, one dominant, two
  NE, no pure NE) is reused as is, plus a 25% chance of one of the live presets (PD, OPEC,
  Coordination, Advertising). No ties in any comparison in random games. The student's Nash
  answer is read off their circles (the textbook's step 3) rather than tapped separately, so a
  score is 25 per correct best reply. The live page underlines; the textbook text says
  "circle method" and underline; this uses circles (rings), blue for A, orange for B, plum for you.
  Long payoffs (OPEC's 1200) shrink the type so rings never collide; phones use a split-cell
  layout (A lower left, B upper right).
- 9.4: the live figure is a slider. Its model (block i priced at the demand price at its right
  edge, profit 20 (n - 1) / n) is kept exactly; the question asks for those prices. Random rounds
  use 2 to 5 blocks over the same demand / MC sets as 9.1. Bars start near the top (a - 0.06(a - MC)),
  which verify.js checks is away from every answer.
- Prices in tables always show cents ($1.00, not $1). On phones the y tick labels drop the "$"
  (the axis title says it) so "3.50" fits the margin.

## Kit extensions built in this folder (kit not edited)
9.3 is a payoff matrix, not an x-y plot. It is drawn on the kit stage (a paper rect painted in
the `over` layer hides the kit's axes; domain 100 x 100 with no ticks) and needs two things the kit
does not offer, added per figure in `figs.js` (`bindGame`):
1. Tap anywhere in the grid, any step, any order: the Figure instance's `target()` is wrapped so a
   press on a blue payoff maps to step 1's `place`, on an orange payoff to step 2's; in Explore it
   returns a throwaway handle whose `set` selects the payoff. `capturesPlot()` is true while
   predicting so touches on the grid never scroll.
2. Keyboard: a capture-phase `keydown` on `.stage` (stops propagation before the kit's svg
   handler) moves a dashed plum cursor over the eight payoffs with the arrows; Enter / Space
   circles (or selects in Explore); + / - edit the selected payoff.
A test hook `f._slot(i, j, who)` gives a payoff's pixel centre.
Also: 9.1's p handle sets `noAutoDone` so arrow keys do not complete step 1 on the first press
(Enter does); otherwise the next arrow would drop step 2's point. If the kit grows a "grid / cell
tap" step kind, 9.3 can move onto it.

## Rounds
1. Built all four. Screens: 9.4 drew no demand line (solve lacked `choke`, NaN in the SVG);
   9.1 / 9.2 Explore replaced the revealed answer with the explore picture at once; 9.2 "MC = $5"
   floated far from its line; 9.3 table rows wrapped into tall stacks; tables mixed "$1" and "$1.60";
   phones clipped "$3.50" ticks and the 9.3 status line.
2. Answer kept until the first Explore touch, cents everywhere, MC label candidates along the line,
   compact 9.3 rows with wrapping cells, status line shrinks to fit, phone ticks without "$".
   Screens: 9.1 fee label landed inside the monopoly rectangle; 9.2 P = AC and P = MC labels
   collided; 9.3 "Nash" tag sat on B's ring on phones.
3. Fee label moved right of Q_M, label orders for 9.2, Nash tag bottom-right on phones. Interaction
   suite (mouse, keyboard only, Playwright touch taps, CDP touch drag, swipe-to-scroll, 6 new
   rounds per figure with NaN scan, overflow, console) found the 9.1 arrow-key auto-complete
   problem above; fixed. Then OPEC payoffs overlapped their rings at 1440 and spilled out of the
   cells at 360 to 390: payoff size now scales with the longest payoff.
Final: suite passes at 1440 and 390, zero console errors, no horizontal overflow.

## Known limits
- 9.1's second step (single-price monopoly) is week 8 material used as the benchmark, as in the
  textbook figure.
- 9.3's Explore stepper edits one payoff at a time; ties are allowed there and are then shown as
  "either" in the readout and as extra Nash cells, but random rounds never contain ties.
- 9.3 changes the stage cursor to the kit's "grab" on hover in Explore (the kit sets it inline).
- Labels are placed by the kit's deterministic heuristic; on phones a tag can sit on a dashed
  guide line in 9.2's reveal.
- verify.js runs 4,000 draws for 9.1 (grid search cost), 20,000 for the rest.
