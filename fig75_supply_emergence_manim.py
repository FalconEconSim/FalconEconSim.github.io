"""
Fig 7.5 — Supply Curve Emergence
EC224: Intermediate Microeconomics, Bentley University

Run with Manim Community Edition:
    manim -pql fig75_supply_emergence_manim.py SupplyEmergence   (low quality preview)
    manim -pqh fig75_supply_emergence_manim.py SupplyEmergence   (720p, faster)
    manim -pqk fig75_supply_emergence_manim.py SupplyEmergence   (4K production)

Firm cost functions (Week 7):
    TVC(q) = q³/3 − 2q² + 7q
    TC(q)  = TVC(q) + 5          (TFC = $5)
    SMC(q) = q² − 4q + 7         (min SMC = $3 at q = 2)
    SAVC(q)= q²/3 − 2q + 7      (min SAVC = $4 at q = 3)

Shutdown rule: supply q = 0 when P < min SAVC = $4.
Supply curve: q = 2 + √(P − 3)  for P ≥ 4  (from SMC = P, upper root).
"""

from manim import *
import numpy as np

# ── Cost function definitions ─────────────────────────────────────────────
def smc(q):
    return q * q - 4 * q + 7

def savc(q):
    if q <= 0.01:
        return 7.0
    return q * q / 3.0 - 2 * q + 7

# Supply: q*(P) = 2 + sqrt(P-3) for P>=4, else 0
def q_supply(P):
    if P < 4.0:
        return 0.0
    return 2.0 + np.sqrt(P - 3.0)

# ── Colour palette (match site palette) ──────────────────────────────────
SMC_COLOR   = "#c0392b"   # red — SMC
SAVC_COLOR  = "#e67e22"   # orange — SAVC
PRICE_COLOR = "#1a56db"   # blue — price line
SUP_COLOR   = "#27ae60"   # green — supply curve
SHUT_COLOR  = "#8e44ad"   # purple — shutdown point highlight
GRAY_TEXT   = "#555555"

Q_MAX  = 8.0
P_MAX  = 14.0


class SupplyEmergence(Scene):
    def construct(self):
        # ═══════════════════════════════════════════════════════════════════
        # Title
        # ═══════════════════════════════════════════════════════════════════
        title = Title(
            "Supply Curve Emergence: Where Does Supply Come From?",
            include_underline=True,
        )
        subtitle = Text(
            "EC224 · Perfect Competition · Fig 7.5",
            font_size=22,
            color=GRAY,
        ).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), FadeIn(subtitle))
        self.wait(1.2)
        self.play(FadeOut(subtitle))

        # ═══════════════════════════════════════════════════════════════════
        # Two-panel axes layout
        # ═══════════════════════════════════════════════════════════════════
        # Left panel: cost curves  (q on x, $ on y)
        # Right panel: supply curve  (q on x, P on y — same $ scale)

        left_axes = Axes(
            x_range=[0, Q_MAX, 1],
            y_range=[0, P_MAX, 2],
            x_length=5.2,
            y_length=4.2,
            axis_config={"include_numbers": True, "font_size": 18},
            tips=False,
        ).shift(LEFT * 3.3 + DOWN * 0.3)

        right_axes = Axes(
            x_range=[0, Q_MAX, 1],
            y_range=[0, P_MAX, 2],
            x_length=5.2,
            y_length=4.2,
            axis_config={"include_numbers": True, "font_size": 18},
            tips=False,
        ).shift(RIGHT * 3.3 + DOWN * 0.3)

        lx_lbl = left_axes.get_x_axis_label(Text("Output q", font_size=20), direction=RIGHT)
        ly_lbl = left_axes.get_y_axis_label(Text("$ / unit", font_size=20), direction=UP)
        rx_lbl = right_axes.get_x_axis_label(Text("Output Q", font_size=20), direction=RIGHT)
        ry_lbl = right_axes.get_y_axis_label(Text("Price P", font_size=20), direction=UP)

        left_title  = Text("Cost Curves", font_size=22, weight=BOLD).next_to(left_axes,  UP, buff=0.25)
        right_title = Text("Supply Curve", font_size=22, weight=BOLD).next_to(right_axes, UP, buff=0.25)

        self.play(
            Create(left_axes), Create(right_axes),
            Write(lx_lbl), Write(ly_lbl),
            Write(rx_lbl), Write(ry_lbl),
            Write(left_title), Write(right_title),
        )
        self.wait(0.6)

        # ── Narration helper ─────────────────────────────────────────────
        narr = Text("", font_size=21, color=LIGHT_GRAY).to_edge(DOWN, buff=0.15)
        self.add(narr)

        def say(txt, wait=2.2):
            new_narr = Text(txt, font_size=19, color=LIGHT_GRAY).to_edge(DOWN, buff=0.15)
            self.play(Transform(narr, new_narr), run_time=0.35)
            self.wait(wait)

        # ═══════════════════════════════════════════════════════════════════
        # Draw SMC and SAVC on left panel
        # ═══════════════════════════════════════════════════════════════════
        say("Every firm has a Short-run Marginal Cost (SMC) curve.\n"
            "This tells us the cost of producing one more unit.", wait=2.5)

        q_vals = np.linspace(0.05, Q_MAX, 400)

        smc_pts  = [left_axes.c2p(q, min(smc(q),  P_MAX)) for q in q_vals if smc(q)  <= P_MAX * 1.05]
        savc_pts = [left_axes.c2p(q, min(savc(q), P_MAX)) for q in q_vals if savc(q) <= P_MAX * 1.05]

        smc_curve = VMobject(color=ManimColor(SMC_COLOR), stroke_width=2.8)
        smc_curve.set_points_as_corners(smc_pts)
        smc_curve.make_smooth()

        savc_curve = VMobject(color=ManimColor(SAVC_COLOR), stroke_width=2.8)
        savc_curve.set_points_as_corners(savc_pts)
        savc_curve.make_smooth()

        smc_lbl = Text("SMC", font_size=20, color=ManimColor(SMC_COLOR), weight=BOLD)
        smc_lbl.move_to(left_axes.c2p(6.8, smc(6.8) + 0.8))
        savc_lbl = Text("SAVC", font_size=20, color=ManimColor(SAVC_COLOR), weight=BOLD)
        savc_lbl.move_to(left_axes.c2p(6.8, savc(6.8) + 0.8))

        self.play(Create(smc_curve), Write(smc_lbl))
        self.wait(0.5)
        self.play(Create(savc_curve), Write(savc_lbl))
        self.wait(0.5)

        say("The SAVC curve shows average variable cost.\n"
            "Its minimum ($4 at q = 3) is the shutdown threshold.", wait=3.0)

        # Mark min SAVC (shutdown point)
        shut_dot = Dot(left_axes.c2p(3, 4), color=ManimColor(SHUT_COLOR), radius=0.12)
        shut_dot.set_stroke(WHITE, width=1.5)
        shut_lbl = Text("Shutdown\npoint: P=$4, q=3",
                        font_size=15, color=ManimColor(SHUT_COLOR))
        shut_lbl.next_to(shut_dot, UR, buff=0.15)

        self.play(FadeIn(shut_dot, scale=0.5), Write(shut_lbl))
        self.wait(1.0)

        # ═══════════════════════════════════════════════════════════════════
        # Animate price line on left panel — below shutdown price first
        # ═══════════════════════════════════════════════════════════════════
        say("Suppose the market price is $2 — below minimum SAVC.\n"
            "The firm cannot even cover variable costs, so it shuts down.", wait=3.5)

        P_start = 2.0
        price_line = DashedLine(
            left_axes.c2p(0, P_start),
            left_axes.c2p(Q_MAX, P_start),
            color=ManimColor(PRICE_COLOR),
            stroke_width=2.0,
            dash_length=0.18,
        )
        price_label = Text(f"P = ${P_start:.0f}", font_size=19,
                           color=ManimColor(PRICE_COLOR), weight=BOLD)
        price_label.next_to(price_line, RIGHT, buff=0.1)

        # Zero supply indicator on right panel
        zero_dot = Dot(right_axes.c2p(0, P_start),
                       color=ManimColor(PRICE_COLOR), radius=0.1)
        zero_lbl = Text("q* = 0", font_size=17, color=ManimColor(PRICE_COLOR))
        zero_lbl.next_to(zero_dot, RIGHT, buff=0.12)

        self.play(Create(price_line), Write(price_label))
        self.play(FadeIn(zero_dot), Write(zero_lbl))
        self.wait(1.5)

        # ── Animate price rising to shutdown point ────────────────────────
        say("Watch the price rise. Below $4, supply stays at zero.\n"
            "The firm's optimal quantity = 0; it won't produce.", wait=3.2)

        # Trace zero supply as a thick dot trail on right panel (q=0 for all P<4)
        zero_trail_pts = [right_axes.c2p(0, p) for p in np.linspace(2, 4, 30)]
        zero_trail = VMobject(color=ManimColor(PRICE_COLOR), stroke_width=4)
        zero_trail.set_points_as_corners(zero_trail_pts)

        # Animate price sweeping from 2 to 4
        def update_price_line(mob, alpha):
            P_cur = 2.0 + alpha * 2.0   # 2 → 4
            mob.become(
                DashedLine(
                    left_axes.c2p(0, P_cur),
                    left_axes.c2p(Q_MAX, P_cur),
                    color=ManimColor(PRICE_COLOR),
                    stroke_width=2.0,
                    dash_length=0.18,
                )
            )

        def update_price_label(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(
                Text(f"P = ${P_cur:.1f}", font_size=19,
                     color=ManimColor(PRICE_COLOR), weight=BOLD)
                .next_to(left_axes.c2p(Q_MAX, P_cur), RIGHT, buff=0.1)
            )

        def update_zero_dot(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(Dot(right_axes.c2p(0, P_cur),
                           color=ManimColor(PRICE_COLOR), radius=0.1))

        def update_zero_lbl(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(
                Text("q* = 0", font_size=17, color=ManimColor(PRICE_COLOR))
                .next_to(right_axes.c2p(0, P_cur), RIGHT, buff=0.12)
            )

        self.play(
            UpdateFromAlphaFunc(price_line, update_price_line),
            UpdateFromAlphaFunc(price_label, update_price_label),
            UpdateFromAlphaFunc(zero_dot, update_zero_dot),
            UpdateFromAlphaFunc(zero_lbl, update_zero_lbl),
            Create(zero_trail),
            run_time=3.0,
        )
        self.wait(0.5)

        # ═══════════════════════════════════════════════════════════════════
        # Price hits shutdown point
        # ═══════════════════════════════════════════════════════════════════
        say("At P = $4, the price exactly equals minimum SAVC.\n"
            "This is the shutdown point — the very start of supply.", wait=3.5)

        # Flash the shutdown dot
        self.play(
            Indicate(shut_dot, color=WHITE, scale_factor=1.8),
            Flash(shut_dot, color=ManimColor(SHUT_COLOR), num_lines=8, line_length=0.2),
        )

        # Mark shutdown point on right panel
        shut_sup_dot = Dot(right_axes.c2p(3, 4),
                           color=ManimColor(SHUT_COLOR), radius=0.12)
        shut_sup_dot.set_stroke(WHITE, width=1.5)
        shut_sup_lbl = Text("Shutdown point\nq = 3, P = $4",
                            font_size=15, color=ManimColor(SHUT_COLOR))
        shut_sup_lbl.next_to(shut_sup_dot, LEFT, buff=0.15)

        self.play(FadeIn(shut_sup_dot, scale=0.5), Write(shut_sup_lbl))
        self.wait(1.2)

        # ═══════════════════════════════════════════════════════════════════
        # Price rises above $4 — trace supply curve
        # ═══════════════════════════════════════════════════════════════════
        say("Now price rises above $4. The firm can cover all variable costs.\n"
            "It sets SMC = P to maximise profit.", wait=3.2)

        # Build supply curve points progressively on right panel
        sup_path_mobject = VMobject(color=ManimColor(SUP_COLOR), stroke_width=4)

        P_prices = np.linspace(4.0, P_MAX, 200)
        sup_full_pts = [right_axes.c2p(q_supply(P), P) for P in P_prices]
        sup_full = VMobject(color=ManimColor(SUP_COLOR), stroke_width=4)
        sup_full.set_points_as_corners(sup_full_pts)
        sup_full.make_smooth()

        # Intersection dot on SMC (left panel) — animated
        smc_intersect = Dot(color=ManimColor(PRICE_COLOR), radius=0.10)
        smc_intersect.set_stroke(WHITE, width=1.5)
        smc_intersect.move_to(left_axes.c2p(q_supply(4), 4))

        sup_dot_right = Dot(color=ManimColor(SUP_COLOR), radius=0.10)
        sup_dot_right.set_stroke(WHITE, width=1.5)
        sup_dot_right.move_to(right_axes.c2p(q_supply(4), 4))

        self.play(FadeIn(smc_intersect), FadeIn(sup_dot_right))
        self.wait(0.3)

        say("As price rises, the intersection of P with SMC shifts right.\n"
            "Each intersection point maps to one point on the supply curve.", wait=3.5)

        def update_smc_dot(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            q_cur = q_supply(P_cur)
            mob.move_to(left_axes.c2p(q_cur, P_cur))

        def update_price_line_phase2(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.become(
                DashedLine(
                    left_axes.c2p(0, P_cur),
                    left_axes.c2p(Q_MAX, P_cur),
                    color=ManimColor(PRICE_COLOR),
                    stroke_width=2.0,
                    dash_length=0.18,
                )
            )

        def update_price_label_phase2(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.become(
                Text(f"P = ${P_cur:.1f}", font_size=19,
                     color=ManimColor(PRICE_COLOR), weight=BOLD)
                .next_to(left_axes.c2p(Q_MAX, P_cur), RIGHT, buff=0.1)
            )

        def update_sup_dot_right(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            q_cur = q_supply(P_cur)
            mob.move_to(right_axes.c2p(q_cur, P_cur))

        self.play(
            UpdateFromAlphaFunc(smc_intersect, update_smc_dot),
            UpdateFromAlphaFunc(price_line, update_price_line_phase2),
            UpdateFromAlphaFunc(price_label, update_price_label_phase2),
            UpdateFromAlphaFunc(sup_dot_right, update_sup_dot_right),
            Create(sup_full, run_time=4.5),
            rate_func=linear,
            run_time=4.5,
        )
        self.wait(1.0)

        # ═══════════════════════════════════════════════════════════════════
        # Label the supply curve
        # ═══════════════════════════════════════════════════════════════════
        say("The supply curve IS the SMC curve above min SAVC.\n"
            "Higher price → higher quantity supplied, tracing SMC upward.", wait=3.5)

        sup_lbl = Text("Supply = SMC\n(above shut-down P)",
                       font_size=18, color=ManimColor(SUP_COLOR), weight=BOLD)
        sup_lbl.move_to(right_axes.c2p(7.0, 11.5))

        # Arrow pointing to supply curve
        sup_arrow = Arrow(
            sup_lbl.get_bottom() + DOWN * 0.05,
            right_axes.c2p(5.5, 9.5),
            color=ManimColor(SUP_COLOR),
            stroke_width=2,
            buff=0.1,
            max_tip_length_to_length_ratio=0.25,
        )

        self.play(Write(sup_lbl), Create(sup_arrow))
        self.wait(1.5)

        # ═══════════════════════════════════════════════════════════════════
        # Highlight vertical section (zero supply) and upward section together
        # ═══════════════════════════════════════════════════════════════════
        say("The full supply curve: vertical at q=0 for P<$4,\n"
            "then rising along SMC once P exceeds the shutdown price.", wait=3.8)

        # Brace the zero segment
        zero_brace = BraceBetweenPoints(
            right_axes.c2p(0, 0.1),
            right_axes.c2p(0, 3.9),
            direction=LEFT,
            color=ManimColor(PRICE_COLOR),
        )
        zero_brace_lbl = Text("q* = 0\n(shut down)", font_size=15,
                               color=ManimColor(PRICE_COLOR))
        zero_brace_lbl.next_to(zero_brace, LEFT, buff=0.1)

        self.play(Create(zero_brace), Write(zero_brace_lbl))
        self.wait(2.5)

        # ═══════════════════════════════════════════════════════════════════
        # Summary equation box
        # ═══════════════════════════════════════════════════════════════════
        say("Key takeaway: the supply curve is derived from cost minimisation.\n"
            "The firm only produces when revenue covers variable costs.", wait=3.5)

        eq_box = Rectangle(
            width=5.4, height=1.6,
            fill_color=BLACK, fill_opacity=0.7,
            stroke_color=ManimColor(SUP_COLOR), stroke_width=1.5,
        ).to_edge(DOWN, buff=1.2).shift(RIGHT * 3.1)

        eq_text = VGroup(
            Text("Supply rule:  SMC(q*) = P   and   P ≥ $4", font_size=16,
                 color=WHITE),
            Text("q*(P) = 2 + √(P − 3)   for P ≥ $4",       font_size=16,
                 color=ManimColor(SUP_COLOR)),
            Text("q*(P) = 0               for P < $4",        font_size=16,
                 color=ManimColor(PRICE_COLOR)),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.18).move_to(eq_box)

        self.play(FadeIn(eq_box), Write(eq_text))
        self.wait(3.5)

        # ═══════════════════════════════════════════════════════════════════
        # Fade out
        # ═══════════════════════════════════════════════════════════════════
        self.play(
            *[FadeOut(m) for m in self.mobjects],
            run_time=1.5,
        )
        self.wait(0.5)
