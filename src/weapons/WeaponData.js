/**
 * Street Killaz — full weapon catalog (32 named guns across 7 classes).
 *
 * Each gun is its OWN identity: distinct stats, a per-gun recoil signature
 * (the "feel"), a synthesized audio profile, and a procedural MESH SPEC so the
 * first-person viewmodel renders a different silhouette per gun (barrel length,
 * magazine type, stock, bullpup layout, caliber). No external model files are
 * required — `AssetLoader.buildGunMesh()` turns the spec into geometry — but the
 * moment a real GLB is dropped at /gun-assets/<id>/model.glb the game upgrades
 * automatically (see AssetLoader.loadModel fallback).
 *
 * Inspirations are noted for flavor; stats are tuned for feel, not realism.
 *
 * Field reference per weapon:
 *   class     'AR' | 'BR' | 'SMG' | 'SNIPER' | 'DMR' | 'LMG' | 'PISTOL'
 *   damage    per-shot damage
 *   fireRate  shots/second (semi guns fire one per click; auto holds)
 *   auto      hold-to-fire? (false = one shot per click)
 *   magSize / reserveMax
 *   reloadTime seconds
 *   range     metres the ray is valid
 *   spread    base hipfire cone (radians); ADS tightens it
 *   pellets   >1 only for shotguns-style (none here, kept for compat)
 *   recoil    { vRecoil, hRecoil, recover, grow, spreadAdd, pattern[] }
 *             vRecoil/hRecoil radians per shot; recover = settle speed;
 *             grow = spray ramp while holding; spreadAdd = extra hip spread at
 *             full spray; pattern = signed horizontal zig-zag (the signature).
 *   audio     { bass, snap, length } shaping the synthesized gunshot
 *   mesh      procedural silhouette spec (see AssetLoader.buildGunMesh)
 */
export const WEAPON_CLASSES = {
  AR: 'Assault Rifle',
  BR: 'Battle Rifle',
  SMG: 'SMG',
  SNIPER: 'Sniper Rifle',
  DMR: 'DMR',
  LMG: 'Light Machine Gun',
  PISTOL: 'Pistol',
};

export const WEAPONS = {
  // ===================== ASSAULT RIFLES =====================
  cdg58: {
    id: 'cdg58', name: 'CDG-58', class: 'AR', inspiredBy: 'FAMAS (bullpup)',
    damage: 24, fireRate: 11, auto: true, magSize: 25, reserveMax: 100, reloadTime: 1.9,
    range: 70, spread: 0.012, pellets: 1,
    recoil: { vRecoil: 0.018, hRecoil: 0.011, recover: 8.5, grow: 0.5, spreadAdd: 0.03, pattern: [1, -1, 1, -1, 1] },
    audio: { bass: 0.5, snap: 0.8, length: 0.12 },
    mesh: { body: 0.5, barrel: 0.22, mag: 'curved', stock: 'none', bullpup: true, grip: 'angled', caliber: 0.05, tint: 0x33373f },
  },
  holger: {
    id: 'holger', name: 'Holger', class: 'AR', inspiredBy: 'HK G36C',
    damage: 25, fireRate: 9.5, auto: true, magSize: 30, reserveMax: 120, reloadTime: 2.0,
    range: 75, spread: 0.011, pellets: 1,
    recoil: { vRecoil: 0.02, hRecoil: 0.013, recover: 7.5, grow: 0.8, spreadAdd: 0.035, pattern: [1, 1, -1, 1, -1, 1] },
    audio: { bass: 0.55, snap: 0.78, length: 0.14 },
    mesh: { body: 0.56, barrel: 0.26, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.05, tint: 0x2f3338 },
  },
  anvilb: {
    id: 'anvilb', name: 'Anvil-B', class: 'AR', inspiredBy: 'SCAR-H style',
    damage: 27, fireRate: 9, auto: true, magSize: 30, reserveMax: 120, reloadTime: 2.1,
    range: 80, spread: 0.01, pellets: 1,
    recoil: { vRecoil: 0.022, hRecoil: 0.014, recover: 6.5, grow: 0.9, spreadAdd: 0.04, pattern: [1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.6, snap: 0.76, length: 0.15 },
    mesh: { body: 0.58, barrel: 0.24, mag: 'stanag', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.055, tint: 0x3a3f33 },
  },
  mcw: {
    id: 'mcw', name: 'MCW', class: 'AR', inspiredBy: 'ACR',
    damage: 23, fireRate: 12, auto: true, magSize: 30, reserveMax: 120, reloadTime: 1.9,
    range: 70, spread: 0.009, pellets: 1,
    recoil: { vRecoil: 0.015, hRecoil: 0.009, recover: 9, grow: 0.7, spreadAdd: 0.028, pattern: [1, 1, -1, 1, -1] },
    audio: { bass: 0.5, snap: 0.85, length: 0.11 },
    mesh: { body: 0.54, barrel: 0.23, mag: 'stanag', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.05, tint: 0x2b2b2b },
  },
  ak556: {
    id: 'ak556', name: 'AK-556', class: 'AR', inspiredBy: 'AK-102',
    damage: 26, fireRate: 10, auto: true, magSize: 30, reserveMax: 120, reloadTime: 2.0,
    range: 80, spread: 0.013, pellets: 1,
    recoil: { vRecoil: 0.024, hRecoil: 0.018, recover: 6, grow: 1.0, spreadAdd: 0.045, pattern: [1, 1, 1, -1, 1, 1, -1, 1, -1] }, // the AK right-climb
    audio: { bass: 0.65, snap: 0.72, length: 0.16 },
    mesh: { body: 0.56, barrel: 0.25, mag: 'curved', stock: 'fixed', bullpup: false, grip: 'angled', caliber: 0.055, tint: 0x4a3a2a },
  },
  mtz556: {
    id: 'mtz556', name: 'MTZ-556', class: 'AR', inspiredBy: 'CZ Bren 2',
    damage: 25, fireRate: 10.5, auto: true, magSize: 30, reserveMax: 120, reloadTime: 1.95,
    range: 76, spread: 0.011, pellets: 1,
    recoil: { vRecoil: 0.019, hRecoil: 0.012, recover: 7.8, grow: 0.85, spreadAdd: 0.034, pattern: [1, -1, 1, -1, 1, 1] },
    audio: { bass: 0.55, snap: 0.8, length: 0.13 },
    mesh: { body: 0.55, barrel: 0.24, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.05, tint: 0x33373f },
  },

  // ===================== BATTLE RIFLES =====================
  mtz762: {
    id: 'mtz762', name: 'MTZ-762', class: 'BR', inspiredBy: 'CZ Bren 2 BR (7.62)',
    damage: 34, fireRate: 7, auto: true, magSize: 25, reserveMax: 90, reloadTime: 2.3,
    range: 90, spread: 0.014, pellets: 1,
    recoil: { vRecoil: 0.03, hRecoil: 0.02, recover: 5.5, grow: 0.95, spreadAdd: 0.05, pattern: [1, 1, -1, 1, 1, -1, 1] },
    audio: { bass: 0.75, snap: 0.7, length: 0.2 },
    mesh: { body: 0.6, barrel: 0.26, mag: 'curved', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.065, tint: 0x3a3f33 },
  },
  xm5: {
    id: 'xm5', name: 'XM5', class: 'BR', inspiredBy: 'SIG MCX Spear (6.8)',
    damage: 38, fireRate: 6.5, auto: true, magSize: 20, reserveMax: 80, reloadTime: 2.5,
    range: 95, spread: 0.015, pellets: 1,
    recoil: { vRecoil: 0.036, hRecoil: 0.022, recover: 5, grow: 1.0, spreadAdd: 0.055, pattern: [1, 1, 1, -1, 1, 1, -1, 1] },
    audio: { bass: 0.85, snap: 0.68, length: 0.22 },
    mesh: { body: 0.62, barrel: 0.28, mag: 'stanag', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.07, tint: 0x2f3338 },
  },
  bushmaster_acr: {
    id: 'bushmaster_acr', name: 'Bushmaster ACR', class: 'BR', inspiredBy: 'Magpul ACR',
    damage: 33, fireRate: 7.5, auto: true, magSize: 25, reserveMax: 90, reloadTime: 2.2,
    range: 88, spread: 0.013, pellets: 1,
    recoil: { vRecoil: 0.028, hRecoil: 0.018, recover: 6, grow: 0.9, spreadAdd: 0.046, pattern: [1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.72, snap: 0.72, length: 0.19 },
    mesh: { body: 0.58, barrel: 0.25, mag: 'stanag', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.065, tint: 0x3a3a3a },
  },
  basb: {
    id: 'basb', name: 'BAS B', class: 'BR', inspiredBy: 'SIG MCX Spear (short)',
    damage: 36, fireRate: 7, auto: true, magSize: 20, reserveMax: 80, reloadTime: 2.4,
    range: 92, spread: 0.014, pellets: 1,
    recoil: { vRecoil: 0.033, hRecoil: 0.02, recover: 5.2, grow: 0.98, spreadAdd: 0.052, pattern: [1, 1, -1, 1, 1, -1, 1, 1] },
    audio: { bass: 0.8, snap: 0.7, length: 0.21 },
    mesh: { body: 0.56, barrel: 0.22, mag: 'stanag', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.07, tint: 0x33373f },
  },

  // ===================== SMGs =====================
  striker45: {
    id: 'striker45', name: 'Striker 45', class: 'SMG', inspiredBy: 'UMP-45',
    damage: 28, fireRate: 9, auto: true, magSize: 25, reserveMax: 100, reloadTime: 2.0,
    range: 40, spread: 0.02, pellets: 1,
    recoil: { vRecoil: 0.02, hRecoil: 0.014, recover: 7, grow: 0.7, spreadAdd: 0.032, pattern: [1, -1, 1, -1, 1] },
    audio: { bass: 0.7, snap: 0.7, length: 0.13 },
    mesh: { body: 0.42, barrel: 0.16, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.06, tint: 0x2b2b2b },
  },
  wsp9: {
    id: 'wsp9', name: 'WSP-9', class: 'SMG', inspiredBy: 'Uzi',
    damage: 19, fireRate: 15, auto: true, magSize: 32, reserveMax: 128, reloadTime: 1.8,
    range: 32, spread: 0.026, pellets: 1,
    recoil: { vRecoil: 0.013, hRecoil: 0.01, recover: 9, grow: 0.85, spreadAdd: 0.036, pattern: [1, 1, -1, 1, -1, 1, -1] },
    audio: { bass: 0.45, snap: 0.9, length: 0.09 },
    mesh: { body: 0.34, barrel: 0.12, mag: 'short', stock: 'none', bullpup: false, grip: 'none', caliber: 0.045, tint: 0x33373f },
  },
  lach9: {
    id: 'lach9', name: 'Lach-9', class: 'SMG', inspiredBy: 'MP5',
    damage: 21, fireRate: 12, auto: true, magSize: 30, reserveMax: 120, reloadTime: 1.7,
    range: 36, spread: 0.018, pellets: 1,
    recoil: { vRecoil: 0.014, hRecoil: 0.009, recover: 9, grow: 0.8, spreadAdd: 0.03, pattern: [1, -1, 1, -1, 1, -1] },
    audio: { bass: 0.5, snap: 0.88, length: 0.1 },
    mesh: { body: 0.4, barrel: 0.15, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.045, tint: 0x2f3338 },
  },
  rival9: {
    id: 'rival9', name: 'Rival-9', class: 'SMG', inspiredBy: 'Scorpion Evo',
    damage: 20, fireRate: 14, auto: true, magSize: 30, reserveMax: 120, reloadTime: 1.7,
    range: 34, spread: 0.022, pellets: 1,
    recoil: { vRecoil: 0.013, hRecoil: 0.011, recover: 9, grow: 0.85, spreadAdd: 0.034, pattern: [1, 1, -1, 1, -1, 1] },
    audio: { bass: 0.48, snap: 0.9, length: 0.09 },
    mesh: { body: 0.42, barrel: 0.16, mag: 'curved', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.045, tint: 0x3a3f33 },
  },
  sar9: {
    id: 'sar9', name: 'SAR-9', class: 'SMG', inspiredBy: 'SAR 109T',
    damage: 22, fireRate: 13, auto: true, magSize: 30, reserveMax: 120, reloadTime: 1.75,
    range: 35, spread: 0.021, pellets: 1,
    recoil: { vRecoil: 0.014, hRecoil: 0.01, recover: 8.5, grow: 0.82, spreadAdd: 0.033, pattern: [1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.5, snap: 0.88, length: 0.1 },
    mesh: { body: 0.4, barrel: 0.15, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.045, tint: 0x3a3a3a },
  },

  // ===================== SNIPER RIFLES =====================
  kvb73: {
    id: 'kvb73', name: 'KVB-73', class: 'SNIPER', inspiredBy: 'AS Val / SV-style',
    damage: 78, fireRate: 1.6, auto: false, magSize: 10, reserveMax: 30, reloadTime: 2.6,
    range: 180, spread: 0.002, pellets: 1,
    recoil: { vRecoil: 0.07, hRecoil: 0.02, recover: 4.5, grow: 0.0, spreadAdd: 0.0, pattern: [1] },
    audio: { bass: 0.95, snap: 0.85, length: 0.3 },
    mesh: { body: 0.66, barrel: 0.34, mag: 'curved', stock: 'fixed', bullpup: false, grip: 'angled', caliber: 0.075, tint: 0x2b2b2b },
  },
  amr50: {
    id: 'amr50', name: 'AMR-50', class: 'SNIPER', inspiredBy: '.50 anti-material',
    damage: 130, fireRate: 0.9, auto: false, magSize: 5, reserveMax: 20, reloadTime: 3.0,
    range: 250, spread: 0.001, pellets: 1,
    recoil: { vRecoil: 0.11, hRecoil: 0.03, recover: 3.5, grow: 0.0, spreadAdd: 0.0, pattern: [1] },
    audio: { bass: 1.0, snap: 0.95, length: 0.4 },
    mesh: { body: 0.74, barrel: 0.42, mag: 'short', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.1, tint: 0x33373f },
  },
  kvs_terminus: {
    id: 'kvs_terminus', name: 'KVS Terminus', class: 'SNIPER', inspiredBy: 'RSASS',
    damage: 85, fireRate: 2.2, auto: false, magSize: 10, reserveMax: 30, reloadTime: 2.7,
    range: 200, spread: 0.0018, pellets: 1,
    recoil: { vRecoil: 0.075, hRecoil: 0.022, recover: 4.2, grow: 0.0, spreadAdd: 0.0, pattern: [1] },
    audio: { bass: 0.95, snap: 0.86, length: 0.32 },
    mesh: { body: 0.7, barrel: 0.38, mag: 'curved', stock: 'fixed', bullpup: false, grip: 'angled', caliber: 0.078, tint: 0x2f3338 },
  },
  cdelta: {
    id: 'cdelta', name: 'CDelta', class: 'SNIPER', inspiredBy: 'bolt .338 (fictional)',
    damage: 95, fireRate: 1.1, auto: false, magSize: 5, reserveMax: 20, reloadTime: 3.1,
    range: 230, spread: 0.0012, pellets: 1,
    recoil: { vRecoil: 0.09, hRecoil: 0.025, recover: 3.8, grow: 0.0, spreadAdd: 0.0, pattern: [1] },
    audio: { bass: 1.0, snap: 0.9, length: 0.36 },
    mesh: { body: 0.72, barrel: 0.4, mag: 'short', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.088, tint: 0x3a3f33 },
  },

  // ===================== DMRs =====================
  cz_bren_dmr: {
    id: 'cz_bren_dmr', name: 'CZ Bren DMR', class: 'DMR', inspiredBy: 'Bren 805 DMR',
    damage: 55, fireRate: 4.5, auto: false, magSize: 20, reserveMax: 70, reloadTime: 2.3,
    range: 130, spread: 0.004, pellets: 1,
    recoil: { vRecoil: 0.04, hRecoil: 0.016, recover: 5.5, grow: 0.2, spreadAdd: 0.01, pattern: [1, -1, 1] },
    audio: { bass: 0.8, snap: 0.78, length: 0.22 },
    mesh: { body: 0.6, barrel: 0.3, mag: 'curved', stock: 'folding', bullpup: false, grip: 'angled', caliber: 0.065, tint: 0x3a3f33 },
  },
  sl8: {
    id: 'sl8', name: 'SL8', class: 'DMR', inspiredBy: 'HK SL8 (G36)',
    damage: 52, fireRate: 4.8, auto: false, magSize: 20, reserveMax: 70, reloadTime: 2.2,
    range: 125, spread: 0.004, pellets: 1,
    recoil: { vRecoil: 0.038, hRecoil: 0.014, recover: 6, grow: 0.2, spreadAdd: 0.009, pattern: [1, -1, 1] },
    audio: { bass: 0.78, snap: 0.8, length: 0.21 },
    mesh: { body: 0.58, barrel: 0.28, mag: 'curved', stock: 'fixed', bullpup: false, grip: 'angled', caliber: 0.06, tint: 0x2f3338 },
  },
  acr_dmr: {
    id: 'acr_dmr', name: 'ACR DMR', class: 'DMR', inspiredBy: 'ACR marksman',
    damage: 54, fireRate: 4.6, auto: false, magSize: 20, reserveMax: 70, reloadTime: 2.25,
    range: 128, spread: 0.0038, pellets: 1,
    recoil: { vRecoil: 0.036, hRecoil: 0.013, recover: 6.2, grow: 0.2, spreadAdd: 0.009, pattern: [1, -1, 1, -1] },
    audio: { bass: 0.78, snap: 0.82, length: 0.2 },
    mesh: { body: 0.58, barrel: 0.27, mag: 'stanag', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.06, tint: 0x2b2b2b },
  },
  svk: {
    id: 'svk', name: 'SVK', class: 'DMR', inspiredBy: 'SV-98 / 7.62 DMR',
    damage: 58, fireRate: 4.2, auto: false, magSize: 15, reserveMax: 60, reloadTime: 2.4,
    range: 135, spread: 0.0035, pellets: 1,
    recoil: { vRecoil: 0.044, hRecoil: 0.018, recover: 5.2, grow: 0.2, spreadAdd: 0.011, pattern: [1, -1, 1] },
    audio: { bass: 0.82, snap: 0.8, length: 0.23 },
    mesh: { body: 0.62, barrel: 0.32, mag: 'curved', stock: 'fixed', bullpup: false, grip: 'angled', caliber: 0.068, tint: 0x4a3a2a },
  },

  // ===================== LMGs =====================
  qbz95_lsw: {
    id: 'qbz95_lsw', name: 'QBZ-95 LSW', class: 'LMG', inspiredBy: 'QJB-95 LSW (bullpup)',
    damage: 28, fireRate: 10, auto: true, magSize: 75, reserveMax: 150, reloadTime: 3.4,
    range: 85, spread: 0.018, pellets: 1,
    recoil: { vRecoil: 0.022, hRecoil: 0.016, recover: 6.5, grow: 1.0, spreadAdd: 0.05, pattern: [1, 1, -1, 1, -1, 1, -1, 1] },
    audio: { bass: 0.7, snap: 0.78, length: 0.14 },
    mesh: { body: 0.66, barrel: 0.3, mag: 'drum', stock: 'none', bullpup: true, grip: 'vertical', caliber: 0.055, tint: 0x33373f },
  },
  mg36: {
    id: 'mg36', name: 'MG 36', class: 'LMG', inspiredBy: 'HK MG36',
    damage: 29, fireRate: 11, auto: true, magSize: 100, reserveMax: 200, reloadTime: 3.6,
    range: 90, spread: 0.017, pellets: 1,
    recoil: { vRecoil: 0.024, hRecoil: 0.017, recover: 6.2, grow: 1.0, spreadAdd: 0.052, pattern: [1, 1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.72, snap: 0.76, length: 0.15 },
    mesh: { body: 0.62, barrel: 0.32, mag: 'drum', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.055, tint: 0x2f3338 },
  },
  pkm: {
    id: 'pkm', name: 'PKM', class: 'LMG', inspiredBy: 'PKM 7.62 belt',
    damage: 34, fireRate: 10, auto: true, magSize: 100, reserveMax: 200, reloadTime: 3.8,
    range: 95, spread: 0.02, pellets: 1,
    recoil: { vRecoil: 0.03, hRecoil: 0.02, recover: 5.5, grow: 1.0, spreadAdd: 0.055, pattern: [1, 1, 1, -1, 1, 1, -1, 1] },
    audio: { bass: 0.85, snap: 0.72, length: 0.19 },
    mesh: { body: 0.7, barrel: 0.38, mag: 'box', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.07, tint: 0x3a3a3a },
  },
  fn_evolys: {
    id: 'fn_evolys', name: 'FN EVOLYS', class: 'LMG', inspiredBy: 'FN EVOLYS',
    damage: 27, fireRate: 12, auto: true, magSize: 100, reserveMax: 200, reloadTime: 3.5,
    range: 88, spread: 0.016, pellets: 1,
    recoil: { vRecoil: 0.021, hRecoil: 0.015, recover: 6.8, grow: 1.0, spreadAdd: 0.05, pattern: [1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.68, snap: 0.8, length: 0.14 },
    mesh: { body: 0.64, barrel: 0.34, mag: 'box', stock: 'folding', bullpup: false, grip: 'vertical', caliber: 0.055, tint: 0x2b2b2b },
  },
  pkp: {
    id: 'pkp', name: 'PKP', class: 'LMG', inspiredBy: 'PKP Pecheneg',
    damage: 35, fireRate: 10, auto: true, magSize: 100, reserveMax: 200, reloadTime: 3.9,
    range: 96, spread: 0.021, pellets: 1,
    recoil: { vRecoil: 0.032, hRecoil: 0.021, recover: 5.3, grow: 1.0, spreadAdd: 0.056, pattern: [1, 1, 1, -1, 1, 1, -1, 1, -1] },
    audio: { bass: 0.88, snap: 0.72, length: 0.2 },
    mesh: { body: 0.72, barrel: 0.4, mag: 'box', stock: 'fixed', bullpup: false, grip: 'vertical', caliber: 0.07, tint: 0x4a3a2a },
  },

  // ===================== PISTOLS =====================
  glock21: {
    id: 'glock21', name: 'Glock 21', class: 'PISTOL', inspiredBy: 'Glock 21 (.45)',
    damage: 30, fireRate: 7, auto: false, magSize: 13, reserveMax: 52, reloadTime: 1.3,
    range: 35, spread: 0.016, pellets: 1,
    recoil: { vRecoil: 0.022, hRecoil: 0.012, recover: 9, grow: 0.2, spreadAdd: 0.004, pattern: [1, -1, 1, -1] },
    audio: { bass: 0.4, snap: 0.75, length: 0.12 },
    mesh: { body: 0.26, barrel: 0.1, mag: 'pistol', stock: 'none', bullpup: false, grip: 'none', caliber: 0.05, tint: 0x222222 },
  },
  rhs12: {
    id: 'rhs12', name: 'RHs 12', class: 'PISTOL', inspiredBy: 'Rhino .357 revolver',
    damage: 52, fireRate: 3.5, auto: false, magSize: 6, reserveMax: 30, reloadTime: 1.8,
    range: 40, spread: 0.012, pellets: 1,
    recoil: { vRecoil: 0.04, hRecoil: 0.018, recover: 7, grow: 0.0, spreadAdd: 0.0, pattern: [1] },
    audio: { bass: 0.6, snap: 0.85, length: 0.16 },
    mesh: { body: 0.28, barrel: 0.08, mag: 'pistol', stock: 'none', bullpup: false, grip: 'none', caliber: 0.06, tint: 0x2b2b2b },
  },
  micro_uzi: {
    id: 'micro_uzi', name: 'Micro Uzi', class: 'PISTOL', inspiredBy: 'Micro Uzi',
    damage: 18, fireRate: 14, auto: true, magSize: 20, reserveMax: 80, reloadTime: 1.4,
    range: 28, spread: 0.03, pellets: 1,
    recoil: { vRecoil: 0.016, hRecoil: 0.012, recover: 9, grow: 0.8, spreadAdd: 0.03, pattern: [1, 1, -1, 1, -1] },
    audio: { bass: 0.4, snap: 0.92, length: 0.08 },
    mesh: { body: 0.22, barrel: 0.08, mag: 'pistol', stock: 'none', bullpup: false, grip: 'none', caliber: 0.04, tint: 0x33373f },
  },
  m93_raffica: {
    id: 'm93_raffica', name: 'M93 Raffica', class: 'PISTOL', inspiredBy: 'Beretta 93R (burst)',
    damage: 24, fireRate: 10, auto: false, magSize: 15, reserveMax: 60, reloadTime: 1.4,
    range: 32, spread: 0.018, pellets: 1,
    recoil: { vRecoil: 0.02, hRecoil: 0.013, recover: 8.5, grow: 0.4, spreadAdd: 0.006, pattern: [1, -1, 1] },
    audio: { bass: 0.42, snap: 0.85, length: 0.1 },
    mesh: { body: 0.26, barrel: 0.1, mag: 'pistol', stock: 'none', bullpup: false, grip: 'none', caliber: 0.045, tint: 0x2f3338 },
  },
};

/** Default 1-5 quick-select loadout: one representative per class. */
export const DEFAULT_LOADOUT = ['cdg58', 'mtz762', 'lach9', 'kvb73', 'glock21'];

/**
 * Canonical data-driven runtime contract. Legacy catalog keys remain supported
 * so adding a new original weapon never requires changes to WeaponSystem.
 */
export function getWeaponDefinition(id) {
  const weapon = WEAPONS[id];
  if (!weapon) return null;
  const sniper = weapon.class === 'SNIPER';
  return {
    ...weapon,
    weaponClass: weapon.class,
    headshotMultiplier: weapon.headshotMultiplier ?? 1.6,
    magazineSize: weapon.magSize,
    reserveAmmo: weapon.reserveMax,
    ADSZoom: weapon.ADSZoom ?? (sniper ? 3.4 : 1.25),
    projectileSpeed: weapon.projectileSpeed ?? 0,
    hitscan: weapon.hitscan ?? true,
    automatic: weapon.auto,
    burstCount: weapon.burstCount ?? 0,
    pelletCount: weapon.pellets ?? 1,
    movementPenalty: weapon.movementPenalty ?? (sniper ? 0.18 : 0),
    equipTime: weapon.equipTime ?? 0.28,
  };
}

export const RARITY_TIERS = [
  { id: 'common', label: 'Common', color: 0x9aa0a6, weight: 50, statMult: 1.0 },
  { id: 'uncommon', label: 'Uncommon', color: 0x3ecf5e, weight: 28, statMult: 1.12 },
  { id: 'rare', label: 'Rare', color: 0x3b82ff, weight: 14, statMult: 1.28 },
  { id: 'epic', label: 'Epic', color: 0xa53bff, weight: 6, statMult: 1.5 },
  { id: 'legendary', label: 'Legendary', color: 0xffb020, weight: 2, statMult: 1.85 },
];
