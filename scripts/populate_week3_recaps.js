import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const y2kRecapMarkdown = `# 🏈 2026 Y2K: Week 3 Matchup Recaps

Globo Gym vs Donkey Squad
h2h: 6-13
streak: Dylan 4 (Wk12'25, Wk16'25, Wk17'25, Wk3'26)
playoffs: 0-3 (SF'19, SF'20, Finals'21)
The *three piece* express steamrolls on. Dylan improved to 3-0 to maintain sole possession of 1st place in Y2K (averaging a league-leading 156.1 PF), cruising past Ryan 151.28 to 118.32. Brock Purdy turned in a career-defining fantasy performance with 40.28 pts, flanked by George Kittle (25.20) and Christian Watson (21.10). Donkey Squad got explosive outings from Jaxon Smith-Njigba (34.86) and TE Harold Fannin Jr. (21.10), but another brutal quarterback decision cost Ryan dearly: starting Josh Allen (10.90) over Joe Burrow (27.58) held Ryan to a 68.7% coaching efficiency, leaving an optimal 172.34 pts on the table. Dylan extends his winning streak over Donkey Squad to 4 straight games.

Ho Chi Win City vs Tess Finesse
h2h: 2-3
streak: Tess 2 (Wk14'25, Wk3'26)
playoffs: 0-0
Tess Finesse emphatically puts the 0-2 heartbreak in the rearview mirror. Tess delivered a coaching clinic with a perfect 100.0% coaching efficiency, putting up 144.30 pts to dispatch Phillip (113.44) by 30.86 pts and claim her first victory of 2026. A balanced, four-pronged attack from James Cook III (24.40), Michael Wilson (23.40), rookie Matthew Golden (21.50), and David Montgomery (16.20) left no doubt. Phillip received 20.70 pts from CeeDee Lamb and 18.50 from the Jaguars D/ST, but couldn't keep pace as Ho Chi Win City drops to 1-2. Tess takes a 3-2 edge in their all-time regular season series.

Gl Hf (you’re gay) vs Blue's Balls
h2h: 4-3
streak: Jasper 1 (Wk3'26)
playoffs: 0-1 (Wild Card'22)
Game of the Week: A 2.00-point heart-stopper that sent shockwaves through the standings. Blue's Balls once again worked his Houdini magic, escaping with a 97.12 to 95.12 win despite a 71.5% coaching efficiency that left Jared Goff (22.86) and Zay Flowers (15.90) on the bench. For Trace, the agony was compounded by Week 3's most devastating D'Oh! blunder: starting Quentin Johnston (6.50) over Mike Washington Jr. (12.40) in the flex. That +5.90 net blunder more than erased the 2-point deficit, which would have flipped the outcome into a 101.02 to 97.12 victory for Gl Hf. Instead, the reigning 2025 scoring champion falls into an 0-3 abyss as the league's lone winless franchise, while Jasper climbs to 2-1.

AARPFL vs IRked
h2h: 10-10
streak: Mike 2 (Wk13'25, Wk3'26)
playoffs: 1-0 (Wild Card'22)
The 2019 champion hits his stride in style. Mike dismantled Casey's undefeated start with a 153.44 to 118.74 victory, evening their historic 20-game rivalry at 10-10 all-time. Mike's fireworks were headlined by Drake London, who erupted for 32.40 pts (9 rec, 194 yds) to capture the Week 3 Julio Jonesing challenge (most points by an offensive starter without a TD). Jeremiyah Love (21.40) and Tee Higgins (19.50) provided plenty of support. Casey got 22.60 from Christian McCaffrey and 22.40 from Derrick Henry, but Patrick Mahomes (19.44) was once again outproduced by bench QB Bo Nix (27.14) as AARPFL suffered its first blemish of 2026 to join Mike at 2-1.

Aaron codger vs Dusty’s Dingleberries
h2h: 2-7
streak: Dustin 1 (Wk3'26)
playoffs: 0-0
An absolute demolition. Dusty’s Dingleberries followed up his Week 2 high-score explosion by hanging 150.24 pts on Boaz, recording Week 3's biggest landslide with a 76.88-point beatdown. Dustin's running back tandem went wild, with Jaylen Warren (23.60) and Kyren Williams (22.80) flanking Ja'Marr Chase (22.80) to post three 22+ point starters. Aaron codger suffered complete system failure, bottoming out with a league-low 73.36 pts as Chris Olave (19.70) was Bo's only player in double digits. Dustin climbs to 2-1 (2nd in PF at 462.50) while extending his lifetime regular season dominance over Bo to 7-2.

Darnold Schwarzenegger vs Trenches cooper
h2h: 1-0
streak: Alex 1 (Wk3'26)
playoffs: 0-0
A titanic shootout between two powerhouse lineups. In their first-ever meeting, Alex secured the Week 3 scoring title with a scorching 159.74 to 130.08 triumph over Cooper. Bijan Robinson put together the performance of the 2026 fantasy season, exploding for 45.30 pts alongside Lamar Jackson (25.94) and Garrett Wilson (25.20). Cooper counterpunched with a heroic 41.90-pt performance from Jahmyr Gibbs, but leaving Brock Bowers (26.60) and Trevor Lawrence (25.28) on the pine (81.7% efficiency) proved too costly against Alex's juggernaut. Alex moves to 2-1 in 3rd place, while Cooper drops to 1-2.
`;

const prideRecapMarkdown = `# 🌈 2026 Pride Guys: Week 3 Matchup Recaps

South Memphis Football Club vs CTESPN
h2h: 2-2
streak: Tyler Hicks 1 (Wk3'26)
playoffs: 0-0
Game of the Week: A dramatic 4.86-point thriller that propelled Tyler Hicks to an unblemished 3-0 start. Tyler squeezed out the 96.56 to 91.70 win behind steady contributions from Matthew Golden (20.50), Jeremiyah Love (19.40), and Jared Goff (19.36). For Michael Anderson, the heartbreak was excruciating: Michael suffered Week 3's most catastrophic D'Oh! blunder, starting Dalton Schultz (4.50 pts) over breakout TE Harold Fannin Jr. (20.60 pts). That +16.10 net gain would have comfortably secured a 107.80 to 96.56 victory for CTESPN. Instead, the 5-time podium finisher plunges into an unfathomable 0-3 hole while Tyler evens their series at 2-2.

ProudER vs Human Eros TDs
h2h: 7-6
streak: Dylan Soth 2 (Wk14'25, Wk3'26)
playoffs: 1-0 (Trace won Final'23)
Defense ruled the day in this rivalry bout. Defending champion Dylan Soth ground out a 92.48 to 80.34 victory over Trace Bakulich to improve to 2-1 and narrow Trace's series edge to 7-6. Trevor Lawrence (19.78), James Cook III (19.40), and Kyren Williams (18.80) did just enough for Dylan, who survived leaving Geno Smith (26.04) and Michael Wilson (20.40) on his bench. Trace couldn't replicate his Week 2 scoring explosion, as Christian Watson (19.10) and Patrick Mahomes (15.94) were ProudER's only starters to crack double digits, dropping Trace to 2-1.

Defense Contractor #1 vs Joey Chestnuts
h2h: 5-2
streak: Nathan Wells 2 (Wk11'25, Wk3'26)
playoffs: 0-0
The most lopsided blowout in Pride Guys this season. Nathan Wells uncorked the week's highest score with a 149.56-point barrage, destroying Phillip Busick (63.78) by 85.78 pts. Bijan Robinson led the charge with 34.30 pts, backed by TE Brock Bowers (24.60) and Jaylen Warren (19.10). For Phil, the nightmare start deepens: with Puka Nacua sidelined, Joey Chestnuts managed just 63.78 pts—Phil's third consecutive game under 95 points—to remain buried at 0-3 with a league-low 214.46 total PF. Nathan improves to 2-1 and widens his head-to-head edge to 5-2.

JD Vance in Drag vs Justin Herbooty
h2h: 4-9
streak: Austin Geller 3 (Wk10'24, Wk7'25, Wk3'26)
playoffs: 0-1 (Austin won Semi'22)
Austin Geller seizes sole possession of 1st place in Pride Guys! In a clash between the league's final unbeatens, Austin dismantled Aidan O'Sullivan 141.68 to 111.44 to move to 3-0 with a league-high 379.72 PF. Jaxon Smith-Njigba stayed scorching hot with 32.36 pts, paired with Kenneth Walker III (20.30) and a 21-pt masterclass from the Vikings D/ST. Aidan received a heroic 37.90 pts from Jahmyr Gibbs, but couldn't overcome Austin's superior depth. Austin pushes his series winning streak over Aidan to 3 straight games (9-4 all-time).

Stroking my penix vs L Central
h2h: 2-1
streak: Brendan Sanders 1 (Wk3'26)
playoffs: 0-0
Sophomore surge overthrows championship royalty. Brendan Sanders climbed to 2-1 with a convincing 130.24 to 93.34 victory over 3-time banner king Andrew Wilson. Brendan executed a crisp 93.7% coaching efficiency, powered by Bo Nix (24.14), Garrett Wilson (23.70), and Christian McCaffrey (19.60). Andrew got solid efforts from Lamar Jackson (20.44), Ja'Marr Chase (20.30), and Javonte Williams (17.30), but a lack of ceiling elsewhere plunged L Central into an unfathomable 0-3 hole. Brendan takes a 2-1 lead in their head-to-head series.

Milkshake Baddies vs BloodSword2000
h2h: 0-1
streak: Brodie Pirtle 1 (Wk3'26)
playoffs: 0-0
The expansion rookie claims another legend's scalp. Fresh off toppling Andrew Wilson in Week 2, Brodie Pirtle stormed past 2-time champion Sean Belcher 135.28 to 80.72 to move to 2-1. George Kittle (23.20), Joe Burrow (22.58), and Derrick Henry (21.40) set the tone for BloodSword2000's balanced attack. Sean's early-season misery continues: despite Drake London's 25.90-pt effort, Milkshake Baddies could muster only 80.72 pts, dropping the founding OG into an 0-3 cellar with just 226.4 PF through three weeks. Brodie takes their inaugural matchup.
`;

// Write markdown files
fs.writeFileSync(path.join(rootDir, 'docs', 'Y2K_2026_WEEK_3_RECAP.md'), y2kRecapMarkdown.trim() + '\n');
fs.writeFileSync(path.join(rootDir, 'docs', 'PRIDE_2026_WEEK_3_RECAP.md'), prideRecapMarkdown.trim() + '\n');
console.log('Saved docs/Y2K_2026_WEEK_3_RECAP.md and docs/PRIDE_2026_WEEK_3_RECAP.md');

// Update JSON files
const y2kDataPath = path.join(rootDir, 'public', 'data', 'leagueData.json');
const prideDataPath = path.join(rootDir, 'public', 'data', 'prideGuysData.json');
const y2kBackupPath = path.join(rootDir, 'docs', 'drafts', 'Y2K_2026_COMMENTARY_BACKUP.json');
const prideBackupPath = path.join(rootDir, 'docs', 'drafts', 'PRIDE_2026_COMMENTARY_BACKUP.json');

const y2kData = JSON.parse(fs.readFileSync(y2kDataPath, 'utf8'));
const prideData = JSON.parse(fs.readFileSync(prideDataPath, 'utf8'));
const y2kBackup = JSON.parse(fs.readFileSync(y2kBackupPath, 'utf8'));
const prideBackup = JSON.parse(fs.readFileSync(prideBackupPath, 'utf8'));

const y2kRecapWriteups = [
  "The *three piece* express steamrolls on. Dylan improved to 3-0 to maintain sole possession of 1st place in Y2K (averaging a league-leading 156.1 PF), cruising past Ryan 151.28 to 118.32. Brock Purdy turned in a career-defining fantasy performance with 40.28 pts, flanked by George Kittle (25.20) and Christian Watson (21.10). Donkey Squad got explosive outings from Jaxon Smith-Njigba (34.86) and TE Harold Fannin Jr. (21.10), but another brutal quarterback decision cost Ryan dearly: starting Josh Allen (10.90) over Joe Burrow (27.58) held Ryan to a 68.7% coaching efficiency, leaving an optimal 172.34 pts on the table. Dylan extends his winning streak over Donkey Squad to 4 straight games.",
  "Tess Finesse emphatically puts the 0-2 heartbreak in the rearview mirror. Tess delivered a coaching clinic with a perfect 100.0% coaching efficiency, putting up 144.30 pts to dispatch Phillip (113.44) by 30.86 pts and claim her first victory of 2026. A balanced, four-pronged attack from James Cook III (24.40), Michael Wilson (23.40), rookie Matthew Golden (21.50), and David Montgomery (16.20) left no doubt. Phillip received 20.70 pts from CeeDee Lamb and 18.50 from the Jaguars D/ST, but couldn't keep pace as Ho Chi Win City drops to 1-2. Tess takes a 3-2 edge in their all-time regular season series.",
  "Game of the Week: A 2.00-point heart-stopper that sent shockwaves through the standings. Blue's Balls once again worked his Houdini magic, escaping with a 97.12 to 95.12 win despite a 71.5% coaching efficiency that left Jared Goff (22.86) and Zay Flowers (15.90) on the bench. For Trace, the agony was compounded by Week 3's most devastating D'Oh! blunder: starting Quentin Johnston (6.50) over Mike Washington Jr. (12.40) in the flex. That +5.90 net blunder more than erased the 2-point deficit, which would have flipped the outcome into a 101.02 to 97.12 victory for Gl Hf. Instead, the reigning 2025 scoring champion falls into an 0-3 abyss as the league's lone winless franchise, while Jasper climbs to 2-1.",
  "The 2019 champion hits his stride in style. Mike dismantled Casey's undefeated start with a 153.44 to 118.74 victory, evening their historic 20-game rivalry at 10-10 all-time. Mike's fireworks were headlined by Drake London, who erupted for 32.40 pts (9 rec, 194 yds) to capture the Week 3 Julio Jonesing challenge (most points by an offensive starter without a TD). Jeremiyah Love (21.40) and Tee Higgins (19.50) provided plenty of support. Casey got 22.60 from Christian McCaffrey and 22.40 from Derrick Henry, but Patrick Mahomes (19.44) was once again outproduced by bench QB Bo Nix (27.14) as AARPFL suffered its first blemish of 2026 to join Mike at 2-1.",
  "An absolute demolition. Dusty’s Dingleberries followed up his Week 2 high-score explosion by hanging 150.24 pts on Boaz, recording Week 3's biggest landslide with a 76.88-point beatdown. Dustin's running back tandem went wild, with Jaylen Warren (23.60) and Kyren Williams (22.80) flanking Ja'Marr Chase (22.80) to post three 22+ point starters. Aaron codger suffered complete system failure, bottoming out with a league-low 73.36 pts as Chris Olave (19.70) was Bo's only player in double digits. Dustin climbs to 2-1 (2nd in PF at 462.50) while extending his lifetime regular season dominance over Bo to 7-2.",
  "A titanic shootout between two powerhouse lineups. In their first-ever meeting, Alex secured the Week 3 scoring title with a scorching 159.74 to 130.08 triumph over Cooper. Bijan Robinson put together the performance of the 2026 fantasy season, exploding for 45.30 pts alongside Lamar Jackson (25.94) and Garrett Wilson (25.20). Cooper counterpunched with a heroic 41.90-pt performance from Jahmyr Gibbs, but leaving Brock Bowers (26.60) and Trevor Lawrence (25.28) on the pine (81.7% efficiency) proved too costly against Alex's juggernaut. Alex moves to 2-1 in 3rd place, while Cooper drops to 1-2."
];

const y2kPostStreaks = [
  "Dylan 4 (Wk12'25, Wk16'25, Wk17'25, Wk3'26)",
  "Tess 2 (Wk14'25, Wk3'26)",
  "Jasper 1 (Wk3'26)",
  "Mike 2 (Wk13'25, Wk3'26)",
  "Dustin 1 (Wk3'26)",
  "Alex 1 (Wk3'26)"
];

const y2kPostH2H = [
  "6-13",
  "2-3",
  "4-3",
  "10-10",
  "2-7",
  "1-0"
];

function applyY2KCommentary(targetObj) {
  if (!targetObj['2026']) targetObj['2026'] = {};
  const wk3 = targetObj['2026']['3'] || {};
  wk3.mode = 'recap';
  wk3.title = '🏈 2026 Y2K: Week 3 Matchup Recaps';
  (wk3.matchups || []).forEach((m, idx) => {
    if (!m.previewWriteup && m.writeup) {
      m.previewWriteup = m.writeup;
    }
    m.recapWriteup = y2kRecapWriteups[idx];
    m.writeup = y2kRecapWriteups[idx];
    m.h2hPostWeek = y2kPostH2H[idx];
    m.h2hPostWeek1 = y2kPostH2H[idx];
    m.streakPostWeek = y2kPostStreaks[idx];
    m.streakPostWeek1 = y2kPostStreaks[idx];
  });
  targetObj['2026']['3'] = wk3;
}

const prideRecapWriteups = [
  "Game of the Week: A dramatic 4.86-point thriller that propelled Tyler Hicks to an unblemished 3-0 start. Tyler squeezed out the 96.56 to 91.70 win behind steady contributions from Matthew Golden (20.50), Jeremiyah Love (19.40), and Jared Goff (19.36). For Michael Anderson, the heartbreak was excruciating: Michael suffered Week 3's most catastrophic D'Oh! blunder, starting Dalton Schultz (4.50 pts) over breakout TE Harold Fannin Jr. (20.60 pts). That +16.10 net gain would have comfortably secured a 107.80 to 96.56 victory for CTESPN. Instead, the 5-time podium finisher plunges into an unfathomable 0-3 hole while Tyler evens their series at 2-2.",
  "Defense ruled the day in this rivalry bout. Defending champion Dylan Soth ground out a 92.48 to 80.34 victory over Trace Bakulich to improve to 2-1 and narrow Trace's series edge to 7-6. Trevor Lawrence (19.78), James Cook III (19.40), and Kyren Williams (18.80) did just enough for Dylan, who survived leaving Geno Smith (26.04) and Michael Wilson (20.40) on his bench. Trace couldn't replicate his Week 2 scoring explosion, as Christian Watson (19.10) and Patrick Mahomes (15.94) were ProudER's only starters to crack double digits, dropping Trace to 2-1.",
  "The most lopsided blowout in Pride Guys this season. Nathan Wells uncorked the week's highest score with a 149.56-point barrage, destroying Phillip Busick (63.78) by 85.78 pts. Bijan Robinson led the charge with 34.30 pts, backed by TE Brock Bowers (24.60) and Jaylen Warren (19.10). For Phil, the nightmare start deepens: with Puka Nacua sidelined, Joey Chestnuts managed just 63.78 pts—Phil's third consecutive game under 95 points—to remain buried at 0-3 with a league-low 214.46 total PF. Nathan improves to 2-1 and widens his head-to-head edge to 5-2.",
  "Austin Geller seizes sole possession of 1st place in Pride Guys! In a clash between the league's final unbeatens, Austin dismantled Aidan O'Sullivan 141.68 to 111.44 to move to 3-0 with a league-high 379.72 PF. Jaxon Smith-Njigba stayed scorching hot with 32.36 pts, paired with Kenneth Walker III (20.30) and a 21-pt masterclass from the Vikings D/ST. Aidan received a heroic 37.90 pts from Jahmyr Gibbs, but couldn't overcome Austin's superior depth. Austin pushes his series winning streak over Aidan to 3 straight games (9-4 all-time).",
  "Sophomore surge overthrows championship royalty. Brendan Sanders climbed to 2-1 with a convincing 130.24 to 93.34 victory over 3-time banner king Andrew Wilson. Brendan executed a crisp 93.7% coaching efficiency, powered by Bo Nix (24.14), Garrett Wilson (23.70), and Christian McCaffrey (19.60). Andrew got solid efforts from Lamar Jackson (20.44), Ja'Marr Chase (20.30), and Javonte Williams (17.30), but a lack of ceiling elsewhere plunged L Central into an unfathomable 0-3 hole. Brendan takes a 2-1 lead in their head-to-head series.",
  "The expansion rookie claims another legend's scalp. Fresh off toppling Andrew Wilson in Week 2, Brodie Pirtle stormed past 2-time champion Sean Belcher 135.28 to 80.72 to move to 2-1. George Kittle (23.20), Joe Burrow (22.58), and Derrick Henry (21.40) set the tone for BloodSword2000's balanced attack. Sean's early-season misery continues: despite Drake London's 25.90-pt effort, Milkshake Baddies could muster only 80.72 pts, dropping the founding OG into an 0-3 cellar with just 226.4 PF through three weeks. Brodie takes their inaugural matchup."
];

const pridePostStreaks = [
  "Tyler Hicks 1 (Wk3'26)",
  "Dylan Soth 2 (Wk14'25, Wk3'26)",
  "Nathan Wells 2 (Wk11'25, Wk3'26)",
  "Austin Geller 3 (Wk10'24, Wk7'25, Wk3'26)",
  "Brendan Sanders 1 (Wk3'26)",
  "Brodie Pirtle 1 (Wk3'26)"
];

const pridePostH2H = [
  "2-2",
  "7-6",
  "5-2",
  "4-9",
  "2-1",
  "0-1"
];

function applyPrideCommentary(targetObj) {
  if (!targetObj['2026']) targetObj['2026'] = {};
  const wk3 = targetObj['2026']['3'] || {};
  wk3.mode = 'recap';
  wk3.title = '🌈 2026 Pride Guys: Week 3 Matchup Recaps';
  (wk3.matchups || []).forEach((m, idx) => {
    if (!m.previewWriteup && m.writeup) {
      m.previewWriteup = m.writeup;
    }
    m.recapWriteup = prideRecapWriteups[idx];
    m.writeup = prideRecapWriteups[idx];
    m.h2hPostWeek = pridePostH2H[idx];
    m.h2hPostWeek1 = pridePostH2H[idx];
    m.streakPostWeek = pridePostStreaks[idx];
    m.streakPostWeek1 = pridePostStreaks[idx];
  });
  targetObj['2026']['3'] = wk3;
}

// Apply to leagueData.json
applyY2KCommentary(y2kData.weeklyCommentary);
fs.writeFileSync(y2kDataPath, JSON.stringify(y2kData, null, 2) + '\n');
console.log('Updated public/data/leagueData.json');

// Apply to prideGuysData.json
applyPrideCommentary(prideData.weeklyCommentary);
fs.writeFileSync(prideDataPath, JSON.stringify(prideData, null, 2) + '\n');
console.log('Updated public/data/prideGuysData.json');

// Apply to backup files (note: backups are keyed directly by week string: { "1": ..., "2": ..., "3": ... })
function applyBackup(targetObj, recaps, streaks, h2hList, title) {
  const wk3 = targetObj['3'] || {};
  wk3.mode = 'recap';
  wk3.title = title;
  (wk3.matchups || []).forEach((m, idx) => {
    if (!m.previewWriteup && m.writeup) {
      m.previewWriteup = m.writeup;
    }
    m.recapWriteup = recaps[idx];
    m.writeup = recaps[idx];
    m.h2hPostWeek = h2hList[idx];
    m.h2hPostWeek1 = h2hList[idx];
    m.streakPostWeek = streaks[idx];
    m.streakPostWeek1 = streaks[idx];
  });
  targetObj['3'] = wk3;
}

applyBackup(y2kBackup, y2kRecapWriteups, y2kPostStreaks, y2kPostH2H, '🏈 2026 Y2K: Week 3 Matchup Recaps');
fs.writeFileSync(y2kBackupPath, JSON.stringify(y2kBackup, null, 2) + '\n');
console.log('Updated docs/drafts/Y2K_2026_COMMENTARY_BACKUP.json');

applyBackup(prideBackup, prideRecapWriteups, pridePostStreaks, pridePostH2H, '🌈 2026 Pride Guys: Week 3 Matchup Recaps');
fs.writeFileSync(prideBackupPath, JSON.stringify(prideBackup, null, 2) + '\n');
console.log('Updated docs/drafts/PRIDE_2026_COMMENTARY_BACKUP.json');
