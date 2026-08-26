import { describe, it, expect } from 'vitest';
import {
  parseRosterConstraints,
  computeOptimalLineup,
  analyzeDOhMoment,
  computeManagerialLeaderboard
} from '../src/analytics/managerial.js';

describe('Managerial Prowess Analytics Engine', () => {
  describe('Dynamic Roster Constraint Parsing', () => {
    it('should correctly parse 3 WR + 1 Flex configuration (2018, 2019, 2021-2026)', () => {
      const rosterStr = 'BN x5, DEF x1, IR x1, K x1, QB x1, RB x2, TE x1, WR x3, W/R/T x1';
      const c = parseRosterConstraints(rosterStr);
      expect(c.QB).toBe(1);
      expect(c.RB).toBe(2);
      expect(c.WR).toBe(3);
      expect(c.TE).toBe(1);
      expect(c.FLEX).toBe(1);
      expect(c.K).toBe(1);
      expect(c.DEF).toBe(1);
    });

    it('should correctly parse 2 WR + 1 Flex configuration (2020)', () => {
      const rosterStr = 'BN x7, DEF x1, IR x1, K x1, QB x1, RB x2, TE x1, WR x2, W/R/T x1';
      const c = parseRosterConstraints(rosterStr);
      expect(c.QB).toBe(1);
      expect(c.RB).toBe(2);
      expect(c.WR).toBe(2);
      expect(c.TE).toBe(1);
      expect(c.FLEX).toBe(1);
      expect(c.K).toBe(1);
      expect(c.DEF).toBe(1);
    });
  });

  describe('Optimal Lineup & Coaching Efficiency', () => {
    const mockRoster = [
      { slot: 'QB', player: 'Lamar Jackson', position: 'QB', points: 25.4 },
      { slot: 'RB1', player: 'Bijan Robinson', position: 'RB', points: 18.2 },
      { slot: 'RB2', player: 'Derrick Henry', position: 'RB', points: 8.5 },
      { slot: 'WR1', player: 'CeeDee Lamb', position: 'WR', points: 22.0 },
      { slot: 'WR2', player: 'Amon-Ra St. Brown', position: 'WR', points: 16.5 },
      { slot: 'WR3', player: 'Garrett Wilson', position: 'WR', points: 6.2 },
      { slot: 'TE', player: 'Trey McBride', position: 'TE', points: 12.0 },
      { slot: 'W/R/T', player: 'Chuba Hubbard', position: 'RB', points: 7.1 },
      { slot: 'K', player: 'Brandon Aubrey', position: 'K', points: 11.0 },
      { slot: 'DEF', player: 'Pittsburgh', position: 'DEF', points: 9.0 },
      // Bench Players
      { slot: 'BN', player: 'Deebo Samuel', position: 'WR', points: 24.8 }, // Outscored Wilson & Hubbard
      { slot: 'BN', player: 'Jordan Mason', position: 'RB', points: 19.4 }, // Outscored Henry & Hubbard
      { slot: 'BN', player: 'Isaiah Likely', position: 'TE', points: 4.2 }
    ];

    it('should compute optimal score and coaching efficiency for 3 WR + 1 Flex', () => {
      const constraints = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1 };
      const res = computeOptimalLineup(mockRoster, constraints);

      // Actual Score: 25.4 + 18.2 + 8.5 + 22.0 + 16.5 + 6.2 + 12.0 + 7.1 + 11.0 + 9.0 = 135.9
      expect(res.actualScore).toBe(135.9);

      // Optimal Starters should swap:
      // - RB: Bijan (18.2), Mason (19.4)
      // - WR: Lamb (22.0), Deebo (24.8), Amon-Ra (16.5)
      // - TE: McBride (12.0)
      // - FLEX: Henry (8.5)
      // - QB: Lamar (25.4), K: Aubrey (11.0), DEF: Pitt (9.0)
      // Optimal Score: 25.4 + 18.2 + 19.4 + 22.0 + 24.8 + 16.5 + 12.0 + 8.5 + 11.0 + 9.0 = 166.8
      expect(res.optimalScore).toBe(166.8);
      expect(res.pointsLeftOnBench).toBe(30.9);
      expect(res.coachingEfficiency).toBe(81.5);
    });
  });

  describe('The "D\'Oh!" Blunder Detector 🤦‍♂️', () => {
    it('should identify a single-swap win opportunity when manager lost a close game', () => {
      const starters = [
        { slot: 'QB', player: 'Josh Allen', position: 'QB', points: 20.0 },
        { slot: 'RB1', player: 'Breece Hall', position: 'RB', points: 14.0 },
        { slot: 'RB2', player: 'Javonte Williams', position: 'RB', points: 4.5 },
        { slot: 'WR1', player: 'Justin Jefferson', position: 'WR', points: 18.0 },
        { slot: 'WR2', player: 'Terry McLaurin', position: 'WR', points: 7.0 },
        { slot: 'TE', player: 'Travis Kelce', position: 'TE', points: 10.0 },
        { slot: 'FLEX', player: 'Christian Watson', position: 'WR', points: 3.2 }
      ];
      // Team Total = 76.7 pts

      const bench = [
        { slot: 'BN', player: 'James Conner', position: 'RB', points: 22.5 },
        { slot: 'BN', player: 'Romeo Doubs', position: 'WR', points: 5.0 }
      ];

      const oppScore = 88.0; // Deficit = 11.3 pts

      const dOh = analyzeDOhMoment(starters, bench, oppScore);
      expect(dOh.dOhOccurred).toBe(true);
      expect(dOh.bestSwap).not.toBeNull();
      // Swapping Conner (22.5) for Watson (3.2) gives +19.3 pts -> 76.7 + 19.3 = 96.0 > 88.0 (Win by 8.0 pts)
      expect(dOh.bestSwap.benchPlayer).toBe('James Conner');
      expect(dOh.bestSwap.starter).toBe('Christian Watson');
      expect(dOh.bestSwap.netGain).toBe(19.3);
      expect(dOh.bestSwap.winMargin).toBe(8.0);
    });

    it('should return false if team already won the game', () => {
      const starters = [{ slot: 'QB', player: 'Allen', position: 'QB', points: 30.0 }];
      const bench = [{ slot: 'BN', player: 'Mahomes', position: 'QB', points: 40.0 }];
      const oppScore = 20.0;

      const dOh = analyzeDOhMoment(starters, bench, oppScore);
      expect(dOh.dOhOccurred).toBe(false);
      expect(dOh.bestSwap).toBeNull();
    });

    it('should return false if no single bench swap could overcome the deficit', () => {
      const starters = [
        { slot: 'QB', player: 'Goff', position: 'QB', points: 12.0 },
        { slot: 'RB1', player: 'Moss', position: 'RB', points: 5.0 }
      ];
      // Team Total = 17.0
      const bench = [
        { slot: 'BN', player: 'Ford', position: 'RB', points: 12.0 } // +7 gain -> 24.0
      ];
      const oppScore = 50.0; // 50.0 is way too far away for a single swap to fix

      const dOh = analyzeDOhMoment(starters, bench, oppScore);
      expect(dOh.dOhOccurred).toBe(false);
      expect(dOh.bestSwap).toBeNull();
    });
  });

  describe('Seasonal Managerial Summary & Leaderboard', () => {
    it('should compute coaching efficiency and rank managers accurately', () => {
      const mockWeeklyLineups = [
        {
          ownerName: 'Dylan',
          teamName: 'Globo Gym',
          week: 1,
          seasonYear: 2024,
          actualScore: 120.0,
          optimalScore: 130.0,
          isWin: true,
          dOhOccurred: false
        },
        {
          ownerName: 'Dylan',
          teamName: 'Globo Gym',
          week: 2,
          seasonYear: 2024,
          actualScore: 110.0,
          optimalScore: 120.0,
          isLoss: true,
          dOhOccurred: true,
          dOhDetails: {
            starter: 'Player A',
            benchPlayer: 'Player B',
            netGain: 15.0,
            winMargin: 5.0
          }
        },
        {
          ownerName: 'Alex',
          teamName: 'Darnold Schwarzenegger',
          week: 1,
          seasonYear: 2024,
          actualScore: 100.0,
          optimalScore: 150.0,
          isLoss: true,
          dOhOccurred: false
        }
      ];

      const lb = computeManagerialLeaderboard(mockWeeklyLineups);
      expect(lb.length).toBe(2);

      // Dylan actual 230 / optimal 250 = 92.0% efficiency
      const dylan = lb.find(m => m.ownerName === 'Dylan');
      expect(dylan.coachingEfficiency).toBe(92.0);
      expect(dylan.dOhCount).toBe(1);
      expect(dylan.dOhRate).toBe(100.0); // 1 D'Oh out of 1 loss = 100%

      // Alex actual 100 / optimal 150 = 66.7% efficiency
      const alex = lb.find(m => m.ownerName === 'Alex');
      expect(alex.coachingEfficiency).toBe(66.7);
      expect(alex.dOhCount).toBe(0);

      // Leaderboard is sorted by coaching efficiency descending
      expect(lb[0].ownerName).toBe('Dylan');
      expect(lb[1].ownerName).toBe('Alex');
    });
  });
});
