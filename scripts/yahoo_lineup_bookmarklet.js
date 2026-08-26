/**
 * Yahoo Matchup & Lineup Bookmarklet
 *
 * Use this bookmarklet to export weekly starter/bench player box scores
 * directly from any Yahoo Fantasy Football matchup page with 1 click.
 *
 * HOW TO USE:
 * 1. Navigate to: https://football.fantasysports.yahoo.com/f1/<LEAGUE_ID>/matchup?week=<WEEK_NUM>
 * 2. Open Developer Tools Console (or save as bookmark URL with javascript: prefix).
 * 3. Paste and run this script.
 * 4. It will extract and download `y2k_<YEAR>_week_<WEEK>_lineups.json`.
 */

(function() {
  console.log("🏈 Yahoo Lineup Exporter Initializing...");

  // Extract Season Year and Week from URL or Header
  const urlParams = new URLSearchParams(window.location.search);
  const weekNum = parseInt(urlParams.get('week') || urlParams.get('matchup_week') || '1', 10);
  const leagueMatch = window.location.pathname.match(/\/f1\/(\d+)/);
  const leagueId = leagueMatch ? leagueMatch[1] : 'unknown';

  const titleText = document.title || '';
  const yearMatch = titleText.match(/\b(20\d\d)\b/) || window.location.href.match(/\b(20\d\d)\b/);
  const seasonYear = yearMatch ? parseInt(yearMatch[1], 10) : 2026;

  console.log(`📡 Extracting Week ${weekNum} for Season ${seasonYear} (League: ${leagueId})...`);

  // Canonical Team to Owner Mapping
  const OWNER_MAP = {
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

  const matchupBlocks = document.querySelectorAll('#matchup-detail, .matchup-sub-module, table.stat-target');
  const teamsData = [];

  const statTables = document.querySelectorAll('table.stat-target, table[id^="statTable"]');
  statTables.forEach((table, tIdx) => {
    const teamHeader = table.querySelector('.ysf-team-name a, a.F-link, th .name');
    const teamName = teamHeader ? teamHeader.textContent.trim() : `Team ${tIdx + 1}`;
    const ownerName = OWNER_MAP[teamName] || teamName;

    const rows = table.querySelectorAll('tbody tr');
    const players = [];

    rows.forEach(row => {
      if (row.classList.contains('empty-bench') || row.querySelector('th')) return;

      const slotCell = row.querySelector('.pos-label, td.pos, .pos');
      const slot = slotCell ? slotCell.textContent.trim().toUpperCase() : 'BN';

      const nameLink = row.querySelector('a.name, a.ysf-player-name, a.F-link');
      const playerName = nameLink ? nameLink.textContent.trim() : '';
      if (!playerName || playerName === '(Empty)') return;

      const posTeamSpan = row.querySelector('.Fz-xxs');
      const posTeamStr = posTeamSpan ? posTeamSpan.textContent.trim() : '';
      const [nflTeam, rawPos] = posTeamStr.includes('-')
        ? posTeamStr.split('-').map(s => s.trim())
        : [posTeamStr, slot];

      const injurySpan = row.querySelector('.F-injury, .injury');
      const injuryStatus = injurySpan ? injurySpan.textContent.trim().toUpperCase() : 'ACTIVE';

      const ptsCells = row.querySelectorAll('td.Ta-end, td.Ta-e');
      let pts = 0.0;
      let proj = 0.0;

      if (ptsCells.length >= 1) {
        pts = parseFloat(ptsCells[ptsCells.length - 1].textContent.trim()) || 0.0;
      }
      if (ptsCells.length >= 2) {
        proj = parseFloat(ptsCells[ptsCells.length - 2].textContent.trim()) || 0.0;
      }

      const isBench = slot.startsWith('BN') || slot.startsWith('IR');

      players.push({
        slot: slot,
        player: playerName,
        playerName: playerName,
        position: rawPos || slot,
        nflTeam: nflTeam || '',
        points: pts,
        projectedPoints: proj,
        injuryStatus: injuryStatus,
        isBench: isBench
      });
    });

    const starters = players.filter(p => !p.isBench);
    const bench = players.filter(p => p.isBench);
    const actualScore = starters.reduce((sum, p) => sum + p.points, 0);

    teamsData.push({
      teamName: teamName,
      ownerName: ownerName,
      seasonYear: seasonYear,
      week: weekNum,
      actualScore: Number(actualScore.toFixed(2)),
      starters: starters,
      bench: bench
    });
  });

  const exportPayload = {
    seasonYear: seasonYear,
    week: weekNum,
    leagueId: leagueId,
    timestamp: new Date().toISOString(),
    teams: teamsData
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);

  // Trigger browser download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `y2k_${seasonYear}_week_${weekNum}_lineups.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log(`✅ Exported ${teamsData.length} team lineups for Week ${weekNum}!`);
})();
