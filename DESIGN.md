# EC224 Design Standard

The permanent visual standard for falconeconsim.github.io. Every change to the
site gets reviewed against this document.

It was derived in July 2026 from three reference sites, cloned and measured:
**MLU-Explain** (aws-samples/aws-mlu-explain), the primary anchor for layout and
type; **Explained Visually / Setosa** (vicapow/explained-visually), the anchor
for visualization style and motion; **Seeing Theory** (seeingtheory), the
secondary anchor for chapter structure. The full extraction is in
`references/ANALYSIS.md`, the gap list it was written against is in
`references/AUDIT.md`. Neither ships; `references/` is gitignored.

Every borrowed pattern below cites its source. Where a rule has no citation it
is ours.

> Reuse note: Seeing Theory's LICENSE restricts reuse of its visualizations, and
> Setosa's are the author's own work. We replicate technique and quality only.
> No visualization on this site is ported from either.

---

## 1. Tokens

All of these live in `:root` in `shared.css`. Nothing outside `shared.css` may
declare a colour, a font size, a radius, or a duration literal.

### 1.1 Surface and ink

```css
--paper:        #fbf9f6;   /* page background. never #fff */
--paper-raised: #ffffff;   /* the one surface allowed to be pure white */
--paper-sunk:   #f2efe9;   /* inset wells: code, chat log, disabled */
--ink:          #1c2433;   /* body text. desaturated navy, never #000 */
--ink-soft:     #4a5566;   /* secondary text. still readable, not decorative */
--ink-faint:    #8b95a5;   /* labels, captions, axis ticks. non-essential only */
--rule:         #e3ded5;   /* hairlines */
--rule-strong:  #c9c2b6;   /* section breaks */
```

Warm off-white rather than white, after MLU (`precision-recall` computes
`rgb(241,243,243)`, `train-test-validation` `rgba(252,244,232,.855)`) and Seeing
Theory (chapter 1 computes `rgb(214,239,250)`). See ANALYSIS 4.4.

`--ink-faint` is for things a student can ignore. Explanatory prose is never
`--ink-faint` and never `--ink-soft`. This directly reverses AUDIT V-10.

### 1.2 Brand

```css
--brand:        #0b4f8f;   /* Bentley blue, deepened for AA on --paper */
--brand-deep:   #073861;   /* hover / pressed */
--brand-wash:   #e8f0f8;   /* tint fills */
--mark:         #f6c76a;   /* the highlighter. see 5.1 */
--mark-soft:    rgba(246, 199, 106, 0.55);
```

Two brand colours and one marker colour. That is the whole non-data palette.

### 1.3 Unit identity

Each of the four units owns a tint. The tint appears as the unit band on the
landing page, as the hub page background, and as the viz page background for
that unit's weeks. Borrowed from Seeing Theory, whose six chapters each own a
colour that is simultaneously the landing hover state and the chapter page
background (`seeing-theory/css/home.css:132-154`).

```css
--u1: #eaf2f8;  /* Unit 1 Consumer Theory   weeks 1-4 */
--u2: #eef4ec;  /* Unit 2 Producer Theory   weeks 5-7 */
--u3: #f7f0e8;  /* Unit 3 Market Structure  week  8-10 */
--u4: #f4eef4;  /* Unit 4 Welfare & Ext.    weeks 11-12 */
--u1-ink: #1d4f77; --u2-ink: #2f5c3a; --u3-ink: #8a5a1f; --u4-ink: #6b3f6b;
```

A page sets `--unit` and `--unit-ink` once on `<html>`; every component reads
those, never `--u1` directly.

### 1.4 Data palette

Six series colours. **Each has one fixed meaning across the entire site.** This
replaces the current situation, which `shared.css:23-28` documents honestly:
19 different reds and 8 greens, with `#c0392b` (109 uses) and `#e74c3c` (72
uses) both meaning "bad".

```css
--d-primary:  #1f6fb2;  /* the main curve under study (demand, TP, MC)      */
--d-second:   #c85a3c;  /* the thing it is compared against (supply, AC)    */
--d-gain:     #2f7d55;  /* surplus, gain, the better outcome                */
--d-loss:     #b03a2e;  /* deadweight loss, the worse outcome               */
--d-transfer: #a07800;  /* value moved, not destroyed                       */
--d-ghost:    #9aa3b0;  /* the pre-shift original. always dashed            */
```

Rules:
- At most **four** of these appear in any one figure. Reference: MLU's entire
  bias-variance article runs on three (train, test, model).
- `--d-ghost` is the only colour permitted for a dashed "original" curve. It is
  never used for live data.
- Axes, gridlines and frames are **not** in this palette. See 4.2.

### 1.5 Type

```css
--font-display: 'DM Serif Display', Georgia, serif;
--font-body:    'DM Sans', system-ui, sans-serif;
--font-mono:    'DM Mono', ui-monospace, monospace;
```

Three roles, mirroring MLU's three cuts of Amazon Ember (Display Heavy for
headings and all in-chart text, Regular for prose, Mono for numerals) at
`mlu-explain/css/styles.css:4-22`. DM Serif Display is already loaded by the
flashcard pages, so this adds no new font request to the site as a whole.

**Scale.** Eight steps. Nothing outside this list.

```css
--t-caption: 0.8125rem; /* 13px  axis ticks, kbd hints, footnotes  */
--t-small:   0.9375rem; /* 15px  UI labels, nav, badges            */
--t-body-sm: 1.0625rem; /* 17px  dense lists, tables, card copy    */
--t-body:    1.125rem;  /* 18px  ALL explanatory prose             */
--t-lead:    1.3125rem; /* 21px  page lede, card descriptions      */
--t-h3:      1.5rem;    /* 24px  sub-section                       */
--t-h2:      1.875rem;  /* 30px  section title                     */
--t-h1:      2.5rem;    /* 40px  page title                        */
--t-display: 3.5rem;    /* 56px  landing / chapter opener only     */

--lh-tight: 1.2;   /* --t-h1 and up */
--lh-head:  1.3;   /* --t-h2, --t-h3 */
--lh-body:  1.55;  /* everything else */
```

Derived from measured MLU values (ANALYSIS 4.2): body 18px/27px, section header
30px/45px, article title 64px, lede 22.4px; and Seeing Theory chapter `p` at
18px/25.2px. We use 40px rather than MLU's 64px for page titles because our
pages carry ten figures each rather than one narrative.

Weights: **400, 500, 700 only**. No 300, no 600. DM Serif Display has one
weight; that is the point of using it.

### 1.6 Measure and width

```css
--measure:      38rem;   /* 608px  prose column. ~62 characters at 18px */
--measure-wide: 46rem;   /* 736px  tables, lists, control rows          */
--page:         72rem;   /* 1152px outer content bound                  */
--figure-max:   58rem;   /* 928px  widest a single figure may be        */
--rail:         13rem;   /* 208px  sticky section nav                   */
```

`--measure` is the load-bearing token. Measured references: MLU `.body-text`
600px at 67 chars/line, MLU landing `.article-description` 444px at 42, Seeing
Theory chapter `p` 490px at 54. Target band **55 to 67 characters**.

Current site for comparison: `.fig-intro` computes to **1320px at 183
characters** (AUDIT SW-2). That is the defect this token exists to close.

### 1.7 Space

```css
--s-1: 0.25rem;  --s-2: 0.5rem;   --s-3: 0.75rem;  --s-4: 1rem;
--s-5: 1.5rem;   --s-6: 2rem;     --s-7: 3rem;     --s-8: 4rem;
--s-9: 6rem;     --s-10: 8rem;    --s-11: 10rem;
```

**Section separation is `--s-9` (96px) minimum at desktop, `--s-8` (64px) at
mobile, and it is empty.** No rule, no divider, no box edge doing the
separating. Reference: MLU `.articles-container { row-gap: 5rem; column-gap: 5rem }`
(`css/styles.css:341-351`) and `section { margin-bottom: 24vh }`
(`decision-tree/main.37eaf4da.css`). Current largest routine gap on our site is
11px (AUDIT SW-4).

### 1.8 Line, radius, shadow

```css
--hair:     1px solid var(--rule);
--radius:   6px;      /* the only radius. controls and inputs        */
--radius-lg: 14px;    /* the only large radius. flashcard, chat pane */
--lift:     0 6px 20px rgba(28, 36, 51, 0.07);
--lift-lg:  0 14px 40px rgba(28, 36, 51, 0.10);
```

Two radii and two shadows. Everything else is square or unshadowed.

---

## 2. Layout

### 2.1 The column system

One grid, used by every content page:

```css
.page {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--s-4), 1fr)
    [wide-start] minmax(0, calc((var(--measure-wide) - var(--measure)) / 2))
    [text-start] min(var(--measure), 100%) [text-end]
    minmax(0, calc((var(--measure-wide) - var(--measure)) / 2)) [wide-end]
    minmax(var(--s-4), 1fr) [full-end];
}
.page > *              { grid-column: text-start / text-end; }
.page > .bleed-wide    { grid-column: wide-start / wide-end; }
.page > .bleed-full    { grid-column: full-start / full-end; }
```

Prose is in the text column by default. **Figures opt out; text never does.**
This is MLU's mechanism exactly: `global.css:76-101` gives `.body-text`,
`.body-header` and `.centered` the same `max-width: 575px`, and figures simply
do not carry those classes, so breaking out is the absence of a rule rather than
a special case (ANALYSIS 1.2).

### 2.2 Page shells

Three shells, no more.

**Shell A: index.** No sticky bar. Wordmark, one sentence, then content. MLU's
landing carries zero persistent chrome (ANALYSIS 1.1).

**Shell B: reading page** (hub, viz, practice, flashcards, ask). A slim sticky
bar carrying breadcrumb only, plus a **left rail listing the sections of the
current page** with the active one marked, collapsing to a top strip below
900px. The rail is a table of contents for the page you are on, not a map of the
site. Reference: MLU's sticky header is the article's own section list with
`#toc li .selected { border-bottom: 2.5px solid #ff8f00 }`
(`train-test-validation/main.fff30958.css`, ANALYSIS 1.3).

The site-wide week list moves to a single overlay reachable from the wordmark.
It is not persistent chrome.

**Shell C: focus** (flashcards, ask). Breadcrumb only, content vertically
centred, no rail.

### 2.3 Vertical rhythm

| Between | Desktop | Mobile |
|---|---|---|
| Section and section | `--s-9` 96px | `--s-8` 64px |
| Section title and its first paragraph | `--s-4` 16px | `--s-4` |
| Paragraph and paragraph | `--s-4` 16px | `--s-4` |
| Last paragraph and its figure | `--s-6` 32px | `--s-5` |
| Figure and its controls | `--s-4` 16px | `--s-4` |
| Figure block and next paragraph | `--s-7` 48px | `--s-6` |

The only permitted section divider is a **short centred hairline, 64px wide,
`--rule-strong`**, with `--s-9` above and below. Full-width rules between
sections are removed. Reference:
`shots/slice-mlu/bias-variance-index-html__1440-s4.png`.

---

## 3. Anti-generic rules

These are the five rules from ANALYSIS 5. They are the review criteria. A change
that violates one does not ship.

### AG-1. One container per idea. Never a box inside a box.

At most **one** border between the page background and any piece of content.
Prefer whitespace and a short rule to a box.

Concretely: a figure block is *one* element. It does not have a border AND a
header bar AND a control panel AND a readout panel. Today Fig 5.1 nests six
(AUDIT SW-3). `shared.css` currently defines the same grey rounded box
seventeen times; the target is **three** container patterns total, listed in
section 5.

Reference: MLU's `.article-card` has no border, radius, shadow, padding or
background (`css/styles.css:353-358`).

### AG-2. Type is big and the measure is short.

Body prose is `--t-body` (18px) minimum and its column never exceeds
`--measure` (608px), on every page, at every viewport. **Type does not shrink on
mobile.** MLU's mobile landing holds 17 to 21px
(`shots/ref-mlu/index-html__390.png`).

Figures break out of the text column. Text never does.

### AG-3. Identity comes from a made thing, not a component library.

We own exactly three visual devices (section 5.1). **Zero emoji as UI.** Zero
decorative pills. Zero "PUBLISHED" / "OPENS TAB" badges. If a state matters,
express it in the layout, not in a chip.

Reference: MLU's identity is two hand-made devices, the rough-notation
highlighter and the deliberately misregistered marker block behind buttons
(`css/styles.css:316-327`), plus hand-drawn illustration. Ours today is 📖 📑 📊
✏️ 🃏 (AUDIT SW-5).

### AG-4. Colour is semantic, scarce, and named in the prose.

At most four saturated colours per figure, each with the fixed meaning given in
1.4. **The paragraph that introduces a figure names those colours in words.**

Reference: Seeing Theory ships five prose colour classes
(`chapter-style.css:61-84`) and writes sentences like "the running average of
squared differences (in `<span class="green-color">green</span>`) begins to
resemble the true variance (in `<span class="blue-color">blue</span>`)"
(`basic-probability/index.html:140`). MLU keys its highlighter colour to the
group in the figure.

We adopt the same mechanism:

```css
.c-primary { color: var(--d-primary); font-weight: 500; }
.c-second  { color: var(--d-second);  font-weight: 500; }
.c-gain    { color: var(--d-gain);    font-weight: 500; }
.c-loss    { color: var(--d-loss);    font-weight: 500; }
```

### AG-5. Whitespace is measured in screens, not in rems.

See 1.7 and 2.3. Sections are separated by 96px of nothing.

---

## 4. Visualization standard

### 4.1 Placement

Three placements, chosen deliberately per figure. Reference: ANALYSIS 2.1.

**(a) Inline.** The default. Introductory paragraph in the text column,
controls, then the figure, all sharing `--measure-wide`. Use for the eight or so
figures per week that answer one question.

**(b) Pinned.** Figure `position: sticky` in a wide left column, prose scrolling
in a `--measure` column on the right, each paragraph driving a figure state.
Reserve for the **one or two figures per week that tell a sequential story**
(Fig 3.1 demand derivation, Fig 5.1 TP/MPL, Fig 7.5 supply emergence). Collapses
to single column below 900px, where the text gains an opaque background so it
can float over the figure, exactly as MLU does
(`train-test-validation/main.fff30958.css`, `@media (max-width:950px)`).

Do not make every figure a pinned scrolly. MLU's decision-tree article is
14239px tall for one concept; ten of those per week would be unreadable
(ANALYSIS 6).

**(c) Aside.** A short figure beside a short paragraph, both in
`--measure-wide`. For comparisons and quizzes.

### 4.2 Chart ink

```
Gridlines                      rgba(28, 36, 51, 0.07)
Axis lines, tick marks         rgba(28, 36, 51, 0.14)
Axis tick labels               --ink-faint, 12px
Axis titles                    --ink-soft, 13px
Data curves                    3px up to a 640px plot, 4px above
Data points                    r = 7 desktop, r = 6 mobile
Emphasis point                 r = 9 to 10
```

The curve weight scales with the plot because ours are smaller than the
references': MLU draws at 5px in 790 to 1100px plots, which is the same optical
weight as 3px in our 512 to 736px ones. Scaling stroke with figure width is the
references' own practice (`decision-tree/main.37eaf4da.css` steps its type down
at `max-width: 850px`).

Setosa: `.axis path, .axis line { stroke: rgba(0,0,0,0.1) }` and
`.axis text { fill: rgba(0,0,0,0.6) }` (`style.less:139-150`). MLU: model lines
at `stroke-width: 5`, `#ig-line-ig` at 5, `.outline-line` at 10, points at
`r: 12` desktop / `9.5` mobile (`bias-variance/js.63b32ab2.js`).

**No plot frame.** Bottom and left axis only. Gridlines only where a value must
be read off, never both axes.

### 4.3 In-figure labels

Labels are **haloed text, not boxes**:

```css
.fig-label-text {
  font-family: var(--font-body);
  font-size: 13px;                  /* --t-caption, not 9px */
  font-weight: 500;
  fill: currentColor;
  stroke: var(--paper-raised);      /* the plot's own background */
  stroke-width: 3px;
  stroke-linejoin: round;
  paint-order: stroke fill;
}
```

13px rather than `--t-small`, for the same reason as the curve weights above:
13px in a 512 to 736px plot is the optical size of MLU's 16px in a 790 to
1100px one. Anything larger and four labels cannot coexist inside one of our
square plots. The figures compute each label's box width assuming the old 9px
type, so a single `d5w()` helper rescales those numbers instead of fifteen
width formulas being edited by hand.

`paint-order: stroke fill` with a stroke in the page colour is how every MLU
in-chart label survives being drawn over data
(`decision-tree/main.37eaf4da.css`, `.dt-text`, `.entropy-values`). It replaces
our white rounded rect with a coloured 1px border and a dashed leader, which
today puts three outlined boxes inside one 482px plot
(AUDIT V-5, `shots/slice-ours/week5-viz-html__1440-s1.png`).

Keep the force-simulation collision avoidance and the drag behaviour from the
S6/S8 template in `testing.html`; replace only the label's rendering. Connector
lines stay at `stroke-width: 0.9, dasharray 4 3, opacity 0.55` but are drawn
only when the label has actually been pushed more than 12px from its anchor.
Anchor dots stay omitted.

### 4.4 Controls

**The slider label is the readout.** One line, bold, above the track:

```
Workers L: 3.4
```

There is no separate value chip and **no `.viz-readout` panel**. Reference: MLU's
LOESS control is exactly this, `Smoothness: 0.42` in bold above a plain track,
with no readout panel anywhere on the page
(`shots/slice-mlu/bias-variance-index-html__1440-s4.png`, ANALYSIS 2.2).

Where a figure genuinely needs derived quantities (MRTS, elasticity, surplus),
they are drawn **inside the figure** at the point they describe wherever the
figure already draws a label there. What is left over, a verdict or a sentence
of feedback that cannot live inside a plot ("Hire refused: MPL is negative at
L=9"), goes in a **`.fig-state` line under the plot with no border, no fill and
no radius**. That is still one container for the figure block, so AG-1 holds.
What does not survive is the bordered off-white `.viz-readout` panel and any
value the student can already read off a control.

`assets/deltabar.js` is treated the same way: the old/new/change information
stays, its grey card per item does not (see the `data-ds="v2"` override in
`shared.css`).

```css
.ctrl-row   { display: flex; flex-wrap: wrap; gap: var(--s-5);
              margin-bottom: var(--s-4); }        /* ABOVE the figure */
.ctrl-label { font: 500 var(--t-small)/1.2 var(--font-body); color: var(--ink); }
.ctrl-value { font-family: var(--font-mono); color: var(--unit-ink); }
.ctrl-track { appearance: none; height: 4px; border-radius: 2px;
              background: var(--rule); accent-color: var(--unit-ink); }
```

Thumb: 18px desktop, **24px touch** (current 22px minimum at 540px is close;
round up). Controls sit **above** the figure, not below, so the figure is never
pushed off screen by its own chrome.

Where the data mark can be the control, it should be. Setosa's whole control
vocabulary is `.nob { cursor: move; fill: #fff; stroke: rgba(0,0,0,0.7) }`
(`style.less:360-364`): you drag the point, the line, the divider. Any figure
whose only slider maps directly to a visible point should lose the slider.

### 4.5 Figure titles and captions

No `.panel-label` bar. No mono uppercase strip. A figure gets:

```html
<figure class="fig bleed-wide">
  <div class="fig-hd">
    <span class="fig-n">5.3</span>
    <h3>MRTS Live Calculator</h3>
  </div>
  <!-- controls, then chart -->
</figure>
```

`.fig-n` is `--font-mono`, `--t-small`, `--ink-faint`. `h3` is `--font-display`
at `--t-h3`. No pill, no background, no border, no uppercase, no letter-spacing.

The explanatory paragraph above the figure is the caption, at `--t-body` in
`--ink` (not `--ink-faint`), in the text column. MLU has no figure captions and
no figure numbers at all; we keep numbers because the professor and the textbook
reference them.

---

## 5. Components

### 5.1 The three owned devices

**Device 1: the mark.** A highlight swipe behind a key phrase. Ours is a clean
skewed swipe rather than MLU's hand-drawn rough.js stroke, but the idea is
theirs (`mlu-explain/js/rough-notation.js`, and the misregistered block at
`css/styles.css:316-327`).

```css
.mark {
  position: relative;
  display: inline;
  background-image: linear-gradient(var(--mark-soft), var(--mark-soft));
  background-repeat: no-repeat;
  background-position: 0 88%;
  background-size: 100% 0.55em;
  /* uneven ends: the left edge starts a hair early, the right overhangs */
  padding: 0 0.12em 0 0.06em;
  margin: 0 -0.06em;
}
```

Used on **one phrase per section, maximum**. It marks the sentence the figure
below is about. Not for emphasis in general; `<strong>` handles that.

**Device 2: the unit tint.** Section 1.3. A student always knows which unit they
are in because the page is that colour. From Seeing Theory.

**Device 3: the section numeral.** The existing `.week-ghost` / `.viz-ghost`
idea, made real. Currently `#f0f0f0` on `#fff`, roughly 3% contrast, so it is
invisible (AUDIT H-4). It becomes:

```css
.numeral {
  font-family: var(--font-display);
  font-size: var(--t-display);
  color: var(--unit-ink);
  opacity: 0.16;
  line-height: 1;
}
```

Set in the left margin of a section opener, not floated top-right behind text.

### 5.2 Week card (landing)

Replaces `.week-card` (`shared.css:507-521`).

- **No border, no radius, no shadow, no background, no padding.** After MLU
  `.article-card` (`css/styles.css:353-358`).
- Contents, in order: a **cover** (the week's signature diagram, rendered as a
  static SVG on the unit tint, with the week number and title set over it), then
  the title, then a one-sentence description at `--t-lead`.
- **No badge. No tag chips.** Published state is expressed as opacity and the
  absence of a link, which is already how upcoming cards behave.
- Grid: `repeat(auto-fill, minmax(320px, 1fr))` with `gap: var(--s-8)` (64px).
  At 1152px that gives 3 columns, not 4. MLU uses 2 columns with 80px gutters.
- Hover: cover lifts `translateY(-2px)` and its border darkens. One property
  pair, not seven.

The cover is the piece of work that fixes AUDIT L-2. Eight weeks, eight
diagrams we already draw.

### 5.3 Figure container

```css
.fig       { margin: var(--s-7) 0; }
.fig-hd    { display: flex; align-items: baseline; gap: var(--s-3);
             margin-bottom: var(--s-3); }
.fig-plot  { background: var(--paper-raised); border-radius: var(--radius);
             padding: var(--s-4); }
```

`.fig-plot` is the **one** container. It exists only to hold the plot off the
tinted page background so curves read cleanly; it has a radius and a fill and
**no border**. If the page is untinted, `.fig-plot` has no background either and
the chart sits directly on the page, as in Setosa and MLU.

Removed: `.cvs-wrap` border, `.panel-label` bar, `.viz-readout` panel,
`#vNN-form-desc` tinted box, the boxed `.toc`.

### 5.4 Control panel

There isn't one. See 4.4. `.ctrl-row` is a flex row of label-plus-track pairs
with no background, no border, no padding, sitting above the figure.

### 5.5 Flashcard

Keeps its geometry and its motion, loses its private palette.

- Replace `#0077C8` with `var(--unit-ink)`, `#f4f7fb` with `var(--unit)`,
  `#E2EAF4`/`#CBD8EC` with `var(--rule)`, `#BCC8D8` with `var(--ink-faint)`
  (AUDIT F-1, `week5-flashcards.html:26-74`).
- Question and answer both at `--t-body` (18px). Today the answer is 0.88rem
  against a 1.2rem question, which is backwards (AUDIT F-4).
- Answers parse `\n-` into a real `<ul>` instead of `white-space: pre-line`.
- One progress indicator, not three: a single `n / total` plus the bar. Drop the
  in-card `Card 1` label.
- Shell C: vertically centred, so the card is not stranded at the top of an
  empty screen (AUDIT F-2).
- **Keep** the flip verbatim: `rotateY(180deg)`, `0.38s cubic-bezier(.4,0,.2,1)`,
  `perspective: 1000px`, and the 0.18s/0.24s deck-advance slide. It is already
  the best motion on the site and it becomes the reference for section 6.

### 5.6 Chat interface (ask.html and the widget)

- Default straight into split view. Remove the tab bar (AUDIT A-3).
- **Four starter questions as clickable chips**, one per unit, filling the empty
  log on load. This is the fix for A-1 and A-2 together: the void becomes the
  demonstration.
- Log messages: assistant on `--paper-raised` at `--radius-lg`, student on
  `--brand-wash`, both at `--t-body` and capped at `--measure`.
- The preview pane shows the source page's title and a "jumping to..." state
  rather than a grey placeholder.
- Answer arrival: fade plus 8px rise, `--dur-reveal`. Passage highlight in the
  iframe: `--mark-soft`, held 1.2s, then eased out.
- One "24/7" claim per page, not two.

### 5.7 Prose components

Exactly three, replacing the current seventeen:

```css
/* 1. note: quiet aside, no box */
.note { border-left: 3px solid var(--rule-strong); padding-left: var(--s-4);
        color: var(--ink-soft); }

/* 2. callout: one per section maximum, tinted, no border */
.callout { background: var(--unit); border-radius: var(--radius);
           padding: var(--s-5); }

/* 3. warn: the only red-flagged pattern */
.warn { border-left: 3px solid var(--d-loss); padding-left: var(--s-4); }
```

Deleted: `.q-card`, `.eq-row`, `.app-box`, `.summary-notice`, `.assump-card`,
`.props-list li` boxes, `.fc-node`, `.fc-result`, `.how-to-use`. Their content
becomes plain prose, a definition list, or a table.

A callout is never wider than the paragraph it interrupts, and never longer than
it. AUDIT VA-2 records the current inverse.

---

## 6. Motion

### 6.1 Tokens

```css
--dur-state:  150ms;  /* hover, focus, press                        */
--dur-reveal: 260ms;  /* disclosure, chip select, message arrival   */
--dur-value:  450ms;  /* a data value changed: curve, point, bar     */
--dur-step:   700ms;  /* a narrative step in a sequenced figure      */

--ease-out:   cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* default        */
--ease-emph:  cubic-bezier(0.34, 1.28, 0.64, 1);     /* arrival accent */
--ease-inout: cubic-bezier(0.45, 0.05, 0.55, 0.95);  /* A to B and back */
```

`--ease-out` is Setosa's literal value, used 8 times in
`explained-visually/client/**` as
`transition: all cubic-bezier(0.250, 0.460, 0.450, 0.940) 0.5s`. `--ease-emph`
is our approximation of MLU's `easeBack`, which it uses 10 times
(`.ease(easeBackInOut)` ×6, `.ease(easeBack).duration(1500)` ×4).

Duration evidence: Setosa runs 250ms for hover, 500ms for value changes (13
uses), 1000ms for narrative (14 uses). MLU, being scroll-driven, runs slower:
600ms (10), 1000ms (12), 1200ms (12), 1500ms (4). We sit between them because
our figures respond to direct input, not to scroll. See ANALYSIS 3.

### 6.2 What animates

| Thing | Duration | Easing |
|---|---|---|
| A curve moving because a slider moved | none while dragging; `--dur-value` on release or on a discrete change | `--ease-out` |
| A curve shifting because a **button** was pressed (shift vs pivot, substitute vs improve technology) | `--dur-value` | `--ease-inout` |
| A sequenced step (Fig 3.1 four-step derivation) | `--dur-step` | `--ease-inout` |
| A point being called out | radius `r → r*1.5 → r`, `--dur-value` each way | `--ease-emph` |
| Disclosure, tab change, chip select | `--dur-reveal` | `--ease-out` |
| Hover, focus, press | `--dur-state` | `--ease-out` |
| Flashcard flip | 380ms | `cubic-bezier(.4,0,.2,1)` (existing, keep) |

**AUDIT V-7 is the priority here.** Fig 5.6's "Substitute Inputs" versus
"Improve Technology" buttons currently jump between states with no tween, which
means the one distinction the figure exists to teach is never shown as motion.
Every button that moves a curve gets `--dur-value` with `--ease-inout`.

MLU's radius call-out is worth copying directly:
`.transition().delay(1300).attr("r", 12).transition().attr("r", 9.5)`
(`bias-variance/js.63b32ab2.js`). Draw the eye by growing the mark, not by
flashing a colour.

### 6.3 What does not animate

- **Nothing animates during a drag.** Redraw synchronously. A transition on a
  dragged element fights the pointer.
- No page-load reveals. Content is present when the page paints. The current
  `.fade-up` observer with `rootMargin: '0px 0px 9999px 0px'` fires everything
  at once anyway (AUDIT L-6); it is deleted rather than tuned.
- No progress-bar self-animation on load (`index.html:296-299`, deleted).
- **The film grain overlay is deleted** (`shared.css:665-675`): a fixed
  full-viewport layer at `z-index: 9990` over every page, for texture.
- **The cursor spotlight is deleted** (`shared.css:694-718`).
- Hover lift is capped at `translateY(-2px)` and one shadow. The current hub
  button animates seven properties at once (AUDIT H-6).

### 6.4 Reduced motion

`prefers-reduced-motion: reduce` keeps every state change but removes the tween:
curves jump, disclosures open instantly, the flip becomes a swap. Content that
starts at `opacity: 0` must be made visible outright, not merely un-transitioned.
The existing block at `shared.css:745-763` already gets this right and is kept.

---

## 7. Responsive

Two real breakpoints. `900px` (rail collapses to a top strip, pinned figures go
single column) and `560px` (controls stack, figures go full-bleed).

Rules that hold at every width:
- Body prose stays at `--t-body`. **Type never shrinks on mobile.** MLU holds 17
  to 21px at 390px (`shots/ref-mlu/index-html__390.png`).
- No horizontal page scroll. Wide tables scroll inside their own
  `overflow-x: auto` container.
- Touch targets 44px minimum; slider thumbs 24px.
- The chat FAB is `position: fixed` with `bottom: var(--s-4)` and must not
  overlap content: pages get `padding-bottom: 5rem` so it lands on empty page.
  It currently covers a week card, an answer input and a chart (AUDIT SW-8).

---

## 8. Review checklist

Any change to the site is checked against this list, with screenshots at
**1440px and 390px**, before it is called done.

1. Is any prose column wider than `--measure`? (AG-2)
2. Is there a box inside a box anywhere in the diff? (AG-1)
3. How many borders between the page background and the content? (AG-1, max 1)
4. Is any new colour outside section 1.4, or does any figure use more than four
   saturated colours? (AG-4)
5. Does the paragraph above each figure name the colours in it? (AG-4)
6. Is any section gap under 96px desktop / 64px mobile? (AG-5)
7. Any emoji, pill, or badge in the UI? (AG-3)
8. Any font size outside the eight-step scale, or weight outside 400/500/700?
9. Does every state-changing button tween its curve? (6.2)
10. Does anything animate during a drag? (6.3, must be no)
11. Does it hold at 390px with type unchanged? (Section 7)
12. Screenshot pass run and read, not inferred from code?

---

## 9. Rollout status and known remaining work

The design system was rolled onto all 36 student-facing pages in July 2026.
Every page reports clean from `review/check.js` at 1440px and 390px (opt-in,
old chrome removed, prose measure, heading face, emoji including numeric
entities, horizontal overflow, blank canvases, JS errors), and the figure pages
report clean from `review/exercise.js`, which drives every control in
combination and checks the result.

What is **not** finished, stated plainly rather than left to be discovered:

1. **The label system is week5-only.** `d5*` (deterministic seeding, the
   canvas-ink placement pass, haloed text instead of outlined boxes, the
   window-level canvas drag, the repaint-on-anchor-move fix) exists only in
   `week5-viz.html`. Weeks 2 and 3 are JSXGraph, weeks 4, 6 and 7 use a canvas
   `resolveLabels` / `drawForceLabel` pair, and week 8 is pure d3. They all got
   the shell, measure, type, palette and chart ink, but they still render
   labels as white boxes with coloured borders. Porting `d5*` to the canvas
   pages is the single highest-value follow-up.

2. **Fixed axes are week5-only.** `review/axis-fixed.js` passes on week5. The
   other canvas pages were not audited for dynamic ranges; `drawAxesSt` records
   `data-xr` / `data-yr` wherever it exists, so the guard can be pointed at them
   as soon as someone wants to do that pass.

3. **Motion is week5-only.** `ecTween` and the 6.2 table are implemented there.
   Buttons that move a curve on weeks 4, 6, 7 and 8 still jump.

4. **week6-viz Fig 6.1**: at the extreme corner (w at minimum, v at maximum)
   the draggable bundle can be dragged to L above the x-axis maximum, so the
   dot renders half outside the plot. Pre-existing, cosmetic, only reachable at
   a slider extreme.

5. **AUDIT S-1 stands.** The six slides pages and three videos pages still
   exist as separate pages carrying three links each. Folding them into the
   hub remains right, and was not done because it changes URLs that both the
   hubs and the chatbot's Pinecone index point at.

### The review tooling

Built during the rollout, all in `C:\MicroSite\review`, all outside the repo:

| Script | What it is for |
|---|---|
| `check.js` | per-page health report; the workhorse of the rollout |
| `exercise.js` | exhaustive interaction sweep with automated defect checks |
| `label-jitter.js` | label start spread across loads, and motion during a drag |
| `label-overlap.js` | ink under each label, and whether labels follow the point |
| `drag-through.js` | can a point be dragged through its own labels |
| `axis-fixed.js` | does any control change an axis |
| `measure-ref.js` | computed measure and type scale off a live page |
| `refsnap.js`, `refslice.js`, `drag-video.js` | captures |
| `palette-sweep.js`, `type-sweep.js` | token migration, reporting what they cannot place |

Every one of these checks was validated by reintroducing the defect it looks
for and confirming it fires. That is not ceremony: doing it caught a NaN check
that only scanned HTML while the NaN surfaced in an SVG label, a CLIP check
that counted 7%-opacity gridlines as cut text, and a drag test measuring
absolute label movement rather than displacement from the anchor.
