import { PRIDE_THEME } from '../theme/theme.js';

export const PRIDE_CONFIG = {
  leagueId: 'pride',
  name: 'PRIDE GUYS',
  leagueName: 'Pride Guys',
  cupName: 'THE PRIDE CUP',
  platform: 'espn',
  dataPath: 'data/prideGuysData.json',
  lineupsPath: 'data/lineups/pride_guys_lineups.json',
  theme: PRIDE_THEME,
  activeEraLabel: {
    modern: '🦄 2022+ Era 💖',
    allTime: '🌈 All-Time Era 💖'
  },
  eraToggleClasses: {
    modernActive: 'px-2.5 py-0.5 text-[10px] font-bold font-fredoka transition-all rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-sm',
    modernInactive: 'px-2.5 py-0.5 text-[10px] font-bold font-fredoka transition-all rounded-full text-purple-800 hover:text-pink-600 bg-transparent',
    allActive: 'px-2.5 py-0.5 text-[10px] font-bold font-fredoka transition-all rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-sm',
    allInactive: 'px-2.5 py-0.5 text-[10px] font-bold font-fredoka transition-all rounded-full text-purple-800 hover:text-pink-600 bg-transparent'
  },
  validTabs: ['seasons', 'stats', 'matchups', 'h2h', 'champs', 'teams', 'draft', 'analytics', 'playoffs', 'bracket'],
  hasNavIndicator: true,
  hasTaglines: true,
  taglines: [
    "Slay the Competition, Wear the Crown! 👑✨",
    "Pride, Football & Absolute Fabulousness 🌈🏈",
    "Serving Touchdowns & Pure Drag Excellence Since 2017 💅",
    "Sparkle Hard, Play Harder 💖🦄",
    "The Most Fabulous Record Book in Fantasy Sports 🏆✨",
    "Category Is: Fantasy Championship Realness 💅🔥"
  ],
  features: {
    bounties: false,
    consolationLadder: true
  }
};
