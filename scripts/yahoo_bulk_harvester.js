/**
 * Yahoo Fantasy Football Browser Console Bulk Matchup Harvester
 *
 * HOW TO USE:
 * 1. Log in to your Yahoo Fantasy Football account at:
 *    https://football.fantasysports.yahoo.com/f1/97974 (or any season's league page)
 * 2. Open Developer Tools (Cmd+Option+I on Mac or F12) and go to the "Console" tab.
 * 3. Paste this entire script into the console and press Enter.
 * 4. The script will automatically loop through all 17 weeks of matchups, extract
 *    starter & bench player points, compute optimal lineups & D'Oh moments, and
 *    automatically trigger a download of `y2k_lineups.json`!
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
    'Globo Gym': 'Dylan',
    'Ho Chi Win City': 'Phillip',
    'Jelqaida': 'Mike',
    'AARPFL': 'Casey',
    'Gl Hf (you’re gay)': 'Trace',
    'Gl Hf (you\'re gay)': 'Trace',
    'Darnold Schwarzenegger': 'Alex',
    'Donkey Squad': 'Ryan',
    'Aaron codger': 'Boaz',
    'Dusty’s Dingleberries': 'Dustin',
    "Dusty's Dingleberries": 'Dustin',
    'Trenches cooper': 'Cooper',
    'Tess Finesse': 'Tess',
    "Blue's Balls": 'Jasper',
    'Blue’s Balls': 'Jasper',
    'The Dawn of Man-Ape': 'Dylan',
    'TDS': 'Phillip'
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

  const allHarvestedMatchups = [];

  for (let wk = 1; wk <= totalWeeks; wk++) {
    console.log(`📡 Fetching Week ${wk}/${totalWeeks}...`);
    try {
      const url = `https://football.fantasysports.yahoo.com/${seasonYear}/f1/${leagueId}/matchup?week=${wk}`;
      const resp = await fetch(url);
      const html = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const tables = doc.querySelectorAll('table.stat-target, table.Table');
      if (tables.length >= 2) {
        for (let i = 0; i < tables.length; i += 2) {
          const t1Table = tables[i];
          const t2Table = tables[i + 1];
          if (!t2Table) continue;

          function parseTeam(table) {
            const teamLink = table.querySelector('a.F-link');
            const teamName = teamLink ? teamLink.textContent.trim() : 'Unknown Team';
            const ownerName = teamOwnerMap[teamName] || teamName;

            const players = [];
            table.querySelectorAll('tr').forEach(tr => {
              const nameEl = tr.querySelector('.ysf-player-name a, a.F-link');
              if (!nameEl) return;
              const playerName = nameEl.textContent.trim();
              if (!playerName || playerName === '(Empty)') return;

              const slotEl = tr.querySelector('.pos-label, td.pos');
              const slot = slotEl ? slotEl.textContent.trim().toUpperCase() : 'BN';

              const posEl = tr.querySelector('.Fz-xxs');
              const posStr = posEl ? posEl.textContent.trim() : '';
              const parts = posStr.split('-');
              const nflTeam = parts[0] ? parts[0].trim() : '';
              const rawPos = parts[1] ? parts[1].trim() : slot;

              const ptsEl = tr.querySelector('.Ta-end, td.points');
              const points = ptsEl ? parseFloat(ptsEl.textContent.trim()) || 0.0 : 0.0;

              const isBench = slot.startsWith('BN') || slot.startsWith('IR');
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

            const opt = computeOptimal(players);
            return {
              teamName,
              ownerName,
              seasonYear,
              week: wk,
              ...opt,
              starters: players.filter(p => !p.isBench),
              bench: players.filter(p => p.isBench)
            };
          }

          const team1 = parseTeam(t1Table);
          const team2 = parseTeam(t2Table);

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

  console.log(`%c🎉 Harvest Complete! Extracted ${allHarvestedMatchups.length} total matchups for Season ${seasonYear}.`, 'color: #34d399; font-size: 16px; font-weight: bold;');

  // Trigger JSON download
  const blob = new Blob([JSON.stringify(allHarvestedMatchups, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `y2k_${seasonYear}_lineups.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log(`💾 Downloaded y2k_${seasonYear}_lineups.json! Drop this file into public/data/raw_matchups/ and run 'node scripts/backfill_all_seasons.js'.`);
})();
