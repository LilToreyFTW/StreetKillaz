import { Engine } from './core/Engine.js?v=20260823';
import { InputManager } from './core/InputManager.js';
import { AssetLoader } from './core/AssetLoader.js?v=20260813';
import { FirstPersonController } from './player/FirstPersonController.js?v=20260822';
import { PlayerStats } from './player/PlayerStats.js?v=20260815';
import { WeaponSystem } from './weapons/WeaponSystem.js?v=20260822';
import { loadMap } from './world/MapLoader.js?v=20260823';
import { respawnDummy } from './world/TestArena.js';
import { PerkSystem } from './systems/PerkSystem.js';
import { LootSystem } from './systems/LootSystem.js';
import { ZombieSystem } from './systems/ZombieSystem.js';
import { LocalStorageProgressionRepository } from './progression/ProgressionRepository.js';
import { ProgressionService } from './progression/ProgressionService.js';
import { ChallengeService } from './progression/ChallengeService.js';
import { NetworkClient } from './net/NetworkClient.js?v=20260819';
import { RemoteEntityManager } from './net/RemoteEntityManager.js?v=20260819';
import { MATCH_STATES, ROOM_MODES, SERVER_MESSAGES } from './shared/Protocol.js';
import { HUD } from './ui/HUD.js?v=20260821';
import { Scoreboard } from './ui/Scoreboard.js?v=20260815';
import { ProgressionUI } from './ui/ProgressionUI.js';
import { MultiplayerUI } from './ui/MultiplayerUI.js?v=20260817';
import { AudioSystem } from './core/AudioSystem.js';
import { RecoilSystem } from './weapons/RecoilSystem.js';
import { EffectsSystem } from './weapons/EffectsSystem.js';
import { DebugSystem } from './core/DebugSystem.js?v=20260824';
import { getVisualSettings, saveVisualSettings } from './config/GameConfig.js?v=20260822';

async function main() {
  const engine = new Engine();
  const debug = new DebugSystem();
  const input = new InputManager(engine.renderer.domElement, document.getElementById('blocker'));
  const assetLoader = new AssetLoader();
  const hud = new HUD();
  const scoreboard = new Scoreboard(input);
  const stats = new PlayerStats();
  const progression = new ProgressionService(new LocalStorageProgressionRepository());
  await progression.initialize();
  const challenges = new ChallengeService(progression);
  challenges.initialize();
  const progressionUI = new ProgressionUI(progression, challenges, hud);
  const perks = new PerkSystem(stats);
  const loot = new LootSystem();
  const audio = new AudioSystem();
  const recoil = new RecoilSystem();
  const controller = new FirstPersonController(engine.camera, input, { recoil });
  const visualSettings = getVisualSettings();
  const motionIntensity = document.getElementById('motion-intensity');
  const cameraShake = document.getElementById('camera-shake');
  const headBob = document.getElementById('head-bob');
  const weaponSway = document.getElementById('weapon-sway');
  if (motionIntensity) motionIntensity.value = String(visualSettings.motionIntensity);
  if (cameraShake) cameraShake.checked = visualSettings.cameraShake;
  if (headBob) headBob.checked = visualSettings.headBob;
  if (weaponSway) weaponSway.checked = visualSettings.weaponSway;
  const persistVisualSettings = () => saveVisualSettings({
    motionIntensity: Number(motionIntensity?.value ?? visualSettings.motionIntensity),
    cameraShake: Boolean(cameraShake?.checked), headBob: Boolean(headBob?.checked), weaponSway: Boolean(weaponSway?.checked),
  });
  [motionIntensity, cameraShake, headBob, weaponSway].forEach((element) => element?.addEventListener('input', persistVisualSettings));
  const effects = new EffectsSystem(engine.scene, engine.camera);
  // Unlock audio on the first user gesture (browser autoplay policy).
  const unlockAudio = () => audio.init();
  document.getElementById('blocker')?.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') unlockAudio(); }, { once: false });
  const network = new NetworkClient();
  const remoteEntities = new RemoteEntityManager(engine.scene, { assetLoader });
  const startingWeaponId = window.localStorage.getItem('streetkillaz.startingWeapon') || 'cdg58';

  let onlineMatch = false;
  let currentRoomMode = null;
  let currentMatchState = null;
  let killStreak = 0;
  let lastKillAt = 0;
  let latestBattleRoyale = null;
  let latestSnapshot = null;

  let activeMapId = 'downtown';
  let mapRuntime = await loadMap(engine.scene, assetLoader, activeMapId);
  let { dummies, spawnPoints = [], collisionBoxes = [] } = mapRuntime;
  controller.setWorldCollision(collisionBoxes);
  if (spawnPoints[0]) controller.teleport(spawnPoints[0], Math.PI / 2);

  const switchMap = async (mapId) => {
    if (!mapId || mapId === activeMapId) return;
    for (const dummy of dummies) weapons?.unregisterTarget?.(dummy);
    if (mapRuntime?.group) engine.scene.remove(mapRuntime.group);
    activeMapId = mapId;
    mapRuntime = await loadMap(engine.scene, assetLoader, mapId);
    dummies = mapRuntime.dummies || [];
    spawnPoints = mapRuntime.spawnPoints || [];
    collisionBoxes = mapRuntime.collisionBoxes || [];
    controller.setWorldCollision(collisionBoxes);
    for (const dummy of dummies) weapons?.registerTarget?.(dummy);
    if (spawnPoints[0]) controller.teleport(spawnPoints[0], Math.PI / 2);
  };

  const zombies = new ZombieSystem(engine.scene, {
    onZombieDamagePlayer: (damage) => {
      if (!onlineMatch) stats.takeDamage(damage);
    },
  });

  const weapons = new WeaponSystem(engine.scene, engine.camera, assetLoader, {
    initialWeaponId: startingWeaponId,
    onHit: (target, damage, hit) => {
      if (onlineMatch) return false;
      target.userData.health -= damage;
      hud.flashHitmarker(false);
      if (audio) audio.hitmarker(false);
      return target.userData.health <= 0;
    },
    onKill: (target, hit) => {
      if (onlineMatch) return;
      const now = performance.now();
      killStreak = now - lastKillAt < 5000 ? killStreak + 1 : 1;
      lastKillAt = now;

      if (target.userData.isZombie) {
        const award = progression.award('zombie_kill', {
          elite: Boolean(target.userData.elite),
          weaponId: hit.weaponId,
        });
        challenges.record('zombiesKilled', 1);
        zombies.removeZombie(target);
      } else {
        const award = progression.award('kill', {
          weaponId: hit.weaponId,
          headshot: hit.headshot,
          multiKillCount: killStreak,
          streak: progression.state.stats.kills + 1,
        });
        challenges.record('kills', 1);
        if (hit.headshot) challenges.record('headshots', 1);
        hud.flashHitmarker(true);
        if (audio) audio.hitmarker(true);
        hud.addKillFeed({
          killerName: 'YOU',
          victimName: target.userData.label || 'Target',
          weaponId: hit.weaponId,
          headshot: hit.headshot,
        });
        target.visible = false;
        setTimeout(() => respawnDummy(target), 2000);
      }

      const drop = loot.generateWeaponDrop(perks.equipped.includes('scavenger') ? 0.2 : 0);
      hud.toast(`Loot: ${drop.name}`, 'unlock');
      if (['rare', 'epic', 'legendary'].includes(drop.rarity)) {
        progression.award('rare_loot', { rarity: drop.rarity });
      }
    },
    onFireIntent: (payload) => network.fire(payload),
    onReloadIntent: (weaponId) => network.reload(weaponId),
    onMeleeIntent: () => { if (onlineMatch) network.melee(); },
    onGrenadeIntent: () => { if (onlineMatch) network.grenade(); },
    audio,
    recoil,
    effects,
    controller,
    onKillFeed: (entry) => hud.addKillFeed(entry),
  });

  for (const dummy of dummies) weapons.registerTarget(dummy);

  progression.addEventListener('change', (event) => stats.syncProgression(event.detail.state));
  progression.addEventListener('prestigerequest', () => network.requestPrestige());
  stats.syncProgression(progression.state);

  stats.on('health', (health) => hud.setHealth(health, stats.maxHealth));
  stats.on('shield', ({ shield, maxShield }) => hud.setShield(shield, maxShield));
  stats.on('death', () => {
    killStreak = 0;
    if (onlineMatch) {
      hud.toast('You were eliminated — awaiting server respawn', 'error');
      window.setTimeout(() => network.requestRespawn(), 3000);
    } else {
      hud.toast('You died — respawning…', 'error');
      window.setTimeout(() => {
        stats.respawn();
        const spawn = spawnPoints[Math.floor(Math.random() * Math.max(1, spawnPoints.length))] || { x: 0, y: 1.7, z: 0 };
        controller.teleport(spawn, spawn.x < 0 ? Math.PI / 2 : -Math.PI / 2);
      }, 1500);
    }
  });

  hud.setHealth(stats.health, stats.maxHealth);
  hud.setProgression(progression.getView());
  hud.setAmmo(weapons.ammoInMag, weapons.ammoReserve, weapons.stats.name);

  const setArenaMode = (mode, state, mapId) => {
    currentRoomMode = mode;
    currentMatchState = state;
    onlineMatch = Boolean(network.authenticated && network.roomId && state === MATCH_STATES.IN_PROGRESS);
    weapons.setNetworkAuthority(onlineMatch);
    progression.setServerAuthoritative(Boolean(network.authenticated && network.roomId));
    if (onlineMatch && mapId) void switchMap(mapId);
    for (const dummy of dummies) dummy.visible = !onlineMatch;
    if (onlineMatch) {
      for (const zombie of zombies.zombies) zombie.visible = false;
      zombies.active = false;
    }
  };

  const multiplayerUI = new MultiplayerUI(network, hud, {
    onOfflinePlay: () => {
      if (network.roomId) network.leaveRoom();
      onlineMatch = false;
      currentRoomMode = null;
      currentMatchState = null;
      weapons.setNetworkAuthority(false);
      progression.setServerAuthoritative(false);
      remoteEntities.clear();
      for (const dummy of dummies) dummy.visible = true;
      input.requestPointerLock();
    },
    onRoomModeChanged: setArenaMode,
    onEnterMatch: () => input.requestPointerLock(),
    onStartingWeaponChanged: (weaponId) => {
      if (weapons.equip(weaponId)) hud.setAmmo(weapons.ammoInMag, weapons.ammoReserve, weapons.stats.name);
      network.startingWeaponId = weaponId;
    },
  });

  // Connect to the official VPS automatically. The menu remains available
  // so players can retry, change their name, or choose offline play.
  multiplayerUI.autoConnect();

  network.setInputProvider(() => {
    if (!onlineMatch) return null;
    return input.getNetworkInput(controller.yaw, controller.pitch, { isAiming: weapons.isAiming });
  });

  network.addEventListener('welcome', (event) => {
    if (event.detail.progression) progression.applyServerSnapshot(event.detail.progression, { silent: true });
  });

  network.addEventListener('status', (event) => {
    if (event.detail.status === 'disconnected') {
      onlineMatch = false;
      weapons.setNetworkAuthority(false);
      progression.setServerAuthoritative(false);
      remoteEntities.clear();
      for (const dummy of dummies) dummy.visible = true;
    }
  });

  network.addEventListener(SERVER_MESSAGES.PROGRESSION_SYNC, (event) => {
    if (event.detail.progression) progression.applyServerSnapshot(event.detail.progression);
  });

  network.addEventListener(SERVER_MESSAGES.XP_AWARD, (event) => {
    const { award, progression: serverProgression } = event.detail;
    if (serverProgression) progression.applyServerSnapshot(serverProgression);
    if (award?.total) hud.toast(`+${award.total.toLocaleString()} XP • ${String(award.action).replaceAll('_', ' ')}`, 'xp');
  });

  network.addEventListener(SERVER_MESSAGES.PRESTIGE_RESULT, (event) => {
    if (event.detail.progression) progression.applyServerSnapshot(event.detail.progression);
    hud.toast(event.detail.success ? `Prestige ${event.detail.prestige} activated` : event.detail.reason, event.detail.success ? 'prestige' : 'error');
  });

  network.addEventListener(SERVER_MESSAGES.SNAPSHOT, (event) => {
    if (!onlineMatch) return;
    latestBattleRoyale = event.detail.battleRoyale;
    latestSnapshot = event.detail;
    remoteEntities.applySnapshot(event.detail, network.playerId, controller, stats, weapons, network);
    scoreboard.update(event.detail, network.playerId);
    hud.setBattleRoyaleStatus(event.detail.battleRoyale ? event.detail : null, network.playerId);
  });

  network.addEventListener(SERVER_MESSAGES.COMBAT_EVENT, (event) => {
    const data = event.detail;
    if (data.kind === 'hit' && data.attackerId === network.playerId) hud.flashHitmarker(Boolean(data.killed), Boolean(data.headshot));
    if (data.kind === 'hit' && data.targetId === network.playerId) {
      const attacker = latestSnapshot?.players?.find((player) => player.id === data.attackerId);
      if (attacker) {
        const dx = attacker.position.x - controller.position.x, dz = attacker.position.z - controller.position.z;
        hud.showDamageDirection(Math.atan2(dx, dz) - controller.yaw);
      }
    }
    if (data.kind === 'kill') {
      hud.addKillFeed(data);
      if (data.killerId === network.playerId) hud.flashHitmarker(true);
    }
    if (data.kind === 'zombie-wave') hud.toast(`ZOMBIE WAVE ${data.wave}`, 'match');
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyB' && !event.repeat && !onlineMatch && !zombies.active) {
      zombies.startWave();
      for (const zombie of zombies.zombies) weapons.registerTarget(zombie);
      hud.toast(`Zombie wave ${zombies.wave} incoming`, 'match');
    }
    if (event.code === 'KeyE' && !event.repeat && onlineMatch && latestBattleRoyale?.loot) {
      const nearest = latestBattleRoyale.loot
        .map((loot) => ({ loot, distance: Math.hypot(controller.position.x - loot.x, controller.position.z - loot.z) }))
        .filter((entry) => entry.distance <= 2.5)
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest) network.pickupLoot(nearest.loot.id);
    }
  });

  engine.addUpdater((dt) => {
    // Read the per-frame mouse delta ONCE, then share it so the controller
    // applies aim and the viewmodel reads sway from the same sample.
    const lookDelta = input.peekMouseDelta();
    controller.update(dt, lookDelta);
    weapons.update(dt, input);
    hud.setCrosshair({ moving: controller.movementState.moving, firing: input.mouseDown(0), ads: weapons.isAiming });
    input.consumeMouseDelta();
    if (effects) effects.update(dt);
    if (!onlineMatch) zombies.update(dt, controller.position);
    remoteEntities.update(dt);
    scoreboard.updateVisibility();
    debug.update({ engine, network, controller, weapons, remoteEntities, battleRoyale: latestBattleRoyale });
    hud.setAmmo(weapons.ammoInMag, weapons.ammoReserve, weapons.stats.name);

    if (onlineMatch && currentRoomMode === ROOM_MODES.ZOMBIES && currentMatchState === MATCH_STATES.IN_PROGRESS) {
      // Server owns Zombies AI; the client only interpolates its snapshots.
    }
  });

  window.addEventListener('beforeunload', () => progression.flushSave().catch(() => {}));
  engine.start();

  // Expose a small debug surface for development without exposing mutation internals.
  window.StreetKillaz = Object.freeze({
    progression,
    challenges,
    network,
    getState: () => ({
      onlineMatch,
      currentRoomMode,
      currentMatchState,
      progression: progression.snapshot(),
    }),
  });
  // DEBUG: live handles for headless verification (removed before ship).
  window.__dbg = { input, weapons, controller, audio, effects, recoil, debug, engine, remoteEntities, network };
}

main().catch((error) => {
  console.error('[StreetKillaz] Fatal startup error:', error);
  const blocker = document.getElementById('blocker');
  if (blocker) blocker.innerHTML = `<div class="menu-panel"><h1>STARTUP ERROR</h1><pre>${String(error.stack || error.message || error)}</pre></div>`;
});
