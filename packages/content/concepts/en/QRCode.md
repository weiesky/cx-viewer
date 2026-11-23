# Mobile QR Code Access

## How It Works

CX Viewer starts an HTTP server on your machine and generates a **local network address** (e.g., `http://192.168.1.100:7008`). Scan the QR code with your phone to access the viewer from your mobile device over the same WiFi network.

## Why Can't I Connect?

Common reasons:

1. **Not on the same network** — Your phone and computer must be connected to the same WiFi (same router / same network name)
2. **Firewall blocking** — macOS/Windows firewall may block incoming connections; allow CX Viewer's port
3. **Corporate/school network isolation** — Some enterprise networks isolate device-to-device communication (AP isolation)
4. **VPN interference** — A VPN on either device may disrupt the network path

## Security Notice

> CX Viewer binds to the LAN, but remote requests must present the generated URL token or use an enabled password-protected session.

- Be cautious when using on **public WiFi** (cafes, airports) — others on the same network could potentially access your service
- The QR URL contains a random **access token** unless secure password login is available and the share UI explicitly removes it
- Password login is offered only over a secure transport. On plain HTTP, keep the token in the URL or enable HTTPS through the configured server/plugin path
- Password sessions have a server-enforced 30-day lifetime; logout revokes the current session, and changing/disabling protection revokes all sessions
- Local browser and terminal WebSocket requests are origin-checked; a third-party web page is not treated as an administrator merely because it connects to `127.0.0.1`
- Recommended for use on trusted home or office networks

## Beyond the LAN

If you need remote access to CX Viewer from a different network (e.g., when traveling):

- **Tunneling tools** — frp, ngrok, Tailscale, etc. to expose local services to the internet
- **CX Viewer plugins** — Configure a proxy middleware via the plugin system for cross-network access (see plugin docs)
