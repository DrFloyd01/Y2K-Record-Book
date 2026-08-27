/**
 * Managerial Prowess & Lineup Viewport Component
 *
 * Renders:
 * 1. Season & All-Time Selector Filter
 * 2. The "D'Oh!" Hall of Agony & Blunder Counter 🤦‍♂️
 * 3. Coaching Efficiency & Optimal Lineup Leaderboard
 * 4. Preseason Placeholders for 2026
 * 5. Side-by-side Roster & Box Score Lineup Card
 */
import { CRT_THEME } from '../theme/theme.js';
import { computeOptimalLineup } from '../analytics/managerial.js';

/**
 * Builds HTML for The "D'Oh!" Hall of Agony & Managerial Efficiency Portal
 */
export function buildManagerialProwessHtml({
  leaderboard = [],
  theme = CRT_THEME,
  selectedSeason = 'allTime',
  seasons = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]
}) {
  const isCrt = theme.name === 'crt';
  const is2026 = selectedSeason === 2026 || selectedSeason === '2026';

  // Build Season Selector Options
  let seasonOptionsHtml = `<option value="allTime" ${selectedSeason === 'allTime' ? 'selected' : ''}>🌟 ALL-TIME CAREER TOTALS</option>`;
  seasons.forEach(yr => {
    seasonOptionsHtml += `<option value="${yr}" ${String(selectedSeason) === String(yr) ? 'selected' : ''}>${yr} SEASON ${yr === 2026 ? '(UPCOMING)' : ''}</option>`;
  });

  const selectorBarHtml = `
    <div class="crt-box rounded p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCrt ? 'border-emerald-800 bg-black/80 font-mono' : 'border-pink-200 bg-white font-sans'}">
      <div class="flex items-center gap-2">
        <span class="text-xl">🧠</span>
        <div>
          <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">&gt;_ MANAGERIAL_ANALYSIS_SCOPE</span>
          <span class="text-xs font-bold ${isCrt ? 'text-emerald-300' : 'text-purple-950'}">Filter Coaching Efficiency &amp; D'Ohs by Season</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-bold uppercase ${isCrt ? 'text-emerald-400' : 'text-purple-700'}">&gt; SCOPE:</label>
        <select id="managerial-season-select" onchange="window.onManagerialSeasonChange(this.value)"
          class="${isCrt ? 'bg-black border border-emerald-600 text-emerald-300' : 'bg-white border border-pink-300 text-purple-950'} text-xs p-1.5 rounded font-bold font-mono">
          ${seasonOptionsHtml}
        </select>
      </div>
    </div>
  `;

  // Preseason Mode for 2026 (Week 0)
  if (is2026) {
    return `
      ${selectorBarHtml}
      <div class="crt-box rounded-2xl p-8 text-center ${isCrt ? 'border-emerald-700 bg-black/90 font-mono' : 'cute-card font-sans'} mb-6">
        <div class="text-3xl mb-2">🏈⏱️</div>
        <div class="text-xs ${isCrt ? 'text-emerald-400' : 'text-pink-600'} font-bold uppercase tracking-widest mb-1">&gt;_ 2026_PRESEASON_MODE</div>
        <h3 class="text-lg font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-purple-950'}">2026 Regular Season Kicks Off Week 1!</h3>
        <p class="text-xs ${isCrt ? 'text-emerald-200/90' : 'text-purple-700'} mt-1 max-w-xl mx-auto leading-relaxed">
          Weekly player box scores, starter vs bench optimization, Coaching Efficiency ratings, and live D'Oh! blunder tracking will populate automatically as soon as Week 1 games conclude.
        </p>
        <p class="text-xs ${isCrt ? 'text-amber-400' : 'text-pink-600 font-bold'} mt-3">
          💡 Select a completed season (e.g. 2024, 2025) or ALL-TIME from the selector above to explore historical manager IQ records!
        </p>
      </div>
    `;
  }

  if (!leaderboard || leaderboard.length === 0) {
    return `
      ${selectorBarHtml}
      <div class="crt-box rounded p-8 text-center ${isCrt ? 'font-mono' : 'font-sans'}">
        <div class="text-xs ${isCrt ? 'text-emerald-500' : 'text-purple-600'} mb-1">&gt;_ NO_LINEUP_DATA_FOUND</div>
        <p class="text-sm ${isCrt ? 'text-emerald-300' : 'text-purple-950'} font-bold">No weekly lineup records found for this scope.</p>
      </div>
    `;
  }

  // Find the top D'Oh! blunder of the season
  const allDOhMoments = leaderboard
    .filter(m => m.mostPainfulDOh)
    .map(m => ({ ownerName: m.ownerName, ...m.mostPainfulDOh }))
    .sort((a, b) => b.netGain - a.netGain);

  const topDOh = allDOhMoments.length > 0 ? allDOhMoments[0] : null;

  let dOhSpotlightHtml = '';
  if (topDOh) {
    const yrLabel = topDOh.year ? `${topDOh.year} ` : '';
    dOhSpotlightHtml = `
      <div class="crt-box rounded p-4 mb-6 ${isCrt ? 'border-2 border-red-500 bg-red-950/20 font-mono' : 'border-2 border-pink-400 bg-pink-50 font-sans'}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isCrt ? 'border-red-800' : 'border-pink-200'} pb-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🤦‍♂️</span>
            <div>
              <span class="text-[10px] uppercase font-black tracking-widest ${isCrt ? 'text-red-400' : 'text-pink-700'} block">THE D'OH! OF THE SEASON SPOTLIGHT</span>
              <h3 class="text-base font-black ${isCrt ? 'text-red-300 crt-glow' : 'text-purple-950'}">${topDOh.ownerName}'s ${yrLabel}Week ${topDOh.week} Heartbreaker</h3>
            </div>
          </div>
          <span class="px-2.5 py-1 ${isCrt ? 'bg-red-950 text-red-300 border border-red-500' : 'bg-red-100 text-red-700 border border-red-300'} font-bold rounded text-xs shadow-sm">
            +${topDOh.netGain} Net PF Left on Bench
          </span>
        </div>

        <p class="text-xs ${isCrt ? 'text-emerald-200' : 'text-purple-900'} leading-relaxed mb-3">
          Starting <span class="font-bold text-red-400">${topDOh.starter} (${topDOh.starterPoints} pts)</span> instead of benched <span class="font-bold text-emerald-400">${topDOh.benchPlayer} (${topDOh.benchPoints} pts)</span> cost ${topDOh.ownerName} the matchup. A simple 1-player swap would have flipped the loss into a <span class="font-bold text-emerald-300">+${topDOh.winMargin} pt victory</span>!
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs ${isCrt ? 'font-mono' : 'font-sans'}">
          <div class="${isCrt ? 'bg-black/80 border border-emerald-900' : 'bg-white border border-pink-200'} p-2 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">BENCHED MVP</span>
            <span class="font-black text-emerald-300">${topDOh.benchPlayer}</span>
            <span class="text-[10px] text-emerald-400 block">${topDOh.benchPoints} pts</span>
          </div>
          <div class="${isCrt ? 'bg-black/80 border border-red-900' : 'bg-white border border-red-200'} p-2 rounded">
            <span class="text-[10px] uppercase font-bold text-red-400 block">STARTED INSTEAD</span>
            <span class="font-black text-red-300">${topDOh.starter}</span>
            <span class="text-[10px] text-red-400 block">${topDOh.starterPoints} pts</span>
          </div>
          <div class="${isCrt ? 'bg-black/80 border border-emerald-900' : 'bg-white border border-pink-200'} p-2 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">DEFICIT NEEDED</span>
            <span class="font-black text-amber-400">${topDOh.deficitNeeded} pts</span>
            <span class="text-[10px] text-emerald-500 block">To Tie/Win</span>
          </div>
          <div class="${isCrt ? 'bg-black/80 border border-emerald-900' : 'bg-white border border-pink-200'} p-2 rounded">
            <span class="text-[10px] uppercase font-bold text-emerald-400 block">WIN MARGIN MISSED</span>
            <span class="font-black text-emerald-300">+${topDOh.winMargin} pts</span>
            <span class="text-[10px] text-emerald-400 block">Net Win Margin</span>
          </div>
        </div>
      </div>
    `;
  }

  // Generate Leaderboard Table Rows
  const tableRowsHtml = (leaderboard || []).map((m, idx) => {
    return `
      <tr class="border-b ${isCrt ? 'border-emerald-950 hover:bg-emerald-950/30' : 'border-pink-100 hover:bg-pink-50/50'} transition-colors text-xs">
        <td class="p-2.5 text-center font-bold ${isCrt ? 'text-emerald-400' : 'text-pink-700'}">${idx + 1}</td>
        <td class="p-2.5 font-bold">
          <span class="${isCrt ? 'text-emerald-300' : 'text-purple-950'}">${m.ownerName}</span>
          ${m.teamName ? `<span class="block text-[10px] ${isCrt ? 'text-emerald-600' : 'text-purple-500'} font-normal">${m.teamName}</span>` : ''}
        </td>
        <td class="p-2.5 text-center font-bold ${isCrt ? 'font-mono text-emerald-300' : 'text-pink-700'}">${m.coachingEfficiency}%</td>
        <td class="p-2.5 text-center ${isCrt ? 'font-mono text-emerald-400' : 'font-sans text-purple-900'}">${m.actualPF}</td>
        <td class="p-2.5 text-center ${isCrt ? 'font-mono text-emerald-400' : 'font-sans text-purple-900'}">${m.optimalPF}</td>
        <td class="p-2.5 text-center ${isCrt ? 'font-mono text-amber-400' : 'font-sans text-amber-700'}">${m.pointsLeftOnBench}</td>
        <td class="p-2.5 text-center">
          ${m.dOhs > 0 ? `
            <span class="px-2 py-0.5 rounded font-black text-[11px] ${isCrt ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'}">
              🤦‍♂️ ${m.dOhs}
            </span>
          ` : `
            <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-400'}">0</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="crt-box rounded-xl p-4 sm:p-6 border ${isCrt ? 'border-emerald-700 bg-black/80 font-mono text-emerald-300' : 'border-pink-300 bg-white font-sans text-purple-950'}">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-4">
        <div>
          <h3 class="text-lg font-black ${isCrt ? 'text-amber-400 font-mono' : 'text-pink-700 font-fredoka'} flex items-center gap-2">
            <span>🧠 MANAGERIAL_PROWESS &amp; BEST BALL LEADERBOARD</span>
          </h3>
          <p class="text-xs ${isCrt ? 'text-emerald-500' : 'text-purple-700'} mt-0.5">
            Who sets the sharpest lineups vs who leaves wins on the bench.
          </p>
        </div>
        <div class="flex items-center gap-2 self-stretch sm:self-auto">
          <span class="text-xs font-bold ${isCrt ? 'text-emerald-400 font-mono' : 'text-pink-700 font-fredoka'}">SEASON:</span>
          <select id="managerial-season-select" onchange="window.onManagerialSeasonChange(this.value)" class="px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${isCrt ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 font-mono' : 'bg-pink-50 text-purple-950 border border-pink-300 font-fredoka'}">
            ${seasonOptionsHtml}
          </select>
        </div>
      </div>

      ${dOhSpotlightHtml}

      <!-- Top Summary Highlights -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div class="p-3 rounded-lg border ${isCrt ? 'bg-emerald-950/40 border-emerald-800' : 'bg-pink-50 border-pink-200'}">
          <span class="text-[10px] font-bold uppercase ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block mb-1">🎯 BEST COACH</span>
          <div class="text-sm font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-purple-950'}">${leaderboard[0]?.ownerName || '-'}</div>
          <div class="text-xs font-bold ${isCrt ? 'text-amber-400 font-mono' : 'text-pink-700'}">${leaderboard[0]?.coachingEfficiency || 0}% Accuracy</div>
        </div>

        <div class="p-3 rounded-lg border ${isCrt ? 'bg-emerald-950/40 border-emerald-800' : 'bg-purple-50 border-purple-200'}">
          <span class="text-[10px] font-bold uppercase ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block mb-1">🤦‍♂️ MOST D'OH! BLUNDERS</span>
          <div class="text-sm font-black ${isCrt ? 'text-red-400 crt-glow' : 'text-purple-950'}">
            ${[...leaderboard].sort((a,b) => b.dOhs - a.dOhs)[0]?.ownerName || '-'}
          </div>
          <div class="text-xs font-bold text-red-500 font-mono">
            ${[...leaderboard].sort((a,b) => b.dOhs - a.dOhs)[0]?.dOhs || 0} Costly Losses
          </div>
        </div>

        <div class="p-3 rounded-lg border ${isCrt ? 'bg-emerald-950/40 border-emerald-800' : 'bg-cyan-50 border-cyan-200'}">
          <span class="text-[10px] font-bold uppercase ${isCrt ? 'text-emerald-500' : 'text-cyan-700'} block mb-1">💤 BENCHED POINTS LEADER</span>
          <div class="text-sm font-black ${isCrt ? 'text-cyan-300 crt-glow' : 'text-purple-950'}">
            ${[...leaderboard].sort((a,b) => b.pointsLeftOnBench - a.pointsLeftOnBench)[0]?.ownerName || '-'}
          </div>
          <div class="text-xs font-bold ${isCrt ? 'text-cyan-400 font-mono' : 'text-cyan-700'}">
            ${[...leaderboard].sort((a,b) => b.pointsLeftOnBench - a.pointsLeftOnBench)[0]?.pointsLeftOnBench || 0} Pts Left on Bench
          </div>
        </div>
      </div>

      <!-- Leaderboard Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b ${isCrt ? 'border-emerald-800 bg-emerald-950/60 text-emerald-400 font-mono' : 'border-pink-200 bg-pink-100 text-pink-700 font-fredoka'} text-[11px]">
              <th class="p-2.5 text-center">#</th>
              <th class="p-2.5">MANAGER</th>
              <th class="p-2.5 text-center">🧠 EFFICIENCY</th>
              <th class="p-2.5 text-center">ACTUAL PF</th>
              <th class="p-2.5 text-center">OPTIMAL PF</th>
              <th class="p-2.5 text-center">BENCHED PTS</th>
              <th class="p-2.5 text-center">🤦‍♂️ D'OH!</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Rank weights for fantasy football roster slots
 */
function getStarterSlotRank(slot = '', pos = '') {
  const s = String(slot || '').toUpperCase().trim();
  const p = String(pos || '').toUpperCase().trim();

  if (s === 'QB' || p === 'QB') return 10;
  if (s.startsWith('RB') || (p === 'RB' && !s.includes('FLEX') && !s.includes('W/R'))) return 20;
  if (s.startsWith('WR') || (p === 'WR' && !s.includes('FLEX') && !s.includes('W/R'))) return 30;
  if (s.startsWith('TE') || (p === 'TE' && !s.includes('FLEX') && !s.includes('W/R'))) return 40;
  if (s.includes('FLEX') || s.includes('W/R/T') || s.includes('W/R') || s.includes('W/T') || s.includes('R/W/T') || s === 'FLX') return 50;
  if (s === 'K' || p === 'K' || s.startsWith('PK')) return 60;
  if (s.includes('DEF') || s.includes('D/ST') || s.includes('DST') || p.includes('DEF') || p.includes('DST')) return 70;
  return 80;
}

/**
 * Builds HTML for an expandable Matchup Lineup Card showing starters, bench, and optimal tags
 */
export function buildMatchupLineupCardHtml({ matchup, theme = CRT_THEME }) {
  if (!matchup) return '';
  const isCrt = theme.name === 'crt';

  function renderTeamRoster(team) {
    if (!team) return '';
    // Compute optimal lineup from all available players on this team
    const allPlayers = [...(team.starters || []), ...(team.bench || [])];
    const { optimalStarters } = computeOptimalLineup(allPlayers);
    const optPlayerNames = new Set(optimalStarters.map(p => (p.player || p.playerName || '').trim().toLowerCase()));

    // Sort starters: QB, RBs, WRs, TEs, FLEXs, K, D/ST, then points desc
    const sortedStarters = [...(team.starters || [])].sort((a, b) => {
      const rA = getStarterSlotRank(a.slot, a.position || a.normPos);
      const rB = getStarterSlotRank(b.slot, b.position || b.normPos);
      if (rA !== rB) return rA - rB;
      return Number(b.points || 0) - Number(a.points || 0);
    });

    // Sort bench: Missed optimal players first, then points desc
    const sortedBench = [...(team.bench || [])].sort((a, b) => {
      const nameA = (a.player || a.playerName || '').trim().toLowerCase();
      const nameB = (b.player || b.playerName || '').trim().toLowerCase();
      const isMissedA = optPlayerNames.has(nameA) || a.isOptimal ? 1 : 0;
      const isMissedB = optPlayerNames.has(nameB) || b.isOptimal ? 1 : 0;
      if (isMissedA !== isMissedB) return isMissedB - isMissedA;
      return Number(b.points || 0) - Number(a.points || 0);
    });

    let startersHtml = '';
    sortedStarters.forEach(p => {
      const pName = p.player || p.playerName || 'Unknown Player';
      const isOpt = optPlayerNames.has(pName.trim().toLowerCase()) || p.isOptimal;
      startersHtml += `
        <div class="flex justify-between items-center py-1.5 border-b ${isCrt ? 'border-emerald-950/60' : 'border-pink-100'} text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isCrt ? 'bg-emerald-900 text-emerald-300' : 'bg-pink-100 text-pink-700'}">${p.slot || 'STARTER'}</span>
            <span class="font-bold ${isCrt ? 'text-emerald-300' : 'text-purple-950'} truncate">${pName}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-600' : 'text-purple-500'}">${p.nflTeam || ''}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${isOpt ? `<span class="text-[9px] px-1.5 py-0.5 rounded font-black ${isCrt ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">⭐ OPT</span>` : ''}
            <span class="font-bold ${isCrt ? 'text-emerald-300 font-mono' : 'text-purple-900'}">${Number(p.points || 0).toFixed(1)}</span>
          </div>
        </div>
      `;
    });

    let benchHtml = '';
    sortedBench.forEach(p => {
      const pName = p.player || p.playerName || 'Unknown Player';
      const isMissed = optPlayerNames.has(pName.trim().toLowerCase()) || p.isOptimal;
      benchHtml += `
        <div class="flex justify-between items-center py-1.5 border-b ${isCrt ? 'border-emerald-950/40' : 'border-pink-50'} text-xs opacity-90">
          <div class="flex items-center gap-2 truncate">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isCrt ? 'bg-black text-emerald-600 border border-emerald-900' : 'bg-slate-100 text-slate-700'}">${p.slot || 'BN'}</span>
            <span class="${isCrt ? 'text-emerald-400' : 'text-purple-800'} truncate">${pName}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-400'}">${p.nflTeam || ''}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${isMissed ? `<span class="text-[9px] px-1.5 py-0.5 rounded font-black ${isCrt ? 'bg-red-950 text-red-300 border border-red-500 animate-pulse' : 'bg-red-100 text-red-700 border border-red-300 font-bold'}">⚠️ MISSED</span>` : ''}
            <span class="font-bold ${isCrt ? 'text-emerald-500 font-mono' : 'text-purple-700'}">${Number(p.points || 0).toFixed(1)}</span>
          </div>
        </div>
      `;
    });

    const dOhBanner = team.dOhOccurred && team.dOhDetails ? `
      <div class="p-2 mb-2 rounded border ${isCrt ? 'bg-red-950/40 border-red-600 text-red-300' : 'bg-red-50 border-red-300 text-red-700'} text-xs">
        🤦‍♂️ <span class="font-bold">D'OH! MOMENT:</span> Starting <b>${team.dOhDetails.starter} (${team.dOhDetails.starterPoints} pts)</b> over <b>${team.dOhDetails.benchPlayer} (${team.dOhDetails.benchPoints} pts)</b> cost this matchup!
      </div>
    ` : '';

    return `
      <div class="${isCrt ? 'bg-black/90 border border-emerald-800' : 'bg-white border border-pink-200'} p-3 rounded-xl shadow-sm">
        <div class="border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-2 mb-2 flex justify-between items-center">
          <div>
            <h4 class="font-black text-sm ${isCrt ? 'text-emerald-300 crt-glow' : 'text-purple-950'}">${team.teamName}</h4>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} font-bold">${team.ownerName}</span>
          </div>
          <div class="text-right">
            <span class="text-lg font-black ${isCrt ? 'text-emerald-300 font-mono' : 'text-pink-700'}">${team.actualScore.toFixed(1)}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block">Optimal: ${team.optimalScore.toFixed(1)} (${team.coachingEfficiency}%)</span>
          </div>
        </div>

        ${dOhBanner}

        <div class="mb-3">
          <span class="text-[10px] font-bold uppercase ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block mb-1">STARTERS</span>
          ${startersHtml}
        </div>

        <div>
          <span class="text-[10px] font-bold uppercase ${isCrt ? 'text-emerald-600' : 'text-purple-500'} block mb-1">BENCH</span>
          ${benchHtml}
        </div>
      </div>
    `;
  }

  return `
    <div class="crt-box rounded p-4 mb-4 ${isCrt ? 'border-emerald-700 font-mono' : 'border-pink-300 font-sans'}">
      <div class="flex justify-between items-center border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-2 mb-3">
        <span class="font-bold text-xs ${isCrt ? 'text-emerald-400' : 'text-pink-700'} uppercase">Week ${matchup.week} Lineup Box Score</span>
        <span class="text-xs ${isCrt ? 'text-emerald-600' : 'text-purple-700'}">Margin: ${matchup.margin} pts</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${renderTeamRoster(matchup.homeTeam)}
        ${renderTeamRoster(matchup.awayTeam)}
      </div>
    </div>
  `;
}
