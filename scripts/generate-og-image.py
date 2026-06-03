"""Generate og-image.png for social sharing previews.

Layout: 1200×630 black canvas, 380px left text band, 820px map area,
60px gradient at the boundary, no text overlap with the map.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
LEFT_BAND_W = 380
MAP_X = LEFT_BAND_W
MAP_W = W - MAP_X
MAP_PAD = 20
GRADIENT_W = 60
TEXT_PAD_LEFT = 40
TITLE_SIZE = 64
SUBTITLE_SIZE = 28
TITLE_SUBTITLE_GAP = 18

BG = "#000000"
TEXT = "#ffffff"
SUBTEXT = "#b8b8b8"
MAP_BG = "#000000"


def load_font(bold: bool, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
        if bold
        else [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"]
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def load_country_fills(script_dir: Path) -> list[str]:
    fills_path = script_dir / "og-map-fills.json"
    return json.loads(fills_path.read_text(encoding="utf-8"))


def render_map(world) -> Image.Image:
    """Render the coloured world map into a padded sub-region of the right area."""
    map_inner_w = MAP_W - 2 * MAP_PAD
    map_inner_h = H - 2 * MAP_PAD
    dpi = 100
    fig_w, fig_h = map_inner_w / dpi, map_inner_h / dpi
    fig = plt.figure(figsize=(fig_w, fig_h), facecolor=MAP_BG, dpi=dpi)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor(MAP_BG)
    world.plot(
        ax=ax,
        color=world["fill"],
        edgecolor="#1f2430",
        linewidth=0.22,
        antialiased=True,
    )
    ax.axis("off")

    minx, miny, maxx, maxy = world.total_bounds
    pad_x = (maxx - minx) * 0.02
    pad_y = (maxy - miny) * 0.025
    ax.set_xlim(minx - pad_x, maxx + pad_x)
    ax.set_ylim(miny - pad_y, maxy + pad_y)
    ax.set_aspect("equal", adjustable="box")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, facecolor=MAP_BG, pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    map_img = Image.open(buf).convert("RGB")
    if map_img.size != (map_inner_w, map_inner_h):
        map_img = map_img.resize((map_inner_w, map_inner_h), Image.LANCZOS)
    return map_img


def apply_left_band_mask(canvas: Image.Image) -> None:
    """Ensure the left band stays pure black over any map bleed."""
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, LEFT_BAND_W - 1, H - 1), fill=BG)


def apply_boundary_gradient(canvas: Image.Image) -> None:
    """Fade the left edge of the map into the black text band."""
    gradient = Image.new("RGBA", (GRADIENT_W, H))
    for x in range(GRADIENT_W):
        alpha = int(255 * (1 - x / (GRADIENT_W - 1)))
        for y in range(H):
            gradient.putpixel((x, y), (0, 0, 0, alpha))
    canvas.paste(gradient, (MAP_X, 0), gradient)


def draw_text_band(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(True, TITLE_SIZE)
    sub_font = load_font(False, SUBTITLE_SIZE)

    title_lines = ("World Cup", "Map")
    subtitle = "Who does the world back?"

    line_heights = []
    line_widths = []
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_heights.append(bbox[3] - bbox[1])
        line_widths.append(bbox[2] - bbox[0])
    sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sub_h = sub_bbox[3] - sub_bbox[1]

    title_block_h = sum(line_heights) + (len(title_lines) - 1) * 4
    block_h = title_block_h + TITLE_SUBTITLE_GAP + sub_h
    top_y = (H - block_h) // 2

    y = top_y
    for line, lh in zip(title_lines, line_heights):
        draw.text((TEXT_PAD_LEFT, y), line, fill=TEXT, font=title_font)
        y += lh + 4

    draw.text((TEXT_PAD_LEFT, y + TITLE_SUBTITLE_GAP - 4), subtitle, fill=SUBTEXT, font=sub_font)


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

    canvas = Image.new("RGB", (W, H), BG)
    map_img = render_map(world)
    canvas.paste(map_img, (MAP_X + MAP_PAD, MAP_PAD))
    apply_left_band_mask(canvas)
    apply_boundary_gradient(canvas)
    draw_text_band(canvas)

    canvas.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({W}x{H})")


if __name__ == "__main__":
    main()
