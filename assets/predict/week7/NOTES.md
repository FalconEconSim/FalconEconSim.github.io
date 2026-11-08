# Week 7 on the kit: notes

Preview page: `lab/predict/week7/index.html`; live page `week7-viz.html`. This folder (`assets/predict/week7/`) holds models.js, figs.js, verify.js. Topic: Profit Maximization & the Competitive Firm. Engine: `../kit/` (README there).
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week7/verify.js` (20,000 draws per
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

## Switchover round (Nov 2026): Naveen's rules and the live page

Per figure (SWITCHOVER.md rules 1 to 4). Tags use fixed decimals so they do not jitter; a static label that
repeats a dragged number hides while its handle is busy (`busy()`, as in week 2).

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 7.1 | marker: "q = 3.95" + "profit $17.51"; Explore marker: "q = 2.30: MR $10.00, MC $3.09" + profit | **profit at the hovered q, always** ("TR $32.50, TC $18.07", "profit $14.43"): it is the gap TR - TC the plum bar already shows, a number the student would compute by hand | **yes: Kit.pull iso-profit line** y = Pq - profit (parallel to TR), starts at profit* - 0.6 s (cuts TC), range profit* - 2s to profit* + 1.2s, s = max(abs(profit*), 0.12 Y), step $0.25 / $0.50 / $1 by axis; knob rides a near-vertical ray through the pointer so it stays under the finger; setup and prompt say to pull it down until it just touches TC | no |
| 7.2 | corner: "width q = 3.80" + "bottom edge $5.20"; Explore price grip: "P = $8.50" + "q* = 4.35, profit $11.93" (the "P = MR" label hides while it shows) | coordinates only while guessing (SAC under the pointer would read the bottom edge off); Explore adds SAC at q and the profit the firm would make there | no tangency | no |
| 7.3 | lines: "shutdown? P = $3.50", "break-even? P = $6.00" (their static labels hide while busy); Explore price grip: "P = $4.60" + "q = 3.26, profit -$3.12" | coordinates only while guessing (SAVC / SAC would read the minimums off: the answer); Explore adds SAVC and SAC at q | no (minimums, not a level-curve tangency) | no: placing two thresholds is reasoning, not a read-off |
| 7.5 | start point: default "q = 2.90, P = $4.20"; row point "q = 4.10 at $8.00"; Explore price grip: "P = $9.00" + "q supplied = 4.45" (static labels hide while busy) | coordinates only while guessing (SMC under the pointer is the answer); Explore adds SMC and SAVC at q | no | considered: step 2 is close to reading SMC at a price, but step 1 (the shutdown jump) is the lesson, so it stays a question |
| 7.7 | `coords: false` removed; every handle has its own tag in its panel's units: d handle "d at $8: q = 1.97" + "shift +0.80"; SMC handle "SMC at q = 4.2: $7.24" + "shift +$1.00"; market price "P = $6.40" (the plum price mark hides while busy); firm dot "q = 3.83, P = $6.35"; consumer dot "q = 1.70, P = $5.20" | firm panel only, wide screens only: "q, $" + SMC and SAC at q (shifted SMC in Explore after a cost shock). Directions are what is scored, so nothing leaks | no | no |
| 7.8 | start point: default "Q = 33.0, P = $4.30"; row point "Q = 38.1 at $8.00"; Explore price grip "P = $10.00" + "10 × 4.65 = 46.5" (static labels hide while busy) | coordinates only while guessing (market supply at a price is the answer); Explore adds the market quantity supplied at the hovered price | no | no: summing is the skill |
| 7.9 | `coords: false` removed; D′ point "P = $6.18, Q = 697"; S′ grip "S′: n = 205 firms" (only the count: the price and profit it implies would read the zero-profit answer off); Explore S′ grip "n = 251 firms" + "P = $5.77, profit $0.96" | firm panel only, wide screens only: "q, $" + profit at the price shown ("profit at $6.40: $3.07") | no | no |

Rule 4: no week 7 figure is a pure read-off.

Hover in 7.7 and 7.9 is limited to the firm panel on wide screens because the kit draws the hover guides
to the frame's own axes (S.x0, S.y0); side by side, those are the firm panel's axes, but in the market
panel or in the stacked phone layout the guides would cross other panels. `hover.text` returns null
elsewhere, which hides ring, guides and pill.

Keyboard: the old Enter-key listener in index.html and `adv()` in figs.js are gone. The kit now moves
focus to the next step's handle after Enter (README Changelog, week 5 round, item 1); the keyboard
script (Space + arrows on the 7.1 knob, then arrows + Enter through every step of every figure) passes
without them. The mount script is a plain `Kit.mount(window.W7FIGS, { store: 'ec224-w7-predict' })`.

index.html style (carried to the live page as `<style id="kit-page-css">`): besides the wider stage
for 7.7 / 7.9, their verdict cells now wrap: in the live page's content column the panel is about 330px
and "up, $5.51 to $6.65" ran past its edge.

Live page (`week7-viz.html`): built from the classic page (tag `classic-site-2026-11-07`) with the prose
edits in `lab/predict/week7/live-edits.json`:

```
node lab/predict/tools/build-live.js 7 sec-71=f71 sec-72=f72 sec-73=f73 sec-75=f75 sec-77=f77 sec-78=f78 sec-79=f79 \
  --edits lab/predict/week7/live-edits.json --lede "<week 2's lede, verbatim>"
```

No ids inside the dropped bays are linked from anywhere (the one inbound link is `#sec-79`, a section
id), so no `--keep-id`. Edits: the prose of 7.1, 7.2, 7.3, 7.7, 7.8 and 7.9 named the old sliders,
toggle, scenario menu, step and Run Entry / Run Exit buttons, and 7.9 called LRS "dotted": rewritten.
Restored by hand (the builder dropped them): the "Fig 7.5" and "Fig 7.9" headings (on the classic page
those two sections carry their `.fig-hd` directly in the section, not in `.fig-prose`, so the builder
treats them as stray) and 7.3's algebraic proof of the shutdown rule (it lived in the bay; Naveen had
asked for it to stay visible), now an insight box in the prose. The empty `#v78-math-display` div
(filled by the old script) is removed. Films 7.5 and 7.9 keep the site player. 103 KB -> 20 KB.

Checks this round: verify.js passes (models unchanged); loadcheck (preview and live page): zero
console errors, no failed requests, no overflow; livecheck with figure 2.3 swapped for 7.2 (a copy in
the scratchpad, the tool hardcodes f23): ALL OK at 1440 and 390 (rail anchors, drawer, ask widget,
keyboard tag, touch scroll, reveal / explore / new round on all seven); keyboard script on every
figure; screenshots at 1440 and 390 of hover, drag tags, the 7.1 pull, reveal and explore, on the
preview and the live page, two rounds (round 1 found the 7.8 Explore "nobody supplies" label showing
while dragging, a misplaced else; and the 7.7 verdict overflow on the live page).

## Known limits

- 7.7's score is coarse (thirds): it grades directions, which is what the figure teaches; the size of
  the student's shift and price move is not scored.
- 7.9: with integer firms the long-run price is not exactly $5.51; the page says "about 297" as the live
  page does.
- The kit's verdict table can run a few pixels past the right edge of the panel on phones when the
  answer cells are long (7.7's "up, $5.51 to $6.65"); it wraps on narrower content. Kit-wide, not fixed here.
- Keyboard: every handle exists from the start of a round (none appears mid-round), arrows move the
  current step's handle, Space switches, Enter confirms and hands the arrows to the next step.
