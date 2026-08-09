import * as THREE from 'three';
import { placeholderCharacter, buildGunMesh } from '../core/AssetLoader.js?v=20260813';
import { WEAPONS } from '../weapons/WeaponData.js';

const MODEL_EYE_HEIGHT = 1.7;

/**
 * Visual-only remote player layer. Gameplay remains in PlayerController; this
 * class interpolates a model and derives lightweight local animation from state.
 * A GLB/SkinnedMesh can replace `mesh` later without changing networking code.
 */
export class PlayerVisualModel {
  constructor(scene, { id, displayName, color = 0x3b82ff, assetLoader = null } = {}) {
    this.id = id;
    this.displayName = displayName || id;
    this.scene = scene;
    this.assetLoader = assetLoader;
    this.mesh = placeholderCharacter(color);
    this.mesh.name = `StreetKillaOperator:${this.displayName}`;
    this.mesh.userData.operatorId = 'streetkilla';
    this.targetPosition = new THREE.Vector3();
    this.targetYaw = 0;
    this.state = {
      moving: false, sprinting: false, crouched: false, grounded: true,
      firing: false, aiming: false, reloading: false, jumping: false, alive: true, pitch: 0,
    };
    this.time = Math.random() * 10;
    this.mixer = null;
    this.actions = new Map();
    this.activeAction = null;
    this.weaponMount = null;
    this.weaponMesh = null;
    this.hasRiggedSkeleton = false;
    this.aimNodes = [];
    this.snapshotBuffer = [];
    scene.add(this.mesh);
    this._loadAuthoredModel();
  }

  async _loadAuthoredModel() {
    if (!this.assetLoader) return;
    const gltf = await this.assetLoader.loadGLTF('/assets/character-assets/streetkilla/operator.glb');
    if (!gltf?.scene) return;

    let hasSkinnedMesh = false;
    gltf.scene.traverse((object) => {
      if (object.isSkinnedMesh && object.skeleton?.bones?.length) hasSkinnedMesh = true;
    });
    if (!hasSkinnedMesh) {
      console.warn('[PlayerVisualModel] operator.glb has no SkinnedMesh/Skeleton; retaining fallback operator.');
      return;
    }

    const oldMesh = this.mesh;
    this.scene.remove(oldMesh);
    this._disposeObject(oldMesh);
    this.mesh = gltf.scene;
    this.mesh.name = `StreetKillaOperator:${this.displayName}`;
    this.mesh.userData.operatorId = 'streetkilla';
    this.mesh.position.copy(this.targetPosition);
    this.mesh.rotation.y = this.targetYaw;
    this.mesh.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    this.hasRiggedSkeleton = true;
    this.mixer = new THREE.AnimationMixer(this.mesh);
    for (const clip of gltf.animations) this.actions.set(clip.name.toLowerCase(), this.mixer.clipAction(clip));
    this.mesh.traverse((object) => {
      if (/(spine|chest|shoulder|neck|head)/i.test(object.name)) {
        this.aimNodes.push({ object, baseRotation: object.rotation.clone(), weight: /head|neck/i.test(object.name) ? 0.5 : 0.24 });
      }
    });
    this.scene.add(this.mesh);
    this._ensureWeaponMount();
    this._setWeapon(this.state.weaponId);
    this._playAnimation('idle');
  }

  _ensureWeaponMount() {
    if (this.weaponMount) return this.weaponMount;
    let hand = null;
    this.mesh.traverse((object) => {
      if (!hand && /(?:right|r)[_ .-]*(?:hand|wrist)|weapon[_ .-]*socket/i.test(object.name)) hand = object;
    });
    this.weaponMount = new THREE.Object3D();
    this.weaponMount.name = 'StreetKillazWeaponSocket';
    // This is deliberately an authored socket when the GLB names a right hand;
    // the fallback keeps weapons visible on legacy/prototype character assets.
    this.weaponMount.position.set(0.04, -0.04, -0.08);
    this.weaponMount.rotation.set(Math.PI / 2, Math.PI, 0);
    (hand || this.mesh).add(this.weaponMount);
    return this.weaponMount;
  }

  _setWeapon(weaponId) {
    if (!weaponId || this.weaponMesh?.userData.weaponId === weaponId) return;
    const mount = this._ensureWeaponMount();
    if (this.weaponMesh) {
      mount.remove(this.weaponMesh);
      this._disposeObject(this.weaponMesh);
    }
    const weapon = WEAPONS[weaponId] || WEAPONS.cdg58;
    this.weaponMesh = buildGunMesh(weapon.mesh, 0x25272b);
    this.weaponMesh.userData.weaponId = weaponId;
    this.weaponMesh.scale.setScalar(0.72);
    mount.add(this.weaponMesh);
  }

  _playAnimation(kind) {
    if (!this.mixer) return;
    const aliases = {
      idle: ['idle', 'stand'], walk: ['walk'], run: ['sprint', 'run'], crouch: ['crouch'],
      jump: ['jump'], reload: ['reload'], fire: ['fire', 'shoot'], death: ['death', 'die'],
    };
    const action = [...this.actions.entries()].find(([name]) => aliases[kind].some((alias) => name.includes(alias)))?.[1];
    if (!action || action === this.activeAction) return;
    action.reset().fadeIn(0.14).play();
    this.activeAction?.fadeOut(0.14);
    this.activeAction = action;
  }

  applyState({ position, yaw, pitch, movementState = {}, weaponId, alive = true } = {}) {
    // Network positions are eye positions; an operator root is foot-positioned.
    if (position) this.targetPosition.set(Number(position.x) || 0, (Number(position.y) || MODEL_EYE_HEIGHT) - MODEL_EYE_HEIGHT, Number(position.z) || 0);
    this.snapshotBuffer.push({
      position: this.targetPosition.clone(), yaw: Number(yaw) || 0, pitch: Number(pitch) || 0,
      state: { ...this.state, ...movementState, weaponId, alive: alive !== false }, receivedAt: performance.now(),
    });
    while (this.snapshotBuffer.length > 20) this.snapshotBuffer.shift();
    this._setWeapon(weaponId);
  }

  update(dt, interpolationSpeed = 12) {
    // Render slightly behind the newest update: snapshot interpolation avoids
    // visible network jitter without transmitting any animation frames.
    const renderAt = performance.now() - 100;
    const sample = this.snapshotBuffer.find((entry) => entry.receivedAt >= renderAt) || this.snapshotBuffer.at(-1);
    if (sample) {
      this.targetPosition.copy(sample.position);
      this.targetYaw = sample.yaw;
      this.state = sample.state;
    }
    const alpha = 1 - Math.exp(-interpolationSpeed * dt);
    this.mesh.position.lerp(this.targetPosition, alpha);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetYaw, alpha);
    if (this.weaponMount) {
      this.weaponMount.rotation.x = Math.PI / 2 + this.state.pitch * 0.28;
      this.weaponMount.rotation.z = this.state.aiming ? 0 : Math.sin(this.time * 2) * 0.035;
    }
    for (const aimNode of this.aimNodes) {
      aimNode.object.rotation.copy(aimNode.baseRotation);
      aimNode.object.rotation.x += this.state.pitch * aimNode.weight;
    }
    if (this.mixer) this.mixer.update(dt);
    if (!this.state.alive) {
      this.mesh.rotation.z += (Math.PI * 0.48 - this.mesh.rotation.z) * (1 - Math.exp(-dt * 10));
      if (this.mixer) this._playAnimation('death');
      return;
    }
    this.mesh.rotation.z += (0 - this.mesh.rotation.z) * (1 - Math.exp(-dt * 14));
    if (this.mixer) {
      this._playAnimation(
        this.state.reloading ? 'reload'
          : this.state.jumping ? 'jump'
            : this.state.firing ? 'fire'
              : this.state.crouched ? 'crouch'
                : this.state.sprinting ? 'run'
                  : this.state.moving ? 'walk' : 'idle'
      );
      return;
    }
    this.time += dt * (this.state.sprinting ? 12 : this.state.moving ? 8 : 1.5);
    const bob = this.state.moving && this.state.grounded ? Math.abs(Math.sin(this.time)) * 0.035 : 0;
    this.mesh.position.y = this.targetPosition.y + bob;
    const targetScaleY = this.state.crouched ? 0.78 : 1;
    this.mesh.scale.y += (targetScaleY - this.mesh.scale.y) * (1 - Math.exp(-dt * 14));
    if (this.weaponMesh && this.state.firing) this.weaponMesh.position.z = -Math.abs(Math.sin(this.time * 32)) * 0.06;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.mesh);
    this._disposeObject(this.mesh);
  }

  _disposeObject(root) {
    root.traverse((object) => {
      if (object.isMesh) {
        if (object.userData.sharedGltfAsset) return;
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      }
    });
  }
}
