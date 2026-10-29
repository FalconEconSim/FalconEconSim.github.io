# v2: Touch the economics

## Concept
No sliders and no toggle buttons. Every change is made by grabbing the graph itself:
- 11.1 the market point rides up the demand curve and a gold tax wedge opens beneath it
  (PMC to MB at the market quantity); a red handle lifts the SMC curve (harm per unit).
- 11.2 the split between Firm A's and Firm B's cleanup (back-to-back MAC diagram); each step
  right is one permit sold by A to B.
- 11.3 a quantity marker on the axis; the gold gap at the marker is the subsidy (or tax) it
  would take to get buyers there; a green handle lifts MSB.
- 11.4 each neighbour's MB curve has its own handle; the black vertical sum follows, and a
  reading line on the axis stacks the three values into a bar (130 + 110 + 90 = $330).
- 11.5 a bargaining point on the axis; tap the side that should hold the right.

Handles: 34px white body, 62px hit area, coloured grip lines and two arrowheads that rotate
to the direction of travel, hover/drag glow, cursor matching the direction, a pulsing ring
until the first touch. Snapping: a 14px (16px on phones) magnet pulls the value onto the
optimum and the market outcome, the ring pulses and a plum pill says what was snapped.
Ghost rings on the path mark where the magnets are. Every handle is also a keyboard
slider (arrows, Shift for x5, Home/End, stops on snap points).

Numbers live on the graph next to what they measure (tax at the wedge, DWL at the triangle,
surplus in the green area, marginal costs on the dots, the deal at the top). One live
sentence under each graph narrates the state.

Touch: handles are `touch-action: none` (+ a non-passive touchstart for old iOS); the rest
of the SVG leaves touch-action alone, so swiping on a graph scrolls the page.

## Economics (all checked against the textbook / week11-viz.html)
- 11.1 MB 100-Q, PMC 10+Q, MEC $20: Q_E 45, Q* 35, DWL $100, t* $20. DWL = (Q-Q*)^2,
  social surplus = (90-MEC)Q - Q^2. Tax at market point Q is 90 - 2Q.
- 11.2 MAC_A 2e, MAC_B 8e, total 100: equal 50/50 $12,500; trade 80/20 $8,000, price $160,
  saving $4,500 (36%). Waste vs optimum = 5(e_A-80)^2. Each firm emits 100 and gets 50 permits.
- 11.3 MSB = MB + MEB: Q* = 45 + MEB/2, DWL (Q-Q*)^2, subsidy needed 2Q - 90.
- 11.4 Changed from the site's bar chart to curves, as directed: three neighbours with
  MB_i = v_i - 10Q per streetlight, $300 per light, v = 140/120/100. Keeps the site's numbers
  (N = 3, $120 average, $360 vs $300, $60 lost). Free-rider outcome = Nash of voluntary
  provision (highest-value person buys where own MB = cost). Lost area integrated exactly.
- 11.5 MB 100-2S, MD 2S, S* 25; payment range $625 to $1,875, joint gain $1,250 either way.

## Rounds
1. Built kit (pixel-true SVG, deterministic label placement, path-projected handles) and all
   five figures. Screens: labels overlapping on 11.2 and 11.5, labels drifting far from targets
   on phones, x tick numbers colliding with the "Q = 45" readout, phone y-ticks clipped.
2. Reworked the placement score (label overlap 200, out of bounds 1000, line crossing 8,
   distance); a label that must cross a line gets a paper card. Ticks now hide by bounding-box
   overlap. Wider phone margin. Reset moves under the caption on phones. Screens: phones still
   over-labelled; found a shell-quoting bug that had eaten "$50", "$160", "$8,000".
3. Optional labels (dropped instead of overlapping), stable labels placed first so they never
   jump, taller phone plots, shorter phone wording, 11.4 handles on fixed verticals (they piled
   up at the origin before). Fixed the eaten dollar strings.
4. 11.2 scoreboard to the empty top-right corner; on phones the permit trade joins it. Waste
   label before the dot labels. Scripted real input: mouse drags + snap checks + keyboard on
   every handle at 1440, CDP touch drags at 390 (page must not scroll) and swipes on the plot
   (page must scroll, state must not change). All pass, no console errors, no horizontal
   scroll at 390/768/1440, no en/em dashes in source or rendered text.

## Known limits
- On a 390px phone a few secondary labels drop out in crowded states (e.g. the surplus label
  in 11.1 at the optimum, the dot values in 11.2 at the extremes); the caption still says them.
- 11.2 total cleanup is fixed at the textbook's 100 units (the site's slider for the cap is
  gone); a second handle for the cap would be the next addition.
- 11.4 is a new parameterisation (curves instead of the site's two bars); if the curves
  version wins, the site prose for 11.4 needs the same change.
- If all three 11.4 values are dragged very high, Q* runs past 12 lights; the chart says
  "over 12" rather than rescaling under the student's hand.
- No dark mode. Snap haptics only where navigator.vibrate exists (Android).
