# Working on the figures

`DESIGN.md` says what the site should look like. This says how the figure
layer actually works, what is easy to get wrong in it, and how to tell whether
a change made things better. It was written after the September 2026 pass that
rebuilt label placement, leader lines and figure type, and it is aimed at
whoever picks the figures up next.

Read the first two sections before changing anything under `assets/fig*.js`.

---

## 1. What draws what

There are 123 plots across 11 week pages, drawn three different ways, and any
change to labelling has to work in all three:

| Engine | Pages | Curves live in | Labels live in |
|---|---|---|---|
| JSXGraph | 2, 3 | its own SVG, plus HTML `div`s for text | a separate SVG overlay, 1:1 over the board |
| raw canvas 2D | 3, 4, 5, 6 | pixels | an SVG overlay, 1:1 over the canvas |
| d3 / SVG | 6, 7, 8, 9, 10, 11, 12 | the same SVG | the same SVG |

Three files decide how labels behave. All three are loaded on all 11 pages.

**`assets/figplace.js`** owns where a label goes and what size it is.

- **Placement** is twelve fixed slots around the anchor. A label keeps its slot
  while that slot is still clear, and when it is spoiled it moves one notch,
  never across the anchor. That is what stops a slider teleporting a label to
  the other side of the plot. Labels sharing one anchor sit on separate rings.
- **Anchor snapping** runs before placement: each anchor is pulled onto the
  nearest geometry drawn in the label's own colour, in SVG or on canvas. An
  anchor already inside a filled region is left exactly where it is, because a
  label naming an area belongs in the middle of it and must not be dragged onto
  whichever curve borders it.
- **Sizing** (`labelSize`, `tickSize`, `haloFont`) converts the design targets,
  18px for a curve label and 16px for a tick, into whatever units a given
  figure counts in, and steps the size down on a plot too crowded to hold it.
- **`cfg.bounds` may be a function of the node**, for figures whose panels share
  one SVG. The bounds actually used are left on `d._b` so the page's own clamp
  can respect them.
- **A requestAnimationFrame watcher** re-solves a visible figure when its
  anchors change or after any user input, and leaves an off-screen figure
  alone until it is scrolled to.

**`assets/figlabels.js`** is the correction pass. It runs over every plot,
moves labels the figure placed badly, plates them so they stay readable, draws
a leader when it has moved one far enough to need it, and enforces the type
floor. It knows nothing about economics; it works off an occupancy grid.

**`assets/vizkit.js`** holds the shared d3 helpers for weeks 9 to 12: axes,
haloed labels, filled polygons.

**`assets/figreset.js`** adds the "Reset figure" control. It snapshots what
every control in a section holds once the page has finished setting itself up,
and puts them back on demand. It stays disabled until something has actually
moved, which is also how a reader discovers it. Where a figure has a reset of
its own it presses that too, because those clear state no control exposes;
where a figure's own reset was partial, and several were, this covers the rest.
A figure that keeps state outside its controls and offers no reset of its own
still cannot be fully restored, so if you add one, add a reset with it.

---

## 2. The traps

Every one of these cost real time. They are not obvious from reading the code.

**CSS beats a presentation attribute.** With or without `!important`. An
unscoped `.fig-bay svg text { font-size: 13px }` silently overrode every size
every figure set, and pinned the whole site to one size. Removing `!important`
changed nothing, because the plain rule still won. Any default in a stylesheet
has to be scoped `text:not([font-size])`.

**JSXGraph writes its label size as an inline style**, so no stylesheet can
change it at all. Only the board options (`defaultAxes.x.ticks.label.fontSize`,
and `fontSize` on each text it creates) will do it. `shared.css` must not force
`.JXGtext { font-size }`.

**The same declared size renders at two different sizes.** A full-width figure
draws into a 680-unit viewBox shown at about 623px, so a declared 12 arrives at
11. A small four-panel comparison draws into a 340-unit box at the same width,
so its declared 12 arrives at 22. There is no single number that is right for
both. Always state a target in screen pixels and convert per figure; that is
what `unitPx` and `tickSize` exist for.

**Measuring a canvas from its own pinned width is self-referential.** The old
`setupCvs` read `cvs.clientWidth`, sized the backing store from it, and then
pinned `cvs.style.width` to the same number. One measurement taken before the
layout settled was re-confirmed on every later resize and could never heal:
Fig 4.8 sat with a 589-wide bitmap stretched across 736 CSS pixels for months,
sliding every curve 25px away from the label anchored to it. **Measure the
container, never the element you are about to size.**

**A leader has to be told apart from a guide line.** Figures draw their own
dashed droplines to the axis with the same `4,3` dash. Every real leader now
carries `data-place-leader`; anything without it is the figure's own drawing
and is supposed to end on the axis.

**Not every figure calls back in after it redraws.** Eight of them never did:
the curves swept away under labels that stayed exactly where they were first
placed. Do not assume a page will ask for a re-solve. `figplace` watches for
itself now, but if you add a figure, give it the same tick handler the others
have.

**`String.replace` expands `$'` in the replacement.** These files are full of
`'PS=$'+n`, so a patch script that passes a replacement string silently
duplicates half the file. Pass a function: `s.replace(from, () => to)`.

**Bash heredocs strip backslashes even with a quoted delimiter.** A regex
written into a script through a heredoc arrives mangled: `/[\p{L}]/u` became
`/[p{L}]/u`, which quietly reclassified every single-letter label. Write any
script containing a regex or a backtick with the Write tool, not a heredoc.

**The working tree has mixed line endings.** `core.autocrlf` is on, so some
files are CRLF and some are LF. Every patch script has to detect and restore
the file's own ending, or the whole file shows as changed.

**Never rewrite this repo's HTML with PowerShell `Get-Content`/`Set-Content`.**
It corrupts UTF-8 and rewrites line endings. Use node.

---

## 3. How to tell whether a change helped

Guessing from a screenshot does not work at this scale; 123 plots times four
slider positions is 500 states. Everything below is a script in the session
scratchpad that drives a real Chrome through Playwright and measures the
rendered DOM. They are the reason the September pass could be trusted.

| Question | What it does |
|---|---|
| Does every leader reach what it points at? | Samples the rendered ink independently of the placement code, in screen pixels, and measures the gap at each leader's anchor end. Counts a landing inside a filled region as a hit. |
| Does any label sit on a curve unbacked? | Drives every slider and every mode button, then checks each label against the ink under it. |
| Do any two labels overlap? | Compares rendered text boxes pairwise within each plot. |
| Is any text clipped by its plot? | Compares each text box against its own SVG's box. |
| Does an axis title run through the tick numbers? | Compares the rotated title against the tick column. |
| What size does the text actually render at? | Declared size times the element's screen matrix. Not the attribute, and not the line box. |
| Do the labels follow the slider? | Snapshots anchors and boxes, moves that section's own sliders, compares. |
| Does the leader reach the RIGHT curve? | Compares the colour of the ink under the anchor against the label's colour. |

Four lessons about the measuring itself, each of which produced a wrong answer
first:

1. **Give each page its own browser context.** Sharing one across eleven pages
   changed the answer: week 4 measured 22 adrift alone and 6 in the middle of a
   run.
2. **Walk the page before measuring.** Figures build themselves when scrolled
   into view, and a figure off screen is entitled to postpone re-placing its
   labels. A reading taken without scrolling is of a frame no reader ever sees.
3. **Sample densely enough for the thinnest thing on the plot.** A stride of
   three pixels steps straight over a 1.5px zero rule, and the checker then
   reports a leader as adrift when it is sitting on the line.
4. **Check the checker against your own eyes before acting on it.** Two of the
   figures the first version flagged were correct, and the "leaders" it was
   measuring on week 8 were the figure's own droplines.

---

## 4. What worked, and what did not

**Worked.**

- Fixing the cause rather than the symptom. Most adrift leaders were not
  placement failures: they were anchors declared slightly off their curve, a
  point drawn off the canvas, a stretched bitmap. Snapping papered over some of
  them; the figures still had to be corrected.
- Building the measurement before the fix, and re-running it after every
  change. Several "fixes" made things worse and were caught in minutes.
- Doing one page first, all the way, before touching the other ten. Week 8 was
  the pattern; the rest were variations on it.
- Solving in the shared file where the problem was shared, and in the page
  where it was not. The marker-glyph rule and the type floor belong in
  `figlabels`; Fig 5.8's axis range does not.
- Letting the page's own code do the work where it already could. Raising a
  font size flows into `getComputedTextLength`, which flows into the box width,
  which flows into placement, with no further edits.

**Did not work.**

- Tuning constants to fix a structural problem. Hysteresis alone did not stop
  labels hopping; the continuity constraint did.
- One blanket rule for every figure. Capping how far a label may travel fixed
  three floating point names and immediately created two overlaps; it had to
  become "stay close, unless close is occupied".
- Trusting a metric that had not been sanity-checked by eye.
- Assuming a stylesheet could reach everything. Canvas text, JSXGraph text and
  presentation attributes each need their own route.

---

## 5. If you are adding a figure

- Give every label an anchor that is **on** the thing it names, computed from
  the same formula that draws it. Do not hand-pick a coordinate "in the clear":
  the placer will move the box off the curve for you, and a hand-picked anchor
  is how a leader ends up pointing at nothing.
- Colour the label the same as its curve. The snapping uses it, and so does
  the check that a leader reached the right curve.
- Take the type size from `EC224Place.labelSize` / `tickSize` rather than
  writing a number.
- Register a tick handler that calls `EC224Place.reflow`, as the other figures
  do, so the labels re-place when the figure redraws.
- If the figure keeps state outside its controls, a step counter or a dragged
  point, give it a Reset of its own. `figreset.js` will press it, but it cannot
  invent it.
- Run the checks in section 3 before and after.
