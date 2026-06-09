import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const h = (type, props, ...children) => ({
  type,
  props: { ...(props || {}), children: children.length === 1 ? children[0] : children.filter(c => c != null) },
  key: null,
})

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

const TEAM_COLORS = {
  'Argentina': '#75AADB', 'Algeria': '#006633', 'Australia': '#FFD700',
  'Austria': '#ED2939', 'Belgium': '#ED1C24', 'Bosnia and Herzegovina': '#1A3A7A',
  'Brazil': '#639922', 'Canada': '#D80621', 'Cape Verde': '#143C8B',
  'Colombia': '#F6C000', 'Croatia': '#E1261C', 'Czechia': '#1A4FA0',
  'Curaçao': '#0072CE', 'DR Congo': '#4FB6E8', 'Ecuador': '#F2A900',
  'Egypt': '#CE1126', 'England': '#EFEFEF', 'France': '#185FA5',
  'Germany': '#888780', 'Ghana': '#006B3F', 'Haiti': '#00209F',
  'Iran': '#239F40', 'Iraq': '#1B5E20', 'Ivory Coast': '#FF8200',
  'Japan': '#16348C', 'Jordan': '#111827', 'Mexico': '#006847',
  'Morocco': '#C1272D', 'Netherlands': '#EC6608', 'New Zealand': '#1A1A1A',
  'Norway': '#BA0C2F', 'Panama': '#002B7F', 'Paraguay': '#C8102E',
  'Portugal': '#A4123F', 'Qatar': '#8A1538', 'Saudi Arabia': '#006C35',
  'Scotland': '#13315C', 'Senegal': '#00853F', 'South Africa': '#FFB81C',
  'South Korea': '#CD2E3A', 'Spain': '#C60B1E', 'Sweden': '#006AA7',
  'Switzerland': '#DA291C', 'Tunisia': '#E70013', 'Turkey': '#E30A17',
  'Uruguay': '#2F7DC2', 'USA': '#1B2A4A', 'Uzbekistan': '#0A4595',
}

function ensureVisible(hex) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substr(0, 2), 16)
  const g = parseInt(c.substr(2, 2), 16)
  const b = parseInt(c.substr(4, 2), 16)
  const luma = r * 0.299 + g * 0.587 + b * 0.114
  if (luma < 70) return '#5a7fb8'
  return hex
}

const dn = new Intl.DisplayNames(['en'], { type: 'region' })

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const iso2 = String(searchParams.get('country') || '').toUpperCase()

  if (!/^[A-Z]{2}(-[A-Z]{3})?$/.test(iso2)) {
    return new Response('Invalid country', { status: 400 })
  }
  if (iso2.includes('-') && !VALID_SUBDIVISIONS.has(iso2)) {
    return new Response('Invalid subdivision', { status: 400 })
  }

  const filter = iso2 === 'GB'
    ? 'nation_iso2=in.(GB,GB-ENG,GB-SCT,GB-WLS,GB-NIR)'
    : `nation_iso2=eq.${iso2}`

  let topPick = null
  let totalVotes = 0
  let topPickVotes = 0

  try {
    // Mirror map's loadNationData query: match_id IS NULL, count predicted_winner
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/predictions?${filter}&match_id=is.null&select=predicted_winner`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    )
    if (r.ok) {
      const rows = await r.json()
      const filtered = rows.filter(row => row.predicted_winner && VALID_TEAMS.has(row.predicted_winner))
      const counts = {}
      filtered.forEach(row => {
        counts[row.predicted_winner] = (counts[row.predicted_winner] || 0) + 1
      })
      totalVotes = filtered.length
      let max = 0
      Object.entries(counts).forEach(([team, c]) => {
        if (c > max) { max = c; topPick = team; topPickVotes = c }
      })
    }
  } catch (e) {
    // fall through to fallback render
  }

  let countryName
  if (SUBDIVISION_NAMES[iso2]) {
    countryName = SUBDIVISION_NAMES[iso2]
  } else {
    try { countryName = dn.of(iso2) || iso2 } catch { countryName = iso2 }
  }

  const pct = totalVotes > 0 ? Math.round((topPickVotes / totalVotes) * 100) : 0
  const teamColor = topPick ? ensureVisible(TEAM_COLORS[topPick] || '#378ADD') : '#378ADD'
  const flagUrl = `https://flagcdn.com/h240/${iso2.toLowerCase()}.png`

  const teamFontSize = !topPick ? 64
    : topPick.length > 16 ? 76
    : topPick.length > 11 ? 110
    : 152

  const tree = h('div', {
    style: {
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      background: '#0a0a0a',
      color: '#fff',
      padding: '40px 60px',
      position: 'relative',
    }
  },
    h('div', {
      style: { display: 'flex', alignItems: 'center', marginBottom: '24px' }
    },
      h('img', { src: flagUrl, height: 90, style: { borderRadius: '6px', marginRight: '24px' } }),
      h('div', { style: { fontSize: 64, fontWeight: 700, lineHeight: 1 } }, countryName)
    ),

    topPick
      ? h('div', { style: { fontSize: 32, color: '#888', marginBottom: '12px' } }, 'backs')
      : null,

    topPick
      ? h('div', {
          style: {
            fontSize: teamFontSize,
            fontWeight: 900,
            lineHeight: 1.05,
            color: teamColor,
            marginBottom: '32px',
            textAlign: 'center',
            maxWidth: '1080px',
          }
        }, topPick)
      : h('div', {
          style: { fontSize: 64, fontWeight: 700, color: '#888', marginTop: '20px' }
        }, 'No votes yet — be the first.'),

    topPick
      ? h('div', { style: { display: 'flex', alignItems: 'baseline' } },
          h('div', { style: { fontSize: 56, fontWeight: 700 } }, `${pct}%`),
          h('div', { style: { fontSize: 28, color: '#888', marginLeft: '20px' } },
            `${totalVotes.toLocaleString()} ${totalVotes === 1 ? 'vote' : 'votes'}`
          )
        )
      : null,

    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginTop: '40px',
      }
    },
      h('div', { style: { fontSize: 40, color: '#888', fontWeight: 500, marginBottom: '6px' } }, 'What does the rest of the world think?'),
      h('div', { style: { fontSize: 26, color: '#888', fontWeight: 600 } }, 'worldcupmap.io')
    )
  )

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
