# World Cup Map — Design Document
*Last updated: June 6, 2026 | Tournament starts: June 11, 2026 | Days remaining: 5*
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
- Two-view toggle (WC winner / Today's matches) — repositioned to top of map, sticky overlay
- UK multi-nation tooltip (all 4 nations shown on hover, England included)
- UK aggregate colour (all 4 nations combined via resolveUKColor())
- Both leaderboards:
  - Tournament pick: dynamic, all teams, top 8 shown + "show more" toggle
  - Match accuracy: top 6 nations by accuracy, post-results only
- Pick prompt overlay on map — smart visibility logic:
  - Hides after successful submission
  - Hides on page load if tournament winner cookie exists AND no unlocked matches today
  - wcp_picked_date cookie (1-day expiry) suppresses prompt for users who already submitted today
- Tournament winner picker (48 correct 2026 qualifiers, alphabetical, hero layout, centred)
- Match prediction form (today's matches only, centred card layout, larger team names)
- Country select with gold border, centred layout
- Match locking: Supabase pg_cron every minute + server-side kickoff_at check
- Scoring trigger on match_results insert
- Personal stats tracker (/api/stats.js) — shows after 3+ scored predictions
- get_accuracy_percentile RPC function in Supabase (supports p_round parameter)
- FingerprintJS v4 — fingerprint hashed and stored
- IP hashing + duplicate detection per match per IP
- CF-IPCountry header stored, country_override flagged
- Cookie persistence (wcp_tournament_winner, wcp_country — 60 day expiry)
- Map colours for all 48 qualified teams wired into TEAM_COLORS
- Kit/flag-accurate colours for all 48 teams
- Tooltip shows percentage + vote count (e.g. "42% (7)")
- D3 country name mapping fully audited — all world-atlas names resolve to ISO2 codes
- OG image (1200×630, 108KB — well under WhatsApp's 250KB limit) + full social meta tags
- About / How it works collapsible section
- Mobile responsive (44px tap targets, stacked panels, full-width submit)
- UTF-8/LF protection via .gitattributes (critical on Windows)
- Cache busting: app.js?v=49 in index.html
- Privacy-first: no accounts, no ads, IP hashed, no raw personal data stored
- Privacy statement visible in header: "No accounts. No ads. No trackers."
- Post-submit share card modal — 1080×1920 canvas, personal framing, Twemoji flags, Web Share API
- Share card: accuracy rank badge (gold/silver/bronze medals), rivalry hook copy
- Share card: automatic consensus/contrarian/home-side framing based on data
- Round-based tournament winner tracker — DB schema, round stamping, re-pick detection, banner
- rounds table in Supabase with RLS + grant select on rounds to anon
- Personal stats panel — "My World Cup Journey" with:
  - Match chips (green/red for correct/wrong)
  - Perfect round gold treatment
  - Streak badge (🔥 N in a row)
  - Per-round percentiles (global + national)
  - Collapsible rounds (current open, past collapsed)
- Supabase keep-alive GitHub Actions cron (daily ping at 08:00 UTC — confirmed working)
- Live activity dot map — WebGL canvas overlay (raw WebGL, no library)
  - Additive blending (SRC_ALPHA, ONE) for glow effect
  - Soft radial glow in fragment shader via gl_PointCoord
  - Population-weighted city coordinates (cities.js — 11,000+ points across 52 countries)
  - Gaussian scatter within metro areas for realistic distribution
  - Dots stay locked to map on zoom/pan via D3 transform uniforms
  - On-load replay of all predictions (paginated fetch)
  - 60-second polling for new predictions
  - 2 dots drawn per prediction for density

### 🔖 Checkpoint — June 6, 2026 (pre-Poisson-disk experiment)

The dot map is in a known-good state at commit `~d5bedf0` / `app.js?v=109`. If the Poisson-disk experiment doesn't improve things, revert to this baseline:

**Working baseline:**
- 25 dots per prediction
- Jitter ±0.09° lng / ±0.07° lat (~15km spread) in `firePulse()`
- `gl_PointSize = clamp(1.8 + uK * 0.25, 1.8, 4.0)` — uniform small dots
- Fragment alpha = `0.6` with smoothstep falloff
- Additive blending (`gl.SRC_ALPHA, gl.ONE`)
- `cities.js` built from GeoNames cities1000 with Shapely per-country land clipping (0.02° erosion)
- 198 countries covered, ~18,891 base city points
- Runtime clip uses 2px erosion with `'evenodd'` fill rule
- World atlas resolution: 50m
- Pagination ordered by `id` not `created_at` (fixes Supabase pagination instability)

**Known limitations of this baseline:**
- Dots cluster around city centres (city-centric, not population-area-distributed)
- Sparse rural areas remain empty
- Doesn't fully match the "organic country fill" aesthetic of Plague Inc. or eurostat population grids

**Files involved:**
- `app.js` (rendering, clipping, shaders)
- `cities.js` (city points, regenerated via `generate_cities.py`)
- `generate_cities.py` (Python build script, requires `cities1000.txt` from GeoNames)

To revert: `git checkout d5bedf0 -- app.js cities.js` then bump cache bust and push.

### ❌ Not built (post-launch roadmap — see Post-Launch Feature Roadmap section)
- "I told you so" contrarian share card — Priority 1, Week 1
- Per-match crowd % on hover/tap in personal stats — Priority 2, Week 1
- Matchday prediction share card variant — Priority 4, Week 1
- Storyline engine — Phase 1 manual from matchday 1, Phase 2 automated from matchday 3
- Nation vs nation rivalry card — R32, June 28
- Real-world tournament results integration (elimination triggers) — QF, July 11
- "How the world changed its mind" round replay animation — R32, June 28
- Leaderboard movement arrows — Week 1
- Personal accuracy share card (Wrapped-style, end of tournament) — SF/Final
- End-of-tournament map archive
- Admin result entry UI (use Supabase SQL editor for now)
- AI moderation pipeline (moderation_flags table exists, Edge Function not built)
- Dynamic OG image via @vercel/og (Satori)
- Auto-refresh on matchdays (5-min polling, Week 1 if traction warrants)
- AdSense (deliberately deferred — see Section 4.4)

---

## Section 1 — Submission Flow

### 1.1 Tournament Winner Pick
**Status:** ✅ Implemented
- 48-team button grid, alphabetical, with flag emoji
- Hero section layout — large white title, subtitle "Pick your winner — your country gets coloured on the map"
- Active team button has blue glow (box-shadow: 0 0 10px rgba(55,138,221,0.4))
- Cookie persistence (`wcp_tournament_winner`) — 60-day expiry
- Country selection also cookie-persisted (`wcp_country`)
- Submitted alongside match picks in same POST to `/api/submit`
- Map colours in WC Winner view driven by this data
- Post-submit: map recolours, leaderboard rebuilds, pick prompt hides, share card modal appears

### 1.2 Match Predictions
**Status:** ✅ Implemented
- Shows today's matches only (queried by UTC date range)
- Centred card layout, 560px max-width, large team names (18px/600)
- Locked matches greyed out, unclickable
- Pick buttons: home / Draw / away — full-width on mobile
- Submitted in same POST as tournament winner

### 1.3 Pick Prompt Visibility Logic
**Status:** ✅ Implemented
Three-condition check on page load (after matches fetch):
1. No winner cookie → show prompt
2. Winner cookie + unlocked matches today → show prompt
3. Winner cookie + no unlocked matches today → hide prompt
4. wcp_picked_date cookie matches today → hide prompt (already submitted today)

`wcp_picked_date` cookie set on successful submit, 1-day expiry.

### 1.4 Match Locking
**Status:** ✅ Implemented
- Layer 1: Supabase pg_cron job "lock-kickoffs" runs every minute
- Layer 2: api/submit.js checks both match.locked AND kickoff_at <= now()
- Layer 3: Frontend greyed-out .locked CSS class

### 1.5 Bot Protection Stack
**Status:** ✅ Fully implemented
- Cloudflare Turnstile (site key: 0x4AAAAAADeJ5i3tyWn9PQjn) — only on worldcupmap.io
- IP hashing + duplicate check per match per IP
- CF-IPCountry stored, country_override flagged (review only, don't block)
- FingerprintJS v4 — hashed SHA-256 server-side

---

## Section 2 — Map & Visual Features

### 2.1 World Map
**Status:** ✅ Complete
- D3 geoNaturalEarth1 projection
- Scale: width/6.3, translate: [width/2, height/2.1]
- Antarctica filtered, zoom scaleExtent [1,8]
- Double-click resets zoom, zoom control buttons

### 2.2 Country Name Mapping
**Status:** ✅ Fully audited
All D3 world-atlas v2 name variants resolved. Key mappings:
- 'Dem. Rep. Congo' → 'CD', 'Dominican Rep.' → 'DO'
- 'eSwatini' → 'SZ', 'Solomon Is.' → 'SB'
- 'Guinea-Bissau' → 'GW', 'Palestine' → 'PS'

### 2.3 Team Colours
**Status:** ✅ Complete — all 48 teams
Key: Brazil #639922, England #EFEFEF, Germany #888780, USA #1B2A4A, Argentina #75AADB

### 2.4 Tooltip
**Status:** ✅ Complete
- Vote count shown alongside percentage: "42% (7)"
- UK tooltip shows all 4 nations separately

### 2.5 Live Activity Dot Map
**Status:** ✅ Built — raw WebGL canvas overlay
Inspired by the MW2/Halo live player population map. Glowing dots appear at population-weighted locations within each country, accumulating into bright clusters around cities through additive blending.

**Architecture:**
- `cities.js` — 11,000+ population-weighted gaussian scatter points across 52 countries
- Raw WebGL (no library) — single draw call renders all dots via `gl.POINTS`
- Additive blending (`gl.SRC_ALPHA, gl.ONE`) — overlapping dots sum to brightness
- Fragment shader soft radial glow via `gl_PointCoord + smoothstep`
- All dots pre-projected using D3 projection, stored in GPU buffer (`Float32Array`)
- D3 zoom transform passed as shader uniforms (uTx, uTy, uK) — dots stay locked to map
- `gl_PointSize` constant in pixels — dots don't scale with zoom level
- On-load: paginated fetch of all predictions, 2 dots drawn per prediction
- 60-second polling via `pollNewPulses()` for new submissions
- User's own submission fires immediate dots after submit

**Privacy:** Uses only country ISO2 code (public aggregate data) and team pick (public). Dot positions are population-model estimates, not user location.

**Key functions:**
- `initWebGL(width, height)` — sets up GL context, compiles shaders, enables additive blend
- `uploadDotBuffers()` — projects all dotPoints to pixel coords, uploads to GPU
- `redrawDots()` — single GL draw call, called on every zoom/pan event
- `firePulse(iso2, teamName)` — adds dot to dotPoints array
- `loadRecentPulses()` — paginated fetch of all predictions, builds dotPoints, uploads + renders
- `pollNewPulses()` — fetches new predictions since lastPulseTimestamp

---

## Section 3 — Result Entry & Scoring

### 3.1 Admin Result Entry
**Status:** Using Supabase SQL editor
```sql
-- Find match UUID
select id, home_team, away_team from matches
where kickoff_at::date = '2026-06-11' order by kickoff_at;

-- Enter result
insert into match_results (match_id, winner, home_score, away_score)
values ('uuid-here', 'Brazil', 2, 0);
-- Scoring trigger fires automatically
```

### 3.2 Scoring Trigger
**Status:** ✅ Installed
Trigger `on_result_insert` on match_results fires on insert, scores all predictions for that match_id.

---

## Section 4 — Social & Distribution Strategy

### 4.1 OG Image
**Status:** ✅ Complete — 1200×630, 108KB, full-frame map with randomised country colours

### 4.2 Primary Distribution Channels
- **WhatsApp** — primary, especially Africa. OG image must stay under 250KB.
- **Reddit** — r/soccer (8.6M), r/worldcup, r/FIFAWC. Post as interesting datapoint in match threads.
- **Twitter/X** — real-time "map just flipped" moments. #WorldCup2026 #WorldCupMap

### 4.3 Launch Plan (June 11 — opening match Mexico vs South Africa, 19:00 UTC)
1. Comment in r/soccer opening match thread with map screenshot
2. Post standalone thread on r/soccer
3. Post on r/worldcup and r/FIFAWC
4. Tweet/X with map screenshot
5. WhatsApp share to personal network

**Reddit post title:** "I built a live world map showing which team every country thinks will win the World Cup"

### 4.4 Monetisation
No ads during tournament. Privacy-first positioning is a genuine viral differentiator. Revisit post-July 19.

### 4.5 Privacy Positioning
"No accounts. No ads. No trackers." — visible in header.
About section note to add: *"Dot positions on the map are approximate, based on population distribution within your country — not your precise location."*

---

## Section 5 — Technical Infrastructure

### 5.1 Environment Variables (Vercel)
- `SUPABASE_URL` ✅, `SUPABASE_ANON_KEY` ✅, `SUPABASE_SERVICE_KEY` ✅, `TURNSTILE_SECRET_KEY` ✅

### 5.2 Cache Busting
app.js currently at `app.js?v=49`. Increment after every deploy.

### 5.3 DNS & Proxy
- Cloudflare proxy (orange cloud) on both worldcupmap.io and www CNAMEs — keep it on
- Vercel "Proxy Detected" warning is noise — ignore it
- www → worldcupmap.io 308 redirect working

### 5.4 Supabase Free Tier
- 500MB Postgres, 5GB egress/month
- Keep-alive: GitHub Actions cron daily at 08:00 UTC (confirmed working)
- rounds table: RLS enabled, `grant select on rounds to anon` applied
- If approaching limits: archive raw prediction rows to Supabase Storage as CSV

### 5.5 Known Issues
- Turnstile rejects submissions from wcpredict-zeta.vercel.app (by design)
- Flag emoji doesn't render on Windows canvas — Twemoji PNG assets used in share card
- UK subdivision flags (GB-ENG etc.) show GB flag in share card — accepted limitation
- Germany colour (#888780) washes to white in WebGL additive blend — accepted

---

## Section 6 — Share Card System

### 6.1 Current Implementation
**Status:** ✅ Built (client-side canvas, post-submit modal)
- 1080×1920 portrait canvas (WhatsApp Status / Instagram Stories native)
- Modal appears after successful submission
- Twemoji PNG flags via CDN (cross-platform, works on Windows)
- Personal framing: "I'm backing X"
- Three automatic variants:
  - **Consensus:** pick matches national majority — "X% of [Country] agrees"
  - **Contrarian:** pick differs from majority AND <35% — "I'm going against the grain 🔥"
  - **Home side:** user backs their own nation
- Accuracy rank badge: 🥇🥈🥉 for top 3, rank for top 10
- Rivalry hook copy (first person, inclusive "us" language):
  - #1: "Think anyone can top us? 👀"
  - Top 3: "We're coming for #1. Can anyone stop us?"
  - Top 10: "We're in the hunt. Can anyone catch us?"
  - Others: "Think your nation knows better? Prove it."
- Web Share API (native share sheet) with download fallback
- JPEG export at quality 0.85

### 6.2 Next Share Card Features
- "I told you so" contrarian share card — Priority 1, Week 1
- Matchday prediction card variant — Week 1
- Nation rivalry card — R32, June 28
- Personal accuracy Wrapped card — SF/Final

### 6.3 Share Card Copy Philosophy
User is the hero. Lead with identity → support with community → close with competition.

---

## Section 7 — Round-Based Tournament Winner Tracker

### 7.1 Concept
Users re-pick tournament winner at start of each round. Track global sentiment shift.

### 7.2 Architecture — Append-Only
```sql
-- predictions table has round column (default 'group_stage')
alter table predictions add column round text default 'group_stage';

-- rounds management table
create table rounds (
  id serial primary key,
  round text not null unique,
  opens_at timestamptz not null,
  is_current boolean default false
);
-- RLS enabled, grant select on rounds to anon;
```

**To open a new round:**
```sql
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```

### 7.3 Rounds Schedule
| Round | Opens |
|-------|-------|
| group_stage | June 11 (launch) |
| round_of_32 | June 28 |
| round_of_16 | July 5 |
| quarter_final | July 11 |
| semi_final | July 15 |
| final | July 19 |

### 7.4 Cookie Behaviour
- `wcp_round` cookie stores current round
- On page load: if stored round ≠ current round → clear `wcp_tournament_winner` cookie → show re-pick banner
- Banner: "🏆 The Round of 32 is set — re-pick your World Cup winner" + "Pick now" button

---

## Section 8 — Personal Stats

### 8.1 Personal Stats Panel
**Status:** ✅ Built — /api/stats.js
- Fingerprint-based identification (browser-tied, no account needed)
- Shown after minimum 3 scored predictions (history shown from first submission)
- Top stats row: correct/total, global percentile, national percentile
- "My World Cup Journey" — round-by-round history:
  - Round label (collapsible, current open)
  - My World Cup champion pick in team colour
  - Match chips: green (correct) / red (wrong) — only scored matches shown
  - Per-round percentile: "Top X% globally this round / in your country"
  - Perfect round: gold border + "⭐ Perfect round" badge
  - Streak badge: "🔥 N in a row" when N ≥ 3

### 8.2 End-of-Tournament Share Card (post-launch)
Spotify Wrapped-style: "You backed Brazil from Day 1 and were right when 71% doubted them."

---

## Section 9 — Storyline Engine (Post-Launch)

### 9.1 Concept
After every matchday, auto-identify the best shareable narrative from the data.

### 9.2 Categories
- **Accuracy:** perfect matchday, leaderboard overtake, streak, upset caller
- **Pick:** lone believer, regional unity, sentiment collapse
- **Rivalry:** direct rivalry, match preview, revenge
- **Real-world:** elimination trigger, upset aftermath

### 9.3 Implementation Phases
- **Phase 1 (manual, matchday 1-2):** Enter result → manually identify best story → post
- **Phase 2 (automated, matchday 3+):** SQL detection queries → `storylines` table → featured banner
- **Phase 3:** Feed relevant nation storyline into share card

### 9.4 Storylines Table
```sql
create table storylines (
  id serial primary key,
  type text not null,
  headline text not null,
  nation_iso2 text,
  nation_iso2_b text,
  round text,
  matchday_date date,
  score integer default 0,
  is_featured boolean default false,
  created_at timestamptz default now()
);
```

---

## Section 10 — Nation vs Nation Rivalry System (Post-Launch)

### 10.1 Accuracy Leaderboard as Bragging Rights
- Show movement arrows (↑↓) after each matchday
- "Your nation moved up X places after today's results"
- End-of-round summary shareable moment

### 10.2 Rivalry Card (R32, June 28)
Head-to-head card: Nation A (flag, accuracy rank, tournament pick) vs Nation B.
Copy: "Who knows their football?" CTA: "Settle it at worldcupmap.io"

### 10.3 Share Card Integration
- Top 3: "🥇 Nigeria — #1 most accurate nation on the map"
- Top 10: "#6 globally"
- No data yet: omit rank line entirely

---

## Tournament Operations Checklist

### Before each matchday
- [ ] Verify today's matches show correctly
- [ ] Check Vercel logs for errors
- [ ] Check prediction count is incrementing

### After each match
```sql
select id, home_team, away_team from matches where home_team = 'Brazil';
insert into match_results (match_id, winner, home_score, away_score)
values ('uuid-here', 'Brazil', 2, 0);
-- Trigger fires automatically
```

### After each matchday
- [ ] Review accuracy leaderboard movement
- [ ] Identify best storyline, post to Reddit/Twitter/WhatsApp
- [ ] Check flagged submissions spike

### At each round transition
```sql
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```
Then post "re-pick your winner" across channels.

### Monitoring queries
```sql
-- Flagged submissions
select * from predictions where flagged = true order by created_at desc limit 20;

-- Counts by country
select nation_iso2, count(*) from predictions
group by nation_iso2 order by count desc limit 20;

-- Implausible spikes
select nation_iso2, count(*) filter (where created_at > now() - interval '1 hour') as last_hour
from predictions group by nation_iso2
having count(*) filter (where created_at > now() - interval '1 hour') > 50
order by last_hour desc;

-- Accuracy leaderboard
select nation_iso2,
  sum(score) as correct,
  count(*) filter (where score is not null) as total,
  round(sum(score)::numeric / nullif(count(*) filter (where score is not null), 0) * 100) as pct
from predictions where score is not null
group by nation_iso2
having count(*) filter (where score is not null) >= 5
order by pct desc, correct desc limit 20;
```

### Decision thresholds
- DB approaching 500MB → archive raw rows to Supabase Storage
- Egress approaching 5GB → lean harder on Cloudflare CDN caching
- WhatsApp previews failing → check image size (<250KB), check Cloudflare UA whitelist
- Country spiking implausibly → tighten rate limiting, relabel as "sentiment"

---

## Post-Launch Feature Roadmap

### ✅ Completed pre-launch
- Share card modal — personal framing, Twemoji flags, accuracy rank, rivalry copy
- Round-based tournament winner tracker
- Personal stats panel with full journey history
- Supabase keep-alive GitHub Actions cron
- Privacy statement in header
- Live activity WebGL dot map
- Clean database — no test data

### Week 1 (June 11-18)

**Priority 1 — "I told you so" contrarian share card**
After result: if user backed winner when <30% of world did → special card.
- "I called it. Only 28% of the world backed Morocco. 👀"
- Needs match aggregate pick % joined into stats response
- Build alongside Priority 2 (same data needed)

**Priority 2 — Per-match crowd % on hover/tap**
On match chip hover/tap in personal stats: "62% backed Mexico · 28% South Africa · 10% Draw"

**Priority 3 — Storyline engine Phase 2 (matchday 3+)**
SQL detection queries → storylines table → featured banner above leaderboard

**Priority 4 — Matchday prediction share card**
Pre-match Stories card: user's match pick + nation's collective pick + accuracy rank

**Priority 5 — Leaderboard movement arrows**
Show ↑↓ movement after each matchday

**Priority 6 — Auto-refresh on matchdays**
5-minute polling on matchdays only

### R32 (June 28)
- "How the world changed its mind" map animation
- Nation rivalry card
- Round summary storyline

### R16 (July 5)
- "Most contrarian nation" auto-highlight
- Storyline engine automated

### QF (July 11)
- Country vs country rivalry card
- Real-world elimination integration

### SF + Final (July 15-19)
- Personal accuracy Wrapped card
- End-of-tournament map archive

### Explicitly out of scope
- Real-time websockets, user accounts, native push notifications, AdSense during tournament
