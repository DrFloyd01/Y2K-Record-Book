# 🏈 Y2K Record Book & Pride Guys Fantasy League Vault [v2.0] 🏆

Welcome to the **Y2K Record Book & Pride Guys Fantasy League Vault (v2.0)** — an all-inclusive historical dynasty hub and interactive web application archiving fantasy football history across 10+ seasons!

> 🔗 **Live Sites (GitHub Pages)**:
> - 📟 **Y2K Record Book (P1 Phosphor CRT Theme)**: [https://drfloyd01.github.io/Y2K-Record-Book/](https://drfloyd01.github.io/Y2K-Record-Book/)
> - 🦄 **Pride Guys Fantasy League (Cute Light Mode Rainbow Theme)**: [https://drfloyd01.github.io/Y2K-Record-Book/pride_guys.html](https://drfloyd01.github.io/Y2K-Record-Book/pride_guys.html)

---

## ⚡ What's New in v2.0 Architecture

- 🚀 **Vite & Modular ES Modules**: Built on a modern Vite build pipeline, modularizing analytics engines, H2H calculations, and data loaders.
- 🎨 **Pre-compiled Tailwind CSS**: Eliminated the heavy ~3MB client-side Tailwind Play CDN runtime in favor of pre-compiled, minified static stylesheets (~41 KB).
- 🛡️ **Security Hardened**:
  - HTML entity sanitization layer (`escapeHtml`, `html` template tag) to prevent client-side DOM XSS.
  - Strict Content Security Policy (`CSP`) meta tags.
  - Replaced unpinned, unhashed external CDN dependencies (`unpkg.com`, `jsdelivr`) with version-locked local npm bundles.
- 📦 **Single Source of Truth**: Asynchronous JSON fetching (`/data/leagueData.json`, `/data/prideGuysData.json`) with UI loading handling, replacing duplicate `.js` window-global wrappers.
- 🧪 **Automated Vitest Test Suite**: Unit tests covering sanitization, win streaks, H2H matrix calculations, and standings.
- 🚢 **Automated CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) running automated test suites and deploying production builds directly to GitHub Pages.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Run automated unit tests
npm run test

# 4. Build optimized production bundle
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 📂 Project Structure

```
Y2K-Record-Book-v2/
├── index.html                   # Y2K CRT Green Terminal Entrypoint
├── pride_guys.html              # Pride Guys Rainbow Vault Entrypoint
├── package.json                 # Node manifest & npm scripts
├── vite.config.js               # Multi-page Vite configuration & vendor chunking
├── tailwind.config.js           # Shared Tailwind theme definitions
├── postcss.config.js            # PostCSS configuration
├── .gitignore                   # Standard ignore rules
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated CI/CD for GitHub Pages
├── public/
│   ├── data/
│   │   ├── leagueData.json      # Primary Y2K League dataset
│   │   └── prideGuysData.json   # Pride Guys League dataset
│   ├── y2k_logo.png
│   ├── pride_guys_hero.jpg
│   └── .nojekyll
├── src/
│   ├── styles/
│   │   ├── crt.css              # Phosphor CRT scanlines, glow, terminal styles
│   │   └── pride.css            # Pastel gradients, sparkles, bubbly typography
│   ├── core/
│   │   ├── sanitizer.js         # XSS prevention & HTML entity encoding
│   │   └── dataLoader.js        # Async data fetcher & cache
│   ├── analytics/
│   │   ├── standings.js         # Standings, optimal points, badge calculations
│   │   └── h2h.js               # H2H matrix, rivalry engine, streak algorithms
│   ├── app.js                   # Y2K CRT application bootstrap
│   └── pride_app.js             # Pride Guys application bootstrap
└── tests/
    ├── sanitizer.test.js        # XSS sanitization unit tests
    └── h2h.test.js              # H2H and streak calculation unit tests
```
