"""Run a studio notebook (percent-format .py) the way lab/studio/notebook.js does, to test it locally.

    python lab/studio/tools/runnb.py lab/studio/notebooks/week8.py [--knob a=12 --knob c=3] [--show]

Cells run top to bottom in one namespace; knob cells set their variables; each code cell's stdout,
figure count and any error are printed. Exit code 1 if any cell raises. --show also saves figures to
lab/studio/tools/_figs/ so you can look at them.
"""
import ast, contextlib, io, os, re, sys, traceback

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # the checks print a check mark

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def parse(text):
    cells, cur = [], None
    for line in text.replace("\r\n", "\n").split("\n"):
        m = re.match(r"^# %%(.*)$", line)
        if m:
            h = m.group(1)
            kind = "md" if "[markdown]" in h else "code"
            tags = re.search(r"tags=\[([^\]]*)\]", h)
            tags = tags.group(1) if tags else ""
            if '"setup"' in tags: kind = "setup"
            if '"knobs"' in tags: kind = "knobs"
            cur = {"kind": kind, "lines": []}
            cells.append(cur)
            continue
        if cur is not None:
            cur["lines"].append(line)
    for c in cells:
        c["src"] = "\n".join(c["lines"]).strip("\n")
    return [c for c in cells if c["src"].strip() or c["kind"] == "code"]


KNOB = re.compile(r"^(\w+)\s*=\s*(-?[\d.]+)\s*(?:#\s*([^\[]*?)\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*\]\s*(\$|%)?)?\s*$")


def main():
    args = sys.argv[1:]
    path = args[0]
    over = {}
    show = "--show" in args
    for i, a in enumerate(args):
        if a == "--knob":
            k, v = args[i + 1].split("=")
            over[k] = float(v)
    cells = parse(open(path, encoding="utf-8").read())
    G = {"__name__": "__main__"}
    bad = 0
    nfig = 0
    os.makedirs(os.path.join(os.path.dirname(__file__), "_figs"), exist_ok=True)
    for i, c in enumerate(cells):
        if c["kind"] == "md":
            continue
        if c["kind"] == "knobs":
            ok = 0
            for line in c["src"].split("\n"):
                if line.startswith("#"):
                    continue
                m = KNOB.match(line)
                if not m:
                    print(f"[{i}] KNOBS: line not understood: {line!r}"); bad += 1; continue
                name, val = m.group(1), float(m.group(2))
                if m.group(4) is None:
                    print(f"[{i}] KNOBS: {name} has no '# label [min, max, step]'"); bad += 1
                else:
                    lo, hi = float(m.group(4)), float(m.group(5))
                    if not lo <= val <= hi: print(f"[{i}] KNOBS: {name}={val} outside [{lo}, {hi}]"); bad += 1
                G[name] = over.get(name, val)
                ok += 1
            print(f"[{i}] knobs: " + ", ".join(f"{k}={G[k]}" for k in re.findall(r"^(\w+)\s*=", c["src"], re.M)))
            continue
        src = c["src"]
        out = io.StringIO()
        plt.close("all")
        try:
            tree = ast.parse(src, "<cell>")
            last = None
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                last = ast.Expression(tree.body.pop().value)
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
                exec(compile(tree, "<cell>", "exec"), G)
                res = eval(compile(last, "<cell>", "eval"), G) if last is not None else None
            figs = plt.get_fignums()
            nfig += len(figs)
            if show:
                for n in figs:
                    plt.figure(n).savefig(os.path.join(os.path.dirname(__file__), "_figs", f"{os.path.basename(path)}-{i}-{n}.png"), dpi=90, bbox_inches="tight")
            text = out.getvalue().rstrip()
            print(f"[{i}] {c['kind']}: ok, {len(figs)} fig(s)" + ("\n    " + text.replace("\n", "\n    ") if text else "") + (f"\n    => {res!r}"[:300] if res is not None and not hasattr(res, 'figure') else ""))
        except Exception as e:
            bad += 1
            print(f"[{i}] {c['kind']}: ERROR\n    " + "".join(traceback.format_exception(e)).replace("\n", "\n    "))
        plt.close("all")
    print(f"--- {len(cells)} cells, {nfig} figures, {bad} problems")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
