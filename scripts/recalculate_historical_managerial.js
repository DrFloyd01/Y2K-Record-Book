#!/usr/bin/env node

/**
 * Historical Lineup, Optimal Best Ball, and D'Oh! Recalculation Engine
 *
 * Scrutinizes and recomputes the entire managerial history across all seasons (2018-2026).
 * Resolves all ambiguous 'FLEX' / 'BN' player positions to their true NFL positions (QB, RB, WR, TE, K, DEF),
 * recalculates Best Ball optimal lineups, coaching efficiencies, and single-swap D'Oh! blunders,
 * strictly selecting the swap that delivers the MAXIMUM net gain (largest win margin).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseRosterConstraints, computeOptimalLineup, analyzeDOhMoment } from '../src/analytics/managerial.js';
import { resolvePlayerPosition } from '../src/analytics/playerPositions.js';

export function recalculateAllManagerialData({ dryRun = false } = {}) {
  const leagueDataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  const leagueData = JSON.parse(readFileSync(leagueDataPath, 'utf8'));

  const lineupsDir = resolve(process.cwd(), 'public/data/lineups');
  const masterLineupsPath = resolve(lineupsDir, 'y2k_lineups.json');
  const masterLineups = JSON.parse(readFileSync(masterLineupsPath, 'utf8'));

  console.log(`🚀 Starting Full History Recalculation across ${masterLineups.length} matchups...`);

  // Constraints per season from leagueData settings
  const constraintsByYear = {};
  for (let yr = 2018; yr <= 2026; yr++) {
    const sData = leagueData.seasonData[String(yr)];
    constraintsByYear[yr] = parseRosterConstraints(sData?.settings?.rosterPositions);
  }

  function cleanPlayer(p) {
    if (!p) return null;
    const name = (p.playerName || p.player || p.name || '').trim();
    const truePos = resolvePlayerPosition(name, p.position, p.slot);
    return {
      ...p,
      playerName: name,
      player: name,
      position: truePos,
      normPos: truePos,
      points: Number(p.points || 0)
    };
  }

  let totalDohChanges = 0;
  let totalSwapUpgrades = 0;
  const phillipW4Log = [];

  function processTeam(t, opp, yr, wk, isPlayoff) {
    if (!t) return;
    const constraints = constraintsByYear[yr] || { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 };

    const starters = (t.starters || []).map(cleanPlayer).filter(Boolean);
    const bench = (t.bench || []).map(cleanPlayer).filter(Boolean);
    const allPlayers = [...starters, ...bench];

    const opt = computeOptimalLineup(allPlayers, constraints);
    t.optimalScore = opt.optimalScore;
    t.coachingEfficiency = opt.coachingEfficiency;
    t.pointsLeftOnBench = opt.pointsLeftOnBench;
    t.optimalStarters = opt.optimalStarters;
    t.optimalBench = opt.optimalBench;
    t.starters = starters;
    t.bench = bench;

    const oldDohOccurred = t.dOhOccurred;
    const oldBestSwap = t.dOhDetails;

    if (t.isLoss && opp) {
      const doh = analyzeDOhMoment(starters, bench, opp.actualScore, t.actualScore, constraints);
      t.dOhOccurred = doh.dOhOccurred;
      t.dOhDetails = doh.bestSwap;

      if (doh.dOhOccurred !== oldDohOccurred) {
        totalDohChanges++;
      } else if (doh.dOhOccurred && oldBestSwap?.benchPlayer !== doh.bestSwap?.benchPlayer) {
        totalSwapUpgrades++;
      }

      if (yr === 2026 && wk === 4 && t.ownerName === 'Phillip') {
        phillipW4Log.push({
          owner: t.ownerName,
          actualScore: t.actualScore,
          optimalScore: t.optimalScore,
          coachingEfficiency: t.coachingEfficiency,
          pointsLeftOnBench: t.pointsLeftOnBench,
          dOhOccurred: t.dOhOccurred,
          bestSwap: t.dOhDetails
        });
      }
    } else {
      t.dOhOccurred = false;
      t.dOhDetails = null;
    }
  }

  // 1. Process Master Lineups
  masterLineups.forEach(m => {
    const yr = Number(m.seasonYear || m.year);
    const wk = Number(m.week || m.weekNumber);
    const isPlayoff = Boolean(m.isPlayoff);

    processTeam(m.homeTeam, m.awayTeam, yr, wk, isPlayoff);
    processTeam(m.awayTeam, m.homeTeam, yr, wk, isPlayoff);
  });

  // 2. Process Individual Season Files (2018-2026)
  const seasonFiles = {};
  for (let yr = 2018; yr <= 2026; yr++) {
    const sPath = resolve(lineupsDir, `y2k_${yr}_lineups.json`);
    if (existsSync(sPath)) {
      const sLineups = JSON.parse(readFileSync(sPath, 'utf8'));
      sLineups.forEach(m => {
        const wk = Number(m.week || m.weekNumber);
        const isPlayoff = Boolean(m.isPlayoff);
        processTeam(m.homeTeam, m.awayTeam, yr, wk, isPlayoff);
        processTeam(m.awayTeam, m.homeTeam, yr, wk, isPlayoff);
      });
      seasonFiles[yr] = { path: sPath, data: sLineups };
    }
  }

  console.log(`📊 Processing complete: ${totalDohChanges} D'Oh occurrences adjusted, ${totalSwapUpgrades} D'Oh swaps upgraded to maximum net gain.`);
  if (phillipW4Log.length > 0) {
    console.log(`\n🎯 2026 Week 4 Phillip Result:`, JSON.stringify(phillipW4Log[0], null, 2));
  }

  // 3. Update leagueData.json Standings & All-Time Stats
  const dohByOwnerSeason = {};
  const dohDetailsByOwnerSeason = {};
  const effByOwnerSeason = {};

  const allTimeAct = {};
  const allTimeOpt = {};
  const allTimeGames = {};

  // For standings, use masterLineups regular season weeks
  masterLineups.forEach(m => {
    const yr = Number(m.seasonYear || m.year);
    const wk = Number(m.week || m.weekNumber);
    const isPlayoff = Boolean(m.isPlayoff || (m.stage && m.stage !== 'Regular Season'));

    // Exclude playoff games
    if (isPlayoff) return;
    if (yr < 2026 && wk > 14) return;
    if (yr === 2026 && wk > 4) return; // 2026 completed through week 4

    [m.homeTeam, m.awayTeam].forEach(t => {
      if (!t) return;
      const o = t.ownerName;
      const k = `${o}_${yr}`;
      if (!effByOwnerSeason[k]) {
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
          team: t.teamName,
          ...t.dOhDetails
        });
      }
    });
  });

  const allTimeDoh = {};
  const allTimeDohDetails = {};

  Object.entries(leagueData.seasonData || {}).forEach(([yrStr, sData]) => {
    if (!yrStr.match(/^\d+$/)) return;
    const yr = parseInt(yrStr, 10);
    if (!sData.standings) return;

    sData.standings.forEach(st => {
      const o = st.ownerName;
      const k = `${o}_${yr}`;
      if (effByOwnerSeason[k] && effByOwnerSeason[k].length > 0) {
        st.dOhs = dohByOwnerSeason[k] || 0;
        st.dOhCount = dohByOwnerSeason[k] || 0;
        st.dOhDetails = dohDetailsByOwnerSeason[k] || [];
        const effList = effByOwnerSeason[k];
        const totAct = effList.reduce((sum, x) => sum + x.actual, 0);
        const totOpt = effList.reduce((sum, x) => sum + x.optimal, 0);
        st.optimalPF = Number(totOpt.toFixed(1));
        st.optimalPointsFor = Number(totOpt.toFixed(1));
        st.coachingEfficiency = totOpt > 0 ? Number(((totAct / totOpt) * 100).toFixed(1)) : 100.0;

        // allTimeStandings tracks completed seasons (2018-2025)
        if (yr < 2026) {
          if (!allTimeDohDetails[o]) {
            allTimeDoh[o] = 0;
            allTimeDohDetails[o] = [];
            allTimeAct[o] = 0;
            allTimeOpt[o] = 0;
            allTimeGames[o] = 0;
          }
          allTimeDoh[o] += st.dOhs;
          allTimeDohDetails[o].push(...st.dOhDetails);
          allTimeAct[o] += totAct;
          allTimeOpt[o] += totOpt;
          allTimeGames[o] += effList.length;
        }
      }
    });
  });

  const updateStandingsList = (standingsList) => {
    if (!standingsList) return;
    standingsList.forEach(st => {
      const o = st.ownerName;
      st.dOhs = allTimeDoh[o] || 0;
      st.dOhCount = allTimeDoh[o] || 0;
      st.dOhDetails = allTimeDohDetails[o] || [];
      const totOpt = allTimeOpt[o] || 0;
      const totAct = allTimeAct[o] || 0;
      const games = allTimeGames[o] || 0;
      if (totOpt > 0) {
        st.optimalPF = Number(totOpt.toFixed(1));
        st.optimalPointsFor = Number(totOpt.toFixed(1));
        st.coachingEfficiency = Number(((totAct / totOpt) * 100).toFixed(1));
        st.optPfg = games > 0 ? Number((totOpt / games).toFixed(1)) : null;
      }
    });
  };

  updateStandingsList(leagueData.allTimeStandings);
  updateStandingsList(leagueData.seasonData?.allTime?.standings);

  if (!dryRun) {
    // Write lineup files
    writeFileSync(masterLineupsPath, JSON.stringify(masterLineups, null, 2), 'utf8');
    console.log(`💾 Saved updated master lineups: ${masterLineupsPath}`);

    for (const [yr, fileInfo] of Object.entries(seasonFiles)) {
      writeFileSync(fileInfo.path, JSON.stringify(fileInfo.data, null, 2), 'utf8');
      console.log(`💾 Saved updated ${yr} lineups: ${fileInfo.path}`);
    }

    // Write leagueData.json
    writeFileSync(leagueDataPath, JSON.stringify(leagueData, null, 2), 'utf8');
    console.log(`💾 Saved updated leagueData.json standings and all-time records.`);
  } else {
    console.log(`🔍 [DRY RUN] No files written to disk.`);
  }

  return { totalDohChanges, totalSwapUpgrades, phillipW4: phillipW4Log[0] };
}

// Execute when invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const isDryRun = process.argv.includes('--dry-run');
  recalculateAllManagerialData({ dryRun: isDryRun });
}
