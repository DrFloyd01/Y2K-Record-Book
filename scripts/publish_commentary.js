#!/usr/bin/env node

/**
 * Commentary Publishing Tool
 *
 * Publishes copy-edited draft commentary from docs/drafts/ into live datasets:
 * - public/data/leagueData.json (Y2K weeklyCommentary)
 * - public/data/prideGuysData.json (Pride Guys weeklyCommentary)
 *
 * Usage:
 *   node scripts/publish_commentary.js --week 2
 *   node scripts/publish_commentary.js --week 2 --preview 3
 *   node scripts/publish_commentary.js --all
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function publishCommentary({ week, previewWeek, targetLeague = 'both' }) {
  console.log(`🚀 Publishing commentary (Week ${week || 'all'}, Previews ${previewWeek || 'next'})...`);

  // 1. Publish Y2K Commentary
  if (targetLeague === 'both' || targetLeague === 'y2k') {
    const y2kBackupPath = resolve(process.cwd(), 'docs/drafts/Y2K_2026_COMMENTARY_BACKUP.json');
    const y2kDataPath = resolve(process.cwd(), 'public/data/leagueData.json');

    const draftBackup = loadJson(y2kBackupPath);
    const leagueData = loadJson(y2kDataPath);

    if (draftBackup && leagueData) {
      if (!leagueData.weeklyCommentary) leagueData.weeklyCommentary = {};
      if (!leagueData.weeklyCommentary['2026']) leagueData.weeklyCommentary['2026'] = {};

      const weeksToPublish = week ? [String(week)] : Object.keys(draftBackup);
      if (previewWeek && !weeksToPublish.includes(String(previewWeek))) {
        weeksToPublish.push(String(previewWeek));
      }

      weeksToPublish.forEach(w => {
        if (draftBackup[w]) {
          leagueData.weeklyCommentary['2026'][w] = draftBackup[w];
          console.log(`✅ [Y2K] Published Week ${w} commentary (${draftBackup[w].mode})`);
        }
      });

      writeFileSync(y2kDataPath, JSON.stringify(leagueData, null, 2), 'utf8');
      console.log(`💾 Saved updated public/data/leagueData.json`);
    }
  }

  // 2. Publish Pride Guys Commentary
  if (targetLeague === 'both' || targetLeague === 'pride') {
    const prideBackupPath = resolve(process.cwd(), 'docs/drafts/PRIDE_2026_COMMENTARY_BACKUP.json');
    const prideDataPath = resolve(process.cwd(), 'public/data/prideGuysData.json');

    const prideBackup = loadJson(prideBackupPath);
    const prideData = loadJson(prideDataPath);

    if (prideBackup && prideData) {
      if (!prideData.weeklyCommentary) prideData.weeklyCommentary = {};

      if (week && prideBackup[`week${week}Recap`]) {
        prideData.weeklyCommentary[`week${week}Recap`] = prideBackup[`week${week}Recap`];
        console.log(`✅ [Pride Guys] Published Week ${week} Recap`);
      }
      if (previewWeek && prideBackup[`week${previewWeek}Preview`]) {
        prideData.weeklyCommentary[`week${previewWeek}Preview`] = prideBackup[`week${previewWeek}Preview`];
        console.log(`✅ [Pride Guys] Published Week ${previewWeek} Preview`);
      }
      if (!week && !previewWeek) {
        Object.assign(prideData.weeklyCommentary, prideBackup);
        console.log(`✅ [Pride Guys] Published all available drafts`);
      }

      writeFileSync(prideDataPath, JSON.stringify(prideData, null, 2), 'utf8');
      console.log(`💾 Saved updated public/data/prideGuysData.json`);
    }
  }

  console.log('🎉 Publishing complete! Changes will appear in live app upon reload.');
}

// CLI argument parsing
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let week = null;
  let previewWeek = null;
  let targetLeague = 'both';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--week' && args[i + 1]) {
      week = args[i + 1];
      i++;
    } else if (args[i] === '--preview' && args[i + 1]) {
      previewWeek = args[i + 1];
      i++;
    } else if (args[i] === '--league' && args[i + 1]) {
      targetLeague = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      week = null;
      previewWeek = null;
    }
  }

  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/publish_commentary.js [options]

Options:
  --week <N>         Publish specific completed week recap (e.g. 2)
  --preview <N>      Publish specific upcoming week preview (e.g. 3)
  --league <name>    'y2k', 'pride', or 'both' (default: 'both')
  --all              Publish all drafts in docs/drafts/
    `);
    process.exit(0);
  }

  publishCommentary({ week, previewWeek, targetLeague });
}
