import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

let indexHtml = ''
try {
  indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
} catch (e) {
  console.error('Failed to read index.html', e)
}

const VALID_TEAMS = new Set([
  'Argentina','Algeria','Australia','Austria','Belgium',
  'Bosnia and Herzegovina','Brazil','Canada','Cape Verde','Colombia',
  'Croatia','Czechia','Curaçao','DR Congo','Ecuador','Egypt',
  'England','France','Germany','Ghana','Haiti','Iran','Iraq',
  'Ivory Coast','Japan','Jordan','Mexico','Morocco','Netherlands',
  'New Zealand','Norway','Panama','Paraguay','Portugal','Qatar',
  'Saudi Arabia','Scotland','Senegal','South Africa','South Korea',
  'Spain','Sweden','Switzerland','Tunisia','Turkey','Uruguay',
  'USA','Uzbekistan',
])

const VALID_SUBDIVISIONS = new Set(['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'])

const SUBDIVISION_NAMES = {
  'GB-ENG': 'England',
  'GB-SCT': 'Scotland',
  'GB-WLS': 'Wales',
  'GB-NIR': 'Northern Ireland',
}

const dn = new Intl.DisplayNames(['en'], { type: 'region' })

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const iso2 = String(req.query.iso2 || '').toUpperCase()

  if (!/^[A-Z]{2}(-[A-Z]{3})?$/.test(iso2)) {
    res.writeHead(302, { Location: '/' })
    return res.end()
  }
  if (iso2.includes('-') && !VALID_SUBDIVISIONS.has(iso2)) {
    res.writeHead(302, { Location: '/' })
    return res.end()
  }

  let topPick = null
  let totalVotes = 0
  let topPickVotes = 0
  try {
    let query = supabase
      .from('predictions')
      .select('tournament_winner, fingerprint_hash, created_at')
      .not('tournament_winner', 'is', null)

    if (iso2 === 'GB') {
      query = query.in('nation_iso2', ['GB', 'GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'])
    } else {
      query = query.eq('nation_iso2', iso2)
    }

    const { data } = await query

    if (data && data.length > 0) {
      // Dedupe by fingerprint, keep latest tournament pick per user
      const latestByFp = new Map()
      data.forEach(row => {
        const existing = latestByFp.get(row.fingerprint_hash)
        if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
          latestByFp.set(row.fingerprint_hash, row)
        }
      })

      const filtered = Array.from(latestByFp.values())
        .filter(row => VALID_TEAMS.has(row.tournament_winner))

      const counts = {}
      filtered.forEach(row => {
        counts[row.tournament_winner] = (counts[row.tournament_winner] || 0) + 1
      })
      totalVotes = filtered.length
      let max = 0
      Object.entries(counts).forEach(([team, c]) => {
        if (c > max) { max = c; topPick = team; topPickVotes = c }
      })
    }
  } catch (e) {
    console.error('Supabase query failed', e)
  }

  let countryName
  if (SUBDIVISION_NAMES[iso2]) {
    countryName = SUBDIVISION_NAMES[iso2]
  } else {
    try { countryName = dn.of(iso2) || iso2 } catch { countryName = iso2 }
  }

  const pct = totalVotes > 0 ? Math.round((topPickVotes / totalVotes) * 100) : 0
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const title = topPick
    ? `${countryName} backs ${topPick} — World Cup Map`
    : `${countryName} — World Cup Map`

  const description = topPick
    ? `${pct}% of ${countryName} backs ${topPick} to win the 2026 World Cup. Add your pick and see where your country stands.`
    : `See how every nation is predicting the 2026 World Cup. Add your pick to the global map.`

  const ogImageUrl = `https://worldcupmap.io/api/og?country=${iso2}&v=${today}`
  const pageUrl = `https://worldcupmap.io/${iso2.toLowerCase()}`

  let html = indexHtml || '<!doctype html><html><body>Loading…</body></html>'

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${ogImageUrl}" />`)
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${pageUrl}" />`)
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${ogImageUrl}" />`)

  const landingPayload = JSON.stringify({ iso2, name: countryName, topPick, totalVotes })
  html = html.replace(
    '<script src="cities.js"></script>',
    `<script>window.__COUNTRY_LANDING__ = ${landingPayload};</script>\n  <script src="cities.js"></script>`
  )

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
