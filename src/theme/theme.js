/**
 * Theme Configurations for Y2K (CRT Green) and Pride Guys (Pastel Rainbow)
 */

export const CRT_THEME = {
  name: 'crt',
  fontFamily: 'font-mono',
  
  // Stat Card Popover
  statPopover: {
    containerClass: 'p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 text-left font-mono z-50 w-72',
    headerClass: 'font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1',
    rowClass: 'py-1 border-b border-emerald-900/60 flex items-center justify-between text-[11px] font-mono',
    ownerClass: 'font-bold text-emerald-300',
    subClass: 'text-[10px] text-emerald-500 block',
    valClass: 'font-extrabold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 border border-emerald-800 text-[10px]',
    emptyClass: 'text-emerald-600 italic'
  },

  // Ring Badge & Popover
  ring: {
    badgeClass: 'px-1.5 py-0.5 bg-amber-950/90 text-amber-300 font-bold border border-amber-500 rounded text-[10px] hover:bg-amber-900 shadow-sm',
    containerClass: 'p-3 bg-[#020b05] text-emerald-100 rounded border-2 border-amber-500 text-xs shadow-2xl text-left font-mono z-50 w-72',
    headerClass: 'font-bold text-amber-400 border-b border-amber-800 pb-1 mb-1.5 flex items-center justify-between',
    countBadgeClass: 'text-[10px] text-amber-400 font-bold',
    subtitleClass: 'text-[10px] text-emerald-600 mb-1 font-bold',
    rowClass: 'py-1 border-b border-amber-900/40 flex items-center justify-between text-[11px] font-mono',
    titleClass: 'font-bold text-amber-300',
    roleClass: 'text-[10px] text-amber-500 block',
    ownerClass: 'font-bold text-emerald-300',
    teamClass: 'text-[9px] text-emerald-500 block'
  },

  // Player Draft Popover
  draftPopover: {
    containerClass: 'p-2.5 bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 text-left font-mono z-50 w-72',
    headerClass: 'font-bold text-emerald-400 border-b border-emerald-800 pb-1 mb-1 flex items-center justify-between',
    countBadgeClass: 'text-[10px] text-amber-400 font-bold',
    subtitleClass: 'text-[10px] text-emerald-600 mb-1',
    rowClass: 'py-1 border-b border-emerald-900/40 flex items-center justify-between text-[11px]',
    yearRoundClass: 'font-bold text-amber-400',
    pickSubClass: 'text-[10px] text-emerald-500 block',
    ownerClass: 'font-bold text-emerald-300',
    teamClass: 'text-[9px] text-emerald-600 block'
  },

  // Dynasty Leaderboard & Standings
  dynasty: {
    bins: {
      '1st': { badge: 'bg-amber-950 text-amber-300', border: 'border-amber-500' },
      '2nd': { badge: 'bg-emerald-950 text-slate-300', border: 'border-slate-400' },
      '3rd': { badge: 'bg-emerald-950 text-amber-600', border: 'border-amber-700' },
      '4th': { badge: 'bg-emerald-950 text-emerald-400', border: 'border-emerald-700' },
      '5th_6th': { badge: 'bg-emerald-950 text-emerald-500', border: 'border-emerald-800' },
      '7th_12th': { badge: 'bg-black text-emerald-700', border: 'border-emerald-900' }
    },
    scoringTitles: {
      badge: 'bg-emerald-950 text-emerald-300 font-black border border-emerald-500 rounded text-xs shadow-sm',
      container: 'bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 text-left min-w-[220px] z-50'
    },
    playoffApps: {
      badge: 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-600 rounded text-xs shadow-sm',
      container: 'bg-[#020b05] text-emerald-100 rounded border-2 border-emerald-500 text-xs shadow-2xl p-3 z-50'
    },
    rowClass: 'border-b border-emerald-950 hover:bg-emerald-950/50 transition-colors',
    ownerClass: 'font-bold text-emerald-300',
    rankClass: 'text-emerald-500 font-mono',
    accentText: 'text-emerald-400 font-mono'
  }
};

export const PRIDE_THEME = {
  name: 'pride',
  fontFamily: 'font-sans',

  // Stat Card Popover
  statPopover: {
    containerClass: 'p-2.5 bg-white text-pink-700 rounded border border-pink-400 text-xs shadow-2xl text-left font-sans z-50 w-72',
    headerClass: 'font-bold text-amber-500 border-b border-pink-200 pb-1 mb-1',
    rowClass: 'py-1 border-b border-pink-200/40 flex items-center justify-between text-[11px]',
    ownerClass: 'font-bold text-pink-700',
    subClass: 'text-[10px] text-purple-700 block',
    valClass: 'font-extrabold text-pink-600 bg-pink-50/90 px-1.5 py-0.5 border border-purple-200 text-[10px]',
    emptyClass: 'text-purple-700 italic'
  },

  // Ring Badge & Popover
  ring: {
    badgeClass: 'px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold border border-amber-300 rounded text-[10px] hover:bg-amber-200 shadow-sm',
    containerClass: 'p-3 bg-white text-purple-950 rounded-2xl border-2 border-amber-400 text-xs shadow-2xl text-left font-sans z-50 w-72',
    headerClass: 'font-bold text-amber-800 border-b border-amber-200 pb-1 mb-1.5 flex items-center justify-between',
    countBadgeClass: 'text-[10px] text-amber-700 font-bold',
    subtitleClass: 'text-[10px] text-pink-600 mb-1 font-bold',
    rowClass: 'py-1 border-b border-pink-100 flex items-center justify-between text-[11px] font-sans',
    titleClass: 'font-bold text-amber-800',
    roleClass: 'text-[10px] text-pink-600 block',
    ownerClass: 'font-bold text-purple-950',
    teamClass: 'text-[9px] text-purple-700 block'
  },

  // Player Draft Popover
  draftPopover: {
    containerClass: 'p-2.5 bg-white text-pink-700 rounded border border-pink-400 text-xs shadow-2xl text-left font-sans z-50 w-72',
    headerClass: 'font-bold text-pink-600 border-b border-pink-200 pb-1 mb-1 flex items-center justify-between',
    countBadgeClass: 'text-[10px] text-amber-400 font-bold',
    subtitleClass: 'text-[10px] text-pink-600 mb-1',
    rowClass: 'py-1 border-b border-pink-200/40 flex items-center justify-between text-[11px]',
    yearRoundClass: 'font-bold text-amber-400',
    pickSubClass: 'text-[10px] text-pink-600 block',
    ownerClass: 'font-bold text-pink-700',
    teamClass: 'text-[9px] text-purple-700 block'
  },

  // Dynasty Leaderboard & Standings
  dynasty: {
    bins: {
      '1st': { badge: 'bg-amber-100 text-amber-900', border: 'border-amber-300' },
      '2nd': { badge: 'bg-slate-100 text-slate-800', border: 'border-slate-300' },
      '3rd': { badge: 'bg-amber-50 text-amber-800', border: 'border-amber-200' },
      '4th': { badge: 'bg-pink-50 text-pink-800', border: 'border-pink-200' },
      '5th_6th': { badge: 'bg-purple-50 text-purple-800', border: 'border-purple-200' },
      '7th_12th': { badge: 'bg-rose-50 text-rose-800', border: 'border-rose-200' }
    },
    scoringTitles: {
      badge: 'bg-pink-100 text-pink-800 font-black border-2 border-pink-300 rounded-lg text-xs shadow-sm',
      container: 'bg-white text-purple-950 rounded-2xl border-2 border-pink-300 text-xs shadow-xl text-left min-w-[220px]'
    },
    playoffApps: {
      badge: 'bg-purple-50 text-purple-900 font-bold border-2 border-purple-200 rounded-lg text-xs shadow-sm',
      container: 'bg-white text-purple-950 rounded-2xl border-2 border-purple-200 text-xs shadow-2xl p-3 z-50'
    },
    rowClass: 'border-b border-pink-100 hover:bg-pink-50/80 transition-colors',
    ownerClass: 'font-bold text-purple-950',
    rankClass: 'text-pink-600',
    accentText: 'text-pink-700'
  }
};
