import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { defineConfig } from 'vite';

function lineupSaverPlugin() {
  return {
    name: 'lineup-saver-plugin',
    configureServer(server) {
      server.middlewares.use('/api/save-lineups', (req, res) => {
        // Handle CORS preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const matchups = Array.isArray(payload) ? payload : (payload.matchups || []);
              const seasonYear = payload.seasonYear || matchups[0]?.seasonYear;

              if (!seasonYear) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing seasonYear' }));
                return;
              }

              if (matchups.length === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: 0, message: 'No matchups to save yet' }));
                return;
              }

              const lineupsDir = resolve(process.cwd(), 'public/data/lineups');
              if (!existsSync(lineupsDir)) mkdirSync(lineupsDir, { recursive: true });

              // 1. Save seasonal file (Merge with existing weeks to prevent resume overwrite)
              const seasonFile = resolve(lineupsDir, `y2k_${seasonYear}_lineups.json`);
              let existingSeasonData = [];
              if (existsSync(seasonFile)) {
                try { existingSeasonData = JSON.parse(readFileSync(seasonFile, 'utf8')); } catch { existingSeasonData = []; }
              }
              const incomingWeeks = new Set(matchups.map(m => m.week));
              const retainedExisting = existingSeasonData.filter(m => !incomingWeeks.has(m.week));
              const mergedSeason = [...retainedExisting, ...matchups].sort((a, b) => a.week - b.week);
              writeFileSync(seasonFile, JSON.stringify(mergedSeason, null, 2), 'utf8');

              // 2. Merge into master y2k_lineups.json
              const masterFile = resolve(lineupsDir, 'y2k_lineups.json');
              let masterData = [];
              if (existsSync(masterFile)) {
                try { masterData = JSON.parse(readFileSync(masterFile, 'utf8')); } catch { masterData = []; }
              }
              // Replace entries for this season with merged season data
              const otherSeasons = masterData.filter(m => m.seasonYear !== seasonYear);
              const updatedMaster = [...otherSeasons, ...mergedSeason].sort((a, b) => {
                if (b.seasonYear !== a.seasonYear) return b.seasonYear - a.seasonYear;
                return a.week - b.week;
              });
              writeFileSync(masterFile, JSON.stringify(updatedMaster, null, 2), 'utf8');

              // 3. Update public/data/leagueData.json standings with optimalPF & coaching efficiency
              const leagueDataFile = resolve(process.cwd(), 'public/data/leagueData.json');
              if (existsSync(leagueDataFile)) {
                try {
                  const lData = JSON.parse(readFileSync(leagueDataFile, 'utf8'));
                  const sKey = String(seasonYear);
                  if (lData.seasonData && lData.seasonData[sKey]) {
                    const sData = lData.seasonData[sKey];
                    // Aggregate stats per owner
                    const ownerAgg = {};
                    matchups.forEach(m => {
                      [m.homeTeam, m.awayTeam].forEach(t => {
                        if (!t || !t.ownerName) return;
                        if (!ownerAgg[t.ownerName]) {
                          ownerAgg[t.ownerName] = { optPF: 0, actualPF: 0, dohCount: 0 };
                        }
                        ownerAgg[t.ownerName].optPF += (t.optimalScore || t.actualScore || 0);
                        ownerAgg[t.ownerName].actualPF += (t.actualScore || 0);
                        if (t.dOhOccurred) ownerAgg[t.ownerName].dohCount++;
                      });
                    });

                    (sData.standings || []).forEach(st => {
                      const agg = ownerAgg[st.ownerName];
                      if (agg) {
                        st.optimalPF = Number(agg.optPF.toFixed(1));
                        st.optimalPointsFor = Number(agg.optPF.toFixed(1));
                        st.coachingEfficiency = Number(((agg.actualPF / agg.optPF) * 100).toFixed(1));
                        st.dOhCount = agg.dohCount;
                      }
                    });
                    writeFileSync(leagueDataFile, JSON.stringify(lData, null, 2), 'utf8');
                  }
                } catch (e) {
                  console.error('Error updating leagueData:', e);
                }
              }

              console.log(`\n🎉 [API] Successfully ingested ${matchups.length} matchups for Season ${seasonYear}!`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: matchups.length, seasonYear }));
            } catch (err) {
              console.error('Lineup saver error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [lineupSaverPlugin()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pride_guys: resolve(__dirname, 'pride_guys.html'),
      },
      output: {
        manualChunks: {
          chartjs: ['chart.js', 'chart.js/auto'],
          lucide: ['lucide'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
