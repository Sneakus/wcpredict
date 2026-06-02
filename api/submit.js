import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { nation_iso2, tournament_winner, match_picks } = req.body

  if (!nation_iso2 || !match_picks || Object.keys(match_picks).length === 0) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const rawIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  const cfCountry = req.headers['cf-ipcountry'] || null
  const countryOverride = cfCountry && cfCountry !== nation_iso2

  const rows = []

  for (const [match_id, predicted_winner] of Object.entries(match_picks)) {
    const ipHash = crypto.createHash('sha256').update(rawIp + match_id).digest('hex')

    const { data: match } = await supabase
      .from('matches')
      .select('locked')
      .eq('id', match_id)
      .single()

    if (!match || match.locked) continue

    const { data: existing } = await supabase
      .from('predictions')
      .select('id')
      .eq('ip_hash', ipHash)
      .eq('match_id', match_id)
      .maybeSingle()

    if (existing) continue

    rows.push({
      match_id,
      nation_iso2,
      predicted_winner,
      tournament_winner: tournament_winner || null,
      ip_hash: ipHash,
      cf_country: cfCountry,
      country_override: countryOverride,
      flagged: countryOverride,
    })
  }

  if (rows.length === 0) {
    return res.status(429).json({ error: 'Already predicted for all matches today, or matches are locked.' })
  }

  const { error } = await supabase.from('predictions').insert(rows)

  if (error) return res.status(500).json({ error: error.message })

  await supabase.rpc('increment_nation_count', { iso: nation_iso2 })

  return res.status(200).json({ success: true, inserted: rows.length })
}