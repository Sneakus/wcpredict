#!/usr/bin/env python3
"""
Auto-score matches from football-data.org.
Runs daily at 06:00 UTC via GitHub Actions.
Fetches finished matches and inserts results into Supabase.
The existing on_result_insert trigger handles all prediction scoring automatically.
"""

import os
import sys
import requests
from datetime import datetime, timedelta, timezone

# Configuration
FOOTBALL_DATA_API_KEY = os.environ.get('FOOTBALL_DATA_API_KEY')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

COMPETITION_ID = 'WC'

# Team name mapping: football-data.org name -> AJ's DB name
TEAM_NAME_MAP = {
    'Türkiye': 'Turkey',
    'Czech Republic': 'Czechia',
    'Korea Republic': 'South Korea',
    "Côte d'Ivoire": 'Ivory Coast',
    'Cabo Verde': 'Cape Verde',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
}

PLACEHOLDER_KEYWORDS = ['Winner', 'Runner-up', 'Loser']


def map_team_name(api_name):
    return TEAM_NAME_MAP.get(api_name, api_name)


def is_placeholder(team_name):
    return any(kw in team_name for kw in PLACEHOLDER_KEYWORDS)


def supabase_headers():
    return {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }


def fetch_finished_matches(date_from, date_to):
    """Fetch finished matches from football-data.org for date range."""
    url = f'https://api.football-data.org/v4/competitions/{COMPETITION_ID}/matches'
    headers = {'X-Auth-Token': FOOTBALL_DATA_API_KEY}
    params = {
        'dateFrom': date_from,
        'dateTo': date_to,
        'status': 'FINISHED',
    }
    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    return response.json().get('matches', [])


def get_unscored_matches_from_db():
    """Fetch matches from Supabase that are locked but don't have a result yet."""
    matches_url = f'{SUPABASE_URL}/rest/v1/matches'
    params = {'select': 'id,home_team,away_team,kickoff_at,locked'}
    response = requests.get(matches_url, headers=supabase_headers(), params=params, timeout=30)
    response.raise_for_status()
    all_matches = response.json()

    result_url = f'{SUPABASE_URL}/rest/v1/match_results'
    result_response = requests.get(
        result_url, headers=supabase_headers(),
        params={'select': 'match_id'}, timeout=30
    )
    result_response.raise_for_status()
    scored_ids = {r['match_id'] for r in result_response.json()}

    return [m for m in all_matches if m['id'] not in scored_ids]


def insert_match_result(match_id, winner, home_score, away_score):
    """Insert a match result into Supabase."""
    url = f'{SUPABASE_URL}/rest/v1/match_results'
    headers = {**supabase_headers(), 'Prefer': 'return=minimal'}
    payload = {
        'match_id': match_id,
        'winner': winner,
        'home_score': home_score,
        'away_score': away_score,
    }
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    if response.status_code >= 400:
        print(f'Error inserting result for match {match_id}: {response.status_code} {response.text}')
        return False
    return True


def log_to_automation_log(script_name, status, message, records_processed=0):
    """Log script run to automation_log table."""
    try:
        url = f'{SUPABASE_URL}/rest/v1/automation_log'
        headers = {**supabase_headers(), 'Prefer': 'return=minimal'}
        payload = {
            'script_name': script_name,
            'status': status,
            'message': message[:500],  # truncate to avoid huge logs
            'records_processed': records_processed,
        }
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception as e:
        print(f'Failed to log to automation_log: {e}')


def main():
    print(f'[{datetime.now(timezone.utc).isoformat()}] Starting auto-score script')

    if not all([FOOTBALL_DATA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
        msg = 'Missing required environment variables'
        print(msg)
        log_to_automation_log('auto_score', 'error', msg)
        sys.exit(1)

    # Fetch unscored matches from DB
    try:
        unscored = get_unscored_matches_from_db()
    except Exception as e:
        msg = f'Error fetching unscored matches from DB: {e}'
        print(msg)
        log_to_automation_log('auto_score', 'error', msg)
        sys.exit(1)

    print(f'Found {len(unscored)} unscored matches in DB')

    # Build lookup of non-placeholder unscored matches
    db_lookup = {}
    for m in unscored:
        if is_placeholder(m['home_team']) or is_placeholder(m['away_team']):
            continue
        key = (m['home_team'].lower(), m['away_team'].lower())
        db_lookup[key] = m

    print(f'Filtered to {len(db_lookup)} non-placeholder unscored matches')

    if not db_lookup:
        msg = 'No unscored real matches found'
        print(msg)
        log_to_automation_log('auto_score', 'success', msg, 0)
        return

    # Fetch recent finished matches from API
    today = datetime.now(timezone.utc).date()
    date_from = (today - timedelta(days=7)).isoformat()
    date_to = (today + timedelta(days=1)).isoformat()

    try:
        api_matches = fetch_finished_matches(date_from, date_to)
    except Exception as e:
        msg = f'Error fetching from football-data.org: {e}'
        print(msg)
        log_to_automation_log('auto_score', 'error', msg)
        sys.exit(1)

    print(f'Fetched {len(api_matches)} finished matches from football-data.org')

    scored_count = 0
    unmatched_count = 0

    for api_match in api_matches:
        home_name_api = api_match['homeTeam']['name']
        away_name_api = api_match['awayTeam']['name']
        home_name = map_team_name(home_name_api)
        away_name = map_team_name(away_name_api)

        key = (home_name.lower(), away_name.lower())
        db_match = db_lookup.get(key)

        if not db_match:
            print(f'  Skip: no DB match for {home_name} vs {away_name} (API: {home_name_api} vs {away_name_api})')
            unmatched_count += 1
            continue

        home_score = api_match['score']['fullTime']['home']
        away_score = api_match['score']['fullTime']['away']
        winner_api = api_match['score']['winner']

        if winner_api == 'HOME_TEAM':
            winner = home_name
        elif winner_api == 'AWAY_TEAM':
            winner = away_name
        elif winner_api == 'DRAW':
            winner = 'Draw'
        else:
            print(f'  Skip: unknown winner value {winner_api} for {home_name} vs {away_name}')
            continue

        success = insert_match_result(db_match['id'], winner, home_score, away_score)
        if success:
            print(f'  Scored: {home_name} {home_score}-{away_score} {away_name} (winner: {winner})')
            scored_count += 1

    summary = f'Scored {scored_count} matches; {unmatched_count} API matches had no DB equivalent'
    print(summary)
    log_to_automation_log('auto_score', 'success', summary, scored_count)


if __name__ == '__main__':
    main()
