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

  it('should render dynasty leaderboard rows with CRT theme', () => {
    const html = buildDynastyLeaderboardRows({
      leaderboard: mockLeaderboard,
      championships: mockChampionships,
      theme: CRT_THEME
    });

    expect(html).toContain("data-owner=\"Aidan%20O'Sullivan\"");
    expect(html).toContain('text-emerald-300');
    expect(html).toContain('🏆 1st Place Championships');
    expect(html).toContain('🎯 1');
  });

  it('should render dynasty leaderboard rows with Pride theme', () => {
    const html = buildDynastyLeaderboardRows({
      leaderboard: mockLeaderboard,
      championships: mockChampionships,
      theme: PRIDE_THEME
    });

    expect(html).toContain("data-owner=\"Aidan%20O'Sullivan\"");
    expect(html).toContain('text-purple-950');
    expect(html).toContain('border-pink-100');
  });
});
