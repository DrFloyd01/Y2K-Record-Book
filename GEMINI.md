# Y2K Record Book & Pride Guys Development Guidelines

## 1. Dual-Site Parity Invariant
- Whenever modifying core analytics, table logic, data structures, or popover geometry, apply the corresponding change to **BOTH** entrypoints:
  - `src/app.js` (Y2K CRT Green Terminal theme)
  - `src/pride_app.js` (Pride Guys Pastel Rainbow theme)
- Respect league-specific features:
  - Y2K: Bounties portal, Weekly Challenges with buy-in booster matrix tiers ($10/$25/$50).
  - Pride Guys: Consolation Ladder bracket & weekly rung determination.

## 2. UI Layout & Popover Safety Rules
- **NEVER** attach `tooltip-trigger` or `display: inline-block` directly to `<tr>` or `<tbody>` elements. Doing so collapses the CSS table layout grid.
- Always attach tooltip triggers to inner inline wrappers (`<span>` or `<div>`) inside table cells (`<td>`).
- Ensure popovers in the top half of tables or record cards flip downward (`tooltip-content-bottom` or dynamic `rowPopDir`) to avoid top-viewport clipping.
- Use `pointer-events: auto` and hover bridge pseudo-elements on popovers so users can hover and scroll inside them without jitter.

## 3. Data Ingestion & HTML/MHTML Fallbacks
- When Yahoo / ESPN APIs are unavailable or uncooperative, use HTML/MHTML box score and roster exports (`resources/`, `.mhtml` dumps) with regex/DOM parsers.
- Always normalize player names (`getNormalizedPlayerName`) by stripping generational suffixes (`Jr.`, `III`) and team abbreviations to achieve high match rates across historical ADP datasets.
- Ensure pre-season records cleanly default to `0-0` (0.000 win pct) instead of `undefined` or `NaN`.
- Always sanitize dynamic strings before rendering into the DOM using `escapeHtml()` or the `html` tagged template literal from `src/core/sanitizer.js`.

## 4. Matchup Previews & Commentary Style Guidelines
When writing weekly matchup previews, power rankings, or league editorial content for Y2K and Pride Guys:
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
  - Use italics for emphasis on dramatic milestones (e.g., `*ever*`).

