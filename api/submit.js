import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const turnstileToken = req.body['cf-turnstile-response']
  if (!turnstileToken) {
    return res.status(403).json({ error: 'Bot check required' })
  }
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
  if (!verifyData.success) {
    return res.status(403).json({ error: 'Bot check failed' })
  }

  const { nation_iso2, tournament_winner, match_picks, fingerprint } = req.body

  if (!nation_iso2) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const rawIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  const cfCountry = req.headers['cf-ipcountry'] || null
  const countryOverride = cfCountry && cfCountry !== nation_iso2

  const fingerprintHash = fingerprint
    ? crypto.createHash('sha256').update(fingerprint).digest('hex')
    : null

  let currentRound = 'group_stage'
  try {
    const { data: roundData } = await supabase
      .from('rounds')
      .select('round')
      .eq('is_current', true)
      .single()
    if (roundData) currentRound = roundData.round
  } catch (e) {
    // Fall back to group_stage if rounds table not yet created
  }

  const rows = []

  if (match_picks && Object.keys(match_picks).length > 0) {
    for (const [match_id, predicted_winner] of Object.entries(match_picks)) {
      const ipHash = crypto.createHash('sha256').update(rawIp + match_id).digest('hex')

      const { data: match } = await supabase
        .from('matches')
        .select('locked, kickoff_at')
        .eq('id', match_id)
        .single()

      if (!match || match.locked || new Date(match.kickoff_at) <= new Date()) continue

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
        round: currentRound,
        ip_hash: ipHash,
        fingerprint_hash: fingerprintHash,
        cf_country: cfCountry,
        country_override: countryOverride,
        flagged: countryOverride,
      })
    }
  } else if (tournament_winner) {
    // Tournament winner only — no match picks
    const ipHash = crypto.createHash('sha256').update(rawIp + 'tournament').digest('hex')

    const { data: existing } = await supabase
      .from('predictions')
      .select('id')
      .eq('ip_hash', ipHash)
      .is('match_id', null)
      .maybeSingle()

    if (!existing) {
      rows.push({
        match_id: null,
        nation_iso2,
        predicted_winner: tournament_winner,
        tournament_winner,
        round: currentRound,
        ip_hash: ipHash,
        fingerprint_hash: fingerprintHash,
        cf_country: cfCountry,
        country_override: countryOverride,
        flagged: countryOverride,
      })
    }
  }

  if (rows.length === 0) {
    return res.status(429).json({ error: 'Already predicted, or all matches are locked.' })
  }

  const { error } = await supabase.from('predictions').insert(rows)
  if (error) return res.status(500).json({ error: error.message })

  await supabase.rpc('increment_nation_count', { iso: nation_iso2 })

  return res.status(200).json({ success: true, inserted: rows.length })
}