# StreetKillaz Roadmap

## Completed foundation

- Three.js render loop and FPS controller
- Offline test arena and target dummies
- Weapon fire, ammo, reload, hitmarkers and loot
- Offline Zombie waves
- Level 1–55 progression
- Prestige 1–15
- XP multipliers and action-specific rewards
- Daily and weekly challenges
- Weapon mastery
- localStorage persistence
- Progression, rewards, mastery and history UI
- WebSocket client with reconnect and latency display
- Public room creation/join/leave/start flow
- Dedicated Node.js server on port 7076
- Multiple concurrent PVP and Zombies rooms
- Authoritative movement, ammo, damage, kills and score
- Server-side hit detection and 250 ms lag compensation
- Server-side A* Zombie navigation and wave behavior
- Server-owned progression persistence
- Signed guest sessions
- PM2 deployment configuration

## Next: assets and animation

- Real first-person arms and weapon animations
- Real player and Zombie character rigs
- Operator skins and Prestige emblems
- Level-up and unlock audio assets
- Muzzle, impact and blood effects

## Next: map and collision pipeline

- Export PVP and Zombies maps as glTF
- Export spawn points and collision metadata
- Generate server navigation grids from map data
- Replace the client flat-ground clamp with capsule collision
- Add objective locations and mode rules

## Next: competitive modes

- Team Deathmatch
- Free-for-All
- Domination
- Search and Destroy
- Hardpoint
- Private room codes and party matchmaking
- Skill and latency-aware matchmaking

## Next: account and database services

- Registered accounts and secure login
- PostgreSQL progression database
- Refresh-token sessions
- Inventory/loadout APIs
- Server-side challenge schedules
- Admin moderation and ban tools
- Audit logs and match history

## Next: infrastructure

- TLS and `wss://`
- Nginx reverse proxy
- Metrics and alerting
- Redis presence/session layer
- Regional game servers
- External matchmaker
- Automated deployment and backups
- Load and soak testing
