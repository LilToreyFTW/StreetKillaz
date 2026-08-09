export const PROTOCOL_VERSION = 1;

export const CLIENT_MESSAGES = Object.freeze({
  AUTH: 'auth',
  PING: 'ping',
  ROOM_LIST: 'room.list',
  ROOM_CREATE: 'room.create',
  ROOM_JOIN: 'room.join',
  ROOM_LEAVE: 'room.leave',
  ROOM_START: 'room.start',
  PLAYER_INPUT: 'player.input',
  PLAYER_FIRE: 'player.fire',
  PLAYER_RELOAD: 'player.reload',
  PLAYER_MELEE: 'player.melee',
  PLAYER_GRENADE: 'player.grenade',
  LOOT_PICKUP: 'loot.pickup',
  PLAYER_RESPAWN: 'player.respawn',
  PRESTIGE_REQUEST: 'progression.prestige',
});

export const SERVER_MESSAGES = Object.freeze({
  WELCOME: 'welcome',
  ERROR: 'error',
  PONG: 'pong',
  ROOM_LIST: 'room.list',
  ROOM_JOINED: 'room.joined',
  ROOM_LEFT: 'room.left',
  ROOM_STATE: 'room.state',
  MATCH_STARTED: 'match.started',
  MATCH_ENDED: 'match.ended',
  SNAPSHOT: 'state.snapshot',
  COMBAT_EVENT: 'combat.event',
  XP_AWARD: 'progression.award',
  PROGRESSION_SYNC: 'progression.sync',
  PRESTIGE_RESULT: 'progression.prestige.result',
  SERVER_NOTICE: 'server.notice',
});

export const ROOM_MODES = Object.freeze({
  PVP: 'pvp',
  ZOMBIES: 'zombies',
  TEAM_DEATHMATCH: 'team-deathmatch',
  DOMINATION: 'domination',
  HARDPOINT: 'hardpoint',
  KILL_CONFIRMED: 'kill-confirmed',
  SEARCH_AND_DESTROY: 'search-and-destroy',
  FREE_FOR_ALL: 'free-for-all',
  OVERLOAD: 'overload',
  KILL_ORDER: 'kill-order',
  CONTROL: 'control',
  GUNFIGHT: 'gunfight',
  SKIRMISH: 'skirmish',
  FACE_OFF: 'face-off',
  FACE_OFF_MOSHPIT: 'face-off-moshpit',
  THUNDERSTRIKE: 'thunderstrike',
});

export const MATCH_STATES = Object.freeze({
  LOBBY: 'lobby',
  IN_PROGRESS: 'in-progress',
  ENDED: 'ended',
});

export function createMessage(type, data = {}, requestId = undefined) {
  return {
    type,
    data,
    requestId,
    sentAt: Date.now(),
    protocolVersion: PROTOCOL_VERSION,
  };
}
