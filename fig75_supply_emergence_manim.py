"""
Fig 7.5: Supply Curve Emergence
EC224: Intermediate Microeconomics, Bentley University

Run with Manim Community Edition:
    manim -pql fig75_supply_emergence_manim.py SupplyEmergence   (low quality preview)
    manim -pqh fig75_supply_emergence_manim.py SupplyEmergence   (720p, faster)
    manim -pqk fig75_supply_emergence_manim.py SupplyEmergence   (4K production)

Firm cost functions (Week 7), identical to the SMC7/SAVC7 functions used by the
interactive builder on week7-viz.html so the video and the tool agree exactly:
    TVC(q) = q^3/3 - 2q^2 + 7q
    TC(q)  = TVC(q) + 5          (TFC = $5)
    SMC(q) = q^2 - 4q + 7         (min SMC = $3 at q = 2)
    SAVC(q)= q^2/3 - 2q + 7      (min SAVC = $4 at q = 3)

Shutdown rule: supply q = 0 when P < min SAVC = $4.
Supply curve: q = 2 + sqrt(P - 3)  for P >= 4  (from SMC = P, upper root).

Colours match the interactive Fig 7.5 builder exactly: SMC blue, SAVC orange,
the price line purple, the supply curve green.
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

# ── Colour palette: matches week7-viz.html's own Fig 7.5 builder exactly ──
SMC_COLOR   = "#1a56db"   # blue: SMC (site accent)
SAVC_COLOR  = "#f39c12"   # orange: SAVC
PRICE_COLOR = "#7d3c98"   # purple: price line
SUP_COLOR   = "#27ae60"   # green: supply curve
SHUT_COLOR  = "#f1c40f"   # gold: shutdown point highlight

Q_MAX  = 8.0
P_MAX  = 14.0


def label_with_bg(text, font_size, color, bg_opacity=1.0):
    """A text label with a small dark backing so lines that later sweep
    behind it (the animated price line) stay from visually merging with it.
    Opaque, not translucent: at 0.6 the SMC/SAVC curves showed straight
    through the price label. On the black scene the box is invisible except
    that it cleanly erases the curve segment directly behind the text."""
    txt = Text(text, font_size=font_size, color=color, weight=BOLD)
    bg = Rectangle(width=txt.width + 0.14, height=txt.height + 0.10,
                    fill_color=BLACK, fill_opacity=bg_opacity, stroke_width=0)
    bg.move_to(txt)
    return VGroup(bg, txt)


class SupplyEmergence(Scene):
    def construct(self):
        smc_c = ManimColor(SMC_COLOR)
        savc_c = ManimColor(SAVC_COLOR)
        price_c = ManimColor(PRICE_COLOR)
        sup_c = ManimColor(SUP_COLOR)
        shut_c = ManimColor(SHUT_COLOR)

        # ═══════════════════════════════════════════════════════════════════
        # Title
        # ═══════════════════════════════════════════════════════════════════
        title = Text("Supply Curve Emergence: Where Does Supply Come From?",
                      font_size=28, color=smc_c, weight=BOLD)
        title.to_edge(UP, buff=0.25)
        underline = Line(title.get_left(), title.get_right(), color=smc_c,
                          stroke_width=1.5).next_to(title, DOWN, buff=0.08)
        subtitle = Text("EC224 - Perfect Competition - Fig 7.5", font_size=18, color=GRAY)
        subtitle.next_to(underline, DOWN, buff=0.08)
        self.play(Write(title), Create(underline), FadeIn(subtitle), run_time=0.9)
        self.wait(0.4)
        self.play(FadeOut(subtitle), run_time=0.25)

        # ═══════════════════════════════════════════════════════════════════
        # Two-panel axes layout
        # ═══════════════════════════════════════════════════════════════════
        left_axes = Axes(
            x_range=[0, Q_MAX, 1], y_range=[0, P_MAX, 2],
            x_length=5.1, y_length=4.0,
            axis_config={"include_numbers": True, "font_size": 16},
            tips=False,
        ).shift(LEFT * 3.35 + DOWN * 0.35)

        right_axes = Axes(
            x_range=[0, Q_MAX, 1], y_range=[0, P_MAX, 2],
            x_length=5.1, y_length=4.0,
            axis_config={"include_numbers": True, "font_size": 16},
            tips=False,
        ).shift(RIGHT * 3.35 + DOWN * 0.35)

        lx_lbl = left_axes.get_x_axis_label(Text("Output q", font_size=18), direction=RIGHT)
        ly_lbl = left_axes.get_y_axis_label(Text("$ / unit", font_size=18), direction=UP)
        rx_lbl = right_axes.get_x_axis_label(Text("Output Q", font_size=18), direction=RIGHT)
        ry_lbl = right_axes.get_y_axis_label(Text("Price P", font_size=18), direction=UP)

        left_title  = Text("Cost Curves", font_size=20, weight=BOLD).next_to(left_axes,  UP, buff=0.22)
        right_title = Text("Supply Curve", font_size=20, weight=BOLD).next_to(right_axes, UP, buff=0.22)

        self.play(
            Create(left_axes), Create(right_axes),
            Write(lx_lbl), Write(ly_lbl), Write(rx_lbl), Write(ry_lbl),
            Write(left_title), Write(right_title),
            run_time=1.0,
        )

        # ── Narration bar ─────────────────────────────────────────────────
        narr_bg = Rectangle(width=12.6, height=0.8, fill_color=BLACK,
                             fill_opacity=0.55, stroke_width=0).to_edge(DOWN, buff=0.1)
        narr = Text(
            "Every firm has a Short-run Marginal Cost (SMC) curve: the cost of one more unit.",
            font_size=19, color=LIGHT_GRAY,
        ).move_to(narr_bg)
        self.play(FadeIn(narr_bg), Write(narr), run_time=0.5)

        def say(txt, wait=1.3):
            new_narr = Text(txt, font_size=19, color=LIGHT_GRAY).move_to(narr_bg)
            self.play(Transform(narr, new_narr), run_time=0.3)
            self.wait(wait)

        # ═══════════════════════════════════════════════════════════════════
        # Draw SMC and SAVC on left panel
        # ═══════════════════════════════════════════════════════════════════
        q_vals = np.linspace(0.05, Q_MAX, 400)

        smc_pts  = [left_axes.c2p(q, min(smc(q),  P_MAX)) for q in q_vals if smc(q)  <= P_MAX * 1.05]
        savc_pts = [left_axes.c2p(q, min(savc(q), P_MAX)) for q in q_vals if savc(q) <= P_MAX * 1.05]

        smc_curve = VMobject(color=smc_c, stroke_width=2.8)
        smc_curve.set_points_as_corners(smc_pts)
        smc_curve.make_smooth()

        savc_curve = VMobject(color=savc_c, stroke_width=2.8)
        savc_curve.set_points_as_corners(savc_pts)
        savc_curve.make_smooth()

        # SMC label: placed at q=4.6 (SMC=9.16, well inside the P_MAX=14
        # ceiling). The original script placed this at q=6.8 (SMC=26+, far
        # off-scale), which is why the SMC label never appeared on screen.
        smc_lbl = label_with_bg("SMC", 18, smc_c)
        smc_lbl.move_to(left_axes.c2p(4.6, smc(4.6) + 1.0))
        savc_lbl = label_with_bg("SAVC", 18, savc_c)
        savc_lbl.move_to(left_axes.c2p(6.6, savc(6.6) + 0.9))

        self.play(Create(smc_curve), FadeIn(smc_lbl), run_time=0.7)
        self.play(Create(savc_curve), FadeIn(savc_lbl), run_time=0.7)

        say("SAVC is average variable cost. Its minimum, $4 at q=3, is the shutdown threshold.", wait=1.8)

        # Mark min SAVC (shutdown point) - a compact permanent dot, with a
        # SHORT label that fades out once its job (explaining the point) is
        # done, so it stops competing with everything drawn afterward.
        shut_dot = Dot(left_axes.c2p(3, 4), color=shut_c, radius=0.1)
        shut_dot.set_stroke(WHITE, width=1.5)
        shut_lbl = label_with_bg("Shutdown: P=$4, q=3", 15, shut_c)
        shut_lbl.next_to(shut_dot, DOWN, buff=0.22)

        self.play(FadeIn(shut_dot, scale=0.5), FadeIn(shut_lbl))
        self.wait(1.0)
        self.play(FadeOut(shut_lbl), run_time=0.4)

        # ═══════════════════════════════════════════════════════════════════
        # Price below shutdown: q* = 0
        # ═══════════════════════════════════════════════════════════════════
        say("Suppose price is $2, below min SAVC. The firm can't cover variable cost, so it shuts down.",
            wait=2.0)

        P_start = 2.0
        # Price line label sits at a FIXED point well inside the left panel
        # (not at the panel's right edge) so it never crowds the right
        # panel's q*=0 marker, which sits just across the gap.
        price_line = DashedLine(
            left_axes.c2p(0, P_start), left_axes.c2p(Q_MAX, P_start),
            color=price_c, stroke_width=2.2, dash_length=0.16,
        )
        price_label = label_with_bg(f"P = ${P_start:.0f}", 18, price_c)
        price_label.move_to(left_axes.c2p(2.6, min(P_start, P_MAX - 0.9)) + UP * 0.35)

        zero_dot = Dot(right_axes.c2p(0, P_start), color=price_c, radius=0.09)
        zero_lbl = label_with_bg("q*=0", 16, price_c)
        zero_lbl.next_to(zero_dot, RIGHT, buff=0.15)

        self.play(Create(price_line), FadeIn(price_label))
        self.play(FadeIn(zero_dot), FadeIn(zero_lbl))
        self.wait(1.0)

        # ── Animate price rising to shutdown point ────────────────────────
        say("Below $4, quantity supplied stays at zero: the firm won't produce.", wait=1.6)

        zero_trail_pts = [right_axes.c2p(0, p) for p in np.linspace(2, 4, 30)]
        zero_trail = VMobject(color=price_c, stroke_width=4)
        zero_trail.set_points_as_corners(zero_trail_pts)

        def update_price_line(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(DashedLine(left_axes.c2p(0, P_cur), left_axes.c2p(Q_MAX, P_cur),
                                   color=price_c, stroke_width=2.2, dash_length=0.16))

        def update_price_label(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(label_with_bg(f"P = ${P_cur:.1f}", 18, price_c)
                       .move_to(left_axes.c2p(2.6, min(P_cur, P_MAX - 0.9)) + UP * 0.35))

        def update_zero_dot(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(Dot(right_axes.c2p(0, P_cur), color=price_c, radius=0.09))

        def update_zero_lbl(mob, alpha):
            P_cur = 2.0 + alpha * 2.0
            mob.become(label_with_bg("q*=0", 16, price_c)
                       .next_to(right_axes.c2p(0, P_cur), RIGHT, buff=0.15))

        self.play(
            UpdateFromAlphaFunc(price_line, update_price_line),
            UpdateFromAlphaFunc(price_label, update_price_label),
            UpdateFromAlphaFunc(zero_dot, update_zero_dot),
            UpdateFromAlphaFunc(zero_lbl, update_zero_lbl),
            Create(zero_trail),
            run_time=2.0,
        )
        self.wait(0.3)

        # ═══════════════════════════════════════════════════════════════════
        # Price hits shutdown point
        # ═══════════════════════════════════════════════════════════════════
        say("At P=$4, price exactly equals min SAVC: the shutdown point, the very start of supply.",
            wait=2.0)

        self.play(
            Indicate(shut_dot, color=WHITE, scale_factor=1.8),
            Flash(shut_dot, color=shut_c, num_lines=8, line_length=0.2),
        )

        shut_sup_dot = Dot(right_axes.c2p(3, 4), color=shut_c, radius=0.1)
        shut_sup_dot.set_stroke(WHITE, width=1.5)

        self.play(FadeIn(shut_sup_dot, scale=0.5))
        self.play(FadeOut(zero_lbl), run_time=0.3)
        self.wait(0.5)

        # ═══════════════════════════════════════════════════════════════════
        # Price rises above $4: trace supply curve
        # ═══════════════════════════════════════════════════════════════════
        say("Now price rises above $4. The firm sets SMC = P to maximise profit.", wait=1.6)

        P_prices = np.linspace(4.0, P_MAX, 200)
        sup_full_pts = [right_axes.c2p(q_supply(P), P) for P in P_prices]
        sup_full = VMobject(color=sup_c, stroke_width=4)
        sup_full.set_points_as_corners(sup_full_pts)
        sup_full.make_smooth()

        smc_intersect = Dot(color=price_c, radius=0.09)
        smc_intersect.set_stroke(WHITE, width=1.5)
        smc_intersect.move_to(left_axes.c2p(q_supply(4), 4))

        sup_dot_right = Dot(color=sup_c, radius=0.09)
        sup_dot_right.set_stroke(WHITE, width=1.5)
        sup_dot_right.move_to(right_axes.c2p(q_supply(4), 4))

        self.play(FadeIn(smc_intersect), FadeIn(sup_dot_right))

        say("As price rises, the SMC-price intersection shifts right, tracing the supply curve.", wait=1.8)

        def update_smc_dot(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.move_to(left_axes.c2p(q_supply(P_cur), P_cur))

        def update_price_line_phase2(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.become(DashedLine(left_axes.c2p(0, P_cur), left_axes.c2p(Q_MAX, P_cur),
                                   color=price_c, stroke_width=2.2, dash_length=0.16))

        def update_price_label_phase2(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.become(label_with_bg(f"P = ${P_cur:.1f}", 18, price_c)
                       .move_to(left_axes.c2p(2.6, min(P_cur, P_MAX - 0.9)) + UP * 0.35))

        def update_sup_dot_right(mob, alpha):
            P_cur = 4.0 + alpha * (P_MAX - 4.0)
            mob.move_to(right_axes.c2p(q_supply(P_cur), P_cur))

        self.play(
            UpdateFromAlphaFunc(smc_intersect, update_smc_dot),
            UpdateFromAlphaFunc(price_line, update_price_line_phase2),
            UpdateFromAlphaFunc(price_label, update_price_label_phase2),
            UpdateFromAlphaFunc(sup_dot_right, update_sup_dot_right),
            Create(sup_full, run_time=3.2),
            rate_func=linear,
            run_time=3.2,
        )
        self.wait(0.5)

        # ═══════════════════════════════════════════════════════════════════
        # Label the supply curve
        # ═══════════════════════════════════════════════════════════════════
        say("The supply curve IS the SMC curve, above the shutdown price.", wait=1.6)

        sup_lbl = Text("Supply = SMC\n(above shutdown P)",
                       font_size=17, color=sup_c, weight=BOLD)
        sup_lbl.move_to(right_axes.c2p(6.6, 11.2))

        sup_arrow = Arrow(
            sup_lbl.get_bottom() + DOWN * 0.05, right_axes.c2p(5.3, 9.2),
            color=sup_c, stroke_width=2, buff=0.1,
            max_tip_length_to_length_ratio=0.25,
        )

        self.play(Write(sup_lbl), Create(sup_arrow))
        self.wait(1.0)

        # ═══════════════════════════════════════════════════════════════════
        # Highlight vertical section (zero supply)
        # ═══════════════════════════════════════════════════════════════════
        say("The full supply curve: vertical at q=0 below $4, then rising along SMC above it.", wait=2.0)

        # Brace curls to the RIGHT, into the empty q in [0,3], P in [0,4] band
        # of the right panel (nothing else is plotted there). A left-curling
        # brace was tried first but its tip reached into the narrow gap
        # between the two panels, where the left panel's own "Output q" axis
        # label lives, and the two collided.
        zero_brace = BraceBetweenPoints(
            right_axes.c2p(0, 3.9), right_axes.c2p(0, 0.1),
            direction=RIGHT, color=price_c,
        )
        zero_brace_lbl = label_with_bg("q*=0 (shut down)", 14, price_c)
        zero_brace_lbl.next_to(zero_brace, RIGHT, buff=0.12)

        self.play(Create(zero_brace), FadeIn(zero_brace_lbl))
        self.wait(1.8)

        # ═══════════════════════════════════════════════════════════════════
        # Summary (kept in the narration bar rather than a floating box: a
        # 3-line equation box at readable font size is wider than the right
        # panel itself, which is what caused it to spill into the axis label)
        # ═══════════════════════════════════════════════════════════════════
        say("Key takeaway: q*(P) = 2 + sqrt(P-3) for P >= $4, otherwise q*=0. Supply comes straight from cost minimisation.",
            wait=3.0)

        # ═══════════════════════════════════════════════════════════════════
        # Fade out
        # ═══════════════════════════════════════════════════════════════════
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=1.0)
        self.wait(0.3)
