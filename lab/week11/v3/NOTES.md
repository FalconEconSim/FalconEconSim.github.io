# v3 "Scrollytelling": notes

## Concept
Each figure is a short scroll story in the Pudding / NYT / Distill style. The graph stays pinned
(sticky) while six short text steps scroll past; each step moves the graph to a new state with
film-like motion (curves draw themselves in, SMC slides up off PMC, the DWL triangle grows out of
the optimum and collapses back into it, the public-good bars fly over and stack). Scrolling back
replays the same states in reverse. The last step, "Your turn", hands the student one or two big
controls (segmented buttons, a +/- stepper, an action button). No sliders anywhere.

Desktop: steps in a left column, graph pinned on the right. Phone (<900px): graph + scoreboard
pinned at the top of the screen (about 60% of the height), step text scrolls underneath.

## Files
- `scrolly.js`: the engine. `Stage` is a keyed scene graph over one SVG: a figure returns the whole
  picture for a state as `{key: spec}` and the stage tweens every element from wherever it is to the
  spec (draw-in via pathLength dash offset, `from` geometry for entrances, per-element delays, counted
  numbers). `Story` is a ~40 line scrollama-style trigger: the active step is the last one whose top
  has crossed a trigger line (55% of the viewport on desktop; on phones a line just below the pinned
  panel). rAF-throttled scroll listener, so fast scrolls and jumps land on the right state.
- `figs.js`: the five figures. Each has `story` (array of states), `scene(state, dims)`, `board(state)`
  (the film-style scoreboard under the graph) and `controls`. Story and "your turn" use the same
  scene function, so nothing is drawn two ways.
- Graph coordinates are real pixels (the SVG is re-measured on resize), so type stays 17-21px on a
  phone instead of being scaled down with a viewBox.

## Economics (all checked against week11-viz.html + the textbook)
- 11.1 MB = 100 - Q, PMC = 10 + Q, MEC $20: Q 45 at $55, Q* 35 at $65, DWL $100, tax $20.
  Try: MEC $0/10/20/30/40, tax on/off. Q* = (90 - MEC)/2, DWL = MEC^2/4.
- 11.2 MAC_A = 2e, MAC_B = 8e, 100 units. Equal shares $12,500; 65/35 $9,125; permits 80/20 at
  $160 for $8,000 (saves $4,500, 36%). Try: student splits the 100 units (A 40..100 in steps of 5)
  and hunts for the cheapest mix; "Let permits decide" snaps to 80/20. (The page's slider varies the
  cap instead, but with linear MACs that only rescales the picture, so the split is the better knob.)
- 11.3 MB = 100 - Q, MC = 10 + Q, MEB $20: 45 vs 55 shots, DWL $100; with the subsidy sellers get
  $65, buyers pay $45. Try: MEB chips + subsidy on/off.
- 11.4 $300 streetlight, 3 neighbors at $120: vertical sum $360, surplus $60, free riding leaves it
  unbuilt; an all-or-nothing $100 each gives each +$20. Try: neighbors 1..8, value $0..$200.
- 11.5 MB = 100 - 2S, MD = 2S, S* = 25 at $50. From either corner the gains from a deal are $1,250;
  any payment between $625 (factory's lost benefit) and $1,875 (neighbor's avoided harm) works.

## Rounds
1. Built engine + all five stories. Screenshots at 1440 and 390, every step and control.
   Weak: ghost dots invisible (CSS stroke beat the attribute), "B cuts 20" sat on Firm A's line,
   11.3 MB label sat on the y axis and the DWL label on the MSB line, 11.4 "each pays" label ran
   into the stack and "+$60" clipped at the phone edge, 11.5 start label collided with S*, the
   scoreboard wrapped to two rows (and resized the chart between steps), phone step text sat too
   far below the pinned graph.
2. Fixed all of the above: fixed-height scoreboard with short text values, trigger line moved up on
   phones, chart taller on phones, phone-only short labels ("$20" beside the arrow), surplus bracket
   moved to the left of the stack, in-bar "pays $100" labels, back-scroll test added.
   Motion review (frames at 200/500/900/1400 ms): the market label swapped to "Q* = 35" before the
   dot moved and the scoreboard counted early. Fixed with per-row board delays and keeping the Q*
   marker as its own element; stack blocks now pop in over the bars and then fly.
3. Extreme-state pass driven by script (MEC/MEB $40, 8 neighbors x $200, A cleans 40 or 100):
   checked every scoreboard number, fixed rounding ($37.50 shares, no fake "+$163"), re-laid the
   11.2 labels for splits where A does less than B, Firm A/B curve labels moved to open space.
   Reduced-motion run, fast scroll up/down the whole page, and a desktop-to-phone resize: no
   console errors.

## Known limits
- Story text lives in the HTML and the numbers in it are fixed to the default model; the scoreboard
  and graph are computed.
- Mid-tween crossfades (e.g. "SMC = PMC + MEC" fading out as "PMC + tax = SMC" fades in) briefly overlap.
- Desktop step 0 of a figure triggers slightly before the panel is fully pinned, by design, so the
  first curve is already drawing as the graph arrives.
- With 5+ neighbors in 11.4 the per-person gain labels are hidden (bars too narrow); the board
  shows "Each pays" instead.
- Not tested on a real iOS Safari; sticky + 100vh behave well in Chromium/Edge.
