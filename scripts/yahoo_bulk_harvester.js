/**
 * Yahoo Fantasy Football Universal Matchup & Lineup Harvester (v5.3 - Position-Accurate Engine)
 *
 * Features:
 * - Dynamic <thead> header detector for exact column index mapping (t1Player, t1Pts, pos, t2Pts, t2Player)
 * - Automatic Position Resolver (inferred from player names, team names, and stat breakdown keywords)
 * - Strict Positional Eligibility for D'Oh! Blunder Detection (e.g. only WR/RB/TE for FLEX; same pos for specific slots)
 * - Exponential backoff & retry for polite 350ms throttling
 * - 1-Click Clipboard Copy & direct JSON download
 */

(async function initYahooHarvester() {
  console.clear();
  console.log('%c🏈 Yahoo Matchup & Lineup Harvester v5.3 Initialized', 'color: #34d399; font-size: 16px; font-weight: bold;');

  // Extract league metadata from URL
  const path = window.location.pathname;
  const urlMatch = path.match(/(?:(?:(\d{4})\/)?f1\/(\d+))/);
  const detectedYear = urlMatch && urlMatch[1] ? parseInt(urlMatch[1], 10) : (new Date().getFullYear());
  const detectedLeagueId = urlMatch && urlMatch[2] ? urlMatch[2] : '97974';

  const seasonYear = parseInt(prompt('Enter Season Year (e.g. 2025, 2024, 2020):', detectedYear) || detectedYear, 10);
  const leagueId = prompt('Enter Yahoo League ID:', detectedLeagueId) || detectedLeagueId;
  const startWeek = parseInt(prompt('Enter START Week (e.g. 1):', 1) || 1, 10);
  const endWeek = parseInt(prompt('Enter END Week (e.g. 17 or 16):', seasonYear >= 2021 ? 17 : 16) || 17, 10);
  const numTeams = parseInt(prompt('Enter Number of Teams (e.g. 10 or 12):', seasonYear === 2025 ? 10 : 12) || 10, 10);

  // Canonical Team to Owner Mapping
  const OWNER_MAP = {
    'Globo Gym': 'Dylan', 'Ho Chi Win City': 'Phillip', 'Jelqaida': 'Mike', 'AARPFL': 'Casey',
    'Gl Hf (you’re gay)': 'Trace', "Gl Hf (you're gay)": 'Trace', 'Darnold Schwarzenegger': 'Alex',
    'Donkey Squad': 'Ryan', 'Aaron codger': 'Boaz', 'Dusty’s Dingleberries': 'Dustin',
    "Dusty's Dingleberries": 'Dustin', 'Trenches cooper': 'Cooper', 'Tess Finesse': 'Tess',
    "Blue's Balls": 'Jasper', 'Blue’s Balls': 'Jasper', 'The Dawn of Man-Ape': 'Dylan', 'TDS': 'Phillip',
    'Bad team not good at football': 'Ryan'
  };

  const constraints = {
    QB: 1, RB: 2, WR: (seasonYear === 2020 ? 2 : 3), TE: 1, FLEX: 1, K: 1, DEF: 1
  };

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Common NFL Defense Names
  const DEF_TEAMS = new Set([
    '49ers', 'Bears', 'Bengals', 'Bills', 'Broncos', 'Browns', 'Buccaneers', 'Cardinals',
    'Chargers', 'Chiefs', 'Colts', 'Commanders', 'Cowboys', 'Dolphins', 'Eagles', 'Falcons',
    'Giants', 'Jaguars', 'Jets', 'Lions', 'Packers', 'Panthers', 'Patriots', 'Raiders',
    'Rams', 'Ravens', 'Saints', 'Seahawks', 'Steelers', 'Texans', 'Titans', 'Vikings'
  ]);

  // Player Position Lookup Dictionary
  const PLAYER_POS_DB = {
    // Top QBs
    'Josh Allen': 'QB', 'Patrick Mahomes': 'QB', 'Lamar Jackson': 'QB', 'Jalen Hurts': 'QB',
    'Joe Burrow': 'QB', 'Caleb Williams': 'QB', 'Baker Mayfield': 'QB', 'Jayden Daniels': 'QB',
    'Kyler Murray': 'QB', 'Justin Herbert': 'QB', 'Dak Prescott': 'QB', 'Brock Purdy': 'QB',
    'Jordan Love': 'QB', 'Jared Goff': 'QB', 'Drake Maye': 'QB', 'Justin Fields': 'QB',
    'Bo Nix': 'QB', 'Michael Penix Jr.': 'QB', 'Matthew Stafford': 'QB', 'Daniel Jones': 'QB',
    'Jaxson Dart': 'QB', 'C.J. Stroud': 'QB', 'Trevor Lawrence': 'QB', 'Kirk Cousins': 'QB',
    'Geno Smith': 'QB', 'Aaron Rodgers': 'QB', 'Tua Tagovailoa': 'QB', 'Russell Wilson': 'QB',

    // Top TEs
    'T.J. Hockenson': 'TE', 'George Kittle': 'TE', 'Travis Kelce': 'TE', 'Trey McBride': 'TE',
    'Sam LaPorta': 'TE', 'Brock Bowers': 'TE', 'Mark Andrews': 'TE', 'David Njoku': 'TE',
    'Dalton Kincaid': 'TE', 'Kyle Pitts Sr.': 'TE', 'Kyle Pitts': 'TE', 'Tyler Warren': 'TE',
    'Evan Engram': 'TE', 'Jake Ferguson': 'TE', 'Tucker Kraft': 'TE', 'Dallas Goedert': 'TE',
    'Colston Loveland': 'TE', 'Hunter Henry': 'TE', 'Dalton Schultz': 'TE', 'Zach Ertz': 'TE',
    'Cade Otton': 'TE', 'Juwan Johnson': 'TE', 'Isaiah Likely': 'TE', 'Cole Kmet': 'TE',
    'Jonnu Smith': 'TE', 'Pat Freiermuth': 'TE', 'Chigoziem Okonkwo': 'TE',

    // Top Ks
    'Matt Gay': 'K', 'Brandon Aubrey': 'K', 'Chris Boswell': 'K', 'Younghoe Koo': 'K',
    'Chase McLaughlin': 'K', 'Cameron Dicker': 'K', 'Wil Lutz': 'K', 'Evan McPherson': 'K',
    'Jake Bates': 'K', 'Ka\'imi Fairbairn': 'K', 'Harrison Butker': 'K', 'Justin Tucker': 'K',
    'Jake Moody': 'K', 'Tyler Loop': 'K', 'Matt Prater': 'K', 'Zane Gonzalez': 'K',
    'Jason Myers': 'K', 'Dustin Hopkins': 'K', 'Blake Grupe': 'K', 'Cairo Santos': 'K'
  };

  function resolvePlayerPosition(name, slot, statSnippet = '') {
    if (!name) return 'BN';
    const trimmed = name.trim();

    if (PLAYER_POS_DB[trimmed]) return PLAYER_POS_DB[trimmed];
    if (DEF_TEAMS.has(trimmed) || trimmed.includes('DEF') || slot === 'DEF') return 'DEF';
    if (slot === 'QB' || slot === 'K' || slot === 'DEF') return slot;

    // Stat text clues
    if (statSnippet.includes('Pass Yds') || statSnippet.includes('Pass TD')) return 'QB';
    if (statSnippet.includes('FG Yds') || statSnippet.includes('PAT')) return 'K';
    if (statSnippet.includes('Sack') || statSnippet.includes('Int') || statSnippet.includes('Pts Allow')) return 'DEF';

    if (slot === 'WR' || slot === 'RB' || slot === 'TE') return slot;
    return 'FLEX'; // Default eligible flex position
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

    // Count starter positions
    const starterPosCounts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
    starters.forEach(s => {
      const p = normalizePosition(s.position);
      if (starterPosCounts[p] !== undefined) starterPosCounts[p]++;
    });

    const minRequired = {
      QB: constraints.QB || 1,
      RB: constraints.RB || 2,
      WR: constraints.WR || 3,
      TE: constraints.TE || 1,
      K: constraints.K || 1,
      DEF: constraints.DEF || 1
    };

    bench.forEach(benchPlayer => {
      const bPos = normalizePosition(benchPlayer.position);
      const bPts = Number(benchPlayer.points || 0);

      starters.forEach(starter => {
        const sPos = normalizePosition(starter.position);
        const sPts = Number(starter.points || 0);

        let isEligible = false;

        if (sPos === bPos) {
          isEligible = true;
        } else if (['RB', 'WR', 'TE'].includes(sPos) && ['RB', 'WR', 'TE'].includes(bPos)) {
          const remainingAfterDrop = (starterPosCounts[sPos] || 0) - 1;
          const minNeed = minRequired[sPos] || 0;
          if (remainingAfterDrop >= minNeed) {
            isEligible = true;
          }
        }

        if (isEligible) {
          const netGain = Number((bPts - sPts).toFixed(2));
          if (netGain > deficitNeeded) {
            winningSwaps.push({
              starter: starter.player,
              starterPoints: sPts,
              starterSlot: starter.slot,
              starterPosition: sPos,
              benchPlayer: benchPlayer.player,
              benchPoints: bPts,
              benchPosition: bPos,
              netGain,
              deficitNeeded,
              winMargin: Number((netGain - deficitNeeded).toFixed(2))
            });
          }
        }
      });
    });

    if (winningSwaps.length === 0) return { dOhOccurred: false, bestSwap: null };
    winningSwaps.sort((a, b) => b.netGain - a.netGain);
    return { dOhOccurred: true, bestSwap: winningSwaps[0] };
  }

  function parseYahooTables(table, isBench) {
    if (!table) return { playersA: [], playersB: [] };
    const theadThs = [...table.querySelectorAll('thead th')];
    
    let t1PlayerCol = 1;
    let t1PtsCol = 3;
    let posCol = 5;
    let t2PtsCol = 7;
    let t2PlayerCol = 9;

    let fanPtsCols = [];
    let playerCols = [];
    theadThs.forEach((th, idx) => {
      const title = (th.title || '').toLowerCase();
      const text = th.textContent.toLowerCase().trim();
      if (title.includes('fantasy points') || text === 'fan pts') {
        fanPtsCols.push(idx);
      }
      if (text === 'player') {
        playerCols.push(idx);
      }
      if ((th.className.includes('Ta-c') || th.className.includes('Bdrstart')) && text.includes('pos')) {
        posCol = idx;
      }
    });

    if (fanPtsCols.length >= 2) {
      t1PtsCol = fanPtsCols[0];
      t2PtsCol = fanPtsCols[1];
    }
    if (playerCols.length >= 2) {
      t1PlayerCol = playerCols[0];
      t2PlayerCol = playerCols[1];
    }

    const playersA = [];
    const playersB = [];

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      if (tr.classList.contains('Last') && tr.textContent.includes('TOTAL')) return;
      const cells = [...tr.querySelectorAll('td, th')];
      if (cells.length <= Math.max(t1PlayerCol, t1PtsCol, posCol, t2PtsCol, t2PlayerCol)) return;

      const slot = cells[posCol].textContent.trim();

      // Team 1 (Left)
      const t1Cell = cells[t1PlayerCol];
      const t1NameEl = t1Cell.querySelector('.ysf-player-name a.name, a.name, a.F-link');
      let t1Name = t1NameEl ? t1NameEl.textContent.trim() : '';
      if (!t1Name) {
        const raw = t1Cell.textContent.split('Final')[0].split('Video')[0].trim();
        if (raw && !raw.includes('Empty')) t1Name = raw;
      }
      let t1Pts = parseFloat(cells[t1PtsCol].textContent.trim()) || 0.0;
      let t1Pos = resolvePlayerPosition(t1Name, slot, cells[0]?.textContent || '');

      // Team 2 (Right)
      const t2Cell = cells[t2PlayerCol];
      const t2NameEl = t2Cell.querySelector('.ysf-player-name a.name, a.name, a.F-link');
      let t2Name = t2NameEl ? t2NameEl.textContent.trim() : '';
      if (!t2Name) {
        const raw = t2Cell.textContent.split('Final')[0].split('Video')[0].trim();
        if (raw && !raw.includes('Empty')) t2Name = raw;
      }
      let t2Pts = parseFloat(cells[t2PtsCol].textContent.trim()) || 0.0;
      let t2Pos = resolvePlayerPosition(t2Name, slot, cells[cells.length - 1]?.textContent || '');

      if (t1Name && t1Name !== '(Empty)' && t1Name !== 'Empty') {
        playersA.push({ slot, player: t1Name, playerName: t1Name, position: t1Pos, nflTeam: '', points: t1Pts, isBench });
      }
      if (t2Name && t2Name !== '(Empty)' && t2Name !== 'Empty') {
        playersB.push({ slot, player: t2Name, playerName: t2Name, position: t2Pos, nflTeam: '', points: t2Pts, isBench });
      }
    });

    return { playersA, playersB };
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

    const s = parseYahooTables(doc.getElementById('statTable1'), false);
    const b = parseYahooTables(doc.getElementById('statTable2'), true);

    const playersA = [...s.playersA, ...b.playersA];
    const playersB = [...s.playersB, ...b.playersB];

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

  // Auto-copy to clipboard
  try {
    const jsonStr = JSON.stringify(allHarvestedMatchups, null, 2);
    await navigator.clipboard.writeText(jsonStr);
    console.log('📋 JSON auto-copied to clipboard!');
  } catch (e) {
    console.log('💡 Type copy(__Y2K_HARVESTED_DATA) in console if needed.');
  }

  // Auto-download JSON file
  try {
    const blob = new Blob([JSON.stringify(allHarvestedMatchups, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `y2k_${seasonYear}_matchups_lineups.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (e) {}
})();
