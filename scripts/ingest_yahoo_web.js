#!/usr/bin/env node

/**
 * Yahoo Fantasy Football Web Ingestion Tool
 *
 * Ingests Yahoo Fantasy Football weekly scores and matchups from:
 * 1. Exported JSON files (from scripts/yahoo_bookmarklet.js)
 * 2. Saved HTML/MHTML box score files
 *
 * Usage:
 *   node scripts/ingest_yahoo_web.js --file <PATH_TO_JSON_OR_HTML>
 *   node scripts/ingest_yahoo_web.js --json <PATH_TO_JSON>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Canonical manager map for Y2K League
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

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' || arg === '-f' || arg === '--json') {
      params.file = args[i + 1];
      i++;
    } else if (arg.startsWith('--')) {
      params[arg.slice(2)] = args[i + 1] || true;
    }
  }
  return params;
}

// Extract matchups from HTML text via Regex/DOM
function parseYahooHtml(htmlContent, fallbackWeek = 1) {
  const matchups = [];
  
  // Regex pattern for Yahoo matchup rows
  const matchupBlockRegex = /<section[^>]*class="[^"]*matchup[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
  let match;

  while ((match = matchupBlockRegex.exec(htmlContent)) !== null) {
    const block = match[1];
    
    // Extract team names and scores
    const teamNameMatches = [...block.matchAll(/<a[^>]*class="[^"]*F-link[^"]*"[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
    const scoreMatches = [...block.matchAll(/<span[^>]*class="[^"]*score[^"]*"[^>]*>([0-9.]+)<\/span>/gi)].map(m => parseFloat(m[1]));

    if (teamNameMatches.length >= 2 && scoreMatches.length >= 2) {
      const t1 = teamNameMatches[0];
      const t2 = teamNameMatches[1];
      const s1 = scoreMatches[0];
      const s2 = scoreMatches[1];

      matchups.push({
        matchupId: matchups.length + 1,
        week: fallbackWeek,
        team1: t1,
        score1: s1,
        team2: t2,
        score2: s2,
        winner: s1 > s2 ? t1 : (s2 > s1 ? t2 : 'Tie'),
        margin: parseFloat(Math.abs(s1 - s2).toFixed(2))
      });
    }
  }

  return matchups;
}

async function ingestYahooData() {
  const args = parseArgs();
  const filePath = args.file;

  if (!filePath || !existsSync(filePath)) {
    console.log(`
===============================================================
🟣 Y2K Yahoo Fantasy Football Web Ingestion Tool
===============================================================

Usage:
  node scripts/ingest_yahoo_web.js --file <path/to/exported_week.json>
  node scripts/ingest_yahoo_web.js --file <path/to/saved_page.html>

How to export Week 1 matchups in 1 second:
  1. Open your Yahoo Fantasy matchup page in browser.
  2. Open DevTools Console and run the script in 'scripts/yahoo_bookmarklet.js'.
  3. Run: node scripts/ingest_yahoo_web.js --file ~/Downloads/yahoo_league_XXXX_week_1.json
`);
    return;
  }

  console.log(`📂 Reading input file: ${filePath}...`);
  const rawContent = readFileSync(filePath, 'utf8');

  let parsedMatchups = [];
  let season = 2026;
  let week = 1;

  if (filePath.endsWith('.json')) {
    const jsonData = JSON.parse(rawContent);
    parsedMatchups = jsonData.matchups || [];
    season = jsonData.season || 2026;
    week = jsonData.week || 1;
  } else if (filePath.endsWith('.html') || filePath.endsWith('.mhtml')) {
    parsedMatchups = parseYahooHtml(rawContent, 1);
  }

  console.log(`✅ Extracted ${parsedMatchups.length} matchups for Season ${season}, Week ${week}:`);
  parsedMatchups.forEach(m => {
    console.log(`  • ${m.team1} (${m.score1}) vs ${m.team2} (${m.score2}) -> Winner: ${m.winner} (Margin: ${m.margin})`);
  });

  // Load leagueData.json
  const dataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(dataPath, 'utf8'));

  const sKey = season.toString();
  if (!leagueData.seasonData[sKey]) {
    console.log(`Initializing season ${season} template...`);
    leagueData.seasonData[sKey] = {
      settings: { seasonYear: season, teamCount: 12, playoffTeamCount: 6, firstWeek: 1, lastWeek: 17, regularSeasonWeeks: 14 },
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

  // Update schedule & box scores
  const seasonData = leagueData.seasonData[sKey];
  if (!seasonData.weeklyScores) seasonData.weeklyScores = [];

  parsedMatchups.forEach(m => {
    const o1 = Y2K_TEAM_OWNER_MAP[m.team1] || m.team1;
    const o2 = Y2K_TEAM_OWNER_MAP[m.team2] || m.team2;

    const gameEntry = {
      year: season,
      week: week,
      homeTeam: m.team1,
      homeOwner: o1,
      homeScore: m.score1,
      awayTeam: m.team2,
      awayOwner: o2,
      awayScore: m.score2,
      winner: m.score1 > m.score2 ? o1 : (m.score2 > m.score1 ? o2 : 'Tie'),
      margin: m.margin,
      isPlayoff: false
    };

    // Append to allMatchups if not duplicate
    const exists = leagueData.allMatchups.some(gm => gm.year === season && gm.week === week && gm.homeTeam === m.team1 && gm.awayTeam === m.team2);
    if (!exists) {
      leagueData.allMatchups.push(gameEntry);
    }
  });

  writeFileSync(dataPath, JSON.stringify(leagueData, null, 2), 'utf8');
  console.log(`\n🎉 Successfully updated public/data/leagueData.json with Week ${week} matchups!`);
}

ingestYahooData();
