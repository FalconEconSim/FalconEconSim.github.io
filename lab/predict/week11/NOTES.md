# Week 11 on the kit: notes

Page: `index.html` (Public Goods & Externalities). Engine: `../kit/` (README there), unchanged.
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week11/verify.js` (20,000
draws per figure plus every Explore setting of the site's sliders; all pass, float tolerance 1e-6).
Interaction suite and screenshot scripts live in the scratchpad (`wk11/interact.js`, `snap.js`,
`touch2.js`), not in the repo.

This week is a port of the original prototype, `lab/week11/v5/` (left untouched, the review page
links to it), onto the shared kit, so it behaves like weeks 2 to 4.

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 11.1 | Where will the market end up, and where should it be? (film on top) | tap the market point, tap the optimum (drag to adjust, $1 / 1 unit grid), drag the gold tax arrow up | Q_E 45 at $55, Q* 35 at $65, tax $20 (DWL $100) |
| 11.2 | Which split of the cleanup is cheapest? | drag the divider along the "split" axis (A from the left, B from the right) | A 80, B 20, permit price $160, $8,000 vs $12,500 equal shares (36% less) |
| 11.3 | Draw the social benefit curve. Where should output be? | freehand MSB, then drag the Q* marker | MSB = MB + $20, Q* 55 (Q_E 45, DWL $100, subsidy $20) |
| 11.4 | When is the streetlight worth building, and when does someone actually buy it? | drag two bars: highest cost worth building, highest cost one neighbor buys alone | $360 (3 x $120) and $120; at $300 it is worth building but not built, $60 lost |
| 11.5 | Who ends up polluting how much? | slide two markers on rails under the axis: factory owns the right (starts at 50), neighbor owns it (starts at 0) | S* 25 both ways, MB = MD = $50; payments $625 to $1,875 either way |

Explore per figure: 11.1 drag the tax + MEC stepper (0 to $50, the tax follows if it matched);
11.2 drag the divider (red waste sliver, both MAC dots) + total abatement stepper (20 to 150 in 5s,
the site's slider); 11.3 drag the subsidy + MEB stepper (0 to $40); 11.4 group size N (1 to 8) and
value per person ($0 to $200) steppers, the site's two sliders, plus a draggable cost line;
11.5 "who owns the right" chips + drag the marker one deal at a time (green wedge = gains left).

## What changed from v5
- Engine: v5's own `predict.js` / `style.css` replaced by the shared kit (same flow: predict,
  film-style reveal with a ghost, verdict with score and table, Explore, "Try a new one", tally).
  Steppers and chips are the kit's declarative controls; labels go through the kit's placer.
- 11.1: the fig111 film sits on top. Colors now follow the site and the film (PMC green, SMC red,
  Q* red; v5 had PMC orange, SMC purple). Tapped points snap to whole numbers so the verdict table
  shows clean values. Q_E stays labelled after the tax slides the market to Q*, as in the film.
  The why spells out the textbook DWL formula (1/2 x 10 x $20) and what firms keep ($45).
- 11.2: same divider question. Added cost labels inside each firm's area ($6,400 + $1,600) and,
  in Explore, dots on both MAC lines with "next unit: A $x, B $y" in the readout. Curve names use
  the site's notation (MAC_A = 2e_A, MAC_B = 8e_B, permit price lambda*). The stepper uses the
  site's range (20 to 150 in steps of 5; v5 was 40 to 150 in 10s).
- 11.3: same draw-then-place question, now on the kit's `draw` step. MSB is green and MC orange as
  on the site (v5: MSB purple). The frame fits MEB up to $40 and no longer depends on the round's
  MEB, so the axis cannot hint at the answer. Random MEB starts at $14 (at $10 the market answer
  was too close to score as a miss).
- 11.4 is new. v5 asked for a vertical sum of three continuous MB lines (Ana / Ben / Cai, a light
  at $180), a model that is not on the course page or in the textbook. The site's figure is N
  identical neighbors valuing one light at v against a $300 cost, with three outcomes (someone
  buys it alone / efficient but nobody pays / not worth it); the textbook's version is the same
  binary test (r_A + r_B > c, each r_i < c). The new question turns that into two thresholds on
  one $ axis, so it is answered by dragging and it still teaches vertical summation: the reveal
  stacks the N values into the "worth building" column, drops one value into the "buys it alone"
  column, shades the free-rider gap between them, then draws the $300 cost line and the surplus.
- 11.5: same rails question; rail markers now refuse to count as answered until moved; the
  curve names use the site's wording ("MB of polluting", "MD to neighbor").
- Every figure: keyboard path checked end to end (see below), random draws checked by verify.js.

## Deviations from the live defaults, and why
- None in the first-load numbers: every figure opens on the site's defaults (MEC $20, total 100,
  MEB $20, N 3 / $120 / $300, MB 100 - 2S with MD 2S).
- 11.2 is drawn as the textbook "split" diagram (e_A from the left, e_B from the right) instead of
  the site's two lines from the origin; same MAC functions, same numbers. It is what makes "drag
  the split" possible and shows the extra cost as a triangle.
- 11.4 random rounds keep the site's ranges (N 2 to 8, v $40 to $200 in $10, cost $300), so a lone
  buyer never appears in a random round (v is at most $200). Explore's cost line lets students see
  that case (drag the cost under v).
- Frames differ from the site (e.g. 11.1 runs to $120, 11.3 to $150) to leave room for guesses and
  for the Explore ranges.

## Kit issues hit (kit not edited)
- Keyboard focus: after a step completes, the kit keeps the focused handle index, so arrows kept
  moving the old handle. Workaround here: in multi-handle steps (11.1, 11.4, 11.5) the current
  step's handle is listed first (`activeFirst` in figs.js). Tested: 11.5 is completed with the
  keyboard only, the second marker gets focus after Enter.
- `place` steps with a custom handle: used `key` + `handle: false` (as week 4 does) so the kit
  knows the point exists and does not re-place it on an arrow key.

## Rounds
1. Built all five on the kit; verify.js first run flagged scoring that was too kind to classic
   mistakes at small MEC / MEB, the 11.1 tax arrow too close to Q* in one corner, and a 7.5-tick
   axis at total 150. Screens at 1440: MAC_B name missing (every candidate spot was above the
   frame), 11.4 scored a near miss ($290 vs $360) at 4 of 100, a block value sat under the cost
   line, 11.5 value tags collided with the rail titles, 11.3 table cell too wide.
2. Label candidates only on the visible part of each MAC line; 11.4 scored on relative error;
   block labels dodge the cost line; rail tags sit on the rail. Phone screens: 11.4 crowded around
   $300 (taller phone aspect, block labels registered as obstacles, shorter ghost tags), duplicate
   $120 in the "alone" column removed.
3. Interaction suite: mouse (tap, drag, draw), keyboard only (11.2, 11.5), touch at 390 (tap
   places, drawing and handle drags do not scroll, a swipe on an empty plot scrolls), steppers,
   chips, cost handle, 6 new rounds per figure, NaN scan, no horizontal overflow, no console
   errors. 40 of 41 passed on the first run; the one failure was the test swiping while a previous
   fling was still scrolling, and passed when re-run at rest.

## Known limits
- 11.5 has 34 distinct random rounds (whole-number Smax, S* on the 0.5 rail grid); 11.4 has 97.
- Freehand drawing on keyboard is approximate (arrow keys raise or lower a straight line).
- 11.4 Explore rescales the $ axis when N or v changes (the stack would otherwise leave the frame).
- Labels are placed by the kit's heuristic; with rare draws a tag can sit a little away from its
  mark, mostly on phones.
- The 11.1 film shows the default round's answer; as in weeks 2 to 4 it is "watch first".
