"""Generate ui-skins/base.css from v2/styles.css.

Every rule of V2 that paints a hard-coded colour (or radius) is re-emitted under
html[data-ui-version="v2"][data-ui-skin] with that value replaced by a --sk-* token,
so a skin (v3/, v4/, …) only has to define tokens. Noir rules (the complete V2
chrome override list) are reused the same way, so the sidebar/topbar are covered too.
"""
import re, sys

SRC, OUT = sys.argv[1], sys.argv[2]
css = open(SRC, encoding="utf-8").read()
css_nc = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

# ---------- tiny brace-aware parser ----------
def parse(text):
    """yield (media_prelude or None, selector, body)"""
    i, n = 0, len(text)
    out = []
    def block(start):
        depth, j = 1, start
        while depth:
            c = text[j]
            if c == "{": depth += 1
            elif c == "}": depth -= 1
            j += 1
        return j
    while i < n:
        k = text.find("{", i)
        if k < 0: break
        pre = text[i:k].strip()
        end = block(k + 1)
        inner = text[k + 1:end - 1]
        if pre.startswith("@media") or pre.startswith("@supports"):
            for (_, s, b) in parse(inner):
                out.append((pre, s, b))
        elif pre.startswith("@"):
            pass  # keyframes etc.
        else:
            out.append((None, pre, inner))
        i = end
    return out

def decls(body):
    res = []
    for part in re.split(r";(?![^(]*\))", body):
        if ":" not in part: continue
        p, v = part.split(":", 1)
        p, v = p.strip(), v.strip()
        if p: res.append((p, v))
    return res

TAGS = ["gray", "slate", "blue", "teal", "green", "amber", "orange", "rose", "red", "violet"]
STATUS_TAG = {"0": "gray", "1": "blue", "2": "green", "3": "teal", "4": "amber", "5": "violet"}
PCT_TAG = {"0": "red", "20": "orange", "40": "amber", "60": "teal", "80": "green", "100": "green"}
ICO_DEPTH = {"carton": 0, "folder": 1, "doc": 2, "card": 3}

GREENS = {"#bbf7d0", "#16a34a", "#22c55e", "#4f9768", "#6b9b7a", "#8fbf9a", "#7aaf88", "#dcfce7",
          "#f0fdf4", "#eef8f1", "#e7f3eb", "#e8f5ec", "#24332a", "#3d5a48", "#166534", "#14532d",
          "#1f6b3a", "#3f7a52", "#9bbb9f"}
REDS = {"#b91c1c", "#dc2626", "#991b1b", "#fecaca", "#fef2f2", "#450a0a", "#7f1d1d"}

unknown = {}

def kind(prop):
    if prop in ("color", "fill", "caret-color", "-webkit-text-fill-color"): return "fg"
    if prop.startswith("border") or prop.startswith("outline") or prop == "stroke": return "line"
    if prop.startswith("box-shadow"): return "shadow"
    return "bg"

def tag_ctx(sel):
    m = re.search(r"is-color-(\w+)", sel)
    if m and m.group(1) in TAGS: return m.group(1)
    m = re.search(r"is-status-(\d)", sel)
    if m: return STATUS_TAG.get(m.group(1), "gray")
    m = re.search(r"is-pct-(\d+)", sel)
    if m: return PCT_TAG.get(m.group(1))
    return None

def map_color(c, prop, sel, noir):
    c0 = c.lower()
    k = kind(prop)
    if len(c0) == 4 and c0.startswith("#"):
        c0 = "#" + "".join(ch * 2 for ch in c0[1:])
    # --- contextual families first ---
    if "config-color-swatch" in sel:
        t = tag_ctx(sel)
        if t: return f"var(--sk-tag-{t}-swatch)"
    if "v2-task-ico" in sel:
        m = re.search(r"is-(carton|folder|doc|card)", sel)
        if m: return f"var(--sk-depth-{ICO_DEPTH[m.group(1)]}-accent)"
    if prop.startswith("--v2-sheet"):
        m = re.search(r"is-depth-(\d)", sel); d = m.group(1) if m else "0"
        return f"var(--sk-depth-{d}-{'accent' if 'accent' in prop else 'tint'})"
    if "gantt-bar" in sel and "is-depth-" in sel:
        d = re.search(r"is-depth-(\d)", sel).group(1)
        return f"var(--sk-depth-{d}-{'ink' if k == 'fg' else 'bg'})"
    t = tag_ctx(sel)
    if t and ("status" in sel or "fill-pct" in sel):
        return f"var(--sk-tag-{t}-{'ink' if k == 'fg' else ('line' if k == 'line' else 'bg')})"
    if c0 in GREENS:
        if k == "fg": return "var(--sk-success-ink)" if c0 not in ("#9bbb9f",) else "var(--sk-success-ink)"
        if c0 in ("#16a34a", "#22c55e", "#4f9768", "#6b9b7a", "#3d5a48") and ("check" in sel or "toast-check" in sel):
            return "var(--sk-success)"
        if k == "line" or k == "shadow":
            return "var(--sk-success-line)" if c0 in ("#bbf7d0",) else "var(--sk-success)"
        return "var(--sk-success-soft)"
    if c0 in REDS:
        if k == "fg": return "var(--sk-on-danger)" if ("is-danger" in sel and "section-btn" in sel) else "var(--sk-danger-ink)"
        if c0 in ("#fecaca", "#7f1d1d"): return "var(--sk-danger-line)"
        if c0 in ("#fef2f2", "#450a0a"): return "var(--sk-danger-soft)"
        if c0 == "#991b1b": return "var(--sk-danger-hover)"
        return "var(--sk-danger)"
    if c0.startswith("rgba") or c0.startswith("rgb"):
        if "backdrop" in sel or "modal-backdrop" in sel: return "var(--sk-overlay)"
        if "127, 175, 138" in c0 or "79, 151, 104" in c0: return "var(--sk-success-soft)"
        if "34, 197, 94" in c0: return "var(--sk-success-ring)"
        if "23, 23, 23" in c0 or "28, 25, 23" in c0: return "var(--sk-hover)"
        if k == "shadow": return "var(--sk-shadow-color)"
        return c
    # --- neutrals ---
    if noir:
        if c0 in ("#ffffff",):
            if "danger" in sel: return "var(--sk-on-danger)"
            return "var(--sk-text)"
        if c0 in ("#ebebeb",) and k == "bg": return "var(--sk-accent)"
        if c0 in ("#191919",) and k == "fg": return "var(--sk-accent-ink)"
    N = {
        "#ffffff": {"fg": "var(--sk-accent-ink)", "bg": "var(--sk-panel)", "line": "var(--sk-panel)", "shadow": "var(--sk-panel)"},
        "#111111": "var(--sk-text)", "#171717": {"fg": "var(--sk-text)", "bg": "var(--sk-accent)", "line": "var(--sk-accent)"},
        "#1c1917": "var(--sk-text)", "#191919": {"fg": "var(--sk-text)", "bg": "var(--sk-accent)"},
        "#202020": "var(--sk-panel)", "#252525": "var(--sk-input)", "#2c2c2c": "var(--sk-hover)", "#2a2a2a": "var(--sk-panel-2)",
        "#2f2f2f": "var(--sk-border)", "#3f3f3f": "var(--sk-border-strong)", "#4a4a4a": "var(--sk-text-dim)", "#5a5a5a": "var(--sk-control)",
        "#9b9b9b": "var(--sk-text-muted)", "#6f6f6f": "var(--sk-text-dim)", "#b0b0b0": "var(--sk-text-2)",
        "#404040": {"fg": "var(--sk-text-2)", "bg": "var(--sk-panel-2)", "line": "var(--sk-border-strong)"},
        "#525252": {"fg": "var(--sk-text-2)", "line": "var(--sk-text-muted)", "bg": "var(--sk-text-muted)"},
        "#44403c": "var(--sk-text-2)", "#4b5563": "var(--sk-text-2)",
        "#737373": {"fg": "var(--sk-text-muted)", "bg": "var(--sk-text-muted)", "line": "var(--sk-text-muted)"},
        "#8a8a8a": {"fg": "var(--sk-text-muted)", "line": "var(--sk-control-hover)", "bg": "var(--sk-text-muted)"},
        "#a3a3a3": {"fg": "var(--sk-text-dim)", "line": "var(--sk-control-hover)", "shadow": "var(--sk-control-hover)",
                     "bg": "var(--sk-accent)" if "today" in sel else "var(--sk-text-dim)"},
        "#c4c4c4": {"fg": "var(--sk-text-dim)", "line": "var(--sk-control-hover)" if ":hover" in sel or "goto" in sel else "var(--sk-control)", "bg": "var(--sk-border-strong)"},
        "#cfcfcf": "var(--sk-grid)",
        "#d4d4d4": {"fg": "var(--sk-text-dim)", "bg": "var(--sk-border-strong)", "line": "var(--sk-border-strong)", "shadow": "var(--sk-border-strong)"},
        "#e0e0e0": {"bg": "var(--sk-hover)", "line": "var(--sk-border)", "fg": "var(--sk-text-dim)"},
        "#e2e8f0": "var(--sk-border)", "#f3f6f9": "var(--sk-panel-2)",
        "#ececec": {"bg": "var(--sk-hairline)", "line": "var(--sk-hairline)", "fg": "var(--sk-hairline)"},
        "#f0f0f0": {"bg": "var(--sk-panel-2)", "line": "var(--sk-hairline)"},
        "#e8e8e8": "var(--sk-hover)", "#eeeeee": "var(--sk-hover)", "#ebebeb": "var(--sk-hover)",
        "#f3f3f3": "var(--sk-panel-2)", "#fafafa": "var(--sk-panel-2)", "#f7f7f7": "var(--sk-panel-2)", "#f4f4f5": "var(--sk-canvas)", "#f5f5f4": "var(--sk-panel-2)",
        "#262626": "var(--sk-accent-hover)",
        "#e7e5e4": {"bg": "var(--sk-tag-gray-bg)", "fg": "var(--sk-tag-gray-ink)"},
        "#3b6ea5": "var(--sk-accent)", "#6b8fad": "var(--sk-dep-line)", "#8aadc8": "var(--sk-dep-line-hot)", "#7a9bb8": "var(--sk-dep-line)",
    }
    if c0 in N:
        v = N[c0]
        if isinstance(v, str): return v
        return v.get(k) or v.get("bg") or next(iter(v.values()))
    unknown[c0] = unknown.get(c0, 0) + 1
    return c

COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)")
RADIUS = {"0.2rem": "var(--sk-r-xs)", "0.25rem": "var(--sk-r-xs)", "2px": "var(--sk-r-xs)",
          "0.3rem": "var(--sk-r-sm)", "0.35rem": "var(--sk-r-sm)",
          "0.4rem": "var(--sk-r-md)", "0.45rem": "var(--sk-r-md)"}

def rewrite_sel(sel, noir):
    parts = [s.strip() for s in sel.split(",")]
    out = []
    for s in parts:
        if noir:
            s = s.replace('html[data-theme="noir"][data-ui-version="v2"]', 'html[data-ui-version="v2"][data-ui-skin]')
        elif 'html[data-ui-version="v2"]' in s:
            s = s.replace('html[data-ui-version="v2"]', 'html[data-ui-version="v2"][data-ui-skin]', 1)
        else:
            s = 'html[data-ui-version="v2"][data-ui-skin] ' + s
        out.append(s)
    return ",\n".join(out)

lines = ["/* Wygenerowane z v2/styles.css (gen_skin.py) — nie edytuj ręcznie.",
         " * Warstwa wspólna dla motywów V3+: każdy twardy kolor/promień V2 → token --sk-*.",
         " * Tokeny definiuje plik motywu (v3/theme.css, v4/theme.css, …). */", ""]
count = 0
for media, sel, body in parse(css_nc):
    noir = 'data-theme="noir"' in sel
    if "data-theme=" in sel and not noir:
        continue
    new = []
    for p, v in decls(body):
        if p.startswith("--v2-") and not p.startswith("--v2-sheet"):
            continue  # palette definitions — the skin sets these itself
        nv = v
        if COLOR_RE.search(v) and not p.startswith("--v2-gantt"):
            nv = COLOR_RE.sub(lambda m: map_color(m.group(0), p, sel, noir), v)
            nv = re.sub(r"color-mix\(in srgb, var\(--sk-danger-soft\) \d+%, var\(--v2-panel\)\)", "var(--sk-danger-soft)", nv)
        if p in ("border-radius",) or p.endswith("-radius"):
            nv = " ".join(RADIUS.get(t, t) for t in nv.split(" "))
        if noir or nv != v:
            new.append(f"  {p}: {nv};")
    if not new:
        continue
    rule = rewrite_sel(sel, noir) + " {\n" + "\n".join(new) + "\n}"
    if media:
        rule = media + " {\n" + rule + "\n}"
    lines.append(rule)
    count += 1

open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("rules:", count, "unknown colours:", sorted(unknown.items(), key=lambda x: -x[1]))
