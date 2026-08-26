import {
  isOneYearManager,
  formatPlayoffStageTag,
  formatPlayoffWeek,
  getStatCardTop5,
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

  it('should format aggregate playoff weeks for pre-2022 ESPN seasons', () => {
    expect(formatPlayoffWeek(2020, 13, 'Semi-Finals')).toBe('WEEKS 13+14');
    expect(formatPlayoffWeek(2020, 15, 'Championship Final')).toBe('WEEKS 15+16');
    expect(formatPlayoffWeek(2019, 14, 'Semi-Finals')).toBe('WEEKS 14+15');
    expect(formatPlayoffWeek(2019, 16, 'Championship Final')).toBe('WEEKS 16+17');
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
});
