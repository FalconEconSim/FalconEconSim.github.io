# Week 11 figure lab: brief for every version

The owner of an EC224 intermediate microeconomics site (Bentley University) wants to see
**five radically different takes on the interactive figures** for one week, then pick one
direction (or mix) to roll out site-wide. You are building ONE of the five. Build it as if
it were the real thing for students.

## What the owner said (verbatim spirit)
- "I still don't love the figures on the main site." Problems: bad formats, the sliders,
  "the way the figures interact is weird".
- "Think completely outside the box... and really refine them. Don't just one-shot each."
- Loves: **big text, simplicity, easy to read, colors, big lines**, and the ManimGX films
  now on the site (look at them, they are the visual bar):
  `C:\MicroSite\manimgx\out\fig111-pigou-end.png`, `fig121-lemons-end.png`,
  `fig84-monopoly-end.png`, `fig31-end.png`, and play `media/films/fig111-pigou.mp4`.
- Don't worry about matching the current site's figure code. But a winner must be
  implementable on the site later: plain HTML/CSS/JS, libraries from a pinned CDN
  (cdnjs / jsdelivr / unpkg, exact versions) are fine, no build step.

## The week (content you must cover, all five figures)
Source of truth for the economics, models and default numbers: `week11-viz.html` (read its
prose and JS) and `assets/textbooks/week11-textbook.pdf`. Figures:
1. Fig 11.1 Negative externality & the Pigouvian tax (MB = 100 - Q, PMC = 10 + Q, MEC $20
   default; market Q 45, optimum 35, DWL $100, tax $20).
2. Fig 11.2 Cap-and-trade: equalizing marginal abatement cost across two firms.
3. Fig 11.3 Positive externality & subsidy.
4. Fig 11.4 Public goods & free-riding (vertical summation of MB).
5. Fig 11.5 The Coase theorem.
Use the page's models and defaults so numbers agree with the rest of the site. Economics
must be exactly right; verify every number you display.

## Where to build
- Your folder: `C:\MicroSite\FalconEconSim.github.io\lab\week11\vN\` with `index.html` and
  any css/js files beside it. Fully self-contained (you may load `../../../favicon.svg`).
  Do NOT edit anything outside your folder.
- Others are building v1..v5 in sibling folders at the same time; don't touch theirs.

## Visual baseline (adapt freely, but readable first)
- Paper `#eff1ee`, raised `#ffffff`, ink `#14181b`, soft ink `#4a5257`, accent plum `#7a1f5c`.
- Data colours: primary blue `#1f6fb2` (demand/MB), orange-red `#c85a3c` (cost/supply),
  gain green `#2f7d55`, loss red `#b03a2e`, gold `#a07800`, purple `#6b52a8`, grey `#9aa3b0`.
  Text-safe darker inks: `#14568c #a8431f #256647 #93301f #7d5a00 #5a4590`.
- Typeface: Libre Franklin (Google Fonts). Big: curve labels >= 18px, body >= 17px.
- Lines >= 3px. Generous whitespace. Must work at 390px phone width AND 1440px desktop.
- No em/en dashes in visible text (site rule). No emoji. Avoid generic "AI slop" look:
  read `C:\MicroSite\.claude\skills\frontend-design\SKILL.md` and search GitHub for an
  anti-AI-slop design checklist (e.g. miqdadbadjuber/anti-slop) and apply it.

## Research first (briefly)
Spend a little time on open-source prior art relevant to YOUR direction (e.g. Mafs,
JSXGraph, D3, Observable Plot, Tangle, Idyll, Explorable Explanations, Nicky Case,
Bret Victor, Distill, The Pudding, Seeing Theory). Borrow ideas, cite what you used in a
comment at the top of index.html.

## Process (mandatory)
At least THREE build -> screenshot -> critique -> refine rounds. Each round: screenshot
every figure at 1440 and 390 in several interaction states (Playwright-core at
`C:\MicroSite\review\node_modules`, `chromium.launch({channel:'msedge'})`; serve with
`cd C:\MicroSite && PORT=<your port> node serve.js`, stop ONLY your server at the end),
READ the screenshots yourself, write down what's weak, fix it. Also exercise every
interaction with a script and check for console errors. Keep a short `NOTES.md` in your
folder: the concept, what changed each round, known limits.

Rules: never use PowerShell Get-Content/Set-Content on site files; Bash heredocs strip
backslashes (use the Write tool); no em/en dashes.

## Deliverable
Your folder, working and polished. Do NOT commit or push (the lead does). Final message:
the concept in 2-3 sentences, what you'd want the owner to try first, known limits.
