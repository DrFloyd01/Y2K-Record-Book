# Y2K Record Book, Pride Guys & Multi-League Development Guidelines

## 0. Local Dev Server & Visual Validation Invariant
- **Continuous Local Dev Server**: Always maintain the Vite dev server running in the background (e.g., `http://localhost:5173/`). Never shut down or kill the dev server unless explicitly restarting it.
- **Visual Validation Check**: Whenever making UI, styling, layout, or data changes, verify they render correctly on the live local port in addition to passing automated Vitest tests. Always provide direct localhost links in responses for instant user validation.

## 1. Multi-League Architecture & Parity Invariant
- **Single Source of Truth**: All core analytics, table sorting, popovers, navigation routing, and layout algorithms MUST live in shared modular components (`src/components/`, `src/analytics/`, `src/core/`).
- **Configuration-Driven Leagues**: When onboarding or updating leagues (Y2K, Pride Guys, For the Love of Money):
  - Never copy-paste monolithic 3,000-line controller files.
  - Utilize configuration objects (`config/leagues/`) defining theme, league ID, data endpoints, and feature toggles.
- **Respect League-Specific Features**:
  - Y2K: Bounties portal, Weekly Challenges with buy-in booster matrix tiers ($10/$25/$50).
  - Pride Guys: Consolation Ladder bracket & weekly rung determination.
  - For the Love of Money: Custom league rules, rosters, and branding.

## 2. UI Layout & Popover Safety Rules
- **NEVER** attach `tooltip-trigger` or `display: inline-block` directly to `<tr>` or `<tbody>` elements. Doing so collapses the CSS table layout grid.
- Always attach tooltip triggers to inner inline wrappers (`<span>` or `<div>`) inside table cells (`<td>`).
- Ensure popovers in the top half of tables or record cards flip downward (`tooltip-content-bottom` or dynamic `rowPopDir`) to avoid top-viewport clipping.
- Use `pointer-events: auto` and hover bridge pseudo-elements on popovers so users can hover and scroll inside them without jitter.

## 3. Data Ingestion & Sanitization Safety
- When Yahoo / ESPN APIs are unavailable or uncooperative, use HTML/MHTML box score and roster exports (`resources/`, `.mhtml` dumps) with regex/DOM parsers.
- Always normalize player names (`getNormalizedPlayerName`) by stripping generational suffixes (`Jr.`, `III`) and team abbreviations to achieve high match rates across historical ADP datasets.
- Ensure pre-season records cleanly default to `0-0` (0.000 win pct) instead of `undefined` or `NaN`.
- **Attribute Escaping Safety**: Always sanitize dynamic strings before rendering into the DOM. For inline event handlers (e.g., `onclick="jumpToMatchup('${escaped}')"`), ensure apostrophes and single quotes in manager names (e.g., `Aidan O'Sullivan`, `Dusty's Dingleberries`) are properly escaped.

## 4. Matchup Previews & Commentary Style Guidelines
When writing weekly matchup previews, power rankings, or league editorial content:
- **Concise Header Block**:
  - `Team A vs Team B`
  - `h2h: X-Y` (hyphen format, concise).
  - `streak: N (WkX'YY, Score-Score)`: Always cite the exact last game with week, 2-digit year, and score line in parentheses (e.g., `streak: 1 (Wk9'25, 141.31-140.42)`). If no previous games, use `streak: 0`.
  - `playoffs: X-Y` (or `playoffs: X-Y (Round 'YY, Score-Score)` if games exist). Drop `post season winning streak: N/A` when 0-0.
- **Tone & Nomenclature**:
  - Refer to founding members as **"OGs"** (e.g., "Both OGs", "The final OG").
  - Use casual league slang: **"chip"** for championship, **"three piece"** for three-peat.
  - Use informal manager names/nicknames (e.g., "Bo" for Boaz).
  - Keep team names current to the active season (e.g., Mike as "IRKed"), with historical tags where relevant (e.g., "Jelqaida'25").
- **Narrative Density & Historical Stakes**:
  - Avoid fluff/throat-clearing; get straight to stakes and franchise storylines.
  - Always explain the high-stakes playoff/seeding implications behind historical matchups (e.g., "the difference b/w 5th and 7th place", "clinched his #2 seed bye week").
  - Connect historic milestones to all-time league records with parenthetical citations (e.g., `(Casey'19-22)`, `(T1-Trace'23)`, `(T-Mike all-time)`).
  - For rookies or expansion teams without H2H history, highlight drafted core talent with round.pick capital (e.g., `Bijan (1.1), McBride (2.24), Lamar (4.48)`).

## 5. Commentary Draft Isolation & Publishing Gate
- **Draft Isolation**: The automated Tuesday sync or commentary generation scripts write drafts **ONLY** to `docs/` and `docs/drafts/`.
- **Approval Gate**: NEVER publish commentary directly to live dataset files (`public/data/*.json`) until the user has reviewed, copy-edited, and given explicit approval to publish.
- **Schema Parity**: All commentary must adhere to the standardized schema across all leagues:
  `weeklyCommentary[year][week] = { mode: 'preview'|'recap', title: string, matchups: [{ homeOwner, awayOwner, writeup, h2h, streak, playoffs }] }`.

## 6. Matchups Tab Default Commentary View Rules
- Driven directly by uploaded weekly commentary:
  - Whenever a **recap** is uploaded (`mode: 'recap'`), default the Matchups tab to that recap.
  - Whenever a **preview** is uploaded (`mode: 'preview'`), default the Matchups tab to that preview.
  - No need to track day of the week (Tuesday–Saturday); commentary ingestion directly sets the active focus.
  - Fallbacks when commentary is absent: defaults to latest completed week recap, or Week 1 preview in pre-season.
- Logic is centralized in `getWeeklyMatchupDefaultState({ season, seasonData, weeklyCommentary, commentary })` within `src/components/matchupsView.js` and maintained with dual-site parity across `src/app.js` and `src/pride_app.js` (tab switch, season switch, initial load).
- **Dynamic Standing Badges & Ordering**:
  - In Week 1 Preview: `#STANDING` badges and card sort order must reset to pre-season rankings (`0-0` records) preserved in `seasonData[year].preSeasonStandings`.
  - In Week N Preview (`N > 1`): `#STANDING` badges and card sort order reflect standings entering the week (calculated strictly from games `< N`).
  - In Week N Recap: `#STANDING` badges and card sort order reflect updated standings including completed games (`<= N`).
  - Centralized in `getWeeklyRankMap({ season, week, mode, sData, allMatchups, commentary })` in `src/components/matchupsView.js` across both entry points.

## 7. Git & Review Workflow
- **Commit for Every Prompt**: Always make descriptive, atomic git commits for each prompt's changes so the user can easily review diffs in their IDE.
- **Pull Requests for Remote**: Develop on dedicated feature branches, never push directly to `main` without a Pull Request. Use `gh pr create` to submit changes for review.
