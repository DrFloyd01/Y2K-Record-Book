#!/usr/bin/env node

/**
 * Historical ESPN Season Ingestion Script for Pride Guys
 *
 * Ingests full box scores, weekly schedule, standings, advanced luck & badge metrics,
 * playoff brackets, and draft picks for historical ESPN seasons (e.g. 2020).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env if present
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && v.length > 0) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[k.trim()]) {
            process.env[k.trim()] = val;
          }
        }
      }
    });
  }
}

loadEnv();

const POS_MAP = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST'
};

const PRO_TEAM_MAP = {
  0: 'FA',
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
  9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
  17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
  25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WSH', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU'
};

const CANONICAL_OWNER_MAP = {
  'Trace Bakulich': 'Trace Bakulich',
  'Michael Anderson': 'Michael Anderson',
  'Nathan Wells': 'Nathan Wells',
  'Andrew Wilson': 'Andrew Wilson',
  'tyler hicks': 'Tyler Hicks',
  'Tyler Hicks': 'Tyler Hicks',
  'Dylan Soth': 'Dylan Soth',
  "Aidan O'Sullivan": "Aidan O'Sullivan",
  'Austin Geller': 'Austin Geller',
  'Phillip Busick': 'Phillip Busick',
  'sean belcher': 'Sean Belcher',
  'Sean Belcher': 'Sean Belcher',
  'Brendan Sanders': 'Brendan Sanders',
  'Brodie Pirtle': 'Brodie Pirtle'
};

async function fetchEspnSeasonData(seasonYear, leagueId, s2, swid) {
  const headers = {
    'Cookie': `espn_s2=${s2}; SWID=${swid};`,
    'Accept': 'application/json'
  };

  const views = 'view=mSettings&view=mTeam&view=mMatchupScore&view=mStandings&view=mRoster&view=mDraftDetail';
  const urls = [
    `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?seasonId=${seasonYear}&${views}`,
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?seasonId=${seasonYear}&${views}`,
    `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}?${views}`,
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}?${views}`
  ];

  for (const url of urls) {
    try {
      console.log(`🔍 Trying: ${url.split('?')[0]}?seasonId=${seasonYear}...`);
      const res = await fetch(url, { headers });
      console.log(`   HTTP Status: ${res.status} ${res.statusText}`);

      if (res.ok) {
        let json = await res.json();
        if (Array.isArray(json)) {
          console.log(`   Received array payload of ${json.length} seasons.`);
          const seasonMatch = json.find(s => s.seasonId === seasonYear) || json[0];
          return seasonMatch;
        }
        return json;
      }
    } catch (e) {
      console.warn(`   Fetch failed: ${e.message}`);
    }
  }

  return null;
}

async function ingestHistoricalSeason(seasonYear, leagueId, s2, swid, prideData) {
  console.log(`\n======================================================`);
  console.log(`📡 Ingesting Pride Guys ESPN Data for Season ${seasonYear} (League: ${leagueId})...`);
  console.log(`======================================================`);

  const data = await fetchEspnSeasonData(seasonYear, leagueId, s2, swid);
  if (!data) {
    console.error(`❌ Could not fetch data from ESPN for Season ${seasonYear}`);
    return false;
  }

  console.log(`✅ Received ESPN payload for ${seasonYear}: ${data.teams?.length || 0} teams, ${data.schedule?.length || 0} matchups.`);

  // 1. Build Player Map from Rosters
  const playerMap = {};
  data.teams?.forEach(t => {
    t.roster?.entries?.forEach(e => {
      const p = e.playerPoolEntry?.player;
      if (p) {
        playerMap[p.id] = {
          fullName: p.fullName,
          pos: POS_MAP[p.defaultPositionId] || 'FLEX',
          proTeam: PRO_TEAM_MAP[p.proTeamId] || 'NFL'
        };
      }
    });
  });

  // 2. Build Member & Team Maps
  const memberMap = {};
  data.members?.forEach(m => {
    const rawName = `${m.firstName} ${m.lastName}`.trim();
    memberMap[m.id] = CANONICAL_OWNER_MAP[rawName] || rawName;
  });

  const teamMap = {};
  data.teams?.forEach(t => {
    const ownerId = t.owners ? t.owners[0] : (t.primaryOwner || null);
    const ownerName = memberMap[ownerId] || t.primaryOwner || 'Unknown';
    const teamName = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
    teamMap[t.id] = {
      teamId: t.id,
      teamName: teamName,
      ownerName: ownerName
    };
  });

  // 3. Parse Regular Season and Playoff Schedule
  const regularWeeks = data.settings?.scheduleSettings?.matchupPeriodCount || (seasonYear >= 2021 ? 14 : 13);
  const rawSchedule = data.schedule || [];
  const updatedSchedule = [];
  const weeklyScoresMap = {};
  const playoffMatchups = [];

  rawSchedule.forEach(m => {
    const week = m.matchupPeriodId;
    const homeInfo = teamMap[m.home?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };
    const awayInfo = teamMap[m.away?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };
    const hScore = m.home?.totalPoints || 0.0;
    const aScore = m.away?.totalPoints || 0.0;

    let winner = 'Tie';
    if (hScore > aScore) winner = homeInfo.ownerName;
    else if (aScore > hScore) winner = awayInfo.ownerName;

    const margin = parseFloat(Math.abs(hScore - aScore).toFixed(2));
    const isPlayoff = week > regularWeeks;

    const matchupObj = {
      week: week,
      matchupId: m.id,
      homeTeam: homeInfo.teamName,
      homeOwner: homeInfo.ownerName,
      homeScore: hScore,
      awayTeam: awayInfo.teamName,
      awayOwner: awayInfo.ownerName,
      awayScore: aScore,
      winner: winner,
      margin: margin,
      isPlayoff: isPlayoff
    };

    if (isPlayoff) {
      playoffMatchups.push({
        week: week,
        stage: week === regularWeeks + 2 ? 'Championship' : 'Playoffs Round 1',
        team1Owner: homeInfo.ownerName,
        team1Score: hScore,
        team2Owner: awayInfo.ownerName,
        team2Score: aScore,
        winner: winner,
        margin: margin
      });
    } else {
      updatedSchedule.push(matchupObj);

      if (hScore > 0 || aScore > 0) {
        if (!weeklyScoresMap[week]) weeklyScoresMap[week] = [];
        weeklyScoresMap[week].push(
          { owner: homeInfo.ownerName, team: homeInfo.teamName, score: hScore, oppOwner: awayInfo.ownerName, oppScore: aScore, won: hScore > aScore },
          { owner: awayInfo.ownerName, team: awayInfo.teamName, score: aScore, oppOwner: homeInfo.ownerName, oppScore: hScore, won: aScore > hScore }
        );
      }
    }
  });

  // 4. Compute Standings & Luck Metrics
  const managerStats = {};
  data.teams?.forEach(t => {
    const tInfo = teamMap[t.id];
    managerStats[tInfo.ownerName] = {
      ownerName: tInfo.ownerName,
      teamName: tInfo.teamName,
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
      tlDetails: []
    };
  });

  const completedWeeks = Object.keys(weeklyScoresMap).map(Number).sort((a, b) => a - b);
  completedWeeks.forEach(wk => {
    const weekEntries = weeklyScoresMap[wk];
    const maxScore = Math.max(...weekEntries.map(e => e.score));
    const topScorers = weekEntries.filter(e => e.score === maxScore && e.score > 0);
    topScorers.forEach(ts => {
      if (managerStats[ts.owner]) {
        managerStats[ts.owner].weeklyWins += 1;
        managerStats[ts.owner].wwDetails.push({
          year: seasonYear,
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

      weekEntries.forEach(opp => {
        if (opp.owner !== entry.owner) {
          if (entry.score > opp.score) stat.ovrWins += 1;
          else if (entry.score < opp.score) stat.ovrLosses += 1;
        }
      });
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
            year: seasonYear,
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
            year: seasonYear,
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
            year: seasonYear,
            week: wk
          });
        }
      });
    }
  });

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

  standingsList.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor);
  standingsList.forEach((st, idx) => st.rank = idx + 1);

  // 5. Parse Draft Picks
  const draftPicks = [];
  data.draftDetail?.picks?.forEach(p => {
    const pInfo = playerMap[p.playerId] || { fullName: `Player ${p.playerId}`, pos: 'FLEX', proTeam: 'NFL' };
    const teamObj = teamMap[p.teamId] || { teamName: 'Unknown', ownerName: 'Unknown' };

    draftPicks.push({
      overall: p.overallPickNumber,
      round: p.roundId,
      pickInRound: p.roundPickNumber,
      player: pInfo.fullName,
      position: pInfo.pos,
      nflTeam: pInfo.proTeam,
      team: teamObj.teamName,
      owner: teamObj.ownerName,
      year: seasonYear,
      isKeeper: p.keeper || false,
      bidAmount: p.bidAmount || 0
    });
  });

  // 6. Update prideData
  if (!prideData.seasonData[seasonYear.toString()]) {
    prideData.seasonData[seasonYear.toString()] = {
      settings: {
        leagueName: data.settings?.name || 'Pride Guys',
        teams: data.teams?.length || 8,
        regularSeasonWeeks: regularWeeks,
        playoffTeams: 4
      }
    };
  }

  const sObj = prideData.seasonData[seasonYear.toString()];
  sObj.standings = standingsList;
  sObj.schedule = updatedSchedule;
  if (playoffMatchups.length > 0) {
    sObj.playoffMatchups = playoffMatchups;
  }
  if (draftPicks.length > 0) {
    sObj.draftPicks = draftPicks;
  }

  console.log(`✅ Season ${seasonYear} successfully processed: ${standingsList.length} teams in standings, ${updatedSchedule.length} regular season matchups, ${playoffMatchups.length} playoff matchups, ${draftPicks.length} draft picks.`);
  return true;
}

async function main() {
  const leagueId = process.env.ESPN_LEAGUE_ID || '1629523';
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;

  if (!s2 || !swid) {
    console.error('❌ Missing ESPN_S2 or ESPN_SWID credentials.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const seasonArgIdx = args.indexOf('--season');
  const targetYear = seasonArgIdx !== -1 ? parseInt(args[seasonArgIdx + 1], 10) : 2020;

  const dataPath = resolve(process.cwd(), 'public/data/prideGuysData.json');
  const prideData = JSON.parse(readFileSync(dataPath, 'utf8'));

  if (args.includes('--all')) {
    const seasonsToBackfill = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    for (const yr of seasonsToBackfill) {
      await ingestHistoricalSeason(yr, leagueId, s2, swid, prideData);
    }
  } else {
    await ingestHistoricalSeason(targetYear, leagueId, s2, swid, prideData);
  }

  writeFileSync(dataPath, JSON.stringify(prideData, null, 2), 'utf8');
  console.log('\n🎉 Finished! public/data/prideGuysData.json has been written.');
}

main().catch(err => {
  console.error('❌ Ingestion Error:', err);
  process.exit(1);
});
