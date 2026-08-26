import { describe, it, expect } from 'vitest';
import { getNormalizedPlayerName, getPlayerRingInfo } from '../src/analytics/rings.js';

describe('Rings Analytics Module', () => {
  it('should normalize player names removing generational suffixes and standardizing teams', () => {
    expect(getNormalizedPlayerName('Marvin Harrison Jr.')).toBe('Marvin Harrison');
    expect(getNormalizedPlayerName('Kenneth Walker III')).toBe('Kenneth Walker');
    expect(getNormalizedPlayerName('Brian Robinson Jr.')).toBe('Brian Robinson');
    expect(getNormalizedPlayerName('T.J. Hockenson')).toBe('TJ Hockenson');
    expect(getNormalizedPlayerName('Pittsburgh Steelers D/ST')).toBe('Pittsburgh Steelers');
    expect(getNormalizedPlayerName('San Francisco 49ers DEF')).toBe('San Francisco 49ers');
  });

  it('should retrieve ring info from lookup table', () => {
    const mockLeagueData = {
      playerRingsLookup: {
        'Travis Kelce': {
          player: 'Travis Kelce',
          ringsCount: 2,
          rings: [
            { year: 2022, ringNumber: 1, role: 'Starter', owner: 'Dylan', team: 'Globo Gym' },
            { year: 2024, ringNumber: 2, role: 'Starter', owner: 'Dylan', team: 'Globo Gym' }
          ]
        }
      }
    };

    const info = getPlayerRingInfo(mockLeagueData, 'Travis Kelce');
    expect(info).not.toBeNull();
    expect(info.ringsCount).toBe(2);
    expect(info.rings[0].year).toBe(2022);
  });

  it('should return null for players without rings or empty dataset', () => {
    expect(getPlayerRingInfo(null, 'Patrick Mahomes')).toBeNull();
    expect(getPlayerRingInfo({}, 'Unknown Player')).toBeNull();
  });
});
