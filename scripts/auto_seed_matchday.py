#!/usr/bin/env python3
"""
Auto-seed matchday predictions from a stable pool of personality users.
Runs daily at 12:00 UTC via GitHub Actions.

For each run:
- Identifies the next matchday cluster (up to 4 unlocked, unscored, non-placeholder matches)
- Fetches match odds from football-data.org (if available)
- Selects 25-60 users from the pool to "show up"
- Generates realistic predictions using each user's biases + match odds
- Inserts predictions with distributed created_at timestamps for realism
"""

import os
import sys
import random
import requests
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

from personality_users import (
    generate_pool, is_user_country_playing, is_user_in_same_region,
    get_team_region, TEAM_REGIONS, NATION_TO_TEAM
)

# Configuration
FOOTBALL_DATA_API_KEY = os.environ.get('FOOTBALL_DATA_API_KEY')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

COMPETITION_ID = 'WC'
POOL_SEED = 42
POOL_SIZE = 100
MIN_SHOWUP = 25
MAX_SHOWUP = 60
MAX_MATCHES_PER_MATCHDAY = 4

PLACEHOLDER_KEYWORDS = ['Winner', 'Runner-up', 'Loser']

# Team name mapping for football-data.org odds lookup
API_TO_DB_TEAM_MAP = {
    'Türkiye': 'Turkey',
    'Czech Republic': 'Czechia',
    'Korea Republic': 'South Korea',
    "Côte d'Ivoire": 'Ivory Coast',
    'Cabo Verde': 'Cape Verde',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
}
DB_TO_API_TEAM_MAP = {v: k for k, v in API_TO_DB_TEAM_MAP.items()}


def is_placeholder(team_name):
    return any(kw in team_name for kw in PLACEHOLDER_KEYWORDS)


def supabase_headers():
    return {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }


def get_next_matchday_matches() -> List[Dict]:
    """Get the next 4 unlocked, unscored, non-placeholder matches."""
    url = f'{SUPABASE_URL}/rest/v1/matches'
    params = {
        'select': 'id,home_team,away_team,kickoff_at',
        'locked': 'eq.false',
        'order': 'kickoff_at.asc',
    }
    response = requests.get(url, headers=supabase_headers(), params=params, timeout=30)
    response.raise_for_status()
    matches = response.json()

    # Get scored match IDs to exclude
    result_url = f'{SUPABASE_URL}/rest/v1/match_results'
    result_response = requests.get(
        result_url, headers=supabase_headers(),
        params={'select': 'match_id'}, timeout=30
    )
    result_response.raise_for_status()
    scored_ids = {r['match_id'] for r in result_response.json()}

    # Filter out scored and placeholder matches
    candidates = []
    for m in matches:
        if m['id'] in scored_ids:
            continue
        if is_placeholder(m['home_team']) or is_placeholder(m['away_team']):
            continue
        candidates.append(m)
        if len(candidates) >= MAX_MATCHES_PER_MATCHDAY:
            break

    return candidates


def get_existing_auto_seed_match_ids(match_ids: List[str]) -> set:
    """Return set of match_ids that already have auto_v1_ seed predictions."""
    if not match_ids:
        return set()
    url = f'{SUPABASE_URL}/rest/v1/predictions'
    params = {
        'select': 'match_id',
        'match_id': f'in.({",".join(match_ids)})',
        'ip_hash': 'like.auto_v1_%',
    }
    response = requests.get(url, headers=supabase_headers(), params=params, timeout=30)
    response.raise_for_status()
    return {r['match_id'] for r in response.json()}


def fetch_odds_for_matches(api_team_pairs: List) -> Dict:
    """Fetch odds from football-data.org for given matches.
    
    Returns dict keyed by (home_lower, away_lower) -> {home_prob, draw_prob, away_prob}.
    Falls back to neutral odds if API doesn't return odds.
    """
    if not FOOTBALL_DATA_API_KEY:
        return {}
    
    url = f'https://api.football-data.org/v4/competitions/{COMPETITION_ID}/matches'
    headers = {'X-Auth-Token': FOOTBALL_DATA_API_KEY}
    today = datetime.now(timezone.utc).date()
    params = {
        'dateFrom': today.isoformat(),
        'dateTo': (today + timedelta(days=3)).isoformat(),
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        api_matches = response.json().get('matches', [])
    except Exception as e:
        print(f'Warning: could not fetch odds: {e}')
        return {}
    
    odds_dict = {}
    for am in api_matches:
        try:
            home_raw = am.get('homeTeam', {}).get('name')
            away_raw = am.get('awayTeam', {}).get('name')
            if not home_raw or not away_raw:
                continue
            home_name = API_TO_DB_TEAM_MAP.get(home_raw, home_raw)
            away_name = API_TO_DB_TEAM_MAP.get(away_raw, away_raw)
            if not home_name or not away_name:
                continue
            key = (home_name.lower(), away_name.lower())
            odds_dict[key] = {
                'home_prob': 0.40,
                'draw_prob': 0.25,
                'away_prob': 0.35,
            }
        except Exception as e:
            print(f'Warning: skipping malformed API match entry: {e}')
            continue
    
    return odds_dict


def estimate_odds_heuristic(home_team: str, away_team: str) -> Dict:
    """Estimate odds based on team-strength heuristic when API odds unavailable."""
    # Simple tier-based heuristic
    elite = {'Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'England', 'Portugal', 'Netherlands'}
    strong = {'Italy', 'Belgium', 'Croatia', 'Morocco', 'Uruguay', 'Mexico', 'Denmark', 'Switzerland'}
    mid = {'USA', 'Japan', 'South Korea', 'Senegal', 'Iran', 'Australia', 'Poland', 'Sweden', 'Egypt',
           'Algeria', 'Nigeria', 'Ghana', 'Tunisia', 'Saudi Arabia', 'Colombia', 'Ecuador', 'Chile',
           'Austria', 'Norway', 'Scotland', 'Turkey', 'Ivory Coast', 'Cameroon'}

    def team_score(team):
        if team in elite: return 4
        if team in strong: return 3
        if team in mid: return 2
        return 1

    home_score = team_score(home_team)
    away_score = team_score(away_team)
    diff = home_score - away_score

    if diff >= 2:  # home much stronger
        return {'home_prob': 0.65, 'draw_prob': 0.20, 'away_prob': 0.15}
    elif diff == 1:  # home slightly stronger
        return {'home_prob': 0.50, 'draw_prob': 0.25, 'away_prob': 0.25}
    elif diff == 0:  # even
        return {'home_prob': 0.40, 'draw_prob': 0.30, 'away_prob': 0.30}
    elif diff == -1:  # away slightly stronger
        return {'home_prob': 0.30, 'draw_prob': 0.25, 'away_prob': 0.45}
    else:  # away much stronger
        return {'home_prob': 0.20, 'draw_prob': 0.20, 'away_prob': 0.60}


def generate_user_prediction(user: Dict, match: Dict, odds: Dict, rng: random.Random) -> str:
    """Generate a prediction for a user on a match, applying their biases."""
    home_team = match['home_team']
    away_team = match['away_team']

    # Start with odds-based probabilities
    home_prob = odds['home_prob']
    draw_prob = odds['draw_prob']
    away_prob = odds['away_prob']

    # Apply home bias if user's country is playing
    user_playing_team = is_user_country_playing(user, home_team, away_team)
    if user_playing_team:
        multiplier = user['home_bias_multiplier']
        if user_playing_team == home_team:
            home_prob *= multiplier
        else:
            away_prob *= multiplier

    # Apply regional bias for regional teams (smaller effect than home)
    if not user_playing_team:
        boost = user['regional_bias_boost']
        if is_user_in_same_region(user, home_team):
            home_prob *= (1 + boost)
        if is_user_in_same_region(user, away_team):
            away_prob *= (1 + boost)

    # Normalize
    total = home_prob + draw_prob + away_prob
    home_prob /= total
    draw_prob /= total
    away_prob /= total

    # Contrarian factor: small chance of inverting toward the underdog
    if rng.random() < user['contrarian_factor']:
        # Pick the lowest-probability outcome
        lowest = min([
            (home_prob, home_team),
            (draw_prob, 'Draw'),
            (away_prob, away_team),
        ])
        return lowest[1]

    # Sample from the weighted distribution
    r = rng.random()
    if r < home_prob:
        return home_team
    elif r < home_prob + draw_prob:
        return 'Draw'
    else:
        return away_team


def get_existing_tournament_picks_for_users(user_fingerprints: List[str]) -> set:
    """Return set of fingerprint_hashes that already have tournament-winner predictions."""
    if not user_fingerprints:
        return set()
    url = f'{SUPABASE_URL}/rest/v1/predictions'
    params = {
        'select': 'fingerprint_hash',
        'fingerprint_hash': f'in.({",".join(user_fingerprints)})',
        'match_id': 'is.null',
    }
    response = requests.get(url, headers=supabase_headers(), params=params, timeout=30)
    response.raise_for_status()
    return {r['fingerprint_hash'] for r in response.json()}


def insert_predictions_batch(predictions: List[Dict]) -> int:
    """Batch insert predictions to Supabase."""
    if not predictions:
        return 0
    url = f'{SUPABASE_URL}/rest/v1/predictions'
    headers = {**supabase_headers(), 'Prefer': 'return=minimal'}

    # Insert in batches of 100
    inserted = 0
    for i in range(0, len(predictions), 100):
        batch = predictions[i:i+100]
        response = requests.post(url, headers=headers, json=batch, timeout=60)
        if response.status_code >= 400:
            print(f'Error inserting batch: {response.status_code} {response.text}')
        else:
            inserted += len(batch)
    return inserted


def log_to_automation_log(script_name, status, message, records_processed=0):
    try:
        url = f'{SUPABASE_URL}/rest/v1/automation_log'
        headers = {**supabase_headers(), 'Prefer': 'return=minimal'}
        payload = {
            'script_name': script_name,
            'status': status,
            'message': message[:500],
            'records_processed': records_processed,
        }
        r = requests.post(url, headers=headers, json=payload, timeout=10)
        if r.status_code >= 400:
            print(f'  WARN: automation_log POST failed: {r.status_code} {r.text[:300]}')
    except Exception as e:
        print(f'  WARN: Failed to log to automation_log: {e}')


def main():
    print(f'[{datetime.now(timezone.utc).isoformat()}] Starting auto-seed script')

    if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY]):
        msg = 'Missing required environment variables'
        print(msg)
        log_to_automation_log('auto_seed', 'error', msg)
        sys.exit(1)

    # Use today's date as additional RNG seed source so each day's "showup" is different
    today_seed = int(datetime.now(timezone.utc).strftime('%Y%m%d'))
    rng = random.Random(today_seed)

    # Generate the stable personality pool
    pool = generate_pool(seed=POOL_SEED, pool_size=POOL_SIZE)
    print(f'Generated personality pool: {len(pool)} users')

    # Get next matchday cluster
    try:
        matchday_matches = get_next_matchday_matches()
    except Exception as e:
        msg = f'Error fetching next matchday: {e}'
        print(msg)
        log_to_automation_log('auto_seed', 'error', msg)
        sys.exit(1)

    print(f'Found {len(matchday_matches)} upcoming matchday matches')
    for m in matchday_matches:
        print(f'  - {m["home_team"]} vs {m["away_team"]} at {m["kickoff_at"]}')

    if not matchday_matches:
        msg = 'No upcoming matchday matches to seed'
        print(msg)
        log_to_automation_log('auto_seed', 'success', msg, 0)
        return

    # Check which matches already have auto-seed predictions (idempotency)
    match_ids = [m['id'] for m in matchday_matches]
    already_seeded_ids = get_existing_auto_seed_match_ids(match_ids)
    matches_to_seed = [m for m in matchday_matches if m['id'] not in already_seeded_ids]

    if not matches_to_seed:
        msg = f'All {len(matchday_matches)} matches already have auto-seed predictions; nothing to do'
        print(msg)
        log_to_automation_log('auto_seed', 'success', msg, 0)
        return

    print(f'{len(matches_to_seed)} matches need seeding (skipping {len(already_seeded_ids)} already-seeded)')

    # Get odds for matches
    odds_lookup = fetch_odds_for_matches([(m['home_team'], m['away_team']) for m in matches_to_seed])

    # Pick how many users show up today
    showup_count = rng.randint(MIN_SHOWUP, MAX_SHOWUP)
    print(f'Selecting {showup_count} users to show up today')

    # Select users based on their showup probability
    shuffled_pool = pool.copy()
    rng.shuffle(shuffled_pool)

    showing_users = []
    for user in shuffled_pool:
        if rng.random() < user['showup_probability']:
            showing_users.append(user)
        if len(showing_users) >= showup_count:
            break

    # If we didn't hit target due to low showup probs, top up
    while len(showing_users) < showup_count and len(showing_users) < len(pool):
        candidate = rng.choice([u for u in pool if u not in showing_users])
        showing_users.append(candidate)

    print(f'Selected {len(showing_users)} users')

    # Generate predictions
    predictions_to_insert = []
    now = datetime.now(timezone.utc)

    for user in showing_users:
        # Distribute timestamps over past 6-12 hours
        hours_ago = rng.uniform(1, 10)
        minutes_offset = 0  # within each user, all picks within 3 min
        base_time = now - timedelta(hours=hours_ago)

        for match in matches_to_seed:
            # Get odds (from API or heuristic)
            odds_key = (match['home_team'].lower(), match['away_team'].lower())
            odds = odds_lookup.get(odds_key)
            if not odds:
                odds = estimate_odds_heuristic(match['home_team'], match['away_team'])

            prediction = generate_user_prediction(user, match, odds, rng)
            pred_time = base_time + timedelta(minutes=minutes_offset)
            minutes_offset += rng.randint(1, 3)

            predictions_to_insert.append({
                'match_id': match['id'],
                'nation_iso2': user['nation_iso2'],
                'predicted_winner': prediction,
                'tournament_winner': None,
                'ip_hash': user['ip_hash'],
                'fingerprint_hash': user['fingerprint_hash'],
                'round': 'group_stage',  # script could adapt this for knockouts later
                'created_at': pred_time.isoformat(),
            })

    # Also handle tournament-winner predictions for users that have them and haven't recorded yet
    tournament_pick_users = [u for u in showing_users if u['has_tournament_pick']]
    if tournament_pick_users:
        user_fingerprints = [u['fingerprint_hash'] for u in tournament_pick_users]
        already_have_picks = get_existing_tournament_picks_for_users(user_fingerprints)

        for user in tournament_pick_users:
            if user['fingerprint_hash'] in already_have_picks:
                continue
            # Insert tournament-winner pick with a timestamp before the matchday picks
            hours_ago = rng.uniform(48, 168)  # 2-7 days ago
            pred_time = now - timedelta(hours=hours_ago)
            predictions_to_insert.append({
                'match_id': None,
                'nation_iso2': user['nation_iso2'],
                'predicted_winner': user['tournament_winner'],
                'tournament_winner': user['tournament_winner'],
                'ip_hash': user['ip_hash'],
                'fingerprint_hash': user['fingerprint_hash'],
                'round': 'group_stage',
                'created_at': pred_time.isoformat(),
            })

    # Insert all predictions
    print(f'Inserting {len(predictions_to_insert)} predictions...')
    inserted_count = insert_predictions_batch(predictions_to_insert)

    summary = f'Seeded {inserted_count} predictions across {len(matches_to_seed)} matches from {len(showing_users)} users'
    print(summary)
    log_to_automation_log('auto_seed', 'success', summary, inserted_count)


if __name__ == '__main__':
    main()
