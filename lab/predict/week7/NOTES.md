# Week 7 on the kit: notes

Page: `index.html` (Profit Maximization & the Competitive Firm). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week7/verify.js` (20,000 draws per
figure, 5,000 for 7.9, every 7.7 scenario at every shock size; all pass). The checks are independent of
the closed forms: the best output is found by brute-force grid search over q including q = 0 (so the
shutdown rule is tested, not assumed), marginal cost by numerical derivative of TC, min SAVC and min SAC
by grid search, equilibria by evaluating supply = demand. Interaction suite and screenshot scripts live
in the scratchpad (`wk7/interact.js`, `snap.js`, `guess.js`), not in the repo.

One firm model runs through the whole week, the one on week7-viz.html and in both films:
TC = q^3/3 - 2q^2 + 7q + 5, SMC = q^2 - 4q + 7, shutdown $4 at q = 3, break-even $5.51 at q = 3.58,
supply q = 2 + sqrt(P - 3) above $4. Random rounds vary the constant c (SMC = q^2 - 4q + c) and TFC.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 7.1 | The price is $10. Which output gives the most profit? | drag a marker along the q axis; a plum bar shows the gap TR - TC there | q* = 4.65, TR $46.46, TC $27.78, profit $18.68 |
| 7.2 | At P = $7, draw the profit rectangle. | drag the rectangle's corner (width q*, bottom edge SAC(q*)) | q* = 4, SAC $5.58, profit $5.67 |
| 7.3 | Below what price does it shut down, above what price does it profit? | drag two horizontal lines | $4 (min SAVC), $5.51 (min SAC) |
| 7.5 (film) | Where does the supply curve start, and how much at $8? | drag the start point; slide a point along the $8 line | starts at q 3, $4; q = 4.24 at $8 |
| 7.7 | The price of a substitute rises. Trace it through all three panels. | drag the cause curve (consumer d sideways, or firm SMC up/down), the market price marker, and the taker's dot along its curve | d right, P $5.51 to $6.65, firm 3.58 to 3.91, profit $4.28 |
| 7.8 | 10 identical firms: where does market supply start, how much at $8? | drag the start point; slide a point along the $8 line | starts at Q 30, $4; Q = 42.4 at $8 |
| 7.9 (film) | Demand has risen to D'. Where does the market end up, with how many firms? | slide a point along D'; drag the supply curve S' sideways (sets n) | $5.51, Q 1,065, about 297 firms |

Explore: 7.1 price and TFC steppers (TFC lifts TC, q* never moves) and a cursor that shows the slopes of
TR and TC; 7.2 drag the price on its axis, "SAVC mistake" toggle; 7.3 drag the price through the zones,
readout compares the loss from producing with -TFC; 7.5 drag the price, each price leaves a dot so the
supply curve builds itself; 7.7 switch between the page's six shocks; 7.8 drag the price (each firm's
quantity is a stripe, laid end to end) and step n; 7.9 drag S' or step n, "Replay entry/exit".

Scoring: 7.1 distance of q from q* (full within 1.2% of the axis, zero at 20%). 7.2 half width, half
bottom edge (the SAVC mistake scores about 50 to 60). 7.3 half each price. 7.5 and 7.8 half the start
point, half the quantity. 7.7 a third per right direction (0, 33, 67, 100). 7.9 half the long-run price,
half the firm count (log error).

## Decisions where this deviates from the live page

- 7.1: the live page's TR/TC panel stops at $30, which cuts TR off before q*; here the frame is fitted
  to the round (q 0..7, $0..70 on the default). The live page's separate profit panel is replaced by the
  gap bar and the tangent at q* ("slope MC = $10"). Live sliders P / TFC / VC shift become steppers;
  the VC shift is what random rounds vary (c).
- 7.2 and 7.3: price axis 0..10 on the default (live 0..14), so the action near $4 to $7 is readable.
  7.3's question replaces the live slider: the student places the two thresholds; the zones paint in on
  the reveal. Live's "near break-even" band ($5.50 to $6) is not shown; break-even is a single price.
- 7.5: on the live page this figure is the film plus prose (its old interactive code is orphaned). Here
  the film sits on top and the question asks for the curve's start and one point. One plot instead of the
  film's two panels: supply is drawn as a thick orange band over SMC on the same axes ("SMC read
  sideways"). A quarter of random rounds ask about a price below the shutdown price (answer 0).
- 7.7: the live figure is schematic with no numbers. This version puts real curves behind it so the
  verdict can quote numbers: 100 firms with the course costs, 200 consumers, start in long-run
  equilibrium at $5.51, market demand Q = A - 50P through that point. Demand shocks shift D sideways by
  15 to 25% of the starting quantity (each consumer's d by 1/200 of that); input-price shocks move every
  firm's costs by $0.75 to $1.25. Default shock size 25% (the page has none). Axes carry textbook marks
  (P1, P2, q1, q2) instead of tick numbers. Panel order Firm, Market, Consumer as on the page and in the
  textbook; stacked top to bottom on phones.
- 7.8: the live page is a table and an n slider (1 to 50); here the same supply q = 2 + sqrt(P - 3) is
  drawn for one firm and summed. Random rounds use n from 2 to 50 and test prices $5 to $12.
- 7.9: defaults are the live page's and the film's (D 3,558.6 - 548.4P to D' 4,086 - 548.4P, 150 firms,
  $6.40, $3.31, 1,065, about 297; checked, as is the page's exit start, 450 firms at $4.73, loss $2.69).
  Random rounds include demand falls (exit) and vary c, TFC, n0 and the demand slope. Market Q axis is
  0..1,500 on the default so the S' handle can reach 297 firms at its handle price.
- 7.7 and 7.9 get a wider plot column on desktop (page-level CSS in index.html) because they hold two
  or three small graphs.

## Rounds

1. Built all seven. Screens at 1440: 7.9's kit-drawn ticks (domain in market units) collided with the
   panel ticks; 7.7's panels were cramped and its floating "q 3.58 -> 3.91" labels collided; 7.1's
   profit label fled to the top-left corner (no free spot in the wedge beside the bar); 7.2 and 7.3
   wasted half the height on a 0..14 axis.
2. 7.9 domain moved to an abstract 0..100 frame with panel ranges under their own names; wider stage
   for 7.7 and 7.9; 7.7 rebuilt with textbook axis marks and low causal arrows; 7.2 / 7.3 frames fitted
   to the round. Remaining: q1 and q2 marks overlapped when close; 7.9's SAC label floated over the film
   (its anchor was above the panel); D and D' labels stacked; 7.1 profit label still displaced.
3. Phone screens: 7.7's stacked-layout arrows were a few pixels long; 7.9's last Q tick ran past the
   edge. Fixed both, separated close q1 / q2 marks, profit label now sits under TC beside the bar.
   Scoring pass from verify.js: the SAVC mistake scored up to 77 when TFC was small (bottom-edge
   tolerance tightened); some 7.9 exit rounds had the short-run price within $0.30 of the answer, so an
   untouched guess scored about 45 (draws now need $0.50).
   Interaction suite (mouse, keyboard only, CDP touch at 390, 8 new / skip rounds per figure, NaN scan,
   overflow check, console) found the kit keyboard quirk below on 7.7; worked around here. Final run:
   54 of 54 pass, no console errors, no horizontal overflow at 390 or 1440.

## Kit quirk hit (kit not edited)

After Enter completes a step, the kit keeps the keyboard pick (kpick / kfocus) on the handle just used,
so arrows keep moving it instead of the next step's handle (the same issue the week 5 agent is fixing).
Workaround in this folder: index.html records whether the key being handled is Enter (capture listener
on each figure), and the step checks of the multi-step figures call adv(), which clears f.kpick when an
Enter completes the step. Arrow presses also complete steps in the kit, so they leave the pick alone.
Once the kit fix lands, adv() and the listener can be deleted.

## Known limits

- 7.7's score is coarse (thirds): it grades directions, which is what the figure teaches; the size of
  the student's shift and price move is not scored.
- 7.9: with integer firms the long-run price is not exactly $5.51; the page says "about 297" as the live
  page does.
- The kit's verdict table can run a few pixels past the right edge of the panel on phones when the
  answer cells are long (7.7's "up, $5.51 to $6.65"); it wraps on narrower content. Kit-wide, not fixed here.
- Keyboard: every handle exists from the start of a round (none appears mid-round), arrows move the
  current step's handle, Space switches, Enter confirms and hands the arrows to the next step.
