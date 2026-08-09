import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Maps every asset category to its folder, matching the project's existing
 * directory layout exactly. These folders are currently empty — every loader
 * call below is written to fail gracefully and fall back to a placeholder
 * primitive, so the game is fully playable today and "upgrades" automatically
 * the moment real files are dropped into these folders.
 *
 * All paths are relative to the site root (index.html), so serve the project
 * from E:\FPS-Game\StreetKillaz with a static server (see README.md).
 */
export const ASSET_PATHS = {
  fpvArms: '/FOV-assets/First-person-FPS/',
  guns: '/gun-assets/',
  multiplayerMaps: '/multiplayer-map-assets/',
  playerLevel: '/player-level-assets/',
  playerLeveling: '/player-leveling-assets/',
  playerPrestige: '/player-prestiges-assets/',
  perks: '/players-perks-assets/',
  zombieCharacters: '/zombie-character-assets/',
  zombieMaps: '/zombie-map-assets/',
  zombiesMode: '/zombies-mode-assets/',
  buildings: '/building-assets/',
  characters: '/character-assets/',
};

export class AssetLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this._modelCache = new Map();
    this._gltfCache = new Map();
    this._missingAssets = new Set();
  }

  /**
   * Loads an authored GLB and returns a fresh skeleton-safe clone. A normal
   * Object3D.clone() shares bones between remote players, so every player must
   * receive its own SkeletonUtils clone before AnimationMixer is created.
   */
  async loadGLTF(path) {
    try {
      let source = this._gltfCache.get(path);
      if (!source) {
        const gltf = await this.gltfLoader.loadAsync(path);
        gltf.scene.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        source = { scene: gltf.scene, animations: gltf.animations ?? [] };
        this._gltfCache.set(path, source);
      }
      const scene = cloneSkeleton(source.scene);
      // Geometry/materials are shared with the cached source. Mark them so a
      // departing remote player never disposes assets still used by others.
      scene.traverse((object) => { object.userData.sharedGltfAsset = true; });
      return { scene, animations: source.animations };
    } catch (error) {
      if (!this._missingAssets.has(path)) {
        this._missingAssets.add(path);
        console.info(`[AssetLoader] No authored GLB at "${path}" yet — keeping the operator fallback.`);
      }
      return null;
    }
  }

  /**
   * Load a GLTF/GLB model. If it doesn't exist yet, returns fallbackFactory()
   * (a THREE.Object3D) instead of throwing, and logs a friendly notice once.
   */
  async loadModel(path, fallbackFactory) {
    if (this._modelCache.has(path)) {
      return this._modelCache.get(path).clone(true);
    }
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      const model = gltf.scene;
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this._modelCache.set(path, model);
      return model.clone(true);
    } catch (err) {
      console.info(`[AssetLoader] No model at "${path}" yet — using placeholder.`);
      return fallbackFactory ? fallbackFactory() : new THREE.Object3D();
    }
  }

  async loadTexture(path) {
    try {
      return await this.textureLoader.loadAsync(path);
    } catch (err) {
      console.info(`[AssetLoader] No texture at "${path}" yet — skipping.`);
      return null;
    }
  }
}

/** Simple colored box-person placeholder used until character-assets ship. */
export function placeholderCharacter(color = 0x4d7cff) {
  const group = new THREE.Group();
  group.name = 'StreetKillaOperator';
  group.userData.operatorId = 'streetkilla';
  const uniform = new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.82 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x5c4f3c, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8e5d43, roughness: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.72, 4, 8), uniform);
  torso.position.y = 1.15;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.38), vestMat);
  vest.position.set(0, 1.28, -0.02);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), skin);
  head.position.y = 1.84;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), black);
  helmet.position.set(0, 1.96, 0);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x171b1d });
  for (const x of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMat);
    eye.position.set(x, 1.87, -0.225);
    group.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.012), black);
  mouth.position.set(0, 1.77, -0.23);
  const limbs = [
    [new THREE.CapsuleGeometry(0.09, 0.58, 4, 8), [-0.43, 1.18, 0], uniform],
    [new THREE.CapsuleGeometry(0.09, 0.58, 4, 8), [0.43, 1.18, 0], uniform],
    [new THREE.CapsuleGeometry(0.12, 0.7, 4, 8), [-0.18, 0.46, 0], uniform],
    [new THREE.CapsuleGeometry(0.12, 0.7, 4, 8), [0.18, 0.46, 0], uniform],
  ].map(([geometry, position, material]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    return mesh;
  });
  const boots = [-0.18, 0.18].map((x) => {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.38), black);
    boot.position.set(x, 0.08, -0.04);
    return boot;
  });
  group.add(torso, vest, head, helmet, mouth, ...limbs, ...boots);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

/** Simple placeholder gun mesh until gun-assets ship real models. */
export function placeholderGun(color = 0x2b2b2b) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), mat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 12), mat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.4);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.08), mat);
  grip.position.set(0, -0.13, 0.15);
  group.add(body, barrel, grip);
  return group;
}

/**
 * Build a distinct first-person gun silhouette from a per-weapon mesh spec.
 * This is what makes every gun LOOK different without external model files:
 * barrel length, magazine type (curved / stanag / drum / box / short / pistol),
 * stock (none / folding / fixed), bullpup layout, grip style, caliber thickness.
 * Returns a THREE.Group anchored at the grip so the viewmodel can pose it.
 */
export function buildGunMesh(spec = {}, tint = 0x2b2b2b) {
  const s = {
    body: 0.55, barrel: 0.24, mag: 'stanag', stock: 'folding',
    bullpup: false, grip: 'angled', caliber: 0.05, ...spec,
  };
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.45, metalness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.4 });

  // Receiver / body.
  const bodyLen = s.body;
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, bodyLen), mat);
  bodyMesh.position.set(0, 0, s.bullpup ? 0.02 : 0);
  group.add(bodyMesh);

  // Barrel + muzzle (caliber drives thickness).
  const barrelLen = s.barrel;
  const barrelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(s.caliber, s.caliber, barrelLen, 12),
    darkMat
  );
  barrelMesh.rotation.x = Math.PI / 2;
  barrelMesh.position.set(0, 0.02, -bodyLen / 2 - barrelLen / 2 + (s.bullpup ? 0.04 : 0));
  group.add(barrelMesh);
  // Muzzle brake nub.
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(s.caliber * 1.4, s.caliber * 1.4, 0.04, 12), darkMat);
  brake.rotation.x = Math.PI / 2;
  brake.position.set(0, 0.02, -bodyLen / 2 - barrelLen - 0.02);
  group.add(brake);

  // Magazine (positioned forward for bullpup).
  const magX = 0;
  const magZ = s.bullpup ? bodyLen * 0.28 : -0.02;
  const magGroup = new THREE.Group();
  const magMat = new THREE.MeshStandardMaterial({ color: 0x202227, roughness: 0.7, metalness: 0.3 });
  if (s.mag === 'drum') {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), magMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(magX, -0.13, magZ);
    magGroup.add(drum);
  } else if (s.mag === 'box') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.14), magMat);
    box.position.set(magX, -0.14, magZ);
    magGroup.add(box);
  } else if (s.mag === 'pistol') {
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), magMat);
    pm.position.set(0, -0.1, 0.06);
    magGroup.add(pm);
  } else {
    // curved / stanag / short -> tapered box mag with a slight curve
    const magH = s.mag === 'short' ? 0.12 : 0.26;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, magH, 0.08), magMat);
    mag.position.set(magX, -0.08 - magH / 2, magZ);
    mag.rotation.x = s.mag === 'curved' ? 0.12 : 0;
    magGroup.add(mag);
  }
  group.add(magGroup);

  // Stock.
  if (s.stock === 'fixed' || s.stock === 'folding') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, s.bullpup ? 0.16 : 0.28), mat);
    stock.position.set(0, -0.01, s.bullpup ? -bodyLen * 0.1 : bodyLen / 2 + (s.stock === 'folding' ? 0.05 : 0.12));
    group.add(stock);
  }

  // Grip.
  const gripMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.07), mat);
  if (s.grip === 'none') {
    gripMesh.visible = false;
  } else if (s.grip === 'vertical') {
    gripMesh.rotation.x = 0;
    gripMesh.position.set(0, -0.12, -0.02);
  } else {
    gripMesh.rotation.x = 0.35; // angled pistol grip
    gripMesh.position.set(0, -0.1, 0.16);
  }
  group.add(gripMesh);

  // Sight rail hint on top.
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, bodyLen * 0.5), darkMat);
  rail.position.set(0, 0.07, s.bullpup ? 0.02 : 0);
  group.add(rail);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return group;
}
