"""Generate og-image.png for social sharing previews.

Layout: 1200x630 dark canvas. The map dominates the top ~78% at nearly full
width. Bottom-left: title + subtitle. Bottom-right: worldcupmap.io.

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
from matplotlib import font_manager
from PIL import Image
from shapely.geometry import shape

W, H = 1200, 630
DPI = 100

# Map hero: full width with side margins, top ~78% of canvas height
MAP_AXES = (0.035, 0.17, 0.93, 0.80)
TEXT_X = 0.04
URL_X = 0.965
TITLE_SUBTITLE_GAP_PX = 30
TITLE_Y = 0.125 + TITLE_SUBTITLE_GAP_PX / (2 * H)
SUBTITLE_Y = 0.065 - TITLE_SUBTITLE_GAP_PX / (2 * H)
URL_Y = 0.065
TITLE_SIZE = 58
SUBTITLE_SIZE = 28
URL_SIZE = 24

BG = "#0a0a0a"
TEXT = "#ffffff"
SUBTEXT = "#b8b8b8"
MAP_BG = "#0a0a0a"
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


def render_og_image(world: gpd.GeoDataFrame) -> Image.Image:
    """Render map + bottom text band into the final OG composition."""
    fig_w, fig_h = W / DPI, H / DPI
    fig = plt.figure(figsize=(fig_w, fig_h), facecolor=BG, dpi=DPI)

    ax = fig.add_axes(MAP_AXES)
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
    pad_x = (maxx - minx) * 0.015
    pad_y = (maxy - miny) * 0.02
    ax.set_xlim(minx - pad_x, maxx + pad_x)
    ax.set_ylim(miny - pad_y, maxy + pad_y)
    ax.set_aspect("equal", adjustable="box")

    title_font = load_font(True, TITLE_SIZE)
    sub_font = load_font(False, SUBTITLE_SIZE)
    url_font = load_font(False, URL_SIZE)

    fig.text(
        TEXT_X,
        TITLE_Y,
        "World Cup Map",
        color=TEXT,
        fontproperties=title_font,
        ha="left",
        va="center",
    )
    fig.text(
        TEXT_X,
        SUBTITLE_Y,
        "Who does the world back?",
        color=SUBTEXT,
        fontproperties=sub_font,
        ha="left",
        va="center",
    )
    fig.text(
        URL_X,
        URL_Y,
        "worldcupmap.io",
        color=SUBTEXT,
        fontproperties=url_font,
        ha="right",
        va="center",
    )

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=DPI, facecolor=BG, pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    img = Image.open(buf).convert("RGB")
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    return img


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
    canvas = render_og_image(world)
    save_og_png(canvas, out_path)


if __name__ == "__main__":
    main()
