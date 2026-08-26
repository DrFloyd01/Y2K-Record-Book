/**
 * Playoff & Postseason Bracket Component Renderers
 */
import { CRT_THEME } from '../theme/theme.js';
import { formatPlayoffWeek } from '../analytics/statRecords.js';

/**
 * Builds HTML for Consolation Ladder (Seeds #7-#10)
 */
export function buildConsolationLadderHtml({ season, consolationMatchups = [], standings = [], theme = CRT_THEME }) {
  if (!consolationMatchups || consolationMatchups.length === 0) return '';
  const isCrt = theme.name === 'crt';

  // Group Consolation Games by Week
  const consByWk = {};
  consolationMatchups.forEach(m => {
    const wk = m.weekNumber || m.week;
    if (!consByWk[wk]) consByWk[wk] = [];
    consByWk[wk].push(m);
  });

  // Compute ladder placement from final week (Week 17 / max week)
  const allWeeks = Object.keys(consByWk).map(Number).sort((a, b) => a - b);
  const finalWk = allWeeks[allWeeks.length - 1];
  const finalMatchups = consByWk[finalWk] || [];

  // Standings ranking: 7th, 8th, 9th, 10th
  const ladderPlacements = [];
  if (finalMatchups.length >= 2) {
    // Game 1 is Upper Rung (7th vs 8th Place)
    // Game 2 is Lower Rung (9th vs 10th Place)
    const mUpper = finalMatchups[0];
    const mLower = finalMatchups[1];

    const upperWinner = mUpper.homeScore > mUpper.awayScore ? mUpper.homeOwner : mUpper.awayOwner;
    const upperWinnerTeam = mUpper.homeScore > mUpper.awayScore ? mUpper.homeTeam : mUpper.awayTeam;
    const upperLoser = mUpper.homeScore > mUpper.awayScore ? mUpper.awayOwner : mUpper.homeOwner;
    const upperLoserTeam = mUpper.homeScore > mUpper.awayScore ? mUpper.awayTeam : mUpper.homeTeam;

    const lowerWinner = mLower.homeScore > mLower.awayScore ? mLower.homeOwner : mLower.awayOwner;
    const lowerWinnerTeam = mLower.homeScore > mLower.awayScore ? mLower.homeTeam : mLower.awayTeam;
    const lowerLoser = mLower.homeScore > mLower.awayScore ? mLower.awayOwner : mLower.homeOwner;
    const lowerLoserTeam = mLower.homeScore > mLower.awayScore ? mLower.awayTeam : mLower.homeTeam;

    ladderPlacements.push({ rank: 7, draftPick: 1, owner: upperWinner, team: upperWinnerTeam, label: '7th Place (Ladder Champ)' });
    ladderPlacements.push({ rank: 8, draftPick: 2, owner: upperLoser, team: upperLoserTeam, label: '8th Place (Ladder Runner-Up)' });
    ladderPlacements.push({ rank: 9, draftPick: 3, owner: lowerWinner, team: lowerWinnerTeam, label: '9th Place' });
    ladderPlacements.push({ rank: 10, draftPick: 4, owner: lowerLoser, team: lowerLoserTeam, label: '10th Place' });
  } else {
    // Fallback to season standings
    const sStandings = standings.filter(s => s.rank >= 7 && s.rank <= 10).sort((a, b) => a.rank - b.rank);
    sStandings.forEach((s, idx) => {
      ladderPlacements.push({ rank: s.rank, draftPick: idx + 1, owner: s.ownerName, team: s.teamName, label: `${s.rank}th Place` });
    });
  }

  // Calculate record & total PF in ladder
  const consStats = {};
  consolationMatchups.forEach(m => {
    for (const [o, t, s, oppS] of [[m.homeOwner, m.homeTeam, m.homeScore, m.awayScore], [m.awayOwner, m.awayTeam, m.awayScore, m.homeScore]]) {
      if (!consStats[o]) consStats[o] = { owner: o, wins: 0, losses: 0, pf: 0.0 };
      consStats[o].pf += (s || 0);
      if (s > oppS) consStats[o].wins += 1;
      else if (s < oppS) consStats[o].losses += 1;
    }
  });

  let consTableRows = '';
  ladderPlacements.forEach((lp) => {
    const stat = consStats[lp.owner] || { wins: 0, losses: 0, pf: 0 };
    const badgeClass = lp.draftPick === 1
      ? (isCrt ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-amber-100 text-amber-900 border-amber-300')
      : (lp.draftPick === 2
        ? (isCrt ? 'bg-emerald-950 text-slate-300 border-slate-500' : 'bg-slate-100 text-slate-800 border-slate-300')
        : (isCrt ? 'bg-black text-emerald-400 border-emerald-800' : 'bg-pink-50 text-pink-700 border-pink-200'));

    consTableRows += `
      <tr class="border-b ${isCrt ? 'border-emerald-950' : 'border-pink-100'} text-xs">
        <td class="p-2"><span class="px-1.5 py-0.5 font-bold border rounded text-[11px] ${badgeClass}">Pick #${lp.draftPick}</span></td>
        <td class="p-2 font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'}">${lp.team} <span class="text-[10px] ${isCrt ? 'text-emerald-500' : 'text-purple-700'} block">[${lp.owner}]</span></td>
        <td class="p-2 font-semibold ${isCrt ? 'text-emerald-400 font-mono' : 'text-purple-900 font-sans'} text-xs">${lp.label}</td>
        <td class="p-2 text-center ${isCrt ? 'font-mono text-emerald-300' : 'font-sans font-bold text-purple-800'}">${stat.wins}-${stat.losses}</td>
        <td class="p-2 text-right ${isCrt ? 'font-mono text-emerald-400' : 'font-sans font-bold text-pink-700'}">${stat.pf.toFixed(2)}</td>
      </tr>
    `;
  });

  let consGamesHtml = '';
  allWeeks.forEach((wk, wIdx) => {
    let wkListHtml = '';
    const isFinalWk = wIdx === allWeeks.length - 1;
    const isFirstWk = wIdx === 0;

    const wkLabel = formatPlayoffWeek(season, wk, 'Consolation');
    let wkTitle = `${wkLabel} LADDER MATCHUPS`;
    if (isFirstWk) wkTitle = `${wkLabel}: OPENING RUNGS (7v8 & 9v10)`;
    else if (isFinalWk) wkTitle = `${wkLabel}: LADDER FINALS (7v8 & 9v10)`;
    else wkTitle = `${wkLabel}: PROMOTION / RELEGATION`;

    consByWk[wk].forEach((m, gIdx) => {
      const isHomeWin = m.homeScore > m.awayScore;
      const isAwayWin = m.awayScore > m.homeScore;
      let rungLabel = '';
      if (isFinalWk) {
        rungLabel = gIdx === 0 ? '🏆 7TH / 8TH PLACE (DRAFT PICK #1 vs #2)' : '🥉 9TH / 10TH PLACE (DRAFT PICK #3 vs #4)';
      } else if (isFirstWk) {
        rungLabel = gIdx === 0 ? '🔝 UPPER RUNG (#7 vs #8)' : '🪜 LOWER RUNG (#9 vs #10)';
      } else {
        rungLabel = gIdx === 0 ? '🔝 UPPER MATCHUP (PROMOTION)' : '🪜 LOWER MATCHUP';
      }

      const homeCardHighlight = isCrt
        ? (isHomeWin ? 'font-bold text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500 crt-glow' : 'text-emerald-600 px-1')
        : (isHomeWin ? 'font-bold text-pink-700 bg-pink-50/80 px-1 py-0.5 rounded border border-pink-300 crt-glow-pink-pink' : 'text-purple-800 px-1');

      const awayCardHighlight = isCrt
        ? (isAwayWin ? 'font-bold text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500 crt-glow' : 'text-emerald-600 px-1')
        : (isAwayWin ? 'font-bold text-pink-700 bg-pink-50/80 px-1 py-0.5 rounded border border-pink-300 crt-glow-pink-pink' : 'text-purple-800 px-1');

      wkListHtml += `
        <div class="${isCrt ? 'bg-black/95 border-emerald-900' : 'bg-white/95 border-pink-200'} p-2.5 rounded-xl border shadow-sm text-xs space-y-1">
          <div class="text-[9px] font-bold ${isCrt ? 'text-emerald-500 border-emerald-950' : 'text-purple-900/70 border-pink-100'} border-b pb-0.5 flex justify-between">
            <span>${rungLabel}</span>
          </div>
          <div class="flex justify-between items-center ${homeCardHighlight}">
            <span class="truncate">#${m.homeSeed} ${m.homeTeam} <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-700'} font-normal">[${m.homeOwner}]</span></span>
            <span class="${isCrt ? 'font-mono' : 'font-sans'} ml-2 font-bold">${(m.homeScore || 0).toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center ${awayCardHighlight}">
            <span class="truncate">#${m.awaySeed} ${m.awayTeam} <span class="text-[10px] ${isCrt ? 'text-emerald-700' : 'text-purple-700'} font-normal">[${m.awayOwner}]</span></span>
            <span class="${isCrt ? 'font-mono' : 'font-sans'} ml-2 font-bold">${(m.awayScore || 0).toFixed(2)}</span>
          </div>
        </div>
      `;
    });

    consGamesHtml += `
      <div class="${isCrt ? 'bg-emerald-950/20 border-emerald-800' : 'bg-pink-50/60 border-pink-200'} p-3 rounded-2xl border">
        <div class="text-[11px] font-bold ${isCrt ? 'text-emerald-400' : 'text-pink-700'} mb-2 uppercase flex items-center justify-between">
          <span>🪜 ${wkTitle}</span>
        </div>
        <div class="space-y-2">${wkListHtml}</div>
      </div>
    `;
  });

  return `
    <div class="crt-box p-4 rounded-2xl mb-6 ${isCrt ? 'border-emerald-700 bg-black/90' : 'border-2 border-pink-300 bg-white shadow-md'}">
      <h3 class="text-sm font-bold ${isCrt ? 'text-emerald-400 border-emerald-800' : 'text-pink-700 border-pink-200'} border-b pb-2 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="${isCrt ? 'font-mono font-black' : 'font-fredoka text-base'}">🪜 CONSOLATION LADDER &amp; DRAFT ORDER TOURNAMENT</span>
        <span class="text-xs ${isCrt ? 'text-emerald-600' : 'text-purple-800/80'} font-normal">Ladder Format: Final week placement determines draft slots #1–#4</span>
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Consolation Ladder Standings Table -->
        <div class="lg:col-span-1 ${isCrt ? 'bg-emerald-950/30 border-emerald-800' : 'bg-pink-50/40 border-pink-200'} p-3 rounded-2xl border">
          <div class="text-[11px] font-bold ${isCrt ? 'text-emerald-300' : 'text-pink-700'} mb-2 uppercase ${isCrt ? 'font-mono' : 'font-fredoka'}">💖 FINAL LADDER PLACEMENT</div>
          <table class="w-full text-left">
            <thead>
              <tr class="border-b ${isCrt ? 'border-emerald-800 text-emerald-500' : 'border-pink-200 text-purple-900'} text-[10px] uppercase font-bold">
                <th class="p-1.5">SLOT</th>
                <th class="p-1.5">TEAM</th>
                <th class="p-1.5">FINISH</th>
                <th class="p-1.5 text-center">REC</th>
                <th class="p-1.5 text-right">PF</th>
              </tr>
            </thead>
            <tbody>${consTableRows}</tbody>
          </table>
        </div>

        <!-- Consolation Ladder Games by Week -->
        <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${consGamesHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds HTML for Championship Playoff Bracket, Podium, and Consolation Ladder
 */
export function buildPlayoffBracketHtml({ season, playoffMatchups = [], championship = null, standings = [], theme = CRT_THEME }) {
  const isCrt = theme.name === 'crt';

  const champStageOrder = ['Wild Card', 'Semi-Finals', 'Championship Final', 'Nebuchadnezzar Cup', '3rd Place Game', '5th Place Game'];
  const champStages = champStageOrder.filter(stg => playoffMatchups.some(m => m.stage === stg));

  const consolationMatchups = playoffMatchups.filter(m =>
    m.stage === 'Consolation Round Robin' ||
    m.stage === 'Consolation Matchup' ||
    m.stage === 'Consolation Ladder' ||
    (m.rawTier && m.rawTier.includes('LOSERS'))
  );

  if (champStages.length === 0 && !championship && consolationMatchups.length === 0) {
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
    const firstTitle = isCrt ? '🏆 1st (Nebuchadnezzar Cup Winner)' : '🏆 1st (The Pride Cup Winner)';
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

  const consolationHtml = buildConsolationLadderHtml({
    season,
    consolationMatchups,
    standings,
    theme
  });

  return `
    ${podiumHtml}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      ${pCardsHtml}
    </div>
    ${consolationHtml}
  `;
}
