# StreetKillaz Multiplayer Architecture

## Connection

```text
WebSocket: ws://147.189.172.104:7076
Health:    http://147.189.172.104:7076/health
Status:    http://147.189.172.104:7076/status
```

Use `wss://` behind a TLS reverse proxy when the game website is served over HTTPS.

## Authority model

The dedicated server owns:

- Player movement simulation
- Position bounds and movement speed
- Health and respawns
- Ammo and reload state
- Fire-rate validation
- Weapon damage and range
- Player and Zombie hit detection
- Kills, assists and score
- Match state
- Zombie waves and AI
- XP, levels, weapon mastery and Prestige

Clients send inputs and fire intent, not trusted results.

## Match states

```text
Lobby -> In-Progress -> Ended -> Lobby
```

The host creates a room and starts it after the minimum player requirement is met.

## Main client files

```text
src/net/NetworkConfig.js
src/net/NetworkClient.js
src/net/RemoteEntityManager.js
src/shared/Protocol.js
```

## Main server files

```text
VPS_CONNECTION_HOST/server/GameServer.js
VPS_CONNECTION_HOST/server/game/RoomManager.js
VPS_CONNECTION_HOST/server/game/GameRoom.js
VPS_CONNECTION_HOST/server/progression/ProgressionEngine.js
VPS_CONNECTION_HOST/server/persistence/ProgressionStore.js
VPS_CONNECTION_HOST/server/auth/SessionManager.js
```

## Networking behavior

- Server simulation: 30 Hz
- Snapshot broadcast: 15 Hz
- Client input transmission: 30 Hz
- Remote entity interpolation: smoothed on the client
- Local movement: predicted immediately and reconciled toward authoritative snapshots
- Ping: measured every five seconds
- Reconnect: exponential backoff with a 30-second room reservation

## Basic anti-cheat validation

- Client positions and damage values are ignored.
- Inputs are clamped to valid ranges.
- Movement speed is simulated on the server.
- Arena boundaries are enforced on the server.
- Fire rate is derived from server weapon definitions.
- Ammo and reload state are server-owned.
- Hit tests use server positions and server weapon range.
- Duplicate or out-of-order input sequences are discarded.
- Message payload size and per-second message rate are limited.
- Session tokens are HMAC signed.

For a public competitive release, add account authentication, TLS, database-backed sessions, moderation logs, replay review, server metrics, DDoS protection and geographically distributed match servers.
