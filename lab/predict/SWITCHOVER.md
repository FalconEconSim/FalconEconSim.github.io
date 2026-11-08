# Switchover: Predict, then see goes live (Nov 2026)

The professor (Naveen Sunder) reviewed weeks 2 to 4 and sent the feedback below. Zach's
instructions: make these changes, and wherever Naveen would clearly have said the same thing
about a figure in another week, make that change there too (it saves him a review pass). Then
switch the whole live site over to the new figures.

The old site is saved: git tag `classic-site-2026-11-07`, branch `classic-site`, and browsable
copies `weekN-viz-classic.html` (noindex, unlinked). Do not edit or delete those.

## Naveen's feedback (verbatim; figure numbers are the preview pages')
- 2.1 = it would be great if we scrolling over the graph it could show the point that one is
  currently at. That way they can calculate the utility at that bundle. Even Better = while
  scrolling it shows the utility at that point.
- 3.1 = they should be able to pull the IC's so that they can see where the IC is tangent to
  the budget line and find the exact point of optimum.
- 3.3 = similar to 3.1
- 4.2 = instead of making it a question, can you make it such that when the point is slid on
  the demand curve then it shows the elasticity at each point.
- 4.8 (and in general) = when a point is being dragged the current coordinates of the point
  should be visible so that students can figure out when/where to stop.

## What that means as rules, applied to every week
1. **Live coordinates while dragging (everywhere).** Any point being dragged or slid, in the
   question step and in Explore, shows its current coordinates next to it, in the figure's
   own units and notation ("(4.0, 6.5)", "Q = 40, P = $55"), at the snap precision. Kit-level.
2. **Hover readout.** Moving the pointer over a plot (mouse hover; on touch, while the finger is
   down in a tap or draw step) shows the point under it with its coordinates and, where the
   figure has a natural function of the point, its value: utility U(X, Y) on IC maps, output
   Q(L, K) on isoquant maps, cost wL + rK on isocost figures, profit where it applies. Kit
   provides the mechanism; each figure supplies the value function and label.
3. **Pullable level curves.** Wherever the question is a tangency (IC and budget line,
   isoquant and isocost, iso-profit and best response, and so on), the student can drag the
   level curve itself (a handle that sets the utility / output / cost level) to find where it
   just touches, and see the level's value while dragging. Available while guessing, so it
   helps them find the answer rather than giving it away.
4. **Read-off figures become explore-first.** Where a figure's question is just "read a value
   at a point along a curve" (elasticity along demand in 4.2), it opens as a slider along the
   curve that shows the value at each point instead of asking. Keep a light question only if
   it adds something beyond reading the value. Note each such change in the week's NOTES.md.

## Layout of the live pages
Each `weekN-viz.html` keeps its URL, site chrome (topbar, rail, nav drawer, chatbot/ask
widget, footer) and its teaching prose (intro, key ideas, intuition, common mistakes).
The old figure bays are replaced by the kit figures. The exact pattern is set by the week 2
pilot and written up in the "Integration pattern" section below; every other week follows it.

## Where things live (single source)
- Engine: `assets/predict/kit/` (kit.js; kit.css = figure styles scoped to `.kfig`; kit-page.css =
  preview-page chrome; kit-site.css = placement inside live pages; README.md = the API, read it).
- Each week: `assets/predict/weekN/` (models.js, figs.js, verify.js, NOTES.md). Run checks with
  `node assets/predict/weekN/verify.js`.
- Preview pages: `lab/predict/weekN/index.html` load the files above (`../../../assets/predict/...`).
  The live page and the preview run the same figs.js, so fix a figure once and both change.
- Process rules: `lab/predict/ROLLOUT.md`. Live-page builder: `lab/predict/tools/build-live.js`.

## Integration pattern
Week 2 is the reference: `week2-viz.html` (live), `assets/predict/week2/` (figures),
`lab/predict/week2/live-edits.json` (prose edits), and the exact build command in
`assets/predict/week2/NOTES.md`. Follow these steps for week N. Serve with
`cd C:\MicroSite && PORT=<yours> node serve.js`; URLs are `http://localhost:<port>/weekN-viz.html`.

### 0. Before touching the page: the figures (rules 1 to 4)
1. Read the kit README sections "Live coordinates", "Hover readout", "Pullable level curves".
2. Rule 1 is automatic. Check every handle's tag in predict and Explore (the README's naming
   rules turn 'Good X' into X, 'Price ($)' into P...). Give `axes.xname / yname`, a `coords`
   object, or a handle `tag` where the default reads badly. **Several panels in one frame** (3.1,
   3.3, 6.2, 7.7, 7.9 now have `coords: false`): write `tag` functions that map frame units back to
   the panel's numbers (week 3 `stack()` has `iy` / `ip`), then remove `coords: false`. Hide a static
   label that repeats the dragged number while the handle is busy (week 2 `busy()`).
3. Rule 2: add `hover` where the point has a natural value (U on IC maps, Q on isoquant maps, cost
   on isocost, profit). A value that IS the asked-for number goes behind `when: f => f.exploring`.
4. Rule 3: every tangency question gets a `Kit.pull` curve in the question step (week 2 2.5 and
   2.10; week 3 3.1 / 3.3 in stacked panels need `ty` / `iy` and `Y` options). Start the level
   inside (cutting), keep the range wide on both sides, and say "pull the dashed curve" in the
   setup or step prompt.
5. Rule 4: a pure read-off question becomes Explore-first: `exploreFirst: true` on the spec
   (kit README, "Explore-first figures"): no question step, no score, the value in the handle tag and
   the readout. Note it in NOTES.md.
6. `node assets/predict/weekN/verify.js` passes; the preview page `lab/predict/weekN/` loads with
   zero console errors. Write the changes per figure in NOTES.md (week 2's table is the model).

### 1. Build the live page
```
node lab/predict/tools/build-live.js N <sectionId>=<figKey>[+<figKey>] ... \
  [--keep-id <old id>=<figKey>] [--edits lab/predict/weekN/live-edits.json] [--lede "..."] [--dry]
```
- Map every `<section ... id="sec-...">` that had a figure bay to the kit figure key(s) shown in it
  (figure order must match the rail). Start with `--dry`: it lists each section's prose / film /
  dropped bay and the ids inside the dropped bay. A section that held two figures maps to `f31+f32`.
  Sections with no figure are left untouched (week 2's Cobb-Douglas section).
- `--keep-id`: an id inside a dropped bay that something links to (grep the repo for
  `weekN-viz.html#`; week 2 kept `sec-ic-types`, `sec-budget-viz`, `sec-optimum-viz`) goes on that
  figure's bay.
- The source is always the classic page at tag `classic-site-2026-11-07`, so rerunning is safe; it
  overwrites `weekN-viz.html`. Keep hand edits in the `--edits` JSON (`[["exact old", "new"], ...]`),
  not in the output, or they are lost on the next build.
- The lede: one or two sentences on how to use the figures (week 2's is fine to reuse).

What the builder does (so you can check it, and so you can do it by hand if a page is irregular):
- **Keeps**: the head metas, title, favicon, fonts, `shared.css`, `assets/vizpage.css`; the page's
  inline `<style>` blocks minus dead rules (a rule dies when a class / id / element in its selector
  occurs nowhere in the new page or the scripts it loads; unused `@keyframes` too); MathJax config
  and script (the prose uses it); the body from `<body>` to `<main class="main-content">` (top bar,
  layout, rail, nav button); the page header (lede replaced); every section's `.fig-prose`; every
  `<figure class="film">` (moved after the prose); the footer; the rail tracker script.
- **Adds**: `assets/predict/kit/kit.css` and `kit-site.css` after vizpage.css; the lab page's own
  `<style>` block, if any, as `<style id="kit-page-css">` (week 7, 9, 10, 12 have one); per mapped
  figure `<div class="kit-bay"><div id="fNN" class="mathjax_ignore tex2jax_ignore"></div></div>`;
  at the end of body, in this order: `assets/chatbot.js`, `assets/ask-widget.js`, `assets/nav.js`
  (defer), `assets/autoplay-video.js` and `assets/film.js` (only if a film remains), the rail
  tracker, `assets/predict/kit/kit.js`, `assets/predict/weekN/models.js`,
  `assets/predict/weekN/figs.js`, then the lab page's mount script with `films: false` added
  (`<script>Kit.mount(window.WNFIGS, { films: false, store: 'ec224-wN-predict' });</script>`,
  plus whatever else that script does, e.g. week 7's Enter listener).
- **Headings**: every `.fig-hd` ("Fig 4.3" + h3, inside the prose or directly in the section) becomes the
  section heading `<div class="sec-hd"><span class="sec-n">§ 4.3</span><h2>Title</h2></div>` (the kit prints
  "Figure N.M" itself, so the old figure number would show twice); a section-level one goes to the top of the
  prose. A section that already has a `.sec-hd` (week 2) keeps it and loses its section-level `.fig-hd`. Each
  move is logged.
- **CSS**: the dead-rule prune runs before the edits and again after them, on whole class / id tokens; an
  emptied `<style>` goes.
- **WARN lines** (read them): text inside a dropped bay (teaching content? week 7's 7.3 proof lived in one),
  old controls or empty boxes still on the page after the edits, kept page CSS that names a class the kit uses
  inside its figures, and a `--lede` that found no `<p class="lede">` (add the lede with an edit instead).
  `--out <file>` writes the result elsewhere, to diff a rebuild against the committed page.
- **Drops**: every `.fig-bay` (old controls, JSXGraph boards, readouts), the `fig-sec` class (the old prose | bay split), JSXGraph,
  D3, `assets/figkit.js`, `assets/deltabar.js`, `assets/figplace.js`, `assets/figlabels.js`,
  `assets/figreset.js`, the tooltip script and `#tip-global` (tips lived in the bays), and every
  other inline script. It prints each drop: read the list. If an unexpected script goes (a page
  that loads `polish.js`, `theme.js`, `vizkit.js` or something new), find out what it did and add
  it back by hand (or extend the builder's keep list) when the page still needs it.
- Never edit shared files to suit one page (shared.css, vizpage.css, nav.js, film.js...).

### 2. One section, as built
```html
<section class="sec page" id="sec-optimum">
  <div class="fig-prose">
    <div class="sec-hd"><span class="sec-n">§ 2.7</span><h2>The Consumer's Best Choice</h2></div>
    <p class="fig-intro">...</p> ... callouts, math, tables (unchanged) ...
  </div>
  <figure class="film" id="film-2-5"> ... the site's film player, unchanged ... </figure>
  <div class="kit-bay" id="sec-optimum-viz"><div id="f25" class="mathjax_ignore tex2jax_ignore"></div></div>
</section>
```
Layout: heading and prose at the reading measure, then the film in the wide band, then the kit
figure across the whole content column (plot and panel side by side, sticky plot on desktop;
stacked on phones). kit-site.css does the placement; the figure is never squeezed into a bay.

### 3. Films
- The page keeps the site's `<figure class="film">` (narration transcript, Replay, speeds, autoplay
  in view) and the kit's own film is off (`films: false`), so a film shows once. If a spec has a
  `film` but the classic page had none, add the site film markup to `--edits` only if you also want
  it on the live page (copy week 2's figure.film block, change the names and narration).
- Films sit between the prose and the figure ("watch first, then answer").

### 4. Prose
- Keep it, but nothing may name a control that is gone ("use the slider", "drag the orange point",
  "the panel below shows"). grep the built page for `slider|drag|click|panel below|button|toggle`
  and fix each sentence in `--edits` (week 2 had three). Say "Fig N.M below" when pointing at a figure.
- No em or en dashes in anything you write.

### 5. Pitfalls hit in week 2
- Host CSS reaches into the figure: weekN-viz pages style bare `table`, `th`, `td` (mono font,
  shaded header, a 480px min-width on phones) and set every `h2` to the display weight with
  `!important`. kit.css now resets the verdict table and kit-site.css restores the question's
  weight. If something in a figure looks different on the live page than in the preview, look for
  a bare-element rule in the page's `<style id="main-css">` first.
- MathJax typesets the whole page: "$80 ... $5" in a figure's setup became math until the figure
  root got `mathjax_ignore tex2jax_ignore` (the builder writes both classes).
- Sticky chrome: top bar 3rem, and up to 1100px the rail is a sticky strip under it. kit-site.css
  sets `--kit-top` (sticky plot, "Try a new one" scroll) and `scroll-padding-top` for anchors.
- A tap within about 32px of a pull knob (touch) grabs the knob, not a new point. Scripts that tap
  an answer should pull the knob somewhere else first (week 2's pull test pulls to (4.5, 17.6)).
- Heredocs in Bash strip backslashes: write scripts and JSON with the Write tool. Line ends: git stores the
  viz pages with LF (core.autocrlf), the working copies are CRLF, and the builder writes CRLF; only week 2's
  classic page has a BOM, and the builder keeps a BOM only where the classic page had one. Never PowerShell
  Get-/Set-Content.
- Do not edit `weekN-viz-classic.html` or the classic tag; the builder reads the tag, not the file.
- Fixed in the kit since the switchover (kit README Changelog, "Kit-fix round"; do not work around these in a
  week any more): phone gutter on pages without `main.main-content` padding, blank explore-first figures on first
  view, verdict cells that overflowed or split numbers, hit strips that blocked touch scrolling, the "Try a new
  one" scroll under the top bar, hover guides across stacked panels (`hover.guides`), `prio: 0`, a stale hover after
  a drag, the pull curve running out of its panel, Enter on a picked pull knob, a pull knob left on the tap target
  (`park`). After a builder change, rerun every week's exact command from its NOTES.md and diff the page.

### 6. Checklist before you hand back
- [ ] `node assets/predict/weekN/verify.js` passes.
- [ ] `lab/predict/weekN/` and `weekN-viz.html` load with zero console errors and no failed requests
      (a video's aborted range request is normal) at 1440 and 390.
- [ ] No horizontal overflow at 390 (`scrollWidth - clientWidth == 0`).
- [ ] Every rail link lands with its heading visible below the sticky chrome, at 1440 and 390.
- [ ] "All weeks" opens the nav drawer; the ask widget opens.
- [ ] Every figure: question, place / drag / draw by mouse, by touch (CDP) and by keyboard only
      (arrows, Space, Enter); tags show while moving; hover readout where defined; pull knob where
      defined (mouse, touch, Space + arrows); Reveal and "Not sure? Just show me"; Explore controls;
      "Try a new one" leaves the question visible below the top bar; tally updates.
- [ ] A touch swipe over a plot (not on a knob, in a drag step) scrolls the page.
- [ ] Films play once per section (no kit film on the live page), with the site's controls.
- [ ] Screenshots at 1440 and 390: question with hover and a drag tag visible, pulling a curve,
      revealed, explore. Read them yourself.
- [ ] NOTES.md updated (per figure: rule 1 / 2 / 3 / 4, the build command, checks run).

Scripts: `PORT=<port> node lab/predict/tools/loadcheck.js weekN-viz.html lab/predict/weekN/` (console
errors, failed requests, overflow) and `PORT=<port> OUT=<folder> node lab/predict/tools/livecheck.js weekN-viz.html [figKey]`
(rail, drawer, ask widget, keyboard tag on figKey (default the first figure that is not explore-first; a tap step
gets Enter first), a touch swipe from a point no knob claims, every figure reveal (waits up to SKIP_WAIT, default
6 s) / explore / new round (explore-first figures: no "Just show me", Explore again after a new round), at 1440
and 390; exits 1 on any problem). Write your own shot script for the hover,
drag-tag, pull, reveal and explore screenshots (week 2 used one per figure). They are plain
Playwright (`C:\MicroSite\review\node_modules\playwright-core`, `chromium.launch({channel:'msedge'})`)
and use `window.__figs[key]` to turn data coordinates into screen points:
`const r = f.svg.getBoundingClientRect(); [r.left + f.S.x(x) * r.width / f.S.W, r.top + f.S.y(y) * r.height / f.S.H]`.
