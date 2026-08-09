export const PROGRESSION_VERSION = 2;
export const MAX_LEVEL = 55;
export const MAX_PRESTIGE = 15;
export const MAX_WEAPON_LEVEL = 50;
export const PRESTIGE_XP_BONUS_PER_RANK = 0.01;
export const MAX_XP_MULTIPLIER = 5;

export const XP_ACTIONS = Object.freeze({
  kill: 100,
  assistMinimum: 30,
  assistMaximum: 80,
  headshot: 50,
  firstBlood: 100,
  longshot: 25,
  revenge: 35,
  comeback: 50,
  objectiveKill: 50,
  objectiveCapture: 250,
  objectiveDefend: 125,
  objectivePlant: 200,
  objectiveDefuse: 300,
  matchWin: 750,
  matchLoss: 200,
  rareLoot: 100,
  epicLoot: 250,
  legendaryLoot: 500,
  zombieKill: 25,
  zombieEliteKill: 125,
});

export const PRESTIGE_NAMES = Object.freeze([
  'First Blood',
  'Street Soldier',
  'Block Enforcer',
  'Corner Captain',
  'District Hunter',
  'Syndicate',
  'Night Reaper',
  'Urban Phantom',
  'Kingpin',
  'City Tyrant',
  'War Chief',
  'Underworld Elite',
  'Street Legend',
  'Death Crown',
  'StreetKillaz Master',
]);

const PRESTIGE_EXCLUSIVES = Object.freeze([
  ['calling_card_first_blood'],
  ['camo_bronze_streets'],
  ['blueprint_enforcer_smg'],
  ['operator_corner_captain'],
  ['camo_crimson_hunter'],
  ['blueprint_syndicate_rifle'],
  ['calling_card_night_reaper'],
  ['camo_phantom_smoke'],
  ['blueprint_kingpin_shotgun'],
  ['operator_city_tyrant'],
  ['camo_warchief_gold'],
  ['blueprint_underworld_dmr'],
  ['operator_street_legend'],
  ['camo_death_crown'],
  ['weapon_streetkillaz_master'],
]);

export const PRESTIGE_REWARDS = Object.freeze(
  PRESTIGE_NAMES.map((name, index) => {
    const prestige = index + 1;
    return Object.freeze({
      prestige,
      name,
      emblem: `prestige_${prestige}_emblem`,
      permanentXpBonus: prestige * PRESTIGE_XP_BONUS_PER_RANK,
      rewards: PRESTIGE_EXCLUSIVES[index],
    });
  }),
);

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundTo50(value) {
  return Math.round(value / 50) * 50;
}

/** XP needed to advance from `level` to `level + 1`. */
export function xpRequiredForLevel(level) {
  if (level >= MAX_LEVEL) return 0;
  const x = Math.max(1, Math.floor(level)) - 1;
  return roundTo50(550 + 125 * x + 18 * Math.pow(x, 1.9));
}

export function weaponXpRequiredForLevel(level) {
  if (level >= MAX_WEAPON_LEVEL) return 0;
  const x = Math.max(1, Math.floor(level)) - 1;
  return Math.round(250 + 70 * x + 14 * Math.pow(x, 1.7));
}

export function multiKillBonus(count = 1) {
  if (count <= 1) return 0;
  if (count === 2) return 50;
  if (count === 3) return 125;
  if (count === 4) return 250;
  if (count === 5) return 400;
  return 600;
}

export function getLevelRewards(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return [];

  if (level === 1) {
    return [
      { type: 'weapon', id: 'pistol', name: 'Sidearm', persistent: true },
      { type: 'loadout', id: 'street_recruit', name: 'Street Recruit Loadout', persistent: true },
    ];
  }

  const rewards = [];
  if (level % 10 === 0) {
    rewards.push({ type: 'operator_skin', id: `operator_rank_${level}`, name: `Rank ${level} Operator Skin` });
  } else if (level % 5 === 0) {
    rewards.push({ type: 'weapon', id: `weapon_rank_${level}`, name: `Rank ${level} Weapon` });
  } else if (level % 4 === 0) {
    rewards.push({ type: 'perk', id: `perk_rank_${level}`, name: `Rank ${level} Perk` });
  } else if (level % 3 === 0) {
    rewards.push({ type: 'equipment', id: `equipment_rank_${level}`, name: `Rank ${level} Equipment` });
  } else {
    rewards.push({ type: 'attachment', id: `attachment_rank_${level}`, name: `Rank ${level} Attachment` });
  }

  if (level % 7 === 0) {
    rewards.push({ type: 'emote', id: `emote_rank_${level}`, name: `Rank ${level} Emote` });
  }

  if (level === MAX_LEVEL) {
    rewards.push(
      { type: 'operator_skin', id: 'operator_king_of_the_block', name: 'King of the Block' },
      { type: 'feature', id: 'prestige_access', name: 'Prestige Access' },
    );
  }

  return rewards;
}

export function createDefaultProgressionState(playerId = 'local-player', displayName = 'StreetKilla') {
  return {
    version: PROGRESSION_VERSION,
    revision: 0,
    playerId,
    displayName,
    level: 1,
    levelXp: 0,
    prestige: 0,
    lifetimeXp: 0,
    currentPrestigeXp: 0,
    permanentBonuses: { xp: 0, loadoutSlots: 0 },
    unlocks: {},
    weaponProgress: {},
    challenges: { dailyKey: null, weeklyKey: null, daily: [], weekly: [] },
    stats: {
      kills: 0,
      deaths: 0,
      assists: 0,
      wins: 0,
      losses: 0,
      headshots: 0,
      objectives: 0,
      zombiesKilled: 0,
      zombiesRounds: 0,
    },
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function calculateXpAward(action, context = {}, state = createDefaultProgressionState()) {
  let base = 0;
  const bonuses = [];

  switch (action) {
    case 'kill': {
      base = XP_ACTIONS.kill;
      if (context.headshot) bonuses.push({ name: 'Headshot', amount: XP_ACTIONS.headshot });
      if (context.firstBlood) bonuses.push({ name: 'First Blood', amount: XP_ACTIONS.firstBlood });
      if (context.longshot) bonuses.push({ name: 'Longshot', amount: XP_ACTIONS.longshot });
      if (context.revenge) bonuses.push({ name: 'Revenge', amount: XP_ACTIONS.revenge });
      if (context.comeback) bonuses.push({ name: 'Comeback', amount: XP_ACTIONS.comeback });
      if (context.objectiveKill) bonuses.push({ name: 'Objective Kill', amount: XP_ACTIONS.objectiveKill });
      const multi = multiKillBonus(Number(context.multiKillCount ?? 1));
      if (multi > 0) bonuses.push({ name: `${context.multiKillCount}x Multi-Kill`, amount: multi });
      const streak = Math.max(0, Number(context.streak ?? 0));
      if (streak >= 5 && streak % 5 === 0) bonuses.push({ name: `${streak} Kill Streak`, amount: streak * 15 });
      break;
    }
    case 'assist': {
      const share = clamp(Number(context.damageShare ?? 0.5), 0, 1);
      base = Math.round(XP_ACTIONS.assistMinimum + (XP_ACTIONS.assistMaximum - XP_ACTIONS.assistMinimum) * share);
      break;
    }
    case 'objective_capture': base = XP_ACTIONS.objectiveCapture; break;
    case 'objective_defend': base = XP_ACTIONS.objectiveDefend; break;
    case 'objective_plant': base = XP_ACTIONS.objectivePlant; break;
    case 'objective_defuse': base = XP_ACTIONS.objectiveDefuse; break;
    case 'match_win': base = XP_ACTIONS.matchWin; break;
    case 'match_loss': base = XP_ACTIONS.matchLoss; break;
    case 'rare_loot': {
      base = context.rarity === 'legendary'
        ? XP_ACTIONS.legendaryLoot
        : context.rarity === 'epic'
          ? XP_ACTIONS.epicLoot
          : context.rarity === 'rare'
            ? XP_ACTIONS.rareLoot
            : 0;
      break;
    }
    case 'zombie_kill': base = context.elite ? XP_ACTIONS.zombieEliteKill : XP_ACTIONS.zombieKill; break;
    case 'zombies_round_survived': base = 100 + Math.max(1, Number(context.round ?? 1)) * 20; break;
    case 'challenge': base = Math.max(0, Number(context.rewardXp ?? 0)); break;
    default: throw new Error(`Unknown XP action: ${action}`);
  }

  const subtotal = base + bonuses.reduce((sum, item) => sum + item.amount, 0);
  const supplied = context.multipliers ?? {};
  const multiplierParts = {
    event: clamp(Number(supplied.event ?? 1), 1, 3),
    playlist: clamp(Number(supplied.playlist ?? 1), 1, 2),
    perk: clamp(Number(supplied.perk ?? 1), 1, 1.25),
    party: clamp(Number(supplied.party ?? 1), 1, 1.25),
    prestige: 1 + Number(state.permanentBonuses?.xp ?? 0),
  };
  const combinedMultiplier = context.applyMultipliers === false
    ? 1
    : clamp(Object.values(multiplierParts).reduce((total, value) => total * value, 1), 1, MAX_XP_MULTIPLIER);

  return {
    action,
    base,
    bonuses,
    subtotal,
    multiplierParts,
    combinedMultiplier,
    total: Math.round(subtotal * combinedMultiplier),
  };
}
