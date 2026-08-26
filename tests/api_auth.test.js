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

  it('should extract matchup pairs and scores from Yahoo HTML blocks', () => {
    const sampleHtml = `
      <section class="matchup">
        <a class="F-link">The Dawn of Man-Ape</a>
        <span class="score">124.50</span>
        <a class="F-link">Ho Chi Win City</a>
        <span class="score">112.30</span>
      </section>
    `;
    const blockRegex = /<section[^>]*class="[^"]*matchup[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
    const match = blockRegex.exec(sampleHtml);
    expect(match).not.toBeNull();

    const teamNames = [...match[1].matchAll(/<a[^>]*class="[^"]*F-link[^"]*"[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
    const scores = [...match[1].matchAll(/<span[^>]*class="[^"]*score[^"]*"[^>]*>([0-9.]+)<\/span>/gi)].map(m => parseFloat(m[1]));

    expect(teamNames).toEqual(['The Dawn of Man-Ape', 'Ho Chi Win City']);
    expect(scores).toEqual([124.50, 112.30]);
  });
});
