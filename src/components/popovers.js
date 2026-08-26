/**
 * Shared Popover & Tooltip UI Builders
 */

import { getStatCardTop5 } from '../analytics/statRecords.js';
import { getPlayerRingInfo } from '../analytics/rings.js';
import { getPlayerLifetimeDraftHistory } from '../analytics/draft.js';
import { CRT_THEME } from '../theme/theme.js';

/**
 * Builds the Top 5 stat record breakdown popover.
 * @param {object} params 
 * @returns {string} HTML string
 */
export function buildStatCardTop5Popover({
  cardTitle,
  metricKey,
  season,
  rowPopDir = '',
  leagueData,
  theme = CRT_THEME
}) {
  const seasonLabel = season === 'allTime' ? 'ALL-TIME REGULAR' : (season === 'playoffs' ? 'ALL-TIME PLAYOFFS' : `${season} SEASON`);
  const top5 = getStatCardTop5(leagueData, metricKey, season);
  const cfg = theme.statPopover;

  const rowsHtml = top5.map((item, i) => `
    <div class="${cfg.rowClass}">
      <div>
        <span class="${cfg.ownerClass}">#${i + 1} ${item.owner}</span>
        <span class="${cfg.subClass}">${item.sub}</span>
      </div>
      <span class="${cfg.valClass}">${item.valStr}</span>
    </div>
  `).join('');

  return `
    <div class="tooltip-content${rowPopDir} ${cfg.containerClass}">
      <div class="${cfg.headerClass}">&gt; TOP 5: ${cardTitle} (${seasonLabel})</div>
      ${rowsHtml || `<div class="${cfg.emptyClass}">No data records found</div>`}
    </div>
  `;
}

/**
 * Builds the lifetime draft history popover for a player.
 * @param {object} params 
 * @returns {string} HTML string
 */
export function getPlayerLifetimeDraftPopover({
  playerName,
  rowPopDir = '',
  leagueData,
  theme = CRT_THEME
}) {
  const history = getPlayerLifetimeDraftHistory(leagueData, playerName);
  if (history.length === 0) return '';
  const cfg = theme.draftPopover;

  const rowsHtml = history.map(h => `
    <div class="${cfg.rowClass}">
      <div>
        <span class="${cfg.yearRoundClass}">${h.year} Round ${h.round}</span>
        <span class="${cfg.pickSubClass}">Pick #${h.overallPick} (R${h.round}P${h.pickInRound})</span>
      </div>
      <div class="text-right">
        <span class="${cfg.ownerClass}">${h.ownerName}</span>
        <span class="${cfg.teamClass}">${h.teamName}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="tooltip-content${rowPopDir} ${cfg.containerClass}">
      <div class="${cfg.headerClass}">
        <span>🏈 ${playerName}</span>
        <span class="${cfg.countBadgeClass}">${history.length}x Drafted</span>
      </div>
      <div class="${cfg.subtitleClass}">Lifetime League Draft History:</div>
      ${rowsHtml}
    </div>
  `;
}

/**
 * Builds the championship ring badge & ceremony popover for a player.
 * @param {object} params 
 * @returns {string} HTML string
 */
export function getPlayerRingBadgeHtml({
  playerName,
  leagueData,
  theme = CRT_THEME
}) {
  const ringInfo = getPlayerRingInfo(leagueData, playerName);
  if (!ringInfo || ringInfo.ringsCount === 0) return '';
  const cfg = theme.ring;

  const ringsCount = ringInfo.ringsCount;
  const ringBadgeText = ringsCount > 1 ? `💍 x${ringsCount}` : `💍`;

  const rowsHtml = ringInfo.rings.map(r => `
    <div class="${cfg.rowClass}">
      <div>
        <span class="${cfg.titleClass}">🏆 ${r.year} Champion (Ring #${r.ringNumber})</span>
        <span class="${cfg.roleClass}">${r.role} • ${r.draftInfo || 'Championship Roster'}</span>
      </div>
      <div class="text-right">
        <span class="${cfg.ownerClass}">${r.owner}</span>
        <span class="${cfg.teamClass}">${r.team}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="tooltip-trigger inline-block ml-1 cursor-pointer">
      <span class="${cfg.badgeClass}">${ringBadgeText}</span>
      <div class="tooltip-content ${cfg.containerClass}">
        <div class="${cfg.headerClass}">
          <span>💍 ${ringInfo.player}</span>
          <span class="${cfg.countBadgeClass}">${ringsCount} Championship Ring${ringsCount > 1 ? 's' : ''}</span>
        </div>
        <div class="${cfg.subtitleClass}">Championship Ring History:</div>
        ${rowsHtml}
      </div>
    </div>
  `;
}
