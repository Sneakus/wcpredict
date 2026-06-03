"""One-off: extract COUNTRY_FILLS from committed og-image.png."""

import json
from pathlib import Path

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

TEAM_COLORS = [
    "#639922",
    "#185FA5",
    "#993C1D",
    "#D85A30",
    "#5DCAA5",
    "#888780",
    "#A32D2D",
    "#7F77DD",
]

W, H, DPI = 1200, 630, 100


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def nearest_team(rgb: tuple[int, int, int]) -> str:
    best = TEAM_COLORS[0]
    best_dist = float("inf")
    for color in TEAM_COLORS:
        dist = sum((a - b) ** 2 for a, b in zip(rgb, hex_to_rgb(color)))
        if dist < best_dist:
            best_dist = dist
            best = color
    return best


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    png_path = repo / "og-image.png"
    out_path = repo / "scripts" / "og-map-fills.json"

    url = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_110m_admin_0_countries.geojson"
    )
    world = gpd.read_file(url)
    pixels = np.array(Image.open(png_path).convert("RGB"))

    fig = plt.figure(figsize=(W / DPI, H / DPI), facecolor="#0a0a0a", dpi=DPI)
    ax = fig.add_axes([0.36, 0.06, 0.62, 0.88])
    ax.set_facecolor("#0a0a0a")
    world.plot(ax=ax, color="#000000", edgecolor="#1f2430", linewidth=0.25)
    ax.axis("off")
    fig.canvas.draw()

    fills = []
    for geom in world.geometry:
        point = geom.representative_point()
        x_disp, y_disp = ax.transData.transform((point.x, point.y))
        px = int(round(x_disp))
        py = int(round(fig.bbox.height - y_disp))
        px = max(0, min(W - 1, px))
        py = max(0, min(H - 1, py))
        rgb = tuple(int(v) for v in pixels[py, px])
        fills.append(nearest_team(rgb))

    plt.close(fig)
    out_path.write_text(json.dumps(fills, indent=2), encoding="utf-8")
    print(f"Wrote {len(fills)} fills to {out_path}")


if __name__ == "__main__":
    main()
