import * as THREE from 'three';
import { PerformanceProfiler } from './PerformanceProfiler.js?v=20260823';

/**
 * Engine owns the renderer, scene, camera and the main loop.
 * Every gameplay system registers an updater(dt) instead of running its own loop,
 * so we always have one authoritative clock (important later for multiplayer sync).
 */
export class Engine {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0f1a);
    this.scene.fog = new THREE.Fog(0x0c0f1a, 25, 160);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.profiler = new PerformanceProfiler(this.renderer);
    this._updaters = [];

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Register a per-frame callback: fn(deltaSeconds) */
  addUpdater(fn) {
    this._updaters.push(fn);
    return () => this.removeUpdater(fn);
  }

  removeUpdater(fn) {
    const i = this._updaters.indexOf(fn);
    if (i !== -1) this._updaters.splice(i, 1);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      try {
        const dt = Math.min(this.clock.getDelta(), 0.05); // clamp to avoid huge steps on tab-out
        for (const fn of this._updaters) fn(dt);
        this.renderer.render(this.scene, this.camera);
        this.profiler.tick();
      } catch (err) {
        // Surface the real error instead of letting setAnimationLoop swallow it.
        window.__loopErr = (window.__loopErr || []).concat([(err && err.stack) || String(err)]).slice(-5);
      }
    });
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }
}
