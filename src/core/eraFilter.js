/**
 * Modern Era Filter Utility (2022+ / 10+ Teams Era)
 *
 * Filters league dataset for seasons >= minYear (default: 2022),
 * recalculating career standings, H2H matrix, streaks, player rings,
 * and playoff streaks to reflect the expanded 10+ team era.
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

      let currentWinner = null;
      let streakGames = [];

      for (let idx = 0; idx < filteredGames.length; idx++) {
        const g = filteredGames[idx];
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
 * Filters NFL Player Championship rings by minYear
 * @param {Array} allTimePlayerRings 
 * @param {number} minYear 
 * @returns {object} { rings, lookup }
 */
export function filterPlayerRings(allTimePlayerRings, minYear = 2022) {
  if (!allTimePlayerRings) return { rings: [], lookup: {} };
  const filtered = [];
  const lookup = {};

  allTimePlayerRings.forEach(item => {
    const validRings = (item.rings || []).filter(r => r.year >= minYear);
    if (validRings.length > 0) {
      const copy = {
        player: item.player,
        norm: item.norm,
        ringsCount: validRings.length,
        rings: validRings.map((r, i) => ({ ...r, ringNumber: i + 1 }))
      };
      filtered.push(copy);
      lookup[item.norm] = copy;
      if (item.player !== item.norm) lookup[item.player] = copy;
    }
  });

  filtered.sort((a, b) => b.ringsCount - a.ringsCount);
  return { rings: filtered, lookup };
}

/**
 * Calculates consecutive playoff appearance and drought streaks in concluded modern seasons
 * @param {Array} allTimeStandings 
 * @param {Array<number>} concludedYears 
 * @returns {object} Victory lap & dumpster fire streaks
 */
export function buildModernPlayoffStreaks(allTimeStandings, concludedYears) {
  const victoryLapList = [];
  const dumpsterFireList = [];

  if (!concludedYears || concludedYears.length === 0) {
    return { victoryLap: null, victoryLapList: [], dumpsterFire: null, dumpsterFireList: [] };
  }

  const sortedYears = [...concludedYears].sort((a, b) => a - b);
  const minYr = sortedYears[0];
  const maxYr = sortedYears[sortedYears.length - 1];

  (allTimeStandings || []).forEach(st => {
    const owner = st.ownerName;
    const playYears = new Set(st.playoffYears || []);

    let curMake = 0;
    let maxMake = 0;
    let curMiss = 0;
    let maxMiss = 0;

    sortedYears.forEach(yr => {
      if (playYears.has(yr)) {
        curMake++;
        if (curMake > maxMake) maxMake = curMake;
        curMiss = 0;
      } else {
        curMiss++;
        if (curMiss > maxMiss) maxMiss = curMiss;
        curMake = 0;
      }
    });

    if (maxMake > 0) {
      victoryLapList.push({
        owner,
        team: st.teamName || owner,
        streak: maxMake,
        valStr: `${maxMake} Seasons`,
        sub: `${minYr}-${maxYr} (${maxMake} Straight Apps)`
      });
    }
    if (maxMiss > 0) {
      dumpsterFireList.push({
        owner,
        team: st.teamName || owner,
        streak: maxMiss,
        valStr: `${maxMiss} Seasons`,
        sub: `${minYr}-${maxYr} (${maxMiss} Straight Misses)`
      });
    }
  });

  victoryLapList.sort((a, b) => b.streak - a.streak);
  dumpsterFireList.sort((a, b) => b.streak - a.streak);

  return {
    victoryLap: victoryLapList[0] || null,
    victoryLapList,
    dumpsterFire: dumpsterFireList[0] || null,
    dumpsterFireList
  };
}

/**
 * Re-aggregates all-time cumulative standings from individual season data >= minYear
 * @param {object} rawLeagueData 
 * @param {number} minYear 
 * @returns {Array} Modern era allTimeStandings
 */
export function buildModernAllTimeStandings(rawLeagueData, minYear = 2022) {
  const seasons = (rawLeagueData.seasons || []).filter(y => y >= minYear);
  const rawStandingsMap = new Map();
  (rawLeagueData.allTimeStandings || []).forEach(st => rawStandingsMap.set(st.ownerName, st));

  const filteredChamps = (rawLeagueData.championships || []).filter(c => c.seasonYear >= minYear);
  const concludedYears = seasons.filter(yr => yr < 2026);

  // Modern owners: owners who participated in at least one modern season
  const modernOwners = new Set();
  seasons.forEach(yr => {
    const sData = rawLeagueData.seasonData && rawLeagueData.seasonData[String(yr)];
    if (sData && sData.standings) {
      sData.standings.forEach(s => modernOwners.add(s.ownerName));
    }
  });

  const modernStandings = [];

  modernOwners.forEach(owner => {
    const rawSt = rawStandingsMap.get(owner) || {};
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let expWins = 0;
    let expLosses = 0;
    let ovrWins = 0;
    let ovrLosses = 0;
    let optimalPF = 0;
    let hasOpt = false;
    let seasonsCount = 0;
    let latestTeamName = rawSt.teamName || owner;
    let maxConcludedYearSeen = -1;

    const finishes = {
      '1st': [], '2nd': [], '3rd': [], '4th': [], '5th_6th': [], '7th_12th': []
    };
    if (rawSt.finishes) {
      Object.keys(finishes).forEach(bin => {
        if (Array.isArray(rawSt.finishes[bin])) {
          finishes[bin] = rawSt.finishes[bin].filter(f => f.year >= minYear);
        }
      });
    }

    const championships = {
      '1st': finishes['1st'].length,
      '2nd': finishes['2nd'].length,
      '3rd': finishes['3rd'].length,
      '4th': finishes['4th'].length,
      '5th_6th': finishes['5th_6th'].length,
      '7th_12th': finishes['7th_12th'].length,
      scoringTitles: 0
    };

    let playoffWins = 0;
    let playoffLosses = 0;
    const playoffYears = (rawSt.playoffYears || []).filter(y => y >= minYear);

    filteredChamps.forEach(c => {
      if (c.scoringChampOwner === owner) championships.scoringTitles++;
    });

    concludedYears.forEach(yr => {
      const sData = rawLeagueData.seasonData && rawLeagueData.seasonData[String(yr)];
      if (!sData || !sData.standings) return;
      const sEntry = sData.standings.find(s => s.ownerName === owner);
      if (!sEntry) return;

      seasonsCount++;
      if (yr > maxConcludedYearSeen) {
        maxConcludedYearSeen = yr;
        if (sEntry.teamName) latestTeamName = sEntry.teamName;
      }

      wins += (sEntry.wins || 0);
      losses += (sEntry.losses || 0);
      pointsFor += (sEntry.pointsFor || 0);
      pointsAgainst += (sEntry.pointsAgainst || 0);

      if (sEntry.expRecord) {
        const [ew, el] = sEntry.expRecord.split('-').map(Number);
        if (!isNaN(ew)) expWins += ew;
        if (!isNaN(el)) expLosses += el;
      }
      if (sEntry.ovrRecord) {
        const [ow, ol] = sEntry.ovrRecord.split('-').map(Number);
        if (!isNaN(ow)) ovrWins += ow;
        if (!isNaN(ol)) ovrLosses += ol;
      }
      if (sEntry.optimalPointsFor !== undefined || sEntry.optimalPF !== undefined) {
        const opt = sEntry.optimalPointsFor !== undefined ? sEntry.optimalPointsFor : sEntry.optimalPF;
        if (opt !== null && !isNaN(opt)) {
          optimalPF += opt;
          hasOpt = true;
        }
      }

      playoffWins += (sEntry.playoffWins || 0);
      playoffLosses += (sEntry.playoffLosses || 0);
    });

    // If manager has 0 concluded seasons in modern era, omit from career leaderboard
    if (seasonsCount === 0) return;

    const wwDetails = (rawSt.wwDetails || []).filter(d => (d.year || 0) >= minYear);
    const lwDetails = (rawSt.lwDetails || []).filter(d => (d.year || 0) >= minYear);
    const hbDetails = (rawSt.hbDetails || []).filter(d => (d.year || 0) >= minYear);
    const tlDetails = (rawSt.tlDetails || []).filter(d => (d.year || 0) >= minYear);
    const dOhDetails = (rawSt.dOhDetails || []).filter(d => (d.year || 0) >= minYear);

    const totalGames = wins + losses;
    const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0;
    const avgPF = totalGames > 0 ? Number((pointsFor / totalGames).toFixed(1)) : 0;
    const ovrTot = ovrWins + ovrLosses;
    const ovrWinPct = ovrTot > 0 ? Math.round((ovrWins / ovrTot) * 1000) / 10 : 0;
    const playoffApps = playoffYears.length;
    const playoffPct = seasonsCount > 0 ? Math.round((playoffApps / seasonsCount) * 100) : 0;
    const playoffTot = playoffWins + playoffLosses;
    const playoffWinPct = playoffTot > 0 ? Math.round((playoffWins / playoffTot) * 1000) / 10 : 0;
    const luck = wins - expWins;

    const optTotal = hasOpt ? Number(optimalPF.toFixed(1)) : null;
    const coachingEff = (hasOpt && optTotal > 0) ? Number(((pointsFor / optTotal) * 100).toFixed(1)) : null;
    const optPfg = (hasOpt && totalGames > 0) ? Number((optTotal / totalGames).toFixed(1)) : null;

    modernStandings.push({
      ownerName: owner,
      teamName: latestTeamName,
      wins,
      losses,
      winPct,
      pointsFor: Number(pointsFor.toFixed(2)),
      pointsAgainst: Number(pointsAgainst.toFixed(2)),
      avgPF,
      seasonsCount,
      championships,
      finishes,
      playoffApps,
      playoffYears,
      playoffPct,
      playoffWins,
      playoffLosses,
      playoffRecord: `${playoffWins}-${playoffLosses}`,
      playoffWinPct,
      weeklyWins: wwDetails.length,
      wwDetails,
      luckiestWins: lwDetails.length,
      lwDetails,
      heartbreaks: hbDetails.length,
      hbDetails,
      toughestLosses: tlDetails.length,
      tlDetails,
      expWins,
      expRecord: `${expWins}-${expLosses}`,
      luck,
      ovrWins,
      ovrLosses,
      ovrWinPct,
      ovrRecord: `${ovrWins}-${ovrLosses}`,
      dOhs: dOhDetails.length,
      dOhDetails,
      dOhCount: dOhDetails.length,
      optimalPointsFor: optTotal,
      optimalPF: optTotal,
      coachingEfficiency: coachingEff,
      optPfg
    });
  });

  // Sort by winPct desc, then pointsFor desc
  modernStandings.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    return b.pointsFor - a.pointsFor;
  });
  modernStandings.forEach((st, idx) => {
    st.rank = idx + 1;
  });

  return modernStandings;
}

/**
 * Creates a filtered copy of the league data containing only seasons >= minYear
 * @param {object} rawLeagueData 
 * @param {number} minYear 
 * @returns {object} Filtered league data object
 */
export function filterLeagueDataByMinYear(rawLeagueData, minYear = 2022) {
  if (!rawLeagueData) return rawLeagueData;

  const filteredSeasons = (rawLeagueData.seasons || []).filter(y => y >= minYear);
  const filteredChamps = (rawLeagueData.championships || []).filter(c => c.seasonYear >= minYear);
  const filteredMatchups = (rawLeagueData.allMatchups || []).filter(m => (m.seasonYear || m.year) >= minYear);

  const filteredSeasonData = {};
  filteredSeasons.forEach(yr => {
    if (rawLeagueData.seasonData && rawLeagueData.seasonData[String(yr)]) {
      filteredSeasonData[String(yr)] = rawLeagueData.seasonData[String(yr)];
    }
  });

  const filteredDraftOrders = {};
  if (rawLeagueData.draftOrders) {
    Object.keys(rawLeagueData.draftOrders).forEach(yr => {
      if (Number(yr) >= minYear) {
        filteredDraftOrders[yr] = rawLeagueData.draftOrders[yr];
      }
    });
  }

  const filteredChampionshipRosters = {};
  if (rawLeagueData.championshipRosters) {
    Object.keys(rawLeagueData.championshipRosters).forEach(yr => {
      if (Number(yr) >= minYear) {
        filteredChampionshipRosters[yr] = rawLeagueData.championshipRosters[yr];
      }
    });
  }

  // Modern owners set
  const modernOwners = new Set();
  filteredSeasons.forEach(yr => {
    const sData = filteredSeasonData[String(yr)];
    if (sData && sData.standings) {
      sData.standings.forEach(s => modernOwners.add(s.ownerName));
    }
  });

  // Modern All Time Standings
  const modernStandings = buildModernAllTimeStandings(rawLeagueData, minYear);
  const concludedYears = filteredSeasons.filter(yr => yr < 2026);

  // Filter H2H Data
  const filteredH2H = [];
  (rawLeagueData.h2hData || []).forEach(pair => {
    const validGames = (pair.games || []).filter(g => (g.year || g.seasonYear) >= minYear);
    if (modernOwners.has(pair.owner1) && modernOwners.has(pair.owner2)) {
      let w1 = 0, w2 = 0, ties = 0, pf1 = 0, pf2 = 0;
      validGames.forEach(g => {
        if (g.winner === pair.owner1) w1++;
        else if (g.winner === pair.owner2) w2++;
        else if (g.winner === 'Tie') ties++;

        if (g.homeOwner === pair.owner1) {
          pf1 += (g.homeScore || 0);
          pf2 += (g.awayScore || 0);
        } else if (g.awayOwner === pair.owner1) {
          pf1 += (g.awayScore || 0);
          pf2 += (g.homeScore || 0);
        }
      });
      filteredH2H.push({
        owner1: pair.owner1,
        owner2: pair.owner2,
        wins1: w1,
        wins2: w2,
        ties,
        pf1: Number(pf1.toFixed(2)),
        pf2: Number(pf2.toFixed(2)),
        games: validGames
      });
    }
  });

  // Streaks
  const filteredStreaks = computeStreaksFromH2H(filteredH2H);

  // Player Rings
  const { rings: filteredRings, lookup: filteredRingsLookup } = filterPlayerRings(rawLeagueData.allTimePlayerRings, minYear);

  // Playoff streaks
  const playoffStreaks = buildModernPlayoffStreaks(modernStandings, concludedYears);

  // Draft profiles filtered to modern owners
  const filteredDraftProfiles = {};
  if (rawLeagueData.draftProfiles) {
    Object.keys(rawLeagueData.draftProfiles).forEach(owner => {
      if (modernOwners.has(owner)) {
        filteredDraftProfiles[owner] = rawLeagueData.draftProfiles[owner];
      }
    });
  }

  return {
    ...rawLeagueData,
    seasons: filteredSeasons,
    championships: filteredChamps,
    seasonData: filteredSeasonData,
    allMatchups: filteredMatchups,
    allTimeStandings: modernStandings,
    h2hData: filteredH2H,
    h2hStreaks: filteredStreaks,
    draftOrders: filteredDraftOrders,
    championshipRosters: filteredChampionshipRosters,
    allTimePlayerRings: filteredRings,
    playerRingsLookup: filteredRingsLookup,
    draftProfiles: filteredDraftProfiles,
    allTimeStatRecords: {
      ...(rawLeagueData.allTimeStatRecords || {}),
      ...playoffStreaks
    }
  };
}
