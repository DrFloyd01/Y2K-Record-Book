import { describe, it, expect } from 'vitest';
import { buildFranchiseProfileHtml } from '../src/components/franchiseView.js';
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
});
