import { describe, it, expect } from 'vitest';
import {
  sortMatchupsByStandingRank,
  computeMatchupStakes,
  buildWeeklyMatchupsGridHtml,
  buildManagerSeasonGameLogHtml,
  formatPlayoffStageTag,
  getWeeklyMatchupDefaultState,
  getWeeklyRankMap
} from '../src/components/matchupsView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Matchups View Component', () => {
  const mockRankMap = {
    'Dylan': { rank: 1, rec: '11-3' },
    'Phillip': { rank: 2, rec: '10-4' },
    'Jasper': { rank: 3, rec: '9-5' },
    'Tess': { rank: 4, rec: '8-6' },
    'Trace': { rank: 5, rec: '7-7' },
    'Casey': { rank: 6, rec: '7-7' },
    'Mike': { rank: 7, rec: '6-8' },
    'Boaz': { rank: 8, rec: '5-9' },
    'Dustin': { rank: 9, rec: '4-10' },
    'Ryan': { rank: 10, rec: '3-11' }
  };

  const mockMatchups = [
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dustin', homeTeam: 'Dustin Team', homeScore: 110.0, awayOwner: 'Ryan', awayTeam: 'Ryan Team', awayScore: 105.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 150.1, awayOwner: 'Tess', awayTeam: 'Tess Team', awayScore: 120.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Phillip', homeTeam: 'Phillip Team', homeScore: 140.0, awayOwner: 'Jasper', awayTeam: 'Jasper Team', awayScore: 135.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Trace', homeTeam: 'Trace Team', homeScore: 125.0, awayOwner: 'Mike', awayTeam: 'Mike Team', awayScore: 115.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Casey', homeTeam: 'Casey Team', homeScore: 130.0, awayOwner: 'Boaz', awayTeam: 'Boaz Team', awayScore: 128.0 }
  ];

  const mockHistory = [
    // 2024 games between Dylan and Tess
    { seasonYear: 2024, weekNumber: 5, homeOwner: 'Dylan', homeScore: 130.0, awayOwner: 'Tess', awayScore: 110.0, isPlayoff: false },
    { seasonYear: 2024, weekNumber: 12, homeOwner: 'Dylan', homeScore: 145.0, awayOwner: 'Tess', awayScore: 115.0, isPlayoff: false },
    // 2024 playoff game between Dylan and Tess
    { seasonYear: 2024, weekNumber: 16, homeOwner: 'Dylan', homeScore: 155.0, awayOwner: 'Tess', awayScore: 140.0, isPlayoff: true, stage: 'Semifinals' }
  ];

  it('should sort matchups by standing ranks so marquee games come first', () => {
    const sorted = sortMatchupsByStandingRank(mockMatchups, mockRankMap);
    expect(sorted[0].homeOwner).toBe('Dylan'); // #1 vs #4
    expect(sorted[1].homeOwner).toBe('Phillip'); // #2 vs #3
    expect(sorted[sorted.length - 1].homeOwner).toBe('Dustin'); // #9 vs #10
  });

  it('should compute matchup stakes with all streak games and all playoff games', () => {
    const stakes = computeMatchupStakes({
      o1: 'Dylan',
      o2: 'Tess',
      season: 2025,
      week: 1,
      allMatchups: mockHistory
    });

    expect(stakes.h2hClean).toBe('3-0');
    expect(stakes.streakLeader).toBe('Dylan');
    expect(stakes.streakCount).toBe(3);
    expect(stakes.streakGames.length).toBe(3);
    expect(stakes.streakGames[0].year).toBe(2024);
    expect(stakes.streakGames[0].week).toBe(16);
    expect(stakes.playoffRec).toBe('1-0');
    expect(stakes.playoffGames.length).toBe(1);
    expect(stakes.playoffGames[0].stage).toBe('Semifinals');
  });

  it('should render 3x2 responsive grid with Top Stakes Bar in CRT theme', () => {
    const html = buildWeeklyMatchupsGridHtml({
      matchups: mockMatchups,
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      mode: 'recap',
      allMatchups: mockHistory,
      theme: CRT_THEME
    });

    expect(html).not.toContain('MATCHUP #1');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('150.10');
    expect(html).toContain('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4');
    expect(html).toContain('window.jumpToH2H');
    expect(html).toContain('⚡ STREAK:');
    expect(html).toContain('🏆 PLAYOFFS:');
    expect(html).toContain('tooltip-trigger');
    expect(html).toContain('matchup-stakes-popover');
    expect(html).toContain('no-scrollbar');
    expect(html).toContain('window.jumpToMatchup(2024, 16, \'Dylan\', \'Tess\')');
  });

  it('should render clean badge labels when showReportScores is false and details when true', () => {
    const customComm = {
      matchups: [
        {
          homeOwner: 'Dylan',
          awayOwner: 'Tess',
          streak: 'Dylan 3 (Wk16\'24, 155.00-140.00)',
          playoffs: '1-0 (SF\'24, 155.00-140.00)'
        }
      ]
    };

    const cleanHtml = buildWeeklyMatchupsGridHtml({
      matchups: [mockMatchups[1]], // Dylan vs Tess
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      commentary: customComm,
      showReportScores: false,
      theme: CRT_THEME
    });
    // In clean mode, parentheses should not be in the badge chip
    expect(cleanHtml).toContain('Dylan 3');
    expect(cleanHtml).not.toContain('Dylan 3 (Wk16');

    const detailedHtml = buildWeeklyMatchupsGridHtml({
      matchups: [mockMatchups[1]],
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      commentary: customComm,
      showReportScores: true,
      theme: CRT_THEME
    });
    // In report details mode, full score details should be present
    expect(detailedHtml).toContain('Dylan 3 (Wk16\'24, 155.00-140.00)');
  });

  it('should render 3x2 weekly grid in Pride theme', () => {
    const html = buildWeeklyMatchupsGridHtml({
      matchups: mockMatchups,
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      mode: 'recap',
      theme: PRIDE_THEME
    });

    expect(html).not.toContain('MATCHUP #1');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('border-pink-200');
    expect(html).toContain('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4');
  });

  it('should render manager full-season game log', () => {
    const dylanGames = [
      { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 150.1, awayOwner: 'Tess', awayTeam: 'Tess Team', awayScore: 120.0 },
      { seasonYear: 2025, weekNumber: 2, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 174.48, awayOwner: 'Trace', awayTeam: 'Trace Team', awayScore: 178.78 }
    ];

    const html = buildManagerSeasonGameLogHtml({
      owner: 'Dylan',
      season: 2025,
      matchups: dylanGames,
      rankMap: mockRankMap,
      theme: CRT_THEME
    });

    expect(html).toContain("Dylan — 2025 Season Game Log");
    expect(html).toContain("WIN");
    expect(html).toContain("LOSS");
    expect(html).toContain("Margin:");
  });

  it('should format playoff stage tags properly', () => {
    expect(formatPlayoffStageTag('championship', 2025)).toContain('Finals');
    expect(formatPlayoffStageTag('semifinals', 2025)).toContain('Semifinal');
    expect(formatPlayoffStageTag('3rd_place', 2025)).toContain('3rd Place');
  });

  describe('getWeeklyMatchupDefaultState commentary-driven default view rule', () => {
    const mockSeasonData = {
      schedule: [
        { weekNumber: 1, homeOwner: 'Dylan', homeScore: 197.70, awayOwner: 'Mike', awayScore: 109.06 },
        { weekNumber: 1, homeOwner: 'Phillip', homeScore: 115.46, awayOwner: 'Casey', awayScore: 123.94 },
        { weekNumber: 2, homeOwner: 'Dylan', homeScore: 0.0, awayOwner: 'Tess', awayScore: 0.0 },
        { weekNumber: 2, homeOwner: 'Phillip', homeScore: 0.0, awayOwner: 'Boaz', awayScore: 0.0 }
      ]
    };

    it('should default to recap when highest commentary uploaded is a recap', () => {
      const commentary = {
        '1': { mode: 'recap', matchups: [] },
        '2': { mode: 'recap', matchups: [] }
      };
      const state = getWeeklyMatchupDefaultState({
        season: 2026,
        seasonData: mockSeasonData,
        commentary,
        regularSeasonWeeks: 14
      });
      expect(state.week).toBe(2);
      expect(state.mode).toBe('recap');
    });

    it('should default to preview when an upcoming preview is uploaded', () => {
      const commentary = {
        '1': { mode: 'recap', matchups: [] },
        '2': { mode: 'recap', matchups: [] },
        '3': { mode: 'preview', matchups: [] }
      };
      const state = getWeeklyMatchupDefaultState({
        season: 2026,
        seasonData: mockSeasonData,
        commentary,
        regularSeasonWeeks: 14
      });
      expect(state.week).toBe(3);
      expect(state.mode).toBe('preview');
    });

    it('should default to Week 1 preview in pre-season when no commentary and no games have been played', () => {
      const preSeasonData = {
        schedule: [
          { weekNumber: 1, homeOwner: 'Dylan', homeScore: 0.0, awayOwner: 'Mike', awayScore: 0.0 }
        ]
      };
      const state = getWeeklyMatchupDefaultState({
        season: 2026,
        seasonData: preSeasonData,
        regularSeasonWeeks: 14
      });

      expect(state.week).toBe(1);
      expect(state.mode).toBe('preview');
    });

    it('should default to latest completed week recap when commentary is absent', () => {
      const state = getWeeklyMatchupDefaultState({
        season: 2026,
        seasonData: mockSeasonData,
        regularSeasonWeeks: 14
      });
      expect(state.week).toBe(1);
      expect(state.mode).toBe('recap');
    });

    it('should default to final week recap for concluded historical seasons without commentary', () => {
      const allCompletedGames = [];
      for (let w = 1; w <= 14; w++) {
        allCompletedGames.push({ weekNumber: w, homeScore: 120.0, awayScore: 110.0 });
      }
      const concludedData = { schedule: allCompletedGames };
      const state = getWeeklyMatchupDefaultState({
        season: 2025,
        seasonData: concludedData,
        regularSeasonWeeks: 14
      });

      expect(state.week).toBe(14);
      expect(state.mode).toBe('recap');
    });
  });

  describe('getWeeklyRankMap Dynamic Standings Ordering', () => {
    const mockPreSeasonStandings = [
      { rank: 1, ownerName: 'Dylan', teamName: 'Globo Gym' },
      { rank: 2, ownerName: 'Phillip', teamName: 'Ho Chi Win City' },
      { rank: 3, ownerName: 'Jasper', teamName: "Blue's Balls" },
      { rank: 4, ownerName: 'Tess', teamName: 'Tess Finesse' },
      { rank: 5, ownerName: 'Trace', teamName: "Gl Hf (you’re gay)" },
      { rank: 6, ownerName: 'Casey', teamName: 'AARPFL' },
      { rank: 7, ownerName: 'Mike', teamName: 'IRKed' },
      { rank: 8, ownerName: 'Boaz', teamName: 'Aaron codger' },
      { rank: 9, ownerName: 'Dustin', teamName: "Dusty’s Dingleberries" },
      { rank: 10, ownerName: 'Ryan', teamName: 'Donkey Squad' },
      { rank: 11, ownerName: 'Cooper', teamName: 'Trenches cooper' },
      { rank: 12, ownerName: 'Alex', teamName: 'Darnold Schwarzenegger' }
    ];

    const mockWeek1Games = [
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Dylan', homeScore: 197.70, awayOwner: 'Mike', awayScore: 109.06, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Phillip', homeScore: 115.46, awayOwner: 'Casey', awayScore: 123.94, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Jasper', homeScore: 128.22, awayOwner: 'Tess', awayScore: 108.66, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Trace', homeScore: 113.20, awayOwner: 'Alex', awayScore: 180.56, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Boaz', homeScore: 147.32, awayOwner: 'Ryan', awayScore: 131.56, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Dustin', homeScore: 115.80, awayOwner: 'Cooper', awayScore: 168.60, isPlayoff: false }
    ];

    const mockWeek2Games = [
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Dylan', homeScore: 160.00, awayOwner: 'Tess', awayScore: 110.00, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Phillip', homeScore: 140.00, awayOwner: 'Boaz', awayScore: 130.00, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Trace', homeScore: 120.00, awayOwner: 'Ryan', awayScore: 125.00, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Casey', homeScore: 135.00, awayOwner: 'Cooper', awayScore: 145.00, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Jasper', homeScore: 115.00, awayOwner: 'Dustin', awayScore: 125.00, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Alex', homeScore: 155.00, awayOwner: 'Mike', awayScore: 105.00, isPlayoff: false }
    ];

    const mockSData = {
      preSeasonStandings: mockPreSeasonStandings,
      standings: [
        { rank: 1, ownerName: 'Dylan', wins: 1, losses: 0, pointsFor: 197.70 },
        { rank: 2, ownerName: 'Alex', wins: 1, losses: 0, pointsFor: 180.56 },
        { rank: 3, ownerName: 'Cooper', wins: 1, losses: 0, pointsFor: 168.60 },
        { rank: 4, ownerName: 'Boaz', wins: 1, losses: 0, pointsFor: 147.32 },
        { rank: 5, ownerName: 'Jasper', wins: 1, losses: 0, pointsFor: 128.22 },
        { rank: 6, ownerName: 'Casey', wins: 1, losses: 0, pointsFor: 123.94 },
        { rank: 7, ownerName: 'Ryan', wins: 0, losses: 1, pointsFor: 131.56 },
        { rank: 8, ownerName: 'Dustin', wins: 0, losses: 1, pointsFor: 115.80 },
        { rank: 9, ownerName: 'Phillip', wins: 0, losses: 1, pointsFor: 115.46 },
        { rank: 10, ownerName: 'Trace', wins: 0, losses: 1, pointsFor: 113.20 },
        { rank: 11, ownerName: 'Mike', wins: 0, losses: 1, pointsFor: 109.06 },
        { rank: 12, ownerName: 'Tess', wins: 0, losses: 1, pointsFor: 108.66 }
      ]
    };

    it('should reset standings badges and ranks to pre-season order (0-0 records) for Week 1 preview', () => {
      const rankMap = getWeeklyRankMap({
        season: 2026,
        week: 1,
        mode: 'preview',
        sData: mockSData,
        allMatchups: mockWeek1Games
      });

      expect(rankMap['Dylan']).toEqual({ rank: 1, rec: '0-0' });
      expect(rankMap['Phillip']).toEqual({ rank: 2, rec: '0-0' });
      expect(rankMap['Jasper']).toEqual({ rank: 3, rec: '0-0' });
      expect(rankMap['Tess']).toEqual({ rank: 4, rec: '0-0' });
      expect(rankMap['Trace']).toEqual({ rank: 5, rec: '0-0' });
      expect(rankMap['Casey']).toEqual({ rank: 6, rec: '0-0' });
      expect(rankMap['Mike']).toEqual({ rank: 7, rec: '0-0' });
      expect(rankMap['Boaz']).toEqual({ rank: 8, rec: '0-0' });
      expect(rankMap['Dustin']).toEqual({ rank: 9, rec: '0-0' });
      expect(rankMap['Ryan']).toEqual({ rank: 10, rec: '0-0' });
      expect(rankMap['Cooper']).toEqual({ rank: 11, rec: '0-0' });
      expect(rankMap['Alex']).toEqual({ rank: 12, rec: '0-0' });
    });

    it('should update standings badges and ranks based on completed week 1 games for Week 1 recap', () => {
      const rankMap = getWeeklyRankMap({
        season: 2026,
        week: 1,
        mode: 'recap',
        sData: mockSData,
        allMatchups: mockWeek1Games
      });

      // Top 6 winners sorted by PF
      expect(rankMap['Dylan']).toEqual({ rank: 1, rec: '1-0' }); // 197.70
      expect(rankMap['Alex']).toEqual({ rank: 2, rec: '1-0' });  // 180.56
      expect(rankMap['Cooper']).toEqual({ rank: 3, rec: '1-0' });// 168.60
      expect(rankMap['Boaz']).toEqual({ rank: 4, rec: '1-0' });  // 147.32
      expect(rankMap['Jasper']).toEqual({ rank: 5, rec: '1-0' });// 128.22
      expect(rankMap['Casey']).toEqual({ rank: 6, rec: '1-0' }); // 123.94

      // Bottom 6 losers sorted by PF
      expect(rankMap['Ryan']).toEqual({ rank: 7, rec: '0-1' });   // 131.56
      expect(rankMap['Dustin']).toEqual({ rank: 8, rec: '0-1' }); // 115.80
      expect(rankMap['Phillip']).toEqual({ rank: 9, rec: '0-1' });// 115.46
      expect(rankMap['Trace']).toEqual({ rank: 10, rec: '0-1' }); // 113.20
      expect(rankMap['Mike']).toEqual({ rank: 11, rec: '0-1' });  // 109.06
      expect(rankMap['Tess']).toEqual({ rank: 12, rec: '0-1' });  // 108.66
    });

    it('should keep standings as they were entering the week for Week 2 preview (using Week 1 games)', () => {
      const rankMap = getWeeklyRankMap({
        season: 2026,
        week: 2,
        mode: 'preview',
        sData: mockSData,
        allMatchups: [...mockWeek1Games, ...mockWeek2Games]
      });

      // Week 2 preview only considers games < Week 2, so standings entering Week 2 reflect Week 1 results
      expect(rankMap['Dylan']).toEqual({ rank: 1, rec: '1-0' });
      expect(rankMap['Alex']).toEqual({ rank: 2, rec: '1-0' });
      expect(rankMap['Cooper']).toEqual({ rank: 3, rec: '1-0' });
      expect(rankMap['Boaz']).toEqual({ rank: 4, rec: '1-0' });
      expect(rankMap['Jasper']).toEqual({ rank: 5, rec: '1-0' });
      expect(rankMap['Casey']).toEqual({ rank: 6, rec: '1-0' });
      expect(rankMap['Tess']).toEqual({ rank: 12, rec: '0-1' });
    });

    it('should update standings for Week 2 recap once Week 2 games are completed', () => {
      const rankMap = getWeeklyRankMap({
        season: 2026,
        week: 2,
        mode: 'recap',
        sData: mockSData,
        allMatchups: [...mockWeek1Games, ...mockWeek2Games]
      });

      // Dylan won W1 (197.70) and W2 (160.00) -> 2-0, 357.70 PF (#1)
      expect(rankMap['Dylan']).toEqual({ rank: 1, rec: '2-0' });
      // Alex won W1 (180.56) and W2 (155.00) -> 2-0, 335.56 PF (#2)
      expect(rankMap['Alex']).toEqual({ rank: 2, rec: '2-0' });
      // Cooper won W1 (168.60) and W2 (145.00) -> 2-0, 313.60 PF (#3)
      expect(rankMap['Cooper']).toEqual({ rank: 3, rec: '2-0' });
      // Tess lost W1 (108.66) and W2 (110.00) -> 0-2, 218.66 PF
      expect(rankMap['Tess'].rec).toBe('0-2');
    });

    it('should render #STANDING badge with pre-season rank in preview and updated rank in recap via buildWeeklyMatchupsGridHtml', () => {
      const previewHtml = buildWeeklyMatchupsGridHtml({
        matchups: [mockWeek1Games[0]], // Dylan vs Mike
        season: 2026,
        week: 1,
        mode: 'preview',
        sData: mockSData,
        allMatchups: mockWeek1Games,
        theme: CRT_THEME
      });

      // In Week 1 preview: Dylan is #1 (0-0), Mike is #7 (0-0)
      expect(previewHtml).toContain('>#1</span>');
      expect(previewHtml).toContain('[Dylan] • 0-0');
      expect(previewHtml).toContain('>#7</span>');
      expect(previewHtml).toContain('[Mike] • 0-0');

      const recapHtml = buildWeeklyMatchupsGridHtml({
        matchups: [mockWeek1Games[0]], // Dylan vs Mike
        season: 2026,
        week: 1,
        mode: 'recap',
        sData: mockSData,
        allMatchups: mockWeek1Games,
        theme: CRT_THEME
      });

      // In Week 1 recap: Dylan is #1 (1-0), Mike is #11 (0-1)
      expect(recapHtml).toContain('>#1</span>');
      expect(recapHtml).toContain('[Dylan] • 1-0');
      expect(recapHtml).toContain('>#11</span>');
      expect(recapHtml).toContain('[Mike] • 0-1');
    });

    it('should fallback to static pre-season rankings when sData.preSeasonStandings is missing', () => {
      // Y2K fallback
      const y2kRank = getWeeklyRankMap({
        season: 2026,
        week: 1,
        mode: 'preview',
        sData: { standings: [] }
      });
      expect(y2kRank['Dylan']).toEqual({ rank: 1, rec: '0-0' });
      expect(y2kRank['Phillip']).toEqual({ rank: 2, rec: '0-0' });
      expect(y2kRank['Alex']).toEqual({ rank: 12, rec: '0-0' });

      // Pride Guys fallback
      const prideRank = getWeeklyRankMap({
        season: 2026,
        week: 1,
        mode: 'preview',
        sData: { standings: [{ ownerName: 'Dylan Soth' }, { ownerName: "Aidan O'Sullivan" }] }
      });
      expect(prideRank['Dylan Soth']).toEqual({ rank: 1, rec: '0-0' });
      expect(prideRank['Sean Belcher']).toEqual({ rank: 2, rec: '0-0' });
      expect(prideRank["Aidan O'Sullivan"]).toEqual({ rank: 12, rec: '0-0' });
    });

    it('should place higher-ranked team atop lower-ranked team in matchup card rows', () => {
      // Away team is #2, Home team is #4
      const customRankMap = {
        'Austin': { rank: 4, rec: '1-0' },
        'Brendan': { rank: 2, rec: '1-0' }
      };
      const matchup = [{
        seasonYear: 2026,
        weekNumber: 2,
        homeOwner: 'Austin',
        homeTeam: 'Football',
        homeScore: 0,
        awayOwner: 'Brendan',
        awayTeam: 'Stroking my penix',
        awayScore: 0
      }];

      const html = buildWeeklyMatchupsGridHtml({
        matchups: matchup,
        rankMap: customRankMap,
        season: 2026,
        week: 2,
        mode: 'preview',
        theme: CRT_THEME
      });

      // Brendan (#2) should appear in the DOM before Austin (#4)
      const brendanIndex = html.indexOf('Stroking my penix');
      const austinIndex = html.indexOf('Football');
      expect(brendanIndex).toBeGreaterThan(-1);
      expect(austinIndex).toBeGreaterThan(-1);
      expect(brendanIndex).toBeLessThan(austinIndex);
    });
  });
});
