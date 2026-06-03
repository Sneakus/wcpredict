"""Generate og-image.png for social sharing previews.

The live site map (app.js) colours countries by World Cup team picks using
TEAM_COLORS. This script uses that same palette but assigns colours to
countries at random — decorative only, not tied to predictions.
"""

from __future__ import annotations

import random
from pathlib import Path

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from PIL import Image

W, H = 1200, 630
PAD = 40
BG = "#0a0a0a"
TEXT = "#ffffff"
SUBTEXT = "#ffffff"

# Same colours as TEAMS / TEAM_COLORS in app.js
TEAM_COLORS = [
    "#639922",  # Brazil
    "#185FA5",  # France
    "#993C1D",  # England
    "#D85A30",  # Spain
    "#5DCAA5",  # Argentina
    "#888780",  # Germany
    "#A32D2D",  # Portugal
    "#7F77DD",  # USA
]


def load_font(bold: bool, size: int):
    candidates = (
        [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
        if bold
        else [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"]
    )
    for path in candidates:
        try:
            return font_manager.FontProperties(fname=path, size=size)
        except OSError:
            continue
    return font_manager.FontProperties(size=size, weight="bold" if bold else "normal")


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    out_path = repo / "og-image.png"
    rng = random.Random()

    url = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_110m_admin_0_countries.geojson"
    )
    world = gpd.read_file(url)
    world["fill"] = [rng.choice(TEAM_COLORS) for _ in range(len(world))]

    dpi = 100
    fig_w, fig_h = W / dpi, H / dpi
    fig = plt.figure(figsize=(fig_w, fig_h), facecolor=BG, dpi=dpi)

    ax = fig.add_axes([0.36, 0.06, 0.62, 0.88])
    ax.set_facecolor(BG)
    world.plot(
        ax=ax,
        color=world["fill"],
        edgecolor="#1f2430",
        linewidth=0.25,
        antialiased=True,
    )
    ax.axis("off")

    title_font = load_font(True, 72)
    sub_font = load_font(False, 34)
    fig.text(
        PAD / W,
        1 - (PAD + 78) / H,
        "WCPredict",
        color=TEXT,
        fontproperties=title_font,
        ha="left",
        va="top",
    )
    fig.text(
        PAD / W,
        1 - (PAD + 148) / H,
        "Who does the world back?",
        color=SUBTEXT,
        fontproperties=sub_font,
        ha="left",
        va="top",
    )

    fig.savefig(out_path, dpi=dpi, facecolor=BG)
    plt.close(fig)

    img = Image.open(out_path).convert("RGB")
    img = img.resize((W, H), Image.LANCZOS)
    img.save(out_path, "PNG", optimize=True)

    print(f"Wrote {out_path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
