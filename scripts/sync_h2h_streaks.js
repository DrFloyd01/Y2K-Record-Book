#!/usr/bin/env node

/**
 * Head-to-Head & Streaks Synchronizer
 *
 * Synchronizes all completed matchups into h2hData and recalculates
 * all-time and active win streaks for both Y2K and Pride Guys datasets.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { syncH2HDataAndStreaks } from '../src/analytics/h2h.js';

function syncFile(relPath, isPride = false) {
  const fullPath = resolve(process.cwd(), relPath);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️ File not found: ${relPath}`);
    return;
  }

  const data = JSON.parse(readFileSync(fullPath, 'utf8'));
  const beforePairs = (data.h2hData || []).length;
  const beforeStreaks = (data.h2hStreaks || []).length;

  syncH2HDataAndStreaks(data, isPride);

  writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Synced ${relPath}: ${beforePairs} -> ${data.h2hData.length} pairs, ${beforeStreaks} -> ${data.h2hStreaks.length} streaks`);
}

export function runH2HSync() {
  console.log('🔄 Synchronizing Head-to-Head Matrix & Win Streaks...');
  syncFile('public/data/leagueData.json', false);
  syncFile('public/data/prideGuysData.json', true);
  if (existsSync(resolve(process.cwd(), 'dist/data/leagueData.json'))) {
    syncFile('dist/data/leagueData.json', false);
  }
  if (existsSync(resolve(process.cwd(), 'dist/data/prideGuysData.json'))) {
    syncFile('dist/data/prideGuysData.json', true);
  }
  console.log('🎉 H2H synchronization complete!');
}

if (process.argv[1]?.endsWith('sync_h2h_streaks.js')) {
  runH2HSync();
}
