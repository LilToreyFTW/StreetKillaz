export class PerformanceProfiler {
  constructor(renderer) { this.renderer = renderer; this.lastAt = performance.now(); this.frames = 0; this.fps = 0; }
  tick() { this.frames += 1; const now = performance.now(); if (now - this.lastAt < 1000) return; this.fps = Math.round(this.frames * 1000 / (now - this.lastAt)); this.frames = 0; this.lastAt = now; window.__streetkillazPerf = { fps: this.fps, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, textures: this.renderer.info.memory.textures, geometries: this.renderer.info.memory.geometries }; }
}
