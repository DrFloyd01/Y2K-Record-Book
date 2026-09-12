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
});
