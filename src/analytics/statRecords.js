/**
 * League Records, Stat Cards, and Playoff Analytics
 */

export function isOneYearManager(ownerName) {
  if (!ownerName) return false;
  const clean = ownerName.trim();
  return clean === 'Nick' || clean === 'Torin';
}

export function formatPlayoffStageTag(stage, year) {
  const yy = String(year).slice(2);
  if (!stage) return `Playoff'${yy}`;
  const lower = stage.toLowerCase();
  if (lower.includes('cup') || lower.includes('championship') || lower.includes('1st') || lower.includes('nebuchadnezzar')) return `1st'${yy}`;
  if (lower.includes('semi')) return `SF'${yy}`;
  if (lower.includes('wild')) return `WC'${yy}`;
  if (lower.includes('3rd')) return `3rd'${yy}`;
  if (lower.includes('5th')) return `5th'${yy}`;
  if (lower.includes('consolation') || lower.includes('round robin') || lower.includes('rr')) return `RR'${yy}`;
  return `${stage}'${yy}`;
}

/**
 * Helper: Format Playoff Week / Aggregate Round Labels
 * Pre-2022 ESPN leagues used 2-week playoff rounds (e.g. Weeks 14+15 and 16+17)
 */
export function formatPlayoffWeek(season, week, stage) {
  const yr = parseInt(season, 10);
  const wk = parseInt(week, 10);
  if (!yr || isNaN(yr)) return `WEEK ${week || ''}`.trim();
  
  if (yr < 2022) {
    if (yr === 2020) {
      if (wk === 13 || wk === 14 || (stage && (stage.includes('Semi') || stage.includes('Wild')))) return 'WEEKS 13+14';
      if (wk === 15 || wk === 16 || (stage && (stage.includes('Final') || stage.includes('3rd') || stage.includes('5th')))) return 'WEEKS 15+16';
    } else {
      // 2017, 2018, 2019, 2021
      if (wk === 14 || wk === 15 || (stage && (stage.includes('Semi') || stage.includes('Wild')))) return 'WEEKS 14+15';
      if (wk === 16 || wk === 17 || (stage && (stage.includes('Final') || stage.includes('3rd') || stage.includes('5th')))) return 'WEEKS 16+17';
    }
  }

  return `WEEK ${week || ''}`.trim();
}

export function getPlayoffMatchupResult(leagueData, yr, stage) {
  if (!leagueData || !leagueData.seasonData) return null;
  const sData = leagueData.seasonData[yr];
  if (!sData || !sData.playoffMatchups) return null;
  return sData.playoffMatchups.find(m => m.stage && m.stage.toLowerCase() === stage.toLowerCase()) || null;
}

export function getStatCardTop5(leagueData, metricKey, season) {
  if (!leagueData) return [];

  if (season === 'allTime' || season === 'playoffs') {
    const atRecords = (leagueData.seasonData && leagueData.seasonData.allTime && leagueData.seasonData.allTime.statRecords) || leagueData.allTimeStatRecords || {};
    if ((metricKey === 'victoryLap' || metricKey === 'victory') && atRecords.victoryLapList) {
      return atRecords.victoryLapList.map(item => ({
        owner: item.owner,
        team: item.team || item.owner,
        streak: item.streak,
        valStr: item.valStr || `${item.streak} Seasons`,
        sub: item.sub || `${item.streak} Consecutive Apps`
      }));
    }
    if ((metricKey === 'dumpsterFire' || metricKey === 'dumpster') && atRecords.dumpsterFireList) {
      return atRecords.dumpsterFireList.map(item => ({
        owner: item.owner,
        team: item.team || item.owner,
        streak: item.streak,
        valStr: item.valStr || `${item.streak} Seasons`,
        sub: item.sub || `${item.streak} Consecutive Misses`
      }));
    }
  }

  let matchups = leagueData.allMatchups || [];
  if (season === 'playoffs') {
    matchups = matchups.filter(m => m.isPlayoff && m.homeScore > 0 && m.awayScore > 0);
    matchups = matchups.filter(m => !isOneYearManager(m.homeOwner) && !isOneYearManager(m.awayOwner));
  } else if (season === 'allTime') {
    matchups = matchups.filter(m => !m.isPlayoff && m.homeScore > 0 && m.awayScore > 0);
    matchups = matchups.filter(m => !isOneYearManager(m.homeOwner) && !isOneYearManager(m.awayOwner));
  } else {
    matchups = matchups.filter(m => !m.isPlayoff && m.homeScore > 0 && m.awayScore > 0 && m.seasonYear === parseInt(season, 10));
  }

  if (metricKey === 'victoryLap') {
    matchups.sort((a, b) => a.seasonYear !== b.seasonYear ? a.seasonYear - b.seasonYear : a.weekNumber - b.weekNumber);
    const ownerGames = {};
    matchups.forEach(m => {
      const h = m.homeOwner, a = m.awayOwner;
      if (!ownerGames[h]) ownerGames[h] = [];
      if (!ownerGames[a]) ownerGames[a] = [];
      ownerGames[h].push({ year: m.seasonYear, week: m.weekNumber, win: m.homeScore > m.awayScore, team: m.homeTeam });
      ownerGames[a].push({ year: m.seasonYear, week: m.weekNumber, win: m.awayScore > m.homeScore, team: m.awayTeam });
    });

    const allStreaks = [];
    Object.keys(ownerGames).forEach(owner => {
      const games = ownerGames[owner];
      let curCount = 0, startG = null, endG = null, lastTeam = '';
      games.forEach((g, i) => {
        if (g.win) {
          if (curCount === 0) startG = g;
          curCount++;
          endG = g;
          lastTeam = g.team;
          if (i === games.length - 1 || !games[i + 1].win) {
            const yrSpan = startG.year === endG.year ? `${startG.year} W${startG.week}-W${endG.week}` : `${startG.year} W${startG.week} - ${endG.year} W${endG.week}`;
            allStreaks.push({
              owner: owner,
              team: lastTeam,
              streak: curCount,
              valStr: `${curCount} WINS`,
              sub: yrSpan,
              endYear: endG.year
            });
            curCount = 0;
          }
        } else {
          curCount = 0;
        }
      });
    });

    allStreaks.sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : b.endYear - a.endYear);
    return allStreaks.slice(0, 5);
  }

  if (metricKey === 'dumpsterFire') {
    matchups.sort((a, b) => a.seasonYear !== b.seasonYear ? a.seasonYear - b.seasonYear : a.weekNumber - b.weekNumber);
    const ownerGames = {};
    matchups.forEach(m => {
      const h = m.homeOwner, a = m.awayOwner;
      if (!ownerGames[h]) ownerGames[h] = [];
      if (!ownerGames[a]) ownerGames[a] = [];
      ownerGames[h].push({ year: m.seasonYear, week: m.weekNumber, loss: m.homeScore < m.awayScore, team: m.homeTeam });
      ownerGames[a].push({ year: m.seasonYear, week: m.weekNumber, loss: m.awayScore < m.homeScore, team: m.awayTeam });
    });

    const allStreaks = [];
    Object.keys(ownerGames).forEach(owner => {
      const games = ownerGames[owner];
      let curCount = 0, startG = null, endG = null, lastTeam = '';
      games.forEach((g, i) => {
        if (g.loss) {
          if (curCount === 0) startG = g;
          curCount++;
          endG = g;
          lastTeam = g.team;
          if (i === games.length - 1 || !games[i + 1].loss) {
            const yrSpan = startG.year === endG.year ? `${startG.year} W${startG.week}-W${endG.week}` : `${startG.year} W${startG.week} - ${endG.year} W${endG.week}`;
            allStreaks.push({
              owner: owner,
              team: lastTeam,
              streak: curCount,
              valStr: `${curCount} LOSSES`,
              sub: yrSpan,
              endYear: endG.year
            });
            curCount = 0;
          }
        } else {
          curCount = 0;
        }
      });
    });

    allStreaks.sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : b.endYear - a.endYear);
    return allStreaks.slice(0, 5);
  }

  const list = [];
  matchups.forEach(m => {
    const yr = m.seasonYear, wk = m.weekNumber;
    const hS = m.homeScore, aS = m.awayScore;
    const hO = m.homeOwner, aO = m.awayOwner;
    const hT = m.homeTeam, aT = m.awayTeam;
    const margin = Math.round(Math.abs(hS - aS) * 100) / 100;
    const stageStr = m.stage ? ` (${m.stage})` : '';
    const yrPrefix = (season === 'allTime' || season === 'playoffs') ? `${yr} ` : '';

    if (metricKey === 'juggernaut' || metricKey === 'apex') {
      list.push({ owner: hO, team: hT, score: hS, valStr: `${hS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${aO} (${hS.toFixed(1)}-${aS.toFixed(1)})` });
      list.push({ owner: aO, team: aT, score: aS, valStr: `${aS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${hO} (${aS.toFixed(1)}-${hS.toFixed(1)})` });
    } else if (metricKey === 'featherweight' || metricKey === 'potato') {
      list.push({ owner: hO, team: hT, score: hS, valStr: `${hS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${aO} (${hS.toFixed(1)}-${aS.toFixed(1)})` });
      list.push({ owner: aO, team: aT, score: aS, valStr: `${aS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${hO} (${aS.toFixed(1)}-${hS.toFixed(1)})` });
    } else if (hS !== aS) {
      const wS = hS > aS ? hS : aS, wO = hS > aS ? hO : aO, wT = hS > aS ? hT : aT;
      const lS = hS > aS ? aS : hS, lO = hS > aS ? aO : hO, lT = hS > aS ? aT : hT;

      if (metricKey === 'cakewalk' || metricKey === 'massacre') {
        list.push({ owner: wO, team: wT, margin: margin, valStr: `+${margin.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${lO} (${wS.toFixed(1)}-${lS.toFixed(1)})` });
      } else if (metricKey === 'nailbiter') {
        list.push({ owner: wO, team: wT, margin: margin, valStr: `+${margin.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${lO} (${wS.toFixed(1)}-${lS.toFixed(1)})` });
      } else if (metricKey === 'gutpunch') {
        list.push({ owner: lO, team: lT, score: lS, valStr: `${lS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${wO} (Lost ${lS.toFixed(1)}-${wS.toFixed(1)})` });
      } else if (metricKey === 'criminal') {
        list.push({ owner: wO, team: wT, score: wS, valStr: `${wS.toFixed(2)} pts`, sub: `${yrPrefix}W${wk}${stageStr} vs ${lO} (Won ${wS.toFixed(1)}-${lS.toFixed(1)})` });
      }
    }
  });

  if (metricKey === 'juggernaut' || metricKey === 'apex') list.sort((a, b) => b.score - a.score);
  else if (metricKey === 'featherweight' || metricKey === 'potato') list.sort((a, b) => a.score - b.score);
  else if (metricKey === 'cakewalk' || metricKey === 'massacre') list.sort((a, b) => b.margin - a.margin);
  else if (metricKey === 'nailbiter') list.sort((a, b) => a.margin - b.margin);
  else if (metricKey === 'gutpunch') list.sort((a, b) => b.score - a.score);
  else if (metricKey === 'criminal') list.sort((a, b) => a.score - b.score);

  return list.slice(0, 5);
}

export function getGlobalAllTimeStatRecords(leagueData) {
  if (!leagueData || !leagueData.allMatchups) return {};
  let maxJug = null, minFeath = null, maxCake = null, minNail = null, maxHb = null, minCrim = null;

  leagueData.allMatchups.forEach(m => {
    if (isOneYearManager(m.homeOwner) || isOneYearManager(m.awayOwner)) return;

    const yr = m.seasonYear, wk = m.weekNumber;
    const hS = m.homeScore, aS = m.awayScore;
    const hO = m.homeOwner, aO = m.awayOwner;
    const hT = m.homeTeam, aT = m.awayTeam;
    const margin = Math.round(Math.abs(hS - aS) * 100) / 100;

    if (!maxJug || hS > maxJug.score) maxJug = { score: hS, owner: hO, team: hT, week: `${yr} W${wk}` };
    if (!maxJug || aS > maxJug.score) maxJug = { score: aS, owner: aO, team: aT, week: `${yr} W${wk}` };
    if (!minFeath || hS < minFeath.score) minFeath = { score: hS, owner: hO, team: hT, week: `${yr} W${wk}` };
    if (!minFeath || aS < minFeath.score) minFeath = { score: aS, owner: aO, team: aT, week: `${yr} W${wk}` };

    if (hS !== aS) {
      const wS = hS > aS ? hS : aS, wO = hS > aS ? hO : aO, wT = hS > aS ? hT : aT;
      const lS = hS > aS ? aS : hS, lO = hS > aS ? aO : hO, lT = hS > aS ? aT : hT;

      if (!maxCake || margin > maxCake.margin) maxCake = { margin: margin, winnerScore: wS, loserScore: lS, owner: wO, team: wT, week: `${yr} W${wk}` };
      if (!minNail || margin < minNail.margin) minNail = { margin: margin, winnerScore: wS, loserScore: lS, owner: wO, team: wT, week: `${yr} W${wk}` };
      if (!maxHb || lS > maxHb.score) maxHb = { score: lS, owner: lO, team: lT, week: `${yr} W${wk}` };
      if (!minCrim || wS < minCrim.score) minCrim = { score: wS, owner: wO, team: wT, week: `${yr} W${wk}` };
    }
  });

  return {
    juggernaut: maxJug,
    featherweight: minFeath,
    cakewalk: maxCake,
    nailbiter: minNail,
    heartbreak: maxHb,
    criminal: minCrim,
    victoryLap: { length: 6, owner: 'Dylan', team: 'Globo Gym', weeks: '2025 Weeks 11-17' },
    dumpsterFire: { length: 6, owner: 'Dustin', team: 'Dusty’s Dingleberries', weeks: '2025 Weeks 3-8' }
  };
}
