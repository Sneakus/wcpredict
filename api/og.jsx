import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

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

  if (!/^[A-Z]{2}$/.test(iso2)) {
    return new Response('Invalid country', { status: 400 })
  }

  let topPick = null
  let totalVotes = 0
  let topPickVotes = 0

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/predictions?nation_iso2=eq.${iso2}&tournament_winner=not.is.null&select=tournament_winner`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    )
    if (r.ok) {
      const rows = await r.json()
      const counts = {}
      rows.forEach(row => {
        counts[row.tournament_winner] = (counts[row.tournament_winner] || 0) + 1
      })
      totalVotes = rows.length
      let max = 0
      Object.entries(counts).forEach(([team, c]) => {
        if (c > max) { max = c; topPick = team; topPickVotes = c }
      })
    }
  } catch (e) {
    // fall through to fallback render
  }

  let countryName
  try { countryName = dn.of(iso2) || iso2 } catch { countryName = iso2 }

  const pct = totalVotes > 0 ? Math.round((topPickVotes / totalVotes) * 100) : 0
  const teamColor = topPick ? ensureVisible(TEAM_COLORS[topPick] || '#378ADD') : '#378ADD'
  const flagUrl = `https://flagcdn.com/h240/${iso2.toLowerCase()}.png`

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#0a0a0a',
        padding: '60px',
        position: 'relative',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={flagUrl} height="160" style={{ marginRight: '32px', borderRadius: '8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, color: '#888' }}>The map says</div>
            <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1 }}>{countryName}</div>
          </div>
        </div>

        {topPick ? (
          <div style={{ marginTop: '70px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, color: '#bbb' }}>backs</div>
            <div style={{ fontSize: 152, fontWeight: 900, lineHeight: 1, color: teamColor }}>
              {topPick}
            </div>
            <div style={{ marginTop: '36px', display: 'flex', alignItems: 'baseline' }}>
              <div style={{ fontSize: 68, fontWeight: 700 }}>{pct}%</div>
              <div style={{ fontSize: 30, color: '#888', marginLeft: '24px' }}>
                {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '80px', fontSize: 68, fontWeight: 700, color: '#888' }}>
            No votes yet — be the first.
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '40px', right: '60px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        }}>
          <div style={{ fontSize: 38, fontWeight: 700 }}>worldcupmap.io</div>
          <div style={{ fontSize: 24, color: '#666' }}>Add your pick →</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    }
  )
}
