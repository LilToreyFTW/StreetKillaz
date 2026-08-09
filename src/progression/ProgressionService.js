import {
  MAX_LEVEL,
  MAX_PRESTIGE,
  MAX_WEAPON_LEVEL,
  PRESTIGE_REWARDS,
  PRESTIGE_XP_BONUS_PER_RANK,
  calculateXpAward,
  createDefaultProgressionState,
  getLevelRewards,
  weaponXpRequiredForLevel,
  xpRequiredForLevel,
} from './ProgressionRules.js';

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function mergeState(saved) {
  const defaults = createDefaultProgressionState(saved?.playerId, saved?.displayName);
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    permanentBonuses: { ...defaults.permanentBonuses, ...saved.permanentBonuses },
    unlocks: saved.unlocks ?? {},
    weaponProgress: saved.weaponProgress ?? {},
    challenges: { ...defaults.challenges, ...saved.challenges },
    stats: { ...defaults.stats, ...saved.stats },
    history: Array.isArray(saved.history) ? saved.history : [],
  };
}

export class ProgressionService extends EventTarget {
  constructor(repository, { saveDelayMs = 150, historyLimit = 100 } = {}) {
    super();
    this.repository = repository;
    this.saveDelayMs = saveDelayMs;
    this.historyLimit = historyLimit;
    this.state = createDefaultProgressionState();
    this.serverAuthoritative = false;
    this._saveTimer = 0;
  }

  async initialize() {
    this.state = mergeState(await this.repository.load());
    this._validate();
    if (Object.keys(this.state.unlocks).length === 0) this._grantLevelRewards(1);
    this._emit('ready', { state: this.snapshot(), view: this.getView() });
    return this.snapshot();
  }

  setServerAuthoritative(enabled) {
    this.serverAuthoritative = Boolean(enabled);
    this._emit('authoritychange', { serverAuthoritative: this.serverAuthoritative });
  }

  applyServerSnapshot(serverState, { silent = false } = {}) {
    if (!serverState || typeof serverState !== 'object') return;
    const previousLevel = this.state.level;
    const previousPrestige = this.state.prestige;
    const previousUnlocks = new Set(Object.keys(this.state.unlocks));
    this.state = mergeState(serverState);
    this._validate();
    this.queueSave();

    if (!silent && this.state.level > previousLevel) {
      this._emit('levelup', { level: this.state.level, prestige: this.state.prestige, rewards: getLevelRewards(this.state.level) });
    }
    if (!silent && this.state.prestige > previousPrestige) {
      this._emit('prestige', { prestige: this.state.prestige, definition: PRESTIGE_REWARDS[this.state.prestige - 1] });
    }
    if (!silent) {
      for (const key of Object.keys(this.state.unlocks)) {
        if (!previousUnlocks.has(key)) this._emit('unlock', { reward: this.state.unlocks[key] });
      }
    }
    this._emitChange();
  }

  award(action, context = {}) {
    if (this.serverAuthoritative && context.fromServer !== true) {
      return { action, total: 0, ignored: true, reason: 'server-authoritative' };
    }

    const award = calculateXpAward(action, context, this.state);
    if (award.total <= 0) return award;

    this._addRankXp(award.total, award);
    if (context.weaponId) this.addWeaponXp(context.weaponId, Math.max(1, Math.round(award.base * Number(context.weaponXpMultiplier ?? 1))));
    this._applyStats(action, context);
    this._addHistory('xp_award', { action, amount: award.total, breakdown: award });
    this.queueSave();
    this._emit('xpaward', { award, view: this.getView() });
    this._emitChange();
    return award;
  }

  addWeaponXp(weaponId, amount) {
    if (!weaponId || amount <= 0) return null;
    const progress = this.state.weaponProgress[weaponId] ?? {
      weaponId,
      level: 1,
      xp: 0,
      lifetimeXp: 0,
      kills: 0,
      headshots: 0,
      unlocks: [],
    };

    progress.xp += Math.floor(amount);
    progress.lifetimeXp += Math.floor(amount);
    while (progress.level < MAX_WEAPON_LEVEL) {
      const need = weaponXpRequiredForLevel(progress.level);
      if (progress.xp < need) break;
      progress.xp -= need;
      progress.level += 1;
      const reward = this._weaponReward(weaponId, progress.level);
      if (reward && !progress.unlocks.includes(reward.id)) {
        progress.unlocks.push(reward.id);
        this._grantReward(reward, 'weapon_mastery', { weaponId, weaponLevel: progress.level });
      }
      this._emit('weaponlevelup', { weaponId, level: progress.level, reward });
    }
    if (progress.level >= MAX_WEAPON_LEVEL) progress.xp = 0;
    this.state.weaponProgress[weaponId] = progress;
    return clone(progress);
  }

  canPrestige() {
    return this.state.level >= MAX_LEVEL && this.state.prestige < MAX_PRESTIGE;
  }

  prestige() {
    if (this.serverAuthoritative) {
      this._emit('prestigerequest', {});
      return { success: false, pendingServer: true };
    }
    if (!this.canPrestige()) return { success: false, reason: 'Reach Level 55 first.' };

    const rank = this.state.prestige + 1;
    const definition = PRESTIGE_REWARDS[rank - 1];
    this.state.unlocks = Object.fromEntries(Object.entries(this.state.unlocks).filter(([, value]) => value.persistent || value.source === 'prestige'));
    this.state.prestige = rank;
    this.state.level = 1;
    this.state.levelXp = 0;
    this.state.currentPrestigeXp = 0;
    this.state.permanentBonuses.xp = definition.permanentXpBonus;
    this._grantLevelRewards(1);
    this._grantReward({ type: 'emblem', id: definition.emblem, name: `${definition.name} Emblem`, persistent: true }, 'prestige', { prestige: rank });
    for (const id of definition.rewards) {
      this._grantReward({ type: this._inferRewardType(id), id, name: this._formatRewardName(id), persistent: true }, 'prestige', { prestige: rank });
    }
    this._addHistory('prestige', { prestige: rank, name: definition.name, xpBonus: definition.permanentXpBonus });
    this.queueSave();
    this._emit('prestige', { prestige: rank, definition, state: this.snapshot() });
    this._emitChange();
    return { success: true, prestige: rank, definition };
  }

  getView() {
    const max = this.state.level >= MAX_LEVEL;
    const requiredXp = max ? 0 : xpRequiredForLevel(this.state.level);
    return {
      displayRank: `Prestige ${this.state.prestige} | Level ${this.state.level}`,
      level: this.state.level,
      prestige: this.state.prestige,
      currentXp: this.state.levelXp,
      requiredXp,
      remainingXp: Math.max(0, requiredXp - this.state.levelXp),
      percentage: max ? 100 : Math.min(100, (this.state.levelXp / requiredXp) * 100),
      lifetimeXp: this.state.lifetimeXp,
      canPrestige: this.canPrestige(),
      maximumPrestige: this.state.prestige >= MAX_PRESTIGE,
    };
  }

  getRewardsPreview(startLevel = this.state.level + 1, count = 10) {
    const result = [];
    for (let level = startLevel; level <= MAX_LEVEL && result.length < count; level += 1) {
      result.push({ level, rewards: getLevelRewards(level) });
    }
    return result;
  }

  snapshot() {
    return clone(this.state);
  }

  async flushSave() {
    window.clearTimeout(this._saveTimer);
    this._saveTimer = 0;
    await this.repository.save(this.state);
    this._emit('saved', { revision: this.state.revision });
  }

  queueSave() {
    window.clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => {
      this.flushSave().catch((error) => this._emit('persistenceerror', { error }));
    }, this.saveDelayMs);
  }

  _addRankXp(amount, source) {
    this.state.lifetimeXp += amount;
    this.state.currentPrestigeXp += amount;
    if (this.state.level >= MAX_LEVEL) return;
    this.state.levelXp += amount;

    while (this.state.level < MAX_LEVEL) {
      const need = xpRequiredForLevel(this.state.level);
      if (this.state.levelXp < need) break;
      this.state.levelXp -= need;
      this.state.level += 1;
      const rewards = this._grantLevelRewards(this.state.level);
      this._addHistory('level_up', { level: this.state.level, prestige: this.state.prestige, rewards });
      this._emit('levelup', { level: this.state.level, prestige: this.state.prestige, rewards, source });
    }

    if (this.state.level >= MAX_LEVEL) {
      this.state.level = MAX_LEVEL;
      this.state.levelXp = 0;
      this._emit('prestigeavailable', { prestige: this.state.prestige });
    }
  }

  _grantLevelRewards(level) {
    const rewards = getLevelRewards(level);
    rewards.forEach((reward) => this._grantReward(reward, 'level', { level, prestige: this.state.prestige }));
    return rewards;
  }

  _grantReward(reward, source, metadata = {}) {
    const key = `${reward.type}:${reward.id}`;
    if (this.state.unlocks[key]) return false;
    const cosmetic = ['operator_skin', 'emote', 'camo', 'calling_card', 'emblem'].includes(reward.type);
    this.state.unlocks[key] = {
      ...reward,
      source,
      persistent: reward.persistent === true || source === 'prestige' || cosmetic,
      grantedAt: Date.now(),
      ...metadata,
    };
    this._emit('unlock', { reward: clone(this.state.unlocks[key]) });
    return true;
  }

  _applyStats(action, context) {
    const stats = this.state.stats;
    if (action === 'kill') {
      stats.kills += 1;
      if (context.headshot) stats.headshots += 1;
      const weapon = context.weaponId && this.state.weaponProgress[context.weaponId];
      if (weapon) {
        weapon.kills += 1;
        if (context.headshot) weapon.headshots += 1;
      }
    } else if (action === 'zombie_kill') {
      stats.zombiesKilled += 1;
    } else if (action === 'assist') stats.assists += 1;
    else if (action === 'match_win') stats.wins += 1;
    else if (action === 'match_loss') stats.losses += 1;
    else if (action.startsWith('objective_')) stats.objectives += 1;
    else if (action === 'zombies_round_survived') stats.zombiesRounds += 1;
  }

  _weaponReward(weaponId, level) {
    if (level === 2) return { type: 'attachment', id: `${weaponId}_reflex`, name: `${this._formatRewardName(weaponId)} Reflex Sight` };
    if (level === 5) return { type: 'attachment', id: `${weaponId}_suppressor`, name: `${this._formatRewardName(weaponId)} Suppressor` };
    if (level === 10) return { type: 'camo', id: `${weaponId}_asphalt`, name: `${this._formatRewardName(weaponId)} Asphalt Camo` };
    if (level === 25) return { type: 'camo', id: `${weaponId}_gold`, name: `${this._formatRewardName(weaponId)} Gold Camo` };
    if (level === 50) return { type: 'camo', id: `${weaponId}_mastery`, name: `${this._formatRewardName(weaponId)} Mastery Camo` };
    return null;
  }

  _inferRewardType(id) {
    if (id.startsWith('weapon_')) return 'weapon';
    if (id.startsWith('blueprint_')) return 'weapon_blueprint';
    if (id.startsWith('camo_')) return 'camo';
    if (id.startsWith('operator_')) return 'operator_skin';
    if (id.startsWith('calling_card_')) return 'calling_card';
    return 'prestige_reward';
  }

  _formatRewardName(id) {
    return String(id).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  _addHistory(type, data) {
    this.state.history.unshift({
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type,
      timestamp: Date.now(),
      ...data,
    });
    this.state.history = this.state.history.slice(0, this.historyLimit);
  }

  _validate() {
    this.state.level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(this.state.level) || 1)));
    this.state.prestige = Math.min(MAX_PRESTIGE, Math.max(0, Math.floor(Number(this.state.prestige) || 0)));
    this.state.levelXp = Math.max(0, Math.floor(Number(this.state.levelXp) || 0));
    this.state.lifetimeXp = Math.max(0, Math.floor(Number(this.state.lifetimeXp) || 0));
    this.state.currentPrestigeXp = Math.max(0, Math.floor(Number(this.state.currentPrestigeXp) || 0));
    this.state.permanentBonuses.xp = this.state.prestige * PRESTIGE_XP_BONUS_PER_RANK;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  _emitChange() {
    this.state.updatedAt = Date.now();
    this.state.revision += 1;
    this._emit('change', { state: this.snapshot(), view: this.getView() });
  }
}
