import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  filterLeagueDataByMinYear,
  buildModernAllTimeStandings,
  computeStreaksFromH2H,
  filterPlayerRings,
  buildModernPlayoffStreaks
} from '../src/core/eraFilter.js';

describe('eraFilter module', () => {
  const y2kRaw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/leagueData.json'), 'utf8'));
  const prideRaw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/prideGuysData.json'), 'utf8'));

  describe('Y2K Record Book Modern Era Filtering', () => {
    const modernY2K = filterLeagueDataByMinYear(y2kRaw, 2022);

    it('filters seasons array to 2022 and later', () => {
      expect(modernY2K.seasons).toEqual([2022, 2023, 2024, 2025, 2026]);
      expect(modernY2K.seasons.includes(2021)).toBe(false);
      expect(modernY2K.seasons.includes(2018)).toBe(false);
    });

    it('filters championships to 2022 and later', () => {
      expect(modernY2K.championships.length).toBe(4);
      const years = modernY2K.championships.map(c => c.seasonYear);
      expect(years).toEqual([2022, 2023, 2024, 2025]);
    });

    it('filters allMatchups strictly to >= 2022', () => {
      expect(modernY2K.allMatchups.length).toBeGreaterThan(0);
      modernY2K.allMatchups.forEach(m => {
        const yr = m.seasonYear || m.year;
        expect(yr).toBeGreaterThanOrEqual(2022);
      });
    });

    it('filters seasonData, draftOrders, and championshipRosters', () => {
      expect(modernY2K.seasonData['2021']).toBeUndefined();
      expect(modernY2K.seasonData['2018']).toBeUndefined();
      expect(modernY2K.seasonData['2022']).toBeDefined();
      expect(modernY2K.seasonData['2025']).toBeDefined();

      expect(modernY2K.championshipRosters['2021']).toBeUndefined();
      expect(modernY2K.championshipRosters['2022']).toBeDefined();
    });

    it('correctly recalculates all-time cumulative standings for modern era', () => {
      const dylan = modernY2K.allTimeStandings.find(s => s.ownerName === 'Dylan');
      expect(dylan).toBeDefined();
      expect(dylan.wins).toBe(31); // 5 in '22 + 6 in '23 + 9 in '24 + 11 in '25
      expect(dylan.losses).toBe(25);
      expect(dylan.seasonsCount).toBe(4);
      expect(dylan.championships['1st']).toBe(2); // 2024, 2025 champion

      const phillip = modernY2K.allTimeStandings.find(s => s.ownerName === 'Phillip');
      expect(phillip).toBeDefined();
      expect(phillip.wins).toBe(39);
      expect(phillip.losses).toBe(17);
      expect(phillip.seasonsCount).toBe(4);
      expect(phillip.championships['1st']).toBe(0); // Titles were in 2018, 2020
    });

    it('filters H2H games and recomputes records', () => {
      const dylanPhillip = modernY2K.h2hData.find(p =>
        (p.owner1 === 'Dylan' && p.owner2 === 'Phillip') ||
        (p.owner1 === 'Phillip' && p.owner2 === 'Dylan')
      );
      expect(dylanPhillip).toBeDefined();
      dylanPhillip.games.forEach(g => {
        expect(g.year).toBeGreaterThanOrEqual(2022);
      });
      expect(dylanPhillip.wins1 + dylanPhillip.wins2 + dylanPhillip.ties).toBe(dylanPhillip.games.length);
    });

    it('computes H2H streaks without pre-2022 games', () => {
      expect(modernY2K.h2hStreaks.length).toBeGreaterThan(0);
      modernY2K.h2hStreaks.forEach(s => {
        expect(s.startYear).toBeGreaterThanOrEqual(2022);
        expect(s.endYear).toBeGreaterThanOrEqual(2022);
      });
    });

    it('filters player rings to modern era only', () => {
      expect(modernY2K.allTimePlayerRings.length).toBeGreaterThan(0);
      modernY2K.allTimePlayerRings.forEach(p => {
        p.rings.forEach(r => {
          expect(r.year).toBeGreaterThanOrEqual(2022);
        });
        expect(p.ringsCount).toBe(p.rings.length);
      });
    });
  });

  describe('Pride Guys Modern Era Filtering', () => {
    const modernPride = filterLeagueDataByMinYear(prideRaw, 2022);

    it('filters seasons array to 2022 and later', () => {
      expect(modernPride.seasons).toEqual([2022, 2023, 2024, 2025, 2026]);
      expect(modernPride.seasons.includes(2017)).toBe(false);
      expect(modernPride.seasons.includes(2021)).toBe(false);
    });

    it('excludes managers who retired before 2022 from modern allTimeStandings', () => {
      const javier = modernPride.allTimeStandings.find(s => s.ownerName === 'Javier');
      const zack = modernPride.allTimeStandings.find(s => s.ownerName === 'Zack Wolfskeil');
      const jeff = modernPride.allTimeStandings.find(s => s.ownerName === 'Jeffrey Belcher');
      const andrew = modernPride.allTimeStandings.find(s => s.ownerName === 'Andrew Hullett');

      expect(javier).toBeUndefined();
      expect(zack).toBeUndefined();
      expect(jeff).toBeUndefined();
      expect(andrew).toBeUndefined();
    });

    it('preserves modern active managers and calculates modern standings', () => {
      const trace = modernPride.allTimeStandings.find(s => s.ownerName === 'Trace Bakulich');
      expect(trace).toBeDefined();
      expect(trace.seasonsCount).toBe(4); // 2022, 2023, 2024, 2025

      const austin = modernPride.allTimeStandings.find(s => s.ownerName === 'Austin Geller');
      expect(austin).toBeDefined();
      expect(austin.championships['1st']).toBe(1); // 2022 champion
    });

    it('correctly builds modern victory lap and dumpster fire streaks', () => {
      const streaks = modernPride.allTimeStatRecords;
      expect(streaks.victoryLapList).toBeDefined();
      expect(streaks.victoryLapList.length).toBeGreaterThan(0);
      streaks.victoryLapList.forEach(item => {
        expect(item.streak).toBeLessThanOrEqual(4); // Only 4 concluded seasons (2022-2025)
      });
    });
  });
});
