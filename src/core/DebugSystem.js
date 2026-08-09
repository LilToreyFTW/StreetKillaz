const FLAGS = Object.freeze(['DEBUG_PLAYER', 'DEBUG_WEAPONS', 'DEBUG_HITBOXES', 'DEBUG_NETWORK', 'DEBUG_SERVER', 'DEBUG_INTERPOLATION', 'DEBUG_BATTLE_ROYALE', 'DEBUG_LOOT', 'DEBUG_CHUNKS', 'DEBUG_COLLISION']);

export class DebugSystem {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.flags = Object.fromEntries(FLAGS.map((flag) => [flag, params.get('debug') === '1' || window.localStorage.getItem(`streetkillaz.${flag}`) === 'true']));
    this.overlay = document.createElement('pre');
    this.overlay.id = 'debug-overlay';
    Object.assign(this.overlay.style, { position: 'fixed', left: '10px', top: '10px', zIndex: '90', margin: '0', padding: '9px', maxWidth: '360px', color: '#9effbb', background: 'rgba(0,0,0,.74)', border: '1px solid rgba(130,255,180,.45)', font: '11px/1.35 monospace', pointerEvents: 'none', whiteSpace: 'pre-wrap' });
    this.overlay.hidden = !this.enabled;
    document.body.appendChild(this.overlay);
  }
  get enabled() { return Object.values(this.flags).some(Boolean); }
  toggle(flag) { if (!Object.hasOwn(this.flags, flag)) return; this.flags[flag] = !this.flags[flag]; window.localStorage.setItem(`streetkillaz.${flag}`, String(this.flags[flag])); this.overlay.hidden = !this.enabled; }
  update({ engine, network, controller, weapons, remoteEntities, battleRoyale } = {}) {
    if (!this.enabled) return;
    const perf = window.__streetkillazPerf || {};
    const lines = [`DEBUG • FPS ${perf.fps ?? '--'} • ${perf.drawCalls ?? '--'} calls • ${perf.triangles ?? '--'} tris`];
    if (this.flags.DEBUG_NETWORK || this.flags.DEBUG_SERVER) lines.push(`NET ping=${Math.round(network?.latencyMs ?? 0)}ms pending=${network?._pendingInputs?.size ?? 0} remote=${remoteEntities?.players?.size ?? 0}`);
    if (this.flags.DEBUG_PLAYER || this.flags.DEBUG_COLLISION) lines.push(`PLAYER ${controller?.position?.x?.toFixed(1)}, ${controller?.position?.y?.toFixed(1)}, ${controller?.position?.z?.toFixed(1)} grounded=${controller?.onGround}`);
    if (this.flags.DEBUG_WEAPONS) lines.push(`WEAPON ${weapons?.weaponId} ${weapons?.ammoInMag}/${weapons?.ammoReserve} ads=${weapons?.isAiming}`);
    if (this.flags.DEBUG_INTERPOLATION) lines.push(`INTERP buffers=${[...(remoteEntities?.players?.values() || [])].reduce((n, entity) => n + (entity.visual?.snapshotBuffer?.length || 0), 0)}`);
    if (this.flags.DEBUG_BATTLE_ROYALE && battleRoyale) lines.push(`BR ${battleRoyale.stage} phase=${battleRoyale.phase} circle=${battleRoyale.circle?.radius?.toFixed(1)} loot=${battleRoyale.loot?.length ?? 0}`);
    this.overlay.textContent = lines.join('\n');
  }
}
