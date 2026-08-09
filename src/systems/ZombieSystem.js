import * as THREE from 'three';
import { placeholderCharacter } from '../core/AssetLoader.js';

/**
 * PvE wave mode, kept separate from the PVP arena loop so it can be its own
 * game mode entry point later. Zombies currently use a placeholder mesh and
 * naive "walk toward player" AI. Swap in real rigs/animations from
 * zombie-character-assets/ and real layouts from zombie-map-assets/ once
 * they exist — the spawn/AI hooks below won't need to change shape.
 */
export class ZombieSystem {
  constructor(scene, { onZombieDamagePlayer } = {}) {
    this.scene = scene;
    this.onZombieDamagePlayer = onZombieDamagePlayer || (() => {});
    this.zombies = [];
    this.wave = 0;
    this.active = false;
  }

  startWave() {
    this.wave++;
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) this._spawnZombie();
    this.active = true;
  }

  _spawnZombie() {
    const z = placeholderCharacter(0x5c8a3a);
    const angle = Math.random() * Math.PI * 2;
    const radius = 25 + Math.random() * 15;
    z.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    z.userData.isTarget = true;
    z.userData.isZombie = true;
    z.userData.health = 60 + this.wave * 10;
    z.userData.maxHealth = z.userData.health;
    z.userData.speed = 1.6 + Math.random() * 0.6;
    this.scene.add(z);
    this.zombies.push(z);
  }

  update(dt, playerPosition) {
    if (!this.active) return;
    for (const z of this.zombies) {
      if (!z.visible) continue;
      const dir = new THREE.Vector3().subVectors(playerPosition, z.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 1.2) {
        dir.normalize();
        z.position.addScaledVector(dir, z.userData.speed * dt);
        z.lookAt(playerPosition.x, z.position.y, playerPosition.z);
      } else {
        this.onZombieDamagePlayer(8 * dt); // contact damage while adjacent
      }
    }
    if (this.zombies.every((z) => !z.visible)) {
      this.active = false; // wave cleared, caller can trigger startWave() again
    }
  }

  removeZombie(zombie) {
    zombie.visible = false;
    const i = this.zombies.indexOf(zombie);
    if (i !== -1) this.zombies.splice(i, 1);
  }
}
