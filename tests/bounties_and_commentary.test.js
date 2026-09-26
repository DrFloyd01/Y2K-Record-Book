import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  evaluateWeek1,
  evaluateWeek2,
  computeLedgerSummary,
  BUY_IN_TIERS,
  normalizeManager
} from '../scripts/evaluate_y2k_bounties.js';
import {
  computeH2H,
  generateY2kDrafts,
  generatePrideDrafts
} from '../scripts/generate_commentary_drafts.js';

describe('Y2K Weekly Bounties Evaluation Suite', () => {
  const leagueData = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/leagueData.json'), 'utf8'));
  const matchups = leagueData.allMatchups || [];

  it('should correctly evaluate Week 1 Hot Start (High Score)', () => {
    const res = evaluateWeek1(matchups);
    expect(res.winner.manager).toBe('Dylan');
    expect(res.winner.score).toBeCloseTo(197.70, 2);
    expect(res.runnerUp.manager).toBe('Alex');
    expect(res.runnerUp.score).toBeCloseTo(180.56, 2);
  });

  it('should correctly evaluate Week 2 Zero to Hero (Largest Jump)', () => {
    const res = evaluateWeek2(matchups);
    expect(res.winner.manager).toBe('Dustin');
    expect(res.winner.jump).toBeCloseTo(80.66, 2);
    expect(res.winner.w1Score).toBeCloseTo(115.80, 2);
    expect(res.winner.w2Score).toBeCloseTo(196.46, 2);

    expect(res.runnerUp.manager).toBe('Ryan');
    expect(res.runnerUp.jump).toBeCloseTo(34.66, 2);

    expect(res.third.manager).toBe('Phillip');
    expect(res.third.jump).toBeCloseTo(14.72, 2);
  });

  it('should compute correct ledger payouts and qualification status', () => {
    const w1 = evaluateWeek1(matchups);
    const w2 = evaluateWeek2(matchups);
    const summary = computeLedgerSummary([w1, w2]);

    // Dylan has 1 win: qualifies, $0 payout, $5 repeat rate
    expect(summary['Dylan'].wins).toBe(1);
    expect(summary['Dylan'].isQualified).toBe(true);
    expect(summary['Dylan'].totalPayout).toBe(0.0);
    expect(summary['Dylan'].repeatRate).toBe(5.0);

    // Dustin has 1 win: qualifies, $0 payout, $25 repeat rate ($20 Max Tier)
    expect(summary['Dustin'].wins).toBe(1);
    expect(summary['Dustin'].isQualified).toBe(true);
    expect(summary['Dustin'].totalPayout).toBe(0.0);
    expect(summary['Dustin'].repeatRate).toBe(25.0);

    // Unqualified managers
    expect(summary['Boaz'].wins).toBe(0);
    expect(summary['Boaz'].isQualified).toBe(false);
  });

  it('should ensure all 12 active managers are registered in BUY_IN_TIERS', () => {
    const managers = Object.keys(BUY_IN_TIERS);
    expect(managers).toHaveLength(12);
    expect(managers).toContain('Dustin');
    expect(managers).toContain('Alex');
    expect(managers).toContain('Boaz');
    expect(managers).toContain('Dylan');
    expect(managers).toContain('Casey');
  });
});

describe('Commentary Draft Generation Suite', () => {
  const leagueData = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/leagueData.json'), 'utf8'));
  const matchups = leagueData.allMatchups || [];

  it('should accurately compute historical H2H records and streaks', () => {
    const dylanTess = computeH2H(matchups, 'Dylan', 'Tess');
    expect(dylanTess.owner1Wins).toBeGreaterThanOrEqual(4);
    expect(dylanTess.streak).toContain('Dylan');
  });

  it('should generate Y2K drafts for Week 2 recap and Week 3 preview', () => {
    const drafts = generateY2kDrafts();
    expect(drafts).toBeDefined();
    expect(drafts.w2RecapMatchups).toHaveLength(6);
    expect(drafts.w3PreviewMatchups).toHaveLength(6);

    // Check specific matchups present
    const dylanTessRecap = drafts.w2RecapMatchups.find(m => m.homeOwner === 'Dylan' && m.awayOwner === 'Tess');
    expect(dylanTessRecap).toBeDefined();
    expect(dylanTessRecap.writeup).toContain('D\'Oh!');

    const dustinAlexRecap = drafts.w2RecapMatchups.find(m => m.homeOwner === 'Dustin' && m.awayOwner === 'Alex');
    expect(dustinAlexRecap).toBeDefined();
    expect(dustinAlexRecap.writeup).toContain('Zero to Hero');
  });

  it('should generate Pride Guys drafts for Week 2 recap and Week 3 preview', () => {
    const drafts = generatePrideDrafts();
    expect(drafts).toBeDefined();
    expect(drafts.w2RecapMatchups).toHaveLength(6);
    expect(drafts.w3PreviewMatchups).toHaveLength(6);

    const mikeTrace = drafts.w2RecapMatchups.find(m => m.homeOwner === 'Michael Anderson' && m.awayOwner === 'Trace Bakulich');
    expect(mikeTrace).toBeDefined();
    expect(mikeTrace.writeup).toContain('159.78');

    const andrewBrodie = drafts.w2RecapMatchups.find(m => m.homeOwner === 'Andrew Wilson' && m.awayOwner === 'Brodie Pirtle');
    expect(andrewBrodie).toBeDefined();
    expect(andrewBrodie.writeup).toContain('Brodie Pirtle');
  });

  it('should verify draft files exist on disk in docs/', () => {
    expect(existsSync(resolve(process.cwd(), 'docs/Y2K_2026_WEEK_2_RECAP.md'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'docs/Y2K_2026_WEEK_3_PREVIEW.md'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'docs/PRIDE_2026_WEEK_2_RECAP.md'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'docs/PRIDE_2026_WEEK_3_PREVIEW.md'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'docs/drafts/Y2K_2026_COMMENTARY_BACKUP.json'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'docs/drafts/PRIDE_2026_COMMENTARY_BACKUP.json'))).toBe(true);
  });

  it('should verify live published commentary has Week 2 recap and Week 3 preview live', () => {
    const liveY2k = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/leagueData.json'), 'utf8'));
    const livePride = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/prideGuysData.json'), 'utf8'));

    // Live Y2K week 2 is published in mode: recap
    expect(liveY2k.weeklyCommentary['2026']['2'].mode).toBe('recap');
    expect(liveY2k.weeklyCommentary['2026']['2'].matchups.length).toBe(6);
    // Live Y2K week 3 preview is published live
    expect(liveY2k.weeklyCommentary['2026']['3'].mode).toBe('preview');
    expect(liveY2k.weeklyCommentary['2026']['3'].matchups.length).toBe(6);

    // Live Pride has week 2 recap and week 3 preview published live
    expect(livePride.weeklyCommentary['2026']['2'].mode).toBe('recap');
    expect(livePride.weeklyCommentary['2026']['2'].matchups.length).toBe(6);
    expect(livePride.weeklyCommentary['2026']['3'].mode).toBe('preview');
    expect(livePride.weeklyCommentary['2026']['3'].matchups.length).toBe(6);
  });
});
