---
name: fantasy-record-book
description: >-
  Procedures, data schemas, HTML/MHTML parsing runbooks, and ingestion workflows
  for the Y2K Record Book and Pride Guys Fantasy League vaults.
---

# Fantasy Record Book Procedures & Runbooks

Use this skill when ingesting fantasy football data (draft results, weekly matchups, title rosters), scraping/parsing HTML/MHTML box scores when APIs are uncooperative, updating league datasets, or modifying analytics calculations.

---

## 1. Data Ingestion & Fallback Workflows

### Target Datasets
- **Y2K Record Book**: `public/data/leagueData.json`
- **Pride Guys**: `public/data/prideGuysData.json`

### Handling Uncooperative Yahoo & ESPN APIs (HTML / MHTML Ingestion)
When official APIs (Yahoo Fantasy API OAuth / ESPN Private League S2 & SWID cookies) fail or block requests:
1. **Save Webpage Exports**: Save box score or draft recap pages as `.html` or `.mhtml` under `resources/` or temporary working directories.
2. **Parsing Strategies**:
   - For `.mhtml` files (e.g. `25wk17.mhtml`), extract MIME parts and decode quoted-printable text.
   - Extract player starter/bench arrays, points scored, and acquisition status (Draft vs FA/Trade).
   - In ESPN tables, resolve numerical player IDs (e.g., ESPN player ID `3117251`) to official names using lookup tables or player directory maps.
3. **Player Name Normalization**:
   - Strip suffixes (`Jr.`, `Sr.`, `II`, `III`, `IV`) and defensive unit tags (`D/ST`, `DEF`) before performing ADP lookups in `resources/adp/`.

---

## 2. Dataset Schema Reference

```json
{
  "seasons": [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  "allTimeStandings": [
    {
      "ownerName": "Dylan",
      "teamName": "Globo Gym",
      "wins": 65,
      "losses": 45,
      "pointsFor": 14250.6,
      "pointsAgainst": 13800.2,
      "luck": 3.2
    }
  ],
  "seasonData": {
    "2026": {
      "standings": [],
      "schedule2026": [],
      "draftPicks": []
    }
  },
  "championshipRosters": {
    "2025": {
      "champion": "Phillip",
      "starters": [],
      "bench": []
    }
  }
}
```

---

## 3. Pre-Season & In-Season Validation Checklist

When updating datasets or adding features:
1. **Default Pre-Season State**: Pre-season team records must default to `0-0` (`0.000` win pct).
2. **Exclude Unplayed Weeks**: Filter unplayed weeks (`score === 0` or future dates) from All-Play, Luck Index, and Weekly Badges calculations.
3. **Dual-Site Verification**:
   - Test Y2K site (`index.html` via `src/app.js`)
   - Test Pride Guys site (`pride_guys.html` via `src/pride_app.js`)
4. **Automated Verification**:
   - `npm run test` (Vitest unit tests)
   - `npm run build` (Vite production bundle check)
