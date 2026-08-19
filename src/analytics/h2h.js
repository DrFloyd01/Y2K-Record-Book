/**
 * Head-to-Head (H2H) Analytics & Rivalry Engine
 */

export function calcStreak(gList, o1) {
  if (!gList || gList.length === 0) return { count: 0, owner: null };
  const sorted = [...gList].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  const firstWinner = sorted[0].winner;
  let count = 0;
  for (const g of sorted) {
    if (g.winner === firstWinner) {
      count++;
    } else {
      break;
    }
  }
  return { count, owner: firstWinner };
}

export function calcMaxStreak(gList, o1, o2) {
  if (!gList || gList.length === 0) {
    return { maxO1: 0, maxO2: 0, o1Ties: [], o2Ties: [] };
  }
  const chron = [...gList].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });

  let curWinner = null;
  let curCount = 0;
  let maxO1 = 0;
  let maxO2 = 0;
  let o1Ties = [];
  let o2Ties = [];
  let curGames = [];

  for (const g of chron) {
    if (g.winner === curWinner) {
      curCount++;
      curGames.push(g);
    } else {
      if (curWinner === o1) {
        if (curCount > maxO1) {
          maxO1 = curCount;
          o1Ties = [{ count: curCount, games: [...curGames] }];
        } else if (curCount === maxO1 && maxO1 > 0) {
          o1Ties.push({ count: curCount, games: [...curGames] });
        }
      } else if (curWinner === o2) {
        if (curCount > maxO2) {
          maxO2 = curCount;
          o2Ties = [{ count: curCount, games: [...curGames] }];
        } else if (curCount === maxO2 && maxO2 > 0) {
          o2Ties.push({ count: curCount, games: [...curGames] });
        }
      }
      curWinner = g.winner;
      curCount = 1;
      curGames = [g];
    }
  }

  // Final streak flush
  if (curWinner === o1) {
    if (curCount > maxO1) {
      maxO1 = curCount;
      o1Ties = [{ count: curCount, games: [...curGames] }];
    } else if (curCount === maxO1 && maxO1 > 0) {
      o1Ties.push({ count: curCount, games: [...curGames] });
    }
  } else if (curWinner === o2) {
    if (curCount > maxO2) {
      maxO2 = curCount;
      o2Ties = [{ count: curCount, games: [...curGames] }];
    } else if (curCount === maxO2 && maxO2 > 0) {
      o2Ties.push({ count: curCount, games: [...curGames] });
    }
  }

  return { maxO1, maxO2, o1Ties, o2Ties };
}

export function getH2HBreakdown(leagueData, o1, o2) {
  if (!leagueData || !leagueData.matchups) return null;
  const games = [];
  let o1RegWins = 0, o2RegWins = 0;
  let o1PlayWins = 0, o2PlayWins = 0;
  let o1Pts = 0, o2Pts = 0;

  for (const m of leagueData.matchups) {
    const isM = (m.homeOwner === o1 && m.awayOwner === o2) || (m.homeOwner === o2 && m.awayOwner === o1);
    if (!isM) continue;

    const o1IsHome = (m.homeOwner === o1);
    const o1Score = o1IsHome ? m.homeScore : m.awayScore;
    const o2Score = o1IsHome ? m.awayScore : m.homeScore;
    o1Pts += o1Score;
    o2Pts += o2Score;

    const winner = (o1Score > o2Score) ? o1 : (o2Score > o1Score ? o2 : 'TIE');
    const isPlayoff = Boolean(m.isPlayoff || m.playoffRound);

    if (isPlayoff) {
      if (winner === o1) o1PlayWins++;
      else if (winner === o2) o2PlayWins++;
    } else {
      if (winner === o1) o1RegWins++;
      else if (winner === o2) o2RegWins++;
    }

    games.push({
      year: m.year,
      week: m.week,
      isPlayoff,
      playoffStage: m.playoffStage || (isPlayoff ? 'Playoffs' : 'Regular'),
      homeOwner: m.homeOwner,
      awayOwner: m.awayOwner,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      winner,
      o1Score,
      o2Score
    });
  }

  const sortedGames = games.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  const streak = calcStreak(sortedGames, o1);
  const maxStreaks = calcMaxStreak(sortedGames, o1, o2);

  return {
    totalGames: games.length,
    o1TotalWins: o1RegWins + o1PlayWins,
    o2TotalWins: o2RegWins + o2PlayWins,
    o1RegWins,
    o2RegWins,
    o1PlayWins,
    o2PlayWins,
    o1Pts: Math.round(o1Pts * 100) / 100,
    o2Pts: Math.round(o2Pts * 100) / 100,
    currentStreak: streak,
    maxStreaks,
    games: sortedGames
  };
}
