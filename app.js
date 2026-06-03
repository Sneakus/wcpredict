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
WC_TEAMS.forEach(t => TEAM_COLORS[t.name] = t.color)

const UK_NATIONS = [
  { name: 'England',          iso: 'GB-ENG' },
  { name: 'Scotland',         iso: 'GB-SCT' },
  { name: 'Wales',            iso: 'GB-WLS' },
  { name: 'Northern Ireland', iso: 'GB-NIR' },
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
  'Türkiye':                    'TR',
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
}

let currentView = 'wc'
let svgPaths = null
let nationData = {}
let todayMatches = []
let nations = []
let tournamentWinner = null
let visitorFingerprint = null
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
    btn.innerHTML = `${team.flag} ${team.name}`
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
    nameEl.textContent = team ? `${team.flag} ${team.name}` : tournamentWinner
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
}

async function loadPredictionCount() {
  const { count, error } = await sb
    .from('predictions').select('*', { count: 'exact', head: true })
  if (error) { console.error('loadPredictionCount error:', error); return }
  document.getElementById('prediction-count').textContent =
    count ? `${count.toLocaleString()} predictions so far` : '0 predictions so far'
}

async function loadNationData() {
  const { data, error } = await sb
    .from('predictions')
    .select('nation_iso2, tournament_winner, match_id, predicted_winner, score')
  if (error) { console.error('loadNationData error:', error); return }
  if (!data) return
  const byNation = {}
  data.forEach(row => {
    const iso = row.nation_iso2
    if (!byNation[iso]) byNation[iso] = { tournamentPicks: {}, matchPicks: {}, correct: 0, total: 0 }
    if (row.tournament_winner) {
      byNation[iso].tournamentPicks[row.tournament_winner] =
        (byNation[iso].tournamentPicks[row.tournament_winner] || 0) + 1
    }
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
}

async function loadTodayMatches() {
  const today = new Date()
  const start = new Date(today); start.setHours(0,0,0,0)
  const end = new Date(today); end.setHours(23,59,59,999)
  const { data, error } = await sb.from('matches').select('*')
    .gte('kickoff_at', start.toISOString())
    .lte('kickoff_at', end.toISOString())
    .order('kickoff_at')
  if (error) { console.error('loadTodayMatches error:', error); return }
  todayMatches = data || []
  renderMatches()
}

function renderMatches() {
  const el = document.getElementById('matches-list')
  if (todayMatches.length === 0) {
    el.innerHTML = '<p class="loading">No matches today — first game is June 11th!</p>'
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
  } else {
    alert(result.error || 'Something went wrong')
    if (window.turnstile) turnstile.reset()
    btn.disabled = false; btn.textContent = 'Submit picks'
  }
}

function buildLegend() {
  const el = document.getElementById('legend')
  el.innerHTML = ''
  TEAMS.forEach(t => {
    el.innerHTML += `<div class="leg-item"><div class="leg-dot" style="background:${t.color}"></div>${t.name}</div>`
  })
}

function buildLeaderboards() {
  const pickEl = document.getElementById('lb-pick')
  const accEl = document.getElementById('lb-acc')
  pickEl.innerHTML = ''; accEl.innerHTML = ''
  const pickCounts = {}
  TEAMS.forEach(t => pickCounts[t.name] = 0)
  Object.values(nationData).forEach(d => {
    if (d.pick && pickCounts[d.pick] !== undefined) pickCounts[d.pick]++
  })
  const sorted = TEAMS.slice().sort((a,b) => pickCounts[b.name]-pickCounts[a.name])
  const maxPick = Math.max(...Object.values(pickCounts), 1)
  sorted.forEach((t, i) => {
    const count = pickCounts[t.name]
    pickEl.innerHTML += `<div class="lb-row">
      <span class="lb-rank">${i+1}</span>
      <span class="lb-flag">${getFlagEmoji(t.iso)}</span>
      <span class="lb-name">${t.name}</span>
      <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(count/maxPick*100)}%;background:${t.color}"></div></div>
      <span class="lb-val">${count}</span>
    </div>`
  })
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

function resolveUKColor() {
  if (currentView !== 'wc') return getColorForIso('GB-ENG')
  const merged = {}
  ;['GB-ENG','GB-SCT','GB-WLS','GB-NIR'].forEach(iso => {
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

function buildTooltipWC(nd) {
  if (!nd.pick) return '<div class="no-data">No predictions yet</div>'
  const entries = Object.entries(nd.tournamentPicks||{}).sort((a,b)=>b[1]-a[1]).slice(0,3)
  const total = entries.reduce((s,[,v])=>s+v,0)
  return entries.map(([team,count]) => {
    const pct = Math.round(count/total*100)
    return `<div class="tt-row">
      <span class="tt-label">${team}</span>
      <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${TEAM_COLORS[team]||'#888'}"></div></div>
      <span class="tt-val">${pct}%</span>
    </div>`
  }).join('')
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
          <span class="tt-val">${pct}%</span>
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
    const flag = getFlagEmoji(nation.iso)
    if (!nd) {
      return `<div class="tt-uk-nation">
        <div class="tt-uk-label">${flag} ${nation.name}</div>
        <div class="no-data" style="font-size:10px">No data yet</div>
      </div>`
    }
    if (currentView === 'wc') {
      const entries = Object.entries(nd.tournamentPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 2)
      if (!entries.length) {
        return `<div class="tt-uk-nation">
          <div class="tt-uk-label">${flag} ${nation.name}</div>
          <div class="no-data" style="font-size:10px">No data yet</div>
        </div>`
      }
      const total = entries.reduce((s, [, v]) => s + v, 0)
      return `<div class="tt-uk-nation">
        <div class="tt-uk-label">${flag} ${nation.name}</div>
        ${entries.map(([team, count]) => {
          const pct = Math.round(count / total * 100)
          return `<div class="tt-row">
            <span class="tt-label">${team}</span>
            <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${TEAM_COLORS[team] || '#888'}"></div></div>
            <span class="tt-val">${pct}%</span>
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
          <span class="tt-val">${pct}%</span>
        </div>`
      }).join('')}
    </div>`
  }).join('<div style="height:1px;background:rgba(255,255,255,0.08);margin:5px 0"></div>')
}

function showTooltip(event, name, isUK, mapWrap, width) {
  const tooltip = document.getElementById('tooltip')
  const rect = mapWrap.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  tooltip.querySelector('.tt-country').textContent = isUK ? '🇬🇧 United Kingdom' : name
  document.getElementById('tt-body').innerHTML = isUK
    ? buildTooltipUK()
    : (() => {
        const iso = resolveIso(name)
        const nd = iso ? nationData[iso] : null
        return nd
          ? (currentView==='wc' ? buildTooltipWC(nd) : buildTooltipMatchday(nd))
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

function buildMap() {
  const container = document.getElementById('map')
  const width = container.offsetWidth || 800
  const height = Math.round(width * 0.52)
  const svg = d3.select('#map').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .style('cursor', 'grab')
  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.3)
    .translate([width / 2, height / 2.1])
  const path = d3.geoPath(projection)
  const mapWrap = document.getElementById('map-wrap')
  const tooltip = document.getElementById('tooltip')

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0,0],[width,height]])
    .on('zoom', event => {
      g.attr('transform', event.transform)
      svg.style('cursor', event.transform.k > 1 ? 'grabbing' : 'grab')
      tooltip.style.display = 'none'
    })
  svg.call(zoom)
  svg.on('dblclick.zoom', null)
  svg.on('dblclick', () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity))

  const controls = d3.select('#map').append('div').attr('id', 'zoom-controls')
  controls.append('button').attr('id','zoom-in').text('+').on('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.5))
  controls.append('button').attr('id','zoom-reset').text('⌂').on('click', () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity))
  controls.append('button').attr('id','zoom-out').text('−').on('click', () => svg.transition().duration(300).call(zoom.scaleBy, 0.67))

  const g = svg.append('g')

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const features = topojson.feature(world, world.objects.countries).features
      .filter(d => d.properties && d.properties.name !== 'Antarctica')
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
        showTooltip(event, name, name === 'United Kingdom', mapWrap, width)
      })
      .on('mouseleave', function() {
        tooltip.style.display = 'none'
        d3.select(this).attr('opacity', 1)
      })
    updateMapColors()
  })
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
    if (!res.ok || data.insufficient_data) return

    const el = document.getElementById('personal-stats')
    if (!el) return
    el.style.display = 'flex'
    el.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Your predictions</span>
        <span class="stat-value">${data.correct}/${data.total} correct (${data.accuracy}%)</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Global ranking</span>
        <span class="stat-value">Top ${100 - data.global_percentile}% worldwide</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">National ranking</span>
        <span class="stat-value">Top ${100 - data.national_percentile}% in your country</span>
      </div>
    `
  } catch (e) {
    console.warn('Personal stats unavailable:', e)
  }
}

async function init() {
  await initFingerprint()
  await loadNations()
  await loadNationData()
  await loadTodayMatches()
  await loadPredictionCount()
  buildTournamentPicker()
  buildLegend()
  buildLeaderboards()
  buildMap()
  loadPersonalStats()
}

init()