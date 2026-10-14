/**
 * Head-to-Head (H2H) Analytics & Rivalry Engine
 */

/**
 * Computes authentic win streaks from H2H games
 * @param {Array} h2hData 
 * @returns {Array} Streaks list
 */
export function computeStreaksFromH2H(h2hData) {
  const streaks = [];
  (h2hData || []).forEach(pair => {
    const { owner1, owner2, games } = pair;
    if (!games || games.length === 0) return;

    ['overall', 'regular', 'playoff'].forEach(type => {
      let filteredGames = games;
      if (type === 'regular') filteredGames = games.filter(g => !g.isPlayoff);
      if (type === 'playoff') filteredGames = games.filter(g => g.isPlayoff);
      if (filteredGames.length < 2) return;

      const sortedGames = [...filteredGames].sort((a, b) => {
        const ya = Number(a.year || a.seasonYear);
        const yb = Number(b.year || b.seasonYear);
        if (ya !== yb) return ya - yb;
        return Number(a.week || a.weekNumber) - Number(b.week || b.weekNumber);
      });

      let currentWinner = null;
      let streakGames = [];

      for (let idx = 0; idx < sortedGames.length; idx++) {
        const g = sortedGames[idx];
        const w = g.winner;
        if (w === currentWinner) {
          streakGames.push(g);
        } else {
          if (streakGames.length >= 2 && currentWinner && currentWinner !== 'Tie') {
            const loser = currentWinner === owner1 ? owner2 : owner1;
            streaks.push({
              winner: currentWinner,
              loser,
              streak: streakGames.length,
              startYear: streakGames[0].year,
              startWeek: streakGames[0].week,
              endYear: streakGames[streakGames.length - 1].year,
              endWeek: streakGames[streakGames.length - 1].week,
              active: false,
              type,
              games: [...streakGames]
            });
          }
          currentWinner = w;
          streakGames = (w && w !== 'Tie') ? [g] : [];
        }
      }
      if (streakGames.length >= 2 && currentWinner && currentWinner !== 'Tie') {
        const loser = currentWinner === owner1 ? owner2 : owner1;
        streaks.push({
          winner: currentWinner,
          loser,
          streak: streakGames.length,
          startYear: streakGames[0].year,
          startWeek: streakGames[0].week,
          endYear: streakGames[streakGames.length - 1].year,
          endWeek: streakGames[streakGames.length - 1].week,
          active: true,
          type,
          games: [...streakGames]
        });
      }
    });
  });
  return streaks;
}

/**
 * Synchronizes leagueData.h2hData and leagueData.h2hStreaks from allMatchups.
 * - Appends or updates completed games in pair.games
 * - Adds any new manager pairs (e.g. rookies)
 * - Recomputes pair win/loss/tie totals and points for
 * - Computes all streaks and ensures broken streaks become active: false
 * 
 * @param {object} leagueData 
 * @param {boolean} isPride 
 * @returns {object} Updated leagueData
 */
export function syncH2HDataAndStreaks(leagueData, isPride = false) {
  if (!leagueData || !Array.isArray(leagueData.allMatchups)) {
    return leagueData;
  }

  const allMatchups = leagueData.allMatchups;
  const existingH2H = Array.isArray(leagueData.h2hData) ? leagueData.h2hData : [];

  // Index existing pairs by sorted canonical owner names
  const pairMap = new Map();
  existingH2H.forEach(p => {
    if (!p.owner1 || !p.owner2) return;
    const key = [p.owner1.trim(), p.owner2.trim()].sort().join(' vs ');
    pairMap.set(key, p);
  });

  // Filter completed non-consolation matchups
  const completedMatchups = allMatchups.filter(m => {
    const hs = Number(m.homeScore || 0);
    const as = Number(m.awayScore || 0);
    const hasScore = hs > 0 || as > 0;
    const isCompleted = Boolean(m.winner && m.winner !== 'TBD') && hasScore;
    const isLadder = Boolean(
      m.isConsolation ||
      m.stage === 'Consolation Round Robin' ||
      m.stage === 'Consolation Ladder' ||
      m.stage === 'Consolation Matchup' ||
      m.rawTier === 'LOSERS_CONSOLATION_LADDER'
    );
    return isCompleted && !isLadder && m.homeOwner && m.awayOwner;
  });

  // Process all completed matchups
  completedMatchups.forEach(m => {
    const o1 = (m.homeOwner || '').trim();
    const o2 = (m.awayOwner || '').trim();
    if (!o1 || !o2 || o1 === o2) return;

    const key = [o1, o2].sort().join(' vs ');
    let pair = pairMap.get(key);
    if (!pair) {
      const [first, second] = [o1, o2].sort();
      pair = {
        owner1: first,
        owner2: second,
        wins1: 0,
        wins2: 0,
        owner1Wins: 0,
        owner2Wins: 0,
        ties: 0,
        pf1: 0,
        pf2: 0,
        games: []
      };
      pairMap.set(key, pair);
    }

    if (!Array.isArray(pair.games)) {
      pair.games = [];
    }

    const yr = Number(m.year || m.seasonYear);
    const wk = Number(m.week || m.weekNumber);
    const hs = Number(m.homeScore || 0);
    const as = Number(m.awayScore || 0);
    const isPlayoff = Boolean(m.isPlayoff || (m.stage && m.stage !== 'Regular Season'));
    const stage = m.stage || (isPlayoff ? 'Playoffs' : 'Regular Season');

    const existingGame = pair.games.find(g =>
      Number(g.year || g.seasonYear) === yr &&
      Number(g.week || g.weekNumber) === wk
    );

    if (!existingGame) {
      const gameObj = {
        year: yr,
        week: wk,
        isPlayoff,
        stage,
        homeOwner: m.homeOwner,
        homeTeam: m.homeTeam,
        homeScore: hs,
        awayOwner: m.awayOwner,
        awayTeam: m.awayTeam,
        awayScore: as,
        owner1Score: m.homeOwner === pair.owner1 ? hs : as,
        owner2Score: m.homeOwner === pair.owner2 ? hs : as,
        winner: m.winner
      };
      pair.games.push(gameObj);
    } else {
      existingGame.homeScore = hs;
      existingGame.awayScore = as;
      existingGame.winner = m.winner;
      existingGame.owner1Score = m.homeOwner === pair.owner1 ? hs : as;
      existingGame.owner2Score = m.homeOwner === pair.owner2 ? hs : as;
      existingGame.isPlayoff = isPlayoff;
      existingGame.stage = stage;
      existingGame.homeTeam = m.homeTeam;
      existingGame.awayTeam = m.awayTeam;
    }
  });

  // Recompute summary metrics for each pair & sort games chronologically
  const updatedH2H = Array.from(pairMap.values()).map(pair => {
    pair.games.sort((a, b) => {
      const ya = Number(a.year || a.seasonYear);
      const yb = Number(b.year || b.seasonYear);
      if (ya !== yb) return ya - yb;
      return Number(a.week || a.weekNumber) - Number(b.week || b.weekNumber);
    });

    let w1 = 0, w2 = 0, ties = 0, pf1 = 0, pf2 = 0;
    pair.games.forEach(g => {
      if (g.winner === pair.owner1) w1++;
      else if (g.winner === pair.owner2) w2++;
      else ties++;

      if (g.homeOwner === pair.owner1) {
        pf1 += (g.homeScore || 0);
        pf2 += (g.awayScore || 0);
      } else if (g.awayOwner === pair.owner1) {
        pf1 += (g.awayScore || 0);
        pf2 += (g.homeScore || 0);
      }
    });

    return {
      ...pair,
      wins1: w1,
      wins2: w2,
      owner1Wins: w1,
      owner2Wins: w2,
      ties,
      pf1: Number(pf1.toFixed(2)),
      pf2: Number(pf2.toFixed(2))
    };
  });

  const updatedStreaks = computeStreaksFromH2H(updatedH2H);
  updatedStreaks.sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : (b.active ? 1 : 0) - (a.active ? 1 : 0));

  leagueData.h2hData = updatedH2H;
  leagueData.h2hStreaks = updatedStreaks;

  return leagueData;
}

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
    if (m.isConsolation || m.stage === 'Consolation Round Robin' || m.stage === 'Consolation Ladder' || m.stage === 'Consolation Matchup' || m.playoffStage === 'Consolation Round Robin' || m.rawTier === 'LOSERS_CONSOLATION_LADDER') continue;
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
