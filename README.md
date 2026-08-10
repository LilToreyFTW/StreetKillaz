# StreetKillaz

## Vite + Vercel client

Install and run the browser client locally:

```powershell
npm install
npm run dev
```

Build the deployable static client:

```powershell
npm run build
```

Vercel serves the `dist` folder. The authoritative WebSocket server remains on
the VPS; configure the production client to use a secure `wss://` endpoint
before serving the game over HTTPS.

Set `VITE_SERVER_URL=wss://147.189.172.104.sslip.io` in the Vercel project
environment variables, then redeploy. A raw IP with port 7076 cannot provide a
trusted certificate for browser WebSockets; the VPS package includes a Caddy
TLS proxy using the free IP-mapped `sslip.io` hostname.

StreetKillaz is a browser-based Three.js FPS prototype with:

- Offline target arena and local Zombies testing
- Online PVP and Zombies networking client
- Level 1–55 progression
- Prestige 1–15
- Daily and weekly challenges
- Weapon mastery levels
- Persistent local progression
- Server-authoritative progression when connected online
- Upload-ready Node.js dedicated server in `VPS_CONNECTION_HOST`

## Run the browser game locally

The project must be served over HTTP. Do not double-click `index.html` directly.

From the project directory:

```bash
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080

The offline fallback now loads the procedural **Downtown Lockup** arena immediately,
including opposing spawn pads, three combat lanes, solid cover collision, a central
crashed bus landmark, and respawn handling. The original map concept is stored at
`assets/maps/downtown-lockup-concept.png` and is shown in the startup menu.
```

The multiplayer menu is preconfigured for:

```text
ws://147.189.172.104:7076

The local browser server binds to `127.0.0.1:8080`; it does not bind to the VPS
public IP. The browser connects from that local page to the VPS WebSocket above.

Original generated visual references are stored in `assets/character-assets` and
`assets/gun-assets`. The current runtime uses procedural Three.js meshes; these
images are the source references for the next rigged character and GLB weapon
asset pass.
```

## Important folders

```text
index.html                     Game shell, HUD, lobby and progression UI
src/progression                XP, levels, prestige, challenges and persistence
src/net                        WebSocket client and remote entity interpolation
src/shared                     Client/server protocol constants
VPS_CONNECTION_HOST           Upload-ready dedicated server
VPS_CONNECTION_HOST/README.md  Windows VPS installation and start.bat instructions
docs/PROGRESSION.md            Progression rules and testing
docs/MULTIPLAYER.md            Networking architecture and protocol
```

## Windows VPS launch

Upload `VPS_CONNECTION_HOST`, open TCP port `7076`, then run:

```text
VPS_CONNECTION_HOST\start.bat
```

The launcher installs dependencies and PM2, creates a secure `.env`, starts the server and verifies the health endpoint.

## Start the browser client correctly

Run `start-game.bat`. This starts StreetKillaz at `http://127.0.0.1:8080`, opens the browser, and automatically connects to the official VPS.

Do not open `index.html` directly through `file://`. Use `test-vps-connection.bat` if the menu reports that public port 7076 is unreachable. See `docs/CONNECTION_TROUBLESHOOTING.md` for the complete checklist.
