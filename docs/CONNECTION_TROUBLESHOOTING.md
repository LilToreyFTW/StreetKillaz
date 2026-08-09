# StreetKillaz connection troubleshooting

## Correct way to launch the game

Run `start-game.bat` from the StreetKillaz project folder. It starts a local HTTP server and opens:

```text
http://127.0.0.1:8080
```

Do not double-click `index.html`. Browsers often block JavaScript module imports when a project is loaded through `file://`.

## Official dedicated server

```text
WebSocket: ws://147.189.172.104:7076
Health:    http://147.189.172.104:7076/health

The game page itself should load from `http://127.0.0.1:8080`. The local static
server must bind to the player's local loopback address, while only the
WebSocket and health requests target the VPS public IP.

If the menu remains on `CHECKING VPS…`, close the old game browser tab and run
`start-game.bat` again. The launcher now replaces an older StreetKillaz static
server process and opens a cache-busting URL so an old JavaScript bundle cannot
remain active.
```

The game automatically attempts to connect when the main menu loads.

## Public port test

Run `test-vps-connection.bat` on the gaming computer. `TcpTestSucceeded` must be `True`.

On the VPS, run `VPS_CONNECTION_HOST/check-public-port.bat`. The listener should be `0.0.0.0:7076` or `[::]:7076`, not only `127.0.0.1:7076`.

The server launcher creates a Windows Firewall rule when it is run as Administrator. The VPS provider may also have a separate firewall or security-group dashboard where inbound TCP port 7076 must be allowed.

## HTTPS hosting

A game page served over HTTPS cannot connect to an insecure `ws://` endpoint. Production HTTPS hosting requires a TLS reverse proxy and a `wss://` address. Local `start-game.bat` hosting uses HTTP, so `ws://147.189.172.104:7076` is valid there.
