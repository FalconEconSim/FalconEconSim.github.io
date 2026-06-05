"""
Fig 6.6 — LRAC Envelope Animation
EC224: Intermediate Microeconomics, Bentley University

Run with Manim Community Edition:
    manim -pql fig66_lrac_manim.py LRACEnvelope          (low quality preview)
    manim -pqh fig66_lrac_manim.py LRACEnvelope          (high quality, ~1080p)

Production = Q = K^0.5 * L^0.5 (Cobb-Douglas, CRS)
Solving cost minimisation for each fixed K:
    min w*L + v*K  s.t. K^0.5*L^0.5 = q
    => L*(q,K) = q^2/K  (from MRTS = w/v at optimum: K/L = v/w = 6/4 = 1.5 => K=1.5L)
    Wait, K/L = v/w => L* = q*sqrt(v/w) if CRS; but with fixed K:
    L(q,K) = q^2/K  (from production fn with fixed K)
    SRAC(q,K) = w*q^2/K + v*K  →  wait, that's not right.

Actually: Q = sqrt(L*K) => L = Q^2/K
SRAC(q,K) = w*L + v*K = w*q^2/K + v*K   (with fixed K, variable L)
But this gives SRAC = 4q^2/K + 6K.

Let's verify: d(SRAC)/dq = 8q/K = 0 only at q=0. This is U-shaped only in terms of
average cost. Let's use SAC = (w*q^2/K + v*K)/q = w*q/K + v*K/q which IS U-shaped.
=> SAC(q,K) = 4q/K + 6K/q  (same formula as in week6-viz.html)
Min at d(SAC)/dq = 4/K - 6K/q^2 = 0 => q* = K*sqrt(6/4) = K*sqrt(1.5)

w = 4, v = 6, so LRAC_min = 2*sqrt(w*v) = 2*sqrt(24) ≈ $9.80
"""

from manim import *
import numpy as np

W_WAGE = 4    # wage (cost of L)
V_RENT = 6    # rental rate (cost of K)
N_SRAC = 8    # max number of SRAC curves

COLORS = [
    "#c0392b", "#d4813a", "#2e8b57", "#6b52a8",
    "#3d5a80", "#e67e22", "#16a085", "#8e44ad",
]
LRAC_COLOR = "#1a56db"
LRAC_MIN_COLOR = "#1a56db"

Q_MAX = 13.0
AC_MAX = 34.0


def srac(q, K, w=W_WAGE, v=V_RENT):
    """Short-run average cost with fixed capital K."""
    if q <= 0:
        return AC_MAX
    return w * q / K + v * K / q


def srac_min_q(K, w=W_WAGE, v=V_RENT):
    """Output that minimises SRAC for given K."""
    return K * np.sqrt(v / w)


def lrac_min(w=W_WAGE, v=V_RENT):
    """Long-run minimum average cost (analytical)."""
    return 2 * np.sqrt(w * v)


class LRACEnvelope(Scene):
    def construct(self):
        # ── Title ──────────────────────────────────────────────────────────
        title = Title(
            "LRAC Envelope: Long-Run vs Short-Run Cost Curves",
            include_underline=True,
        )
        subtitle = Text(
            "EC224 · Cost Theory · Fig 6.6",
            font_size=22,
            color=GRAY,
        ).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), FadeIn(subtitle))
        self.wait(1)
        self.play(FadeOut(subtitle))

        # ── Axes ────────────────────────────────────────────────────────────
        axes = Axes(
            x_range=[0, Q_MAX, 2],
            y_range=[0, AC_MAX, 5],
            x_length=9,
            y_length=5.5,
            axis_config={"include_numbers": True, "font_size": 20},
            tips=False,
        ).shift(DOWN * 0.5)

        x_label = axes.get_x_axis_label(
            Text("Output q", font_size=24), direction=RIGHT
        )
        y_label = axes.get_y_axis_label(
            Text("AC ($)", font_size=24), direction=UP
        )

        self.play(Create(axes), Write(x_label), Write(y_label))
        self.wait(0.5)

        # ── Narration helper ────────────────────────────────────────────────
        narr_box = always_redraw(lambda: Rectangle(
            width=9.5, height=1.0, fill_color=BLACK,
            fill_opacity=0.0, stroke_opacity=0,
        ).to_edge(DOWN, buff=0.1))
        narr = Text("", font_size=21, color=LIGHT_GRAY).to_edge(DOWN, buff=0.2)
        self.add(narr)

        def say(txt, wait=2.0):
            new_narr = Text(txt, font_size=21, color=LIGHT_GRAY).to_edge(DOWN, buff=0.2)
            self.play(Transform(narr, new_narr), run_time=0.4)
            self.wait(wait)

        # ── Draw SRAC curves one by one ─────────────────────────────────────
        srac_curves = []
        srac_labels = []
        lrac_lower = []  # track lower envelope as more curves are added

        say("In the short run, capital K is fixed. Each SRAC curve shows\n"
            "cost for one particular plant size K.", wait=2.5)

        for ki in range(N_SRAC):
            K = ki + 1
            col = ManimColor(COLORS[ki % len(COLORS)])

            # Build SRAC curve
            q_vals = np.linspace(0.25, Q_MAX, 300)
            ac_vals = np.array([srac(q, K) for q in q_vals])

            # Clip to visible range
            mask = ac_vals <= AC_MAX * 1.05
            q_v = q_vals[mask]
            ac_v = ac_vals[mask]

            if len(q_v) < 2:
                continue

            points = [axes.c2p(q, ac) for q, ac in zip(q_v, ac_v)]
            curve = VMobject(color=col, stroke_width=2.5)
            curve.set_points_as_corners(points)
            curve.make_smooth()

            # Minimum dot
            q_opt = srac_min_q(K)
            ac_opt = srac(q_opt, K)
            dot = Dot(axes.c2p(q_opt, ac_opt), color=col, radius=0.07)
            dot.set_stroke(WHITE, width=1.5)

            # Label near the left arm of the curve
            q_lbl = max(0.4, q_opt * 0.3)
            ac_lbl = srac(q_lbl, K)
            lbl_pos = axes.c2p(q_lbl, min(ac_lbl, AC_MAX - 1))
            lbl = Text(f"SRAC{K}", font_size=18, color=col)
            lbl.move_to(lbl_pos + LEFT * 0.5 + UP * 0.1)

            self.play(
                Create(curve, run_time=0.6),
                FadeIn(dot, scale=0.5),
                Write(lbl, run_time=0.3),
            )

            srac_curves.append(curve)
            srac_labels.append(lbl)

            if ki == 0:
                say(f"K={K}: One plant size. Cost falls then rises — classic U-shape.",
                    wait=1.5)
            elif ki == 1:
                say(f"K={K}: A larger plant shifts the minimum to the right\n"
                    "and (with CRS) achieves the same minimum cost.", wait=1.5)
            elif ki == 3:
                say(f"With {K} plant sizes, we begin to see the envelope forming\n"
                    "along the bottom of each SRAC curve.", wait=2.0)
            elif ki == N_SRAC - 1:
                say(f"All {N_SRAC} plant sizes. The lower boundary is the LRAC.", wait=1.5)
            else:
                self.wait(0.4)

        # ── Reveal LRAC (lower envelope) ────────────────────────────────────
        say("The LRAC curve is the lower envelope — at each output level,\n"
            "we choose whichever K is cheapest.", wait=2.5)

        q_lr = np.linspace(0.25, Q_MAX, 500)
        ac_lr = []
        for q in q_lr:
            best = min(srac(q, k + 1) for k in range(N_SRAC))
            ac_lr.append(best)

        ac_lr = np.array(ac_lr)
        mask_lr = ac_lr <= AC_MAX
        q_lr_v = q_lr[mask_lr]
        ac_lr_v = ac_lr[mask_lr]
        lrac_points = [axes.c2p(q, ac) for q, ac in zip(q_lr_v, ac_lr_v)]
        lrac_curve = VMobject(color=ManimColor(LRAC_COLOR), stroke_width=5)
        lrac_curve.set_points_as_corners(lrac_points)
        lrac_curve.make_smooth()

        lrac_lbl = Text("LRAC", font_size=24, color=ManimColor(LRAC_COLOR), weight=BOLD)
        lrac_lbl.move_to(axes.c2p(7, min(srac(7, 5), AC_MAX) + 1.5))

        self.play(
            Create(lrac_curve, run_time=2.0),
            Write(lrac_lbl),
        )
        self.wait(1)

        # ── LRAC minimum dashed line ─────────────────────────────────────────
        lrac_floor = lrac_min()
        say(f"Analytical LRAC minimum = 2·√(w·v) = 2·√(4×6) ≈ ${lrac_floor:.2f}.\n"
            "This is the long-run minimum efficient scale.", wait=3.0)

        dash_line = DashedLine(
            axes.c2p(0, lrac_floor),
            axes.c2p(Q_MAX, lrac_floor),
            color=ManimColor(LRAC_MIN_COLOR),
            stroke_width=1.5,
            dash_length=0.15,
        )
        floor_lbl = Text(
            f"LRAC min ≈ ${lrac_floor:.2f}",
            font_size=18,
            color=ManimColor(LRAC_MIN_COLOR),
        ).next_to(dash_line, RIGHT, buff=0.1)

        self.play(Create(dash_line), Write(floor_lbl))
        self.wait(2)

        # ── Highlight tangency intuition ─────────────────────────────────────
        say("Each SRAC is tangent to the LRAC at its cost-minimising output.\n"
            "As K → ∞, the discrete envelope approaches the smooth LRAC.", wait=3.5)

        # Flash each minimum dot
        for i, K in enumerate(range(1, N_SRAC + 1)):
            q_opt = srac_min_q(K)
            ac_opt = srac(q_opt, K)
            if ac_opt <= AC_MAX:
                flash_dot = Dot(axes.c2p(q_opt, ac_opt),
                                color=ManimColor(COLORS[i % len(COLORS)]), radius=0.12)
                self.play(Flash(flash_dot, color=WHITE, line_length=0.15,
                                num_lines=6, run_time=0.25))

        self.wait(1)

        # ── Final message ────────────────────────────────────────────────────
        say("In the long run, firms choose K optimally — moving along the LRAC.\n"
            "Short-run costs are always ≥ long-run costs.", wait=4.0)

        final_box = SurroundingRectangle(lrac_curve, color=ManimColor(LRAC_COLOR),
                                         buff=0.05, stroke_width=2)
        self.play(Create(final_box))
        self.wait(0.5)
        self.play(FadeOut(final_box))
        self.wait(2)

        # ── Fade out ────────────────────────────────────────────────────────
        self.play(
            *[FadeOut(m) for m in [
                title, axes, x_label, y_label, lrac_curve, lrac_lbl,
                dash_line, floor_lbl, narr,
                *srac_curves, *srac_labels,
            ]],
            run_time=1.5,
        )
        self.wait(0.5)
