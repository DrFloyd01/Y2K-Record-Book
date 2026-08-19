/**
 * Standings, Optimal Points, and League Records Analytics
 */

export function roundVal(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

export function getStandingsForSeason(leagueData, yr, subTab = 'actual') {
  if (!leagueData || !leagueData.standings) return [];
  
  if (yr === 'all') {
    // Cumulative all-time standings
    const managerMap = {};
    for (const s of leagueData.standings) {
      const owner = s.ownerName;
      if (!managerMap[owner]) {
        managerMap[owner] = {
          ownerName: owner,
          teamName: s.teamName,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          seasonsCount: 0,
          championships: 0,
          playoffAppearances: 0,
          optimalWins: 0,
          optimalLosses: 0,
          optimalPointsFor: 0
        };
      }
      const m = managerMap[owner];
      m.wins += (s.wins || 0);
      m.losses += (s.losses || 0);
      m.ties += (s.ties || 0);
      m.pointsFor += (s.pointsFor || 0);
      m.pointsAgainst += (s.pointsAgainst || 0);
      m.seasonsCount += 1;
      if (s.rank === 1) m.championships += 1;
      if (s.madePlayoffs) m.playoffAppearances += 1;
      if (s.optimalWins !== undefined) m.optimalWins += s.optimalWins;
      if (s.optimalLosses !== undefined) m.optimalLosses += s.optimalLosses;
      if (s.optimalPointsFor !== undefined) m.optimalPointsFor += s.optimalPointsFor;
    }

    const list = Object.values(managerMap).map(m => ({
      ...m,
      pointsFor: roundVal(m.pointsFor),
      pointsAgainst: roundVal(m.pointsAgainst),
      optimalPointsFor: roundVal(m.optimalPointsFor),
      winPct: m.wins + m.losses > 0 ? roundVal(m.wins / (m.wins + m.losses + m.ties)) : 0
    }));

    return list.sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.pointsFor - a.pointsFor;
    });
  }

  const seasonNum = parseInt(yr, 10);
  const filtered = leagueData.standings.filter(s => s.year === seasonNum);
  return filtered.sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    return b.wins - a.wins || b.pointsFor - a.pointsFor;
  });
}
