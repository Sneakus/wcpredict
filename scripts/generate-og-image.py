"""Generate og-image.png for social sharing previews.

Layout: 1200x630 black canvas, 380px left text band, 820px map area,
60px gradient at the boundary, no text overlap with the map.

Map colours are data-driven from Supabase tournament predictions (match_id
IS NULL), using the same VALID_TEAMS filter and TEAM_COLORS as the homepage.
UK is rendered as four subdivisions from uk-nations.geojson (ONS / jhellingsdata).
Other countries without live data keep their colours from og-map-fills.json.
"""

from __future__ import annotations

import io
import json
import os
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

import geopandas as gpd
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import shape

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
NO_DATA_FILL = "#1e1e1e"

NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_110m_admin_0_countries.geojson"
)

# Natural Earth ISO_A2 overrides where ISO_A2 is -99
NAME_TO_ISO2 = {
    "France": "FR",
    "Norway": "NO",
    "Kosovo": "XK",
    "United States of America": "US",
    "United Kingdom": "GB",
}


def load_config(script_dir: Path) -> dict:
    return json.loads((script_dir / "og-map-config.json").read_text(encoding="utf-8"))


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


def fetch_prediction_fills(config: dict) -> dict[str, str]:
    """Majority tournament pick per nation_iso2 -> team colour hex."""
    valid_teams = set(config["validTeams"])
    team_colors = config["teamColors"]
    base_url = os.environ.get("SUPABASE_URL", config["supabaseUrl"])
    anon_key = os.environ.get("SUPABASE_ANON_KEY", config["supabaseAnonKey"])

    rows: list[dict] = []
    offset = 0
    page_size = 1000
    while True:
        query = urllib.parse.urlencode({
            "match_id": "is.null",
            "select": "nation_iso2,predicted_winner",
            "offset": offset,
            "limit": page_size,
        })
        req = urllib.request.Request(
            f"{base_url}/rest/v1/predictions?{query}",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {anon_key}",
            },
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            batch = json.loads(resp.read().decode("utf-8"))
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    by_nation: dict[str, Counter[str]] = {}
    for row in rows:
        iso = row.get("nation_iso2")
        team = row.get("predicted_winner")
        if not iso or not team or team not in valid_teams:
            continue
        by_nation.setdefault(iso, Counter())[team] += 1

    fills: dict[str, str] = {}
    for iso, counts in by_nation.items():
        top_team, _ = counts.most_common(1)[0]
        fills[iso] = team_colors[top_team]
    return fills


def load_country_fills(script_dir: Path) -> list[str]:
    fills_path = script_dir / "og-map-fills.json"
    return json.loads(fills_path.read_text(encoding="utf-8"))


def iso2_for_row(row) -> str | None:
    iso = row.get("ISO_A2")
    if iso and iso != "-99":
        return iso
    return NAME_TO_ISO2.get(row.get("NAME"))


def fill_for_iso(
    iso2: str | None,
    live_fills: dict[str, str],
    fallback: str,
) -> str:
    if iso2 and iso2 in live_fills:
        return live_fills[iso2]
    return fallback


def build_map_geodataframe(
    repo: Path,
    script_dir: Path,
    live_fills: dict[str, str],
) -> gpd.GeoDataFrame:
    fallback_fills = load_country_fills(script_dir)
    world_full = gpd.read_file(NE_URL)
    if len(world_full) != len(fallback_fills):
        raise SystemExit(
            f"Country count mismatch: geojson has {len(world_full)}, "
            f"og-map-fills.json has {len(fallback_fills)}"
        )

    world_full = world_full.copy()
    world_full["fill"] = fallback_fills
    uk_fallback = (
        world_full.loc[world_full["ISO_A2"] == "GB", "fill"].iloc[0]
        if (world_full["ISO_A2"] == "GB").any()
        else NO_DATA_FILL
    )

    world_full = world_full[world_full["NAME"] != "Antarctica"].copy()
    world_full = world_full[world_full["ISO_A2"] != "GB"].copy()

    world_full["iso2"] = world_full.apply(iso2_for_row, axis=1)
    world_full["fill"] = world_full.apply(
        lambda row: fill_for_iso(row["iso2"], live_fills, row["fill"]),
        axis=1,
    )

    uk_path = repo / "uk-nations.geojson"
    uk_geojson = json.loads(uk_path.read_text(encoding="utf-8"))
    uk_rows = []
    for feature in uk_geojson["features"]:
        iso = feature["properties"]["iso2"]
        uk_rows.append({
            "iso2": iso,
            "NAME": feature["properties"]["name"],
            "fill": fill_for_iso(iso, live_fills, uk_fallback),
            "geometry": shape(feature["geometry"]),
        })

    uk_gdf = gpd.GeoDataFrame(uk_rows, crs=world_full.crs)
    return pd.concat([world_full, uk_gdf], ignore_index=True)


def render_map(world: gpd.GeoDataFrame) -> Image.Image:
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
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, LEFT_BAND_W - 1, H - 1), fill=BG)


def apply_boundary_gradient(canvas: Image.Image) -> None:
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
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_heights.append(bbox[3] - bbox[1])
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


def save_og_png(canvas: Image.Image, out_path: Path) -> None:
    """Save PNG under 250KB for WhatsApp preview compatibility."""
    canvas.save(out_path, "PNG", optimize=True)
    size = out_path.stat().st_size
    if size <= 250_000:
        print(f"Wrote {out_path} ({W}x{H}, {size // 1024}KB)")
        return

    for quality in (256, 224, 192, 160, 128):
        quantized = canvas.quantize(colors=quality, method=Image.Quantize.MEDIANCUT)
        rgb = quantized.convert("RGB")
        rgb.save(out_path, "PNG", optimize=True)
        size = out_path.stat().st_size
        if size <= 250_000:
            print(f"Wrote {out_path} ({W}x{H}, {size // 1024}KB, {quality} colours)")
            return

    print(f"Wrote {out_path} ({W}x{H}, {size // 1024}KB) - still above 250KB")


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    repo = script_dir.parent
    out_path = repo / "og-image.png"
    config = load_config(script_dir)

    live_fills = fetch_prediction_fills(config)
    uk_preview = {iso: live_fills.get(iso, NO_DATA_FILL) for iso in (
        "GB-ENG", "GB-SCT", "GB-WLS", "GB-NIR"
    )}
    print("UK subdivision colours:", uk_preview)

    world = build_map_geodataframe(repo, script_dir, live_fills)

    canvas = Image.new("RGB", (W, H), BG)
    map_img = render_map(world)
    canvas.paste(map_img, (MAP_X + MAP_PAD, MAP_PAD))
    apply_left_band_mask(canvas)
    apply_boundary_gradient(canvas)
    draw_text_band(canvas)

    save_og_png(canvas, out_path)


if __name__ == "__main__":
    main()
