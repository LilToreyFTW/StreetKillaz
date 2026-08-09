import * as THREE from 'three';
import { buildStructure, seededRandom } from './StructureGenerator.js?v=20260823';

/** Procedural Downtown Lockup: a compact three-lane urban FPS test map. */
export function buildTestArena(scene) {
  const group = new THREE.Group();
  group.name = 'DowntownLockup';
  const collisionBoxes = [];

  group.add(new THREE.HemisphereLight(0x8fa8ff, 0x1a1a20, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.2);
  sun.position.set(30, 45, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  group.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x252a31, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0xb8913c, roughness: 0.8, emissive: 0x211808 });
  for (const z of [-38, -12, 14, 40]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 8), roadMat);
    stripe.position.set(0, 0.012, z);
    group.add(stripe);
  }

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1e28, roughness: 0.8 });
  for (const spec of [
    [120, 8, 1, 0, 4, -60], [120, 8, 1, 0, 4, 60],
    [1, 8, 120, -60, 4, 0], [1, 8, 120, 60, 4, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(spec[0], spec[1], spec[2]), wallMat);
    wall.position.set(spec[3], spec[4], spec[5]);
    wall.castShadow = true;
    group.add(wall);
  }

  const addBlock = (x, z, w, h, d, color, label) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.mapLabel = label;
    group.add(mesh);
    collisionBoxes.push({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h, z + d / 2) });
  };

  addBlock(-23, -25, 14, 6, 10, 0x314754, 'Warehouse A');
  addBlock(-23, 23, 14, 7, 10, 0x3c4f58, 'Warehouse B');
  addBlock(23, -25, 13, 5, 12, 0x6a3f38, 'Apartment block');
  addBlock(23, 24, 13, 4, 10, 0x75463b, 'Courtyard block');
  addBlock(0, 33, 25, 7, 8, 0x4b4d57, 'Parking deck');
  addBlock(-8, -3, 3, 2, 2, 0x8d7b63, 'Concrete barrier');
  addBlock(9, 4, 3, 2, 2, 0x8d7b63, 'Concrete barrier');
  addBlock(-7, 16, 5, 1.4, 2, 0x49606a, 'Container');
  addBlock(8, -16, 5, 1.4, 2, 0x49606a, 'Container');

  const bus = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 13), new THREE.MeshStandardMaterial({ color: 0x55616a, roughness: 0.8 }));
  bus.position.set(0, 1.4, -22);
  bus.rotation.y = -0.18;
  bus.castShadow = true;
  group.add(bus);
  collisionBoxes.push({ min: new THREE.Vector3(-2.5, 0, -29), max: new THREE.Vector3(2.5, 3, -15) });

  const spawnPoints = [{ x: -34, y: 1.7, z: 0 }, { x: 34, y: 1.7, z: 0 }];
  for (const [x, color] of [[-34, 0x1589ff], [34, 0xf02c45]]) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.08, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
    pad.position.set(x, 0.05, 0);
    group.add(pad);
    const beacon = new THREE.PointLight(color, 2.5, 14);
    beacon.position.set(x, 3, 0);
    group.add(beacon);
  }

  scene.add(group);
  const dummies = spawnTargetDummies(group, 6);
  return { group, dummies, spawnPoints, collisionBoxes };
}

/** Condensed battle-royale fallback assembled from the same district language. */
export function buildThunderstrike(scene, worldSeed = 77129) {
  const group = new THREE.Group();
  group.name = 'Thunderstrike';
  group.add(new THREE.HemisphereLight(0x9bbcff, 0x17202e, 1.1));
  const sun = new THREE.DirectionalLight(0xffe5b4, 1.35);
  sun.position.set(70, 90, 20);
  sun.castShadow = true;
  group.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: 0x202831, roughness: 0.96 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const districtColors = [0x314754, 0x6a3f38, 0x4d5865, 0x49606a, 0x5e4c3d];
  const random = seededRandom(worldSeed);
  const districtPositions = [[-65, -65], [65, -65], [-65, 65], [65, 65], [0, 0]];
  const collisionBoxes = [];
  districtPositions.forEach(([x, z], index) => {
    const size = index === 4 ? 34 : 44;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(size, 0.35, size), new THREE.MeshStandardMaterial({ color: districtColors[index], roughness: 0.8 }));
    pad.position.set(x, 0.18, z);
    pad.receiveShadow = true;
    group.add(pad);
    for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
      const h = 5 + Math.floor(random() * 4);
      const building = buildStructure({ x: x + dx, z: z + dz, width: 10, depth: 10, height: h, color: districtColors[(index + 1) % districtColors.length], seed: worldSeed + index * 100 + dx * 7 + dz, type: index === 4 ? 'communications-hub' : 'district-building' });
      group.add(building);
      collisionBoxes.push({ min: new THREE.Vector3(x + dx - 5, 0, z + dz - 5), max: new THREE.Vector3(x + dx + 5, h, z + dz + 5) });
    }
    // Readable waist-high cover in each combat district.
    for (const [dx, dz] of [[0, -18], [-18, 0], [18, 0]]) {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(4, 1.15, 1.1), new THREE.MeshStandardMaterial({ color: 0x777066, roughness: 0.86 }));
      cover.position.set(x + dx, 0.58, z + dz); cover.castShadow = true; group.add(cover);
      collisionBoxes.push({ min: new THREE.Vector3(x + dx - 2, 0, z + dz - 0.55), max: new THREE.Vector3(x + dx + 2, 1.15, z + dz + 0.55) });
    }
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(92, 94, 64), new THREE.MeshBasicMaterial({ color: 0x36b6ff, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);
  const landmark = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 34, 12), new THREE.MeshStandardMaterial({ color: 0x3c4854, metalness: 0.5, roughness: 0.45, emissive: 0x081019 }));
  landmark.position.set(0, 17, 0); landmark.castShadow = true; group.add(landmark);
  group.userData.worldSeed = worldSeed;
  scene.add(group);
  return {
    group,
    dummies: [],
    collisionBoxes,
    spawnPoints: [{ x: -88, y: 1.7, z: -88 }, { x: 88, y: 1.7, z: -88 }, { x: -88, y: 1.7, z: 88 }, { x: 88, y: 1.7, z: 88 }],
  };
}

function makeDummy() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd1495b, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), mat);
  torso.position.y = 1.15;
  torso.userData.hitZone = 'body';
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), mat);
  head.position.y = 1.95;
  head.userData.hitZone = 'head';
  g.add(torso, head);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.isTarget = true;
  g.userData.health = 100;
  g.userData.maxHealth = 100;
  return g;
}

function spawnTargetDummies(parent, count) {
  const dummies = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 20 + Math.random() * 12;
    const dummy = makeDummy();
    dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    parent.add(dummy);
    dummies.push(dummy);
  }
  return dummies;
}

export function respawnDummy(dummy) {
  dummy.userData.health = dummy.userData.maxHealth;
  dummy.visible = true;
  const angle = Math.random() * Math.PI * 2;
  const radius = 20 + Math.random() * 12;
  dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}
