import { describe, it, expect } from 'vitest';

describe('API Authentication & Cookie Validation', () => {
  it('should validate ESPN SWID GUID format with braces', () => {
    const validSwid = '{12345678-ABCD-EF01-2345-6789ABCDEF01}';
    const invalidSwid = 'invalid_swid_string';
    const swidRegex = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

    expect(swidRegex.test(validSwid)).toBe(true);
    expect(swidRegex.test(invalidSwid)).toBe(false);
  });

  it('should construct valid ESPN API v3 URL with views', () => {
    const season = 2024;
    const leagueId = 123456;
    const views = ['mSettings', 'mTeam', 'mRoster', 'mMatchupScore', 'mStandings', 'kona_player_info'];
    const viewParams = views.map(v => `view=${v}`).join('&');
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${viewParams}`;

    expect(url).toContain('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024');
    expect(url).toContain('view=kona_player_info');
    expect(url).toContain('view=mMatchupScore');
  });

  it('should format Yahoo Fantasy JSON format query string correctly', () => {
    const baseEndpoint = 'https://fantasysports.yahooapis.com/fantasy/v2/league/449.l.123456/standings';
    const formattedUrl = baseEndpoint.includes('?') ? `${baseEndpoint}&format=json` : `${baseEndpoint}?format=json`;

    expect(formattedUrl).toBe('https://fantasysports.yahooapis.com/fantasy/v2/league/449.l.123456/standings?format=json');
  });
});
