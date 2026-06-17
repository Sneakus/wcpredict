#!/usr/bin/env python3
"""
Auto-score matches from football-data.org.
Runs daily at 06:00 UTC via GitHub Actions.
Fetches finished matches and inserts results into Supabase.
The existing on_result_insert trigger handles all prediction scoring automatically.

This version includes step-by-step diagnostic logging to make failures easy to debug.
"""

import os
import sys
import requests
import traceback
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
        print(f'  ERROR inserting result for match {match_id}: {response.status_code} {response.text}')
        return False
    return True


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
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception as e:
        print(f'  WARN: Failed to log to automation_log: {e}')


def fail(step, msg, log_to_db=True):
    """Print failure marker, optionally log to automation_log, exit with code 1."""
    full_msg = f'FAILED at {step}: {msg}'
    print(f'\n{"=" * 60}')
    print(full_msg)
    print('=' * 60)
    if log_to_db:
        log_to_automation_log('auto_score', 'error', f'{step}: {msg}')
    sys.exit(1)


def main():
    print('=' * 60)
    print('AUTO-SCORE RUN START')
    print(f'Time (UTC): {datetime.now(timezone.utc).isoformat()}')
    print('=' * 60)

    # ---------------------------------------------------------------
    # STEP 1: Validate environment variables
    # ---------------------------------------------------------------
    print('\n[STEP 1] Checking environment variables...')
    env_vars = {
        'FOOTBALL_DATA_API_KEY': FOOTBALL_DATA_API_KEY,
        'SUPABASE_URL': SUPABASE_URL,
        'SUPABASE_SERVICE_KEY': SUPABASE_SERVICE_KEY,
    }
    missing = []
    for name, val in env_vars.items():
        if val:
            print(f'  ✓ {name} is set (length: {len(val)})')
        else:
            print(f'  ✗ {name} is MISSING or empty')
            missing.append(name)

    if missing:
        fail('STEP 1', f'missing env vars: {missing}', log_to_db=False)

    # Sanity-check SUPABASE_URL format
    if not SUPABASE_URL.startswith('https://'):
        print(f'  ⚠ WARNING: SUPABASE_URL does not start with https:// (got: {SUPABASE_URL[:30]}...)')
    if SUPABASE_URL.endswith('/'):
        print(f'  ⚠ WARNING: SUPABASE_URL has trailing slash - may cause request issues')
    try:
        domain = SUPABASE_URL.split('//')[1].split('/')[0]
        print(f'  Supabase domain: {domain}')
    except Exception:
        print(f'  ⚠ Could not parse Supabase domain from URL')

    # ---------------------------------------------------------------
    # STEP 2: Test football-data.org API
    # ---------------------------------------------------------------
    print('\n[STEP 2] Testing football-data.org API...')
    try:
        url = f'https://api.football-data.org/v4/competitions/{COMPETITION_ID}/matches'
        headers = {'X-Auth-Token': FOOTBALL_DATA_API_KEY}
        params = {'status': 'FINISHED'}
        print(f'  GET {url} (status=FINISHED)')
        response = requests.get(url, headers=headers, params=params, timeout=30)
        print(f'  HTTP status: {response.status_code}')
        if response.status_code != 200:
            print(f'  Response body (first 500 chars): {response.text[:500]}')
            fail('STEP 2', f'football-data.org returned HTTP {response.status_code}')
        data = response.json()
        total = data.get('resultSet', {}).get('count', 0)
        matches_list = data.get('matches', [])
        print(f'  ✓ API responded OK. {len(matches_list)} finished matches in response (resultSet count: {total})')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 2', f'{type(e).__name__}: {e}')

    # ---------------------------------------------------------------
    # STEP 3: Test Supabase connection
    # ---------------------------------------------------------------
    print('\n[STEP 3] Testing Supabase connection...')
    try:
        test_url = f'{SUPABASE_URL}/rest/v1/matches'
        print(f'  GET {test_url} (limit=1)')
        response = requests.get(
            test_url, headers=supabase_headers(),
            params={'select': 'id', 'limit': '1'}, timeout=30
        )
        print(f'  HTTP status: {response.status_code}')
        if response.status_code != 200:
            print(f'  Response body (first 500 chars): {response.text[:500]}')
            fail('STEP 3', f'Supabase returned HTTP {response.status_code}')
        print(f'  ✓ Supabase connection OK')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 3', f'{type(e).__name__}: {e}')

    # ---------------------------------------------------------------
    # STEP 4: Fetch unscored matches from DB
    # ---------------------------------------------------------------
    print('\n[STEP 4] Fetching unscored matches from DB...')
    try:
        unscored = get_unscored_matches_from_db()
        print(f'  ✓ Found {len(unscored)} unscored matches in DB')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 4', f'{type(e).__name__}: {e}')

    # Filter to non-placeholder matches
    db_lookup = {}
    for m in unscored:
        if is_placeholder(m['home_team']) or is_placeholder(m['away_team']):
            continue
        key = (m['home_team'].lower(), m['away_team'].lower())
        db_lookup[key] = m
    print(f'  Filtered to {len(db_lookup)} non-placeholder unscored matches')

    if not db_lookup:
        msg = 'No unscored real matches found - nothing to do'
        print(f'\n{msg}')
        log_to_automation_log('auto_score', 'success', msg, 0)
        return

    # ---------------------------------------------------------------
    # STEP 5: Fetch finished matches for scoring window
    # ---------------------------------------------------------------
    print('\n[STEP 5] Fetching finished matches from football-data.org (7-day window)...')
    today = datetime.now(timezone.utc).date()
    date_from = (today - timedelta(days=7)).isoformat()
    date_to = (today + timedelta(days=1)).isoformat()
    try:
        api_matches = fetch_finished_matches(date_from, date_to)
        print(f'  ✓ Got {len(api_matches)} finished matches in date window ({date_from} to {date_to})')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 5', f'{type(e).__name__}: {e}')

    # ---------------------------------------------------------------
    # STEP 6: Match API results to DB matches and score
    # ---------------------------------------------------------------
    print('\n[STEP 6] Matching API results to DB and scoring...')
    scored_count = 0
    unmatched_count = 0

    for api_match in api_matches:
        try:
            home_name_api = api_match['homeTeam']['name']
            away_name_api = api_match['awayTeam']['name']
            home_name = map_team_name(home_name_api)
            away_name = map_team_name(away_name_api)

            key = (home_name.lower(), away_name.lower())
            db_match = db_lookup.get(key)

            if not db_match:
                print(f'  Skip: no DB match for {home_name} vs {away_name} (API names: {home_name_api}, {away_name_api})')
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
                print(f'  Skip: unknown winner value {winner_api}')
                continue

            success = insert_match_result(db_match['id'], winner, home_score, away_score)
            if success:
                print(f'  Scored: {home_name} {home_score}-{away_score} {away_name} (winner: {winner})')
                scored_count += 1
        except Exception as e:
            print(f'  ERROR processing API match: {type(e).__name__}: {e}')
            continue

    # ---------------------------------------------------------------
    # Done
    # ---------------------------------------------------------------
    summary = f'Scored {scored_count} matches; {unmatched_count} API matches had no DB equivalent'
    print('\n' + '=' * 60)
    print(f'SUCCESS: {summary}')
    print('=' * 60)
    log_to_automation_log('auto_score', 'success', summary, scored_count)


if __name__ == '__main__':
    main()
