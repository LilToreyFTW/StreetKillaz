export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill');
    this.shieldFill = document.getElementById('shield-fill');
    this.shieldTrack = document.getElementById('shield-track');
    this.xpFill = document.getElementById('xp-fill');
    this.xpText = document.getElementById('xp-text');
    this.levelBadge = document.getElementById('level-badge');
    this.prestigeBadge = document.getElementById('prestige-badge');
    this.ammoEl = document.getElementById('ammo');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.hitmarker = document.getElementById('hitmarker');
    this.crosshair = document.getElementById('crosshair');
    this.damageIndicator = document.getElementById('damage-indicator');
    this.brStatus = document.getElementById('br-status');
    this.toastContainer = document.getElementById('toast-container');
    this.killFeed = document.getElementById('kill-feed');
    this.networkStatus = document.getElementById('network-status');
  }

  setHealth(hp, maxHp) {
    const ratio = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
    this.healthFill.style.width = `${ratio * 100}%`;
    this.healthFill.dataset.critical = ratio <= 0.25 ? 'true' : 'false';
  }

  setShield(shield, maxShield) {
    if (!this.shieldFill || !this.shieldTrack) return;
    const active = Number(maxShield) > 0;
    this.shieldTrack.hidden = !active;
    this.shieldFill.style.width = `${active ? Math.max(0, Math.min(1, shield / maxShield)) * 100 : 0}%`;
  }

  setXP(ratio) {
    this.xpFill.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  }

  setProgression(view) {
    this.setXP(view.percentage / 100);
    this.levelBadge.textContent = `LEVEL ${view.level}`;
    this.prestigeBadge.textContent = `PRESTIGE ${view.prestige}`;
    if (this.xpText) {
      this.xpText.textContent = view.requiredXp === 0
        ? 'MAX LEVEL'
        : `${view.currentXp.toLocaleString()} / ${view.requiredXp.toLocaleString()} XP`;
    }
  }

  setLevel(level, prestige) {
    this.levelBadge.textContent = `LEVEL ${level}`;
    this.prestigeBadge.textContent = `PRESTIGE ${prestige}`;
  }

  setAmmo(inMag, reserve, weaponName) {
    this.ammoEl.textContent = `${Math.max(0, inMag)} / ${Math.max(0, reserve)}`;
    this.weaponNameEl.textContent = String(weaponName || '').toUpperCase();
  }

  setNetworkStatus(status, latencyMs) {
    if (!this.networkStatus) return;
    this.networkStatus.textContent = `${status}${Number.isFinite(latencyMs) ? ` • ${Math.round(latencyMs)} MS` : ''}`;
    this.networkStatus.dataset.online = status === 'ONLINE' ? 'true' : 'false';
  }

  flashHitmarker(kill = false, headshot = false) {
    this.hitmarker.classList.remove('show', 'kill', 'headshot');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.toggle('kill', kill);
    this.hitmarker.classList.toggle('headshot', headshot);
    this.hitmarker.classList.add('show');
    setTimeout(() => this.hitmarker.classList.remove('show', 'kill', 'headshot'), 140);
  }

  setCrosshair({ moving = false, firing = false, ads = false } = {}) {
    if (!this.crosshair) return;
    const scale = ads ? 0.65 : 1 + (moving ? 0.45 : 0) + (firing ? 0.6 : 0);
    this.crosshair.style.setProperty('--crosshair-scale', String(scale));
  }

  showDamageDirection(angleRadians = 0) {
    if (!this.damageIndicator) return;
    this.damageIndicator.style.transform = `rotate(${angleRadians}rad)`;
    this.damageIndicator.classList.remove('show'); void this.damageIndicator.offsetWidth;
    this.damageIndicator.classList.add('show');
    setTimeout(() => this.damageIndicator?.classList.remove('show'), 360);
  }

  setBattleRoyaleStatus(state, localPlayerId) {
    if (!this.brStatus) return;
    if (!state) { this.brStatus.hidden = true; return; }
    this.brStatus.hidden = false;
    const alive = state.players?.filter((player) => player.alive).length ?? 0;
    const br = state.battleRoyale;
    this.brStatus.textContent = `ALIVE ${alive}  •  ${br?.stage || 'LOBBY'}  •  CIRCLE ${br?.phase || 1}/${br?.phases || 6}`;
  }

  toast(message, category = 'default') {
    const el = document.createElement('div');
    el.className = `toast toast-${category}`;
    el.textContent = message;
    this.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  addKillFeed({ killerName, victimName, weaponId, headshot }) {
    if (!this.killFeed) return;
    const el = document.createElement('div');
    el.className = 'kill-feed-row';
    el.textContent = `${killerName}  [${String(weaponId || 'weapon').toUpperCase()}${headshot ? ' • HS' : ''}]  ${victimName}`;
    this.killFeed.prepend(el);
    while (this.killFeed.children.length > 6) this.killFeed.lastElementChild.remove();
    setTimeout(() => el.remove(), 6000);
  }
}
