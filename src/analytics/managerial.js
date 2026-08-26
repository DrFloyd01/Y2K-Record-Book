/**
 * Managerial Prowess & Lineup Analytics Engine
 *
 * Computes:
 * 1. Dynamic Roster Constraints per Season (supporting 2 WR vs 3 WR + Flex)
 * 2. Optimal Best Ball Lineup & Coaching Efficiency
 * 3. The "D'Oh!" Counter (Single-Bench-Swap Win Detection)
 * 4. Waiver MVP & FAAB Efficiency
 * 5. Trade Delta Analysis
 */

/**
 * Parses roster constraints string into slot counts
 * Example: 'BN x5, DEF x1, IR x1, K x1, QB x1, RB x2, TE x1, WR x3, W/R/T x1'
 */
export function parseRosterConstraints(rosterStr = '') {
  const defaults = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 };
  if (!rosterStr || typeof rosterStr !== 'string') return defaults;

  const result = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, K: 0, DEF: 0 };
  const upper = rosterStr.toUpperCase();

  // Pattern 1: 'BN x5, DEF x1, K x1, QB x1, RB x2, TE x1, WR x3, W/R/T x1'
  const countMatches = [...upper.matchAll(/([A-Z0-9\/]+)\s*[Xx]\s*(\d+)/g)];
  if (countMatches.length > 0) {
    countMatches.forEach(m => {
      const pos = m[1].trim();
      const count = parseInt(m[2], 10);
      if (pos === 'QB') result.QB = count;
      else if (pos === 'RB') result.RB = count;
      else if (pos === 'WR') result.WR = count;
      else if (pos === 'TE') result.TE = count;
      else if (pos === 'W/R/T' || pos === 'FLEX' || pos === 'W/R' || pos === 'W/T') result.FLEX += count;
      else if (pos === 'K') result.K = count;
      else if (pos === 'DEF' || pos === 'D/ST' || pos === 'DST') result.DEF = count;
    });
  } else {
    // Pattern 2: 'QB, RB, RB, WR, WR, WR, TE, FLEX, K, DEF'
    const tokens = upper.split(/[\s,]+/);
    tokens.forEach(t => {
      if (t === 'QB') result.QB += 1;
      else if (t === 'RB') result.RB += 1;
      else if (t === 'WR') result.WR += 1;
      else if (t === 'TE') result.TE += 1;
      else if (t === 'FLEX' || t === 'W/R/T' || t === 'W/R' || t === 'W/T') result.FLEX += 1;
      else if (t === 'K') result.K += 1;
      else if (t === 'DEF' || t === 'D/ST' || t === 'DST') result.DEF += 1;
    });
  }

  // Ensure minimum baseline if positions were omitted
  if (result.QB === 0) result.QB = 1;
  if (result.RB === 0) result.RB = 2;
  if (result.WR === 0) result.WR = defaults.WR;
  if (result.TE === 0) result.TE = 1;
  if (result.FLEX === 0 && (upper.includes('FLEX') || upper.includes('W/R/T'))) result.FLEX = 1;
  if (result.K === 0 && upper.includes('K')) result.K = 1;
  if (result.DEF === 0 && (upper.includes('DEF') || upper.includes('DST'))) result.DEF = 1;

  return result;
}

/**
 * Normalizes player position string
 */
export function normalizePosition(pos = '') {
  const p = (pos || '').toUpperCase().trim();
  if (p.includes('QB')) return 'QB';
  if (p.includes('RB')) return 'RB';
  if (p.includes('WR')) return 'WR';
  if (p.includes('TE')) return 'TE';
  if (p.includes('K')) return 'K';
  if (p.includes('DEF') || p.includes('D/ST') || p.includes('DST')) return 'DEF';
  return p;
}

/**
 * Computes the optimal "Best Ball" lineup for a team given all available players and roster constraints
 */
export function computeOptimalLineup(players = [], constraints = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 }) {
  if (!players || players.length === 0) {
    return {
      optimalStarters: [],
      optimalBench: [],
      optimalScore: 0,
      actualScore: 0,
      coachingEfficiency: 0,
      pointsLeftOnBench: 0
    };
  }

  // Sort players by fantasy points descending
  const pool = players.map(p => ({
    ...p,
    points: Number(p.points || 0),
    normPos: normalizePosition(p.position)
  })).sort((a, b) => b.points - a.points);

  const selectedStarters = [];
  const selectedIds = new Set();

  function selectBest(pos, count) {
    let chosen = 0;
    for (const p of pool) {
      if (chosen >= count) break;
      const pid = p.playerId || p.player || p.playerName;
      if (!selectedIds.has(pid) && p.normPos === pos) {
        selectedStarters.push(p);
        selectedIds.add(pid);
        chosen++;
      }
    }
  }

  // 1. Mandatory Position Slots
  selectBest('QB', constraints.QB || 1);
  selectBest('RB', constraints.RB || 2);
  selectBest('WR', constraints.WR || 3);
  selectBest('TE', constraints.TE || 1);
  if (constraints.K) selectBest('K', constraints.K);
  if (constraints.DEF) selectBest('DEF', constraints.DEF);

  // 2. Flex Slots (Eligible: RB, WR, TE)
  const flexCount = constraints.FLEX || 0;
  let flexChosen = 0;
  for (const p of pool) {
    if (flexChosen >= flexCount) break;
    const pid = p.playerId || p.player || p.playerName;
    if (!selectedIds.has(pid) && (p.normPos === 'RB' || p.normPos === 'WR' || p.normPos === 'TE')) {
      selectedStarters.push({ ...p, isFlexOptimal: true });
      selectedIds.add(pid);
      flexChosen++;
    }
  }

  // 3. Bench Players
  const bench = pool.filter(p => !selectedIds.has(p.playerId || p.player || p.playerName));

  const optimalScore = selectedStarters.reduce((sum, p) => sum + p.points, 0);
  const actualStarters = pool.filter(p => !p.slot?.toUpperCase().startsWith('BN') && !p.slot?.toUpperCase().startsWith('IR') && !p.isBench);
  const actualScore = actualStarters.reduce((sum, p) => sum + p.points, 0);

  const coachingEfficiency = optimalScore > 0 ? Math.min(100, (actualScore / optimalScore) * 100) : 100;
  const pointsLeftOnBench = Math.max(0, optimalScore - actualScore);

  return {
    optimalStarters: selectedStarters,
    optimalBench: bench,
    optimalScore: Number(optimalScore.toFixed(2)),
    actualScore: Number(actualScore.toFixed(2)),
    coachingEfficiency: Number(coachingEfficiency.toFixed(1)),
    pointsLeftOnBench: Number(pointsLeftOnBench.toFixed(2))
  };
}

/**
 * Evaluates whether a single bench-to-starter swap would have turned a loss into a win (The "D'Oh!" Metric 🤦‍♂️)
 */
export function analyzeDOhMoment(starters = [], bench = [], oppScore = 0, teamActualScore = null) {
  const actualScore = teamActualScore !== null ? Number(teamActualScore) : starters.reduce((sum, p) => sum + Number(p.points || 0), 0);
  const opp = Number(oppScore || 0);

  // If the team already won or tied, no D'Oh occurred
  if (actualScore >= opp) {
    return { dOhOccurred: false, bestSwap: null };
  }

  const deficit = opp - actualScore;
  let bestSwap = null;
  let maxWinMargin = -Infinity;

  const validBench = bench.filter(b => !b.injuryStatus || b.injuryStatus !== 'IR');

  starters.forEach(s => {
    const sPos = normalizePosition(s.position);
    const sSlot = (s.slot || '').toUpperCase();
    const sPts = Number(s.points || 0);

    validBench.forEach(b => {
      const bPos = normalizePosition(b.position);
      const bPts = Number(b.points || 0);

      // Check eligibility:
      // Case 1: Exact position match (e.g. RB for RB, WR for WR)
      // Case 2: Starter was in FLEX, and bench is RB/WR/TE
      // Case 3: Starter was RB/WR/TE, and we could swap if bench is same pos or flex-compatible
      let isEligible = false;
      if (sPos === bPos) {
        isEligible = true;
      } else if (sSlot.includes('FLEX') || sSlot.includes('W/R') || sSlot.includes('W/T')) {
        if (bPos === 'RB' || bPos === 'WR' || bPos === 'TE') isEligible = true;
      }

      if (isEligible && bPts > sPts) {
        const netGain = bPts - sPts;
        const newScore = actualScore + netGain;

        if (newScore > opp) {
          const winMargin = newScore - opp;
          if (winMargin > maxWinMargin) {
            maxWinMargin = winMargin;
            bestSwap = {
              starter: s.playerName || s.player || s.name,
              starterPosition: s.position,
              starterSlot: s.slot,
              starterPoints: sPts,
              benchPlayer: b.playerName || b.player || b.name,
              benchPosition: b.position,
              benchPoints: bPts,
              netGain: Number(netGain.toFixed(2)),
              deficitNeeded: Number(deficit.toFixed(2)),
              winMargin: Number(winMargin.toFixed(2)),
              projectedNewScore: Number(newScore.toFixed(2))
            };
          }
        }
      }
    });
  });

  return {
    dOhOccurred: bestSwap !== null,
    bestSwap: bestSwap
  };
}

/**
 * Computes seasonal managerial summary metrics across all teams
 */
export function computeManagerialLeaderboard(teamWeeklyLineups = []) {
  const byOwner = {};

  teamWeeklyLineups.forEach(entry => {
    const owner = entry.ownerName;
    if (!byOwner[owner]) {
      byOwner[owner] = {
        ownerName: owner,
        teamName: entry.teamName,
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        actualPF: 0,
        optimalPF: 0,
        pointsLeftOnBench: 0,
        dOhCount: 0,
        dOhMoments: []
      };
    }

    const t = byOwner[owner];
    t.games += 1;
    t.actualPF += (entry.actualScore || 0);
    t.optimalPF += (entry.optimalScore || 0);
    t.pointsLeftOnBench += Math.max(0, (entry.optimalScore || 0) - (entry.actualScore || 0));

    if (entry.isWin) t.wins += 1;
    else if (entry.isLoss) t.losses += 1;
    else if (entry.isTie) t.ties += 1;

    if (entry.dOhOccurred && entry.dOhDetails) {
      t.dOhCount += 1;
      t.dOhMoments.push({
        week: entry.week,
        seasonYear: entry.seasonYear,
        ...entry.dOhDetails
      });
    }
  });

  return Object.values(byOwner).map(m => {
    const efficiency = m.optimalPF > 0 ? (m.actualPF / m.optimalPF) * 100 : 100;
    const dOhRate = m.losses > 0 ? (m.dOhCount / m.losses) * 100 : 0;
    
    // Most painful D'Oh (smallest deficit or highest win margin)
    const mostPainfulDOh = m.dOhMoments.length > 0
      ? [...m.dOhMoments].sort((a, b) => b.netGain - a.netGain)[0]
      : null;

    return {
      ownerName: m.ownerName,
      teamName: m.teamName,
      games: m.games,
      record: `${m.wins}-${m.losses}${m.ties > 0 ? `-${m.ties}` : ''}`,
      actualPF: Number(m.actualPF.toFixed(1)),
      optimalPF: Number(m.optimalPF.toFixed(1)),
      coachingEfficiency: Number(efficiency.toFixed(1)),
      pointsLeftOnBench: Number(m.pointsLeftOnBench.toFixed(1)),
      benchPFPerGame: Number((m.pointsLeftOnBench / (m.games || 1)).toFixed(1)),
      dOhCount: m.dOhCount,
      dOhRate: Number(dOhRate.toFixed(1)),
      mostPainfulDOh
    };
  }).sort((a, b) => b.coachingEfficiency - a.coachingEfficiency);
}
