import * as THREE from 'three';
import { PlayerVisualModel } from '../player/PlayerVisualModel.js?v=20260819';
import { placeholderCharacter } from '../core/AssetLoader.js?v=20260813';

function copyVector(target, source) {
  target.set(Number(source?.x) || 0, Number(source?.y) || 0, Number(source?.z) || 0);
}

export class RemoteEntityManager {
  constructor(scene, { interpolationSpeed = 12, assetLoader = null } = {}) {
    this.scene = scene;
    this.interpolationSpeed = interpolationSpeed;
    this.assetLoader = assetLoader;
    this.players = new Map();
    this.zombies = new Map();
  }

  applySnapshot(snapshot, localPlayerId, controller, stats, weapons, network) {
    const seenPlayers = new Set();
    for (const player of snapshot.players ?? []) {
      seenPlayers.add(player.id);
      if (player.id === localPlayerId) {
        controller?.reconcile?.(player);
        if (stats) {
          stats.setHealthFromServer(player.health, player.maxHealth, player.shield, player.maxShield);
        }
        weapons?.applyServerWeaponState?.(player.weapon);
        network?.acknowledgeInput?.(player.processedInputSequence);
        continue;
      }
      const entity = this._getPlayer(player.id, player.displayName);
      entity.visual.applyState({
        position: player.position,
        yaw: player.yaw,
        pitch: player.pitch,
        weaponId: player.weapon?.id,
        movementState: player.movementState,
        alive: player.alive,
      });
      entity.mesh = entity.visual.mesh;
      entity.visual.mesh.visible = true;
      entity.lastSeenAt = performance.now();
    }
    this._removeMissing(this.players, seenPlayers);

    const seenZombies = new Set();
    for (const zombie of snapshot.zombies ?? []) {
      seenZombies.add(zombie.id);
      const entity = this._getZombie(zombie.id);
      copyVector(entity.targetPosition, zombie.position);
      entity.targetYaw = Number(zombie.yaw) || 0;
      entity.mesh.visible = zombie.alive !== false;
      entity.lastSeenAt = performance.now();
    }
    this._removeMissing(this.zombies, seenZombies);
  }

  update(dt) {
    const alpha = 1 - Math.exp(-this.interpolationSpeed * dt);
    for (const map of [this.players, this.zombies]) {
      for (const entity of map.values()) {
        if (entity.visual) entity.visual.update(dt, this.interpolationSpeed);
        else {
          entity.mesh.position.lerp(entity.targetPosition, alpha);
          entity.mesh.rotation.y = THREE.MathUtils.lerp(entity.mesh.rotation.y, entity.targetYaw, alpha);
        }
      }
    }
  }

  clear() {
    for (const map of [this.players, this.zombies]) {
      for (const entity of map.values()) {
        if (entity.visual) entity.visual.dispose(this.scene);
        else this.scene.remove(entity.mesh);
      }
      map.clear();
    }
  }

  _getPlayer(id, displayName) {
    let entity = this.players.get(id);
    if (entity) return entity;
    const visual = new PlayerVisualModel(this.scene, { id, displayName, color: 0x3b82ff, assetLoader: this.assetLoader });
    entity = { visual, mesh: visual.mesh, lastSeenAt: performance.now() };
    this.players.set(id, entity);
    return entity;
  }

  _getZombie(id) {
    let entity = this.zombies.get(id);
    if (entity) return entity;
    const mesh = placeholderCharacter(0x5c8a3a);
    mesh.name = `ServerZombie:${id}`;
    this.scene.add(mesh);
    entity = { mesh, targetPosition: new THREE.Vector3(), targetYaw: 0, lastSeenAt: performance.now() };
    this.zombies.set(id, entity);
    return entity;
  }

  _removeMissing(map, seen) {
    for (const [id, entity] of map) {
      if (seen.has(id)) continue;
      if (entity.visual) entity.visual.dispose(this.scene);
      else this.scene.remove(entity.mesh);
      map.delete(id);
    }
  }
}
