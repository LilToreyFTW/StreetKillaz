import { CLIENT_MESSAGES, SERVER_MESSAGES, createMessage } from '../shared/Protocol.js?v=20260819';
import { NETWORK_CONFIG, resolveServerUrl } from './NetworkConfig.js';

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class NetworkClient extends EventTarget {
  constructor({ serverUrl = resolveServerUrl() } = {}) {
    super();
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.playerId = null;
    this.roomId = null;
    this.sessionToken = window.localStorage.getItem('streetkillaz.sessionToken');
    this.displayName = window.localStorage.getItem('streetkillaz.displayName') || 'StreetKilla';
    this.startingWeaponId = window.localStorage.getItem('streetkillaz.startingWeapon') || 'cdg58';
    this.latencyMs = null;
    this.serverTimeOffsetMs = 0;
    this._manualClose = false;
    this._reconnectAttempt = 0;
    this._reconnectTimer = 0;
    this._pingTimer = 0;
    this._inputTimer = 0;
    this._inputSequence = 0;
    this._inputProvider = null;
    this._connectTimeout = 0;
    this._pendingInputs = new Map();
  }

  connect({ displayName = this.displayName, serverUrl = this.serverUrl } = {}) {
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
    this.displayName = String(displayName || 'StreetKilla').trim().slice(0, 24) || 'StreetKilla';
    this.serverUrl = serverUrl;
    window.localStorage.setItem('streetkillaz.displayName', this.displayName);
    window.localStorage.setItem('streetkillaz.serverUrl', this.serverUrl);
    this._manualClose = false;
    this._emit('status', { status: 'connecting', serverUrl: this.serverUrl });

    try {
      this.socket = new WebSocket(this.serverUrl);
    } catch (error) {
      this._emit('error', { message: error.message, error });
      this._scheduleReconnect();
      return;
    }

    window.clearTimeout(this._connectTimeout);
    this._connectTimeout = window.setTimeout(() => {
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        this._emit('error', { message: 'Connection timed out. Port 7076 may be blocked by the VPS firewall.' });
        this.socket.close();
      }
    }, 8000);

    this.socket.addEventListener('open', () => this._onOpen());
    this.socket.addEventListener('message', (event) => this._onMessage(event.data));
    this.socket.addEventListener('close', (event) => this._onClose(event));
    this.socket.addEventListener('error', () => {
      this._emit('status', { status: 'error', serverUrl: this.serverUrl });
      this._emit('error', { message: `Could not connect to ${this.serverUrl}. Check port 7076 and firewall rules.` });
    });
  }

  disconnect() {
    this._manualClose = true;
    window.clearTimeout(this._reconnectTimer);
    window.clearTimeout(this._connectTimeout);
    window.clearInterval(this._pingTimer);
    window.clearInterval(this._inputTimer);
    this.socket?.close(1000, 'Client disconnected');
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
  }

  setInputProvider(provider) {
    this._inputProvider = provider;
    window.clearInterval(this._inputTimer);
    this._inputTimer = window.setInterval(() => {
      if (!this.authenticated || !this.roomId || !this._inputProvider) return;
      const input = this._inputProvider();
      if (!input) return;
      const sequence = ++this._inputSequence;
      const payload = { ...input, sequence, clientTime: Date.now() };
      this._pendingInputs.set(sequence, payload);
      this.send(CLIENT_MESSAGES.PLAYER_INPUT, payload);
    }, 1000 / NETWORK_CONFIG.inputRateHz);
  }

  requestRoomList() {
    return this.send(CLIENT_MESSAGES.ROOM_LIST);
  }

  createRoom({ mode, name, maxPlayers, mapId, squadSize }) {
    return this.send(CLIENT_MESSAGES.ROOM_CREATE, { mode, name, maxPlayers, mapId, squadSize, startingWeaponId: this.startingWeaponId });
  }

  joinRoom(roomId) {
    return this.send(CLIENT_MESSAGES.ROOM_JOIN, { roomId });
  }

  leaveRoom() {
    return this.send(CLIENT_MESSAGES.ROOM_LEAVE, { roomId: this.roomId });
  }

  startRoom() {
    return this.send(CLIENT_MESSAGES.ROOM_START, { roomId: this.roomId });
  }

  fire({ weaponId, direction, clientTime = Date.now() }) {
    return this.send(CLIENT_MESSAGES.PLAYER_FIRE, { weaponId, direction, clientTime });
  }

  reload(weaponId) {
    return this.send(CLIENT_MESSAGES.PLAYER_RELOAD, { weaponId });
  }
  melee() { return this.send(CLIENT_MESSAGES.PLAYER_MELEE); }
  grenade() { return this.send(CLIENT_MESSAGES.PLAYER_GRENADE); }
  pickupLoot(lootId) { return this.send(CLIENT_MESSAGES.LOOT_PICKUP, { lootId }); }

  requestRespawn() {
    return this.send(CLIENT_MESSAGES.PLAYER_RESPAWN, {});
  }

  requestPrestige() {
    return this.send(CLIENT_MESSAGES.PRESTIGE_REQUEST, {});
  }

  acknowledgeInput(sequence) {
    const confirmed = Number(sequence) || 0;
    for (const pending of this._pendingInputs.keys()) if (pending <= confirmed) this._pendingInputs.delete(pending);
  }

  send(type, data = {}, requestId = undefined) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(createMessage(type, data, requestId)));
    return true;
  }

  get estimatedServerTime() {
    return Date.now() + this.serverTimeOffsetMs;
  }

  _onOpen() {
    window.clearTimeout(this._connectTimeout);
    this.connected = true;
    this._reconnectAttempt = 0;
    this._emit('status', { status: 'connected', serverUrl: this.serverUrl });
    this.send(CLIENT_MESSAGES.AUTH, {
      displayName: this.displayName,
      operatorId: 'streetkilla',
      startingWeaponId: this.startingWeaponId,
      sessionToken: this.sessionToken,
    });
  }

  _onMessage(raw) {
    const message = safeJsonParse(raw);
    if (!message?.type) return;
    const data = message.data ?? {};

    if (message.type === SERVER_MESSAGES.WELCOME) {
      this.authenticated = true;
      this.playerId = data.playerId;
      this.sessionToken = data.sessionToken;
      if (this.sessionToken) window.localStorage.setItem('streetkillaz.sessionToken', this.sessionToken);
      this._startPing();
      this.requestRoomList();
      this._emit('welcome', data);
      this._emit('status', { status: 'authenticated', serverUrl: this.serverUrl, playerId: this.playerId });
      return;
    }

    if (message.type === SERVER_MESSAGES.PONG) {
      const now = Date.now();
      const sentAt = Number(data.clientTime || now);
      this.latencyMs = Math.max(0, now - sentAt);
      const estimatedOneWay = this.latencyMs / 2;
      this.serverTimeOffsetMs = Number(data.serverTime || now) + estimatedOneWay - now;
      this._emit('latency', { latencyMs: this.latencyMs, serverTimeOffsetMs: this.serverTimeOffsetMs });
      return;
    }

    if (message.type === SERVER_MESSAGES.ROOM_JOINED) this.roomId = data.room?.id ?? data.roomId;
    if (message.type === SERVER_MESSAGES.ROOM_LEFT) this.roomId = null;

    this._emit(message.type, data);
    this._emit('message', { type: message.type, data, message });
  }

  _onClose(event) {
    window.clearTimeout(this._connectTimeout);
    this.connected = false;
    this.authenticated = false;
    this.roomId = null;
    window.clearInterval(this._pingTimer);
    this._emit('status', { status: 'disconnected', code: event.code, reason: event.reason });
    if (!this._manualClose) this._scheduleReconnect();
  }

  _scheduleReconnect() {
    window.clearTimeout(this._reconnectTimer);
    const delay = Math.min(
      NETWORK_CONFIG.reconnectMaximumDelayMs,
      NETWORK_CONFIG.reconnectBaseDelayMs * Math.pow(2, this._reconnectAttempt++),
    );
    this._emit('status', { status: 'reconnecting', delay });
    this._reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  _startPing() {
    window.clearInterval(this._pingTimer);
    const ping = () => this.send(CLIENT_MESSAGES.PING, { clientTime: Date.now() });
    ping();
    this._pingTimer = window.setInterval(ping, NETWORK_CONFIG.pingIntervalMs);
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
