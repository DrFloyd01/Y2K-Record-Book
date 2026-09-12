import { describe, it, expect } from 'vitest';
import {
  buildWeeklyMatchupsGridHtml,
  buildManagerSeasonGameLogHtml
} from '../src/components/matchupsView.js';
import { getStatCardTop5 } from '../src/analytics/statRecords.js';
import { buildStatCardTop5Popover, getPlayerRingBadgeHtml } from '../src/components/popovers.js';
import { buildH2HGameLogRows } from '../src/components/h2hView.js';
import { buildDynastyLeaderboardRows } from '../src/components/standingsView.js';
import { buildPlayoffBracketHtml } from '../src/components/playoffView.js';
import { CRT_THEME } from '../src/theme/theme.js';

describe('Jump Navigation & Deep Linking Features', () => {
  const mockRankMap = {
    'Dylan': { rank: 1, rec: '1-0' },
    'Tess': { rank: 2, rec: '0-1' }
  };

  const mockMatchups = [
    {
      seasonYear: 2025,
      weekNumber: 1,
      homeOwner: 'Dylan',
      homeTeam: 'Globo Gym',
      homeScore: 150.1,
      awayOwner: 'Tess',
      awayTeam: 'Tess Team',
      awayScore: 120.0
    }
  ];

  const mockLeagueData = {
    allMatchups: [
      {
        seasonYear: 2024,
        weekNumber: 3,
        homeOwner: 'Dylan',
        homeTeam: 'Globo Gym',
        homeScore: 165.5,
        awayOwner: 'Trace',
        awayTeam: 'Trace Team',
        awayScore: 110.2,
        isPlayoff: false
      },
      {
        seasonYear: 2024,
        weekNumber: 7,
        homeOwner: 'Trace',
        homeTeam: 'Trace Team',
        homeScore: 140.0,
        awayOwner: 'Dylan',
        awayTeam: 'Globo Gym',
        awayScore: 139.5,
        isPlayoff: false
      }
    ],
    seasonData: {
      2024: {
        matchups: [
          {
            seasonYear: 2024,
            weekNumber: 3,
            homeOwner: 'Dylan',
            homeTeam: 'Globo Gym',
            homeScore: 165.5,
            awayOwner: 'Trace',
            awayTeam: 'Trace Team',
            awayScore: 110.2,
            isPlayoff: false
          },
          {
            seasonYear: 2024,
            weekNumber: 7,
            homeOwner: 'Trace',
            homeTeam: 'Trace Team',
            homeScore: 140.0,
            awayOwner: 'Dylan',
            awayTeam: 'Globo Gym',
            awayScore: 139.5,
            isPlayoff: false
          }
        ]
      }
    }
  };

  it('weekly matchup grid cards should include jump target attributes', () => {
    const html = buildWeeklyMatchupsGridHtml({
      matchups: mockMatchups,
      rankMap: mockRankMap,
      season: 2025,
      week: 1,
      mode: 'recap',
      theme: CRT_THEME
    });

    expect(html).toContain('id="matchup-card-m_2025_w1_Dylan_Tess_0"');
    expect(html).toContain('data-season="2025"');
    expect(html).toContain('data-week="1"');
    expect(html).toContain('data-owner1="Dylan"');
    expect(html).toContain('data-owner2="Tess"');
    expect(html).toContain('data-matchup-key="2025-w1-Dylan-Tess"');
  });

  it('manager season game log cards should include jump target attributes', () => {
    const html = buildManagerSeasonGameLogHtml({
      owner: 'Dylan',
      season: 2025,
      matchups: mockMatchups,
      rankMap: mockRankMap,
      theme: CRT_THEME
    });

    expect(html).toContain('id="matchup-card-mgr_2025_w1_Dylan"');
    expect(html).toContain('data-season="2025"');
    expect(html).toContain('data-week="1"');
    expect(html).toContain('data-owner1="Dylan"');
    expect(html).toContain('data-owner2="Tess"');
    expect(html).toContain('data-matchup-key="2025-w1-Dylan-Tess"');
  });

  it('getStatCardTop5 should enrich records with year, week, and owners', () => {
    const topJug = getStatCardTop5(mockLeagueData, 'juggernaut', 2024);
    expect(topJug.length).toBeGreaterThan(0);
    expect(topJug[0].year).toBe(2024);
    expect(topJug[0].week).toBe(3);
    expect(topJug[0].homeOwner).toBe('Dylan');
    expect(topJug[0].awayOwner).toBe('Trace');

    const topNail = getStatCardTop5(mockLeagueData, 'nailbiter', 2024);
    expect(topNail.length).toBeGreaterThan(0);
    expect(topNail[0].year).toBe(2024);
    expect(topNail[0].week).toBe(7);
    expect(topNail[0].margin).toBeCloseTo(0.5);
  });

  it('buildStatCardTop5Popover should render clickable jump rows with Jump hint', () => {
    const popoverHtml = buildStatCardTop5Popover({
      cardTitle: 'JUGGERNAUT',
      metricKey: 'juggernaut',
      season: 2024,
      leagueData: mockLeagueData,
      theme: CRT_THEME
    });

    expect(popoverHtml).toContain("window.jumpToMatchup(2024, 3, 'Dylan', 'Trace')");
    expect(popoverHtml).toContain('➔ Jump');
  });

  it('buildH2HGameLogRows should render clickable rows with jumpToMatchup', () => {
    const h2hGames = [
      {
        year: 2024,
        week: 3,
        homeOwner: 'Dylan',
        homeTeam: 'Globo Gym',
        homeScore: 165.5,
        awayOwner: 'Trace',
        awayTeam: 'Trace Team',
        awayScore: 110.2,
        winner: 'Dylan',
        isPlayoff: false
      }
    ];

    const h2hHtml = buildH2HGameLogRows({ games: h2hGames, theme: CRT_THEME });
    expect(h2hHtml).toContain("onclick=\"window.jumpToMatchup(2024, 3, 'Dylan', 'Trace')\"");
    expect(h2hHtml).toContain('📋 Box ➔');
  });

  it('buildDynastyLeaderboardRows should render clickable D\'Oh blunders', () => {
    const leaderboard = [
      {
        ownerName: 'Dylan',
        winPct: 65.0,
        dOhs: 1,
        dOhDetails: [
          {
            year: 2023,
            week: 5,
            benchPlayer: 'Player B',
            benchPoints: 20,
            starter: 'Player A',
            starterPoints: 5,
            netGain: 15
          }
        ]
      }
    ];

    const dynastyHtml = buildDynastyLeaderboardRows({
      leaderboard,
      championships: {},
      theme: CRT_THEME
    });

    expect(dynastyHtml).toContain("window.jumpToMatchup(2023, 5, 'Dylan')");
    expect(dynastyHtml).toContain('➔ Box');
  });

  it('buildPlayoffBracketHtml should render clickable matchup cards with jumpToMatchup', () => {
    const mockPlayoffMatchups = [
      {
        seasonYear: 2024,
        weekNumber: 16,
        stage: 'Championship Final',
        homeOwner: 'Dylan',
        homeTeam: 'Globo Gym',
        homeScore: 145.0,
        awayOwner: 'Trace',
        awayTeam: 'Trace Team',
        awayScore: 130.0,
        homeSeed: 1,
        awaySeed: 2
      }
    ];

    const bracketHtml = buildPlayoffBracketHtml({
      season: 2024,
      playoffMatchups: mockPlayoffMatchups,
      championship: null,
      theme: CRT_THEME
    });

    expect(bracketHtml).toContain("window.jumpToMatchup(2024, 16, 'Dylan', 'Trace')");
    expect(bracketHtml).toContain('📋 Box ➔');
  });

  it('getPlayerRingBadgeHtml should render clickable rings with jumpToMatchup', () => {
    const ringLeagueData = {
      playerRingsLookup: {
        'Josh Allen': {
          player: 'Josh Allen',
          ringsCount: 1,
          rings: [
            { year: 2024, ringNumber: 1, role: 'Starter', owner: 'Dylan', team: 'Globo Gym' }
          ]
        }
      }
    };

    const ringBadgeHtml = getPlayerRingBadgeHtml({
      playerName: 'Josh Allen',
      leagueData: ringLeagueData,
      theme: CRT_THEME
    });

    expect(ringBadgeHtml).toContain("window.jumpToMatchup(2024, 17, 'Dylan')");
    expect(ringBadgeHtml).toContain('📋 Title Box ➔');
  });

  it('buildDynastyLeaderboardRows should render clickable finishes and playoff qualifiers', () => {
    const leaderboard = [
      {
        ownerName: 'Dylan',
        winPct: 65.0,
        finishes: {
          '1st': [{ year: 2024, rank: 1, teamName: 'Globo Gym' }]
        },
        playoffPct: 100,
        playoffYears: [2024],
        playoffApps: 1,
        seasonsCount: 1
      }
    ];

    const dynastyHtml = buildDynastyLeaderboardRows({
      leaderboard,
      championships: [],
      theme: CRT_THEME
    });

    expect(dynastyHtml).toContain("window.jumpToMatchup(2024, 17, 'Dylan')");
    expect(dynastyHtml).toContain("window.jumpToMatchup(2024, 15, 'Dylan')");
    expect(dynastyHtml).toContain('📋 Box ➔');
  });

  it('getStatCardTop5 should enrich playoff single game records with jump coordinates', () => {
    const playoffData = {
      allMatchups: [
        {
          seasonYear: 2024,
          weekNumber: 16,
          homeOwner: 'Dylan',
          homeTeam: 'Globo Gym',
          homeScore: 165.5,
          awayOwner: 'Trace',
          awayTeam: 'Trace Team',
          awayScore: 110.2,
          isPlayoff: true
        }
      ]
    };

    const topApex = getStatCardTop5(playoffData, 'juggernaut', 'playoffs');
    expect(topApex.length).toBeGreaterThan(0);
    expect(topApex[0].year).toBe(2024);
    expect(topApex[0].week).toBe(16);
    expect(topApex[0].homeOwner).toBe('Dylan');
    expect(topApex[0].awayOwner).toBe('Trace');
  });
});
