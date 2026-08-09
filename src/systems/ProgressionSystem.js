import { MAX_LEVEL, xpRequiredForLevel } from '../progression/ProgressionRules.js';

/**
 * Legacy adapter retained for older game modules. New code should use
 * progression/ProgressionService.js, which adds persistence, challenges,
 * weapon mastery, unlocks, multipliers and server synchronization.
 */
export class ProgressionSystem {
  constructor(playerStats, { onLevelUp } = {}) {
    this.stats = playerStats;
    this.onLevelUp = onLevelUp || (() => {});
  }

  xpForLevel(level) {
    return xpRequiredForLevel(level);
  }

  addXP(amount) {
    if (this.stats.level >= MAX_LEVEL) return;
    this.stats.xp += Math.max(0, Math.floor(Number(amount) || 0));
    let need = this.xpForLevel(this.stats.level);
    while (this.stats.level < MAX_LEVEL && this.stats.xp >= need) {
      this.stats.xp -= need;
      this.stats.level += 1;
      this.onLevelUp(this.stats.level);
      need = this.xpForLevel(this.stats.level);
    }
    if (this.stats.level >= MAX_LEVEL) this.stats.xp = 0;
    this.stats._emit('xp', { xp: this.stats.xp, need, level: this.stats.level });
  }

  progressRatio() {
    return this.stats.level >= MAX_LEVEL ? 1 : this.stats.xp / this.xpForLevel(this.stats.level);
  }

  isMaxLevel() {
    return this.stats.level >= MAX_LEVEL;
  }
}

export { MAX_LEVEL };
