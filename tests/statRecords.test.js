import {
  isOneYearManager,
  formatPlayoffStageTag,
  formatPlayoffWeek,
  getStatCardTop5,
  getStatCardLeaderboard,
  RECORD_CATEGORY_METADATA,
  getGlobalAllTimeStatRecords
} from '../src/analytics/statRecords.js';

describe('Stat Records Analytics Module', () => {
  it('should identify one-year managers accurately', () => {
    expect(isOneYearManager('Nick')).toBe(true);
    expect(isOneYearManager('Torin')).toBe(true);
    expect(isOneYearManager('Dylan')).toBe(false);
    expect(isOneYearManager('Phillip')).toBe(false);
    expect(isOneYearManager('')).toBe(false);
  });

  it('should format playoff stage abbreviation tags correctly', () => {
    expect(formatPlayoffStageTag('Championship', 2024)).toBe("1st'24");
    expect(formatPlayoffStageTag('Nebuchadnezzar', 2022)).toBe("1st'22");
    expect(formatPlayoffStageTag('Semi-Finals', 2023)).toBe("SF'23");
    expect(formatPlayoffStageTag('Wild Card', 2024)).toBe("WC'24");
    expect(formatPlayoffStageTag('3rd Place', 2024)).toBe("3rd'24");
    expect(formatPlayoffStageTag('Consolation Round Robin', 2025)).toBe("RR'25");
  });

  it('should format aggregate playoff weeks for pre-2022 Pride Guys and single weeks for Y2K', () => {
    // Pride Guys pre-2022 2-week aggregate rounds
    expect(formatPlayoffWeek(2020, 13, 'Semi-Finals', true)).toBe('WEEKS 13+14');
    expect(formatPlayoffWeek(2020, 15, 'Championship Final', true)).toBe('WEEKS 15+16');
    expect(formatPlayoffWeek(2019, 14, 'Semi-Finals', true)).toBe('WEEKS 14+15');
    expect(formatPlayoffWeek(2019, 16, 'Championship Final', true)).toBe('WEEKS 16+17');
    expect(formatPlayoffWeek(2024, 16, 'Championship Final', true)).toBe('WEEK 16');

    // Y2K pre-2022 single-week rounds
    expect(formatPlayoffWeek(2018, 15, 'Semi-Finals', false)).toBe('WEEK 15');
    expect(formatPlayoffWeek(2018, 16, 'Nebuchadnezzar Cup', false)).toBe('WEEK 16');
    expect(formatPlayoffWeek(2020, 15, 'Semi-Finals')).toBe('WEEK 15');
    expect(formatPlayoffWeek(2020, 16, 'Nebuchadnezzar Cup')).toBe('WEEK 16');
    expect(formatPlayoffWeek(2021, 15, 'Wild Card')).toBe('WEEK 15');
    expect(formatPlayoffWeek(2021, 16, 'Semi-Finals')).toBe('WEEK 16');
    expect(formatPlayoffWeek(2021, 17, 'Nebuchadnezzar Cup')).toBe('WEEK 17');
    expect(formatPlayoffWeek(2024, 16, 'Championship Final')).toBe('WEEK 16');
  });

  it('should calculate top 5 single-game high scores (juggernaut)', () => {
    const mockLeagueData = {
      allMatchups: [
        { seasonYear: 2024, weekNumber: 1, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 165.4, awayScore: 120.2, homeTeam: 'Globo Gym', awayTeam: 'Show Me Dem TDS', isPlayoff: false },
        { seasonYear: 2024, weekNumber: 2, homeOwner: 'Ryan', awayOwner: 'Alex', homeScore: 175.8, awayScore: 140.0, homeTeam: 'Donkey Squad', awayTeam: 'Darnold', isPlayoff: false },
        { seasonYear: 2024, weekNumber: 3, homeOwner: 'Dustin', awayOwner: 'Cooper', homeScore: 90.0, awayScore: 85.0, homeTeam: 'Dingleberries', awayTeam: 'Trenches', isPlayoff: false }
      ]
    };

    const top5 = getStatCardTop5(mockLeagueData, 'juggernaut', 2024);
    expect(top5.length).toBe(5);
    expect(top5[0].owner).toBe('Ryan');
    expect(top5[0].valStr).toBe('175.80 pts');
    expect(top5[1].owner).toBe('Dylan');
  });

  it('should calculate top 5 blowout margins (cakewalk)', () => {
    const mockLeagueData = {
      allMatchups: [
        { seasonYear: 2024, weekNumber: 1, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 160.0, awayScore: 100.0, homeTeam: 'Team A', awayTeam: 'Team B', isPlayoff: false },
        { seasonYear: 2024, weekNumber: 2, homeOwner: 'Ryan', awayOwner: 'Alex', homeScore: 150.0, awayScore: 145.0, homeTeam: 'Team C', awayTeam: 'Team D', isPlayoff: false }
      ]
    };

    const top5 = getStatCardTop5(mockLeagueData, 'cakewalk', 2024);
    expect(top5.length).toBe(2);
    expect(top5[0].owner).toBe('Dylan');
    expect(top5[0].valStr).toBe('+60.00 pts');
  });

  it('should support limit parameter in getStatCardLeaderboard up to 10', () => {
    const mockMatchups = [];
    for (let w = 1; w <= 12; w++) {
      mockMatchups.push({
        seasonYear: 2025,
        weekNumber: w,
        homeOwner: `OwnerA_${w}`,
        awayOwner: `OwnerB_${w}`,
        homeScore: 100 + w * 2,
        awayScore: 90 + w,
        homeTeam: `TeamA_${w}`,
        awayTeam: `TeamB_${w}`,
        isPlayoff: false
      });
    }
    const mockData = { allMatchups: mockMatchups };

    const top10 = getStatCardLeaderboard(mockData, 'juggernaut', 2025, 10);
    expect(top10.length).toBe(10);
    expect(top10[0].score).toBe(124);
    expect(top10[9].score).toBe(106);

    const top3 = getStatCardLeaderboard(mockData, 'juggernaut', 2025, 3);
    expect(top3.length).toBe(3);
  });

  it('should expose valid RECORD_CATEGORY_METADATA with descriptions and icons', () => {
    const keys = ['juggernaut', 'featherweight', 'cakewalk', 'nailbiter', 'gutpunch', 'criminal', 'victoryLap', 'dumpsterFire'];
    keys.forEach(k => {
      const meta = RECORD_CATEGORY_METADATA[k];
      expect(meta).toBeDefined();
      expect(meta.title).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(meta.badge).toBeTruthy();
    });
  });
});
