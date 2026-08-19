import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('E2E DOM Integration Test', () => {
  let leagueData;

  beforeEach(() => {
    const raw = fs.readFileSync(path.resolve(__dirname, '../public/data/leagueData.json'), 'utf-8');
    leagueData = JSON.parse(raw);
    window.LEAGUE_DATA = leagueData;
  });

  it('should successfully load league data with valid teams, seasons, and matchups', () => {
    expect(window.LEAGUE_DATA.seasons).toContain(2026);
    expect(window.LEAGUE_DATA.teams.length).toBeGreaterThan(5);
    expect(window.LEAGUE_DATA.allTimeStandings.length).toBeGreaterThan(5);
    expect(window.LEAGUE_DATA.allMatchups.length).toBeGreaterThan(50);
    expect(window.LEAGUE_DATA.championships.length).toBeGreaterThan(3);
    expect(window.LEAGUE_DATA.seasonData['2025'].standings.length).toBeGreaterThan(5);
  });
});
