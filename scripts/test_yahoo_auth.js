#!/usr/bin/env node

/**
 * Yahoo Fantasy Sports API Authentication & Diagnostic Test Tool
 *
 * Usage:
 *   node scripts/test_yahoo_auth.js --token <ACCESS_TOKEN> [--league <LEAGUE_KEY>]
 *   node scripts/test_yahoo_auth.js --refresh <REFRESH_TOKEN> --client-id <ID> --client-secret <SECRET>
 *   node scripts/test_yahoo_auth.js --oauth --client-id <ID> --client-secret <SECRET> [--port 8080]
 *   node scripts/test_yahoo_auth.js --help
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      params.help = true;
    } else if (arg === '--oauth' || arg === '--auth-flow') {
      params.oauth = true;
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
🟣 Yahoo Fantasy Sports API Authentication & Diagnostic Tool
===============================================================

OPTIONS:
  --token <token>         Existing Yahoo OAuth Bearer Access Token
  --refresh <token>       Yahoo OAuth Refresh Token (requires client-id and client-secret)
  --client-id <id>        Yahoo App Client ID / Consumer Key
  --client-secret <sec>   Yahoo App Client Secret / Consumer Secret
  --league <league_key>   Yahoo League Key (e.g. 'nfl.l.123456' or '449.l.123456')
  --oauth                 Launch interactive OAuth 2.0 web server login flow
  --port <number>         Local callback port for OAuth flow (default: 8080)
  --help, -h              Show this help guide

YAHOO OAUTH 2.0 SETUP GUIDE:
  1. Go to https://developer.yahoo.com/apps/ and log in.
  2. Click 'Create an App'.
  3. App Name: 'Y2K Record Book Ingest' (or any name).
  4. Application Type: 'Web Application' or 'Installed Application'.
  5. Redirect URI: 'http://localhost:8080/callback' (or 'oob' for out-of-band PIN).
  6. API Permissions: Select 'Fantasy Sports' and check 'Read'.
  7. Save and copy your 'Client ID' and 'Client Secret'.
`);
}

// Helper to query Yahoo Fantasy API with a Bearer token
async function queryYahooApi(endpoint, token) {
  const url = endpoint.includes('?') ? `${endpoint}&format=json` : `${endpoint}?format=json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // text remains raw XML or text
  }

  return { status: res.status, statusText: res.statusText, json, text };
}

// Exchange Refresh Token for Fresh Access Token
async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  console.log('\n🔄 Exchanging Refresh Token for fresh Access Token...');
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: 'http://localhost:8080/callback'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await res.json();
  if (res.status === 200 && data.access_token) {
    console.log('✅ Access Token refreshed successfully!');
    console.log(`• Access Token : ${data.access_token.slice(0, 20)}...`);
    console.log(`• Expires In   : ${data.expires_in} seconds (${Math.round(data.expires_in / 60)} minutes)`);
    if (data.refresh_token) {
      console.log(`• Refresh Token: ${data.refresh_token.slice(0, 20)}...`);
    }
    return data.access_token;
  } else {
    console.log(`❌ Refresh Token Exchange Failed (${res.status}):`, data);
    return null;
  }
}

// Interactive OAuth 2.0 Local Server Flow
async function startOAuthFlow(clientId, clientSecret, port = 8080) {
  return new Promise((resolvePrompt) => {
    const redirectUri = `http://localhost:${port}/callback`;
    const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${port}`);
      if (reqUrl.pathname === '/callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>OAuth Error</h1><p>${error}</p>`);
          server.close();
          resolvePrompt(null);
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authentication Successful!</h1><p>You can close this tab and return to the terminal.</p>`);

          console.log(`\n🔑 Authorization Code received: ${code.slice(0, 10)}...`);
          console.log('🔄 Exchanging authorization code for Access & Refresh Tokens...');

          const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
              code: code
            }).toString()
          });

          const tokenData = await tokenRes.json();
          server.close();

          if (tokenRes.status === 200 && tokenData.access_token) {
            console.log('\n🎉 SUCCESS: OAuth 2.0 Tokens Acquired!');
            console.log('---------------------------------------------------------------');
            console.log(`• Access Token  : ${tokenData.access_token}`);
            console.log(`• Refresh Token : ${tokenData.refresh_token}`);
            console.log(`• Expires In    : ${tokenData.expires_in}s`);
            console.log('---------------------------------------------------------------');
            console.log('Tip: Save YAHOO_REFRESH_TOKEN, YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET in .env');
            resolvePrompt(tokenData.access_token);
          } else {
            console.log('❌ Token Exchange Failed:', tokenData);
            resolvePrompt(null);
          }
        }
      }
    });

    server.listen(port, () => {
      console.log(`\n===============================================================`);
      console.log(`🌐 OAuth 2.0 Local Receiver listening on http://localhost:${port}`);
      console.log(`===============================================================`);
      console.log(`\nPlease open the following URL in your browser to authorize access:\n`);
      console.log(`👉 ${authUrl}\n`);
      console.log(`Waiting for authorization callback on ${redirectUri}...`);
    });
  });
}

async function runYahooDiagnostic() {
  loadEnv();
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  let accessToken = args.token || process.env.YAHOO_ACCESS_TOKEN;
  const refreshToken = args.refresh || process.env.YAHOO_REFRESH_TOKEN;
  const clientId = args['client-id'] || args.clientId || process.env.YAHOO_CLIENT_ID;
  const clientSecret = args['client-secret'] || args.clientSecret || process.env.YAHOO_CLIENT_SECRET;
  const leagueKey = args.league || process.env.YAHOO_LEAGUE_KEY || 'nfl.l.123456';
  const port = parseInt(args.port || process.env.YAHOO_PORT || '8080', 10);

  console.log('\n===============================================================');
  console.log('🟣 Testing Yahoo Fantasy Sports API Connection');
  console.log('===============================================================');

  if (args.oauth) {
    if (!clientId || !clientSecret) {
      console.log('❌ ERROR: --oauth requires --client-id and --client-secret (or set in .env)');
      return;
    }
    accessToken = await startOAuthFlow(clientId, clientSecret, port);
    if (!accessToken) return;
  } else if (!accessToken && refreshToken && clientId && clientSecret) {
    accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    if (!accessToken) return;
  }

  if (!accessToken) {
    console.log('\n⚠️ No active access token provided.');
    console.log('Options to authenticate:');
    console.log('  1. Provide active token: node scripts/test_yahoo_auth.js --token <BEARER_TOKEN>');
    console.log('  2. Refresh with tokens : node scripts/test_yahoo_auth.js --refresh <REFRESH_TOKEN> --client-id <ID> --client-secret <SECRET>');
    console.log('  3. Start interactive OAuth: node scripts/test_yahoo_auth.js --oauth --client-id <ID> --client-secret <SECRET>');
    console.log('\nTesting connection with dummy token to verify error formatting...');
    accessToken = 'dummy_test_token_123';
  }

  // 1. Query Current User Fantasy Games
  console.log('\n📡 [Test 1] Querying Logged-in User Games (users;use_login=1/games):');
  const gamesRes = await queryYahooApi('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games', accessToken);
  console.log(`HTTP Status: ${gamesRes.status} ${gamesRes.statusText}`);

  if (gamesRes.status === 200) {
    console.log('✅ User Games query succeeded!');
    const users = gamesRes.json?.fantasy_content?.users;
    console.log('Users Payload:', JSON.stringify(users, null, 2).slice(0, 400) + '...');
  } else if (gamesRes.status === 401) {
    console.log('❌ 401 Unauthorized: Access token is expired, revoked, or invalid.');
    console.log('Remedy: Refresh token using refresh_token or re-run --oauth.');
  } else {
    console.log(`Response: ${gamesRes.text.slice(0, 300)}`);
  }

  // 2. Query Specific League Standings
  if (leagueKey && leagueKey !== 'none') {
    console.log(`\n📡 [Test 2] Querying League Standings (league/${leagueKey}/standings):`);
    const leagueRes = await queryYahooApi(`https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/standings`, accessToken);
    console.log(`HTTP Status: ${leagueRes.status} ${leagueRes.statusText}`);

    if (leagueRes.status === 200) {
      console.log('✅ League Standings query succeeded!');
      const league = leagueRes.json?.fantasy_content?.league;
      if (league) {
        console.log('League Info:', JSON.stringify(league[0] || league, null, 2).slice(0, 400) + '...');
      }
    } else {
      console.log(`Response: ${leagueRes.text.slice(0, 300)}`);
    }
  }
}

runYahooDiagnostic();
