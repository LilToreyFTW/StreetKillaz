# StreetKillaz Progression System

## Rank format

```text
Prestige X | Level Y
```

The standard level cap is 55. Players at Level 55 may enter Prestige, returning to Level 1. The maximum Prestige is 15.

## XP curve

XP required to advance from the current level is calculated by:

```text
roundTo50(550 + 125 × (level - 1) + 18 × (level - 1)^1.9)
```

This keeps early ranks quick while creating a smooth late-rank grind.

## XP sources

| Action | Base XP |
|---|---:|
| Player kill | 100 |
| Assist | 30–80 |
| Headshot | +50 |
| First blood | +100 |
| Longshot | +25 |
| Revenge | +35 |
| Comeback | +50 |
| Objective kill | +50 |
| Objective capture | 250 |
| Objective defense | 125 |
| Plant | 200 |
| Defuse | 300 |
| Match win | 750 |
| Match loss completion | 200 |
| Zombie kill | 25 |
| Elite Zombie kill | 125 |
| Zombies round survived | 100 + round × 20 |
| Daily challenge | 1,800–3,000 |
| Weekly challenge | 10,000–15,000 |

Supported multipliers include event, playlist, perk, party and permanent Prestige bonuses. Combined XP is capped at 5×.

## Prestige

Each Prestige grants:

- Unique emblem
- Permanent +1% XP per Prestige rank
- Exclusive weapon, blueprint, camo, operator or calling-card reward
- Preserved cosmetics and Prestige rewards
- Preserved weapon mastery
- Preserved challenge state

At Prestige 15 the permanent XP bonus is +15%.

## Persistence

Offline progression is stored under:

```text
localStorage key: streetkillaz.progression.v2
```

Online progression is authoritative on the dedicated server and persisted in:

```text
VPS_CONNECTION_HOST/data/progression.json
```

The browser stores the latest server snapshot locally as a cache, but the server remains the source of truth during online matches.

## Main files

```text
src/progression/ProgressionRules.js
src/progression/ProgressionRepository.js
src/progression/ProgressionService.js
src/progression/ChallengeService.js
src/ui/ProgressionUI.js
```

## Testing

1. Run the browser game through an HTTP server.
2. Enter the offline arena.
3. Kill target dummies and verify the XP bar advances.
4. Press `G` to start a local Zombies wave.
5. Press `P` to open progression, challenges, mastery and history.
6. Reload the browser and verify progress remains.
7. For rapid Prestige testing, use the browser console only in development to inspect `StreetKillaz.getState()`; do not expose progression mutation methods in a production client.
8. Connect to the dedicated server and verify server XP replaces client-side awarding.
