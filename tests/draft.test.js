import { describe, it, expect } from 'vitest';
import { getPlayerLifetimeDraftHistory, filterDraftPicks } from '../src/analytics/draft.js';

describe('Draft Analytics Module', () => {
  const mockLeagueData = {
    seasons: [2023, 2024],
    seasonData: {
      '2023': {
        draftPicks: [
          { round: 1, pickInRound: 1, overallPick: 1, player: 'Justin Jefferson', ownerName: 'Dylan', teamName: 'Globo Gym' },
          { round: 1, pickInRound: 2, overallPick: 2, player: 'Ja\'Marr Chase', ownerName: 'Phillip', teamName: 'Show Me Dem TDS' }
        ]
      },
      '2024': {
        draftPicks: [
          { round: 1, pickInRound: 4, overallPick: 4, player: 'Justin Jefferson', ownerName: 'Ryan', teamName: 'Donkey Squad' }
        ]
      }
    }
  };

  it('should find lifetime draft history for a player across all seasons', () => {
    const history = getPlayerLifetimeDraftHistory(mockLeagueData, 'Justin Jefferson');
    expect(history.length).toBe(2);
    expect(history[0].year).toBe(2023);
    expect(history[0].overallPick).toBe(1);
    expect(history[1].year).toBe(2024);
    expect(history[1].ownerName).toBe('Ryan');
  });

  it('should filter picks by search query and round', () => {
    const picks = [
      { round: 1, pickInRound: 1, overallPick: 1, player: 'CeeDee Lamb', ownerName: 'Dylan', teamName: 'Globo Gym' },
      { round: 2, pickInRound: 1, overallPick: 13, player: 'Josh Allen', ownerName: 'Dylan', teamName: 'Globo Gym' },
      { round: 1, pickInRound: 2, overallPick: 2, player: 'Christian McCaffrey', ownerName: 'Alex', teamName: 'Darnold' }
    ];

    const round1Only = filterDraftPicks(picks, { roundVal: '1' });
    expect(round1Only.length).toBe(2);

    const searchPlayer = filterDraftPicks(picks, { searchVal: 'Lamb' });
    expect(searchPlayer.length).toBe(1);
    expect(searchPlayer[0].player).toBe('CeeDee Lamb');

    const searchOwner = filterDraftPicks(picks, { searchVal: 'Dylan' });
    expect(searchOwner.length).toBe(2);
  });
});
