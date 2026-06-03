# World Cup Map — Handover Document
*Generated: June 3, 2026 | Tournament starts: June 11, 2026 | Days remaining: 8*
*Live at: worldcupmap.io*

---

## Product Overview

**World Cup Map** (worldcupmap.io) is a live interactive world map showing how fans from every country predict the 2026 FIFA World Cup. Users pick a tournament winner (from all 48 qualified teams) and predict individual match results. The map colours each country by its most popular pick. No account required.

**Key differentiator:** No other live product combines a crowd-sourced world map coloured by national prediction sentiment + a national accuracy leaderboard. The closest competitors (ESPN, CNN, Superbru) are bracket predictors that rank individuals, not nations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, D3.js v7, TopoJSON |
| Hosting | Vercel (Hobby plan) |
| Database | Supabase (Postgres, free tier) |
| CDN / Security | Cloudflare (free plan) |
| Bot protection | Cloudflare Turnstile |
| Domain registrar | Porkbun |
| Repo | github.com/Sneakus/wcpredict (branch: main) |

---

## Infrastructure

### Domain & DNS
- **Primary domain:** worldcupmap.io (purchased on Porkbun)
- **Nameservers:** Cloudflare (carioca.ns.cloudflare.com, clark.ns.cloudflare.com)
- **DNS records in Cloudflare:**
  - CNAME worldcupmap.io → ba57be7b4f6b213f.vercel-dns-017.com (Proxied)
  - CNAME www.worldcupmap.io → ba57be7b4f6b213f.vercel-dns-017.com (Proxied)
  - TXT _vercel.worldcupmap.io (verification, DNS only)
  - TXT _vercel.worldcupmap.io (verification, DNS only)
- www redirects 308 to worldcupmap.io
- SSL: valid, auto-provisioned by Vercel
- Cloudflare proxy: active (orange cloud) on both CNAMEs

### Vercel
- Project name: wcpredict
- All three domains showing "Valid Configuration":
  - worldcupmap.io ✅
  - www.worldcupmap.io ✅
  - wcpredict-zeta.vercel.app ✅ (legacy, still works)
- Environment variables set:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_KEY
  - TURNSTILE_SECRET_KEY

### Supabase
- Project URL: https://qkjkvqyoulctqatdultz.supabase.co
- 5 tables: nations, matches, predictions, match_results, moderation_flags
- pg_cron job "lock-kickoffs" running every minute (locks matches at kickoff)
- Scoring trigger "on_result_insert" on match_results table
- RPC function "get_accuracy_percentile" for personal stats
- RLS: public read on all tables, public insert on predictions

### Cloudflare Turnstile
- Widget name: World Cup Map
- Domain: worldcupmap.io
- Site key: 0x4AAAAAADeJ5i3tyWn9PQjn
- Secret key: stored in Vercel env vars as TURNSTILE_SECRET_KEY
- Mode: Managed (invisible for most users)

---

## Codebase

### File structure
```
wcpredict/
├── index.html          — Full UI
├── app.js              — All frontend logic
├── style.css           — Dark theme styles
├── api/
│   ├── submit.js       — Prediction submission handler
│   └── stats.js        — Personal stats endpoint
├── og-image.png        — Social preview image (1200×630)
├── vercel.json         — Routing config
├── .gitattributes      — UTF-8/LF enforcement
└── wcpredict-design-doc.md — Full design document
```

### Key constants in app.js
- `TEAMS` — 8 featured teams for the TEAMS array (used for map colour precedence)
- `WC_TEAMS` — All 48 qualified teams with flags and colours
- `TEAM_COLORS` — Built from both TEAMS and WC_TEAMS
- `UK_NATIONS` — 4 UK nations for the multi-nation tooltip
- `COUNTRY_NAME_TO_ISO` — Maps D3 country names to ISO2 codes

### Important implementation notes
- **UK map:** The world-atlas renders UK as one blob. UK colour aggregates all 4 nations' picks via `resolveUKColor()`. Tooltip shows England, Scotland, Wales, Northern Ireland separately.
- **Winding order:** Previous attempts to subdivide UK into 4 separate map regions failed due to D3 polygon winding order issues. Current approach (single blob + multi-nation tooltip) is the correct solution.
- **UK colour logic:** In WC winner view, aggregates tournament picks from GB-ENG, GB-SCT, GB-WLS, GB-NIR. In matchday view, uses England as proxy.
- **Turnstile:** Only works on worldcupmap.io domain. Will return 403 on wcpredict-zeta.vercel.app.
- **Cache busting:** app.js loaded as app.js?v=4 in index.html to force fresh fetches after deploys.
- **UTF-8:** .gitattributes enforces UTF-8 LF on all text files — critical on Windows to avoid UTF-16 BOM bugs.

---

## Database Schema

### nations
- id, name, iso2, flag_emoji, prediction_count
- 195 countries + GB-ENG, GB-SCT, GB-WLS, GB-NIR seeded

### matches
- id (uuid), home_team, away_team, kickoff_at (timestamptz UTC), stage, group_label, locked (bool)
- 72 group stage matches seeded (Groups A-L, correct teams and UTC times)
- 24 knockout placeholder matches seeded
- Cron job flips locked=true every minute when kickoff_at <= now()

### predictions
- id, match_id (nullable for tournament-only picks), nation_iso2, predicted_winner, tournament_winner, ip_hash, fingerprint_hash, cf_country, country_override, flagged, score, scored_at, created_at

### match_results
- id, match_id, winner, home_score, away_score, created_at
- Scoring trigger fires on insert: scores all predictions for that match_id

### moderation_flags
- id, prediction_id, reason, verdict, created_at
- Not yet actively used — pipeline not built

---

## Tournament Data

### Groups and Teams (confirmed, final draw)
- **Group A:** Mexico, South Africa, South Korea, Czechia
- **Group B:** Canada, Bosnia and Herzegovina, Qatar, Switzerland
- **Group C:** Brazil, Morocco, Haiti, Scotland
- **Group D:** USA, Paraguay, Australia, Turkey
- **Group E:** Germany, Curaçao, Ivory Coast, Ecuador
- **Group F:** Netherlands, Japan, Sweden, Tunisia
- **Group G:** Belgium, Egypt, Iran, New Zealand
- **Group H:** Spain, Cape Verde, Saudi Arabia, Uruguay
- **Group I:** France, Senegal, Iraq, Norway
- **Group J:** Argentina, Algeria, Austria, Jordan
- **Group K:** Portugal, DR Congo, Uzbekistan, Colombia
- **Group L:** England, Croatia, Ghana, Panama

### Key dates
- Opening match: Mexico vs South Africa, June 11, 19:00 UTC
- Group stage: June 11 — June 27
- Round of 32: June 28 — July 3
- Round of 16: July 5-8
- Quarter-finals: July 11-12
- Semi-finals: July 15-16
- Third place play-off: July 19, 18:00 UTC (approx)
- **Final: July 19, 19:00 UTC, MetLife Stadium**

### Format
- 48 teams, 12 groups of 4
- Top 2 per group + 8 best third-placed = 32 advance
- New Round of 32 (first time in World Cup history)
- Total: 104 matches

---

## Features Built

### ✅ Complete
- World map with D3 geoNaturalEarth1 projection, zoom/pan (scaleExtent 1-8)
- Antarctica removed, projection shifted up (translate height/2.1)
- UK single blob with multi-nation tooltip (England, Scotland, Wales, N. Ireland)
- UK aggregate colour (all 4 nations combined)
- Two-view toggle: WC winner / Today's matches
- Tournament winner picker (48 teams, alphabetical, with flags)
- Pick prompt overlay on map ("🏆 Add your predictions to the map 🌍")
- Pick prompt hides after successful submission
- Match prediction form (today's matches only, locked state)
- Match locking: Supabase Cron every minute + server-side kickoff_at check
- Scoring trigger on match_results insert
- Both leaderboards:
  - Tournament pick by nation (dynamic, all teams, top 8 + show more)
  - Match accuracy by nation (top 6, post-results)
- Personal stats tracker (/api/stats.js) — shows after 3+ scored predictions
- FingerprintJS v4 — fingerprint hashed and stored
- Cloudflare Turnstile — server-side siteverify
- IP hashing + duplicate detection per match per IP
- CF-IPCountry header stored, country_override flagged
- Cookie persistence (wcp_tournament_winner, wcp_country — 60 day expiry)
- Map colours for all 48 teams wired into TEAM_COLORS
- OG image (1200×630) + full social meta tags
- About / How it works collapsible section
- Mobile responsive (all 44px tap targets, stacked panels)
- UTF-8 protection via .gitattributes

### ❌ Not built (post-launch / if traction warrants)
- AI moderation pipeline (moderation_flags table exists, Edge Function not built)
- Admin result entry UI (use Supabase SQL editor for now)
- Round-based tournament winner tracker (Section 6 of design doc)
- Dynamic OG image via Satori + resvg
- AdSense (apply mid-tournament after building traffic)
- Rate limiting table (rate_limits) not created

---

## Launch Operations

### Entering match results
After each match finishes, run in Supabase SQL editor:
```sql
insert into match_results (match_id, winner, home_score, away_score)
values ('match-uuid-here', 'Brazil', 2, 0);
```
The scoring trigger fires automatically and scores all predictions for that match.

To find match UUIDs:
```sql
select id, home_team, away_team, kickoff_at
from matches
where kickoff_at::date = '2026-06-11'
order by kickoff_at;
```

### Monitoring flagged submissions
```sql
select * from predictions where flagged = true order by created_at desc limit 20;
```

### Checking prediction counts
```sql
select count(*) from predictions;
select nation_iso2, count(*) from predictions group by nation_iso2 order by count desc limit 20;
```

### Resetting a test submission (dev only)
```sql
delete from predictions where nation_iso2 = 'BR' and created_at > now() - interval '1 hour';
```

---

## Launch Distribution Plan

### June 11 — Opening match day
1. Post to r/soccer opening match thread (Mexico vs South Africa) as a comment
2. Post standalone thread on r/soccer
3. Post on r/worldcup and r/FIFAWC
4. Tweet/X with map screenshot + #WorldCup2026 #WorldCupMap

### Reddit post title (use Option A):
"I built a live world map showing which team every country thinks will win the World Cup"

### Reddit post body:
"With the tournament starting today I wanted to see something I couldn't find anywhere: a live map showing who fans from every country actually think will win — not betting odds, not AI predictions, just real people picking their winner.

So I built it. You pick your tournament winner and predict individual match results. Your picks get added to your country's total and the map updates in real time.

There's also a leaderboard tracking which nations are most accurate at predicting match results throughout the tournament.

No account needed: worldcupmap.io

Curious to see how it looks once people from different countries start submitting — especially whether South American countries back Brazil or Argentina, and whether African nations surprise anyone."

---

## Post-Launch Feature Roadmap

### Priority 1 — Personal stats (Section 7 of design doc)
Already built but needs match results to show data. Will automatically activate after matchday 3. Shows:
- Your correct/total predictions
- Top X% globally
- Top X% in your country

### Priority 2 — Round-based tournament winner tracker (Section 6)
After each round (group stage → R32 → R16 → QF → SF → Final):
- Open a new prediction window
- Users submit one tournament winner pick per round
- Timeline shows how sentiment shifted round by round
- Requires adding `round` column to predictions table

SQL to add when ready:
```sql
alter table predictions add column round text default 'group_stage';
create index on predictions(round);
```

### Priority 3 — Admin result entry UI
Currently using Supabase SQL editor. Build simple password-protected admin page at /admin.html in week 2 if traction warrants it.

### Priority 4 — Dynamic OG image
Satori + resvg in /api/og — generates live map snapshot for social sharing. Week 2 if traction.

### Priority 5 — AI moderation pipeline
moderation_flags table exists. Supabase Edge Function every 15 min, calls Claude API with suspicious clusters, writes verdicts. Build if spam becomes a problem.

### Priority 6 — AdSense
Apply mid-tournament once traffic is established. Don't apply now — new site will be rejected for low value content.

---

## Open Questions / Decisions Pending
1. Should the map auto-refresh live data during matchdays, or require manual refresh? (Suggest: auto-refresh every 5 minutes on matchdays)
2. Monetisation if AdSense deferred? Options: sponsor outreach, Patreon, portfolio piece
3. Should there be a "most surprising pick" highlight? e.g. "3% of Brazilians back Germany"
4. Post-tournament: archive the final map as a permanent record?
5. Round-based tracker: reset tournament winner pick per round, or allow updates anytime?

---

## Known Issues / Bugs
- None currently — all known bugs resolved as of this handover
- Watch for: cache issues after deploys (bump app.js?v=N in index.html)
- Watch for: Turnstile will reject submissions from wcpredict-zeta.vercel.app (by design)

---

## Previous Session Context
This handover was produced at the end of a long build session covering:
- Full product build from scratch
- Domain purchase and Cloudflare setup
- All infrastructure wiring
- Fixture database with correct 72-match schedule
- Complete 48-team picker with correct qualifiers and colours
- Bot protection stack
- Personal stats tracker
- Launch distribution planning

The Cursor AI coding assistant was used alongside Claude for file editing. All code changes were committed to github.com/Sneakus/wcpredict main branch.

---

*End of handover document*
