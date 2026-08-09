import * as THREE from 'three';
import { placeholderGun, buildGunMesh } from '../core/AssetLoader.js';
import { WEAPONS } from './WeaponData.js';
import { getVisualSettings } from '../config/GameConfig.js';

// Camera FOV values shared with WeaponSystem for the ADS blend.
export const BASE_FOV = 75;
export const ADS_FOV = 52;

// Poses are expressed in camera-local space (the rig is a child of the camera).
const HIP_POS = new THREE.Vector3(0.18, -0.20, -0.42);
const HIP_ROT = new THREE.Euler(0, 0.04, -0.04);
const ADS_POS = new THREE.Vector3(0.0, -0.105, -0.30);
const ADS_ROT = new THREE.Euler(0, 0, 0);
const SPRINT_POS = new THREE.Vector3(0.32, -0.44, -0.28);

const GUN_TINTS = {
  pistol: 0x3a3a3a,
  smg: 0x33373f,
  rifle: 0x2b2b2b,
  shotgun: 0x40342a,
  sniper: 0x23262b,
};
const GUN_SCALE = {
  pistol: 0.8,
  smg: 0.95,
  rifle: 1.0,
  shotgun: 1.05,
  sniper: 1.15,
};

/**
 * First-person viewmodel: a lightweight arm rig + the equipped weapon mesh,
 * parented to the camera so it rides with the view. All animation is done by
 * lerping toward target transforms each frame (no skeletal rig needed yet —
 * swap in real FPV arms/animations from FOV-assets/First-person-FPS later and
 * the pose math below stays the same).
 */
export class Viewmodel {
  constructor(camera, assetLoader) {
    this.camera = camera;
    this.assetLoader = assetLoader;

    this.root = new THREE.Group();
    this.root.visible = true;
    this.root.renderOrder = 1000;
    this.root.position.copy(HIP_POS);
    this.root.rotation.copy(HIP_ROT);
    camera.add(this.root);

    // Small fill light so the gun reads regardless of world lighting angle.
    this.fill = new THREE.PointLight(0xffffff, 0.5, 6);
    this.fill.position.set(0.2, 0.1, -0.6);
    this.root.add(this.fill);

    this.arms = this._buildArms();
    this.root.add(this.arms);

    // Weapon mesh lives here; swapped on equip().
    this.gunMount = new THREE.Group();
    this.gunMount.renderOrder = 1001;
    this.root.add(this.gunMount);
    this.gun = null;

    // Muzzle anchor (tip of the gun) — drives the flash light + tracer origin feel.
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.02, -0.7);
    this.gunMount.add(this.muzzle);
    this.muzzleLight = new THREE.PointLight(0xffcf7a, 0, 4);
    this.muzzle.add(this.muzzleLight);

    // Animation state.
    this.adsAmount = 0;
    this.recoil = 0;     // 0..1, decays after each shot
    this.reloadT = 0;    // counts down during a reload
    this.reloadDur = 0;
    this.meleeT = 0;
    this.grenadeT = 0;
    this.bobPhase = 0;
    this._swayX = 0;
    this._swayY = 0;
    this._weaponId = 'rifle';
    this.lowered = 0; // 0 = normal, 1 = fully lowered (tac sprint / slide)
  }

  _buildArms() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({
      color: 0x6b4a35, roughness: 0.85, emissive: 0x110a06, emissiveIntensity: 0.5,
    });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x27313a, roughness: 0.88 });
    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.name = side === 'right' ? 'FPV_RightArm' : 'FPV_LeftArm';
      const x = side === 'right' ? 0.18 : -0.06;
      pivot.position.set(x, -0.29, -0.16);
      pivot.rotation.set(side === 'right' ? -0.48 : -0.28, 0, side === 'right' ? -0.19 : 0.15);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.08, 0.28, 10), sleeve);
      upper.position.set(0, -0.05, -0.04);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.065, side === 'right' ? 0.37 : 0.31, 10), skin);
      forearm.position.set(0, -0.22, -0.10);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
      hand.scale.set(0.85, 1.18, 1.05);
      hand.position.set(0, side === 'right' ? -0.42 : -0.37, side === 'right' ? -0.18 : -0.27);
      pivot.add(upper, forearm, hand);
      return pivot;
    };
    this.rightArm = makeArm('right');
    this.leftArm = makeArm('left');
    g.add(this.rightArm, this.leftArm);
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = false;
      o.renderOrder = 1002;
      o.material.depthTest = false;
      o.material.depthWrite = false;
    });
    return g;
  }

  setWeapon(weaponId, statMult = 1) {
    this._weaponId = weaponId;
    if (this.gun) {
      this.gunMount.remove(this.gun);
      this.gun.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      this.gun = null;
    }
    const data = WEAPONS[weaponId] || {};
    // Prefer a distinct procedural silhouette built from the gun's mesh spec.
    const tint = (data.mesh && data.mesh.tint) || 0x2b2b2b;
    const gun = (data.mesh && buildGunMesh) ? buildGunMesh(data.mesh, tint) : placeholderGun(tint);
    const scale = 1.0; // buildGunMesh already sizes to spec; placeholder uses 1.0
    gun.scale.setScalar(scale);
    this.gunMount.add(gun);
    this.gun = gun;
    gun.visible = true;
    gun.renderOrder = 1001;
    gun.traverse((object) => {
      if (!object.isMesh) return;
      object.visible = true;
      object.renderOrder = 1001;
      // Viewmodels must never be hidden by the map or their own depth buffer.
      object.material.depthTest = false;
      object.material.depthWrite = false;
    });
    return gun;
  }

  getMuzzleWorldPosition(target) {
    return this.muzzle.getWorldPosition(target);
  }

  setLowered(amount) {
    this._loweredTarget = THREE.MathUtils.clamp(amount, 0, 1);
  }

  playRecoil() {
    this.recoil = 1;
  }

  startReload(duration) {
    this.reloadT = duration;
    this.reloadDur = duration;
  }

  playMelee() {
    if (this.meleeT <= 0) this.meleeT = 0.42;
  }

  playGrenade() {
    if (this.grenadeT <= 0) this.grenadeT = 0.68;
  }

  flashMuzzle() {
    this.muzzleLight.intensity = 6;
    setTimeout(() => { this.muzzleLight.intensity = 0; }, 45);
  }

  /**
   * @param {object} o
   * @param {object} o.lookDelta  raw mouse delta this frame (from InputManager)
   * @param {boolean} o.moving
   * @param {boolean} o.sprinting
   * @param {boolean} o.ads       aiming down sights this frame
   */
  update(dt, { lookDelta = { x: 0, y: 0 }, moving = false, sprinting = false, ads = false }) {
    const visuals = getVisualSettings();
    // Aim blend.
    const adsTarget = ads ? 1 : 0;
    this.adsAmount += (adsTarget - this.adsAmount) * (1 - Math.exp(-dt * 14));

    // Lowered blend (tactical sprint / slide): gun drops down + to the side.
    this.lowered += ((this._loweredTarget || 0) - this.lowered) * (1 - Math.exp(-dt * 16));

    // Recoil decay.
    this.recoil = Math.max(0, this.recoil - dt * 5);

    // Reload dip (0 -> 1 -> 0 over the reload duration).
    let reloadAmt = 0;
    if (this.reloadT > 0) {
      this.reloadT = Math.max(0, this.reloadT - dt);
      const p = 1 - this.reloadT / this.reloadDur;
      reloadAmt = Math.sin(p * Math.PI);
    }
    this.meleeT = Math.max(0, this.meleeT - dt);
    this.grenadeT = Math.max(0, this.grenadeT - dt);
    const meleeP = this.meleeT > 0 ? 1 - this.meleeT / 0.42 : 0;
    const grenadeP = this.grenadeT > 0 ? 1 - this.grenadeT / 0.68 : 0;

    // Smooth the look-driven sway.
    const swayScale = visuals.weaponSway ? visuals.motionIntensity : 0;
    this._swayX += ((lookDelta.x * 0.0009 * swayScale) - this._swayX) * (1 - Math.exp(-dt * 10));
    this._swayY += ((lookDelta.y * 0.0009 * swayScale) - this._swayY) * (1 - Math.exp(-dt * 10));

    // Walk / sprint bob.
    if (moving) this.bobPhase += dt * (sprinting ? 14 : 9);
    const bobScale = visuals.headBob ? visuals.motionIntensity : 0;
    const bobX = Math.cos(this.bobPhase) * 0.012 * (moving ? bobScale : 0);
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.018 * (moving ? bobScale : 0);

    // Base pose: sprint overrides hip, then blend hip->ADS.
    // (Euler angles lerp component-wise — the pose deltas are small, no gimbal issue.)
    const basePos = SPRINT_POS.clone().lerp(HIP_POS, sprinting ? 0 : 1);
    const pos = basePos.clone().lerp(ADS_POS, this.adsAmount);
    const rot = new THREE.Euler(
      THREE.MathUtils.lerp(HIP_ROT.x, ADS_ROT.x, this.adsAmount),
      THREE.MathUtils.lerp(HIP_ROT.y, ADS_ROT.y, this.adsAmount),
      THREE.MathUtils.lerp(HIP_ROT.z, ADS_ROT.z, this.adsAmount)
    );

    // Layered offsets.
    pos.x += bobX - this._swayX;
    pos.y += bobY + this._swayY * 0.5;
    pos.z += this.recoil * 0.10;
    rot.x += this.recoil * 0.18 + this._swayY;
    rot.y += -this._swayX * 1.2;

    // Reload dips the gun down + forward and tilts it.
    pos.y -= reloadAmt * 0.18;
    pos.z += reloadAmt * 0.12;
    rot.x += reloadAmt * 0.25;

    // Lowered (tactical sprint / slide): gun drops to the side + down, like CoD.
    if (this.lowered > 0.001) {
      pos.x += this.lowered * 0.28;
      pos.y -= this.lowered * 0.34;
      pos.z += this.lowered * 0.08;
      rot.x += this.lowered * 0.5;
      rot.z += this.lowered * 0.4;
    }

    // Hands are separate pivots so actions read as an actual first-person body,
    // not a floating weapon. Reload brings the support hand down to the magazine;
    // melee and grenade use short, non-blocking camera-local poses.
    const right = this.rightArm;
    const left = this.leftArm;
    if (right && left) {
      right.position.set(0.18, -0.29, -0.16);
      left.position.set(-0.06, -0.29, -0.16);
      right.rotation.set(-0.48, 0, -0.19);
      left.rotation.set(-0.28, 0, 0.15);
      right.rotation.x += this.recoil * 0.16 + this.lowered * 0.3;
      left.rotation.x += this.lowered * 0.42;
      left.position.y -= reloadAmt * 0.22;
      left.position.z += reloadAmt * 0.2;
      left.rotation.z += reloadAmt * 0.75;
      if (meleeP > 0) {
        const thrust = Math.sin(meleeP * Math.PI);
        right.position.z -= thrust * 0.4;
        right.position.x += thrust * 0.15;
        right.rotation.x -= thrust * 1.1;
        left.position.z += thrust * 0.12;
      }
      if (grenadeP > 0) {
        const throwArc = Math.sin(grenadeP * Math.PI);
        right.position.y += throwArc * 0.17;
        right.position.z -= throwArc * 0.26;
        right.rotation.x -= throwArc * 0.95;
        left.rotation.z += throwArc * 0.25;
      }
    }

    this.root.position.copy(pos);
    this.root.rotation.copy(rot);
  }

  dispose() {
    this.camera.remove(this.root);
  }
}
