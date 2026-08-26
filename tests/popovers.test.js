import { describe, it, expect } from 'vitest';
import { buildStatCardTop5Popover, getPlayerLifetimeDraftPopover, getPlayerRingBadgeHtml } from '../src/components/popovers.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Popovers Component Module', () => {
  const mockLeagueData = {
    seasons: [2024],
    allMatchups: [
      { seasonYear: 2024, weekNumber: 1, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 150.0, awayScore: 120.0, homeTeam: 'Globo Gym', awayTeam: 'Show Me Dem TDS', isPlayoff: false }
    ],
    seasonData: {
      '2024': {
        draftPicks: [
          { round: 1, pickInRound: 1, overallPick: 1, player: 'CeeDee Lamb', ownerName: 'Dylan', teamName: 'Globo Gym' }
        ]
      }
    },
    playerRingsLookup: {
      'Travis Kelce': {
        player: 'Travis Kelce',
        ringsCount: 1,
        rings: [{ year: 2024, ringNumber: 1, role: 'Starter', owner: 'Dylan', team: 'Globo Gym', draftInfo: 'Round 1 Pick 12' }]
      }
    }
  };

  it('should render CRT themed popovers correctly', () => {
    const popover = buildStatCardTop5Popover({
      cardTitle: 'JUGGERNAUT',
      metricKey: 'juggernaut',
      season: 2024,
      leagueData: mockLeagueData,
      theme: CRT_THEME
    });

    expect(popover).toContain('border-emerald-500');
    expect(popover).toContain('TOP 5: JUGGERNAUT');
    expect(popover).toContain('Dylan');
  });

  it('should render Pride Guys themed popovers correctly', () => {
    const popover = buildStatCardTop5Popover({
      cardTitle: 'APEX PREDATOR',
      metricKey: 'apex',
      season: 2024,
      leagueData: mockLeagueData,
      theme: PRIDE_THEME
    });

    expect(popover).toContain('border-pink-400');
    expect(popover).toContain('TOP 5: APEX PREDATOR');
  });

  it('should render ring badges with matching theme styles', () => {
    const crtRing = getPlayerRingBadgeHtml({ playerName: 'Travis Kelce', leagueData: mockLeagueData, theme: CRT_THEME });
    expect(crtRing).toContain('border-amber-500');
    expect(crtRing).toContain('💍');

    const prideRing = getPlayerRingBadgeHtml({ playerName: 'Travis Kelce', leagueData: mockLeagueData, theme: PRIDE_THEME });
    expect(prideRing).toContain('border-amber-300');
  });
});
