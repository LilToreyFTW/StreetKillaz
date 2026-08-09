const DAILY_POOL = Object.freeze([
  { id: 'daily_20_kills', metric: 'kills', target: 20, rewardXp: 2500, name: 'Street Sweeper' },
  { id: 'daily_5_headshots', metric: 'headshots', target: 5, rewardXp: 1800, name: 'Aim High' },
  { id: 'daily_2_wins', metric: 'wins', target: 2, rewardXp: 3000, name: 'Own the Block' },
  { id: 'daily_5_objectives', metric: 'objectives', target: 5, rewardXp: 2200, name: 'Handle Business' },
  { id: 'daily_10_zombie_rounds', metric: 'zombiesRounds', target: 10, rewardXp: 2500, name: 'Still Breathing' },
]);

const WEEKLY_POOL = Object.freeze([
  { id: 'weekly_150_kills', metric: 'kills', target: 150, rewardXp: 12000, name: 'City Cleanup' },
  { id: 'weekly_75_headshots', metric: 'headshots', target: 75, rewardXp: 10000, name: 'No Warning Shots' },
  { id: 'weekly_10_wins', metric: 'wins', target: 10, rewardXp: 15000, name: 'Run the City' },
  { id: 'weekly_40_objectives', metric: 'objectives', target: 40, rewardXp: 12000, name: 'Mission First' },
  { id: 'weekly_500_zombies', metric: 'zombiesKilled', target: 500, rewardXp: 15000, name: 'Dead City' },
]);

function dailyKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weeklyKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - start) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function select(pool, count, seed) {
  return [...pool]
    .sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`))
    .slice(0, count)
    .map((challenge) => ({ ...challenge, progress: 0, completed: false, claimed: false }));
}

export class ChallengeService extends EventTarget {
  constructor(progression) {
    super();
    this.progression = progression;
  }

  initialize() {
    this.refresh();
  }

  refresh() {
    const state = this.progression.state;
    const day = dailyKey();
    const week = weeklyKey();
    let changed = false;
    if (state.challenges.dailyKey !== day) {
      state.challenges.dailyKey = day;
      state.challenges.daily = select(DAILY_POOL, 3, day);
      changed = true;
    }
    if (state.challenges.weeklyKey !== week) {
      state.challenges.weeklyKey = week;
      state.challenges.weekly = select(WEEKLY_POOL, 3, week);
      changed = true;
    }
    if (changed) this.progression.queueSave();
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot() }));
  }

  record(metric, amount = 1) {
    if (this.progression.serverAuthoritative) return;
    this.refresh();
    const completed = [];
    for (const list of [this.progression.state.challenges.daily, this.progression.state.challenges.weekly]) {
      for (const challenge of list) {
        if (challenge.metric !== metric || challenge.claimed) continue;
        challenge.progress = Math.min(challenge.target, challenge.progress + amount);
        if (challenge.progress >= challenge.target) {
          challenge.completed = true;
          challenge.claimed = true;
          this.progression.award('challenge', { rewardXp: challenge.rewardXp, applyMultipliers: false });
          completed.push({ ...challenge });
          this.dispatchEvent(new CustomEvent('complete', { detail: { challenge: { ...challenge } } }));
        }
      }
    }
    this.progression.queueSave();
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot() }));
    return completed;
  }

  snapshot() {
    return {
      daily: this.progression.state.challenges.daily.map((item) => ({ ...item })),
      weekly: this.progression.state.challenges.weekly.map((item) => ({ ...item })),
    };
  }
}
