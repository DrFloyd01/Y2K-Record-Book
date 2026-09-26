import { CRT_THEME } from '../theme/theme.js';

export const Y2K_CONFIG = {
  leagueId: 'y2k',
  name: 'Y2K RECORD BOOK',
  leagueName: 'Y2K League',
  cupName: 'NEBUCHADNEZZAR CUP',
  platform: 'yahoo',
  dataPath: 'data/leagueData.json',
  lineupsPath: 'data/lineups/y2k_lineups.json',
  theme: CRT_THEME,
  activeEraLabel: {
    modern: '2022–2026',
    allTime: '2018–2026'
  },
  eraToggleClasses: {
    modernActive: 'px-2 py-0.5 text-[10px] font-bold font-mono transition-all rounded-sm bg-emerald-900/90 text-emerald-200 border border-emerald-400 crt-glow shadow-[0_0_8px_rgba(0,255,102,0.3)]',
    modernInactive: 'px-2 py-0.5 text-[10px] font-bold font-mono transition-all rounded-sm text-emerald-600 hover:text-emerald-300 border border-transparent',
    allActive: 'px-2 py-0.5 text-[10px] font-bold font-mono transition-all rounded-sm bg-emerald-900/90 text-emerald-200 border border-emerald-400 crt-glow shadow-[0_0_8px_rgba(0,255,102,0.3)]',
    allInactive: 'px-2 py-0.5 text-[10px] font-bold font-mono transition-all rounded-sm text-emerald-600 hover:text-emerald-300 border border-transparent'
  },
  validTabs: ['seasons', 'stats', 'matchups', 'h2h', 'champs', 'teams', 'draft', 'analytics', 'challenges', 'bounties', 'playoffs', 'bracket'],
  hasNavIndicator: false,
  hasTaglines: false,
  features: {
    bounties: true,
    consolationLadder: false
  }
};
