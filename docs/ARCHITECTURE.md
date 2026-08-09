# StreetKillaz Architecture

## Overview

StreetKillaz now supports two execution modes:

1. **Offline prototype mode** — the browser owns target dummies, local Zombies, damage and localStorage progression.
2. **Online authoritative mode** — the Node.js dedicated server owns movement, damage, ammo, kills, Zombie AI, matches and progression.

The browser retains prediction and visual feedback, but server snapshots always win during an online match.

## Browser module map

```text
src/
  core/
    Engine.js
    InputManager.js
    AssetLoader.js
  player/
    FirstPersonController.js
    PlayerStats.js
  weapons/
    WeaponData.js
    WeaponSystem.js
  progression/
    ProgressionRules.js
    ProgressionRepository.js
    ProgressionService.js
    ChallengeService.js
  net/
    NetworkConfig.js
    NetworkClient.js
    RemoteEntityManager.js
  shared/
    Protocol.js
  systems/
    PerkSystem.js
    LootSystem.js
    ZombieSystem.js
    ProgressionSystem.js    legacy adapter
    PrestigeSystem.js       legacy adapter
  ui/
    HUD.js
    ProgressionUI.js
    MultiplayerUI.js
  world/
    TestArena.js
    MapLoader.js
  main.js
```

## Dedicated server module map

```text
VPS_CONNECTION_HOST/
  server/
    index.js
    GameServer.js
    auth/SessionManager.js
    game/RoomManager.js
    game/GameRoom.js
    game/NavigationGrid.js
    persistence/ProgressionStore.js
    progression/ProgressionEngine.js
  shared/
    Protocol.js
    GameConstants.js
    ProgressionRules.js
  config/default.js
  data/progression.json
  logs/
  ecosystem.config.cjs
  start.bat
  restart.bat
  stop.bat
```

## Online data flow

```text
InputManager
    -> NetworkClient PLAYER_INPUT (30 Hz)
    -> GameRoom authoritative movement simulation (30 Hz)
    -> SNAPSHOT broadcast (15 Hz)
    -> local reconciliation + remote interpolation

WeaponSystem fire intent
    -> GameRoom validates ammo/fire rate/direction/range
    -> server hit test with up to 250 ms position rewind
    -> damage/kill/assist event
    -> ProgressionEngine award
    -> persistent progression snapshot returned to client
```

## Match architecture

Each `GameRoom` contains isolated:

- Players
- Movement and weapon state
- Scores
- Match timer/state
- Zombie wave state
- Navigation grid
- Snapshot stream

This allows one server process to run many concurrent PVP and Zombies matches.

## Zombie navigation

The dedicated server uses a 2D A* navigation grid. The test-arena cover rectangles are marked as blocked cells. Zombies periodically rebuild a path to the nearest living player, follow waypoints and attack only at close range.

When real maps are added, load blocked cells or a generated navigation grid from map data instead of hardcoding the test-arena rectangles.

## Progression authority

Offline:

```text
localStorage -> ProgressionService
```

Online:

```text
GameRoom event -> ProgressionEngine -> ProgressionStore -> data/progression.json
```

The browser can cache a server snapshot, but it does not grant itself online XP.

## Security boundaries

The server does not accept client-provided:

- Position
- Health
- Damage
- Kills
- XP
- Ammo totals
- Match wins

The client supplies only input intent, aim orientation, fire/reload intent and room actions. The server clamps and validates each action.

## Production scaling

The included PM2 configuration uses a single process because room state is held in memory. Horizontal scaling requires a separate matchmaker, sticky routing, shared session/presence storage and a production database.
