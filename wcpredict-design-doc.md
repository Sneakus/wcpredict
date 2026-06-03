# World Cup Map — Pre-Launch Design Document
*Last updated: June 3, 2026 | Tournament starts: June 11, 2026 | Days remaining: 8*
*Live at: worldcupmap.io*

---

## Current Status

### ✅ Done
- Vercel project live at `worldcupmap.io` (and wcpredict-zeta.vercel.app legacy)
- Cloudflare proxy active, SSL valid, DDoS protection on
- Cloudflare Turnstile bot protection wired into submit flow
- Supabase database with all 5 tables (nations, matches, predictions, match_results, moderation_flags)
- 195 nations seeded with ISO2 codes and flag emojis
- 72 group stage matches seeded with correct kickoff times (UTC) — Groups A-L, all correct teams
- 24 knockout placeholder matches seeded
- RLS policies in place (public read, public insert on predictions)
- World map rendering with D3 + zoom/pan, Antarctica removed
- Two-view toggle (WC winner / Today's matches)
- UK multi-nation tooltip (all 4 nations shown on hover, England included)
- UK aggregate colour (all 4 nations combined via resolveUKColor())
- Both leaderboards:
  - Tournament pick: dynamic, all teams, top 8 shown + "show more" toggle
  - Match accuracy: top 6 nations by accuracy, post-results only
- Pick prompt overlay on map ("🏆 Add your predictions to the map 🌍")
- Tournament winner picker (48 correct 2026 qualifiers, alphabetical, with flags and colours)
- Match prediction form (today's matches only, locked state handled)
- Match locking: Supabase pg_cron every minute + server-side kickoff_at check
- Scoring trigger on match_results insert
- Personal stats tracker (/api/stats.js) — shows after 3+ scored predictions
- get_accuracy_percentile RPC function in Supabase
- FingerprintJS v4 — fingerprint hashed and stored
- IP hashing + duplicate detection per match per IP
- CF-IPCountry header stored, country_override flagged
- Cookie persistence (wcp_tournament_winner, wcp_country — 60 day expiry)
- Map colours for all 48 qualified teams wired into TEAM_COLORS
- Kit/flag-accurate colours for all 48 teams
- OG image (1200×630) + full social meta tags (og + Twitter card)
- About / How it works collapsible section
- Mobile responsive (44px tap targets, stacked panels, full-width submit)
- UTF-8/LF protection via .gitattributes (critical on Windows)
- Cache busting: app.js?v=4 in index.html

### ❌ Not built (post-launch / if traction warrants)
- AI moderation pipeline (moderation_flags table exists, Edge Function not built)
- Admin result entry UI (use Supabase SQL editor for now)
- Round-based tournament winner tracker (Section 6)
- Dynamic OG image via Satori + resvg
- AdSense (apply mid-tournament after building traffic)
- Rate limiting table (rate_limits) not created
- Auto-refresh on matchdays (currently manual refresh only)

---

## Section 1 — Submission Flow

### 1.1 Tournament Winner Pick
**Status:** ✅ Implemented
- 48-team button grid, alphabetical, with flag emoji + ISO prefix
- Cookie persistence (`wcp_tournament_winner`) — 60-day expiry
- Country selection also cookie-persisted (`wcp_country`)
- Submitted alongside match picks in same POST to `/api/submit`
- Map colours in WC Winner view driven by this data
- Post-submit: map recolours, leaderboard rebuilds, pick prompt hides

### 1.2 Match Predictions
**Status:** ✅ Implemented
- Shows today's matches only (queried by UTC date range)
- Locked matches greyed out, unclickable
- Pick buttons: home / Draw / away
- Submitted in same POST as tournament winner

### 1.3 Match Locking
**Status:** ✅ Implemented
- Layer 1: Supabase pg_cron job "lock-kickoffs" runs every minute, flips locked=true when kickoff_at <= now()
- Layer 2: api/submit.js checks both match.locked AND kickoff_at <= now() as fallback
- Layer 3: Frontend greyed-out .locked CSS class

### 1.4 Bot Protection Stack
**Status:** ✅ Fully implemented

#### Layer 1 — Cloudflare Turnstile ✅
- Site key: 0x4AAAAAADeJ5i3tyWn9PQjn
- Widget in index.html, server-side siteverify in api/submit.js
- Only works on worldcupmap.io (not wcpredict-zeta.vercel.app by design)
- TURNSTILE_SECRET_KEY set in Vercel env vars

#### Layer 2 — IP Rate Limiting ✅ (partial)
- IP hashing + duplicate check per match per IP in api/submit.js
- Global rate limiting table NOT built yet

#### Layer 3 — CF-IPCountry Location Detection ✅
- CF-IPCountry header read and stored as cf_country
- country_override = true when CF country ≠ declared nation
- flagged = true on mismatch — review only, don't block

#### Layer 4 — FingerprintJS ✅
- FingerprintJS v4 loaded in index.html
- visitorId hashed SHA-256 server-side, stored as fingerprint_hash

#### Layer 5 — AI Moderation Pipeline ❌ Not built
- moderation_flags table exists
- Edge Function not built
- Build post-launch if spam becomes a problem

---

## Section 2 — Map & Visual Features

### 2.1 World Map
**Status:** ✅ Complete
- D3 geoNaturalEarth1 projection
- Scale: width/6.3, translate: [width/2, height/2.1] (shifted up after Antarctica removal)
- Antarctica filtered from features before render
- Zoom: scaleExtent [1,8], translateExtent [[0,0],[width,height]]
- Double-click resets zoom
- Zoom control buttons: +, ⌂, −

### 2.2 UK Tooltip
**Status:** ✅ Complete
- UK blob triggers special tooltip showing all 4 nations
- resolveUKColor() aggregates picks from GB-ENG, GB-SCT, GB-WLS, GB-NIR
- Matchday view uses England as proxy for UK blob colour

### 2.3 Team Colours
**Status:** ✅ Complete — all 48 teams
All 48 qualified 2026 World Cup teams have kit/flag-accurate colours.
TEAM_COLORS built from TEAMS.forEach then WC_TEAMS.forEach (WC_TEAMS takes precedence for the 8 featured teams since TEAMS runs first).

Key colour decisions:
- Brazil: #639922 (flag green, not kit yellow)
- England: #EFEFEF (off-white, visible on dark map)
- Germany: #888780 (grey, avoids England clash)
- USA: #1B2A4A (navy, home kit is white so navy used for map visibility)
- Argentina: #75AADB (sky blue, not turquoise)
- Sweden/Ukraine: flag blue (not yellow, avoids South America cluster clash)

### 2.4 Pick Prompt Overlay
**Status:** ✅ Complete
- Positioned absolute inside #map-wrap at bottom: 16%
- Text: "🏆 Add your predictions to the map 🌍"
- Hides after successful submission (hidePickPrompt())
- Does not hide on cookie alone (user may want to make match picks)

---

## Section 3 — Result Entry & Scoring

### 3.1 Admin Result Entry
**Status:** Using Supabase SQL editor
After each match:
```sql
insert into match_results (match_id, winner, home_score, away_score)
values ('match-uuid-here', 'Brazil', 2, 0);
```

To find UUIDs for today's matches:
```sql
select id, home_team, away_team, kickoff_at
from matches
where kickoff_at::date = '2026-06-11'
order by kickoff_at;
```

### 3.2 Scoring Trigger
**Status:** ✅ Installed
Trigger `on_result_insert` on match_results fires automatically on insert, scoring all predictions for that match_id. Score = 1 if correct, 0 if wrong.

---

## Section 4 — Social & Distribution

### 4.1 OG Image / Meta Tags
**Status:** ✅ Complete
- og-image.png: 1200×630, dark background, colourful map, "World Cup Map / Who does the world back?"
- All og: and twitter: meta tags in index.html
- URLs point to worldcupmap.io

### 4.2 About Section
**Status:** ✅ Complete
Collapsible `<details>` element below submit button. Covers:
- What World Cup Map is
- How map colours work
- How accuracy leaderboard is calculated
- Privacy (no account, IP hashed)

### 4.3 Launch Distribution
**June 8-9:** Soft launch to friends/WhatsApp for initial data seeding

**June 11 (opening match — Mexico vs South Africa, 19:00 UTC):**
- Post standalone thread on r/soccer
- Comment in r/soccer opening match thread
- Post on r/worldcup and r/FIFAWC
- Twitter/X with map screenshot + #WorldCup2026 #WorldCupMap

**Reddit post title:**
"I built a live world map showing which team every country thinks will win the World Cup"

**Reddit post body:**
"With the tournament starting today I wanted to see something I couldn't find anywhere: a live map showing who fans from every country actually think will win — not betting odds, not AI predictions, just real people picking their winner.

So I built it. You pick your tournament winner and predict individual match results. Your picks get added to your country's total and the map updates in real time.

There's also a leaderboard tracking which nations are most accurate at predicting match results throughout the tournament.

No account needed: worldcupmap.io

Curious to see how it looks once people from different countries start submitting — especially whether South American countries back Brazil or Argentina, and whether African nations surprise anyone."

---

## Section 5 — Technical Debt & Cleanup

### 5.1 Environment Variables (all set in Vercel)
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_KEY` ✅
- `TURNSTILE_SECRET_KEY` ✅

Still needed post-launch:
- `ADMIN_PASSWORD` (for future moderation endpoint)

### 5.2 Cache Busting
app.js currently loaded as `app.js?v=4`. Increment v= after every deploy if users report stale behaviour.

### 5.3 Known Edge Cases
- Turnstile rejects submissions from wcpredict-zeta.vercel.app (by design — only worldcupmap.io is whitelisted)
- Windows Git may produce UTF-16 files — .gitattributes prevents this but watch for it
- Fingerprint changes if user clears cookies or uses different device — accepted limitation
- Brazil/Colombia/Ecuador are all yellow/green tones and border each other — map legibility limitation accepted

---

## Section 6 — Round-Based Tournament Winner Tracker (Post-Launch)

### 6.1 Concept
Track how world sentiment about the tournament winner changes round by round.
One tournament winner pick allowed per IP per round. At the start of each new round, a new prediction window opens.

**Rounds:** group_stage → round_of_32 → round_of_16 → quarter_final → semi_final → final

**The data story:** "After England's exit in the QF, UK support shifted from England to France" — shareable content that grows more valuable as the tournament progresses.

### 6.2 Database Changes Needed
```sql
alter table predictions add column round text default 'group_stage';
create index on predictions(round);
```

### 6.3 UI Changes Needed
- Timeline view on the leaderboard — 6 data points per team, line chart showing sentiment shift
- Admin trigger to "open" a new round
- Map shows current round's picks by default, with round selector to replay history

### 6.4 Implementation Notes
- Existing predictions get `round = 'group_stage'` retroactively
- Tournament winner pick resets between rounds (new submission required)
- Cookie: clear `wcp_tournament_winner` when new round opens
- WC Winner leaderboard shows current round only

---

## Section 7 — Personal Stats (Post-Launch)

### 7.1 Concept
Show returning users their personal prediction accuracy without requiring an account.
Uses fingerprint hash + cookie to identify returning visitors.

### 7.2 What to show
- "You've predicted X matches correctly out of Y"
- "You're in the top X% of predictors globally"
- "You're in the top X% of predictors from [your country]"
- Only shown once enough match results exist (suggest: after matchday 3+, minimum 3 scored predictions)

### 7.3 Implementation
**Status:** ✅ Built — /api/stats.js exists
- On page load, fingerprint collected, POST to /api/stats
- Stats endpoint hashes fingerprint server-side, queries predictions
- Returns correct/total, global percentile, national percentile
- #personal-stats card shown below submit button (hidden until data available)

### 7.4 Supabase RPC
**Status:** ✅ get_accuracy_percentile function installed
```sql
-- Already installed. If needed to reinstall:
create or replace function get_accuracy_percentile(
  p_fingerprint_hash text,
  p_nation_iso2 text default null
)
returns integer as $$
...
$$ language plpgsql security definer;
```

### 7.5 Notes
- Minimum 3 scored predictions before showing percentile
- Fingerprint changes on cookie clear / new device — accepted limitation
- Do not show until post matchday 3 (not enough data before then)

---

## Tournament Operations Checklist

### Before each matchday
- [ ] Verify today's matches are showing correctly on the site
- [ ] Check Vercel logs for any errors

### After each match
```sql
-- 1. Find the match UUID
select id, home_team, away_team from matches 
where home_team = 'Brazil' and away_team = 'Morocco';

-- 2. Enter the result
insert into match_results (match_id, winner, home_score, away_score)
values ('uuid-here', 'Brazil', 2, 0);

-- Scoring trigger fires automatically
```

### Monitoring
```sql
-- Flagged submissions
select * from predictions where flagged = true order by created_at desc limit 20;

-- Prediction counts by country
select nation_iso2, count(*) from predictions 
group by nation_iso2 order by count desc limit 20;

-- Total count
select count(*) from predictions;
```

---

## Priority Order for Post-Launch

### Week 1 (June 11-18) — Monitor & stabilise
- Enter match results after each game
- Monitor Vercel logs for errors
- Monitor flagged submissions
- Share map screenshots on social after matchday 1

### Week 2 (June 18-25) — Enhance if traction
- Build admin result entry UI (if SQL editor is too slow)
- Consider auto-refresh every 5 minutes on matchdays
- Apply for AdSense if traffic is meaningful
- Dynamic OG image via Satori + resvg

### Post group stage — Round tracker
- Add `round` column to predictions
- Build round-based sentiment tracker (Section 6)
- This is the most compelling mid-tournament feature

---

## Open Questions
1. Should the map auto-refresh live data during matchdays? (Suggest: every 5 minutes)
2. Monetisation if AdSense deferred? (Sponsor outreach, Patreon, portfolio piece)
3. Should there be a "most surprising pick" highlight? e.g. "3% of Brazilians back Germany"
4. Post-tournament: archive the final map as a permanent record?
5. Round-based tracker: reset tournament winner pick per round, or allow updates anytime?
6. Should the personal stats card show even before matches are scored (e.g. show pick count)?

