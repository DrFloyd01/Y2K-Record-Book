import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('E2E DOM Integration Test', () => {
  let leagueData;

  beforeEach(() => {
    const raw = fs.readFileSync(path.resolve(__dirname, '../public/data/leagueData.json'), 'utf-8');
    leagueData = JSON.parse(raw);
    window.LEAGUE_DATA = leagueData;
  });

  it('should successfully load league data with valid teams, seasons, and matchups', () => {
    expect(window.LEAGUE_DATA.seasons).toContain(2026);
    expect(window.LEAGUE_DATA.teams.length).toBeGreaterThan(5);
    expect(window.LEAGUE_DATA.allTimeStandings.length).toBeGreaterThan(5);
    expect(window.LEAGUE_DATA.allMatchups.length).toBeGreaterThan(50);
    expect(window.LEAGUE_DATA.championships.length).toBeGreaterThan(3);
    expect(window.LEAGUE_DATA.seasonData['2025'].standings.length).toBeGreaterThan(5);
  });

  it('should render 2026 Week 1 weekly matchups with rich stakes popovers and jump links', async () => {
    const { buildWeeklyMatchupsGridHtml, computeMatchupStakes } = await import('../src/components/matchupsView.js');
    const schedule2026 = window.LEAGUE_DATA.seasonData['2026'].schedule2026;
    const week1Matchups = schedule2026.filter(m => m.weekNumber === 1);
    const customComm = window.LEAGUE_DATA.weeklyCommentary?.['2026']?.['1'];

    const html = buildWeeklyMatchupsGridHtml({
      matchups: week1Matchups,
      rankMap: {
        'Dylan': { rank: 1, rec: '0-0' },
        'Mike': { rank: 7, rec: '0-0' },
        'Jasper': { rank: 3, rec: '0-0' },
        'Tess': { rank: 4, rec: '0-0' }
      },
      season: 2026,
      week: 1,
      mode: 'preview',
      commentary: customComm,
      allMatchups: window.LEAGUE_DATA.allMatchups
    });

    // Verify 3x2 grid classes
    expect(html).toContain('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4');
    // Verify H2H deeplink
    expect(html).toContain('window.jumpToH2H');
    // Verify streak and playoff badges & popover content
    expect(html).toContain('⚡ STREAK:');
    expect(html).toContain('🏆 PLAYOFFS:');
    expect(html).toContain('tooltip-trigger');
    expect(html).toContain('window.jumpToMatchup');

    // Test computeMatchupStakes for Jasper vs Tess in 2026 Wk 1
    const jtStakes = computeMatchupStakes({
      o1: 'Jasper',
      o2: 'Tess',
      season: 2026,
      week: 1,
      customM: customComm.matchups.find(m => m.homeOwner === 'Jasper' && m.awayOwner === 'Tess'),
      allMatchups: window.LEAGUE_DATA.allMatchups
    });
    expect(jtStakes.streakLeader).toBe('Jasper');
    expect(jtStakes.streakCount).toBeGreaterThanOrEqual(1);
    expect(jtStakes.playoffGames.length).toBeGreaterThanOrEqual(1);
  });

  it('should verify Pride Guys 2026 data integrity with statRecords and valid stat cards', async () => {
    const { getStatCardTop5 } = await import('../src/analytics/statRecords.js');
    const rawPride = fs.readFileSync(path.resolve(__dirname, '../public/data/prideGuysData.json'), 'utf-8');
    const prideData = JSON.parse(rawPride);

    expect(prideData.seasonData['2026'].statRecords).toBeDefined();
    const records = prideData.seasonData['2026'].statRecords;
    expect(records.highestScore.owner).toBeTruthy();
    expect(records.highestScore.score).toBeGreaterThanOrEqual(144.46);
    expect(records.lowestScore.owner).toBeTruthy();
    expect(records.lowestScore.score).toBeGreaterThan(0);
    expect(records.highestScore.score).toBeGreaterThanOrEqual(records.lowestScore.score);
    expect(records.closestMargin.margin).toBeGreaterThan(0);
    expect(records.biggestBlowout.margin).toBeGreaterThan(0);
    expect(records.biggestBlowout.margin).toBeGreaterThanOrEqual(records.closestMargin.margin);

    const keys = ['juggernaut', 'featherweight', 'cakewalk', 'nailbiter', 'gutpunch', 'criminal', 'victoryLap', 'dumpsterFire'];
    keys.forEach(k => {
      const topCards = getStatCardTop5(prideData, k, 2026);
      expect(topCards.length).toBeGreaterThan(0);
      expect(topCards[0].owner).toBeTruthy();
      expect(topCards[0].valStr).toBeTruthy();
    });
  });

  it('should support switching between Modern Era (2022+) and All-Time', async () => {
    const { filterLeagueDataByMinYear } = await import('../src/core/eraFilter.js');

    // Initial All-Time state
    expect(window.LEAGUE_DATA.seasons).toContain(2018);
    expect(window.LEAGUE_DATA.seasons).toContain(2026);
    const allTimeDylan = window.LEAGUE_DATA.allTimeStandings.find(s => s.ownerName === 'Dylan');
    expect(allTimeDylan.wins).toBe(57);

    // Filter to Modern Era (2022+)
    const modernData = filterLeagueDataByMinYear(window.LEAGUE_DATA, 2022);
    expect(modernData.seasons).not.toContain(2018);
    expect(modernData.seasons).toContain(2022);
    expect(modernData.seasons).toContain(2026);
    const modernDylan = modernData.allTimeStandings.find(s => s.ownerName === 'Dylan');
    expect(modernDylan.wins).toBe(31);
    expect(modernDylan.seasonsCount).toBe(4);
  });

  it('should verify Top 10 Records showcase in modern era for both leagues', async () => {
    const { filterLeagueDataByMinYear } = await import('../src/core/eraFilter.js');
    const { getStatCardLeaderboard } = await import('../src/analytics/statRecords.js');
    const { buildRecordsShowcaseHtml } = await import('../src/components/recordsView.js');

    // Pride Guys Modern Era Featherweight Test
    const rawPride = fs.readFileSync(path.resolve(__dirname, '../public/data/prideGuysData.json'), 'utf-8');
    const prideData = JSON.parse(rawPride);
    const modernPride = filterLeagueDataByMinYear(prideData, 2022);
    const featherTop10 = getStatCardLeaderboard(modernPride, 'featherweight', 'allTime', 10);

    expect(featherTop10.length).toBe(10);
    expect(featherTop10[3].owner).toBe('Sean Belcher');
    expect(featherTop10[3].score).toBe(52.96);
    expect(featherTop10[3].year).toBe(2026);
    expect(featherTop10[3].week).toBe(2);

    // Y2K Modern Era Juggernaut Test
    const modernY2K = filterLeagueDataByMinYear(window.LEAGUE_DATA, 2022);
    const juggTop10 = getStatCardLeaderboard(modernY2K, 'juggernaut', 'allTime', 10);
    expect(juggTop10.length).toBe(10);
    expect(juggTop10[8].owner).toBe('Dylan');
    expect(juggTop10[8].score).toBe(197.7);
    expect(juggTop10[9].owner).toBe('Dustin');
    expect(juggTop10[9].score).toBe(196.46);

    // Verify HTML showcase renders podium and table
    const showcaseHtml = buildRecordsShowcaseHtml({
      leagueData: modernPride,
      season: 'allTime',
      selectedCategory: 'featherweight',
      isModernEra: true
    });
    expect(showcaseHtml).toContain('🥇 1ST PLACE');
    expect(showcaseHtml).toContain('🥈 2ND PLACE');
    expect(showcaseHtml).toContain('🥉 3RD PLACE');
    expect(showcaseHtml).toContain('#4');
    expect(showcaseHtml).toContain('Sean Belcher');
    expect(showcaseHtml).toContain('52.96 pts');
  });

  it('should verify Champs tab Dynasty Leaderboard and Playoff Record Cards popovers in Modern Era and All-Time', async () => {
    const { filterLeagueDataByMinYear } = await import('../src/core/eraFilter.js');
    const { buildDynastyLeaderboardRows } = await import('../src/components/standingsView.js');
    const { buildStatCardTop5Popover } = await import('../src/components/popovers.js');
    const { CRT_THEME, PRIDE_THEME } = await import('../src/theme/theme.js');

    // 1. Y2K Dynasty Leaderboard: Modern Era vs All-Time
    const modernY2k = filterLeagueDataByMinYear(window.LEAGUE_DATA, 2022);
    const modernLeaderboard = modernY2k.allTimeStandings.slice().sort((a, b) => {
      const cA = a.championships || {}, cB = b.championships || {};
      if ((cB['1st'] || 0) !== (cA['1st'] || 0)) return (cB['1st'] || 0) - (cA['1st'] || 0);
      return b.winPct - a.winPct;
    });
    const modernRows = buildDynastyLeaderboardRows({
      leaderboard: modernLeaderboard,
      championships: modernY2k.championships,
      theme: CRT_THEME
    });
    // Dylan is #1 in modern era with 2 titles
    expect(modernLeaderboard[0].ownerName).toBe('Dylan');
    expect(modernRows).toContain('Dylan');

    const allTimeLeaderboard = window.LEAGUE_DATA.allTimeStandings.slice().sort((a, b) => {
      const cA = a.championships || {}, cB = b.championships || {};
      if ((cB['1st'] || 0) !== (cA['1st'] || 0)) return (cB['1st'] || 0) - (cA['1st'] || 0);
      return b.winPct - a.winPct;
    });
    // Phillip is #1 in all-time
    expect(allTimeLeaderboard[0].ownerName).toBe('Phillip');

    // 2. Playoff Stat Cards Popovers in both leagues and eras
    const categories = ['juggernaut', 'featherweight', 'cakewalk', 'nailbiter', 'gutpunch', 'criminal', 'victoryLap', 'dumpsterFire'];
    const rawPride = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/prideGuysData.json'), 'utf-8'));
    const modernPride = filterLeagueDataByMinYear(rawPride, 2022);

    categories.forEach(key => {
      // Y2K Modern
      const y2kModPop = buildStatCardTop5Popover({
        cardTitle: key,
        metricKey: key,
        season: 'playoffs',
        rowPopDir: ' tooltip-content-bottom',
        leagueData: modernY2k,
        theme: CRT_THEME
      });
      expect(y2kModPop).toContain('tooltip-content');
      expect(y2kModPop).not.toContain('No data records found');

      // Pride Modern
      const prideModPop = buildStatCardTop5Popover({
        cardTitle: key,
        metricKey: key,
        season: 'playoffs',
        rowPopDir: ' tooltip-content-bottom',
        leagueData: modernPride,
        theme: PRIDE_THEME
      });
      expect(prideModPop).toContain('tooltip-content');
      expect(prideModPop).not.toContain('No data records found');
    });
  });
});
