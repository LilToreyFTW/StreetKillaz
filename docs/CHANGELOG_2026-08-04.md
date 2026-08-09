# StreetKillaz Update — August 4, 2026

## Updated existing files

- `index.html`
- `src/main.js`
- `src/core/Engine.js`
- `src/core/InputManager.js`
- `src/player/FirstPersonController.js`
- `src/player/PlayerStats.js`
- `src/weapons/WeaponSystem.js`
- `src/world/TestArena.js`
- `src/systems/ProgressionSystem.js`
- `src/systems/PrestigeSystem.js`
- `src/ui/HUD.js`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`

## Added browser game files

- `README.md`
- `src/progression/ProgressionRules.js`
- `src/progression/ProgressionRepository.js`
- `src/progression/ProgressionService.js`
- `src/progression/ChallengeService.js`
- `src/net/NetworkConfig.js`
- `src/net/NetworkClient.js`
- `src/net/RemoteEntityManager.js`
- `src/shared/Protocol.js`
- `src/ui/ProgressionUI.js`
- `src/ui/MultiplayerUI.js`
- `docs/PROGRESSION.md`
- `docs/MULTIPLAYER.md`

## Added dedicated server

The complete `VPS_CONNECTION_HOST` directory was added, including:

- Node.js WebSocket server
- Signed sessions
- Room manager
- Authoritative PVP simulation
- Server-side Zombie A* pathfinding
- Lag-compensated hit detection
- Server progression engine
- Atomic JSON persistence
- Health/status routes
- PM2 deployment setup
- VPS README and environment template
- Smoke-test client

## Validation performed

- JavaScript syntax checks across browser and server modules
- Relative import resolution checks
- HTML/JavaScript DOM ID contract checks
- XP calculation test
- Level curve test
- Weapon XP test
- Prestige test
- Session signing and resume test
- A* navigation test
- Authoritative PVP hit/kill test
- Lag-compensated hit test

## Windows VPS launcher update

- Replaced the Linux shell launchers with `start.bat`, `restart.bat` and `stop.bat`.
- `start.bat` now validates Node.js 22+, generates a secure `.env`, installs dependencies and PM2, starts the server and checks port 7076 health.
- Updated VPS and architecture documentation for Windows Server deployment and Windows Firewall.
