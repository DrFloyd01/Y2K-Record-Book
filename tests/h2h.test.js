import { describe, it, expect } from 'vitest';
import { calcStreak, calcMaxStreak, getH2HBreakdown } from '../src/analytics/h2h.js';

describe('H2H Analytics Module', () => {
  it('should calculate active win streak correctly', () => {
    const mockGames = [
      { year: 2024, week: 10, winner: 'Dylan' },
      { year: 2024, week: 2, winner: 'Dylan' },
      { year: 2023, week: 14, winner: 'Phillip' }
    ];
    const streak = calcStreak(mockGames, 'Dylan');
    expect(streak.count).toBe(2);
    expect(streak.owner).toBe('Dylan');
  });

  it('should calculate maximum historical win streaks for both owners', () => {
    const mockGames = [
      { year: 2021, week: 1, winner: 'Dylan' },
      { year: 2021, week: 10, winner: 'Dylan' },
      { year: 2022, week: 3, winner: 'Dylan' },
      { year: 2022, week: 12, winner: 'Phillip' },
      { year: 2023, week: 5, winner: 'Phillip' },
      { year: 2023, week: 11, winner: 'Phillip' },
      { year: 2024, week: 1, winner: 'Phillip' }
    ];
    const max = calcMaxStreak(mockGames, 'Dylan', 'Phillip');
    expect(max.maxO1).toBe(3);
    expect(max.maxO2).toBe(4);
  });

  it('should aggregate H2H records accurately from matchups', () => {
    const mockLeagueData = {
      matchups: [
        { year: 2024, week: 1, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 120.5, awayScore: 98.2, isPlayoff: false },
        { year: 2024, week: 8, homeOwner: 'Phillip', awayOwner: 'Dylan', homeScore: 110.0, awayScore: 105.0, isPlayoff: false },
        { year: 2024, week: 15, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 140.0, awayScore: 115.0, isPlayoff: true, playoffStage: 'Finals' }
      ]
    };

    const breakdown = getH2HBreakdown(mockLeagueData, 'Dylan', 'Phillip');
    expect(breakdown.totalGames).toBe(3);
    expect(breakdown.o1TotalWins).toBe(2);
    expect(breakdown.o2TotalWins).toBe(1);
    expect(breakdown.o1RegWins).toBe(1);
    expect(breakdown.o2RegWins).toBe(1);
    expect(breakdown.o1PlayWins).toBe(1);
    expect(breakdown.o2PlayWins).toBe(0);
    expect(breakdown.o1Pts).toBe(365.5);
    expect(breakdown.o2Pts).toBe(323.2);
  });
});
