# EC224, experimental site (`/x/`)

An experiment in what the course site could be if the structure were ours to choose. It is
`noindex`, nothing on the main site links to it, and it changes nothing outside `x/`. Every page is
generated from the live site's own pages by `x/tools/build.js`, so the teaching content still lives in
one place.

## The problem with today's structure

The live site is organised by *kind of material*. Each week is a hub of links (slides, textbook,
figures, practice, flashcards), each link a separate page with its own back button. Three things
follow from that:

- **No path through a week.** A student lands on a list and has to decide an order. The professor
  has an order (watch the lecture, then read; Aug 16 review), but the hub can only say it by
  sequence of rows.
- **No path across weeks.** Nothing says that Week 8 leans on Weeks 4 and 7, or that the tangency
  in 2.5 is the same idea as 6.1. For exam prep there is nowhere to go but back through the hubs.
- **Silos hide the best thing on the site.** The "Predict, then see" figures are the part students
  and the professor love most, and they are one row among six.

## Architecture

**A week is one page and one path.** `x/week5.html` holds the whole week in the order Prof. Sunder
recommends, as numbered steps: **1 Watch** (the lecture videos, loaded only when played, and the
slide PDFs), **2 Read** (the textbook chapter, the lecture notes), **3 Work the figures** (every
teaching section of the old figures page, with its films and its kit figure, unchanged), **4 Check
yourself** (the week's flashcards as a spaced-repetition deck, then practice problems, a mixed
review of the weeks so far, and the graded homework on Brightspace). Steps a week does not have are
left out and the rest renumber (weeks 8 to 12 have no lecture recordings on the site; week 1 has no
figures). A sticky path bar shows the four steps with live counts ("3 of 10"), turns plum when a step
is done, and names the section you are reading. Each step ends with the way on ("Next, step 3: Work
the figures"), and the week ends with the neighbouring weeks in their unit colours (week 1 points back
to the map, week 12 on to a review of all twelve).

**Home is a course map.** Four units, twelve week posters, each showing the week's signature diagram,
its title and, once started, a plum progress bar. Above it, "Pick up where you left off" takes you
back to the exact section you were last reading and tells you the next unfinished step. Below it, the
exam-prep entry and the threads.

**Threads: ideas that come back.** Ten cross-week ideas (where two slopes meet, marginal benefit equals
marginal cost, surplus and deadweight loss, elasticity and pricing power, more than one price, from one
to many, the short and long run, natural monopoly, best responses, shapes carry the assumptions),
each drawn as a line across the twelve weeks with a stop for every figure that uses it. A stop opens
that figure; "Review these" runs a review of just that idea. Each week header also says what it builds
on ("Builds on Week 4 (elasticity and consumer surplus) and Week 7 ...") and where it comes back.

**Review: exam prep built on the 69 generators.** `x/review.html` picks weeks (or a unit, or a
thread), a mode (figures and cards, figures only, cards only) and a length, then runs a mixed session.
Figure questions mount a single kit spec and start it on a fresh random round, so every question has
new, script-verified numbers. Figures you have not tried, or scored low on, come first (weights from
the kit's own per-figure best score); cards that are due come first. The session ends in a summary
that links each item back to its notes. "Your weakest figures" lists your lowest best scores.

**Progress lives in this browser.** `localStorage['ec224x-v1']` keeps watched videos, read chapters,
flashcard boxes and the last place you read. Figure scores are read from the kit's existing per-week
stores (`ec224-wN-predict`), so rounds played on the main site count here and the other way round.
Nothing is sent anywhere.

**The AI and feedback where the question comes up.** No floating button. "Ask" sits in the top bar
on every page and opens a drawer (`assets/ask-drawer.js`, a variant of the live `ask-widget.js` on the
same `chatbot.js` and worker); each figure keeps "Ask about this figure" (the live `ask-figures.js`,
unmodified) which opens the same drawer already about that figure. `x/ask.html` is the full split
view. Feedback is the live `feedback.js`, unmodified: "Suggest or report" on every figure and
"Feedback" in every footer, filed to the same private issue tracker.

### Page inventory (18 pages)

| page | what |
| --- | --- |
| `index.html` | course map, continue, exam prep, threads, ask |
| `week1.html` to `week12.html` | each week as one path |
| `week2-practice.html` to `week4-practice.html` | the live problem generators, in this site's frame |
| `review.html` | exam prep: mixed figure questions and flashcards |
| `ask.html` | the course AI, full split view |

## Visual system

The direction is **the films, carried out to the whole site**. Zach's favourite things are the
ManimGX films and the kit figures; both already share a look: paper `#eff1ee`, Libre Franklin at
heavy weights, thick strokes, the film data palette, plum for "you". The site now speaks the same
language instead of framing the figures in a different one.

- **Ground: paper `#eff1ee`.** Not a mood choice: the kit draws label halos and step badges in
  `#eff1ee`, so any other ground under a figure shows as blobs.
- **One family: Libre Franklin**, 400 for prose, 700 to 800 for everything that is a heading or a
  number. The films and figures are set in it; a second face would split the site from its figures.
  Big: body 19px (18px on phones), lead 21 to 22px, step headings up to 60px, week numbers up to 200px.
- **Colour is the unit.** The four film data colours become the four units: blue (consumers, weeks
  1 to 4), orange-red (firms, 5 to 7), green (markets, 8 to 10), purple (when markets fail, 11 and 12).
  A week's header band, its step numerals, its rules and its poster are in its unit's colour, so you
  always know where you are (Seeing Theory's per-chapter colour, done with the course's own palette).
- **Plum means you.** In the figures plum is your guess; here it is also your progress: done ticks,
  progress bars, the continue block, known cards. Nothing else is plum.
- **Thick rules, the weight of a figure's axes.** 3px ink rules open lists and steps; 8 to 10px unit
  rules open groups. No hairlines, no card shadows, no boxes around prose: a callout is a 5px left rule.
- **Posters.** Each week's signature diagram (from the live home page's covers) is redrawn in thick
  white strokes on its unit colour: big in the week header, as tiles on the map.
- **Motion** only answers an action: the drawer slides, the progress bar grows. The figures and
  films own all the choreography.

Checked against the frontend-design tells: no cream and terracotta, no dark mode with one acid accent,
no hairline broadsheet, no grid of identical shadowed cards, no all-caps eyebrows, no middle-dot meta
strings (the films' "Animation · 44s" becomes "Animation, 44 seconds"), no monospace, no arrow glyphs
on links, no em or en dashes (the build fails loudly if one reaches a page). Numbered markers appear
only where the content is a sequence (the steps of a week, the predict, see, explore loop).

## What was kept, and why

- **Every word of teaching prose, every film, every figure, every flashcard, every lecture video and
  slide PDF, the textbook and notes links, the practice generators, the homework link.**
  `x/tools/content.js` checks this week by week against the live pages.
- **The figures exactly as they are.** Same kit, same specs, same files (`../assets/predict/...`),
  mounted the same way. Settled and loved; not touched.
- **The teaching sections' own structure** (callouts, worked examples, tables, the week 8 to 12
  section groups), restyled.
- **Watch, then read**, from Prof. Sunder's own instruction.
- **The live chat, feedback and film scripts**, loaded unmodified from `../assets/`.

## What was dropped, and why

- **The hub pages and the slides / videos / flashcards / figures sub-pages.** Their content is all on
  the week page; the hop through a list of links was the problem.
- **"Learning the Material / Practice" grouping.** Replaced by the four steps, which say the order.
- **The section numbers "§ 2.5"** on figure sections. They used the old figure numbering and clashed
  with the kit's ("§ 2.5" held Figure 2.3). The kit's "Figure 2.3" label is now the only number.
- **The figures page lede** ("Each figure asks one question..."), replaced by the three-step
  predict / see / explore note at the top of the figures step.
- **The flashcard page's type filter and shuffle.** Spaced repetition decides the order now, and
  "See all cards with answers" lists the whole deck for reading or printing.
- **The floating "Ask" button.** Replaced by the top bar button and the figure links (see above).
- **Inline font sizes in the prose** (tuned for 14px text), stripped at build so the type scale holds.

## How it is built

```
node x/tools/build.js        # regenerate every x/ page from the live site (reads only)
node x/tools/content.js      # nothing lost: sections, films, figures, cards, videos, PDFs, links, prose words
node x/tools/links.js        # every internal link and anchor resolves
node x/tools/shoot.js <dir> page.html@#sel ...   # screenshots at 1440 and 390, console errors, overflow
node x/tools/flow.js <dir>   # drives cards, videos, ticks, a figure, the drawer, a review, home progress
node x/tools/contrast.js     # measured WCAG contrast of every text element (kit figures excluded)
node x/tools/allfigs.js      # review mode can mount each of the 69 figures alone, on random rounds
PORT=4396 node lab/predict/tools/loadcheck.js x/week2.html ...   # the kit's own load check
```

Serve with `cd C:\MicroSite && PORT=4396 node serve.js` and open `http://localhost:4396/x/`.

- `tools/extract.js` reads the live pages: home covers and copy, hubs, slides and videos pages, the
  figures pages (prose sections, films, figure slots, the page's kit CSS), flashcard decks, practice
  pages, and the figure catalogue from `assets/predict/weekN/figs.js`.
- `tools/course.js` is the only authored content: the four units, which weeks build on which, and
  the ten threads. These are editorial claims for the professor to check.
- `tools/build.js` cleans what it extracts (relative paths, dashes, inline sizes, week 2's `$...$`
  math converted to `\(...\)` so cards and prose share one MathJax setup), then writes the pages and
  `assets/course-data.js`.
- Runtime: `assets/x.css` (one stylesheet), `x.js` (progress, menu, path bar, videos, ticks),
  `deck.js` (Leitner flashcards), `review.js`, `home.js`, `ask-drawer.js`.

## Measured

- Contrast (`tools/contrast.js`, computed colours, both widths): every text element on the home, week,
  review, ask and practice pages is at least 5.2:1; zero under AA.
- Zero console errors on all 18 pages at 1440 and 390; no horizontal overflow at either width.
- All internal links and anchors resolve (`tools/links.js`: 948 references, 0 broken).
- All 69 figures mount on the week pages (kit `loadcheck.js`: weeks 2 to 12, zero errors, zero
  overflow) and each mounts alone in review mode on three random rounds and reveals (`tools/allfigs.js`).
- `tools/flow.js`: 18 interaction checks at each width (card reveal and rating, video player loads,
  ticks persist, a figure reveals and restarts, skip link first in tab order, drawer opens and closes
  with Escape, "Ask about this figure" carries the figure, a mixed review runs to its summary, home
  offers to continue) all pass.

## Open questions for Zach

1. The threads and "builds on" lines are my reading of the course; Prof. Sunder should check them.
2. `assets/week2-notes.pdf` exists in the repo but the live site never links it; it is not linked
   here either. Should week 2 get a "Lecture notes" reading like week 1?
3. Weeks 8 to 12 have no lecture videos or slides on the site, so their path starts at Read. If the
   recordings exist on Kaltura, adding them to a `weekN-slides.html` would light up the Watch step.
4. "Watched" and "Read" are ticks the student sets; the Kaltura player does not tell the page.
5. The practice generators keep their own markup inside this site's frame; a deeper pass could fold
   them into the Check step and the review mode.
