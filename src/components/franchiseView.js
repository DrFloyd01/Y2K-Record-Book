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

  const teamNames = [];
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
          pf: entry.pointsFor || 0,
          isScoringChamp: entry.isScoringChamp
        });
      }
    }
  });

  let historyRows = '';
  teamNames.forEach(tn => {
    const scBadge = tn.isScoringChamp
      ? (isCrt ? `<span class="px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-[10px]">🎯 Scoring Champ</span>` : `<span class="px-1.5 py-0.5 bg-pink-100 border border-pink-300 text-pink-700 font-bold text-[10px]">🎯 Scoring Champ</span>`)
      : (isCrt ? '<span class="text-emerald-900">-</span>' : '<span class="text-purple-300">-</span>');

    historyRows += `
      <tr class="border-b ${isCrt ? 'border-emerald-950 hover:bg-emerald-950/30' : 'border-pink-100 hover:bg-pink-50/50'}">
        <td class="p-2 font-bold ${isCrt ? 'text-emerald-400 font-mono' : 'text-pink-600 font-sans'}">${tn.yr}</td>
        <td class="p-2 font-bold ${isCrt ? 'text-emerald-300' : 'text-purple-950'}">${tn.name}</td>
        <td class="p-2 text-center font-bold ${isCrt ? 'font-mono text-emerald-400' : 'text-pink-600'}">${tn.rank}</td>
        <td class="p-2 text-center ${isCrt ? 'font-mono text-emerald-200' : 'text-purple-900'}">${tn.rec}</td>
        <td class="p-2 text-center font-bold ${isCrt ? 'text-emerald-400 font-mono' : 'text-pink-600'}">${tn.pRec}</td>
        <td class="p-2 text-center ${isCrt ? 'font-mono text-emerald-300' : 'text-purple-900'} text-xs">${tn.pf.toFixed(1)}</td>
        <td class="p-2 text-center">${scBadge}</td>
      </tr>
    `;
  });

  const dp = draftProfiles[owner];
  let draftProfileSection = '';
  if (dp) {
    draftProfileSection = `
      <div class="crt-box rounded p-4 mb-6 ${isCrt ? 'bg-black/90 border-emerald-500 font-mono' : 'bg-white border-pink-300 font-sans'} shadow-lg">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isCrt ? 'border-emerald-800' : 'border-pink-200'} pb-2.5 mb-3">
          <div>
            <span class="text-[10px] ${isCrt ? 'text-emerald-400' : 'text-pink-600'} font-bold uppercase tracking-widest block">&gt;_ DRAFT_PROFILE &amp; SCOUTING_REPORT</span>
            <h3 class="text-base font-black ${isCrt ? 'text-emerald-300 crt-glow' : 'text-pink-700'} mt-0.5">${dp.archetype}</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded text-xs font-bold border ${dp.reachColor} shadow-sm">${dp.reachRating} (${dp.avgReach > 0 ? '+' : ''}${dp.avgReach} picks)</span>
            <span class="text-xs ${isCrt ? 'text-emerald-500 font-mono bg-black border-emerald-900' : 'text-purple-700 bg-pink-50 border-purple-200'} font-bold px-2 py-0.5 rounded border">${dp.yearsSample}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-center text-xs">
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">R1 TENDENCY</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.r1Tendency}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">${dp.r1Detail}</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">AVG REACH / VALUE</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.avgReach > 0 ? `+${dp.avgReach} ahead` : (dp.avgReach < 0 ? `${dp.avgReach} after` : '±0.0 vs ADP')}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">${dp.reachRating}</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">POS FOCUS</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.posDistribution}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">Top Archetype</span>
          </div>
          <div class="${isCrt ? 'bg-black/60 border-emerald-900' : 'bg-pink-50/50 border-pink-200'} border p-2.5 rounded">
            <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">SIGNATURE DRAFT PICK</span>
            <span class="font-black ${isCrt ? 'text-emerald-300' : 'text-pink-700'} block mt-1 text-sm">${dp.favoritePlayer}</span>
            <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-600'} block mt-0.5">${dp.favoritePlayerDrafted}</span>
          </div>
        </div>

        <p class="text-xs ${isCrt ? 'text-emerald-300/80' : 'text-purple-800'} italic border-t ${isCrt ? 'border-emerald-900/60' : 'border-pink-100'} pt-2">
          &gt; ${dp.scoutingReport}
        </p>
      </div>
    `;
  }

  const titleCardClass = isCrt ? 'bg-amber-950/30 border border-amber-500' : 'bg-amber-50 border border-amber-300';
  const statBoxClass = isCrt ? 'bg-black/60 border border-emerald-900/80' : 'bg-white border border-pink-200';

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isCrt ? 'border-emerald-800 font-mono' : 'border-pink-200 font-sans'} pb-3 mb-4">
      <div>
        <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} font-bold uppercase tracking-wider">&gt;_ FRANCHISE_DOSSIER //</span>
        <h2 class="text-2xl font-black ${isCrt ? 'text-emerald-300 crt-glow font-mono' : 'text-pink-700 crt-glow-pink-pink font-sans'}">${st.teamName}</h2>
        <span class="text-xs ${isCrt ? 'text-emerald-400 font-mono' : 'text-purple-700 font-sans'} font-bold">Owner: ${owner} | Active: ${st.seasonsCount} Seasons</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="px-3 py-1 bg-amber-950 text-amber-300 font-black border border-amber-500 rounded text-xs shadow-sm">
          🏆 ${(c['1st'] || 0)} Ring${(c['1st'] || 0) !== 1 ? 's' : ''}
        </span>
        ${scCount > 0 ? `<span class="px-3 py-1 bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 rounded text-xs shadow-sm">🎯 ${scCount} Scoring Titles</span>` : ''}
        <span class="px-3 py-1 ${isCrt ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-purple-50 text-purple-900 border-purple-200'} font-bold border rounded text-xs">
          🏈 ${st.playoffApps}/${st.seasonsCount} Playoffs (${st.playoffPct}%)
        </span>
      </div>
    </div>

    ${draftProfileSection}

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center text-xs ${isCrt ? 'font-mono' : 'font-sans'}">
      <div class="${statBoxClass} p-3 rounded">
        <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">REGULAR SEASON W-L</span>
        <span class="text-lg font-black ${isCrt ? 'text-emerald-300 font-mono' : 'text-pink-700 font-sans'} block mt-1">${st.wins}-${st.losses}</span>
        <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} block mt-0.5">${st.winPct}% Win Rate</span>
      </div>
      <div class="${statBoxClass} p-3 rounded">
        <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">PLAYOFF W-L RECORD</span>
        <span class="text-lg font-black ${isCrt ? 'text-emerald-300 font-mono' : 'text-pink-700 font-sans'} block mt-1">${st.playoffRecord || '0-0'}</span>
        <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} block mt-0.5">${st.playoffWinPct}% Win Rate</span>
      </div>
      <div class="${statBoxClass} p-3 rounded">
        <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">TOTAL POINTS FOR</span>
        <span class="text-lg font-black ${isCrt ? 'text-emerald-300 font-mono' : 'text-pink-700 font-sans'} block mt-1">${st.pointsFor.toFixed(1)}</span>
        <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} block mt-0.5">Career PF</span>
      </div>
      <div class="${statBoxClass} p-3 rounded">
        <span class="text-[10px] uppercase font-bold ${isCrt ? 'text-emerald-600' : 'text-purple-700'} block">TOTAL POINTS AGAINST</span>
        <span class="text-lg font-black ${isCrt ? 'text-emerald-300 font-mono' : 'text-pink-700 font-sans'} block mt-1">${st.pointsAgainst.toFixed(1)}</span>
        <span class="text-[10px] ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-sans'} block mt-0.5">Career PA</span>
      </div>
    </div>

    <div class="crt-box rounded overflow-visible mb-6 ${isCrt ? 'font-mono' : 'font-sans'}">
      <div class="crt-box-header px-4 py-2 text-xs font-bold ${isCrt ? 'text-emerald-400 border-b border-emerald-800' : 'text-pink-700 border-b border-pink-200'}">
        &gt;_ SEASON_BY_SEASON_BREAKDOWN
      </div>
      <div class="table-scroll-container">
        <table class="w-full min-w-[500px] text-xs text-left border-collapse">
          <thead class="${isCrt ? 'bg-[#052611] text-emerald-400 border-b border-emerald-800' : 'bg-pink-50 text-pink-600 border-b border-pink-200'} font-bold">
            <tr>
              <th class="p-2">YEAR</th>
              <th class="p-2">TEAM NAME</th>
              <th class="p-2 text-center">FINISH</th>
              <th class="p-2 text-center">REG W-L</th>
              <th class="p-2 text-center">PLAYOFF W-L</th>
              <th class="p-2 text-center">POINTS FOR</th>
              <th class="p-2 text-center">AWARDS</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
