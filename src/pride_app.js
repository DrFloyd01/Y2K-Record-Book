/**
 * Pride Guys Fantasy League - Application Entry Point
 * Initialized via shared multi-league controller with Pride Guys configuration.
 */

import { PRIDE_CONFIG } from './config/pride.js';
import { createLeagueApp } from './core/leagueApp.js';

export const prideApp = createLeagueApp(PRIDE_CONFIG);
