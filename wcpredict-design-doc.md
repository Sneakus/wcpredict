# WCPredict — Pre-Launch Design Document
*Last updated: June 3, 2026 | Tournament starts: June 11, 2026 | Days remaining: 8*

---

## Current Status

### ✅ Done
- Vercel project live at `wcpredict-zeta.vercel.app`
- Supabase database with all 5 tables (nations, matches, predictions, match_results, moderation_flags)
- 195 nations seeded with ISO2 codes and flag emojis
- 48 group stage matches seeded with correct kickoff times
- RLS policies in place (public read, public insert on predictions)
- World map rendering with D3 + zoom/pan
- Two-view toggle (WC winner / Today's matches)
- UK multi-nation tooltip (all 4 nations shown on hover)
- Both leaderboards (tournament pick by nation, match accuracy by nation)
- Vercel serverless function `/api/submit.js` with IP hashing
- Country dropdown populated from Supabase
- Prediction count live from Supabase
- View toggle working
- Tournament winner pick UI (48 teams, flag + name buttons, cookie persistence)

### ❌ Not Done (launch blockers)
- UK map blob colour should aggregate all four nations' votes (currently England-only)
- Match locking at kickoff (Supabase Cron + DB trigger)
- Bot protection (Cloudflare Turnstile) — blocked until domain purchased
- Location verification (CF-IPCountry header enforcement) — blocked until Cloudflare
- Fingerprinting (FingerprintJS)
- Anomaly detection / AI moderation pipeline
- Country flags in the dropdown (need verification they're rendering correctly)
- End-to-end submission test
- Knockout stage matches not yet seeded
- OG image / social sharing meta tags
- About / how it works section
- Domain purchase and setup
- AdSense (deferred — apply mid-tournament)
- Result entry admin flow
- Scoring trigger (DB)
- Supabase Cron for match locking

### 🔜 Post-launch / mid-tournament features
- Round-based tournament winner tracker (see Section 6)
- Dynamic OG image via Satori + resvg
- Admin result entry UI (currently using SQL editor)

---

## Section 1 — Submission Flow (Critical Path)

### 1.1 Tournament Winner Pick
**Status:** ✅ Implemented (June 3)
- 48-team button grid with flag + name
- Cookie persistence (`wcp_tournament_winner`) — 60-day expiry
- Country selection also cookie-persisted (`wcp_country`)
- Submitted alongside match picks in same POST to `/api/submit`
- Map colours in WC Winner view driven by this data

**Still needed:**
- [ ] Update `api/submit.js` to accept and store `tournament_winner` per round (see Section 6 for round-based design)
- [ ] Verify map colours update after submission without page refresh ✓ (already implemented — calls `loadNationData()` + `updateMapColors()` post-submit)

---

### 1.2 UK Map Colour — Aggregate All Four Nations
**Status:** ❌ Not implemented — currently maps UK blob to England only
**What's needed:**
The world-atlas renders the UK as one polygon. Its colour should reflect the combined tournament winner picks from all four nations (GB-ENG, GB-SCT, GB-WLS, GB-NIR) aggregated together.

**Implementation:**
Add a `resolveUKColor()` function that merges tournamentPicks across all four UK nations, finds the top pick, and returns that colour. Use this instead of mapping `'United Kingdom'` to `'GB-ENG'`.

```javascript
function resolveUKColor() {
  const merged = {}
  ['GB-ENG','GB-SCT','GB-WLS','GB-NIR'].forEach(iso => {
    const nd = nationData[iso]
    if (!nd) return
    Object.entries(nd.tournamentPicks || {}).forEach(([team, count]) => {
      merged[team] = (merged[team] || 0) + count
    })
  })
  const top = Object.entries(merged).sort((a,b) => b[1]-a[1])[0]
  if (!top) return null
  return TEAM_COLORS[top[0]] ? TEAM_COLORS[top[0]] + 'cc' : null
}
```

In `updateMapColors()`, handle UK separately:
```javascript
if (name === 'United Kingdom') return resolveUKColor() || '#1e1e1e'
```

Also update `COUNTRY_NAME_TO_ISO` — remove `'United Kingdom': 'GB-ENG'` since UK now has its own colour logic.

---

### 1.3 Match Locking
**Status:** ❌ Not implemented
**What's needed:**
Predictions must close at kickoff. Two layers: DB trigger (authoritative) + Supabase Cron (UX flag).

**Layer 1 — Supabase Cron (flips locked flag every minute):**
```sql
create extension if not exists pg_cron;

select cron.schedule(
  'lock-kickoffs',
  '* * * * *',
  $$ update matches
     set locked = true
     where locked = false
     and kickoff_at <= now(); $$
);
```

**Layer 2 — api/submit.js server-side check:**
```javascript
// Already checks .locked — also add kickoff_at check as fallback
const { data: match } = await supabase
  .from('matches')
  .select('locked, kickoff_at')
  .eq('id', match_id)
  .single()

if (!match || match.locked || new Date(match.kickoff_at) <= new Date()) {
  continue // skip this match silently
}
```

**Layer 3 — Frontend locked state:**
Already handled with `.locked` class on pick buttons — greyed out, unclickable.

**To do:**
- [ ] Enable pg_cron in Supabase SQL editor: `create extension if not exists pg_cron;`
- [ ] Add the cron job SQL above
- [ ] Update `api/submit.js` to also check `kickoff_at <= now()` as fallback
- [ ] Test: submit prediction for a manually-locked match, verify rejection

---

### 1.4 Bot Protection Stack
**Status:** ❌ Partially implemented (IP hashing done, rest pending)
**Blocked by:** Domain purchase + Cloudflare setup (target: June 8)

#### Layer 1 — Cloudflare Turnstile
**Prerequisites:** Domain routed through Cloudflare
```html
<!-- index.html — add before submit button -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY" data-theme="dark"></div>
```
```javascript
// api/submit.js — add before any processing
const turnstileToken = req.body['cf-turnstile-response']
const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: turnstileToken,
    remoteip: req.headers['x-forwarded-for'] ?? ''
  })
})
const verifyData = await verifyRes.json()
if (!verifyData.success) return res.status(403).json({ error: 'Bot check failed' })
```
Add `TURNSTILE_SECRET_KEY` to Vercel env vars.

#### Layer 2 — IP Rate Limiting
IP hashing + duplicate-per-match already in `api/submit.js`.
Still needed: global rate limit (max 10 submissions/IP/hour).

```sql
create table rate_limits (
  ip_hash text primary key,
  count integer default 1,
  window_start timestamptz default now()
);
```

#### Layer 3 — CF-IPCountry Location Detection
**Prerequisites:** Domain through Cloudflare
- `cf_country` header already read and stored in `api/submit.js`
- When CF-IPCountry ≠ declared nation: `country_override = true`, `flagged = true`
- Don't block — flag for review only

#### Layer 4 — Browser Fingerprinting (FingerprintJS)
**Status:** `fingerprint_hash` column exists — not yet collected

```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.umd.min.js"></script>
```
```javascript
// app.js — add to init()
let visitorFingerprint = null
async function initFingerprint() {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  visitorFingerprint = result.visitorId
}
```
Pass in submit payload, hash server-side in `api/submit.js`.

**To do:**
- [ ] Add FingerprintJS script to `index.html`
- [ ] Add `initFingerprint()` to `app.js` init
- [ ] Pass fingerprint in submit payload
- [ ] Hash and store in `api/submit.js`

#### Layer 5 — AI Moderation Pipeline
**Status:** `moderation_flags` table exists — pipeline not built
Triggers: country_override, same fingerprint >5/hour, burst >50 from /24 block

Supabase Edge Function (every 15 min):
1. Query `predictions where flagged = true and created_at > now() - interval '1 hour'`
2. Group by ip_hash and fingerprint_hash
3. Call Claude API with cluster data
4. Write verdict to `moderation_flags`
5. Review via `/api/admin/flags` (basic auth)

**To do (post-launch if traction warrants it):**
- [ ] Build Edge Function
- [ ] Build `/api/admin/flags.js`
- [ ] Add `ADMIN_PASSWORD` to Vercel env vars

---

## Section 2 — Map & Visual Features

### 2.1 Country Flags in Tooltip
**Status:** ❌ Not implemented
Tooltip currently shows country name as plain text. Add flag emoji from nations table.

```javascript
// In showTooltip():
const flagEmoji = nations.find(n => n.name === name)?.flag_emoji || ''
tooltip.querySelector('.tt-country').textContent = `${flagEmoji} ${name}`
```
For UK: `🇬🇧 United Kingdom` already hardcoded — correct.

### 2.2 Country Flags in Dropdown
**Status:** Needs verification
The `flag_emoji` column is seeded. Dropdown uses `${n.flag_emoji} ${n.name}`.
- [ ] Verify rendering on Windows Chrome, Firefox, mobile
- [ ] If emojis don't render on some OS, fall back to ISO code prefix

### 2.3 Map Colour Verification Checklist
- [ ] Submit test prediction as Brazil → verify Brazil turns green
- [ ] Submit test prediction as France → verify France turns blue
- [ ] Hover UK → verify all 4 nations shown in tooltip
- [ ] Toggle to "Today's matches" → verify map colour logic switches

### 2.4 Knockout Stage Matches
**Status:** Only 48 group stage matches seeded
Rounds of 32, 16, QF, SF, Final need placeholder entries.

Approximate dates:
- Round of 32: June 29 — July 5
- Round of 16: July 7-10
- Quarter-finals: July 14-15
- Semi-finals: July 18-19
- Final: July 22

```sql
insert into matches (home_team, away_team, kickoff_at, stage, group_label) values
('Winner A', 'Runner-up B', '2026-06-29 20:00:00+00', 'round_of_32', null)
-- etc. Verify exact FIFA schedule before seeding.
```

---

## Section 3 — Result Entry & Scoring

### 3.1 Admin Result Entry
**Status:** Not implemented
**Recommendation:** Use Supabase SQL editor for speed during the tournament.

```sql
insert into match_results (match_id, winner, home_score, away_score)
values ('match-uuid-here', 'Brazil', 2, 0);
```

Build a proper admin UI in week 2 if traction warrants it.

### 3.2 Scoring Trigger
**Status:** Not implemented

```sql
create or replace function score_predictions()
returns trigger as $$
begin
  update predictions
  set
    score = case when predicted_winner = new.winner then 1 else 0 end,
    scored_at = now()
  where match_id = new.match_id
  and score is null;
  return new;
end;
$$ language plpgsql;

create trigger on_result_insert
after insert on match_results
for each row execute function score_predictions();
```

**To do:**
- [ ] Run scoring trigger SQL in Supabase SQL editor
- [ ] Test: insert a dummy match_result, verify predictions.score updates

---

## Section 4 — Social & Distribution

### 4.1 OG Image / Meta Tags
**Status:** Not implemented
**Minimum viable (static):**
```html
<meta property="og:title" content="WCPredict — Who does the world back?">
<meta property="og:description" content="See how every nation is predicting the 2026 World Cup. Add your pick to the global map.">
<meta property="og:image" content="https://wcpredict-zeta.vercel.app/og-image.png">
<meta property="og:url" content="https://wcpredict-zeta.vercel.app">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://wcpredict-zeta.vercel.app/og-image.png">
```
Create `og-image.png` (1200×630px) — screenshot of the map with "WCPredict" branding.

**Dynamic (post-launch):** Satori + resvg in `/api/og` — week 2 if traction.

### 4.2 About Section
**Status:** Not implemented
Add a simple collapsible section below the submit button explaining:
- What WCPredict is
- How the map colours work
- How accuracy leaderboard is calculated
- Privacy: no account needed, IP hashed and not stored

### 4.3 Domain
**Status:** Not purchased. Target: June 8.
- Buy `wcpredict.com` or `wcpredict.app` on Porkbun
- Point nameservers to Cloudflare (free) — unlocks Turnstile + CF-IPCountry + DDoS protection
- Add CNAME to Vercel, add custom domain in Vercel dashboard
- SSL auto-provisions

### 4.4 Launch Distribution
**June 8-9:** Soft launch to friends/WhatsApp for initial data seeding
**June 11 (opening match):**
- r/soccer — "Built a live world map showing how every country predicts the World Cup"
- r/worldcup, r/FIFAWC, r/CONCACAF
- Drop link in r/soccer opening match thread
- Twitter/X with map screenshot + hashtags: #WorldCup2026 #WCPredict
- World Cup 2026 Discord servers

---

## Section 5 — Technical Debt & Cleanup

### 5.1 Environment Variables
Currently in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

Still needed:
- [ ] `TURNSTILE_SECRET_KEY` (after domain + Cloudflare setup)
- [ ] `ADMIN_PASSWORD` (for moderation endpoint)

### 5.2 Error Handling
- [ ] User-friendly error if Supabase is down
- [ ] Specific error messages: "already predicted", "match locked", "bot check failed"
- [ ] Loading states on map and leaderboards

### 5.3 Mobile Responsiveness
- [ ] Test map zoom/pan on touch
- [ ] Prediction form usable on small screens
- [ ] Team picker wraps correctly on mobile
- [ ] Leaderboards readable on mobile

### 5.4 Performance
- [ ] world-atlas TopoJSON from CDN ✓
- [ ] Supabase queries indexed ✓
- [ ] Consider caching nation data in memory with 5-min TTL

---

## Section 6 — Round-Based Tournament Winner Tracker (Post-Launch)

### 6.1 Concept
Track how world sentiment about the tournament winner changes round by round.
One tournament winner pick allowed per nation per round. At the start of each new round, a new prediction window opens.

**Rounds:** group_stage → round_of_32 → round_of_16 → quarter_final → semi_final → final

**The data story:** "After England's exit in the QF, UK support shifted from England to France" — this is shareable, interesting content that grows more valuable as the tournament progresses.

### 6.2 Database Changes Needed
```sql
-- Add round column to predictions
alter table predictions add column round text default 'group_stage';

-- Index for round-based queries
create index on predictions(round);
```

### 6.3 UI Changes Needed
- Timeline view on the leaderboard — 6 data points per team, line chart showing sentiment shift
- Admin trigger to "open" a new round (or auto-detect based on match stage)
- Map shows current round's picks by default, with round selector to replay history

### 6.4 Implementation Notes
- Existing predictions get `round = 'group_stage'` retroactively
- Tournament winner pick resets between rounds (new submission required)
- IP rate limit: one tournament winner pick per round per IP
- Cookie: clear `wcp_tournament_winner` when new round opens
- The WC Winner leaderboard shows current round only; historical data accessible via round selector

---

## Section 7 — Personal Stats (Post-Launch)

### 7.1 Concept
Show returning users their personal prediction accuracy without requiring an account.
Uses the existing fingerprint hash + cookie to identify returning visitors.

### 7.2 What to show
- "You've predicted X matches correctly out of Y"
- "You're in the top X% of predictors globally"
- "You're in the top X% of predictors from [your country]"
- Only shown once enough match results exist to be meaningful (suggest: after matchday 3+)

### 7.3 Implementation
- On page load, read fingerprint hash and look up predictions from DB
- Query: all predictions matching this fingerprint_hash where score is not null
- Calculate: correct / total = accuracy %
- Query global and national distributions to compute percentile
- Display as a subtle banner or card above the leaderboards — not intrusive
- No account needed — works automatically for returning visitors
- If fingerprint not found or no scored predictions yet: show nothing

### 7.4 Database query needed
```sql
select
  count(*) filter (where score = 1) as correct,
  count(*) filter (where score is not null) as total
from predictions
where fingerprint_hash = $1;

-- For percentile:
select
  count(*) filter (where accuracy < user_accuracy) * 100.0 / count(*) as percentile
from (
  select
    fingerprint_hash,
    count(*) filter (where score = 1)::float / nullif(count(*) filter (where score is not null), 0) as accuracy
  from predictions
  group by fingerprint_hash
  having count(*) filter (where score is not null) >= 3
) nation_accuracies;
```

### 7.5 Notes
- Minimum 3 scored predictions before showing percentile (avoids misleading 100% after 1 correct)
- Fingerprint can change if user clears cookies/uses different device — accepted limitation
- Do not build until there is enough tournament data (post matchday 3)

---

## Priority Order for Remaining 8 Days

### Today (June 3) — In progress
- [x] Tournament winner pick UI
- [ ] Fix UK map colour (aggregate all 4 nations)
- [ ] Supabase Cron for match locking
- [ ] Scoring trigger

### June 4 — Submission integrity
- [ ] FingerprintJS added to frontend + submit payload
- [ ] End-to-end submission test (submit prediction, verify DB, verify map updates)
- [ ] Verify country flags rendering in dropdown

### June 5-6 — Polish
- [ ] OG meta tags + og-image.png created
- [ ] About/how it works section
- [ ] Mobile responsiveness check
- [ ] Error handling improvements

### June 7 — Soft launch prep
- [ ] Seed knockout stage placeholder matches
- [ ] Verify all 48 group stage kickoff times (UTC)
- [ ] Soft launch to friends/WhatsApp for initial data

### June 8 — Bot protection
- [ ] Buy domain on Porkbun
- [ ] Point through Cloudflare nameservers
- [ ] Set up Cloudflare Turnstile (get site key + secret key)
- [ ] Add Turnstile widget to `index.html`
- [ ] Add Turnstile server verification to `api/submit.js`
- [ ] Add `TURNSTILE_SECRET_KEY` to Vercel env vars
- [ ] Final end-to-end test with Turnstile live

### June 9-10 — Launch prep
- [ ] Reddit/Discord posts drafted and ready to go
- [ ] Admin result entry flow tested (SQL editor approach)
- [ ] Monitor Vercel logs for any errors

### June 11 — Launch day
- [ ] Post to r/soccer, r/worldcup, Twitter on opening match
- [ ] Enter first match results after games finish
- [ ] Monitor flagged submissions

---

## Open Questions
1. Should the map auto-refresh live data during matchdays, or require manual refresh? (Suggest: auto-refresh every 5 minutes on matchdays)
2. What's the monetisation plan if AdSense is deferred? (Options: sponsor outreach, Patreon, portfolio piece)
3. Should there be a "most surprising pick" highlight — e.g. "3% of Brazilians back Germany"?
4. Post-tournament: archive the final map as a permanent record?
