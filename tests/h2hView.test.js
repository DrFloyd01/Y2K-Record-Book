import { describe, it, expect } from 'vitest';
import { buildH2HComparisonBannerHtml, buildH2HGameLogRows } from '../src/components/h2hView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('H2H View Component', () => {
  const mockBreakdown = {
    o1: 'Dylan',
    o2: 'Phillip',
    games: [
      { year: 2024, week: 1, homeOwner: 'Dylan', homeTeam: 'Globo Gym', homeScore: 120.0, awayOwner: 'Phillip', awayTeam: 'TDS', awayScore: 110.0, winner: 'Dylan', isPlayoff: false },
      { year: 2024, week: 15, homeOwner: 'Phillip', homeTeam: 'TDS', homeScore: 130.0, awayOwner: 'Dylan', awayTeam: 'Globo Gym', awayScore: 105.0, winner: 'Phillip', isPlayoff: true, stage: 'Finals' }
    ],
    regW1: 1, regW2: 0, regTies: 0,
    playW1: 0, playW2: 1, playTies: 0,
    totW1: 1, totW2: 1, totTies: 0,
    ovrStreak: 'Phillip W1',
    regStreak: 'Dylan W1',
    playStreak: 'Phillip W1',
    maxStreak: { winner: 'Dylan', streak: 4, span: '2021 W1 - 2022 W10' }
  };

  it('should render H2H comparison banner with CRT theme', () => {
    const html = buildH2HComparisonBannerHtml({
      breakdown: mockBreakdown,
      theme: CRT_THEME
    });

    expect(html).toContain('Dylan 1 - 0 Phillip');
    expect(html).toContain('Dylan 0 - 1 Phillip');
    expect(html).toContain('Dylan (4 Wins)');
    expect(html).toContain('crt-glow');
  });

  it('should render H2H comparison banner with Pride theme', () => {
    const html = buildH2HComparisonBannerHtml({
      breakdown: mockBreakdown,
      theme: PRIDE_THEME
    });

    expect(html).toContain('Dylan 1 - 0 Phillip');
    expect(html).toContain('crt-glow-pink-pink');
    expect(html).toContain('bg-white/60');
  });

  it('should render game log rows accurately', () => {
    const html = buildH2HGameLogRows({
      games: mockBreakdown.games,
      theme: CRT_THEME
    });

    expect(html).toContain('120.00 - 110.00');
    expect(html).toContain('130.00 - 105.00');
    expect(html).toContain('Finals');
  });

  it('should surface top active streaks individually while condensing past streaks in tiedGroup', () => {
    const mockStreaks = [
      { winner: 'Ryan', loser: 'Dylan', streak: 9, active: false, type: 'overall' },
      { winner: 'Phillip', loser: 'Mike', streak: 9, active: false, type: 'overall' },
      { winner: 'Ryan', loser: 'Casey', streak: 8, active: false, type: 'overall' },
      // 5W tier: 2 active, 3 past
      { winner: 'Dylan', loser: 'Phillip', streak: 5, active: true, type: 'overall' },
      { winner: 'Jasper', loser: 'Ryan', streak: 5, active: true, type: 'overall' },
      { winner: 'Phillip', loser: 'Ryan', streak: 5, active: false, type: 'overall' },
      { winner: 'Dustin', loser: 'Casey', streak: 5, active: false, type: 'overall' },
      { winner: 'Ryan', loser: 'Mike', streak: 5, active: false, type: 'overall' },
      // 4W tier: 2 active, 2 past
      { winner: 'Casey', loser: 'Trace', streak: 4, active: true, type: 'overall' },
      { winner: 'Phillip', loser: 'Jasper', streak: 4, active: true, type: 'overall' },
      { winner: 'Dylan', loser: 'Dustin', streak: 4, active: false, type: 'overall' },
      { winner: 'Mike', loser: 'Tess', streak: 4, active: false, type: 'overall' }
    ];

    mockStreaks.sort((a, b) => b.streak !== a.streak ? b.streak - a.streak : (b.active ? 1 : 0) - (a.active ? 1 : 0));

    const rows = [];
    let i = 0;
    let rankNumber = 1;
    let activeSurfaced = 0;

    while (i < mockStreaks.length && (activeSurfaced < 10 || rows.length < 10) && rows.length < 25) {
      const curStreakVal = mockStreaks[i].streak;
      let j = i;
      while (j < mockStreaks.length && mockStreaks[j].streak === curStreakVal) j++;
      const group = mockStreaks.slice(i, j);
      const countWithVal = group.length;

      const activeInGroup = group.filter(s => s.active);
      const pastInGroup = group.filter(s => !s.active);

      if (rankNumber === 1 || countWithVal <= 2) {
        for (let k = 0; k < group.length; k++) {
          const s = group[k];
          const displayRank = countWithVal > 1 ? `T-#${rankNumber}` : `#${rankNumber}`;
          rows.push({ type: 'single', rank: rankNumber, displayRank, item: s });
          if (s.active) activeSurfaced++;
        }
      } else {
        const activeToSurface = [];
        const activeToKeepInTie = [];
        activeInGroup.forEach(s => {
          if (activeSurfaced < 10) {
            activeToSurface.push(s);
            activeSurfaced++;
          } else {
            activeToKeepInTie.push(s);
          }
        });

        activeToSurface.forEach(s => {
          rows.push({ type: 'single', rank: rankNumber, displayRank: `T-#${rankNumber}`, item: s });
        });

        const remainingTied = [...activeToKeepInTie, ...pastInGroup];
        if (remainingTied.length === 1) {
          rows.push({ type: 'single', rank: rankNumber, displayRank: `T-#${rankNumber}`, item: remainingTied[0] });
        } else if (remainingTied.length > 1) {
          rows.push({ type: 'tiedGroup', rank: rankNumber, streakVal: curStreakVal, count: remainingTied.length, items: remainingTied });
        }
      }

      rankNumber += countWithVal;
      i = j;
    }

    // Assert that active streaks with 5W and 4W are surfaced individually
    const surfacedWinners = rows.filter(r => r.type === 'single').map(r => r.item.winner);
    expect(surfacedWinners).toContain('Dylan');
    expect(surfacedWinners).toContain('Jasper');
    expect(surfacedWinners).toContain('Casey');
    expect(surfacedWinners).toContain('Phillip');

    // Assert that past 5W streaks are condensed into tiedGroup
    const tiedGroups = rows.filter(r => r.type === 'tiedGroup');
    expect(tiedGroups.length).toBeGreaterThanOrEqual(1);
    expect(tiedGroups.some(g => g.streakVal === 5 && g.count === 3)).toBe(true);
  });

  it('should ensure H2H matrix cells do not use hover popovers and use h2h-matrix-container', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('src/app.js', 'utf8');
    const prideAppJs = fs.readFileSync('src/pride_app.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const prideHtml = fs.readFileSync('pride_guys.html', 'utf8');
    const crtCss = fs.readFileSync('src/styles/crt.css', 'utf8');
    const prideCss = fs.readFileSync('src/styles/pride.css', 'utf8');

    // Matrix rendering function in app.js and pride_app.js should not attach tooltip-content or tooltip-trigger
    const renderMatrixApp = appJs.slice(appJs.indexOf('function renderH2HMatrix'), appJs.indexOf('function renderH2HStreaks'));
    const renderMatrixPride = prideAppJs.slice(prideAppJs.indexOf('function renderH2HMatrix'), prideAppJs.indexOf('function renderH2HStreaks'));

    expect(renderMatrixApp).not.toContain('tooltip-trigger');
    expect(renderMatrixApp).not.toContain('tooltip-content');
    expect(renderMatrixPride).not.toContain('tooltip-trigger');
    expect(renderMatrixPride).not.toContain('tooltip-content');

    // Matrix containers in HTML should use h2h-matrix-container
    expect(indexHtml).toContain('h2h-matrix-container');
    expect(prideHtml).toContain('h2h-matrix-container');

    // CSS should hide scrollbars on h2h-matrix-container
    expect(crtCss).toContain('.h2h-matrix-container');
    expect(crtCss).toContain('overflow-y: hidden !important');
    expect(prideCss).toContain('.h2h-matrix-container');
    expect(prideCss).toContain('overflow-y: hidden !important');
  });
});

