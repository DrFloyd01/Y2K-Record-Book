/**
 * Playoff & Postseason Bracket Component Renderers
 */
import { CRT_THEME } from '../theme/theme.js';
import { formatPlayoffWeek } from '../analytics/statRecords.js';

/**
 * Builds HTML for Championship Playoff Bracket and Podium
 */
export function buildPlayoffBracketHtml({ season, playoffMatchups = [], championship = null, theme = CRT_THEME }) {
  const isCrt = theme.name === 'crt';

  const champStageOrder = ['Wild Card', 'Semi-Finals', 'Championship Final', 'Nebuchadnezzar Cup', '3rd Place Game', '5th Place Game'];
  const champStages = champStageOrder.filter(stg => playoffMatchups.some(m => m.stage === stg));

  if (champStages.length === 0 && !championship) {
    return isCrt ? `
      <div class="crt-box rounded p-8 text-center">
        <div class="text-xs text-emerald-500 font-mono mb-1">&gt;_ NO_POSTSEASON_DATA</div>
        <p class="text-sm text-emerald-300 font-bold">Postseason brackets for ${season} have not yet commenced.</p>
        <p class="text-xs text-emerald-600 mt-2">Select a completed season (e.g. 2018–2025) from the selector above to view historical playoff brackets.</p>
      </div>
    ` : `
      <div class="cute-card rounded-2xl p-8 text-center">
        <div class="text-3xl mb-2">🏆✨</div>
        <h3 class="font-fredoka text-lg font-bold text-purple-900 mb-1">${season} Postseason Coming Soon!</h3>
        <p class="text-xs text-purple-600">Tournament brackets for ${season} will populate once the regular season concludes.</p>
        <p class="text-xs text-pink-500 font-bold mt-2">Select 2018–2025 from the season selector above to view previous brackets &amp; champions! 🌈</p>
      </div>
    `;
  }

  let pCardsHtml = '';
  champStages.forEach(stg => {
    const stgMatchups = playoffMatchups.filter(m => m.stage === stg);
    let mListHtml = '';

    stgMatchups.forEach(m => {
      const isHomeWinner = m.homeScore > m.awayScore;
      const isAwayWinner = m.awayScore > m.homeScore;

      let cardBorder = isCrt ? 'border-emerald-800' : 'border-pink-200';
      if (stg === 'Nebuchadnezzar Cup' || stg === 'Championship Final') {
        cardBorder = isCrt ? 'border-2 border-amber-500 bg-amber-950/20' : 'border-2 border-amber-500 bg-amber-50/80';
      } else if (stg === '3rd Place Game') {
        cardBorder = isCrt ? 'border-2 border-amber-700/60 bg-amber-950/10' : 'border-2 border-amber-600/70 bg-amber-50/80';
      } else if (stg === '5th Place Game') {
        cardBorder = isCrt ? 'border-2 border-emerald-700 bg-emerald-950/10' : 'border-2 border-purple-200 bg-pink-50/20';
      }

      const homeWinnerClass = isCrt
        ? (isHomeWinner ? 'bg-emerald-950/80 border border-emerald-500 font-bold' : '')
        : (isHomeWinner ? 'bg-pink-50/80 border border-pink-400 font-bold' : '');

      const awayWinnerClass = isCrt
        ? (isAwayWinner ? 'bg-emerald-950/80 border border-emerald-500 font-bold' : '')
        : (isAwayWinner ? 'bg-pink-50/80 border border-pink-400 font-bold' : '');

      const homeTextClass = isCrt
        ? (isHomeWinner ? 'text-emerald-300 crt-glow' : 'text-emerald-600')
        : (isHomeWinner ? 'text-pink-700 crt-glow-pink-pink' : 'text-purple-700');

      const awayTextClass = isCrt
        ? (isAwayWinner ? 'text-emerald-300 crt-glow' : 'text-emerald-600')
        : (isAwayWinner ? 'text-pink-700 crt-glow-pink-pink' : 'text-purple-700');

      const seedBadge = isCrt
        ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
        : 'bg-pink-100/90 text-pink-700 border border-purple-200';

      const wkLabel = formatPlayoffWeek(season, m.weekNumber || m.week, m.stage);

      mListHtml += `
        <div class="${isCrt ? 'bg-black/90' : 'bg-white/90'} p-3 rounded border ${cardBorder}">
          <div class="text-[10px] font-bold tracking-wider ${isCrt ? 'text-emerald-500' : 'text-pink-600'} mb-2 flex justify-between uppercase">
            <span>[${m.stage}]</span>
            <span>${wkLabel}</span>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between items-center p-1.5 rounded ${homeWinnerClass}">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${seedBadge}">#${m.homeSeed || 1}</span>
                <span class="${homeTextClass}">${m.homeTeam}</span>
                <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-800/60'} font-normal">[${m.homeOwner}]</span>
              </div>
              <span class="${isCrt ? 'font-mono' : 'font-sans'} font-bold ${homeTextClass}">${(m.homeScore || 0).toFixed(2)}</span>
            </div>

            <div class="flex justify-between items-center p-1.5 rounded ${awayWinnerClass}">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${seedBadge}">#${m.awaySeed || 2}</span>
                <span class="${awayTextClass}">${m.awayTeam}</span>
                <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-800/60'} font-normal">[${m.awayOwner}]</span>
              </div>
              <span class="${isCrt ? 'font-mono' : 'font-sans'} font-bold ${awayTextClass}">${(m.awayScore || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    });

    let headerTitle = (stg === 'Nebuchadnezzar Cup' || stg === 'Championship Final')
      ? (isCrt ? '🏆 NEBUCHADNEZZAR CUP' : '🏆 CHAMPIONSHIP FINAL')
      : stg.toUpperCase();

    let headerColor = isCrt ? 'text-emerald-300' : 'text-pink-700';
    if (stg === 'Nebuchadnezzar Cup' || stg === 'Championship Final') {
      headerColor = isCrt ? 'text-amber-400 crt-glow-amber font-black' : 'text-amber-400 crt-glow-pink-pink-amber font-black';
    } else if (stg === '3rd Place Game') {
      headerColor = 'text-amber-500 font-bold';
    } else if (stg === '5th Place Game') {
      headerColor = isCrt ? 'text-emerald-400 font-bold' : 'text-pink-600 font-bold';
    }

    const firstWk = stgMatchups[0] ? (stgMatchups[0].weekNumber || stgMatchups[0].week) : '';
    const stgWkLabel = formatPlayoffWeek(season, firstWk, stg);

    pCardsHtml += `
      <div class="crt-box rounded p-4">
        <h3 class="text-sm font-bold ${headerColor} border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-2 mb-3 flex items-center justify-between">
          <span>${headerTitle}</span>
          <span class="text-xs font-normal ${isCrt ? 'text-emerald-600' : 'text-purple-700'}">${stgWkLabel}</span>
        </h3>
        <div class="space-y-3">
          ${mListHtml}
        </div>
      </div>
    `;
  });

  let podiumHtml = '';
  if (championship) {
    const firstTitle = isCrt ? '🏆 1st (Nebuchadnezzar Cup Winner)' : '🏆 1st (Pride Cup Winner)';
    podiumHtml = `
      <div class="crt-box p-4 rounded mb-6 ${isCrt ? 'border-amber-500 bg-black' : 'border-2 border-amber-400 bg-amber-50/90'}">
        <h3 class="text-sm font-black text-center ${isCrt ? 'text-amber-400 crt-glow-amber' : 'text-amber-800'} mb-3">
          🏆 ${season} PLAYOFF PODIUM FINISHERS
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div class="${isCrt ? 'bg-amber-950/40 border border-amber-500' : 'bg-white p-3 rounded-xl border border-amber-300'} p-3 rounded">
            <span class="text-[10px] uppercase font-bold text-amber-500 block">${firstTitle}</span>
            <span class="text-base font-black ${isCrt ? 'text-white' : 'text-purple-950'} block mt-1">${championship.firstTeam}</span>
            <span class="text-xs ${isCrt ? 'text-amber-300' : 'text-pink-600 font-bold'} block">[${championship.firstOwner}]</span>
          </div>
          <div class="${isCrt ? 'bg-emerald-950/40 border border-emerald-700' : 'bg-white p-3 rounded-xl border border-slate-300'} p-3 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-400' : 'text-slate-700'} block">🥈 2nd Place Runner-Up</span>
            <span class="text-base font-black ${isCrt ? 'text-emerald-200' : 'text-purple-950'} block mt-1">${championship.secondTeam}</span>
            <span class="text-xs ${isCrt ? 'text-emerald-400' : 'text-slate-600'} block">[${championship.secondOwner}]</span>
          </div>
          <div class="${isCrt ? 'bg-amber-950/20 border border-amber-700' : 'bg-white p-3 rounded-xl border border-amber-200'} p-3 rounded">
            <span class="text-[10px] uppercase font-bold text-amber-600 block">🥉 3rd Place Winner</span>
            <span class="text-base font-black ${isCrt ? 'text-emerald-200' : 'text-purple-950'} block mt-1">${championship.thirdTeam}</span>
            <span class="text-xs ${isCrt ? 'text-amber-500' : 'text-amber-700'} block">[${championship.thirdOwner}]</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    ${podiumHtml}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      ${pCardsHtml}
    </div>
  `;
}
