import * as THREE from 'three';
import { WEAPONS, DEFAULT_LOADOUT, getWeaponDefinition } from './WeaponData.js';
import { RecoilSystem } from './RecoilSystem.js';
import { Viewmodel, BASE_FOV, ADS_FOV } from './Viewmodel.js?v=20260814';
import { EffectsSystem } from './EffectsSystem.js';
import { getInputSettings } from '../config/GameConfig.js?v=20260822';

// Per-weapon audio + recoil now live on each entry in WeaponData.WEAPONS
// (gun.audio / gun.recoil), so no separate lookup table is needed here.

export class WeaponSystem {
  constructor(scene, camera, assetLoader, { onHit, onKill, onFireIntent, onReloadIntent, onMeleeIntent, onGrenadeIntent, audio, recoil, onKillFeed, effects, controller, initialWeaponId } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.assetLoader = assetLoader;
    this.onHit = onHit || (() => {});
    this.onKill = onKill || (() => {});
    this.onFireIntent = onFireIntent || (() => {});
    this.onReloadIntent = onReloadIntent || (() => {});
    this.onMeleeIntent = onMeleeIntent || (() => {});
    this.onGrenadeIntent = onGrenadeIntent || (() => {});
    this.onKillFeed = onKillFeed || (() => {});
    this.audio = audio || null;
    this.recoil = recoil || new RecoilSystem();
    this.effects = effects || null;
    this.controller = controller || null;
    this.networkAuthority = false;
    this.raycaster = new THREE.Raycaster();
    this.targets = [];
    this.viewmodel = new Viewmodel(camera, assetLoader);
    this.equip(initialWeaponId || DEFAULT_LOADOUT?.[0] || 'cdg58');
    this._cooldown = 0;
    this._reloading = false;
    this._reloadTimer = 0;
    this._ads = false;
    this._firedThisPull = false;
    this._meleeCooldown = 0;
    this._grenadeCooldown = 0;
    this._meleeKeyHeld = false;
    this._grenadeKeyHeld = false;
    this._muzzleFlash = this._buildMuzzleFlash();
    this.camera.add(this._muzzleFlash);
    this._muzzleWorld = new THREE.Vector3();
    this._shotDir = new THREE.Vector3();
  }

  setNetworkAuthority(enabled) {
    this.networkAuthority = Boolean(enabled);
  }

  get isAiming() { return this._ads; }
  get isReloading() { return this._reloading; }

  registerTarget(object) {
    if (!this.targets.includes(object)) this.targets.push(object);
  }

  unregisterTarget(object) {
    const index = this.targets.indexOf(object);
    if (index !== -1) this.targets.splice(index, 1);
  }

  equip(weaponId, statMult = 1) {
    const base = getWeaponDefinition(weaponId);
    if (!base) return false;
    if (this.weaponId && this.loadouts && this.loadouts[this.weaponId]) {
      const prev = this.loadouts[this.weaponId];
      prev.ammoInMag = this.ammoInMag;
      prev.ammoReserve = this.ammoReserve;
      prev.statMult = this._statMult || 1;
    }
    this.weaponId = weaponId;
    this._statMult = statMult;
    this.stats = { ...base, damage: base.damage * statMult };
    if (!this.loadouts) this._initLoadouts();
    const lod = this.loadouts[weaponId];
    this.ammoInMag = lod ? lod.ammoInMag : base.magSize;
    this.ammoReserve = lod ? lod.ammoReserve : base.reserveMax;
    this._reloading = false;
    this._ads = false;
    this.recoil.setWeapon(weaponId, base.recoil);
    this.recoil.reset();
    if (this.viewmodel) this.viewmodel.setWeapon(weaponId, statMult);
    return true;
  }

  _initLoadouts() {
    // The 1-5 quick-select is one representative gun per class from the catalog.
    this.slots = (typeof DEFAULT_LOADOUT !== 'undefined' && DEFAULT_LOADOUT) || ['cdg58', 'mtz762', 'lach9', 'kvb73', 'glock21'];
    this.loadouts = {};
    for (const id of this.slots) {
      const b = WEAPONS[id];
      if (!b) continue;
      this.loadouts[id] = { statMult: 1, ammoInMag: b.magSize, ammoReserve: b.reserveMax };
    }
  }

  /** Manual weapon selection (number keys 1-5). Preserves each slot's ammo. */
  switchToSlot(index) {
    const id = this.slots[index];
    if (!id || id === this.weaponId) return;
    this.equip(id);
  }

  startReload() {
    if (this._reloading || this.ammoInMag === this.stats.magSize || this.ammoReserve <= 0) return;
    if (this.networkAuthority) this.onReloadIntent(this.weaponId);
    this._reloading = true;
    this._reloadTimer = this.stats.reloadTime;
    this.recoil.onRelease();
    if (this.audio) { this.audio.click({ freq: 900 }); setTimeout(() => this.audio && this.audio.click({ freq: 1400 }), this.stats.reloadTime * 0.6); }
    if (this.viewmodel) this.viewmodel.startReload(this.stats.reloadTime);
  }

  applyServerWeaponState(weapon) {
    if (!weapon) return;
    if (weapon.id && weapon.id !== this.weaponId) this.equip(weapon.id);
    if (Number.isFinite(weapon.ammoInMag)) this.ammoInMag = weapon.ammoInMag;
    if (Number.isFinite(weapon.ammoReserve)) this.ammoReserve = weapon.ammoReserve;
    this._reloading = Boolean(weapon.reloading);
  }

  tryMelee() {
    if (this._meleeCooldown > 0 || this._reloading) return false;
    this._meleeCooldown = 0.55;
    this.viewmodel?.playMelee();
    this.onMeleeIntent();
    return true;
  }

  throwGrenade() {
    if (this._grenadeCooldown > 0 || this._reloading) return false;
    this._grenadeCooldown = 0.9;
    this.viewmodel?.playGrenade();
    this.onGrenadeIntent();
    return true;
  }

  update(dt, input) {
    if (this._cooldown > 0) this._cooldown -= dt;
    this._meleeCooldown = Math.max(0, this._meleeCooldown - dt);
    this._grenadeCooldown = Math.max(0, this._grenadeCooldown - dt);

    if (this._reloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0 && !this.networkAuthority) {
        const needed = this.stats.magSize - this.ammoInMag;
        const taken = Math.min(needed, this.ammoReserve);
        this.ammoInMag += taken;
        this.ammoReserve -= taken;
        this._reloading = false;
      }
    }

    // Weapon switching (1-5), preserving each slot's ammo.
    for (let i = 0; i < (this.slots?.length || 0); i++) {
      if (input.isDown('Digit' + (i + 1))) { this.switchToSlot(i); break; }
    }

    if (input.isDown('KeyR')) this.startReload();

    // V = melee, G = grenade. Edge detection prevents key hold from repeating
    // the animation or spamming the future authoritative network commands.
    const meleeDown = input.isDown('KeyF');
    if (meleeDown && !this._meleeKeyHeld) this.tryMelee();
    this._meleeKeyHeld = meleeDown;
    const grenadeDown = input.isDown('KeyG');
    if (grenadeDown && !this._grenadeKeyHeld) this.throwGrenade();
    this._grenadeKeyHeld = grenadeDown;

    // --- ADS (hold right mouse) ---
    const inputSettings = getInputSettings();
    if (input.mouseDown(2) && !this._adsClickHeld && inputSettings.toggleADS) this._adsLatched = !this._adsLatched;
    this._adsClickHeld = input.mouseDown(2);
    const ads = inputSettings.toggleADS ? Boolean(this._adsLatched) : input.mouseDown(2);
    this._ads = ads;
    if (this.controller) this.controller.adsActive = ads;
    const targetFov = ads ? ADS_FOV : BASE_FOV;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-dt * 14));
      this.camera.updateProjectionMatrix();
    }

    const firing = this.stats.auto ? input.mouseDown(0) : input.mouseDown(0) && !this._firedLastFrame;
    if (firing) {
      this._firedThisPull = true;
      this._tryFire();
    } else if (this._firedThisPull) {
      this._firedThisPull = false;
      this.recoil.onRelease(); // let the spray recover when the trigger is let go
    }
    this._firedLastFrame = input.mouseDown(0);

    // Tick recoil recovery every frame.
    this.recoil.update(dt);

    // Drive the first-person viewmodel.
    if (this.viewmodel) {
      const look = input.peekMouseDelta();
      const moving = input.isDown('KeyW') || input.isDown('KeyA') || input.isDown('KeyS') || input.isDown('KeyD');
      const sprinting = moving && (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && input.isDown('KeyW');
      const lowered = ads ? 0 : (this.controller && this.controller.weaponLowered ? 1 : 0);
      this.viewmodel.setLowered(lowered);
      this.viewmodel.update(dt, { lookDelta: look, moving, sprinting, ads });
    }
  }

  _tryFire() {
    if (this._reloading || this._cooldown > 0) return;
    if (this.ammoInMag <= 0) {
      if (this.audio) this.audio.dryFire();
      this.startReload();
      return;
    }
    this._cooldown = 1 / this.stats.fireRate;
    this.ammoInMag -= 1;
    this._flashMuzzle();
    this.recoil.onShot();
    if (this.viewmodel) this.viewmodel.playRecoil();
    if (this.audio) {
      const a = (this.stats && this.stats.audio) || { bass: 0.6, snap: 0.75, length: 0.16 };
      this.audio.shoot(a);
    }
    // VFX: muzzle flash at the gun tip + a shell ejecting from the port.
    if (this.effects) {
      this.camera.getWorldDirection(this._shotDir);
      if (this.viewmodel) {
        this.viewmodel.getMuzzleWorldPosition(this._muzzleWorld);
        this.effects.muzzleFlash(this._muzzleWorld, this._shotDir);
      } else {
        this.camera.getWorldPosition(this._muzzleWorld);
        this._muzzleWorld.addScaledVector(this._shotDir, 0.5);
        this.effects.muzzleFlash(this._muzzleWorld, this._shotDir);
      }
      this.effects.spawnShell(this.camera);
    }

    if (this.networkAuthority) {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.onFireIntent({
        weaponId: this.weaponId,
        direction: { x: direction.x, y: direction.y, z: direction.z },
        clientTime: Date.now(),
      });
      const start = this.camera.getWorldPosition(new THREE.Vector3());
      this._spawnTracer(start, start.clone().addScaledVector(direction, this.stats.range));
      return;
    }

    const pellets = this.stats.pellets || 1;
    for (let index = 0; index < pellets; index += 1) this._fireRay();
  }

  _fireRay() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    // Spread = base + spray growth; tightened hard while ADS.
    const spray = this.recoil ? this.recoil.spread : 0;
    const spread = (this.stats.spread + spray) * (this._ads ? 0.35 : 1);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.stats.range;
    const hits = this.raycaster.intersectObjects(this.targets, true);
    if (hits.length > 0) {
      const hit = hits[0];
      let target = hit.object;
      const hitZone = hit.object.userData.hitZone || 'body';
      while (target && !target.userData.isTarget) target = target.parent;
      if (target) {
        this._spawnTracer(origin, hit.point);
        if (this.audio) this.audio.bodyHit();
        if (this.effects) this.effects.spawnDecal(hit.point, hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null, true);
        const damage = hitZone === 'head' ? this.stats.damage * 1.5 : this.stats.damage;
        const died = this.onHit(target, damage, { point: hit.point, hitZone, headshot: hitZone === 'head' });
        if (died) this.onKill(target, { hitZone, headshot: hitZone === 'head', weaponId: this.weaponId });
        return;
      }
    }
    if (this.audio) this.audio.worldHit();
    if (this.effects) this.effects.spawnDecal(hits.length > 0 ? hits[0].point : origin.clone().addScaledVector(direction, this.stats.range), hits.length > 0 && hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld) : null, false);
    this._spawnTracer(origin, origin.clone().addScaledVector(direction, this.stats.range));
  }

  _spawnTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xfff59a, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    const started = performance.now();
    const fade = () => {
      const progress = (performance.now() - started) / 80;
      material.opacity = Math.max(0, 1 - progress);
      if (progress >= 1) {
        this.scene.remove(line);
        geometry.dispose();
        material.dispose();
      } else requestAnimationFrame(fade);
    };
    fade();
  }

  _buildMuzzleFlash() {
    const light = new THREE.PointLight(0xffcf7a, 0, 4);
    light.position.set(0.25, -0.2, -0.6);
    return light;
  }

  _flashMuzzle() {
    this._muzzleFlash.intensity = 6;
    setTimeout(() => { this._muzzleFlash.intensity = 0; }, 45);
  }
}
