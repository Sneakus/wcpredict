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

  const hasEnoughForStats = myPreds && myPreds.length >= 3

  const { data: roundHistory } = await supabase
    .from('predictions')
    .select('round, tournament_winner, match_id, predicted_winner, score, matches(home_team, away_team, kickoff_at)')
    .eq('fingerprint_hash', fingerprintHash)
    .order('created_at', { ascending: true })

  const rounds = ['group_stage', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']
  const roundLabels = {
    group_stage:   'Group Stage',
    round_of_32:   'Round of 32',
    round_of_16:   'Round of 16',
    quarter_final: 'Quarter-Finals',
    semi_final:    'Semi-Finals',
    final:         'Final',
  }

  const history = {}
  if (roundHistory) {
    roundHistory.forEach(row => {
      const r = row.round || 'group_stage'
      if (!history[r]) history[r] = { tournamentPick: null, matchPicks: [], correct: 0, total: 0 }
      if (row.tournament_winner && !history[r].tournamentPick) {
        history[r].tournamentPick = row.tournament_winner
      }
      if (row.match_id && row.matches && row.score !== null) {
        history[r].matchPicks.push({
          home: row.matches.home_team,
          away: row.matches.away_team,
          pick: row.predicted_winner,
          score: row.score,
        })
        history[r].total++
        if (row.score === 1) history[r].correct++
      }
    })
  }

  function formatHistory(roundPercentiles = {}) {
    return rounds
      .filter(r => history[r])
      .map(r => ({
        round: r,
        label: roundLabels[r],
        tournamentPick: history[r].tournamentPick,
        matchPicks: history[r].matchPicks,
        correct: history[r].correct,
        total: history[r].total,
        isPerfect: history[r].total >= 2 && history[r].correct === history[r].total,
        percentiles: roundPercentiles[r] || null,
      }))
  }

  if (!hasEnoughForStats) {
    return res.status(200).json({
      insufficient_data: true,
      history: formatHistory(),
    })
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

  const roundPercentiles = {}
  for (const r of rounds.filter(r => history[r] && history[r].total >= 2)) {
    const { data: roundGlobal } = await supabase.rpc('get_accuracy_percentile', {
      p_fingerprint_hash: fingerprintHash,
      p_nation_iso2: null,
      p_round: r
    })
    const { data: roundNational } = await supabase.rpc('get_accuracy_percentile', {
      p_fingerprint_hash: fingerprintHash,
      p_nation_iso2: nation_iso2,
      p_round: r
    })
    roundPercentiles[r] = {
      global: roundGlobal,
      national: roundNational,
    }
  }

  return res.status(200).json({
    correct,
    total,
    accuracy: Math.round(myAccuracy * 100),
    global_percentile: globalStats,
    national_percentile: nationalStats,
    nation_iso2,
    history: formatHistory(roundPercentiles),
  })
}
