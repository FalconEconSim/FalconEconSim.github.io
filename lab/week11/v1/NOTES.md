# v1 "Manim Live": notes

## Concept
The figures are the films, but interactive. Each figure is laid out like a ManimGX frame: paper
ground, graph on the left with thick lines and labels in clear space, and a narration column on
the right (figure number, big title, plain-sentence narration, small two-column readout table).
Every visual property is a number in a state object, and a small engine (`stage.js`) eases the
whole state with Manim's smooth rate function, so nothing ever jump-cuts. A change requested
mid-tween starts from wherever the picture is.

Each figure has:
- **Play the story**: the film's beats (same sentences and numbers as the film transcripts where
  a film exists), auto-advancing with a progress fill in the numbered step dots. Click any dot to
  jump to that beat. Playing from the start clears the stage and draws the lines on, like the film.
- **Take over at any time**: touching any control pauses the film and the narration switches to
  live sentences generated from the current state.
- **One draggable handle on the graph** (SMC line, the cleanup split, MSB line, the per-person
  value bar, the pollution level), with keyboard arrows, plus one big stepper and one segmented
  choice (11.5 uses a "Strike one deal" button instead of a stepper).
- **A film-style table** whose columns appear as the story reaches them during playback.

No libraries; plain HTML/CSS/JS, Libre Franklin from Google Fonts.

## Models (match week11-viz.html and the textbook)
- 11.1 MB = 100 - Q, PMC = 10 + Q, MEC $20 (0 to 50, step 2): QE 45, Q* = (90 - MEC)/2 = 35, DWL MEC^2/4 = $100, tax = MEC.
- 11.2 MAC_A = 2e, MAC_B = 8e, target 100 (20 to 120, step 10): equal 50/50 costs $12,500; permit market 80/20 at $160 costs $8,000 (saves $4,500, 36%). Drawn as the two-wall "bathtub" diagram so the split is one draggable point and total cost is the shaded area.
- 11.3 MB = 100 - Q, MC = 10 + Q, MEB $20 (0 to 40): Q* = 55, DWL $100, subsidy cost $1,100.
- 11.4 Cost $300, N = 3, v = $120 (v draggable 0 to 320, so the "someone buys it alone" case is reachable). Vertical summation is literal: each person's block flies from the one-neighbor bar and stacks. Fix shown as an all-or-nothing pledge of $300/N each.
- 11.5 MB = 100 - 2S, MD = 2S, S* = 25; gains from trade $1,250 from either start; payment between $625 and $1,875.

## Rounds
1. Built engine + all five figures. Screens: SMC label collided with the SMC handle; 11.2 A label
   crossed the wall and at T = 20 the picture was tiny; 11.3 MB label sat on the Q* label; 11.4 white
   block labels had a paper halo (blurry); 11.5 MD label collided with the $100 value label.
2. Moved the 11.1 handle to the left end of SMC and the tax arrow to Q = 22; 11.2 lines stop at the
   walls, A label at the open left, area labels placed between the curves; 11.4 halo-free labels;
   11.5 value labels sit on the side away from the gains wedge and lift off the axis near zero;
   S* label offset computed from its own width. Taller phone graphs.
3. 11.2 camera now eases with the target (domain scales with T, so any target fills the frame and
   the axis numbers change smoothly); relative label offsets; 11.4 cost label moved to the line end
   and bar-3 labels inside the goal box on desktop; 11.3 MC label moved above its line; table columns
   reveal with the story; grammar fix ("the one neighbor values"); pledge at exactly $300 total is
   not built (zero surplus), matching the narration.

Every round: `snap.js` (5 figures x 5 to 7 states x 1440/390) and `exercise.js` (clicks every
option, holds steppers, drags each handle, keyboard arrows, plays each story and takes over
mid-film, checks horizontal overflow and console errors). Final: no errors, no overflow.

## Known limits
- 11.1 "tax = $X" label hides above MEC $36, where the left side is too crowded.
- In 11.2 with very lopsided splits, B's area value label is hidden when it does not fit; the
  table and narration still give the cost.
- The table's figures show final values during the story's early beats for the column already
  revealed (e.g. DWL $100 before the triangle is explained in 11.1 beat 1).
- The "drag" hint near each handle shows only until the first interaction on the page.
- Mobile was checked at 390px in headless Edge with touch emulation, not on a real phone.
