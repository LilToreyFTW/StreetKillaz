import { MAX_LEVEL, MAX_PRESTIGE } from '../progression/ProgressionRules.js';

/** Legacy adapter. New code uses progression/ProgressionService.js. */
export class PrestigeSystem {
  constructor(playerStats, { onPrestige } = {}) {
    this.stats = playerStats;
    this.onPrestige = onPrestige || (() => {});
  }

  canPrestige() {
    return this.stats.level >= MAX_LEVEL && this.stats.prestige < MAX_PRESTIGE;
  }

  prestige() {
    if (!this.canPrestige()) return false;
    this.stats.prestige += 1;
    this.stats.level = 1;
    this.stats.xp = 0;
    this.onPrestige(this.stats.prestige);
    this.stats._emit('prestige', this.stats.prestige);
    return true;
  }
}

export { MAX_PRESTIGE };
