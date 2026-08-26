import { describe, it, expect } from 'vitest';
import {
  sortMatchupsByStandingRank,
  buildWeeklyMatchupsGridHtml,
  buildManagerSeasonGameLogHtml,
  formatPlayoffStageTag
} from '../src/components/matchupsView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Matchups View Component', () => {
  const mockRankMap = {
    'Dylan': { rank: 1, rec: '11-3' },
    'Phillip': { rank: 2, rec: '10-4' },
    'Jasper': { rank: 3, rec: '9-5' },
    'Tess': { rank: 4, rec: '8-6' },
    'Trace': { rank: 5, rec: '7-7' },
    'Casey': { rank: 6, rec: '7-7' },
    'Mike': { rank: 7, rec: '6-8' },
    'Boaz': { rank: 8, rec: '5-9' },
    'Dustin': { rank: 9, rec: '4-10' },
    'Ryan': { rank: 10, rec: '3-11' }
  };

  const mockMatchups = [
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dustin', homeTeam: 'Dustin Team', homeScore: 110.0, awayOwner: 'Ryan', awayTeam: 'Ryan Team', awayScore: 105.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 150.1, awayOwner: 'Tess', awayTeam: 'Tess Team', awayScore: 120.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Phillip', homeTeam: 'Phillip Team', homeScore: 140.0, awayOwner: 'Jasper', awayTeam: 'Jasper Team', awayScore: 135.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Trace', homeTeam: 'Trace Team', homeScore: 125.0, awayOwner: 'Mike', awayTeam: 'Mike Team', awayScore: 115.0 },
    { seasonYear: 2025, weekNumber: 1, homeOwner: 'Casey', homeTeam: 'Casey Team', homeScore: 130.0, awayOwner: 'Boaz', awayTeam: 'Boaz Team', awayScore: 128.0 }
  ];

  it('should sort matchups by standing ranks so marquee games come first', () => {
    const sorted = sortMatchupsByStandingRank(mockMatchups, mockRankMap);
    expect(sorted[0].homeOwner).toBe('Dylan'); // #1 vs #4
    expect(sorted[1].homeOwner).toBe('Phillip'); // #2 vs #3
    expect(sorted[sorted.length - 1].homeOwner).toBe('Dustin'); // #9 vs #10
  });

  it('should render 5-across weekly grid in CRT theme', () => {
    const html = buildWeeklyMatchupsGridHtml({
      matchups: mockMatchups,
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      mode: 'recap',
      theme: CRT_THEME
    });

    expect(html).toContain('MATCHUP #1');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('150.10');
    expect(html).toContain('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5');
  });

  it('should render 5-across weekly grid in Pride theme', () => {
    const html = buildWeeklyMatchupsGridHtml({
      matchups: mockMatchups,
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      mode: 'recap',
      theme: PRIDE_THEME
    });

    expect(html).toContain('MATCHUP #1');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('border-pink-200');
  });

  it('should render manager full-season game log', () => {
    const dylanGames = [
      { seasonYear: 2025, weekNumber: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 150.1, awayOwner: 'Tess', awayTeam: 'Tess Team', awayScore: 120.0 },
      { seasonYear: 2025, weekNumber: 2, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 174.48, awayOwner: 'Trace', awayTeam: 'Trace Team', awayScore: 178.78 }
    ];

    const html = buildManagerSeasonGameLogHtml({
      owner: 'Dylan',
      season: 2025,
      matchups: dylanGames,
      rankMap: mockRankMap,
      theme: CRT_THEME
    });

    expect(html).toContain("Dylan — 2025 Season Game Log");
    expect(html).toContain("WIN");
    expect(html).toContain("LOSS");
    expect(html).toContain("Margin:");
  });

  it('should format playoff stage tags properly', () => {
    expect(formatPlayoffStageTag('championship', 2025)).toContain('Finals');
    expect(formatPlayoffStageTag('semifinals', 2025)).toContain('Semifinal');
    expect(formatPlayoffStageTag('3rd_place', 2025)).toContain('3rd Place');
  });
});
