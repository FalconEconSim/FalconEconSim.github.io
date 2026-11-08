# Week 12 on the kit: notes

Preview page: `lab/predict/week12/index.html`; live page `week12-viz.html`. This folder (`assets/predict/week12/`) holds models.js, figs.js, verify.js. Topic: Adverse Selection & Moral Hazard. Engine: `../kit/` (README there).
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week12/verify.js` (20,000 draws
per figure; all pass). Interaction suite and screenshot scripts live in the scratchpad
(`wk12/interact.js`, `snap.js`, `pool.js`, `crop.js`), not in the repo.

`week12-viz.html` has two figures (12.1 lemons, 12.2 Spence signaling), so the page has two.
The live page has no moral hazard or insurance figure; none was added.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 12.1 | How many peaches does the market need to keep them for sale? And at p = 0.50, what does a car sell for? (film on top) | 1: slide a point along the dashed $2,000 reserve line to p*; 2: drag a point up or down the dotted p = 0.50 line to the most a buyer pays for a car actually on sale | p* = 800/1,200 = 2/3; at p = 0.50 the offer is $1,800 < $2,000, peaches exit, buyers pay at most $1,200 (lemons trade at $1,000 to $1,200) |
| 12.2 | Which education thresholds s* separate the two types? | 1: drag the plum left edge; 2: drag the plum right edge (a plum band shows the range) | 20 (low type: 100 - 3s* <= 40) to 60 (high type: 100 - s* >= 40); least-cost 20, high type nets $80k there |

Explore: 12.1 drag the offer point along E[WTP] (it stops on p* exactly, mouse and keyboard), plus a
stepper for the peach owner's reserve (moves p*); readout says pooling, separating or knife-edge and
the trade price range. 12.2 drag the threshold line (dots show each type's net pay), plus a stepper for
the low type's cost c_L (down to c_L = c_H, where the readout says single crossing fails).

Reveal timelines: 12.1 E[WTP] draws in, the knife-edge lands on the reserve, the red / green regions
fade in, then a dot rises at p0 to the average offer and (if separating) an arrow drops it to the
lemon value. 12.2 the high type's line draws in and lands on the outside option at 60, the low type's
line lands at 20, the green separating band fades in.

## Decisions to know about
- Live defaults kept exactly: lemons $1,000 / $1,200, peaches $2,000 / $2,400, E[WTP] = 1,200 + 1,200p,
  frame $1,000 to $2,600; Spence y_H = 100, y_L = 40, c_H = s, c_L = 3s, frame s* 0 to 80. The 12.2
  y axis runs to $120k instead of $110k (cleaner $20k ticks); the numbers are unchanged.
- 12.1: the site is a slider with no question. The question uses the slider's start p = 0.50 (also the
  film's case). The second step tests unravelling: the trap answer is the pooled average $1,800, which
  earns nothing on that step whenever peaches have exited (checked by verify.js).
- 12.1: the E[WTP] line is hidden while predicting (the crossing would be the answer); the student
  computes p* from the setup's numbers. Same idea in 12.2: the payoff lines are hidden while predicting,
  only the outside option and the diploma wage show.
- 12.1 random rounds: lemon value $600 to $1,600, peach value $800 to $2,000 above it, peach reserve
  on a $100 grid with p* in [0.35, 0.85], p0 from {0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8} at least 0.1 away
  from p*. About 44% of draws pool. p* shows as a fraction when its denominator is 6 or less (2/3, 3/4),
  else as "p* ≈ 0.538". The price handle always starts near the top of the frame, and draws are kept
  only where that start is far from the answer (so p0 = 0.9 was dropped).
- 12.2 random rounds: y_H 70 to 150, y_L 20 below it at least 30, c_H = s or 2s, c_L from 2s to 8s,
  whole-number edges, range at least 12 wide, frame fit with room on both sides.
- 12.2 the low type compares mimicking (y_H - c_L s) with the y_L it gets without the diploma, as on
  the site; edges use weak inequalities (at s* = 20 the low type is indifferent and stays out).
- Phones: 12.1 drops the "all lemons / all peaches" end labels (desktop fades them out once the zones show, see below) (values are in the setup) and shortens
  others; the E[WTP] name prefers the right end of the line.

## Kit issues hit in the first build (both fixed in the kit since; workarounds removed in the switchover round)
- Keyboard focus stayed on handle index 0 after a step's new handle appeared. Week 12 listed the new step's handle
  first and set `noAutoDone: true` on every predict handle. The kit now moves focus with the step, so both are gone.
- `D.drop` ignored `reg: false`; the p* guide was a plain unregistered `D.line`. It is now `D.drop(..., { y: false, pr, reg: false })`.

## Rounds
1. Built both figures. Screens at 1440: value labels drifted far from their points (kit default search
   radius 260), "p = 0.5" instead of 0.50, the reveal edge labels and band label vanished once the
   reveal ended (explore drew its own marks immediately), 7/13 shown as a fraction.
2. Added a `side()` helper (fixed side order, 26px search), explore shows the reveal picture until the
   student touches it, p* fractions only for small denominators, band label kept in explore. Screens:
   12.2 outside-option label collided with the edge labels; the 12.2 explore knob covered the band label.
3. Dropped the 12.2 edge text (dots + band label + verdict carry it), moved the explore knob to the
   bottom, unregistered guide lines. Phones: "lemons only" label clamped over its own dot, E[WTP] name
   collided with the p* label on some draws: shorter phone labels, end labels hidden on phones, E[WTP]
   candidates away from p0 and p*. Interaction suite (mouse, keyboard only, CDP touch, 6 new rounds per
   figure with "just show me", NaN scan, overflow at 1440 and 390): 72 checks, 0 failures, no console
   errors.

## Switchover round (Nov 2026): Naveen's rules and the live page

What changed per figure (lab/predict/SWITCHOVER.md, rules 1 to 4):

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 12.1 | step 1 knob "p* = 0.60"; step 2 knob "$1,700 at p = 0.50"; Explore knob "p = 0.80" + "buyers offer $2,160" ("p = p* = 2/3" + the reserve on the knife-edge). The static plum labels and the Explore offer label hide while their knob's tag shows. A `coords` function maps the frame's y (dollars minus the frame bottom Y0) back to dollars, so tags and the hover never show frame units | point under the pointer as "p = 0.30, $1,400", always; **the buyers' average offer E[WTP] at that p, Explore only** (in the question the E[WTP] line is hidden on purpose: its crossing with the reserve is the answer) | no level-curve tangency (a line crossing a reserve, then unravelling) | no: p* is computed from the setup numbers with the offer line hidden, and step 2 tests unravelling, not a reading |
| 12.2 | edge knobs "s* = 25" (whole numbers, not "25.0"); Explore knob "s* = 45"; the static plum edge labels hide while their knob's tag shows | "s* = 30, $90k", always; **what each type nets with that education ("high nets $70k, low $10k"), Explore only** (in the question the payoff lines are hidden: they give the edges away) | no level curve: the edges are where a straight payoff line meets the outside option | no: the payoff lines are hidden, the edges are worked out from the setup |

Kit fixes picked up (README Changelog): the `noAutoDone: true` on every predict handle and the "new step's
handle first" ordering are gone (focus follows the step now; checked: arrows move step 1, Enter, arrows move
step 2, Enter, both steps done, in both figures); the 12.1 knife-edge guide is `D.drop(..., { y: false, pr,
reg: false })` instead of a hand-drawn unregistered line.

Labels: on desktop the "all lemons / all peaches" end values now show while the E[WTP] line draws in and fade
out as the pooling / separating zones come in (they collided with "Pooling: both trade" in the default round
and with the unravelling labels on other draws); the values stay in the setup and the hover. On phones the
pooled "offer $X" label beside the Explore knob is left out (it covered the reserve label); the readout and
the tag carry the number.

Live page (`week12-viz.html`): built by `lab/predict/tools/build-live.js` from the classic page (tag
`classic-site-2026-11-07`) with `lab/predict/week12/live-edits.json`. Exact command:

```
node lab/predict/tools/build-live.js 12 sec-121=f121 sec-122=f122 --edits lab/predict/week12/live-edits.json
```

- No `--keep-id`: nothing links into the old bays (the repo only links `week12-viz.html` and `#sec-121` / `#sec-122`).
- The edits: the lede (the header has no `<p class="lede">`, so `--lede` does nothing; it is inserted after the
  byline), an empty `<style>` left after the dead-rule pass is removed, section headings (12.1's `.fig-hd` sat
  outside the prose and the builder drops it, 12.2's sat inside; both become `.sec-hd` with an h2, as week 2), and
  three prose sentences that said "Slide ..." rewritten to point at Fig 12.1 / 12.2 below.
- The lab page's `<style>` (copied into the live page as `kit-page-css`) carries two week-local fixes: the verdict
  "You" cells keep numbers whole on phones, and on the live page the kit bay does not bleed past the 16px gutter
  on phones (this page's `<main id="main-content">` has no side padding, unlike week 2's `main.main-content`).
- Dropped and not needed: theme.js (only strips a `data-theme` attribute nothing sets any more; week 2 never had
  it), vizkit.js (d3 helpers), figkit.js, d3, figplace.js, figlabels.js, figreset.js, the old figure scripts.
- The film keeps the site's player; the kit film is off.

Checks this round: verify.js passes (models unchanged, 20,000 draws per figure); loadcheck on `week12-viz.html`
and `lab/predict/week12/` (zero console errors, no failed requests, no overflow); livecheck (a copy keyed to
12.1 instead of 2.3) at 1440 and 390: rail, drawer, ask widget, keyboard tag, touch swipe scroll, reveal /
explore / new round on both figures, ALL OK; screenshots at 1440 and 390 of hover, drag tags (mouse and CDP
touch), revealed, Explore drag and hover, the film, the top of the page, plus four random rounds per figure.

## Known limits
- Labels are placed by the kit's heuristic; on phones with some draws the E[WTP] name sits a little
  above the line rather than right beside it.
- 12.1 rounds p guesses to 0.01; p* is scored with full marks within 0.015, so 2/3 is reached at 0.67.
- 12.2 explore can show negative net pay for the low type (e.g. -$110k at s* = 70), as the site does.
