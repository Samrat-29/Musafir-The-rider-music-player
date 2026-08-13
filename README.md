# Musafir — The Rider

## Development

Run `npm run dev`. It starts Vite and the anonymous WebSocket presence service together. Vite proxies `/presence` to that service locally, so the browser always connects through the same origin.

## Live visitor counter deployment

Run `node server/presence.mjs` alongside the deployed site and route WebSocket traffic from `/presence` to it. The counter needs a persistent WebSocket process; static hosting alone cannot provide real-time visitor presence.

If the WebSocket endpoint is hosted separately, set `VITE_PRESENCE_WS_URL` at build time, for example:

```text
VITE_PRESENCE_WS_URL=wss://presence.example.com/presence
```

The service stores only a random per-browser-session ID in memory. Clients send a heartbeat every 25 seconds; sessions that disappear without a close event expire after 65 seconds.
