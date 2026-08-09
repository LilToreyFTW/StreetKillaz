import * as THREE from 'three';

/** Shared environment materials; maps reuse these instead of creating duplicates. */
export class MaterialLibrary {
  constructor() {
    this.materials = new Map();
    this.definitions = {
      concrete: [0x696b6c, 0.95, 0.0], metal: [0x4c545b, 0.45, 0.72], paintedMetal: [0x385064, 0.62, 0.38],
      glass: [0x6ca8c7, 0.12, 0.25], wood: [0x6c4a31, 0.86, 0.0], dirt: [0x564438, 1, 0],
      rock: [0x55585a, 0.94, 0], fabric: [0x394149, 0.9, 0], armor: [0x293038, 0.58, 0.42],
      weaponMetal: [0x262b31, 0.42, 0.7], plastic: [0x20242a, 0.68, 0.16], rubber: [0x101216, 0.92, 0], water: [0x174b68, 0.24, 0.38],
    };
  }
  get(name) {
    if (this.materials.has(name)) return this.materials.get(name);
    const [color, roughness, metalness] = this.definitions[name] || this.definitions.concrete;
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: name === 'glass' || name === 'water', opacity: name === 'glass' ? 0.45 : name === 'water' ? 0.82 : 1 });
    this.materials.set(name, material);
    return material;
  }
}
