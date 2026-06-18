#!/usr/bin/env python3
"""
Auto-score matches from football-data.org.
Runs daily at 06:00 UTC via GitHub Actions.
Fetches finished matches and inserts results into Supabase.
The existing on_result_insert trigger handles all prediction scoring automatically.

Includes step-by-step diagnostic logging for clear failure debugging.
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
# Verified against actual API responses on 2026-06-17
TEAM_NAME_MAP = {
    'Türkiye': 'Turkey',
    'Czech Republic': 'Czechia',
    'Korea Republic': 'South Korea',
    "Côte d'Ivoire": 'Ivory Coast',
    'Cabo Verde': 'Cape Verde',
    'Cape Verde Islands': 'Cape Verde',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'United States': 'USA',
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


def get_all_matches_from_db():
    """Fetch all real (non-placeholder) matches with their scored status."""
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

    return all_matches, scored_ids


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
        r = requests.post(url, headers=headers, json=payload, timeout=10)
        if r.status_code >= 400:
            print(f'  WARN: automation_log POST failed: {r.status_code} {r.text[:300]}')
    except Exception as e:
        print(f'  WARN: Failed to log to automation_log: {e}')


def fail(step, msg, log_to_db=True):
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

    # STEP 1: env vars
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

    # STEP 2: football-data.org test
    print('\n[STEP 2] Testing football-data.org API...')
    try:
        url = f'https://api.football-data.org/v4/competitions/{COMPETITION_ID}/matches'
        response = requests.get(
            url,
            headers={'X-Auth-Token': FOOTBALL_DATA_API_KEY},
            params={'status': 'FINISHED'},
            timeout=30,
        )
        print(f'  HTTP status: {response.status_code}')
        if response.status_code != 200:
            print(f'  Response body: {response.text[:500]}')
            fail('STEP 2', f'football-data.org returned HTTP {response.status_code}')
        print(f'  ✓ API OK')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 2', f'{type(e).__name__}: {e}')

    # STEP 3: Supabase test
    print('\n[STEP 3] Testing Supabase connection...')
    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/matches',
            headers=supabase_headers(),
            params={'select': 'id', 'limit': '1'},
            timeout=30,
        )
        print(f'  HTTP status: {response.status_code}')
        if response.status_code != 200:
            print(f'  Response body: {response.text[:500]}')
            fail('STEP 3', f'Supabase returned HTTP {response.status_code}')
        print(f'  ✓ Supabase OK')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 3', f'{type(e).__name__}: {e}')

    # STEP 4: fetch all matches + scored ids
    print('\n[STEP 4] Fetching matches from DB...')
    try:
        all_matches, scored_ids = get_all_matches_from_db()
        print(f'  ✓ {len(all_matches)} total matches, {len(scored_ids)} already scored')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 4', f'{type(e).__name__}: {e}')

    # Build two lookups: all real matches (for distinguishing scored-vs-name-miss) and unscored only
    all_lookup = {}
    unscored_lookup = {}
    for m in all_matches:
        if is_placeholder(m['home_team']) or is_placeholder(m['away_team']):
            continue
        key = (m['home_team'].lower(), m['away_team'].lower())
        all_lookup[key] = m
        if m['id'] not in scored_ids:
            unscored_lookup[key] = m
    print(f'  {len(all_lookup)} non-placeholder matches; {len(unscored_lookup)} are unscored')

    if not unscored_lookup:
        msg = 'No unscored real matches found'
        print(f'\n{msg}')
        log_to_automation_log('auto_score', 'success', msg, 0)
        return

    # STEP 5: fetch finished from API
    print('\n[STEP 5] Fetching finished matches from football-data.org (7-day window)...')
    today = datetime.now(timezone.utc).date()
    date_from = (today - timedelta(days=7)).isoformat()
    date_to = (today + timedelta(days=1)).isoformat()
    try:
        api_matches = fetch_finished_matches(date_from, date_to)
        print(f'  ✓ {len(api_matches)} finished matches in window ({date_from} to {date_to})')
    except Exception as e:
        traceback.print_exc()
        fail('STEP 5', f'{type(e).__name__}: {e}')

    # STEP 6: score
    print('\n[STEP 6] Matching API results to DB...')
    scored_count = 0
    already_scored_count = 0
    name_miss_count = 0
    name_miss_details = []

    for api_match in api_matches:
        try:
            home_name_api = api_match['homeTeam']['name']
            away_name_api = api_match['awayTeam']['name']
            home_name = map_team_name(home_name_api)
            away_name = map_team_name(away_name_api)
            key = (home_name.lower(), away_name.lower())

            # Already scored?
            if key in all_lookup and key not in unscored_lookup:
                print(f'  ✓ Already scored: {home_name} vs {away_name}')
                already_scored_count += 1
                continue

            # Not in any DB lookup = name mismatch
            db_match = unscored_lookup.get(key)
            if not db_match:
                msg = f'NAME MISS: API "{home_name_api}" vs "{away_name_api}" -> mapped "{home_name}" vs "{away_name}", no DB equivalent'
                print(f'  ⚠ {msg}')
                name_miss_details.append(msg)
                name_miss_count += 1
                continue

            # Score it
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

            if insert_match_result(db_match['id'], winner, home_score, away_score):
                print(f'  Scored: {home_name} {home_score}-{away_score} {away_name} (winner: {winner})')
                scored_count += 1
        except Exception as e:
            print(f'  ERROR processing API match: {type(e).__name__}: {e}')
            continue

    summary = (
        f'Scored {scored_count} new; '
        f'{already_scored_count} already scored (correctly skipped); '
        f'{name_miss_count} name mismatches need mapping'
    )
    print('\n' + '=' * 60)
    print(f'SUCCESS: {summary}')
    if name_miss_details:
        print('\nName mismatches:')
        for d in name_miss_details:
            print(f'  - {d}')
    print('=' * 60)
    log_to_automation_log('auto_score', 'success', summary, scored_count)


if __name__ == '__main__':
    main()
