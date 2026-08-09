/**
 * Perk definitions + a 3-slot loadout, in the spirit of classic CoD-style
 * perk systems. Icons/descriptions should be pulled from players-perks-assets/
 * once art exists; `apply`/`remove` are where the gameplay hook lives.
 */
export const PERKS = {
  fastHands: {
    id: 'fastHands',
    name: 'Fast Hands',
    description: 'Reload 25% faster.',
    apply: (weaponStats) => ({ ...weaponStats, reloadTime: weaponStats.reloadTime * 0.75 }),
  },
  ironLungs: {
    id: 'ironLungs',
    name: 'Iron Lungs',
    description: '+25 max health.',
    apply: (weaponStats) => weaponStats, // handled via PlayerStats.maxHealth in PerkSystem.equip
  },
  lightFoot: {
    id: 'lightFoot',
    name: 'Light Foot',
    description: 'Faster sprint speed, less footstep noise.',
    apply: (weaponStats) => weaponStats,
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    description: 'Better loot rarity odds from kills.',
    apply: (weaponStats) => weaponStats,
  },
};

const SLOT_COUNT = 3;

export class PerkSystem {
  constructor(playerStats) {
    this.stats = playerStats;
    this.equipped = []; // array of perk ids, length <= SLOT_COUNT
  }

  equip(perkId) {
    if (!PERKS[perkId]) return false;
    if (this.equipped.includes(perkId)) return false;
    if (this.equipped.length >= SLOT_COUNT) return false;
    this.equipped.push(perkId);
    if (perkId === 'ironLungs') {
      this.stats.maxHealth += 25;
      this.stats.health += 25;
    }
    return true;
  }

  unequip(perkId) {
    const i = this.equipped.indexOf(perkId);
    if (i === -1) return false;
    this.equipped.splice(i, 1);
    if (perkId === 'ironLungs') {
      this.stats.maxHealth -= 25;
      this.stats.health = Math.min(this.stats.health, this.stats.maxHealth);
    }
    return true;
  }

  /** Apply all equipped perk effects to a weapon's stat block (used on equip-weapon). */
  modifyWeaponStats(baseStats) {
    return this.equipped.reduce((stats, id) => PERKS[id]?.apply(stats) ?? stats, { ...baseStats });
  }
}

export { SLOT_COUNT };
