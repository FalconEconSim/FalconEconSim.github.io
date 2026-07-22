# Reference design systems: extracted

Phase 2 of the design revamp. Everything below is measured off the cloned repos
in `references/` (gitignored) plus the screenshot runs in
`C:\MicroSite\review\shots\`. Values are **computed** values read out of the
browser at 1440px (`review/measure-ref.js`), not values inferred from reading
minified CSS. Where a number came from a stylesheet instead, the file and line
are cited.

Screenshot runs referenced throughout:

| Run | What |
|---|---|
| `shots/ref-mlu/` | MLU-Explain, 5 pages, full-page @1440 + @390 |
| `shots/slice-mlu/` | MLU-Explain, 4 articles, 6 readable viewport slices each @1440 |
| `shots/ref-st/` | Seeing Theory, 4 pages, full-page @1440 + @390 |
| `shots/baseline/` | Our site, 35 pages, full-page @1366 + @390 |
| `shots/slice-ours/`, `slice-ours-m/`, `slice-ask/` | Our site, readable slices @1440 and @390 |

**Build note.** MLU-Explain and Seeing Theory ship prebuilt static HTML, so both
were served directly (`python -m http.server 8099` over `references/`) and
captured normally. `explained-visually` (Setosa) is 2015-era jade + less + gulp
with a `postinstall` patch step and d3 v3; its build was not attempted per the
brief. It is analysed from source, which is fine because the parts we want from
it (motion technique, control affordances, viz styling) live in
`client/explanations/*/script.js` and `*/style.less`.

---

## 1. Layout: MLU-Explain

### 1.1 The landing page (`mlu-explain/index.html`, `css/styles.css`)

Measured at 1440px (`shots/ref-mlu/index-html__1440.png`):

| Element | Value | Source |
|---|---|---|
| Page background | two stacked linear-gradients, peach → transparent at 217deg and 0deg | `css/styles.css:146-155` |
| `main` max-width | `1500px` | `css/styles.css:230-235` |
| `#intro-container` | `grid-template-columns: 55% 42%`, `max-width: 70%`, `grid-template-rows: 350px` | `css/styles.css:191-201` |
| `#articles-section` | `max-width: 75%`, `padding-left: 5%`, `padding-top: 4rem` | `css/styles.css:293-298` |
| `.articles-container` | `grid-template-columns: repeat(2, 1fr)`, `column-gap: 5rem`, `row-gap: 5rem` | `css/styles.css:341-351` |
| Intro paragraph | 527px wide, 21px / 29px | measured |
| Article description | 444px wide, 21px / 29px, 42 chars/line | measured |
| `h1` | 40px / 60px | measured |
| `.section-segue` | 24px | measured |

Structural facts that matter more than the numbers:

1. **There is no site chrome.** No sticky top bar, no logo bar, no breadcrumb,
   no hamburger, no sidebar. The first thing on the page is the wordmark, and
   the second thing is a sentence. Total persistent UI: zero pixels.
2. **The card is not a card.** `.article-card` is `display:flex; flex-direction:
   column; text-align:left` and nothing else (`css/styles.css:353-358`). No
   border, no radius, no shadow, no padding, no background. The only border in
   the whole grid is `0.5px solid #232f3e` on the *thumbnail image*
   (`css/styles.css:366-370`).
3. **The thumbnail carries the identity.** Each article's cover is a bold
   full-bleed type poster on its own background colour (salmon, navy, cream,
   white). Twelve articles are instantly distinguishable at a glance with zero
   badges, tags or metadata.
4. **The grid is 2 columns at 1440px**, with `5rem` (80px) gutters both ways.
   Not 4 columns, not `auto-fill minmax()`.
5. **The content block is deliberately off-centre**: `padding-left: 5%` on both
   `#intro` and `#articles-section` pushes everything right of the optical
   centre.

### 1.2 The article page

Two article archetypes, and we need both.

**Archetype A: the sectioned essay** (`precision-recall/index.html`, Svelte
build, `global.css`). This is the one closest to our viz pages.

| Element | Value |
|---|---|
| body background | `rgb(241, 243, 243)` (light grey, not white) |
| `.body-text` | width **600px**, **18px / 27px** (lh 1.5), **67 chars/line** |
| `.body-header` (h1/h3) | width 600px, **30px / 45px**, weight 500 |
| Article title h1 | **64px** |
| Intro subtitle | 22.4px |
| Resource list items | 17px / 25.5px |
| Page height | 11765px |

`global.css:76-101` sets the measure explicitly:

```css
.body-text  { max-width: 575px; margin: 0 auto; font-size: 21px; line-height: 1.5em; }
.body-header{ max-width: 575px; margin: 0 auto; font-size: 35px; line-height: 1.5em; }
.centered   { margin: auto;     max-width: 575px; }
```

Note the pattern: **one `max-width` token (575px) governs prose, headers and the
generic centred container alike.** Figures are simply not given that class, so
they break out wider by default. Breaking out is the *absence* of a rule, not a
special case.

**Archetype B: the scrolly** (`bias-variance`, `train-test-validation`,
`decision-tree`). `#scrolly` is a flex row; `article` is the scrolling text
column and `figure` is `position: sticky` beside it.

```css
#scrolly { position: relative; display: flex; }          /* + flex-direction: row-reverse in ttv */
#scrolly > * { flex: 1; }
article  { position: relative; max-width: 30rem; }        /* train-test-validation */
figure   { position: sticky; top: 100px; height: 100vh; width: 100%;
           transform: translateZ(0); z-index: 0; }
```
(`train-test-validation/main.fff30958.css`; `decision-tree/main.37eaf4da.css`
uses `max-width: 34%` on `article` and `top: 6rem; height: 90vh` on `figure`.)

Measured on bias-variance: text column **640px @ 16px/24.8**, full-width prose
blocks 864px, section headers (`.model-header`) 20.8px bold, page 14239px tall.

At `max-width: 850px` the scrolly **collapses to a single column** and the text
gains an opaque background plus a shadow so it can float over the sticky figure
(`train-test-validation/main.fff30958.css`, `@media (max-width:950px)` block):

```css
article p { background-color: rgba(252,244,232,.98); box-shadow: 0 3px 10px rgba(0,0,0,.3); }
```

### 1.3 Header / nav

`train-test-validation` and `decision-tree` have a sticky header
(`header { box-shadow: 0 3px 10px rgba(0,0,0,.3); position: sticky; top: 0; z-index: 999 }`)
whose entire contents are the wordmark plus **the article's own section list**:
Introduction · The Split · Train Set · Model · Validation Set · Test Set ·
Summary. Active item is `border-bottom: 2.5px solid #ff8f00` on `#toc li .selected`.

So the persistent nav is **a table of contents for the page you are on**, not a
map of the whole site. Cross-site navigation happens once, on the landing page.

Screenshot: `shots/slice-mlu/train-test-validation-index-html__1440-s1.png`.

### 1.4 Section spacing rhythm

MLU is extremely loose vertically. From `decision-tree/main.37eaf4da.css`:

```css
section          { min-height: 100vh; margin-bottom: 24vh; }
section h2       { padding-top: 20vh; }
#title-section,
section#intro-text { padding-bottom: 25rem; }
#all             { margin-bottom: 15vh; }
```

`train-test-validation` uses `section { height: 115vh; margin-bottom: 24vh }`.
The unit of vertical spacing is **the viewport**, not the paragraph. On the
non-scrolly precision-recall page the blocks are still separated by 150–250px of
plain empty space, and the divider between major sections is a **short centred
hairline about 65px wide** (`shots/slice-mlu/bias-variance-index-html__1440-s4.png`),
not a full-width rule.

---

## 2. Viz-text integration: MLU-Explain and Setosa

### 2.1 The three placements MLU actually uses

**(a) Pinned figure, scrolling text.** The default for a walkthrough.
`shots/slice-mlu/bias-variance-index-html__1440-s1.png` is the canonical frame:
figure occupies roughly the left 55% and stays put; a ~640px text column scrolls
past on the right and each paragraph drives a figure state. The figure has **no
container**: no border, no card, no background, no caption bar. It sits on the
page background.

**(b) Text card beside a bare figure.** `precision-recall`
(`shots/slice-mlu/precision-recall-index-html__1440-s2.png`). Here MLU *does*
use a card with a radius and a soft shadow, and it puts it **on the prose**,
with the chart bare beside it. This is the exact inverse of our convention
(bare prose, boxed chart) and it is worth stating as a rule: if one of the two
gets a container, it is the text.

**(c) Inline, full-column.** `shots/slice-mlu/bias-variance-index-html__1440-s4.png`.
Controls sit **above** the figure, the figure sits directly under the paragraph
that introduces it, everything shares one column.

In none of the three does a paragraph run wider than ~640px next to a figure.

### 2.2 Control styling

From `shots/slice-mlu/bias-variance-index-html__1440-s4.png`, the LOESS controls:

- The button is a plain rectangle, bold label, very light grey fill, minimal
  radius, no icon, no border fuss: `Randomize Train Data`.
- The slider's **label is the live readout**: `Smoothness: 0.42` in bold sits
  directly above the track and updates as you drag. There is no separate value
  chip and **no separate readout panel anywhere on the page**.
- The track is a flat grey bar; the thumb is a dark, near-square block.
- The control row is centred over the figure with ~40px of air below it before
  the chart starts.

`decision-tree` styles its in-SVG buttons as real rects
(`.entropy-button-rect { stroke:#fff; stroke-width:2px; fill:#555 }`,
`:hover { stroke:#232f3e }`), i.e. controls are drawn *into* the figure when
they belong to it.

Setosa's control vocabulary is even smaller. From
`explained-visually/client/styles/style.less:360-364`:

```less
.nob { cursor: move; fill: #fff; stroke: rgba(0, 0, 0, 0.7); }
```

and per-explanation (`ordinary-least-squares-regression/style.less:6-15`):

```less
.nob {
  transition: 0.25s all;
  circle { fill: rgba(0,0,0,0.04); stroke: rgba(0,0,0,0.04); }
  &:hover { fill: rgba(0,0,0,0.2); }
}
```

That is the whole control system for most Setosa pieces: **the data marks
themselves are the controls.** You drag the point, the line, the divider. There
is no control panel because there are no controls.

### 2.3 Chart styling

Setosa's global axis treatment (`style.less:139-150`, repeated at 238-247):

```less
.axis                  { shape-rendering: crispEdges; }
.axis text             { fill: rgba(0, 0, 0, 0.6); }
.axis path, .axis line { fill: none; stroke: rgba(0, 0, 0, 0.1); }
```

Axes are **10% black**, nearly invisible. Tick text is 60% black. The data is
the only thing at full contrast.

MLU's charts, measured off the screenshots:

- No plot frame, no full grid. `bias-variance` draws bottom + left axis only;
  `precision-recall` draws faint vertical gridlines and one heavy horizontal
  rule for the number line.
- Data marks are large: `attr("r", window.innerWidth <= 600 ? 9.5 : 12)`
  (`bias-variance/js.63b32ab2.js`), model lines at `stroke-width: 5`
  (`decision-tree/main.37eaf4da.css` `#ig-line-ig`), outline lines at
  `stroke-width: 10`.
- Legends are inline dot+label pairs at the top of the plot, not boxed.
- Annotations live **inside** the plot and are colour-matched to what they
  describe (`#ig-tooltip-entRight { stroke:#ff1493 }`,
  `#ig-tooltip-entLeft { stroke:#00caca }`).
- SVG text uses a **halo** so labels stay legible over any mark:

```css
.dt-text { stroke-linejoin: round; fill: #fff; paint-order: stroke fill; }
.entropy-values { stroke: #fb9794; stroke-width: 2px; }
```
(`decision-tree/main.37eaf4da.css`.) `paint-order: stroke fill` + a stroke in
the background colour is how every MLU in-chart label survives being drawn over
data. This is much better than our white rounded-rect label boxes.

### 2.4 Captions and annotation

MLU has **no figure captions**. There is no "Fig 5.3" label anywhere in any of
the four articles. The paragraph above the figure is the caption. What MLU has
instead is the **rough-notation highlighter**, applied to the sentence that the
figure is about:

```js
{ type: "highlight", color: e, strokeWidth: 1, iterations: 1, animate: false, multiline: true }
```
(`train-test-validation/roughAnnotations.0fae3041.js`, `mlu-explain/js/rough-notation.js`.)

The highlight colour is keyed to the thing in the figure:
`shots/slice-mlu/train-test-validation-index-html__1440-s1.png` shows
"Validation Set" highlighted blue next to blue cats and "Test Set" highlighted
orange next to orange cats.

Seeing Theory does the same trick with colour instead of highlight
(`css/chapter-style.css:61-84`):

```css
.blue-color  { color:#64bdff; font-weight: 600; }
.green-color { color:#46C8B2; font-weight: 600; }
.yellow-color{ color:#F8CD23; font-weight: 600; }
.orange-color{ color:#FF8B22; font-weight: 600; }
.purple-color{ color:#D90677; font-weight: 600; }
```

used inline in prose (`basic-probability/index.html:140`):

> "observe that the running average of squared differences (in
> `<span class="green-color">green</span>`) begins to resemble the true variance
> (in `<span class="blue-color">blue</span>`)"

**The prose names the colours in the figure.** That is the caption.

### 2.5 Breathing room

Measured off `shots/slice-mlu/bias-variance-index-html__1440-s4.png`: ~150px
from the last paragraph to the control row, ~40px from controls to the chart,
and ~200px of empty space above the section header. Seeing Theory
(`shots/ref-st/basic-probability-index-html__1440.png`) leaves roughly 350px
between the end of one section's interactive and the next section's `h2`.

---

## 3. Motion: Setosa (and MLU)

### 3.1 What Setosa actually does

Harvested from `explained-visually/client/**`:

| Technique | Values | Count in repo |
|---|---|---|
| CSS transition, linear | `transition: all linear 0.5s` | 10 |
| CSS transition, custom cubic | `transition: all cubic-bezier(0.250, 0.460, 0.450, 0.940) 0.5s` | 8 |
| CSS transition, short | `transition: 0.25s all` | 4 |
| Opacity-only | `transition: opacity 0.25s` | 4 |
| d3 duration | `.duration(500)` | 13 |
| d3 duration | `.duration(1000)` | 14 |
| d3 easing | `.ease('cubic-in')` / `.ease('cubic-out')` | 8 / 6 |
| d3 easing | `.ease('ease-out')` | 8 |

`cubic-bezier(0.250, 0.460, 0.450, 0.940)` is `easeOutQuad`. The whole system is
**two durations (250ms for hover/state, 500ms for value changes, 1000ms for
narrative steps) and one easing family (quad/cubic out)**. There are two
`.ease('bounce')` calls in the entire repo; bounce is the exception, not the
house style.

### 3.2 The specific things that make it feel polished

1. **Hover is a fill change on the mark, not a shadow on a box.**
   `.nob:hover { fill: rgba(0,0,0,0.2) }` over a rest state of
   `rgba(0,0,0,0.04)`: the handle is nearly invisible until you approach it,
   then it firms up. `transition: 0.25s all`.
   (`ordinary-least-squares-regression/style.less:6-15`)
2. **Drag targets say they are drag targets before you touch them**:
   `.nob { cursor: move }` (`style.less:360`), and MLU writes it in the chart
   in pink: `Drag The Line!`
   (`shots/slice-mlu/precision-recall-index-html__1440-s2.png`).
3. **Animation carries meaning, not decoration.** In
   `conditional-probability/script.js:156-190`, `add_ball()` computes a
   *per-ball* duration
   (`dur = Math.random() * 2000; dur = dur / (scope.dropFrequency/2) + 2000`)
   and splices intermediate waypoints into the ball's path at exactly the y
   positions of the events it passes through. The staggering is the physics of
   the model, so the animation is legible as sampling rather than as motion.
4. **Thumbnails are live and react to the pointer**
   (`style.less:295-311`): `ev4-thumb { transition: opacity 0.25s; opacity: 0.5; &:hover { opacity: 1 } }`.
5. **Tooltips are drawn, not native** (`style.less:329-357`): a positioned block
   with `border-radius: 4px`, `box-shadow: 2px 2px 5px -2px black`, and a `▼`
   pseudo-element tail at `bottom: -12px` with `z-index: -1`.

MLU's motion vocabulary, from the bundles:

| Value | Uses |
|---|---|
| `.duration(1e3)` | 12 |
| `.duration(1200)` | 12 |
| `.duration(600)` | 10 |
| `.duration(500)` | 8 |
| `.delay(500)` / `.delay(600)` / `.delay(200)` | 9 / 6 / 6 |
| `.ease(easeBackInOut)` | 6 |
| `.ease(easeBack).duration(1500)` | 4 |
| `.ease(easeExpInOut)`, `.ease(easeBounceInOut)` | 2 each |

MLU is slower than Setosa (600–1500ms) because its transitions are narrative
beats in a scrollytelling sequence rather than responses to a drag. **Both use
`easeBack`/`easeOut` family, never `linear`, for anything a human is watching.**

A detail worth stealing: MLU animates the *radius* of a data point to draw the
eye, then animates it back
(`.transition().delay(1300).attr("r", 12).transition().attr("r", 9.5)`)
rather than flashing a colour.

---

## 4. Typography: MLU-Explain

### 4.1 The stack

```css
@font-face { font-family: AmazonEmberDisplayHeavy; src: url("../fonts/AmazonEmberDisplay_He.otf"); }
@font-face { font-family: AmazonEmber;             src: url("../fonts/AmazonEmber_Rg.otf"); }
@font-face { font-family: AmazonEmberMono;         src: url("../fonts/AmazonEmberMono_Rg.otf"); }
@font-face { font-family: AmazonEmberDisplayLight; src: url("../fonts/AmazonEmberDisplay_Lt.otf"); }
* { font-family: AmazonEmberDisplayLight; color: #232f3e; }
```
(`css/styles.css:4-22`, `:162-165`.)

Four weights of one superfamily, plus a mono for numerals. **Three roles:**
Display Heavy for headings and all in-chart text, Regular for body prose, Light
as the page default. Amazon Ember is proprietary; we cannot use it, but the
*structure* (one family, a heavy display cut, a mono) is the point.

Ink colour is `#232f3e`, a desaturated navy, never `#000`. Article body text is
`#3b3b3b` (`decision-tree/main.37eaf4da.css`).

### 4.2 The scale (measured, 1440px)

| Role | precision-recall | bias-variance | landing |
|---|---|---|---|
| Article title | 64px | 64px | 40px |
| Section header | 30px / 45px, w500 | 20.8px / 31.2px, w700 | 24px |
| Subtitle / lede | 22.4px | 17.6px | 22.4px |
| Body | **18px / 27px** | 16px / 24.8px | 21px / 29px |
| Secondary (lists, resources) | 17px / 25.5px | 16px / 24px | n/a |
| Small (captions) | 14px | n/a | n/a |

Consolidated, the working scale is roughly
**14 · 17 · 18 · 21 · 24 · 30 · 40 · 64**, line-height **1.45–1.5** on
everything, weights **400 / 500 / 700** only.

### 4.3 Measure

| Page | Text width | Font | Chars/line |
|---|---|---|---|
| precision-recall `.body-text` | 600px | 18px | **67** |
| bias-variance article column | 640px | 16px | 80 |
| bias-variance full-width prose | 864px | 16px | 108 |
| landing `.article-description` | 444px | 21px | **42** |
| landing intro `p` | 527px | 21px | 50 |
| Seeing Theory chapter `p` | 490px | 18px | **54** |

**The band is 42–80 characters, and the target is 55–67.** The 108-char case is
MLU's own outlier (a full-bleed intro block), not the norm.

For contrast, measured on our site at the same viewport:

| Ours | Text width | Font | Chars/line |
|---|---|---|---|
| `week5-viz.html` `.fig-intro` | **1320px** | **14.4px** | **183** |
| `week5-viz.html` TOC `li` | 1265px | 13.7px | 185 |
| `index.html` `.course-description` | 700px | 15.5px | 90 |
| `week5.html` `.hub-instructor` | 920px | 14.4px | 128 |

Our figure intros run **2.7× the reference measure at 80% of the reference type
size.** That single fact explains most of "cluttered and cramped".

### 4.4 Backgrounds

None of the three references uses `#ffffff`.

| Site | Background |
|---|---|
| MLU landing | peach gradient wash over white (`styles.css:146-155`) |
| MLU precision-recall | `rgb(241, 243, 243)` |
| MLU train-test-validation | `rgba(252, 244, 232, .855)` (cream) |
| MLU decision-tree | `#bc6fb1` / `#fb9794` full-bleed section colours |
| Seeing Theory ch.1 | `rgb(214, 239, 250)` (per-chapter tint) |
| Seeing Theory landing | `#2A2738` |
| **Ours (every page)** | `#ffffff` |

Seeing Theory's per-chapter tint is the cheapest identity device available: the
hover colours on the landing (`home.css:132-154`) are the chapter colours, so
the six chapters are six colours and you always know where you are:

```css
#bp:hover { background-color: #D6EFFA; }  /* basic probability   */
#cp:hover { background-color: #E9F5ED; }  /* compound            */
#pd:hover { background-color: #FEF9D4; }  /* distributions       */
#fi:hover { background-color: #FFF2E8; }  /* frequentist         */
#bi:hover { background-color: #FFE9E7; }  /* bayesian            */
#ra:hover { background-color: #FFF1F9; }  /* regression          */
```

---

## 5. Anti-generic: five things these sites do that generic AI-built sites don't

These become the rules in DESIGN.md.

### AG-1. One idea gets one container. Never nest a box in a box.

MLU's article card has **no border, no radius, no shadow, no padding, no
background** (`css/styles.css:353-358`). Its landing page contains exactly one
bordered element type: the `0.5px` rule around a thumbnail image.

Our `week5-viz.html` Fig 5.1 nests four levels of container: `.fig-section`
(top rule) → the blue `#v51-form-desc` box → `.cvs-wrap` (1px border, radius 10)
→ `.panel-label` (grey strip, border-bottom) → then `.viz-ctrl-row` → then
`.viz-readout` (another 1px box, radius 8). Six bordered boxes to present one
chart. `shared.css` defines **17 separate "1px border + radius 6-9px +
off-white fill"** components (`.q-card`, `.eq-row`, `.accordion`, `.pq-item`,
`.video-item`, `.warning-box`, `.app-box`, `.how-to-use`, `.summary-notice`,
`.assump-card`, `.props-list li`, `.week-card`, `.flowchart`, `.fc-node`,
`.fc-result`, `.toc`, `.viz-readout`). That uniform grey-bordered rounded box,
repeated at every scale, *is* the generic look.

**Rule:** at most one border between the page background and any piece of
content. Prefer whitespace and a rule-off to a box.

### AG-2. Type is big and the measure is short.

References run body copy at **18–21px** in a **440–640px** column. Generic sites
run 14px across the full container because the container is what the framework
gave them. We run **14.4px across 1320px**.

**Rule:** body prose is ≥17px and its column never exceeds 680px, on every page,
at every viewport. Figures break out of that column; text never does.

### AG-3. Identity comes from a made thing, not from a component library.

MLU's whole visual signature is two hand-made devices: the **rough-notation
highlighter swipe** behind key sentences (`js/rough-notation.js`) and the
**offset marker block** behind buttons:

```css
button.content-button::before {
  content: ""; background-color: rgba(252, 106, 73, 0.55);
  position: absolute; z-index: -1;
  left: -0.25rem; top: 0.3rem; right: -1rem; height: 1.8rem;
}
```
(`css/styles.css:316-327`.) It is deliberately misregistered, offset left and
down and overhanging right, so it reads as a marker stroke rather than a fill.
Its illustrations are hand-drawn (`assets/mlu_robot.png`, the cat/dog glyphs in
train-test-validation). Seeing Theory's is a generative particle ring rendered
live on the landing (`shots/ref-st/index-html__1440.png`).

Generic sites signal with badges, pills, emoji icons and gradient buttons. Our
week hub uses 📖 📑 📊 ✏️ 🃏 as its iconography
(`week5.html:108,118,128,142,152`) and the landing carries 12 "PUBLISHED" pills
and 40 tag chips.

**Rule:** one owned, hand-made visual device, used consistently. Zero emoji as
UI. Zero decorative pills.

### AG-4. Colour is semantic and scarce, and the prose names it.

Seeing Theory ships exactly five prose colour classes
(`chapter-style.css:61-84`) and uses them to point at the figure. MLU's
bias-variance article runs on three colours (train blue, test salmon, model
orange) for the entire piece. Setosa dims its axes to `rgba(0,0,0,0.1)` so the
data is the only saturated thing on screen.

Ours declares **21 colour tokens** in `shared.css:3-57` and the comment at
`shared.css:23-28` admits the figures still hardcode "19 different reds and 8
greens, often several in one file (`#c0392b` ×109 AND `#e74c3c` ×72 both mean
'bad')".

**Rule:** ≤4 saturated colours per figure, each with one fixed meaning across
the site, and the paragraph introducing a figure names those colours in words.

### AG-5. Whitespace is measured in screens, not in rems.

`section { min-height: 100vh; margin-bottom: 24vh }` and
`section h2 { padding-top: 20vh }` (`decision-tree/main.37eaf4da.css`).
`.articles-container { row-gap: 5rem; column-gap: 5rem }`
(`css/styles.css:341-351`). Seeing Theory leaves ~350px between sections.

Ours: `.section { padding: 1.1rem 0 }` (`shared.css:155`),
`.week-grid { gap: 0.7rem }` (`shared.css:506`),
`.accordion-list { gap: 0.32rem }` (`shared.css:180`),
`.hub-list { gap: 0.45rem 0.9rem }` (`week5.html:18`). Our largest routine gap
is **11px**; theirs is **80px**.

**Rule:** the gap between two sections is at least 96px at desktop and at least
64px at mobile, and it is empty: no rule, no divider, no box edge doing the
separating.

---

## 6. What we should not take

- **Seeing Theory's mobile.** `shots/ref-st/regression-analysis-index-html__390.png`
  shows a ~140px text column inside a 390px viewport and interactives that do
  not reflow. It is a good chapter-structure reference and a bad responsive one.
- **Seeing Theory's visualisations themselves.** The repo's LICENSE restricts
  reuse. Techniques only, original work.
- **MLU's full-viewport scrollytelling as a default.** `decision-tree` is
  14239px tall for one concept. Our viz pages carry 10 figures each; making
  every one a 100vh scrolly would produce a 100,000px page. Archetype A (the
  sectioned essay at 575–640px measure) is the right model for us, with the
  pinned-figure treatment reserved for the two or three figures per week that
  genuinely tell a sequential story.
- **MLU's `min-height: 1280px` on body and `height: 115vh` on section.** These
  cause the large blank bands visible in
  `shots/slice-mlu/train-test-validation-index-html__1440-s1.png` (the whole
  lower two-thirds of that frame is empty). Generous, but past the point of
  usefulness.
