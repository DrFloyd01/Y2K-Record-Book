/**
 * NFL Player Championship Rings Analytics & Name Normalization
 */

/**
 * Normalizes player names across data sources (strips generational suffixes, standardizes D/ST and abbreviations).
 * @param {string} name 
 * @returns {string} Normalized player name
 */
export function getNormalizedPlayerName(name) {
  if (!name) return '';
  let n = name.trim();
  n = n.replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, '').trim();
  n = n.replace(/T\.J\./g, 'TJ').replace(/A\.J\./g, 'AJ').replace(/C\.J\./g, 'CJ').replace(/D\.J\./g, 'DJ').replace(/J\.K\./g, 'JK');
  if (n.includes('Pittsburgh') || n.includes('Steelers')) return 'Pittsburgh Steelers';
  if (n.includes('Buffalo') || n.includes('Bills')) return 'Buffalo Bills';
  if (n.includes('Tampa Bay') || n.includes('Buccaneers')) return 'Tampa Bay Buccaneers';
  if (n.includes('San Francisco') || n.includes('49ers')) return 'San Francisco 49ers';
  if (n.includes('Baltimore') || n.includes('Ravens')) return 'Baltimore Ravens';
  if (n.includes('Deebo Samuel')) return 'Deebo Samuel';
  if (n.includes('Marquise Brown') || n.includes('Hollywood Brown')) return 'Marquise Brown';
  return n;
}

/**
 * Retrieves championship ring history and details for a player.
 * @param {object} leagueData 
 * @param {string} playerName 
 * @returns {object|null} Ring info object or null
 */
export function getPlayerRingInfo(leagueData, playerName) {
  if (!leagueData) return null;
  const lookup = leagueData.playerRingsLookup || {};
  const norm = getNormalizedPlayerName(playerName);
  return lookup[norm] || null;
}
