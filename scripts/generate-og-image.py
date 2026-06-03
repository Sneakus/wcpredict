"""Generate og-image.png for social sharing previews."""

from __future__ import annotations

import colorsys
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
SUBTEXT = "#b4b4af"


def random_country_color(rng: random.Random) -> str:
    """Pick a bright, random fill colour — no dark greys or black."""
    hue = rng.random()
    saturation = 0.5 + rng.random() * 0.4
    lightness = 0.42 + rng.random() * 0.24
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


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
    world["fill"] = [random_country_color(rng) for _ in range(len(world))]

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
