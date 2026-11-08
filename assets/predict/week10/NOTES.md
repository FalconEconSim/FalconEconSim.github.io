# Week 10 on the kit: notes

Preview page: `lab/predict/week10/index.html`; live page `week10-viz.html`. This folder (`assets/predict/week10/`) holds models.js, figs.js, verify.js. Topic: Oligopoly Models & Spatial Competition. Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week10/verify.js` (20,000 draws for
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
- Keyboard: the old workarounds for the kit focus quirk (current step's handle listed first, `noAutoDone`
  on every predict handle) were removed in the switchover round; the kit now keeps focus on the step
  (README Changelog). Keyboard-only runs of all five figures still score 100 (see below).

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

## Switchover round (Nov 2026): Naveen's rules and the live page

Per figure (rules from lab/predict/SWITCHOVER.md):

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 10.1 | B line ends "q_B = 60" / "q_A = 120" (`axes.xname / yname` q_A, q_B); Stackelberg point "q_A = 60.0, q_B = 30.0" plus profits; Explore point "q_A = 24.0, B replies q_B = 48.00" plus profits (the static pair label hides while busy) | **both firms' profits at the point, always** ("π_A = $1,600, π_B = $1,600"): what a student computes by hand, not the answer | **yes: A's iso-profit curve** (`Kit.pull`, blue dashed, knob, "π_A = $1,800"), shown in step 2. Lower curve means more profit; pull it down until it just touches your B line: that touch is Stackelberg. Range 0.3 to 1.6 of the leader's profit, starts at 0.6 (cuts B's line), the step divides π_L (`pullStep`); the knob rides the ray from (c/2, 0), which is inside every curve, so it stays under the finger. Explore also draws A's iso-profit through the dragged point (it touches B's line only at Stackelberg) | no |
| 10.2 | "A at 0.69", "both end at 0.50"; Explore "A at 0.30 / A's share 50.0%" and the same for B | A's share if A stood at that spot, **Explore only** (in the question it is the answer); the ring sits on the beach | no tangency | no |
| 10.3 | "n = 1: P = $60", "n = 3: P = $30", "heads to P = $0" (static price labels hide while busy); Explore "n = 5: P* = $20 / each firm q = 20" | P* at the whole n under the pointer, **Explore only** | no | no: three predicted prices, not a read-off |
| 10.4 | placed points "Q = 80.0, P = $40" plus industry profit | on the demand curve (within 40 px): price and industry profit (P - MC) x Q, always (like U on an IC map); off the curve plain coordinates | no | no |
| 10.5 | your price "P = $59" (static label hides while busy); Explore "your P = $50 / profit $2,100", "rival P = $60" | while drawing or hovering: the pen's own price and profit (coordinates); in Explore your true profit at that price | no (a cliff, not a tangency) | no: the student draws the curve |

Rule 4: no week 10 figure is a pure read-off, so none became Explore-first.

Other changes this round:
- 10.4 Explore readout is now the classic page's "fully worked" profit calculation (Naveen's earlier request;
  the empty `#v104-worked` box the old script filled), one numbered step per line, for any market.
- 10.4 phone fix: while a new model is still to be placed, earlier points grab only within about 18 px
  (custom `hit`), so a tap 10 units away places the new point instead of moving an old one.
- 10.1 keyboard: after Enter confirms B's line, keyboard users get the iso-profit knob alone (B's ends come
  back on any pointer press), so Space picks the knob, arrows pull, Space hands the keys back, Enter drops
  the point. verify.js checks the iso-profit (profit L along it, passes through and only touches B's line at
  Stackelberg, the start level cuts and the top of the range misses, origin inside, step divides π_L) and
  the hover profits.

Live page (`week10-viz.html`), built from the classic page with the edits in
`lab/predict/week10/live-edits.json` (generated from exact spans of a plain build):

```
node lab/predict/tools/build-live.js 10 sec-101=f101 sec-102=f102 sec-103=f103 sec-104=f104 sec-105=f105 \
  --edits lab/predict/week10/live-edits.json
```

No `--keep-id` (the only inbound link is `#sec-101`, the section itself) and no `--lede` (the classic header
has no lede; the edits add one after the byline). Edits: the 10.1 heading (a top-level .fig-hd the builder
drops as stray; 10.2 to 10.5 keep theirs in the prose), prose naming old controls in all five sections, the
empty worked-calculation box and its CSS, the lede. The 10.1 film keeps the site player. Dropped scripts:
theme.js (it only strips a stale data-theme; week 2 does not load it either), figkit.js, D3, vizkit.js,
figplace / figlabels / figreset and the old figure script. The preview page's style block (copied into the
live page as kit-page-css) also keeps the figure on the 16 px phone gutter: this week's `<main>` has no
`.main-content` padding, so kit-site.css's -0.75rem bleed put the figure 4 px from the screen edge.

Checks this round: verify.js passes; loadcheck (both pages: zero console errors, no failed requests, no
overflow); livecheck with the keyboard test on 10.1 (rail, drawer, ask widget, touch scroll, every figure
reveal / explore / new round) at 1440 and 390, clean (with a 6 s wait after "just show me": 10.2's reveal
runs 4.9 s, longer than the tool's 4.5 s); keyboard-only runs of all five (100 each); mouse and CDP-touch
runs with hover, drag tags, the pull, reveal and explore screenshots at 1440 and 390, read and fixed over
two rounds.

## Known limits
- 10.1 and 10.4 at phone width are dense (three lines and several labelled dots); labels may sit on
  a line, with a paper halo.
- 10.2 Explore: when both vendors stand on the same spot the A handle is grabbed first.
- 10.5 drawing score is forgiving near the cliff (any jump within 2% of the rival's price is fine).
- 10.1 at phone width: the drag tags with two lines are wide; they move above the finger.

## Kit-fix round (Nov 2026, after the switchover)

The live page was rebuilt with the command above after the builder change; its `.fig-hd` headings are now section headings (`§ N.M` + h2), as in weeks 2, 3 and 12, so the figure number no longer shows twice (the kit prints "Figure N.M"). The 10.1 keyboard workaround (keyboard users got the pull knob alone in step 2) is gone: Space reaches the knob, arrows pull, Enter puts it down and hands the keys back (kit); kbdHint updated. 10.2 and 10.3 hovers use `hover.at` for the ring on the axis instead of a huge y snap. The preview style lost the phone-gutter rule (kit-site.css does it for every page). live-edits.json lost the 10.1 heading edit.
