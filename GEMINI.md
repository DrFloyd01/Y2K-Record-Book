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
