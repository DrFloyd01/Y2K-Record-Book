/**
 * Standings & Dynasty Leaderboard Component Renderers
 */
import { CRT_THEME } from '../theme/theme.js';

/**
 * Builds HTML table rows for the Dynasty Leaderboard
 */
export function buildDynastyLeaderboardRows({ leaderboard = [], championships = [], theme = CRT_THEME }) {
  const dTheme = theme.dynasty || CRT_THEME.dynasty;

  return leaderboard.map((entry, idx) => {
    const owner = entry.ownerName;
    const c = entry.championships || {};
    const finishes = entry.finishes || {};
    const scTitles = c.scoringTitles || 0;
    const rowPopDir = idx < 6 ? ' tooltip-content-bottom' : '';

    function formatBinTooltip(title, binKey) {
      const binCfg = dTheme.bins[binKey] || { badge: '', border: '' };
      const list = finishes[binKey] || [];
      const count = list.length;
      if (count === 0) return `<span class="opacity-40 font-bold">0</span>`;

      const listStr = list.map(item => {
        const finalWk = item.year >= 2021 ? 17 : 16;
        const clickAttr = item.year ? `onclick="event.stopPropagation(); window.jumpToMatchup(${item.year}, ${finalWk}, '${(owner || '').replace(/'/g, "\\'")}')"` : '';
        return `
          <div class="py-0.5 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors flex items-center justify-between group/bin" ${clickAttr} title="Jump to ${item.year} Playoff Matchup">
            <span>• ${item.year}: <span class="font-bold ${dTheme.accentText}">${item.teamName || owner}</span> <span class="text-[10px] opacity-75">(${item.rank}${item.rank === 1 ? 'st' : (item.rank === 2 ? 'nd' : (item.rank === 3 ? 'rd' : 'th'))} Place)</span></span>
            <span class="text-[9px] opacity-0 group-hover/bin:opacity-100 transition-opacity font-mono font-bold text-amber-400 ml-1">📋 Box ➔</span>
          </div>
        `;
      }).join('');

      return `
        <div class="tooltip-trigger inline-block cursor-pointer">
          <span class="px-2 py-0.5 ${binCfg.badge} font-extrabold border ${binCfg.border} rounded text-xs shadow-sm">${count}</span>
          <div class="tooltip-content${rowPopDir} p-3 ${dTheme.scoringTitles.container} text-xs shadow-2xl text-left min-w-[220px] z-50">
            <div class="font-bold ${dTheme.accentText} border-b border-current/20 pb-1 mb-1 font-mono">${title} (${count})</div>
            ${listStr}
          </div>
        </div>
      `;
    }

    const firstsHtml = formatBinTooltip('🏆 1st Place Championships', '1st');
    const secondsHtml = formatBinTooltip('🥈 2nd Place Runner-Up', '2nd');
    const thirdsHtml = formatBinTooltip('🥉 3rd Place Finishes', '3rd');
    const fourthsHtml = formatBinTooltip('🏅 4th Place Finishes', '4th');
    const fifthSixthHtml = formatBinTooltip('⭐ 5th/6th Place Finishes', '5th_6th');
    const seventhTwelfthHtml = formatBinTooltip('📉 7th-12th Place (Consolation/Drought)', '7th_12th');

    let scHtml = `<span class="opacity-40 font-bold">0</span>`;
    if (scTitles > 0) {
      const scChamps = championships.filter(ch => ch.scoringChampOwner === owner);
      const listStr = scChamps.map(ch => {
        const clickAttr = `onclick="event.stopPropagation(); window.jumpToMatchup(${ch.seasonYear}, 1, '${(owner || '').replace(/'/g, "\\'")}')"`;
        return `
          <div class="py-0.5 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors flex items-center justify-between group/sc" ${clickAttr} title="Jump to ${ch.seasonYear} Season">
            <span>• ${ch.seasonYear}: <span class="font-bold ${dTheme.accentText}">${ch.scoringChampTeam}</span> (${ch.scoringChampPF ? ch.scoringChampPF.toFixed(1) : ''} PF)</span>
            <span class="text-[9px] opacity-0 group-hover/sc:opacity-100 transition-opacity font-mono font-bold text-amber-400 ml-1">📋 Box ➔</span>
          </div>
        `;
      }).join('');
      scHtml = `
        <div class="tooltip-trigger inline-block cursor-pointer">
          <span class="px-2 py-0.5 ${dTheme.scoringTitles.badge}">🎯 ${scTitles}</span>
          <div class="tooltip-content tooltip-content-right${rowPopDir} p-3 ${dTheme.scoringTitles.container} text-xs shadow-2xl text-left min-w-[220px] z-50">
            <div class="font-bold ${dTheme.accentText} border-b border-current/20 pb-1 mb-1 font-mono">🎯 ${owner}'s Scoring Titles (${scTitles})</div>
            ${listStr}
          </div>
        </div>
      `;
    }

    let playoffHtml = `<span class="font-bold ${dTheme.accentText}">${entry.playoffPct}%</span>`;
    if (entry.playoffYears && entry.playoffYears.length > 0) {
      const listStr = entry.playoffYears.map(yr => {
        const playWk = yr >= 2021 ? 15 : 14;
        const clickAttr = `onclick="event.stopPropagation(); window.jumpToMatchup(${yr}, ${playWk}, '${(owner || '').replace(/'/g, "\\'")}')"`;
        return `
          <div class="py-0.5 text-xs text-left cursor-pointer hover:bg-white/10 px-1 rounded transition-colors flex items-center justify-between group/po" ${clickAttr} title="Jump to ${yr} Playoffs">
            <span>• ${yr} Playoff Qualifier</span>
            <span class="text-[9px] opacity-0 group-hover/po:opacity-100 transition-opacity font-mono font-bold text-amber-400 ml-1">📋 Box ➔</span>
          </div>
        `;
      }).join('');
      playoffHtml = `
        <div class="tooltip-trigger inline-block cursor-pointer">
          <span class="px-2 py-0.5 ${dTheme.playoffApps.badge}">${entry.playoffPct}%</span>
          <div class="tooltip-content${rowPopDir} p-3 ${dTheme.playoffApps.container} text-xs shadow-2xl z-50">
            <div class="font-bold ${dTheme.accentText} border-b border-current/20 pb-1 mb-1 font-mono">🏈 ${owner}'s Playoff Apps (${entry.playoffApps}/${entry.seasonsCount})</div>
            ${listStr}
          </div>
        </div>
      `;
    }

    let dOhHtml = `<span class="opacity-40 font-bold">0</span>`;
    const dOhCount = entry.dOhs || 0;
    if (dOhCount > 0) {
      const details = entry.dOhDetails || [];
      const isPride = theme.name === 'pride';
      const badgeCls = isPride
        ? 'px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 font-extrabold rounded-lg text-xs shadow-sm hover:bg-red-200 transition-all'
        : 'px-2 py-0.5 bg-red-950 text-red-400 border border-red-700 font-extrabold rounded text-xs shadow-sm hover:bg-red-900 transition-all';

      const listStr = details.map(d => {
        const benchCls = isPride ? 'font-bold text-pink-700' : 'font-bold text-emerald-400';
        const startCls = isPride ? 'text-red-600' : 'text-red-400';
        const gainCls = isPride ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold';
        const targetYr = d.year || (typeof currentSeason !== 'undefined' ? currentSeason : '');
        const clickAttr = `onclick="event.stopPropagation(); window.jumpToMatchup(${targetYr || 'window.currentMatchupSeason'}, ${d.week}, '${owner}')"`;
        return `
          <div class="py-1 px-1.5 rounded hover:bg-white/10 transition-all flex items-center justify-between cursor-pointer group" ${clickAttr} title="Click to view Week ${d.week} Matchup & Box Score">
            <div class="text-left">• ${d.year ? `${d.year} ` : ''}W${d.week}: Benched <span class="${benchCls}">${d.benchPlayer}</span> (${d.benchPoints} pts) for <span class="${startCls}">${d.starter}</span> (${d.starterPoints} pts) ➔ <span class="${gainCls}">+${d.netGain} PF</span></div>
            <span class="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0 font-bold ${isPride ? 'text-pink-600' : 'text-amber-400 font-mono'}">➔ Box</span>
          </div>
        `;
      }).join('');

      dOhHtml = `
        <div class="tooltip-trigger inline-block cursor-pointer">
          <span class="${badgeCls}">🤦‍♂️ ${dOhCount}</span>
          <div class="tooltip-content tooltip-content-right${rowPopDir} p-3 ${dTheme.scoringTitles.container} text-xs shadow-2xl text-left min-w-[280px] z-50">
            <div class="font-bold text-red-500 border-b border-current/20 pb-1 mb-1 font-mono">🤦‍♂️ ${owner}'s D'Oh! Blunders (${dOhCount})</div>
            ${listStr || '<div class="text-xs opacity-75">1-player swap win opportunities missed</div>'}
            <div class="text-[10px] text-amber-500 font-bold pt-1 mt-1 border-t border-current/20 text-center">
              💡 Click any blunder to view full matchup box score
            </div>
          </div>
        </div>
      `;
    }

    const coachingEff = (entry.coachingEfficiency !== null && entry.coachingEfficiency !== undefined) ? `${parseFloat(entry.coachingEfficiency).toFixed(1)}%` : '-';

    const pWlStr = entry.playoffRecord || `${entry.playoffWins || 0}-${entry.playoffLosses || 0}`;
    const pWinPct = entry.playoffWinPct || 0;

    return `
      <tr class="${dTheme.rowClass}">
        <td class="p-3 text-center font-bold ${dTheme.rankClass}">${idx + 1}</td>
        <td class="p-3 font-bold ${dTheme.ownerClass} cursor-pointer hover:underline" data-owner="${encodeURIComponent(owner)}" onclick="selectManagerProfile(decodeURIComponent(this.getAttribute('data-owner')))">${entry.ownerName}</td>
        <td class="p-3 text-center text-xs ${dTheme.rankClass}">${entry.seasonsCount} Yrs</td>
        <td class="p-3 text-center font-bold ${dTheme.ownerClass}">${pWlStr} <span class="text-[10px] opacity-75 font-normal block">${pWinPct}%</span></td>
        <td class="p-3 text-center">${playoffHtml}</td>
        <td class="p-3 text-center">${firstsHtml}</td>
        <td class="p-3 text-center">${secondsHtml}</td>
        <td class="p-3 text-center">${thirdsHtml}</td>
        <td class="p-3 text-center">${fourthsHtml}</td>
        <td class="p-3 text-center">${fifthSixthHtml}</td>
        <td class="p-3 text-center">${seventhTwelfthHtml}</td>
        <td class="p-3 text-center">${scHtml}</td>
        <td class="p-3 text-center font-bold font-mono ${dTheme.accentText}">${coachingEff}</td>
        <td class="p-3 text-center">${dOhHtml}</td>
      </tr>
    `;
  }).join('');
}
