/**
 * Canonical match catalogue shared by the menu, matchmaking, and future server.
 * Permanent modes are always eligible; party modes are featured in three-day
 * windows inside a rolling four-week (28 day) cycle.
 */
export const MAPS = Object.freeze([
  { id: 'downtown', name: 'Downtown Lockup', size: '6v6 / 12v12' },
  { id: 'freight-yard', name: 'Freight Yard', size: '6v6 / 12v12' },
  { id: 'night-market', name: 'Night Market', size: '6v6 / 12v12' },
  { id: 'redline-bridge', name: 'Redline Bridge', size: '6v6 / 12v12' },
  { id: 'harbor-13', name: 'Harbor 13', size: '6v6 / 12v12' },
]);

export const THUNDERSTRIKE = Object.freeze({
  id: 'thunderstrike',
  name: 'Thunderstrike',
  description: 'Condensed multiplayer districts stitched into one battle-royale arena.',
  squadSizes: Object.freeze([1, 2, 3, 4]),
  sourceMaps: Object.freeze(MAPS.map((map) => map.id)),
});

const primary = (id, name, description, extra = {}) => ({ id, name, category: 'primary', teamSize: 12, description, ...extra });
const party = (id, name, description, extra = {}) => ({ id, name, category: 'party', teamSize: 0, limitedTime: true, description, ...extra });
const battleRoyale = (id, name, description, extra = {}) => ({ id, name, category: 'battle-royale', teamSize: 0, description, ...extra });

export const GAME_MODES = Object.freeze([
  primary('team-deathmatch', 'Team Deathmatch', '12v12 score race by eliminations.', { scoreLimit: 100 }),
  primary('domination', 'Domination', 'Capture and hold three zones.', { scoreLimit: 200 }),
  primary('hardpoint', 'Hardpoint', 'Rotate through a contested objective.', { scoreLimit: 250 }),
  primary('kill-confirmed', 'Kill Confirmed', 'Collect enemy tags to score eliminations.', { scoreLimit: 65 }),
  primary('search-and-destroy', 'Search & Destroy', 'Round-based attack and defense with no respawns.', { roundsToWin: 6, respawns: false }),
  primary('free-for-all', 'Free for All', 'Every player fights for the top score.', { teamSize: 1, scoreLimit: 30 }),
  primary('overload', 'Overload', 'Push an overload device into the enemy zone.', { roundsToWin: 2, respawns: true }),
  primary('kill-order', 'Kill Order', 'Protect your marked VIP and hunt theirs.', { scoreLimit: 5 }),
  primary('control', 'Control', 'Attackers capture sequential zones while defenders hold.', { roundsToWin: 3, respawns: true }),
  primary('gunfight', 'Gunfight', '2v2 tactical rounds with a shared loadout.', { teamSize: 2, roundsToWin: 6, respawns: false }),
  primary('skirmish', 'Skirmish', '20v20 objective battle with vehicles and wingsuits.', { teamSize: 20, vehicles: true, wingsuits: true, scoreLimit: 500 }),
  primary('face-off', 'Face Off', 'Compact rotation of TDM, Domination, Kill Confirmed, and Kill Order.', { playlist: ['team-deathmatch', 'domination', 'kill-confirmed', 'kill-order'] }),
  primary('face-off-moshpit', 'Face Off Moshpit', 'Randomized Face Off rules on compact maps.', { playlist: ['face-off'] }),
  party('prop-hunt', 'Prop Hunt', 'Props hide, hunters search.'),
  party('sharp-shooter', 'Sharp Shooter', 'Everyone cycles through a shared marksman loadout.'),
  party('one-in-the-chamber', 'One in the Chamber', 'One bullet, one life, one chance.'),
  party('sticks-and-stones', 'Sticks and Stones', 'Bows, tomahawks, and score resets.'),
  party('cranked', 'Cranked', 'Get a kill before the timer expires.'),
  party('knife-fight', 'Knife Fight', 'Close-quarters melee-only rounds.'),
  party('gauntlet-rush', 'Gauntlet Rush', 'Race through escalating combat lanes.'),
  party('infected', 'Infected', 'Survivors versus a growing infected team.'),
  party('safeguard', 'Safeguard', 'Escort the moving objective to safety.'),
  party('snipers-only', 'Snipers Only', 'Precision rifles only.'),
  party('gun-game', 'Gun Game', 'Free-for-all: every kill advances your weapon, up to 30 points.', { teamSize: 1, scoreLimit: 30, weaponProgression: true }),
  battleRoyale('thunderstrike', 'Thunderstrike', 'All multiplayer districts condensed into a large battle-royale arena.', { squadSizes: [1, 2, 3, 4], maxPlayers: 100, vehicles: true, wingsuits: true }),
]);

export const MATCH_MODE_BY_ID = Object.freeze(Object.fromEntries(GAME_MODES.map((mode) => [mode.id, mode])));
export const PRIMARY_MODE_IDS = Object.freeze(GAME_MODES.filter((mode) => mode.category === 'primary').map((mode) => mode.id));
export const PARTY_MODE_IDS = Object.freeze(GAME_MODES.filter((mode) => mode.category === 'party').map((mode) => mode.id));

function dayIndex(date) {
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(2026, 0, 1)) / 86400000);
}

export function getActivePartyMode(date = new Date()) {
  const cycleDay = ((dayIndex(date) % 28) + 28) % 28;
  const window = Math.floor(cycleDay / 3);
  return MATCH_MODE_BY_ID[PARTY_MODE_IDS[window % PARTY_MODE_IDS.length]];
}

export function getAvailableModes(date = new Date()) {
  const activeParty = getActivePartyMode(date);
  return GAME_MODES.filter((mode) => mode.category === 'primary' || mode.category === 'battle-royale' || mode.id === activeParty.id || mode.id === 'gun-game');
}

export function selectRotatingMap(modeId, matchNumber = dayIndex(new Date())) {
  if (modeId === 'thunderstrike') return THUNDERSTRIKE;
  const offset = Math.abs(Number(matchNumber) || 0);
  return MAPS[offset % MAPS.length];
}

export function createMatchConfig(modeId, matchNumber = Date.now(), date = new Date()) {
  const mode = MATCH_MODE_BY_ID[modeId] || MATCH_MODE_BY_ID['team-deathmatch'];
  const active = mode.category === 'party' ? getActivePartyMode(date).id === mode.id : true;
  return Object.freeze({
    modeId: mode.id,
    map: selectRotatingMap(mode.id, matchNumber),
    available: active,
    maxPlayers: mode.maxPlayers || (mode.teamSize === 1 ? 12 : mode.teamSize * 2 || 12),
    rules: mode,
  });
}
