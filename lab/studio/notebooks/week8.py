# %% [markdown]
# ## Week 8 notebook: monopoly and the surplus it costs
# In this notebook you'll build the monopolist's problem in Python, find its best output by brute force, and check
# that the answer matches the two-step rule from lecture: set $MR = MC$ to get the quantity, then read the price off
# demand. Then you'll shade consumer surplus, profit and deadweight loss, drag the numbers around, and test a claim
# about how the surplus splits. The figures for this week are on the [Week 8 figures page](week8.html).
#
# Nothing needs installing: the Python runs right here in your browser. Click into a cell and press `Shift+Enter` to
# run it. Running a cell also re-runs every cell below it.

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

def money(x):
    """Format a number as dollars, e.g. money(6) gives '$6.00'."""
    return f"-${-x:,.2f}" if x < 0 else f"${x:,.2f}"

# %% [markdown]
# ## 1. The market as three functions
# We'll use the market from the film: demand $P = 10 - Q$ and a constant marginal cost of $2. With linear demand
# $P = a - bQ$, total revenue is $TR = (a - bQ)\,Q = aQ - bQ^2$, so marginal revenue is
#
# $$MR = a - 2bQ$$
#
# Same intercept as demand, twice the slope. In Python, `def` makes a function: a named recipe that takes an input
# (here a quantity `Q`) and gives back a number with `return`.

# %%
a = 10   # demand intercept: the most anyone will pay
b = 1    # demand slope: price falls by b for each extra unit
c = 2    # marginal cost: every unit costs the firm c to make

def demand(Q):
    """The price buyers will pay when Q units are for sale."""
    return a - b * Q

def mr(Q):
    """Marginal revenue: same intercept as demand, twice the slope."""
    return a - 2 * b * Q

def mc(Q):
    """Marginal cost is the same for every unit. (0 * Q makes it return an array when Q is an array.)"""
    return c + 0 * Q

for Q in [0, 2, 4, 6]:
    print(f"Q = {Q}:  price {money(demand(Q))},  MR {money(mr(Q))},  MC {money(mc(Q))}")

# %% [markdown]
# At $Q = 4$, MR equals MC. That's step one of the rule. Step two reads the price off demand at that quantity:
# $P^* = 10 - 4 = 6$. Notice that MR sits below the price at every positive $Q$: to sell one more unit, the firm has
# to cut the price on all the units it was already selling.
#
# ## 2. Find the best output by brute force
# Here's a way to solve the firm's problem with no calculus at all. Profit is revenue minus cost,
# $\pi(Q) = P(Q)\,Q - cQ$. Compute it at hundreds of quantities and pick the biggest. `np.linspace(0, 10, 801)` makes
# an array of 801 evenly spaced numbers from 0 to 10, and arithmetic on an array works on every entry at once.
# `np.argmax` returns the *position* of the largest entry, which we then use to look up the matching quantity.

# %%
Q = np.linspace(0, a / b, 801)          # 801 candidate outputs, from 0 to where demand hits zero
profit = demand(Q) * Q - c * Q           # profit at every one of them, in one line

best = np.argmax(profit)                 # the position of the biggest profit in the array
Q_best, pi_best = Q[best], profit[best]
Q_rule = (a - c) / (2 * b)               # the MR = MC answer: a - 2bQ = c

print(f"Brute force: best output Q = {Q_best:.3f}, profit {money(pi_best)}")
print(f"MR = MC:     Q* = (a - c) / 2b = {Q_rule:.3f}, price P* = {money(demand(Q_rule))}")
print(f"At the brute-force best, MR = {money(mr(Q_best))} and MC = {money(mc(Q_best))}")

fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(Q, profit, color=GOLD)
ax.axhline(0, color=GREY, lw=1)
ax.plot([Q_best, Q_best], [0, pi_best], ls="--", lw=1.2, color=INK)
ax.plot(Q_best, pi_best, "o", color=INK, ms=7)
ax.annotate(f"most profit: {money(pi_best)} at Q = {Q_best:g}", (Q_best, pi_best), xytext=(10, -12),
            textcoords="offset points", va="top")
ax.set_xlabel("quantity Q")
ax.set_ylabel("profit ($)")
ax.set_title("Profit peaks exactly where MR = MC")
ax.set_xlim(0, a / b)
fig.tight_layout()

# %% [markdown]
# ## 3. Who gets what
# Compare the monopoly with a competitive market, which sells until price falls to marginal cost: $Q_c = (a - c)/b$
# at $P = c$. Under competition, buyers get the whole surplus triangle, $\tfrac12 (a - c)\,Q_c$. Under monopoly it is
# split three ways:
#
# - consumer surplus, $CS = \tfrac12 (a - P^*)\,Q^*$, the triangle above the price;
# - profit, $\pi = (P^* - c)\,Q^*$, a rectangle *transferred* from buyers to the firm;
# - deadweight loss, $DWL = \tfrac12 (P^* - c)(Q_c - Q^*)$, surplus on units that are never made. Nobody gets it.
#
# The function below computes all of it. `np.maximum(0, x)` keeps a quantity from going negative when cost is above
# what anyone will pay. It returns a *dictionary*: a set of named values you read with `w["cs"]`.

# %%
def welfare(a, b, c):
    """Monopoly outcome and surplus split for demand P = a - bQ and constant marginal cost c."""
    Qm = np.maximum(0, (a - c) / (2 * b))     # step 1: MR = MC
    Pm = a - b * Qm                            # step 2: price off demand
    Qc = np.maximum(0, (a - c) / b)            # competition: P = MC
    return {"Qm": Qm, "Pm": Pm, "Qc": Qc,
            "cs": 0.5 * (a - Pm) * Qm,
            "profit": (Pm - c) * Qm,
            "dwl": 0.5 * (Pm - c) * (Qc - Qm),
            "ts": 0.5 * (a - c) * Qc}          # total surplus under competition

w = welfare(10, 1, 2)
print(f"Monopoly: Q* = {w['Qm']:g} at {money(w['Pm'])}.  Competition: Q = {w['Qc']:g} at {money(2)}.")
print(f"CS {money(w['cs'])} + profit {money(w['profit'])} + DWL {money(w['dwl'])} = {money(w['ts'])}, "
      f"the surplus competition creates")

# %% tags=["knobs"]
# knobs: Demand is P = {a} - {b} Q and each unit costs {c}.
a = 10    # demand intercept [6, 20, 0.5] $
b = 1     # demand slope [0.5, 3, 0.25]
c = 2     # marginal cost [0, 8, 0.5] $

# %%
w = welfare(a, b, c)
Qm, Pm, Qc = w["Qm"], w["Pm"], w["Qc"]
Qmax = a / b                                  # where demand hits the axis
top = max(a, c) * 1.1

fig, ax = plt.subplots(figsize=(7, 4.2))
if Qm > 0:
    x1 = np.linspace(0, Qm, 100)
    x2 = np.linspace(Qm, Qc, 100)
    ax.fill_between(x1, demand(x1), Pm, color=BLUE, alpha=0.2, lw=0)         # consumer surplus
    ax.fill_between(x1, Pm, c, color=GOLD, alpha=0.32, lw=0)                 # profit
    ax.fill_between(x2, demand(x2), c, color=RED, alpha=0.3, lw=0)           # deadweight loss

Qd = np.linspace(0, Qmax, 2)
ax.plot(Qd, demand(Qd), color=BLUE)
ax.plot([0, Qmax / 2], [a, 0], color=ORANGE)
ax.plot([0, Qmax * 1.06], [c, c], color=INK, lw=2.2)
ax.annotate("D", (Qmax * 0.2, demand(Qmax * 0.2)), xytext=(6, 6), textcoords="offset points", color=BLUE, fontweight="bold")
ax.text(Qmax * 0.5 - 0.03 * Qmax, 0.04 * top, "MR", color=ORANGE, fontweight="bold", ha="right")
ax.text(Qmax * 1.05, c + 0.025 * top, "MC", color=INK, fontweight="bold", ha="right")

if Qm > 0:
    ax.plot([Qm, Qm], [0, Pm], ls="--", lw=1.1, color=INK)
    ax.plot([0, Qm], [Pm, Pm], ls="--", lw=1.1, color=INK)
    ax.plot(Qm, Pm, "o", color=INK, ms=6)
    ax.annotate(f"P* = {money(Pm)}", (Qm, Pm), xytext=(9, 7), textcoords="offset points")
    big = 0.03 * a * Qmax                     # only label areas big enough to hold a word
    if w["cs"] > big:
        ax.text(Qm / 3, Pm + (a - Pm) / 3, "CS", color=BLUE, ha="center", va="center", fontsize=10)
    if w["profit"] > big:
        ax.text(Qm / 2, (Pm + c) / 2, "profit", color=GOLD, ha="center", va="center", fontsize=10)
    if w["dwl"] > big:
        ax.text(Qm + (Qc - Qm) / 3, c + (Pm - c) / 3, "DWL", color=RED, ha="center", va="center", fontsize=10)

ax.set_xlim(0, Qmax * 1.08)
ax.set_ylim(0, top)
ax.set_xlabel("quantity Q")
ax.set_ylabel("price P ($)")
ax.set_title("Monopoly: CS, profit and deadweight loss")
fig.tight_layout()

if Qm > 0:
    ts = w["ts"]
    print(f"Monopoly sells {Qm:.2f} at {money(Pm)}; competition would sell {Qc:.2f} at {money(c)}.")
    print(f"Of {money(ts)} of possible surplus: buyers keep {money(w['cs'])} ({w['cs'] / ts:.0%}), "
          f"the firm takes {money(w['profit'])} ({w['profit'] / ts:.0%}), {money(w['dwl'])} is lost ({w['dwl'] / ts:.0%}).")
else:
    print(f"Cost {money(c)} is at or above the most anyone will pay ({money(a)}): nothing is sold, no surplus at all.")

# %% [markdown]
# > **Try this:** drag $c$ and $b$ and watch the percentages in the printout. Do they ever change?
#
# ## 4. Testing a claim on 10,000 markets
# The percentages seem stuck at 25%, 50%, 25%. With linear demand and constant marginal cost, profit is always half
# of the surplus competition would create, and CS and DWL are a quarter each. One example isn't proof, so let's try
# ten thousand random markets at once. `rng.uniform(lo, hi, n)` draws `n` random numbers between `lo` and `hi`, and
# because `welfare` uses only array arithmetic, it handles all of them in one call. `np.allclose` asks whether every
# entry matches, up to rounding.

# %%
rng = np.random.default_rng(8)                    # a random number generator (8 is its seed, so results repeat)
n = 10_000
A = rng.uniform(6, 20, n)
B = rng.uniform(0.5, 3, n)
C = A * rng.uniform(0, 0.95, n)                   # keep cost below the demand intercept
W = welfare(A, B, C)                              # 10,000 markets in one call

print("profit is half of competitive surplus:", np.allclose(W["profit"] / W["ts"], 0.5))
print("CS is a quarter:                      ", np.allclose(W["cs"] / W["ts"], 0.25))
print("DWL is a quarter:                     ", np.allclose(W["dwl"] / W["ts"], 0.25))
print(f"largest DWL share among them: {np.max(W['dwl'] / W['ts']):.6f}")

# %% [markdown]
# Why? Monopoly output is exactly half of competitive output, $Q^* = Q_c/2$, so the three areas are a triangle, a
# rectangle and a triangle with the same width and height. The gap $a - c$ and the slope $b$ only change the size
# of the pie, never the shares. (With curved demand or rising MC the shares do change.)
#
# ## 5. Price discrimination: taking the deadweight loss back
# A firm that could charge every buyer their exact willingness to pay (perfect, or first-degree, price
# discrimination) never has to cut the price on earlier units. Each extra unit adds its own price to revenue, so
# demand itself becomes MR, and the firm sells until price equals MC: the competitive quantity. DWL drops to zero,
# and CS drops to zero too, because all of the surplus becomes profit.
#
# Block pricing (second degree) sits in between. With $n$ price tiers, each block sells at the willingness to pay of
# its last unit, and the best block ends are evenly spaced, at $Q_c/(n + 1)$, $2Q_c/(n + 1)$, and so on. The chart uses
# your knob values.

# %%
def blocks(a, b, c, n):
    """Profit, CS and DWL when the firm sells n blocks, block i ending at i * Qc / (n + 1)."""
    Qc = max(0, (a - c) / b)
    ends = np.arange(1, n + 1) * Qc / (n + 1)       # where each block stops
    widths = np.diff(ends, prepend=0)               # how many units are in each block
    prices = a - b * ends                           # each block sells at its last buyer's WTP
    profit = np.sum((prices - c) * widths)
    cs = np.sum(0.5 * b * widths ** 2)              # the little triangle above each block's price
    dwl = 0.5 * b * (Qc - ends[-1]) ** 2            # units after the last block go unsold
    return cs, profit, dwl

w = welfare(a, b, c)
cases = {"competition": (w["ts"], 0, 0), "one price": (w["cs"], w["profit"], w["dwl"])}
for n_tiers in [2, 4]:
    cases[f"{n_tiers} blocks"] = blocks(a, b, c, n_tiers)
cases["perfect PD"] = (0, w["ts"], 0)

names = list(cases)
cs_, pi_, dwl_ = (np.array([cases[k][i] for k in names]) for i in range(3))
fig, ax = plt.subplots(figsize=(7, 3.8))
ax.bar(names, cs_, color=BLUE, alpha=0.75, label="consumer surplus")
ax.bar(names, pi_, bottom=cs_, color=GOLD, alpha=0.85, label="profit")
ax.bar(names, dwl_, bottom=cs_ + pi_, color=RED, alpha=0.75, label="deadweight loss")
ax.set_ylabel("surplus ($)")
ax.set_ylim(0, w["ts"] * 1.3 if w["ts"] > 0 else 1)
ax.legend(ncol=3, loc="upper left", fontsize=10)
ax.set_title("Same pie, different slices")
fig.tight_layout()

for k in names:
    cs_k, pi_k, dwl_k = cases[k]
    print(f"{k:12s}  CS {money(cs_k):>9s}   profit {money(pi_k):>9s}   DWL {money(dwl_k):>8s}")

# %% [markdown]
# Every bar has the same total height: the surplus is never bigger than under competition. Price discrimination
# moves it from buyers to the firm, and the finer the pricing, the less is destroyed. At the film's numbers, $n$
# blocks leave a DWL of $32/(n + 1)^2$.
#
# ## 6. Third-degree price discrimination: two groups, two prices
# An airline can tell business travelers (market 1, demand $P = 100 - Q$) from leisure travelers (market 2,
# demand $P = 50 - Q/2$). Each seat costs $20. Selling in both markets, the airline sets $MR_1 = MR_2 = MC$: each
# market gets its own two-step rule. Below, brute force searches over prices for each market separately, then for
# the best single price, so we can see what separating the markets is worth.

# %%
a1, a2, mc_air = 100, 50, 20
P = np.linspace(0, 100, 2001)                       # candidate prices, 5 cents apart
q1 = np.maximum(0, a1 - P)                          # business seats sold at each price
q2 = np.maximum(0, 2 * (a2 - P))                    # leisure seats (P = 50 - Q/2 means Q = 2(50 - P))
pi1, pi2 = (P - mc_air) * q1, (P - mc_air) * q2

P1, P2 = P[np.argmax(pi1)], P[np.argmax(pi2)]       # best price in each market on its own
Pu = P[np.argmax(pi1 + pi2)]                        # best single price for both
Q1, Q2 = a1 - P1, 2 * (a2 - P2)
e1, e2 = -P1 / Q1, -2 * P2 / Q2                     # elasticity (dQ/dP)(P/Q): slopes are -1 and -2

print(f"Business: {money(P1)} for {Q1:g} seats, elasticity {e1:.2f}, markup (P - MC)/P = {(P1 - mc_air) / P1:.2f}")
print(f"Leisure:  {money(P2)} for {Q2:g} seats, elasticity {e2:.2f}, markup (P - MC)/P = {(P2 - mc_air) / P2:.2f}")
print(f"Profit with two prices: {money(pi1.max() + pi2.max())}")
print(f"Best single price {money(Pu)}: profit {money((pi1 + pi2).max())}")

fig, axes = plt.subplots(1, 2, figsize=(7, 3.6), sharey=True)
for ax, (name, top_p, slope, Pk, Qk) in zip(axes, [("business", a1, 1, P1, Q1), ("leisure", a2, 0.5, P2, Q2)]):
    qq = np.array([0, top_p / slope])
    ax.plot(qq, top_p - slope * qq, color=BLUE)
    ax.plot(qq / 2, top_p - 2 * slope * qq / 2, color=ORANGE)
    ax.axhline(mc_air, color=INK, lw=2)
    ax.plot([Qk, Qk], [0, Pk], ls="--", lw=1.1, color=INK)
    ax.plot(Qk, Pk, "o", color=INK, ms=6)
    ax.annotate(money(Pk), (Qk, Pk), xytext=(8, 6), textcoords="offset points")
    ax.set_title(name, fontsize=12)
    ax.set_xlabel("seats Q")
    ax.set_xlim(0, 105)
axes[0].set_ylabel("price P ($)")
axes[0].set_ylim(0, 110)
axes[1].text(84, mc_air + 4, "MC", fontweight="bold")
axes[0].text(48, 6, "MR", color=ORANGE, fontweight="bold")
axes[0].text(62, 44, "D", color=BLUE, fontweight="bold")
fig.tight_layout()

# %% [markdown]
# The business market pays more because, at the prices the airline charges, its demand is *less elastic*: the Lerner
# markup $(P - MC)/P$ equals $-1/\varepsilon$ in each market, so the smaller $|\varepsilon|$, the bigger the markup.
#
# ## Your turn
# Each exercise uses its own fixed numbers. Work it out on paper or in code (the functions above are yours to use),
# replace `None` with your number, and run the cell. Exercises 1 to 3 share one market: demand $P = 20 - 2Q$ and
# marginal cost $4.

# %%
# Exercise 1. What price does the monopolist charge? (Find Q* with MR = MC first.)
answer = None
correct = check("monopoly price", answer, 12, hint="MR = 20 - 4Q. Set it equal to 4 to get Q*, then plug Q* into demand.")

# %%
# Exercise 2. How big is the deadweight loss?
answer = None
correct = check("deadweight loss", answer, 16, hint="Competition sells where 20 - 2Q = 4. DWL = 1/2 (P* - MC)(Qc - Q*).")

# %%
# Exercise 3. If the firm could perfectly price discriminate, what would its profit be?
answer = None
correct = check("profit under perfect price discrimination", answer, 64,
      hint="It sells the competitive quantity and keeps the whole surplus triangle: 1/2 (20 - 4)(Qc).")

# %%
# Exercise 4. A theater sells to adults (P = 30 - Q) and students (P = 18 - Q). Each seat costs 6.
# It charges each group its own price. What is its total profit?
answer = None
correct = check("total profit with two prices", answer, 180,
      hint="Use MR = MC in each market: 30 - 2Q = 6 and 18 - 2Q = 6. Add the two profits (P - 6) Q.")

# %% [markdown]
# ## Explore
# > **Try this:** the 50/25/25 split depends on straight-line demand. In a new cell, make a curved demand such as
# > `P = 10 - Q ** 2 / 10` on a grid of quantities, find the monopoly output by brute force with `np.argmax`, and
# > compute CS, profit and DWL by adding up thin slices (for example `np.sum(...) * dQ`) instead of triangle formulas. Does profit still take half? Which shape gives
# > the monopolist the biggest share?
#
# ## What you learned
# - A monopolist picks output where $MR = MC$, then charges the highest price demand allows at that output.
# - With linear demand $P = a - bQ$, marginal revenue is $MR = a - 2bQ$, so monopoly output is half the competitive output.
# - Brute force with `np.linspace` and `np.argmax` finds the same optimum as the calculus.
# - Profit is a transfer from buyers; deadweight loss is surplus that nobody gets.
# - With linear demand and constant MC, profit is half of competitive surplus, and CS and DWL a quarter each.
# - Perfect price discrimination removes the DWL by handing all surplus to the firm; block pricing approaches it;
#   third-degree discrimination charges the less elastic group more.
