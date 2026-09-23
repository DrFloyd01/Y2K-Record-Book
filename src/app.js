/**
 * Y2K Fantasy Record Book - Application Entry Point
 * Initialized via shared multi-league controller with Y2K configuration.
 */

import { Y2K_CONFIG } from './config/y2k.js';
import { createLeagueApp } from './core/leagueApp.js';

export const y2kApp = createLeagueApp(Y2K_CONFIG);
