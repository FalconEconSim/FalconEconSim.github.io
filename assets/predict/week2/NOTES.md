# Week 2 on the kit: notes

Preview page: `lab/predict/week2/index.html`; live page `week2-viz.html`. This folder (`assets/predict/week2/`) holds models.js, figs.js, verify.js. Topic: Indifference Curves & the Consumer Optimum. Engine: `../kit/` (README there).
Economics: `models.js`. Figures: `figs.js`. Checks: `node assets/predict/week2/verify.js` (20,000
draws per figure, 5,000 for the brute-force ones; all pass).

## Per figure: the question and how it is answered on the graph

| Fig | Question | Input | Default answer |
| --- | --- | --- | --- |
| 2.1 | Which other bundles does she like exactly as much as P? Preference type is randomized: Cobb-Douglas, perfect substitutes, perfect complements, neutral Y, Y a bad | tap three bundles (taps on P or on top of each other are refused with a message) | IC through P = (2, 2), U0 = 2, XY = 4 |
| 2.3 | Where does her budget line hit each axis? | drag the two intercept handles | 20 X, 25 Y (I 100, PX 5, PY 4) |
| 2.4 | Income rises 30% (or a price rises / falls). Where does the new line go? | drag the intercepts from the original line; leave the fixed one | 26, 32.5 |
| 2.5 | Which bundle is her best choice? (film on top) | tap the optimum among four background ICs | (8, 10) |
| 2.6 | Which way should she move, and how far? MU per dollar at B is given, ICs are hidden | slide B along the budget line (snaps to $1) | $50 on X |
| 2.8 | How steep is the curve at P, and where would she trade one Y for one X? | turn a tangent line on its handle, then slide Q along the IC | slope -4 at (2.5, 10); MRS 1 at (5, 5) |
| 2.9 | Draw her indifference curve through B (A's curve is shown) | freehand draw; a drawing that crosses A's curve is flagged and the reveal circles the crossing | XY = 12 through (3, 4), below A's XY = 49 |
| 2.10 | Which bundle does she buy? (perfect substitutes) | tap the corner | (0, 20) |

Explore per figure: 2.1 drag P + taste chips; 2.3 drag either intercept (sets that price) + income
stepper; 2.4 change chips + size stepper; 2.5 drag the bundle along the line (dashed IC through
it) + PX stepper; 2.6 drag the bundle with live MU-per-dollar bars + PX stepper; 2.8 drag P along
the curve with tangent and triangle + taste stepper; 2.9 drag B + taste stepper; 2.10 drag the X
end of the line (PX) + MU_X stepper, including the knife edge.

## Decisions to know about
- 2.10: the site's default PX = 4 with a = b = 3 is the knife edge (every bundle on the line is
  optimal), so the first question says PX has just risen from $4 to $6. Everything else is the
  site default (I 80, PY 4, a = b = 3). The knife edge is reachable in Explore.
- 2.6: the site's "starting dollars on X" default of $50 is already the optimum, so the question
  starts at $20 on X. I, prices and a are the site defaults.
- 2.9: the site drags a differently shaped inner IC until it crosses. Here the student draws the
  IC through B for the same person, so the lesson is "it can never cross"; a crossing drawing gets
  the transitivity contradiction drawn on it. The site's IC2 (X^0.5 Y^0.5 = 7) is A's curve.
- 2.1 and 2.9 both ask about an IC through a point, but 2.1 is about preference types (taps) and
  2.9 about non-crossing (drawing).
- 2.5 shows four background ICs (0.6, 0.82, 1.22, 1.5 of U*): two cut the line, two miss it, so
  the student has to imagine the one that just touches. verify.js checks that bracket for every draw.
- Value labels use the fig25 film colors: budget orange, ICs purple, answers ink, values blue.

## Rounds
1. Built all eight figures on the kit. Screens at 1440: escaped HTML in hints, ragged segmented
   control, odd tick steps (6, 12...), 2.3 / 2.4 lines squeezed into a fixed 50 x 50 frame.
2. Kit: `rich()` for author HTML, chips instead of a joined segmented bar. Models: nice tick steps,
   round-sized domains for 2.3 / 2.4. verify.js found a real bug: MU_Y used y^(-b) instead of
   y^(-a) (invisible at a = 0.5); fixed. Phone screens: 2.6 bar title overflowed, "indifference
   curves" label ran off the right edge, "you" tags drifted far from their ghost.
3. Kit: placed labels are clamped into the frame; tags limit their search radius; bar titles
   shorten to fit. Interaction suite (mouse, keyboard only, touch via CDP, 6 new rounds per figure)
   found: keyboard focus jumped to another handle after a step completed (fixed: focus sticks),
   and touch drags on handles were cancelled by the browser pan because Chromium ignores
   `touch-action` on SVG children and emulated touch fires no touchstart (fixed in the kit: HTML
   overlay hit targets with `touch-action: none`).

## Switchover round (Nov 2026): Naveen's rules and the live page

Week 2 is the pilot for the switchover (lab/predict/SWITCHOVER.md). What changed and why, per figure:

| Fig | Rule 1: live tag while moving | Rule 2: hover readout | Rule 3: pullable curve | Rule 4 |
| --- | --- | --- | --- | --- |
| 2.1 | placed bundles and P (Explore): "X = 8.0, Y = 2.0" + "U = 4.00" | **U at the point, always** (Naveen's exact request), snapped to 0.1 like the taps; setup says "Point at any bundle to see its utility" | no (it would draw the answer) | no |
| 2.3 | ends: "X = 20.0" / "Y = 25.0" (axis grips show one coordinate); the static end label hides while its tag shows; Explore ends: "P_X = $5, X = 20" | cost of a bundle, **Explore only** (in the question it would read the intercepts off) | no tangency | no |
| 2.4 | same as 2.3 | cost at the new prices, Explore only | no | no |
| 2.5 | the bundle (Explore): coordinates + U | coordinates, U and cost, always (computing U and cost is what a student would do by hand) | **yes: Kit.pull IC**, starts at 0.72 U* (cuts the line), range 0.3 to 1.9 U*, step 0.1 for the default (power of ten near U*/40); setup and prompt say to pull it until it just touches, then tap | no |
| 2.6 | the bundle on the line: "$32 on X" + coordinates; the static "$ on X" label hides while the tag shows | U, **Explore only** (her curves are hidden in the question on purpose; the MU-per-dollar bars are the clue) | not added: the question is MU per dollar with the curves hidden; a pullable IC would undo that design | no |
| 2.8 | turn knob: "slope -1.4" (static slope label hides while it shows); Q and the Explore point: coordinates, 2 decimals | MRS at the point, **Explore only** (in the question the MRS is the answer) | no level-curve tangency here | considered: the question asks the student to estimate a slope and find where MRS takes a value, a skill rather than reading a displayed number, so it stays a question |
| 2.9 | B (Explore): coordinates + U | U at the point, always; on touch it rides on the pen while drawing | no | no |
| 2.10 | Explore X end: "P_X = $6, X = 13.33" | U and cost, always | **yes: Kit.pull straight IC** U = aX + bY, starts at 0.4 U*, pull it out until it last touches the budget set: the corner | no |

Rule 4 (read-off figures become explore-first): none in week 2. Every question asks for a
prediction or a construction, not a value printed along a curve.

Live page (`week2-viz.html`): built by `lab/predict/tools/build-live.js` from the classic page (tag
`classic-site-2026-11-07`) with the prose edits in `lab/predict/week2/live-edits.json` (three
sentences that named the old sliders and orange point). Exact command:

```
node lab/predict/tools/build-live.js 2 sec-ic-intro=f21 sec-budget=f23 sec-shifts=f24 sec-optimum=f25 sec-mupd=f26 \
  sec-mrs-slider=f28 sec-ic-cross=f29 sec-corner=f210 --keep-id sec-ic-types=f21 --keep-id sec-budget-viz=f23 \
  --keep-id sec-optimum-viz=f25 --edits lab/predict/week2/live-edits.json --lede "Each figure asks one question. ..."
```

(the full lede is in the page). Sections keep the site prose, the 2.4 and 2.5 films keep the site's
film player (narration, speeds; the kit's own film is off with `films: false`), and the Cobb-Douglas
section (no figure) is unchanged. The page dropped JSXGraph, D3, figkit.js, deltabar.js, figplace.js,
figlabels.js, figreset.js, the tooltip script and about 2,300 lines of old figure JS; 83 dead CSS rules and keyframes
went with them. 195 KB -> 36 KB.

Checks this round: verify.js passes (models unchanged); interaction scripts at 1440 and 390 (hover,
place drags, pull by mouse, touch and keyboard, keyboard tags, reveal, explore, new round on all eight
figures, rail anchors, nav drawer, ask widget, touch scroll over a plot): zero console errors, no
horizontal overflow.

## Known limits
- Freehand drawing on keyboard is approximate (arrow keys raise or lower a straight line).
- 2.4 has 14 distinct questions (6 change types x sizes that give intercepts on the 0.5 grid).
- 2.9's drawing is a function of X (one Y per bin), which suits Cobb-Douglas curves; a student
  cannot draw a curve that doubles back.
- During a tap or draw step a touch that starts inside the plot is captured (no scroll); outside
  the plot, or in other steps away from handles, the page scrolls.
- Labels are placed by a deterministic heuristic; with rare draws a tag can sit a little away
  from its point.
