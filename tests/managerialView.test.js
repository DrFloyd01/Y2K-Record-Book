import { describe, it, expect } from 'vitest';
import { buildManagerialProwessHtml, buildMatchupLineupCardHtml } from '../src/components/managerialView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Managerial View Component', () => {
  const mockLeaderboard = [
    {
      ownerName: 'Dylan',
      teamName: 'Globo Gym',
      games: 14,
      record: '11-3',
      actualPF: 1850.2,
      optimalPF: 1980.5,
      coachingEfficiency: 93.4,
      pointsLeftOnBench: 130.3,
      benchPFPerGame: 9.3,
      dOhCount: 1,
      dOhRate: 33.3,
      mostPainfulDOh: {
        week: 4,
        starter: 'Zack Moss',
        starterPoints: 4.2,
        benchPlayer: 'James Cook',
        benchPoints: 24.5,
        netGain: 20.3,
        deficitNeeded: 3.5,
        winMargin: 16.8
      }
    }
  ];

  it('should render the D\'Oh! spotlight and managerial leaderboard in CRT theme', () => {
    const html = buildManagerialProwessHtml({
      leaderboard: mockLeaderboard,
      theme: CRT_THEME,
      selectedSeason: 'allTime'
    });

    expect(html).toContain("THE D'OH! OF THE SEASON SPOTLIGHT");
    expect(html).toContain('Dylan');
    expect(html).toContain('93.4%');
    expect(html).toContain('Zack Moss');
    expect(html).toContain('James Cook');
    expect(html).toContain('MANAGERIAL_PROWESS');
    expect(html).toContain('ALL-TIME CAREER TOTALS');
  });

  it('should render 2026 preseason mode when 2026 is selected', () => {
    const html = buildManagerialProwessHtml({
      leaderboard: [],
      theme: CRT_THEME,
      selectedSeason: 2026
    });

    expect(html).toContain('2026_PRESEASON_MODE');
    expect(html).toContain('2026 Regular Season Kicks Off Week 1!');
  });

  it('should render matchup lineup card with starters, bench, and optimal tags', () => {
    const mockMatchup = {
      week: 1,
      margin: 4.2,
      homeTeam: {
        ownerName: 'Dylan',
        teamName: 'Globo Gym',
        actualScore: 138.4,
        optimalScore: 149.2,
        coachingEfficiency: 92.8,
        dOhOccurred: false,
        starters: [
          { slot: 'QB', player: 'Lamar Jackson', nflTeam: 'BAL', points: 25.4, isOptimal: true }
        ],
        bench: [
          { slot: 'BN', player: 'Jordan Mason', nflTeam: 'SF', points: 18.1, isOptimal: true }
        ]
      },
      awayTeam: {
        ownerName: 'Alex',
        teamName: 'Darnold Schwarzenegger',
        actualScore: 134.2,
        optimalScore: 158.4,
        coachingEfficiency: 84.7,
        dOhOccurred: true,
        dOhDetails: {
          starter: 'Christian Watson',
          starterPoints: 3.2,
          benchPlayer: 'James Conner',
          benchPoints: 22.5
        },
        starters: [
          { slot: 'WR', player: 'Christian Watson', nflTeam: 'GB', points: 3.2, isOptimal: false }
        ],
        bench: [
          { slot: 'BN', player: 'James Conner', nflTeam: 'ARI', points: 22.5, isOptimal: true }
        ]
      }
    };

    const cardHtml = buildMatchupLineupCardHtml({ matchup: mockMatchup, theme: CRT_THEME });
    expect(cardHtml).toContain('Globo Gym');
    expect(cardHtml).toContain('Lamar Jackson');
    expect(cardHtml).toContain("D'OH! MOMENT");
    expect(cardHtml).toContain('James Conner');
  });

  it('should sort starters by standard slot order (QB, RB, WR, TE, FLEX, K, DEF) and bench with MISSED at top', () => {
    const mockMatchup = {
      week: 2,
      margin: 10.0,
      homeTeam: {
        ownerName: 'Dylan',
        teamName: 'Globo Gym',
        actualScore: 120.0,
        optimalScore: 140.0,
        coachingEfficiency: 85.7,
        starters: [
          { slot: 'K', position: 'K', player: 'Harrison Butker', points: 7.0 },
          { slot: 'WR', position: 'WR', player: 'Puka Nacua', points: 18.0 },
          { slot: 'DEF', position: 'DEF', player: 'Rams', points: 8.0 },
          { slot: 'QB', position: 'QB', player: 'Josh Allen', points: 28.0 },
          { slot: 'FLEX', position: 'WR', player: 'Jerry Jeudy', points: 12.0 },
          { slot: 'TE', position: 'TE', player: 'Travis Kelce', points: 14.0 },
          { slot: 'RB', position: 'RB', player: 'Breece Hall', points: 20.0 },
          { slot: 'RB', position: 'RB', player: 'Alvin Kamara', points: 13.0 }
        ],
        bench: [
          { slot: 'BN', position: 'WR', player: 'Calvin Ridley', points: 6.0 },
          { slot: 'BN', position: 'RB', player: 'Javonte Williams', points: 22.0 }, // Optimal Missed
          { slot: 'BN', position: 'DEF', player: 'Bills', points: 9.0 }
        ]
      },
      awayTeam: {
        ownerName: 'Phillip',
        teamName: 'Ho Chi Win City',
        actualScore: 110.0,
        optimalScore: 125.0,
        coachingEfficiency: 88.0,
        starters: [],
        bench: []
      }
    };

    const cardHtml = buildMatchupLineupCardHtml({ matchup: mockMatchup, theme: PRIDE_THEME });
    
    // Check starter order: QB (Josh Allen) appears before RB (Breece Hall), before WR (Puka Nacua), before TE (Travis Kelce), before FLEX (Jerry Jeudy), before K (Harrison Butker), before DEF (Rams)
    const idxQB = cardHtml.indexOf('Josh Allen');
    const idxRB = cardHtml.indexOf('Breece Hall');
    const idxWR = cardHtml.indexOf('Puka Nacua');
    const idxTE = cardHtml.indexOf('Travis Kelce');
    const idxFLEX = cardHtml.indexOf('Jerry Jeudy');
    const idxK = cardHtml.indexOf('Harrison Butker');
    const idxDEF = cardHtml.indexOf('Rams');

    expect(idxQB).toBeLessThan(idxRB);
    expect(idxRB).toBeLessThan(idxWR);
    expect(idxWR).toBeLessThan(idxTE);
    expect(idxTE).toBeLessThan(idxFLEX);
    expect(idxFLEX).toBeLessThan(idxK);
    expect(idxK).toBeLessThan(idxDEF);

    // Check bench order: Javonte Williams (MISSED) appears before Bills (9.0 pts), before Calvin Ridley (6.0 pts)
    const idxJavonte = cardHtml.indexOf('Javonte Williams');
    const idxBills = cardHtml.indexOf('Bills');
    const idxRidley = cardHtml.indexOf('Calvin Ridley');

    expect(idxJavonte).toBeLessThan(idxBills);
    expect(idxBills).toBeLessThan(idxRidley);
    expect(cardHtml).toContain('⭐ OPT');
    expect(cardHtml).toContain('⚠️ MISSED');
  });
});
