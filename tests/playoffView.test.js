import { describe, it, expect } from 'vitest';
import { buildPlayoffBracketHtml } from '../src/components/playoffView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Playoff View Component', () => {
  const mockPlayoffMatchups = [
    { seasonYear: 2024, weekNumber: 15, stage: 'Semi-Finals', homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 135.2, awayOwner: 'Phillip', awayTeam: 'TDS', awayScore: 120.1, homeSeed: 1, awaySeed: 4 },
    { seasonYear: 2024, weekNumber: 16, stage: 'Championship Final', homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 145.0, awayOwner: 'Ryan', awayTeam: 'Donkey Squad', awayScore: 130.0, homeSeed: 1, awaySeed: 2 }
  ];

  const mockChampionship = {
    seasonYear: 2024,
    firstTeam: 'Globo Gym',
    firstOwner: 'Dylan',
    secondTeam: 'Donkey Squad',
    secondOwner: 'Ryan',
    thirdTeam: 'TDS',
    thirdOwner: 'Phillip'
  };

  it('should render playoff bracket with CRT theme and podium', () => {
    const html = buildPlayoffBracketHtml({
      season: 2024,
      playoffMatchups: mockPlayoffMatchups,
      championship: mockChampionship,
      theme: CRT_THEME
    });

    expect(html).toContain('PLAYOFF PODIUM FINISHERS');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('Donkey Squad');
    expect(html).toContain('135.20');
    expect(html).toContain('145.00');
  });

  it('should render empty state message when no matchups exist', () => {
    const html = buildPlayoffBracketHtml({
      season: 2026,
      playoffMatchups: [],
      championship: null,
      theme: CRT_THEME
    });

    expect(html).toContain('NO_POSTSEASON_DATA');
  });
});
