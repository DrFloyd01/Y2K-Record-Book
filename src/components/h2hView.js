/**
 * Head-to-Head (H2H) Viewport Component Renderers
 */
import { CRT_THEME } from '../theme/theme.js';
import { formatPlayoffStageTag } from '../analytics/statRecords.js';

/**
 * Builds HTML for the 5-card H2H Comparison Banner
 */
export function buildH2HComparisonBannerHtml({ breakdown, theme = CRT_THEME }) {
  if (!breakdown) return '';
  const isCrt = theme.name === 'crt';

  const cardBg = isCrt ? 'bg-black/60 border border-emerald-900/80' : 'bg-white/60 border border-pink-200';
  const cardHighlight = isCrt ? 'bg-emerald-950/60 border border-emerald-700/80' : 'bg-pink-50/90/80 border border-pink-300';
  const textTitle = isCrt ? 'text-emerald-500' : 'text-purple-700';
  const textScore = isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700 crt-glow-pink-pink';
  const textSub = isCrt ? 'text-emerald-400' : 'text-pink-600';
  const amberText = isCrt ? 'text-amber-400' : 'text-amber-500';

  const maxStreakStr = breakdown.maxStreak && breakdown.maxStreak.streak > 0
    ? `<span class="font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${breakdown.maxStreak.winner} (${breakdown.maxStreak.streak} Wins)</span> <span class="text-[9px] ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block font-mono">${breakdown.maxStreak.span}</span>`
    : '-';

  return `
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center ${theme.fontFamily}">
      <div class="${cardBg} p-2 rounded">
        <span class="text-[10px] uppercase font-bold ${textTitle} block">REGULAR SEASON H2H</span>
        <span class="text-lg font-black ${textScore}">${breakdown.o1} ${breakdown.regW1} - ${breakdown.regW2} ${breakdown.o2}</span>
        <span class="text-[10px] ${textSub} block mt-0.5">Streak: <span class="font-bold">${breakdown.regStreak}</span></span>
      </div>

      <div class="${cardBg} p-2 rounded">
        <span class="text-[10px] uppercase font-bold ${amberText} block">PLAYOFF H2H</span>
        <span class="text-lg font-black ${amberText}">${breakdown.o1} ${breakdown.playW1} - ${breakdown.playW2} ${breakdown.o2}</span>
        <span class="text-[10px] ${amberText} block mt-0.5">Streak: <span class="font-bold">${breakdown.playStreak}</span></span>
      </div>

      <div class="${cardBg} p-2 rounded">
        <span class="text-[10px] uppercase font-bold ${textSub} block">TOTAL LIFETIME RECORD</span>
        <span class="text-lg font-black ${textScore}">${breakdown.o1} ${breakdown.totW1} - ${breakdown.totW2} ${breakdown.o2}</span>
        <span class="text-[10px] ${textTitle} block mt-0.5">${breakdown.games.length} Total Games</span>
      </div>

      <div class="${cardHighlight} p-2 rounded">
        <span class="text-[10px] uppercase font-bold ${textSub} block">🔥 ACTIVE STREAK</span>
        <span class="text-base font-black ${textScore} block mt-0.5">${breakdown.ovrStreak}</span>
      </div>

      <div class="${cardHighlight} p-2 rounded">
        <span class="text-[10px] uppercase font-bold ${amberText} block">👑 LONGEST H2H STREAK</span>
        <span class="text-xs font-bold block mt-1">${maxStreakStr}</span>
      </div>
    </div>
  `;
}

/**
 * Builds HTML table rows for H2H Game Log
 */
export function buildH2HGameLogRows({ games = [], theme = CRT_THEME }) {
  const isCrt = theme.name === 'crt';
  const rowClass = isCrt ? 'border-b border-emerald-950 hover:bg-emerald-950/30' : 'border-b border-pink-100 hover:bg-pink-50/20';
  const yearClass = isCrt ? 'text-emerald-400 font-mono' : 'text-pink-600 font-bold';
  const teamText = isCrt ? 'text-emerald-300 font-bold' : 'text-pink-700 font-bold';
  const subText = isCrt ? 'text-emerald-600' : 'text-purple-700';
  const scoreText = isCrt ? 'text-emerald-300 font-mono font-bold' : 'text-pink-700 font-sans font-bold';

  const sortedGames = [...games].sort((a, b) => b.year !== a.year ? b.year - a.year : b.week - a.week);

  return sortedGames.map(g => {
    const winnerBadge = g.winner === 'Tie'
      ? `<span class="${subText}">Tie</span>`
      : `<span class="font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${g.winner}</span>`;
    const stageText = g.stage || (g.isPlayoff ? 'Playoffs' : 'Regular Season');
    const stageColor = g.isPlayoff ? 'text-amber-400 font-medium text-xs' : `${isCrt ? 'text-emerald-500' : 'text-pink-600'} font-medium text-xs`;

    return `
      <tr class="${rowClass}">
        <td class="p-2 text-center ${yearClass}">${g.year}</td>
        <td class="p-2 text-center ${subText}">W${g.week}</td>
        <td class="p-2 text-center ${stageColor}">${stageText}</td>
        <td class="p-2 text-right ${teamText}">${g.homeTeam} <span class="text-[10px] ${subText} font-normal">[${g.homeOwner}]</span></td>
        <td class="p-2 text-center ${scoreText}">${(g.homeScore || 0).toFixed(2)} - ${(g.awayScore || 0).toFixed(2)}</td>
        <td class="p-2 text-left ${teamText}">${g.awayTeam} <span class="text-[10px] ${subText} font-normal">[${g.awayOwner}]</span></td>
        <td class="p-2 text-center">${winnerBadge}</td>
      </tr>
    `;
  }).join('');
}
