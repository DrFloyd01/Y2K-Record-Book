/**
 * Yahoo Fantasy Football Universal Matchup & Lineup Harvester (v5.0 - Multi-Strategy Engine)
 *
 * Features:
 * - Multi-Strategy DOM parser (4-Table layout, 2-Table layout, Team Container layout, and Generic fallback)
 * - Auto-detects Season, League ID, and active Week from URL or prompts
 * - Exponential backoff & retry on Yahoo HTTP 999 rate limit
 * - Real-time console diagnostics and error inspection
 * - 1-Click Clipboard Copy & JSON Download modal
 * - Standalone `window.testYahooMatchup(week, mid)` for quick single-matchup verification
 */

(async function initYahooHarvester() {
  console.clear();
  console.log('%c🏈 Yahoo Matchup & Lineup Harvester v5.0 Initialized', 'color: #34d399; font-size: 16px; font-weight: bold;');

  // Extract league metadata from URL
  const path = window.location.pathname;
  const urlMatch = path.match(/(?:(?:(\d{4})\/)?f1\/(\d+))/);
  const detectedYear = urlMatch && urlMatch[1] ? parseInt(urlMatch[1], 10) : (new Date().getFullYear());
  const detectedLeagueId = urlMatch && urlMatch[2] ? urlMatch[2] : '97974';

  const seasonYear = parseInt(prompt('Enter Season Year (e.g. 2025, 2024, 2020):', detectedYear) || detectedYear, 10);
  const leagueId = prompt('Enter Yahoo League ID:', detectedLeagueId) || detectedLeagueId;
  const startWeek = parseInt(prompt('Enter START Week (e.g. 1):', 1) || 1, 10);
  const endWeek = parseInt(prompt('Enter END Week (e.g. 17 or 16):', seasonYear >= 2021 ? 17 : 16) || 17, 10);
  const numTeams = parseInt(prompt('Enter Number of Teams (e.g. 12):', 12) || 12, 10);

  // Canonical Team to Owner Mapping
  const OWNER_MAP = {
    'Globo Gym': 'Dylan', 'Ho Chi Win City': 'Phillip', 'Jelqaida': 'Mike', 'AARPFL': 'Casey',
    'Gl Hf (you’re gay)': 'Trace', "Gl Hf (you're gay)": 'Trace', 'Darnold Schwarzenegger': 'Alex',
    'Donkey Squad': 'Ryan', 'Aaron codger': 'Boaz', 'Dusty’s Dingleberries': 'Dustin',
    "Dusty's Dingleberries": 'Dustin', 'Trenches cooper': 'Cooper', 'Tess Finesse': 'Tess',
    "Blue's Balls": 'Jasper', 'Blue’s Balls': 'Jasper', 'The Dawn of Man-Ape': 'Dylan', 'TDS': 'Phillip'
  };

  const constraints = {
    QB: 1, RB: 2, WR: (seasonYear === 2020 ? 2 : 3), TE: 1, FLEX: 1, K: 1, DEF: 1
  };

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalizePosition(slotOrPos) {
    if (!slotOrPos) return 'BN';
    const s = slotOrPos.toUpperCase().trim();
    if (s.includes('QB')) return 'QB';
    if (s.includes('RB')) return 'RB';
    if (s.includes('WR')) return 'WR';
    if (s.includes('TE')) return 'TE';
    if (s.includes('K')) return 'K';
    if (s.includes('DEF') || s.includes('D/ST') || s.includes('DST')) return 'DEF';
    if (s.includes('W/R/T') || s.includes('FLEX') || s.includes('W/R') || s.includes('W/T')) return 'FLEX';
    return 'BN';
  }

  function computeOptimal(players) {
    let starters = players.filter(p => !p.isBench);
    let bench = players.filter(p => p.isBench);
    let actualScore = starters.reduce((sum, p) => sum + (p.points || 0), 0);

    let allAvailable = players.slice().sort((a, b) => (b.points || 0) - (a.points || 0));
    let optStarters = [];

    ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].forEach(pos => {
      let needed = constraints[pos] || 0;
      for (let i = 0; i < allAvailable.length && needed > 0; i++) {
        if (normalizePosition(allAvailable[i].position) === pos) {
          optStarters.push(allAvailable[i]);
          allAvailable.splice(i, 1);
          i--;
          needed--;
        }
      }
    });

    let flexNeeded = constraints.FLEX || 0;
    for (let i = 0; i < allAvailable.length && flexNeeded > 0; i++) {
      let norm = normalizePosition(allAvailable[i].position);
      if (norm === 'RB' || norm === 'WR' || norm === 'TE') {
        optStarters.push(allAvailable[i]);
        allAvailable.splice(i, 1);
        i--;
        flexNeeded--;
      }
    }

    let optimalScore = optStarters.reduce((sum, p) => sum + (p.points || 0), 0);
    let coachingEfficiency = optimalScore > 0 ? Number((actualScore / optimalScore * 100).toFixed(1)) : 100.0;
    let pointsLeftOnBench = Number(Math.max(0, optimalScore - actualScore).toFixed(1));

    return {
      actualScore: Number(actualScore.toFixed(1)),
      optimalScore: Number(optimalScore.toFixed(1)),
      coachingEfficiency,
      pointsLeftOnBench
    };
  }

  function checkDOh(starters, bench, oppScore, teamActualScore) {
    if (teamActualScore >= oppScore) return { dOhOccurred: false, bestSwap: null };
    const deficitNeeded = Number((oppScore - teamActualScore).toFixed(2));
    let winningSwaps = [];

    starters.forEach(starter => {
      const sPos = normalizePosition(starter.position || starter.slot);
      const isFlexStarter = starter.slot === 'W/R/T' || starter.slot === 'FLEX';

      bench.forEach(benchPlayer => {
        const bPos = normalizePosition(benchPlayer.position);
        const isEligible = isFlexStarter ? (bPos === 'RB' || bPos === 'WR' || bPos === 'TE') : (bPos === sPos);
        if (isEligible) {
          const netGain = Number(((benchPlayer.points || 0) - (starter.points || 0)).toFixed(1));
          if (netGain > deficitNeeded) {
            winningSwaps.push({
              starter: starter.player,
              starterPoints: starter.points || 0,
              starterSlot: starter.slot,
              benchPlayer: benchPlayer.player,
              benchPoints: benchPlayer.points || 0,
              netGain,
              deficitNeeded,
              winMargin: Number((netGain - deficitNeeded).toFixed(1))
            });
          }
        }
      });
    });

    if (winningSwaps.length === 0) return { dOhOccurred: false, bestSwap: null };
    winningSwaps.sort((a, b) => b.netGain - a.netGain);
    return { dOhOccurred: true, bestSwap: winningSwaps[0] };
  }

  function parsePlayersFromTableOrRows(containerEl, isExplicitBench = false) {
    if (!containerEl) return [];
    const rows = containerEl.querySelectorAll('tr');
    const players = [];

    rows.forEach(tr => {
      // Find player name link
      const nameEl = tr.querySelector('.ysf-player-name a, a.F-link, a.name, a.playernote');
      if (!nameEl) return;
      const playerName = nameEl.textContent.trim();
      if (!playerName || playerName === '(Empty)' || playerName === 'Empty') return;

      // Find slot
      const slotEl = tr.querySelector('.pos-label, td.pos, .pos, td:first-child');
      let slot = slotEl ? slotEl.textContent.trim().toUpperCase() : 'BN';
      if (slot === playerName.toUpperCase()) slot = 'BN'; // Fallback if first td was name

      // Position and NFL Team
      const posEl = tr.querySelector('.Fz-xxs, .player-pos-team, .pos-team');
      let posStr = posEl ? posEl.textContent.trim() : '';
      let nflTeam = '';
      let rawPos = slot;
      if (posStr.includes('-')) {
        const parts = posStr.split('-');
        nflTeam = parts[0].trim();
        rawPos = parts[1].trim();
      } else if (posStr) {
        rawPos = posStr.trim();
      }

      // Fantasy Points scored
      const ptsCells = [...tr.querySelectorAll('td.Ta-end, td.Ta-e, td.points, .points, td')];
      let points = 0.0;
      for (let i = ptsCells.length - 1; i >= 0; i--) {
        const txt = ptsCells[i].textContent.trim();
        if (/^-?\d+(\.\d+)?$/.test(txt)) {
          points = parseFloat(txt) || 0.0;
          break;
        }
      }

      const isBench = isExplicitBench || slot.startsWith('BN') || slot.startsWith('IR') || tr.closest('table')?.classList.contains('bench-table') || tr.closest('.bench-section') !== null;

      players.push({
        slot,
        player: playerName,
        playerName,
        position: rawPos,
        nflTeam,
        points,
        isBench
      });
    });

    return players;
  }

  function parseMatchupHTML(html, seasonYear, wk) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Strategy 1: Look for stat tables
    const statTables = [...doc.querySelectorAll('table.stat-target, table[id^="statTable"], table.Table, #matchup-detail table')];
    
    // Find Team Names from Matchup Header Bar
    const headerTeamLinks = [...doc.querySelectorAll('.ysf-matchup-header-team-name a, .team-header a.F-link, a.team-name, .matchup-header h3 a, .Ta-start a.F-link')];
    let nameA = headerTeamLinks[0]?.textContent.trim() || null;
    let nameB = headerTeamLinks[1]?.textContent.trim() || null;

    let playersA = [];
    let playersB = [];

    if (statTables.length >= 4) {
      // 4-Table Layout: [TeamA Starters, TeamA Bench, TeamB Starters, TeamB Bench]
      const startersA = parsePlayersFromTableOrRows(statTables[0], false);
      const benchA = parsePlayersFromTableOrRows(statTables[1], true);
      playersA = [...startersA, ...benchA];

      const startersB = parsePlayersFromTableOrRows(statTables[2], false);
      const benchB = parsePlayersFromTableOrRows(statTables[3], true);
      playersB = [...startersB, ...benchB];

      if (!nameA) nameA = statTables[0].querySelector('caption, th, a.F-link')?.textContent.trim();
      if (!nameB) nameB = statTables[2].querySelector('caption, th, a.F-link')?.textContent.trim();
    } else if (statTables.length === 2) {
      // 2-Table Layout: [TeamA (Starters+Bench), TeamB (Starters+Bench)]
      playersA = parsePlayersFromTableOrRows(statTables[0]);
      playersB = parsePlayersFromTableOrRows(statTables[1]);

      if (!nameA) nameA = statTables[0].querySelector('caption, th, a.F-link')?.textContent.trim();
      if (!nameB) nameB = statTables[1].querySelector('caption, th, a.F-link')?.textContent.trim();
    } else {
      // Strategy 2: Team container sections
      const teamSections = [...doc.querySelectorAll('#matchup-team-0, #matchup-team-1, .matchup-team-0, .matchup-team-1, section.team, .ysf-matchup-team')];
      if (teamSections.length >= 2) {
        playersA = parsePlayersFromTableOrRows(teamSections[0]);
        playersB = parsePlayersFromTableOrRows(teamSections[1]);
        if (!nameA) nameA = teamSections[0].querySelector('h3, .team-name, a.F-link')?.textContent.trim();
        if (!nameB) nameB = teamSections[1].querySelector('h3, .team-name, a.F-link')?.textContent.trim();
      }
    }

    if (playersA.length === 0 || playersB.length === 0) {
      return null;
    }

    nameA = (nameA || 'Team A').replace(/\s+/g, ' ').trim();
    nameB = (nameB || 'Team B').replace(/\s+/g, ' ').trim();

    const optA = computeOptimal(playersA);
    const optB = computeOptimal(playersB);

    const teamA = {
      teamName: nameA,
      ownerName: OWNER_MAP[nameA] || nameA,
      seasonYear,
      week: wk,
      ...optA,
      starters: playersA.filter(p => !p.isBench),
      bench: playersA.filter(p => p.isBench)
    };

    const teamB = {
      teamName: nameB,
      ownerName: OWNER_MAP[nameB] || nameB,
      seasonYear,
      week: wk,
      ...optB,
      starters: playersB.filter(p => !p.isBench),
      bench: playersB.filter(p => p.isBench)
    };

    teamA.isWin = teamA.actualScore > teamB.actualScore;
    teamA.isLoss = teamA.actualScore < teamB.actualScore;
    teamB.isWin = teamB.actualScore > teamA.actualScore;
    teamB.isLoss = teamB.actualScore < teamA.actualScore;

    if (teamA.isLoss) {
      const dOh = checkDOh(teamA.starters, teamA.bench, teamB.actualScore, teamA.actualScore);
      teamA.dOhOccurred = dOh.dOhOccurred;
      teamA.dOhDetails = dOh.bestSwap;
    }
    if (teamB.isLoss) {
      const dOh = checkDOh(teamB.starters, teamB.bench, teamA.actualScore, teamB.actualScore);
      teamB.dOhOccurred = dOh.dOhOccurred;
      teamB.dOhDetails = dOh.bestSwap;
    }

    return {
      seasonYear,
      week: wk,
      homeTeam: teamA,
      awayTeam: teamB,
      margin: Number(Math.abs(teamA.actualScore - teamB.actualScore).toFixed(2))
    };
  }

  async function fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(url, { headers: { 'Accept': 'text/html' } });
        if (resp.status === 999) {
          console.warn(`⏳ Yahoo rate limit (999) on ${url}. Backing off for ${1.5 * attempt}s...`);
          await sleep(1500 * attempt);
          continue;
        }
        if (resp.ok) {
          return await resp.text();
        } else {
          console.warn(`⚠️ HTTP ${resp.status} on ${url}`);
        }
      } catch (e) {
        if (attempt === maxRetries) throw e;
        await sleep(1000 * attempt);
      }
    }
    return null;
  }

  // Standalone tester for 1 matchup
  window.testYahooMatchup = async function(wk = 1, mid = 1) {
    const basePath = seasonYear >= 2026 ? `/f1/${leagueId}` : `/${seasonYear}/f1/${leagueId}`;
    const url = `${basePath}/matchup?week=${wk}&mid1=${mid}`;
    console.log(`🔍 Testing single fetch: ${url}`);
    const html = await fetchWithRetry(url);
    if (!html) {
      console.error('❌ Failed to fetch HTML.');
      return;
    }
    const result = parseMatchupHTML(html, seasonYear, wk);
    console.log('Parsed Matchup Result:', result);
    return result;
  };

  const allHarvestedMatchups = [];
  const processedMatchupKeys = new Set();

  for (let wk = startWeek; wk <= endWeek; wk++) {
    console.log(`📡 Crawling Season ${seasonYear} Week ${wk}/${endWeek}...`);
    let weekMatchupsCount = 0;

    for (let tId = 1; tId <= numTeams; tId++) {
      if (weekMatchupsCount >= (numTeams / 2)) break; // All matchups for this week collected

      try {
        const basePath = seasonYear >= 2026 ? `/f1/${leagueId}` : `/${seasonYear}/f1/${leagueId}`;
        const url = `${basePath}/matchup?week=${wk}&mid1=${tId}`;
        
        const html = await fetchWithRetry(url);
        if (!html) continue;

        const matchup = parseMatchupHTML(html, seasonYear, wk);
        if (matchup && matchup.homeTeam && matchup.awayTeam && matchup.homeTeam.teamName !== matchup.awayTeam.teamName) {
          const matchKey = `${wk}_${[matchup.homeTeam.teamName, matchup.awayTeam.teamName].sort().join('_vs_')}`;
          if (!processedMatchupKeys.has(matchKey)) {
            processedMatchupKeys.add(matchKey);
            weekMatchupsCount++;
            allHarvestedMatchups.push(matchup);
            console.log(`   ✓ Wk ${wk} Matchup (${weekMatchupsCount}/${numTeams/2}): ${matchup.homeTeam.teamName} (${matchup.homeTeam.actualScore}) vs ${matchup.awayTeam.teamName} (${matchup.awayTeam.actualScore})`);
          }
        }

        // Polite throttle to prevent 999 rate limit
        await sleep(350);
      } catch (err) {
        console.error(`❌ Error on week ${wk} team ${tId}:`, err);
        await sleep(500);
      }
    }
  }

  console.log(`%c🎉 Harvest Complete! Extracted ${allHarvestedMatchups.length} matchups for Season ${seasonYear}.`, 'color: #34d399; font-size: 16px; font-weight: bold;');
  window.__Y2K_HARVESTED_DATA = allHarvestedMatchups;

  // Render Export Modal
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:5%;left:5%;width:90%;height:90%;background:#020b05;border:3px solid #34d399;border-radius:12px;z-index:999999;padding:20px;display:flex;flex-direction:column;box-shadow:0 0 30px rgba(52,211,153,0.5);font-family:monospace;';
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:10px;color:#34d399;">
      <h2 style="margin:0;font-size:18px;">🏈 Y2K Harvest Complete: ${allHarvestedMatchups.length} Matchups Extracted (${seasonYear})</h2>
      <button id="y2k-close-btn" style="background:#dc2626;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">✕ Close</button>
    </div>
    <div style="margin-bottom:10px;display:flex;gap:10px;">
      <button id="y2k-copy-btn" style="background:#059669;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;">
        📋 COPY JSON TO CLIPBOARD
      </button>
      <button id="y2k-dl-btn" style="background:#2563eb;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;">
        💾 DOWNLOAD JSON FILE
      </button>
    </div>
    <textarea id="y2k-json-text" readonly style="flex-grow:1;background:#000;color:#6ee7b7;border:1px solid #047857;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;resize:none;">${JSON.stringify(allHarvestedMatchups, null, 2)}</textarea>
  `;

  document.body.appendChild(modal);
  document.getElementById('y2k-close-btn').onclick = () => document.body.removeChild(modal);

  const copyBtn = document.getElementById('y2k-copy-btn');
  const dlBtn = document.getElementById('y2k-dl-btn');
  const txtArea = document.getElementById('y2k-json-text');

  copyBtn.onclick = async () => {
    txtArea.select();
    try {
      await navigator.clipboard.writeText(txtArea.value);
      copyBtn.innerText = '✅ COPIED SUCCESSFULLY! Paste in chat now.';
      copyBtn.style.background = '#10b981';
    } catch (e) {
      document.execCommand('copy');
      copyBtn.innerText = '✅ COPIED VIA FALLBACK! Paste in chat now.';
      copyBtn.style.background = '#10b981';
    }
  };

  dlBtn.onclick = () => {
    const blob = new Blob([txtArea.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `y2k_${seasonYear}_matchups_lineups.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  txtArea.select();
  try {
    document.execCommand('copy');
    copyBtn.innerText = '✅ AUTO-COPIED! Ready to paste in chat.';
    copyBtn.style.background = '#10b981';
  } catch (e) {}
})();
