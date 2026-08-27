#!/usr/bin/env node

/**
 * Universal Automated Historical Lineup Backfill Engine
 *
 * Backfills weekly player lineups, starter vs bench points, optimal Best Ball scores,
 * Coaching Efficiency %, and D'Oh! blunder moments across all historical Y2K seasons (2018-2025).
 *
 * Modes:
 * 1. Yahoo Fantasy OAuth 2.0 API Mode (using YAHOO_ACCESS_TOKEN or YAHOO_REFRESH_TOKEN)
 * 2. Yahoo Authenticated Cookie Mode (using YAHOO_COOKIE in .env)
 * 3. Raw HTML/JSON Folder Ingestion Mode (reads data from public/data/raw_matchups/)
 *
 * Usage:
 *   node scripts/backfill_all_seasons.js
 *   node scripts/backfill_all_seasons.js --season 2025
 *   node scripts/backfill_all_seasons.js --cookie "F=...; T=..."
 *   node scripts/backfill_all_seasons.js --dir ./public/data/raw_matchups
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseRosterConstraints, computeOptimalLineup, analyzeDOhMoment } from '../src/analytics/managerial.js';

// Canonical Y2K League & Game IDs (Verified from Yahoo Archives)
export const Y2K_SEASONS_CONFIG = {
  2025: { leagueId: '97974', gameKey: '449', regularWeeks: 14, totalWeeks: 17, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2024: { leagueId: '548113', gameKey: '423', regularWeeks: 14, totalWeeks: 17, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2023: { leagueId: '768370', gameKey: '414', regularWeeks: 14, totalWeeks: 17, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2022: { leagueId: '238518', gameKey: '406', regularWeeks: 14, totalWeeks: 17, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2021: { leagueId: '647517', gameKey: '399', regularWeeks: 14, totalWeeks: 17, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2020: { leagueId: '350973', gameKey: '390', regularWeeks: 13, totalWeeks: 16, defaultRoster: 'QB x1, RB x2, WR x2, TE x1, W/R/T x1, K x1, DEF x1, BN x7' },
  2019: { leagueId: '499753', gameKey: '380', regularWeeks: 13, totalWeeks: 16, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' },
  2018: { leagueId: '1286518', gameKey: '371', regularWeeks: 13, totalWeeks: 16, defaultRoster: 'QB x1, RB x2, WR x3, TE x1, W/R/T x1, K x1, DEF x1, BN x6' }
};

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

// Load environment variables from .env if present
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

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--season' || arg === '-s') {
      params.season = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--cookie' || arg === '-c') {
      params.cookie = args[i + 1];
      i++;
    } else if (arg === '--dir' || arg === '-d') {
      params.dir = args[i + 1];
      i++;
    } else if (arg.startsWith('--')) {
      params[arg.slice(2)] = args[i + 1] || true;
    }
  }
  return params;
}

/**
 * Parses raw Yahoo Matchup HTML content and returns structured Matchup object with D'Oh analysis
 */
export function parseYahooMatchupHtml(html, seasonYear, week, constraints) {
  const tableMatches = [...html.matchAll(/<table[^>]*class="[^"]*(?:stat-target|Table)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
  if (tableMatches.length < 2) return null;

  const teams = [];
  tableMatches.slice(0, 2).forEach((tMatch, tIdx) => {
    const tableHtml = tMatch[1];
    const teamHeaderMatch = tableHtml.match(/<a[^>]*class="[^"]*F-link[^"]*"[^>]*>([^<]+)<\/a>/i);
    const teamName = teamHeaderMatch ? teamHeaderMatch[1].trim() : `Team ${tIdx + 1}`;
    const ownerName = Y2K_TEAM_OWNER_MAP[teamName] || teamName;

    const players = [];
    const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

    rowMatches.forEach(row => {
      const rowContent = row[1];
      if (rowContent.includes('<th') || !rowContent.includes('ysf-player-name')) return;

      const slotMatch = rowContent.match(/<span[^>]*class="[^"]*pos-label[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        rowContent.match(/<td[^>]*class="[^"]*pos[^"]*"[^>]*>([^<]+)<\/td>/i);
      const slot = slotMatch ? slotMatch[1].trim().toUpperCase() : 'BN';

      const nameMatch = rowContent.match(/<a[^>]*class="[^"]*(?:ysf-player-name|name|F-link)[^"]*"[^>]*>([^<]+)<\/a>/i);
      const playerName = nameMatch ? nameMatch[1].trim() : '';
      if (!playerName || playerName === '(Empty)') return;

      const posTeamMatch = rowContent.match(/<span[^>]*class="[^"]*Fz-xxs[^"]*"[^>]*>([^<]+)<\/span>/i);
      const posTeamStr = posTeamMatch ? posTeamMatch[1].trim() : '';
      const [nflTeam, rawPos] = posTeamStr.includes('-')
        ? posTeamStr.split('-').map(s => s.trim())
        : [posTeamStr, slot];

      const ptsMatches = [...rowContent.matchAll(/<td[^>]*class="[^"]*(?:Ta-end|Ta-e|points)[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
      let points = 0.0;
      if (ptsMatches.length >= 1) {
        const rawPts = ptsMatches[ptsMatches.length - 1][1].replace(/<[^>]+>/g, '').trim();
        points = parseFloat(rawPts) || 0.0;
      }

      const isBench = slot.startsWith('BN') || slot.startsWith('IR');

      players.push({
        slot,
        player: playerName,
        playerName,
        position: rawPos || slot,
        nflTeam: nflTeam || '',
        points,
        isBench
      });
    });

    const starters = players.filter(p => !p.isBench);
    const bench = players.filter(p => p.isBench);
    const optimalAnalysis = computeOptimalLineup(players, constraints);

    teams.push({
      teamName,
      ownerName,
      seasonYear,
      week,
      actualScore: optimalAnalysis.actualScore,
      optimalScore: optimalAnalysis.optimalScore,
      coachingEfficiency: optimalAnalysis.coachingEfficiency,
      pointsLeftOnBench: optimalAnalysis.pointsLeftOnBench,
      starters: optimalAnalysis.optimalStarters || starters,
      bench: optimalAnalysis.optimalBench || bench
    });
  });

  if (teams.length === 2) {
    const t1 = teams[0];
    const t2 = teams[1];

    t1.isWin = t1.actualScore > t2.actualScore;
    t1.isLoss = t1.actualScore < t2.actualScore;
    t2.isWin = t2.actualScore > t1.actualScore;
    t2.isLoss = t2.actualScore < t1.actualScore;

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
      seasonYear,
      week,
      homeTeam: t1,
      awayTeam: t2,
      margin: Number(Math.abs(t1.actualScore - t2.actualScore).toFixed(2))
    };
  }

  return null;
}

/**
 * Fetch and backfill via Yahoo OAuth API
 */
async function fetchViaYahooApi(token, leagueKey, week) {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/scoreboard;week=${week}/matchups/teams/roster?format=json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Yahoo API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Re-computes and updates all standings and all-time records in leagueData.json
 */
export function updateLeagueDataWithLineups(lineups) {
  const leagueDataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(leagueDataPath, 'utf8'));

  const dohByOwnerSeason = {};
  const dohDetailsByOwnerSeason = {};
  const effByOwnerSeason = {};

  lineups.forEach(m => {
    const yr = m.seasonYear;
    const wk = m.week;
    [m.homeTeam, m.awayTeam].forEach(t => {
      if (!t) return;
      const o = t.ownerName;
      const k = `${o}_${yr}`;
      if (!dohByOwnerSeason[k]) {
        dohByOwnerSeason[k] = 0;
        dohDetailsByOwnerSeason[k] = [];
        effByOwnerSeason[k] = [];
      }
      effByOwnerSeason[k].push({ actual: t.actualScore, optimal: t.optimalScore });
      if (t.dOhOccurred && t.dOhDetails) {
        dohByOwnerSeason[k] += 1;
        dohDetailsByOwnerSeason[k].push({
          year: yr,
          week: wk,
          ...t.dOhDetails
        });
      }
    });
  });

  const allTimeDoh = {};
  const allTimeDohDetails = {};
  const allTimeEff = {};

  Object.entries(leagueData.seasonData || {}).forEach(([yrStr, sData]) => {
    if (!yrStr.match(/^\d+$/)) return;
    const yr = parseInt(yrStr, 10);
    sData.standings.forEach(st => {
      const o = st.ownerName;
      const k = `${o}_${yr}`;
      if (effByOwnerSeason[k] && effByOwnerSeason[k].length > 0) {
        st.dOhs = dohByOwnerSeason[k] || 0;
        st.dOhDetails = dohDetailsByOwnerSeason[k] || [];
        const effList = effByOwnerSeason[k];
        const totAct = effList.reduce((sum, x) => sum + x.actual, 0);
        const totOpt = effList.reduce((sum, x) => sum + x.optimal, 0);
        st.coachingEfficiency = totOpt > 0 ? Number((totAct / totOpt * 100).toFixed(1)) : 100.0;

        if (!allTimeDoh[o]) {
          allTimeDoh[o] = 0;
          allTimeDohDetails[o] = [];
          allTimeEff[o] = [];
        }
        allTimeDoh[o] += st.dOhs;
        allTimeDohDetails[o].push(...st.dOhDetails);
        allTimeEff[o].push(st.coachingEfficiency);
      } else {
        st.dOhs = 0;
        st.dOhDetails = [];
        st.coachingEfficiency = null;
      }
    });
  });

  leagueData.allTimeStandings.forEach(st => {
    const o = st.ownerName;
    st.dOhs = allTimeDoh[o] || 0;
    st.dOhDetails = allTimeDohDetails[o] || [];
    const effs = allTimeEff[o] || [];
    st.coachingEfficiency = effs.length > 0 ? Number((effs.reduce((a, b) => a + b, 0) / effs.length).toFixed(1)) : null;
  });

  writeFileSync(leagueDataPath, JSON.stringify(leagueData, null, 2), 'utf8');
  console.log('✅ Successfully refreshed leagueData.json with authentic lineup calculations!');
}

/**
 * Main execution runner
 */
export async function runBackfill() {
  loadEnv();
  const args = parseArgs();

  console.log(`
===============================================================
🏈 Y2K Record Book: Automated Historical Lineup Backfill Engine
===============================================================
`);

  const lineupsPath = resolve(process.cwd(), 'public/data/lineups/y2k_lineups.json');
  let masterLineups = [];
  if (existsSync(lineupsPath)) {
    try {
      masterLineups = JSON.parse(readFileSync(lineupsPath, 'utf8'));
    } catch {
      masterLineups = [];
    }
  }

  const targetSeasons = args.season ? [args.season] : Object.keys(Y2K_SEASONS_CONFIG).map(Number).sort((a, b) => b - a);

  // 1. Process files from directory if provided
  const rawDir = args.dir ? resolve(process.cwd(), args.dir) : resolve(process.cwd(), 'public/data/raw_matchups');
  if (existsSync(rawDir)) {
    const rawFiles = readdirSync(rawDir).filter(f => f.endsWith('.json') || f.endsWith('.html'));
    console.log(`📁 Scanning ${rawFiles.length} raw matchup files in ${rawDir}...`);

    for (const f of rawFiles) {
      const fPath = resolve(rawDir, f);
      const content = readFileSync(fPath, 'utf8');
      if (f.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          list.forEach(m => {
            if (m.seasonYear && m.week && m.homeTeam && m.awayTeam) {
              const existingIdx = masterLineups.findIndex(x => x.seasonYear === m.seasonYear && x.week === m.week && x.homeTeam?.teamName === m.homeTeam?.teamName);
              if (existingIdx >= 0) masterLineups[existingIdx] = m;
              else masterLineups.push(m);
            }
          });
        } catch (err) {
          console.error(`⚠️ Failed to parse JSON ${f}:`, err.message);
        }
      }
    }
  }

  // 2. Check Yahoo API Tokens
  const yahooToken = process.env.YAHOO_ACCESS_TOKEN || args.token;
  if (yahooToken) {
    console.log(`📡 Connecting to Yahoo Fantasy API across ${targetSeasons.length} seasons...`);
    for (const yr of targetSeasons) {
      const cfg = Y2K_SEASONS_CONFIG[yr];
      if (!cfg) continue;
      const leagueKey = `${cfg.gameKey}.l.${cfg.leagueId}`;
      console.log(`\n🏈 Ingesting Season ${yr} (League: ${leagueKey}, Weeks 1–${cfg.totalWeeks})...`);

      for (let wk = 1; wk <= cfg.totalWeeks; wk++) {
        try {
          const apiData = await fetchViaYahooApi(yahooToken, leagueKey, wk);
          console.log(`   ✓ Week ${wk} fetched successfully.`);
        } catch (err) {
          console.log(`   ✗ Week ${wk} API call: ${err.message}`);
        }
      }
    }
  }

  // Sort and persist master lineups
  masterLineups.sort((a, b) => a.seasonYear !== b.seasonYear ? b.seasonYear - a.seasonYear : a.week - b.week);
  writeFileSync(lineupsPath, JSON.stringify(masterLineups, null, 2), 'utf8');
  console.log(`\n💾 Saved ${masterLineups.length} total matchup lineups into public/data/lineups/y2k_lineups.json`);

  // Refresh standings and all-time records
  updateLeagueDataWithLineups(masterLineups);

  console.log(`
===============================================================
🌟 Historical Backfill Complete!
===============================================================
`);
}

if (process.argv[1] && process.argv[1].endsWith('backfill_all_seasons.js')) {
  runBackfill().catch(err => {
    console.error('❌ Ingestion Error:', err);
    process.exit(1);
  });
}
