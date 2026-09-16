#!/usr/bin/env node

/**
 * Yahoo Fantasy Matchup & Lineup Ingestion Engine
 *
 * Ingests weekly box score lineups, starter/bench players, player fantasy points,
 * and computes optimal lineups, coaching efficiency, and "D'Oh!" blunder moments.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
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

function normalizePosition(rawPos = '', slot = '') {
  const p = (rawPos || slot || '').toUpperCase().trim();
  if (p.includes('QB')) return 'QB';
  if (p.includes('RB')) return 'RB';
  if (p.includes('WR')) return 'WR';
  if (p.includes('TE')) return 'TE';
  if (p.includes('K')) return 'K';
  if (p.includes('DEF') || p.includes('D/ST') || p.includes('DST')) return 'DEF';
  return 'FLEX';
}

/**
 * Parses raw HTML string from a Yahoo matchup box score page using JSDOM
 */
export function parseYahooMatchupHtml(html, seasonYear = 2026, week = 1, constraints = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 }) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const leagueId = Y2K_LEAGUE_IDS[seasonYear] || '501321';

  // Extract team names
  const teamLinks = [...doc.querySelectorAll('a.F-link')].filter(a => {
    try {
      const u = new URL(a.href, 'https://football.fantasysports.yahoo.com');
      return /^\/f1\/\d+\/\d+$/.test(u.pathname);
    } catch {
      return false;
    }
  });

  const team1Name = teamLinks[0] ? teamLinks[0].textContent.trim() : 'Team 1';
  const team2Name = teamLinks[1] ? teamLinks[1].textContent.trim() : 'Team 2';
  const owner1 = Y2K_TEAM_OWNER_MAP[team1Name] || team1Name;
  const owner2 = Y2K_TEAM_OWNER_MAP[team2Name] || team2Name;

  const table1 = doc.getElementById('statTable1');
  const table2 = doc.getElementById('statTable2');

  function extractPlayers(table, isBench) {
    if (!table) return { p1: [], p2: [] };
    const rows = table.querySelectorAll('tbody tr');
    const p1 = [];
    const p2 = [];

    rows.forEach(tr => {
      const cells = [...tr.querySelectorAll('td')];
      if (cells.length < 10) return;

      const rawSlot = (cells[4]?.textContent || cells[5]?.textContent || (isBench ? 'BN' : 'FLEX')).trim().toUpperCase();

      // Team 1: player name in cell 1, points in cell 3, proj in cell 2
      const nameEl1 = cells[1]?.querySelector('a.ysf-player-name') || cells[1]?.querySelector('a.F-link');
      const pName1 = nameEl1 ? nameEl1.textContent.trim() : '';
      const subInfo1 = cells[1]?.querySelector('span.Fz-xxs')?.textContent?.trim() || '';
      const [nflTeam1, rawPos1] = subInfo1.includes('-')
        ? subInfo1.split('-').map(s => s.trim())
        : ['', rawSlot];
      const pos1 = normalizePosition(rawPos1, rawSlot);
      const pts1 = parseFloat(cells[3]?.textContent?.trim() || '0') || 0.0;
      const proj1 = parseFloat(cells[2]?.textContent?.trim() || '0') || 0.0;

      // Team 2: player name in cell 9, points in cell 7, proj in cell 8
      const nameEl2 = cells[9]?.querySelector('a.ysf-player-name') || cells[9]?.querySelector('a.F-link');
      const pName2 = nameEl2 ? nameEl2.textContent.trim() : '';
      const subInfo2 = cells[9]?.querySelector('span.Fz-xxs')?.textContent?.trim() || '';
      const [nflTeam2, rawPos2] = subInfo2.includes('-')
        ? subInfo2.split('-').map(s => s.trim())
        : ['', rawSlot];
      const pos2 = normalizePosition(rawPos2, rawSlot);
      const pts2 = parseFloat(cells[7]?.textContent?.trim() || '0') || 0.0;
      const proj2 = parseFloat(cells[8]?.textContent?.trim() || '0') || 0.0;

      if (pName1 && pName1 !== '(Empty)') {
        p1.push({
          slot: isBench ? 'BN' : rawSlot,
          player: pName1,
          playerName: pName1,
          position: pos1,
          nflTeam: nflTeam1 || '',
          points: pts1,
          projectedPoints: proj1,
          injuryStatus: 'ACTIVE',
          isBench: isBench
        });
      }

      if (pName2 && pName2 !== '(Empty)') {
        p2.push({
          slot: isBench ? 'BN' : rawSlot,
          player: pName2,
          playerName: pName2,
          position: pos2,
          nflTeam: nflTeam2 || '',
          points: pts2,
          projectedPoints: proj2,
          injuryStatus: 'ACTIVE',
          isBench: isBench
        });
      }
    });

    return { p1, p2 };
  }

  const starters = extractPlayers(table1, false);
  const bench = extractPlayers(table2, true);

  const t1All = [...starters.p1, ...bench.p1];
  const t2All = [...starters.p2, ...bench.p2];

  const opt1 = computeOptimalLineup(t1All, constraints);
  const opt2 = computeOptimalLineup(t2All, constraints);

  const t1 = {
    teamName: team1Name,
    ownerName: owner1,
    seasonYear: seasonYear,
    week: week,
    actualScore: opt1.actualScore,
    optimalScore: opt1.optimalScore,
    coachingEfficiency: opt1.coachingEfficiency,
    pointsLeftOnBench: opt1.pointsLeftOnBench,
    starters: starters.p1,
    bench: bench.p1,
    optimalStarters: opt1.optimalStarters,
    optimalBench: opt1.optimalBench
  };

  const t2 = {
    teamName: team2Name,
    ownerName: owner2,
    seasonYear: seasonYear,
    week: week,
    actualScore: opt2.actualScore,
    optimalScore: opt2.optimalScore,
    coachingEfficiency: opt2.coachingEfficiency,
    pointsLeftOnBench: opt2.pointsLeftOnBench,
    starters: starters.p2,
    bench: bench.p2,
    optimalStarters: opt2.optimalStarters,
    optimalBench: opt2.optimalBench
  };

  t1.isWin = t1.actualScore > t2.actualScore;
  t1.isLoss = t1.actualScore < t2.actualScore;
  t1.isTie = t1.actualScore === t2.actualScore;

  t2.isWin = t2.actualScore > t1.actualScore;
  t2.isLoss = t2.actualScore < t1.actualScore;
  t2.isTie = t1.actualScore === t2.actualScore;

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
    isPlayoff: false,
    homeTeam: t1,
    awayTeam: t2,
    margin: Number(Math.abs(t1.actualScore - t2.actualScore).toFixed(2))
  };
}

/**
 * Main ingestion entrypoint
 */
export async function syncYahooLineups(seasonYear = 2026, targetWeek = 1) {
  const leagueId = Y2K_LEAGUE_IDS[seasonYear] || '501321';
  console.log(`📡 Ingesting Yahoo Lineups for Season ${seasonYear} Week ${targetWeek} (League: ${leagueId})...`);

  const lineupsDir = resolve(process.cwd(), 'public/data/lineups');
  if (!existsSync(lineupsDir)) {
    mkdirSync(lineupsDir, { recursive: true });
  }

  const leagueDataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(leagueDataPath, 'utf8'));
  const sData = leagueData.seasonData[String(seasonYear)] || {};
  const constraints = parseRosterConstraints(sData.settings?.rosterPositions);

  console.log(`📋 Roster Constraints for ${seasonYear}:`, constraints);

  // 1. Fetch matchup overview to extract active matchup links
  const overviewUrl = `https://football.fantasysports.yahoo.com/f1/${leagueId}?matchup_week=${targetWeek}&module=matchups&lhst=matchups`;
  const overviewRes = await fetch(overviewUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (overviewRes.status !== 200) {
    throw new Error(`HTTP ${overviewRes.status} fetching overview`);
  }

  const overviewHtml = await overviewRes.text();
  const listItems = [...overviewHtml.matchAll(/data-target=['"](\/f1\/\d+\/matchup\?week=\d+&mid1=\d+&mid2=\d+)['"]/g)];
  console.log(`🔍 Discovered ${listItems.length} matchup box score links for Week ${targetWeek}.`);

  const newMatchups = [];
  for (const item of listItems) {
    const matchupUrl = `https://football.fantasysports.yahoo.com${item[1]}`;
    console.log(`• Fetching box score: ${matchupUrl}`);
    const mRes = await fetch(matchupUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (mRes.status === 200) {
      const mHtml = await mRes.text();
      const parsed = parseYahooMatchupHtml(mHtml, seasonYear, targetWeek, constraints);
      if (parsed) {
        newMatchups.push(parsed);
        console.log(`  ✅ Ingested: ${parsed.homeTeam.ownerName} (${parsed.homeTeam.actualScore}) vs ${parsed.awayTeam.ownerName} (${parsed.awayTeam.actualScore})`);
      }
    }
  }

  // Load existing lineups file for 2026
  const outputFile = resolve(lineupsDir, `y2k_${seasonYear}_lineups.json`);
  let existingData = [];
  if (existsSync(outputFile)) {
    try {
      existingData = JSON.parse(readFileSync(outputFile, 'utf8'));
    } catch {
      existingData = [];
    }
  }

  // Merge newly parsed matchups into existing
  newMatchups.forEach(nm => {
    const idx = existingData.findIndex(
      em => em.seasonYear === nm.seasonYear &&
            em.week === nm.week &&
            em.homeTeam.ownerName === nm.homeTeam.ownerName &&
            em.awayTeam.ownerName === nm.awayTeam.ownerName
    );
    if (idx >= 0) {
      existingData[idx] = nm;
    } else {
      existingData.push(nm);
    }
  });

  writeFileSync(outputFile, JSON.stringify(existingData, null, 2), 'utf8');
  console.log(`💾 Saved ${existingData.length} lineups to ${outputFile}`);

  // Also update master y2k_lineups.json
  const masterFile = resolve(lineupsDir, 'y2k_lineups.json');
  let masterData = [];
  if (existsSync(masterFile)) {
    try {
      masterData = JSON.parse(readFileSync(masterFile, 'utf8'));
    } catch {
      masterData = [];
    }
  }

  newMatchups.forEach(nm => {
    const idx = masterData.findIndex(
      em => em.seasonYear === nm.seasonYear &&
            em.week === nm.week &&
            em.homeTeam.ownerName === nm.homeTeam.ownerName &&
            em.awayTeam.ownerName === nm.awayTeam.ownerName
    );
    if (idx >= 0) {
      masterData[idx] = nm;
    } else {
      masterData.push(nm);
    }
  });

  writeFileSync(masterFile, JSON.stringify(masterData, null, 2), 'utf8');
  console.log(`💾 Synced into master ${masterFile}`);

  // Update coaching efficiencies & D'Oh in leagueData.json standings for season 2026
  if (leagueData.seasonData[String(seasonYear)]?.standings) {
    const standings = leagueData.seasonData[String(seasonYear)].standings;
    existingData.forEach(m => {
      [m.homeTeam, m.awayTeam].forEach(t => {
        const st = standings.find(s => s.ownerName === t.ownerName);
        if (st) {
          st.coachingEfficiency = t.coachingEfficiency;
          st.optimalPointsFor = t.optimalScore;
          st.optimalPF = t.optimalScore;
          if (t.dOhOccurred && t.dOhDetails) {
            st.dOhs = (st.dOhs || 0) + 1;
            st.dOhDetails = st.dOhDetails || [];
            st.dOhDetails.push({
              year: seasonYear,
              week: m.week,
              team: t.teamName,
              ...t.dOhDetails
            });
          }
        }
      });
    });
    writeFileSync(leagueDataPath, JSON.stringify(leagueData, null, 2), 'utf8');
    console.log(`📊 Updated managerial metrics in public/data/leagueData.json standings!`);
  }

  return existingData;
}

if (process.argv[1] && process.argv[1].endsWith('sync_yahoo_lineups.js')) {
  const yr = parseInt(process.argv[2] || '2026', 10);
  const wk = parseInt(process.argv[3] || '1', 10);
  syncYahooLineups(yr, wk);
}
