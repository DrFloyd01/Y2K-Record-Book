import { describe, it, expect } from 'vitest';
import { calcStreak, calcMaxStreak, getH2HBreakdown, computeStreaksFromH2H, syncH2HDataAndStreaks } from '../src/analytics/h2h.js';


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

  it('should handle names with apostrophes (e.g. Aidan O\'Sullivan) without crashing', () => {
    const mockLeagueData = {
      matchups: [
        { year: 2024, week: 1, homeOwner: "Aidan O'Sullivan", awayOwner: 'Trace Bakulich', homeScore: 125.0, awayScore: 110.0, isPlayoff: false }
      ]
    };
    const breakdown = getH2HBreakdown(mockLeagueData, "Aidan O'Sullivan", 'Trace Bakulich');
    expect(breakdown.totalGames).toBe(1);
    expect(breakdown.o1TotalWins).toBe(1);
    expect(breakdown.o2TotalWins).toBe(0);
  });

  it('should ignore consolation and ladder games from H2H breakdown', () => {
    const mockLeagueData = {
      matchups: [
        { year: 2024, week: 1, homeOwner: 'Dylan', awayOwner: 'Tyler', homeScore: 120.0, awayScore: 110.0, isPlayoff: false },
        { year: 2024, week: 15, homeOwner: 'Dylan', awayOwner: 'Tyler', homeScore: 100.0, awayScore: 130.0, isPlayoff: false, isConsolation: true, stage: 'Consolation Ladder', rawTier: 'LOSERS_CONSOLATION_LADDER' },
        { year: 2024, week: 16, homeOwner: 'Dylan', awayOwner: 'Tyler', homeScore: 90.0, awayScore: 115.0, isPlayoff: false, isConsolation: true, stage: 'Consolation Round Robin', rawTier: 'LOSERS_CONSOLATION_LADDER' }
      ]
    };
    const breakdown = getH2HBreakdown(mockLeagueData, 'Dylan', 'Tyler');
    expect(breakdown.totalGames).toBe(1);
    expect(breakdown.o1TotalWins).toBe(1);
    expect(breakdown.o2TotalWins).toBe(0);
    expect(breakdown.games.length).toBe(1);
  });

  describe('syncH2HDataAndStreaks & Active Streak Updates', () => {
    it('should update active streaks to inactive when a new week game ends the streak', () => {
      const mockLeagueData = {
        allMatchups: [
          // 3 wins in a row for Michael over Dylan
          { seasonYear: 2024, weekNumber: 1, homeOwner: 'Michael Anderson', awayOwner: 'Dylan Soth', homeScore: 130.0, awayScore: 100.0, winner: 'Michael Anderson' },
          { seasonYear: 2024, weekNumber: 8, homeOwner: 'Michael Anderson', awayOwner: 'Dylan Soth', homeScore: 125.0, awayScore: 110.0, winner: 'Michael Anderson' },
          { seasonYear: 2025, weekNumber: 4, homeOwner: 'Dylan Soth', awayOwner: 'Michael Anderson', homeScore: 90.0, awayScore: 115.0, winner: 'Michael Anderson' },
          // Week 4 2026: Dylan ends Michael's streak
          { seasonYear: 2026, weekNumber: 4, homeOwner: 'Michael Anderson', awayOwner: 'Dylan Soth', homeScore: 96.0, awayScore: 115.0, winner: 'Dylan Soth' }
        ],
        h2hData: [
          {
            owner1: 'Dylan Soth',
            owner2: 'Michael Anderson',
            wins1: 0,
            wins2: 3,
            ties: 0,
            games: [
              { year: 2024, week: 1, homeOwner: 'Michael Anderson', awayOwner: 'Dylan Soth', homeScore: 130.0, awayScore: 100.0, winner: 'Michael Anderson', isPlayoff: false },
              { year: 2024, week: 8, homeOwner: 'Michael Anderson', awayOwner: 'Dylan Soth', homeScore: 125.0, awayScore: 110.0, winner: 'Michael Anderson', isPlayoff: false },
              { year: 2025, week: 4, homeOwner: 'Dylan Soth', awayOwner: 'Michael Anderson', homeScore: 90.0, awayScore: 115.0, winner: 'Michael Anderson', isPlayoff: false }
            ]
          }
        ],
        h2hStreaks: [
          {
            winner: 'Michael Anderson',
            loser: 'Dylan Soth',
            streak: 3,
            startYear: 2024,
            startWeek: 1,
            endYear: 2025,
            endWeek: 4,
            active: true,
            type: 'overall'
          }
        ]
      };

      // Before sync: streak is active
      expect(mockLeagueData.h2hStreaks[0].active).toBe(true);

      // Perform sync
      syncH2HDataAndStreaks(mockLeagueData, true);

      // After sync: 2026 game is added, Michael's streak is ended (active: false)
      const pair = mockLeagueData.h2hData.find(p => p.owner1 === 'Dylan Soth' && p.owner2 === 'Michael Anderson');
      expect(pair.games.length).toBe(4);
      expect(pair.wins1).toBe(1);
      expect(pair.wins2).toBe(3);

      const michaelStreak = mockLeagueData.h2hStreaks.find(s => s.winner === 'Michael Anderson' && s.loser === 'Dylan Soth' && s.type === 'overall');
      expect(michaelStreak).toBeDefined();
      expect(michaelStreak.active).toBe(false);
      expect(michaelStreak.streak).toBe(3);
      expect(michaelStreak.endYear).toBe(2025);
      expect(michaelStreak.endWeek).toBe(4);
    });

    it('should create new pair entries for rookie managers who have never played', () => {
      const mockLeagueData = {
        allMatchups: [
          { seasonYear: 2026, weekNumber: 1, homeOwner: 'Alex', awayOwner: 'Trace', homeScore: 180.0, awayScore: 113.0, winner: 'Alex' }
        ],
        h2hData: [],
        h2hStreaks: []
      };

      syncH2HDataAndStreaks(mockLeagueData, false);

      expect(mockLeagueData.h2hData.length).toBe(1);
      const pair = mockLeagueData.h2hData[0];
      expect(pair.owner1).toBe('Alex');
      expect(pair.owner2).toBe('Trace');
      expect(pair.wins1).toBe(1);
      expect(pair.wins2).toBe(0);
      expect(pair.games.length).toBe(1);
    });
  });
});

