import * as THREE from 'three';

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Constructed, repeatable building shell: walls, window band, door, roof and beams. */
export function buildStructure({ x, z, width = 10, depth = 10, height = 6, color = 0x43505a, seed = 1, type = 'warehouse' }) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  group.name = `Structure:${type}`;
  const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: 0.62, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x76b9d5, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.48 });
  const add = (geometry, material, px, py, pz) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(px, py, pz); mesh.castShadow = height > 2; mesh.receiveShadow = true; group.add(mesh); return mesh; };
  // Four wall modules leave a readable entrance on the south side.
  add(new THREE.BoxGeometry(width, height, 0.32), wall, x, height / 2, z - depth / 2);
  add(new THREE.BoxGeometry(width, height, 0.32), wall, x, height / 2, z + depth / 2);
  add(new THREE.BoxGeometry(0.32, height, depth), wall, x - width / 2, height / 2, z);
  add(new THREE.BoxGeometry(0.32, height, depth), wall, x + width / 2, height / 2, z);
  add(new THREE.BoxGeometry(1.7, 2.2, 0.38), trim, x, 1.1, z - depth / 2 - 0.03);
  for (const side of [-1, 1]) for (let i = -1; i <= 1; i += 1) {
    add(new THREE.BoxGeometry(1.35, 1.05, 0.04), glass, x + i * 2.25, height * 0.62, z + side * (depth / 2 + 0.18));
  }
  add(new THREE.BoxGeometry(width + 0.65, 0.35, depth + 0.65), trim, x, height + 0.18, z);
  for (const dx of [-width / 2 + 0.45, width / 2 - 0.45]) for (const dz of [-depth / 2 + 0.45, depth / 2 - 0.45]) add(new THREE.BoxGeometry(0.28, height, 0.28), trim, x + dx, height / 2, z + dz);
  group.userData = { type, seed, lootAnchors: [{ x, y: 0.1, z }, { x: x + (random() - .5) * width * .45, y: .1, z: z + (random() - .5) * depth * .45 }] };
  return group;
}
