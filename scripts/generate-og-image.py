"""Generate og-image.png for social sharing previews.

The live site map (app.js) colours countries by World Cup team picks using
TEAM_COLORS. Tournament nations use wc-team colours from apply-wc-team-colors.py;
all other countries keep their frozen random fills in og-map-fills.json.
"""

from __future__ import annotations

import json
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


def load_country_fills(script_dir: Path) -> list[str]:
    fills_path = script_dir / "og-map-fills.json"
    return json.loads(fills_path.read_text(encoding="utf-8"))


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    repo = script_dir.parent
    out_path = repo / "og-image.png"
    country_fills = load_country_fills(script_dir)

    url = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_110m_admin_0_countries.geojson"
    )
    world = gpd.read_file(url)
    if len(world) != len(country_fills):
        raise SystemExit(
            f"Country count mismatch: geojson has {len(world)}, "
            f"og-map-fills.json has {len(country_fills)}"
        )
    world["fill"] = country_fills
    world = world[world["NAME"] != "Antarctica"]

    dpi = 100
    fig_w, fig_h = W / dpi, H / dpi
    fig = plt.figure(figsize=(fig_w, fig_h), facecolor=BG, dpi=dpi)

    # Shifted up to match live map (no Antarctica, translate height / 2.1)
    ax = fig.add_axes([0.36, 0.03, 0.62, 0.93])
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
