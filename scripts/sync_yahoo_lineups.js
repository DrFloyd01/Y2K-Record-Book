#!/usr/bin/env node

/**
 * Yahoo Fantasy Matchup & Lineup Ingestion Engine
 *
 * Ingests weekly box score lineups, starter/bench players, player fantasy points,
 * and computes optimal lineups, coaching efficiency, and "D'Oh!" blunder moments.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { parseRosterConstraints, computeOptimalLineup, analyzeDOhMoment } from '../src/analytics/managerial.js';

// Canonical Y2K League IDs by Season
export const Y2K_LEAGUE_IDS = {
  2026: '501321',
  2025: '97974',
  2024: '141011',
  2023: '96417',
  2022: '172828',
  2021: '213942',
  2020: '183921',
  2019: '201948',
  2018: '102941'
};

// Canonical Y2K Team Name to Owner Mapping
export const Y2K_TEAM_OWNER_MAP = {
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

/**
 * Parses raw HTML string from a Yahoo matchup box score page
 */
export function parseYahooMatchupHtml(html, seasonYear = 2026, week = 1, constraints = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 }) {
  const teams = [];

  // Match player table sections
  const tableMatches = [...html.matchAll(/<table[^>]*class="[^"]*stat-target[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
  
  // If stat-target tables not found, look for general tables with matchup rosters
  const targetTables = tableMatches.length >= 2
    ? tableMatches.map(m => m[1])
    : [...html.matchAll(/<table[^>]*class="[^"]*Table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)].map(m => m[1]);

  targetTables.slice(0, 2).forEach((tableHtml, tIdx) => {
    // Extract Team Name
    const teamHeaderMatch = tableHtml.match(/<a[^>]*class="[^"]*F-link[^"]*"[^>]*>([^<]+)<\/a>/i);
    const teamName = teamHeaderMatch ? teamHeaderMatch[1].trim() : `Team ${tIdx + 1}`;
    const ownerName = Y2K_TEAM_OWNER_MAP[teamName] || teamName;

    const players = [];
    const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

    rowMatches.forEach(row => {
      const rowContent = row[1];
      if (rowContent.includes('<th') || !rowContent.includes('ysf-player-name')) return;

      // Extract Slot (e.g. QB, WR, RB, W/R/T, BN, IR)
      const slotMatch = rowContent.match(/<span[^>]*class="[^"]*pos-label[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        rowContent.match(/<td[^>]*class="[^"]*pos[^"]*"[^>]*>([^<]+)<\/td>/i);
      const slot = slotMatch ? slotMatch[1].trim().toUpperCase() : 'BN';

      // Extract Player Name
      const nameMatch = rowContent.match(/<a[^>]*class="[^"]*(?:ysf-player-name|name|F-link)[^"]*"[^>]*>([^<]+)<\/a>/i);
      const playerName = nameMatch ? nameMatch[1].trim() : '';
      if (!playerName || playerName === '(Empty)') return;

      // Extract Position & Team (e.g. "KC - QB" or "SF - RB")
      const posTeamMatch = rowContent.match(/<span[^>]*class="[^"]*Fz-xxs[^"]*"[^>]*>([^<]+)<\/span>/i);
      const posTeamStr = posTeamMatch ? posTeamMatch[1].trim() : '';
      const [nflTeam, rawPos] = posTeamStr.includes('-')
        ? posTeamStr.split('-').map(s => s.trim())
        : [posTeamStr, slot];

      // Extract Injury Status (e.g. Q, O, IR, D)
      const injuryMatch = rowContent.match(/<span[^>]*class="[^"]*(?:F-injury|injury)[^"]*"[^>]*>([^<]+)<\/span>/i);
      const injuryStatus = injuryMatch ? injuryMatch[1].trim().toUpperCase() : 'ACTIVE';

      // Extract Fantasy Points
      const ptsMatches = [...rowContent.matchAll(/<td[^>]*class="[^"]*(?:Ta-end|Ta-e|points)[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
      let points = 0.0;
      let projected = 0.0;

      if (ptsMatches.length >= 1) {
        const rawPts = ptsMatches[ptsMatches.length - 1][1].replace(/<[^>]+>/g, '').trim();
        points = parseFloat(rawPts) || 0.0;
      }
      if (ptsMatches.length >= 2) {
        const rawProj = ptsMatches[ptsMatches.length - 2][1].replace(/<[^>]+>/g, '').trim();
        projected = parseFloat(rawProj) || 0.0;
      }

      const isBench = slot.startsWith('BN') || slot.startsWith('IR');

      players.push({
        slot: slot,
        player: playerName,
        playerName: playerName,
        position: rawPos || slot,
        nflTeam: nflTeam || '',
        points: points,
        projectedPoints: projected,
        injuryStatus: injuryStatus,
        isBench: isBench
      });
    });

    const starters = players.filter(p => !p.isBench);
    const bench = players.filter(p => p.isBench);

    const optimalAnalysis = computeOptimalLineup(players, constraints);

    teams.push({
      teamName: teamName,
      ownerName: ownerName,
      seasonYear: seasonYear,
      week: week,
      actualScore: optimalAnalysis.actualScore,
      optimalScore: optimalAnalysis.optimalScore,
      coachingEfficiency: optimalAnalysis.coachingEfficiency,
      pointsLeftOnBench: optimalAnalysis.pointsLeftOnBench,
      starters: starters,
      bench: bench,
      optimalStarters: optimalAnalysis.optimalStarters,
      optimalBench: optimalAnalysis.optimalBench
    });
  });

  if (teams.length === 2) {
    const t1 = teams[0];
    const t2 = teams[1];

    t1.isWin = t1.actualScore > t2.actualScore;
    t1.isLoss = t1.actualScore < t2.actualScore;
    t1.isTie = t1.actualScore === t2.actualScore;

    t2.isWin = t2.actualScore > t1.actualScore;
    t2.isLoss = t2.actualScore < t1.actualScore;
    t2.isTie = t1.actualScore === t2.actualScore;

    // Check D'Oh! blunders for losing teams
    if (t1.isLoss) {
      const dOh1 = analyzeDOhMoment(t1.starters, t1.bench, t2.actualScore, t1.actualScore);
      t1.dOhOccurred = dOh1.dOhOccurred;
      t1.dOhDetails = dOh1.bestSwap;
    } else {
      t1.dOhOccurred = false;
      t1.dOhDetails = null;
    }

    if (t2.isLoss) {
      const dOh2 = analyzeDOhMoment(t2.starters, t2.bench, t1.actualScore, t2.actualScore);
      t2.dOhOccurred = dOh2.dOhOccurred;
      t2.dOhDetails = dOh2.bestSwap;
    } else {
      t2.dOhOccurred = false;
      t2.dOhDetails = null;
    }

    return {
      seasonYear: seasonYear,
      week: week,
      homeTeam: t1,
      awayTeam: t2,
      margin: Number(Math.abs(t1.actualScore - t2.actualScore).toFixed(2))
    };
  }

  return null;
}

/**
 * Main ingestion entrypoint
 */
export async function syncYahooLineups(seasonYear = 2026) {
  const leagueId = Y2K_LEAGUE_IDS[seasonYear] || '501321';
  console.log(`📡 Ingesting Yahoo Lineups for Season ${seasonYear} (League: ${leagueId})...`);

  const lineupsDir = resolve(process.cwd(), 'public/data/lineups');
  if (!existsSync(lineupsDir)) {
    mkdirSync(lineupsDir, { recursive: true });
  }

  // Load existing league data for settings
  const leagueDataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(leagueDataPath, 'utf8'));
  const sData = leagueData.seasonData[String(seasonYear)] || {};
  const constraints = parseRosterConstraints(sData.settings?.rosterPositions);

  console.log(`📋 Roster Constraints for ${seasonYear}:`, constraints);

  const outputFile = resolve(lineupsDir, `y2k_${seasonYear}_lineups.json`);
  let existingData = [];
  if (existsSync(outputFile)) {
    try {
      existingData = JSON.parse(readFileSync(outputFile, 'utf8'));
    } catch {
      existingData = [];
    }
  }

  console.log(`✅ Loaded ${existingData.length} existing matchup lineups for ${seasonYear}.`);
  return existingData;
}

if (process.argv[1] && process.argv[1].endsWith('sync_yahoo_lineups.js')) {
  const yr = parseInt(process.argv[2] || '2026', 10);
  syncYahooLineups(yr);
}
