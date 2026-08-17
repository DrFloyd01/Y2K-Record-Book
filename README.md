# 🏈 Y2K Record Book & Pride Guys Fantasy League Vault 🏆

Welcome to the **Y2K Record Book & Pride Guys Fantasy League Vault** — an all-inclusive historical dynasty hub and interactive web application archiving fantasy football history across 10+ seasons!

> 🔗 **Live Sites**:
> - 📟 **Y2K Record Book (P1 Phosphor CRT Theme)**: [https://drfloyd01.github.io/Y2K-Record-Book/](https://drfloyd01.github.io/Y2K-Record-Book/)
> - 🦄 **Pride Guys Fantasy League (Cute Light Mode Rainbow Theme)**: [https://drfloyd01.github.io/Y2K-Record-Book/pride_guys.html](https://drfloyd01.github.io/Y2K-Record-Book/pride_guys.html)

---

## 🌟 League Hubs & Key Features

### 1. 📟 Y2K Record Book (`index.html`)
The classic Y2K experience styled after a 90s monochrome P1 Phosphor CRT Green terminal interface (`#040d06`).
- **Trophy**: *The Nebuchadnezzar Cup* 🏆
- **Aesthetic**: CRT glow effects, scanning lines, Courier Prime monospace typography, retro command line headers.

### 2. 🦄 Pride Guys Fantasy League (`pride_guys.html`)
A vibrant, cheerful **My Little Pony-level cute light mode theme** 🌈💖🦄 tailored specifically for the Pride Guys managers.
- **Trophy**: *The Pride Cup* 🏆
- **Aesthetic**: Soft pastel gradient backdrop (`#fff4fa` ➔ `#f0f7ff`), sparkling animations ✨, bubbly rounded `Fredoka` typography, animated kitschy tagline rotator, and smooth sliding pill tab navigation.

---

## 🚀 Key Modules & Analytics

- **📊 Seasons & Standings Archive**:
  - Filterable by All-Time or specific season years (2017–2025).
  - Toggle between **Actual Standings** and **Optimal Points** (Play the Right Guys) sub-tabs.
  - Interactive **Bad Luck & Award Badges Tally** (Weekly Scoring Champ, Luckiest Win, Heartbreak Loss, Toughest Loss, Nailbiter, Gut Punch, Criminal Win, Victory Lap, Dumpster Fire).

- **🏆 Hall of Champions & Scoring Archives**:
  - Interactive Championship timeline grid displaying podium finishers (1st 🥇, 2nd 🥈, 3rd 🥉) and Regular Season Scoring Champions.
  - Historical manager championship leaderboards.

- **⚔️ Head-to-Head (H2H) Rivalry Engine**:
  - **Matchup Query Tool**: Compare lifetime H2H records between any two managers, complete with regular season & playoff game logs.
  - **Lifetime H2H Grid Matrix**: Interactive cell breakdown matrix with `ALL`, `REGULAR`, and `PLAYOFFS` toggle filters.
  - **H2H Winning Streaks Leaderboard**: Tracks active & historical win streaks with filter toggles (`ALL`, `ACTIVE`, `REGULAR`, `PLAYOFFS`). Features interactive **mouseover popovers** displaying game-by-game scores and multi-tie timeframes.

- **🏈 Weekly Matchup Preview & Recaps**:
  - Weekly matchup breakdown, game summaries, scores, margins, and historical head-to-head context for every game.

- **📋 Complete Draft Archives (2018–2026)**:
  - Year-by-year draft logs with round, pick, player, position, NFL team, and manager badges.
  - Enforced 2026 12-Team Expansion Draft Order.

- **📈 Dynasty Analytics**:
  - Manager lifetime luck charts (Actual Wins vs Top-Half Weekly Wins whole-number model).
  - Points For vs. Points Against Scatter Plot visualizer.

---

## 🛠️ Project Structure & Data Pipeline

```
Y2K-Record-Book/
├── index.html              # Y2K Record Book Web Application (CRT Green Theme)
├── pride_guys.html         # Pride Guys Web Application (Light Rainbow Theme)
├── leagueData.js           # Pre-compiled JS dataset for Y2K site
├── prideGuysData.js        # Pre-compiled JS dataset for Pride Guys site
├── pride_guys_hero.jpg     # Hero unicorn banner emblem
├── README.md               # Repository documentation
└── scripts/ (Internal)     # Python processors for ESPN / Sleeper data ingestion
```

---

## 💻 Running Locally

To host the site on a local web server:

```bash
# Navigate to repository directory
cd /Users/dylansoth/dev/Y2K-Record-Book

# Start local HTTP server on port 8086
python3 -m http.server 8086
```

Open your browser to:
- Y2K Site: `http://localhost:8086/index.html`
- Pride Guys Site: `http://localhost:8086/pride_guys.html`

---

## 🚢 Deployment

The project is hosted live on **GitHub Pages** directly from the `main` branch.

```bash
git add .
git commit -m "Update league records and site features"
git push origin main
```

Changes are automatically built and published live via GitHub Pages.

---

### 💖 Built for the League with Pride & Excellence 🏈🦄
