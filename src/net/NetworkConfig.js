// Set VITE_SERVER_URL in Vercel to override this endpoint if the server moves.
// The TLS endpoint is reverse-proxied by the VPS Caddy instance to port 7076.
const VITE_SERVER_URL = import.meta.env?.VITE_SERVER_URL;
const LOCAL_SERVER = 'ws://147.189.172.104:7076';
const DEPLOYED_SERVER = 'wss://streetkillaz.147-189-172-104.sslip.io';
const DEFAULT_SERVER = VITE_SERVER_URL || (window.location.protocol === 'https:' ? DEPLOYED_SERVER : LOCAL_SERVER);

export function resolveServerUrl() {
  const query = new URLSearchParams(window.location.search).get('server');
  const stored = window.localStorage.getItem('streetkillaz.serverUrl');
  // A deployment-provided secure endpoint wins over a legacy browser setting.
  // This prevents an old ws:// IP saved locally from breaking a Vercel build.
  const configured = query || VITE_SERVER_URL || stored || DEFAULT_SERVER;

  if (window.location.protocol === 'https:' && configured.startsWith('ws://')) {
    return configured.replace(/^ws:/, 'wss:');
  }
  return configured;
}

export const NETWORK_CONFIG = Object.freeze({
  defaultServerUrl: DEFAULT_SERVER,
  inputRateHz: 30,
  interpolationDelayMs: 100,
  reconnectBaseDelayMs: 750,
  reconnectMaximumDelayMs: 10000,
  pingIntervalMs: 5000,
});
