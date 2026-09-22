import { describe, it, expect } from 'vitest';
import {
  buildRecordsCategoryPillsHtml,
  buildPodiumCardHtml,
  buildLeaderboardTableHtml,
  buildSingleCategoryShowcaseHtml,
  buildRecordsShowcaseHtml,
  RECORD_KEYS
} from '../src/components/recordsView.js';
import { CRT_THEME, PRIDE_THEME } from '../src/theme/theme.js';

describe('Records View Component', () => {
  const mockMatchups = [
    { seasonYear: 2024, weekNumber: 1, homeOwner: 'Dylan', awayOwner: 'Phillip', homeScore: 190.5, awayScore: 120.0, homeTeam: 'Globo Gym', awayTeam: 'TDS', isPlayoff: false },
    { seasonYear: 2024, weekNumber: 2, homeOwner: 'Ryan', awayOwner: 'Alex', homeScore: 185.0, awayScore: 130.0, homeTeam: 'Donkeys', awayTeam: 'Darnold', isPlayoff: false },
    { seasonYear: 2024, weekNumber: 3, homeOwner: 'Trace', awayOwner: 'Casey', homeScore: 175.0, awayScore: 110.0, homeTeam: 'Bakulich', awayTeam: 'Casey Team', isPlayoff: false },
    { seasonYear: 2024, weekNumber: 4, homeOwner: 'Dustin', awayOwner: 'Boaz', homeScore: 160.0, awayScore: 100.0, homeTeam: 'Dusty', awayTeam: 'Boaz Team', isPlayoff: false },
    { seasonYear: 2024, weekNumber: 5, homeOwner: 'Michael', awayOwner: 'Cooper', homeScore: 155.0, awayScore: 90.0, homeTeam: 'Mike Team', awayTeam: 'Trenches', isPlayoff: false }
  ];

  const mockLeagueData = {
    allMatchups: mockMatchups
  };

  it('should render all 8 category pills plus ALL option', () => {
    const pillsHtml = buildRecordsCategoryPillsHtml({ selectedCategory: 'all', theme: CRT_THEME });
    expect(pillsHtml).toContain('ALL CATEGORIES');
    expect(pillsHtml).toContain('JUGGERNAUT');
    expect(pillsHtml).toContain('FEATHERWEIGHT');
    expect(pillsHtml).toContain('CAKEWALK');
    expect(pillsHtml).toContain('NAILBITER');
    expect(pillsHtml).toContain('GUT PUNCH');
    expect(pillsHtml).toContain('CRIMINAL');
    expect(pillsHtml).toContain('VICTORY LAP');
    expect(pillsHtml).toContain('DUMPSTER FIRE');
    expect(pillsHtml).toContain("window.selectRecordCategory('juggernaut')");
  });

  it('should render active category styling on selected pill', () => {
    const pillsHtml = buildRecordsCategoryPillsHtml({ selectedCategory: 'juggernaut', theme: CRT_THEME });
    expect(pillsHtml).toContain('bg-emerald-500 text-black');

    const pridePillsHtml = buildRecordsCategoryPillsHtml({ selectedCategory: 'juggernaut', theme: PRIDE_THEME });
    expect(pridePillsHtml).toContain('bg-pink-500 text-white');
  });

  it('should format 1st place gold, 2nd silver, and 3rd bronze podium cards', () => {
    const goldCard = buildPodiumCardHtml({
      rank: 1,
      item: { valStr: '190.50 pts', owner: 'Dylan', team: 'Globo Gym', sub: '2024 W1 vs Phillip', year: 2024, week: 1, homeOwner: 'Dylan', awayOwner: 'Phillip' },
      theme: CRT_THEME
    });
    expect(goldCard).toContain('🥇 1ST PLACE');
    expect(goldCard).toContain('190.50 pts');
    expect(goldCard).toContain('Globo Gym');
    expect(goldCard).toContain("window.jumpToMatchup(2024, 1, 'Dylan', 'Phillip')");

    const silverCard = buildPodiumCardHtml({
      rank: 2,
      item: { valStr: '185.00 pts', owner: 'Ryan', team: 'Donkeys', sub: '2024 W2 vs Alex', year: 2024, week: 2, homeOwner: 'Ryan', awayOwner: 'Alex' },
      theme: CRT_THEME
    });
    expect(silverCard).toContain('🥈 2ND PLACE');
    expect(silverCard).toContain('185.00 pts');

    const bronzeCard = buildPodiumCardHtml({
      rank: 3,
      item: { valStr: '175.00 pts', owner: 'Trace', team: 'Bakulich', sub: '2024 W3 vs Casey', year: 2024, week: 3, homeOwner: 'Trace', awayOwner: 'Casey' },
      theme: CRT_THEME
    });
    expect(bronzeCard).toContain('🥉 3RD PLACE');
    expect(bronzeCard).toContain('175.00 pts');
  });

  it('should build ranks 4-10 table with clickable jump rows', () => {
    const ranks4to5 = [
      { valStr: '160.00 pts', owner: 'Dustin', team: 'Dusty', sub: '2024 W4 vs Boaz', year: 2024, week: 4, homeOwner: 'Dustin', awayOwner: 'Boaz' },
      { valStr: '155.00 pts', owner: 'Michael', team: 'Mike Team', sub: '2024 W5 vs Cooper', year: 2024, week: 5, homeOwner: 'Michael', awayOwner: 'Cooper' }
    ];

    const tableHtml = buildLeaderboardTableHtml({ items: ranks4to5, theme: CRT_THEME, startIndex: 4 });
    expect(tableHtml).toContain('#4');
    expect(tableHtml).toContain('160.00 pts');
    expect(tableHtml).toContain('#5');
    expect(tableHtml).toContain('155.00 pts');
    expect(tableHtml).toContain("window.jumpToMatchup(2024, 4, 'Dustin', 'Boaz')");
    expect(tableHtml).toContain("window.jumpToMatchup(2024, 5, 'Michael', 'Cooper')");
  });

  it('should build full records showcase with podium and table', () => {
    const fullHtml = buildRecordsShowcaseHtml({
      leagueData: mockLeagueData,
      season: 2024,
      selectedCategory: 'juggernaut',
      isModernEra: true,
      theme: CRT_THEME
    });

    expect(fullHtml).toContain('JUGGERNAUT');
    expect(fullHtml).toContain('Single-Game High Score');
    expect(fullHtml).toContain('The highest single-game scoring explosions');
    expect(fullHtml).toContain('🥇 1ST PLACE');
    expect(fullHtml).toContain('190.50 pts');
    expect(fullHtml).toContain('#4');
    expect(fullHtml).toContain('#5');
  });

  it('should support pride theme styling for Pride Guys', () => {
    const prideHtml = buildRecordsShowcaseHtml({
      leagueData: mockLeagueData,
      season: 'allTime',
      selectedCategory: 'all',
      isModernEra: true,
      theme: PRIDE_THEME
    });

    expect(prideHtml).toContain('MODERN ERA (2022+)');
    expect(prideHtml).toContain('text-pink-600');
    expect(prideHtml).toContain('border-pink-200');
  });
});
