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

  // Pre-configured historical metadata for Y2K League
  const SEASON_CONFIG = {
    2025: { leagueId: '97974', teams: 10, startWeek: 1, endWeek: 17, wrCount: 3 },
    2024: { leagueId: '141011', teams: 10, startWeek: 1, endWeek: 17, wrCount: 3 },
    2023: { leagueId: '96417', teams: 12, startWeek: 1, endWeek: 17, wrCount: 3 },
    2022: { leagueId: '172828', teams: 10, startWeek: 1, endWeek: 17, wrCount: 3 },
    2021: { leagueId: '213942', teams: 8, startWeek: 1, endWeek: 17, wrCount: 3 },
    2020: { leagueId: '183921', teams: 6, startWeek: 1, endWeek: 16, wrCount: 2 },
    2019: { leagueId: '201948', teams: 6, startWeek: 1, endWeek: 16, wrCount: 3 },
    2018: { leagueId: '102941', teams: 6, startWeek: 1, endWeek: 16, wrCount: 3 }
  };

  // Extract league metadata from URL if available
  const path = window.location.pathname;
  const urlMatch = path.match(/(?:(?:(\d{4})\/)?f1\/(\d+))/);
  const detectedYear = urlMatch && urlMatch[1] ? parseInt(urlMatch[1], 10) : 2024;

  const inputYear = prompt('Enter Season Year (2018-2025):', detectedYear);
  if (!inputYear) {
    console.log('❌ Harvester cancelled.');
    return;
  }
  const seasonYear = parseInt(inputYear, 10);
  const cfg = SEASON_CONFIG[seasonYear] || {};

  const detectedLeagueId = urlMatch && urlMatch[2] ? urlMatch[2] : (cfg.leagueId || '141011');
  const leagueId = cfg.leagueId || detectedLeagueId;
  const startWeekPrompt = prompt(`Enter START Week (1 to ${cfg.endWeek || 17}) to crawl or resume from:`, 1);
  const startWeek = parseInt(startWeekPrompt || '1', 10);
  const endWeek = cfg.endWeek || (seasonYear >= 2021 ? 17 : 16);
  const numTeams = cfg.teams || 10;

  console.log(`%c🚀 Target Configured: Season ${seasonYear} | League ID: ${leagueId} | ${numTeams} Teams | Weeks ${startWeek}-${endWeek}`, 'color: #38bdf8; font-weight: bold;');

  // Canonical Team to Owner Mapping across all seasons (2018-2025)
  const OWNER_MAP = {
    'Globo Gym': 'Dylan', 'The Dawn of Man-Ape': 'Dylan', 'Zaza Zealots': 'Dylan', '#BrainTrauma': 'Dylan', '#2020BrainTrauma': 'Dylan', 'Hood Phenomenons': 'Dylan', 'The Waterboys': 'Dylan',
    'Ho Chi Win City': 'Phillip', 'Bak2Bak': 'Phillip', 'Show Me Dem TDS': 'Phillip', 'TDS': 'Phillip',
    'Jelqaida': 'Mike', 'Team Chaos': 'Mike', 'Justin Time': 'Mike', 'Ouchie': 'Mike', 'Pacific Islanders': 'Mike', "Matt's Team": 'Mike', 'Ronny Man': 'Mike', 'RonnyMan2': 'Mike',
    'AARPFL': 'Casey', 'Skibidi Football': 'Casey', 'Awesome Baller-Winners': 'Casey', 'The Mr. Unlimited’s': 'Casey', 'Just pain': 'Casey', 'CUBA': 'Casey', 'FUNdamentals': 'Casey', 'Good football team!!': 'Casey',
    'Gl Hf (you’re gay)': 'Trace', "Gl Hf (you're gay)": 'Trace', "I'm gonna win you're gay": 'Trace', 'Poopy Butt': 'Trace', '#1 CumBoy': 'Trace', "Trace's Team": 'Trace',
    'Darnold Schwarzenegger': 'Alex',
    'Donkey Squad': 'Ryan', 'Bad team not good at football': 'Ryan', 'Old Leech': 'Ryan', 'Trilobite Terror': 'Ryan', 'Rats!': 'Ryan', 'LIBYA rip Gaddafi': 'Ryan', 'The Janissaries': 'Ryan', 'The Mamluks': 'Ryan', 'The Mongol Horde': 'Ryan',
    'Aaron codger': 'Boaz', 'No I’m gonna win UR gay': 'Boaz',
    'Dusty’s Dingleberries': 'Dustin', "Dusty's Dingleberries": 'Dustin', 'Dusty Dynasty 🏆': 'Dustin', 'Let’s Ride 😤': 'Dustin', '#MOONGANG 🚀🌚': 'Dustin',
    'Trenches cooper': 'Cooper', 'coop’s shit': 'Cooper',
    'Tess Finesse': 'Tess',
    "Blue's Balls": 'Jasper', 'Blue’s Balls': 'Jasper',
    'Can I Hit Your Vape?': 'Torin',
    "nick's Great Team": 'Nick'
  };

  const constraints = {
    QB: 1, RB: 2, WR: (cfg.wrCount || (seasonYear === 2020 ? 2 : 3)), TE: 1, FLEX: 1, K: 1, DEF: 1
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
    const pos = slotOrPos.toUpperCase().trim();
    if (pos.includes('QB')) return 'QB';
    if (pos.includes('RB')) return 'RB';
    if (pos.includes('WR')) return 'WR';
    if (pos.includes('TE')) return 'TE';
    if (pos.includes('K') || pos.includes('PK')) return 'K';
    if (pos.includes('DEF') || pos.includes('DST')) return 'DEF';
    if (pos.includes('FLEX') || pos.includes('W/R') || pos.includes('W/T')) return 'FLEX';
    return 'BN';
  }

  function computeOptimal(allPlayers) {
    let actualStarters = allPlayers.filter(p => !p.isBench);
    let actualScore = actualStarters.reduce((sum, p) => sum + (p.points || 0), 0);

    let allAvailable = [...allPlayers].sort((a, b) => (b.points || 0) - (a.points || 0));
    let optStarters = [];

    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    positions.forEach(pos => {
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
    const header = doc.querySelector('#matchup-header, .matchup-header, #matchup-detail, .ysf-matchup-header');
    let nameA = 'Team A';
    let ownerA = 'Owner A';
    let nameB = 'Team B';
    let ownerB = 'Owner B';

    if (header) {
      const teamDivs = header.querySelectorAll('.Grid-u-1-3, .team-header');
      if (teamDivs.length >= 2) {
        nameA = teamDivs[0].querySelector('.Fz-xxl a, .F-link, a.name')?.textContent.trim() || nameA;
        ownerA = teamDivs[0].querySelector('.user-id, .owner-name')?.textContent.trim() || ownerA;
        const lastDiv = teamDivs[teamDivs.length - 1];
        nameB = lastDiv.querySelector('.Fz-xxl a, .F-link, a.name')?.textContent.trim() || nameB;
        ownerB = lastDiv.querySelector('.user-id, .owner-name')?.textContent.trim() || ownerB;
      }
    }

    nameA = nameA.replace(/â€™/g, '’').replace(/\s+/g, ' ').trim();
    nameB = nameB.replace(/â€™/g, '’').replace(/\s+/g, ' ').trim();
    if (!ownerA || ownerA.startsWith('Owner')) ownerA = OWNER_MAP[nameA] || nameA;
    if (!ownerB || ownerB.startsWith('Owner')) ownerB = OWNER_MAP[nameB] || nameB;

    const statTables = [...doc.querySelectorAll('#statTable1, #statTable2, table.stat-target, table[id*="statTable"], table.team-roster, #matchup-detail table')];
    const tableStarters = doc.getElementById('statTable1') || statTables[0];
    const tableBench = doc.getElementById('statTable2') || statTables[1];

    const s = parseYahooTables(tableStarters, false);
    const b = parseYahooTables(tableBench, true);

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

  async function fetchWithRetry(url, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(url, { headers: { 'Accept': 'text/html' } });
        if (resp.status === 999) {
          const pauseSec = 15 * attempt;
          console.warn(`⏳ Yahoo 999 Bot Limit hit on ${url}. Pausing politely for ${pauseSec}s before retry ${attempt}/${maxRetries}...`);
          await sleep(pauseSec * 1000);
          continue;
        }
        if (resp.ok) return await resp.text();
      } catch (e) {
        if (attempt === maxRetries) throw e;
        await sleep(2000 * attempt);
      }
    }
    return null;
  }

  // Helper to sync harvested data directly to local development server on disk
  async function streamToLocalDisk(matchups) {
    try {
      const res = await fetch('http://localhost:5173/api/save-lineups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonYear, matchups })
      });
      if (res.ok) {
        console.log(`💾 Auto-saved ${matchups.length} matchups directly to local repository disk!`);
      }
    } catch {
      // Local server might not be running or CORS blocked; fallback to on-screen download
    }
  }

  window.__STOP_Y2K_CRAWLER = false;

  // Mount floating active crawler control immediately
  const existingActiveBox = document.getElementById('y2k-harvester-modal');
  if (existingActiveBox) existingActiveBox.remove();

  const controlBox = document.createElement('div');
  controlBox.id = 'y2k-harvester-modal';
  controlBox.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; background: #0f172a; color: #f8fafc; border: 2px solid #38bdf8; border-radius: 12px; padding: 14px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7); font-family: ui-monospace, monospace; max-width: 320px;';
  controlBox.innerHTML = `
    <div style="font-weight: 900; color: #38bdf8; font-size: 13px; margin-bottom: 4px;">📡 Y2K CRAWLER ACTIVE (${seasonYear})</div>
    <div id="y2k-crawler-status" style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">Starting Week ${startWeek}...</div>
    <button id="y2k-stop-btn" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; width: 100%;">🛑 Stop Crawler (Keep Harvested Data)</button>
  `;
  document.body.appendChild(controlBox);

  document.getElementById('y2k-stop-btn').addEventListener('click', () => {
    window.__STOP_Y2K_CRAWLER = true;
    const statusEl = document.getElementById('y2k-crawler-status');
    if (statusEl) statusEl.textContent = 'Stopping crawler... saving data...';
  });

  const allHarvestedMatchups = [];
  const processedMatchupKeys = new Set();

  for (let wk = startWeek; wk <= endWeek; wk++) {
    if (window.__STOP_Y2K_CRAWLER) {
      console.log('🛑 Crawler stopped by user.');
      break;
    }

    console.log(`📡 Crawling Season ${seasonYear} Week ${wk}/${endWeek}...`);
    const statusEl = document.getElementById('y2k-crawler-status');
    if (statusEl) statusEl.textContent = `Crawling Week ${wk}/${endWeek} (${allHarvestedMatchups.length} matchups saved)...`;

    let weekMatchupsCount = 0;

    for (let tId = 1; tId <= numTeams; tId++) {
      if (window.__STOP_Y2K_CRAWLER) break;
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

        // Polite randomized throttling (650ms - 1100ms) to avoid Yahoo 999 triggers
        await sleep(650 + Math.floor(Math.random() * 450));
      } catch (err) {
        console.error(`❌ Error on week ${wk} team ${tId}:`, err);
        await sleep(1500);
      }
    }

    // Stream save to local disk after every completed week!
    await streamToLocalDisk(allHarvestedMatchups);
  }

  console.log(`%c🎉 Harvest Finished! Extracted ${allHarvestedMatchups.length} matchups for Season ${seasonYear}.`, 'color: #34d399; font-size: 16px; font-weight: bold;');
  window.__Y2K_HARVESTED_DATA = allHarvestedMatchups;

  // Final sync to disk
  await streamToLocalDisk(allHarvestedMatchups);

  // Render on-page interactive floating modal
  controlBox.innerHTML = `
    <div style="font-weight: 900; color: #34d399; font-size: 14px; margin-bottom: 6px;">🏈 Y2K HARVEST FINISHED (${seasonYear})</div>
    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Extracted ${allHarvestedMatchups.length} total matchups (Weeks ${startWeek}-${endWeek}).</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button id="y2k-dl-btn" style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">📥 Download ${seasonYear} JSON File</button>
      <div style="display: flex; gap: 6px;">
        <button id="y2k-copy-part1" style="flex: 1; background: #334155; color: #cbd5e1; border: 1px solid #475569; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 11px;">📋 Copy W1-8</button>
        <button id="y2k-copy-part2" style="flex: 1; background: #334155; color: #cbd5e1; border: 1px solid #475569; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 11px;">📋 Copy W9-17</button>
      </div>
      <button id="y2k-close-btn" style="background: transparent; color: #64748b; border: none; font-size: 11px; cursor: pointer; margin-top: 4px;">Close</button>
    </div>
  `;

  document.getElementById('y2k-dl-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(allHarvestedMatchups, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `y2k_${seasonYear}_matchups_lineups.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  });

  document.getElementById('y2k-copy-part1').addEventListener('click', async (e) => {
    const p1 = allHarvestedMatchups.filter(m => m.week <= 8);
    await navigator.clipboard.writeText(JSON.stringify(p1, null, 2));
    e.target.textContent = '✅ Copied W1-8!';
    setTimeout(() => e.target.textContent = '📋 Copy W1-8', 2000);
  });

  document.getElementById('y2k-copy-part2').addEventListener('click', async (e) => {
    const p2 = allHarvestedMatchups.filter(m => m.week > 8);
    await navigator.clipboard.writeText(JSON.stringify(p2, null, 2));
    e.target.textContent = '✅ Copied W9-17!';
    setTimeout(() => e.target.textContent = '📋 Copy W9-17', 2000);
  });

  document.getElementById('y2k-close-btn').addEventListener('click', () => modal.remove());
})();
