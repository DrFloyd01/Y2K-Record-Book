#!/usr/bin/env node

/**
 * Automated ESPN Weekly Box Score & Standings Ingestion Script
 *
 * Runs via CLI or GitHub Actions to pull latest weekly scores,
 * recompute standings, all-play, luck indices, and badges.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env if present
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && v.length > 0) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[k.trim()]) {
            process.env[k.trim()] = val;
          }
        }
      }
    });
  }
}

loadEnv();

const CANONICAL_OWNER_MAP = {
  'Trace Bakulich': 'Trace Bakulich',
  'Michael Anderson': 'Michael Anderson',
  'Nathan Wells': 'Nathan Wells',
  'Andrew Wilson': 'Andrew Wilson',
  'tyler hicks': 'Tyler Hicks',
  'Tyler Hicks': 'Tyler Hicks',
  'Dylan Soth': 'Dylan Soth',
  "Aidan O'Sullivan": "Aidan O'Sullivan",
  'Austin Geller': 'Austin Geller',
  'Phillip Busick': 'Phillip Busick',
  'sean belcher': 'Sean Belcher',
  'Sean Belcher': 'Sean Belcher',
  'Brendan Sanders': 'Brendan Sanders',
  'Brodie Pirtle': 'Brodie Pirtle'
};

async function updateEspnScores() {
  const leagueId = process.env.ESPN_LEAGUE_ID || '1629523';
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;
  const seasonYear = parseInt(process.env.ESPN_SEASON || '2026', 10);

  if (!s2 || !swid) {
    console.error('❌ Missing ESPN_S2 or ESPN_SWID credentials.');
    process.exit(1);
  }

  const headers = {
    'Cookie': `espn_s2=${s2}; SWID=${swid};`,
    'Accept': 'application/json'
  };

  console.log(`📡 Querying ESPN API for Season ${seasonYear} scores (League: ${leagueId})...`);
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=mMatchupScore&view=mStandings`;
  const res = await fetch(url, { headers });

  if (res.status !== 200) {
    console.error(`❌ ESPN API responded with HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  const currentWeek = data.status?.currentMatchupPeriod || 1;
  console.log(`✅ Retrieved league data. Current Matchup Period: Week ${currentWeek}`);

  // Load existing prideGuysData.json
  const dataPath = resolve(process.cwd(), 'public/data/prideGuysData.json');
  const prideData = JSON.parse(readFileSync(dataPath, 'utf8'));

  // Build Member & Team Maps
  const memberMap = {};
  data.members?.forEach(m => {
    const rawName = `${m.firstName} ${m.lastName}`.trim();
    memberMap[m.id] = CANONICAL_OWNER_MAP[rawName] || rawName;
  });

  const teamMap = {};
  data.teams?.forEach(t => {
    const ownerId = t.owners ? t.owners[0] : null;
    const ownerName = memberMap[ownerId] || t.primaryOwner || 'Unknown';
    const teamName = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
    teamMap[t.id] = {
      teamId: t.id,
      teamName: teamName,
      ownerName: ownerName
    };
  });

  // Check completed matchups
  const rawSchedule = data.schedule || [];
  let completedGameCount = 0;
  const updatedSchedule = [];
  const weeklyScoresMap = {}; // { week: [ { owner, team, score, oppOwner, oppScore, won } ] }

  rawSchedule.forEach(m => {
    const week = m.matchupPeriodId;
    if (week && week <= 14) {
      const homeInfo = teamMap[m.home?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };
      const awayInfo = teamMap[m.away?.teamId] || { teamName: 'TBD', ownerName: 'TBD' };
      const hScore = m.home?.totalPoints || 0.0;
      const aScore = m.away?.totalPoints || 0.0;

      const isCompleted = (hScore > 0 || aScore > 0) && (m.winner !== 'UNDECIDED' || week < currentWeek);
      if (isCompleted) {
        completedGameCount++;
        let winner = 'Tie';
        if (hScore > aScore) winner = homeInfo.ownerName;
        else if (aScore > hScore) winner = awayInfo.ownerName;

        const margin = Math.abs(hScore - aScore);

        updatedSchedule.push({
          week: week,
          matchupId: m.id,
          homeTeam: homeInfo.teamName,
          homeOwner: homeInfo.ownerName,
          homeScore: hScore,
          awayTeam: awayInfo.teamName,
          awayOwner: awayInfo.ownerName,
          awayScore: aScore,
          winner: winner,
          margin: parseFloat(margin.toFixed(2)),
          isPlayoff: false
        });

        if (!weeklyScoresMap[week]) weeklyScoresMap[week] = [];
        weeklyScoresMap[week].push(
          { owner: homeInfo.ownerName, team: homeInfo.teamName, score: hScore, oppOwner: awayInfo.ownerName, oppScore: aScore, won: hScore > aScore },
          { owner: awayInfo.ownerName, team: awayInfo.teamName, score: aScore, oppOwner: homeInfo.ownerName, oppScore: hScore, won: aScore > hScore }
        );
      } else {
        updatedSchedule.push({
          week: week,
          matchupId: m.id,
          homeTeam: homeInfo.teamName,
          homeOwner: homeInfo.ownerName,
          homeScore: 0.0,
          awayTeam: awayInfo.teamName,
          awayOwner: awayInfo.ownerName,
          awayScore: 0.0,
          winner: 'TBD',
          margin: 0.0,
          isPlayoff: false
        });
      }
    }
  });

  if (completedGameCount === 0) {
    console.log('ℹ️ Pre-season / Week 0: No games completed yet. Standings cleanly default to 0-0.');
    if (!prideData.seasonData[seasonYear.toString()]) {
      console.log('Generating initial season template...');
    }
    // Update schedule and team names
    if (prideData.seasonData[seasonYear.toString()]) {
      prideData.seasonData[seasonYear.toString()].schedule = updatedSchedule;
    }
  } else {
    console.log(`📊 Processing ${completedGameCount} completed games across ${Object.keys(weeklyScoresMap).length} weeks...`);

    // Compute seasonal standings & advanced analytics
    const managerStats = {};
    data.teams.forEach(t => {
      const tInfo = teamMap[t.id];
      managerStats[tInfo.ownerName] = {
        ownerName: tInfo.ownerName,
        teamName: tInfo.teamName,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0.0,
        pointsAgainst: 0.0,
        form: [],
        expWins: 0,
        expLosses: 0,
        ovrWins: 0,
        ovrLosses: 0,
        weeklyWins: 0,
        wwDetails: [],
        luckiestWins: 0,
        lwDetails: [],
        heartbreaks: 0,
        hbDetails: [],
        toughestLosses: 0,
        tlDetails: []
      };
    });

    const completedWeeks = Object.keys(weeklyScoresMap).map(Number).sort((a, b) => a - b);
    completedWeeks.forEach(wk => {
      const weekEntries = weeklyScoresMap[wk];
      const sortedByScore = [...weekEntries].sort((a, b) => b.score - a.score);
      const highScorer = sortedByScore[0];
      const lowScorer = sortedByScore[sortedByScore.length - 1];

      // High Scorer Badge (Weekly Win)
      if (highScorer && highScorer.score > 0) {
        managerStats[highScorer.owner].weeklyWins += 1;
        managerStats[highScorer.owner].wwDetails.push({
          year: seasonYear,
          week: wk,
          score: highScorer.score,
          teamName: highScorer.team
        });
      }

      weekEntries.forEach(entry => {
        const stat = managerStats[entry.owner];
        if (!stat) return;

        stat.pointsFor += entry.score;
        stat.pointsAgainst += entry.oppScore;

        if (entry.score > entry.oppScore) {
          stat.wins += 1;
          stat.form.push('W');
        } else if (entry.score < entry.oppScore) {
          stat.losses += 1;
          stat.form.push('L');
        } else {
          stat.ties += 1;
          stat.form.push('T');
        }

        // All-Play (OVR Record) against all opponents in the league that week
        weekEntries.forEach(opp => {
          if (opp.owner !== entry.owner) {
            if (entry.score > opp.score) stat.ovrWins += 1;
            else if (entry.score < opp.score) stat.ovrLosses += 1;
          }
        });

        // Luck Index metrics
        const rankThisWeek = sortedByScore.findIndex(e => e.owner === entry.owner) + 1;
        const totalTeams = weekEntries.length;

        // Luckiest Win: Won despite being in the bottom half of scoring
        if (entry.won && rankThisWeek > Math.ceil(totalTeams / 2)) {
          stat.luckiestWins += 1;
          stat.lwDetails.push({
            owner: entry.owner,
            team: entry.team,
            score: entry.score,
            oppOwner: entry.oppOwner,
            oppScore: entry.oppScore,
            year: seasonYear,
            week: wk
          });
        }

        // Heartbreak: Lost despite scoring in top 3 of the week
        if (!entry.won && rankThisWeek <= 3) {
          stat.heartbreaks += 1;
          stat.hbDetails.push({
            owner: entry.owner,
            team: entry.team,
            score: entry.score,
            oppOwner: entry.oppOwner,
            oppScore: entry.oppScore,
            margin: parseFloat(Math.abs(entry.score - entry.oppScore).toFixed(2)),
            year: seasonYear,
            week: wk
          });
        }

        // Toughest Loss: Lost a match by 5 points or fewer
        const diff = entry.oppScore - entry.score;
        if (!entry.won && diff > 0 && diff <= 5.0) {
          stat.toughestLosses += 1;
          stat.tlDetails.push({
            owner: entry.owner,
            team: entry.team,
            score: entry.score,
            oppOwner: entry.oppOwner,
            oppScore: entry.oppScore,
            margin: parseFloat(diff.toFixed(2)),
            year: seasonYear,
            week: wk
          });
        }
      });
    });

    // Compute Win Pct, Exp Record, and Standings Ranking
    const standingsList = Object.values(managerStats).map(st => {
      const totalGames = st.wins + st.losses + st.ties;
      const winPct = totalGames > 0 ? Math.round((st.wins / totalGames) * 1000) / 10 : 0.0;
      const ovrTotal = st.ovrWins + st.ovrLosses;
      const ovrWinPct = ovrTotal > 0 ? Math.round((st.ovrWins / ovrTotal) * 1000) / 10 : 0.0;

      // Expected Wins based on All-Play ratio
      const expWins = ovrTotal > 0 ? Math.round((st.ovrWins / (ovrTotal / totalGames))) : 0;
      const expLosses = totalGames - expWins;
      const luckVal = st.wins - expWins;

      return {
        ...st,
        winPct,
        pointsFor: parseFloat(st.pointsFor.toFixed(2)),
        pointsAgainst: parseFloat(st.pointsAgainst.toFixed(2)),
        expWins,
        expLosses,
        expRecord: `${expWins}-${expLosses}`,
        luck: luckVal,
        ovrWinPct,
        ovrRecord: `${st.ovrWins}-${st.ovrLosses}`,
        form: st.form.slice(-5)
      };
    });

    // Sort by wins -> pointsFor
    standingsList.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor);
    standingsList.forEach((st, idx) => st.rank = idx + 1);

    prideData.seasonData[seasonYear.toString()].standings = standingsList;
    prideData.seasonData[seasonYear.toString()].schedule = updatedSchedule;
  }

  writeFileSync(dataPath, JSON.stringify(prideData, null, 2), 'utf8');
  console.log('🎉 public/data/prideGuysData.json updated successfully!');
}

updateEspnScores();
