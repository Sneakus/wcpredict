# World Cup Map — Design Document
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
- get_accuracy_percentile RPC function in Supabase
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
- Cache busting: app.js?v=15 in index.html
- Privacy-first: no accounts, no ads, IP hashed, no raw personal data stored
- Post-submit share card modal — 1080×1920 canvas, personal framing, Twemoji flags, Web Share API

### ❌ Not built (prioritised post-launch roadmap in Section 8)
- Accuracy rank on share card — next immediate task
- Matchday prediction share card variant
- Storyline engine — auto-detects shareable narratives after each matchday
- Nation vs nation rivalry cards
- Real-world tournament results integration (team eliminated = map update trigger)
- Round-based tournament winner tracker (Section 6)
- "How the world changed its mind" round replay animation
- Personal accuracy share card (Wrapped-style, end of tournament)
- Admin result entry UI (use Supabase SQL editor for now)
- AI moderation pipeline (moderation_flags table exists, Edge Function not built)
- Dynamic OG image via @vercel/og (Satori)
- Auto-refresh on matchdays (currently manual refresh only)
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

`wcp_picked_date` cookie set on successful submit, 1-day expiry. Clears naturally overnight so next matchday prompt reappears.

### 1.4 Match Locking
**Status:** ✅ Implemented
- Layer 1: Supabase pg_cron job "lock-kickoffs" runs every minute, flips locked=true when kickoff_at <= now()
- Layer 2: api/submit.js checks both match.locked AND kickoff_at <= now() as fallback
- Layer 3: Frontend greyed-out .locked CSS class

### 1.5 Bot Protection Stack
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

**Vote integrity note:** With no accounts, determined manipulation is possible. Mitigations are in place (Turnstile, IP deduplication, fingerprint, CF-IPCountry). Present all figures as "fan sentiment" not a scientific poll. Monitor for sudden implausible country spikes via the flagged submissions query.

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

### 2.2 Country Name Mapping
**Status:** ✅ Fully audited
COUNTRY_NAME_TO_ISO covers all D3 world-atlas v2 name variants. Key resolved mismatches:
- 'Dem. Rep. Congo' → 'CD'
- 'Dominican Rep.' → 'DO'
- 'eSwatini' → 'SZ' (also mapped 'Swaziland')
- 'Solomon Is.' → 'SB'
- 'Guinea-Bissau' → 'GW'
- 'Palestine' → 'PS'
- Disputed/unrecognised territories → null (render as dark, not selectable)

### 2.3 UK Tooltip
**Status:** ✅ Complete
- UK blob triggers special tooltip showing all 4 nations
- resolveUKColor() aggregates picks from GB-ENG, GB-SCT, GB-WLS, GB-NIR
- Matchday view uses England as proxy for UK blob colour

### 2.4 Team Colours
**Status:** ✅ Complete — all 48 teams
Key colour decisions:
- Brazil: #639922 (flag green, not kit yellow)
- England: #EFEFEF (off-white, visible on dark map)
- Germany: #888780 (grey, avoids England clash)
- USA: #1B2A4A (navy, home kit is white so navy used for map visibility)
- Argentina: #75AADB (sky blue, not turquoise)
- Sweden/Ukraine: flag blue (not yellow, avoids South America cluster clash)

### 2.5 Tooltip
**Status:** ✅ Complete
- Shows top picks with percentage bars
- Vote count shown alongside percentage in muted smaller text: e.g. "42% (7)"
- UK tooltip shows all 4 nations separately

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

### 3.3 Real-World Tournament Results Integration (Post-Launch)
When a team is eliminated, this is a high-emotion moment that should trigger automatic behaviour on the site:
- The eliminated team's supporters need a prompt to re-pick their tournament winner
- The map should visually reflect the sentiment shift
- The storyline engine (Section 9) should detect and surface the narrative ("After France's exit, 60% of their backers switched to Brazil")
- Implementation: add an `eliminated_at` column to a `teams` table, populated manually after each knockout match. Frontend checks this and prompts re-pick if the user's tournament pick has been eliminated.

---

## Section 4 — Social & Distribution Strategy

### 4.1 OG Image / Meta Tags
**Status:** ✅ Complete
- og-image.png: 1200×630, 108KB, full-frame colourful map with randomised country colours
- All og: and twitter: meta tags in index.html
- URLs point to worldcupmap.io

### 4.2 Primary Distribution Channels

**WhatsApp — primary channel, especially Africa**
WhatsApp dominates in Nigeria, Kenya, South Africa, Ghana (Egypt is the Facebook exception).
- OG image must stay under 250KB or WhatsApp silently drops the preview for 7 days
- WhatsApp share button on the share card (green, prominent)
- Shares travel through groups and Status — high trust, high click-through
- Portrait 9:16 card fills WhatsApp Status natively

**Reddit — second channel for initial spike**
- r/soccer (8.6M members), r/worldcup, r/FIFAWC
- Post the interesting datapoint as an image in match threads, not bare promo links
- Best moment: map screenshot in opening match thread

**Twitter/X — real-time moments**
- Best for "the map just flipped" after big upsets and storyline moments
- Hashtags: #WorldCup2026 #WorldCupMap

### 4.3 Launch Distribution Plan

**June 8-9:** Soft launch to friends/WhatsApp for initial data seeding

**June 11 (opening match — Mexico vs South Africa, 19:00 UTC):**
1. Comment in r/soccer opening match thread with map screenshot
2. Post standalone thread on r/soccer
3. Post on r/worldcup and r/FIFAWC
4. Tweet/X with map screenshot + #WorldCup2026 #WorldCupMap
5. WhatsApp share to personal network

**Reddit post title:**
"I built a live world map showing which team every country thinks will win the World Cup"

**Reddit post body:**
"With the tournament starting today I wanted to see something I couldn't find anywhere: a live map showing who fans from every country actually think will win — not betting odds, not AI predictions, just real people picking their winner.

So I built it. You pick your tournament winner and predict individual match results. Your picks get added to your country's total and the map updates in real time.

There's also a leaderboard tracking which nations are most accurate at predicting match results throughout the tournament.

No account needed. No ads. No tracking: worldcupmap.io"

### 4.4 Monetisation Decision
**Decision: no ads for the duration of the tournament.**
Rationale: privacy-first, ad-free positioning is a genuine viral differentiator. Revisit post-July 19.

### 4.5 Privacy Positioning
**"No accounts. No ads. No trackers."** — visible on the page.
Trust is a sharing prerequisite. People share things they're comfortable putting their name behind.

---

## Section 5 — Technical Infrastructure

### 5.1 Environment Variables (all set in Vercel)
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_KEY` ✅
- `TURNSTILE_SECRET_KEY` ✅

### 5.2 Cache Busting
app.js currently loaded as `app.js?v=15`. Increment v= after every deploy.

### 5.3 DNS & Proxy
- Cloudflare proxy (orange cloud) active on both worldcupmap.io and www CNAMEs — keep it on
- Vercel shows "Proxy Detected" warning — ignore it, Cloudflare protection is preferable
- www → worldcupmap.io 308 redirect working

### 5.4 Supabase Free Tier Limits
- 500MB Postgres storage cap
- 5GB egress/month
- Project pauses after 7 days inactivity — set up GitHub Actions keep-alive cron
- If approaching limits: archive raw prediction rows to Supabase Storage as CSV, keep only aggregates

### 5.5 Known Edge Cases
- Turnstile rejects submissions from wcpredict-zeta.vercel.app (by design)
- Flag emoji doesn't render on Windows canvas — Twemoji PNG assets used instead
- UK subdivision flags (GB-ENG etc.) show GB flag in share card — accepted limitation
- Brazil/Colombia/Ecuador colour clash on map — accepted limitation
- eSwatini shown as "eSwatini" by D3 — cosmetic, not worth fixing

---

## Section 6 — Share Card System

### 6.1 Current Implementation
**Status:** ✅ Built (client-side canvas, post-submit modal)
- 1080×1920 portrait canvas (WhatsApp Status / Instagram Stories native format)
- Modal pop-up appears immediately after successful submission
- Twemoji PNG flag images loaded via CDN (cross-platform, works on Windows)
- Personal framing: "I'm backing X" not "Country backs X"
- Three automatic copy variants based on data:
  - **Consensus:** user's pick matches national majority — shows national % + "of [Country] agrees"
  - **Contrarian:** user's pick differs from majority AND is <35% of their country — "I'm going against the grain 🔥"
  - **Home side:** user backs their own nation — "I'm backing the home side 🏠"
- Web Share API (native share sheet on mobile) with download fallback for desktop
- Team colour contrast check — muted colours (e.g. Germany grey) fall back to white text + blue accent
- JPEG export at quality 0.85, ~300-500KB

### 6.2 Next Additions to Share Card

**Accuracy rank badge (immediate — next task):**
Add the nation's current accuracy rank to the card. This turns every share into a competitive statement.
- "🏆 Nigeria: #3 most accurate nation on the map"
- Only show once enough scored predictions exist (matchday 3+)
- Position: below the percentage, above the global hook line

**Matchday prediction card variant (Week 1):**
A separate card for match predictions, designed for pre-match Stories posting.
- Shows: user's pick for today's match, their nation's collective pick for that match, nation's current accuracy rank
- Posted before kickoff ("I'm backing Brazil tonight — Nigeria calls it too")
- Revisited after the result with outcome added

**Nation rivalry card (R32, June 28):**
Head-to-head comparison card between two nations.
- Triggered by: user's nation vs an opponent in the knockout rounds
- Shows: each nation's tournament pick, accuracy rank, and match prediction
- Copy: "🇳🇬 Nigeria vs 🇩🇪 Germany — who knows their football?"

### 6.3 Share Card Copy Philosophy
The card must feel like the **user is speaking**, not the data reporting. The user is always the hero.
- Lead with identity (flag + "I'm backing X")
- Support with community (national %)
- Close with competition (accuracy rank or global hook)
- Invite response ("Think your nation knows better?")

The contrarian framing is hypothesised to be more viral than consensus — it's a bolder identity claim and invites debate. Monitor share rates once real data flows.

---

## Section 7 — Round-Based Tournament Winner Tracker

### 7.1 Concept
At the start of each new round, users re-pick their tournament winner. Track how global sentiment shifts round by round as teams are eliminated.

**The data story:** "After Argentina's exit in the QF, South American support shifted to Brazil." This grows more compelling with every round.

**Rounds (6 windows):**
| Round | Opens |
|-------|-------|
| group_stage | June 11 (launch) |
| round_of_32 | June 28 |
| round_of_16 | July 5 |
| quarter_final | July 11 |
| semi_final | July 15 |
| final | July 19 |

### 7.2 Architecture — Append-Only Model
Never delete or mutate prior rounds. The `round` column is the versioning mechanism.

```sql
alter table predictions add column round text default 'group_stage';
create index on predictions(round);

create table rounds (
  id serial primary key,
  round text not null unique,
  opens_at timestamptz not null,
  is_current boolean default false
);

insert into rounds (round, opens_at, is_current) values
  ('group_stage',  '2026-06-11 19:00:00+00', true),
  ('round_of_32',  '2026-06-28 00:00:00+00', false),
  ('round_of_16',  '2026-07-05 00:00:00+00', false),
  ('quarter_final','2026-07-11 00:00:00+00', false),
  ('semi_final',   '2026-07-15 00:00:00+00', false),
  ('final',        '2026-07-19 00:00:00+00', false);
```

To open a new round:
```sql
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```

### 7.3 Cookie Behaviour
- When a new round opens, clear `wcp_tournament_winner` cookie so users re-pick
- New round detection: compare current round from API against `wcp_round` cookie
- If different, clear winner cookie and prompt re-pick with a banner

### 7.4 UI Changes Needed
- Round selector on the map — "Viewing: Group Stage ▾" to replay history
- "How the world changed its mind" animated transition between rounds
- Banner when new round opens: "The Round of 32 is set — re-pick your World Cup winner"

---

## Section 8 — Personal Stats

### 8.1 Implementation
**Status:** ✅ Built — /api/stats.js
- Fingerprint collected on load, POST to /api/stats
- Returns correct/total, global percentile, national percentile
- Shown after minimum 3 scored predictions

### 8.2 End-of-Tournament Share Card
Spotify Wrapped-style personal summary at tournament end:
- "You backed Brazil from Day 1 and were right when 71% doubted them"
- "You correctly predicted X/Y matches — top Z% globally"
- Canvas-generated, one-tap share to WhatsApp/Twitter

---

## Section 9 — Storyline Engine

### 9.1 Concept
The most important retention and virality feature. After every matchday, the system automatically identifies the best shareable narrative from the data and surfaces it on the site and in share cards.

**The goal:** every matchday has a story. Every story has a share card. Every share card brings people back.

### 9.2 Storyline Categories

**Accuracy storylines (most shareable — triggers national pride):**
- Perfect matchday: "🇳🇬 Nigeria called every result correctly today"
- Leaderboard overtake: "🇧🇷 Brazil just overtook 🇩🇪 Germany in the accuracy table"
- Streak: "🇬🇭 Ghana have been #1 for 3 matchdays in a row"
- Collapse: "🇫🇷 France had the worst matchday of the tournament — from #2 to #7"
- Upset caller: "🇯🇵 Japan were the only nation that backed Morocco to beat Spain"

**Pick storylines (drives map interest):**
- Lone believer: "🇫🇷 France is the only nation still backing themselves"
- Regional unity: "Every African nation on the map backs the same team 🌍"
- Sentiment collapse: "After today's result, Argentina lost 40% of their global support"
- Contrarian nation: "🇬🇭 Ghana is the only African nation not backing an African team"

**Rivalry storylines (nation vs nation — most emotionally charged):**
- Direct rivalry: "🇳🇬 Nigeria leads 🇬🇭 Ghana by 2 points in the accuracy table"
- Match preview: "Tonight: 🇳🇬 Nigeria vs 🇩🇪 Germany — their fans disagree on the winner"
- Revenge: "🇦🇷 Argentina fans called Ghana wrong yesterday — Ghana fans return the favour tonight"

**Real-world results storylines (highest emotion, drives immediate sharing):**
- Elimination trigger: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England are out. 67% of England fans backed them — time to re-pick"
- Upset aftermath: "The world didn't see that coming. Only 3% backed Morocco here"
- Giant killer: "🇲🇦 Morocco just became the map's most backed African team"

### 9.3 Implementation Architecture

**Phase 1 — Manual (launch through matchday 3):**
After entering each match result in the SQL editor, manually identify the best story and post it. This tells you what stories actually exist before automating.

**Phase 2 — Storyline detection queries (matchday 3+):**
A set of SQL queries run after each result is entered. Each query scores a candidate story. The highest score wins and is written to a `storylines` table.

```sql
-- Example: detect perfect matchday by nation
select 
  p.nation_iso2,
  count(*) as total_picks,
  sum(p.score) as correct,
  md.matchday_date
from predictions p
join matches m on p.match_id = m.id
join (select date_trunc('day', kickoff_at) as matchday_date, max(kickoff_at) as last_kickoff
      from matches where locked = true group by 1) md 
  on date_trunc('day', m.kickoff_at) = md.matchday_date
where p.score is not null
group by p.nation_iso2, md.matchday_date
having sum(p.score) = count(*) and count(*) >= 3
order by count(*) desc;
```

**Storylines table:**
```sql
create table storylines (
  id serial primary key,
  type text not null,          -- 'perfect_matchday', 'overtake', 'lone_believer', etc.
  headline text not null,      -- "🇳🇬 Nigeria called every result correctly today"
  nation_iso2 text,            -- primary nation (for filtering on share card)
  nation_iso2_b text,          -- secondary nation (for rivalry storylines)
  round text,
  matchday_date date,
  score integer default 0,     -- interestingness score
  is_featured boolean default false,
  created_at timestamptz default now()
);
```

**Phase 3 — Frontend integration:**
- Featured storyline banner appears above the leaderboard on matchdays
- Share card pulls the most relevant storyline for the user's nation
- If user's nation has a storyline (e.g. Nigeria perfect matchday), their card carries it as a badge
- If no nation-specific storyline, fall back to the global featured story

### 9.4 Storyline Scoring Rules
Higher score = more likely to be featured:

| Story type | Base score | Multipliers |
|-----------|------------|-------------|
| Perfect matchday | 80 | +20 if nation is in top 5 accuracy, +10 per match in the day |
| Leaderboard overtake | 70 | +20 if top 3 involved |
| Lone believer | 65 | +30 if team wins the match |
| Elimination sentiment shift | 90 | Always high — real tournament event |
| Regional unity/division | 60 | |
| Streak (#1 for N days) | 50 + N*10 | |
| Upset caller (only nation) | 75 | |
| Rivalry (points gap narrows) | 55 | |

### 9.5 Real-World Results Integration
The storyline engine must be aware of real tournament results, not just prediction accuracy.
- Add `wc_result` column to matches: 'home_win' | 'draw' | 'away_win' | null
- This is the actual result (not predictions) — populated when entering match_results
- Storylines can then cross-reference: who picked the upset, which nation's pick got eliminated, etc.
- Eliminated teams trigger a forced re-pick prompt — highest urgency storyline type

---

## Section 10 — Nation vs Nation Rivalry System

### 10.1 Concept
Football is tribal. The accuracy leaderboard already creates implicit rivalry — this section makes it explicit and shareable.

**The core mechanic:** nations compete to be the most accurate football nation on the map. When a nation moves up or down the leaderboard, that's a shareable moment. When two nations are separated by one correct call, that's a rivalry.

### 10.2 Rivalry Card (R32, June 28)
A head-to-head comparison card between two nations, auto-generated for knockout matches.

Layout:
- Left column: Nation A (user's nation) — flag, accuracy rank, tournament pick, match prediction
- Right column: Nation B (opponent) — same
- Centre: "Who knows their football?"
- CTA: "Settle it at worldcupmap.io"

Triggered automatically when:
- A knockout match involves a team from the user's nation's region
- The user's nation and a rival nation have picks for the same match
- Manually surfaced as a featured storyline

### 10.3 Accuracy Leaderboard as Bragging Rights
The accuracy leaderboard needs to feel like a live league table, not a static list.
- Show movement arrows (↑↓) on the leaderboard
- "Your nation moved up X places after today's results"
- After each matchday, the leaderboard update is itself a shareable moment
- End-of-round summary: "Group Stage standings — which nation knows their football?"

### 10.4 Share Card Integration
Every share card should carry the nation's accuracy rank once sufficient data exists (matchday 3+):
- Top 3: "🏆 Nigeria — #1 most accurate nation on the map"
- Top 10: "🇳🇬 Nigeria — #6 globally"
- Dropped: "🇩🇪 Germany — fell to #8 today"
- No data yet: omit rank line entirely

---

## Tournament Operations Checklist

### Before each matchday
- [ ] Verify today's matches show correctly on the site
- [ ] Check Vercel logs for any errors
- [ ] Check prediction count is incrementing

### After each match
```sql
-- 1. Find the match UUID
select id, home_team, away_team from matches 
where home_team = 'Brazil' and away_team = 'Morocco';

-- 2. Enter the result
insert into match_results (match_id, winner, home_score, away_score)
values ('uuid-here', 'Brazil', 2, 0);
-- Scoring trigger fires automatically

-- 3. Run storyline detection queries (Phase 2 onwards)
-- 4. Manually review and feature the best story
```

### After each matchday (full day complete)
- [ ] Review accuracy leaderboard for movement
- [ ] Identify best storyline from the day
- [ ] Post featured story to Reddit/Twitter/WhatsApp
- [ ] Check for any flagged submissions spike

### At each round transition
```sql
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```
- Clear `wcp_tournament_winner` via frontend round-change logic
- Post "re-pick your winner" prompt across all channels
- Publish round summary storyline ("Group Stage: which nation called it best?")

### Monitoring queries
```sql
-- Flagged submissions
select * from predictions where flagged = true order by created_at desc limit 20;

-- Prediction counts by country
select nation_iso2, count(*) from predictions 
group by nation_iso2 order by count desc limit 20;

-- Total count
select count(*) from predictions;

-- Implausible country spikes
select nation_iso2, count(*), 
  count(*) filter (where created_at > now() - interval '1 hour') as last_hour
from predictions 
group by nation_iso2 
having count(*) filter (where created_at > now() - interval '1 hour') > 50
order by last_hour desc;

-- Accuracy leaderboard
select nation_iso2, 
  sum(score) as correct,
  count(*) filter (where score is not null) as total,
  round(sum(score)::numeric / nullif(count(*) filter (where score is not null), 0) * 100) as pct
from predictions
where score is not null
group by nation_iso2
having count(*) filter (where score is not null) >= 5
order by pct desc, correct desc
limit 20;
```

### Decision thresholds
- DB approaching 500MB → archive raw rows to Supabase Storage, keep aggregates only
- Egress approaching 5GB/month → lean harder on Cloudflare CDN caching
- WhatsApp previews failing → check image size (<250KB), check Cloudflare isn't blocking WhatsApp crawler UA
- Single country spiking implausibly → tighten rate limiting, flag for review, relabel as "sentiment"

---

## Post-Launch Feature Roadmap

### Immediate (before or on June 11)
1. **Accuracy rank on share card** — one line, big impact, already have the data
2. **Clean up test data** from Supabase before launch

### Week 1 — Group stage (June 11-18): monitor and seed storylines
- Enter match results after each game
- Monitor Vercel logs and flagged submissions
- Manually identify and post the best storyline after each matchday
- Share map screenshots on social

### Week 2 — Group stage (June 18-27): enhance if traction
- Build storyline detection queries (Section 9.3 Phase 2)
- Add matchday prediction share card variant
- Add leaderboard movement arrows
- Consider auto-refresh every 5 minutes on matchdays
- Featured storyline banner on the site

### R32 opening (June 28): rivalry features
- Round-based tracker live (Section 7)
- "How the world changed its mind" map animation
- Nation rivalry card
- Round summary storyline post

### R16 opening (July 5): contrarian features
- "Most contrarian nation" auto-highlight
- Storyline engine running automatically

### QF opening (July 11): head-to-head
- Country vs country rivalry card
- Real-world elimination integration fully live

### SF + Final (July 15-19): personal wrap-up
- Personal accuracy share card (Wrapped-style)
- End-of-tournament map archive

### Explicitly out of scope
- Real-time websockets
- User accounts or auth
- Native push notifications
- AdSense during the tournament
