# wanix-bridge

WebSocket 9P proxy: browser Wanix tab connects outbound on `/host`; external clients import on `/`.

```bash
go build -o wanix-bridge .
./wanix-bridge --listen 0.0.0.0:7654
```

HTTPS local dev (with `yarn task app dev` running):

```bash
yarn task run wanix:bridge
# or: ./wanix-bridge --public-base https://localhost:7777
```

Prints `wss://localhost:7777/wanix-bridge-host?token=…` for tape paste (Vite proxy). Also prints direct `ws://<lan-ip>:7654/…` for LAN clients.

See [`ops/fixtures/wanix/README.md`](../../fixtures/wanix/README.md) for the full zed.cafe workflow.
