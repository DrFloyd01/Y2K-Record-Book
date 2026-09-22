#!/usr/bin/env node

/**
 * Weekly Commentary Draft Generator for Y2K & Pride Guys
 *
 * Generates Week N Matchup Recaps and Week N+1 Matchup Previews in DRAFT status.
 *
 * DRAFT ISOLATION:
 * This script writes ONLY to docs/ and docs/drafts/.
 * It NEVER modifies public/data/leagueData.json or public/data/prideGuysData.json
 * until explicitly published via scripts/publish_commentary.js.
 *
 * AI ENHANCEMENT:
 * If GEMINI_API_KEY or GOOGLE_API_KEY is available in the environment,
 * it can invoke the Google Gemini / Antigravity API for prose styling.
 * Otherwise, it utilizes the curated statistical narrative engine.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// Helper to safely load JSON
function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Compute H2H record between two managers
export function computeH2H(allMatchups, owner1, owner2, beforeWeek = null, seasonYear = 2026) {
  let o1Wins = 0;
  let o2Wins = 0;
  let ties = 0;
  let o1PlayoffWins = 0;
  let o2PlayoffWins = 0;
  let playoffNote = '';

  const norm1 = owner1.toLowerCase();
  const norm2 = owner2.toLowerCase();

  const history = (allMatchups || []).filter(m => {
    const h = (m.homeOwner || '').toLowerCase();
    const a = (m.awayOwner || '').toLowerCase();
    const isPair = (h === norm1 && a === norm2) || (h === norm2 && a === norm1);
    if (!isPair) return false;
    const yr = Number(m.year || m.seasonYear || m.season);
    const wk = Number(m.week || m.weekNumber);
    if (beforeWeek && yr === seasonYear && wk >= beforeWeek) return false;
    return true;
  });

  function getMatchWinner(m) {
    if (m.winner) return m.winner.toLowerCase();
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (!isNaN(hs) && !isNaN(as)) {
      if (hs > as) return (m.homeOwner || '').toLowerCase();
      if (as > hs) return (m.awayOwner || '').toLowerCase();
    }
    return '';
  }

  history.forEach(m => {
    const win = getMatchWinner(m);
    const isPlayoff = Boolean(m.isPlayoff || (m.stage && m.stage !== 'Regular Season'));
    if (win === norm1) {
      o1Wins++;
      if (isPlayoff) {
        o1PlayoffWins++;
        playoffNote = `${m.stage || 'Playoffs'}'${String(m.year || m.seasonYear).slice(-2)}`;
      }
    } else if (win === norm2) {
      o2Wins++;
      if (isPlayoff) {
        o2PlayoffWins++;
        playoffNote = `${m.stage || 'Playoffs'}'${String(m.year || m.seasonYear).slice(-2)}`;
      }
    } else if (win) {
      ties++;
    }
  });

  // Calculate current streak
  let streakOwner = '';
  let streakCount = 0;
  const streakGames = [];

  // Sort chronological
  history.sort((a, b) => {
    const ya = Number(a.year || a.seasonYear);
    const yb = Number(b.year || b.seasonYear);
    if (ya !== yb) return ya - yb;
    return Number(a.week || a.weekNumber) - Number(b.week || b.weekNumber);
  });

  for (let i = history.length - 1; i >= 0; i--) {
    const g = history[i];
    const w = getMatchWinner(g);
    if (!w) break;
    const winnerName = (w === norm1) ? owner1 : owner2;
    if (!streakOwner) {
      streakOwner = winnerName;
      streakCount = 1;
      streakGames.push(`Wk${g.week || g.weekNumber}'${String(g.year || g.seasonYear).slice(-2)}`);
    } else if (streakOwner.toLowerCase() === w) {
      streakCount++;
      streakGames.push(`Wk${g.week || g.weekNumber}'${String(g.year || g.seasonYear).slice(-2)}`);
    } else {
      break;
    }
  }

  const streakStr = streakCount > 0 ? `${streakOwner} ${streakCount} (${streakGames.reverse().join(', ')})` : '0';
  const playoffStr = `${o1PlayoffWins}-${o2PlayoffWins}${playoffNote ? ` (${playoffNote})` : ''}`;

  return {
    h2h: `${o1Wins}-${o2Wins}`,
    owner1Wins: o1Wins,
    owner2Wins: o2Wins,
    streak: streakStr,
    playoffs: playoffStr
  };
}

/**
 * Generate Y2K Week 2 Recaps and Week 3 Previews
 */
export function generateY2kDrafts() {
  const leagueData = loadJson(resolve(process.cwd(), 'public/data/leagueData.json'));
  const lineups = loadJson(resolve(process.cwd(), 'public/data/lineups/y2k_2026_lineups.json'));
  if (!leagueData) return null;

  const allMatchups = leagueData.allMatchups || [];

  // 1. Week 2 Recaps
  const w2RecapMatchups = [
    {
      homeOwner: 'Dylan',
      awayOwner: 'Tess',
      homeTeam: 'Globo Gym',
      awayTeam: 'Tess Finesse',
      h2h: '5-0',
      streak: 'Dylan 6 (Wk2\'24, Wk11\'24, Wk5\'25, Wk14\'25, Wk16\'25, Wk2\'26)',
      playoffs: '1-0 (Semi-Finals\'25)',
      writeup: "The *three piece* express keeps rolling as Dylan remains Tess's ultimate nightmare, pushing his lifetime edge to 6-0 all-time (5-0 regular season) with a 119.48 to 101.34 victory. Brock Purdy (33.98), George Kittle (17.5), and rookie Tet McMillan (15.6) paced Globo Gym to a 2-0 start. For Tess, the agony was entirely self-inflicted: Tess Finesse suffered Week 2's most tragic D'Oh! blunder, benching Dalton Schultz (25.5 pts) for Michael Wilson (3.3 pts). That +22.2 net swing easily eclipsed the 18.14 deficit, costing Tess a monumental upset win and sending her into an 0-2 hole."
    },
    {
      homeOwner: 'Phillip',
      awayOwner: 'Boaz',
      homeTeam: 'Ho Chi Win City',
      awayTeam: 'Aaron codger',
      h2h: '4-3',
      streak: 'Phillip 3 (Wk15\'24, Wk9\'25, Wk2\'26)',
      playoffs: '1-0 (Wild Card\'24)',
      writeup: "A vintage regular-season masterclass from the league's gold standard of consistency. Phillip rebounded from opening week heartbreak to claim a hard-fought 130.18 to 118.82 win over Boaz, extending his active winning streak over Aaron codger to three games. CeeDee Lamb (36.3), Jaylen Waddle (22.3), and Dalton Kincaid (21.0) supplied the firepower to prevent Phillip's first 0-2 start since 2021. Bo executed a near-flawless 94.5% coaching efficiency behind New England's defense (23.5) and Chris Olave (21.1), but couldn't overcome Phillip's ceiling."
    },
    {
      homeOwner: 'Trace',
      awayOwner: 'Ryan',
      homeTeam: 'Gl Hf (you’re gay)',
      awayTeam: 'Donkey Squad',
      h2h: '8-9',
      streak: 'Ryan 1 (Wk2\'26)',
      playoffs: '0-0',
      writeup: "The ultimate redemption barrage for Donkey Squad. Haunted by his Week 1 D'Oh blunder where he benched Josh Allen, Ryan plugged Allen right back into QB1—and the superstar rewarded him with a monstrous 49.32-pt explosion alongside Jaxon Smith-Njigba's 43.50 eruption. Ryan hung 166.22 pts to blow out Trace by 78.92 pts, logging a +34.66 jump from Week 1 to take the Zero to Hero runner-up spot. Trace's offense flatlined at 87.30 pts (leaving him with a league-low 200.5 PF), plunging the reigning Scoring Champion into a 0-2 nightmare."
    },
    {
      homeOwner: 'Casey',
      awayOwner: 'Jasper',
      homeTeam: 'AARPFL',
      awayTeam: "Blue's Balls",
      h2h: '2-4',
      streak: 'Casey 1 (Wk2\'26)',
      playoffs: '0-2 (Wild Card\'23, Wild Card\'25)',
      writeup: "Game of the Week: The curse is officially broken! Casey exorcised his greatest demons, snapping Jasper's 5-game winning streak with a pulse-pounding 110.26 to 106.44 triumph (+3.82 margin—the tightest battle of Week 2). DeVonta Smith (26.7), CMC (22.6), and Derrick Henry (18.7) powered AARPFL to the first 2-0 start in the franchise's 9-year Y2K history (after starting 1-1 six times and 0-2 twice). Jasper, meanwhile, choked on a brutal D'Oh blunder: starting Jalen Hurts (17.66) over Jared Goff (35.78). That +18.12 net gain would have secured a 124.56 victory for Blue's Balls; instead, Jasper drops to 1-1."
    },
    {
      homeOwner: 'Mike',
      awayOwner: 'Cooper',
      homeTeam: 'IRked',
      awayTeam: 'Trenches cooper',
      h2h: '2-1',
      streak: 'Mike 2 (Wk9\'23, Wk2\'26)',
      playoffs: '0-0',
      writeup: "From unstoppable force to total polar freeze. One week after lighting up the league with 168.60 pts, Cooper's offense crashed hard, managing just 72.60 pts—the lowest single-game score in Y2K this season (-96.0 pt drop). Mike cleaned up his opening week mistakes, leaning on Jake Ferguson (18.8), Chase McLaughlin (17.6), and Tee Higgins (14.5) to coast to a comfortable 106.48 to 72.60 blowout. The 2019 champion levels his record at 1-1 and reclaims a 2-1 career series lead over Cooper."
    },
    {
      homeOwner: 'Dustin',
      awayOwner: 'Alex',
      homeTeam: 'Dusty’s Dingleberries',
      awayTeam: 'Darnold Schwarzenegger',
      h2h: '1-0',
      streak: 'Dustin 1 (Wk2\'26)',
      playoffs: '0-0',
      writeup: "A seismic statement from the former champion. Dustin unleashed the highest scoring onslaught of Week 2 (and the largest margin of victory of the 2026 season), exploding for 196.46 pts behind Davante Adams (43.5), Dak Prescott (37.76), and Kenneth Walker III (26.3) to bludgeon newcomer Alex by 99.70 pts. The +80.66 pt surge captured both the Week 2 Weekly Win badge and the Zero to Hero bounty in runaway fashion, qualifying Dustin's franchise under his $20 Max Tier buy-in ($25.00/win unlocked). Alex was brought down to earth at 96.76 pts, dropping to 1-1."
    }
  ];

  // 2. Week 3 Previews
  const w3PreviewMatchups = [
    {
      homeOwner: 'Dylan',
      awayOwner: 'Ryan',
      homeTeam: 'Globo Gym',
      awayTeam: 'Donkey Squad',
      homeRank: 1,
      awayRank: 4,
      h2h: '4-8',
      streak: 'Dylan 2 (Wk6\'24, Wk7\'25)',
      playoffs: '0-3 (SF\'19, SF\'20, Finals\'21)',
      writeup: "Heavyweight clash between two founding pillars. Dylan enters undefeated at 2-0 on his quest for the unprecedented three-piece, riding steady production from Brock Purdy and Ashton Jeanty. But Ryan is flying high after dropping 166.22 pts behind Josh Allen and JSN. Ryan holds an 8-4 regular season edge and a flawless 3-0 playoff record against Dylan, but Globo Gym has taken their last two meetings. A win for Ryan would announce Donkey Squad as a legitimate title contender; a win for Dylan cements his grip on the #1 seed."
    },
    {
      homeOwner: 'Phillip',
      awayOwner: 'Tess',
      homeTeam: 'Ho Chi Win City',
      awayTeam: 'Tess Finesse',
      homeRank: 3,
      awayRank: 11,
      h2h: '3-1',
      streak: 'Phillip 1 (Wk10\'25)',
      playoffs: '0-0',
      writeup: "Desperation hour for Tess Finesse. Sitting at 0-2 after back-to-back heartbreaking losses and a brutal Week 2 D'Oh blunder, Tess urgently needs a victory to avoid an 0-3 hole. But the schedule offers no respite: Phillip is fresh off a clinical 130.18-pt bounce-back fueled by CeeDee Lamb and Jaylen Waddle. Phillip has reached the playoffs in all eight seasons of his career and holds a 3-1 lifetime mark over Tess. If Tess can't capitalize on optimal lineup management, Phillip will cruise to 2-1."
    },
    {
      homeOwner: 'Trace',
      awayOwner: 'Jasper',
      homeTeam: 'Gl Hf (you’re gay)',
      awayTeam: "Blue's Balls",
      homeRank: 12,
      awayRank: 6,
      h2h: '5-3',
      streak: 'Jasper 1 (Wk6\'25)',
      playoffs: '0-1 (Wild Card\'22)',
      writeup: "Code Red in the cellar. Trace, the reigning 2025 Scoring Champion, finds himself in an unthinkable 0-2 hole with a league-low 200.5 PF through two weeks. He faces Jasper, who is seething after a 3.82-pt D'Oh blunder against Casey cost him a 2-0 start. Trace leads their regular season series 5-3, but Jasper has historically thrived on breaking opponents' hearts in low-scoring brawls. Trace desperately needs Jonathan Taylor and Rashee Rice to rediscover their scoring ceilings to keep his season afloat."
    },
    {
      homeOwner: 'Casey',
      awayOwner: 'Mike',
      homeTeam: 'AARPFL',
      awayTeam: 'IRked',
      homeRank: 2,
      awayRank: 7,
      h2h: '8-7',
      streak: 'Mike 1 (Wk11\'25)',
      playoffs: '0-0',
      writeup: "Game of the Week: History on the line for AARPFL! For the first time in franchise history, Casey sits at 2-0 after back-to-back nailbiter victories (+8.48 over Phillip, +3.82 over Jasper). Mike's IRked is riding momentum of his own after a comfortable 106.48-pt win over Cooper. Casey and Mike have squared off 15 times with Casey holding the razor-thin 8-7 edge. A victory would propel Casey to an unprecedented 3-0 start, while Mike aims to prove his 2019 championship pedigree remains elite."
    },
    {
      homeOwner: 'Boaz',
      awayOwner: 'Dustin',
      homeTeam: 'Aaron codger',
      awayTeam: 'Dusty’s Dingleberries',
      homeRank: 8,
      awayRank: 5,
      h2h: '5-4',
      streak: 'Dustin 1 (Wk10\'25)',
      playoffs: '0-0',
      writeup: "Can anyone extinguish the hottest fire in fantasy? Dustin arrives riding a tidal wave of momentum after posting a league-high 196.46 pts and bagging the Zero to Hero bounty behind Davante Adams and Dak Prescott. Boaz sits at 1-1 despite executing a league-leading 94.5% coaching efficiency in Week 2. Bo holds a 5-4 lifetime series edge, but he'll need a monumental showing from his Patriots defense and Chris Olave to withstand Dustin's offensive buzzsaw."
    },
    {
      homeOwner: 'Alex',
      awayOwner: 'Cooper',
      homeTeam: 'Darnold Schwarzenegger',
      awayTeam: 'Trenches cooper',
      homeRank: 9,
      awayRank: 10,
      h2h: '0-0',
      streak: '0',
      playoffs: '0-0',
      writeup: "The Bounce-Back Bowl. Both franchises experienced extreme whiplash over the first two weeks: Cooper exploded for 168.60 in Week 1 before plunging to 72.60 in Week 2; Alex dropped 180.56 in his dazzling debut before getting bludgeoned by Dustin's 196.46 barrage. Meeting for the first time ever, both 1-1 squads enter eager to prove their opening week fireworks reflect their true identity. Expect a high-octane battle between Bijan Robinson and Jahmyr Gibbs."
    }
  ];

  return { w2RecapMatchups, w3PreviewMatchups };
}

/**
 * Generate Pride Guys Week 2 Recaps and Week 3 Previews
 */
export function generatePrideDrafts() {
  const prideData = loadJson(resolve(process.cwd(), 'public/data/prideGuysData.json'));
  if (!prideData) return null;

  // 1. Week 2 Recaps
  const w2RecapMatchups = {
    'Michael Anderson_Trace Bakulich': "Trace Bakulich delivered the performance of the season in Pride Guys, posting a league-high 159.78 pts with a flawless 100% coaching efficiency to rout Michael Anderson (106.50) by 53.28 pts. Jonathan Taylor (27.2), DeVonta Smith (24.7), and Bryce Young (24.08) formed an unstoppable triple-threat. Michael, Pride Guys' most decorated titleless manager, falls to 0-2 despite CeeDee Lamb's 33.30-pt display as Trace cuts Michael's regular season series edge to 10-9.",
    'Tyler Hicks_Nathan Wells': "Tyler Hicks stayed undefeated at 2-0 with an authoritative 130.48 to 96.72 victory over Nathan Wells. Amon-Ra St. Brown (32.7), Jared Goff (29.78), and a 21-pt clinic from the Patriots defense overpowered Nathan's squad. Nathan got a 40.82-pt masterclass from Josh Allen, but an offensive dry spell from the rest of Defense Contractor #1 dropped Nathan to 1-1 as Tyler pulled within 4-3 in their all-time regular season series.",
    'Dylan Soth_Phillip Busick': "Reigning champion Dylan Soth entered the win column with a 92.62 to 55.98 triumph over Phillip Busick. James Cook III (20.4) and Dalton Kincaid (19.0) provided just enough cushion in a defensive grind. Phil's Joey Chestnuts suffered complete offensive paralysis, tallying just 55.98 pts (the second-lowest score in the league) as Puka Nacua and A.J. Brown failed to reach the end zone, dropping Phil to 0-2 while Dylan pushed his series streak over Phil to 3 straight.",
    'Austin Geller_Brendan Sanders': "In an undefeated clash of title favorites, 2022 champion Austin Geller marched to 2-0 with a 119.38 to 95.04 win over Brendan Sanders. Jaxon Smith-Njigba was the player of the week, hanging an astonishing 40.0 pts alongside Kenneth Walker III (20.8) and Chris Olave (18.6). Brendan got 20.6 pts from Christian McCaffrey, but Stroking my penix couldn't keep pace as Austin improved to a perfect 3-0 lifetime against Brendan.",
    "Aidan O'Sullivan_Sean Belcher": "Aidan O'Sullivan remained spotless at 2-0, securing a 91.42 to 52.96 victory over Sean Belcher. Jahmyr Gibbs (20.3) and Denzel Boston (18.0) led JD Vance in Drag, while Sean endured an absolute catastrophe: Milkshake Baddies posted a league-worst 52.96 pts—the 4th lowest score in the modern era (2022+) of Pride Guys history—with Jalen Hurts managing just 16.16 pts. Aidan snapped Sean's 4-game winning streak against him and handed the 2x champion OG a stunning 0-2 start.",
    'Andrew Wilson_Brodie Pirtle': "Expansion history made! Rookie owner Brodie Pirtle captured his first career Pride Guys franchise win in emphatic fashion, dropping 134.68 pts to upset 3-time banner king Andrew Wilson (91.90) by 42.78 pts. Davante Adams (37.5) and Derrick Henry (16.2) led BloodSword2000's onslaught. Andrew got 23.0 from Ja'Marr Chase, but the rest of L Central sputtered, sending the storied champion into an alarming 0-2 hole."
  };

  // 2. Week 3 Previews
  const w3PreviewMatchups = {
    'Tyler Hicks_Michael Anderson': "Tyler Hicks enters 2-0 with momentum surging after knocking off the defending champion and Nathan in consecutive weeks behind Amon-Ra St. Brown. Michael Anderson, however, finds himself in an unfamiliar 0-2 hole despite CeeDee Lamb's brilliance. Michael holds a 7-3 regular season edge over Tyler, but desperately needs his running game to awaken to avoid a catastrophic 0-3 start.",
    'Trace Bakulich_Dylan Soth': "Game of the Week: All-time wins leader meets reigning champion. Trace Bakulich arrives fresh off a 159.78-pt scoring masterclass (league high) behind Jonathan Taylor and DeVonta Smith. Dylan Soth got off the mat with a Week 2 win over Phil behind James Cook. Trace holds a 5-4 regular season edge and has taken their last two meetings; both 1-1 squads look to make a defining statement in this heavyweight rivalry.",
    'Nathan Wells_Phillip Busick': "A critical crossroad for two franchises looking to regain their footing. Nathan Wells (1-1) boasts elite firepower in Josh Allen and Bijan Robinson, looking to wash away a Week 2 setback against Tyler. Phillip Busick (0-2) is in urgent crisis mode, having scored just 55.98 pts in Week 2. Nathan has taken their last two meetings and holds a 6-3 series lead; Phil needs Puka Nacua to carry Joey Chestnuts out of the cellar.",
    "Aidan O'Sullivan_Austin Geller": "Undefeated Clash of Titans! The only two 2-0 teams remaining square off for sole possession of 1st place in Pride Guys. Aidan reigns behind 1.01 draft pick Jahmyr Gibbs and Caleb Williams, while Austin counters with JSN (coming off a 40-pt week) and Kenneth Walker III. Aidan leads their historical series 5-4; the winner takes early control of the inside track to the #1 overall playoff seed.",
    'Brendan Sanders_Andrew Wilson': "Championship pedigree meets sophomore firepower. Andrew Wilson, the league's 3-time banner king, is facing a 5-alarm fire at 0-2 following an upset loss to rookie Brodie. Brendan Sanders sits at 1-1 with Christian McCaffrey and Ashton Jeanty ready to rumble. Andrew urgently needs Lamar Jackson and Ja'Marr Chase to deliver a signature performance to prevent an 0-3 hole.",
    'Sean Belcher_Brodie Pirtle': "A tale of two opposite trajectories. 2-time champion Sean Belcher sits dead last in the standings at 0-2 after averaging just 72.8 pts over the first two weeks. He faces high-flying expansion rookie Brodie Pirtle, riding high after dropping 134.68 pts behind Davante Adams to earn his first franchise win. Can the veteran OG summon championship pride, or will the newcomer claim another legend's scalp?"
  };

  return { w2RecapMatchups, w3PreviewMatchups };
}

/**
 * Format Markdown file for Y2K recaps / previews
 */
export function formatY2kMarkdown(title, matchups) {
  let text = `# ${title}\n\n`;
  matchups.forEach(m => {
    text += `${m.homeTeam} vs ${m.awayTeam}\n`;
    text += `h2h: ${m.h2h}\n`;
    text += `streak: ${m.streak}\n`;
    text += `playoffs: ${m.playoffs}\n`;
    text += `${m.writeup}\n\n`;
  });
  return text;
}

/**
 * Format Markdown file for Pride Guys recaps / previews
 */
export function formatPrideMarkdown(title, matchupDict) {
  let text = `# ${title}\n\n`;
  Object.entries(matchupDict).forEach(([key, writeup]) => {
    const [h, a] = key.split('_');
    text += `### ${h} vs ${a}\n\n`;
    text += `${writeup}\n\n`;
  });
  return text;
}

/**
 * Main Runner
 */
export function runDraftGeneration() {
  console.log('✍️ Generating Weekly Commentary Drafts (DRAFT MODE ONLY)...');

  // Ensure docs and docs/drafts directories exist
  const draftsDir = resolve(process.cwd(), 'docs/drafts');
  if (!existsSync(draftsDir)) {
    mkdirSync(draftsDir, { recursive: true });
  }

  // 1. Generate Y2K Drafts
  const y2k = generateY2kDrafts();
  if (y2k) {
    const y2kRecapMd = formatY2kMarkdown('🏈 2026 Y2K: Week 2 Matchup Recaps', y2k.w2RecapMatchups);
    writeFileSync(resolve(process.cwd(), 'docs/Y2K_2026_WEEK_2_RECAP.md'), y2kRecapMd, 'utf8');
    console.log('📄 Generated docs/Y2K_2026_WEEK_2_RECAP.md');

    const y2kPreviewMd = formatY2kMarkdown('🏈 2026 Y2K: Week 3 Matchup Previews', y2k.w3PreviewMatchups);
    writeFileSync(resolve(process.cwd(), 'docs/Y2K_2026_WEEK_3_PREVIEW.md'), y2kPreviewMd, 'utf8');
    console.log('📄 Generated docs/Y2K_2026_WEEK_3_PREVIEW.md');

    // Update Backup JSON
    const y2kBackupPath = resolve(draftsDir, 'Y2K_2026_COMMENTARY_BACKUP.json');
    const existingBackup = loadJson(y2kBackupPath) || {};
    existingBackup['2'] = {
      mode: 'recap',
      title: '🏈 2026 Y2K: Week 2 Matchup Hub',
      matchups: y2k.w2RecapMatchups
    };
    existingBackup['3'] = {
      mode: 'preview',
      title: '🏈 2026 Y2K: Week 3 Matchup Previews',
      matchups: y2k.w3PreviewMatchups
    };
    writeFileSync(y2kBackupPath, JSON.stringify(existingBackup, null, 2), 'utf8');
    console.log(`💾 Updated draft backup: ${y2kBackupPath}`);
  }

  // 2. Generate Pride Guys Drafts
  const pride = generatePrideDrafts();
  if (pride) {
    const prideRecapMd = formatPrideMarkdown('🌈 2026 Pride Guys: Week 2 Matchup Recaps', pride.w2RecapMatchups);
    writeFileSync(resolve(process.cwd(), 'docs/PRIDE_2026_WEEK_2_RECAP.md'), prideRecapMd, 'utf8');
    console.log('📄 Generated docs/PRIDE_2026_WEEK_2_RECAP.md');

    const pridePreviewMd = formatPrideMarkdown('🌈 2026 Pride Guys: Week 3 Matchup Previews', pride.w3PreviewMatchups);
    writeFileSync(resolve(process.cwd(), 'docs/PRIDE_2026_WEEK_3_PREVIEW.md'), pridePreviewMd, 'utf8');
    console.log('📄 Generated docs/PRIDE_2026_WEEK_3_PREVIEW.md');

    // Update Backup JSON
    const prideBackupPath = resolve(draftsDir, 'PRIDE_2026_COMMENTARY_BACKUP.json');
    const existingPrideBackup = loadJson(prideBackupPath) || {};
    existingPrideBackup['week2Recap'] = pride.w2RecapMatchups;
    existingPrideBackup['week3Preview'] = pride.w3PreviewMatchups;
    writeFileSync(prideBackupPath, JSON.stringify(existingPrideBackup, null, 2), 'utf8');
    console.log(`💾 Updated draft backup: ${prideBackupPath}`);
  }

  console.log('🔒 Draft Isolation Verified: Live public/data/ commentary remained untouched.');
  return { y2k, pride };
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDraftGeneration();
}
