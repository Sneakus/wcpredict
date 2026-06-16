"""
Deterministic personality user pool for auto-seeded matchday predictions.
Uses a fixed seed so the same 100 users are generated every time.
Each user has a stable identity (ip_hash, fingerprint_hash) and voting biases.
"""

import hashlib
import random
from typing import List, Dict, Optional

# Football-engagement-weighted country tiers
TIER_1_COUNTRIES = [
    'BR', 'AR', 'DE', 'GB-ENG', 'ES', 'FR', 'IT', 'NL', 'PT', 'MX',
    'MA', 'NG', 'EG', 'JP', 'KR', 'SA', 'TR', 'BE', 'HR'
]
TIER_2_COUNTRIES = [
    'US', 'SE', 'NO', 'SN', 'DZ', 'CI', 'CM', 'GH', 'UY', 'CO',
    'CL', 'TN', 'AU', 'IR', 'QA', 'DK', 'AT', 'PL'
]
TIER_3_COUNTRIES = [
    'GB-SCT', 'GB-WLS', 'GB-NIR', 'CR', 'PA', 'NZ', 'IN', 'CN',
    'RU', 'GR', 'CH', 'CZ', 'IE', 'AE', 'JM'
]

# Regional groupings for regional bias calculations
REGIONS = {
    'south_america': ['BR', 'AR', 'UY', 'CO', 'CL', 'EC', 'PE', 'PY'],
    'europe': ['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR', 'FR', 'DE', 'IT', 'ES', 'NL',
               'PT', 'BE', 'AT', 'CH', 'DK', 'SE', 'NO', 'HR', 'CZ', 'PL', 'GR', 'IE', 'TR'],
    'africa': ['MA', 'EG', 'ZA', 'SN', 'DZ', 'TN', 'NG', 'GH', 'CI', 'CM', 'CD'],
    'asia': ['JP', 'KR', 'SA', 'IR', 'QA', 'AE', 'UZ', 'JO', 'CN', 'IN'],
    'north_america': ['US', 'CA', 'MX', 'CR', 'PA', 'JM', 'HT'],
    'oceania': ['AU', 'NZ'],
}

# Region-to-team mapping for regional bias in match predictions
TEAM_REGIONS = {
    # South America
    'Brazil': 'south_america', 'Argentina': 'south_america', 'Uruguay': 'south_america',
    'Colombia': 'south_america', 'Ecuador': 'south_america', 'Paraguay': 'south_america',
    # Europe
    'England': 'europe', 'Scotland': 'europe', 'France': 'europe', 'Germany': 'europe',
    'Italy': 'europe', 'Spain': 'europe', 'Netherlands': 'europe', 'Portugal': 'europe',
    'Belgium': 'europe', 'Austria': 'europe', 'Switzerland': 'europe', 'Denmark': 'europe',
    'Sweden': 'europe', 'Norway': 'europe', 'Croatia': 'europe', 'Czechia': 'europe',
    'Poland': 'europe', 'Greece': 'europe', 'Ireland': 'europe', 'Turkey': 'europe',
    'Bosnia and Herzegovina': 'europe',
    # Africa
    'Morocco': 'africa', 'Egypt': 'africa', 'South Africa': 'africa', 'Senegal': 'africa',
    'Algeria': 'africa', 'Tunisia': 'africa', 'Nigeria': 'africa', 'Ghana': 'africa',
    'Ivory Coast': 'africa', 'Cameroon': 'africa', 'DR Congo': 'africa', 'Cape Verde': 'africa',
    # Asia
    'Japan': 'asia', 'South Korea': 'asia', 'Saudi Arabia': 'asia', 'Iran': 'asia',
    'Qatar': 'asia', 'Uzbekistan': 'asia', 'Jordan': 'asia', 'Iraq': 'asia',
    # North America
    'USA': 'north_america', 'Canada': 'north_america', 'Mexico': 'north_america',
    'Costa Rica': 'north_america', 'Panama': 'north_america', 'Jamaica': 'north_america',
    'Haiti': 'north_america', 'Curaçao': 'north_america',
    # Oceania
    'Australia': 'oceania', 'New Zealand': 'oceania',
}

# Map nation_iso2 to team name (for home bias matching)
NATION_TO_TEAM = {
    'BR': 'Brazil', 'AR': 'Argentina', 'UY': 'Uruguay', 'CO': 'Colombia',
    'EC': 'Ecuador', 'PY': 'Paraguay', 'CL': 'Chile', 'PE': 'Peru',
    'GB-ENG': 'England', 'GB-SCT': 'Scotland', 'GB-WLS': 'Wales', 'GB-NIR': 'Northern Ireland',
    'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
    'PT': 'Portugal', 'BE': 'Belgium', 'AT': 'Austria', 'CH': 'Switzerland', 'DK': 'Denmark',
    'SE': 'Sweden', 'NO': 'Norway', 'HR': 'Croatia', 'CZ': 'Czechia', 'PL': 'Poland',
    'GR': 'Greece', 'IE': 'Ireland', 'TR': 'Turkey',
    'MA': 'Morocco', 'EG': 'Egypt', 'ZA': 'South Africa', 'SN': 'Senegal', 'DZ': 'Algeria',
    'TN': 'Tunisia', 'NG': 'Nigeria', 'GH': 'Ghana', 'CI': 'Ivory Coast', 'CM': 'Cameroon',
    'CD': 'DR Congo', 'CV': 'Cape Verde',
    'JP': 'Japan', 'KR': 'South Korea', 'SA': 'Saudi Arabia', 'IR': 'Iran',
    'QA': 'Qatar', 'UZ': 'Uzbekistan', 'JO': 'Jordan', 'IQ': 'Iraq',
    'US': 'USA', 'CA': 'Canada', 'MX': 'Mexico', 'CR': 'Costa Rica', 'PA': 'Panama',
    'HT': 'Haiti',
    'AU': 'Australia', 'NZ': 'New Zealand',
}

# Tournament-winner pool - teams that auto-seed users might pick
LIKELY_WC_WINNERS = [
    'Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'England', 'Portugal',
    'Netherlands', 'Italy', 'Belgium', 'Croatia', 'Morocco', 'Uruguay', 'Mexico',
]


def generate_pool(seed: int = 42, pool_size: int = 100) -> List[Dict]:
    """Generate a stable pool of personality users using a fixed random seed."""
    rng = random.Random(seed)
    pool = []

    # Build weighted country list
    weighted_countries = []
    for c in TIER_1_COUNTRIES:
        weighted_countries.extend([c] * 4)
    for c in TIER_2_COUNTRIES:
        weighted_countries.extend([c] * 2)
    for c in TIER_3_COUNTRIES:
        weighted_countries.extend([c] * 1)

    for i in range(pool_size):
        nation_iso2 = rng.choice(weighted_countries)

        # Generate stable hashes
        seed_str = f'auto_v1_user_{i:04d}_{nation_iso2}'
        ip_hash = 'auto_v1_' + hashlib.sha256(f'{seed_str}_ip'.encode()).hexdigest()[:24]
        fingerprint_hash = 'auto_v1_' + hashlib.sha256(f'{seed_str}_fp'.encode()).hexdigest()[:24]

        # Tournament winner prediction for 1/4 of users
        has_tournament_pick = rng.random() < 0.25
        tournament_winner = None
        if has_tournament_pick:
            user_team = NATION_TO_TEAM.get(nation_iso2)
            # 40% chance of picking own country if user's country is a qualifier
            if user_team and user_team in LIKELY_WC_WINNERS and rng.random() < 0.4:
                tournament_winner = user_team
            else:
                tournament_winner = rng.choice(LIKELY_WC_WINNERS)

        # Personality traits
        user = {
            'index': i,
            'nation_iso2': nation_iso2,
            'ip_hash': ip_hash,
            'fingerprint_hash': fingerprint_hash,
            'has_tournament_pick': has_tournament_pick,
            'tournament_winner': tournament_winner,
            'showup_probability': rng.uniform(0.3, 0.8),
            'home_bias_multiplier': rng.uniform(2.0, 4.0),  # how much they back their country
            'regional_bias_boost': rng.uniform(0.1, 0.4),   # extra weight for regional teams
            'contrarian_factor': rng.uniform(0.0, 0.12),    # chance of contrarian pick
        }
        pool.append(user)

    return pool


def is_user_country_playing(user: Dict, home_team: str, away_team: str) -> Optional[str]:
    """Check if the user's country is playing in this match. Returns the team name or None."""
    user_team = NATION_TO_TEAM.get(user['nation_iso2'])
    if user_team == home_team:
        return home_team
    if user_team == away_team:
        return away_team
    return None


def get_team_region(team_name: str) -> Optional[str]:
    """Get the region for a team."""
    return TEAM_REGIONS.get(team_name)


def is_user_in_same_region(user: Dict, team_name: str) -> bool:
    """Check if user's country is in the same region as the team."""
    user_iso = user['nation_iso2']
    team_region = TEAM_REGIONS.get(team_name)
    if not team_region:
        return False
    return user_iso in REGIONS.get(team_region, [])
