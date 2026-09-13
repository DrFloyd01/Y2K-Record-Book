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

  it('should render 1-week labels for 2018 Y2K and 2-week labels for 2018 Pride Guys', () => {
    const y2kMatchups = [
      { seasonYear: 2018, weekNumber: 15, stage: 'Semi-Finals', homeOwner: 'Dylan', homeTeam: 'The Waterboys', homeScore: 134.37, awayOwner: 'Phillip', awayTeam: 'TDS', awayScore: 136.85, homeSeed: 1, awaySeed: 4 },
      { seasonYear: 2018, weekNumber: 16, stage: 'Nebuchadnezzar Cup', homeOwner: 'Phillip', homeTeam: 'TDS', homeScore: 159.34, awayOwner: 'Trace', awayTeam: 'ProudER', awayScore: 156.14, homeSeed: 1, awaySeed: 2 }
    ];

    const y2kHtml = buildPlayoffBracketHtml({
      season: 2018,
      playoffMatchups: y2kMatchups,
      championship: null,
      theme: CRT_THEME
    });

    expect(y2kHtml).toContain('WEEK 15');
    expect(y2kHtml).toContain('WEEK 16');
    expect(y2kHtml).not.toContain('WEEKS 14+15');
    expect(y2kHtml).not.toContain('WEEKS 16+17');

    const prideMatchups = [
      { seasonYear: 2018, weekNumber: 14, stage: 'Semi-Finals', homeOwner: 'Trace', homeTeam: 'ProudER', homeScore: 198, awayOwner: 'James', awayTeam: 'Beating Goff', awayScore: 193, homeSeed: 1, awaySeed: 4 }
    ];

    const prideHtml = buildPlayoffBracketHtml({
      season: 2018,
      playoffMatchups: prideMatchups,
      championship: null,
      theme: PRIDE_THEME
    });

    expect(prideHtml).toContain('WEEKS 14+15');
  });

  it('should render consolation ladder and draft order tournament when ladder matchups exist', () => {
    const ladderMatchups = [
      { seasonYear: 2025, weekNumber: 15, stage: 'Consolation Ladder', homeOwner: 'Nathan', homeTeam: 'Defense #1', homeScore: 100, awayOwner: 'Aidan', awayTeam: 'JD Vance', awayScore: 110, rawTier: 'LOSERS_CONSOLATION_LADDER' },
      { seasonYear: 2025, weekNumber: 16, stage: 'Consolation Ladder', homeOwner: 'Nathan', homeTeam: 'Defense #1', homeScore: 95, awayOwner: 'Phil', awayTeam: 'Joey Chestnuts', awayScore: 90, rawTier: 'LOSERS_CONSOLATION_LADDER' }
    ];

    const html = buildPlayoffBracketHtml({
      season: 2025,
      playoffMatchups: ladderMatchups,
      championship: null,
      theme: PRIDE_THEME
    });

    expect(html).toContain('CONSOLATION LADDER &amp; DRAFT ORDER TOURNAMENT');
    expect(html).toContain('FINAL LADDER PLACEMENT');
  });
});
