"""Apply WC team colours to tournament nations in og-map-fills.json."""

import json
from pathlib import Path

import geopandas as gpd

# Live map legend colours from app.js TEAMS / TEAM_COLORS
TEAM_COLORS = {
    "Brazil": "#639922",
    "France": "#185FA5",
    "England": "#993C1D",
    "Spain": "#D85A30",
    "Argentina": "#5DCAA5",
    "Germany": "#888780",
    "Portugal": "#A32D2D",
    "USA": "#888780",  # OG uses grey for host nation
}

# All 48 WC 2026 teams — kit-inspired colours for teams outside the live legend
WC_TEAM_COLORS = {
    **TEAM_COLORS,
    "Mexico": "#006847",
    "Canada": "#185FA5",
    "Uruguay": "#55B7F0",
    "Panama": "#DA020E",
    "Bolivia": "#007934",
    "Japan": "#BC002D",
    "Australia": "#FFCD00",
    "Morocco": "#C1272D",
    "Cameroon": "#007A5E",
    "Ecuador": "#FFD100",
    "Venezuela": "#CF142B",
    "Netherlands": "#FF6600",
    "Colombia": "#FCD116",
    "South Korea": "#CD2E3A",
    "Senegal": "#00853F",
    "Ivory Coast": "#F77F00",
    "Italy": "#009246",
    "Croatia": "#FF0000",
    "Turkey": "#E30A17",
    "Saudi Arabia": "#006C35",
    "Egypt": "#CE1126",
    "New Zealand": "#4DA8DA",
    "Belgium": "#FDDA24",
    "Serbia": "#C6363C",
    "Poland": "#DC143C",
    "Togo": "#006A4E",
    "Thailand": "#A51931",
    "Philippines": "#0038A8",
    "Switzerland": "#FF0000",
    "Chile": "#D52B1E",
    "Costa Rica": "#002B7F",
    "Guatemala": "#4997D0",
    "South Africa": "#007A4D",
    "Tanzania": "#1EB53A",
    "Denmark": "#C8102E",
    "Sweden": "#006AA7",
    "Ukraine": "#005BBB",
    "Bahrain": "#CE1126",
    "Malaysia": "#010066",
    "Cuba": "#002A8F",
}

# Natural Earth NAME or ADMIN -> WC team name
COUNTRY_TO_TEAM = {
    "United States of America": "USA",
    "United Kingdom": "England",
    "Ivory Coast": "Ivory Coast",
    "Korea": "South Korea",
    "South Korea": "South Korea",
}

for team in WC_TEAM_COLORS:
    COUNTRY_TO_TEAM.setdefault(team, team)


def team_for_country(label: str) -> str | None:
    team = COUNTRY_TO_TEAM.get(label, label if label in WC_TEAM_COLORS else None)
    return team if team in WC_TEAM_COLORS else None


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    fills_path = repo / "scripts" / "og-map-fills.json"
    fills = json.loads(fills_path.read_text(encoding="utf-8"))

    url = (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_110m_admin_0_countries.geojson"
    )
    world = gpd.read_file(url)

    updated = []
    for i, row in world.iterrows():
        team = team_for_country(row["NAME"]) or team_for_country(row["ADMIN"])
        if team:
            fills[i] = WC_TEAM_COLORS[team]
            updated.append(f"{row['NAME']} -> {team}")

    fills_path.write_text(json.dumps(fills, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {len(updated)} tournament nations (of {len(WC_TEAM_COLORS)} teams)")


if __name__ == "__main__":
    main()
