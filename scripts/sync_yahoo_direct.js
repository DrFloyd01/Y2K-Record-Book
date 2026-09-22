#!/usr/bin/env node

/**
 * Direct Zero-Auth Yahoo Fantasy Football Sync Engine
 *
 * Automatically fetches matchups, scores, and schedules directly from Yahoo's
 * public web endpoints without requiring Developer API tokens or session cookies.
 * Recomputes 2026 standings, all-play OVR records, luck indices, weekly badges,
 * and season stat records with dual-site parity to ESPN.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Canonical Y2K Team to Owner Mapping
export const Y2K_TEAM_OWNER_MAP = {
  'Globo Gym': 'Dylan',
  'The Dawn of Man-Ape': 'Dylan',
  'Ho Chi Win City': 'Phillip',
  'TDS': 'Phillip',
  'Jelqaida': 'Mike',
  'IRked': 'Mike',
  'AARPFL': 'Casey',
  'Gl Hf (you’re gay)': 'Trace',
  'Gl Hf (you\'re gay)': 'Trace',
  'Darnold Schwarzenegger': 'Alex',
  'Donkey Squad': 'Ryan',
  'Aaron codger': 'Boaz',
  'Dusty’s Dingleberries': 'Dustin',
  "Dusty's Dingleberries": 'Dustin',
  'Trenches cooper': 'Cooper',
  'Tess Finesse': 'Tess',
  "Blue's Balls": 'Jasper',
  'Blue’s Balls': 'Jasper'
};

// Canonical 2026 Team ID to Owner Mapping (League 501321)
export const Y2K_2026_TEAM_ID_OWNER_MAP = {
  1: 'Dylan',
  2: 'Phillip',
  3: 'Trace',
  4: 'Casey',
  5: 'Mike',
  6: 'Ryan',
  7: 'Boaz',
  8: 'Dustin',
  9: 'Tess',
  10: 'Jasper',
  11: 'Alex',
  12: 'Cooper'
};

export function resolveY2kOwner(teamId, teamName) {
  if (teamId && Y2K_2026_TEAM_ID_OWNER_MAP[teamId]) {
    const owner = Y2K_2026_TEAM_ID_OWNER_MAP[teamId];
    if (teamName && !Y2K_TEAM_OWNER_MAP[teamName]) {
      Y2K_TEAM_OWNER_MAP[teamName] = owner;
    }
    return owner;
  }
  if (teamName && Y2K_TEAM_OWNER_MAP[teamName]) {
    return Y2K_TEAM_OWNER_MAP[teamName];
  }
  return teamName;
}

export async function fetchWeekMatchups(leagueId, week) {
  const url = `https://football.fantasysports.yahoo.com/f1/${leagueId}?matchup_week=${week}&module=matchups&lhst=matchups`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const mwMatch = html.match(/<section[^>]*id="matchupweek"[^>]*>([\s\S]*?)<\/section>/i);
  const block = mwMatch ? mwMatch[1] : html;

  // Modern Yahoo matchup items: <li class='Linkable Listitem...' data-target='/f1/.../matchup?...'>
  const listItems = [...block.matchAll(/<li[^>]*class=['"][^'"]*Linkable Listitem[^'"]*['"][^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);

  const matchups = [];

  if (listItems.length > 0) {
    listItems.forEach((itemHtml, idx) => {
      const teams = [...itemHtml.matchAll(/<a class="F-link" href="https:\/\/football\.fantasysports\.yahoo\.com\/f1\/\d+\/(\d+)">([^<]+)<\/a>/g)].map(m => ({
        teamId: parseInt(m[1], 10),
        teamName: m[2].trim()
      }));

      // Scores are in <div class='Fz-lg ...'>XX.XX</div>
      const scores = [...itemHtml.matchAll(/<div class=['"]Fz-lg\s*[^'"]*['"]>([0-9.]+)<\/div>/gi)].map(m => parseFloat(m[1]));

      if (teams.length >= 2) {
        const s1 = scores[0] !== undefined ? scores[0] : 0.0;
        const s2 = scores[1] !== undefined ? scores[1] : 0.0;
        const o1 = resolveY2kOwner(teams[0].teamId, teams[0].teamName);
        const o2 = resolveY2kOwner(teams[1].teamId, teams[1].teamName);

        matchups.push({
          matchupId: idx + 1,
          week: week,
          weekNumber: week,
          seasonYear: 2026,
          year: 2026,
          team1: teams[0].teamName,
          homeTeam: teams[0].teamName,
          owner1: o1,
          homeOwner: o1,
          score1: s1,
          homeScore: s1,
          team2: teams[1].teamName,
          awayTeam: teams[1].teamName,
          owner2: o2,
          awayOwner: o2,
          score2: s2,
          awayScore: s2,
          winner: s1 > s2 ? o1 : (s2 > s1 ? o2 : (s1 > 0 && s2 > 0 ? 'Tie' : 'TBD')),
          margin: parseFloat(Math.abs(s1 - s2).toFixed(2)),
          isPlayoff: false,
          stage: 'Regular Season'
        });
      }
    });
  } else {
    // Fallback parser using team links
    const matches = [...block.matchAll(/<a class="F-link" href="https:\/\/football\.fantasysports\.yahoo\.com\/f1\/\d+\/(\d+)">([^<]+)<\/a>/g)];
    const unique = [];
    matches.forEach(m => {
      const t = { teamId: parseInt(m[1], 10), teamName: m[2].trim() };
      if (!unique.length || unique[unique.length - 1].teamId !== t.teamId) unique.push(t);
    });

    for (let i = 0; i < Math.min(12, unique.length); i += 2) {
      if (unique[i + 1]) {
        const o1 = resolveY2kOwner(unique[i].teamId, unique[i].teamName);
        const o2 = resolveY2kOwner(unique[i + 1].teamId, unique[i + 1].teamName);
        matchups.push({
          matchupId: (i / 2) + 1,
          week: week,
          weekNumber: week,
          seasonYear: 2026,
          year: 2026,
          team1: unique[i].teamName,
          homeTeam: unique[i].teamName,
          owner1: o1,
          homeOwner: o1,
          score1: 0.0,
          homeScore: 0.0,
          team2: unique[i + 1].teamName,
          awayTeam: unique[i + 1].teamName,
          owner2: o2,
          awayOwner: o2,
          score2: 0.0,
          awayScore: 0.0,
          winner: 'TBD',
          margin: 0.0,
          isPlayoff: false,
          stage: 'Regular Season'
        });
      }
    }
  }

  return matchups;
}

export async function syncYahooLeague(leagueId = '501321', totalWeeks = 14) {
  console.log(`\n===============================================================`);
  console.log(`🟣 Yahoo Direct Sync: Fetching Season 2026 Schedule (League ${leagueId})`);
  console.log(`===============================================================`);

  const allWeeksMatchups = [];
  const weeklyScoresMap = {}; // { week: [ { owner, team, score, oppOwner, oppScore, won } ] }

  for (let wk = 1; wk <= totalWeeks; wk++) {
    try {
      const wkMatchups = await fetchWeekMatchups(leagueId, wk);
      console.log(`• Week ${wk.toString().padStart(2, '0')}: Fetched ${wkMatchups.length} matchups.`);
      allWeeksMatchups.push(...wkMatchups);

      // Detect completed games in this week
      const completedThisWeek = wkMatchups.filter(m => m.homeScore > 0 || m.awayScore > 0);
      if (completedThisWeek.length > 0) {
        weeklyScoresMap[wk] = [];
        completedThisWeek.forEach(m => {
          weeklyScoresMap[wk].push(
            { owner: m.homeOwner, team: m.homeTeam, score: m.homeScore, oppOwner: m.awayOwner, oppScore: m.awayScore, won: m.homeScore > m.awayScore },
            { owner: m.awayOwner, team: m.awayTeam, score: m.awayScore, oppOwner: m.homeOwner, oppScore: m.homeScore, won: m.awayScore > m.homeScore }
          );
        });
      }
    } catch (err) {
      console.error(`❌ Error fetching Week ${wk}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total 2026 Matchups Fetched: ${allWeeksMatchups.length} games across ${totalWeeks} weeks.`);

  // Load leagueData.json
  const dataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(dataPath, 'utf8'));

  if (!leagueData.seasons.includes(2026)) {
    leagueData.seasons.push(2026);
    leagueData.seasons.sort((a, b) => a - b);
  }

  // Update 2026 seasonData
  if (!leagueData.seasonData['2026']) {
    leagueData.seasonData['2026'] = {
      settings: { seasonYear: 2026, teamCount: 12, playoffTeamCount: 6, firstWeek: 1, lastWeek: 17, regularSeasonWeeks: 14 },
      standings: [],
      preSeasonStandings: [],
      weeklyScores: [],
      statRecords: {
        highestScore: { owner: '-', team: '-', score: 0.0, week: 0 },
        lowestScore: { owner: '-', team: '-', score: 0.0, week: 0 },
        closestMargin: { winner: '-', loser: '-', margin: 0.0, scoreStr: '-' },
        biggestBlowout: { winner: '-', loser: '-', margin: 0.0, scoreStr: '-' }
      },
      playoffMatchups: [],
      draftPicks: []
    };
  }

  // Preserve preSeasonStandings if already populated in leagueData
  if (!leagueData.seasonData['2026'].preSeasonStandings && leagueData.seasonData['2026'].standings) {
    const isPreseason = leagueData.seasonData['2026'].standings.length > 0 && leagueData.seasonData['2026'].standings.every(s => (s.wins || 0) === 0 && (s.losses || 0) === 0);
    if (isPreseason) {
      leagueData.seasonData['2026'].preSeasonStandings = leagueData.seasonData['2026'].standings.map(s => ({
        rank: s.rank,
        ownerName: s.ownerName,
        teamName: s.teamName
      }));
    }
  }

  // Attach full schedule to 2026 (both schedule and schedule2026)
  const formattedSchedule = allWeeksMatchups.map(m => ({
    week: m.week,
    weekNumber: m.week,
    seasonYear: 2026,
    year: 2026,
    matchupId: m.matchupId,
    homeTeam: m.homeTeam,
    homeOwner: m.homeOwner,
    homeScore: m.homeScore,
    awayTeam: m.awayTeam,
    awayOwner: m.awayOwner,
    awayScore: m.awayScore,
    winner: m.winner,
    margin: m.margin,
    isPlayoff: false,
    stage: 'Regular Season'
  }));

  leagueData.seasonData['2026'].schedule = formattedSchedule;
  leagueData.seasonData['2026'].schedule2026 = formattedSchedule;

  // Update completed games in allMatchups
  let completedCount = 0;
  allWeeksMatchups.forEach(m => {
    if (m.homeScore > 0 || m.awayScore > 0) {
      completedCount++;
      const gameEntry = {
        seasonYear: 2026,
        year: 2026,
        weekNumber: m.week,
        week: m.week,
        homeTeam: m.homeTeam,
        homeOwner: m.homeOwner,
        homeScore: m.homeScore,
        awayTeam: m.awayTeam,
        awayOwner: m.awayOwner,
        awayScore: m.awayScore,
        winner: m.winner,
        margin: m.margin,
        isPlayoff: false,
        stage: 'Regular Season'
      };

      const existingIdx = leagueData.allMatchups.findIndex(
        gm => (gm.seasonYear === 2026 || gm.year === 2026) &&
              (gm.weekNumber === m.week || gm.week === m.week) &&
              gm.homeOwner === m.homeOwner &&
              gm.awayOwner === m.awayOwner
      );
      if (existingIdx >= 0) {
        leagueData.allMatchups[existingIdx] = gameEntry;
      } else {
        leagueData.allMatchups.push(gameEntry);
      }
    }
  });

  const completedWeeks = Object.keys(weeklyScoresMap).map(Number).sort((a, b) => a - b);

  if (completedWeeks.length === 0) {
    console.log('ℹ️ Pre-season / Week 0: No games completed yet. Standings cleanly default to 0-0.');
  } else {
    console.log(`📊 Processing completed games across ${completedWeeks.length} weeks...`);

    // Extract latest team name for each owner across all matchups
    const latestOwnerTeams = {};
    allWeeksMatchups.forEach(m => {
      if (m.homeOwner && m.homeTeam) latestOwnerTeams[m.homeOwner] = m.homeTeam;
      if (m.awayOwner && m.awayTeam) latestOwnerTeams[m.awayOwner] = m.awayTeam;
    });

    const managerStats = {};
    Object.entries(latestOwnerTeams).forEach(([owner, team]) => {
      managerStats[owner] = {
        seasonYear: 2026,
        ownerName: owner,
        teamName: team,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0.0,
        pointsAgainst: 0.0,
        form: [],
        expWins: 0,
        expLosses: 0,
        ovrWins: 0,
        ovrLosses: 0,
        weeklyWins: 0,
        wwDetails: [],
        luckiestWins: 0,
        lwDetails: [],
        heartbreaks: 0,
        hbDetails: [],
        toughestLosses: 0,
        tlDetails: [],
        dOhs: 0,
        dOhDetails: [],
        coachingEfficiency: null,
        optimalPointsFor: null,
        optimalPF: null
      };
    });

    // Stat records tracking
    let highestScore = { owner: '-', team: '-', score: 0.0, week: 0 };
    let lowestScore = { owner: '-', team: '-', score: 9999.0, week: 0 };
    let closestMargin = { winner: '-', loser: '-', margin: 9999.0, scoreStr: '-' };
    let biggestBlowout = { winner: '-', loser: '-', margin: 0.0, scoreStr: '-' };

    completedWeeks.forEach(wk => {
      const weekEntries = weeklyScoresMap[wk];
      const maxScore = Math.max(...weekEntries.map(e => e.score));
      const topScorers = weekEntries.filter(e => e.score === maxScore && e.score > 0);
      topScorers.forEach(ts => {
        if (managerStats[ts.owner]) {
          managerStats[ts.owner].weeklyWins += 1;
          managerStats[ts.owner].wwDetails.push({
            year: 2026,
            week: wk,
            score: ts.score,
            teamName: ts.team
          });
        }
      });

      weekEntries.forEach(entry => {
        const stat = managerStats[entry.owner];
        if (!stat) return;

        stat.pointsFor += entry.score;
        stat.pointsAgainst += entry.oppScore;

        if (entry.score > entry.oppScore) {
          stat.wins += 1;
          stat.form.push('W');
        } else if (entry.score < entry.oppScore) {
          stat.losses += 1;
          stat.form.push('L');
        } else {
          stat.ties += 1;
          stat.form.push('T');
        }

        // Check high/low score records
        if (entry.score > highestScore.score) {
          highestScore = { owner: entry.owner, team: entry.team, score: entry.score, week: wk };
        }
        if (entry.score < lowestScore.score) {
          lowestScore = { owner: entry.owner, team: entry.team, score: entry.score, week: wk };
        }

        // All-Play (OVR Record) against all opponents in the league that week
        weekEntries.forEach(opp => {
          if (opp.owner !== entry.owner) {
            if (entry.score > opp.score) stat.ovrWins += 1;
            else if (entry.score < opp.score) stat.ovrLosses += 1;
          }
        });
      });

      // Margin records from actual matchups of the week
      const wkMatchups = allWeeksMatchups.filter(m => m.week === wk && (m.homeScore > 0 || m.awayScore > 0));
      wkMatchups.forEach(m => {
        const winOwner = m.homeScore > m.awayScore ? m.homeOwner : m.awayOwner;
        const loseOwner = m.homeScore > m.awayScore ? m.awayOwner : m.homeOwner;
        const winScore = Math.max(m.homeScore, m.awayScore);
        const loseScore = Math.min(m.homeScore, m.awayScore);
        const mMargin = parseFloat(Math.abs(winScore - loseScore).toFixed(2));

        if (mMargin < closestMargin.margin) {
          closestMargin = {
            winner: winOwner,
            loser: loseOwner,
            margin: mMargin,
            scoreStr: `${winScore.toFixed(2)} - ${loseScore.toFixed(2)}`
          };
        }
        if (mMargin > biggestBlowout.margin) {
          biggestBlowout = {
            winner: winOwner,
            loser: loseOwner,
            margin: mMargin,
            scoreStr: `${winScore.toFixed(2)} - ${loseScore.toFixed(2)}`
          };
        }
      });

      const winners = weekEntries.filter(e => e.won);
      const losers = weekEntries.filter(e => !e.won && e.score < e.oppScore);

      // Luckiest Win: Lowest score among winning teams of the week
      if (winners.length > 0) {
        const minWinScore = Math.min(...winners.map(w => w.score));
        const lowestWinners = winners.filter(w => w.score === minWinScore);
        lowestWinners.forEach(lw => {
          const stat = managerStats[lw.owner];
          if (stat) {
            stat.luckiestWins += 1;
            stat.lwDetails.push({
              owner: lw.owner,
              team: lw.team,
              score: lw.score,
              oppOwner: lw.oppOwner,
              oppScore: lw.oppScore,
              margin: parseFloat(Math.abs(lw.score - lw.oppScore).toFixed(2)),
              year: 2026,
              week: wk
            });
          }
        });
      }

      // Heartbreak: Smallest margin of defeat among losing teams of the week (closest loss)
      if (losers.length > 0) {
        const minMargin = Math.min(...losers.map(l => Math.abs(l.oppScore - l.score)));
        const heartbreakLosers = losers.filter(l => Math.abs(Math.abs(l.oppScore - l.score) - minMargin) < 0.001);
        heartbreakLosers.forEach(hb => {
          const stat = managerStats[hb.owner];
          if (stat) {
            stat.heartbreaks += 1;
            stat.hbDetails.push({
              owner: hb.owner,
              team: hb.team,
              score: hb.score,
              oppOwner: hb.oppOwner,
              oppScore: hb.oppScore,
              margin: parseFloat(Math.abs(hb.oppScore - hb.score).toFixed(2)),
              year: 2026,
              week: wk
            });
          }
        });
      }

      // Toughest Loss: Highest score among losing teams of the week (best losing score)
      if (losers.length > 0) {
        const maxLossScore = Math.max(...losers.map(l => l.score));
        const toughestLosers = losers.filter(l => l.score === maxLossScore);
        toughestLosers.forEach(tl => {
          const stat = managerStats[tl.owner];
          if (stat) {
            stat.toughestLosses += 1;
            stat.tlDetails.push({
              owner: tl.owner,
              team: tl.team,
              score: tl.score,
              oppOwner: tl.oppOwner,
              oppScore: tl.oppScore,
              margin: parseFloat(Math.abs(tl.oppScore - tl.score).toFixed(2)),
              year: 2026,
              week: wk
            });
          }
        });
      }
    });

    // Compute Win Pct, Exp Record, and Standings Ranking
    const standingsList = Object.values(managerStats).map(st => {
      const totalGames = st.wins + st.losses + st.ties;
      const winPct = totalGames > 0 ? Math.round((st.wins / totalGames) * 1000) / 10 : 0.0;
      const ovrTotal = st.ovrWins + st.ovrLosses;
      const ovrWinPct = ovrTotal > 0 ? Math.round((st.ovrWins / ovrTotal) * 1000) / 10 : 0.0;

      const expWins = ovrTotal > 0 ? Math.round((st.ovrWins / (ovrTotal / totalGames))) : 0;
      const expLosses = totalGames - expWins;
      const luckVal = st.wins - expWins;

      return {
        ...st,
        winPct,
        pointsFor: parseFloat(st.pointsFor.toFixed(2)),
        pointsAgainst: parseFloat(st.pointsAgainst.toFixed(2)),
        expWins,
        expLosses,
        expRecord: `${expWins}-${expLosses}`,
        luck: luckVal,
        ovrWinPct,
        ovrRecord: `${st.ovrWins}-${st.ovrLosses}`,
        form: st.form.slice(-5)
      };
    });

    // Sort by wins -> pointsFor
    standingsList.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor);
    standingsList.forEach((st, idx) => st.rank = idx + 1);

    // Preserve existing managerial metrics (coachingEfficiency, optimalPF, dOhs)
    const existingStandingsMap = {};
    (leagueData.seasonData['2026']?.standings || []).forEach(st => {
      existingStandingsMap[st.ownerName] = st;
    });

    standingsList.forEach(st => {
      const prev = existingStandingsMap[st.ownerName];
      if (prev) {
        if (prev.coachingEfficiency !== undefined && prev.coachingEfficiency !== null) st.coachingEfficiency = prev.coachingEfficiency;
        if (prev.optimalPF !== undefined && prev.optimalPF !== null) st.optimalPF = prev.optimalPF;
        if (prev.optimalPointsFor !== undefined && prev.optimalPointsFor !== null) st.optimalPointsFor = prev.optimalPointsFor;
        if (prev.dOhs !== undefined && prev.dOhs !== null) st.dOhs = prev.dOhs;
        if (prev.dOhCount !== undefined && prev.dOhCount !== null) st.dOhCount = prev.dOhCount;
        if (prev.dOhDetails !== undefined && prev.dOhDetails !== null) st.dOhDetails = prev.dOhDetails;
      }
    });

    leagueData.seasonData['2026'].standings = standingsList;
    leagueData.seasonData['2026'].statRecords = {
      highestScore,
      lowestScore: lowestScore.score === 9999.0 ? { owner: '-', team: '-', score: 0.0, week: 0 } : lowestScore,
      closestMargin: closestMargin.margin === 9999.0 ? { winner: '-', loser: '-', margin: 0.0, scoreStr: '-' } : closestMargin,
      biggestBlowout
    };

    // Update allTimeStandings with current 2026 team names
    if (leagueData.allTimeStandings && Array.isArray(leagueData.allTimeStandings)) {
      leagueData.allTimeStandings.forEach(st => {
        const cur = standingsList.find(s => s.ownerName === st.ownerName);
        if (cur && cur.teamName) {
          st.teamName = cur.teamName;
        }
      });
    }

    // Synchronize leagueData.teams for 2026
    if (leagueData.teams && Array.isArray(leagueData.teams)) {
      standingsList.forEach(st => {
        const existingTeamEntry = leagueData.teams.find(t => t.ownerName === st.ownerName && t.teamName === st.teamName);
        if (existingTeamEntry) {
          if (!existingTeamEntry.seasonsActive.includes(2026)) {
            existingTeamEntry.seasonsActive.push(2026);
            existingTeamEntry.seasonsActive.sort((a, b) => a - b);
            existingTeamEntry.totalSeasons = existingTeamEntry.seasonsActive.length;
          }
        } else {
          // If the owner had an obsolete 2026 tag on a previous team name, remove 2026 from that obsolete entry
          const obsolete2026 = leagueData.teams.find(t => t.ownerName === st.ownerName && t.seasonsActive.includes(2026));
          if (obsolete2026 && obsolete2026.teamName !== st.teamName) {
            obsolete2026.seasonsActive = obsolete2026.seasonsActive.filter(y => y !== 2026);
            obsolete2026.totalSeasons = obsolete2026.seasonsActive.length;
          }
          leagueData.teams.push({
            ownerName: st.ownerName,
            teamName: st.teamName,
            platformOwnerId: '',
            teamGroupId: '',
            seasonsActive: [2026],
            totalSeasons: 1
          });
        }
      });
      // Filter out any entries that ended up with 0 active seasons
      leagueData.teams = leagueData.teams.filter(t => t.seasonsActive.length > 0);
    }
  }

  writeFileSync(dataPath, JSON.stringify(leagueData, null, 2), 'utf8');
  console.log(`🎉 Successfully saved 2026 schedule (${allWeeksMatchups.length} matchups, ${completedCount} completed) to public/data/leagueData.json!`);
}

// Run if called directly
if (process.argv[1]?.endsWith('sync_yahoo_direct.js')) {
  syncYahooLeague('501321', 14);
}
