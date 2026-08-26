#!/usr/bin/env node

/**
 * ESPN Automated Historical Lineup & D'Oh Engine for Pride Guys
 *
 * Ingests weekly starter vs bench rosters, player fantasy points,
 * optimal Best Ball lineups, Coaching Efficiency %, and D'Oh! blunder moments
 * for seasons with available ESPN boxscore archives (2022, 2023, 2024, 2025, 2026).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { computeOptimalLineup, analyzeDOhMoment } from '../src/analytics/managerial.js';

// Load .env
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
  16: 'DEF'
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

function getSlotName(slotId) {
  switch (slotId) {
    case 0: return 'QB';
    case 2: return 'RB';
    case 4: return 'WR';
    case 6: return 'TE';
    case 16: return 'DEF';
    case 17: return 'K';
    case 23: return 'FLEX';
    case 20: return 'BN';
    case 21: return 'IR';
    default: return 'BN';
  }
}

async function ingestSeasonLineups(seasonYear, leagueId, s2, swid) {
  console.log(`\n======================================================`);
  console.log(`📡 Ingesting Pride Guys Lineups for Season ${seasonYear}...`);
  console.log(`======================================================`);

  const headers = {
    'Cookie': `espn_s2=${s2}; SWID=${swid};`,
    'Accept': 'application/json'
  };

  const totalWeeks = seasonYear >= 2021 ? 17 : 16;
  const harvestedMatchups = [];

  // 1. Fetch team members map
  const metaUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}?view=mTeam&view=mSettings`;
  const metaRes = await fetch(metaUrl, { headers });
  if (!metaRes.ok) {
    console.warn(`⚠️ Could not fetch metadata for Season ${seasonYear} (${metaRes.status})`);
    return [];
  }

  const metaData = await metaRes.json();
  const memberMap = {};
  metaData.members?.forEach(m => {
    const rawName = `${m.firstName} ${m.lastName}`.trim();
    memberMap[m.id] = CANONICAL_OWNER_MAP[rawName] || rawName;
  });

  const teamMap = {};
  metaData.teams?.forEach(t => {
    const ownerId = t.owners ? t.owners[0] : (t.primaryOwner || null);
    const ownerName = memberMap[ownerId] || t.primaryOwner || 'Unknown';
    const teamName = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
    teamMap[t.id] = { teamId: t.id, teamName, ownerName };
  });

  // Constraints: Pride Guys standard roster
  const rosterConstraints = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 2,
    DEF: 1,
    K: 0
  };

  for (let wk = 1; wk <= totalWeeks; wk++) {
    const boxUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}?scoringPeriodId=${wk}&view=mBoxscore&view=mMatchup`;
    const res = await fetch(boxUrl, { headers });
    if (!res.ok) continue;

    const data = await res.json();
    const weekSchedule = data.schedule?.filter(m => m.matchupPeriodId === wk) || [];

    weekSchedule.forEach(m => {
      if (!m.home || !m.away) return;

      function parseEspnRoster(teamSide) {
        const teamObj = teamMap[teamSide.teamId] || { teamName: `Team ${teamSide.teamId}`, ownerName: 'Unknown' };
        const rawEntries = teamSide.rosterForCurrentScoringPeriod?.entries || [];

        const players = rawEntries.map(e => {
          const p = e.playerPoolEntry?.player;
          const slot = getSlotName(e.lineupSlotId);
          const isBench = slot === 'BN' || slot === 'IR';
          const pos = POS_MAP[p?.defaultPositionId] || slot;
          const pts = parseFloat((e.playerPoolEntry?.appliedStatTotal || 0.0).toFixed(2));

          return {
            slot,
            player: p?.fullName || 'Unknown Player',
            playerName: p?.fullName || 'Unknown Player',
            position: pos,
            nflTeam: PRO_TEAM_MAP[p?.proTeamId] || 'NFL',
            points: pts,
            isBench
          };
        });

        const starters = players.filter(p => !p.isBench);
        const bench = players.filter(p => p.isBench);

        const optimal = computeOptimalLineup(players, rosterConstraints);
        const actualScore = parseFloat(starters.reduce((sum, p) => sum + p.points, 0).toFixed(2));

        return {
          teamName: teamObj.teamName,
          ownerName: teamObj.ownerName,
          seasonYear,
          week: wk,
          actualScore,
          optimalScore: optimal.optimalScore,
          coachingEfficiency: optimal.coachingEfficiency,
          pointsLeftOnBench: optimal.pointsLeftOnBench,
          starters,
          bench
        };
      }

      const team1 = parseEspnRoster(m.home);
      const team2 = parseEspnRoster(m.away);

      if (team1.starters.length === 0 && team2.starters.length === 0) return;

      team1.isWin = team1.actualScore > team2.actualScore;
      team1.isLoss = team1.actualScore < team2.actualScore;
      team2.isWin = team2.actualScore > team1.actualScore;
      team2.isLoss = team2.actualScore < team1.actualScore;

      if (team1.isLoss) {
        const dOh = analyzeDOhMoment(team1.starters, team1.bench, team2.actualScore, team1.actualScore, rosterConstraints);
        team1.dOhOccurred = dOh.dOhOccurred;
        team1.dOhDetails = dOh.bestSwap;
      }
      if (team2.isLoss) {
        const dOh = analyzeDOhMoment(team2.starters, team2.bench, team1.actualScore, team2.actualScore, rosterConstraints);
        team2.dOhOccurred = dOh.dOhOccurred;
        team2.dOhDetails = dOh.bestSwap;
      }

      harvestedMatchups.push({
        seasonYear,
        week: wk,
        homeTeam: team1,
        awayTeam: team2,
        margin: parseFloat(Math.abs(team1.actualScore - team2.actualScore).toFixed(2))
      });
    });
  }

  console.log(`✅ Season ${seasonYear}: Extracted ${harvestedMatchups.length} matchups with starter vs bench player scores.`);
  return harvestedMatchups;
}

async function main() {
  const leagueId = process.env.ESPN_LEAGUE_ID || '1629523';
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;

  if (!s2 || !swid) {
    console.error('❌ Missing ESPN_S2 or ESPN_SWID credentials.');
    process.exit(1);
  }

  const outputDir = resolve(process.cwd(), 'public/data/lineups');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const allLineups = {};
  const availableSeasons = [2025, 2024, 2023, 2022];

  for (const yr of availableSeasons) {
    const seasonMatchups = await ingestSeasonLineups(yr, leagueId, s2, swid);
    if (seasonMatchups.length > 0) {
      allLineups[yr.toString()] = seasonMatchups;
    }
  }

  const lineupsPath = resolve(outputDir, 'pride_guys_lineups.json');
  writeFileSync(lineupsPath, JSON.stringify(allLineups, null, 2), 'utf8');
  console.log(`\n🎉 Pride Guys lineups written to: ${lineupsPath}`);

  // Now update prideGuysData.json with authentic Coaching Efficiency % and D'Oh counts!
  const prideDataPath = resolve(process.cwd(), 'public/data/prideGuysData.json');
  const prideData = JSON.parse(readFileSync(prideDataPath, 'utf8'));

  for (const [yrStr, matchups] of Object.entries(allLineups)) {
    const yr = parseInt(yrStr, 10);
    const sObj = prideData.seasonData[yrStr];
    if (!sObj || !sObj.standings) continue;

    const managerLineupStats = {};
    matchups.forEach(m => {
      [m.homeTeam, m.awayTeam].forEach(t => {
        if (!t || !t.ownerName) return;
        if (!managerLineupStats[t.ownerName]) {
          managerLineupStats[t.ownerName] = {
            totalActual: 0,
            totalOptimal: 0,
            dOhs: 0,
            dOhGameLogs: []
          };
        }
        managerLineupStats[t.ownerName].totalActual += (t.actualScore || 0);
        managerLineupStats[t.ownerName].totalOptimal += (t.optimalScore || 0);
        if (t.dOhOccurred) {
          managerLineupStats[t.ownerName].dOhs += 1;
          if (t.dOhDetails) {
            managerLineupStats[t.ownerName].dOhGameLogs.push({
              year: yr,
              week: t.week,
              team: t.teamName,
              ...t.dOhDetails
            });
          }
        }
      });
    });

    sObj.standings.forEach(st => {
      const lStat = managerLineupStats[st.ownerName];
      if (lStat && lStat.totalOptimal > 0) {
        st.coachingEfficiency = parseFloat((lStat.totalActual / lStat.totalOptimal * 100).toFixed(1));
        st.dOhs = lStat.dOhs;
        st.dOhDetails = lStat.dOhGameLogs;
      }
    });
  }

  writeFileSync(prideDataPath, JSON.stringify(prideData, null, 2), 'utf8');
  console.log(`🎉 public/data/prideGuysData.json successfully updated with authentic Coaching Efficiency & D'Oh badges!`);
}

main().catch(err => {
  console.error('❌ Lineup Ingestion Error:', err);
  process.exit(1);
});
