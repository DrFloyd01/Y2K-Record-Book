import { describe, it, expect } from 'vitest';
import { buildH2HComparisonBannerHtml, buildH2HGameLogRows } from '../src/components/h2hView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('H2H View Component', () => {
  const mockBreakdown = {
    o1: 'Dylan',
    o2: 'Phillip',
    games: [
      { year: 2024, week: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 120.0, awayOwner: 'Phillip', awayTeam: 'TDS', awayScore: 110.0, winner: 'Dylan', isPlayoff: false },
      { year: 2024, week: 15, homeOwner: 'Phillip', homeTeam: 'TDS', homeScore: 130.0, awayOwner: 'Dylan', awayTeam: 'Globo Gym', awayScore: 105.0, winner: 'Phillip', isPlayoff: true, stage: 'Finals' }
    ],
    regW1: 1, regW2: 0, regTies: 0,
    playW1: 0, playW2: 1, playTies: 0,
    totW1: 1, totW2: 1, totTies: 0,
    ovrStreak: 'Phillip W1',
    regStreak: 'Dylan W1',
    playStreak: 'Phillip W1',
    maxStreak: { winner: 'Dylan', streak: 4, span: '2021 W1 - 2022 W10' }
  };

  it('should render H2H comparison banner with CRT theme', () => {
    const html = buildH2HComparisonBannerHtml({
      breakdown: mockBreakdown,
      theme: CRT_THEME
    });

    expect(html).toContain('Dylan 1 - 0 Phillip');
    expect(html).toContain('Dylan 0 - 1 Phillip');
    expect(html).toContain('Dylan (4 Wins)');
    expect(html).toContain('crt-glow');
  });

  it('should render H2H comparison banner with Pride theme', () => {
    const html = buildH2HComparisonBannerHtml({
      breakdown: mockBreakdown,
      theme: PRIDE_THEME
    });

    expect(html).toContain('Dylan 1 - 0 Phillip');
    expect(html).toContain('crt-glow-pink-pink');
    expect(html).toContain('bg-white/60');
  });

  it('should render game log rows accurately', () => {
    const html = buildH2HGameLogRows({
      games: mockBreakdown.games,
      theme: CRT_THEME
    });

    expect(html).toContain('120.00 - 110.00');
    expect(html).toContain('130.00 - 105.00');
    expect(html).toContain('Finals');
  });
});
