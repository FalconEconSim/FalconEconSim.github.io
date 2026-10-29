# Predict, then see: rolling out across the course

The professor (Naveen Sunder) and the site owner (Zach) chose the **"Predict, then see"**
style (lab/week11/v5) for the interactive figures. Naveen: "the review exercise you have
made is tremendous... start adding these review/new animations across all lectures
(start chronologically)". Work goes in chunks of three weeks; chunk 1 = weeks 2, 3, 4.

## What exists
- The reference implementation: `lab/week11/v5/` (index.html, style.css, predict.js,
  figs.js, models.js, NOTES.md). Open it, use it, read its code and NOTES before anything.
  Also glance at `lab/week11/v2/` (direct-manipulation handles): its big grabbable handles
  and snapping are welcome inside the "Explore" step after a reveal.
- The shared engine (built in phase 1): `lab/predict/kit/` (kit.css, kit.js and docs in
  `lab/predict/kit/README.md`). Week pages use the kit; they don't copy-paste engine code.
- Week preview pages: `lab/predict/weekN/index.html` (+ that week's figs js). One page per
  week with all of that week's figures, in the same order and numbering as `weekN-viz.html`.
- Films: `media/films/*.mp4` with posters. Weeks 2-4 currently have fig25, fig31, fig32,
  fig48 (and new ones may land during the chunk). Where a figure has a film, show it at the
  top of that figure's section with a plain `<video controls playsinline muted
  preload="metadata" poster=...>` (paths `../../../media/films/...`), before the question.

## Per figure
Every figure on the week's viz page gets a predict-then-see version:
1. A real question a student should be able to answer after the lecture, answered BY
   DRAGGING / TAPPING / DRAWING ON THE GRAPH (not a multiple-choice form).
2. Reveal: the true answer animates in film-style over the student's ghosted guess, a big
   friendly verdict + 0-100 score, a small You vs Answer table, 2-3 sentences of why.
3. Explore: one or two big, clear controls (prefer a handle on the graph; a stepper or
   segmented toggle otherwise; never a default browser slider).
4. "Try a new one": randomized parameters within economically valid ranges, with answers
   verified by a script over thousands of draws. Light per-figure streak/score.
5. "Not sure? Just show me" reveals without scoring.
If a page figure is purely a demonstration with no sensible question (rare), it may skip
the predict step and open in Explore, but say so in NOTES.md. Keep each figure's model,
notation and default numbers identical to `weekN-viz.html` (read its prose and JS) and the
textbook (`C:\MicroSite\textbook\chNN_instructor.pdf`, `assets/textbooks/`). The week 3
"Slutsky" figure uses the textbook's Hicks construction on purpose: keep it.

## Look and rules
Same as `lab/week11/BRIEF.md` (read it): paper background, Libre Franklin, big type
(labels >= 18px, body >= 17px), thick lines, site palette, works at 390px and 1440px,
touch never fights page scroll, keyboard accessible, no em/en dashes, no emoji, no
anti-AI-slop tells. Every number displayed must be correct; verify it.

## Process
At least three build -> screenshot -> critique -> refine rounds per week page, screenshots at
1440 and 390 in several states, read them yourself, exercise every interaction by script,
zero console errors. Serve with `cd C:\MicroSite && PORT=<yours> node serve.js` and stop
ONLY your own server at the end. Playwright-core: `C:\MicroSite\review\node_modules`,
`chromium.launch({channel:'msedge'})`. Keep scratch files in your own subfolder of
`C:\Users\zwins\AppData\Local\Temp\claude\C--MicroSite\966a10f6-397d-46f8-a6f7-d04ebb2fd099\scratchpad\`.
Never use PowerShell Get-Content/Set-Content on site files; Bash heredocs strip
backslashes (use the Write tool). Edit only your own folder (and the kit only if you own
it or the change is a clear, small, backward-compatible kit bug fix; say so).
Do NOT commit or push; the lead does. Keep a NOTES.md in your folder.
