import * as THREE from 'three';

/**
 * Transient combat VFX — all procedural, no asset files:
 *   - muzzle flash sprites at the gun tip
 *   - ejected brass shells (physics-y: velocity + gravity + spin, then despawn)
 *   - impact decals: blood-red on bodies, scorch on world geometry
 *
 * Owned by main.js, updated once per frame, and driven by WeaponSystem on
 * each shot / hit.
 */

function radialTexture(inner, outer) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function decalTexture(blood) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  // soft irregular blob
  const cx = s / 2, cy = s / 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = (0.18 + Math.random() * 0.22) * s;
    const x = cx + Math.cos(a) * r * (0.6 + Math.random() * 0.4);
    const y = cy + Math.sin(a) * r * (0.6 + Math.random() * 0.4);
    const rad = (0.12 + Math.random() * 0.18) * s;
    const col = blood
      ? `rgba(${120 + Math.random() * 80 | 0}, ${10 + Math.random() * 20 | 0}, ${10 | 0}, ${0.5 + Math.random() * 0.4})`
      : `rgba(${20 + Math.random() * 20 | 0}, ${20 + Math.random() * 20 | 0}, ${20 + Math.random() * 20 | 0}, ${0.55 + Math.random() * 0.35})`;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

export class EffectsSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this._flashTex = radialTexture('rgba(255,240,200,1)', 'rgba(255,150,40,0.7)');
    this._bloodTex = decalTexture(true);
    this._scorchTex = decalTexture(false);
    this.shells = [];
    this.decals = [];
    this.flashes = [];
    this._shellGeo = new THREE.BoxGeometry(0.025, 0.012, 0.012);
    this._shellMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, emissive: 0x3a2a08, emissiveIntensity: 0.4, roughness: 0.5 });
    this._decalGeo = new THREE.PlaneGeometry(0.32, 0.32);
    this._tmp = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._MAX_SHELLS = 48;
    this._MAX_DECALS = 64;
  }

  muzzleFlash(position, direction) {
    const mat = new THREE.SpriteMaterial({
      map: this._flashTex, color: 0xffd9a0, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    const scale = 0.18 + Math.random() * 0.12;
    sprite.scale.setScalar(scale);
    // tiny offset forward so it sits at the muzzle tip
    if (direction) sprite.position.addScaledVector(this._tmp.copy(direction).normalize(), 0.05);
    this.scene.add(sprite);
    const rec = { sprite, mat, life: 0.06, max: 0.06 };
    this.flashes.push(rec);
  }

  spawnShell(camera) {
    if (this.shells.length >= this._MAX_SHELLS) {
      const old = this.shells.shift();
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose?.();
    }
    camera.getWorldDirection(this._fwd);
    this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const mesh = new THREE.Mesh(this._shellGeo, this._shellMat);
    // eject port: right of the gun, slightly back/up
    mesh.position.copy(camera.getWorldPosition(this._tmp))
      .addScaledVector(this._right, 0.22)
      .addScaledVector(this._up, -0.08)
      .addScaledVector(this._fwd, -0.15);
    const vel = new THREE.Vector3()
      .addScaledVector(this._right, 1.6 + Math.random() * 0.8)
      .addScaledVector(this._up, 1.0 + Math.random() * 0.8)
      .addScaledVector(this._fwd, -0.6);
    const spin = new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 18);
    this.scene.add(mesh);
    this.shells.push({ mesh, vel, spin, life: 1.6, max: 1.6 });
  }

  spawnDecal(point, normal, isBlood) {
    if (!normal) normal = new THREE.Vector3(0, 1, 0);
    if (this.decals.length >= this._MAX_DECALS) {
      const old = this.decals.shift();
      this.scene.remove(old.mesh);
      old.mesh.material.map?.dispose?.();
      old.mesh.material.dispose();
      old.mesh.geometry.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      map: isBlood ? this._bloodTex : this._scorchTex,
      transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const mesh = new THREE.Mesh(this._decalGeo, mat);
    mesh.position.copy(point).addScaledVector(normal, 0.012);
    mesh.lookAt(this._tmp.copy(point).add(normal));
    mesh.rotateZ(Math.random() * Math.PI * 2);
    const s = isBlood ? 0.5 + Math.random() * 0.6 : 0.5 + Math.random() * 0.9;
    mesh.scale.setScalar(s);
    this.scene.add(mesh);
    this.decals.push({ mesh, mat, life: 7, max: 7 });
  }

  update(dt) {
    // Muzzle flashes: fast fade.
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      f.mat.opacity = k;
      f.sprite.scale.setScalar((0.18 + (1 - k) * 0.25));
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.mat.dispose();
        this.flashes.splice(i, 1);
      }
    }
    // Shells: integrate + spin, fade out near end of life.
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.vel.y += -9.8 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      s.mesh.rotation.z += s.spin.z * dt;
      s.life -= dt;
      if (s.life < 0.5) s.mesh.material.opacity = Math.max(0, s.life / 0.5);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shells.splice(i, 1);
      }
    }
    // Decals: hold, then fade out at the end.
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life < 1.5) d.mat.opacity = Math.max(0, (d.life / 1.5) * 0.95);
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mat.map?.dispose?.();
        d.mat.dispose();
        d.mesh.geometry.dispose?.();
        this.decals.splice(i, 1);
      }
    }
  }
}
