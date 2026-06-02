const SUPABASE_URL = 'https://qkjkvqyoulctqatdultz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFramt2cXlvdWxjdHFhdGR1bHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDkwNzksImV4cCI6MjA5NTk4NTA3OX0.ojhzBHpmxqNZ3xphaojhHn0oO9YJT0QRuN634xgLZ3k'

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TEAMS = [
  { name: 'Brazil',    iso: 'BR',     color: '#639922' },
  { name: 'France',    iso: 'FR',     color: '#185FA5' },
  { name: 'England',   iso: 'GB-ENG', color: '#993C1D' },
  { name: 'Spain',     iso: 'ES',     color: '#D85A30' },
  { name: 'Argentina', iso: 'AR',     color: '#5DCAA5' },
  { name: 'Germany',   iso: 'DE',     color: '#888780' },
  { name: 'Portugal',  iso: 'PT',     color: '#A32D2D' },
  { name: 'USA',       iso: 'US',     color: '#7F77DD' },
]
const TEAM_COLORS = {}
TEAMS.forEach(t => TEAM_COLORS[t.name] = t.color)

// Maps country names from world atlas topology to nation iso2 codes
// Handles UK subdivisions and common name mismatches
const COUNTRY_NAME_TO_ISO = {
  'England': 'GB-ENG',
  'Scotland': 'GB-SCT',
  'Wales': 'GB-WLS',
  'Northern Ireland': 'GB-NIR',
  'United Kingdom': 'GB-ENG', // fallback for atlas which shows UK as one
  'United States of America': 'US',
  'United States': 'US',
  'Russia': 'RU',
  'South Korea': 'KR',
  'North Korea': 'KP',
  'Iran': 'IR',
  'Syria': 'SY',
  'Venezuela': 'VE',
  'Bolivia': 'BO',
  'Tanzania': 'TZ',
  'DR Congo': 'CD',
  'Republic of the Congo': 'CG',
  'Ivory Coast': 'CI',
  "Côte d'Ivoire": 'CI',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Macedonia': 'MK',
  'North Macedonia': 'MK',
  'Bosnia and Herz.': 'BA',
  'Bosnia and Herzegovina': 'BA',
  'Central African Rep.': 'CF',
  'Eq. Guinea': 'GQ',
  'S. Sudan': 'SS',
  'W. Sahara': null,
  'Kosovo': null,
  'Taiwan': null,
}

let currentView = 'wc'
let svgPaths = null
let nationData = {}
let todayMatches = []
let nations = []
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

function resolveIso(countryName) {
  if (!countryName) return null
  if (COUNTRY_NAME_TO_ISO.hasOwnProperty(countryName)) return COUNTRY_NAME_TO_ISO[countryName]
  const match = nations.find(n => n.name === countryName)
  return match ? match.iso2 : null
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
}

async function loadPredictionCount() {
  const { count, error } = await sb
    .from('predictions')
    .select('*', { count: 'exact', head: true })
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
      iso: n.iso2,
      name: n.name,
      pick: topPick ? topPick[0] : null,
      acc: d.total > 0 ? Math.round(d.correct / d.total * 100) : null,
      matchPicks: d.matchPicks,
      tournamentPicks: d.tournamentPicks,
    }
  })
}

async function loadTodayMatches() {
  const today = new Date()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await sb
    .from('matches')
    .select('*')
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
    el.innerHTML = '<p class="loading">No matches today — first game is June 11th. Make your tournament winner prediction below!</p>'
    return
  }
  el.innerHTML = ''
  todayMatches.forEach(m => {
    const time = new Date(m.kickoff_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    el.innerHTML += `<div class="match-row">
      <span class="match-time">${time}</span>
      <span class="match-teams">${m.home_team} vs ${m.away_team}</span>
      <div class="match-pick">
        <button class="pick-btn${m.locked ? ' locked' : ''}" data-match="${m.id}" data-pick="${m.home_team}" onclick="selectPick(this)">${m.home_team}</button>
        <button class="pick-btn${m.locked ? ' locked' : ''}" data-match="${m.id}" data-pick="Draw" onclick="selectPick(this)">Draw</button>
        <button class="pick-btn${m.locked ? ' locked' : ''}" data-match="${m.id}" data-pick="${m.away_team}" onclick="selectPick(this)">${m.away_team}</button>
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
  if (Object.keys(picks).length === 0) { alert('Make at least one match prediction first'); return }

  const btn = document.getElementById('submit-btn')
  btn.disabled = true
  btn.textContent = 'Submitting...'

  const payload = {
    nation_iso2: iso2,
    tournament_winner: null,
    match_picks: picks,
  }

  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await res.json()

  if (res.ok) {
    btn.textContent = 'Submitted!'
    btn.style.background = '#3B6D11'
    setTimeout(() => {
      btn.textContent = 'Submit picks'
      btn.style.background = ''
      btn.disabled = false
    }, 3000)
    loadPredictionCount()
  } else {
    alert(result.error || 'Something went wrong')
    btn.disabled = false
    btn.textContent = 'Submit picks'
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
  pickEl.innerHTML = ''
  accEl.innerHTML = ''

  const pickCounts = {}
  TEAMS.forEach(t => pickCounts[t.name] = 0)
  Object.values(nationData).forEach(d => {
    if (d.pick && pickCounts[d.pick] !== undefined) pickCounts[d.pick]++
  })

  const sorted = TEAMS.slice().sort((a,b) => pickCounts[b.name] - pickCounts[a.name])
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

  const accNations = Object.values(nationData)
    .filter(d => d.acc !== null)
    .sort((a,b) => b.acc - a.acc)
    .slice(0, 6)

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

function getMapColor(countryName) {
  const iso = resolveIso(countryName)
  if (!iso) return null
  const nd = nationData[iso]
  if (!nd) return null
  if (currentView === 'wc') {
    return nd.pick && TEAM_COLORS[nd.pick] ? TEAM_COLORS[nd.pick] + 'cc' : null
  } else {
    if (!todayMatches.length || !nd.matchPicks) return null
    const firstMatch = todayMatches[0]
    const mp = nd.matchPicks[firstMatch.id]
    if (!mp) return null
    const top = Object.entries(mp).sort((a,b) => b[1]-a[1])[0]
    if (!top) return null
    return top[0] === 'Draw' ? 'rgba(136,135,128,0.8)' : (TEAM_COLORS[top[0]] ? TEAM_COLORS[top[0]] + 'cc' : null)
  }
}

function updateMapColors() {
  if (!svgPaths) return
  svgPaths.attr('fill', d => {
    const name = d.properties && d.properties.name
    return getMapColor(name) || '#1e1e1e'
  })
}

function buildTooltipWC(nd) {
  if (!nd.pick) return '<div class="no-data">No predictions yet</div>'
  const entries = Object.entries(nd.tournamentPicks || {}).sort((a,b) => b[1]-a[1]).slice(0,3)
  const total = entries.reduce((s,[,v]) => s+v, 0)
  return entries.map(([team, count]) => {
    const pct = Math.round(count/total*100)
    const color = TEAM_COLORS[team] || '#888'
    return `<div class="tt-row">
      <span class="tt-label">${team}</span>
      <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="tt-val">${pct}%</span>
    </div>`
  }).join('')
}

function buildTooltipMatchday(nd) {
  if (!nd.matchPicks || !todayMatches.length) return '<div class="no-data">No predictions yet</div>'
  return todayMatches.map(m => {
    const mp = nd.matchPicks[m.id]
    if (!mp) return ''
    const entries = Object.entries(mp).sort((a,b) => b[1]-a[1])
    const total = entries.reduce((s,[,v]) => s+v, 0)
    return `<div style="margin-top:5px;padding-top:4px;border-top:0.5px solid rgba(255,255,255,0.08)">
      <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:3px">${m.home_team} vs ${m.away_team}</div>
      ${entries.slice(0,2).map(([k,v]) => {
        const pct = Math.round(v/total*100)
        const color = k === 'Draw' ? '#888' : (TEAM_COLORS[k] || '#888')
        return `<div class="tt-row">
          <span class="tt-label">${k}</span>
          <div class="tt-bar-wrap"><div class="tt-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="tt-val">${pct}%</span>
        </div>`
      }).join('')}
    </div>`
  }).join('')
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
  const svg = d3.select('#map').append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%')
  const projection = d3.geoNaturalEarth1().scale(width/6.3).translate([width/2, height/2])
  const path = d3.geoPath(projection)
  const tooltip = document.getElementById('tooltip')
  const mapWrap = document.getElementById('map-wrap')

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const features = topojson.feature(world, world.objects.countries).features
    svgPaths = svg.selectAll('path').data(features).join('path')
      .attr('d', path)
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-width', 0.4)
      .attr('fill', '#1e1e1e')
      .attr('cursor', 'pointer')
      .on('mousemove', function(event, d) {
        const name = d.properties && d.properties.name
        if (!name) return
        const iso = resolveIso(name)
        const nd = iso ? nationData[iso] : null
        const rect = mapWrap.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        tooltip.querySelector('.tt-country').textContent = name
        document.getElementById('tt-body').innerHTML = nd
          ? (currentView === 'wc' ? buildTooltipWC(nd) : buildTooltipMatchday(nd))
          : '<div class="no-data">No predictions yet</div>'
        tooltip.style.display = 'block'
        tooltip.style.left = Math.min(x + 14, width - 230) + 'px'
        tooltip.style.top = Math.max(y - 70, 4) + 'px'
        d3.select(this).attr('opacity', 0.7)
      })
      .on('mouseleave', function() {
        tooltip.style.display = 'none'
        d3.select(this).attr('opacity', 1)
      })

    updateMapColors()
  })
}

async function init() {
  await loadNations()
  await loadNationData()
  await loadTodayMatches()
  await loadPredictionCount()
  buildLegend()
  buildLeaderboards()
  buildMap()
}

init()