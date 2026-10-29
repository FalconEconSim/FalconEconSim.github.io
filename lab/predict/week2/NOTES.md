# Week 2 on the kit: notes

Page: `index.html` (Indifference Curves & the Consumer Optimum). Engine: `../kit/` (README there).
Economics: `models.js`. Figures: `figs.js`. Checks: `node lab/predict/week2/verify.js` (20,000
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

## Known limits
- Freehand drawing on keyboard is approximate (arrow keys raise or lower a straight line).
- 2.4 has 14 distinct questions (6 change types x sizes that give intercepts on the 0.5 grid).
- 2.9's drawing is a function of X (one Y per bin), which suits Cobb-Douglas curves; a student
  cannot draw a curve that doubles back.
- During a tap or draw step a touch that starts inside the plot is captured (no scroll); outside
  the plot, or in other steps away from handles, the page scrolls.
- Labels are placed by a deterministic heuristic; with rare draws a tag can sit a little away
  from its point.
