# Writing a studio notebook

The EC224 studio (`lab/studio/`, a dev page, not linked from the course site) gives three weeks a Python notebook
that runs in the browser. Students are economics undergraduates in Intermediate Microeconomics; many have never
written Python. The professor once wanted every week to have a notebook students could edit and play with.

## The file

One plain `.py` file per week, `lab/studio/notebooks/weekN.py`, in Jupyter's percent format:

```
# %% [markdown]
# ## A heading
# A paragraph with math: $\varepsilon = -b\,P/Q$. Display math goes on its own lines:
#
# $$Q^* = \frac{a - c}{2b}$$
#
# > **Try this:** a blockquote becomes a plum "try this" callout.

# %% tags=["setup"]
import numpy as np
...

# %% tags=["knobs"]
# knobs: Demand is P = {a} - {b} Q and each unit costs {c}.
a = 10  # demand intercept [6, 20, 0.5] $
b = 1   # demand slope [0.5, 3, 0.25]
c = 2   # marginal cost [0, 8, 0.5] $

# %%
Q = np.linspace(0, a / b, 200)   # a code cell students can edit
```

- Markdown cells: every line starts with `# `. Blank `#` lines separate paragraphs. Supported: `##`/`###`
  headings, paragraphs, `- ` lists, `1. ` lists, `**bold**`, `*italic*`, `` `code` ``, `[links](url)`,
  `$inline$` and `$$display$$` math (KaTeX), and `> ` blockquotes (shown as a highlighted "try this" box).
- `tags=["setup"]`: exactly one, first code cell. Imports, plot style and the `check` helper (copy the block
  below). It is folded away on the page.
- `tags=["knobs"]`: numbers students drag. Each line is `name = value  # label [min, max, step]` with an
  optional `$` or `%` after the bracket. The optional first line `# knobs: sentence with {name}` is the sentence
  shown, with the numbers draggable inside it. Every cell below re-runs on each drag step, so keep the cells
  after a knobs cell fast (well under 100 ms each: vectorized numpy, no big loops) and make sure NOTHING breaks
  anywhere in every knob's range (guard divisions by zero, negative quantities, empty selections). You may have
  more than one knobs cell; each re-runs only what is below it.
- Plain `# %%` cells: code students can edit. Running a cell re-runs every cell below it.
- Output: `print` text, matplotlib figures (each figure a cell creates is shown, then closed), and the value
  of a bare last expression. Lines printed starting with "✓" show green, lines starting "Not yet" show red.

## Environment

The browser runs Pyodide 0.26.4: Python 3.12, numpy 1.26, matplotlib 3.5.2, plus the standard library. No
scipy, pandas or sympy. Locally you have numpy 2 and matplotlib 3.9, so avoid anything newer than matplotlib 3.5
(no `layout=` in `plt.subplots`, no `ax.bar_label` styling extras, no `np.trapezoid`; use `constrained_layout=True`
or `fig.tight_layout()`). Keep figures to `figsize=(7, 4.2)` or smaller, one or two per cell.

Test: `python lab/studio/tools/runnb.py lab/studio/notebooks/weekN.py` (from `C:\MicroSite\FalconEconSim.github.io`)
must report 0 problems. Also run it with knob extremes, e.g. `--knob a=6 --knob c=8`, and every other corner of the
ranges. `--show` saves the figures to `lab/studio/tools/_figs/` so you can open them and look (do it; check that the
labels don't collide and the plots read well).

## Setup block (use this, add week-specific helpers below it)

```python
import numpy as np
import matplotlib.pyplot as plt

# the course's colors: blue demand / the main curve, orange the marginal curve, green gains, red losses,
# gold transfers and profit, grey ghosts; plum is always "you" (a student's own answer on a plot)
BLUE, ORANGE, GREEN, RED, GOLD, GREY, INK, PLUM = "#1f6fb2", "#c85a3c", "#2f7d55", "#b03a2e", "#a07800", "#9aa3b0", "#14181b", "#7a1f5c"
plt.rcParams.update({
    "figure.figsize": (7, 4.2), "figure.dpi": 100, "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": INK, "axes.linewidth": 1.4, "axes.labelsize": 12, "axes.titlesize": 13,
    "axes.titleweight": "bold", "axes.titlelocation": "left", "xtick.color": "#4a5257", "ytick.color": "#4a5257",
    "lines.linewidth": 2.6, "axes.prop_cycle": plt.cycler(color=[BLUE, ORANGE, GREEN, RED, GOLD]),
    "legend.frameon": False, "font.size": 11,
})

def check(label, value, expected, tol=0.01, hint=""):
    """Compare a student's answer with the expected number (1% tolerance by default)."""
    if value is None or value is ...:
        print(f"Not yet: {label}. Replace the None with your answer, then run the cell.")
        return False
    try:
        ok = abs(float(value) - float(expected)) <= tol * max(1, abs(float(expected)))
    except (TypeError, ValueError):
        print(f"Not yet: {label} should be a number, got {value!r}.")
        return False
    if ok:
        print(f"✓ {label}: {float(value):g} is right.")
        return True
    print(f"Not yet: {label} = {float(value):g} is not it." + (f" Hint: {hint}" if hint else ""))
    return False
```

## What a good notebook here looks like

- About 14 to 22 cells; a student should finish the core in 20 to 30 minutes.
- Opens with one short paragraph: what you'll do, and a link back to the week's figures page (`week2.html` etc.,
  same folder). Say that nothing needs installing and that `Shift+Enter` runs a cell.
- Builds the week's main model step by step in code: functions for the economics, numpy arrays for curves,
  a plot, then one knobs cell that drives the model live. Explain every Python idea the first time it appears,
  in a short comment or sentence (what `def` does, what `np.linspace` makes, what `np.argmax` returns). Don't
  assume Python; do assume they know the economics from lecture.
- A computational idea the figures can't show: e.g. find the optimum by brute force on a grid (`np.argmax`) and
  confirm it matches the calculus answer; or simulate many consumers; or check a claim numerically.
- 3 or 4 "Your turn" exercises with fixed numbers (not tied to the knobs), each with `answer = None` and a
  `check(...)` call, plus a hint. With `None` in place the cell must still run without an error.
- One open "Explore" prompt at the end (a blockquote), and a short "What you learned" list.
- Use the course's own notation, numbers and terms: read `C:\MicroSite\FalconEconSim.github.io\weekN-viz.html`
  and `weekN-flashcards.html` for the week, and `lab/studio/live/weekN.js` for the live equations on the studio
  page (reuse those starting numbers so the page and the notebook agree). Get the economics exactly right.
- Writing: plain, direct teaching voice; contractions are fine; no em dashes or en dashes anywhere (use commas,
  colons, parentheses); no hype words ("crucial", "delve", "powerful", "seamless", "unlock"), no "not just X but Y",
  no "Let's dive in". Short sentences mixed with longer ones. American spelling.
