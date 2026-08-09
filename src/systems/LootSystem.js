import { WEAPONS, RARITY_TIERS } from '../weapons/WeaponData.js';

/**
 * Core looter-shooter drop logic: on a kill (player or zombie), roll a
 * weighted rarity, pick a random weapon archetype, and apply that rarity's
 * stat multiplier. This is the seam where "Scavenger" perk or event
 * modifiers (double-loot weekends, etc.) should plug in.
 */
export class LootSystem {
  constructor() {
    this.totalWeight = RARITY_TIERS.reduce((s, t) => s + t.weight, 0);
  }

  rollRarity(bonusLuck = 0) {
    // bonusLuck (0..1) shifts weight away from common toward rarer tiers
    const roll = Math.random() * this.totalWeight * (1 - bonusLuck * 0.3);
    let acc = 0;
    for (const tier of RARITY_TIERS) {
      acc += tier.weight;
      if (roll <= acc) return tier;
    }
    return RARITY_TIERS[0];
  }

  generateWeaponDrop(bonusLuck = 0) {
    const ids = Object.keys(WEAPONS);
    const weaponId = ids[Math.floor(Math.random() * ids.length)];
    const base = WEAPONS[weaponId];
    const rarity = this.rollRarity(bonusLuck);
    return {
      weaponId,
      name: `${rarity.label} ${base.name}`,
      rarity: rarity.id,
      color: rarity.color,
      statMult: rarity.statMult,
      damage: Math.round(base.damage * rarity.statMult),
    };
  }
}
