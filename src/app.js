import { createIcons, icons } from 'lucide';
import Chart from 'chart.js/auto';
import { loadLeagueData } from './core/dataLoader.js';
import { escapeHtml } from './core/sanitizer.js';
import {
  isOneYearManager,
  formatPlayoffStageTag,
  getStatCardTop5 as sharedGetStatCardTop5,
  getGlobalAllTimeStatRecords as sharedGetGlobalAllTimeStatRecords,
  getPlayoffMatchupResult as sharedGetPlayoffMatchupResult
} from './analytics/statRecords.js';
import { getNormalizedPlayerName, getPlayerRingInfo as sharedGetPlayerRingInfo } from './analytics/rings.js';
import { getPlayerLifetimeDraftHistory, filterDraftPicks } from './analytics/draft.js';
import { CRT_THEME } from './theme/theme.js';
import {
  buildStatCardTop5Popover as sharedBuildStatCardTop5Popover,
  getPlayerLifetimeDraftPopover as sharedGetPlayerLifetimeDraftPopover,
  getPlayerRingBadgeHtml as sharedGetPlayerRingBadgeHtml
} from './components/popovers.js';
import { buildDynastyLeaderboardRows } from './components/standingsView.js';
import { buildH2HComparisonBannerHtml, buildH2HGameLogRows } from './components/h2hView.js';
import { buildPlayoffBracketHtml } from './components/playoffView.js';
import { buildFranchiseProfileHtml } from './components/franchiseView.js';
import { buildManagerialProwessHtml, buildMatchupLineupCardHtml } from './components/managerialView.js';
import { computeManagerialLeaderboard } from './analytics/managerial.js';

// Setup Lucide icons wrapper
function renderLucideIcons() {
  createIcons({ icons });
}

// Make functions available globally for inline HTML onclick handlers

    let currentTab = 'seasons';
    let currentSeason = 2026;
    let currentDraftSeason = '2026';
    let currentSeasonsSubTab = 'actual';
    let standingsSortField = 'rank';
    let standingsSortAsc = true;
    let luckChartInstance = null;
    let pfPaChartInstance = null;



    async function initApp() {
      try {
        window.LEAGUE_DATA = await loadLeagueData('data/leagueData.json');
        initSeasonSelector();
        initStatsYearSelects();
        renderStandings();
        renderStatRecords();
        initH2HSelects();
        renderChamps();
        initTeamOwnerSelect();
        renderAnalytics();
        renderStatsTable();
        initDraftTab();
        initMatchupsTab();
        renderLucideIcons();

        // Direct Deep Linking Support via URL Hash (e.g. #challenges or #bounties)
        const initialHash = window.location.hash.replace('#', '').toLowerCase();
        const validTabs = ['seasons', 'h2h', 'matchups', 'champs', 'teams', 'draft', 'analytics', 'challenges', 'bounties'];
        if (initialHash && validTabs.includes(initialHash)) {
          const targetTab = (initialHash === 'bounties') ? 'challenges' : initialHash;
          switchTab(targetTab);
        }
      } catch (err) {
        console.error('Error initializing Y2K Record Book app:', err);
      }
    }

    window.addEventListener('hashchange', () => {
      const validTabs = ['seasons', 'h2h', 'matchups', 'champs', 'teams', 'draft', 'analytics', 'challenges', 'bounties'];
      const newHash = window.location.hash.replace('#', '').toLowerCase();
      if (newHash && validTabs.includes(newHash)) {
        const targetTab = (newHash === 'bounties') ? 'challenges' : newHash;
        if (currentTab !== targetTab) switchTab(targetTab);
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }

    function switchTab(tabId) {
      setTimeout(renderLucideIcons, 0);
      currentTab = tabId;
      window.scrollTo(0, 0);
      if (typeof window !== 'undefined' && window.location && window.history && window.history.replaceState) {
        if (window.location.hash !== `#${tabId}`) {
          history.replaceState(null, null, `#${tabId}`);
        }
      }
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${tabId}`).classList.remove('hidden');

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-900/60', 'text-emerald-300', 'border-emerald-500');
        btn.classList.add('text-emerald-500', 'border-transparent');
      });
      const activeNav = document.getElementById(`nav-${tabId}`);
      if (activeNav) {
        activeNav.classList.add('bg-emerald-900/60', 'text-emerald-300', 'border-emerald-500');
        activeNav.classList.remove('text-emerald-500', 'border-transparent');
      }

      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-400', 'font-bold');
        btn.classList.add('text-emerald-700');
      });
      const activeMobileNav = document.getElementById(`mobile-nav-${tabId}`);
      if (activeMobileNav) {
        activeMobileNav.classList.add('text-emerald-400', 'font-bold');
        activeMobileNav.classList.remove('text-emerald-700');
      }

      if (tabId === 'h2h') {
        renderH2HComparison();
        renderH2HMatrix();
        renderH2HStreaks('all');
      } else if (tabId === 'champs') {
        renderChamps();
      } else if (tabId === 'teams') {
        initTeamOwnerSelect();
      } else if (tabId === 'stats') {
        renderStatsTable();
      } else if (tabId === 'matchups') {
        renderMatchupsTab();
      } else if (tabId === 'draft') {
        initDraftTab();
      } else if (tabId === 'analytics') {
        renderAnalyticsCharts();
      }
    }

    function initSeasonSelector() {
      const container = document.getElementById('season-selector-container');
      container.innerHTML = '';
      const seasons = [...window.LEAGUE_DATA.seasons].reverse();

      seasons.forEach(yr => {
        const btn = document.createElement('button');
        btn.id = `btn-season-${yr}`;
        btn.onclick = () => selectSeason(yr);
        btn.className = `px-2.5 py-1 text-xs font-bold transition-all border ${yr === currentSeason ? 'bg-emerald-900 text-emerald-300 border-emerald-400' : 'bg-black text-emerald-600 border-emerald-900 hover:border-emerald-700'}`;
        btn.innerText = yr;
        container.appendChild(btn);
      });

      const allTimeBtn = document.createElement('button');
      allTimeBtn.id = 'btn-season-allTime';
      allTimeBtn.onclick = () => selectSeason('allTime');
      allTimeBtn.className = 'px-2.5 py-1 text-xs font-bold transition-all border bg-black text-emerald-600 border-emerald-900 hover:border-emerald-700';
      allTimeBtn.innerText = 'ALL_TIME';
      container.appendChild(allTimeBtn);
    }

    function selectSeason(yr) {
      currentSeason = yr;
      document.querySelectorAll('#season-selector-container button').forEach(btn => {
        btn.className = 'px-2.5 py-1 text-xs font-bold transition-all border bg-black text-emerald-600 border-emerald-900 hover:border-emerald-700';
      });
      const activeBtn = document.getElementById(`btn-season-${yr}`);
      if (activeBtn) {
        activeBtn.className = 'px-2.5 py-1 text-xs font-bold transition-all border bg-emerald-900 text-emerald-300 border-emerald-400';
      }

      const banner = document.getElementById('champion-banner');
      const playoffSubBtn = document.getElementById('subnav-playoff');
      if (yr === 'allTime') {
        standingsSortField = 'winPct';
        standingsSortAsc = false;
        banner.innerHTML = `&gt; ARCHIVE_VIEW: <span class="font-bold text-emerald-300 crt-glow">All-Time Cumulative League Standings</span>`;
        if (playoffSubBtn) playoffSubBtn.innerHTML = `[+] DYNASTY LEADERBOARD`;
      } else {
        standingsSortField = 'rank';
        standingsSortAsc = true;
        const champ = window.LEAGUE_DATA.championships.find(c => c.seasonYear === yr);
        if (champ) {
          banner.innerHTML = `&gt; ACTIVE_CHAMPION: <span class="font-bold text-emerald-300 crt-glow">${champ.firstTeam}</span> (${yr} Nebuchadnezzar Cup Winner - ${champ.firstOwner})`;
        } else {
          banner.innerHTML = `&gt; SEASON_VIEW: <span class="font-bold text-emerald-300">${yr} Season</span>`;
        }
        if (playoffSubBtn) playoffSubBtn.innerHTML = `[+] PLAYOFF BRACKET`;
      }

      renderStandings();
      renderStatRecords();
    }

    function switchSeasonsSubTab(subTab) {
      currentSeasonsSubTab = subTab;
      document.querySelectorAll('.subnav-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-900', 'text-emerald-300', 'border', 'border-emerald-500');
        btn.classList.add('text-emerald-600');
      });
      const activeSub = document.getElementById(`subnav-${subTab}`);
      if (activeSub) {
        activeSub.classList.add('bg-emerald-900', 'text-emerald-300', 'border', 'border-emerald-500');
        activeSub.classList.remove('text-emerald-600');
      }
      renderStandings();
    }

    function sortStandings(field) {
      let targetField = field;
      if (currentSeason === 'allTime') {
        if (field === 'wins' || field === 'winPct') targetField = 'winPct';
        if (field === 'ovrRecord' || field === 'ovrWinPct') targetField = 'ovrWinPct';
      }

      if (standingsSortField === targetField) {
        standingsSortAsc = !standingsSortAsc;
      } else {
        standingsSortField = targetField;
        standingsSortAsc = (targetField === 'rank' || targetField === 'teamName') ? true : false;
      }
      renderStandings();
    }

    function renderStandings() {
      const container = document.getElementById('seasons-view-container');

      if (currentSeasonsSubTab === 'playoff') {
        if (currentSeason !== 'allTime') {
          renderPlayoffBracketView(container);
          return;
        } else {
          // In All-Time context, Playoff Bracket tab surfaces the full Dynasty Leaderboard
          container.innerHTML = `
            <div class="crt-box rounded p-4 mb-6">
              <div class="text-xs text-emerald-400 tracking-widest font-bold uppercase mb-1">&gt;_ ALL-TIME_DYNASTY_STANDINGS</div>
              <h2 class="text-2xl font-black text-emerald-300 crt-glow">NEBUCHADNEZZAR CUP &amp; DYNASTY LEADERBOARD</h2>
              <p class="text-xs text-emerald-300/80 mt-1 font-mono">Lifetime Championship Finishes, Placement Bins, and Playoff Win-Loss Records.</p>
            </div>
            <div class="crt-box rounded overflow-visible mb-8">
              <div class="table-scroll-container">
                <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
                  <thead class="bg-[#052611] text-emerald-300 font-bold border-b border-emerald-600 text-xs">
                    <tr>
                      <th class="p-3 text-center">RANK</th>
                      <th onclick="window.sortDynastyLeaderboard('ownerName')" class="p-3 text-left cursor-pointer hover:bg-emerald-900">MANAGER</th>
                      <th class="p-3 text-center">ACTIVE</th>
                      <th onclick="window.sortDynastyLeaderboard('playoffWins')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">PLAYOFF W-L</th>
                      <th onclick="window.sortDynastyLeaderboard('playoffPct')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">PLAYOFF %</th>
                      <th onclick="window.sortDynastyLeaderboard('1st')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🥇 1st</th>
                      <th onclick="window.sortDynastyLeaderboard('2nd')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🥈 2nd</th>
                      <th onclick="window.sortDynastyLeaderboard('3rd')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🥉 3rd</th>
                      <th onclick="window.sortDynastyLeaderboard('4th')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">4th</th>
                      <th onclick="window.sortDynastyLeaderboard('5th_6th')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">5th-6th</th>
                      <th onclick="window.sortDynastyLeaderboard('7th_12th')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">7th-12th</th>
                      <th onclick="window.sortDynastyLeaderboard('scoringTitles')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🎯 SCORING TITLES</th>
                      <th onclick="window.sortDynastyLeaderboard('coachingEfficiency')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🧠 COACHING EFF</th>
                      <th onclick="window.sortDynastyLeaderboard('dOhs')" class="p-3 text-center cursor-pointer hover:bg-emerald-900">🤦‍♂️ D'OHS</th>
                    </tr>
                  </thead>
                  <tbody id="champs-leaderboard-body-seasons"></tbody>
                </table>
              </div>
            </div>
          `;

          const tbody = document.getElementById('champs-leaderboard-body-seasons');
          const leaderboard = window.LEAGUE_DATA.allTimeStandings.filter(s => !isOneYearManager(s.ownerName)).slice();
          const f = window.dynastySortField || '1st';
          leaderboard.sort((a, b) => {
            const cA = a.championships || {}, cB = b.championships || {};
            let vA = 0, vB = 0;
            if (f === 'coachingEfficiency') {
              vA = a.coachingEfficiency || 0; vB = b.coachingEfficiency || 0;
            } else if (f === 'dOhs') {
              vA = a.dOhs || 0; vB = b.dOhs || 0;
            } else if (f === '1st' || f === '2nd' || f === '3rd' || f === '4th') {
              vA = cA[f] || 0; vB = cB[f] || 0;
            } else if (f === '5th_6th') {
              vA = (a.finishes && a.finishes['5th_6th'] ? a.finishes['5th_6th'].length : 0);
              vB = (b.finishes && b.finishes['5th_6th'] ? b.finishes['5th_6th'].length : 0);
            } else if (f === '7th_12th') {
              vA = (a.finishes && a.finishes['7th_12th'] ? a.finishes['7th_12th'].length : 0);
              vB = (b.finishes && b.finishes['7th_12th'] ? b.finishes['7th_12th'].length : 0);
            } else if (f === 'scoringTitles') {
              vA = cA.scoringTitles || 0; vB = cB.scoringTitles || 0;
            } else if (f === 'playoffWins') {
              vA = a.playoffWins || 0; vB = b.playoffWins || 0;
            } else if (f === 'playoffPct') {
              vA = a.playoffPct || 0; vB = b.playoffPct || 0;
            } else if (f === 'ownerName') {
              return window.dynastySortAsc ? a.ownerName.localeCompare(b.ownerName) : b.ownerName.localeCompare(a.ownerName);
            } else {
              if ((cB['1st'] || 0) !== (cA['1st'] || 0)) return (cB['1st'] || 0) - (cA['1st'] || 0);
              if ((cB['2nd'] || 0) !== (cA['2nd'] || 0)) return (cB['2nd'] || 0) - (cA['2nd'] || 0);
              if ((cB['3rd'] || 0) !== (cA['3rd'] || 0)) return (cB['3rd'] || 0) - (cA['3rd'] || 0);
              return b.winPct - a.winPct;
            }
            if (vA < vB) return window.dynastySortAsc ? -1 : 1;
            if (vA > vB) return window.dynastySortAsc ? 1 : -1;
            return b.winPct - a.winPct;
          });

          tbody.innerHTML = buildDynastyLeaderboardRows({
            leaderboard,
            championships: window.LEAGUE_DATA.championships,
            theme: CRT_THEME
          });
          return;
        }
      }

      container.innerHTML = `
        <div class="crt-box rounded overflow-visible mb-8">
          <div class="table-scroll-container">
            <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
              <thead class="crt-box-header font-bold border-b border-emerald-600">
                <tr id="standings-table-header"></tr>
              </thead>
              <tbody id="standings-table-body"></tbody>
            </table>
          </div>
        </div>
      `;

      const headerTr = document.getElementById('standings-table-header');
      const tbody = document.getElementById('standings-table-body');
      headerTr.innerHTML = ''; tbody.innerHTML = '';

      let list = [];
      if (currentSeason === 'allTime') {
        // Filter out 1-year managers (Nick & Torin) from All-Time standings
        list = window.LEAGUE_DATA.allTimeStandings
          .filter(entry => !isOneYearManager(entry.ownerName))
          .map((entry, idx) => {
            const luckVal = entry.luck !== undefined ? entry.luck : 0;
            const ovrTot = (entry.ovrWins || 0) + (entry.ovrLosses || 0);
            const ovrWinPct = entry.ovrWinPct || (ovrTot > 0 ? Math.round(((entry.ovrWins || 0) / ovrTot) * 1000) / 10 : 0);
            const winPct = entry.winPct || (entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 1000) / 10 : 0);
            return {
              rank: idx + 1,
              teamName: entry.teamName,
              ownerName: entry.ownerName,
              wins: entry.wins,
              losses: entry.losses,
              winPct: winPct,
              form: [],
              luck: luckVal,
              ovrWins: entry.ovrWins || 0,
              ovrLosses: entry.ovrLosses || 0,
              ovrWinPct: ovrWinPct,
              ovrRecord: entry.ovrRecord || `${entry.wins}-${entry.losses}`,
              weeklyWins: entry.weeklyWins || 0,
              wwDetails: entry.wwDetails || [],
              luckiestWins: entry.luckiestWins || 0,
              lwDetails: entry.lwDetails || [],
              heartbreaks: entry.heartbreaks || 0,
              hbDetails: entry.hbDetails || [],
              toughestLosses: entry.toughestLosses || 0,
              tlDetails: entry.tlDetails || [],
              dOhs: entry.dOhs !== undefined ? entry.dOhs : (entry.dOhDetails ? entry.dOhDetails.length : 0),
              dOhDetails: entry.dOhDetails || [],
              coachingEfficiency: entry.coachingEfficiency !== undefined ? entry.coachingEfficiency : null,
              optimalPointsFor: entry.optimalPointsFor !== undefined ? entry.optimalPointsFor : null,
              optPfg: entry.optimalPointsFor && (entry.wins + entry.losses > 0) ? Math.round((entry.optimalPointsFor / (entry.wins + entry.losses)) * 10) / 10 : null,
              pointsFor: entry.pointsFor,
              pointsAgainst: entry.pointsAgainst
            };
          });
      } else {
        const sData = window.LEAGUE_DATA.seasonData[currentSeason];
        if (sData) {
          list = sData.standings.map(st => {
            const expW = parseInt((st.expRecord || '0-0').split('-')[0]) || 0;
            const luckVal = st.wins - expW;
            return {
              ...st,
              luck: luckVal
            };
          });
        }
      }

      list.sort((a, b) => {
        let field = standingsSortField;
        if (currentSeason === 'allTime') {
          if (field === 'wins') field = 'winPct';
          if (field === 'ovrRecord') field = 'ovrWinPct';
          if (field === 'pointsFor') field = 'pfg';
          if (field === 'optimalPointsFor' || field === 'optimalPF') field = 'optPfg';
          if (field === 'pointsAgainst') field = 'pag';
        }

        let vA = a[field];
        let vB = b[field];
        if (typeof vA === 'string') vA = vA.toLowerCase();
        if (typeof vB === 'string') vB = vB.toLowerCase();
        if (vA < vB) return standingsSortAsc ? -1 : 1;
        if (vA > vB) return standingsSortAsc ? 1 : -1;
        return 0;
      });

      headerTr.innerHTML = `
        <th onclick="sortStandings('rank')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">#</th>
        <th onclick="sortStandings('teamName')" class="p-2.5 cursor-pointer hover:bg-emerald-900">FRANCHISE_TEAM</th>
        <th onclick="sortStandings('wins')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">W-L</th>
        <th class="p-2.5 text-center">FORM</th>
        <th onclick="sortStandings('luck')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 rounded text-xs hover:bg-emerald-900 transition-all inline-block shadow-sm">🍀 LUCK</span>
            <div class="tooltip-content tooltip-content-bottom p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl text-left font-normal min-w-[220px]">
              🍀 <span class="font-bold text-emerald-400">Luck Index:</span> Actual wins minus expected wins (1 expected win awarded each week your score is in the top 50% of the league).
            </div>
          </div>
        </th>
        <th onclick="sortStandings('ovrRecord')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">OVR_W-L</th>
        <th onclick="sortStandings('weeklyWins')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 rounded text-xs hover:bg-emerald-800 transition-all inline-block shadow-sm">⚡ WW</span>
            <div class="tooltip-content tooltip-content-bottom p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl text-left font-normal min-w-[220px]">
              ⚡ <span class="font-bold text-emerald-400">WW (Weekly Wins):</span> Highest scoring team in a regular season week
            </div>
          </div>
        </th>
        <th onclick="sortStandings('luckiestWins')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 font-bold border border-emerald-600 rounded text-xs hover:bg-emerald-900 transition-all inline-block shadow-sm">🍀 LW</span>
            <div class="tooltip-content tooltip-content-bottom p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl text-left font-normal min-w-[220px]">
              🍀 <span class="font-bold text-emerald-400">LW (Luckiest Wins):</span> Lowest winning score in a regular season week
            </div>
          </div>
        </th>
        <th onclick="sortStandings('heartbreaks')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-red-950/80 text-red-400 font-bold border border-red-700 rounded text-xs hover:bg-red-900 transition-all inline-block shadow-sm">💔 HB</span>
            <div class="tooltip-content tooltip-content-right tooltip-content-bottom p-2.5 bg-black text-emerald-300 rounded border border-red-600 text-xs shadow-2xl text-left font-normal min-w-[220px]">
              💔 <span class="font-bold text-red-400">HB (Heartbreaks):</span> Smallest point margin loss in a regular season week (losing by a hair)
            </div>
          </div>
        </th>
        <th onclick="sortStandings('toughestLosses')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-amber-950/80 text-amber-400 font-bold border border-amber-600 rounded text-xs hover:bg-amber-900 transition-all inline-block shadow-sm">🤕 TL</span>
            <div class="tooltip-content tooltip-content-right tooltip-content-bottom p-2.5 bg-black text-emerald-300 rounded border border-amber-500 text-xs shadow-2xl text-left font-normal min-w-[220px]">
              🤕 <span class="font-bold text-amber-400">TL (Toughest Losses):</span> Highest losing score in a regular season week (scoring tons of points in a loss)
            </div>
          </div>
        </th>
        <th onclick="sortStandings('dOhs')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-sky-950 text-sky-400 font-bold border border-sky-600 rounded text-xs hover:bg-sky-900 transition-all inline-block shadow-sm">🤦‍♂️ DO</span>
            <div class="tooltip-content tooltip-content-right tooltip-content-bottom p-2.5 bg-black text-sky-300 rounded border border-sky-600 text-xs shadow-2xl text-left font-normal min-w-[260px]">
              🤦‍♂️ <span class="font-bold text-sky-400">DO (D'Oh! Blunders):</span> Losses where swapping just 1 bench player would have won the matchup!
            </div>
          </div>
        </th>
        <th onclick="sortStandings('coachingEfficiency')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold border border-emerald-500 rounded text-xs hover:bg-emerald-800 transition-all inline-block shadow-sm">🧠 EFF</span>
            <div class="tooltip-content tooltip-content-right tooltip-content-bottom p-2.5 bg-black text-emerald-300 rounded border border-emerald-500 text-xs shadow-2xl text-left font-normal min-w-[260px]">
              🧠 <span class="font-bold text-emerald-400">Coaching Efficiency:</span> Actual PF / Optimal Best Ball PF. Measures how close start/sit decisions were to the max possible points.
            </div>
          </div>
        </th>
        <th onclick="sortStandings('pointsFor')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">${currentSeason === 'allTime' ? 'PF/G' : 'PF'}</th>
        <th onclick="sortStandings('optimalPointsFor')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">
          <div class="tooltip-trigger inline-block cursor-pointer">
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold border border-emerald-600 rounded text-xs hover:bg-emerald-800 transition-all inline-block shadow-sm">${currentSeason === 'allTime' ? 'OPT/G' : 'OPT_PF'}</span>
            <div class="tooltip-content tooltip-content-right tooltip-content-bottom p-2.5 bg-black text-emerald-300 rounded border border-emerald-500 text-xs shadow-2xl text-left font-normal min-w-[240px]">
              🎯 <span class="font-bold text-emerald-400">Optimal PF (Best Ball):</span> Theoretical maximum points possible with perfect weekly lineup decisions.
            </div>
          </div>
        </th>
        <th onclick="sortStandings('pointsAgainst')" class="p-2.5 text-center cursor-pointer hover:bg-emerald-900">${currentSeason === 'allTime' ? 'PA/G' : 'PA'}</th>
      `;

      list.forEach((item, idx) => {
        const tr = document.createElement('tr');
        const isTop3 = idx < 3;
        tr.className = `border-b border-emerald-950 transition-colors ${isTop3 ? 'bg-emerald-950/40 font-bold' : 'hover:bg-emerald-950/20'}`;

        let formHtml = '<div class="flex gap-1 justify-center font-mono font-bold text-[11px]">';
        if (item.form && item.form.length > 0) {
          item.form.forEach(f => {
            formHtml += (f === 'W')
              ? `<span class="text-emerald-400">W</span>`
              : `<span class="text-red-500">L</span>`;
          });
        } else {
          formHtml += `<span class="text-emerald-800">-</span>`;
        }
        formHtml += '</div>';

        const luckVal = item.luck || 0;
        const luckBadge = luckVal > 0
          ? `<span class="text-emerald-400 font-bold">+${luckVal} W</span>`
          : (luckVal < 0 ? `<span class="text-red-500 font-bold">${luckVal} W</span>` : `<span class="text-emerald-400">0</span>`);

        const rowPopDir = idx < 5 ? ' tooltip-content-bottom' : '';

        // 1. WW Badge
        let wwBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        const wwCount = item.weeklyWins || 0;
        if (wwCount > 0 && item.wwDetails) {
          let tooltipList = item.wwDetails.map(d => {
            const yrStr = d.year ? `${d.year} ` : '';
            return `<div class="py-0.5 text-xs text-left">• ${yrStr}Week ${d.week}: <span class="font-bold text-emerald-300">${d.score.toFixed(1)} PF</span></div>`;
          }).join('');

          wwBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 bg-emerald-900 text-emerald-300 font-bold border border-emerald-500 text-xs">${wwCount}</span>
              <div class="tooltip-content${rowPopDir} p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3">
                <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1">⚡ ${item.teamName} Weekly Wins (${wwCount})</div>
                ${tooltipList}
              </div>
            </div>
          `;
        }

        // 2. LW Badge
        let lwBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        const lwCount = item.luckiestWins || 0;
        if (lwCount > 0 && item.lwDetails) {
          let tooltipList = item.lwDetails.map(d => {
            const yrStr = d.year ? `${d.year} ` : '';
            return `<div class="py-0.5 text-xs text-left">• ${yrStr}Week ${d.week}: <span class="font-bold text-emerald-300">${d.score.toFixed(1)} PF</span> vs ${d.oppOwner} (${d.oppScore.toFixed(1)})</div>`;
          }).join('');

          lwBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 font-bold border border-emerald-600 text-xs">${lwCount}</span>
              <div class="tooltip-content${rowPopDir} p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3">
                <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1">🍀 ${item.teamName} Luckiest Wins (${lwCount})</div>
                ${tooltipList}
              </div>
            </div>
          `;
        }

        // 3. HB Badge
        let hbBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        const hbCount = item.heartbreaks || 0;
        if (hbCount > 0 && item.hbDetails) {
          let tooltipList = item.hbDetails.map(d => {
            const yrStr = d.year ? `${d.year} ` : '';
            return `<div class="py-0.5 text-xs text-left">• ${yrStr}Week ${d.week}: Lost by <span class="font-bold text-red-400">${d.margin.toFixed(2)} pts</span> (${d.score.toFixed(1)} - ${d.oppScore.toFixed(1)} vs ${d.oppOwner})</div>`;
          }).join('');

          hbBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 bg-red-950/80 text-red-400 font-bold border border-red-700 text-xs">${hbCount}</span>
              <div class="tooltip-content tooltip-content-right${rowPopDir} p-2.5 bg-black text-emerald-300 rounded border border-red-600 text-xs shadow-2xl">
                <div class="font-bold text-red-400 border-b border-red-900 pb-1 mb-1">💔 ${item.teamName} Heartbreaks (${hbCount})</div>
                ${tooltipList}
              </div>
            </div>
          `;
        }

        // 4. TL Badge
        let tlBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        const tlCount = item.toughestLosses || 0;
        if (tlCount > 0 && item.tlDetails) {
          let tooltipList = item.tlDetails.map(d => {
            const yrStr = d.year ? `${d.year} ` : '';
            return `<div class="py-0.5 text-xs text-left">• ${yrStr}Week ${d.week}: Lost <span class="font-bold text-amber-300">${d.score.toFixed(1)} - ${d.oppScore.toFixed(1)}</span> vs ${d.oppOwner} (${d.margin.toFixed(2)} pt margin)</div>`;
          }).join('');

          tlBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 bg-amber-950/60 text-amber-400 font-bold border border-amber-600 text-xs">${tlCount}</span>
              <div class="tooltip-content tooltip-content-right${rowPopDir} p-2.5 bg-black text-emerald-300 rounded border border-amber-500 text-xs shadow-2xl">
                <div class="font-bold text-amber-400 border-b border-amber-800 pb-1 mb-1">🤕 ${item.teamName} Toughest Losses (${tlCount})</div>
                ${tooltipList}
              </div>
            </div>
          `;
        }

        // 5. DO Badge (D'Ohs)
        let doBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        const doCount = item.dOhs !== undefined ? item.dOhs : (item.dOhDetails ? item.dOhDetails.length : 0);
        if (doCount > 0 && item.dOhDetails && item.dOhDetails.length > 0) {
          let tooltipList = item.dOhDetails.map(d => {
            const yrStr = d.year ? `${d.year} ` : '';
            const swapStr = d.benchPlayer && d.starter
              ? `Benched <span class="text-sky-300 font-bold">${d.benchPlayer}</span> (${d.benchPoints} pts) for <span class="text-red-400 font-bold">${d.starter}</span> (${d.starterPoints} pts) ➔ <span class="text-emerald-400 font-bold">+${d.netGain} PF</span> (Win by +${d.winMargin} pts)`
              : `Benched winning player for starter`;
            return `<div class="py-0.5 text-xs text-left">• ${yrStr}Week ${d.week}: ${swapStr}</div>`;
          }).join('');

          doBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 bg-sky-950 text-sky-400 font-bold border border-sky-600 text-xs">${doCount}</span>
              <div class="tooltip-content tooltip-content-right${rowPopDir} p-2.5 bg-black text-sky-300 rounded border border-sky-600 text-xs shadow-2xl min-w-[280px] text-left z-50">
                <div class="font-bold text-sky-400 border-b border-sky-900 pb-1 mb-1">🤦‍♂️ ${item.teamName} D'Oh! Blunders (${doCount})</div>
                ${tooltipList}
              </div>
            </div>
          `;
        } else if (item.dOhs === 0) {
          doBadge = `<span class="px-2 py-0.5 bg-black/60 text-emerald-600 font-bold border border-emerald-900/60 text-xs">0</span>`;
        }

        const effVal = item.coachingEfficiency !== null && item.coachingEfficiency !== undefined ? `${Number(item.coachingEfficiency).toFixed(1)}%` : '-';
        const effCell = `<span class="font-bold font-mono text-emerald-300">${effVal}</span>`;

        const optPfVal = currentSeason === 'allTime'
          ? (item.optPfg !== undefined && item.optPfg !== null ? item.optPfg.toFixed(1) : (item.optimalPointsFor ? (item.optimalPointsFor / (item.wins + item.losses)).toFixed(1) : '-'))
          : (item.optimalPointsFor !== undefined && item.optimalPointsFor !== null ? item.optimalPointsFor.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-');
        const optPfCell = `<span class="font-mono text-emerald-400 font-bold">${optPfVal}</span>`;

        const wlCell = currentSeason === 'allTime'
          ? `<span class="font-black text-emerald-300">${item.wins}-${item.losses}</span> <span class="text-[10px] text-emerald-400 font-normal">(${item.winPct}%)</span>`
          : `${item.wins}-${item.losses}`;

        const ovrCell = currentSeason === 'allTime'
          ? `<span class="text-emerald-400 font-bold">${item.ovrRecord || '0-0'}</span> <span class="text-[10px] text-emerald-500 font-normal">(${item.ovrWinPct || 0}%)</span>`
          : (item.ovrRecord || '0-0');

        tr.innerHTML = `
          <td class="p-2.5 text-center font-bold text-emerald-300">${item.rank || (idx + 1)}</td>
          <td class="p-2.5">
            <span class="font-bold block text-emerald-300 hover:underline cursor-pointer" data-owner="${encodeURIComponent(item.ownerName)}" onclick="selectFranchiseByName(decodeURIComponent(this.getAttribute('data-owner')))"><span class="text-amber-400 font-bold mr-1 text-xs">#${item.rank || (idx + 1)}</span> ${item.teamName}</span>
            <span class="text-[11px] text-emerald-600">[${item.ownerName}]</span>
          </td>
          <td class="p-2.5 text-center">${wlCell}</td>
          <td class="p-2.5 text-center">${formHtml}</td>
          <td class="p-2.5 text-center">${luckBadge}</td>
          <td class="p-2.5 text-center">${ovrCell}</td>
          <td class="p-2.5 text-center">${wwBadge}</td>
          <td class="p-2.5 text-center">${lwBadge}</td>
          <td class="p-2.5 text-center">${hbBadge}</td>
          <td class="p-2.5 text-center">${tlBadge}</td>
          <td class="p-2.5 text-center">${doBadge}</td>
          <td class="p-2.5 text-center">${effCell}</td>
          <td class="p-2.5 text-center font-bold text-emerald-300">${currentSeason === 'allTime' ? (item.pfg !== undefined ? item.pfg.toFixed(1) : (item.pointsFor / (item.wins + item.losses)).toFixed(1)) : item.pointsFor.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
          <td class="p-2.5 text-center">${optPfCell}</td>
          <td class="p-2.5 text-center text-emerald-500">${currentSeason === 'allTime' ? (item.pag !== undefined ? item.pag.toFixed(1) : (item.pointsAgainst / (item.wins + item.losses)).toFixed(1)) : item.pointsAgainst.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderPlayoffBracketView(container) {
      const sData = window.LEAGUE_DATA.seasonData[currentSeason];
      const pMatchups = sData ? (sData.playoffMatchups || []) : [];
      const champ = (window.LEAGUE_DATA.championships || []).find(c => c.seasonYear === currentSeason);
      const standings = sData ? (sData.standings || []) : [];
      container.innerHTML = buildPlayoffBracketHtml({
        season: currentSeason,
        playoffMatchups: pMatchups,
        championship: champ,
        standings: standings,
        theme: CRT_THEME
      });
    }

    function sortWeeklyBadges(field) {
      if (window.weeklyBadgesSortField === field) {
        window.weeklyBadgesSortAsc = !window.weeklyBadgesSortAsc;
      } else {
        window.weeklyBadgesSortField = field;
        window.weeklyBadgesSortAsc = false;
        if (field === 'rank' || field === 'teamName' || field === 'ownerName') window.weeklyBadgesSortAsc = true;
      }
      renderStatRecords();
    }

    function getStatCardTop5(metricKey, season) {
      return sharedGetStatCardTop5(window.LEAGUE_DATA, metricKey, season);
    }

    function buildStatCardTop5Popover(cardTitle, metricKey, season, rowPopDir = '') {
      return sharedBuildStatCardTop5Popover({
        cardTitle,
        metricKey,
        season,
        rowPopDir,
        leagueData: window.LEAGUE_DATA,
        theme: CRT_THEME
      });
    }

    function renderStatRecords() {
      const container = document.getElementById('stat-cards-grid');
      const label = document.getElementById('records-season-label');
      const badgesTbody = document.getElementById('weekly-badges-table-body');
      if (container) container.innerHTML = '';
      if (badgesTbody) badgesTbody.innerHTML = '';

      if (label) {
        label.innerText = currentSeason === 'allTime' ? 'ALL_TIME_RECORDS' : `${currentSeason}_SEASON`;
      }

      let records = null;
      if (currentSeason === 'allTime') {
        records = getGlobalAllTimeStatRecords();
      } else {
        const sData = window.LEAGUE_DATA.seasonData[currentSeason];
        if (sData) records = sData.statRecords;
      }

      if (records) {
        const topJugg = getStatCardTop5('juggernaut', currentSeason)[0];
        const topFeather = getStatCardTop5('featherweight', currentSeason)[0];
        const topCake = getStatCardTop5('cakewalk', currentSeason)[0];
        const topNail = getStatCardTop5('nailbiter', currentSeason)[0];
        const topGut = getStatCardTop5('gutpunch', currentSeason)[0];
        const topCrim = getStatCardTop5('criminal', currentSeason)[0];
        const topVic = getStatCardTop5('victoryLap', currentSeason)[0];
        const topDump = getStatCardTop5('dumpsterFire', currentSeason)[0];

        const cardDefs = [
          {
            title: 'JUGGERNAUT', key: 'juggernaut', subtitle: 'Single-game high score',
            data: topJugg ? { val: topJugg.valStr, owner: topJugg.owner, team: topJugg.team, sub: topJugg.sub } : null
          },
          {
            title: 'FEATHERWEIGHT', key: 'featherweight', subtitle: 'Single-game low score',
            data: topFeather ? { val: topFeather.valStr, owner: topFeather.owner, team: topFeather.team, sub: topFeather.sub } : null
          },
          {
            title: 'CAKEWALK', key: 'cakewalk', subtitle: 'Largest blowout margin',
            data: topCake ? { val: topCake.valStr, owner: topCake.owner, team: topCake.team, sub: topCake.sub } : null
          },
          {
            title: 'NAILBITER', key: 'nailbiter', subtitle: 'Closest margin win',
            data: topNail ? { val: topNail.valStr, owner: topNail.owner, team: topNail.team, sub: topNail.sub } : null
          },
          {
            title: 'GUT PUNCH', key: 'gutpunch', subtitle: 'Highest losing score',
            data: topGut ? { val: topGut.valStr, owner: topGut.owner, team: topGut.team, sub: topGut.sub } : null
          },
          {
            title: 'CRIMINAL', key: 'criminal', subtitle: 'Low score in win',
            data: topCrim ? { val: topCrim.valStr, owner: topCrim.owner, team: topCrim.team, sub: topCrim.sub } : null
          },
          {
            title: 'VICTORY LAP', key: 'victoryLap', subtitle: 'Longest win streak',
            data: topVic ? { val: topVic.valStr, owner: topVic.owner, team: topVic.team, sub: topVic.sub } : null
          },
          {
            title: 'DUMPSTER FIRE', key: 'dumpsterFire', subtitle: 'Longest loss streak',
            data: topDump ? { val: topDump.valStr, owner: topDump.owner, team: topDump.team, sub: topDump.sub } : null
          }
        ];

        cardDefs.forEach((card, idx) => {
          const div = document.createElement('div');
          div.className = 'crt-box p-3 rounded text-center tooltip-trigger cursor-pointer hover:border-emerald-400 transition-all shadow-md';

          const val = card.data ? card.data.val : '-';
          const team = card.data ? card.data.team : '-';
          const owner = card.data ? card.data.owner : '-';
          const sub = card.data ? card.data.sub : '';

          let popoverHtml = buildStatCardTop5Popover(card.title, card.key, currentSeason);
          if (idx % 4 >= 2) {
            popoverHtml = popoverHtml.replace('tooltip-content', 'tooltip-content tooltip-content-right');
          } else {
            popoverHtml = popoverHtml.replace('tooltip-content', 'tooltip-content tooltip-content-left');
          }

          div.innerHTML = `
            <div class="text-[11px] font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-2 flex items-center justify-between">
              <span>&gt; ${card.title}</span>
              <span class="text-[9px] text-emerald-600 font-normal">Hover Top 5 🔍</span>
            </div>
            <p class="text-xl font-black text-emerald-300 crt-glow">${val}</p>
            <p class="text-xs font-bold text-emerald-200 truncate mt-1">${team} <span class="text-[10px] text-emerald-500 font-normal">[${owner}]</span></p>
            <p class="text-[10px] text-emerald-400 italic mt-0.5 truncate">${sub}</p>
            ${popoverHtml}
          `;
          container.appendChild(div);
        });
      }

    }

        function getGlobalAllTimeStatRecords() {
      return sharedGetGlobalAllTimeStatRecords(window.LEAGUE_DATA);
    }

    function roundVal(v) { return Math.round(v * 100) / 100; }


    // TAB 2: STATS LEADERBOARDS
    let currentStatFilter = 'singleGameHigh';

    function initStatsYearSelects() {
      const fromSel = document.getElementById('stats-from-year');
      const toSel = document.getElementById('stats-to-year');
      fromSel.innerHTML = ''; toSel.innerHTML = '';

      const yrs = [...window.LEAGUE_DATA.seasons].sort((a, b) => a - b);
      yrs.forEach(y => {
        fromSel.innerHTML += `<option value="${y}">${y}</option>`;
        toSel.innerHTML += `<option value="${y}" ${y === 2025 ? 'selected' : ''}>${y}</option>`;
      });
    }

    function onStatsSeasonChange() {
      const val = document.getElementById('stats-season-select').value;
      const customDiv = document.getElementById('stats-custom-range');
      if (val === 'custom') {
        customDiv.classList.remove('hidden');
        customDiv.classList.add('flex');
      } else {
        customDiv.classList.remove('flex');
        customDiv.classList.add('hidden');
      }
      renderStatsTable();
    }

    function filterStats(type) {
      currentStatFilter = type;
      document.querySelectorAll('.stat-filter-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-900', 'text-emerald-300', 'border-emerald-500');
        btn.classList.add('text-emerald-500', 'border-emerald-800');
      });
      const active = document.getElementById(`stat-filter-${type}`);
      if (active) {
        active.classList.add('bg-emerald-900', 'text-emerald-300', 'border-emerald-500');
        active.classList.remove('text-emerald-500', 'border-emerald-800');
      }
      renderStatsTable();
    }

    function getSelectedStatsYearRange() {
      const val = document.getElementById('stats-season-select').value;
      if (val === 'allTime') {
        return { minYear: 2018, maxYear: 2025 };
      } else if (val === 'custom') {
        const fromY = parseInt(document.getElementById('stats-from-year').value) || 2018;
        const toY = parseInt(document.getElementById('stats-to-year').value) || 2025;
        return { minYear: Math.min(fromY, toY), maxYear: Math.max(fromY, toY) };
      } else {
        const yr = intVal(val);
        return { minYear: yr, maxYear: yr };
      }
    }

    function intVal(v) { return parseInt(v) || 2025; }

    function renderStatsTable() {
      const container = document.getElementById('stats-leaderboard-container');
      const stageSelect = document.getElementById('stats-stage-select');
      const currentStatsStage = stageSelect ? stageSelect.value : 'combined';

      const { minYear, maxYear } = getSelectedStatsYearRange();
      const isExact2023 = (minYear === 2023 && maxYear === 2023);

      const filteredMatchups = window.LEAGUE_DATA.allMatchups.filter(m => {
        if (m.seasonYear < minYear || m.seasonYear > maxYear) return false;
        if (!isExact2023 && (isOneYearManager(m.homeOwner) || isOneYearManager(m.awayOwner))) return false;

        const isPlayoff = m.isPlayoff !== undefined ? m.isPlayoff : false;

        if (currentStatsStage === 'regular' && isPlayoff) return false;
        if (currentStatsStage === 'playoffs' && !isPlayoff) return false;

        return true;
      });

      if (currentStatFilter === 'margins') {
        let marginGames = [];
        filteredMatchups.forEach(m => {
          if (m.homeScore !== m.awayScore) {
            const w = m.homeScore > m.awayScore ? { t: m.homeTeam, o: m.homeOwner, s: m.homeScore } : { t: m.awayTeam, o: m.awayOwner, s: m.awayScore };
            const l = m.homeScore > m.awayScore ? { t: m.awayTeam, o: m.awayOwner, s: m.awayScore } : { t: m.homeTeam, o: m.homeOwner, s: m.homeScore };
            const margin = Math.abs(m.homeScore - m.awayScore);
            marginGames.push({ winner: w, loser: l, margin: margin, yr: m.seasonYear, wk: m.weekNumber, isPlayoff: m.isPlayoff || false });
          }
        });

        const blowouts = [...marginGames].sort((a, b) => b.margin - a.margin).slice(0, 5);
        const nailbiters = [...marginGames].sort((a, b) => a.margin - b.margin).slice(0, 5);

        let blowoutsRows = blowouts.map((g, idx) => {
          const gameBadge = g.isPlayoff
            ? `<span class="px-1.5 py-0.5 bg-amber-950 text-amber-400 font-bold border border-amber-700 text-[10px]">${g.yr} Playoffs W${g.wk}</span>`
            : `${g.yr} W${g.wk}`;

          return `
            <tr class="border-b border-emerald-950 hover:bg-emerald-950/30">
              <td class="p-2 text-center font-bold text-emerald-400">#${idx + 1}</td>
              <td class="p-2 font-bold text-emerald-300">${g.winner.t} <span class="text-[10px] text-emerald-600">[${g.winner.o}]</span></td>
              <td class="p-2 text-emerald-600">${g.loser.t} <span class="text-[10px] text-emerald-700">[${g.loser.o}]</span></td>
              <td class="p-2 text-center font-black text-emerald-300">+${g.margin.toFixed(2)}</td>
              <td class="p-2 text-center font-mono text-emerald-500">${g.winner.s.toFixed(2)} - ${g.loser.s.toFixed(2)}</td>
              <td class="p-2 text-center text-emerald-600">${gameBadge}</td>
            </tr>
          `;
        }).join('');

        let nailbitersRows = nailbiters.map((g, idx) => {
          const gameBadge = g.isPlayoff
            ? `<span class="px-1.5 py-0.5 bg-amber-950 text-amber-400 font-bold border border-amber-700 text-[10px]">${g.yr} Playoffs W${g.wk}</span>`
            : `${g.yr} W${g.wk}`;

          return `
            <tr class="border-b border-emerald-950 hover:bg-emerald-950/30">
              <td class="p-2 text-center font-bold text-amber-400">#${idx + 1}</td>
              <td class="p-2 font-bold text-amber-300">${g.winner.t} <span class="text-[10px] text-emerald-600">[${g.winner.o}]</span></td>
              <td class="p-2 text-emerald-600">${g.loser.t} <span class="text-[10px] text-emerald-700">[${g.loser.o}]</span></td>
              <td class="p-2 text-center font-black text-amber-300">+${g.margin.toFixed(2)}</td>
              <td class="p-2 text-center font-mono text-emerald-500">${g.winner.s.toFixed(2)} - ${g.loser.s.toFixed(2)}</td>
              <td class="p-2 text-center text-emerald-600">${gameBadge}</td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="crt-box rounded overflow-visible">
              <div class="crt-box-header p-2.5 font-bold text-xs flex justify-between">
                <span>💥 TOP 5 BIGGEST BLOWOUTS</span>
                <span class="font-normal text-emerald-400">${minYear === maxYear ? minYear : minYear + '-' + maxYear}</span>
              </div>
              <div class="table-scroll-container">
                <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
                  <thead class="bg-[#052611] text-emerald-300 font-bold border-b border-emerald-600 text-xs">
              <tr>
                <th class="p-3 text-center">RANK</th>
                <th class="p-3 text-left">MANAGER</th>
                <th class="p-3 text-center">ACTIVE</th>
                <th class="p-3 text-center">PLAYOFF W-L</th>
                <th class="p-3 text-center">PLAYOFF %</th>
                <th class="p-3 text-center">🥇 1st</th>
                <th class="p-3 text-center">🥈 2nd</th>
                <th class="p-3 text-center">🥉 3rd</th>
                <th class="p-3 text-center">4th</th>
                <th class="p-3 text-center">5th-6th</th>
                <th class="p-3 text-center">7th-12th</th>
                <th class="p-3 text-center">🎯 SCORING TITLES</th>
              </tr>
            </thead>
                  <tbody>${blowoutsRows}</tbody>
                </table>
              </div>
            </div>

            <div class="crt-box rounded overflow-visible">
              <div class="crt-box-header p-2.5 font-bold text-xs flex justify-between">
                <span>🔍 TOP 5 CLOSEST NAILBITERS</span>
                <span class="font-normal text-emerald-400">${minYear === maxYear ? minYear : minYear + '-' + maxYear}</span>
              </div>
              <div class="table-scroll-container">
                <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
                  <thead class="bg-[#052611] text-emerald-300 font-bold border-b border-emerald-600 text-xs">
                    <tr>
                      <th class="p-2 text-center">Rank</th>
                      <th class="p-2">Winner</th>
                      <th class="p-2">Loser</th>
                      <th class="p-2 text-center">Margin</th>
                      <th class="p-2 text-center">Score</th>
                      <th class="p-2 text-center">Game</th>
                    </tr>
                  </thead>
                  <tbody>${nailbitersRows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="crt-box rounded overflow-visible">
          <div class="table-scroll-container">
            <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
              <thead class="crt-box-header font-bold border-b border-emerald-600">
                <tr id="stats-table-header"></tr>
              </thead>
              <tbody id="stats-table-body"></tbody>
            </table>
          </div>
        </div>
      `;

      const header = document.getElementById('stats-table-header');
      const tbody = document.getElementById('stats-table-body');

      if (currentStatFilter === 'singleGameHigh' || currentStatFilter === 'singleGameLow') {
        header.innerHTML = `
          <th class="p-2.5 text-center">Rank</th>
          <th class="p-2.5">Team &amp; Owner</th>
          <th class="p-2.5 text-center">Score</th>
          <th class="p-2.5 text-center">Season</th>
          <th class="p-2.5 text-center">Stage &amp; Week</th>
          <th class="p-2.5">Opponent</th>
        `;

        let games = [];
        filteredMatchups.forEach(m => {
          if (isExact2023 || !isOneYearManager(m.homeOwner)) games.push({ score: m.homeScore, owner: m.homeOwner, team: m.homeTeam, yr: m.seasonYear, wk: m.weekNumber, opp: m.awayOwner, isPlayoff: m.isPlayoff || false });
          if (isExact2023 || !isOneYearManager(m.awayOwner)) games.push({ score: m.awayScore, owner: m.awayOwner, team: m.awayTeam, yr: m.seasonYear, wk: m.weekNumber, opp: m.homeOwner, isPlayoff: m.isPlayoff || false });
        });

        games.sort((a, b) => currentStatFilter === 'singleGameHigh' ? b.score - a.score : a.score - b.score);
        games.slice(0, 15).forEach((g, idx) => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/20';

          const stageBadge = g.isPlayoff
            ? `<span class="px-1.5 py-0.5 bg-amber-950 text-amber-400 font-bold border border-amber-700 text-[10px]">Playoffs W${g.wk}</span>`
            : `<span class="text-emerald-500 text-xs">Week ${g.wk}</span>`;

          tr.innerHTML = `
            <td class="p-2.5 text-center font-bold text-emerald-400">${idx + 1}</td>
            <td class="p-2.5 font-bold text-emerald-300">
              ${g.team} <span class="text-[10px] text-emerald-600 font-normal">[${g.owner}]</span>
            </td>
            <td class="p-2.5 text-center font-black text-sm text-emerald-300 crt-glow">${g.score.toFixed(2)}</td>
            <td class="p-2.5 text-center text-emerald-500">${g.yr}</td>
            <td class="p-2.5 text-center">${stageBadge}</td>
            <td class="p-2.5 text-emerald-600">vs ${g.opp}</td>
          `;
          tbody.appendChild(tr);
        });

      } else if (currentStatFilter === 'seasonHigh') {
        header.innerHTML = `
          <th class="p-2.5 text-center">Rank</th>
          <th class="p-2.5">Team &amp; Owner</th>
          <th class="p-2.5 text-center">Points For</th>
          <th class="p-2.5 text-center">Season</th>
          <th class="p-2.5 text-center">Games</th>
        `;

        if (currentStatsStage === 'combined') {
          // If combined (default), use regular season standings pointsFor
          let list = [];
          window.LEAGUE_DATA.seasons.forEach(yr => {
            if (yr >= minYear && yr <= maxYear) {
              const sData = window.LEAGUE_DATA.seasonData[yr];
              if (sData) {
                sData.standings.forEach(st => {
                  if (isExact2023 || !isOneYearManager(st.ownerName)) {
                    list.push({ owner: st.ownerName, team: st.teamName, pf: st.pointsFor, yr: yr, games: 14 });
                  }
                });
              }
            }
          });

          list.sort((a, b) => b.pf - a.pf);
          list.slice(0, 15).forEach((g, idx) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/20';
            tr.innerHTML = `
              <td class="p-2.5 text-center font-bold text-emerald-400">${idx + 1}</td>
              <td class="p-2.5 font-bold text-emerald-300">
                ${g.team} <span class="text-[10px] text-emerald-600 font-normal">[${g.owner}]</span>
              </td>
              <td class="p-2.5 text-center font-black text-sm text-emerald-300 crt-glow">${g.pf.toFixed(1)}</td>
              <td class="p-2.5 text-center text-emerald-500">${g.yr}</td>
              <td class="p-2.5 text-center font-bold text-emerald-400">Regular Season</td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          // Sum points from filteredMatchups (respects stage filter: regular or playoffs)
          const seasonTotals = {};
          filteredMatchups.forEach(m => {
            [
              { o: m.homeOwner, t: m.homeTeam, s: m.homeScore, yr: m.seasonYear },
              { o: m.awayOwner, t: m.awayTeam, s: m.awayScore, yr: m.seasonYear }
            ].forEach(p => {
              const key = `${p.o}_${p.yr}`;
              if (!seasonTotals[key]) {
                seasonTotals[key] = { owner: p.o, team: p.t, pf: 0, yr: p.yr, games: 0 };
              }
              seasonTotals[key].pf += p.s;
              seasonTotals[key].games += 1;
            });
          });

          const list = Object.values(seasonTotals).sort((a, b) => b.pf - a.pf);
          list.slice(0, 15).forEach((g, idx) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/20';
            tr.innerHTML = `
              <td class="p-2.5 text-center font-bold text-emerald-400">${idx + 1}</td>
              <td class="p-2.5 font-bold text-emerald-300">
                ${g.team} <span class="text-[10px] text-emerald-600 font-normal">[${g.owner}]</span>
              </td>
              <td class="p-2.5 text-center font-black text-sm text-emerald-300 crt-glow">${g.pf.toFixed(1)}</td>
              <td class="p-2.5 text-center text-emerald-500">${g.yr}</td>
              <td class="p-2.5 text-center font-bold text-emerald-400">${g.games} ${currentStatsStage === 'playoffs' ? 'Playoff' : 'Reg'} GP</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
    }


    // TAB 3: HEAD TO HEAD COMPARISON
    function getH2HBreakdown(o1, o2) {
      const h2h = window.LEAGUE_DATA.h2hData.find(item =>
        (item.owner1 === o1 && item.owner2 === o2) || (item.owner1 === o2 && item.owner2 === o1)
      );

      if (!h2h) return null;

      const games = [...h2h.games].sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week);

      let regW1 = 0, regW2 = 0, regTies = 0;
      let playW1 = 0, playW2 = 0, playTies = 0;

      const regGames = [];
      const playGames = [];

      games.forEach(g => {
        const sData = window.LEAGUE_DATA.seasonData[g.year];
        const regWeeks = sData ? sData.settings.regularSeasonWeeks : 14;
        const isPlayoff = g.week > regWeeks;
        g.isPlayoff = isPlayoff;

        if (isPlayoff) {
          playGames.push(g);
          if (g.winner === o1) playW1++;
          else if (g.winner === o2) playW2++;
          else playTies++;
        } else {
          regGames.push(g);
          if (g.winner === o1) regW1++;
          else if (g.winner === o2) regW2++;
          else regTies++;
        }
      });

      function calcStreak(gList) {
        if (!gList || gList.length === 0) return 'None';
        let lastWinner = null;
        let streakGames = [];
        for (let i = gList.length - 1; i >= 0; i--) {
          const g = gList[i];
          if (g.winner === 'Tie') continue;
          if (lastWinner === null) {
            lastWinner = g.winner;
            streakGames.unshift(g);
          } else if (g.winner === lastWinner) {
            streakGames.unshift(g);
          } else {
            break;
          }
        }

        if (!lastWinner || streakGames.length === 0) return 'None';

        const gameTags = streakGames.map(g => {
          if (g.isPlayoff) {
            return formatPlayoffStageTag(g.stage, g.year || g.seasonYear);
          } else {
            return `Wk${g.week || g.weekNumber}'${String(g.year || g.seasonYear).slice(2)}`;
          }
        }).join(', ');

        return `${lastWinner} W${streakGames.length}; ${gameTags}`;
      }

      function calcMaxStreak(gList) {
        if (!gList || gList.length === 0) return { winner: '-', streak: 0, span: '' };
        let maxW = null, maxCount = 0, startG = null, endG = null;
        let curW = null, curCount = 0, curStart = null;
        gList.forEach(g => {
          if (g.winner === 'Tie') {
            curW = null; curCount = 0; curStart = null;
          } else if (g.winner === curW) {
            curCount++;
            if (curCount > maxCount) {
              maxCount = curCount; maxW = curW; startG = curStart; endG = g;
            }
          } else {
            curW = g.winner; curCount = 1; curStart = g;
            if (curCount > maxCount) {
              maxCount = curCount; maxW = curW; startG = curStart; endG = g;
            }
          }
        });
        if (!maxW || maxCount === 0) return { winner: '-', streak: 0, span: '' };
        return {
          winner: maxW,
          streak: maxCount,
          span: `${startG.year} W${startG.week} - ${endG.year} W${endG.week}`
        };
      }

      return {
        o1, o2,
        games,
        regW1, regW2, regTies,
        playW1, playW2, playTies,
        totW1: regW1 + playW1, totW2: regW2 + playW2, totTies: regTies + playTies,
        ovrStreak: calcStreak(games),
        regStreak: calcStreak(regGames),
        playStreak: calcStreak(playGames),
        maxStreak: calcMaxStreak(games)
      };
    }

        function initH2HSelects() {
      const o1 = document.getElementById('h2h-owner-1');
      const o2 = document.getElementById('h2h-owner-2');
      if (!o1 || !o2) return;
      o1.innerHTML = ''; o2.innerHTML = '';

      const owners = window.LEAGUE_DATA.allTimeStandings
        .map(s => s.ownerName)
        .filter(o => !isOneYearManager(o))
        .sort();

      const defaultO1 = owners.find(o => o.includes('Dylan')) || owners[0] || '';
      const defaultO2 = owners.find(o => o.includes('Phillip') || o.includes('Trace') || o.includes('Michael') || o.includes('Sean')) || owners[1] || '';

      owners.forEach(o => {
        o1.innerHTML += `<option value="${o}" ${o === defaultO1 ? 'selected' : ''}>${o}</option>`;
        o2.innerHTML += `<option value="${o}" ${o === defaultO2 ? 'selected' : ''}>${o}</option>`;
      });

      renderH2HComparison();
      renderH2HMatrix();
      renderH2HStreaks('all');
    }

    function filterH2HStreaks(filterType = 'all') {
      renderH2HStreaks(filterType);
    }

    function renderH2HStreaks(filterType = 'all') {
      const tbody = document.getElementById('h2h-streaks-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      document.querySelectorAll('.streak-filter-btn').forEach(btn => {
        btn.className = 'streak-filter-btn px-2.5 py-1 border border-emerald-800 text-emerald-500 hover:bg-emerald-950 hover:text-emerald-300 text-xs';
      });
      const activeBtn = document.getElementById(`streak-filter-${filterType}`);
      if (activeBtn) {
        activeBtn.className = 'streak-filter-btn px-2.5 py-1 border border-emerald-400 bg-emerald-900 text-emerald-300 font-bold text-xs';
      }

      let streaks = window.LEAGUE_DATA.h2hStreaks || [];

      if (filterType === 'active') {
        streaks = streaks.filter(s => s.active && s.type === 'overall');
      } else if (filterType === 'regular') {
        streaks = streaks.filter(s => s.type === 'regular');
      } else if (filterType === 'playoff') {
        streaks = streaks.filter(s => s.type === 'playoff');
      } else {
        streaks = streaks.filter(s => s.type === 'overall');
      }

      if (streaks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-emerald-500 italic font-mono">No head-to-head streaks recorded for this filter.</td></tr>`;
        return;
      }

      streaks.sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : (b.active ? 1 : 0) - (a.active ? 1 : 0));

      const rows = [];
      let i = 0;
      let rankNumber = 1;

      while (i < streaks.length && rows.length < 10) {
        const curStreakVal = streaks[i].streak;
        let j = i;
        while (j < streaks.length && streaks[j].streak === curStreakVal) j++;
        const countWithVal = j - i;

        if (rankNumber === 1 || countWithVal <= 2 || rows.length + countWithVal <= 10) {
          for (let k = i; k < j; k++) {
            const displayRank = countWithVal > 1 ? `T-#${rankNumber}` : `#${rankNumber}`;
            rows.push({ type: 'single', rank: rankNumber, displayRank: displayRank, item: streaks[k] });
          }
          rankNumber += countWithVal;
        } else {
          const tiedGroup = streaks.slice(i, j);
          rows.push({ type: 'tiedGroup', rank: rankNumber, streakVal: curStreakVal, count: tiedGroup.length, items: tiedGroup });
          rankNumber += countWithVal;
        }
        i = j;
      }

      rows.forEach(r => {
        const tr = document.createElement('tr');

        if (r.type === 'single') {
          const s = r.item;
          tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/40 transition-colors';

          const isTied1st = r.displayRank && r.displayRank.includes('T-') && r.rank === 1;
          const rankBadge = (r.rank === 1 || isTied1st)
            ? `<span class="text-amber-400 font-black crt-glow-amber text-sm">🥇 ${r.displayRank || "#1"}</span>`
            : (r.rank === 2
              ? `<span class="text-slate-300 font-bold text-xs">🥈 ${r.displayRank || "#2"}</span>`
              : (r.rank === 3
                ? `<span class="text-amber-600 font-bold text-xs">🥉 ${r.displayRank || "#3"}</span>`
                : `<span class="text-emerald-500 font-bold text-xs">${r.displayRank || "#" + r.rank}</span>`));

          let gameScoreListHtml = '';
          if (s.games && s.games.length > 0) {
            gameScoreListHtml = s.games.map(g => {
              const yr = g.year || g.seasonYear;
              const wk = g.week || g.weekNumber;
              const stgTag = g.isPlayoff ? (g.stage || 'Playoffs') : `W${wk}`;
              const hIsW = g.homeScore >= g.awayScore;
              const wS = hIsW ? (g.homeScore || 0) : (g.awayScore || 0);
              const lS = hIsW ? (g.awayScore || 0) : (g.homeScore || 0);
              return `<div class="py-1 border-b border-emerald-900/60 flex items-center justify-between text-xs">
                <span class="font-bold text-emerald-400">${yr} ${stgTag}</span>
                <span class="font-mono text-emerald-300 font-bold">${wS.toFixed(2)} - ${lS.toFixed(2)}</span>
              </div>`;
            }).join('');
          } else {
            gameScoreListHtml = `<div class="text-xs text-emerald-600 italic font-mono">Game scores recorded in database.</div>`;
          }

          const streakBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 border border-emerald-500 bg-emerald-950 text-emerald-300 font-black text-sm crt-glow hover:bg-emerald-900 transition-all">${s.streak} WINS</span>
              <div class="tooltip-content p-3 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 text-left min-w-[260px] z-50">
                <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1.5 flex items-center justify-between">
                  <span>🔥 ${s.winner}'s ${s.streak}-Game Streak</span>
                  <span class="text-[10px] text-emerald-500">vs ${s.loser}</span>
                </div>
                ${gameScoreListHtml}
                <div class="text-[10px] text-amber-400 font-bold pt-1.5 mt-1 border-t border-emerald-900 text-center">
                  🏈 Game-by-game scores for this streak
                </div>
              </div>
            </div>
          `;

          const statusBadge = s.active
            ? `<span class="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-600 font-bold text-[10px]">🔥 ACTIVE STREAK</span>`
            : `<span class="text-emerald-700 text-[10px]">Ended in ${s.endYear} W${s.endWeek}</span>`;

          const spanStr = `${s.startYear} W${s.startWeek} ➔ ${s.endYear} W${s.endWeek}`;

          tr.innerHTML = `
            <td class="p-2.5 text-center">${rankBadge}</td>
            <td class="p-2.5 font-extrabold text-emerald-300 cursor-pointer hover:underline" data-winner="${encodeURIComponent(s.winner)}" data-loser="${encodeURIComponent(s.loser)}" onclick="selectH2HMatchup(decodeURIComponent(this.getAttribute('data-winner')), decodeURIComponent(this.getAttribute('data-loser')))">${s.winner}</td>
            <td class="p-2.5 font-bold text-emerald-500 cursor-pointer hover:underline" data-winner="${encodeURIComponent(s.winner)}" data-loser="${encodeURIComponent(s.loser)}" onclick="selectH2HMatchup(decodeURIComponent(this.getAttribute('data-winner')), decodeURIComponent(this.getAttribute('data-loser')))">${s.loser}</td>
            <td class="p-2.5 text-center">${streakBadge}</td>
            <td class="p-2.5 text-center font-mono text-emerald-400">${spanStr}</td>
            <td class="p-2.5 text-center">${statusBadge}</td>
          `;
        } else {
          tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/40 transition-colors';

          const popoverListHtml = r.items.map(s => `
            <div class="py-1 border-b border-emerald-900/40 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-950/60 p-1 rounded" data-winner="${encodeURIComponent(s.winner)}" data-loser="${encodeURIComponent(s.loser)}" onclick="selectH2HMatchup(decodeURIComponent(this.getAttribute('data-winner')), decodeURIComponent(this.getAttribute('data-loser')))">
              <div>
                <span class="font-bold text-emerald-300">${s.winner}</span>
                <span class="text-[10px] text-emerald-500"> vs ${s.loser}</span>
                <span class="text-[10px] text-emerald-600 block">${s.startYear} W${s.startWeek} ➔ ${s.endYear} W${s.endWeek}</span>
              </div>
              ${s.active ? '<span class="text-[9px] bg-amber-950 text-amber-400 border border-amber-700 px-1 font-bold">🔥 ACTIVE</span>' : ''}
            </div>
          `).join('');

          const multiStreakBadge = `
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="px-2 py-0.5 border border-emerald-500 bg-emerald-900 text-emerald-300 font-black text-xs rounded hover:bg-emerald-800 transition-all">${r.streakVal} WINS EACH</span>
              <div class="tooltip-content p-3 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 text-left min-w-[280px] z-50">
                <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1.5 flex items-center justify-between">
                  <span>🤝 ${r.count} Tied Streaks (${r.streakVal} Wins Each)</span>
                  <span class="text-[10px] text-emerald-500">Rank #${r.rank}</span>
                </div>
                ${popoverListHtml}
                <div class="text-[10px] text-amber-400 font-bold pt-1.5 mt-1 border-t border-emerald-900 text-center">
                  🔍 Hover / Click any rivalry to view game log
                </div>
              </div>
            </div>
          `;

          tr.innerHTML = `
            <td class="p-2.5 text-center"><span class="text-emerald-500 font-bold text-xs">#${r.rank}</span></td>
            <td class="p-2.5 font-bold text-emerald-300" colspan="2">
              <div class="tooltip-trigger inline-block cursor-pointer">
                <span>🤝 ${r.count} tied with ${r.streakVal} wins</span>
                <div class="tooltip-content p-3 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 space-y-1.5 text-left min-w-[280px] z-50">
                  <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1 flex items-center justify-between">
                    <span>🤝 ${r.count} Tied Streaks (${r.streakVal} Wins Each)</span>
                    <span class="text-[9px] text-emerald-500">Rank #${r.rank}</span>
                  </div>
                  ${popoverListHtml}
                  <div class="text-[10px] text-amber-400 font-bold pt-1 border-t border-emerald-900 text-center">
                    🔍 Hover / Click any streak to inspect game log
                  </div>
                </div>
              </div>
            </td>
            <td class="p-2.5 text-center">${multiStreakBadge}</td>
            <td class="p-2.5 text-center font-mono text-emerald-500 text-[11px]">${r.count} Rivals Tied</td>
            <td class="p-2.5 text-center"><span class="px-2 py-0.5 bg-black border border-emerald-800 text-emerald-400 font-bold text-[10px]">🤝 MULTI-TIE</span></td>
          `;
        }
        tbody.appendChild(tr);
      });
    }

    function renderH2HComparison() {
      const o1 = document.getElementById('h2h-owner-1').value;
      const o2 = document.getElementById('h2h-owner-2').value;
      const banner = document.getElementById('h2h-summary-banner');
      const tbody = document.getElementById('h2h-game-log-body');
      const label = document.getElementById('h2h-matchup-count-label');

      if (o1 === o2) {
        banner.innerHTML = `<p class="text-amber-400 font-bold text-center">&gt; SELECT TWO DIFFERENT OWNERS FOR H2H QUERY.</p>`;
        tbody.innerHTML = ''; label.innerText = '0 Games';
        return;
      }

      const b = getH2HBreakdown(o1, o2);
      if (!b) {
        banner.innerHTML = `<p class="text-emerald-600 italic text-center">&gt; NO MATCHUP HISTORY FOUND BETWEEN ${o1} AND ${o2}.</p>`;
        tbody.innerHTML = ''; label.innerText = '0 Games';
        return;
      }

      banner.innerHTML = buildH2HComparisonBannerHtml({
        breakdown: b,
        theme: CRT_THEME
      });

      label.innerText = `${b.games.length} Games Played (${b.games.filter(g => !g.isPlayoff).length} Reg, ${b.games.filter(g => g.isPlayoff).length} Playoff)`;
      tbody.innerHTML = buildH2HGameLogRows({
        games: b.games,
        theme: CRT_THEME
      });
    }

    function selectH2HMatchup(o1, o2) {
      const sel1 = document.getElementById('h2h-owner-1');
      const sel2 = document.getElementById('h2h-owner-2');
      if (sel1 && sel2) {
        sel1.value = o1;
        sel2.value = o2;
        renderH2HComparison();
        const targetSection = document.getElementById('h2h-compare-section');
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

        let currentMatrixFilter = 'all';
    let currentMatrixScope = 'active';

    function filterH2HMatrix(filterType = 'all') {
      currentMatrixFilter = filterType;
      renderH2HMatrix(filterType, currentMatrixScope);
    }

    function toggleMatrixScope(scope = 'active') {
      currentMatrixScope = scope;
      renderH2HMatrix(currentMatrixFilter, scope);
    }

    function renderH2HMatrix(filterType = currentMatrixFilter, scope = currentMatrixScope) {
      const header = document.getElementById('h2h-matrix-header');
      const tbody = document.getElementById('h2h-matrix-body');
      if (!header || !tbody) return;
      header.innerHTML = ''; tbody.innerHTML = '';

      document.querySelectorAll('.matrix-filter-btn').forEach(btn => {
        btn.className = 'matrix-filter-btn px-2 py-0.5 border border-emerald-900 text-emerald-500 hover:border-emerald-700 bg-black font-bold text-[10px]';
      });
      const activeBtn = document.getElementById(`matrix-filter-${filterType}`);
      if (activeBtn) {
        activeBtn.className = 'matrix-filter-btn px-2 py-0.5 border border-emerald-400 bg-emerald-900 text-emerald-300 font-bold text-[10px]';
      }

      document.querySelectorAll('.matrix-scope-btn').forEach(btn => {
        btn.className = 'matrix-scope-btn px-2 py-0.5 border border-emerald-900 text-emerald-500 hover:border-emerald-700 bg-black font-bold text-[10px] rounded';
      });
      const activeScopeBtn = document.getElementById(`matrix-scope-${scope}`);
      if (activeScopeBtn) {
        activeScopeBtn.className = 'matrix-scope-btn px-2 py-0.5 border border-emerald-400 bg-emerald-900 text-emerald-300 font-bold text-[10px] rounded';
      }

      const seasonsList = window.LEAGUE_DATA.seasons || [];
      const latestYr = seasonsList[seasonsList.length - 1] || '2025';
      const activeSeasonStandings = (window.LEAGUE_DATA.seasonData[latestYr] && window.LEAGUE_DATA.seasonData[latestYr].standings)
        ? window.LEAGUE_DATA.seasonData[latestYr].standings.map(s => s.ownerName)
        : [];

      let owners = window.LEAGUE_DATA.allTimeStandings.map(s => s.ownerName);
      if (scope === 'active') {
        owners = owners.filter(o => activeSeasonStandings.includes(o));
      } else {
        owners = owners.filter(o => !isOneYearManager(o));
      }
      owners.sort();

      let headerTr = '<tr class="bg-emerald-950 text-emerald-400 font-bold"><th class="p-2 text-left">OWNER</th>';
      owners.forEach(o => { headerTr += `<th class="p-1.5 text-center">${o.slice(0, 4)}</th>`; });
      headerTr += '</tr>';
      header.innerHTML = headerTr;

      owners.forEach(o1 => {
        let tr = `<tr class="border-b border-emerald-950"><td class="p-1.5 font-bold text-left text-emerald-300 bg-black/60">${o1}</td>`;
        owners.forEach(o2 => {
          if (o1 === o2) {
            tr += `<td class="p-1.5 text-emerald-800 bg-black">-</td>`;
          } else {
            const b = getH2HBreakdown(o1, o2);
            if (b) {
              let w1 = b.totW1, w2 = b.totW2;
              if (filterType === 'regular') { w1 = b.regW1; w2 = b.regW2; }
              else if (filterType === 'playoff') { w1 = b.playW1; w2 = b.playW2; }

              const cellTotalStr = `${w1}-${w2}`;
              const diff = w1 - w2;
              
              let cellClass = '';
              let diffBadge = '';
              
              if (diff >= 7) {
                // Super Lopsided (+7 or more games ahead)
                cellClass = 'bg-emerald-900/90 text-emerald-100 font-black border-2 border-emerald-400 shadow-[0_0_10px_rgba(0,255,102,0.4)] crt-glow';
                diffBadge = `<span class="text-[9px] text-amber-300 block font-bold leading-none mt-0.5">+${diff}</span>`;
              } else if (diff >= 4) {
                // Heavy Dominance (+4 to +6 games ahead)
                cellClass = 'bg-emerald-950/80 text-emerald-200 font-bold border border-emerald-500/70';
                diffBadge = `<span class="text-[9px] text-emerald-400/90 block font-semibold leading-none mt-0.5">+${diff}</span>`;
              } else if (diff >= 2) {
                // Moderate Advantage (+2 to +3 games ahead)
                cellClass = 'bg-emerald-950/40 text-emerald-300 font-semibold';
              } else if (diff === 1) {
                // Slight Edge (+1 game ahead)
                cellClass = 'text-emerald-300 font-normal';
              } else if (diff === 0) {
                // Tied (0 games)
                cellClass = 'text-emerald-600 bg-black/40 font-normal';
              } else if (diff <= -7) {
                // Super Lopsided Deficit (-7 or more games behind)
                cellClass = 'bg-red-950/90 text-red-200 font-bold border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]';
                diffBadge = `<span class="text-[9px] text-red-400 block font-bold leading-none mt-0.5">${diff}</span>`;
              } else if (diff <= -4) {
                // Heavy Deficit (-4 to -6 games behind)
                cellClass = 'bg-red-950/50 text-red-300 font-medium border border-red-800/60';
                diffBadge = `<span class="text-[9px] text-red-400/80 block font-normal leading-none mt-0.5">${diff}</span>`;
              } else {
                // Moderate / Slight Deficit (-1 to -3 games behind)
                cellClass = 'text-red-400/80 font-normal';
              }

              tr += `
                <td class="p-1.5 ${cellClass} cursor-pointer hover:scale-105 hover:bg-emerald-800/70 transition-all text-center rounded-sm" data-o1="${encodeURIComponent(o1)}" data-o2="${encodeURIComponent(o2)}" onclick="selectH2HMatchup(decodeURIComponent(this.getAttribute('data-o1')), decodeURIComponent(this.getAttribute('data-o2')))">
                  <div class="tooltip-trigger inline-block">
                    <span>${cellTotalStr}</span>
                    ${diffBadge}
                    <div class="tooltip-content p-3 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 space-y-1 text-left min-w-[240px]">
                      <div class="font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1">${o1} vs ${o2} H2H Breakdown</div>
                      <div class="text-xs text-emerald-300">• <span class="font-bold text-emerald-400">Regular Season:</span> ${o1} ${b.regW1} - ${b.regW2} ${o2}</div>
                      <div class="text-xs text-amber-300">• <span class="font-bold text-amber-400">Playoffs:</span> ${o1} ${b.playW1} - ${b.playW2} ${o2}</div>
                      <div class="text-xs text-emerald-400 font-bold">• <span class="text-emerald-200">Total Lifetime:</span> ${o1} ${b.totW1} - ${b.totW2} ${o2}</div>
                      <div class="pt-1 border-t border-emerald-900 text-xs text-emerald-400 font-bold">
                        🔥 <span class="text-emerald-300">Active Win Streak:</span> <span class="text-amber-300">${b.ovrStreak}</span>
                      </div>
                      <div class="text-[11px] text-emerald-600">
                        (Reg: ${b.regStreak} | Playoff: ${b.playStreak})
                      </div>
                      <div class="text-[10px] text-amber-400 font-bold pt-1 border-t border-emerald-900 text-center">
                        🔍 Click cell to query full game log
                      </div>
                    </div>
                  </div>
                </td>
              `;
            } else {
              tr += `<td class="p-1.5 text-emerald-800">0-0</td>`;
            }
          }
        });
        tr += '</tr>';
        tbody.innerHTML += tr;
      });
    }


    // TAB 4: CHAMPS
    function getPlayoffMatchupResult(yr, stage) {
      return sharedGetPlayoffMatchupResult(window.LEAGUE_DATA, yr, stage);
    }


    window.dynastySortField = '1st';
    window.dynastySortAsc = false;

    window.sortDynastyLeaderboard = function(field) {
      if (window.dynastySortField === field) {
        window.dynastySortAsc = !window.dynastySortAsc;
      } else {
        window.dynastySortField = field;
        window.dynastySortAsc = false;
        if (field === 'ownerName') window.dynastySortAsc = true;
      }
      renderChamps();
      if (currentSeason === 'allTime' && currentSeasonsSubTab === 'playoff') {
        renderStandings();
      }
    };

    function renderChamps() {
      const tbody = document.getElementById('champs-leaderboard-body');
      const grid = document.getElementById('champs-timeline-grid');
      const statGrid = document.getElementById('champs-stat-records-grid');
      if (tbody) tbody.innerHTML = '';
      if (grid) grid.innerHTML = '';
      if (statGrid) statGrid.innerHTML = '';

      // Filter out 1-year managers and sort Dynasty Leaderboard
      const leaderboard = window.LEAGUE_DATA.allTimeStandings.filter(s => !isOneYearManager(s.ownerName)).slice();
      leaderboard.sort((a, b) => {
        const cA = a.championships || {}, cB = b.championships || {};
        if ((cB['1st'] || 0) !== (cA['1st'] || 0)) return (cB['1st'] || 0) - (cA['1st'] || 0);
        if ((cB['2nd'] || 0) !== (cA['2nd'] || 0)) return (cB['2nd'] || 0) - (cA['2nd'] || 0);
        if ((cB['3rd'] || 0) !== (cA['3rd'] || 0)) return (cB['3rd'] || 0) - (cA['3rd'] || 0);
        if ((cB['4th'] || 0) !== (cA['4th'] || 0)) return (cB['4th'] || 0) - (cA['4th'] || 0);
        if ((b.playoffWins || 0) !== (a.playoffWins || 0)) return (b.playoffWins || 0) - (a.playoffWins || 0);
        return b.winPct - a.winPct;
      });

      if (tbody) {
        tbody.innerHTML = buildDynastyLeaderboardRows({
          leaderboard,
          championships: window.LEAGUE_DATA.championships,
          theme: CRT_THEME
        });
      }

      // Yearly Cards with Title Roster and Ring Recipients
      if (grid) {
        const champs = [...window.LEAGUE_DATA.championships].reverse();
        const rostersData = window.LEAGUE_DATA.championshipRosters || {};

        champs.forEach(c => {
          const yr = c.seasonYear;
          const scOwner = c.scoringChampOwner || '-';
          const scTeam = c.scoringChampTeam || '-';
          const scPF = c.scoringChampPF ? c.scoringChampPF.toFixed(1) : '-';
          const rData = rostersData[yr] || null;

          let rosterHtml = '';
          if (rData) {
            const startersHtml = rData.starters.map(s => {
              const rBadge = getPlayerRingBadgeHtml(s.player);
              return `<div class="flex items-center justify-between py-0.5 text-[11px] border-b border-emerald-950"><span class="text-emerald-400 font-bold"><span class="text-amber-400 font-normal w-9 inline-block">${s.pos}</span>${s.player}${rBadge}</span><span class="text-[10px] text-emerald-600">${s.acq || 'Draft'}</span></div>`;
            }).join('');

            const benchHtml = rData.bench.map(b => {
              const rBadge = getPlayerRingBadgeHtml(b.player);
              return `<div class="flex items-center justify-between py-0.5 text-[11px] border-b border-emerald-950"><span class="text-emerald-300 font-medium"><span class="text-emerald-600 font-normal w-9 inline-block">${b.pos || 'BN'}</span>${b.player}${rBadge}</span><span class="text-[10px] text-emerald-600">${b.acq || 'FA/Trade'}</span></div>`;
            }).join('');

            const draftedHtml = rData.draftedContributors.map(d => {
              const rBadge = getPlayerRingBadgeHtml(d.player);
              return `<div class="flex items-center justify-between py-0.5 text-[11px] border-b border-emerald-950"><span class="text-emerald-400/80"><span class="text-emerald-700 font-normal w-9 inline-block">${d.pos || 'D'}</span>${d.player}${rBadge}</span><span class="text-[10px] text-amber-500/80">${d.draftInfo}</span></div>`;
            }).join('');

            rosterHtml = `
              <div class="mt-3 pt-2 border-t border-emerald-900">
                <button onclick="toggleTitleRoster(${yr})" id="title-roster-btn-${yr}" class="w-full text-center py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 text-amber-300 border border-emerald-700 rounded text-[10px] font-bold tracking-wider uppercase transition-all">
                  💍 VIEW TITLE ROSTER &amp; RING CEREMONY (${rData.totalRingsAwarded || (rData.starters.length + rData.bench.length + rData.draftedContributors.length)} Rings) ▾
                </button>
                <div id="title-roster-collapse-${yr}" class="hidden mt-2 p-2.5 bg-black/90 border border-emerald-800 rounded space-y-2 text-left font-mono">
                  <div>
                    <div class="text-[10px] font-bold text-amber-400 uppercase tracking-widest border-b border-amber-900/60 pb-0.5 mb-1">🌟 TITLE GAME STARTERS</div>
                    ${startersHtml}
                  </div>
                  ${rData.bench && rData.bench.length > 0 ? `
                  <div>
                    <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-900/60 pb-0.5 mb-1 mt-2">🛡️ BENCH ROSTER</div>
                    ${benchHtml}
                  </div>` : ''}
                  ${rData.draftedContributors && rData.draftedContributors.length > 0 ? `
                  <div>
                    <div class="text-[10px] font-bold text-amber-500/90 uppercase tracking-widest border-b border-amber-900/60 pb-0.5 mb-1 mt-2">🎯 DRAFTED RING RECIPIENTS</div>
                    ${draftedHtml}
                  </div>` : ''}
                </div>
              </div>
            `;
          }

          const div = document.createElement('div');
          div.className = 'crt-box p-4 rounded flex flex-col justify-between shadow-md bg-black/60 border border-emerald-900';

          div.innerHTML = `
            <div>
              <div class="flex items-center justify-between mb-3 border-b border-emerald-900 pb-2">
                <span class="text-2xl font-black text-emerald-300 crt-glow">${yr}</span>
                <span class="px-2 py-0.5 bg-amber-950 text-amber-300 font-bold border border-amber-600 rounded text-[10px]">🏆 Season ${yr}</span>
              </div>

              <!-- 1st Place / Nebuchadnezzar Cup Champion -->
              <div class="mb-3 p-3 bg-emerald-950/80 border border-emerald-500 rounded">
                <span class="text-[10px] uppercase font-bold text-amber-400 block font-mono">🥇 NEBUCHADNEZZAR CUP CHAMPION</span>
                <span class="text-base font-black text-emerald-300 crt-glow block mt-0.5">${c.firstTeam}</span>
                <span class="text-xs text-emerald-400 font-bold">[${c.firstOwner}]</span>
              </div>

              <!-- 2nd and 3rd Podium Finishers -->
              <div class="space-y-1.5 text-xs border-t border-b border-emerald-900 py-2.5 my-2 text-emerald-400 font-mono">
                <div class="flex justify-between items-center">
                  <span class="text-slate-300 font-bold">🥈 2nd Place:</span>
                  <span class="font-bold text-emerald-300">${c.secondTeam} <span class="text-[10px] text-emerald-500 font-normal">[${c.secondOwner}]</span></span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-amber-600 font-bold">🥉 3rd Place:</span>
                  <span class="font-bold text-emerald-300">${c.thirdTeam} <span class="text-[10px] text-emerald-500 font-normal">[${c.thirdOwner}]</span></span>
                </div>
              </div>

              <!-- Regular Season Scoring Champion (Below the Podium) -->
              <div class="mt-2.5 p-2.5 bg-black border border-emerald-800 rounded text-xs flex items-center justify-between font-mono">
                <div>
                  <span class="text-[10px] font-extrabold text-emerald-400 block">🎯 SCORING CHAMPION</span>
                  <span class="font-bold text-emerald-300 text-xs">${scTeam} <span class="text-[10px] text-emerald-500 font-normal">[${scOwner}]</span></span>
                </div>
                <span class="font-mono font-black text-emerald-300 text-sm crt-glow">${scPF} pts</span>
              </div>

              <!-- Championship Title Roster -->
              ${rosterHtml}
            </div>
          `;
          grid.appendChild(div);
        });
      }

      // Render All-Time Player Rings Leaderboard in Champs Tab
      const ringsGrid = document.getElementById('champs-player-rings-grid');
      if (ringsGrid) {
        ringsGrid.innerHTML = '';
        const topRingWinners = (window.LEAGUE_DATA.allTimePlayerRings || []).slice(0, 12);
        topRingWinners.forEach((item, idx) => {
          const div = document.createElement('div');
          div.className = 'crt-box p-3 rounded text-left tooltip-trigger cursor-pointer hover:border-amber-400 transition-all shadow-md bg-black/80';

          const ringBadgeHtml = getPlayerRingBadgeHtml(item.player);
          const yearsListStr = item.rings.map(r => `${r.year}`).join(', ');

          div.innerHTML = `
            <div class="flex items-center justify-between border-b border-emerald-900 pb-1 mb-1.5">
              <span class="text-[11px] font-bold text-amber-400 font-mono">#${idx + 1} ${item.player}</span>
              <span class="px-1.5 py-0.5 bg-amber-950 text-amber-300 font-black border border-amber-600 rounded text-xs">💍 ${item.ringsCount}</span>
            </div>
            <p class="text-[11px] text-emerald-300 font-bold truncate">${item.rings[0].role} (${item.rings[0].year})</p>
            <p class="text-[10px] text-emerald-500 italic mt-0.5 truncate">Championships: ${yearsListStr}</p>
            ${ringBadgeHtml}
          `;
          ringsGrid.appendChild(div);
        });
      }

      // Populate Playoff Single-Game & Streak Record Cards at bottom of Champs Tab
      if (statGrid) {
        const topApex = getStatCardTop5('juggernaut', 'playoffs')[0];
        const topPotato = getStatCardTop5('featherweight', 'playoffs')[0];
        const topMass = getStatCardTop5('cakewalk', 'playoffs')[0];
        const topNail = getStatCardTop5('nailbiter', 'playoffs')[0];
        const topGut = getStatCardTop5('gutpunch', 'playoffs')[0];
        const topCrim = getStatCardTop5('criminal', 'playoffs')[0];
        const topVic = getStatCardTop5('victoryLap', 'playoffs')[0];
        const topDump = getStatCardTop5('dumpsterFire', 'playoffs')[0];

        const cardDefs = [
          { title: 'APEX PREDATOR', key: 'juggernaut', subtitle: 'Highest playoff score', data: topApex ? { val: topApex.valStr, owner: topApex.owner, team: topApex.team, sub: topApex.sub } : null },
          { title: 'POTATO BOWL', key: 'featherweight', subtitle: 'Lowest playoff score', data: topPotato ? { val: topPotato.valStr, owner: topPotato.owner, team: topPotato.team, sub: topPotato.sub } : null },
          { title: 'MASSACRE', key: 'cakewalk', subtitle: 'Largest playoff blowout', data: topMass ? { val: topMass.valStr, owner: topMass.owner, team: topMass.team, sub: topMass.sub } : null },
          { title: 'NAILBITER', key: 'nailbiter', subtitle: 'Closest playoff win', data: topNail ? { val: topNail.valStr, owner: topNail.owner, team: topNail.team, sub: topNail.sub } : null },
          { title: 'GUT PUNCH', key: 'gutpunch', subtitle: 'Highest losing playoff score', data: topGut ? { val: topGut.valStr, owner: topGut.owner, team: topGut.team, sub: topGut.sub } : null },
          { title: 'CRIMINAL', key: 'criminal', subtitle: 'Low score in playoff win', data: topCrim ? { val: topCrim.valStr, owner: topCrim.owner, team: topCrim.team, sub: topCrim.sub } : null },
          { title: 'VICTORY LAP', key: 'victoryLap', subtitle: 'Playoff make streak', data: topVic ? { val: topVic.valStr, owner: topVic.owner, team: topVic.team, sub: topVic.sub } : null },
          { title: 'DUMPSTER FIRE', key: 'dumpsterFire', subtitle: 'Playoff drought streak', data: topDump ? { val: topDump.valStr, owner: topDump.owner, team: topDump.team, sub: topDump.sub } : null }
        ];

        cardDefs.forEach((card, idx) => {
          const div = document.createElement('div');
          div.className = 'crt-box p-3 rounded text-center tooltip-trigger cursor-pointer hover:border-emerald-500 transition-all shadow-md';
          const val = card.data ? card.data.val : '-';
          const team = card.data ? card.data.team : '-';
          const owner = card.data ? card.data.owner : '-';
          const sub = card.data ? card.data.sub : '';

          let popoverHtml = buildStatCardTop5Popover(card.title, card.key, 'playoffs');
          if (idx % 4 >= 2) popoverHtml = popoverHtml.replace('tooltip-content', 'tooltip-content tooltip-content-right');

          div.innerHTML = `
            <div class="text-[11px] font-bold text-emerald-400 border-b border-emerald-900 pb-1 mb-2 flex items-center justify-between font-mono">
              <span>&gt; ${card.title}</span>
              <span class="text-[9px] text-emerald-600 font-normal">Top 5 🔍</span>
            </div>
            <p class="text-xl font-black text-emerald-300 crt-glow">${val}</p>
            <p class="text-xs font-bold text-emerald-400 truncate mt-1">${team} <span class="text-[10px] text-emerald-600 font-normal">[${owner}]</span></p>
            <p class="text-[10px] text-emerald-500 italic mt-0.5 truncate">${sub}</p>
            ${popoverHtml}
          `;
          statGrid.appendChild(div);
        });
      }
    }

        // TAB 5: TEAMS / FRANCHISE PROFILES
    // TAB 5: TEAMS / FRANCHISE PROFILES
    let currentFranchiseOwner = null;

    function initTeamOwnerSelect() {
      const btnContainer = document.getElementById('team-owner-buttons');
      const leagueData = window.LEAGUE_DATA;
      let owners = (leagueData.allTimeStandings || [])
        .map(s => s.ownerName)
        .filter(o => !isOneYearManager(o));
      owners.sort();

      if (!currentFranchiseOwner || !owners.includes(currentFranchiseOwner)) {
        currentFranchiseOwner = owners[0] || 'Dylan';
      }

      if (btnContainer) {
        btnContainer.innerHTML = owners.map(o => {
          const isActive = o === currentFranchiseOwner;
          const activeClass = 'bg-emerald-950 border-emerald-400 text-emerald-300 font-extrabold shadow-[0_0_8px_rgba(0,255,102,0.3)]';
          const inactiveClass = 'bg-black/80 border-emerald-900 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400 font-bold';
          return `<button type="button" data-owner="${encodeURIComponent(o)}" onclick="selectFranchiseByName(decodeURIComponent(this.getAttribute('data-owner')))" class="px-3 py-1.5 text-xs rounded border transition-all ${isActive ? activeClass : inactiveClass}">${o}</button>`;
        }).join('');
      }

      renderFranchiseProfile();
    }

    function selectFranchiseByName(owner) {
      if (isOneYearManager(owner)) return;
      currentFranchiseOwner = owner;
      switchTab('teams');
      initTeamOwnerSelect();
    }

    function selectManagerProfile(ownerName) {
      selectFranchiseByName(ownerName);
    }

    function renderFranchiseProfile() {
      const owner = currentFranchiseOwner;
      const card = document.getElementById('franchise-profile-card');
      if (!owner || !card) return;

      card.innerHTML = buildFranchiseProfileHtml({
        owner,
        allTimeStandings: window.LEAGUE_DATA.allTimeStandings,
        seasons: window.LEAGUE_DATA.seasons,
        seasonData: window.LEAGUE_DATA.seasonData,
        draftProfiles: window.LEAGUE_DATA.draftProfiles || {},
        theme: CRT_THEME
      });

      let availableDraftYears = [];
      window.LEAGUE_DATA.seasons.forEach(yr => {
        const sData = window.LEAGUE_DATA.seasonData[yr];
        if (sData && sData.draftPicks && sData.draftPicks.some(p => p.ownerName === owner && p.player && p.player !== 'Empty / Bye')) {
          availableDraftYears.push(yr);
        }
      });
      availableDraftYears.sort((a, b) => b - a);

      if (availableDraftYears.length > 0) {
        window.renderFranchiseDraftYear(owner, availableDraftYears[0]);
      }
    }

    window.renderFranchiseDraftYear = function(owner, forcedYear) {
      const container = document.getElementById('franchise-draft-picks-container');
      if (!container || !forcedYear) return;

      // Update button active classes
      document.querySelectorAll('.franchise-draft-year-btn').forEach(btn => {
        btn.className = 'franchise-draft-year-btn px-2.5 py-1 text-xs rounded border transition-all bg-black border-emerald-900 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400 font-bold';
      });
      const activeBtn = document.getElementById(`btn-franchise-draft-${forcedYear}`);
      if (activeBtn) {
        activeBtn.className = 'franchise-draft-year-btn px-2.5 py-1 text-xs rounded border transition-all bg-emerald-950 border-emerald-400 text-emerald-300 font-extrabold shadow-[0_0_6px_rgba(0,255,102,0.3)]';
      }

      const sData = window.LEAGUE_DATA.seasonData[forcedYear];
      if (!sData || !sData.draftPicks) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-emerald-500 font-mono">No draft records found for ${forcedYear}.</div>`;
        return;
      }

      const ownerPicks = sData.draftPicks
        .filter(p => p.ownerName === owner && p.player && p.player !== 'Empty / Bye')
        .sort((a, b) => (a.overallPick || 0) - (b.overallPick || 0));

      if (ownerPicks.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-emerald-500 font-mono">No draft picks recorded for ${owner} in ${forcedYear}.</div>`;
        return;
      }

      let pickRows = ownerPicks.map(p => {
        const pName = p.playerName || p.player || 'Unknown Player';
        const pos = p.position || p.pos || '-';
        const rnd = p.round || '-';
        const pickNum = p.pickInRound ? `${p.round}.${p.pickInRound < 10 ? '0' : ''}${p.pickInRound}` : (p.overallPick || '-');
        const ovr = p.overallPick ? `#${p.overallPick}` : '-';
        const team = p.teamName || '-';

        return `
          <tr class="border-b border-emerald-950/80 hover:bg-emerald-950/30 transition-colors">
            <td class="p-2.5 font-mono font-bold text-emerald-400 text-center">${rnd}</td>
            <td class="p-2.5 font-mono font-bold text-emerald-300 text-center">${pickNum} <span class="text-[10px] text-emerald-600">(${ovr})</span></td>
            <td class="p-2.5 font-bold text-emerald-300 font-mono">${pName}</td>
            <td class="p-2.5 text-center font-mono font-bold text-amber-400"><span class="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/60 text-[11px]">${pos}</span></td>
            <td class="p-2.5 font-mono text-emerald-500 text-xs">${team}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="w-full min-w-[680px] text-xs text-left border-collapse font-mono">
          <thead class="bg-[#052611] text-emerald-300 font-bold border-b border-emerald-600 text-xs">
            <tr>
              <th class="p-2.5 text-center w-16">ROUND</th>
              <th class="p-2.5 text-center w-28">PICK</th>
              <th class="p-2.5">PLAYER SELECTED</th>
              <th class="p-2.5 text-center w-20">POS</th>
              <th class="p-2.5">FRANCHISE NAME</th>
            </tr>
          </thead>
          <tbody>
            ${pickRows}
          </tbody>
        </table>
      `;
    };


    // TAB 6: DRAFT ORDER PAGE
    function initDraftTab() {
      const container = document.getElementById('draft-season-selector');
      container.innerHTML = '';
      const availableDraftYears = Array.from(new Set([
        ...Object.keys(window.LEAGUE_DATA.draftOrders).map(Number),
        ...window.LEAGUE_DATA.seasons.map(Number)
      ])).sort((a, b) => b - a);

      availableDraftYears.forEach(yr => {
        const btn = document.createElement('button');
        btn.id = `btn-draft-${yr}`;
        btn.onclick = () => selectDraftSeason(yr);
        btn.className = `px-2.5 py-1 text-xs font-bold transition-all border ${yr === currentDraftSeason ? 'bg-emerald-900 text-emerald-300 border-emerald-400' : 'bg-black text-emerald-600 border-emerald-900 hover:border-emerald-700'}`;
        btn.innerText = yr;
        container.appendChild(btn);
      });

      renderDraftPage();
    }

    function selectDraftSeason(yr) {
      currentDraftSeason = yr;
      document.querySelectorAll('#draft-season-selector button').forEach(btn => {
        btn.className = 'px-2.5 py-1 text-xs font-bold transition-all border bg-black text-emerald-600 border-emerald-900 hover:border-emerald-700';
      });
      const activeBtn = document.getElementById(`btn-draft-${yr}`);
      if (activeBtn) {
        activeBtn.className = 'px-2.5 py-1 text-xs font-bold transition-all border bg-emerald-900 text-emerald-300 border-emerald-400';
      }
      renderDraftPage();
    }

        function renderDraftPage() {
      const tbody = document.getElementById('draft-table-body');
      const title = document.getElementById('draft-table-title') || document.getElementById('draft-order-title');
      const grid = document.getElementById('draft-insights-grid');
      if (!tbody || !title || !grid) return;

      tbody.innerHTML = ''; grid.innerHTML = '';
      title.innerText = `${currentDraftSeason} Official Draft Order`;

      const yrInt = parseInt(currentDraftSeason);
      let draftList = window.LEAGUE_DATA.draftOrders ? window.LEAGUE_DATA.draftOrders[currentDraftSeason] : null;
      const champ = window.LEAGUE_DATA.championships.find(c => c.seasonYear === yrInt);

      if (!draftList) {
        if (yrInt === 2018 && window.LEAGUE_DATA.seasonData['2018']) {
          const sStandings = window.LEAGUE_DATA.seasonData['2018'].standings || [];
          const picksR1 = window.LEAGUE_DATA.seasonData['2018'].draftPicks ? window.LEAGUE_DATA.seasonData['2018'].draftPicks.slice(0, 10) : [];
          draftList = picksR1.map(p => {
            const st = sStandings.find(s => s.ownerName === p.ownerName);
            return {
              pick: p.pickInRound,
              teamName: p.teamName,
              ownerName: p.ownerName,
              prevRank: 'Inaugural Draft',
              prevRecord: '-',
              curRank: st ? st.rank : '-',
              curRecord: st ? `${st.wins}-${st.losses}` : '-'
            };
          });
        }
      }

      if (!draftList || draftList.length === 0) {
        grid.innerHTML = `
          <div class="crt-box p-3 rounded col-span-1 sm:col-span-3 text-center">
            <span class="text-[10px] uppercase font-bold text-amber-400 block">⚠️ ${currentDraftSeason} DRAFT LOG PENDING</span>
            <span class="text-xs text-emerald-500 block mt-1">Official standings & matchup history intact.</span>
          </div>
        `;
        renderPlayerDraftPicks();
        return;
      }

      const prevYear = yrInt - 1;

      let champDraftPick = '-';
      if (champ) {
        const champPickObj = draftList.find(d => d.ownerName === champ.firstOwner);
        if (champPickObj) {
          champDraftPick = `Pick #${champPickObj.pick} (${champ.firstOwner})`;
        } else {
          champDraftPick = `${champ.firstOwner} (${champ.firstTeam})`;
        }
      }

      const rData = (window.LEAGUE_DATA.championshipRosters || {})[currentDraftSeason] || null;

      let titleProvenanceHtml = '';
      if (rData && champ) {
        const startersItems = rData.starters.map(s => {
          const rBadge = getPlayerRingBadgeHtml(s.player);
          return `
            <div class="flex items-start justify-between py-1 border-b border-emerald-950/80 text-[11px] font-mono">
              <div>
                <span class="font-bold text-emerald-300"><span class="text-amber-400 font-semibold w-10 inline-block">${s.pos}</span>${s.player}${rBadge}</span>
                <span class="text-[10px] text-emerald-500 block pl-10">${s.draftInfo || s.acq || 'Championship Roster'}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded ${s.acq === 'Draft' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950/70 text-amber-300 border border-amber-600'} font-bold">${s.acq || 'FA/Trade'}</span>
            </div>
          `;
        }).join('');

        const benchItems = rData.bench.map(b => {
          const rBadge = getPlayerRingBadgeHtml(b.player);
          return `
            <div class="flex items-start justify-between py-1 border-b border-emerald-950/80 text-[11px] font-mono">
              <div>
                <span class="font-bold text-emerald-400"><span class="text-emerald-600 font-semibold w-10 inline-block">${b.pos || 'BN'}</span>${b.player}${rBadge}</span>
                <span class="text-[10px] text-emerald-500 block pl-10">${b.draftInfo || b.acq || 'Free Agent'}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded ${b.acq === 'Draft' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950/70 text-amber-300 border border-amber-600'} font-bold">${b.acq || 'FA/Trade'}</span>
            </div>
          `;
        }).join('');

        const draftedItems = rData.draftedContributors.map(d => {
          const rBadge = getPlayerRingBadgeHtml(d.player);
          return `
            <div class="flex items-start justify-between py-1 border-b border-emerald-950/80 text-[11px] font-mono">
              <div>
                <span class="font-medium text-emerald-400/90"><span class="text-amber-500 font-semibold w-10 inline-block">${d.pos || 'D'}</span>${d.player}${rBadge}</span>
                <span class="text-[10px] text-amber-400/90 block pl-10">${d.draftInfo}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">Ring Recipient</span>
            </div>
          `;
        }).join('');

        titleProvenanceHtml = `
          <div class="mt-3 p-3 bg-black/90 border-2 border-emerald-600 rounded text-left font-mono">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-emerald-800 pb-2 mb-3 gap-1">
              <div>
                <div class="text-[10px] font-bold text-amber-400 tracking-widest uppercase">&gt;_ CHAMPION TITLE ROSTER &amp; DRAFT PROVENANCE</div>
                <div class="text-sm font-black text-emerald-300 crt-glow">🏆 ${champ.firstTeam} <span class="text-xs text-emerald-400 font-normal">[${champ.firstOwner}]</span></div>
              </div>
              <span class="px-2 py-0.5 bg-amber-950 text-amber-300 font-bold border border-amber-600 rounded text-xs">${rData.totalRingsAwarded || (rData.starters.length + rData.bench.length + rData.draftedContributors.length)} Championship Rings Awarded</span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <!-- Starters -->
              <div class="bg-[#030e06] p-2.5 rounded border border-emerald-800">
                <div class="text-[10px] font-black text-amber-400 uppercase tracking-wider border-b border-amber-900/60 pb-1 mb-1.5 flex items-center justify-between">
                  <span>🌟 TITLE GAME STARTERS</span>
                  <span class="text-[9px] text-emerald-400">${rData.starters.length} Players</span>
                </div>
                ${startersItems}
              </div>

              <!-- Bench -->
              <div class="bg-[#030e06] p-2.5 rounded border border-emerald-800">
                <div class="text-[10px] font-black text-emerald-400 uppercase tracking-wider border-b border-emerald-900/60 pb-1 mb-1.5 flex items-center justify-between">
                  <span>🛡️ BENCH ROSTER</span>
                  <span class="text-[9px] text-emerald-400">${rData.bench.length} Players</span>
                </div>
                ${benchItems}
              </div>

              <!-- Drafted Contributors -->
              <div class="bg-[#030e06] p-2.5 rounded border border-emerald-800">
                <div class="text-[10px] font-black text-amber-500 uppercase tracking-wider border-b border-amber-900/60 pb-1 mb-1.5 flex items-center justify-between">
                  <span>🎯 DRAFTED NO LONGER ON TEAM</span>
                  <span class="text-[9px] text-amber-400">${rData.draftedContributors.length} Players</span>
                </div>
                ${draftedItems}
              </div>
            </div>
          </div>
        `;
      }

      grid.innerHTML = `
        <div class="crt-box p-4 rounded text-center col-span-1 sm:col-span-3">
          <span class="text-xs uppercase font-extrabold text-amber-400 tracking-wider block font-mono">🏆 CHAMPION DRAFT SLOT</span>
          <span class="text-lg font-black text-emerald-300 crt-glow block mt-1">${champDraftPick}</span>
          <span class="text-xs text-emerald-400 italic">${currentDraftSeason} Nebuchadnezzar Cup Winner (${champ ? champ.firstTeam : ''})</span>
          ${titleProvenanceHtml}
        </div>
      `;

      draftList.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/20';

        const prevFinishStr = (item.prevRank === 'New' || item.prevRank === 'Inaugural Draft')
          ? `<span class="text-emerald-400 font-bold">${item.prevRank === 'Inaugural Draft' ? 'Inaugural Draft' : 'New Expansion Team'}</span>`
          : `<span class="font-bold">#${item.prevRank} in ${prevYear} (${item.prevRecord})</span>`;

        const dp = (window.LEAGUE_DATA.draftProfiles || {})[item.ownerName];
        const archetypeBadge = dp ? `<div class="mt-1"><span class="inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${dp.reachColor || 'border-emerald-700 bg-emerald-950 text-emerald-300'} font-bold">🎯 ${dp.archetype}</span></div>` : '';

        tr.innerHTML = `
          <td class="p-2.5 text-center font-black text-sm text-emerald-300 crt-glow font-mono">Pick #${item.pick}</td>
          <td class="p-2.5">
            <span class="font-bold text-emerald-300 block">${item.teamName} <span class="text-[10px] text-emerald-600 font-normal">[${item.ownerName}]</span></span>
            ${archetypeBadge}
          </td>
          <td class="p-2.5 text-center">${prevFinishStr}</td>
          <td class="p-2.5 text-center font-bold">#${item.curRank} (${item.curRecord})</td>
        `;
        tbody.appendChild(tr);
      });

      renderPlayerDraftPicks();
    }

    function getPlayerRingInfo(playerName) {
      return sharedGetPlayerRingInfo(window.LEAGUE_DATA, playerName);
    }

    function getPlayerRingBadgeHtml(playerName) {
      return sharedGetPlayerRingBadgeHtml({
        playerName,
        leagueData: window.LEAGUE_DATA,
        theme: CRT_THEME
      });
    }

    function toggleTitleRoster(yr) {
      const el = document.getElementById(`title-roster-collapse-${yr}`);
      const btn = document.getElementById(`title-roster-btn-${yr}`);
      if (el) {
        el.classList.toggle('hidden');
        if (btn) {
          btn.innerText = el.classList.contains('hidden') ? '💍 VIEW TITLE ROSTER & RING CEREMONY ▾' : '💍 HIDE TITLE ROSTER ▴';
        }
      }
    }

    function renderPlayerDraftPicks() {
      const pTitle = document.getElementById('player-draft-title');
      const roundSel = document.getElementById('draft-round-select');
      const pTbody = document.getElementById('player-draft-table-body');
      if (!pTbody || !pTitle) return;

      pTitle.innerText = `>_ PLAYER_DRAFT_RESULTS (${currentDraftSeason})`;

      const sData = window.LEAGUE_DATA.seasonData[currentDraftSeason];
      const picks = (sData && sData.draftPicks) ? sData.draftPicks : [];

      const maxRounds = picks.length > 0 ? Math.max(...picks.map(p => p.round)) : 16;
      let roundOptions = '<option value="all">All Rounds</option>';
      for (let r = 1; r <= maxRounds; r++) {
        roundOptions += `<option value="${r}">Round ${r}</option>`;
      }
      roundSel.innerHTML = roundOptions;

      filterPlayerDraftPicks();
    }

    function getPlayerLifetimeDraftPopover(playerName, rowPopDir = '') {
      return sharedGetPlayerLifetimeDraftPopover({
        playerName,
        rowPopDir,
        leagueData: window.LEAGUE_DATA,
        theme: CRT_THEME
      });
    }

    function filterPlayerDraftPicks() {
      const pTbody = document.getElementById('player-draft-table-body');
      const searchInput = document.getElementById('draft-search-input');
      const roundSel = document.getElementById('draft-round-select');
      if (!pTbody) return;

      const searchVal = (searchInput && searchInput.value) ? searchInput.value : '';
      const roundVal = (roundSel && roundSel.value) ? roundSel.value : 'all';

      pTbody.innerHTML = '';
      const sData = window.LEAGUE_DATA.seasonData[currentDraftSeason];
      const picks = (sData && sData.draftPicks) ? sData.draftPicks : [];

      if (picks.length === 0) {
        pTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-emerald-600 italic">No player draft records ingested for ${currentDraftSeason}.</td></tr>`;
        return;
      }

      const filtered = filterDraftPicks(picks, { searchVal, roundVal });

      if (filtered.length === 0) {
        pTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-emerald-600 italic">No picks matching filter query.</td></tr>`;
        return;
      }

      filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-emerald-900/40 hover:bg-emerald-950/40 transition-colors';

        const isRound1 = p.round === 1;
        const roundBadge = isRound1
          ? `<span class="px-2 py-0.5 bg-amber-950/80 text-amber-300 font-bold border border-amber-600 rounded text-xs shadow-sm">R${p.round}P${p.pickInRound}</span>`
          : `<span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold border border-emerald-700 rounded text-xs">R${p.round}P${p.pickInRound}</span>`;

        const popoverHtml = getPlayerLifetimeDraftPopover(p.player);

        tr.innerHTML = `
          <td class="p-2.5 text-center font-black text-emerald-300">Pick #${p.overallPick}</td>
          <td class="p-2.5 text-center">${roundBadge}</td>
          <td class="p-2.5 font-bold text-emerald-200">
            <div class="tooltip-trigger inline-block cursor-pointer">
              <span class="hover:underline hover:text-emerald-300 transition-colors">${p.player}</span>
              ${popoverHtml}
            </div>
            ${getPlayerRingBadgeHtml(p.player)}
          </td>
          <td class="p-2.5">
            <span class="font-bold text-emerald-300">${p.teamName}</span>
            <span class="text-[10px] text-emerald-400 block font-mono">[${p.ownerName}]</span>
          </td>
        `;
        pTbody.appendChild(tr);
      });
    }


let y2kLineupsData = null;

    async function loadY2KLineups() {
      if (y2kLineupsData) return y2kLineupsData;
      try {
        const res = await fetch('data/lineups/y2k_lineups.json');
        if (res.ok) {
          y2kLineupsData = await res.json();
        } else {
          y2kLineupsData = [];
        }
      } catch {
        y2kLineupsData = [];
      }
      return y2kLineupsData;
    }

    window.managerialSelectedSeason = 'allTime';

    window.onManagerialSeasonChange = function(val) {
      window.managerialSelectedSeason = val;
      renderManagerialProwess();
    };

    async function renderManagerialProwess() {
      const container = document.getElementById('managerial-prowess-container');
      if (!container) return;

      const selSeason = window.managerialSelectedSeason || 'allTime';
      let leaderboard = [];

      if (selSeason === 'allTime') {
        leaderboard = window.LEAGUE_DATA.allTimeStandings
          .filter(s => !isOneYearManager(s.ownerName))
          .map(s => ({
            ownerName: s.ownerName,
            teamName: s.teamName,
            games: (s.wins + s.losses) || 1,
            record: `${s.wins}-${s.losses}`,
            actualPF: Number((s.pointsFor || 0).toFixed(1)),
            optimalPF: Number(((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)).toFixed(1)),
            coachingEfficiency: s.coachingEfficiency || 90.0,
            pointsLeftOnBench: Number((((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)) - (s.pointsFor || 0)).toFixed(1)),
            benchPFPerGame: Number((((((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)) - (s.pointsFor || 0))) / ((s.wins + s.losses) || 1)).toFixed(1)),
            dOhCount: s.dOhs || 0,
            dOhRate: s.losses > 0 ? Number(((s.dOhs || 0) / s.losses * 100).toFixed(1)) : 0,
            mostPainfulDOh: (s.dOhDetails && s.dOhDetails.length > 0) ? s.dOhDetails[0] : null
          }))
          .sort((a, b) => b.coachingEfficiency - a.coachingEfficiency);
      } else if (selSeason === 2026 || selSeason === '2026') {
        leaderboard = [];
      } else {
        const lineups = await loadY2KLineups();
        const seasonLineups = lineups.filter(m => String(m.seasonYear) === String(selSeason));
        const allTeamLineups = [];
        seasonLineups.forEach(m => {
          if (m.homeTeam) allTeamLineups.push(m.homeTeam);
          if (m.awayTeam) allTeamLineups.push(m.awayTeam);
        });

        if (allTeamLineups.length > 0) {
          leaderboard = computeManagerialLeaderboard(allTeamLineups);
        } else {
          // Fallback to season standings
          const sData = window.LEAGUE_DATA.seasonData[String(selSeason)];
          if (sData && sData.standings) {
            leaderboard = sData.standings
              .filter(s => !isOneYearManager(s.ownerName))
              .map(s => ({
                ownerName: s.ownerName,
                teamName: s.teamName,
                games: (s.wins + s.losses) || 1,
                record: `${s.wins}-${s.losses}`,
                actualPF: Number((s.pointsFor || 0).toFixed(1)),
                optimalPF: Number(((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)).toFixed(1)),
                coachingEfficiency: s.coachingEfficiency || 90.0,
                pointsLeftOnBench: Number((((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)) - (s.pointsFor || 0)).toFixed(1)),
                benchPFPerGame: Number((((((s.pointsFor || 0) / (s.coachingEfficiency ? (s.coachingEfficiency / 100) : 0.90)) - (s.pointsFor || 0))) / ((s.wins + s.losses) || 1)).toFixed(1)),
                dOhCount: s.dOhs || 0,
                dOhRate: s.losses > 0 ? Number(((s.dOhs || 0) / s.losses * 100).toFixed(1)) : 0,
                mostPainfulDOh: (s.dOhDetails && s.dOhDetails.length > 0) ? s.dOhDetails[0] : null
              }))
              .sort((a, b) => b.coachingEfficiency - a.coachingEfficiency);
          }
        }
      }

      container.innerHTML = buildManagerialProwessHtml({
        leaderboard,
        theme: CRT_THEME,
        selectedSeason: selSeason,
        seasons: window.LEAGUE_DATA.seasons
      });
    }

    // TAB 7: ANALYTICS
    function renderAnalytics() {
      renderManagerialProwess();
      const tbody = document.getElementById('luck-index-table-body');
      tbody.innerHTML = '';

      // Filter out Nick and Torin from All-Time Analytics
      let list = window.LEAGUE_DATA.allTimeStandings
        .filter(st => !isOneYearManager(st.ownerName))
        .map(st => ({
          owner: st.ownerName,
          actualW: st.wins,
          expW: st.expWins || roundVal(st.wins - st.luck),
          luck: st.luck || 0
        }));

      list.sort((a, b) => b.luck - a.luck);
      list.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-emerald-950 hover:bg-emerald-950/20';
        const luckColor = item.luck > 0 ? 'text-emerald-400 font-bold' : (item.luck < 0 ? 'text-red-500 font-bold' : 'text-emerald-700');
        tr.innerHTML = `
          <td class="p-2 font-bold text-emerald-300">${item.owner}</td>
          <td class="p-2 text-center font-bold text-emerald-300">${item.actualW}</td>
          <td class="p-2 text-center text-emerald-600">${item.expW}</td>
          <td class="p-2 text-center ${luckColor}">${item.luck > 0 ? '+' + item.luck : item.luck}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderAnalyticsCharts() {
      const textColor = '#00ff66';
      const gridColor = 'rgba(0, 255, 102, 0.15)';

      const luckCtx = document.getElementById('luckChart').getContext('2d');
      const luckData = window.LEAGUE_DATA.allTimeStandings
        .filter(st => !isOneYearManager(st.ownerName))
        .map(st => ({
          owner: st.ownerName,
          luck: st.luck || 0
        })).sort((a, b) => b.luck - a.luck);

      if (luckChartInstance) luckChartInstance.destroy();
      luckChartInstance = new Chart(luckCtx, {
        type: 'bar',
        data: {
          labels: luckData.map(d => d.owner),
          datasets: [{
            label: 'Luck Score (Actual W - Exp W)',
            data: luckData.map(d => d.luck),
            backgroundColor: luckData.map(d => d.luck >= 0 ? '#00ff66' : '#ff3333'),
            borderRadius: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor, font: { family: 'Courier Prime' } }, grid: { display: false } },
            y: { ticks: { color: textColor, font: { family: 'Courier Prime' } }, grid: { color: gridColor } }
          }
        }
      });

      const pfPaCtx = document.getElementById('pfPaChart').getContext('2d');
      const pfPaData = window.LEAGUE_DATA.allTimeStandings
        .filter(st => !isOneYearManager(st.ownerName))
        .map(st => {
          const totalGames = (st.wins + st.losses) || 1;
          const avgPfG = parseFloat((st.pointsFor / totalGames).toFixed(2));
          const avgPaG = parseFloat((st.pointsAgainst / totalGames).toFixed(2));
          return {
            x: avgPfG,
            y: avgPaG,
            owner: st.ownerName,
            seasons: st.seasonsCount,
            games: totalGames
          };
        });

      if (pfPaChartInstance) pfPaChartInstance.destroy();
      pfPaChartInstance = new Chart(pfPaCtx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Per-Game Scoring (PF/G vs PA/G)',
            data: pfPaData,
            backgroundColor: '#00ff66',
            borderColor: '#66ff99',
            borderWidth: 1.5,
            pointRadius: 7,
            pointHoverRadius: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw.owner}: ${ctx.raw.x} PF/G | ${ctx.raw.y} PA/G (${ctx.raw.seasons} Seasons, ${ctx.raw.games} Games)`
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Average Points Scored Per Game (PF / G)', color: textColor, font: { family: 'Courier Prime', weight: 'bold' } }, ticks: { color: textColor, font: { family: 'Courier Prime' } }, grid: { color: gridColor } },
            y: { title: { display: true, text: 'Average Points Allowed Per Game (PA / G)', color: textColor, font: { family: 'Courier Prime', weight: 'bold' } }, ticks: { color: textColor, font: { family: 'Courier Prime' } }, grid: { color: gridColor } }
          }
        }
      });
    }

    // WEEKLY MATCHUP HUBS LOGIC
    let currentMatchupSeason = 2026;
    let currentMatchupWeek = 1;
    let currentMatchupMode = 'preview'; // 'preview' or 'recap'

    function initMatchupsTab() {
      const seasonSelect = document.getElementById('matchup-season-select');
      if (seasonSelect) seasonSelect.value = String(currentMatchupSeason);
      renderWeekPills();
      renderMatchupsTab();
    }

    function onMatchupSeasonChange() {
      const seasonSelect = document.getElementById('matchup-season-select');
      if (seasonSelect) currentMatchupSeason = parseInt(seasonSelect.value) || 2025;
      currentMatchupWeek = 1;
      renderWeekPills();
      renderMatchupsTab();
    }

    function switchMatchupWeek(wk) {
      currentMatchupWeek = wk;
      renderWeekPills();
      renderMatchupsTab();
    }

    function switchMatchupMode(mode) {
      currentMatchupMode = mode;
      document.querySelectorAll('.matchup-mode-btn').forEach(btn => {
        btn.className = 'matchup-mode-btn px-4 py-1 text-xs font-bold transition-all text-emerald-600 hover:text-emerald-300';
      });
      const activeBtn = document.getElementById(`matchup-mode-${mode}`);
      if (activeBtn) {
        activeBtn.className = 'matchup-mode-btn px-4 py-1 text-xs font-bold transition-all bg-emerald-900 text-emerald-300 border border-emerald-500';
      }
      renderMatchupsTab();
    }

    function renderWeekPills() {
      const container = document.getElementById('matchup-week-pills-container');
      if (!container) return;

      const sData = window.LEAGUE_DATA.seasonData[currentMatchupSeason];
      const maxWeeks = sData ? (sData.settings.regularSeasonWeeks + (sData.playoffMatchups && sData.playoffMatchups.length ? 3 : 0)) : 17;

      let html = '';
      for (let w = 1; w <= maxWeeks; w++) {
        const isActive = (w === currentMatchupWeek);
        const isPlayoff = sData && w > sData.settings.regularSeasonWeeks;

        const activeClass = isActive
          ? 'bg-emerald-900 text-emerald-300 border-emerald-400 font-black shadow-[0_0_8px_rgba(52,211,153,0.5)]'
          : 'bg-black/80 text-emerald-600 hover:text-emerald-300 border-emerald-900 font-bold';

        const label = isPlayoff ? `P-W${w}` : `W${w}`;
        html += `<button onclick="switchMatchupWeek(${w})" class="px-2 py-1 text-xs border rounded transition-all font-mono ${activeClass}">${label}</button>`;
      }
      container.innerHTML = html;
    }


    window.toggleMatchupLineupBox = function(mId) {
      const content = document.getElementById(`matchup-lineup-content-${mId}`);
      const arrow = document.getElementById(`matchup-lineup-arrow-${mId}`);
      if (content) {
        if (content.classList.contains('hidden')) {
          content.classList.remove('hidden');
          if (arrow) arrow.innerText = '▲';
        } else {
          content.classList.add('hidden');
          if (arrow) arrow.innerText = '▼';
        }
      }
    };

    async function renderMatchupsTab() {
      renderWeekPills();
      const lineups = await loadY2KLineups();
      const container = document.getElementById('matchups-cards-container');
      const heading = document.getElementById('matchup-title-heading');
      const badge = document.getElementById('matchup-mode-badge');
      if (!container) return;

      const sData = window.LEAGUE_DATA.seasonData[currentMatchupSeason];
      const regWeeks = sData ? sData.settings.regularSeasonWeeks : 14;
      const isPlayoffWeek = currentMatchupWeek > regWeeks;

      if (heading) {
        heading.innerHTML = `🏈 ${currentMatchupSeason} Y2K: WEEK ${currentMatchupWeek} ${isPlayoffWeek ? 'PLAYOFF ' : ''}${currentMatchupMode.toUpperCase()}`;
      }
      if (badge) {
        badge.innerHTML = currentMatchupMode === 'preview'
          ? `<span class="text-emerald-400">⚡ PRE-GAME PREVIEW</span>`
          : `<span class="text-amber-400">📊 POST-GAME RECAP</span>`;
      }

      // Filter matchups for selected season & week
      let mList = [];
      if (currentMatchupSeason === 2026 && sData && sData.schedule2026) {
        mList = sData.schedule2026.filter(m => m.weekNumber === currentMatchupWeek);
      } else {
        mList = window.LEAGUE_DATA.allMatchups.filter(m => m.seasonYear === currentMatchupSeason && m.weekNumber === currentMatchupWeek);
      }

      if (mList.length === 0) {
        container.innerHTML = `
          <div class="crt-box rounded p-8 text-center border border-emerald-800 bg-emerald-950/20">
            <div class="text-amber-400 font-black text-base mb-2 crt-glow">
              &gt; NO MATCHUPS RECORDED FOR ${currentMatchupSeason} WEEK ${currentMatchupWeek}
            </div>
            <p class="text-xs text-emerald-400 max-w-md mx-auto leading-relaxed">
              No game results or editorial write-ups exist for ${currentMatchupSeason} Week ${currentMatchupWeek}.
            </p>
          </div>
        `;
        return;
      }

      const isRecap = (currentMatchupMode === 'recap');

      // Compute standings ranks & records (prior to week if PREVIEW, up to week if RECAP)
      const ownerStatsTarget = {};
      window.LEAGUE_DATA.allMatchups
        .filter(m => m.seasonYear === currentMatchupSeason && (isRecap ? m.weekNumber <= currentMatchupWeek : m.weekNumber < currentMatchupWeek))
        .forEach(m => {
          const h = m.homeOwner, a = m.awayOwner;
          if (!ownerStatsTarget[h]) ownerStatsTarget[h] = { owner: h, w: 0, l: 0, pf: 0 };
          if (!ownerStatsTarget[a]) ownerStatsTarget[a] = { owner: a, w: 0, l: 0, pf: 0 };
          ownerStatsTarget[h].pf += m.homeScore; ownerStatsTarget[a].pf += m.awayScore;
          if (m.homeScore > m.awayScore) { ownerStatsTarget[h].w++; ownerStatsTarget[a].l++; }
          else if (m.awayScore > m.homeScore) { ownerStatsTarget[a].w++; ownerStatsTarget[h].l++; }
        });

      const sortedOwnersTarget = Object.values(ownerStatsTarget).sort((a, b) => {
        const pctA = a.w / (a.w + a.l || 1);
        const pctB = b.w / (b.w + b.l || 1);
        if (pctB !== pctA) return pctB - pctA;
        return b.pf - a.pf;
      });

      const rankMap = {};
      sortedOwnersTarget.forEach((st, idx) => {
        rankMap[st.owner] = { rank: idx + 1, rec: `${st.w}-${st.l}` };
      });

      // Fallback for Week 1 Preview mode
      if (!isRecap && currentMatchupWeek === 1 && sData && sData.standings) {
        sData.standings.forEach(st => {
          rankMap[st.ownerName] = { rank: st.rank, rec: '0-0' };
        });
      }

      // Check if custom commentary exists for this season & week
      const seasonKey = String(currentMatchupSeason);
      const weekKey = String(currentMatchupWeek);
      const customComm = (window.LEAGUE_DATA.weeklyCommentary && window.LEAGUE_DATA.weeklyCommentary[seasonKey] && window.LEAGUE_DATA.weeklyCommentary[seasonKey][weekKey]) ? window.LEAGUE_DATA.weeklyCommentary[seasonKey][weekKey] : null;

      let cardsHtml = '';

      mList.forEach(m => {
        const o1 = m.homeOwner;
        const o2 = m.awayOwner;
        const t1 = m.homeTeam;
        const t2 = m.awayTeam;
        const s1 = m.homeScore;
        const s2 = m.awayScore;

        const info1 = rankMap[o1] || { rank: '-', rec: '0-0' };
        const info2 = rankMap[o2] || { rank: '-', rec: '0-0' };

        // Calculate dynamic past H2H metrics (prior to week if PREVIEW, up to week if RECAP)
        const pastGames = window.LEAGUE_DATA.allMatchups.filter(gm => {
          const isPair = (gm.homeOwner === o1 && gm.awayOwner === o2) || (gm.homeOwner === o2 && gm.awayOwner === o1);
          if (!isPair) return false;
          if (gm.seasonYear < currentMatchupSeason) return true;
          if (gm.seasonYear === currentMatchupSeason) {
            return isRecap ? (gm.weekNumber <= currentMatchupWeek) : (gm.weekNumber < currentMatchupWeek);
          }
          return false;
        }).sort((a, b) => a.seasonYear !== b.seasonYear ? a.seasonYear - b.seasonYear : a.weekNumber - b.weekNumber);

        let regW1 = 0, regW2 = 0, playW1 = 0, playW2 = 0;
        let lastW = null, streakCount = 0, lastG = null;
        let playGamesList = [];

        let lastWinner = null;
        let streakGames = [];
        pastGames.forEach(g => {
          const w = g.homeScore > g.awayScore ? g.homeOwner : (g.awayScore > g.homeScore ? g.awayOwner : 'Tie');
          if (g.isPlayoff) {
            playGamesList.push(g);
            if (w === o1) playW1++; else if (w === o2) playW2++;
          } else {
            if (w === o1) regW1++; else if (w === o2) regW2++;
          }
          if (w !== 'Tie') {
            if (w === lastWinner) {
              streakGames.push(g);
            } else {
              lastWinner = w;
              streakGames = [g];
            }
          }
        });

        let streakStr = 'None';
        if (lastWinner && streakGames.length > 0) {
          const gameTags = streakGames.map(g => {
            if (g.isPlayoff) {
              return formatPlayoffStageTag(g.stage, g.seasonYear);
            } else {
              return `Wk${g.weekNumber}'${String(g.seasonYear).slice(2)}`;
            }
          }).join(', ');
          streakStr = `${lastWinner} W${streakGames.length}; ${gameTags}`;
        }

        let playH2HStr = `${playW1}-${playW2}`;
        if (playGamesList.length > 0) {
          const gameStages = playGamesList.map(g => formatPlayoffStageTag(g.stage, g.seasonYear)).join(', ');
          playH2HStr += `; ${gameStages}`;
        }

        // Check for ingested weekly player lineup box score
        const lineupMatch = lineups.find(lm =>
          String(lm.seasonYear) === String(currentMatchupSeason) &&
          lm.week === currentMatchupWeek &&
          ((lm.homeTeam?.ownerName === o1 && lm.awayTeam?.ownerName === o2) ||
           (lm.homeTeam?.ownerName === o2 && lm.awayTeam?.ownerName === o1))
        );

        let lineupExpanderBox = '';
        if (lineupMatch) {
          const mId = `m_${currentMatchupSeason}_w${currentMatchupWeek}_${o1}_${o2}`.replace(/[^a-zA-Z0-9_]/g, '_');
          const hasDOh = (lineupMatch.homeTeam?.dOhOccurred || lineupMatch.awayTeam?.dOhOccurred);
          const dOhTeam = lineupMatch.homeTeam?.dOhOccurred ? lineupMatch.homeTeam : (lineupMatch.awayTeam?.dOhOccurred ? lineupMatch.awayTeam : null);
          const dOhBadge = hasDOh && dOhTeam?.dOhDetails ? `
            <span class="px-2 py-0.5 bg-red-950 text-red-400 border border-red-600 rounded text-[10px] font-bold">
              🤦‍♂️ D'OH! BLUNDER: ${dOhTeam.ownerName} benched ${dOhTeam.dOhDetails.benchPlayer} (+${dOhTeam.dOhDetails.winMargin} pt win missed)
            </span>
          ` : '';

          const lineupCardInnerHtml = buildMatchupLineupCardHtml({ matchup: lineupMatch, theme: CRT_THEME });

          lineupExpanderBox = `
            <div class="mt-3 pt-2.5 border-t border-emerald-900/60 font-mono">
              <div class="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                ${dOhBadge}
              </div>
              <button type="button" onclick="window.toggleMatchupLineupBox('${mId}')" class="w-full py-1.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600 text-emerald-300 font-bold text-xs rounded transition-all flex items-center justify-between cursor-pointer">
                <span>📋 View Starters, Bench &amp; Optimal Scores</span>
                <span id="matchup-lineup-arrow-${mId}">▼</span>
              </button>
              <div id="matchup-lineup-content-${mId}" class="hidden mt-2">
                ${lineupCardInnerHtml}
              </div>
            </div>
          `;
        }

        // Check for custom write-up commentary
        let writeupText = null;
        if (customComm && customComm.matchups) {
          const customM = customComm.matchups.find(cm =>
            (cm.homeOwner === o1 && cm.awayOwner === o2) || (cm.homeOwner === o2 && cm.awayOwner === o1)
          );
          if (customM && customM.writeup) {
            writeupText = customM.writeup;
          }
        }

        const isWinner1 = s1 > s2;
        const isWinner2 = s2 > s1;
        const margin = Math.abs(s1 - s2);

        // Header Title
        const titleStr = `${info1.rank}. ${t1} (${info1.rec}) vs ${info2.rank}. ${t2} (${info2.rec})`;

        // Score box if RECAP mode
        let recapBox = '';
        if (currentMatchupMode === 'recap') {
          recapBox = `
            <div class="mt-3 p-3 bg-black border border-emerald-700 rounded flex justify-between items-center flex-wrap gap-2 font-mono">
              <div class="flex items-center gap-3">
                <span class="${isWinner1 ? 'text-amber-300 font-black text-lg crt-glow' : 'text-emerald-600 text-base'}">${t1}: <strong>${s1.toFixed(2)}</strong></span>
                <span class="text-emerald-400">vs</span>
                <span class="${isWinner2 ? 'text-amber-300 font-black text-lg crt-glow' : 'text-emerald-600 text-base'}">${t2}: <strong>${s2.toFixed(2)}</strong></span>
              </div>
              <div class="text-right">
                <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold text-xs block">
                  🏆 WINNER: ${isWinner1 ? o1 : o2} (+${margin.toFixed(2)} pts)
                </span>
              </div>
            </div>
          `;
        }

        // Writeup box
        let writeupBox = '';
        if (writeupText) {
          writeupBox = `
            <div class="mt-3 p-3 bg-black/90 border border-emerald-600 rounded font-mono text-xs text-emerald-300 leading-relaxed">
              <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">&gt; EDITOR_COMMENTARY:</span>
              ${writeupText}
            </div>
          `;
        } else {
          writeupBox = `
            <div class="mt-3 p-2.5 bg-black/40 border border-emerald-950 rounded font-mono text-xs text-emerald-600 italic">
              &gt; NO EDITORIAL WRITE-UP RECORDED FOR THIS MATCHUP.
            </div>
          `;
        }

        cardsHtml += `
          <div class="crt-box rounded p-4 border border-emerald-800 hover:border-emerald-500 transition-all">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-emerald-900 pb-2.5">
              <h3 class="text-base font-extrabold text-emerald-300 crt-glow">
                ${titleStr}
              </h3>
              <div class="text-xs text-emerald-500 font-bold">
                [${o1} vs ${o2}]
              </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs font-mono">
              <div class="bg-black/60 p-2 border border-emerald-900 rounded">
                <span class="text-[10px] uppercase font-bold text-emerald-600 block">SEASON H2H</span>
                <span class="font-bold text-emerald-300">${regW1}-${regW2}</span>
              </div>
              <div class="bg-black/60 p-2 border border-emerald-900 rounded">
                <span class="text-[10px] uppercase font-bold text-emerald-600 block">CURRENT STREAK</span>
                <span class="font-bold text-emerald-300">${streakStr}</span>
              </div>
              <div class="bg-black/60 p-2 border border-emerald-900 rounded">
                <span class="text-[10px] uppercase font-bold text-emerald-600 block">PLAYOFFS H2H</span>
                <span class="font-bold text-emerald-300">${playH2HStr}</span>
              </div>
            </div>

            ${recapBox}
            ${writeupBox}
            ${lineupExpanderBox}
          </div>
        `;
      });

      container.innerHTML = cardsHtml;
    }

// Bind top-level event handlers safely to window
if (typeof switchTab === "function") window.switchTab = switchTab;
if (typeof switchSeasonsSubTab === "function") window.switchSeasonsSubTab = switchSeasonsSubTab;
if (typeof selectSeason === "function") window.selectSeason = selectSeason;
if (typeof sortStandings === "function") window.sortStandings = sortStandings;
if (typeof sortWeeklyBadges === "function") window.sortWeeklyBadges = sortWeeklyBadges;
if (typeof renderStatsTable === "function") window.renderStatsTable = renderStatsTable;
if (typeof onStatsSeasonChange === "function") window.onStatsSeasonChange = onStatsSeasonChange;
if (typeof filterStats === "function") window.filterStats = filterStats;
if (typeof switchMatchupMode === "function") window.switchMatchupMode = switchMatchupMode;
if (typeof switchMatchupWeek === "function") window.switchMatchupWeek = switchMatchupWeek;
if (typeof onMatchupSeasonChange === "function") window.onMatchupSeasonChange = onMatchupSeasonChange;
if (typeof filterH2HStreaks === "function") window.filterH2HStreaks = filterH2HStreaks;
if (typeof filterH2HMatrix === "function") window.filterH2HMatrix = filterH2HMatrix;
if (typeof toggleMatrixScope === "function") window.toggleMatrixScope = toggleMatrixScope;
if (typeof selectH2HMatchup === "function") window.selectH2HMatchup = selectH2HMatchup;
if (typeof renderH2HComparison === "function") window.renderH2HComparison = renderH2HComparison;
if (typeof renderFranchiseProfile === "function") window.renderFranchiseProfile = renderFranchiseProfile;
if (typeof selectFranchiseByName === "function") window.selectFranchiseByName = selectFranchiseByName;
if (typeof selectManagerProfile === "function") window.selectManagerProfile = selectManagerProfile;
if (typeof selectDraftSeason === "function") window.selectDraftSeason = selectDraftSeason;
if (typeof filterPlayerDraftPicks === "function") window.filterPlayerDraftPicks = filterPlayerDraftPicks;
if (typeof toggleTitleRoster === "function") window.toggleTitleRoster = toggleTitleRoster;
if (typeof updateNavIndicator === "function") window.updateNavIndicator = updateNavIndicator;
if (typeof renderStandings === "function") window.renderStandings = renderStandings;
if (typeof renderStatRecords === "function") window.renderStatRecords = renderStatRecords;
if (typeof initH2HSelects === "function") window.initH2HSelects = initH2HSelects;
if (typeof renderChamps === "function") window.renderChamps = renderChamps;
if (typeof initTeamOwnerSelect === "function") window.initTeamOwnerSelect = initTeamOwnerSelect;
if (typeof renderAnalytics === "function") window.renderAnalytics = renderAnalytics;
if (typeof initDraftTab === "function") window.initDraftTab = initDraftTab;
if (typeof initMatchupsTab === "function") window.initMatchupsTab = initMatchupsTab;
if (typeof renderLucideIcons === "function") window.renderLucideIcons = renderLucideIcons;
