import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { fingerprint } = req.body
  if (!fingerprint) return res.status(400).json({ error: 'Missing fingerprint' })

  const fingerprintHash = crypto.createHash('sha256').update(fingerprint).digest('hex')

  const { data: myPreds } = await supabase
    .from('predictions')
    .select('score, nation_iso2')
    .eq('fingerprint_hash', fingerprintHash)
    .not('score', 'is', null)

  if (!myPreds || myPreds.length < 3) {
    return res.status(200).json({ insufficient_data: true })
  }

  const correct = myPreds.filter(p => p.score === 1).length
  const total = myPreds.length
  const myAccuracy = correct / total
  const nation_iso2 = myPreds[0].nation_iso2

  const { data: globalStats } = await supabase.rpc('get_accuracy_percentile', {
    p_fingerprint_hash: fingerprintHash,
    p_nation_iso2: null
  })

  const { data: nationalStats } = await supabase.rpc('get_accuracy_percentile', {
    p_fingerprint_hash: fingerprintHash,
    p_nation_iso2: nation_iso2
  })

  return res.status(200).json({
    correct,
    total,
    accuracy: Math.round(myAccuracy * 100),
    global_percentile: globalStats,
    national_percentile: nationalStats,
    nation_iso2
  })
}
