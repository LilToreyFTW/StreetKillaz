# StreetKillaz game modes and rotation

The canonical mode catalogue lives in `src/shared/MatchContent.js` so the browser and dedicated server can consume the same IDs and rules.

## Permanent primary playlist

Team Deathmatch, Domination, Hardpoint, Kill Confirmed, Search & Destroy, Free for All, Overload, Kill Order, Control, Gunfight (2v2), Skirmish (20v20 with vehicles and wingsuits), Face Off, and Face Off Moshpit.

Every permanent mode can select every multiplayer map. `selectRotatingMap()` provides deterministic rotation rather than choosing a random map independently on every client.

## Party playlist

Prop Hunt, Sharp Shooter, One in the Chamber, Sticks and Stones, Cranked, Knife Fight, Gauntlet Rush, Infected, Safeguard, Snipers Only, and Gun Game are limited-time entries. One party entry is featured for a three-day window within a rolling 28-day cycle. `getAvailableModes()` exposes permanent modes plus only the currently featured party mode.

Gun Game is free-for-all, awards one weapon step per kill, and ends at 30 points.

## Thunderstrike

Thunderstrike is the battle-royale playlist. It supports solo, duos, trios, and quads and uses a condensed large arena assembled from the multiplayer district language. The current fallback map is procedural and playable; future GLB district assets can replace each district without changing matchmaking IDs.
