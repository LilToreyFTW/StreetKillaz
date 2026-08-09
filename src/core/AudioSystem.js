/**
 * Procedural weapon/feedback audio via the Web Audio API. No asset files —
 * every sound is synthesized (noise bursts + oscillators + envelopes), so it
 * works offline and "upgrades" only if you later drop in real samples.
 *
 * The context is created lazily and resumed on the first user gesture (the
 * start click / Enter), which browsers require for autoplay policies.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noise = null;
    this.enabled = true;
  }

  /** Call once from a user gesture (start screen) to unlock audio. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
    // Pre-bake a 1s white-noise buffer for gunshot/impact bodies.
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
  }

  _now() { return this.ctx.currentTime; }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    return src;
  }

  /**
   * Synthesized gunshot. `profile` shapes it per weapon so guns feel distinct.
   *   bass   : low-end thump amount (0..1)
   *   snap   : high crack amount (0..1)
   *   length : tail seconds
   */
  shoot({ bass = 0.6, snap = 0.7, length = 0.18 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();

    // Body: filtered noise burst.
    const n = this._noiseSource();
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(2200, t);
    nf.frequency.exponentialRampToValueAtTime(420, t + length);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.9 * (0.5 + bass * 0.5), t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + length);
    n.connect(nf).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + length);

    // Crack: short high noise ping.
    const c = this._noiseSource();
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 3500;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.5 * snap, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    c.connect(cf).connect(cg).connect(this.master);
    c.start(t);
    c.stop(t + 0.06);

    // Sub thump for bigger guns.
    if (bass > 0.4) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.5 * bass, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(og).connect(this.master);
      o.start(t);
      o.stop(t + 0.15);
    }
  }

  /** Dry mechanical click for reload steps. */
  click({ freq = 1800, gain = 0.25 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.05);
  }

  /**
   * Hitmarker "ping". `kill` makes it brighter/two-tone (CoD kill-confirm cue).
   */
  hitmarker(kill = false) {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();
    const freqs = kill ? [1320, 1760] : [880];
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      const start = t + i * 0.05;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.3, start + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      o.connect(g).connect(this.master);
      o.start(start);
      o.stop(start + 0.1);
    });
  }

  /** Soft fleshy thud when a bullet connects with a zombie/body. */
  bodyHit() {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();
    const n = this._noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 320;
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(f).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.09);
  }

  /** Muted impact when a shot hits world geometry. */
  worldHit() {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();
    const n = this._noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(f).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.06);
  }

  /** Hollow "dry fire" when trying to shoot empty. */
  dryFire() {
    if (!this.enabled || !this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 220;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.04);
  }
}
