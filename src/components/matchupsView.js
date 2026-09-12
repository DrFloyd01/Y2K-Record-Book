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
 * Computes stakes (H2H record, active streak games, and playoff history) between two owners
 */
export function computeMatchupStakes({
  o1,
  o2,
  season = 2025,
  week = 1,
  customM = null,
  allMatchups = []
}) {
  const currentSeason = Number(season);
  const currentWeek = Number(week);

  // Fallback to window.LEAGUE_DATA.allMatchups if allMatchups array is empty
  const sourceMatchups = (allMatchups && allMatchups.length > 0)
    ? allMatchups
    : (typeof window !== 'undefined' && window.LEAGUE_DATA?.allMatchups ? window.LEAGUE_DATA.allMatchups : []);

  // Filter completed games between o1 and o2 played strictly before the current matchup
  const pastGames = sourceMatchups
    .filter(m => {
      const isPair = (m.homeOwner === o1 && m.awayOwner === o2) || (m.homeOwner === o2 && m.awayOwner === o1);
      if (!isPair) return false;
      const yr = Number(m.seasonYear ?? m.year ?? 0);
      const wk = Number(m.weekNumber ?? m.week ?? 0);
      if (yr > currentSeason) return false;
      if (yr === currentSeason && wk >= currentWeek) return false;
      const sH = Number(m.homeScore || 0);
      const sA = Number(m.awayScore || 0);
      return (sH > 0 || sA > 0);
    })
    .sort((a, b) => {
      const yrA = Number(a.seasonYear ?? a.year ?? 0);
      const yrB = Number(b.seasonYear ?? b.year ?? 0);
      if (yrA !== yrB) return yrA - yrB;
      return (Number(a.weekNumber ?? a.week ?? 0)) - (Number(b.weekNumber ?? b.week ?? 0));
    });

  // Calculate lifetime H2H record
  let o1Wins = 0, o2Wins = 0, ties = 0;
  pastGames.forEach(m => {
    const sH = Number(m.homeScore || 0);
    const sA = Number(m.awayScore || 0);
    if (m.homeOwner === o1) {
      if (sH > sA) o1Wins++;
      else if (sA > sH) o2Wins++;
      else ties++;
    } else {
      if (sA > sH) o1Wins++;
      else if (sH > sA) o2Wins++;
      else ties++;
    }
  });

  let h2hClean = `${o1Wins}-${o2Wins}${ties > 0 ? `-${ties}` : ''}`;
  let h2hFull = h2hClean;

  if (customM && (customM.h2h || customM.seasonH2H)) {
    const customH2hStr = String(customM.h2h || customM.seasonH2H);
    h2hFull = customH2hStr;
    if (pastGames.length === 0) {
      h2hClean = customH2hStr.replace(/\s*\(.*?\)/g, '').trim();
    }
  }

  // Calculate active winning streak games
  const streakGames = [];
  let streakLeader = null;
  let streakCount = 0;

  if (pastGames.length > 0) {
    const lastGame = pastGames[pastGames.length - 1];
    const sH = Number(lastGame.homeScore || 0);
    const sA = Number(lastGame.awayScore || 0);
    if (sH !== sA) {
      streakLeader = sH > sA ? lastGame.homeOwner : lastGame.awayOwner;
      for (let i = pastGames.length - 1; i >= 0; i--) {
        const gm = pastGames[i];
        const gh = Number(gm.homeScore || 0);
        const ga = Number(gm.awayScore || 0);
        const gWinner = gh > ga ? gm.homeOwner : (ga > gh ? gm.awayOwner : null);
        if (gWinner === streakLeader) {
          const gLoser = gWinner === gm.homeOwner ? gm.awayOwner : gm.homeOwner;
          streakGames.push({
            year: Number(gm.seasonYear ?? gm.year),
            week: Number(gm.weekNumber ?? gm.week),
            stage: gm.stage || (gm.isPlayoff ? 'Playoffs' : 'Regular Season'),
            winner: gWinner,
            loser: gLoser,
            winnerScore: Math.max(gh, ga),
            loserScore: Math.min(gh, ga),
            margin: Math.abs(gh - ga)
          });
        } else {
          break;
        }
      }
      streakCount = streakGames.length;
    }
  }

  // Parse customM.streak if available for fallback or enhancement
  if (customM && customM.streak !== undefined && customM.streak !== null) {
    const sStr = String(customM.streak).trim();
    if (sStr === '0' || sStr.toLowerCase() === 'none') {
      if (streakGames.length === 0) {
        streakLeader = null;
        streakCount = 0;
      }
    } else {
      const match = sStr.match(/^([A-Za-z0-9_'\s]+?)\s*(?:W)?(\d+)(?:[,\s]*\((.*?)\)|,\s*(.*))?$/);
      if (match) {
        const parsedLeader = match[1].trim();
        const parsedCount = parseInt(match[2], 10);
        const parsedDetail = match[3] || match[4] || '';
        if (streakGames.length === 0 && parsedCount > 0) {
          streakLeader = parsedLeader;
          streakCount = parsedCount;
          let synWk = 1, synYr = 2025, synWScore = 0, synLScore = 0;
          const dMatch = parsedDetail.match(/Wk(\d+)(?:'(\d+))?(?:,\s*([\d.]+)-([\d.]+))?/i);
          if (dMatch) {
            synWk = parseInt(dMatch[1], 10);
            synYr = dMatch[2] ? (parseInt(dMatch[2], 10) < 100 ? 2000 + parseInt(dMatch[2], 10) : parseInt(dMatch[2], 10)) : 2025;
            synWScore = dMatch[3] ? parseFloat(dMatch[3]) : 0;
            synLScore = dMatch[4] ? parseFloat(dMatch[4]) : 0;
          }
          const synLoser = (parsedLeader === o1) ? o2 : o1;
          streakGames.push({
            year: synYr,
            week: synWk,
            stage: 'Regular Season',
            winner: parsedLeader,
            loser: synLoser,
            winnerScore: synWScore,
            loserScore: synLScore,
            margin: Math.abs(synWScore - synLScore)
          });
        }
      }
    }
  }

  let streakClean = '0';
  if (streakCount > 0 && streakLeader) {
    streakClean = `${streakLeader} ${streakCount}`;
  }
  let streakFull = streakClean;
  if (customM && customM.streak !== undefined && customM.streak !== null) {
    streakFull = String(customM.streak);
  } else if (streakCount > 0 && streakGames.length > 0) {
    const topG = streakGames[0];
    streakFull = `${streakLeader} ${streakCount} (Wk${topG.week}'${String(topG.year).slice(-2)}, ${topG.winnerScore.toFixed(2)}-${topG.loserScore.toFixed(2)})`;
  }

  // Calculate historical playoff matchups
  const playoffGames = pastGames
    .filter(m => Boolean(m.isPlayoff || (m.stage && !m.stage.toLowerCase().includes('regular'))))
    .map(m => {
      const gh = Number(m.homeScore || 0);
      const ga = Number(m.awayScore || 0);
      const winner = gh > ga ? m.homeOwner : (ga > gh ? m.awayOwner : (m.winner || 'Tie'));
      const loser = winner === m.homeOwner ? m.awayOwner : m.homeOwner;
      return {
        year: Number(m.seasonYear ?? m.year),
        week: Number(m.weekNumber ?? m.week),
        stage: m.stage || (Number(m.weekNumber ?? m.week) >= 17 ? 'Finals' : (Number(m.weekNumber ?? m.week) === 16 ? 'Semifinals' : 'Playoffs')),
        winner,
        loser,
        winnerScore: Math.max(gh, ga),
        loserScore: Math.min(gh, ga),
        margin: Math.abs(gh - ga)
      };
    })
    .reverse(); // Most recent first

  // Parse customM.playoffs if available and playoffGames is empty
  if (playoffGames.length === 0 && customM && (customM.playoffs || customM.playoffH2H)) {
    const pStr = String(customM.playoffs || customM.playoffH2H).trim();
    if (pStr && pStr !== '0-0') {
      const match = pStr.match(/^(\d+-\d+)(?:[,\s]*\((.*?)\)|,\s*(.*))?$/);
      if (match) {
        const pDetail = match[2] || match[3] || '';
        if (pDetail) {
          const dMatch = pDetail.match(/([A-Za-z0-9_]+)'?(\d+)?(?:,\s*([\d.]+)-([\d.]+))?/i);
          if (dMatch) {
            const synStage = dMatch[1];
            const synYr = dMatch[2] ? (parseInt(dMatch[2], 10) < 100 ? 2000 + parseInt(dMatch[2], 10) : parseInt(dMatch[2], 10)) : 2025;
            const synWScore = dMatch[3] ? parseFloat(dMatch[3]) : 0;
            const synLScore = dMatch[4] ? parseFloat(dMatch[4]) : 0;
            playoffGames.push({
              year: synYr,
              week: 17,
              stage: synStage,
              winner: o1,
              loser: o2,
              winnerScore: synWScore,
              loserScore: synLScore,
              margin: Math.abs(synWScore - synLScore)
            });
          }
        }
      }
    }
  }

  let o1PlayoffWins = playoffGames.filter(g => g.winner === o1).length;
  let o2PlayoffWins = playoffGames.filter(g => g.winner === o2).length;
  let playoffRec = `${o1PlayoffWins}-${o2PlayoffWins}`;

  if (playoffGames.length === 0 && customM && (customM.playoffs || customM.playoffH2H)) {
    const pRaw = String(customM.playoffs || customM.playoffH2H);
    const cleanRec = pRaw.replace(/\s*\(.*?\)/g, '').split(',')[0].trim();
    if (cleanRec) playoffRec = cleanRec;
  }

  let playoffClean = playoffRec;
  let playoffFull = playoffRec;
  if (customM && customM.playoffs) {
    playoffFull = String(customM.playoffs);
  } else if (customM && customM.playoffH2H) {
    playoffFull = String(customM.playoffH2H);
  } else if (playoffGames.length > 0) {
    const topP = playoffGames[0];
    playoffFull = `${playoffRec} (${topP.stage}'${String(topP.year).slice(-2)}, ${topP.winnerScore.toFixed(2)}-${topP.loserScore.toFixed(2)})`;
  }

  return {
    h2hStr: h2hClean,
    h2hClean,
    h2hFull,
    streakLeader,
    streakCount,
    streakGames,
    streakClean,
    streakFull,
    playoffRec,
    playoffGames,
    playoffClean,
    playoffFull
  };
}

/**
 * Builds HTML for the weekly matchups grid (3x2 on desktop, 1 col on mobile)
 */
export function buildWeeklyMatchupsGridHtml({
  matchups = [],
  rankMap = {},
  season = 2025,
  week = 1,
  mode = 'recap',
  commentary = null,
  lineups = [],
  allMatchups = [],
  showReportScores = false,
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

    // Editorial Commentary lookup
    let customM = null;
    let isGameOfWeek = false;
    if (commentary && commentary.matchups) {
      customM = commentary.matchups.find(cm =>
        (cm.homeOwner === o1 && cm.awayOwner === o2) || (cm.homeOwner === o2 && cm.awayOwner === o1)
      );
      if (customM) {
        isGameOfWeek = Boolean(customM.isGameOfTheWeek || (customM.writeup && customM.writeup.startsWith('Game of the Week:')));
      }
    }

    // Compute stakes: H2H, Streak (with all games), Playoffs (with all games)
    const stakes = computeMatchupStakes({
      o1,
      o2,
      season,
      week,
      customM,
      allMatchups
    });

    const h2hBadgeText = showReportScores ? stakes.h2hFull : stakes.h2hClean;
    const streakBadgeText = showReportScores ? stakes.streakFull : stakes.streakClean;
    const playoffBadgeText = showReportScores ? stakes.playoffFull : stakes.playoffClean;

    // Popover for Streak: shows every game in the winning streak
    const streakPopoverHtml = `
      <div class="tooltip-content tooltip-content-bottom matchup-stakes-popover p-2.5 ${isCrt ? 'bg-[#020b05] text-emerald-100 border-2 border-emerald-500' : 'bg-white text-purple-950 border-2 border-pink-400'} rounded-lg text-xs shadow-2xl text-left font-normal min-w-[270px] z-50 overflow-hidden" style="max-height: none !important; overflow: hidden !important;">
        <div class="font-bold text-[11px] pb-1.5 mb-1.5 border-b ${isCrt ? 'border-emerald-800 text-amber-300' : 'border-pink-200 text-pink-700'} flex items-center justify-between">
          <span>⚡ ACTIVE STREAK: ${stakes.streakLeader || 'None'} ${stakes.streakCount > 0 ? `(${stakes.streakCount} Game${stakes.streakCount === 1 ? '' : 's'})` : ''}</span>
          <span class="font-mono text-[10px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'}">${stakes.streakClean}</span>
        </div>
        ${stakes.streakGames.length > 0 ? `
          <div class="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5" style="scrollbar-width: none; -ms-overflow-style: none;">
            ${stakes.streakGames.map(g => `
              <div class="p-1.5 rounded ${isCrt ? 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-200' : 'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-purple-950'} transition-all flex items-center justify-between gap-2 cursor-pointer group"
                   onclick="event.stopPropagation(); window.jumpToMatchup(${g.year}, ${g.week}, '${g.winner}', '${g.loser}')"
                   title="Jump to ${g.year} Week ${g.week} Box Score">
                <div class="min-w-0">
                  <div class="font-mono text-[10px] ${isCrt ? 'text-emerald-400' : 'text-pink-600'} font-bold">
                    ${g.year} Wk ${g.week} ${g.stage && !g.stage.toLowerCase().includes('regular') ? `• ${g.stage}` : ''}
                  </div>
                  <div class="text-[11px] font-bold truncate">
                    <span class="${isCrt ? 'text-amber-300' : 'text-pink-700'} font-extrabold">${g.winner}</span> ${g.winnerScore.toFixed(2)} - ${g.loserScore.toFixed(2)} ${g.loser}
                  </div>
                  <div class="text-[9px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'} font-mono">Margin: +${g.margin.toFixed(2)} pts</div>
                </div>
                <span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${isCrt ? 'bg-emerald-800 text-emerald-200 group-hover:bg-amber-400 group-hover:text-black' : 'bg-pink-200 text-pink-800 group-hover:bg-pink-600 group-hover:text-white'} transition-colors font-bold">
                  Box ➔
                </span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-[11px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'} py-1 text-center">
            No active winning streak between these teams.
          </div>
        `}
      </div>
    `;

    // Popover for Playoffs: shows every historical playoff game
    const playoffPopoverHtml = `
      <div class="tooltip-content tooltip-content-right tooltip-content-bottom matchup-stakes-popover p-2.5 ${isCrt ? 'bg-[#020b05] text-emerald-100 border-2 border-emerald-500' : 'bg-white text-purple-950 border-2 border-pink-400'} rounded-lg text-xs shadow-2xl text-left font-normal min-w-[270px] z-50 overflow-hidden" style="max-height: none !important; overflow: hidden !important;">
        <div class="font-bold text-[11px] pb-1.5 mb-1.5 border-b ${isCrt ? 'border-emerald-800 text-amber-300' : 'border-pink-200 text-pink-700'} flex items-center justify-between">
          <span>🏆 POSTSEASON HISTORY (${stakes.playoffGames.length} Game${stakes.playoffGames.length === 1 ? '' : 's'})</span>
          <span class="font-mono text-[10px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'}">${stakes.playoffRec}</span>
        </div>
        ${stakes.playoffGames.length > 0 ? `
          <div class="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5" style="scrollbar-width: none; -ms-overflow-style: none;">
            ${stakes.playoffGames.map(g => `
              <div class="p-1.5 rounded ${isCrt ? 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-200' : 'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-purple-950'} transition-all flex items-center justify-between gap-2 cursor-pointer group"
                   onclick="event.stopPropagation(); window.jumpToMatchup(${g.year}, ${g.week}, '${g.winner}', '${g.loser}')"
                   title="Jump to ${g.year} Week ${g.week} Playoff Box Score">
                <div class="min-w-0">
                  <div class="font-mono text-[10px] ${isCrt ? 'text-emerald-400' : 'text-pink-600'} font-bold">
                    ${g.year} ${formatPlayoffStageTag(g.stage, g.year)} (Wk ${g.week})
                  </div>
                  <div class="text-[11px] font-bold truncate">
                    <span class="${isCrt ? 'text-amber-300' : 'text-pink-700'} font-extrabold">${g.winner}</span> ${g.winnerScore.toFixed(2)} - ${g.loserScore.toFixed(2)} ${g.loser}
                  </div>
                  <div class="text-[9px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'} font-mono">Margin: +${g.margin.toFixed(2)} pts</div>
                </div>
                <span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${isCrt ? 'bg-emerald-800 text-emerald-200 group-hover:bg-amber-400 group-hover:text-black' : 'bg-pink-200 text-pink-800 group-hover:bg-pink-600 group-hover:text-white'} transition-colors font-bold">
                  Box ➔
                </span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-[11px] ${isCrt ? 'text-emerald-400' : 'text-purple-600'} py-1 text-center">
            No previous playoff matchups recorded.
          </div>
        `}
      </div>
    `;

    // Top Stakes Marquee Bar
    const topStakesBarHtml = `
      <div class="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b ${isCrt ? 'border-emerald-900/80 font-mono' : 'border-pink-200 font-sans'} text-[10px] flex-wrap sm:flex-nowrap">
        ${isGameOfWeek ? `<span class="px-1.5 py-0.5 rounded ${isCrt ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-amber-100 text-amber-800 border border-amber-300'} font-black text-[9px] tracking-wide animate-pulse shrink-0">🔥 GOTW</span>` : ''}
        <!-- H2H Deeplink Chip -->
        <button type="button" onclick="event.stopPropagation(); window.jumpToH2H('${o1}', '${o2}')"
                class="px-2 py-1 rounded ${isCrt ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500' : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-300'} font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                title="Jump to Head-to-Head Hub for ${o1} vs ${o2}">
          <span>⚔️ H2H: <strong class="${isCrt ? 'text-amber-300' : 'text-purple-900'}">${h2hBadgeText}</strong></span>
          <span class="text-[9px] opacity-70">➔</span>
        </button>

        <!-- Streak Popover Chip -->
        <div class="tooltip-trigger relative inline-flex">
          <button type="button" class="px-2 py-1 rounded ${isCrt ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500' : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-300'} font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                  title="Inspect active winning streak game details">
            <span>⚡ STREAK: <strong class="${isCrt ? 'text-amber-300' : 'text-purple-900'}">${streakBadgeText}</strong></span>
            <span class="text-[9px] opacity-70">▾</span>
          </button>
          ${streakPopoverHtml}
        </div>

        <!-- Playoffs Popover Chip -->
        <div class="tooltip-trigger relative inline-flex">
          <button type="button" class="px-2 py-1 rounded ${isCrt ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500' : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-300'} font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                  title="Inspect playoff matchup history">
            <span>🏆 PLAYOFFS: <strong class="${isCrt ? 'text-amber-300' : 'text-purple-900'}">${playoffBadgeText}</strong></span>
            <span class="text-[9px] opacity-70">▾</span>
          </button>
          ${playoffPopoverHtml}
        </div>
      </div>
    `;

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

    // Editorial Commentary without redundant duplicate meta line
    let commentaryHtml = '';
    if (customM && customM.writeup) {
      commentaryHtml = `
        <div class="mt-2 p-2.5 ${isCrt ? 'bg-black/90 border border-emerald-800/80 text-emerald-300' : 'bg-purple-50 border border-pink-200 text-purple-900'} rounded text-[11px] leading-relaxed">
          <span class="text-[9px] uppercase font-bold ${isCrt ? 'text-emerald-500 font-mono' : 'text-pink-600 font-fredoka'} block mb-1">&gt; ${isRecap ? 'RECAP_NOTES' : 'MATCHUP_PREVIEW'}:</span>
          <div class="text-[11px] leading-relaxed">${customM.writeup}</div>
        </div>
      `;
    }

    const baseBorder = isGameOfWeek
      ? (isCrt ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'border-amber-400 shadow-lg')
      : (isCrt ? 'border-emerald-800 hover:border-emerald-500' : 'border-pink-200 hover:border-pink-400 shadow-md');
    const cardBg = isCrt ? `bg-black/80 ${baseBorder}` : `bg-white ${baseBorder}`;
    const rowT1Bg = isRecap && isWinner1 ? (isCrt ? 'bg-emerald-950/60 border-l-2 border-emerald-400' : 'bg-pink-50/80 border-l-2 border-pink-500') : '';
    const rowT2Bg = isRecap && isWinner2 ? (isCrt ? 'bg-emerald-950/60 border-l-2 border-emerald-400' : 'bg-pink-50/80 border-l-2 border-pink-500') : '';

    const cardContent = `
      <div id="matchup-card-${mId}" data-season="${season}" data-week="${week}" data-owner1="${o1}" data-owner2="${o2}" data-matchup-key="${season}-w${week}-${[o1, o2].sort().join('-')}" class="matchup-card-container crt-box rounded-xl p-3 border ${cardBg} flex flex-col justify-between transition-all overflow-visible relative">
        <div>
          <!-- Top Stakes Marquee Bar -->
          ${topStakesBarHtml}

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
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
      <div id="matchup-card-${mId}" data-season="${season}" data-week="${wk}" data-owner1="${owner}" data-owner2="${oppOwner}" data-matchup-key="${season}-w${wk}-${[owner, oppOwner].sort().join('-')}" class="matchup-card-container crt-box rounded-xl p-3 border ${isCrt ? 'bg-black/80 border-emerald-900 hover:border-emerald-600' : 'bg-white border-pink-200 hover:border-pink-400 shadow-md'} flex flex-col justify-between transition-all overflow-visible relative">
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
