"""
Fig 6.6: LRAC Envelope Animation
EC224: Intermediate Microeconomics, Bentley University

Run with Manim Community Edition:
    manim -pql fig66_lrac_manim.py LRACEnvelope          (low quality preview)
    manim -pqh fig66_lrac_manim.py LRACEnvelope          (high quality, ~1080p)

Production: Q = K^0.5 * L^0.5 (Cobb-Douglas, constant returns to scale).
Cost minimisation for a FIXED K gives L(q,K) = q^2/K, so:
    SRAC(q,K) = (w*q/K + v*K/q)   [cost per unit, U-shaped in q for fixed K]
Minimising SRAC over q for fixed K:
    q*(K) = K*sqrt(v/w)     SRAC_min(K) = 2*sqrt(w*v)   <- independent of K!

That independence is the whole point of this scene: because the technology has
constant returns to scale, EVERY plant size K reaches exactly the same minimum
average cost, just at a different output level. There is no single "efficient
scale": the long-run envelope of the SRAC curves is FLAT at 2*sqrt(w*v), not the
textbook's generic U-shape. This matches the interactive Fig 6.6 builder on
week6-viz.html, which states the same result explicitly. The individual SRAC
curves ARE U-shaped (that part of the classic story is unchanged); it is only
the LRAC that is flat here because of the CRS assumption.
"""

from manim import *
import numpy as np

W_WAGE = 4    # wage (cost of L)
V_RENT = 6    # rental rate (cost of K)
N_SRAC = 8    # number of SRAC curves

COLORS = [
    "#c0392b", "#d4813a", "#2e8b57", "#6b52a8",
    "#3d5a80", "#e67e22", "#16a085", "#8e44ad",
]
SITE_BLUE = "#1a56db"

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
    """Long-run minimum average cost (analytical, constant under CRS)."""
    return 2 * np.sqrt(w * v)


class LRACEnvelope(Scene):
    def construct(self):
        blue = ManimColor(SITE_BLUE)

        # ── Title ──────────────────────────────────────────────────────────
        title = Text("LRAC Envelope: Long-Run vs Short-Run Cost", font_size=32,
                      color=blue, weight=BOLD)
        title.to_edge(UP, buff=0.25)
        underline = Line(title.get_left(), title.get_right(), color=blue,
                          stroke_width=1.5).next_to(title, DOWN, buff=0.08)
        subtitle = Text("EC224 - Cost Theory - Fig 6.6", font_size=20, color=GRAY)
        subtitle.next_to(underline, DOWN, buff=0.1)
        self.play(Write(title), Create(underline), FadeIn(subtitle), run_time=0.9)
        self.wait(0.5)
        self.play(FadeOut(subtitle), run_time=0.3)

        # ── Axes (kept clear of the narration band at the bottom) ───────────
        axes = Axes(
            x_range=[0, Q_MAX, 2],
            y_range=[0, AC_MAX, 5],
            x_length=8.6,
            y_length=4.4,
            axis_config={"include_numbers": True, "font_size": 18},
            tips=False,
        ).shift(UP * 0.35)

        x_label = axes.get_x_axis_label(Text("Output q", font_size=22), direction=RIGHT)
        y_label = axes.get_y_axis_label(Text("AC ($)", font_size=22), direction=UP)

        self.play(Create(axes), Write(x_label), Write(y_label), run_time=1.1)

        # ── Narration bar (background so text never collides with the plot) ─
        narr_bg = Rectangle(width=12.6, height=0.85, fill_color=BLACK,
                             fill_opacity=0.55, stroke_width=0).to_edge(DOWN, buff=0.12)
        narr = Text(
            "In the short run, capital K is fixed. Each SRAC curve is one plant size.",
            font_size=20, color=LIGHT_GRAY,
        ).move_to(narr_bg)
        self.play(FadeIn(narr_bg), Write(narr), run_time=0.6)

        def say(txt, wait=1.4):
            new_narr = Text(txt, font_size=20, color=LIGHT_GRAY).move_to(narr_bg)
            self.play(Transform(narr, new_narr), run_time=0.35)
            self.wait(wait)

        # ── Draw SRAC curves one by one ─────────────────────────────────────
        srac_curves = []
        srac_labels = []
        srac_label_bgs = []
        srac_dots = []

        for ki in range(N_SRAC):
            K = ki + 1
            col = ManimColor(COLORS[ki % len(COLORS)])

            q_vals = np.linspace(0.25, Q_MAX, 300)
            ac_vals = np.array([srac(q, K) for q in q_vals])
            mask = ac_vals <= AC_MAX * 1.05
            q_v = q_vals[mask]
            ac_v = ac_vals[mask]
            if len(q_v) < 2:
                continue

            points = [axes.c2p(q, ac) for q, ac in zip(q_v, ac_v)]
            curve = VMobject(color=col, stroke_width=2.5)
            curve.set_points_as_corners(points)
            curve.make_smooth()

            # Minimum point: dots line up along the flat floor, spaced by K
            q_opt = srac_min_q(K)
            ac_opt = srac(q_opt, K)
            dot = Dot(axes.c2p(q_opt, ac_opt), color=col, radius=0.065)
            dot.set_stroke(WHITE, width=1.2)

            # Label sits right above its OWN dot, staggered so consecutive
            # labels (which are only ~0.8 units apart) do not overlap. A
            # small dark backing patch keeps each label readable where
            # several other curves cross through this crowded floor band.
            zigzag = 0.30 if ki % 2 == 0 else 0.62
            lbl = Text(f"K={K}", font_size=13, color=col)
            lbl.move_to(axes.c2p(q_opt, ac_opt) + UP * zigzag)
            lbl_bg = BackgroundRectangle(lbl, color=BLACK, fill_opacity=0.75, buff=0.045)

            run = 0.55 if ki < 2 else 0.32
            self.play(Create(curve, run_time=run), FadeIn(dot, scale=0.5),
                      FadeIn(lbl_bg, run_time=0.2),
                      FadeIn(lbl, shift=UP * 0.1, run_time=0.2))

            srac_curves.append(curve)
            srac_labels.append(lbl)
            srac_label_bgs.append(lbl_bg)
            srac_dots.append(dot)

            if ki == 0:
                say("K=1: one plant size. Cost falls then rises, a classic U-shape.", wait=1.1)
            elif ki == 1:
                say("K=2: a bigger plant moves the minimum right, to the SAME minimum cost.", wait=1.3)
            elif ki == 3:
                say("Every plant size bottoms out at the same height. Watch the floor forming.", wait=1.1)
            elif ki == N_SRAC - 1:
                say(f"All {N_SRAC} plant sizes drawn. Their minimums trace a flat floor.", wait=1.0)
            else:
                self.wait(0.15)

        # All 8 curves are now on screen and cross through the crowded floor
        # band; bring every K=n label (and its dark backing patch) to the
        # front so later curves never draw over an earlier label again.
        # Backgrounds go up first, labels last, so text stays on top of its
        # own backing patch instead of being dimmed by it.
        self.bring_to_front(*srac_label_bgs)
        self.bring_to_front(*srac_dots)
        self.bring_to_front(*srac_labels)

        # ── Reveal LRAC (lower envelope) ────────────────────────────────────
        say("The LRAC is the lower envelope: at each output, pick whichever K is cheapest.", wait=1.5)

        q_lr = np.linspace(0.25, Q_MAX, 500)
        ac_lr = np.array([min(srac(q, k + 1) for k in range(N_SRAC)) for q in q_lr])
        mask_lr = ac_lr <= AC_MAX
        q_lr_v = q_lr[mask_lr]
        ac_lr_v = ac_lr[mask_lr]
        lrac_points = [axes.c2p(q, ac) for q, ac in zip(q_lr_v, ac_lr_v)]
        lrac_curve = VMobject(color=blue, stroke_width=5)
        lrac_curve.set_points_as_corners(lrac_points)
        lrac_curve.make_smooth()

        # Placed in the empty region BELOW the flat floor (clear of every
        # SRAC label and every rising curve arm) rather than above, where the
        # K=n labels and the rising SRAC arms already crowd the space.
        lrac_lbl = Text("LRAC", font_size=24, color=blue, weight=BOLD)
        lrac_lbl.move_to(axes.c2p(11.3, 5.0))

        self.play(Create(lrac_curve, run_time=1.6), Write(lrac_lbl))
        self.wait(0.6)

        # ── LRAC minimum dashed line ─────────────────────────────────────────
        lrac_floor = lrac_min()
        say(f"Analytical minimum = 2 x sqrt(w x v) = 2 x sqrt(4x6) = ${lrac_floor:.2f}, at EVERY K.",
            wait=1.8)

        dash_line = DashedLine(
            axes.c2p(0, lrac_floor), axes.c2p(Q_MAX, lrac_floor),
            color=blue, stroke_width=1.5, dash_length=0.15,
        )
        floor_lbl = Text(f"LRAC = ${lrac_floor:.2f}", font_size=18, color=blue)
        floor_lbl.next_to(dash_line, RIGHT, buff=0.1)

        self.play(Create(dash_line), Write(floor_lbl))
        self.wait(0.8)

        # ── Payoff: flatness comparison between the first and last plant ────
        say("Why flat? This technology has constant returns to scale:\n"
            "doubling every input exactly doubles output, so unit cost can't drift with size.",
            wait=2.6)

        first_dot = srac_dots[0]
        last_dot = srac_dots[-1]
        compare_line = Line(
            first_dot.get_center() + UP * 0.15,
            last_dot.get_center() + UP * 0.15,
            color=WHITE, stroke_width=1.2,
        )
        tick_l = Line(compare_line.get_start() + DOWN * 0.05, compare_line.get_start() + UP * 0.05,
                      color=WHITE, stroke_width=1.2)
        tick_r = Line(compare_line.get_end() + DOWN * 0.05, compare_line.get_end() + UP * 0.05,
                      color=WHITE, stroke_width=1.2)
        # Label lives in the clear region BELOW the floor (same empty band as
        # the LRAC label, but a different x) with a thin leader line up to the
        # comparison bracket, so it never fights the K=n labels for space.
        compare_lbl = Text("same minimum cost, K=1 through K=8", font_size=15, color=WHITE)
        compare_lbl.move_to(axes.c2p(5.2, 5.0))
        leader = Line(compare_lbl.get_top(), axes.c2p(5.2, 9.5), color=WHITE,
                      stroke_width=1.0, stroke_opacity=0.5)

        self.play(Create(compare_line), Create(tick_l), Create(tick_r),
                  Create(leader), Write(compare_lbl))
        self.wait(1.8)
        self.play(FadeOut(compare_line), FadeOut(tick_l), FadeOut(tick_r),
                  FadeOut(leader), FadeOut(compare_lbl))

        # ── Final message ────────────────────────────────────────────────────
        say("In the long run the firm can always match its plant to its output,\n"
            "so short-run cost is never below long-run cost: SRAC >= LRAC, always.",
            wait=2.2)

        # ── Fade out ────────────────────────────────────────────────────────
        self.play(
            *[FadeOut(m) for m in [
                title, underline, axes, x_label, y_label, lrac_curve, lrac_lbl,
                dash_line, floor_lbl, narr, narr_bg,
                *srac_curves, *srac_labels, *srac_label_bgs, *srac_dots,
            ]],
            run_time=1.0,
        )
        self.wait(0.3)
