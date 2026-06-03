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
- OG image (1200×630, 50KB — well under WhatsApp's 250KB limit) + full social meta tags
- About / How it works collapsible section
- Mobile responsive (44px tap targets, stacked panels, full-width submit)
- UTF-8/LF protection via .gitattributes (critical on Windows)
- Cache busting: app.js?v=12 in index.html
- Privacy-first: no accounts, no ads, IP hashed, no raw personal data stored

### ❌ Not built (prioritised post-launch roadmap in Section 8)
- Shareable image cards (WhatsApp/Twitter) — **highest priority post-launch**
- Round-based tournament winner tracker (Section 6)
- "How the world changed its mind" round replay animation
- "Most contrarian nation" auto-highlight
- Country vs country head-to-head card
- Personal accuracy share card (Wrapped-style end of tournament)
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
- Post-submit: map recolours, leaderboard rebuilds, pick prompt hides

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
- 'Dem. Rep. Congo' → 'CD' (atlas uses abbrev, not 'DR Congo')
- 'Dominican Rep.' → 'DO'
- 'eSwatini' → 'SZ' (atlas uses lowercase e; also mapped 'Swaziland')
- 'Solomon Is.' → 'SB'
- 'Guinea-Bissau' → 'GW' (hyphen variant)
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

---

## Section 4 — Social & Distribution Strategy

### 4.1 OG Image / Meta Tags
**Status:** ✅ Complete
- og-image.png: 1200×630, 50KB (well under WhatsApp's 250KB silent drop threshold)
- All og: and twitter: meta tags in index.html
- URLs point to worldcupmap.io
- Note for future: composition could be tightened (current has significant dead black space on left). Not urgent for launch.

### 4.2 Primary Distribution Channels

**WhatsApp — primary channel, especially Africa**
WhatsApp is the dominant sharing platform in Nigeria, Kenya, South Africa, Ghana (Egypt is the Facebook exception). Key implications:
- OG image must stay under 250KB or WhatsApp silently drops the preview and caches the failure for 7 days
- WhatsApp share button should be prominent (pre-filled text + link)
- Every shareable URL must have correct server-rendered OG tags (WhatsApp crawler doesn't run JS)
- Shares travel through groups and Status — high trust, high click-through

**Reddit — second channel for initial spike**
- r/soccer (8.6M members), r/worldcup, r/FIFAWC
- Do not post bare promo links — post the interesting datapoint as an image in match threads
- Best moment: striking "what the world thinks right now" map image in opening match thread
- Comment in Daily Discussion Threads throughout tournament

**Twitter/X — real-time moments**
- Best for "the map just flipped" after big upsets
- Punchy superlative + map screenshot + link
- Hashtags: #WorldCup2026 #WorldCupMap

### 4.3 Launch Distribution Plan

**June 8-9:** Soft launch to friends/WhatsApp for initial data seeding

**June 11 (opening match — Mexico vs South Africa, 19:00 UTC):**
1. Comment in r/soccer opening match thread with map screenshot
2. Post standalone thread on r/soccer
3. Post on r/worldcup and r/FIFAWC
4. Tweet/X with map screenshot + #WorldCup2026 #WorldCupMap
5. WhatsApp share to personal network with the shareable card (once built)

**Reddit post title:**
"I built a live world map showing which team every country thinks will win the World Cup"

**Reddit post body:**
"With the tournament starting today I wanted to see something I couldn't find anywhere: a live map showing who fans from every country actually think will win — not betting odds, not AI predictions, just real people picking their winner.

So I built it. You pick your tournament winner and predict individual match results. Your picks get added to your country's total and the map updates in real time.

There's also a leaderboard tracking which nations are most accurate at predicting match results throughout the tournament.

No account needed. No ads. No tracking: worldcupmap.io

Curious to see how it looks once people from different countries start submitting — especially whether South American countries back Brazil or Argentina, and whether African nations surprise anyone."

### 4.4 Monetisation Decision
**Decision: no ads, at least for the duration of the tournament.**

Rationale:
- Privacy-first, ad-free positioning is a genuine viral differentiator — people share things they're comfortable putting their name behind
- Ads create friction and signal commercial intent, which damages trust especially in markets where data harvesting is a concern
- AdSense would likely be rejected anyway on a new site with no traffic history
- The tournament is 39 days — optimise for virality and user growth, not CPM revenue

Post-tournament options: sponsor outreach, portfolio piece, Patreon if there's a community. Revisit after July 19.

### 4.5 Privacy Positioning
**"No accounts. No ads. No trackers."** — make this visible on the page.

This is a selling point, not just an ethical stance. People are more likely to share something they trust. Concrete actions:
- Add the three-line privacy statement visibly on the page (not just in the About section)
- Keep the About section's privacy explanation clear and plain-language
- Do not add any third-party analytics scripts that set cookies or fingerprint users

---

## Section 5 — Technical Infrastructure

### 5.1 Environment Variables (all set in Vercel)
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_KEY` ✅
- `TURNSTILE_SECRET_KEY` ✅

Still needed post-launch:
- `ADMIN_PASSWORD` (for future moderation endpoint)

### 5.2 Cache Busting
app.js currently loaded as `app.js?v=12`. Increment v= after every deploy.

### 5.3 DNS & Proxy
- Cloudflare proxy (orange cloud) active on both worldcupmap.io and www CNAMEs — keep it on
- Vercel shows "Proxy Detected" warning — ignore it, Cloudflare protection is preferable
- www → worldcupmap.io 308 redirect working
- Whitelist `facebookexternalhit` and `WhatsApp/2.x` user agents in Cloudflare if OG previews fail

### 5.4 Supabase Free Tier Limits
- 500MB Postgres storage cap
- 5GB egress/month
- Project pauses after 7 days inactivity (set up a keep-alive ping via GitHub Actions cron)
- Silent space hogs to watch: `net._http_response`, `supabase_functions.hooks` — run VACUUM if approaching limit
- If approaching limits: archive raw prediction rows to Supabase Storage as CSV, keep only aggregates

### 5.5 Known Edge Cases
- Turnstile rejects submissions from wcpredict-zeta.vercel.app (by design — only worldcupmap.io is whitelisted)
- Windows Git may produce UTF-16 files — .gitattributes prevents this but watch for it
- Fingerprint changes if user clears cookies or uses different device — accepted limitation
- Brazil/Colombia/Ecuador are all yellow/green tones and border each other — map legibility limitation accepted
- eSwatini displayed as "eSwatini" by D3 (unconventional lowercase e) — cosmetic, not worth fixing

---

## Section 6 — Round-Based Tournament Winner Tracker

### 6.1 Concept
Track how world sentiment about the tournament winner changes round by round.
At the start of each new round, a new prediction window opens. Users re-pick their tournament winner.

**The data story:** "After Argentina's exit in the QF, South American support shifted to Brazil" — this grows more compelling with every round and is the site's most ownable recurring shareable moment.

**Rounds (6 windows):**
| Round | Opens | 
|-------|-------|
| group_stage | June 11 (launch) |
| round_of_32 | June 28 |
| round_of_16 | July 5 |
| quarter_final | July 11 |
| semi_final | July 15 |
| final | July 19 |

### 6.2 Architecture — Append-Only Model
**Never delete or mutate prior rounds.** The `round` column is the versioning mechanism. New round = new rows, old rows untouched.

Database changes needed:
```sql
alter table predictions add column round text default 'group_stage';
create index on predictions(round);
-- Existing predictions automatically get round = 'group_stage' via the default
```

Round management table:
```sql
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

To open a new round (run manually in SQL editor at round start):
```sql
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```

### 6.3 Cookie Behaviour
- When a new round opens, clear `wcp_tournament_winner` cookie so users are prompted to re-pick
- `wcp_picked_date` handles match prediction suppression separately — unaffected
- New round detection: on page load, compare the current round from the API against a `wcp_round` cookie. If different, clear the winner cookie and prompt re-pick

### 6.4 UI Changes Needed
- Round selector / scrubber on the map — "Viewing: Group Stage ▾" dropdown to replay history
- "How the world changed its mind" view — animated transition between round snapshots
- WC Winner leaderboard shows current round by default, with toggle to see all rounds
- Banner when a new round opens: "The Round of 32 is set — re-pick your World Cup winner"

### 6.5 Historical Data Access
Ship the full round-by-round aggregate to the client (tiny — 6 rounds × 48 teams × ~5 bytes = kilobytes). Users can scrub through rounds to watch sentiment shift. This is the "replay the tournament" feature that stays valuable even after July 19.

---

## Section 7 — Personal Stats

### 7.1 Concept
Show returning users their personal prediction accuracy without requiring an account.
Uses fingerprint hash to identify returning visitors.

### 7.2 What to Show
- "You've predicted X matches correctly out of Y"
- "You're in the top X% of predictors globally"
- "You're in the top X% of predictors from [your country]"
- Only shown once enough match results exist (minimum 3 scored predictions)

### 7.3 Implementation
**Status:** ✅ Built — /api/stats.js exists
- On page load, fingerprint collected, POST to /api/stats
- Stats endpoint hashes fingerprint server-side, queries predictions
- Returns correct/total, global percentile, national percentile
- #personal-stats card shown below submit button (hidden until data available)

### 7.4 Supabase RPC
**Status:** ✅ get_accuracy_percentile function installed

### 7.5 End-of-Tournament Share Card (post-launch)
Spotify Wrapped-style personal summary:
- "You backed Brazil from Day 1 and were right when 71% doubted them"
- "You correctly predicted X/Y matches — top Z% globally"
- One-tap share to WhatsApp/Twitter
- Generated client-side as a canvas image or via @vercel/og

---

## Section 8 — Post-Launch Feature Roadmap

Ordered by virality impact × implementation effort. Build one per round transition to keep the site feeling alive.

### Priority 1 — Shareable Image Cards (build immediately, before June 11 if possible)
**Why first:** This is the distribution engine. Without it, sharing relies on manual screenshots.

Per-country share card showing:
- Country flag + name
- Their top pick + percentage
- "X% of [Country] fans back [Team]" 
- worldcupmap.io URL

Implementation options (in order of preference):
1. **@vercel/og (Satori)** — edge-rendered, ~100× lighter than headless Chromium, auto-cached at CDN, renders in <1s. Endpoint: `/api/og?country=NG&round=group_stage`
2. **Client-side Canvas** — simpler, no new API endpoint, but no server-rendered OG tag (WhatsApp won't pick it up for link previews)
3. **Static pre-generated images per country** — simplest but can't be dynamic/live

**Critical:** OG images must be served under 250KB and with correct Content-Type. WhatsApp silently drops previews >250KB and caches the failure for 7 days. Test on a real phone before launch.

WhatsApp share button: `https://wa.me/?text=` with pre-filled message + URL. Place prominently after submission.

### Priority 2 — "How the World Changed Its Mind" Round Replay (R32 opening, June 28)
Animated map transition between rounds. Triggered at each round opening. Most ownable recurring viral moment.

### Priority 3 — "Most Contrarian Nation" Auto-Highlight (R16 opening, July 5)
Auto-surfaces the most shareable facts each round:
- "🇬🇭 Ghana is the only African nation not backing an African team"
- "🇯🇵 Japan — 1 of 3 countries still backing France"
Pure SQL query over the aggregate — no new infrastructure needed.

### Priority 4 — Country vs Country Head-to-Head (QF opening, July 11)
Two-column comparison card for rivalry/banter content. Optimised for WhatsApp sharing.

### Priority 5 — Personal Accuracy Share Card (SF + Final, July 15-19)
Spotify Wrapped-style end-of-tournament card. Canvas-generated client-side.

### Priority 6 — Admin Result Entry UI (week 2 if SQL editor is too slow)
Simple password-protected /admin.html page. Lower priority — SQL editor works fine.

### Explicitly out of scope
- Real-time websockets (poll a cached aggregate instead)
- User accounts or auth of any kind
- Native push notifications
- Any per-request reads of raw prediction tables at scale
- AdSense during the tournament

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
```

### At each round transition
```sql
-- Open the new round
update rounds set is_current = false;
update rounds set is_current = true where round = 'round_of_32';
```
Then clear `wcp_tournament_winner` via the frontend round-change logic.
Post the "re-pick your winner" prompt on Reddit/Twitter/WhatsApp.

### Monitoring queries
```sql
-- Flagged submissions
select * from predictions where flagged = true order by created_at desc limit 20;

-- Prediction counts by country
select nation_iso2, count(*) from predictions 
group by nation_iso2 order by count desc limit 20;

-- Total count
select count(*) from predictions;

-- Implausible country spikes (watch for manipulation)
select nation_iso2, count(*), 
  count(*) filter (where created_at > now() - interval '1 hour') as last_hour
from predictions 
group by nation_iso2 
having count(*) filter (where created_at > now() - interval '1 hour') > 50
order by last_hour desc;
```

### Decision thresholds
- DB approaching 500MB → archive raw rows to Supabase Storage, keep aggregates only
- Egress approaching 5GB/month → lean harder on Cloudflare CDN caching, move images off Supabase
- WhatsApp previews failing → check image size (<250KB), check Cloudflare isn't blocking WhatsApp crawler UA
- Single country spiking implausibly → tighten rate limiting, flag for review, relabel as "sentiment"
- Daily streak churn looks high → consider switching to weekly streak mechanic

---

## Open Questions (resolved)
1. ~~Should the map auto-refresh?~~ → Not for launch. Add 5-min polling on matchdays in week 2 if needed.
2. ~~Monetisation?~~ → No ads during tournament. Revisit post-July 19.
3. ~~"Most surprising pick" highlight?~~ → Yes, as "Most Contrarian Nation" — Priority 3 above.
4. ~~Post-tournament archive?~~ → Yes, keep the site live with the final map as a permanent record.
5. ~~Round tracker: reset per round or allow anytime?~~ → Reset per round. New window = fresh pick required.
6. ~~Personal stats before matches scored?~~ → No, minimum 3 scored predictions before showing.
