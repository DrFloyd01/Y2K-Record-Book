import { describe, it, expect } from 'vitest';
import {
  buildFranchiseProfileHtml,
  formatFinishRank,
  computeManagerSeasonForm,
  buildSeasonFormHistoryHtml,
  matchesOwner,
  hasMadePlayoffs
} from '../src/components/franchiseView.js';
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

  it('should compute manager season form for full regular season in reverse chronological order', () => {
    const traceStandings = [
      {
        ownerName: 'Trace',
        teamName: 'Gl Hf',
        finishes: {
          '1st': [{ year: 2022, rank: 1 }],
          '2nd': [{ year: 2018, rank: 2 }]
        }
      }
    ];

    const mockSeasons = [2018, 2022, 2024, 2026];
    const mockSeasonData = {
      '2018': { standings: [{ ownerName: 'Trace', teamName: 'Gl Hf', rank: 2, wins: 9, losses: 5, playoffRecord: '1-1' }] },
      '2022': { standings: [{ ownerName: 'Trace', teamName: 'Gl Hf', rank: 1, wins: 8, losses: 6, playoffRecord: '3-0' }] },
      '2024': { standings: [{ ownerName: 'Trace', teamName: 'Gl Hf', rank: 10, wins: 3, losses: 11, playoffRecord: '0-0' }] },
      '2026': { standings: [{ ownerName: 'Trace', teamName: 'Gl Hf', rank: 12, wins: 1, losses: 3, playoffRecord: '0-0' }] }
    };

    const mockMatchups = [
      // 2018
      { seasonYear: 2018, weekNumber: 1, homeOwner: 'Trace', homeScore: 120, awayOwner: 'Dylan', awayScore: 100, isPlayoff: false },
      { seasonYear: 2018, weekNumber: 2, homeOwner: 'Trace', homeScore: 130, awayOwner: 'Phillip', awayScore: 90, isPlayoff: false },
      { seasonYear: 2018, weekNumber: 3, homeOwner: 'Trace', homeScore: 115, awayOwner: 'Ryan', awayScore: 110, isPlayoff: false },
      { seasonYear: 2018, weekNumber: 4, homeOwner: 'Trace', homeScore: 140, awayOwner: 'Casey', awayScore: 105, isPlayoff: false },
      { seasonYear: 2018, weekNumber: 5, homeOwner: 'Trace', homeScore: 90, awayOwner: 'Mike', awayScore: 110, isPlayoff: false },

      // 2022
      { seasonYear: 2022, weekNumber: 1, homeOwner: 'Trace', homeScore: 125, awayOwner: 'Dylan', awayScore: 110, isPlayoff: false },
      { seasonYear: 2022, weekNumber: 2, homeOwner: 'Trace', homeScore: 95, awayOwner: 'Phillip', awayScore: 105, isPlayoff: false },
      { seasonYear: 2022, weekNumber: 3, homeOwner: 'Trace', homeScore: 88, awayOwner: 'Ryan', awayScore: 120, isPlayoff: false },
      { seasonYear: 2022, weekNumber: 4, homeOwner: 'Trace', homeScore: 135, awayOwner: 'Casey', awayScore: 95, isPlayoff: false },

      // 2024
      { seasonYear: 2024, weekNumber: 1, homeOwner: 'Trace', homeScore: 100, awayOwner: 'Dustin', awayScore: 130, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 2, homeOwner: 'Trace', homeScore: 85, awayOwner: 'Casey', awayScore: 115, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 3, homeOwner: 'Trace', homeScore: 90, awayOwner: 'Mike', awayScore: 125, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 4, homeOwner: 'Trace', homeScore: 95, awayOwner: 'Ryan', awayScore: 110, isPlayoff: false },

      // 2026: 1-3 active start
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Trace', homeScore: 95, awayOwner: 'Alex', awayScore: 120, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Trace', homeScore: 80, awayOwner: 'Ryan', awayScore: 130, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 3, homeOwner: 'Trace', homeScore: 88, awayOwner: 'Jasper', awayScore: 90, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 4, homeOwner: 'Trace', homeScore: 120, awayOwner: 'Mike', awayScore: 104, isPlayoff: false }
    ];

    const forms = computeManagerSeasonForm({
      owner: 'Trace',
      seasons: mockSeasons,
      seasonData: mockSeasonData,
      allMatchups: mockMatchups,
      allTimeStandings: traceStandings
    });

    expect(forms).toBeDefined();
    expect(forms.length).toBe(4);

    // Sorted reverse chronological
    expect(forms[0].year).toBe(2026);
    expect(forms[0].isCurrent).toBe(true);
    expect(forms[0].record).toBe('1-3');
    expect(forms[0].formStr).toBe('LLLW');
    expect(forms[0].games.length).toBe(4);

    expect(forms[1].year).toBe(2024);
    expect(forms[1].record).toBe('0-4');
    expect(forms[1].formStr).toBe('LLLL');

    expect(forms[2].year).toBe(2022);
    expect(forms[2].record).toBe('2-2');
    expect(forms[2].formStr).toBe('WLLW');
    expect(forms[2].isChampion).toBe(true);

    expect(forms[3].year).toBe(2018);
    expect(forms[3].record).toBe('4-1');
    expect(forms[3].formStr).toBe('WWWWL');
    expect(forms[3].finalRank).toBe(2);

    // Verify game details (margin, oppOwner)
    const g1 = forms[0].games[0];
    expect(g1.week).toBe(1);
    expect(g1.result).toBe('L');
    expect(g1.oppOwner).toBe('Alex');
    expect(g1.margin).toBe(-25);

    // Helper functions
    expect(matchesOwner('The Big Dongler', 'Javier')).toBe(true);
    expect(matchesOwner('Dylan', 'Dylan')).toBe(true);
    expect(hasMadePlayoffs({ playoffRecord: '2-1' })).toBe(true);
    expect(hasMadePlayoffs({ playoffRecord: '0-0' })).toBe(false);
  });

  it('should render single-column stacked season form history in franchise profile HTML', () => {
    const traceStandings = [
      {
        ownerName: 'Trace',
        teamName: 'Gl Hf (you’re gay)',
        wins: 40,
        losses: 40,
        championships: { '1st': 1, '2nd': 1 }
      }
    ];

    const seasons = [2024, 2026];
    const seasonData = {
      '2024': {
        standings: [
          { ownerName: 'Trace', teamName: 'Gl Hf (you’re gay)', rank: 10, wins: 3, losses: 11, pointsFor: 1500.0, coachingEfficiency: 88.0 }
        ]
      },
      '2026': {
        standings: [
          { ownerName: 'Trace', teamName: 'Gl Hf (you’re gay)', rank: 12, wins: 1, losses: 3, pointsFor: 415.68 }
        ]
      }
    };

    const allMatchups = [
      { seasonYear: 2024, weekNumber: 1, homeOwner: 'Trace', homeScore: 138.16, awayOwner: 'Dustin', awayScore: 169.76, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 2, homeOwner: 'Trace', homeScore: 107.06, awayOwner: 'Casey', awayScore: 157.41, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 3, homeOwner: 'Trace', homeScore: 74.18, awayOwner: 'Mike', awayScore: 132.28, isPlayoff: false },
      { seasonYear: 2024, weekNumber: 4, homeOwner: 'Trace', homeScore: 112.5, awayOwner: 'Ryan', awayScore: 127.2, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 1, homeOwner: 'Trace', homeScore: 113.2, awayOwner: 'Alex', awayScore: 180.56, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 2, homeOwner: 'Trace', homeScore: 87.3, awayOwner: 'Ryan', awayScore: 166.22, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 3, homeOwner: 'Trace', homeScore: 95.12, awayOwner: 'Jasper', awayScore: 97.12, isPlayoff: false },
      { seasonYear: 2026, weekNumber: 4, homeOwner: 'Trace', homeScore: 120.06, awayOwner: 'Mike', awayScore: 104.18, isPlayoff: false }
    ];

    const html = buildFranchiseProfileHtml({
      owner: 'Trace',
      allTimeStandings: traceStandings,
      seasons,
      seasonData,
      allMatchups,
      theme: CRT_THEME
    });

    // Verify Season Form History section
    expect(html).toContain('SEASON_FORM_HISTORY // REGULAR_SEASON_GAME_LOG');
    expect(html).toContain('Regular Season Form &amp; Weekly Matchup Log');
    expect(html).toContain('2026 ACTIVE');
    expect(html).toContain('2024');
    expect(html).toContain('window.jumpToMatchup');

    // Verify 9-column history table remains clean without START (W1-4) column
    expect(html).toContain('FRANCHISE_HISTORY_EVOLUTION');
    expect(html).not.toContain('START (W1-4)');

    // Verify pride theme also renders cleanly
    const prideHtml = buildFranchiseProfileHtml({
      owner: 'Trace',
      allTimeStandings: traceStandings,
      seasons,
      seasonData,
      allMatchups,
      theme: PRIDE_THEME
    });
    expect(prideHtml).toContain('SEASON_FORM_HISTORY // REGULAR_SEASON_GAME_LOG');
    expect(prideHtml).toContain('2026 ACTIVE');
  });
});
