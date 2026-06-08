---
name: Vite HMR on Replit
description: How to configure Vite HMR so the WebSocket works through the Replit reverse proxy.
---

# Vite HMR on Replit

## The Rule
Set `server.hmr` in `vite.config.ts` using `REPLIT_DEV_DOMAIN` so the browser connects the WebSocket through the Replit proxy, not directly to the dev server port.

```ts
server: {
  hmr: process.env.REPLIT_DEV_DOMAIN
    ? {
        protocol: "wss",
        host: process.env.REPLIT_DEV_DOMAIN,
        clientPort: 443,
      }
    : true,
}
```

**Why:** Vite's HMR uses a WebSocket for live updates. By default the browser tries to open a WebSocket to the dev server's raw port (e.g. 23693), which the Replit proxy does not forward. The user sees `[vite] failed to connect to websocket` and the preview pane may show a blank screen because the Vite client gets stuck in a "connecting" state. Pointing `host` + `clientPort` at the Replit dev domain forces the browser to use the same proxy path as regular HTTP, which works.

**How to apply:** Any new Vite artifact in this workspace should include this `hmr` block. The `REPLIT_DEV_DOMAIN` env var is always set in the Replit container; the fallback `true` handles local-only environments.

## Also fix: logo file permissions
The `remove_image_background_tool` saves files as `rw-------` (600). Always `chmod 644` the output file immediately after background removal, or the web server can't serve it.
