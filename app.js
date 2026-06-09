const SUPABASE_URL = 'https://qkjkvqyoulctqatdultz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFramt2cXlvdWxjdHFhdGR1bHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDkwNzksImV4cCI6MjA5NTk4NTA3OX0.ojhzBHpmxqNZ3xphaojhHn0oO9YJT0QRuN634xgLZ3k'

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TEAMS = [
  { name: 'Brazil',    iso: 'BR',     color: '#639922' },
  { name: 'France',    iso: 'FR',     color: '#185FA5' },
  { name: 'England',   iso: 'GB-ENG', color: '#EFEFEF' },
  { name: 'Spain',     iso: 'ES',     color: '#C60B1E' },
  { name: 'Argentina', iso: 'AR',     color: '#75AADB' },
  { name: 'Germany',   iso: 'DE',     color: '#888780' },
  { name: 'Portugal',  iso: 'PT',     color: '#A4123F' },
  { name: 'USA',       iso: 'US',     color: '#1B2A4A' },
]
const TEAM_COLORS = {}
TEAMS.forEach(t => TEAM_COLORS[t.name] = t.color)

const WC_TEAMS = [
  { name: 'Argentina',            flag: '🇦🇷', color: '#75AADB' },
  { name: 'Algeria',              flag: '🇩🇿', color: '#006633' },
  { name: 'Australia',            flag: '🇦🇺', color: '#FFD700' },
  { name: 'Austria',              flag: '🇦🇹', color: '#ED2939' },
  { name: 'Belgium',              flag: '🇧🇪', color: '#ED1C24' },
  { name: 'Bosnia and Herzegovina', flag: '🇧🇦', color: '#1A3A7A' },
  { name: 'Brazil',               flag: '🇧🇷', color: '#639922' },
  { name: 'Canada',               flag: '🇨🇦', color: '#D80621' },
  { name: 'Cape Verde',           flag: '🇨🇻', color: '#143C8B' },
  { name: 'Colombia',             flag: '🇨🇴', color: '#F6C000' },
  { name: 'Croatia',              flag: '🇭🇷', color: '#E1261C' },
  { name: 'Czechia',              flag: '🇨🇿', color: '#1A4FA0' },
  { name: 'Curaçao',              flag: '🇨🇼', color: '#0072CE' },
  { name: 'DR Congo',             flag: '🇨🇩', color: '#4FB6E8' },
  { name: 'Ecuador',              flag: '🇪🇨', color: '#F2A900' },
  { name: 'Egypt',                flag: '🇪🇬', color: '#CE1126' },
  { name: 'England',              flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#EFEFEF' },
  { name: 'France',               flag: '🇫🇷', color: '#185FA5' },
  { name: 'Germany',              flag: '🇩🇪', color: '#888780' },
  { name: 'Ghana',                flag: '🇬🇭', color: '#006B3F' },
  { name: 'Haiti',                flag: '🇭🇹', color: '#00209F' },
  { name: 'Iran',                 flag: '🇮🇷', color: '#239F40' },
  { name: 'Iraq',                 flag: '🇮🇶', color: '#1B5E20' },
  { name: 'Ivory Coast',          flag: '🇨🇮', color: '#FF8200' },
  { name: 'Japan',                flag: '🇯🇵', color: '#16348C' },
  { name: 'Jordan',               flag: '🇯🇴', color: '#111827' },
  { name: 'Mexico',               flag: '🇲🇽', color: '#006847' },
  { name: 'Morocco',              flag: '🇲🇦', color: '#C1272D' },
  { name: 'Netherlands',          flag: '🇳🇱', color: '#EC6608' },
  { name: 'New Zealand',          flag: '🇳🇿', color: '#1A1A1A' },
  { name: 'Norway',               flag: '🇳🇴', color: '#BA0C2F' },
  { name: 'Panama',               flag: '🇵🇦', color: '#002B7F' },
  { name: 'Paraguay',             flag: '🇵🇾', color: '#C8102E' },
  { name: 'Portugal',             flag: '🇵🇹', color: '#A4123F' },
  { name: 'Qatar',                flag: '🇶🇦', color: '#8A1538' },
  { name: 'Saudi Arabia',         flag: '🇸🇦', color: '#006C35' },
  { name: 'Scotland',             flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#13315C' },
  { name: 'Senegal',              flag: '🇸🇳', color: '#00853F' },
  { name: 'South Africa',         flag: '🇿🇦', color: '#FFB81C' },
  { name: 'South Korea',          flag: '🇰🇷', color: '#CD2E3A' },
  { name: 'Spain',                flag: '🇪🇸', color: '#C60B1E' },
  { name: 'Sweden',               flag: '🇸🇪', color: '#006AA7' },
  { name: 'Switzerland',          flag: '🇨🇭', color: '#DA291C' },
  { name: 'Tunisia',              flag: '🇹🇳', color: '#E70013' },
  { name: 'Turkey',               flag: '🇹🇷', color: '#E30A17' },
  { name: 'Uruguay',              flag: '🇺🇾', color: '#2F7DC2' },
  { name: 'USA',                  flag: '🇺🇸', color: '#1B2A4A' },
  { name: 'Uzbekistan',           flag: '🇺🇿', color: '#0A4595' },
]

// Convert flag emoji to a Twemoji PNG URL.
// Fixes Windows rendering: regional indicator pairs show as letter codes (AR, BR…) on Windows.
function flagToTwemojiUrl(flag) {
  const codepoints = Array.from(flag)
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-')
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoints}.png`
}

// Returns an <img> tag for a country flag by ISO2 code (e.g. 'NG', 'FR')
// or subdivision code (e.g. 'GB-ENG', 'GB-WLS').
function countryFlagImg(code) {
  if (!code) return ''
  return `<img src="https://flagcdn.com/h60/${code.toLowerCase()}.png" class="country-flag" alt="">`
}

WC_TEAMS.forEach(t => TEAM_COLORS[t.name] = t.color)

function autofillCountryFromIP() {
  const select = document.getElementById('country-select')
  if (!select || select.value) return
  const cookieMatch = document.cookie.match(/(?:^|;\s*)wcp_country=([^;]+)/)
  if (cookieMatch) return
  fetch('/api/whereami')
    .then(r => r.json())
    .then(({ country }) => {
      if (!country) return
      // Try exact match first
      let opt = select.querySelector(`option[value="${country}"]`)
      // UK visitors land as plain "GB" — fall back to England as the default subdivision
      if (!opt && country === 'GB') {
        opt = select.querySelector(`option[value="GB-ENG"]`)
      }
      if (opt) select.value = opt.value
    })
    .catch(() => {})
}

const UK_NATIONS = [
  { name: 'England',          iso: 'GB-ENG' },
  { name: 'Scotland',         iso: 'GB-SCT' },
  { name: 'Wales',            iso: 'GB-WLS' },
  { name: 'Northern Ireland', iso: 'GB-NIR' },
]
const UK_ISO_CODES = ['GB', 'GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR']
const GB_SUBDIVISION_WEIGHTS = [
  ['GB-ENG', 0.84],
  ['GB-SCT', 0.08],
  ['GB-WLS', 0.05],
  ['GB-NIR', 0.03],
]

const COUNTRY_NAME_TO_ISO = {
  'United Kingdom':             '__UK__',
  'United States of America':   'US',
  'United States':              'US',
  'Russia':                     'RU',
  'South Korea':                'KR',
  'North Korea':                'KP',
  'Iran':                       'IR',
  'Syria':                      'SY',
  'Turkey':                     'TR',
  'Venezuela':                  'VE',
  'Bolivia':                    'BO',
  'Tanzania':                   'TZ',
  'DR Congo':                   'CD',
  'Republic of the Congo':      'CG',
  'Ivory Coast':                'CI',
  "Côte d'Ivoire":              'CI',
  'Czech Republic':             'CZ',
  'Czechia':                    'CZ',
  'Macedonia':                  'MK',
  'North Macedonia':            'MK',
  'Bosnia and Herz.':           'BA',
  'Bosnia and Herzegovina':     'BA',
  'Central African Rep.':       'CF',
  'Eq. Guinea':                 'GQ',
  'S. Sudan':                   'SS',
  'W. Sahara':                  null,
  'Kosovo':                     null,
  'Taiwan':                     null,
  'Swaziland':                  'SZ',
  'Myanmar':                    'MM',
  'Laos':                       'LA',
  'Vietnam':                    'VN',
  'Trinidad and Tobago':        'TT',
  'Solomon Islands':            'SB',
  'Papua New Guinea':           'PG',
  'Timor-Leste':                'TL',
  'East Timor':                 'TL',
  'The Bahamas':                'BS',
  'Bahamas':                    'BS',
  'Guinea Bissau':              'GW',
  'Dem. Rep. Korea':            'KP',
  'Serbia':                     'RS',
  'Montenegro':                 'ME',
  'Somaliland':                 null,
  'Northern Cyprus':            null,
  'Falkland Islands':           null,
  'Greenland':                  'GL',
  'Puerto Rico':                'PR',
  'New Caledonia':              'NC',
  'French Guiana':              'GF',
  'Dem. Rep. Congo':            'CD',
  'Dominican Rep.':             'DO',
  'Falkland Is.':               null,
  'Fr. S. Antarctic Lands':     null,
  'eSwatini':                   'SZ',
  'Palestine':                  'PS',
  'Solomon Is.':                'SB',
  'N. Cyprus':                  null,
  'Guinea-Bissau':              'GW',
}

function getFeatureForIso(iso2) {
  if (!window._worldFeatures) return null
  if (iso2 && iso2.startsWith('GB-')) {
    return window._worldFeatures.find(f => f.properties && f.properties.name === 'United Kingdom') || null
  }
  return window._worldFeatures.find(f => {
    const name = f.properties && f.properties.name
    return name && resolveIso(name) === iso2
  }) || null
}

let currentView = 'wc'
let svgPaths = null
let nationData = {}
let todayMatches = []
let nations = []
let tournamentWinner = null
let visitorFingerprint = null
let currentRound = 'group_stage'
let mapProjection = null
let glCanvas = null
let gl = null
let glProgram = null
let glBuffer = null
let glColorBuffer = null
let glWeightBuffer = null
let glPointCount = 0
let glWidth = 0
let glHeight = 0
let currentZoomTransform = { x: 0, y: 0, k: 1 }
let dotPoints = [] // stores {lng, lat, r, g, b} for redraw
let lastPulseTimestamp = null
const picks = {}

function getFlagEmoji(iso) {
  if (!iso) return ''
  if (iso.startsWith('GB-')) {
    const map = { 'GB-ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GB-SCT': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'GB-WLS': '🏴󠁧󠁢󠁷󠁬󠁤󠁿', 'GB-NIR': '🇬🇧' }
    return map[iso] || '🇬🇧'
  }
  return iso.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

function resolveIso(name) {
  if (!name) return null
  if (COUNTRY_NAME_TO_ISO.hasOwnProperty(name)) return COUNTRY_NAME_TO_ISO[name]
  const match = nations.find(n => n.name === name)
  return match ? match.iso2 : null
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

async function initFingerprint() {
  try {
    if (typeof FingerprintJS === 'undefined') return
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    visitorFingerprint = result.visitorId
  } catch (e) {
    console.warn('Fingerprint init failed:', e)
  }
}

async function loadCurrentRound() {
  try {
    const { data, error } = await sb
      .from('rounds')
      .select('round')
      .eq('is_current', true)
      .single()
    if (error || !data) return

    currentRound = data.round
    const storedRound = getCookie('wcp_round')

    if (storedRound && storedRound !== currentRound) {
      setCookie('wcp_tournament_winner', '', -1)
      tournamentWinner = null
      showRoundBanner(currentRound)
    }

    setCookie('wcp_round', currentRound, 60)
  } catch (e) {
    console.warn('loadCurrentRound failed:', e)
  }
}

function showRoundBanner(round) {
  const labels = {
    'round_of_32':  'The Round of 32 is set',
    'round_of_16':  'The Round of 16 is set',
    'quarter_final':'The Quarter-Finals are set',
    'semi_final':   'The Semi-Finals are set',
    'final':        'The Final is set',
  }
  const label = labels[round] || 'A new round has begun'
  const banner = document.createElement('div')
  banner.id = 'round-banner'
  banner.innerHTML = `
    <span>🏆 ${label} — re-pick your World Cup winner</span>
    <button onclick="document.getElementById('round-banner').remove(); scrollToPredict()">Pick now</button>
  `
  document.getElementById('app').insertBefore(banner, document.getElementById('map-wrap'))
}

function buildTournamentPicker() {
  const el = document.getElementById('tournament-teams')
  if (!el) return
  const saved = getCookie('wcp_tournament_winner')
  if (saved) { tournamentWinner = saved; updateTournamentSelectedLabel() }
  const sortedTeams = [...WC_TEAMS].sort((a, b) => a.name.localeCompare(b.name))
  sortedTeams.forEach(team => {
    const btn = document.createElement('button')
    btn.className = 'team-btn' + (team.name === tournamentWinner ? ' active' : '')
    btn.dataset.team = team.name
    btn.innerHTML = `<img src="${flagToTwemojiUrl(team.flag)}" class="team-flag" alt=""> ${team.name}`
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      tournamentWinner = team.name
      setCookie('wcp_tournament_winner', team.name, 60)
      updateTournamentSelectedLabel()
    })
    el.appendChild(btn)
  })
}

function updateTournamentSelectedLabel() {
  const el = document.getElementById('tournament-selected')
  const nameEl = document.getElementById('tournament-selected-name')
  if (!el || !nameEl) return
  if (tournamentWinner) {
    const team = WC_TEAMS.find(t => t.name === tournamentWinner)
    if (team) {
      nameEl.innerHTML = `<img src="${flagToTwemojiUrl(team.flag)}" class="team-flag" alt=""> ${team.name}`
    } else {
      nameEl.textContent = tournamentWinner
    }
    el.classList.remove('hidden')
  } else {
    el.classList.add('hidden')
  }
}

async function loadNations() {
  const { data, error } = await sb.from('nations').select('*').order('name')
  if (error) { console.error('loadNations error:', error); return }
  nations = data || []
  const sel = document.getElementById('country-select')
  nations.forEach(n => {
    const opt = document.createElement('option')
    opt.value = n.iso2
    opt.textContent = `${n.flag_emoji} ${n.name}`
    sel.appendChild(opt)
  })
  const savedCountry = getCookie('wcp_country')
  if (savedCountry) sel.value = savedCountry
  autofillCountryFromIP()
}

async function loadPredictionCount() {
  const { count, error } = await sb
    .from('predictions').select('*', { count: 'exact', head: true })
  if (error) { console.error('loadPredictionCount error:', error); return }
  document.getElementById('prediction-count').textContent =
    count ? `${count.toLocaleString()} predictions so far` : '0 predictions so far'
}

async function loadNationData() {
  const pageSize = 1000
  const byNation = {}

  let from = 0
  let allTournament = []
  while (true) {
    const { data, error } = await sb
      .from('predictions')
      .select('nation_iso2, predicted_winner')
      .is('match_id', null)
      .range(from, from + pageSize - 1)
    if (error) { console.error('loadNationData error:', error); return }
    if (!data || data.length === 0) break
    allTournament = allTournament.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }

  from = 0
  let allMatch = []
  while (true) {
    const { data, error } = await sb
      .from('predictions')
      .select('nation_iso2, match_id, predicted_winner, score')
      .not('match_id', 'is', null)
      .range(from, from + pageSize - 1)
    if (error) { console.error('loadNationData error:', error); return }
    if (!data || data.length === 0) break
    allMatch = allMatch.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }

  allTournament.forEach(row => {
    const iso = row.nation_iso2
    if (!byNation[iso]) byNation[iso] = { tournamentPicks: {}, matchPicks: {}, correct: 0, total: 0 }
    if (row.predicted_winner) {
      byNation[iso].tournamentPicks[row.predicted_winner] =
        (byNation[iso].tournamentPicks[row.predicted_winner] || 0) + 1
    }
  })
  allMatch.forEach(row => {
    const iso = row.nation_iso2
    if (!byNation[iso]) byNation[iso] = { tournamentPicks: {}, matchPicks: {}, correct: 0, total: 0 }
    if (row.match_id) {
      if (!byNation[iso].matchPicks[row.match_id]) byNation[iso].matchPicks[row.match_id] = {}
      byNation[iso].matchPicks[row.match_id][row.predicted_winner] =
        (byNation[iso].matchPicks[row.match_id][row.predicted_winner] || 0) + 1
      if (row.score !== null) {
        byNation[iso].total++
        if (row.score === 1) byNation[iso].correct++
      }
    }
  })
  nations.forEach(n => {
    const d = byNation[n.iso2]
    if (!d) return
    const topPick = Object.entries(d.tournamentPicks).sort((a,b) => b[1]-a[1])[0]
    nationData[n.iso2] = {
      iso: n.iso2, name: n.name,
      pick: topPick ? topPick[0] : null,
      acc: d.total > 0 ? Math.round(d.correct / d.total * 100) : null,
      matchPicks: d.matchPicks,
      tournamentPicks: d.tournamentPicks,
    }
  })
  if (byNation['GB'] && !nationData['GB']) {
    const d = byNation['GB']
    const topPick = Object.entries(d.tournamentPicks).sort((a, b) => b[1] - a[1])[0]
    nationData['GB'] = {
      iso: 'GB', name: 'United Kingdom',
      pick: topPick ? topPick[0] : null,
      acc: d.total > 0 ? Math.round(d.correct / d.total * 100) : null,
      matchPicks: d.matchPicks,
      tournamentPicks: d.tournamentPicks,
    }
  }
}

async function loadTodayMatches() {
  const now = new Date()
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const end = new Date(now); end.setHours(23, 59, 59, 999)

  // Try today first
  let { data, error } = await sb.from('matches').select('*')
    .gte('kickoff_at', start.toISOString())
    .lte('kickoff_at', end.toISOString())
    .order('kickoff_at')
  if (error) { console.error('loadTodayMatches error:', error); return }

  // If nothing today, show the next upcoming match(es) within 5 days
  if (!data || data.length === 0) {
    const lookahead = new Date(now)
    lookahead.setDate(lookahead.getDate() + 5)
    const result = await sb.from('matches').select('*')
      .gt('kickoff_at', now.toISOString())
      .lte('kickoff_at', lookahead.toISOString())
      .order('kickoff_at')
      .limit(3)
    data = result.data || []
  }

  todayMatches = data || []
  renderMatches()
  updatePickPromptVisibility()
}

function renderMatches() {
  const el = document.getElementById('matches-list')
  if (todayMatches.length === 0) {
    el.innerHTML = '<p class="loading">No matches in the next few days.</p>'
    return
  }
  el.innerHTML = ''
  todayMatches.forEach(m => {
    const kickoff = new Date(m.kickoff_at)
    const time = kickoff.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    el.innerHTML += `<div class="match-row">
      <span class="match-time">${time}</span>
      <span class="match-teams">${m.home_team} vs ${m.away_team}</span>
      <div class="match-pick">
        <button class="pick-btn${m.locked?' locked':''}" data-match="${m.id}" data-pick="${m.home_team}" onclick="selectPick(this)">${m.home_team}</button>
        <button class="pick-btn${m.locked?' locked':''}" data-match="${m.id}" data-pick="Draw" onclick="selectPick(this)">Draw</button>
        <button class="pick-btn${m.locked?' locked':''}" data-match="${m.id}" data-pick="${m.away_team}" onclick="selectPick(this)">${m.away_team}</button>
      </div>
    </div>`
  })
}

function selectPick(btn) {
  if (btn.classList.contains('locked')) return
  const mi = btn.dataset.match
  document.querySelectorAll(`.pick-btn[data-match="${mi}"]`).forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  picks[mi] = btn.dataset.pick
}

async function submitPredictions() {
  const iso2 = document.getElementById('country-select').value
  if (!iso2) { alert('Please select your country first'); return }
  if (!tournamentWinner && Object.keys(picks).length === 0) {
    alert('Please make at least one prediction — who wins the World Cup, or a match result')
    return
  }
  const btn = document.getElementById('submit-btn')
  const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value
  if (!turnstileToken) { alert('Please complete the bot check'); return }
  btn.disabled = true; btn.textContent = 'Submitting...'
  setCookie('wcp_country', iso2, 60)
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nation_iso2: iso2,
      tournament_winner: tournamentWinner || null,
      match_picks: picks,
      fingerprint: visitorFingerprint || null,
      'cf-turnstile-response': turnstileToken,
    }),
  })
  const result = await res.json()
  if (res.ok) {
    btn.textContent = 'Submitted!'; btn.style.background = '#3B6D11'
    if (window.turnstile) turnstile.reset()
    setTimeout(() => { btn.textContent = 'Submit picks'; btn.style.background = ''; btn.disabled = false }, 3000)
    loadPredictionCount()
    await loadNationData()
    updateMapColors()
    buildLeaderboards()
    generateShareCard(iso2)
    const userTeam = tournamentWinner || (nationData[iso2] && nationData[iso2].pick)
    if (userTeam) setTimeout(() => {
      firePulse(iso2, userTeam)
      uploadDotBuffers()
      redrawDots()
    }, 500)
    hidePickPrompt()
    setCookie('wcp_picked_date', new Date().toISOString().slice(0, 10), 1)
  } else {
    alert(result.error || 'Something went wrong')
    if (window.turnstile) turnstile.reset()
    btn.disabled = false; btn.textContent = 'Submit picks'
  }
}

function scrollToPredict() {
  document.getElementById('tournament-pick-panel').scrollIntoView({ behavior: 'smooth' })
}

function isoToTwemojiUrl(iso2) {
  const subdivisionFlags = {
    'GB-ENG': '1f3f4-e0067-e0062-e0065-e006e-e0067-e007f',
    'GB-SCT': '1f3f4-e0067-e0062-e0073-e0063-e0074-e007f',
    'GB-WLS': '1f3f4-e0067-e0062-e0077-e006c-e0073-e007f',
    'GB-NIR': '1f1ec-1f1e7',
  }
  if (subdivisionFlags[iso2]) {
    return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${subdivisionFlags[iso2]}.png`
  }
  const points = iso2.toUpperCase().split('').map(c =>
    (0x1F1E6 + c.charCodeAt(0) - 65).toString(16)
  )
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${points.join('-')}.png`
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed: ' + url))
    img.src = url
  })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y)
      line = words[i] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, y)
}

function hexToRgb01(hex) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  return [r, g, b]
}

function drawCountryWithDots(ctx, iso2, teamColor, cx, cy, maxW, maxH, votePct) {
  const feature = getFeatureForIso(iso2)

  const rawPoints = CITY_PULSES[iso2] || null
  let dots = []

  if (rawPoints && rawPoints.length > 0) {
    const pct = (votePct != null && votePct > 0) ? votePct / 100 : 1.0
    const maxDots = Math.max(20, Math.round(400 * pct))
    const sample = rawPoints.length > maxDots
      ? rawPoints.filter((_, i) => i % Math.ceil(rawPoints.length / maxDots) === 0)
      : rawPoints
    dots = sample.map(p => ({ lat: p[0], lng: p[1], w: p[2] }))
  }

  if (!feature) {
    ctx.fillStyle = teamColor + 'CC'
    ctx.beginPath()
    ctx.arc(cx, cy, Math.min(maxW, maxH) * 0.35, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  const projection = d3.geoMercator().fitExtent(
    [[cx - maxW/2, cy - maxH/2], [cx + maxW/2, cy + maxH/2]],
    feature
  )
  const pathGen = d3.geoPath(projection)

  ctx.save()
  const p2d = new Path2D(pathGen(feature))

  ctx.fillStyle = '#111827'
  ctx.fill(p2d)

  const [r, g, b] = hexToRgb01(teamColor)
  ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0.15)`
  ctx.fill(p2d)

  ctx.clip(p2d)

  if (dots.length > 0) {
    dots.forEach(pt => {
      const px = projection([pt.lng, pt.lat])
      if (!px) return
      const alpha = 0.4 + pt.w * 0.6

      // Outer glow
      const glow = ctx.createRadialGradient(px[0], px[1], 0, px[0], px[1], 8)
      glow.addColorStop(0, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha})`)
      glow.addColorStop(1, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(px[0], px[1], 8, 0, Math.PI * 2)
      ctx.fill()

      // Bright core
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`
      ctx.beginPath()
      ctx.arc(px[0], px[1], 1.8, 0, Math.PI * 2)
      ctx.fill()
    })
  } else {
    const bounds = pathGen.bounds(feature)
    const bx = bounds[0][0], by = bounds[0][1]
    const bw = bounds[1][0] - bx, bh = bounds[1][1] - by
    let placed = 0
    let attempts = 0
    const pct2 = (votePct != null && votePct > 0) ? votePct / 100 : 1.0
    const syntheticTarget = Math.max(10, Math.round(200 * pct2))
    while (placed < syntheticTarget && attempts < 2000) {
      attempts++
      const tx = bx + Math.random() * bw
      const ty = by + Math.random() * bh
      if (ctx.isPointInPath(p2d, tx, ty)) {
        const glow2 = ctx.createRadialGradient(tx, ty, 0, tx, ty, 8)
        glow2.addColorStop(0, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0.7)`)
        glow2.addColorStop(1, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0)`)
        ctx.fillStyle = glow2
        ctx.beginPath()
        ctx.arc(tx, ty, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.arc(tx, ty, 1.8, 0, Math.PI * 2)
        ctx.fill()
        placed++
      }
    }
  }

  ctx.restore()
  ctx.strokeStyle = teamColor
  ctx.lineWidth = 4
  ctx.stroke(p2d)
}

async function generateShareCard(iso2) {
  if (!tournamentWinner) return
  const nd = nationData[iso2]
  if (!nd) return

  const tPicks = nd.tournamentPicks || {}
  const totalVotes = Object.values(tPicks).reduce((s, v) => s + v, 0)
  const topEntry = Object.entries(tPicks).sort((a, b) => b[1] - a[1])[0]
  const countryTopTeam = topEntry ? topEntry[0] : null
  const countryTopPct = topEntry && totalVotes > 0 ? Math.round(topEntry[1] / totalVotes * 100) : null
  const myVotes = tPicks[tournamentWinner] || 0
  const myPct = totalVotes > 0 ? Math.round(myVotes / totalVotes * 100) : null
  const isContrarian = countryTopTeam && tournamentWinner !== countryTopTeam
  const isSelfPick = tournamentWinner === nd.name
  const hasEnoughData = totalVotes >= 3

  const nationDisplayName = nd.name || iso2
  const teamData = WC_TEAMS.find(t => t.name === tournamentWinner)
  const teamColor = TEAM_COLORS[tournamentWinner] || '#378ADD'

  let tagline = ''
  let statBig = ''
  let statSub = ''

  if (isSelfPick) {
    tagline = `Home pride 🏠 — I'm backing ${tournamentWinner}`
    statBig = hasEnoughData && countryTopPct !== null ? `${countryTopPct}%` : ''
    statSub = hasEnoughData
      ? `of ${nationDisplayName} is with me`
      : `Be one of the first from ${nationDisplayName} on the map`
  } else if (isContrarian && hasEnoughData && myPct !== null && myPct < 30) {
    tagline = 'Bold call 🔥'
    statBig = `${myPct}%`
    statSub = `of ${nationDisplayName} agrees with me 👀`
  } else {
    tagline = `My pick for 2026 🏆`
    if (hasEnoughData && myPct !== null) {
      statBig = `${myPct}%`
      statSub = myPct >= 50
        ? `of ${nationDisplayName} agrees with me`
        : `of ${nationDisplayName} is with me — the rest are missing out`
    } else {
      statBig = ''
      statSub = `Be one of the first from ${nationDisplayName} on the map`
    }
  }

  const accRanked = Object.values(nationData)
    .filter(d => d.acc !== null)
    .sort((a, b) => b.acc - a.acc)
  const accRankIndex = accRanked.findIndex(d => d.iso === iso2)
  const accRank = accRankIndex >= 0 ? accRankIndex + 1 : null
  const accTotal = accRanked.length
  const hasAccData = accRank !== null && accRanked.length >= 3

  let globalLine = ''
  if (isContrarian && hasEnoughData && myPct !== null && myPct < 30) {
    globalLine = `Bold pick? Add yours to the map · worldcupmap.io`
  } else if (hasEnoughData && countryTopPct !== null && countryTopPct >= 60 && !isContrarian) {
    globalLine = `${nationDisplayName} is united 🌍 — are you?`
  } else if (hasAccData) {
    if (accRank === 1) {
      globalLine = `${nationDisplayName} leads the world. Can anyone top us? 👀`
    } else if (accRank <= 3) {
      globalLine = `${nationDisplayName} is top 3. We're coming for #1.`
    } else if (accRank <= 10) {
      globalLine = `${nationDisplayName} is top 10 globally. Watch out.`
    } else {
      globalLine = `Where does your country stand? 🌍 worldcupmap.io`
    }
  } else {
    globalLine = `Where does your country stand? 🌍 worldcupmap.io`
  }

  let flagImg = null
  let teamFlagImg = null
  const teamIso = nations.find(n => n.name === tournamentWinner)?.iso2
    || TEAMS.find(t => t.name === tournamentWinner)?.iso
    || UK_NATIONS.find(t => t.name === tournamentWinner)?.iso
    || null
  try {
    flagImg = await loadImage(isoToTwemojiUrl(iso2))
  } catch (e) {
    console.warn('Flag load failed:', e)
  }
  try {
    if (teamIso) teamFlagImg = await loadImage(isoToTwemojiUrl(teamIso))
  } catch (e) {
    console.warn('Team flag load failed:', e)
  }

  const canvas = document.getElementById('share-canvas')
  const ctx = canvas.getContext('2d')
  const W = 1080, H = 1920
  canvas.width = W; canvas.height = H

  // Background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, W, H)

  // Subtle gradient overlay using team colour
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, `rgba(${parseInt(teamColor.slice(1,3),16)},${parseInt(teamColor.slice(3,5),16)},${parseInt(teamColor.slice(5,7),16)},0.08)`)
  grad.addColorStop(1, `rgba(${parseInt(teamColor.slice(1,3),16)},${parseInt(teamColor.slice(3,5),16)},${parseInt(teamColor.slice(5,7),16)},0.18)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Top accent bar
  ctx.fillStyle = teamColor
  ctx.fillRect(0, 0, W, 8)

  const PAD = 88

  // Header
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('WORLD CUP MAP 2026', W/2, 80)

  // Country shape with dots — hero visual, centred in top half
  const shapeSize = 820
  drawCountryWithDots(ctx, iso2, teamColor, W/2, 560, shapeSize, shapeSize * 0.75, myPct)

  // Two flags + "backs" relationship — the hero message
  const fSize = 96
  const startX = W/2 - 220

  // User country flag
  if (flagImg) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(startX, 950, fSize, fSize, 10)
    ctx.clip()
    ctx.drawImage(flagImg, startX, 950, fSize, fSize)
    ctx.restore()
  }

  // "backs" text
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '500 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('backs', W/2, 1006)

  // Team flag
  if (teamFlagImg) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(W/2 + 80, 950, fSize, fSize, 10)
    ctx.clip()
    ctx.drawImage(teamFlagImg, W/2 + 80, 950, fSize, fSize)
    ctx.restore()
  }

  // Nation name + team name on one line beneath
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '700 58px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${nationDisplayName.toUpperCase()} BACKS ${tournamentWinner.toUpperCase()}`, W/2, 1110)

  // Divider
  ctx.strokeStyle = teamColor + '55'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, 1160)
  ctx.lineTo(W - PAD, 1160)
  ctx.stroke()

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '400 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  wrapText(ctx, tagline, W/2, 1240, W - PAD*2, 66)

  // Stat section
  if (statBig) {
    ctx.fillStyle = '#fff'
    ctx.font = '800 260px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(statBig, W/2, 1530)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '500 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    wrapText(ctx, statSub, W/2, 1620, W - PAD*2, 70)

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '600 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    wrapText(ctx, globalLine, W/2, 1760, W - PAD*2, 70)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '400 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    wrapText(ctx, statSub, W/2, 1540, W - PAD*2, 72)

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '600 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    wrapText(ctx, globalLine, W/2, 1680, W - PAD*2, 72)
  }

  // Accuracy badge
  if (hasAccData) {
    let rankText = accRank === 1 ? `🥇 #1 most accurate nation`
      : accRank === 2 ? `🥈 #2 most accurate nation`
      : accRank === 3 ? `🥉 #3 most accurate nation`
      : accRank <= 10 ? `#${accRank} most accurate nation`
      : `#${accRank} of ${accTotal} nations`
    let rankColor = accRank === 1 ? '#FFD700' : accRank === 2 ? '#C0C0C0' : accRank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.6)'
    ctx.fillStyle = rankColor
    ctx.font = '600 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(rankText, W/2, 1830)
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '400 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Add your country\'s pick →', PAD, 1880)

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '600 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('worldcupmap.io', W - PAD, 1880)

  // Bottom accent bar
  ctx.fillStyle = teamColor
  ctx.fillRect(0, H - 8, W, 8)

  const preview = document.getElementById('share-preview')
  preview.src = canvas.toDataURL('image/jpeg', 0.85)
  document.getElementById('share-modal').style.display = 'flex'
}

function closeShareModal() {
  document.getElementById('share-modal').style.display = 'none'
}

async function shareCard(blob, intent) {
  // intent: 'stories' | 'whatsapp'
  const text = "Who do you back to win the 2026 World Cup? worldcupmap.io"
  const file = new File([blob], 'worldcupmap-prediction.png', { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return
    } catch (err) {
      if (err.name === 'AbortError') return
      // fall through to download
    }
  }
  // Fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'worldcupmap-prediction.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function shareCardStories() {
  const canvas = document.getElementById('share-canvas')
  canvas.toBlob(blob => shareCard(blob, 'stories'), 'image/png')
}

async function shareCardWhatsApp() {
  const canvas = document.getElementById('share-canvas')
  canvas.toBlob(blob => shareCard(blob, 'whatsapp'), 'image/png')
}

function updatePickPromptVisibility() {
  const hasWinnerCookie = !!getCookie('wcp_tournament_winner')
  const hasUnlockedMatches = todayMatches.some(m => !m.locked)
  const pickedToday = getCookie('wcp_picked_date') === new Date().toISOString().slice(0, 10)

  if (hasWinnerCookie && (!hasUnlockedMatches || pickedToday)) {
    hidePickPrompt()
  }
}

function hidePickPrompt() {
  const el = document.getElementById('pick-prompt')
  if (el) el.style.display = 'none'
}

function buildLeaderboards() {
  const pickEl = document.getElementById('lb-pick')
  const accEl = document.getElementById('lb-acc')
  pickEl.innerHTML = ''; accEl.innerHTML = ''

  const allPickCounts = {}
  Object.values(nationData).forEach(d => {
    Object.entries(d.tournamentPicks || {}).forEach(([team, count]) => {
      allPickCounts[team] = (allPickCounts[team] || 0) + count
    })
  })

  const allSorted = Object.entries(allPickCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)

  const maxPick = allSorted[0]?.[1] || 1
  const topRows = allSorted.slice(0, 8)
  const moreRows = allSorted.slice(8)

  topRows.forEach(([team, count], i) => {
    const color = TEAM_COLORS[team] || '#888'
    const flag = WC_TEAMS.find(t => t.name === team)?.flag || ''
    pickEl.innerHTML += `<div class="lb-row">
      <span class="lb-rank">${i+1}</span>
      <span class="lb-flag"><img src="${flag ? flagToTwemojiUrl(flag) : ''}" class="team-flag" alt=""></span>
      <span class="lb-name">${team}</span>
      <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(count/maxPick*100)}%;background:${color}"></div></div>
      <span class="lb-val">${count}</span>
    </div>`
  })

  if (moreRows.length > 0) {
    const moreEl = document.createElement('div')
    moreEl.id = 'lb-pick-more'
    moreEl.style.display = 'none'
    moreRows.forEach(([team, count], i) => {
      const color = TEAM_COLORS[team] || '#888'
      const flag = WC_TEAMS.find(t => t.name === team)?.flag || ''
      moreEl.innerHTML += `<div class="lb-row">
        <span class="lb-rank">${i+9}</span>
        <span class="lb-flag"><img src="${flag ? flagToTwemojiUrl(flag) : ''}" class="team-flag" alt=""></span>
        <span class="lb-name">${team}</span>
        <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(count/maxPick*100)}%;background:${color}"></div></div>
        <span class="lb-val">${count}</span>
      </div>`
    })
    pickEl.appendChild(moreEl)

    const toggleBtn = document.createElement('button')
    toggleBtn.className = 'lb-show-more'
    toggleBtn.textContent = `Show ${moreRows.length} more`
    toggleBtn.onclick = () => {
      const isHidden = moreEl.style.display === 'none'
      moreEl.style.display = isHidden ? 'block' : 'none'
      toggleBtn.textContent = isHidden ? 'Show less' : `Show ${moreRows.length} more`
    }
    pickEl.appendChild(toggleBtn)
  }

  const accNations = Object.values(nationData).filter(d=>d.acc!==null).sort((a,b)=>b.acc-a.acc).slice(0,6)
  if (accNations.length === 0) {
    accEl.innerHTML = '<p class="no-data">Accuracy data available after first match results.</p>'
    return
  }
  accNations.forEach((d, i) => {
    accEl.innerHTML += `<div class="lb-row">
      <span class="lb-rank">${i+1}</span>
      <span class="lb-flag">${getFlagEmoji(d.iso)}</span>
      <span class="lb-name">${d.name}</span>
      <div class="bar-wrap"><div class="bar-fill" style="width:${d.acc}%;background:#378ADD"></div></div>
      <span class="lb-val">${d.acc}%</span>
    </div>`
  })
}

function getColorForIso(iso) {
  const nd = iso ? nationData[iso] : null
  if (!nd) return null
  if (currentView === 'wc') {
    return nd.pick && TEAM_COLORS[nd.pick] ? TEAM_COLORS[nd.pick] + 'cc' : null
  }
  if (!todayMatches.length || !nd.matchPicks) return null
  const mp = nd.matchPicks[todayMatches[0].id]
  if (!mp) return null
  const top = Object.entries(mp).sort((a,b)=>b[1]-a[1])[0]
  if (!top) return null
  return top[0]==='Draw' ? 'rgba(136,135,128,0.8)' : (TEAM_COLORS[top[0]] ? TEAM_COLORS[top[0]]+'cc' : null)
}

function mergeUKPredictionData() {
  const merged = { tournamentPicks: {}, matchPicks: {} }
  UK_ISO_CODES.forEach(iso => {
    const nd = nationData[iso]
    if (!nd) return
    Object.entries(nd.tournamentPicks || {}).forEach(([team, count]) => {
      merged.tournamentPicks[team] = (merged.tournamentPicks[team] || 0) + count
    })
    Object.entries(nd.matchPicks || {}).forEach(([matchId, picks]) => {
      if (!merged.matchPicks[matchId]) merged.matchPicks[matchId] = {}
      Object.entries(picks).forEach(([team, count]) => {
        merged.matchPicks[matchId][team] = (merged.matchPicks[matchId][team] || 0) + count
      })
    })
  })
  return merged
}

function resolveUKColor() {
  const merged = mergeUKPredictionData()
  if (currentView === 'wc') {
    const top = Object.entries(merged.tournamentPicks).sort((a, b) => b[1] - a[1])[0]
    if (!top) return null
    return TEAM_COLORS[top[0]] ? TEAM_COLORS[top[0]] + 'cc' : null
  }
  if (!todayMatches.length) return null
  const mp = merged.matchPicks[todayMatches[0].id]
  if (!mp) return null
  const top = Object.entries(mp).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  return top[0] === 'Draw' ? 'rgba(136,135,128,0.8)' : (TEAM_COLORS[top[0]] ? TEAM_COLORS[top[0]] + 'cc' : null)
}

function resolvePulseIso2(iso2) {
  if (iso2 !== 'GB') return iso2
  let r = Math.random()
  for (const [iso, weight] of GB_SUBDIVISION_WEIGHTS) {
    r -= weight
    if (r <= 0) return iso
  }
  return 'GB-ENG'
}

function updateMapColors() {
  if (!svgPaths) return
  svgPaths.attr('fill', d => {
    const name = d.properties && d.properties.name
    if (!name) return '#1e1e1e'
    if (name === 'United Kingdom') return resolveUKColor() || '#1e1e1e'
    const iso = resolveIso(name)
    if (iso === null && COUNTRY_NAME_TO_ISO.hasOwnProperty(name)) return '#1e1e1e'
    return getColorForIso(iso) || '#1e1e1e'
  })
}

function buildTooltipWC(nd, name, showAll) {
  if (!nd.pick) return '<div class="no-data">No predictions yet</div>'
  const allSorted = Object.entries(nd.tournamentPicks||{}).sort((a,b)=>b[1]-a[1])
  const totalVotes = Object.values(nd.tournamentPicks||{}).reduce((s, v) => s + v, 0)
  const entries = showAll ? allSorted : allSorted.slice(0, 5)
  let html = entries.map(([team,count]) => {
    const pct = Math.round(count/totalVotes*100)
    return `<div class="tt-row">
      <span class="tt-label">${team}</span>
      <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${TEAM_COLORS[team]||'#888'}"></div></div>
      <span class="tt-val">${pct}% <span style="color:rgba(255,255,255,0.35);font-size:10px">(${count})</span></span>
    </div>`
  }).join('')
  if (!showAll && allSorted.length > 5) {
    html += `<div style="font-size:12px;opacity:0.45;text-align:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08)">+ ${allSorted.length - 5} more teams — click to expand</div>`
  }
  return html
}

function buildTooltipMatchday(nd) {
  if (!nd.matchPicks||!todayMatches.length) return '<div class="no-data">No predictions yet</div>'
  return todayMatches.map(m => {
    const mp = nd.matchPicks[m.id]
    if (!mp) return ''
    const entries = Object.entries(mp).sort((a,b)=>b[1]-a[1])
    const total = entries.reduce((s,[,v])=>s+v,0)
    return `<div style="margin-top:5px;padding-top:4px;border-top:0.5px solid rgba(255,255,255,0.08)">
      <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:3px">${m.home_team} vs ${m.away_team}</div>
      ${entries.slice(0,2).map(([k,v]) => {
        const pct = Math.round(v/total*100)
        return `<div class="tt-row">
          <span class="tt-label">${k}</span>
          <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${k==='Draw'?'#888':(TEAM_COLORS[k]||'#888')}"></div></div>
          <span class="tt-val">${pct}% <span style="color:rgba(255,255,255,0.35);font-size:10px">(${v})</span></span>
        </div>`
      }).join('')}
    </div>`
  }).join('')
}

function buildTooltipUK() {
  const hasAnyData = UK_NATIONS.some(n => nationData[n.iso])
  if (!hasAnyData) return '<div class="no-data">No predictions yet from the UK</div>'
  return UK_NATIONS.map(nation => {
    const nd = nationData[nation.iso]
    const flag = countryFlagImg(nation.iso)
    if (!nd) {
      return `<div class="tt-uk-nation">
        <div class="tt-uk-label">${flag} ${nation.name}</div>
        <div class="no-data" style="font-size:10px">No data yet</div>
      </div>`
    }
    if (currentView === 'wc') {
      const entries = Object.entries(nd.tournamentPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (!entries.length) {
        return `<div class="tt-uk-nation">
          <div class="tt-uk-label">${flag} ${nation.name}</div>
          <div class="no-data" style="font-size:10px">No data yet</div>
        </div>`
      }
      const total = Object.values(nd.tournamentPicks || {}).reduce((s, v) => s + v, 0)
      return `<div class="tt-uk-nation">
        <div class="tt-uk-label">${flag} ${nation.name}</div>
        ${entries.map(([team, count]) => {
          const pct = Math.round(count / total * 100)
          return `<div class="tt-row">
            <span class="tt-label">${team}</span>
            <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${TEAM_COLORS[team] || '#888'}"></div></div>
            <span class="tt-val">${pct}% <span style="color:rgba(255,255,255,0.35);font-size:10px">(${count})</span></span>
          </div>`
        }).join('')}
      </div>`
    }
    if (!todayMatches.length) {
      return `<div class="tt-uk-nation">
        <div class="tt-uk-label">${flag} ${nation.name}</div>
        <div class="no-data" style="font-size:10px">No matches today</div>
      </div>`
    }
    const mp = nd.matchPicks?.[todayMatches[0].id]
    if (!mp) {
      return `<div class="tt-uk-nation"><div class="tt-uk-label">${flag} ${nation.name}</div><div class="no-data" style="font-size:10px">No picks yet</div></div>`
    }
    const entries = Object.entries(mp).sort((a, b) => b[1] - a[1]).slice(0, 1)
    const total = Object.values(mp).reduce((s, v) => s + v, 0)
    const m = todayMatches[0]
    return `<div class="tt-uk-nation">
      <div class="tt-uk-label">${flag} ${nation.name}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:2px">${m.home_team} vs ${m.away_team}</div>
      ${entries.map(([k, v]) => {
        const pct = Math.round(v / total * 100)
        return `<div class="tt-row">
          <span class="tt-label">${k}</span>
          <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${k === 'Draw' ? '#888' : (TEAM_COLORS[k] || '#888')}"></div></div>
          <span class="tt-val">${pct}% <span style="color:rgba(255,255,255,0.35);font-size:10px">(${v})</span></span>
        </div>`
      }).join('')}
    </div>`
  }).join('<div style="height:1px;background:rgba(255,255,255,0.08);margin:5px 0"></div>')
}

function showTooltip(event, name, isUK, mapWrap, width, showAll) {
  const tooltip = document.getElementById('tooltip')
  const rect = mapWrap.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const countryEl = tooltip.querySelector('.tt-country')
  if (isUK) {
    countryEl.innerHTML = `${countryFlagImg('GB')} United Kingdom`
  } else {
    countryEl.innerHTML = `${countryFlagImg(resolveIso(name))} ${name}`
  }
  document.getElementById('tt-body').innerHTML = isUK
    ? buildTooltipUK()
    : (() => {
        const iso = resolveIso(name)
        const nd = iso ? nationData[iso] : null
        return nd
          ? (currentView==='wc' ? buildTooltipWC(nd, name, showAll) : buildTooltipMatchday(nd))
          : '<div class="no-data">No predictions yet</div>'
      })()
  tooltip.style.display = 'block'
  tooltip.style.left = Math.min(x+14, width-240)+'px'
  tooltip.style.top = Math.max(y-70, 4)+'px'
}

function switchView(view, btn) {
  currentView = view
  document.querySelectorAll('.vtab').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  updateMapColors()
}

function clipErosionForBounds(bounds) {
  const w = bounds[1][0] - bounds[0][0]
  const h = bounds[1][1] - bounds[0][1]
  const size = Math.max(w, h)
  if (size < 20) return 0
  if (size > 100) return 2
  return ((size - 20) / 80) * 2
}

function resetDotClipCache(width, height) {
  window._countryPaths = null
  window._countryErosion = null
  if (window._clipCanvas && width && height) {
    window._clipCanvas.width = width
    window._clipCanvas.height = height
  }
}

function getMapDimensions(attempt = 0) {
  const mapWrap = document.getElementById('map-wrap')
  const container = document.getElementById('map')
  const isMobile = window.innerWidth < 640
  const width = Math.round(container?.offsetWidth || mapWrap?.offsetWidth || 800)
  let height
  if (isMobile) {
    const wrapH = Math.round(mapWrap?.getBoundingClientRect().height || 0)
    if (wrapH < 100 && attempt < 8) return null
    height = Math.max(420, wrapH || Math.round(window.innerHeight * 0.65))
  } else {
    height = Math.round(width * 0.52)
  }
  return { width, height, isMobile }
}

function syncDotCanvasToMap() {
  const canvas = document.getElementById('dot-canvas')
  const svg = document.querySelector('#map svg')
  const mapWrap = document.getElementById('map-wrap')
  if (!canvas || !svg || !mapWrap) return
  const svgRect = svg.getBoundingClientRect()
  const wrapRect = mapWrap.getBoundingClientRect()
  canvas.style.top = `${svgRect.top - wrapRect.top}px`
  canvas.style.left = `${svgRect.left - wrapRect.left}px`
  canvas.style.width = `${svgRect.width}px`
  canvas.style.height = `${svgRect.height}px`
}

function initWebGL(width, height) {
  const canvas = document.getElementById('dot-canvas')
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  glWidth = width
  glHeight = height

  gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true })
  if (!gl) { console.warn('WebGL not supported, falling back'); return }

  // Vertex shader — applies D3 zoom transform, outputs position
  const vertSrc = `
    attribute vec2 aPos;
    attribute vec3 aCol;
    uniform float uTx, uTy, uK;
    uniform float uW, uH;
    varying vec3 vCol;
    void main() {
      float sx = aPos.x * uK + uTx;
      float sy = aPos.y * uK + uTy;
      float cx = (sx / uW) * 2.0 - 1.0;
      float cy = 1.0 - (sy / uH) * 2.0;
      gl_Position = vec4(cx, cy, 0.0, 1.0);
      gl_PointSize = clamp(2.6 + uK * 0.35, 2.6, 6.5);
      vCol = aCol;
    }
  `

  // Fragment shader — LED look: white-hot core + colored halo
  const fragSrc = `
    precision mediump float;
    varying vec3 vCol;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float core = smoothstep(0.18, 0.0, d);
      float halo = smoothstep(0.5, 0.05, d);
      vec3 color = mix(vCol, vec3(1.0), core * 0.85);
      float alpha = halo * 0.55 + core * 0.45;
      gl_FragColor = vec4(color, alpha);
    }
  `

  function compileShader(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }

  glProgram = gl.createProgram()
  gl.attachShader(glProgram, compileShader(gl.VERTEX_SHADER, vertSrc))
  gl.attachShader(glProgram, compileShader(gl.FRAGMENT_SHADER, fragSrc))
  gl.linkProgram(glProgram)
  gl.useProgram(glProgram)

  glBuffer = gl.createBuffer()
  glColorBuffer = gl.createBuffer()
  glWeightBuffer = gl.createBuffer()

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE) // additive blending — the glow effect
  gl.viewport(0, 0, canvas.width, canvas.height)
}

function uploadDotBuffers() {
  if (!gl || !glBuffer || dotPoints.length === 0) return

  // Off-screen canvas for isPointInPath boundary checking
  if (!window._clipCanvas) {
    window._clipCanvas = document.createElement('canvas')
    window._clipCtx = window._clipCanvas.getContext('2d')
  }
  if (window._clipCanvas.width !== glWidth || window._clipCanvas.height !== glHeight) {
    window._clipCanvas.width = glWidth
    window._clipCanvas.height = glHeight
    window._countryPaths = null
    window._countryErosion = null
  }
  const clipCtx = window._clipCtx

  // Build a path2D per ISO2 from world features for boundary clipping
  if (!window._countryPaths) {
    window._countryPaths = {}
    window._countryErosion = {}
    if (window._worldFeatures && mapProjection) {
      const pathGen = d3.geoPath(mapProjection)

      window._worldFeatures.forEach(f => {
        const name = f.properties && f.properties.name
        const iso2 = name && COUNTRY_NAME_TO_ISO[name]
        if (!iso2) return
        const svgStr = pathGen(f)
        if (svgStr) {
          try {
            window._countryPaths[iso2] = new Path2D(svgStr)
            window._countryErosion[iso2] = clipErosionForBounds(pathGen.bounds(f))
          } catch(e) {}
        }
      })

      const gbFeature = window._worldFeatures.find(f =>
        f.properties && f.properties.name === 'United Kingdom')
      if (gbFeature) {
        const gbSvg = pathGen(gbFeature)
        if (gbSvg) {
          const gbPath = new Path2D(gbSvg)
          const gbErosion = clipErosionForBounds(pathGen.bounds(gbFeature))
          ;['GB-ENG','GB-SCT','GB-WLS','GB-NIR'].forEach(sub => {
            window._countryPaths[sub] = gbPath
            window._countryErosion[sub] = gbErosion
          })
        }
      }
    }
  }

  const validPositions = []
  const validColors = []
  const validWeights = []

  dotPoints.forEach(p => {
    const proj = mapProjection([p.lng, p.lat])
    if (!proj) return

    // Check if dot falls inside its country boundary (erosion scales with projected country size)
    const path = window._countryPaths && window._countryPaths[p.iso2]
    if (path) {
      const erosion = window._countryErosion?.[p.iso2] ?? 2
      let inside
      if (erosion === 0) {
        inside = clipCtx.isPointInPath(path, proj[0], proj[1], 'evenodd')
      } else {
        inside = clipCtx.isPointInPath(path, proj[0], proj[1], 'evenodd') &&
                 clipCtx.isPointInPath(path, proj[0] + erosion, proj[1], 'evenodd') &&
                 clipCtx.isPointInPath(path, proj[0] - erosion, proj[1], 'evenodd') &&
                 clipCtx.isPointInPath(path, proj[0], proj[1] + erosion, 'evenodd') &&
                 clipCtx.isPointInPath(path, proj[0], proj[1] - erosion, 'evenodd')
      }
      if (!inside) return
    }

    validPositions.push(proj[0], proj[1])
    validColors.push(p.r, p.g, p.b)
    validWeights.push(p.w != null ? p.w : 0.5)
  })

  if (validPositions.length === 0) return

  const positions = new Float32Array(validPositions)
  const colors = new Float32Array(validColors)

  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, glColorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, glWeightBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(validWeights), gl.STATIC_DRAW)
  glPointCount = validPositions.length / 2
}

function redrawDots() {
  if (!gl || !glProgram || glPointCount === 0) return
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(glProgram)

  // Bind position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
  const aPosLoc = gl.getAttribLocation(glProgram, 'aPos')
  gl.enableVertexAttribArray(aPosLoc)
  gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)

  // Bind color buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, glColorBuffer)
  const aColLoc = gl.getAttribLocation(glProgram, 'aCol')
  gl.enableVertexAttribArray(aColLoc)
  gl.vertexAttribPointer(aColLoc, 3, gl.FLOAT, false, 0, 0)

  // Set uniforms
  const t = currentZoomTransform
  gl.uniform1f(gl.getUniformLocation(glProgram, 'uTx'), t.x)
  gl.uniform1f(gl.getUniformLocation(glProgram, 'uTy'), t.y)
  gl.uniform1f(gl.getUniformLocation(glProgram, 'uK'),  t.k)
  gl.uniform1f(gl.getUniformLocation(glProgram, 'uW'),  glWidth)
  gl.uniform1f(gl.getUniformLocation(glProgram, 'uH'),  glHeight)

  gl.drawArrays(gl.POINTS, 0, glPointCount)
}

function firePulse(iso2, teamName, attempt = 0) {
  if (!mapProjection) {
    if (attempt < 10) setTimeout(() => firePulse(iso2, teamName, attempt + 1), 500)
    return
  }
  const pulseIso = resolvePulseIso2(iso2)
  const city = getPulseCity(pulseIso)
  if (!city) return
  const jitterLng = (Math.random() - 0.5) * 0.18
  const jitterLat = (Math.random() - 0.5) * 0.14
  const w = city.weight != null ? city.weight : 0.5
  const [r, g, b] = [1.0, 1.0, 1.0]
  dotPoints.push({ lng: city.lng + jitterLng, lat: city.lat + jitterLat, r, g, b, iso2: pulseIso, w })
}

async function loadRecentPulses() {
  if (!mapProjection) {
    setTimeout(loadRecentPulses, 500)
    return
  }
  try {
    let allData = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await sb
        .from('predictions')
        .select('nation_iso2, predicted_winner, created_at, id')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)
      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }

    if (allData.length > 0) {
      lastPulseTimestamp = allData[allData.length - 1].created_at
    }

    // Build dot points
    allData.forEach(row => {
      const nd = nationData[row.nation_iso2]
      const teamName = row.predicted_winner || (nd && nd.pick) || null
      if (!teamName) return
      firePulse(row.nation_iso2, teamName)
    })

    // Upload to GPU and render
    uploadDotBuffers()
    redrawDots()
  } catch (e) {
    console.warn('loadRecentPulses failed:', e)
  }
}

async function pollNewPulses() {
  if (!lastPulseTimestamp) return
  try {
    const { data, error } = await sb
      .from('predictions')
      .select('nation_iso2, predicted_winner, created_at, id')
      .gt('created_at', lastPulseTimestamp)
      .order('id', { ascending: true })
      .limit(20)
    if (error || !data || data.length === 0) return
    lastPulseTimestamp = data[data.length - 1].created_at
    data.forEach(row => {
      const nd = nationData[row.nation_iso2]
      const teamName = row.predicted_winner || (nd && nd.pick) || null
      if (!teamName) return
      firePulse(row.nation_iso2, teamName)
    })
    uploadDotBuffers()
    redrawDots()
  } catch (e) {
    console.warn('pollNewPulses failed:', e)
  }
}

function buildMap(attempt = 0) {
  const container = document.getElementById('map')
  if (!container) return
  const dims = getMapDimensions(attempt)
  if (!dims) {
    requestAnimationFrame(() => buildMap(attempt + 1))
    return
  }
  const { width, height, isMobile } = dims
  if (!width) {
    requestAnimationFrame(() => buildMap(attempt + 1))
    return
  }
  container.innerHTML = ''
  container.style.height = height + 'px'
  const svg = d3.select('#map').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('cursor', 'grab')
  const projection = d3.geoNaturalEarth1()
    .scale(isMobile ? width / 5.0 : width / 6.3)
    .translate([width / 2, height / 2.1])
    .rotate([-10, 0])
  const path = d3.geoPath(projection)
  mapProjection = projection
  resetDotClipCache(width, height)
  // Init WebGL dot canvas — must match SVG viewBox pixel dimensions
  initWebGL(width, height)
  syncDotCanvasToMap()

  const mapWrap = document.getElementById('map-wrap')
  const tooltip = document.getElementById('tooltip')
  let tooltipSticky = false

  const zoom = d3.zoom()
    .scaleExtent([1, 16])
    .translateExtent([[0,0],[width,height]])
    .on('zoom', event => {
      g.attr('transform', event.transform)
      svg.style('cursor', event.transform.k > 1 ? 'grabbing' : 'grab')
      tooltipSticky = false
      tooltip.style.display = 'none'
      currentZoomTransform = event.transform
      redrawDots()
    })
  svg.call(zoom)
  svg.on('click', function(event) {
    if (!event.target.closest || !event.target.closest('path.country')) {
      tooltipSticky = false
      tooltip.style.display = 'none'
    }
  })
  svg.on('dblclick.zoom', null)
  svg.on('dblclick', () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity))

  const controls = d3.select('#map').append('div').attr('id', 'zoom-controls')
  controls.append('button').attr('id','zoom-in').text('+').on('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.5))
  controls.append('button').attr('id','zoom-reset').text('⌂').on('click', () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity))
  controls.append('button').attr('id','zoom-out').text('−').on('click', () => svg.transition().duration(300).call(zoom.scaleBy, 0.67))

  const g = svg.append('g')

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json').then(world => {
    const features = topojson.feature(world, world.objects.countries).features
      .filter(d => d.properties && d.properties.name !== 'Antarctica')
    window._worldFeatures = features
    svgPaths = g.selectAll('path.country').data(features).join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-width', 0.4)
      .attr('fill', '#1e1e1e')
      .attr('cursor', 'pointer')
      .on('mousemove', function(event, d) {
        const name = d.properties && d.properties.name
        if (!name) return
        d3.select(this).attr('opacity', 0.7)
        if (!tooltipSticky) showTooltip(event, name, name === 'United Kingdom', mapWrap, width, false)
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1)
        if (!tooltipSticky) {
          tooltip.style.display = 'none'
        }
      })
      .on('click', function(event, d) {
        const name = d.properties && d.properties.name
        if (!name) return
        tooltipSticky = true
        showTooltip(event, name, name === 'United Kingdom', mapWrap, width, true)
        event.stopPropagation()
      })
      .on('touchstart', function(event, d) {
        const touch = event.touches[0]
        this._touchStart = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
          name: d.properties && d.properties.name,
        }
      }, { passive: true })
      .on('touchend', function(event, d) {
        const start = this._touchStart
        this._touchStart = null
        if (!start || !start.name) return
        const touch = event.changedTouches[0]
        const dx = Math.abs(touch.clientX - start.x)
        const dy = Math.abs(touch.clientY - start.y)
        const dt = Date.now() - start.time
        // Movement >10px or duration >400ms = drag, not tap. Let d3-zoom handle it.
        if (dx > 10 || dy > 10 || dt > 400) return
        event.preventDefault()
        event.stopPropagation()
        const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY }
        const isUK = start.name === 'United Kingdom'
        tooltipSticky = true
        window._currentTooltipCountry = start.name
        showTooltip(fakeEvent, start.name, isUK, mapWrap, width, true)
      }, { passive: false })
    if (!window._tooltipTouchDismiss) {
      window._tooltipTouchDismiss = true
      const tooltipEl = document.getElementById('tooltip')
      tooltipEl.addEventListener('touchstart', function(e) {
        e.stopPropagation()
      }, { passive: true })
      tooltipEl.addEventListener('touchend', function(e) {
        e.stopPropagation()
      }, { passive: true })
      // Tap anywhere outside country/tooltip dismisses
      document.addEventListener('touchstart', function(e) {
        if (!e.target.closest('path.country') && !e.target.closest('#tooltip')) {
          tooltipSticky = false
          window._currentTooltipCountry = null
          tooltipEl.style.display = 'none'
        }
      })
    }
    updateMapColors()
    syncDotCanvasToMap()
    if (dotPoints.length > 0) {
      uploadDotBuffers()
      redrawDots()
    }

    // Pre-zoom to visitor's country on mobile + cold landing
    function preZoomToCountry(iso2) {
      if (!iso2) return
      const isUK = iso2 === 'GB' || iso2.startsWith('GB-')
      const nation = nations.find(n => n.iso2 === iso2.toUpperCase())
      const lookupName = isUK ? 'United Kingdom' : (nation ? nation.name : null)
      if (!lookupName) return
      const feature = features.find(f => f.properties && f.properties.name === lookupName)
      if (!feature) return
      const [[x0, y0], [x1, y1]] = path.bounds(feature)
      const dx = x1 - x0, dy = y1 - y0
      if (dx <= 0 || dy <= 0) return
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
      const scale = Math.min(6, Math.max(2, 0.6 / Math.max(dx / width, dy / height)))
      const tx = width / 2 - scale * cx
      const ty = height / 2 - scale * cy
      svg.transition().duration(1800).ease(d3.easeCubicOut)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
    }
    async function preZoomBootstrap() {
      if (window.__COUNTRY_LANDING__ && window.__COUNTRY_LANDING__.iso2) {
        return preZoomToCountry(window.__COUNTRY_LANDING__.iso2)
      }
      const cookieIso = getCookie('wcp_country')
      if (cookieIso) return preZoomToCountry(cookieIso)
      try {
        const r = await fetch('/api/whereami')
        const j = await r.json()
        if (j.country) preZoomToCountry(j.country)
      } catch (e) {}
    }
    setTimeout(preZoomBootstrap, 2000)
  })
}

function toggleHistoryBlock(id) {
  const body = document.getElementById(id)
  const chevron = document.getElementById(id + '-chevron')
  if (!body) return
  const isOpen = body.style.display !== 'none'
  body.style.display = isOpen ? 'none' : 'block'
  if (chevron) chevron.textContent = isOpen ? '▾' : '▴'
}

async function loadPersonalStats() {
  if (!visitorFingerprint) return
  try {
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: visitorFingerprint })
    })
    const data = await res.json()
    if (!res.ok) return

    const el = document.getElementById('personal-stats')
    if (!el) return

    const hasStats = !data.insufficient_data
    const hasHistory = data.history && data.history.length > 0

    if (!hasStats && !hasHistory) return

    el.style.display = 'block'
    let html = ''

    if (hasStats) {
      html += `<div id="personal-stats-top">`
      html += `<div class="stat-item"><span class="stat-label">Predictions</span><span class="stat-value">${data.correct}/${data.total} correct (${data.accuracy}%)</span></div>`
      html += `<div class="stat-item"><span class="stat-label">Global</span><span class="stat-value">Top ${Math.max(1, 100 - data.global_percentile)}%</span></div>`
      html += `<div class="stat-item"><span class="stat-label">National</span><span class="stat-value">Top ${Math.max(1, 100 - data.national_percentile)}%</span></div>`
      html += `</div>`
    }

    if (data.history && data.history.length > 0) {
      html += `<div id="personal-history">`
      html += `<div class="personal-history-title">My World Cup Journey</div>`

      data.history.forEach((r, idx) => {
        const teamData = WC_TEAMS.find(t => t.name === r.tournamentPick)
        const teamColor = TEAM_COLORS[r.tournamentPick] || '#378ADD'
        const teamFlag = teamData ? teamData.flag : ''
        const accuracyStr = r.total > 0 ? `${r.correct}/${r.total}` : null
        const isCurrentRound = r.round === currentRound
        const isPerfect = r.isPerfect
        const blockId = `history-block-${r.round}`
        const startOpen = isCurrentRound || idx === data.history.length - 1
        const blockClass = isPerfect ? 'history-round-block perfect-round' : 'history-round-block'

        html += `<div class="${blockClass}">`

        html += `<div class="history-round-header" onclick="toggleHistoryBlock('${blockId}')">`
        html += `<span class="history-round-label">${r.label}</span>`
        if (isPerfect) {
          html += `<span class="perfect-badge">⭐ Perfect round</span>`
        } else if (accuracyStr) {
          html += `<span class="history-round-accuracy">${accuracyStr} correct</span>`
        }
        html += `<span class="history-round-chevron" id="${blockId}-chevron">${startOpen ? '▴' : '▾'}</span>`
        html += `</div>`

        html += `<div class="history-round-body" id="${blockId}" style="display:${startOpen ? 'block' : 'none'}">`

        if (r.percentiles && r.percentiles.global !== null && r.total >= 2) {
          const globalTop = Math.max(1, 100 - r.percentiles.global)
          const nationalTop = Math.max(1, 100 - r.percentiles.national)
          html += `<div class="round-percentiles">`
          html += `<span class="round-percentile-item">Top ${globalTop}% globally this round</span>`
          if (r.percentiles.national !== null) {
            html += `<span class="round-percentile-sep">·</span>`
            html += `<span class="round-percentile-item">Top ${nationalTop}% in your country</span>`
          }
          html += `</div>`
        }

        if (r.tournamentPick) {
          html += `<div class="history-champion-pick">
            <span class="history-champion-label">My World Cup champion:</span>
            <span class="history-champion-team" style="color:${teamColor}">${teamFlag} ${r.tournamentPick} 🏆</span>
          </div>`
        }

        if (r.matchPicks && r.matchPicks.length > 0) {
          let streak = 0
          let maxStreak = 0
          let currentStreak = 0
          r.matchPicks.forEach(m => {
            if (m.score === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak) }
            else { currentStreak = 0 }
          })

          html += `<div class="history-match-chips">`
          let runningStreak = 0
          r.matchPicks.forEach((m, mi) => {
            const correct = m.score === 1
            const chipClass = correct ? 'chip-correct' : 'chip-wrong'
            const homeActive = m.pick === m.home
            const awayActive = m.pick === m.away
            const drawActive = m.pick === 'Draw'
            if (correct) runningStreak++; else runningStreak = 0
            const isStreakPeak = runningStreak === maxStreak && maxStreak >= 3 && correct

            html += `<div class="match-chip ${chipClass}${isStreakPeak ? ' streak-peak' : ''}">
              <span class="chip-team ${homeActive ? 'chip-team-picked' : ''}">${m.home}</span>
              <span class="chip-vs ${drawActive ? 'chip-draw-picked' : ''}">vs</span>
              <span class="chip-team ${awayActive ? 'chip-team-picked' : ''}">${m.away}</span>
            </div>`
          })

          if (maxStreak >= 3) {
            html += `<div class="streak-badge">🔥 ${maxStreak} in a row</div>`
          }

          html += `</div>`
        } else if (!r.tournamentPick) {
          html += `<div class="history-empty">No picks recorded this round</div>`
        }

        html += `</div></div>`
      })
      html += `</div>`
    }

    el.innerHTML = html
  } catch (e) {
    console.warn('Personal stats unavailable:', e)
  }
}

async function init() {
  await initFingerprint()
  await loadCurrentRound()
  await loadNations()
  await loadNationData()
  await loadTodayMatches()
  await loadPredictionCount()
  buildTournamentPicker()
  buildLeaderboards()
  buildMap()
  loadPersonalStats()
  setTimeout(async () => {
    await loadRecentPulses()
    setInterval(pollNewPulses, 60000)
  }, 2500)
}

init()