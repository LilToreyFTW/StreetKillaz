import * as THREE from 'three';

/**
 * Recoil / spray controller. This is the single biggest "feels like CS2"
 * lever: every shot kicks the view, the kick recovers over time, and the
 * pattern is per-weapon so guns feel distinct. The player counteracts it by
 * pulling the mouse down (classic recoil-control skill).
 *
 * It does NOT own the camera — the FirstPersonController reads `pitchKick`
 * and `yawKick` each frame and applies them on top of the player's aim.
 */

// Per-weapon recoil signature — tuned to echo specific CS2 archetypes while
// staying Street Killaz's own guns. All values are radians / per-shot unless
// noted. Read like this:
//   vRecoil   : base vertical kick per shot (the "climb")
//   hRecoil   : base horizontal kick magnitude (sign comes from `pattern`)
//   recover   : how fast the kick settles per second (higher = snappier)
//   grow      : how aggressively the climb ramps while you hold (spray ramp)
//   spreadAdd : extra hipfire spread at full spray (radians)
//   pattern   : signed horizontal sequence — this is the "signature" zig-zag
//               that makes each gun feel different and learnable.
export const RECOIL = {
  // Pistol  ~ USP-S: tiny, almost no spray, easy to keep on target.
  pistol:  { vRecoil: 0.018, hRecoil: 0.010, recover: 9,  grow: 0.15, spreadAdd: 0.002, pattern: [1, -1, 1, -1, 1] },
  // SMG     ~ MP9: fast, snappy, tight-ish but walks upward if you hold.
  smg:     { vRecoil: 0.015, hRecoil: 0.012, recover: 8,  grow: 0.8,  spreadAdd: 0.028, pattern: [1, 1, -1, 1, -1, 1, -1] },
  // Rifle  ~ AK-47: the classic hard right-climbing spray you must pull left+down.
  rifle:   { vRecoil: 0.026, hRecoil: 0.018, recover: 5.5, grow: 1.0, spreadAdd: 0.05, pattern: [1, 1, 1, -1, 1, 1, -1, 1, -1] },
  // Shotgun ~ no spray, just a hard single kick (pellets do the spread).
  shotgun: { vRecoil: 0.058, hRecoil: 0.028, recover: 5,  grow: 0.1,  spreadAdd: 0.006, pattern: [1, -1] },
  // Sniper ~ one brutal kick, no spray (bolt/slug). Recovers slowly.
  sniper:  { vRecoil: 0.085, hRecoil: 0.022, recover: 4,  grow: 0.0,  spreadAdd: 0.0,   pattern: [1] },
};

export class RecoilSystem {
  constructor() {
    this.pitchKick = 0;
    this.yawKick = 0;
    this._shotIndex = 0;     // shots since trigger pulled (resets on release)
    this._firing = false;
    this._grow = 1;          // current spray-growth multiplier
    this._profile = RECOIL.rifle;
    this._extraSpread = 0;
  }

  setWeapon(weaponId, profile = null) {
    // Prefer an explicit profile (passed from WeaponData), else fall back to the
    // built-in signature table. This lets each gun carry its own recoil feel.
    this._profile = profile || RECOIL[weaponId] || RECOIL.rifle;
    this.reset();
  }

  reset() {
    this.pitchKick = 0;
    this.yawKick = 0;
    this._shotIndex = 0;
    this._firing = false;
    this._grow = 1;
    this._extraSpread = 0;
  }

  /** Call when a shot is fired. */
  onShot() {
    const p = this._profile;
    // Vertical kick grows slightly as the spray goes on.
    const vKick = p.vRecoil * (1 + (this._shotIndex * 0.06));
    // Horizontal bias from the pattern, plus a little randomness.
    const dir = p.pattern[this._shotIndex % p.pattern.length] || 1;
    const hKick = (p.hRecoil * dir) + (Math.random() - 0.5) * p.hRecoil * 0.6;

    this.pitchKick += vKick;
    this.yawKick += hKick;

    // Spray growth ramps the vertical climb and extra spread while holding.
    this._grow = Math.min(1, this._grow + 0.12 * p.grow);
    this._extraSpread = p.spreadAdd * this._grow;
    this._shotIndex++;
    this._firing = true;
  }

  /** Call when the trigger is released / mag empty. */
  onRelease() {
    this._firing = false;
    this._shotIndex = 0;
    this._grow = 1;
  }

  /** Per-frame recover toward zero. */
  update(dt) {
    const p = this._profile;
    // Recover faster once the trigger is released.
    const rate = p.recover * (this._firing ? 0.55 : 1.4) * dt;
    const k = 1 - Math.exp(-rate);
    this.pitchKick -= this.pitchKick * k;
    this.yawKick -= this.yawKick * k;
    if (Math.abs(this.pitchKick) < 1e-4) this.pitchKick = 0;
    if (Math.abs(this.yawKick) < 1e-4) this.yawKick = 0;
    // Spread relaxes back when not actively spraying.
    if (!this._firing) this._extraSpread = Math.max(0, this._extraSpread - p.spreadAdd * dt * 2);
  }

  /** Extra aim spread (radians) to feed into the raycast. */
  get spread() { return this._extraSpread; }
}
