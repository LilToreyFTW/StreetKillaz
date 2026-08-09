import { MAX_LEVEL, MAX_PRESTIGE, PRESTIGE_REWARDS, weaponXpRequiredForLevel } from '../progression/ProgressionRules.js';

export class ProgressionUI {
  constructor(progression, challenges, hud) {
    this.progression = progression;
    this.challenges = challenges;
    this.hud = hud;
    this.panel = document.getElementById('progression-panel');
    this.levelUpBanner = document.getElementById('level-up-banner');
    this.levelUpValue = document.getElementById('level-up-value');
    this.prestigeButton = document.getElementById('prestige-button');
    this.prestigeModal = document.getElementById('prestige-modal');
    this.prestigeModalText = document.getElementById('prestige-modal-text');
    this.rewardPreview = document.getElementById('reward-preview');
    this.challengeList = document.getElementById('challenge-list');
    this.weaponMastery = document.getElementById('weapon-mastery');
    this.historyList = document.getElementById('level-history');
    this._audioContext = null;
    this._bind();
    this.render();
  }

  _bind() {
    this.progression.addEventListener('change', () => this.render());
    this.progression.addEventListener('xpaward', (event) => {
      const award = event.detail.award;
      this.hud.toast(`+${award.total.toLocaleString()} XP • ${this._label(award.action)}`, 'xp');
    });
    this.progression.addEventListener('levelup', (event) => this.showLevelUp(event.detail));
    this.progression.addEventListener('unlock', (event) => this.showUnlock(event.detail.reward));
    this.progression.addEventListener('weaponlevelup', (event) => {
      const { weaponId, level } = event.detail;
      this.hud.toast(`${this._label(weaponId)} reached Weapon Level ${level}`, 'weapon');
      this._tone(760, 0.12);
    });
    this.progression.addEventListener('prestige', (event) => {
      this.hud.toast(`PRESTIGE ${event.detail.prestige} • ${event.detail.definition?.name ?? ''}`, 'prestige');
      this._tone(220, 0.15, 0);
      window.setTimeout(() => this._tone(440, 0.15, 0), 120);
      window.setTimeout(() => this._tone(880, 0.25, 0), 240);
      this.closePrestigeModal();
    });
    this.challenges.addEventListener('change', () => this.renderChallenges());
    this.challenges.addEventListener('complete', (event) => {
      this.hud.toast(`Challenge complete: ${event.detail.challenge.name}`, 'challenge');
      this._tone(920, 0.2);
    });

    document.getElementById('progression-toggle')?.addEventListener('click', () => this.togglePanel());
    document.getElementById('progression-close')?.addEventListener('click', () => this.togglePanel(false));
    this.prestigeButton?.addEventListener('click', () => this.openPrestigeModal());
    document.getElementById('prestige-confirm')?.addEventListener('click', () => this.progression.prestige());
    document.getElementById('prestige-cancel')?.addEventListener('click', () => this.closePrestigeModal());

    window.addEventListener('keydown', (event) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;
      if (!typing && event.code === 'KeyP' && !event.repeat) this.togglePanel();
    });
  }

  render() {
    const view = this.progression.getView();
    this.hud.setProgression(view);
    const panelRank = document.getElementById('panel-rank-display');
    const panelXp = document.getElementById('panel-xp-display');
    const panelLifetime = document.getElementById('panel-lifetime-xp');
    const panelBoost = document.getElementById('panel-xp-boost');
    if (panelRank) panelRank.textContent = view.displayRank;
    if (panelXp) panelXp.textContent = view.requiredXp === 0
      ? 'MAX LEVEL — PRESTIGE AVAILABLE'
      : `${view.currentXp.toLocaleString()} / ${view.requiredXp.toLocaleString()} XP`;
    if (panelLifetime) panelLifetime.textContent = view.lifetimeXp.toLocaleString();
    if (panelBoost) panelBoost.textContent = `+${Math.round((this.progression.state.permanentBonuses.xp || 0) * 100)}%`;
    if (this.prestigeButton) {
      this.prestigeButton.disabled = !view.canPrestige;
      this.prestigeButton.textContent = view.maximumPrestige
        ? 'MAX PRESTIGE REACHED'
        : view.canPrestige
          ? `ENTER PRESTIGE ${view.prestige + 1}`
          : `REACH LEVEL ${MAX_LEVEL}`;
    }
    this.renderRewards();
    this.renderChallenges();
    this.renderWeaponMastery();
    this.renderHistory();
  }

  renderRewards() {
    if (!this.rewardPreview) return;
    const previews = this.progression.getRewardsPreview(undefined, 8);
    this.rewardPreview.innerHTML = previews.length
      ? previews.map(({ level, rewards }) => `
        <div class="progression-row">
          <span class="row-rank">LVL ${level}</span>
          <span>${rewards.map((reward) => reward.name).join(' • ')}</span>
        </div>`).join('')
      : '<div class="empty-state">All standard level rewards unlocked.</div>';
  }

  renderChallenges() {
    if (!this.challengeList) return;
    const state = this.challenges.snapshot();
    const render = (title, items) => `
      <div class="challenge-group">
        <h4>${title}</h4>
        ${items.map((challenge) => {
          const ratio = Math.min(100, (challenge.progress / challenge.target) * 100);
          return `<div class="challenge-card ${challenge.completed ? 'complete' : ''}">
            <div><strong>${challenge.name}</strong><span>${challenge.rewardXp.toLocaleString()} XP</span></div>
            <small>${challenge.progress.toLocaleString()} / ${challenge.target.toLocaleString()}</small>
            <div class="mini-track"><div style="width:${ratio}%"></div></div>
          </div>`;
        }).join('')}
      </div>`;
    this.challengeList.innerHTML = render('DAILY', state.daily) + render('WEEKLY', state.weekly);
  }

  renderWeaponMastery() {
    if (!this.weaponMastery) return;
    const entries = Object.values(this.progression.state.weaponProgress);
    this.weaponMastery.innerHTML = entries.length
      ? entries.map((weapon) => {
        const need = weapon.level >= 50 ? 0 : weaponXpRequiredForLevel(weapon.level);
        const ratio = need === 0 ? 100 : Math.min(100, (weapon.xp / need) * 100);
        return `<div class="mastery-card">
          <div><strong>${this._label(weapon.weaponId)}</strong><span>Weapon LVL ${weapon.level}</span></div>
          <small>${need === 0 ? 'MAX MASTERY' : `${weapon.xp.toLocaleString()} / ${need.toLocaleString()} WXP`}</small>
          <div class="mini-track"><div style="width:${ratio}%"></div></div>
        </div>`;
      }).join('')
      : '<div class="empty-state">Use a weapon to begin its mastery track.</div>';
  }

  renderHistory() {
    if (!this.historyList) return;
    this.historyList.innerHTML = this.progression.state.history.slice(0, 12).map((item) => {
      const text = item.type === 'level_up'
        ? `Reached Level ${item.level}`
        : item.type === 'prestige'
          ? `Entered Prestige ${item.prestige}`
          : `Earned ${(item.amount || 0).toLocaleString()} XP`;
      return `<div class="history-row"><span>${text}</span><time>${new Date(item.timestamp).toLocaleString()}</time></div>`;
    }).join('') || '<div class="empty-state">Your latest progression events will appear here.</div>';
  }

  showLevelUp({ level }) {
    if (!this.levelUpBanner || !this.levelUpValue) return;
    this.levelUpValue.textContent = `LEVEL ${level}`;
    this.levelUpBanner.hidden = false;
    this._tone(520, 0.12);
    window.setTimeout(() => this._tone(760, 0.18), 120);
    window.setTimeout(() => { this.levelUpBanner.hidden = true; }, 2500);
  }

  showUnlock(reward) {
    this.hud.toast(`${this._label(reward.type)} UNLOCKED • ${reward.name}`, 'unlock');
    this._tone(680, 0.14);
  }

  togglePanel(force) {
    if (!this.panel) return;
    const open = typeof force === 'boolean' ? force : this.panel.hidden;
    this.panel.hidden = !open;
    if (open && document.pointerLockElement) document.exitPointerLock();
  }

  openPrestigeModal() {
    if (!this.progression.canPrestige() || !this.prestigeModal) return;
    const rank = this.progression.state.prestige + 1;
    const definition = PRESTIGE_REWARDS[rank - 1];
    this.prestigeModalText.innerHTML = `
      <strong>Prestige ${rank}: ${definition.name}</strong>
      <p>Your level returns to 1. Cosmetics, prestige rewards, weapon mastery and permanent rewards stay unlocked.</p>
      <p>Permanent XP boost after prestiging: <b>+${Math.round(definition.permanentXpBonus * 100)}%</b></p>`;
    this.prestigeModal.hidden = false;
  }

  closePrestigeModal() {
    if (this.prestigeModal) this.prestigeModal.hidden = true;
  }

  _label(value) {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  _tone(frequency, duration, delay = 0) {
    try {
      this._audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const context = this._audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.frequency.value = frequency;
      oscillator.type = 'triangle';
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch {
      // Audio feedback is optional and may be blocked before user interaction.
    }
  }
}
