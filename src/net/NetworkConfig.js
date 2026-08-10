// Set VITE_SERVER_URL in Vercel to a TLS-terminated endpoint such as
// wss://ws.your-domain.com. The raw VPS IP only supports ws:// for local HTTP.
const VITE_SERVER_URL = import.meta.env?.VITE_SERVER_URL;
const DEFAULT_SERVER = VITE_SERVER_URL || 'ws://147.189.172.104:7076';

export function resolveServerUrl() {
  const query = new URLSearchParams(window.location.search).get('server');
  const stored = window.localStorage.getItem('streetkillaz.serverUrl');
  const configured = query || stored || DEFAULT_SERVER;

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
