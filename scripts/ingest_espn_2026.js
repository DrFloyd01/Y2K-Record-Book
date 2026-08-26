#!/usr/bin/env node

/**
 * Script to Ingest Official 2026 ESPN Draft Results & Schedule for Pride Guys
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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

async function ingestEspn2026() {
  const leagueId = process.env.ESPN_LEAGUE_ID || '1629523';
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;

  if (!s2 || !swid) {
    console.error('❌ Missing ESPN_S2 or ESPN_SWID cookies in .env');
    process.exit(1);
  }

  const headers = {
    'Cookie': `espn_s2=${s2}; SWID=${swid};`,
    'Accept': 'application/json'
  };

  console.log(`📡 Fetching 2026 data from ESPN API (League: ${leagueId})...`);
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=mRoster&view=mMatchupScore&view=mDraftDetail`;
  const res = await fetch(url, { headers });

  if (res.status !== 200) {
    console.error(`❌ ESPN API responded with HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ Received ESPN payload: ${data.teams?.length || 0} teams, ${data.draftDetail?.picks?.length || 0} draft picks.`);

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
    const ownerId = t.owners ? t.owners[0] : null;
    const ownerName = memberMap[ownerId] || t.primaryOwner || 'Unknown';
    const teamName = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
    teamMap[t.id] = {
      teamId: t.id,
      teamName: teamName,
      ownerName: ownerName,
      divisionId: t.divisionId
    };
  });

  // 3. Process Draft Picks
  const rawPicks = data.draftDetail?.picks || [];
  const processedDraftPicks = rawPicks.map(p => {
    const playerInfo = playerMap[p.playerId] || { fullName: `Player #${p.playerId}`, pos: 'FLEX', proTeam: 'NFL' };
    const teamInfo = teamMap[p.teamId] || { teamName: `Team ${p.teamId}`, ownerName: 'Unknown' };

    return {
      seasonYear: 2026,
      round: p.roundId,
      pick: p.overallPickNumber,
      overallPick: p.overallPickNumber,
      pickInRound: p.roundPickNumber,
      ownerName: teamInfo.ownerName,
      teamName: teamInfo.teamName,
      player: playerInfo.fullName,
      playerName: playerInfo.fullName,
      position: playerInfo.pos,
      proTeam: playerInfo.proTeam
    };
  });

  console.log(`✅ Processed ${processedDraftPicks.length} official draft picks.`);

  // 4. Process Schedule
  const rawSchedule = data.schedule || [];
  const schedule2026 = [];
  rawSchedule.forEach(m => {
    if (m.matchupPeriodId && m.matchupPeriodId <= 14) {
      const homeTeamInfo = teamMap[m.home?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };
      const awayTeamInfo = teamMap[m.away?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };

      schedule2026.push({
        week: m.matchupPeriodId,
        matchupId: m.id,
        homeTeam: homeTeamInfo.teamName,
        homeOwner: homeTeamInfo.ownerName,
        homeScore: m.home?.totalPoints || 0.0,
        awayTeam: awayTeamInfo.teamName,
        awayOwner: awayTeamInfo.ownerName,
        awayScore: m.away?.totalPoints || 0.0,
        winner: 'TBD',
        margin: 0.0,
        isPlayoff: false
      });
    }
  });

  console.log(`✅ Processed ${schedule2026.length} regular season matchups.`);

  // 5. Initialize 2026 Standings (Clean 0-0 pre-season state)
  const standings2026 = data.teams.map((t, idx) => {
    const tInfo = teamMap[t.id];
    return {
      rank: idx + 1,
      ownerName: tInfo.ownerName,
      teamName: tInfo.teamName,
      wins: 0,
      losses: 0,
      ties: 0,
      winPct: 0.0,
      pointsFor: 0.0,
      pointsAgainst: 0.0,
      form: [],
      expWins: 0,
      expLosses: 0,
      expRecord: '0-0',
      luck: 0,
      ovrWins: 0,
      ovrLosses: 0,
      ovrRecord: '0-0',
      ovrWinPct: 0.0,
      weeklyWins: 0,
      wwDetails: [],
      luckiestWins: 0,
      lwDetails: [],
      heartbreaks: 0,
      hbDetails: [],
      toughestLosses: 0,
      tlDetails: [],
      playoffWins: 0,
      playoffLosses: 0,
      playoffRecord: '0-0',
      playoffWinPct: 0.0
    };
  });

  // 6. Build 2026 Draft Order (Round 1 picks)
  const draftOrder2026 = processedDraftPicks.slice(0, 12).map((p, idx) => {
    return {
      pick: p.overallPick,
      ownerName: p.ownerName,
      teamName: p.teamName,
      prevRank: 0,
      prevRecord: '0-0',
      curRank: idx + 1,
      curRecord: '0-0',
      curPF: 0.0,
      movement: 0
    };
  });

  // 7. Update prideGuysData.json
  const dataPath = resolve(process.cwd(), 'public/data/prideGuysData.json');
  const prideData = JSON.parse(readFileSync(dataPath, 'utf8'));

  if (!prideData.seasons.includes(2026)) {
    prideData.seasons.push(2026);
    prideData.seasons.sort((a, b) => a - b);
  }

  prideData.seasonData['2026'] = {
    settings: {
      seasonYear: 2026,
      teamCount: data.teams.length,
      playoffTeamCount: data.settings?.scheduleSettings?.playoffTeamCount || 6,
      firstWeek: 1,
      lastWeek: 17,
      regularSeasonWeeks: 14,
      scoringType: 'Half PPR (0.5 PPR)',
      usesFaab: 'True',
      faabBudget: '100'
    },
    standings: standings2026,
    weeklyScores: [],
    weeklyStandings: {},
    schedule: schedule2026,
    playoffMatchups: [],
    scoringChampion: {
      owner: '-',
      team: '-',
      pointsFor: 0.0
    },
    draftPicks: processedDraftPicks
  };

  if (!prideData.draftOrders) {
    prideData.draftOrders = {};
  }
  prideData.draftOrders['2026'] = draftOrder2026;

  // Update allTimeStandings latest team names
  data.teams.forEach(t => {
    const tInfo = teamMap[t.id];
    const standing = prideData.allTimeStandings.find(s => s.ownerName === tInfo.ownerName);
    if (standing) {
      standing.teamName = tInfo.teamName;
    }
  });

  writeFileSync(dataPath, JSON.stringify(prideData, null, 2), 'utf8');
  console.log('🎉 Successfully written official 2026 data to public/data/prideGuysData.json!');
}

ingestEspn2026();
