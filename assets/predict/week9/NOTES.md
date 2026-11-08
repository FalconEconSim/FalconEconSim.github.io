# Week 9 on the kit: notes

Preview page: `lab/predict/week9/index.html`; live page `week9-viz.html`. This folder (`assets/predict/week9/`) holds models.js, figs.js, verify.js. Topic: Non-Linear Pricing, Natural Monopoly & Game Theory. Engine: `../kit/`
(README there), unchanged. Economics: `models.js`. Figures: `figs.js`. Checks:
`node assets/predict/week9/verify.js` (20,000 draws for 9.2, 9.3 and 9.4; 9.1 runs at most 4,000
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

## Switchover round (Nov 2026): Naveen's rules and the live page

Rules from lab/predict/SWITCHOVER.md, applied per figure:

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 9.1 | usage-charge point: "p = $1.40, Q = 16" (the static "p = $1.40" label hides while the tag shows); in Explore a second line "total profit $19.20"; the one-price point: "Q = 10.0, P = $2.00" | Q and P anywhere, always. In Explore also "one price here: profit $8.00" ((P - MC) x Q, only on or under demand). Not while predicting: profit along demand would answer both steps | **yes, step 2 only** (the single-price point is where an iso-profit curve (P - MC)Q = π just touches demand). Plum dashed π curve, starts at 0.55 π_M (cuts demand), range 0.15 to 1.8 π_M, step a power of ten near π_M / 40 ($0.10 at the default), tag "π = $9.90"; the step-2 prompt says to pull it until it just touches demand | no: the question asks for the profit-maximizing charge and the one-price benchmark, not a value read off a curve |
| 9.2 | both points on demand: "Q = 27.5, P = $32.50" (Q to 2 decimals because P snaps to $0.50) | Q and P while predicting; in Explore also "profit $550.00" / "loss $200.00" (P x Q - TC). Not while predicting: left alone is the profit maximum and P = AC is zero profit | **yes**: iso-profit curve P = MC + (π + F) / Q, pulled out until it just touches demand gives the left-alone point; the setup says AC is the π = 0 curve. Same start / range / step rules ($10 at the default) | no |
| 9.3 | none: a payoff matrix, not an x-y plot. `coords: false` set explicitly; its place steps have no key and its Explore handle is pixel-placed, so the kit draws no tag; no `hover` spec, so no kit readout | instead a cheap per-figure mouse hover (in bindGame): the payoff under the pointer gets a tinted box in its player's color and the payoff it is compared with (same column for A, same row for B) a faint dashed box. Mouse only, no touch capture, off during the reveal | no level curve | no |
| 9.4 | each bar: "block 2: P = $1.65" (the static cents label above the bar hides while its tag shows) | Q and P while predicting (reading the demand price at a block's right edge is the method); in Explore also "block 2 at this rate: profit $3.00" or "block 2 sells only up to $1.67" (`blocks.blockAt` in models.js) | no tangency | no: the student has to know which unit sets each rate; that is more than reading a value |

Rule 4: no figure converted. 9.1 and 9.4 were sliders on the classic page, but each question asks for a
choice (a price, a staircase) that the student has to reason out, not a value printed along a curve.

The pull knob and the answers: pulled to the tangency, the knob sits exactly on the point the student
must tap next, and a tap near a knob grabs the knob. So `isoPull` (figs.js) wraps the kit's handle with a
`drop`: when the knob is let go within 44px of demand it moves along its own curve (same level) to the
right-hand start position, at 0.8 (9.1) or 0.75 (9.2) of the choke quantity, leaving the touching point free.

models.js: `twopart.solve` and `natmon.solve` now also return `iso` (level through a point, curve at a
level) and `pull` (lo, hi, start, step). verify.js checks for every draw (9.1: 4,000; 9.2: the first 4,000):
level and curve invert; the highest iso curve that touches demand touches it at the answer (grid search);
the start curve cuts demand and the top of the range misses it; the range is wide on both sides; the step
is a power of ten and the start sits on it. `blocks.blockAt` is checked at every block's answer and just above it.

Live page (`week9-viz.html`), built from the classic page (tag `classic-site-2026-11-07`):

```
node lab/predict/tools/build-live.js 9 sec-91=f91 sec-92=f92 sec-93=f93 sec-94=f94 --edits lab/predict/week9/live-edits.json
```

No `--keep-id` (nothing in the repo links to an id inside the old bays) and no `--lede` (the week 9 header
has no lede paragraph for the builder to replace; the lede is added by a prose edit). No films.
`live-edits.json` also: restores the MathJax script (the builder only keeps a mathjax script without
`async`; week 9's has `async`, so it was dropped silently and the prose math would not render); removes the
empty `#v92-note` panel and its dead CSS; rewrites the sentences that named old controls ("Slide the usage
charge", "Switch between regimes", "New practice game", "outlined", "Slide the number of blocks", "push the
slider"). Dropped by the builder and not restored: theme.js (it only strips a stale `data-theme`; weeks 2 to 8
do not load it), figkit.js, d3, vizkit.js, figplace.js, figlabels.js, figreset.js and the figure scripts.
The classic page had no rail tracker script, so the live page has none either.

Also in figs.js: "Try a new one" on 9.4 (last figure, short page below it) left the question at 24px, under
the 3rem top bar (the kit only scrolls when the question is above 0, and the page shrinks as the verdict goes).
`bindNewone` adds a second check after the kit's handler. Reported to the lead as a kit fix.

Checks this round: verify.js passes; loadcheck (live page and preview): zero console errors, no failed
requests, no overflow; livecheck (a copy with the keyboard / touch checks pointed at 9.4 instead of 2.3):
rail, drawer, ask widget, keyboard tag, touch swipe scrolls, reveal / explore / new round on every figure at
1440 and 390, all OK; screenshot script (scratchpad wk9/shots.js) at 1440 and 390: drag tags, hover,
pull, guessed, revealed, Explore drag and hover, on the preview and the live page.

## Known limits
- 9.1's second step (single-price monopoly) is week 8 material used as the benchmark, as in the
  textbook figure.
- 9.3's Explore stepper edits one payoff at a time; ties are allowed there and are then shown as
  "either" in the readout and as extra Nash cells, but random rounds never contain ties.
- 9.3 changes the stage cursor to the kit's "grab" on hover in Explore (the kit sets it inline).
- Labels are placed by the kit's deterministic heuristic; on phones a tag can sit on a dashed
  guide line in 9.2's reveal.
- verify.js runs 4,000 draws for 9.1 (grid search cost), 20,000 for the rest.
