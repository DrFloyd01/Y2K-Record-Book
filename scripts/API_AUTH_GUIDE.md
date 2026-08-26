# 🏈 Fantasy Football API Authentication & Ingestion Guide

This document outlines the authentication architectures, failure modes, and automated diagnostic tools for querying **ESPN** and **Yahoo Fantasy Sports APIs**, along with the fallback **HTML/MHTML** ingestion workflows.

---

## 1. ESPN Fantasy API (Pride Guys)

### Architecture
- **Protocol**: REST HTTP GET over `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/`
- **Auth Mechanism**:
  - **Public Leagues**: No authentication required.
  - **Private Leagues**: Authenticated via two HTTP cookies:
    - `espn_s2`: AES-encrypted session token (~200 characters, starting with `AEB...`).
    - `SWID`: Member unique identifier formatted as a GUID with curly braces (e.g. `{12345678-ABCD-EF01-2345-6789ABCDEF01}`).
- **Key Endpoints**:
  - Current Season: `seasons/{season}/segments/0/leagues/{leagueId}?view=mSettings&view=mTeam&view=mRoster&view=mMatchupScore&view=mStandings&view=kona_player_info`
  - Multi-Year History: `leagueHistory/{leagueId}?seasonId={season}`

### Common API Failure Modes & Remedies
| Failure Mode | HTTP Status | Cause | Solution |
| :--- | :--- | :--- | :--- |
| **Private League Block** | `401 Unauthorized` | Missing `espn_s2` / `SWID` | Provide valid cookies in `.env` or `--s2` / `--swid` |
| **Invalid Permissions** | `403 Forbidden` | Cookie owner is not in the league | Re-export cookies from an active league manager |
| **Session Expiration** | `401 / 403` | `espn_s2` cookie expired | Re-login to espn.com in browser & copy fresh cookie |
| **Missing Player Names** | `200 OK` (IDs only) | Missing `kona_player_info` view | Include `&view=kona_player_info` query parameter |

### How to Test & Verify ESPN API
```bash
# Test public league
node scripts/test_espn_auth.js --public --league <LEAGUE_ID>

# Test private league with cookies
node scripts/test_espn_auth.js --league <LEAGUE_ID> --s2 "<ESPN_S2>" --swid "<SWID>" --season 2024

# Test historical season records
node scripts/test_espn_auth.js --league <LEAGUE_ID> --season 2021 --history
```

---

## 2. Yahoo Fantasy Sports API (Y2K Record Book)

### Architecture
- **Protocol**: OAuth 2.0 REST API over `https://fantasysports.yahooapis.com/fantasy/v2/`
- **Auth Mechanism**:
  1. Developer App registration at [developer.yahoo.com/apps](https://developer.yahoo.com/apps/) (App Type: Web or Installed, Permissions: Fantasy Sports Read).
  2. Authorization Code Grant: User visits Yahoo login URL -> receives authorization `code`.
  3. Token Exchange: Exchange `code` for `access_token` (1 hr expiry) and `refresh_token` (persistent).
  4. Token Refresh: Automatically exchange `refresh_token` for new `access_token` when expired.
- **Key Endpoints**:
  - User Leagues: `https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json`
  - League Standings: `https://fantasysports.yahooapis.com/fantasy/v2/league/{league_key}/standings?format=json`
  - Weekly Matchups: `https://fantasysports.yahooapis.com/fantasy/v2/league/{league_key}/scoreboard;week={week}?format=json`
  - Draft Results: `https://fantasysports.yahooapis.com/fantasy/v2/league/{league_key}/draftresults?format=json`

### Common API Failure Modes & Remedies
| Failure Mode | HTTP Status | Cause | Solution |
| :--- | :--- | :--- | :--- |
| **Token Expired** | `401 Unauthorized` | 1-hour access token TTL reached | Use `--refresh` flow to rotate token |
| **Invalid Grant** | `400 Bad Request` | Expired/revoked refresh token | Re-run `--oauth` login flow |
| **CORS Block** | Browser fetch fails | Yahoo API does not allow browser CORS | Execute queries via backend/Node CLI tools |
| **Invalid League Key** | `404 / 400` | Missing game prefix (`449.l.123456`) | Use `{game_id}.l.{league_id}` format |

### How to Test & Verify Yahoo API
```bash
# 1. Interactive 1-Click OAuth Login (spawns local receiver on localhost:8080)
node scripts/test_yahoo_auth.js --oauth --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET>

# 2. Refresh Access Token using stored Refresh Token
node scripts/test_yahoo_auth.js --refresh <REFRESH_TOKEN> --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET>

# 3. Direct Access Token Query
node scripts/test_yahoo_auth.js --token <ACCESS_TOKEN> --league "nfl.l.<LEAGUE_ID>"
```

---

## 3. Fallback Workflows: HTML / MHTML Parsing

When Yahoo OAuth or ESPN cookie rotation is not viable or APIs are down:
1. **Save HTML / MHTML**: Save browser box score pages directly into `resources/` (e.g. `resources/2025_wk17.mhtml`).
2. **Deterministic Extraction**: Use our DOM/Regex parser to parse player starter/bench designations, points, and acquisitions.
3. **Player Name Normalization**: Strip suffixes (`Jr.`, `III`) and team abbreviations to match historical ADP records.
