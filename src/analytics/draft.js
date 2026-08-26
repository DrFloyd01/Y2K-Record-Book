/**
 * Draft Analytics, Lifetime Player History, and Pick Filtering
 */

/**
 * Searches historical seasons for all instances of a player being drafted.
 * @param {object} leagueData 
 * @param {string} playerName 
 * @returns {Array} Array of historical pick records
 */
export function getPlayerLifetimeDraftHistory(leagueData, playerName) {
  if (!leagueData || !playerName) return [];
  const history = [];
  const seasons = leagueData.seasons || [];
  const targetLower = playerName.trim().toLowerCase();

  seasons.forEach(yr => {
    const sData = leagueData.seasonData ? leagueData.seasonData[yr] : null;
    if (sData && Array.isArray(sData.draftPicks)) {
      const match = sData.draftPicks.find(p => p.player && p.player.toLowerCase() === targetLower);
      if (match) {
        history.push({
          year: yr,
          round: match.round,
          pickInRound: match.pickInRound,
          overallPick: match.overallPick,
          ownerName: match.ownerName,
          teamName: match.teamName
        });
      }
    }
  });

  return history;
}

/**
 * Filters a season's draft picks by round and search query.
 * @param {Array} picks 
 * @param {object} options { searchVal, roundVal }
 * @returns {Array} Filtered picks
 */
export function filterDraftPicks(picks, { searchVal = '', roundVal = 'all' } = {}) {
  if (!Array.isArray(picks)) return [];
  const query = searchVal.trim().toLowerCase();

  return picks.filter(p => {
    if (roundVal !== 'all' && p.round !== parseInt(roundVal, 10)) return false;
    if (query) {
      const matchPlayer = p.player && p.player.toLowerCase().includes(query);
      const matchTeam = p.teamName && p.teamName.toLowerCase().includes(query);
      const matchOwner = p.ownerName && p.ownerName.toLowerCase().includes(query);
      if (!matchPlayer && !matchTeam && !matchOwner) return false;
    }
    return true;
  });
}
