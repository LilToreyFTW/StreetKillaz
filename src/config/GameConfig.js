/** Central gameplay presentation/configuration values. Keep server-authoritative
 * values mirrored in the VPS package when they affect simulation or validation. */
export const GAME_CONFIG = Object.freeze({
  operator: Object.freeze({ id: 'streetkilla', height: 1.92, eyeHeight: 1.7 }),
  camera: Object.freeze({
    fov: 75,
    adsFov: 52,
    mouseSensitivity: 0.0022,
    motionIntensity: 1,
    headBob: true,
    weaponSway: true,
  }),
  movement: Object.freeze({
    walkSpeed: 5.2,
    sprintSpeed: 8.2,
    crouchSpeed: 2.6,
    jumpSpeed: 8.5,
    gravity: -24,
  }),
  networking: Object.freeze({ snapshotRate: 15, inputRate: 30, interpolationDelayMs: 100 }),
});

export function getMotionIntensity() {
  const stored = Number(window.localStorage?.getItem('streetkillaz.motionIntensity'));
  return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : GAME_CONFIG.camera.motionIntensity;
}

const VISUAL_SETTINGS_KEY = 'streetkillaz.visualSettings';
const VISUAL_DEFAULTS = Object.freeze({ cameraShake: true, headBob: true, weaponSway: true, motionIntensity: 0.55 });

export function getVisualSettings() {
  try {
    const stored = JSON.parse(window.localStorage?.getItem(VISUAL_SETTINGS_KEY) || '{}');
    return {
      cameraShake: stored.cameraShake ?? VISUAL_DEFAULTS.cameraShake,
      headBob: stored.headBob ?? VISUAL_DEFAULTS.headBob,
      weaponSway: stored.weaponSway ?? VISUAL_DEFAULTS.weaponSway,
      motionIntensity: Math.max(0, Math.min(1, Number(stored.motionIntensity ?? VISUAL_DEFAULTS.motionIntensity))),
    };
  } catch { return { ...VISUAL_DEFAULTS }; }
}

export function saveVisualSettings(partial) {
  const next = { ...getVisualSettings(), ...partial };
  window.localStorage?.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

const INPUT_SETTINGS_KEY = 'streetkillaz.inputSettings';
export function getInputSettings() {
  try {
    const saved = JSON.parse(window.localStorage?.getItem(INPUT_SETTINGS_KEY) || '{}');
    return { mouseSensitivity: Number(saved.mouseSensitivity) || GAME_CONFIG.camera.mouseSensitivity, adsSensitivity: Number(saved.adsSensitivity) || 0.72, invertY: Boolean(saved.invertY), toggleCrouch: Boolean(saved.toggleCrouch), toggleADS: Boolean(saved.toggleADS) };
  } catch { return { mouseSensitivity: GAME_CONFIG.camera.mouseSensitivity, adsSensitivity: 0.72, invertY: false, toggleCrouch: false, toggleADS: false }; }
}
export function saveInputSettings(settings) { window.localStorage?.setItem(INPUT_SETTINGS_KEY, JSON.stringify({ ...getInputSettings(), ...settings })); }
