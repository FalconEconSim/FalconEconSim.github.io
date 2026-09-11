# Figure checks

Twelve scripts that drive a real Chrome over the site and measure what it
actually rendered. They exist because 123 plots at four slider positions is
about five hundred states, and no amount of looking at screenshots covers that.

`FIGURES.md` in the repo root explains the figure layer these check.

## Running them

They need `playwright-core` and a Chrome on the machine. The scripts look for
playwright in `node_modules`, then in a sibling `review/node_modules`, then
give up with a message.

```
node tools/figcheck/serve.js          # serves the repo on :4321, leave running
node tools/figcheck/siteleaders.js    # in another shell
```

Every script takes two environment variables:

- `BASE` — where to look. Defaults to `http://localhost:4321`; set it to
  `https://falconeconsim.github.io` to check what is actually published.
- `ONLY` — a page prefix, e.g. `ONLY=week8`, to check one page while iterating.

```
ONLY=week8 node tools/figcheck/overlaps.js
BASE=https://falconeconsim.github.io node tools/figcheck/siteleaders.js
```

## What each one answers

| Script | Question | Good answer |
|---|---|---|
| `siteleaders.js` | Does every leader reach what it points at? | 0 adrift |
| `verify-states.js` | Does any label sit on a curve unbacked, in any driven state? | 0, and 0 JS errors |
| `overlaps.js` | Do any two labels in a plot overlap? | 0 pairs |
| `outofplot.js` | Is any figure text clipped by its own plot? | nothing over ~2px |
| `axiscrowd.js` | Does a rotated axis title run through the tick numbers? | 0 |
| `fontsizes.js` | What size does the text actually render at? | labels ~18px, ticks 16px, nothing under 15/14 |
| `rightcurve.js` | Does each leader land on the curve its label names, or just on *a* curve? | only tangency and intersection points |
| `frozen.js` | Do the labels re-place when the figure's own slider moves? | every figure either moves or is genuinely unaffected |
| `leaddetail.js` | Which label is adrift, and by how much? | run after `siteleaders` finds something |
| `shotel.js` | Screenshot one element after setting named controls | `PAGE=`, `SEL=`, `SET=id=value;id=value`, `OUT=` |
| `shootall.js` | Screenshot every figure at two slider positions | `OUT=`, `FRACS=` |
| `resetcheck.js` | Does every figure's reset control actually put it back? | 56 of 57 exactly; Fig 8.4 differs only in which step button is lit |
| `resetgaps.js` | Is there a figure a reader can change but not put back? | 0 |
| `serve.js` | Serve the repo on :4321 with no caching | |

## Reading them honestly

Four things produced a wrong answer before they were fixed, and would again:

1. **Each page gets its own browser context.** Sharing one across eleven pages
   changed the result: week 4 measured 22 adrift alone and 6 mid-run.
2. **The page is scrolled through before measuring.** Figures build themselves
   when scrolled into view, and an off-screen figure is entitled to postpone
   re-placing its labels, so a reading taken without scrolling is of a frame no
   reader ever sees.
3. **Canvas ink is sampled densely near each leader.** A three-pixel stride
   steps over a 1.5px zero rule and reports a leader as adrift when it is
   sitting on the line.
4. **A leader is identified by its `data-place-leader` marker**, never by its
   dash pattern. The figures draw their own dashed guide lines to the axis with
   the same pattern, and those are supposed to end on the axis.

Check anything surprising with your own eyes before acting on it. Two figures
the first version of `siteleaders` flagged were correct, and most of what it
was measuring on week 8 was the figure's own droplines.
