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

      const listStr = list.map(item => `
        <div class="py-0.5">• ${item.year}: <span class="font-bold ${dTheme.accentText}">${item.teamName || owner}</span> <span class="text-[10px] opacity-75">(${item.rank}${item.rank === 1 ? 'st' : (item.rank === 2 ? 'nd' : (item.rank === 3 ? 'rd' : 'th'))} Place)</span></div>
      `).join('');

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
      const listStr = scChamps.map(ch => `<div class="py-0.5">• ${ch.seasonYear}: <span class="font-bold ${dTheme.accentText}">${ch.scoringChampTeam}</span> (${ch.scoringChampPF ? ch.scoringChampPF.toFixed(1) : ''} PF)</div>`).join('');
      scHtml = `
        <div class="tooltip-trigger tooltip-right inline-block cursor-pointer">
          <span class="px-2 py-0.5 ${dTheme.scoringTitles.badge}">🎯 ${scTitles}</span>
          <div class="tooltip-content${rowPopDir} p-3 ${dTheme.scoringTitles.container} text-xs shadow-2xl text-left min-w-[220px] z-50">
            <div class="font-bold ${dTheme.accentText} border-b border-current/20 pb-1 mb-1 font-mono">🎯 ${owner}'s Scoring Titles (${scTitles})</div>
            ${listStr}
          </div>
        </div>
      `;
    }

    let playoffHtml = `<span class="font-bold ${dTheme.accentText}">${entry.playoffPct}%</span>`;
    if (entry.playoffYears && entry.playoffYears.length > 0) {
      const listStr = entry.playoffYears.map(yr => `<div class="py-0.5 text-xs text-left">• ${yr} Playoff Qualifier</div>`).join('');
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
      const listStr = details.map(d => `
        <div class="py-0.5">• ${d.year ? `${d.year} ` : ''}W${d.week}: Benched <span class="font-bold text-emerald-400">${d.benchPlayer}</span> (${d.benchPoints} pts) for <span class="text-red-400">${d.starter}</span> (${d.starterPoints} pts) ➔ <span class="text-amber-400 font-bold">+${d.netGain} PF Missed</span></div>
      `).join('');

      dOhHtml = `
        <div class="tooltip-trigger inline-block cursor-pointer">
          <span class="px-2 py-0.5 bg-red-950 text-red-400 border border-red-700 font-extrabold rounded text-xs shadow-sm">🤦‍♂️ ${dOhCount}</span>
          <div class="tooltip-content${rowPopDir} p-3 ${dTheme.scoringTitles.container} text-xs shadow-2xl text-left min-w-[280px] z-50">
            <div class="font-bold text-red-400 border-b border-current/20 pb-1 mb-1 font-mono">🤦‍♂️ ${owner}'s D'Oh! Blunders (${dOhCount})</div>
            ${listStr || '<div class="text-xs opacity-75">1-player swap win opportunities missed</div>'}
            <div class="text-[10px] text-amber-400 font-bold pt-1 mt-1 border-t border-emerald-900 text-center">
              Losses that would have been wins with 1 bench swap
            </div>
          </div>
        </div>
      `;
    }

    const coachingEff = entry.coachingEfficiency ? `${entry.coachingEfficiency.toFixed(1)}%` : '-';

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
