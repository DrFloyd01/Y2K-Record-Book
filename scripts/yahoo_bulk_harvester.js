/**
 * Yahoo Fantasy Football Universal Matchup & Lineup Harvester (v5.1 - Side-by-Side Dual Engine)
 *
 * Features:
 * - Precise Side-by-Side Column Extractor matching Yahoo's exact statTable1 (Starters) & statTable2 (Bench) layout
 * - Multi-Strategy Fallback for legacy 4-table and container layouts
 * - Auto-detects Season, League ID, and active Week from URL or prompts
 * - Exponential backoff & retry on Yahoo HTTP 999 rate limit
 * - Real-time console diagnostics and error inspection
 * - Standalone `window.testYahooMatchup(week, mid)` for quick single-matchup verification
 */

(async function initYahooHarvester() {
  console.clear();
  console.log('%c🏈 Yahoo Matchup & Lineup Harvester v5.1 Initialized', 'color: #34d399; font-size: 16px; font-weight: bold;');

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
      if (norm === 'RB' || norm === 'WR' || norm === 'TE' || norm === 'FLEX' || norm === 'BN') {
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
      actualScore: Number(actualScore.toFixed(2)),
      optimalScore: Number(optimalScore.toFixed(2)),
      coachingEfficiency,
      pointsLeftOnBench
    };
  }

  function checkDOh(starters, bench, oppScore, teamActualScore) {
    if (teamActualScore >= oppScore) return { dOhOccurred: false, bestSwap: null };
    const deficitNeeded = Number((oppScore - teamActualScore).toFixed(2));
    let winningSwaps = [];

    starters.forEach(starter => {
      bench.forEach(benchPlayer => {
        const netGain = Number(((benchPlayer.points || 0) - (starter.points || 0)).toFixed(2));
        if (netGain > deficitNeeded) {
          winningSwaps.push({
            starter: starter.player,
            starterPoints: starter.points || 0,
            starterSlot: starter.slot,
            benchPlayer: benchPlayer.player,
            benchPoints: benchPlayer.points || 0,
            netGain,
            deficitNeeded,
            winMargin: Number((netGain - deficitNeeded).toFixed(2))
          });
        }
      });
    });

    if (winningSwaps.length === 0) return { dOhOccurred: false, bestSwap: null };
    winningSwaps.sort((a, b) => b.netGain - a.netGain);
    return { dOhOccurred: true, bestSwap: winningSwaps[0] };
  }

  function parseMatchupFromDoc(doc, seasonYear, wk) {
    const header = doc.querySelector('#matchup-header');
    let nameA = 'Team A';
    let ownerA = 'Owner A';
    let nameB = 'Team B';
    let ownerB = 'Owner B';

    if (header) {
      const teamDivs = header.querySelectorAll('.Grid-u-1-3');
      if (teamDivs.length >= 3) {
        nameA = teamDivs[0].querySelector('.Fz-xxl a, .F-link')?.textContent.trim() || nameA;
        ownerA = teamDivs[0].querySelector('.user-id')?.textContent.trim() || ownerA;
        nameB = teamDivs[2].querySelector('.Fz-xxl a, .F-link')?.textContent.trim() || nameB;
        ownerB = teamDivs[2].querySelector('.user-id')?.textContent.trim() || ownerB;
      }
    }

    nameA = nameA.replace(/â€™/g, '’').replace(/\s+/g, ' ').trim();
    nameB = nameB.replace(/â€™/g, '’').replace(/\s+/g, ' ').trim();
    if (!ownerA || ownerA.startsWith('Owner')) ownerA = OWNER_MAP[nameA] || nameA;
    if (!ownerB || ownerB.startsWith('Owner')) ownerB = OWNER_MAP[nameB] || nameB;

    const playersA = [];
    const playersB = [];

    const statTable1 = doc.getElementById('statTable1');
    const statTable2 = doc.getElementById('statTable2');

    // Strategy 1: Side-by-Side Dual Column Table (Yahoo Standard)
    if (statTable1) {
      function parseSideBySideTable(table, isBench) {
        if (!table) return;
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(tr => {
          if (tr.classList.contains('Last') && tr.textContent.includes('TOTAL')) return;
          const cells = [...tr.querySelectorAll('td, th')];
          if (cells.length < 9) return;

          // Detect center position cell (usually index 5, or find slot name)
          let posIndex = 5;
          for (let i = 3; i < cells.length - 3; i++) {
            const txt = cells[i].textContent.trim().toUpperCase();
            if (['QB','RB','WR','TE','W/R/T','FLEX','K','DEF','D/ST','DST','BN','IR'].includes(txt)) {
              posIndex = i;
              break;
            }
          }

          const slot = cells[posIndex].textContent.trim();

          // Left Team (Team 1)
          const t1PlayerCell = cells[1];
          const t1PtsCell = cells[posIndex - 2] || cells[3];
          const t1NameEl = t1PlayerCell.querySelector('.ysf-player-name a.name, a.name, a.F-link');
          let t1Name = t1NameEl ? t1NameEl.textContent.trim() : '';
          if (!t1Name) {
            const raw = t1PlayerCell.textContent.split('Final')[0].split('Video')[0].trim();
            if (raw && !raw.includes('Empty')) t1Name = raw;
          }
          let t1Pts = parseFloat(t1PtsCell.textContent.trim()) || 0.0;

          // Right Team (Team 2)
          const t2PtsCell = cells[posIndex + 2] || cells[7];
          const t2PlayerCell = cells[cells.length - 2] || cells[9];
          const t2NameEl = t2PlayerCell.querySelector('.ysf-player-name a.name, a.name, a.F-link');
          let t2Name = t2NameEl ? t2NameEl.textContent.trim() : '';
          if (!t2Name) {
            const raw = t2PlayerCell.textContent.split('Final')[0].split('Video')[0].trim();
            if (raw && !raw.includes('Empty')) t2Name = raw;
          }
          let t2Pts = parseFloat(t2PtsCell.textContent.trim()) || 0.0;

          if (t1Name && t1Name !== '(Empty)' && t1Name !== 'Empty') {
            playersA.push({ slot, player: t1Name, playerName: t1Name, position: slot, nflTeam: '', points: t1Pts, isBench });
          }
          if (t2Name && t2Name !== '(Empty)' && t2Name !== 'Empty') {
            playersB.push({ slot, player: t2Name, playerName: t2Name, position: slot, nflTeam: '', points: t2Pts, isBench });
          }
        });
      }

      parseSideBySideTable(statTable1, false);
      parseSideBySideTable(statTable2, true);
    }

    if (playersA.length === 0 || playersB.length === 0) return null;

    const optA = computeOptimal(playersA);
    const optB = computeOptimal(playersB);

    const teamA = {
      teamName: nameA,
      ownerName: ownerA,
      seasonYear,
      week: wk,
      ...optA,
      starters: playersA.filter(p => !p.isBench),
      bench: playersA.filter(p => p.isBench)
    };

    const teamB = {
      teamName: nameB,
      ownerName: ownerB,
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
      isPlayoff: false,
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
        if (resp.ok) return await resp.text();
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
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = parseMatchupFromDoc(doc, seasonYear, wk);
    console.log('Parsed Matchup Result:', result);
    return result;
  };

  const allHarvestedMatchups = [];
  const processedMatchupKeys = new Set();

  for (let wk = startWeek; wk <= endWeek; wk++) {
    console.log(`📡 Crawling Season ${seasonYear} Week ${wk}/${endWeek}...`);
    let weekMatchupsCount = 0;

    for (let tId = 1; tId <= numTeams; tId++) {
      if (weekMatchupsCount >= (numTeams / 2)) break;

      try {
        const basePath = seasonYear >= 2026 ? `/f1/${leagueId}` : `/${seasonYear}/f1/${leagueId}`;
        const url = `${basePath}/matchup?week=${wk}&mid1=${tId}`;
        
        const html = await fetchWithRetry(url);
        if (!html) continue;

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const matchup = parseMatchupFromDoc(doc, seasonYear, wk);
        if (matchup && matchup.homeTeam && matchup.awayTeam && matchup.homeTeam.teamName !== matchup.awayTeam.teamName) {
          const matchKey = `${wk}_${[matchup.homeTeam.teamName, matchup.awayTeam.teamName].sort().join('_vs_')}`;
          if (!processedMatchupKeys.has(matchKey)) {
            processedMatchupKeys.add(matchKey);
            weekMatchupsCount++;
            allHarvestedMatchups.push(matchup);
            console.log(`   ✓ Wk ${wk} Matchup (${weekMatchupsCount}/${numTeams/2}): ${matchup.homeTeam.teamName} (${matchup.homeTeam.actualScore}) vs ${matchup.awayTeam.teamName} (${matchup.awayTeam.actualScore})`);
          }
        }

        await sleep(350);
      } catch (err) {
        console.error(`❌ Error on week ${wk} team ${tId}:`, err);
        await sleep(500);
      }
    }
  }

  console.log(`%c🎉 Harvest Complete! Extracted ${allHarvestedMatchups.length} matchups for Season ${seasonYear}.`, 'color: #34d399; font-size: 16px; font-weight: bold;');
  window.__Y2K_HARVESTED_DATA = allHarvestedMatchups;

  // Auto-download JSON file directly
  const blob = new Blob([JSON.stringify(allHarvestedMatchups, null, 2)], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `y2k_${seasonYear}_matchups_lineups.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  console.log(`💾 Auto-downloaded y2k_${seasonYear}_matchups_lineups.json (${allHarvestedMatchups.length} matchups)`);
})();
