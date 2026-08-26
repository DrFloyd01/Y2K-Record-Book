/**
 * Matchups View Component: 5-Across Standing-Sorted Cards & Manager Season Game Log
 */
import { CRT_THEME } from '../theme/theme.js';
import { buildMatchupLineupCardHtml } from './managerialView.js';

/**
 * Formats a playoff stage tag for game log display
 */
export function formatPlayoffStageTag(stage, year) {
  if (!stage) return `Playoff'${String(year).slice(2)}`;
  const s = stage.toLowerCase();
  if (s.includes('semi')) return `Semifinal'${String(year).slice(2)}`;
  if (s.includes('3rd') || s.includes('bronze')) return `🥉 3rd Place'${String(year).slice(2)}`;
  if (s.includes('champ') || s.includes('final') || s.includes('1st')) return `🏆 Finals'${String(year).slice(2)}`;
  if (s.includes('consol') || s.includes('toilet') || s.includes('sacko')) return `Consolation'${String(year).slice(2)}`;
  return `Playoffs'${String(year).slice(2)}`;
}

/**
 * Sorts weekly matchups by team standing ranks (e.g. #1 vs #4, #2 vs #3, etc.)
 */
export function sortMatchupsByStandingRank(matchups, rankMap) {
  return [...matchups].sort((mA, mB) => {
    const rA1 = rankMap[mA.homeOwner]?.rank || 99;
    const rA2 = rankMap[mA.awayOwner]?.rank || 99;
    const rB1 = rankMap[mB.homeOwner]?.rank || 99;
    const rB2 = rankMap[mB.awayOwner]?.rank || 99;

    const minA = Math.min(rA1, rA2);
    const minB = Math.min(rB1, rB2);

    if (minA !== minB) return minA - minB;
    return (rA1 + rA2) - (rB1 + rB2);
  });
}

/**
 * Builds HTML for the 5-across weekly matchups grid
 */
export function buildWeeklyMatchupsGridHtml({
  matchups = [],
  rankMap = {},
  season = 2025,
  week = 1,
  mode = 'recap',
  commentary = null,
  lineups = [],
  theme = CRT_THEME
}) {
  const isCrt = theme.name === 'crt';
  const isRecap = mode === 'recap';

  if (!matchups || matchups.length === 0) {
    return `
      <div class="crt-box rounded p-8 text-center border ${isCrt ? 'border-emerald-800 bg-emerald-950/20' : 'border-pink-300 bg-pink-50/50'}">
        <div class="${isCrt ? 'text-amber-400 font-mono font-black' : 'text-pink-600 font-fredoka font-bold'} text-base mb-2">
          &gt; NO MATCHUPS RECORDED FOR ${season} WEEK ${week}
        </div>
        <p class="text-xs ${isCrt ? 'text-emerald-400 font-mono' : 'text-purple-700 font-sans'} max-w-md mx-auto leading-relaxed">
          No game results or editorial write-ups exist for ${season} Week ${week}.
        </p>
      </div>
    `;
  }

  // Sort matchups so top-ranked marquee games appear first
  const sortedMatchups = sortMatchupsByStandingRank(matchups, rankMap);

  const cardsHtml = sortedMatchups.map((m, idx) => {
    const o1 = m.homeOwner;
    const o2 = m.awayOwner;
    const t1 = m.homeTeam;
    const t2 = m.awayTeam;
    const s1 = Number(m.homeScore || 0);
    const s2 = Number(m.awayScore || 0);

    const info1 = rankMap[o1] || { rank: '-', rec: '0-0' };
    const info2 = rankMap[o2] || { rank: '-', rec: '0-0' };

    const isWinner1 = s1 > s2;
    const isWinner2 = s2 > s1;
    const margin = Math.abs(s1 - s2);

    // Look for ingested player lineup box score
    const lineupMatch = (lineups || []).find(lm =>
      String(lm.seasonYear) === String(season) &&
      Number(lm.week) === Number(week) &&
      ((lm.homeTeam?.ownerName === o1 && lm.awayTeam?.ownerName === o2) ||
       (lm.homeTeam?.ownerName === o2 && lm.awayTeam?.ownerName === o1))
    );

    let lHome = null, lAway = null;
    if (lineupMatch) {
      lHome = lineupMatch.homeTeam?.ownerName === o1 ? lineupMatch.homeTeam : lineupMatch.awayTeam;
      lAway = lineupMatch.homeTeam?.ownerName === o2 ? lineupMatch.homeTeam : lineupMatch.awayTeam;
    }

    const mId = `m_${season}_w${week}_${o1}_${o2}_${idx}`.replace(/[^a-zA-Z0-9_]/g, '_');

    // D'Oh Blunder banner
    let dOhBadge = '';
    const hasDOh = (lineupMatch?.homeTeam?.dOhOccurred || lineupMatch?.awayTeam?.dOhOccurred);
    if (hasDOh) {
      const dOhTeam = lineupMatch.homeTeam?.dOhOccurred ? lineupMatch.homeTeam : lineupMatch.awayTeam;
      if (dOhTeam?.dOhDetails) {
        dOhBadge = `
          <div class="mt-2 px-2 py-1 ${isCrt ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-red-50 text-red-700 border border-red-300'} rounded text-[10px] font-bold text-center leading-tight">
            🤦‍♂️ D'OH! BLUNDER: ${dOhTeam.ownerName} benched ${dOhTeam.dOhDetails.benchPlayer} (+${dOhTeam.dOhDetails.winMargin} pt win missed)
          </div>
        `;
      }
    }

    // Lineup Boxscore Drawer Button
    let lineupExpanderBtn = '';
    if (lineupMatch) {
      lineupExpanderBtn = `
        <div class="mt-2.5 pt-2 border-t ${isCrt ? 'border-emerald-900/60' : 'border-pink-200'}">
          <button type="button" onclick="window.toggleMatchupLineupBox('${mId}')" class="w-full py-1 px-2 ${isCrt ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-300'} font-bold text-[11px] rounded transition-all flex items-center justify-between cursor-pointer">
            <span>📋 Box Score &amp; Best Ball</span>
            <span id="matchup-lineup-arrow-${mId}">▼</span>
          </button>
        </div>
      `;
    }

    // Editorial Commentary
    let commentaryHtml = '';
    if (commentary && commentary.matchups) {
      const customM = commentary.matchups.find(cm =>
        (cm.homeOwner === o1 && cm.awayOwner === o2) || (cm.homeOwner === o2 && cm.awayOwner === o1)
      );
      if (customM && customM.writeup) {
        commentaryHtml = `
          <div class="mt-2 p-2 ${isCrt ? 'bg-black/90 border border-emerald-800 text-emerald-300' : 'bg-purple-50 border border-pink-200 text-purple-900'} rounded text-[11px] leading-relaxed">
            <span class="text-[9px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block mb-0.5">&gt; RECAP_NOTES:</span>
            ${customM.writeup}
          </div>
        `;
      }
    }

    const cardBg = isCrt ? 'bg-black/80 border-emerald-800 hover:border-emerald-500' : 'bg-white border-pink-200 hover:border-pink-400 shadow-md';
    const rowT1Bg = isRecap && isWinner1 ? (isCrt ? 'bg-emerald-950/60 border-l-2 border-emerald-400' : 'bg-pink-50/80 border-l-2 border-pink-500') : '';
    const rowT2Bg = isRecap && isWinner2 ? (isCrt ? 'bg-emerald-950/60 border-l-2 border-emerald-400' : 'bg-pink-50/80 border-l-2 border-pink-500') : '';

    const cardContent = `
      <div class="crt-box rounded-xl p-3 border ${cardBg} flex flex-col justify-between transition-all">
        <div>
          <!-- Header Bar: Matchup # & Rank Preview -->
          <div class="flex items-center justify-between pb-1.5 mb-2 border-b ${isCrt ? 'border-emerald-900/80 font-mono text-[11px]' : 'border-pink-200 font-fredoka text-xs'}">
            <span class="${isCrt ? 'text-emerald-400 font-bold' : 'text-pink-600 font-bold'}">MATCHUP #${idx + 1}</span>
            <span class="${isCrt ? 'text-amber-400 font-bold' : 'text-purple-700 font-bold'}">#${info1.rank} vs #${info2.rank}</span>
          </div>

          <!-- Team 1 Row -->
          <div class="p-2 rounded mb-1.5 flex items-center justify-between gap-2 ${rowT1Bg}">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${isCrt ? 'bg-emerald-950 text-amber-400 border border-emerald-800' : 'bg-pink-100 text-pink-700 border border-pink-300'}">#${info1.rank}</span>
                <span class="font-bold text-xs truncate ${isCrt ? 'text-emerald-300' : 'text-purple-950'}" title="${t1}">${t1}</span>
              </div>
              <span class="text-[10px] ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">[${o1}] • ${info1.rec}</span>
            </div>
            ${isRecap ? `
              <div class="text-right shrink-0">
                <span class="text-base font-black font-mono ${isWinner1 ? (isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700') : (isCrt ? 'text-emerald-700' : 'text-purple-700')}">${s1.toFixed(2)}</span>
                ${lHome ? `<span class="text-[9px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-purple-700 font-sans'} block">Opt ${lHome.optimalScore?.toFixed(1)} (${lHome.coachingEfficiency}%)</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Team 2 Row -->
          <div class="p-2 rounded mb-1.5 flex items-center justify-between gap-2 ${rowT2Bg}">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${isCrt ? 'bg-emerald-950 text-amber-400 border border-emerald-800' : 'bg-pink-100 text-pink-700 border border-pink-300'}">#${info2.rank}</span>
                <span class="font-bold text-xs truncate ${isCrt ? 'text-emerald-300' : 'text-purple-950'}" title="${t2}">${t2}</span>
              </div>
              <span class="text-[10px] ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">[${o2}] • ${info2.rec}</span>
            </div>
            ${isRecap ? `
              <div class="text-right shrink-0">
                <span class="text-base font-black font-mono ${isWinner2 ? (isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700') : (isCrt ? 'text-emerald-700' : 'text-purple-700')}">${s2.toFixed(2)}</span>
                ${lAway ? `<span class="text-[9px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-purple-700 font-sans'} block">Opt ${lAway.optimalScore?.toFixed(1)} (${lAway.coachingEfficiency}%)</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Outcome Pill -->
          ${isRecap ? `
            <div class="text-center my-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${isCrt ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-pink-50 text-pink-700 border-pink-300'}">
                🏆 ${isWinner1 ? o1 : (isWinner2 ? o2 : 'Tie')} (+${margin.toFixed(2)} pts)
              </span>
            </div>
          ` : ''}

          ${dOhBadge}
          ${commentaryHtml}
        </div>

        ${lineupExpanderBtn}
      </div>
    `;

    const fullWidthDrawer = lineupMatch ? `
      <div id="matchup-lineup-content-${mId}" class="col-span-full hidden my-3 p-4 crt-box rounded-2xl border ${isCrt ? 'bg-black/95 border-emerald-500 text-emerald-300' : 'bg-white border-2 border-pink-300 shadow-2xl text-purple-950'} transition-all">
        <div class="flex justify-between items-center pb-2 mb-3 border-b ${isCrt ? 'border-emerald-800 font-mono' : 'border-pink-200 font-fredoka'}">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700'}">📋 WEEK ${week} FULL BOX SCORE &amp; ROSTERS: ${t1} vs ${t2}</span>
          </div>
          <button type="button" onclick="window.toggleMatchupLineupBox('${mId}')" class="px-3 py-1 ${isCrt ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900' : 'bg-pink-100 text-pink-700 border border-pink-300 hover:bg-pink-200'} font-bold text-xs rounded-full transition-all cursor-pointer">
            ✕ Close Box Score
          </button>
        </div>
        ${buildMatchupLineupCardHtml({ matchup: lineupMatch, theme })}
      </div>
    ` : '';

    return cardContent + fullWidthDrawer;
  }).join('');

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      ${cardsHtml}
    </div>
  `;
}

/**
 * Builds HTML for a single manager's season game log (all weeks on one page)
 */
export function buildManagerSeasonGameLogHtml({
  owner,
  season = 2025,
  matchups = [],
  rankMap = {},
  commentary = null,
  lineups = [],
  theme = CRT_THEME
}) {
  const isCrt = theme.name === 'crt';

  const mgrGames = (matchups || [])
    .filter(m => String(m.seasonYear) === String(season) && (m.homeOwner === owner || m.awayOwner === owner))
    .sort((a, b) => (Number(a.weekNumber) || 0) - (Number(b.weekNumber) || 0));

  if (mgrGames.length === 0) {
    return `
      <div class="crt-box rounded p-8 text-center border ${isCrt ? 'border-emerald-800 bg-emerald-950/20' : 'border-pink-300 bg-pink-50/50'}">
        <div class="${isCrt ? 'text-amber-400 font-mono font-black' : 'text-pink-600 font-fredoka font-bold'} text-base mb-2">
          &gt; NO GAMES RECORDED FOR ${owner} IN ${season}
        </div>
      </div>
    `;
  }

  let totalWins = 0, totalLosses = 0, totalPF = 0, totalPA = 0, totalOpt = 0, totalDOhs = 0;

  const gameCards = mgrGames.map((m, idx) => {
    const wk = Number(m.weekNumber);
    const isHome = m.homeOwner === owner;
    const teamName = isHome ? m.homeTeam : m.awayTeam;
    const oppOwner = isHome ? m.awayOwner : m.homeOwner;
    const oppTeam = isHome ? m.awayTeam : m.homeTeam;
    const myScore = Number(isHome ? m.homeScore : m.awayScore);
    const oppScore = Number(isHome ? m.awayScore : m.homeScore);

    const isWin = myScore > oppScore;
    const isLoss = oppScore > myScore;
    const margin = Math.abs(myScore - oppScore);

    if (isWin) totalWins++;
    if (isLoss) totalLosses++;
    totalPF += myScore;
    totalPA += oppScore;

    // Lineup matching
    const lineupMatch = (lineups || []).find(lm =>
      String(lm.seasonYear) === String(season) &&
      Number(lm.week) === wk &&
      ((lm.homeTeam?.ownerName === owner && lm.awayTeam?.ownerName === oppOwner) ||
       (lm.homeTeam?.ownerName === oppOwner && lm.awayTeam?.ownerName === owner))
    );

    let myLineup = null;
    if (lineupMatch) {
      myLineup = lineupMatch.homeTeam?.ownerName === owner ? lineupMatch.homeTeam : lineupMatch.awayTeam;
      if (myLineup) {
        totalOpt += (myLineup.optimalScore || 0);
        if (myLineup.dOhOccurred) totalDOhs++;
      }
    }

    const mId = `mgr_${season}_w${wk}_${owner}`.replace(/[^a-zA-Z0-9_]/g, '_');

    let dOhBadge = '';
    if (myLineup?.dOhOccurred && myLineup.dOhDetails) {
      dOhBadge = `
        <div class="mt-2 px-2 py-1 ${isCrt ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-red-50 text-red-700 border border-red-300'} rounded text-[10px] font-bold text-center leading-tight">
          🤦‍♂️ D'OH! Benched ${myLineup.dOhDetails.benchPlayer} (+${myLineup.dOhDetails.winMargin} pt win missed)
        </div>
      `;
    }

    let lineupExpanderBtn = '';
    if (lineupMatch) {
      lineupExpanderBtn = `
        <div class="mt-2.5 pt-2 border-t ${isCrt ? 'border-emerald-900/60' : 'border-pink-200'}">
          <button type="button" onclick="window.toggleMatchupLineupBox('${mId}')" class="w-full py-1 px-2 ${isCrt ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-300'} font-bold text-[11px] rounded transition-all flex items-center justify-between cursor-pointer">
            <span>📋 Box Score &amp; Starters</span>
            <span id="matchup-lineup-arrow-${mId}">▼</span>
          </button>
        </div>
      `;
    }

    const isPlayoff = m.isPlayoff || wk >= 15;
    const stageTag = isPlayoff ? formatPlayoffStageTag(m.stage, season) : `Week ${wk}`;

    const outcomeBadge = isWin
      ? (isCrt ? '<span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 font-extrabold text-[10px] rounded">WIN</span>' : '<span class="px-2 py-0.5 bg-pink-100 text-pink-700 border border-pink-300 font-extrabold text-[10px] rounded">WIN</span>')
      : (isCrt ? '<span class="px-2 py-0.5 bg-red-950 text-red-400 border border-red-700 font-extrabold text-[10px] rounded">LOSS</span>' : '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-300 font-extrabold text-[10px] rounded">LOSS</span>');

    const cardContent = `
      <div class="crt-box rounded-xl p-3 border ${isCrt ? 'bg-black/80 border-emerald-900 hover:border-emerald-600' : 'bg-white border-pink-200 hover:border-pink-400 shadow-md'} flex flex-col justify-between">
        <div>
          <!-- Card Header -->
          <div class="flex items-center justify-between pb-1.5 mb-2 border-b ${isCrt ? 'border-emerald-900/80 font-mono text-xs' : 'border-pink-200 font-fredoka text-xs'}">
            <span class="font-bold ${isCrt ? 'text-amber-400' : 'text-pink-700'}">${stageTag}</span>
            ${outcomeBadge}
          </div>

          <!-- Opponent & Score details -->
          <div class="text-xs ${isCrt ? 'font-mono' : 'font-sans'} mb-2">
            <div class="flex items-center justify-between font-bold mb-1">
              <span class="${isWin ? (isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700') : (isCrt ? 'text-emerald-600' : 'text-purple-700')}">${teamName}:</span>
              <span class="font-black text-sm ${isWin ? (isCrt ? 'text-emerald-300' : 'text-pink-700') : (isCrt ? 'text-emerald-600' : 'text-purple-700')}">${myScore.toFixed(2)}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] ${isCrt ? 'text-emerald-500' : 'text-purple-700'}">
              <span>vs ${oppTeam} [${oppOwner}]:</span>
              <span class="font-mono">${oppScore.toFixed(2)}</span>
            </div>
            <div class="text-[10px] text-right mt-1 ${isCrt ? 'text-emerald-600' : 'text-pink-600'}">
              Margin: <strong>${isWin ? '+' : '-'}${margin.toFixed(2)} pts</strong>
            </div>
          </div>

          <!-- Coaching Efficiency & Optimal -->
          ${myLineup ? `
            <div class="p-1.5 rounded ${isCrt ? 'bg-emerald-950/40 border border-emerald-900 text-emerald-300 font-mono' : 'bg-pink-50 border border-pink-200 text-purple-900'} text-[10px] flex items-center justify-between">
              <span>🧠 Coaching Eff: <strong>${myLineup.coachingEfficiency}%</strong></span>
              <span>Opt: <strong>${myLineup.optimalScore?.toFixed(1)}</strong></span>
            </div>
          ` : ''}

          ${dOhBadge}
        </div>

        ${lineupExpanderBtn}
      </div>
    `;

    const fullWidthDrawer = lineupMatch ? `
      <div id="matchup-lineup-content-${mId}" class="col-span-full hidden my-3 p-4 crt-box rounded-2xl border ${isCrt ? 'bg-black/95 border-emerald-500 text-emerald-300' : 'bg-white border-2 border-pink-300 shadow-2xl text-purple-950'} transition-all">
        <div class="flex justify-between items-center pb-2 mb-3 border-b ${isCrt ? 'border-emerald-800 font-mono' : 'border-pink-200 font-fredoka'}">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700'}">📋 WEEK ${wk} FULL BOX SCORE &amp; ROSTERS: ${teamName} vs ${oppTeam}</span>
          </div>
          <button type="button" onclick="window.toggleMatchupLineupBox('${mId}')" class="px-3 py-1 ${isCrt ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900' : 'bg-pink-100 text-pink-700 border border-pink-300 hover:bg-pink-200'} font-bold text-xs rounded-full transition-all cursor-pointer">
            ✕ Close Box Score
          </button>
        </div>
        ${buildMatchupLineupCardHtml({ matchup: lineupMatch, theme })}
      </div>
    ` : '';

    return cardContent + fullWidthDrawer;
  }).join('');

  const winPct = (totalWins + totalLosses > 0) ? Math.round((totalWins / (totalWins + totalLosses)) * 1000) / 10 : 0;
  const avgEff = (totalOpt > 0) ? ((totalPF / totalOpt) * 100).toFixed(1) : '-';

  return `
    <div class="space-y-4">
      <!-- Manager Summary Banner -->
      <div class="crt-box rounded-2xl p-4 border ${isCrt ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300 font-mono' : 'bg-gradient-to-r from-pink-100 via-purple-50 to-pink-50 border-2 border-pink-300 text-purple-950 font-sans shadow-md'}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">&gt;_ MANAGER_SEASON_SCHEDULE_LOG</span>
            <h3 class="text-xl font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700 font-fredoka'}">${owner} — ${season} Season Game Log</h3>
          </div>
          <div class="flex items-center gap-3 flex-wrap text-center text-xs">
            <div class="px-3 py-1.5 rounded border ${isCrt ? 'bg-black border-emerald-700' : 'bg-white border-pink-300 shadow-sm'}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">RECORD</span>
              <span class="font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${totalWins}-${totalLosses} (${winPct}%)</span>
            </div>
            <div class="px-3 py-1.5 rounded border ${isCrt ? 'bg-black border-emerald-700' : 'bg-white border-pink-300 shadow-sm'}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">TOTAL PF</span>
              <span class="font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${totalPF.toFixed(1)}</span>
            </div>
            <div class="px-3 py-1.5 rounded border ${isCrt ? 'bg-black border-emerald-700' : 'bg-white border-pink-300 shadow-sm'}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">COACHING EFF</span>
              <span class="font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${avgEff}${avgEff !== '-' ? '%' : ''}</span>
            </div>
            <div class="px-3 py-1.5 rounded border ${isCrt ? 'bg-black border-emerald-700' : 'bg-white border-pink-300 shadow-sm'}">
              <span class="text-[10px] uppercase font-bold text-red-500 block">D'OHS</span>
              <span class="font-extrabold text-red-400">🤦‍♂️ ${totalDOhs}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Games Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
        ${gameCards}
      </div>
    </div>
  `;
}
