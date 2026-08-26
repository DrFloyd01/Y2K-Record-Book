#!/usr/bin/env node

/**
 * Direct Zero-Auth Yahoo Fantasy Football Sync Engine
 *
 * Automatically fetches matchups, scores, and schedules directly from Yahoo's
 * public web endpoints without requiring Developer API tokens or session cookies.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Canonical Y2K Team to Owner Mapping
const Y2K_TEAM_OWNER_MAP = {
  'Globo Gym': 'Dylan',
  'Ho Chi Win City': 'Phillip',
  'Jelqaida': 'Mike',
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
  'Blue’s Balls': 'Jasper',
  'The Dawn of Man-Ape': 'Dylan',
  'TDS': 'Phillip'
};

async function fetchWeekMatchups(leagueId, week) {
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

  // Extract matchup sub-modules / pairs
  const subModules = [...block.matchAll(/<li[^>]*class="[^"]*matchup-sub-module[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);

  const matchups = [];

  if (subModules.length > 0) {
    subModules.forEach((sm, idx) => {
      const teams = [...sm.matchAll(/<a class="F-link" href="https:\/\/football\.fantasysports\.yahoo\.com\/f1\/\d+\/(\d+)">([^<]+)<\/a>/g)].map(m => ({
        teamId: parseInt(m[1], 10),
        teamName: m[2].trim()
      }));

      const scores = [...sm.matchAll(/<span[^>]*class="[^"]*score[^"]*"[^>]*>([0-9.]+)<\/span>/gi)].map(m => parseFloat(m[1]));

      if (teams.length >= 2) {
        const s1 = scores[0] || 0.0;
        const s2 = scores[1] || 0.0;
        matchups.push({
          matchupId: idx + 1,
          week: week,
          team1: teams[0].teamName,
          owner1: Y2K_TEAM_OWNER_MAP[teams[0].teamName] || teams[0].teamName,
          score1: s1,
          team2: teams[1].teamName,
          owner2: Y2K_TEAM_OWNER_MAP[teams[1].teamName] || teams[1].teamName,
          score2: s2,
          winner: s1 > s2 ? (Y2K_TEAM_OWNER_MAP[teams[0].teamName] || teams[0].teamName) : (s2 > s1 ? (Y2K_TEAM_OWNER_MAP[teams[1].teamName] || teams[1].teamName) : (s1 > 0 && s2 > 0 ? 'Tie' : 'TBD')),
          margin: parseFloat(Math.abs(s1 - s2).toFixed(2))
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
        matchups.push({
          matchupId: (i / 2) + 1,
          week: week,
          team1: unique[i].teamName,
          owner1: Y2K_TEAM_OWNER_MAP[unique[i].teamName] || unique[i].teamName,
          score1: 0.0,
          team2: unique[i + 1].teamName,
          owner2: Y2K_TEAM_OWNER_MAP[unique[i + 1].teamName] || unique[i + 1].teamName,
          score2: 0.0,
          winner: 'TBD',
          margin: 0.0
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
  for (let wk = 1; wk <= totalWeeks; wk++) {
    try {
      const wkMatchups = await fetchWeekMatchups(leagueId, wk);
      console.log(`• Week ${wk.toString().padStart(2, '0')}: Fetched ${wkMatchups.length} matchups.`);
      allWeeksMatchups.push(...wkMatchups);
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

  // Attach full schedule to 2026
  leagueData.seasonData['2026'].schedule = allWeeksMatchups.map(m => ({
    week: m.week,
    matchupId: m.matchupId,
    homeTeam: m.team1,
    homeOwner: m.owner1,
    homeScore: m.score1,
    awayTeam: m.team2,
    awayOwner: m.owner2,
    awayScore: m.score2,
    winner: m.winner,
    margin: m.margin,
    isPlayoff: false
  }));

  // Update completed games in allMatchups
  let completedCount = 0;
  allWeeksMatchups.forEach(m => {
    if (m.score1 > 0 || m.score2 > 0) {
      completedCount++;
      const gameEntry = {
        year: 2026,
        week: m.week,
        homeTeam: m.team1,
        homeOwner: m.owner1,
        homeScore: m.score1,
        awayTeam: m.team2,
        awayOwner: m.owner2,
        awayScore: m.score2,
        winner: m.winner,
        margin: m.margin,
        isPlayoff: false
      };

      const existingIdx = leagueData.allMatchups.findIndex(gm => gm.year === 2026 && gm.week === m.week && gm.homeTeam === m.team1 && gm.awayTeam === m.team2);
      if (existingIdx >= 0) {
        leagueData.allMatchups[existingIdx] = gameEntry;
      } else {
        leagueData.allMatchups.push(gameEntry);
      }
    }
  });

  writeFileSync(dataPath, JSON.stringify(leagueData, null, 2), 'utf8');
  console.log(`🎉 Successfully saved 2026 schedule (${allWeeksMatchups.length} matchups, ${completedCount} completed) to public/data/leagueData.json!`);
}

// Run if called directly
if (process.argv[1]?.endsWith('sync_yahoo_direct.js')) {
  syncYahooLeague('501321', 14);
}
