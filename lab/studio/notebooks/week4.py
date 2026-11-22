# %% [markdown]
# ## Week 4 in Python: elasticity and revenue
# In this notebook you'll write demand as a Python function, compute its elasticity at every price, and watch
# total revenue rise and fall as the price moves. Then you'll let the computer find the revenue-maximizing price
# by trying thousands of prices, and check it against the formula from lecture. The figures for this week are on
# the [Week 4 studio page](week4.html). Nothing needs installing: the code runs in your browser. Click into a
# cell and press `Shift+Enter` to run it.

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

def kind(e):
    """Name the elasticity: elastic, unit elastic or inelastic."""
    if not np.isfinite(e):
        return "not defined (nothing sells)"
    if abs(abs(e) - 1) < 1e-6:
        return "unit elastic"
    return "elastic" if abs(e) > 1 else "inelastic"

# %% [markdown]
# ## Demand as a function
# Our demand curve is $Q = a - bP$ with $a = 120$ and $b = 4$, the same line as the live equations on the studio
# page. In Python, `def` makes a *function*: a named recipe that takes inputs (here a price and the two
# parameters) and `return`s an output (the quantity demanded).
#
# One detail: above the choke price $a/b$ the formula would give a negative quantity, and nobody buys a negative
# amount. `np.maximum(0, ...)` keeps the larger of 0 and the formula, so quantity stops at zero.

# %%
def demand(P, a=120, b=4):
    """Quantity demanded at price P on the linear demand Q = a - bP (never below zero)."""
    return np.maximum(0, a - b * P)

print("Q at P = $10:", demand(10))
print("Q at P = $25:", demand(25))
print("Q at P = $35:", demand(35), " (above the $30 choke price, nothing sells)")

# %% [markdown]
# ## Elasticity at every point
# The point elasticity of demand compares percentage changes, and on a linear demand curve it works out to
#
# $$\varepsilon = \frac{\Delta Q}{\Delta P}\cdot\frac{P}{Q} = -b\,\frac{P}{Q}$$
#
# (the flashcards write it $e_d$). The slope $-b$ is the same everywhere on the line, but $P/Q$ is not, so
# elasticity changes as you slide along the curve. The function below computes it. `np.where(test, x, y)` picks
# `x` where the test is true and `y` where it's false; we use it to say "not defined" (`nan`, "not a number") at
# prices where nothing sells.
#
# Then `np.linspace(0, 29.9, 300)` makes an *array*: 300 evenly spaced prices from 0 to 29.90 dollars. Passing a whole
# array to the function computes all 300 elasticities at once.

# %%
def elasticity(P, a=120, b=4):
    """Point elasticity -b*P/Q on Q = a - bP; nan where nothing sells."""
    P = np.asarray(P, dtype=float)
    Q = demand(P, a, b)
    with np.errstate(divide="ignore", invalid="ignore"):   # silence the warning where Q = 0
        e = np.where(Q > 0, -b * P / np.where(Q > 0, Q, 1), np.nan)
    return e if e.ndim else float(e)

e10 = elasticity(10)
print(f"At P = $10: Q = {demand(10)}, elasticity = {e10:.2f}, {kind(e10)}")
print(f"At P = $15: Q = {demand(15)}, elasticity = {elasticity(15):.2f}, {kind(elasticity(15))}")
print(f"At P = $20: Q = {demand(20)}, elasticity = {elasticity(20):.2f}, {kind(elasticity(20))}")

prices = np.linspace(0, 29.9, 300)
eps = elasticity(prices)

fig, ax = plt.subplots(figsize=(7, 4.2))
ax.axhspan(-6, -1, color=ORANGE, alpha=0.08)
ax.axhspan(-1, 0, color=BLUE, alpha=0.08)
ax.plot(prices, eps, color=BLUE)
ax.axhline(-1, color=INK, lw=1, ls="--")
ax.axvline(15, color=GREY, lw=1, ls=":")
ax.text(1, -4.6, "elastic: |ε| > 1", color=ORANGE, fontsize=11)
ax.text(1, -0.6, "inelastic: |ε| < 1", color=BLUE, fontsize=11)
ax.text(15.4, -2.2, "unit elastic\nat P = $15", color=INK, fontsize=10)
ax.set_xlim(0, 30)
ax.set_ylim(-6, 0.3)
ax.set_xlabel("price P ($)")
ax.set_ylabel("elasticity ε")
ax.set_title("Elasticity along Q = 120 − 4P")

# %% [markdown]
# Elasticity is 0 at a price of zero, $-1$ at the midpoint $P = a/(2b) = 15$, and heads toward $-\infty$ near
# the choke price of 30 dollars. The top half of the line is elastic and the bottom half is inelastic.
#
# ## Drive it yourself
# Drag the numbers in the sentence below. Every cell after it re-runs, so the plots and the brute-force search
# further down follow your choices. Try a price above the choke price $a/b$ too.

# %% tags=["knobs"]
# knobs: Demand is Q = {a} - {b} P and the price is {P}.
a = 120   # demand intercept a [60, 160, 5]
b = 4     # slope b [2, 8, 0.5]
P = 10    # price [0.5, 39.5, 0.5] $

# %%
choke = a / b                 # the price where quantity hits zero
mid = a / (2 * b)             # the unit-elastic midpoint price
Q = demand(P, a, b)
e = elasticity(P, a, b)
TR = P * Q

if Q > 0:
    print(f"Q = {a:g} - {b:g}*{P:g} = {Q:g}.  Elasticity = -{b:g}*{P:g}/{Q:g} = {e:.2f}, {kind(e)}.")
    print(f"Total revenue TR = P*Q = ${TR:,.2f}.  The unit-elastic price is ${mid:g}.")
else:
    print(f"P = ${P:g} is at or above the choke price ${choke:g}: nothing sells, so TR = $0 and elasticity is not defined.")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7, 3.8), constrained_layout=True)
# left panel: demand, split into its elastic (top) and inelastic (bottom) halves, with the revenue rectangle
top_y = max(choke, P) * 1.12
ax1.plot([0, a / 2], [choke, mid], color=ORANGE, lw=3.5)
ax1.plot([a / 2, a], [mid, 0], color=BLUE, lw=3.5)
ax1.text(0.6, 0.78, "elastic half", color=ORANGE, transform=ax1.transAxes)   # transAxes: (0, 0) is the corner, (1, 1) the top right
ax1.text(0.6, 0.69, "inelastic half", color=BLUE, transform=ax1.transAxes)
if Q > 0:
    ax1.fill_between([0, Q], 0, P, color=GOLD, alpha=0.22, lw=0)
    ax1.plot([Q, Q], [0, P], color=GREY, lw=1, ls=":")
    ax1.scatter([Q], [P], color=PLUM, s=60, zorder=5)
    if P > 0.1 * top_y and Q > 0.1 * a:       # label the rectangle only when it is big enough to hold the label
        ax1.text(Q / 2, P / 2, "TR", color=GOLD, ha="center", va="center", fontweight="bold")
    ax1.text(0.6, 0.6, f"at the dot:\nε = {e:.2f}", color=PLUM, va="top", transform=ax1.transAxes)
else:
    ax1.axhline(P, color=PLUM, lw=1.5, ls="--")
    ax1.text(a * 0.04, P, f"P = ${P:g}: nothing sells", color=PLUM, va="bottom")
ax1.set_xlim(0, a * 1.08)
ax1.set_ylim(0, top_y)
ax1.set_xlabel("quantity Q")
ax1.set_ylabel("price P ($)")
ax1.set_title("Demand")

# right panel: total revenue as a function of the price
Pgrid = np.linspace(0, max(choke, P) * 1.05, 300)
TRgrid = Pgrid * demand(Pgrid, a, b)
ax2.plot(Pgrid, TRgrid, color=GOLD)
ax2.axvline(mid, color=GREY, lw=1, ls=":")
ax2.scatter([P], [TR], color=PLUM, s=60, zorder=5)
ax2.annotate(f"max at ${mid:g}", (mid, TRgrid.max()), xytext=(5, 6), textcoords="offset points", color=INK, fontsize=10)
ax2.set_ylim(0, TRgrid.max() * 1.2)
ax2.set_xlabel("price P ($)")
ax2.set_ylabel("TR ($)")
ax2.set_title("Total revenue")

# %% [markdown]
# ## Find the best price by brute force
# Calculus says revenue $TR = P(a - bP)$ peaks where $dTR/dP = a - 2bP = 0$, so $P = a/(2b)$: exactly the
# unit-elastic midpoint. Here's a way to check that without any calculus. Make a fine grid of 2,001 prices,
# compute revenue at each one, and pick the biggest. `np.argmax(TR_all)` returns the *position* (index) of the
# largest value in the array, and `P_all[i]` reads the price at that position.

# %%
P_all = np.linspace(0, a / b, 2001)          # every price from $0 to the choke price
TR_all = P_all * demand(P_all, a, b)
i = np.argmax(TR_all)                        # position of the biggest revenue
print(f"Brute force: best price ${P_all[i]:.2f}, revenue ${TR_all[i]:,.2f}")
print(f"Formula a/(2b): ${a / (2 * b):.2f}, revenue ${(a / (2 * b)) * (a / 2):,.2f}")
print(f"Elasticity at the best price: {elasticity(P_all[i], a, b):.3f}")

# %% [markdown]
# ## Price effect and quantity effect
# Now fix demand at $Q = 120 - 4P$ and raise the price from $P_0 = 10$ to $P_1 = 12$ dollars, the example on the studio page. Revenue
# changes for two reasons:
#
# - **Price effect** (green): the buyers who stay pay 2 dollars more each, a gain of $(P_1 - P_0)\,Q_1$.
# - **Quantity effect** (red): the units no longer sold took away $P_0\,(Q_0 - Q_1)$ of revenue.
#
# Demand is inelastic at $P = 10$ ($\varepsilon = -0.5$), so the price effect wins and revenue rises. The same price
# rise also shrinks consumer surplus, the triangle under demand and above the price,
# $CS = \tfrac{1}{2}\,Q\,(a/b - P)$. The price effect is money moving from the buyers who stay to the seller.

# %%
P0, P1 = 10, 12
Q0, Q1 = demand(P0), demand(P1)
price_effect = (P1 - P0) * Q1
quantity_effect = -P0 * (Q0 - Q1)
print(f"Q falls from {Q0} to {Q1}; TR goes from ${P0 * Q0} to ${P1 * Q1}.")
print(f"price effect +${price_effect}, quantity effect -${-quantity_effect}, net {price_effect + quantity_effect:+}")

def consumer_surplus(P, a=120, b=4):
    """Area of the triangle under Q = a - bP and above the price."""
    return 0.5 * demand(P, a, b) * max(0, a / b - P)

print(f"Consumer surplus: ${consumer_surplus(P0):g} at $10, ${consumer_surplus(P1):g} at $12")

fig, ax = plt.subplots(figsize=(7, 4.2))
ax.fill_between([0, Q1], 0, P0, color=GOLD, alpha=0.25, lw=0)
ax.fill_between([0, Q1], P0, P1, color=GREEN, alpha=0.4, lw=0)
ax.fill_between([Q1, Q0], 0, P0, color=RED, alpha=0.3, lw=0)
ax.fill_between([0, Q1], P1, 30 - Q1 * np.array([0, 1]) / 4, color=BLUE, alpha=0.1, lw=0)
ax.plot([0, 120], [30, 0], color=BLUE)
ax.scatter([Q0], [P0], color=GREY, s=50, zorder=5)
ax.scatter([Q1], [P1], color=PLUM, s=60, zorder=5)
ax.text(36, 5, f"kept: ${P0 * Q1}", color=GOLD, ha="center", fontweight="bold")
ax.annotate(f"price effect +${price_effect}", (30, 11), xytext=(30, 21), color=GREEN, ha="center", va="bottom",
            arrowprops=dict(arrowstyle="-", color=GREEN, lw=1))
ax.annotate(f"quantity effect -${-quantity_effect}", (76, 3), xytext=(86, 13), color=RED, va="bottom",
            arrowprops=dict(arrowstyle="-", color=RED, lw=1))
ax.text(5, 14, "CS", color=BLUE, fontsize=10)
ax.text(Q0 + 1.5, P0 + 0.6, "old", color=GREY, fontsize=10)
ax.text(Q1 + 2, P1 + 0.4, "new", color=PLUM, fontsize=10)
ax.text(112, 4.5, "D", color=BLUE)
ax.set_xlim(0, 125)
ax.set_ylim(0, 32)
ax.set_xlabel("quantity Q")
ax.set_ylabel("price P ($)")
ax.set_title(r"Raising the price from \$10 to \$12")   # \$ prints a dollar sign in a plot label

# %% [markdown]
# ## Point elasticity or midpoint elasticity?
# For a change between two prices, the point formula gives a different answer at each end. The midpoint (arc)
# formula uses the averages $\bar Q = \tfrac{Q_1 + Q_2}{2}$ and $\bar P = \tfrac{P_1 + P_2}{2}$ as the base:
#
# $$\varepsilon_{arc} = \frac{(Q_2 - Q_1)/\bar Q}{(P_2 - P_1)/\bar P}$$
#
# so it gives the same number whichever direction you go. A plain percentage change does not: it depends on
# where you start. The cell checks both directions.

# %%
def midpoint_elasticity(P1, P2, a=120, b=4):
    """Arc elasticity between two prices, using the averages as the base."""
    Q1, Q2 = demand(P1, a, b), demand(P2, a, b)
    return ((Q2 - Q1) / ((Q1 + Q2) / 2)) / ((P2 - P1) / ((P1 + P2) / 2))

def simple_pct_elasticity(P1, P2, a=120, b=4):
    """%change in Q over %change in P, using the starting point as the base."""
    Q1, Q2 = demand(P1, a, b), demand(P2, a, b)
    return ((Q2 - Q1) / Q1) / ((P2 - P1) / P1)

print(f"point elasticity at $10: {elasticity(10):.3f}    at $12: {elasticity(12):.3f}")
print(f"simple % change, $10 to $12: {simple_pct_elasticity(10, 12):.3f}    $12 to $10: {simple_pct_elasticity(12, 10):.3f}")
print(f"midpoint formula, $10 to $12: {midpoint_elasticity(10, 12):.3f}    $12 to $10: {midpoint_elasticity(12, 10):.3f}")

# %% [markdown]
# ## A demand curve with the same elasticity everywhere
# A straight line has a different elasticity at every point. The curve $Q = A\,P^{-e}$ is the opposite: its
# elasticity is $-e$ at every price. Instead of trusting the algebra, let's measure it. `np.gradient(Q, P)`
# estimates the slope $\Delta Q/\Delta P$ between neighboring points of the arrays, so multiplying by $P/Q$ gives
# a numerical elasticity at every price. Edit `e_ce` and re-run to try other values (try `e_ce = 1`, then look at
# the revenue it prints).

# %%
A, e_ce = 2000, 2                       # constant-elasticity demand Q = A * P**(-e_ce)
Pc = np.linspace(1, 29, 2000)
Q_ce = A * Pc ** (-e_ce)
Q_lin = demand(Pc)
eps_ce = np.gradient(Q_ce, Pc, edge_order=2) * Pc / Q_ce
eps_lin = np.gradient(Q_lin, Pc, edge_order=2) * Pc / Q_lin

print(f"constant-elasticity curve: elasticity runs from {eps_ce.min():.2f} to {eps_ce.max():.2f}")
print(f"linear curve: elasticity runs from {eps_lin.min():.2f} to {eps_lin.max():.2f}")
for p in (5, 10, 20):
    print(f"  revenue at ${p}: constant-elasticity ${p * A * p ** (-e_ce):,.0f}, linear ${p * demand(p):,.0f}")

fig, ax = plt.subplots(figsize=(7, 4.2))
ax.plot(Pc, eps_lin, color=BLUE, label="linear: Q = 120 − 4P")
ax.plot(Pc, eps_ce, color=ORANGE, label=f"constant: Q = {A}·P^(−{e_ce:g})")
ax.axhline(-1, color=INK, lw=1, ls="--")
ax.set_ylim(-6, 0.3)
ax.set_xlim(0, 30)
ax.set_xlabel("price P ($)")
ax.set_ylabel("elasticity ε")
ax.set_title("Two demand curves, two elasticity patterns")
ax.legend(loc="lower left")

# %% [markdown]
# With $e > 1$ every price cut raises revenue on the constant-elasticity curve, and with $e < 1$ every price rise
# does, so there's no revenue-maximizing price in the middle. The linear curve's peak at the midpoint comes from
# its elasticity passing through $-1$.
#
# ## Market demand is a horizontal sum
# The market demand curve adds up the quantities every buyer wants *at each price*. Take Consumer 1 with
# $Q_1 = 30 - P$ (choke price 30) and Consumer 2 with $Q_2 = 24 - 2P$ (choke price 12), as in Fig 4.8.
# Above $P = 12$ only Consumer 1 buys, so $Q_m = 30 - P$. Below it both buy, so $Q_m = 54 - 3P$. The market curve
# has a kink at $P = 12$.

# %%
Pm = np.linspace(0, 30, 400)
Q1m = 30 - Pm
Q2m = np.maximum(0, 24 - 2 * Pm)
Qm = Q1m + Q2m                          # add quantities at the same price: a horizontal sum

for p in (20, 12, 6):
    print(f"P = ${p}: Consumer 1 buys {max(0, 30 - p)}, Consumer 2 buys {max(0, 24 - 2 * p)}, market {max(0, 30 - p) + max(0, 24 - 2 * p)}")

fig, ax = plt.subplots(figsize=(7, 4.2))
ax.plot(Q1m, Pm, color=GREY, lw=2, ls="--")
ax.plot(Q2m[Pm <= 12], Pm[Pm <= 12], color=GREY, lw=2, ls=":")   # Pm <= 12 keeps only the prices where Consumer 2 buys
ax.plot(Qm, Pm, color=BLUE)
ax.scatter([18], [12], color=INK, s=30, zorder=5)
ax.text(19.5, 12.4, "kink at $12", color=INK, fontsize=10)
ax.text(31, 1, "Consumer 1", color=GREY, fontsize=10)
ax.text(6, 3.6, "Consumer 2", color=GREY, fontsize=10)
ax.text(44, 4.5, "market", color=BLUE)
ax.set_xlim(0, 58)
ax.set_ylim(0, 32)
ax.set_xlabel("quantity Q")
ax.set_ylabel("price P ($)")
ax.set_title("Market demand: add the quantities across")

# %% [markdown]
# ## Your turn
# Each cell has `answer = None`. Replace `None` with your number and run the cell. Green means right. These use
# fixed numbers, so the knobs above don't change them. You can use the functions defined above
# (`demand`, `elasticity`, `midpoint_elasticity`), or work it out by hand and type the number.

# %%
# 1. Demand is Q = 120 - 4P. What is the point elasticity at P = $20?
answer = None
ok = check("elasticity at P = $20", answer, -2, hint="Q = 120 - 4*20 = 40, then use -b*P/Q. It should be negative.")

# %%
# 2. Demand is Q = 200 - 5P. Which price maximizes total revenue?
answer = None
ok = check("revenue-maximizing price", answer, 20, hint="Revenue peaks at the unit-elastic midpoint, P = a/(2b).")

# %%
# 3. Demand is Q = 100 - 10P. Use the midpoint formula for a price rise from $2 to $4.
answer = None
ok = check("midpoint elasticity from $2 to $4", answer, -3 / 7, hint="Q goes from 80 to 60. Divide (Q2 - Q1)/Qbar by (P2 - P1)/Pbar.")

# %%
# 4. With Consumer 1 (Q = 30 - P) and Consumer 2 (Q = 24 - 2P), what is market quantity demanded at P = $10?
answer = None
ok = check("market quantity at P = $10", answer, 24, hint="Add the two quantities at P = $10. Both consumers are below their choke prices.")

# %% [markdown]
# > **Explore:** Build a market of 50 consumers with `np.random.uniform` choke prices between 10 and 40 dollars,
# > each with demand $Q_i = \max(0, c_i - P)$, and add them up horizontally. How many kinks does the market curve
# > have? Use `np.argmax` to find its revenue-maximizing price, and compute the elasticity there with
# > `np.gradient`. Is it still $-1$?
#
# ## What you learned
# - A Python function (`def`) can hold a demand curve, and the same function works on one price or a whole array.
# - On linear demand, $\varepsilon = -b\,P/Q$ falls from 0 at the bottom to $-\infty$ near the top; it is $-1$ at the midpoint.
# - Revenue rises with price where demand is inelastic and falls where it's elastic, because the price effect and the quantity effect pull in opposite directions.
# - Brute force with `np.argmax` finds the revenue-maximizing price, and it matches $a/(2b)$.
# - The midpoint formula gives the same answer in both directions; constant-elasticity demand has one elasticity everywhere.
# - Market demand adds quantities at each price, so it kinks where a new buyer enters.
