#!/usr/bin/env node

/**
 * ESPN Fantasy Football API Authentication & Diagnostic Test Tool
 *
 * Usage:
 *   node scripts/test_espn_auth.js --league <LEAGUE_ID> [--season <YEAR>] [--s2 <ESPN_S2>] [--swid <SWID>]
 *   node scripts/test_espn_auth.js --public --league <PUBLIC_LEAGUE_ID>
 *   node scripts/test_espn_auth.js --help
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      params.help = true;
    } else if (arg === '--public') {
      params.public = true;
    } else if (arg === '--history') {
      params.history = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        params[key] = next;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

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

function printHelp() {
  console.log(`
===============================================================
🏈 ESPN Fantasy Football API Authentication & Diagnostic Tool
===============================================================

OPTIONS:
  --league <id>      ESPN League ID (or set ESPN_LEAGUE_ID in .env)
  --season <year>    Season Year (default: current year or 2024/2025/2026)
  --s2 <token>       espn_s2 cookie string (or set ESPN_S2 in .env)
  --swid <uuid>      SWID cookie string e.g. {12345678-ABCD-...} (or set ESPN_SWID in .env)
  --public           Test league assuming public visibility (no cookies sent)
  --history          Test multi-year league history endpoint
  --help, -h         Show this help guide

HOW TO FIND ESPN COOKIES:
  1. Open Chrome/Firefox/Safari and log in to espn.com.
  2. Navigate to your fantasy league.
  3. Open DevTools (F12 or Cmd+Option+I) -> Application/Storage tab -> Cookies -> https://fantasy.espn.com.
  4. Copy 'espn_s2' (starts with 'AEB...' ~200 chars) and 'SWID' (e.g. '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}').
`);
}

async function testEspnAuth() {
  loadEnv();
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  const leagueId = args.league || process.env.ESPN_LEAGUE_ID;
  const season = args.season || process.env.ESPN_SEASON || new Date().getFullYear();
  const espnS2 = args.public ? null : (args.s2 || process.env.ESPN_S2);
  const swid = args.public ? null : (args.swid || process.env.ESPN_SWID);

  console.log('\n===============================================================');
  console.log('🔍 Testing ESPN Fantasy Sports API Connection');
  console.log('===============================================================');
  console.log(`• Season Year   : ${season}`);
  console.log(`• League ID     : ${leagueId || '(None specified)'}`);
  console.log(`• Auth Mode     : ${args.public ? 'Public (No Cookies)' : (espnS2 && swid ? 'Private Authenticated (espn_s2 + SWID)' : 'Unauthenticated (No credentials provided)')}`);

  if (!args.public) {
    if (espnS2) {
      console.log(`• espn_s2 Cookie: Present (${espnS2.length} characters, starts with ${espnS2.slice(0, 10)}...)`);
    } else {
      console.log(`• espn_s2 Cookie: ⚠️ MISSING (Set ESPN_S2 in .env or pass --s2)`);
    }

    if (swid) {
      const swidValid = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/.test(swid);
      console.log(`• SWID Cookie   : ${swid} ${swidValid ? '✅ (Valid UUID format)' : '⚠️ (Non-standard format)'}`);
    } else {
      console.log(`• SWID Cookie   : ⚠️ MISSING (Set ESPN_SWID in .env or pass --swid)`);
    }
  }

  if (!leagueId) {
    console.log('\n❌ ERROR: No League ID specified.');
    console.log('Provide a league ID via: node scripts/test_espn_auth.js --league <LEAGUE_ID>');
    console.log('Or test a known public league e.g. 123456');
    return;
  }

  // Prepare Headers
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (espnS2 && swid) {
    headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid};`;
  }

  // 1. Test Modern API (Season endpoint)
  const views = ['mSettings', 'mTeam', 'mRoster', 'mMatchupScore', 'mStandings', 'mDraftDetail', 'kona_player_info'];
  const viewParams = views.map(v => `view=${v}`).join('&');
  const modernUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${viewParams}`;

  console.log(`\n📡 [Test 1] Querying Current Season Endpoint:`);
  console.log(`URL: ${modernUrl.slice(0, 100)}...`);

  const startTime = Date.now();
  try {
    const res = await fetch(modernUrl, { headers });
    const duration = Date.now() - startTime;
    console.log(`HTTP Status: ${res.status} ${res.statusText} (${duration}ms)`);

    if (res.status === 200) {
      const data = await res.json();
      console.log('\n🎉 SUCCESS: ESPN API authenticated and returned valid league payload!');
      console.log('---------------------------------------------------------------');
      console.log(`• League Name    : ${data.settings?.name || 'N/A'}`);
      console.log(`• Total Teams    : ${data.teams?.length || 0}`);
      console.log(`• Total Members  : ${data.members?.length || 0}`);
      console.log(`• Scoring Period : Week ${data.scoringPeriodId || 1}`);
      console.log(`• Current Week   : Week ${data.status?.currentMatchupPeriod || 1}`);
      console.log(`• Playoff Teams  : ${data.settings?.scheduleSettings?.playoffTeamCount || 'N/A'}`);

      if (data.teams && data.teams.length > 0) {
        console.log('\n📋 Teams Overview:');
        data.teams.slice(0, 6).forEach((t, idx) => {
          const ownerId = t.owners ? t.owners[0] : null;
          const member = data.members?.find(m => m.id === ownerId);
          const ownerName = member ? `${member.firstName} ${member.lastName}` : (t.primaryOwner || 'Unknown');
          const teamName = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
          const w = t.record?.overall?.wins ?? 0;
          const l = t.record?.overall?.losses ?? 0;
          const pf = t.record?.overall?.pointsFor?.toFixed(1) ?? '0.0';
          console.log(`  ${idx + 1}. [ID:${t.id}] ${teamName} (${ownerName}) - Record: ${w}-${l} | PF: ${pf}`);
        });
        if (data.teams.length > 6) {
          console.log(`  ... and ${data.teams.length - 6} more teams`);
        }
      }

      // Check player data resolution
      // Check draft picks resolution
      const picks = data.draftDetail?.picks || [];
      if (picks.length > 0) {
        const playerMap = {};
        data.teams?.forEach(t => {
          t.roster?.entries?.forEach(e => {
            const p = e.playerPoolEntry?.player;
            if (p) playerMap[p.id] = p.fullName;
          });
        });
        const teamMap = {};
        data.teams?.forEach(t => {
          teamMap[t.id] = t.name || (t.location ? `${t.location} ${t.nickname}` : `Team ${t.id}`);
        });

        console.log(`\n🏈 Draft Recap: ${picks.length} Total Picks Drafted`);
        console.log('  First Round Picks:');
        picks.slice(0, Math.min(12, picks.length)).forEach(p => {
          const pName = playerMap[p.playerId] || `Player #${p.playerId}`;
          const tName = teamMap[p.teamId] || `Team #${p.teamId}`;
          console.log(`    #${p.overallPickNumber.toString().padStart(2, '0')} (R${p.roundId}): ${pName.padEnd(24)} -> ${tName}`);
        });
      }
    } else if (res.status === 401) {
      console.log('\n❌ 401 Unauthorized: League is Private and no valid session credentials were provided.');
      console.log('Remedy: Set ESPN_S2 and ESPN_SWID cookies in your environment or .env file.');
    } else if (res.status === 403) {
      console.log('\n❌ 403 Forbidden: The provided espn_s2 or SWID credentials do not have permission to view this league.');
      console.log('Remedy: Re-export fresh cookies from an account that is a member of the league.');
    } else if (res.status === 404) {
      console.log(`\n❌ 404 Not Found: League ID ${leagueId} was not found for season ${season}.`);
      console.log('Verify the League ID and Season Year.');
    } else {
      const text = await res.text();
      console.log(`\n⚠️ Unexpected response (${res.status}): ${text.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`\n❌ Network Error during fetch: ${err.message}`);
  }

  // 2. Test Historical Endpoint if requested or available
  if (args.history) {
    const historyUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?seasonId=${season}&${viewParams}`;
    console.log(`\n📡 [Test 2] Querying Historical League History Endpoint:`);
    console.log(`URL: ${historyUrl.slice(0, 100)}...`);
    try {
      const hRes = await fetch(historyUrl, { headers });
      console.log(`Historical HTTP Status: ${hRes.status} ${hRes.statusText}`);
      if (hRes.status === 200) {
        const hData = await hRes.json();
        console.log(`✅ History Payload received! Length: ${Array.isArray(hData) ? hData.length : '1'} season records.`);
      }
    } catch (hErr) {
      console.log(`⚠️ Historical query error: ${hErr.message}`);
    }
  }
}

testEspnAuth();
