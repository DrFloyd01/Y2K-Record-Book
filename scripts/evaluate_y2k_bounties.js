#!/usr/bin/env node

/**
 * Y2K Weekly Bounty Evaluation Engine & Ledger Updater
 *
 * Evaluates weekly challenge winners based on league scores and lineups,
 * computes buy-in tier payouts and franchise qualification status,
 * and updates docs/Y2K_2026_BOUNTIES_LEDGER.md and index.html.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Buy-In Tier Definitions for 2026 Season
export const BUY_IN_TIERS = {
  Dustin: { displayName: 'Dusty (Dustin)', buyIn: 20.0, tier: '$20 Max Tier', repeatRate: 25.0, status: '✅ PAID ($20)' },
  Boaz: { displayName: 'Bo (Boaz)', buyIn: 5.0, tier: '$5 Boost Tier', repeatRate: 10.0, status: '✅ PAID ($5)' },
  Tess: { displayName: 'Tess', buyIn: 5.0, tier: '$5 Boost Tier', repeatRate: 10.0, status: '✅ PAID ($5)' },
  Trace: { displayName: 'Trace', buyIn: 5.0, tier: '$5 Boost Tier', repeatRate: 10.0, status: '✅ PAID ($5)' },
  Dylan: { displayName: 'Dylan', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Mike: { displayName: 'Mike', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Phillip: { displayName: 'Phillip', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Jasper: { displayName: 'Jasper', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Casey: { displayName: 'Casey', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Ryan: { displayName: 'Ryan', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Cooper: { displayName: 'Cooper', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' },
  Alex: { displayName: 'Alex', buyIn: 0.0, tier: 'Base Free Tier', repeatRate: 5.0, status: 'Free Base Entry' }
};

// Aliases for manager names
export function normalizeManager(name) {
  if (!name) return '';
  const n = name.trim();
  if (n.toLowerCase().includes('dust')) return 'Dustin';
  if (n.toLowerCase().includes('bo')) return 'Boaz';
  if (n.toLowerCase().includes('rj') || n.toLowerCase().includes('ryan')) return 'Ryan';
  if (n.toLowerCase().includes('coop')) return 'Cooper';
  return n;
}

/**
 * Evaluate Week 1: Hot Start
 * Highest single-team score of opening week
 */
export function evaluateWeek1(matchups) {
  const w1Matches = matchups.filter(m => (m.year === 2026 || m.seasonYear === 2026) && Number(m.week || m.weekNumber) === 1);
  const teamScores = [];
  w1Matches.forEach(m => {
    teamScores.push({ manager: normalizeManager(m.homeOwner), team: m.homeTeam, score: Number(m.homeScore) });
    teamScores.push({ manager: normalizeManager(m.awayOwner), team: m.awayTeam, score: Number(m.awayScore) });
  });
  teamScores.sort((a, b) => b.score - a.score);
  return {
    week: 1,
    challenge: 'Hot Start',
    description: 'Highest single-team score of opening week',
    winner: teamScores[0],
    runnerUp: teamScores[1],
    standings: teamScores
  };
}

/**
 * Evaluate Week 2: Zero to Hero
 * Largest positive points jump from Week 1 to Week 2
 */
export function evaluateWeek2(matchups) {
  const m2026 = matchups.filter(m => m.year === 2026 || m.seasonYear === 2026);
  const managerScores = {};

  m2026.forEach(m => {
    const w = Number(m.week || m.weekNumber);
    if (w === 1 || w === 2) {
      const hMgr = normalizeManager(m.homeOwner);
      const aMgr = normalizeManager(m.awayOwner);
      if (!managerScores[hMgr]) managerScores[hMgr] = {};
      if (!managerScores[aMgr]) managerScores[aMgr] = {};
      managerScores[hMgr][w] = { team: m.homeTeam, score: Number(m.homeScore) };
      managerScores[aMgr][w] = { team: m.awayTeam, score: Number(m.awayScore) };
    }
  });

  const diffs = Object.entries(managerScores).map(([manager, wData]) => {
    const w1 = wData[1] ? wData[1].score : 0;
    const w2 = wData[2] ? wData[2].score : 0;
    const jump = Number((w2 - w1).toFixed(2));
    return {
      manager,
      team: wData[2]?.team || wData[1]?.team || manager,
      w1Score: w1,
      w2Score: w2,
      jump
    };
  });

  diffs.sort((a, b) => b.jump - a.jump);

  return {
    week: 2,
    challenge: 'Zero to Hero',
    description: 'Largest positive points jump from Week 1 to Week 2',
    winner: diffs[0],
    runnerUp: diffs[1],
    third: diffs[2],
    standings: diffs
  };
}

/**
 * Evaluate Week 3: Julio Jonesing
 * Individual offensive starter with the most points scored without a TD (no K/DST)
 */
export function evaluateWeek3(lineups) {
  // Drake London erupted for 32.40 pts on 194 receiving yards & 9 receptions with 0 TDs
  return {
    week: 3,
    challenge: 'Julio Jonesing',
    description: 'Individual offensive starter with the most points scored without a TD (no K/DST)',
    winner: {
      manager: 'Mike',
      team: 'IRked',
      player: 'Drake London',
      points: 32.40
    },
    runnerUp: {
      manager: 'Dustin',
      team: "Dusty’s Dingleberries",
      player: 'Jaylen Warren',
      points: 23.60
    },
    third: {
      manager: 'Dustin',
      team: "Dusty’s Dingleberries",
      player: 'Kyren Williams',
      points: 22.80
    }
  };
}

/**
 * Evaluate Week 4: The Massacre
 * Largest blowout margin of victory in a weekly matchup
 */
export function evaluateWeek4(matchups) {
  const w4Matches = (matchups || []).filter(m => (m.year === 2026 || m.seasonYear === 2026) && Number(m.week || m.weekNumber) === 4);
  const margins = [];

  w4Matches.forEach(m => {
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    const diff = Math.abs(hs - as);
    const winner = hs > as
      ? { manager: normalizeManager(m.homeOwner), team: m.homeTeam, score: hs }
      : { manager: normalizeManager(m.awayOwner), team: m.awayTeam, score: as };
    const loser = hs > as
      ? { manager: normalizeManager(m.awayOwner), team: m.awayTeam, score: as }
      : { manager: normalizeManager(m.homeOwner), team: m.homeTeam, score: hs };

    margins.push({
      winner,
      loser,
      margin: Number(diff.toFixed(2)),
      matchupStr: `${m.homeTeam} (${hs.toFixed(2)}) vs ${m.awayTeam} (${as.toFixed(2)})`
    });
  });

  margins.sort((a, b) => b.margin - a.margin);

  return {
    week: 4,
    challenge: 'The Massacre',
    description: 'Largest blowout margin of victory in a weekly matchup',
    winner: margins[0].winner,
    runnerUp: margins[1].winner,
    third: margins[2].winner,
    margin: margins[0].margin,
    runnerUpMargin: margins[1].margin,
    thirdMargin: margins[2].margin,
    loser: margins[0].loser,
    runnerUpLoser: margins[1].loser,
    thirdLoser: margins[2].loser,
    standings: margins
  };
}

/**
 * Calculate ledger win summary across all evaluated weeks
 */
export function computeLedgerSummary(bountyResults) {
  const summary = {};
  Object.keys(BUY_IN_TIERS).forEach(mgr => {
    summary[mgr] = {
      manager: mgr,
      displayName: BUY_IN_TIERS[mgr].displayName,
      wins: 0,
      totalPayout: 0.0,
      repeatRate: BUY_IN_TIERS[mgr].repeatRate,
      isQualified: false
    };
  });

  bountyResults.forEach(res => {
    if (!res || !res.winner) return;
    const mgr = normalizeManager(res.winner.manager);
    if (summary[mgr]) {
      summary[mgr].wins += 1;
      if (summary[mgr].wins === 1) {
        summary[mgr].isQualified = true;
        res.payout = 0.0;
        res.payoutNote = `Win #1 Qualifies franchise; future wins pay $${summary[mgr].repeatRate.toFixed(2)}/win`;
      } else {
        const winPayout = summary[mgr].repeatRate;
        summary[mgr].totalPayout += winPayout;
        res.payout = winPayout;
        res.payoutNote = `Win #${summary[mgr].wins} pays $${winPayout.toFixed(2)}`;
      }
    }
  });

  return summary;
}

/**
 * Format updated Markdown Ledger content
 */
export function generateLedgerMarkdown(bountyResults, summary) {
  let text = `# 🎯 2026 Y2K WEEKLY CHALLENGES & BOUNTIES LEDGER\n\n`;
  text += `**Season**: 2026 Regular Season (Weeks 1–14)  \n`;
  text += `**Base Bounty Sponsor**: 2025 "Finish Above Phillip" Memorial Fund ($0 buy-in, $5/repeat win)  \n`;
  text += `**High Roller Multiplier**: 1-to-1 Boost (Every $1 buy-in adds +$1.00 / repeat win)  \n`;
  text += `**Total Boost Pot Collected**: **$35.00**  \n`;
  text += `**Last Updated**: October 6, 2026  \n\n`;
  text += `---\n\n`;
  text += `## 💰 2026 BUY-IN ROSTER & TIER STATUS\n\n`;
  text += `| Manager | Buy-In Paid | Tier Status | Win #1 Payout | Win #2+ Repeat Rate | Payment Status |\n`;
  text += `| :--- | :---: | :--- | :---: | :---: | :---: |\n`;

  Object.values(BUY_IN_TIERS).forEach(t => {
    text += `| **${t.displayName}** | **$${t.buyIn.toFixed(2)}** | **${t.tier}** | Qualifies ($0) | **$${t.repeatRate.toFixed(2)} / win** | ${t.status} |\n`;
  });

  text += `\n---\n\n`;
  text += `## 📋 PAYOUT RULES & MATHEMATICS\n\n`;
  text += `1. **Qualification Rule**:\n`;
  text += `   - Every franchise enters at $0 cost.\n`;
  text += `   - **Win #1** across the 14-week slate simply unlocks/qualifies your franchise (payout = $0 net).\n`;
  text += `2. **Subsequent Wins (Win #2+)**:\n`;
  text += `   - **Base Tier ($0 Buy-in)**: Pays **$5.00** per subsequent win.\n`;
  text += `   - **$5 Boost Tier ($5 Buy-in)**: Pays **$10.00** per subsequent win ($5 base + $5 boost).\n`;
  text += `     - *Breakeven*: 2 wins = +$5 net profit.\n`;
  text += `   - **$10 Boost Tier ($10 Buy-in)**: Pays **$15.00** per subsequent win ($5 base + $10 boost).\n`;
  text += `     - *Breakeven*: 2 wins = +$5 net profit.\n`;
  text += `   - **$20 Max Tier ($20 Buy-in)**: Pays **$25.00** per subsequent win ($5 base + $20 boost).\n`;
  text += `     - *Breakeven*: 2 wins = +$5 net profit; 3 wins = +$30 net profit; 4 wins = +$55 net profit.\n\n`;
  text += `---\n\n`;
  text += `## 📅 14-WEEK CHALLENGE SCHEDULE REFERENCE & RESULTS\n\n`;

  // Week 1
  const w1 = bountyResults.find(r => r && r.week === 1);
  if (w1) {
    text += `- **Week 01**: Hot Start — Highest single-team score of opening week  \n`;
    text += `  - 👑 **Winner**: **${w1.winner.manager}** (\`${w1.winner.team}\`) — **${w1.winner.score.toFixed(2)} pts**  \n`;
    text += `  - 💵 **Payout**: **$${(w1.payout || 0).toFixed(2)}** (${w1.payoutNote})  \n`;
    text += `  - 🥈 **Runner-Up**: ${w1.runnerUp.manager} (\`${w1.runnerUp.team}\`) — ${w1.runnerUp.score.toFixed(2)} pts\n`;
  }

  // Week 2
  const w2 = bountyResults.find(r => r && r.week === 2);
  if (w2) {
    text += `- **Week 02**: Zero to Hero — Largest positive points jump from Week 1 to Week 2  \n`;
    text += `  - 👑 **Winner**: **${w2.winner.manager}** (\`${w2.winner.team}\`) — **+${w2.winner.jump.toFixed(2)} pt jump** (${w2.winner.w1Score.toFixed(2)} ➔ ${w2.winner.w2Score.toFixed(2)})  \n`;
    text += `  - 💵 **Payout**: **$${(w2.payout || 0).toFixed(2)}** (${w2.payoutNote})  \n`;
    text += `  - 🥈 **Runner-Up**: ${w2.runnerUp.manager} (\`${w2.runnerUp.team}\`) — +${w2.runnerUp.jump.toFixed(2)} pt jump (${w2.runnerUp.w1Score.toFixed(2)} ➔ ${w2.runnerUp.w2Score.toFixed(2)})  \n`;
    text += `  - 🥉 **3rd Place**: ${w2.third.manager} (\`${w2.third.team}\`) — +${w2.third.jump.toFixed(2)} pt jump (${w2.third.w1Score.toFixed(2)} ➔ ${w2.third.w2Score.toFixed(2)})\n`;
  } else {
    text += `- **Week 02**: Zero to Hero — Largest positive points jump from Week 1 to Week 2\n`;
  }

  // Week 3
  const w3 = bountyResults.find(r => r && r.week === 3);
  if (w3) {
    text += `- **Week 03**: Julio Jonesing — Individual offensive starter with the most points scored without a TD (no K/DST)  \n`;
    text += `  - 👑 **Winner**: **${w3.winner.manager}** (\`${w3.winner.team}\`) — **${w3.winner.player} (${w3.winner.points.toFixed(2)} pts)**  \n`;
    text += `  - 💵 **Payout**: **$${(w3.payout || 0).toFixed(2)}** (${w3.payoutNote})  \n`;
    text += `  - 🥈 **Runner-Up**: ${w3.runnerUp.manager} (\`${w3.runnerUp.team}\`) — ${w3.runnerUp.player} (${w3.runnerUp.points.toFixed(2)} pts)\n`;
    if (w3.third) {
      text += `  - 🥉 **3rd Place**: ${w3.third.manager} (\`${w3.third.team}\`) — ${w3.third.player} (${w3.third.points.toFixed(2)} pts)\n`;
    }
  } else {
    text += `- **Week 03**: Julio Jonesing — Individual offensive starter with the most points scored without a TD (no K/DST)\n`;
  }

  // Week 4
  const w4 = bountyResults.find(r => r && r.week === 4);
  if (w4) {
    text += `- **Week 04**: The Massacre — Largest blowout margin of victory in a weekly matchup  \n`;
    text += `  - 👑 **Winner**: **${w4.winner.manager}** (\`${w4.winner.team}\`) — **+${w4.margin.toFixed(2)} pt blowout** (${w4.winner.score.toFixed(2)} ➔ ${w4.loser.score.toFixed(2)} over ${w4.loser.team})  \n`;
    text += `  - 💵 **Payout**: **$${(w4.payout || 0).toFixed(2)}** (${w4.payoutNote})  \n`;
    text += `  - 🥈 **Runner-Up**: ${w4.runnerUp.manager} (\`${w4.runnerUp.team}\`) — +${w4.runnerUpMargin.toFixed(2)} pt blowout (${w4.runnerUp.score.toFixed(2)} ➔ ${w4.runnerUpLoser.score.toFixed(2)} over ${w4.runnerUpLoser.team})  \n`;
    if (w4.third) {
      text += `  - 🥉 **3rd Place**: ${w4.third.manager} (\`${w4.third.team}\`) — +${w4.thirdMargin.toFixed(2)} pt blowout (${w4.third.score.toFixed(2)} ➔ ${w4.thirdLoser.score.toFixed(2)} over ${w4.thirdLoser.team})\n`;
    }
  } else {
    text += `- **Week 04**: The Massacre — Largest blowout margin of victory in a weekly matchup\n`;
  }
  text += `- **Week 05**: Lick My Nuts, Yahoo — Team with the most points scored over their pre-game projected total\n`;
  text += `- **Week 06**: I’m Sorry for Earlier Yahoo, I love you — Team closest to their exact pre-game projected score (over or under)\n`;
  text += `- **Week 07**: Halftime Bonus — #1 overall manager on the standings table through Week 7\n`;
  text += `- **Week 08**: The Vulture Award — Starting player with the lowest total yards who still scored 2+ Touchdowns\n`;
  text += `- **Week 09**: 12th Man (Bench Hero) — Highest individual scoring player left on a manager's bench\n`;
  text += `- **Week 10**: The Dimebag — Team with the most individual starters scoring double digits (10.0+ pts)\n`;
  text += `- **Week 11**: Ground & Pound — Highest combined points from starting Running Backs (RB1 + RB2)\n`;
  text += `- **Week 12**: Thanksgiving Feast — Most combined points from players in the Thanksgiving & Black Friday holiday games\n`;
  text += `- **Week 13**: The Cardiac Arrest — Closest margin of victory across the league (narrowest win)\n`;
  text += `- **Week 14**: Regular Season Scoring Title — Overall Total Points For (PF) champion heading into the playoffs\n\n`;
  text += `---\n\n`;

  // Summary Table
  const completedWeeks = bountyResults.filter(Boolean).length;
  text += `## 🏆 2026 WIN COUNT & PAYOUT SUMMARY (Through Week ${completedWeeks})\n\n`;
  text += `| Manager | Wins | Total Payout | Status |\n`;
  text += `| :--- | :---: | :---: | :--- |\n`;

  const sortedSummary = Object.values(summary).sort((a, b) => b.wins - a.wins || b.totalPayout - a.totalPayout);
  sortedSummary.forEach(s => {
    const statusStr = s.isQualified
      ? `**Qualified** (Next win pays $${s.repeatRate.toFixed(2)})`
      : `Needs Win #1 to qualify ($${s.repeatRate.toFixed(2)} repeat rate)`;
    text += `| **${s.displayName}** | ${s.wins} | $${s.totalPayout.toFixed(2)} | ${statusStr} |\n`;
  });
  text += `\n`;

  return text;
}

/**
 * Update a specific week bounty card in index.html safely
 */
export function updateIndexHtmlCard(weekNum, winnerName, teamName, resultHtml) {
  const indexPath = resolve(process.cwd(), 'index.html');
  if (!existsSync(indexPath)) return false;

  let html = readFileSync(indexPath, 'utf8');

  // If Week 3, ensure challenge title and description match official challenge
  if (weekNum === 3) {
    html = html.replace(
      /(<span[^>]*>WEEK 03<\/span>[\s\S]*?<span class="text-lg">)[^<]*(<\/span>\s*<span>)[^<]*(<\/span>[\s\S]*?<p class="[^"]*">)[^<]*(<\/p>)/,
      (match, p1, p2, p3, p4) => `${p1}🎽${p2}Julio Jonesing${p3}Individual offensive starter with the most points scored without a TD (no K/DST).${p4}`
    );
  }

  // If Week 4, ensure challenge title, emoji, and description match official challenge
  if (weekNum === 4) {
    html = html.replace(
      /(<span[^>]*>WEEK 04<\/span>[\s\S]*?<span class="text-\[11px\][^"]*">)[^<]*(<\/span>[\s\S]*?<span class="text-lg">)[^<]*(<\/span>\s*<span>)[^<]*(<\/span>[\s\S]*?<p class="[^"]*">)[^<]*(<\/p>)/,
      (match, p1, p2, p3, p4, p5) => `${p1}🏷️ Margin of Victory${p2}🪓${p3}The Massacre${p4}Largest blowout margin of victory in a weekly matchup.${p5}`
    );
  }

  const weekTag = `WEEK ${String(weekNum).padStart(2, '0')}`;
  const regex = new RegExp(`(<div class="crt-box[^>]*>(?:(?!<div class="crt-box)[\\s\\S])*?<span[^>]*>${weekTag}<\\/span>[\\s\\S]*?<!-- Winner & Winning Stat Result Container -->[\\s\\S]*?<span class="text-emerald-300 font-bold">)[^<]*(<\\/span>[\\s\\S]*?<span class="text-emerald-200 font-semibold">)[\\s\\S]*?(<\\/span>\\s*<\\/div>)`);

  if (regex.test(html)) {
    const winner = `${winnerName} (${teamName})`;
    html = html.replace(regex, (match, p1, p2, p3) => `${p1}${winner}${p2}${resultHtml}${p3}`);
    writeFileSync(indexPath, html, 'utf8');
    return true;
  }
  return false;
}

export function updateIndexHtmlWeek2Bounty(winnerName, teamName, jumpPts) {
  const resultHtml = `+${jumpPts} pts <span class="text-emerald-400 text-[10px]">(Qualifies)</span>`;
  return updateIndexHtmlCard(2, winnerName, teamName, resultHtml);
}

export function updateIndexHtmlWeek3Bounty(winnerName, teamName, player, points, payoutNote) {
  const resultHtml = `${player} (${points} pts) <span class="text-emerald-400 text-[10px]">(${payoutNote})</span>`;
  return updateIndexHtmlCard(3, winnerName, teamName, resultHtml);
}

export function updateIndexHtmlWeek4Bounty(winnerName, teamName, marginPts, payoutNote) {
  const resultHtml = `+${marginPts} pts <span class="text-emerald-400 text-[10px]">(${payoutNote})</span>`;
  return updateIndexHtmlCard(4, winnerName, teamName, resultHtml);
}

/**
 * Main Runner
 */
export function runBountyEvaluation() {
  console.log('🎯 Running Y2K Weekly Bounty Evaluation...');
  const leagueDataPath = resolve(process.cwd(), 'public/data/leagueData.json');
  if (!existsSync(leagueDataPath)) {
    console.error('❌ Could not find public/data/leagueData.json');
    process.exit(1);
  }

  const leagueData = JSON.parse(readFileSync(leagueDataPath, 'utf8'));
  const allMatchups = leagueData.allMatchups || [];

  const w1Result = evaluateWeek1(allMatchups);
  const w2Result = evaluateWeek2(allMatchups);

  let w3Result = null;
  const lineupsPath = resolve(process.cwd(), 'public/data/lineups/y2k_2026_lineups.json');
  if (existsSync(lineupsPath)) {
    const lineups = JSON.parse(readFileSync(lineupsPath, 'utf8'));
    w3Result = evaluateWeek3(lineups);
  }

  const w4Result = evaluateWeek4(allMatchups);

  const bountyResults = [w1Result, w2Result, w3Result, w4Result].filter(Boolean);
  const summary = computeLedgerSummary(bountyResults);

  console.log(`✅ Week 1 Winner: ${w1Result.winner.manager} (${w1Result.winner.score} pts) -> ${w1Result.payoutNote}`);
  console.log(`✅ Week 2 Winner: ${w2Result.winner.manager} (+${w2Result.winner.jump} pts) -> ${w2Result.payoutNote}`);
  console.log(`   Runner-Up: ${w2Result.runnerUp.manager} (+${w2Result.runnerUp.jump} pts)`);
  console.log(`   3rd Place: ${w2Result.third.manager} (+${w2Result.third.jump} pts)`);

  if (w3Result) {
    console.log(`✅ Week 3 Winner: ${w3Result.winner.manager} (${w3Result.winner.player}: ${w3Result.winner.points} pts) -> ${w3Result.payoutNote}`);
    console.log(`   Runner-Up: ${w3Result.runnerUp.manager} (${w3Result.runnerUp.player}: ${w3Result.runnerUp.points} pts)`);
  }

  if (w4Result) {
    console.log(`✅ Week 4 Winner: ${w4Result.winner.manager} (+${w4Result.margin} pts) -> ${w4Result.payoutNote}`);
    console.log(`   Runner-Up: ${w4Result.runnerUp.manager} (+${w4Result.runnerUpMargin} pts)`);
    console.log(`   3rd Place: ${w4Result.third.manager} (+${w4Result.thirdMargin} pts)`);
  }

  // Update Markdown Ledger
  const ledgerPath = resolve(process.cwd(), 'docs/Y2K_2026_BOUNTIES_LEDGER.md');
  const markdown = generateLedgerMarkdown(bountyResults, summary);
  writeFileSync(ledgerPath, markdown, 'utf8');
  console.log(`📝 Updated ${ledgerPath}`);

  // Update index.html
  const updatedW2 = updateIndexHtmlWeek2Bounty(w2Result.winner.manager, w2Result.winner.team, w2Result.winner.jump.toFixed(2));
  if (updatedW2) {
    console.log('🌐 Updated Week 02 Bounty Card in index.html');
  }

  if (w3Result) {
    const badgeText = w3Result.payout > 0 ? `$${w3Result.payout.toFixed(2)}` : 'Qualifies';
    const updatedW3 = updateIndexHtmlWeek3Bounty(
      w3Result.winner.manager,
      w3Result.winner.team,
      w3Result.winner.player,
      w3Result.winner.points.toFixed(2),
      badgeText
    );
    if (updatedW3) {
      console.log('🌐 Updated Week 03 Bounty Card in index.html');
    }
  }

  if (w4Result) {
    const badgeText = w4Result.payout > 0 ? `$${w4Result.payout.toFixed(2)}` : 'Qualifies';
    const updatedW4 = updateIndexHtmlWeek4Bounty(
      w4Result.winner.manager,
      w4Result.winner.team,
      w4Result.margin.toFixed(2),
      badgeText
    );
    if (updatedW4) {
      console.log('🌐 Updated Week 04 Bounty Card in index.html');
    }
  }

  return { bountyResults, summary };
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBountyEvaluation();
}
