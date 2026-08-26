/**
 * ===============================================================
 * 🟣 Yahoo Fantasy Football 1-Click Browser Console Exporter
 * ===============================================================
 * 
 * Instructions:
 * 1. Navigate to your Yahoo Fantasy Matchup page (e.g. Week 1 Matchups):
 *    https://football.fantasysports.yahoo.com/f1/<LEAGUE_ID>/matchup?week=1
 * 2. Open Developer Tools (Cmd+Option+I on Mac, F12 on Windows) -> Console tab.
 * 3. Paste this script into the Console and press Enter.
 * 4. A clean JSON file (e.g., 'yahoo_week_1.json') will automatically download!
 */

(function exportYahooMatchups() {
  const urlParams = new URLSearchParams(window.location.search);
  const week = urlParams.get('week') || '1';
  const leagueMatch = window.location.pathname.match(/\/f1\/(\d+)/);
  const leagueId = leagueMatch ? leagueMatch[1] : 'unknown';

  const matchups = [];

  // Matchup tables / rows on Yahoo Fantasy Matchup page
  document.querySelectorAll('.matchup, section.matchup, #matchupweek .matchup-sub-module').forEach((mEl, idx) => {
    const teamLinks = mEl.querySelectorAll('a.F-link, a.F-reset, .Fz-m a');
    const scores = mEl.querySelectorAll('.score, .Fw-b.Fz-lg, .Fz-lg, .F-shade');

    if (teamLinks.length >= 2) {
      const t1Name = teamLinks[0].innerText.trim();
      const t2Name = teamLinks[1].innerText.trim();
      const s1 = scores[0] ? parseFloat(scores[0].innerText.replace(/[^0-9.]/g, '')) || 0 : 0;
      const s2 = scores[1] ? parseFloat(scores[1].innerText.replace(/[^0-9.]/g, '')) || 0 : 0;

      matchups.push({
        matchupId: idx + 1,
        week: parseInt(week, 10),
        team1: t1Name,
        score1: s1,
        team2: t2Name,
        score2: s2,
        winner: s1 > s2 ? t1Name : (s2 > s1 ? t2Name : 'Tie'),
        margin: parseFloat(Math.abs(s1 - s2).toFixed(2))
      });
    }
  });

  const payload = {
    platform: 'Yahoo Fantasy Sports',
    leagueId: leagueId,
    season: new Date().getFullYear(),
    week: parseInt(week, 10),
    extractedAt: new Date().toISOString(),
    matchups: matchups
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  // 1. Try DevTools native copy() function (copies directly to OS clipboard)
  if (typeof copy === 'function') {
    copy(jsonStr);
    console.log(`%c🎉 SUCCESS: Week ${week} JSON copied to clipboard! (Found ${matchups.length} matchups)`, 'color: #00ff66; font-weight: bold; font-size: 14px;');
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      console.log(`%c🎉 SUCCESS: Week ${week} JSON copied to clipboard! (Found ${matchups.length} matchups)`, 'color: #00ff66; font-weight: bold; font-size: 14px;');
    }).catch(() => {
      console.log(jsonStr);
    });
  } else {
    console.log(jsonStr);
  }

  console.log('\n👇 Extracted Matchups Summary:');
  console.table(matchups);
  console.log('\n📋 JSON Payload ready. Paste into a file or chat!');
  return payload;
})();
