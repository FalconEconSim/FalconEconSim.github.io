# %% [markdown]
# ## Week 2 in Python: preferences, the budget line and the best bundle
# In this notebook you'll write a utility function in Python, draw indifference curves and a budget line,
# and then find the consumer's best bundle two ways: with the tangency condition from lecture, and by brute
# force, letting the computer try hundreds of affordable bundles and keep the best one. The two answers should
# agree. Nothing needs installing: the Python runs right here in your browser. Click into a cell and press
# `Shift+Enter` to run it. The figures for this week are on [the Week 2 figures page](week2.html).

# %% tags=["setup"]
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

# %% [markdown]
# ## 1. Utility is a function
# A utility function takes a bundle (some X, some Y) and returns one number. Higher means the consumer likes
# the bundle more. We'll start with the same consumer as the figures page:
#
# $$U(X, Y) = X^{1/2}\,Y^{1/2}$$
#
# In Python, `def` makes a function: you give it a name and inputs, and `return` hands back the answer.
# Two stars mean a power, so `X ** 0.5` is the square root of X.

# %% Utility as a Python function
def U(X, Y):
    return X ** 0.5 * Y ** 0.5

# print shows a result; an f-string, f"...", drops values into the text wherever you write {...}
print(f"U(10, 5) = {U(10, 5):.3f}")
print(f"U(4, 8)  = {U(4, 8):.3f}")
print(f"U(20, 0) = {U(20, 0):.3f}   (no Y at all, so no utility for this consumer)")
print(f"U(5, 10) = {U(5, 10):.3f}   (same as (10, 5): this consumer weighs X and Y equally)")

# %% [markdown]
# ## 2. Indifference curves and the budget line
# An indifference curve is every bundle that gives the same utility $u$. To draw one, solve
# $X^{1/2}Y^{1/2} = u$ for Y:
#
# $$Y = \frac{u^2}{X}$$
#
# The budget line is every bundle that costs exactly the income: $P_X X + P_Y Y = I$, so
# $Y = (I - P_X X)/P_Y$. Here income is $I = 100$, $P_X = 5$ and $P_Y = 10$.
#
# `np.linspace(a, b, n)` makes an array of `n` evenly spaced numbers from `a` to `b`. Math on an array
# works on every entry at once, so `u**2 / X` gives a whole curve in one line.

# %% Three indifference curves and the budget line
I, Px, Py = 100, 5, 10

X = np.linspace(0.5, 22, 300)           # 300 values of X from 0.5 to 22
fig, ax = plt.subplots()
for u, shade in [(4, 0.45), (np.sqrt(50), 1.0), (9, 0.45)]:    # a for loop runs the indented lines once per item
    ax.plot(X, u ** 2 / X, color=BLUE, alpha=shade, lw=2.6 if shade == 1 else 2)
    ax.text(21.5, u ** 2 / 21.5 + 0.35, f"U = {u:.2f}", color=BLUE, ha="right", fontsize=10)

Xb = np.linspace(0, I / Px, 2)          # the budget line only needs its two end points
ax.plot(Xb, (I - Px * Xb) / Py, color=INK, lw=3)
ax.text(2.5, 9.8, "budget: 5X + 10Y = 100", color=INK, fontsize=10)
ax.plot(10, 5, "o", color=BLUE, ms=8)
ax.annotate("(10, 5)", (10, 5), xytext=(8, 8), textcoords="offset points", fontsize=10)

ax.set_xlim(0, 22); ax.set_ylim(0, 12)
ax.set_xlabel("X"); ax.set_ylabel("Y")
ax.set_title("Only the middle curve touches the budget line")
fig.tight_layout()

# %% [markdown]
# The lower curve crosses the budget line, so the consumer can afford some of it and can do better. The upper
# curve never reaches the budget line, so it's out of reach. The middle one, with $u = \sqrt{50} \approx 7.07$,
# just touches it at $(10, 5)$: that's the best affordable bundle.
#
# ## 3. Brute force: let the computer search
# Here's an idea the figures can't show you. Instead of using calculus, walk along the budget line, compute
# utility at hundreds of bundles, and keep the biggest. `np.argmax(arr)` returns the **position** (the index)
# of the largest entry in `arr`, and `Xs[k]` reads entry number `k` out of `Xs`.

# %% Brute force along the budget line
Xs = np.linspace(0, I / Px, 2001)       # 2001 affordable values of X, from 0 to 20
Ys = (I - Px * Xs) / Py                 # spend the rest of the income on Y
Us = U(Xs, Ys)                          # utility of every one of those bundles at once

k = np.argmax(Us)                       # index of the best bundle
print(f"Tried {len(Xs)} bundles. Best: X = {Xs[k]:.2f}, Y = {Ys[k]:.2f}, utility {Us[k]:.3f}")

fig, ax = plt.subplots(figsize=(7, 3.6))
ax.plot(Xs, Us, color=BLUE)
ax.axvline(Xs[k], color=GREY, ls="--", lw=1.4)
ax.plot(Xs[k], Us[k], "o", color=BLUE, ms=8)
ax.annotate(f"best: X = {Xs[k]:.1f}", (Xs[k], Us[k]), xytext=(10, -22), textcoords="offset points", fontsize=10)
ax.set_xlabel("X bought (the rest of the 100 goes to Y)"); ax.set_ylabel("utility")
ax.set_ylim(0, 8.5)
ax.set_title("Utility along the budget line peaks at X = 10")
fig.tight_layout()

# %% [markdown]
# ## 4. MRS versus the price ratio
# The marginal rate of substitution is $MRS = MU_X / MU_Y$, the absolute slope of the indifference curve. For
# $U = X^{1/2}Y^{1/2}$ it works out to $MRS = Y/X$. The budget line's slope is $P_X/P_Y = 0.5$. At the best
# bundle the two are equal. Elsewhere on the budget line, the gap tells the consumer which way to move.

# %% MRS at three bundles on the budget line
for Xi in [4, 10, 16]:
    Yi = (I - Px * Xi) / Py
    mrs = Yi / Xi
    if abs(mrs - Px / Py) < 1e-9:
        verdict = "equal: this is the best bundle"
    elif mrs > Px / Py:
        verdict = "MRS is higher: X is worth more to her than it costs, buy more X"
    else:
        verdict = "MRS is lower: X is worth less to her than it costs, buy less X"
    print(f"(X, Y) = ({Xi:>2}, {Yi:.0f}):  MRS = {mrs:.3f}  vs  Px/Py = {Px / Py:.3f}  ->  {verdict}")

# %% [markdown]
# ## 5. Cobb-Douglas demand, live
# For the general Cobb-Douglas consumer $U = X^{\alpha}Y^{\beta}$, the tangency condition
# $MRS = \frac{\alpha}{\beta}\frac{Y}{X} = \frac{P_X}{P_Y}$ together with the budget line gives
#
# $$X^* = \frac{\alpha}{\alpha + \beta}\cdot\frac{I}{P_X}, \qquad Y^* = \frac{\beta}{\alpha + \beta}\cdot\frac{I}{P_Y}$$
#
# The cell below the knobs draws the budget line, the best indifference curve and the optimal bundle, and runs
# the brute-force search again to check the formula. The starting numbers match the live equation on the
# figures page: $\alpha = \beta = 0.5$, $I = 120$, $P_X = 4$, $P_Y = 6$.
#
# > **Try this:** drag the price of X. Watch $X^*$ move while $Y^*$ stays put. Then drag income and watch both
# > goods grow in proportion.

# %% tags=["knobs"]
# knobs: Income is {I}, X costs {Px}, Y costs {Py}, and the weights are α = {alpha} on X and β = {beta} on Y.
I = 120      # income [60, 180, 10] $
Px = 4       # price of X [3, 10, 0.5] $
Py = 6       # price of Y [3, 10, 0.5] $
alpha = 0.5  # α, the weight on X [0.1, 0.9, 0.1]
beta = 0.5   # β, the weight on Y [0.1, 0.9, 0.1]

# %% The best bundle, by formula and by brute force
def U_cd(X, Y):
    return X ** alpha * Y ** beta

# the formula from lecture
share = alpha / (alpha + beta)          # the share of income spent on X
X_star = share * I / Px
Y_star = (1 - share) * I / Py
u_star = U_cd(X_star, Y_star)

# brute force: try 2001 bundles on the budget line
Xs = np.linspace(0, I / Px, 2001)
Ys = (I - Px * Xs) / Py
k = np.argmax(U_cd(Xs, Ys))

print(f"Formula:     X* = {X_star:.2f}, Y* = {Y_star:.2f}")
print(f"Brute force: X  = {Xs[k]:.2f}, Y  = {Ys[k]:.2f}")
if abs(Xs[k] - X_star) < 0.05 * max(1, X_star):
    print("✓ The search and the formula agree.")
print(f"Spending: {100 * share:.0f}% of income on X (${share * I:.2f}), {100 * (1 - share):.0f}% on Y (${(1 - share) * I:.2f})")

fig, ax = plt.subplots()
top = 62
ax.plot([0, I / Px], [I / Py, 0], color=INK, lw=3, label="budget line")
x_lo = (u_star / top ** beta) ** (1 / alpha)            # where the curve leaves the top of the plot
Xc = np.linspace(max(x_lo, 0.05), top, 400)
ax.plot(Xc, (u_star / Xc ** alpha) ** (1 / beta), color=BLUE, label="best indifference curve")
ax.plot([X_star, X_star, 0], [0, Y_star, Y_star], color=GREY, ls="--", lw=1.2)
ax.plot(X_star, Y_star, "o", color=BLUE, ms=9, zorder=5)
ax.plot(Xs[k], Ys[k], "x", color=ORANGE, ms=10, mew=2.4, zorder=6, label="brute-force pick")
right = X_star > 0.6 * top
ax.annotate(f"X* = {X_star:.1f}, Y* = {Y_star:.1f}", (X_star, Y_star), xytext=(-12 if right else 12, 12),
            textcoords="offset points", ha="right" if right else "left", color=BLUE, fontsize=10)
ax.set_xlim(0, top); ax.set_ylim(0, top)
ax.set_xlabel("X"); ax.set_ylabel("Y")
ax.legend(loc="upper right", fontsize=10)
ax.set_title("The best affordable bundle")
fig.tight_layout()

# %% [markdown]
# ## 6. When there's no tangency: substitutes and complements
# The tangency condition needs smooth, bowed-in indifference curves. Two cases break it:
#
# - **Perfect substitutes**, $U = X + Y$: the indifference curves are straight lines with $MRS = 1$ everywhere.
#   If $P_X/P_Y < 1$ the consumer spends everything on X; if it's above 1, everything on Y. That's a corner solution.
# - **Perfect complements**, $U = \min(X, Y)$: L-shaped curves, always used one-for-one. The best bundle sits
#   on the kink, where $X = Y = I/(P_X + P_Y)$, and the MRS there is undefined.
#
# Brute force doesn't care about any of this. The same search works for both, using your knob prices and income.

# %% Same budget, two different consumers
Xs = np.linspace(0, I / Px, 2001)
Ys = (I - Px * Xs) / Py
U_sub = Xs + Ys                          # perfect substitutes
U_comp = np.minimum(Xs, Ys)              # perfect complements: np.minimum takes the smaller one, entry by entry
ks, kc = np.argmax(U_sub), np.argmax(U_comp)

if Px == Py:
    print(f"Substitutes: Px = Py, so every bundle on the budget line is equally good (utility {U_sub[ks]:.2f}).")
else:
    print(f"Substitutes: best bundle X = {Xs[ks]:.2f}, Y = {Ys[ks]:.2f}  (a corner)")
print(f"Complements: best bundle X = {Xs[kc]:.2f}, Y = {Ys[kc]:.2f}  (formula: {I / (Px + Py):.2f} of each)")

fig, (a1, a2) = plt.subplots(1, 2, figsize=(7, 3.6), sharey=True)
top = 62
for a in (a1, a2):
    a.plot([0, I / Px], [I / Py, 0], color=INK, lw=2.6)
    a.set_xlim(0, top); a.set_ylim(0, top); a.set_xlabel("X")
a1.set_ylabel("Y")

us = U_sub[ks]                           # the straight indifference curve X + Y = us
a1.plot([0, us], [us, 0], color=BLUE, lw=2.2)
sub_title = "Substitutes: U = X + Y\nevery bundle on the line is best"   # \n starts a new line
if Px != Py:                             # with equal prices the whole budget line is best, so no single dot
    a1.plot(Xs[ks], Ys[ks], "o", color=BLUE, ms=8, zorder=5, clip_on=False)
    sub_title = f"Substitutes: U = X + Y\ncorner at {'X' if Ys[ks] < 1e-9 else 'Y'} = {max(Xs[ks], Ys[ks]):.0f}"
a1.set_title(sub_title, fontsize=11)

uc = U_comp[kc]                          # the L-shaped curve with its kink at (uc, uc)
a2.plot([uc, uc, top], [top, uc, uc], color=BLUE, lw=2.2)
a2.plot([0, top], [0, top], color=GREY, ls=":", lw=1.2)
a2.plot(Xs[kc], Ys[kc], "o", color=BLUE, ms=8, zorder=5)
a2.set_title(f"Complements: U = min(X, Y)\nkink at X = Y = {Xs[kc]:.1f}", fontsize=11)
fig.tight_layout()

# %% [markdown]
# ## Your turn
# Each exercise uses its own fixed numbers, so the knobs above don't affect it. Replace `None` with your answer
# (a number, or a line of Python that computes it) and run the cell.
#
# 1. A consumer has $U = X^{0.3}Y^{0.7}$, income $I = 200$, $P_X = 2$ and $P_Y = 7$. How many units of X does she buy?
# 2. With $U = X^{1/2}Y^{1/2}$, $I = 100$, $P_X = 5$, $P_Y = 10$, the bundle $(4, 8)$ is on the budget line. What is the MRS there?
# 3. A consumer sees X and Y as perfect substitutes with $U = 2X + Y$. Income is 60, $P_X = 3$ and $P_Y = 1$. How many units of Y does he buy?
# 4. Now a utility function with no formula from lecture: $U = \sqrt{X} + \sqrt{Y}$, with $I = 100$, $P_X = 5$, $P_Y = 10$. Use brute force to find the best X.

# %% Exercise 1: Cobb-Douglas demand
answer = None     # X* for U = X^0.3 Y^0.7, I = 200, Px = 2, Py = 7
ok = check("X*", answer, 30, hint="X* = alpha/(alpha + beta) * I/Px, and here alpha + beta = 1.")

# %% Exercise 2: MRS at a bundle
answer = None     # MRS of U = X^(1/2) Y^(1/2) at (X, Y) = (4, 8)
ok = check("MRS at (4, 8)", answer, 2, hint="For this utility MRS = MU_X / MU_Y = Y / X.")

# %% Exercise 3: a corner solution
answer = None     # Y* for U = 2X + Y, I = 60, Px = 3, Py = 1
ok = check("Y*", answer, 60, hint="MRS = 2 but Px/Py = 3, so X costs more than it's worth to him. Spend everything on one good.")

# %% Exercise 4: brute force where there's no formula
Xs = np.linspace(0, 100 / 5, 2001)
Ys = (100 - 5 * Xs) / 10
Us = np.sqrt(Xs) + np.sqrt(Ys)

answer = None     # the best X; try Xs[np.argmax(Us)]
ok = check("best X", answer, 40 / 3, hint="np.argmax(Us) gives the position of the biggest utility; Xs[...] at that position is the X you want.")

# %% [markdown]
# > **# > **Explore:** go back to Exercise 4's cell and replace the `Us = ...` line with a utility of your own,
# > for example `Us = np.sqrt(Xs) + Ys`, then add `print(Xs[np.argmax(Us)])`. Now raise the income from 100
# > to 200 in both lines. Does the best X grow with income the way it does for Cobb-Douglas, or does it stay put?
# > Work out the MRS by hand and see if you can explain what the search found.
 What you learned
# - A utility function is just a Python function: bundle in, number out.
# - An indifference curve comes from solving $U(X, Y) = u$ for Y; the budget line from $P_X X + P_Y Y = I$.
# - At an interior best bundle, $MRS = P_X/P_Y$. If MRS is higher, buy more X; if it's lower, buy less.
# - Cobb-Douglas demand is $X^* = \frac{\alpha}{\alpha+\beta}\cdot\frac{I}{P_X}$, so X's price moves $X^*$ but not $Y^*$.
# - `np.argmax` on a grid finds the best bundle for any utility, including corners and kinks where tangency fails.
