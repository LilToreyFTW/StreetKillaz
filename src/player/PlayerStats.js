export class PlayerStats {
  constructor() {
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 0;
    this.shield = 0;
    this._dead = false;
    this.level = 1;
    this.prestige = 0;
    this.xp = 0;
    this.credits = 0;
    this._listeners = {};
  }

  on(event, callback) {
    (this._listeners[event] ||= []).push(callback);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((entry) => entry !== callback);
    };
  }

  _emit(event, payload) {
    for (const callback of this._listeners[event] || []) callback(payload);
  }

  syncProgression(state) {
    this.level = state.level;
    this.prestige = state.prestige;
    this.xp = state.levelXp;
    this._emit('progression', { level: this.level, prestige: this.prestige, xp: this.xp });
  }

  setHealthFromServer(health, maxHealth = this.maxHealth, shield = this.shield, maxShield = this.maxShield) {
    this.maxHealth = Math.max(1, Number(maxHealth) || 100);
    this.health = Math.min(this.maxHealth, Math.max(0, Number(health) || 0));
    this.maxShield = Math.max(0, Number(maxShield) || 0);
    this.shield = Math.min(this.maxShield, Math.max(0, Number(shield) || 0));
    this._emit('health', this.health);
    this._emit('shield', { shield: this.shield, maxShield: this.maxShield });
    if (this.health === 0 && !this._dead) { this._dead = true; this._emit('death'); }
    if (this.health > 0) this._dead = false;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - Math.max(0, Number(amount) || 0));
    this._emit('health', this.health);
    if (this.health === 0 && !this._dead) { this._dead = true; this._emit('death'); }
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + Math.max(0, Number(amount) || 0));
    this._emit('health', this.health);
  }

  respawn() {
    this.health = this.maxHealth;
    this._dead = false;
    this._emit('health', this.health);
  }
}
