import { MATCH_STATES, SERVER_MESSAGES } from '../shared/Protocol.js';
import { GAME_MODES, getActivePartyMode } from '../shared/MatchContent.js';
import { WEAPONS, DEFAULT_LOADOUT } from '../weapons/WeaponData.js';

export class MultiplayerUI {
  constructor(network, hud, { onOfflinePlay, onRoomModeChanged, onEnterMatch, onStartingWeaponChanged } = {}) {
    this.network = network;
    this.hud = hud;
    this.onOfflinePlay = onOfflinePlay || (() => {});
    this.onRoomModeChanged = onRoomModeChanged || (() => {});
    this.onEnterMatch = onEnterMatch || (() => {});
    this.onStartingWeaponChanged = onStartingWeaponChanged || (() => {});
    this.rooms = [];
    this.currentRoom = null;
    this._bindElements();
    this._bindEvents();
    this.renderRooms();
    this._populateModeSelect();
    this._populateStartingWeapons();
  }

  _bindElements() {
    this.serverUrl = document.getElementById('server-url');
    this.playerName = document.getElementById('player-name');
    this.startingWeapon = document.getElementById('starting-weapon');
    this.mode = document.getElementById('room-mode');
    this.connectButton = document.getElementById('connect-server');
    this.createButton = document.getElementById('create-room');
    this.refreshButton = document.getElementById('refresh-rooms');
    this.leaveButton = document.getElementById('leave-room');
    this.startButton = document.getElementById('start-room');
    this.offlineButton = document.getElementById('play-offline');
    this.enterMatchButton = document.getElementById('enter-online-match');
    this.roomList = document.getElementById('room-list');
    this.lobbyPanel = document.getElementById('current-lobby');
    this.lobbyTitle = document.getElementById('lobby-title');
    this.lobbyPlayers = document.getElementById('lobby-players');
    this.connectionText = document.getElementById('connection-text');
    this.connectionDetail = document.getElementById('connection-detail');
    this.serverUrl.value = this.network.serverUrl;
    this.playerName.value = this.network.displayName;
  }

  _bindEvents() {
    this.connectButton.addEventListener('click', () => {
      if (this.network.connected) this.network.disconnect();
      else this.network.connect({ displayName: this.playerName.value, serverUrl: this.serverUrl.value.trim() });
    });
    this.createButton.addEventListener('click', () => {
      const selected = GAME_MODES.find((mode) => mode.id === this.mode.value) || GAME_MODES[0];
      this.network.createRoom({
        mode: this.mode.value,
        mapId: selected.id === 'thunderstrike' ? 'thunderstrike' : undefined,
        name: `${this.playerName.value.trim() || 'StreetKilla'}'s ${selected.name} Lobby`,
        maxPlayers: selected.teamSize === 1 ? 12 : selected.teamSize * 2 || 12,
      });
    });
    this.refreshButton.addEventListener('click', () => this.network.requestRoomList());
    this.leaveButton.addEventListener('click', () => this.network.leaveRoom());
    this.startButton.addEventListener('click', () => this.network.startRoom());
    this.offlineButton.addEventListener('click', () => this.onOfflinePlay());
    this.enterMatchButton.addEventListener('click', () => this.onEnterMatch());
    this.startingWeapon.addEventListener('change', () => {
      window.localStorage.setItem('streetkillaz.startingWeapon', this.startingWeapon.value);
      this.onStartingWeaponChanged(this.startingWeapon.value);
    });

    this.network.addEventListener('status', (event) => this.setConnectionStatus(event.detail));
    this.network.addEventListener('error', (event) => {
      const message = event.detail?.message || 'Could not reach the dedicated server.';
      if (this.connectionDetail) this.connectionDetail.textContent = message;
      this.hud.toast(message, 'error');
    });
    this.network.addEventListener('latency', (event) => this.hud.setNetworkStatus('ONLINE', event.detail.latencyMs));
    this.network.addEventListener(SERVER_MESSAGES.ROOM_LIST, (event) => {
      this.rooms = event.detail.rooms ?? [];
      this.renderRooms();
    });
    this.network.addEventListener(SERVER_MESSAGES.ROOM_JOINED, (event) => {
      this.currentRoom = event.detail.room;
      this.renderLobby();
      this.onRoomModeChanged(this.currentRoom?.mode, this.currentRoom?.state, this.currentRoom?.mapId);
      this.hud.toast(`Joined ${this.currentRoom?.name || 'lobby'}`, 'network');
    });
    this.network.addEventListener(SERVER_MESSAGES.ROOM_STATE, (event) => {
      this.currentRoom = event.detail.room;
      this.renderLobby();
      this.onRoomModeChanged(this.currentRoom?.mode, this.currentRoom?.state, this.currentRoom?.mapId);
    });
    this.network.addEventListener(SERVER_MESSAGES.ROOM_LEFT, () => {
      this.currentRoom = null;
      this.renderLobby();
      this.onRoomModeChanged(null, null);
    });
    this.network.addEventListener(SERVER_MESSAGES.MATCH_STARTED, (event) => {
      if (event.detail.room) this.currentRoom = event.detail.room;
      this.renderLobby();
      this.onRoomModeChanged(this.currentRoom?.mode, MATCH_STATES.IN_PROGRESS, this.currentRoom?.mapId);
      this.hud.toast('MATCH STARTED', 'match');
    });
    this.network.addEventListener(SERVER_MESSAGES.MATCH_ENDED, (event) => {
      this.hud.toast(`MATCH ENDED${event.detail.winnerName ? ` • ${event.detail.winnerName} WINS` : ''}`, 'match');
      this.onRoomModeChanged(this.currentRoom?.mode, MATCH_STATES.ENDED);
    });
    this.network.addEventListener(SERVER_MESSAGES.SERVER_NOTICE, (event) => this.hud.toast(event.detail.message, 'network'));
    this.network.addEventListener(SERVER_MESSAGES.ERROR, (event) => this.hud.toast(event.detail.message || 'Server error', 'error'));
  }

  _populateStartingWeapons() {
    if (!this.startingWeapon) return;
    const ids = DEFAULT_LOADOUT.filter((id) => WEAPONS[id]);
    this.startingWeapon.innerHTML = ids.map((id) => `<option value="${id}">${WEAPONS[id].name} — ${WEAPONS[id].class}</option>`).join('');
    const saved = window.localStorage.getItem('streetkillaz.startingWeapon');
    this.startingWeapon.value = ids.includes(saved) ? saved : ids[0];
    window.localStorage.setItem('streetkillaz.startingWeapon', this.startingWeapon.value);
  }

  _populateModeSelect() {
    if (!this.mode) return;
    const activeParty = getActivePartyMode();
    const permanent = GAME_MODES.filter((mode) => mode.category === 'primary');
    this.mode.innerHTML = `<optgroup label="PRIMARY MODES">${permanent.map((mode) => `<option value="${mode.id}">${mode.name}</option>`).join('')}</optgroup><optgroup label="FEATURED PARTY MODE"><option value="${activeParty.id}">${activeParty.name} — 3-day window</option><option value="gun-game">Gun Game — always available</option></optgroup><optgroup label="BATTLE ROYALE"><option value="thunderstrike">THUNDERSTRIKE — Solo / Duos / Trios / Quads</option></optgroup>`;
  }

  autoConnect() {
    if (!this.network.connected) {
      window.setTimeout(() => {
        this.network.connect({
          displayName: this.playerName.value,
          serverUrl: this.serverUrl.value.trim(),
        });
      }, 250);
    }
  }

  setConnectionStatus({ status, delay, code, reason, serverUrl }) {
    const labels = {
      connecting: 'CONNECTING…',
      connected: 'AUTHENTICATING…',
      authenticated: 'ONLINE',
      disconnected: 'OFFLINE',
      reconnecting: `RECONNECTING IN ${Math.ceil((delay || 0) / 1000)}s`,
      error: 'CONNECTION ERROR',
    };
    this.connectionText.textContent = labels[status] || status.toUpperCase();
    this.connectButton.textContent = ['connecting', 'connected', 'authenticated'].includes(status) ? 'DISCONNECT' : 'CONNECT';
    const ready = status === 'authenticated';
    this.createButton.disabled = !ready;
    this.refreshButton.disabled = !ready;
    this.hud.setNetworkStatus(ready ? 'ONLINE' : 'OFFLINE', this.network.latencyMs);

    if (this.connectionDetail) {
      if (status === 'authenticated') {
        this.connectionDetail.textContent = `${serverUrl || this.network.serverUrl} • Player ${this.network.playerId || ''}`;
      } else if (status === 'connecting' || status === 'connected') {
        this.connectionDetail.textContent = serverUrl || this.network.serverUrl;
      } else if (status === 'reconnecting') {
        this.connectionDetail.textContent = `Retrying ${this.network.serverUrl}`;
      } else if (status === 'disconnected') {
        const suffix = code === 1006
          ? 'Public port 7076 is unreachable or blocked.'
          : (reason || `Connection closed${code ? ` (${code})` : ''}.`);
        this.connectionDetail.textContent = suffix;
      } else if (status === 'error') {
        this.connectionDetail.textContent = 'Connection failed. Check Windows Firewall and the VPS provider firewall.';
      }
    }
  }

  renderRooms() {
    if (!this.roomList) return;
    this.roomList.innerHTML = this.rooms.length
      ? this.rooms.map((room) => `
        <button class="room-row" data-room-id="${room.id}" ${room.state !== MATCH_STATES.LOBBY || room.playerCount >= room.maxPlayers ? 'disabled' : ''}>
          <span><strong>${this._escape(room.name)}</strong><small>${room.mode.toUpperCase()} • ${room.state}</small></span>
          <b>${room.playerCount}/${room.maxPlayers}</b>
        </button>`).join('')
      : '<div class="empty-state">No public rooms yet. Create the first lobby.</div>';
    this.roomList.querySelectorAll('[data-room-id]').forEach((button) => {
      button.addEventListener('click', () => this.network.joinRoom(button.dataset.roomId));
    });
  }

  renderLobby() {
    if (!this.currentRoom) {
      this.lobbyPanel.hidden = true;
      return;
    }
    this.lobbyPanel.hidden = false;
    this.lobbyTitle.textContent = `${this.currentRoom.name} • ${this.currentRoom.state}`;
    this.lobbyPlayers.innerHTML = (this.currentRoom.players ?? []).map((player) => `
      <div class="lobby-player"><span>${this._escape(player.displayName)}</span><b>${player.id === this.currentRoom.hostId ? 'HOST' : ''}</b></div>`).join('');
    const isHost = this.currentRoom.hostId === this.network.playerId;
    this.startButton.hidden = !isHost || this.currentRoom.state !== MATCH_STATES.LOBBY;
    this.enterMatchButton.hidden = this.currentRoom.state !== MATCH_STATES.IN_PROGRESS;
    this.leaveButton.hidden = false;
  }

  _escape(value) {
    return String(value || '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }
}
