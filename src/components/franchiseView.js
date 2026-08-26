/**
 * Franchise & Manager Profile Component Renderers
 */
import { CRT_THEME } from '../theme/theme.js';

/**
 * Builds HTML for a manager's career franchise profile
 */
export function buildFranchiseProfileHtml({
  owner,
  allTimeStandings = [],
  seasons = [],
  seasonData = {},
  draftProfiles = {},
  theme = CRT_THEME
}) {
  if (!owner) return '';
  const isCrt = theme.name === 'crt';

  const st = allTimeStandings.find(s => s.ownerName === owner);
  if (!st) return '';

  const scCount = st.championships ? (st.championships.scoringTitles || 0) : 0;
  const c = st.championships || {};

  let teamNames = [];
  seasons.forEach(yr => {
    const sData = seasonData[yr];
    if (sData && sData.standings) {
      const entry = sData.standings.find(s => s.ownerName === owner);
      if (entry) {
        teamNames.push({
          yr: yr,
          name: entry.teamName,
          rank: entry.rank,
          rec: `${entry.wins}-${entry.losses}`,
          pRec: entry.playoffRecord || '-',
          pf: entry.pointsFor,
          isScoringChamp: entry.isScoringChamp
        });
      }
    }
  });

  let historyRows = '';
  teamNames.forEach(tn => {
    const scBadge = tn.isScoringChamp
      ? (isCrt
        ? `<span class="px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-[10px]">🎯 Scoring Champ</span>`
        : `<span class="px-1.5 py-0.5 bg-pink-100 border border-pink-300 text-pink-700 font-bold text-[10px]">🎯 Scoring Champ</span>`)
      : (isCrt ? '<span class="text-emerald-900">-</span>' : '<span class="text-purple-300">-</span>');

    historyRows += `
      <tr class="border-b ${isCrt ? 'border-emerald-950 hover:bg-emerald-950/30' : 'border-pink-100 hover:bg-pink-50/50'}">
        <td class="p-2.5 font-bold ${isCrt ? 'text-emerald-400 font-mono' : 'text-pink-600 font-sans'}">${tn.yr}</td>
        <td class="p-2.5 font-bold ${isCrt ? 'text-emerald-300' : 'text-purple-950'}">${tn.name}</td>
        <td class="p-2.5 text-center font-bold ${isCrt ? 'font-mono text-emerald-400' : 'text-pink-600'}">${tn.rank}</td>
        <td class="p-2.5 text-center ${isCrt ? 'font-mono text-emerald-200' : 'text-purple-900'}">${tn.rec}</td>
        <td class="p-2.5 text-center font-bold ${isCrt ? 'text-emerald-400 font-mono' : 'text-pink-600'}">${tn.pRec}</td>
        <td class="p-2.5 text-center ${isCrt ? 'font-mono text-emerald-300' : 'text-purple-900'} text-xs">${(tn.pf || 0).toFixed(1)}</td>
        <td class="p-2.5 text-center">${scBadge}</td>
        <td class="p-2.5 text-center font-bold ${isCrt ? 'font-mono text-emerald-400' : 'text-purple-900'}">${tn.coachingEfficiency ? `${tn.coachingEfficiency}%` : '-'}</td>
        <td class="p-2.5 text-center">${tn.dOhs > 0 ? `<span class="text-red-400 font-bold">🤦‍♂️ ${tn.dOhs}</span>` : '<span class="opacity-40">-</span>'}</td>
      </tr>
    `;
  });

  const dp = draftProfiles[owner];
  let draftProfileSection = '';
  if (dp) {
    const firstPosAvg = dp.firstPosAvg || { RB: '-', WR: '-', QB: '-', TE: '-', DEF: '-' };
    draftProfileSection = `
      <div class="crt-box rounded p-4 mb-6 ${isCrt ? 'bg-black/90 border-emerald-500 font-mono' : 'bg-white border-pink-300 font-sans'} shadow-lg">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-2.5 mb-3">
          <div>
            <span class="text-[10px] ${isCrt ? 'text-emerald-400' : 'text-pink-600'} font-bold uppercase tracking-widest block">&gt;_ DRAFT_PROFILE &amp; SCOUTING_REPORT</span>
            <h3 class="text-base font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700 font-fredoka'} mt-0.5">${dp.archetype || 'Tactical Drafter'}</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded text-xs font-bold border ${dp.reachColor || 'border-emerald-700'} shadow-sm">${dp.reachRating || 'Neutral'} (${dp.avgReach > 0 ? '+' : ''}${dp.avgReach || 0} picks)</span>
            <span class="text-xs ${isCrt ? 'text-emerald-500 font-mono bg-black border-emerald-900' : 'text-purple-700 bg-pink-50 border-purple-200'} font-bold px-2 py-0.5 rounded border">${dp.yearsSample || ''}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-center text-xs">
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">R1 TENDENCY</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.r1Tendency || '-'}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">${dp.r1Detail || ''}</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">AVG REACH / VALUE</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.avgReach > 0 ? `+${dp.avgReach} ahead` : (dp.avgReach < 0 ? `${dp.avgReach} after` : '±0.0 vs ADP')}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">${dp.reachRating || 'Mean per pick'}</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">TOP REACH POSITION</span>
            <span class="font-bold ${isCrt ? 'text-amber-400' : 'text-amber-600'} block mt-1 text-xs">${dp.topReachPos || '-'}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">Avg ahead consensus</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">TOP VALUE POSITION</span>
            <span class="font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-xs">${dp.topValuePos || '-'}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">Avg after consensus</span>
          </div>
        </div>

        <div class="${isCrt ? 'bg-[#052611] border-emerald-700' : 'bg-pink-50/80 border-pink-300'} border rounded p-3 mb-3">
          <span class="text-[11px] uppercase font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mb-2">&gt;_ 1ST_POSITION_DRAFTED_AVERAGES (ENTRY TIMING)</span>
          <div class="grid grid-cols-5 gap-2 text-center text-xs ${isCrt ? 'font-mono' : 'font-sans'}">
            <div class="${isCrt ? 'bg-black/80 border-emerald-900' : 'bg-white border-pink-200'} p-2 rounded border">
              <span class="text-[10px] font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">1ST RB</span>
              <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} text-sm">${firstPosAvg.RB || '-'}</span>
            </div>
            <div class="${isCrt ? 'bg-black/80 border-emerald-900' : 'bg-white border-pink-200'} p-2 rounded border">
              <span class="text-[10px] font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">1ST WR</span>
              <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} text-sm">${firstPosAvg.WR || '-'}</span>
            </div>
            <div class="${isCrt ? 'bg-black/80 border-emerald-900' : 'bg-white border-pink-200'} p-2 rounded border">
              <span class="text-[10px] font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">1ST QB</span>
              <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} text-sm">${firstPosAvg.QB || '-'}</span>
            </div>
            <div class="${isCrt ? 'bg-black/80 border-emerald-900' : 'bg-white border-pink-200'} p-2 rounded border">
              <span class="text-[10px] font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">1ST TE</span>
              <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} text-sm">${firstPosAvg.TE || '-'}</span>
            </div>
            <div class="${isCrt ? 'bg-black/80 border-emerald-900' : 'bg-white border-pink-200'} p-2 rounded border">
              <span class="text-[10px] font-bold ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">1ST DEF</span>
              <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} text-sm">${firstPosAvg.DEF || '-'}</span>
            </div>
          </div>
        </div>

        <div class="${isCrt ? 'bg-black/60 border-emerald-900 text-emerald-200 font-mono' : 'bg-pink-50/40 border-pink-200 text-purple-900 font-sans'} p-3 rounded border text-xs leading-relaxed">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1 border-b ${isCrt ? 'border-emerald-900/60' : 'border-pink-200'} pb-1"><span><span class="font-bold ${isCrt ? 'text-emerald-400' : 'text-pink-700'}">&gt; SIGNATURE_PICK:</span> ${dp.favoritePlayer || '-'} <span class="text-[10px] opacity-75">${dp.favoritePlayerDrafted || ''}</span></span><span><span class="font-bold ${isCrt ? 'text-emerald-400' : 'text-pink-700'}">&gt; POS_FOCUS:</span> ${dp.posDistribution || '-'}</span></div><div><span class="font-bold ${isCrt ? 'text-emerald-400' : 'text-pink-700'}">&gt; SCOUTING_REPORT:</span> ${dp.scoutingReport || ''}</div>
        </div>
      </div>
    `;
  }

  // Build Draft History By Year buttons
  let availableDraftYears = [];
  seasons.forEach(yr => {
    const sData = seasonData[yr];
    if (sData && sData.draftPicks && sData.draftPicks.some(p => p.ownerName === owner && p.player && p.player !== 'Empty / Bye')) {
      availableDraftYears.push(yr);
    }
  });
  availableDraftYears.sort((a, b) => b - a);

  let franchiseDraftHistorySection = '';
  if (availableDraftYears.length > 0) {
    const defaultYear = availableDraftYears[0];
    const yearButtons = availableDraftYears.map(yr => {
      const isActive = yr === defaultYear;
      const activeClass = isCrt
        ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-extrabold shadow-[0_0_6px_rgba(0,255,102,0.3)]'
        : 'bg-pink-500 border-pink-500 text-white font-extrabold shadow-sm';
      const inactiveClass = isCrt
        ? 'bg-black border-emerald-900 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400 font-bold'
        : 'bg-white border-pink-200 text-purple-700 hover:border-pink-300 hover:text-pink-700 font-bold';
      return `<button type="button" id="btn-franchise-draft-${yr}" onclick="window.renderFranchiseDraftYear('${owner}', ${yr})" class="franchise-draft-year-btn px-2.5 py-1 text-xs rounded border transition-all ${isActive ? activeClass : inactiveClass}">${yr}</button>`;
    }).join('');

    franchiseDraftHistorySection = `
      <div class="crt-box rounded overflow-visible mt-6 ${isCrt ? '' : 'bg-white border-pink-300 shadow-md'}">
        <div class="${isCrt ? 'crt-box-header' : 'bg-pink-50 text-pink-700 border-b border-pink-200'} px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="font-bold text-xs ${isCrt ? 'font-mono' : 'font-fredoka text-sm'}">
            &gt;_ FRANCHISE_DRAFT_HISTORY
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-500 font-mono' : 'text-purple-700 font-sans'} mr-1">CLASS:</span>
            ${yearButtons}
          </div>
        </div>
        <div id="franchise-draft-picks-container" class="table-scroll-container">
          <!-- Rendered by window.renderFranchiseDraftYear -->
        </div>
      </div>
    `;
  }

  const avatarBorder = isCrt ? 'border-2 border-emerald-500 text-emerald-300 crt-glow bg-black' : 'border-2 border-pink-400 text-pink-600 bg-pink-50 shadow-md';
  const ownerTitle = isCrt ? 'text-emerald-300 crt-glow font-mono' : 'text-purple-950 font-fredoka';
  const subText = isCrt ? 'text-emerald-500 font-mono' : 'text-purple-700 font-sans';
  const statBoxClass = isCrt ? 'bg-black/60 border border-emerald-900 p-2 rounded' : 'bg-pink-50/50 border border-pink-200 p-2 rounded';
  const totalGames = (st.wins + st.losses) || 1;

  return `
    <div class="crt-box rounded p-4 mb-6 ${isCrt ? '' : 'bg-white border-pink-300 shadow-md'}">
      <div class="flex flex-col md:flex-row items-center gap-4">
        <div class="w-16 h-16 rounded-full ${avatarBorder} flex items-center justify-center font-black text-2xl shrink-0">
          ${owner.slice(0, 2).toUpperCase()}
        </div>
        <div class="text-center md:text-left grow">
          <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} font-bold uppercase tracking-wider block">&gt;_ FRANCHISE_DOSSIER //</span><h2 class="text-2xl font-black ${ownerTitle}">${owner}</h2>
          <p class="${subText} font-bold text-xs mt-0.5">${st.teamName} • ${st.seasonsCount} Seasons Active</p>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 mt-3 text-center ${isCrt ? 'font-mono' : 'font-sans'}">
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">REG SEASON</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${st.wins}-${st.losses}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">${st.winPct || 0}%</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">PLAYOFFS</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${st.playoffRecord || '0-0'}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">${st.playoffWinPct || 0}%</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">TOTAL RECORD</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${st.wins + (st.playoffWins || 0)}-${st.losses + (st.playoffLosses || 0)}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">${st.playoffApps || 0}/${st.seasonsCount || 0} Playoffs</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">PF / G</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${((st.pointsFor || 0) / totalGames).toFixed(1)}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">${(st.pointsFor || 0).toLocaleString()} PF</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">PA / G</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${((st.pointsAgainst || 0) / totalGames).toFixed(1)}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">${(st.pointsAgainst || 0).toLocaleString()} PA</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold text-amber-500 block">CHAMPIONSHIPS</span>
              <span class="text-base font-extrabold text-amber-400 crt-glow-amber">🏆 ${c['1st'] || 0}</span>
              <span class="text-[10px] text-amber-600 block">🥈 ${c['2nd'] || 0} | 🥉 ${c['3rd'] || 0}</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">FINISH BINS</span>
              <span class="text-xs font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1">4th: ${c['4th'] || 0}</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">5-6: ${c['5th_6th'] || 0} | 7-12: ${c['7th_12th'] || 0}</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-400' : 'text-purple-700'} block">COACHING EFF</span>
              <span class="text-base font-extrabold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${st.coachingEfficiency || 90.0}%</span>
              <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-pink-600'} block">Optimal PF Rate</span>
            </div>
            <div class="${statBoxClass}">
              <span class="text-[10px] uppercase font-bold text-red-400 block">D'OH! BLUNDERS</span>
              <span class="text-base font-extrabold text-red-400">🤦‍♂️ ${st.dOhs || 0}</span>
              <span class="text-[10px] text-red-500 block">1-Swap Losses</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="crt-box rounded overflow-visible mb-6 ${isCrt ? '' : 'bg-white border-pink-300 shadow-md'}">
      <div class="${isCrt ? 'crt-box-header font-mono' : 'bg-pink-50 text-pink-700 border-b border-pink-200 font-fredoka text-sm'} px-4 py-2 font-bold text-xs">
        &gt;_ FRANCHISE_HISTORY_EVOLUTION
      </div>
      <div class="table-scroll-container">
        <table class="w-full min-w-[680px] text-xs text-left border-collapse ${isCrt ? 'font-mono' : 'font-sans'}">
          <thead class="${isCrt ? 'bg-[#052611] text-emerald-300 border-b border-emerald-600' : 'bg-pink-50 text-pink-600 border-b border-pink-200'} font-bold text-xs">
            <tr>
              <th class="p-2.5">YEAR</th>
              <th class="p-2.5">TEAM NAME</th>
              <th class="p-2.5 text-center">FINISH RANK</th>
              <th class="p-2.5 text-center">REG RECORD</th>
              <th class="p-2.5 text-center">PLAYOFF RECORD</th>
              <th class="p-2.5 text-center">POINTS FOR</th>
              <th class="p-2.5 text-center">ACCOLADES</th>
              <th class="p-2.5 text-center">COACHING EFF</th>
              <th class="p-2.5 text-center">D'OHS 🤦‍♂️</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>

    ${draftProfileSection}

    ${franchiseDraftHistorySection}
  `;
}
