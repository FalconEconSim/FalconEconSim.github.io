# v4 "Living sentences"

## Concept
Reactive documents in the spirit of Bret Victor's Tangle and Nicky Case's explorables. There
are no control panels or sliders: every input is a number inside a sentence. Drag it
sideways, tap or click it for a plus/minus stepper, or Tab to it and use the arrow keys.
Each figure is a few short paragraphs of living text beside (desktop) one big, clean graph.
Numbers share colours with the marks they control or report, and hover works both ways:
hover a number to light its geometry (everything else dims), hover a mark to light its
number. Choices are inline ("the right belongs to the factory / the neighbor").

Files: `index.html` (prose), `living.js` (the kit: scrubbable numbers, stepper, choices,
hover links, tiny SVG chart helper, first-time hint), `figs.js` (the five models),
`style.css`. No libraries, no build step.

## Figures and what is live
- 11.1 Pigouvian tax: harm (MEC) and tax are both scrubbable; "Match the tax to the harm"
  link animates the tax. DWL = (Q_t - Q*)^2, so over-taxing shows a DWL too.
- 11.2 Cap and trade: total tons scrubbable; inline choice trading permits / equal shares.
  Cost is shown as the two triangles under the MAC lines.
- 11.3 Flu shots and the Pigouvian subsidy: benefit to others (MEB) and subsidy scrubbable.
- 11.4 Public goods: neighbors, guard cost and value each scrubbable; the graph stacks one
  block per neighbor against the cost line (vertical summation), beside one neighbor alone.
- 11.5 Coase: inline choice of who owns the right (pollution starts at 50 or 0), and a
  scrubbable bargaining cost; when it exceeds the $1,250 of gains, no deal happens.
All defaults match week11-viz.html (MEC $20, Q 45 / 35, DWL $100; T 100, price $160,
$8,000 vs $12,500; MEB $20, Q* 55; N 3 x $120 vs $300; S* 25).

## Rounds
1. First build. Critique: on phone the graph sat ~1,100px below the numbers that drive it,
   so scrubbing was blind; harm/tax bracket labels sat on lines; SMC label collided with its
   line end; permit price label sat on Firm A's line; numbers with no geometry (cap, bargaining
   cost) dimmed the whole graph on hover; Coase let you scrub S to states that contradicted
   who owns the right; the first-time hint covered the figure title.
2. Phone graph now docks to the bottom of the screen (sticky) while its paragraphs are read,
   so the sentence and the picture are always both visible. Rising-line names moved above
   where the lines leave the plot (film style). Brackets label beside the arrow when tall,
   past the arrow foot when short. Permit price label placed by T. Dimming only happens when
   a mark actually lights. Coase S became an output set by the owner choice. Formulas no
   longer break across lines. Labels clamp inside the SVG.
3. Phone stepper parks just above the docked graph with a caption ("tax per unit") so it
   never hides the sentence it is changing; it re-places as text reflows. Optional labels
   drop instead of colliding (PMC + tax when near PMC/SMC). Bracket labels draw last so axis
   labels keep their place. 11.3 quantity labels moved under the axis (ticks beneath hide).
4. Hint only appears when its number is on screen (above the dock on phones). Enter on a
   number at its max focuses the minus button. Fake "this one" demo removed from the lede.
   Scripted test (keyboard, drag, stepper, hover both ways, reduced motion, every headline
   number, no dashes, no console errors) passes at 1440 and 390.

## Known limits
- Text reflows a little while scrubbing when a clause changes length (e.g. tax hits the
  harm); the number under the pointer stays put because drags are measured from the start.
- 11.2 uses a fixed $0 to $500 scale so small caps (20 tons) look tiny; that is honest
  but less readable.
- Hover linking is pointer-only; on touch, tapping opens the stepper instead.
- Phone dock takes about 44% of the screen height; on very short landscape phones it is tight.
- No dark mode.
