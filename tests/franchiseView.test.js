import { describe, it, expect } from 'vitest';
import { buildFranchiseProfileHtml, formatFinishRank } from '../src/components/franchiseView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Franchise View Component', () => {
  const mockStandings = [
    {
      ownerName: 'Dylan',
      teamName: 'Globo Gym',
      seasonsCount: 8,
      wins: 75,
      losses: 35,
      winPct: 68.2,
      playoffRecord: '8-4',
      playoffWinPct: 66.7,
      playoffApps: 7,
      playoffPct: 87.5,
      pointsFor: 12450.5,
      pointsAgainst: 10890.2,
      coachingEfficiency: 92.4,
      dOhs: 3,
      championships: { '1st': 2, scoringTitles: 1 }
    }
  ];

  const mockSeasonData = {
    '2024': {
      standings: [
        { ownerName: 'Dylan', teamName: 'Globo Gym', rank: 1, wins: 11, losses: 3, playoffRecord: '2-0', pointsFor: 1850.2, isScoringChamp: true, coachingEfficiency: 93.1, dOhs: 1 }
      ]
    }
  };

  const mockDraftProfiles = {
    'Dylan': {
      archetype: 'The Value Harvester',
      reachRating: 'Value Hunter',
      avgReach: -4.2,
      reachColor: 'border-emerald-500 text-emerald-400',
      yearsSample: '8 Years (2018-2025)',
      r1Tendency: 'Hero RB Anchor',
      r1Detail: '63% RB in Round 1',
      posDistribution: 'RB Heavy',
      favoritePlayer: 'Christian McCaffrey',
      favoritePlayerDrafted: 'Drafted 3x (2020, 2021, 2024)',
      scoutingReport: 'Prefers elite volume running backs.'
    }
  };

  it('should format finish ranks correctly', () => {
    expect(formatFinishRank(1)).toBe('🥇 1st');
    expect(formatFinishRank(2)).toBe('🥈 2nd');
    expect(formatFinishRank(3)).toBe('🥉 3rd');
    expect(formatFinishRank(4)).toBe('4th');
    expect(formatFinishRank(10)).toBe('10th');
    expect(formatFinishRank(null)).toBe('-');
  });

  it('should render franchise profile card with CRT theme', () => {
    const html = buildFranchiseProfileHtml({
      owner: 'Dylan',
      allTimeStandings: mockStandings,
      seasons: [2024],
      seasonData: mockSeasonData,
      draftProfiles: mockDraftProfiles,
      theme: CRT_THEME
    });

    expect(html).toContain('FRANCHISE_DOSSIER');
    expect(html).toContain('Globo Gym');
    expect(html).toContain('75-35');
    expect(html).toContain('COACHING EFF');
    expect(html).toContain("D'OH! BLUNDERS");
    expect(html).toContain('The Value Harvester');
    expect(html).toContain('Hero RB Anchor');
  });

  it('should render franchise profile card with Pride theme', () => {
    const html = buildFranchiseProfileHtml({
      owner: 'Dylan',
      allTimeStandings: mockStandings,
      seasons: [2024],
      seasonData: mockSeasonData,
      draftProfiles: mockDraftProfiles,
      theme: PRIDE_THEME
    });

    expect(html).toContain('Globo Gym');
    expect(html).toContain('text-pink-700');
    expect(html).toContain('The Value Harvester');
  });

  it('should resolve true finish rank from finishes and render all accolades badges', () => {
    const traceStandings = [
      {
        ownerName: 'Trace',
        teamName: 'Proud ER',
        wins: 13,
        losses: 1,
        finishes: {
          '1st': [],
          '2nd': [{ year: 2022, rank: 2, teamName: 'Proud ER' }]
        },
        championships: { '1st': 0, '2nd': 1, scoringTitles: 1 }
      }
    ];

    const multiSeasonData = {
      '2022': {
        standings: [
          {
            ownerName: 'Trace',
            teamName: 'Proud ER',
            rank: 1, // regular season seed was 1, but true finish is 2
            wins: 13,
            losses: 1,
            playoffRecord: '1-1',
            pointsFor: 1684.5,
            weeklyWins: 4,
            luckiestWins: 2,
            heartbreaks: 1,
            toughestLosses: 3,
            dOhs: 2,
            coachingEfficiency: 95.5
          },
          {
            ownerName: 'Austin',
            teamName: 'Dark Brandon',
            rank: 2,
            wins: 8,
            losses: 6,
            playoffRecord: '3-0',
            pointsFor: 1500.0,
            weeklyWins: 1,
            luckiestWins: 0,
            heartbreaks: 0,
            toughestLosses: 0,
            dOhs: 0,
            coachingEfficiency: 88.0
          }
        ]
      }
    };

    const html = buildFranchiseProfileHtml({
      owner: 'Trace',
      allTimeStandings: traceStandings,
      seasons: [2022],
      seasonData: multiSeasonData,
      championships: [{ seasonYear: 2022, firstOwner: 'Austin', scoringChampOwner: 'Trace' }],
      theme: CRT_THEME
    });

    // Should display 🥈 2nd as the finish rank, NOT 1st!
    expect(html).toContain('🥈 2nd');
    expect(html).not.toContain('🥇 1st');

    // Should display playoff record 1-1
    expect(html).toContain('1-1');

    // Should display all accolades Trace earned in 2022:
    // Scoring Champ, Most WWs (4), Most LWs (2), Most HBs (1), Most TLs (3), Most DOs (2), Top EFF% (95.5%)
    expect(html).toContain('🎯 Scoring Champ');
    expect(html).toContain('⚡ Most WWs (4)');
    expect(html).toContain('🍀 Most LWs (2)');
    expect(html).toContain('💔 Most HBs (1)');
    expect(html).toContain('😤 Most TLs (3)');
    expect(html).toContain('🤦‍♂️ Most DOs (2)');
    expect(html).toContain('🧠 Top EFF% (95.5%)');
  });

  it('should hide 2026 from franchise history and draft history until the season concludes', () => {
    const seasons = [2025, 2026];
    const seasonData = {
      '2025': {
        standings: [
          { ownerName: 'Dylan', teamName: 'Globo Gym', rank: 1, wins: 10, losses: 4, playoffRecord: '2-0', pointsFor: 1800.0 }
        ],
        draftPicks: [
          { ownerName: 'Dylan', player: 'C.McCaffrey', round: 1, pickNumber: 1 }
        ]
      },
      '2026': {
        standings: [
          { ownerName: 'Dylan', teamName: 'Globo Gym', rank: 1, wins: 0, losses: 0, playoffRecord: '0-0', pointsFor: 0.0 }
        ],
        draftPicks: [
          { ownerName: 'Dylan', player: 'Bijan Robinson', round: 1, pickNumber: 1 }
        ]
      }
    };
    const championships = [
      { seasonYear: 2025, firstOwner: 'Dylan', scoringChampOwner: 'Dylan' }
    ];

    const html = buildFranchiseProfileHtml({
      owner: 'Dylan',
      allTimeStandings: mockStandings,
      seasons,
      seasonData,
      championships,
      theme: CRT_THEME
    });

    // 2025 should be included
    expect(html).toContain('2025');
    expect(html).toContain('btn-franchise-draft-2025');

    // 2026 should be completely hidden until season concludes
    expect(html).not.toContain('btn-franchise-draft-2026');
    expect(html).not.toMatch(/<td[^>]*>2026<\/td>/);
  });
});
