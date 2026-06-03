"""Generate og-image.png for social sharing previews."""

from __future__ import annotations

import hashlib
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

RED = {"Russia", "China"}

CAPITALIST_BLUE = {
    "United States of America",
    "France",
    "Germany",
    "United Kingdom",
    "Spain",
    "Italy",
    "Netherlands",
    "Belgium",
    "Portugal",
    "Australia",
    "Japan",
    "South Korea",
    "Mexico",
    "Argentina",
    "Chile",
    "Sweden",
    "Norway",
    "Denmark",
    "Finland",
    "Ireland",
    "Switzerland",
    "Austria",
    "Poland",
    "Greece",
    "Czechia",
    "Czech Republic",
    "New Zealand",
    "Singapore",
    "Israel",
    "United Arab Emirates",
    "Saudi Arabia",
    "Taiwan",
    "Iceland",
    "Luxembourg",
    "Slovakia",
    "Slovenia",
    "Estonia",
    "Latvia",
    "Lithuania",
}

CAPITALIST_GREEN = {
    "Canada",
    "Brazil",
    "Colombia",
    "Uruguay",
    "Paraguay",
    "Peru",
    "Ecuador",
    "India",
    "Indonesia",
    "Philippines",
    "Thailand",
    "Malaysia",
    "Vietnam",
    "Turkey",
    "Romania",
    "Hungary",
    "Ukraine",
    "Croatia",
    "Serbia",
    "Bulgaria",
    "Panama",
    "Costa Rica",
    "Guatemala",
    "Honduras",
    "El Salvador",
    "Nicaragua",
    "Dominican Rep.",
    "Jamaica",
    "Trinidad and Tobago",
}

AFRICA_PALETTE = [
    "#6BAF4A",
    "#5DCAA5",
    "#D4934A",
    "#7F77DD",
    "#6B8FC7",
    "#8BC66A",
    "#C97B5A",
    "#4FA3A8",
    "#A8C856",
    "#E0A84F",
]

ASIA_PALETTE = [
    "#5A9E78",
    "#6B8FC7",
    "#8BC66A",
    "#4FA3A8",
    "#7F77DD",
]

DEFAULT = "#4a5568"
ANTARCTICA = "#2a2a2e"


def country_color(name: str, continent: str) -> str:
    if name in RED:
        return "#B84242"
    if name in CAPITALIST_BLUE:
        return "#4A8FD4"
    if name in CAPITALIST_GREEN:
        return "#6AAF52"
    if continent == "Africa":
        idx = int(hashlib.md5(name.encode()).hexdigest(), 16) % len(AFRICA_PALETTE)
        return AFRICA_PALETTE[idx]
    if continent == "Asia":
        idx = int(hashlib.md5(name.encode()).hexdigest(), 16) % len(ASIA_PALETTE)
        return ASIA_PALETTE[idx]
    if continent == "South America":
        return "#6AAF52" if name in {"Brazil", "Colombia", "Uruguay"} else "#4A8FD4"
    if continent == "Oceania":
        return "#4A8FD4"
    if name == "Antarctica":
        return ANTARCTICA
    return DEFAULT


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

    url = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_110m_admin_0_countries.geojson"
    )
    world = gpd.read_file(url)
    world["fill"] = world.apply(
        lambda row: country_color(row["NAME"], row["CONTINENT"]), axis=1
    )

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
