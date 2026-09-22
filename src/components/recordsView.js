/**
 * Stat Records Showcase Component
 * Features Top 10 Records with Category Descriptions, 🏅 Podium (Top 3),
 * and 📋 Ranks 4–10 Leaderboard Table.
 */

import { getStatCardLeaderboard, RECORD_CATEGORY_METADATA } from '../analytics/statRecords.js';
import { CRT_THEME } from '../theme/theme.js';
import { escapeHtml } from '../core/sanitizer.js';

export const RECORD_KEYS = [
  'juggernaut',
  'featherweight',
  'cakewalk',
  'nailbiter',
  'gutpunch',
  'criminal',
  'victoryLap',
  'dumpsterFire'
];

/**
 * Builds the horizontal category switcher pills
 */
export function buildRecordsCategoryPillsHtml({ selectedCategory = 'all', season = 'allTime', theme = CRT_THEME }) {
  const isCrt = theme.name !== 'pride';
  const isPlayoffs = season === 'playoffs';

  const pills = [
    { key: 'all', icon: '🏆', label: 'ALL CATEGORIES' }
  ];

  RECORD_KEYS.forEach(k => {
    const meta = RECORD_CATEGORY_METADATA[k];
    if (meta) {
      const label = isPlayoffs ? meta.playoffTitle : meta.title;
      pills.push({ key: k, icon: meta.icon, label });
    }
  });

  const buttonsHtml = pills.map(p => {
    const isActive = selectedCategory === p.key;
    let activeClass = '';
    if (isActive) {
      activeClass = isCrt
        ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md'
        : 'bg-pink-500 text-white border-pink-600 font-black shadow-md';
    } else {
      activeClass = isCrt
        ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/80 font-bold'
        : 'bg-white hover:bg-pink-50 text-purple-900 border border-pink-200 font-bold';
    }

    return `
      <button
        type="button"
        onclick="window.selectRecordCategory && window.selectRecordCategory('${p.key}')"
        class="px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${activeClass}"
        title="View ${escapeHtml(p.label)} Records"
      >
        <span>${p.icon}</span>
        <span>${escapeHtml(p.label)}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 border-b ${isCrt ? 'border-emerald-800/60' : 'border-pink-200'}">
      ${buttonsHtml}
    </div>
  `;
}

/**
 * Builds an individual podium card (1st Gold, 2nd Silver, 3rd Bronze)
 */
export function buildPodiumCardHtml({ rank, item, theme = CRT_THEME }) {
  if (!item) return '';
  const isCrt = theme.name !== 'pride';

  const safeHome = (item.homeOwner || item.owner || '').replace(/'/g, "\\'");
  const safeAway = (item.awayOwner || item.oppOwner || '').replace(/'/g, "\\'");
  const hasMatchup = Boolean(item.year && item.week);
  const clickAttr = hasMatchup
    ? `onclick="event.stopPropagation(); window.jumpToMatchup && window.jumpToMatchup(${item.year}, ${item.week}, '${safeHome}', '${safeAway}')"`
    : '';

  let rankBadge = '';
  let containerStyle = '';
  let valColor = '';
  let orderClass = '';
  let boxBtnStyle = '';

  if (rank === 1) {
    orderClass = 'order-1 md:order-2 md:-mt-2';
    if (isCrt) {
      rankBadge = `<span class="bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow">🥇 1ST PLACE</span>`;
      containerStyle = 'border-2 border-amber-400/90 bg-gradient-to-b from-amber-950/40 via-black/90 to-black rounded p-3.5 text-center relative overflow-hidden shadow-[0_0_18px_rgba(245,158,11,0.25)] hover:border-amber-300 transition-all flex flex-col justify-between min-h-[195px]';
      valColor = 'text-2xl font-black text-amber-300 tracking-wide font-mono mt-2 crt-glow';
      boxBtnStyle = 'bg-amber-950/80 hover:bg-amber-900 border border-amber-500/80 text-amber-300';
    } else {
      rankBadge = `<span class="bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-black px-3 py-0.5 rounded-full text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow">🥇 1ST PLACE</span>`;
      containerStyle = 'border-2 border-amber-400 bg-gradient-to-b from-amber-50/90 via-white to-white rounded-2xl p-4 text-center relative overflow-hidden shadow-md hover:border-amber-500 transition-all flex flex-col justify-between min-h-[195px]';
      valColor = 'text-2xl font-black text-amber-800 tracking-wide font-sans mt-2';
      boxBtnStyle = 'bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 rounded-xl';
    }
  } else if (rank === 2) {
    orderClass = 'order-2 md:order-1';
    if (isCrt) {
      rankBadge = `<span class="bg-slate-300 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">🥈 2ND PLACE</span>`;
      containerStyle = 'border border-slate-400/80 bg-gradient-to-b from-slate-900/40 via-black/90 to-black rounded p-3 text-center relative overflow-hidden shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between min-h-[180px]';
      valColor = 'text-xl font-black text-slate-200 tracking-wide font-mono mt-2';
      boxBtnStyle = 'bg-slate-900/80 hover:bg-slate-800 border border-slate-500 text-slate-300';
    } else {
      rankBadge = `<span class="bg-slate-200 text-slate-800 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">🥈 2ND PLACE</span>`;
      containerStyle = 'border border-slate-300 bg-gradient-to-b from-slate-50/80 via-white to-white rounded-2xl p-3.5 text-center relative overflow-hidden shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between min-h-[180px]';
      valColor = 'text-xl font-black text-slate-700 tracking-wide font-sans mt-2';
      boxBtnStyle = 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl';
    }
  } else {
    orderClass = 'order-3 md:order-3';
    if (isCrt) {
      rankBadge = `<span class="bg-amber-700 text-amber-100 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">🥉 3RD PLACE</span>`;
      containerStyle = 'border border-amber-700/80 bg-gradient-to-b from-amber-950/25 via-black/90 to-black rounded p-3 text-center relative overflow-hidden shadow-sm hover:border-amber-600 transition-all flex flex-col justify-between min-h-[180px]';
      valColor = 'text-xl font-black text-amber-400 tracking-wide font-mono mt-2';
      boxBtnStyle = 'bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-400';
    } else {
      rankBadge = `<span class="bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">🥉 3RD PLACE</span>`;
      containerStyle = 'border border-amber-300 bg-gradient-to-b from-amber-50/50 via-white to-white rounded-2xl p-3.5 text-center relative overflow-hidden shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between min-h-[180px]';
      valColor = 'text-xl font-black text-amber-700 tracking-wide font-sans mt-2';
      boxBtnStyle = 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl';
    }
  }

  const jumpButton = hasMatchup
    ? `
      <button
        type="button"
        ${clickAttr}
        class="mt-2.5 w-full py-1 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm ${boxBtnStyle}"
        title="Jump to ${item.year} Week ${item.week} Matchup Box Score"
      >
        <span>📋 Box Score ➔</span>
      </button>
    `
    : '';

  return `
    <div class="${containerStyle} ${orderClass}">
      <div>
        <div>${rankBadge}</div>
        <div class="${valColor}">${escapeHtml(item.valStr || '')}</div>
        <div class="mt-1">
          <span class="text-sm font-bold ${isCrt ? 'text-emerald-200' : 'text-purple-950'}">${escapeHtml(item.owner || '-')}</span>
          <span class="text-xs ${isCrt ? 'text-emerald-400/80 font-mono' : 'text-pink-600 font-medium'} truncate block">${escapeHtml(item.team || item.owner || '-')}</span>
        </div>
        <div class="text-[11px] ${isCrt ? 'text-emerald-400/90 font-mono' : 'text-purple-700/90'} mt-1 italic">${escapeHtml(item.sub || '')}</div>
      </div>
      <div>
        ${jumpButton}
      </div>
    </div>
  `;
}

/**
 * Builds the Leaderboard Table for Ranks 4–10
 */
export function buildLeaderboardTableHtml({ items = [], theme = CRT_THEME, startIndex = 4 }) {
  if (!items || items.length === 0) return '';
  const isCrt = theme.name !== 'pride';

  const rowsHtml = items.map((item, idx) => {
    const rank = startIndex + idx;
    const safeHome = (item.homeOwner || item.owner || '').replace(/'/g, "\\'");
    const safeAway = (item.awayOwner || item.oppOwner || '').replace(/'/g, "\\'");
    const hasMatchup = Boolean(item.year && item.week);
    const clickAttr = hasMatchup
      ? `onclick="event.stopPropagation(); window.jumpToMatchup && window.jumpToMatchup(${item.year}, ${item.week}, '${safeHome}', '${safeAway}')"`
      : '';

    const rowClass = isCrt
      ? 'border-b border-emerald-950/80 hover:bg-emerald-950/50 group cursor-pointer transition-colors text-xs font-mono'
      : 'border-b border-pink-100 hover:bg-pink-50/80 group cursor-pointer transition-colors text-xs font-sans';

    const rankBadgeClass = isCrt
      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
      : 'bg-pink-50 text-pink-700 border border-pink-200';

    const valColor = isCrt ? 'text-emerald-300 font-extrabold font-mono' : 'text-pink-600 font-extrabold font-mono';
    const ownerColor = isCrt ? 'text-emerald-200 font-bold' : 'text-purple-950 font-bold';
    const teamColor = isCrt ? 'text-emerald-500 text-[11px]' : 'text-purple-600 text-[11px]';
    const subColor = isCrt ? 'text-emerald-400/90 italic text-[11px] font-mono' : 'text-purple-700/90 italic text-[11px]';

    const actionCell = hasMatchup
      ? `
        <button
          type="button"
          ${clickAttr}
          class="py-0.5 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm ${isCrt ? 'bg-emerald-900/80 group-hover:bg-emerald-800 text-emerald-300 border border-emerald-700' : 'bg-pink-100 group-hover:bg-pink-200 text-pink-800 border border-pink-300'}"
        >
          📋 Box ➔
        </button>
      `
      : '<span class="text-[11px] opacity-40">-</span>';

    return `
      <tr class="${rowClass}" ${clickAttr} title="${hasMatchup ? `Click to jump to ${item.year} Week ${item.week} Matchup` : ''}">
        <td class="py-1.5 px-3">
          <span class="px-1.5 py-0.5 rounded font-bold text-[11px] ${rankBadgeClass}">#${rank}</span>
        </td>
        <td class="py-1.5 px-3 ${valColor}">
          ${escapeHtml(item.valStr || '')}
        </td>
        <td class="py-1.5 px-3">
          <span class="${ownerColor}">${escapeHtml(item.owner || '-')}</span>
          <span class="${teamColor}">(${escapeHtml(item.team || item.owner || '-')})</span>
        </td>
        <td class="py-1.5 px-3 ${subColor}">
          ${escapeHtml(item.sub || '')}
        </td>
        <td class="py-1.5 px-3 text-right">
          ${actionCell}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="mt-3 space-y-1.5">
      <div class="flex items-center justify-between text-[11px] font-bold ${isCrt ? 'text-emerald-500' : 'text-pink-600'} uppercase tracking-wider px-1">
        <span>&gt; RANKS 4–10:</span>
        <span class="text-[10px] font-normal opacity-75">${isCrt ? 'Click row to jump to matchup' : 'Click row to view box score'}</span>
      </div>
      <div class="overflow-x-auto rounded border ${isCrt ? 'border-emerald-900/60 bg-black/60' : 'border-pink-200 bg-white'} shadow-sm">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="${isCrt ? 'bg-emerald-950/80 text-emerald-400 border-b border-emerald-900' : 'bg-pink-100/70 text-purple-900 border-b border-pink-200'} text-[10px] font-bold uppercase tracking-wider">
              <th class="py-1.5 px-3">Rank</th>
              <th class="py-1.5 px-3">Record Value</th>
              <th class="py-1.5 px-3">Manager & Team</th>
              <th class="py-1.5 px-3">Matchup Context</th>
              <th class="py-1.5 px-3 text-right">Box Score</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Builds the complete showcase block for a single category
 */
export function buildSingleCategoryShowcaseHtml({
  catKey,
  leagueData,
  season = 'allTime',
  isModernEra = false,
  theme = CRT_THEME
}) {
  const isCrt = theme.name !== 'pride';
  const meta = RECORD_CATEGORY_METADATA[catKey] || {
    title: catKey.toUpperCase(),
    playoffTitle: catKey.toUpperCase(),
    icon: '📊',
    badge: 'Record',
    description: 'League stat record holders.'
  };

  const isPlayoffs = season === 'playoffs';
  const title = isPlayoffs ? (meta.playoffTitle || meta.title) : meta.title;
  const items = getStatCardLeaderboard(leagueData, catKey, season, 10);

  let scopeBadge = '';
  if (season === 'allTime') {
    scopeBadge = isModernEra ? 'MODERN ERA (2022+)' : 'ALL-TIME';
  } else if (season === 'playoffs') {
    scopeBadge = isModernEra ? 'MODERN PLAYOFFS' : 'ALL-TIME PLAYOFFS';
  } else {
    scopeBadge = `${season} SEASON`;
  }

  const top3 = items.slice(0, 3);
  const ranks4to10 = items.slice(3, 10);

  let podiumHtml = '';
  if (top3.length === 0) {
    podiumHtml = `<div class="py-4 text-center text-xs ${isCrt ? 'text-emerald-600' : 'text-purple-600'} italic">No records logged yet for this category</div>`;
  } else {
    const card1 = top3[0] ? buildPodiumCardHtml({ rank: 1, item: top3[0], theme }) : '';
    const card2 = top3[1] ? buildPodiumCardHtml({ rank: 2, item: top3[1], theme }) : '';
    const card3 = top3[2] ? buildPodiumCardHtml({ rank: 3, item: top3[2], theme }) : '';

    podiumHtml = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
        ${card2}
        ${card1}
        ${card3}
      </div>
    `;
  }

  const tableHtml = buildLeaderboardTableHtml({ items: ranks4to10, theme, startIndex: 4 });

  const containerClass = isCrt
    ? 'crt-box rounded p-4 border border-emerald-800/80 bg-black/40 space-y-4'
    : 'rounded-2xl p-4 sm:p-5 border border-pink-200 bg-white shadow-sm space-y-4';

  return `
    <div class="${containerClass}" id="record-category-${catKey}">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b ${isCrt ? 'border-emerald-900/80' : 'border-pink-100'} pb-2.5">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xl sm:text-2xl">${meta.icon}</span>
            <h3 class="text-base sm:text-lg font-black ${isCrt ? 'text-emerald-300' : 'text-purple-950'} font-mono uppercase tracking-wide">&gt; ${escapeHtml(title)}</h3>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCrt ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-pink-100 text-pink-800 border border-pink-200'}">${escapeHtml(meta.badge)}</span>
          </div>
          <p class="text-xs ${isCrt ? 'text-emerald-400/80' : 'text-purple-700/80'} mt-1 italic">${escapeHtml(meta.description)}</p>
        </div>
        <div class="flex items-center gap-1.5 self-start sm:self-auto">
          <span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold ${isCrt ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/80' : 'bg-purple-100 text-purple-800 border border-purple-200'}">${escapeHtml(scopeBadge)}</span>
        </div>
      </div>

      ${podiumHtml}
      ${tableHtml}
    </div>
  `;
}

/**
 * Builds the complete Records Showcase including category pills and all categories (or filtered category).
 */
export function buildRecordsShowcaseHtml({
  leagueData,
  season = 'allTime',
  selectedCategory = 'all',
  isModernEra = false,
  theme = CRT_THEME
}) {
  const pillsHtml = buildRecordsCategoryPillsHtml({ selectedCategory, season, theme });

  let categoriesToRender = [];
  if (selectedCategory && selectedCategory !== 'all' && RECORD_KEYS.includes(selectedCategory)) {
    categoriesToRender = [selectedCategory];
  } else {
    categoriesToRender = RECORD_KEYS;
  }

  const categoryBlocksHtml = categoriesToRender.map(catKey => {
    return buildSingleCategoryShowcaseHtml({
      catKey,
      leagueData,
      season,
      isModernEra,
      theme
    });
  }).join('');

  return `
    <div class="space-y-4">
      ${pillsHtml}
      <div class="space-y-6 mt-2">
        ${categoryBlocksHtml}
      </div>
    </div>
  `;
}
