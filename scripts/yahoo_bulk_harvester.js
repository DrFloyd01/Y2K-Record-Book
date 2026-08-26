/**
 * Yahoo Fantasy Football Browser Console Bulk Matchup Harvester (v2.0 - Multi-Table Matchup Aware)
 *
 * Correctly pairs Starters (Table 1) + Bench (Table 2) for Team A,
 * and Starters (Table 3) + Bench (Table 4) for Team B.
 */

(async function harvestAllYahooLineups() {
  console.clear();
  console.log('%c🏈 Y2K Automated Historical Lineup Harvester Starting...', 'color: #34d399; font-size: 16px; font-weight: bold;');

  const urlMatch = window.location.pathname.match(/(?:(?:(\d{4})\/)?f1\/(\d+))/);
  const detectedYear = urlMatch && urlMatch[1] ? parseInt(urlMatch[1], 10) : 2025;
  const leagueId = urlMatch && urlMatch[2] ? urlMatch[2] : '97974';

  const seasonYear = parseInt(prompt('Enter Season Year to Harvest (e.g. 2025, 2024, 2023):', detectedYear) || detectedYear, 10);
  const totalWeeks = parseInt(prompt('Enter Total Weeks in Season (e.g. 17 or 16):', seasonYear >= 2021 ? 17 : 16) || 17, 10);

  const teamOwnerMap = {
    'Globo Gym': 'Dylan', 'Ho Chi Win City': 'Phillip', 'Jelqaida': 'Mike', 'AARPFL': 'Casey',
    'Gl Hf (you’re gay)': 'Trace', "Gl Hf (you're gay)": 'Trace', 'Darnold Schwarzenegger': 'Alex',
    'Donkey Squad': 'Ryan', 'Aaron codger': 'Boaz', 'Dusty’s Dingleberries': 'Dustin',
    "Dusty's Dingleberries": 'Dustin', 'Trenches cooper': 'Cooper', 'Tess Finesse': 'Tess',
    "Blue's Balls": 'Jasper', 'Blue’s Balls': 'Jasper', 'The Dawn of Man-Ape': 'Dylan', 'TDS': 'Phillip'
  };

  const constraints = {
    QB: 1,
    RB: 2,
    WR: (seasonYear === 2020 ? 2 : 3),
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1
  };

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
            const winMargin = Number((netGain - deficitNeeded).toFixed(1));
            winningSwaps.push({
              starter: starter.player,
              starterPoints: starter.points || 0,
              starterSlot: starter.slot,
              benchPlayer: benchPlayer.player,
              benchPoints: benchPlayer.points || 0,
              netGain,
              deficitNeeded,
              winMargin
            });
          }
        }
      });
    });

    if (winningSwaps.length === 0) return { dOhOccurred: false, bestSwap: null };
    winningSwaps.sort((a, b) => b.netGain - a.netGain);
    return { dOhOccurred: true, bestSwap: winningSwaps[0] };
  }

  function parsePlayersFromTable(table, isBenchOverride = false) {
    const players = [];
    if (!table) return players;

    table.querySelectorAll('tr').forEach(tr => {
      const nameEl = tr.querySelector('.ysf-player-name a, a.F-link');
      if (!nameEl) return;
      const playerName = nameEl.textContent.trim();
      if (!playerName || playerName === '(Empty)') return;

      const slotEl = tr.querySelector('.pos-label, td.pos');
      const slot = slotEl ? slotEl.textContent.trim().toUpperCase() : (isBenchOverride ? 'BN' : 'FLEX');

      const posEl = tr.querySelector('.Fz-xxs');
      const posStr = posEl ? posEl.textContent.trim() : '';
      const parts = posStr.split('-');
      const nflTeam = parts[0] ? parts[0].trim() : '';
      const rawPos = parts[1] ? parts[1].trim() : slot;

      const ptsEl = tr.querySelector('.Ta-end, td.points');
      const points = ptsEl ? parseFloat(ptsEl.textContent.trim()) || 0.0 : 0.0;

      const isBench = isBenchOverride || slot.startsWith('BN') || slot.startsWith('IR');

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

  const allHarvestedMatchups = [];

  for (let wk = 1; wk <= totalWeeks; wk++) {
    console.log(`📡 Fetching Week ${wk}/${totalWeeks}...`);
    try {
      // 1. Fetch matchup week overview to find all matchup links
      const overviewUrl = `https://football.fantasysports.yahoo.com/${seasonYear}/f1/${leagueId}?matchup_week=${wk}&module=matchups&lhst=matchups`;
      const ovResp = await fetch(overviewUrl);
      const ovHtml = await ovResp.text();
      const ovParser = new DOMParser();
      const ovDoc = ovParser.parseFromString(ovHtml, 'text/html');

      // Extract matchup links (e.g. /matchup?week=1&mid1=1&mid2=2)
      let matchupLinks = [...ovDoc.querySelectorAll('a[href*="matchup?week="]')].map(a => a.getAttribute('href'));
      matchupLinks = [...new Set(matchupLinks)];

      // If no sub-matchup links found, fallback to the main matchup page
      if (matchupLinks.length === 0) {
        matchupLinks = [`/${seasonYear}/f1/${leagueId}/matchup?week=${wk}`];
      }

      for (const mLink of matchupLinks) {
        const fullUrl = mLink.startsWith('http') ? mLink : `https://football.fantasysports.yahoo.com${mLink}`;
        const resp = await fetch(fullUrl);
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Check for team headers
        const teamHeaderLinks = [...doc.querySelectorAll('.team-header a.F-link, a.team-name, .Ta-start a.F-link')];
        const team1Name = teamHeaderLinks[0] ? teamHeaderLinks[0].textContent.trim() : 'Team 1';
        const team2Name = teamHeaderLinks[1] ? teamHeaderLinks[1].textContent.trim() : 'Team 2';

        const tables = doc.querySelectorAll('table.stat-target, table.Table');
        if (tables.length >= 4) {
          // Table 0: Team 1 Starters, Table 1: Team 1 Bench
          // Table 2: Team 2 Starters, Table 3: Team 2 Bench
          const t1Starters = parsePlayersFromTable(tables[0], false);
          const t1Bench = parsePlayersFromTable(tables[1], true);
          const t1Players = [...t1Starters, ...t1Bench];

          const t2Starters = parsePlayersFromTable(tables[2], false);
          const t2Bench = parsePlayersFromTable(tables[3], true);
          const t2Players = [...t2Starters, ...t2Bench];

          const t1Opt = computeOptimal(t1Players);
          const t2Opt = computeOptimal(t2Players);

          const team1 = {
            teamName: team1Name,
            ownerName: teamOwnerMap[team1Name] || team1Name,
            seasonYear,
            week: wk,
            ...t1Opt,
            starters: t1Starters,
            bench: t1Bench
          };

          const team2 = {
            teamName: team2Name,
            ownerName: teamOwnerMap[team2Name] || team2Name,
            seasonYear,
            week: wk,
            ...t2Opt,
            starters: t2Starters,
            bench: t2Bench
          };

          team1.isWin = team1.actualScore > team2.actualScore;
          team1.isLoss = team1.actualScore < team2.actualScore;
          team2.isWin = team2.actualScore > team1.actualScore;
          team2.isLoss = team2.actualScore < team1.actualScore;

          if (team1.isLoss) {
            const dOh = checkDOh(team1.starters, team1.bench, team2.actualScore, team1.actualScore);
            team1.dOhOccurred = dOh.dOhOccurred;
            team1.dOhDetails = dOh.bestSwap;
          }
          if (team2.isLoss) {
            const dOh = checkDOh(team2.starters, team2.bench, team1.actualScore, team2.actualScore);
            team2.dOhOccurred = dOh.dOhOccurred;
            team2.dOhDetails = dOh.bestSwap;
          }

          allHarvestedMatchups.push({
            seasonYear,
            week: wk,
            homeTeam: team1,
            awayTeam: team2,
            margin: Number(Math.abs(team1.actualScore - team2.actualScore).toFixed(2))
          });
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error on Week ${wk}:`, err.message);
    }
  }

  console.log(`%c🎉 Harvest Complete! Extracted ${allHarvestedMatchups.length} matchups for Season ${seasonYear}.`, 'color: #34d399; font-size: 16px; font-weight: bold;');

  window.__Y2K_HARVESTED_DATA = allHarvestedMatchups;

  // Render on-screen modal so you can copy with 1 click
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:5%;left:5%;width:90%;height:90%;background:#020b05;border:3px solid #34d399;border-radius:12px;z-index:999999;padding:20px;display:flex;flex-direction:column;box-shadow:0 0 30px rgba(52,211,153,0.5);';
  
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:10px;font-family:monospace;color:#34d399;">
      <h2 style="margin:0;font-size:18px;">🏈 Y2K Harvest Complete: ${allHarvestedMatchups.length} Matchups Extracted (${seasonYear})</h2>
      <button id="y2k-close-btn" style="background:#dc2626;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">✕ Close</button>
    </div>
    <p style="color:#a7f3d0;font-family:monospace;font-size:12px;margin:0 0 10px 0;">
      Click the green button below to copy the JSON directly, or press Cmd+C inside the box!
    </p>
    <div style="margin-bottom:10px;">
      <button id="y2k-copy-btn" style="background:#059669;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;font-family:monospace;">
        📋 COPY JSON TO CLIPBOARD
      </button>
    </div>
    <textarea id="y2k-json-text" readonly style="flex-grow:1;background:#000;color:#6ee7b7;border:1px solid #047857;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;resize:none;">${JSON.stringify(allHarvestedMatchups, null, 2)}</textarea>
  `;

  document.body.appendChild(modal);

  document.getElementById('y2k-close-btn').onclick = () => document.body.removeChild(modal);

  const copyBtn = document.getElementById('y2k-copy-btn');
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

  // Auto-select text
  txtArea.select();
  try {
    document.execCommand('copy');
    copyBtn.innerText = '✅ AUTO-COPIED! Ready to paste in chat.';
    copyBtn.style.background = '#10b981';
  } catch (e) {}
})();
