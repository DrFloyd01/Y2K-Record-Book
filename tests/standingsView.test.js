import { describe, it, expect } from 'vitest';
import { buildDynastyLeaderboardRows } from '../src/components/standingsView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Standings View Component', () => {
  const mockLeaderboard = [
    {
      ownerName: "Aidan O'Sullivan",
      seasonsCount: 7,
      playoffWins: 5,
      playoffLosses: 4,
      playoffWinPct: 55.6,
      playoffPct: 71.4,
      playoffApps: 5,
      playoffYears: [2018, 2019, 2021, 2023, 2024],
      coachingEfficiency: 91.2,
      dOhs: 2,
      dOhDetails: [
        { year: 2023, week: 5, benchPlayer: 'Puka Nacua', benchPoints: 22.0, starter: 'Drake London', starterPoints: 4.0, netGain: 18.0 }
      ],
      championships: { '1st': 1, '2nd': 0, '3rd': 1, '4th': 1, scoringTitles: 1 },
      finishes: {
        '1st': [{ year: 2021, teamName: 'Title Team', rank: 1 }],
        '3rd': [{ year: 2019, teamName: 'Bronze Team', rank: 3 }]
      }
    },
    {
      ownerName: 'Dylan',
      seasonsCount: 8,
      playoffWins: 8,
      playoffLosses: 4,
      playoffWinPct: 66.7,
      playoffPct: 87.5,
      playoffApps: 7,
      coachingEfficiency: 93.5,
      dOhs: 1,
      championships: { '1st': 2, scoringTitles: 2 },
      finishes: {
        '1st': [{ year: 2022, rank: 1 }, { year: 2025, rank: 1 }]
      }
    }
  ];

  const mockChampionships = [
    { seasonYear: 2021, scoringChampOwner: "Aidan O'Sullivan", scoringChampTeam: 'High Scorer', scoringChampPF: 1850.5 },
    { seasonYear: 2022, scoringChampOwner: 'Dylan', scoringChampTeam: 'Globo Gym', scoringChampPF: 1920.0 }
  ];

  it('should render dynasty leaderboard rows with CRT theme including Coaching Eff and D\'Ohs', () => {
    const html = buildDynastyLeaderboardRows({
      leaderboard: mockLeaderboard,
      championships: mockChampionships,
      theme: CRT_THEME
    });

    expect(html).toContain("data-owner=\"Aidan%20O'Sullivan\"");
    expect(html).toContain('text-emerald-300');
    expect(html).toContain('🏆 1st Place Championships');
    expect(html).toContain('🎯 1');
    expect(html).toContain('91.2%');
    expect(html).toContain('🤦‍♂️ 2');
    expect(html).toContain('Puka Nacua');
  });

  it('should render dynasty leaderboard rows with Pride theme', () => {
    const html = buildDynastyLeaderboardRows({
      leaderboard: mockLeaderboard,
      championships: mockChampionships,
      theme: PRIDE_THEME
    });

    expect(html).toContain('Dylan');
    expect(html).toContain('93.5%');
  });

  it('should map target fields and sort asc/desc correctly', async () => {
    const { getStandingsTargetField, getStandingsDefaultSortAsc, isStandingsWLSort } = await import('../src/components/standingsView.js');

    // Franchise Team clicks map to W-L ('wins')
    expect(getStandingsTargetField('teamName', 2026)).toBe('wins');
    expect(getStandingsTargetField('teamName', 'allTime')).toBe('winPct');

    // Season vs All-Time mappings
    expect(getStandingsTargetField('wins', 2026)).toBe('wins');
    expect(getStandingsTargetField('wins', 'allTime')).toBe('winPct');
    expect(getStandingsTargetField('ovrRecord', 2026)).toBe('ovrRecord');
    expect(getStandingsTargetField('ovrRecord', 'allTime')).toBe('ovrWinPct');

    // Default sort asc: only 'rank' defaults to true (ascending 1..12)
    expect(getStandingsDefaultSortAsc('rank')).toBe(true);
    expect(getStandingsDefaultSortAsc('wins')).toBe(false);
    expect(getStandingsDefaultSortAsc('pointsFor')).toBe(false);
    expect(getStandingsDefaultSortAsc('ovrRecord')).toBe(false);

    // W-L sort detection for static row index vs standing rank in '#' column
    expect(isStandingsWLSort('rank')).toBe(true);
    expect(isStandingsWLSort('wins')).toBe(true);
    expect(isStandingsWLSort('winPct')).toBe(true);
    expect(isStandingsWLSort('pointsFor')).toBe(false);
    expect(isStandingsWLSort('ovrRecord')).toBe(false);
    expect(isStandingsWLSort('luck')).toBe(false);
  });

  it('should correctly parse numerical OVR metrics', async () => {
    const { getOvrSortMetrics } = await import('../src/components/standingsView.js');

    expect(getOvrSortMetrics({ ovrWins: 11, ovrLosses: 0, ovrWinPct: 100 })).toEqual({
      wins: 11,
      losses: 0,
      winPct: 100
    });

    expect(getOvrSortMetrics({ ovrRecord: '5-6', ovrWinPct: 45.5 })).toEqual({
      wins: 5,
      losses: 6,
      winPct: 45.5
    });

    expect(getOvrSortMetrics({ ovrRecord: '1-10' })).toEqual({
      wins: 1,
      losses: 10,
      winPct: (1 / 11) * 100
    });
  });

  it('should sort OVR numerically rather than alphabetically', async () => {
    const { sortStandingsList } = await import('../src/components/standingsView.js');

    const sample = [
      { teamName: 'Team C', ovrRecord: '1-10', ovrWins: 1, ovrLosses: 10, pointsFor: 100, rank: 11 },
      { teamName: 'Team A', ovrRecord: '11-0', ovrWins: 11, ovrLosses: 0, pointsFor: 190, rank: 1 },
      { teamName: 'Team B', ovrRecord: '5-6', ovrWins: 5, ovrLosses: 6, pointsFor: 140, rank: 6 },
      { teamName: 'Team D', ovrRecord: '0-11', ovrWins: 0, ovrLosses: 11, pointsFor: 80, rank: 12 }
    ];

    // Descending sort (default when clicking OVR)
    const sortedDesc = sortStandingsList([...sample], {
      sortField: 'ovrRecord',
      sortAsc: false,
      currentSeason: 2026
    });

    expect(sortedDesc.map(t => t.teamName)).toEqual(['Team A', 'Team B', 'Team C', 'Team D']);
    expect(sortedDesc.map(t => t.ovrRecord)).toEqual(['11-0', '5-6', '1-10', '0-11']);

    // Ascending sort (toggled on second click)
    const sortedAsc = sortStandingsList([...sample], {
      sortField: 'ovrRecord',
      sortAsc: true,
      currentSeason: 2026
    });

    expect(sortedAsc.map(t => t.teamName)).toEqual(['Team D', 'Team C', 'Team B', 'Team A']);
  });

  it('should sort by wins with pointsFor and rank tiebreakers', async () => {
    const { sortStandingsList } = await import('../src/components/standingsView.js');

    const sample = [
      { teamName: 'Team Tied Lower PF', wins: 1, losses: 0, pointsFor: 140.0, rank: 2 },
      { teamName: 'Team Tied Higher PF', wins: 1, losses: 0, pointsFor: 160.0, rank: 1 },
      { teamName: 'Team 0 Wins', wins: 0, losses: 1, pointsFor: 130.0, rank: 3 }
    ];

    const sorted = sortStandingsList([...sample], {
      sortField: 'wins',
      sortAsc: false,
      currentSeason: 2026
    });

    expect(sorted[0].teamName).toBe('Team Tied Higher PF');
    expect(sorted[1].teamName).toBe('Team Tied Lower PF');
    expect(sorted[2].teamName).toBe('Team 0 Wins');
  });
});
