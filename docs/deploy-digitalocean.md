# Run the ZSS Docker image on DigitalOcean

This walkthrough runs the published image [`ellium12/zed-software-system`](https://hub.docker.com/r/ellium12/zed-software-system) on a **Droplet** with **host networking** (no Docker `-p` port mapping). Data lives in a Docker volume mounted at `/data`, matching `ZSS_DATA_DIR` in the image.

## Prerequisites

- DigitalOcean account.
- SSH key [added to your account](https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys-to-droplets/).

## 1. Create a Droplet

- **Image:** Ubuntu 22.04 or 24.04 LTS.
- **Plan:** Basic, smallest size is often enough to start (increase if Playwright/Chromium runs out of memory).
- **Datacenter:** Region of your choice.
- **Authentication:** SSH keys.
- **Hostname:** e.g. `zss-droplet`.

Create the Droplet and note its **public IPv4** address.

## 2. Firewall (recommended)

In the DigitalOcean control panel: **Networking** → **Firewalls** (or attach during Droplet creation):

| Type   | Protocol | Port range | Sources   |
|--------|----------|------------|-----------|
| SSH    | TCP      | 22         | Your IP   |
| Custom | TCP      | 4175       | All IPv4/IPv6 or restricted set |

Apply the firewall to your Droplet.

## 3. Install Docker

SSH in:

```bash
ssh root@DROPLET_IP
```

Install Docker Engine from Docker’s Ubuntu repo ([official install guide](https://docs.docker.com/engine/install/ubuntu/)):

```bash
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If you use a non-root user with `sudo`, add them to the `docker` group and re-login.

## 4. Run the container

```bash
docker pull ellium12/zed-software-system:latest

docker run -d --name zss --restart unless-stopped \
  --network host \
  -v zss-data:/data \
  -e ZSS_SERVER_PORT=4175 \
  -e ZSS_DATA_DIR=/data \
  ellium12/zed-software-system:latest
```

Open **`http://DROPLET_IP:4175`** in a browser.

If a container named `zss` already exists: `docker rm -f zss` before `docker run`.

### Script helper

From the repo, after Docker is on the Droplet:

- **On the Droplet:** `DO_RUN_LOCAL=1 yarn do:droplet:docker-run`
- **From your laptop:** `DO_DROPLET_HOST=DROPLET_IP DO_DROPLET_SSH_KEY=/path/to/key yarn do:droplet:docker-run`

The shared implementation is [`scripts/vm-zss-docker-run.sh`](../scripts/vm-zss-docker-run.sh) (also `yarn vm:docker-run`).

**Why `--network host`:** On Linux, the app binds directly to the host port; you do not need `-p 4175:4175`. The cloud firewall must still allow **4175**.

## 5. HTTPS (production)

Use a **Load Balancer** with a certificate, **Spaces** + CDN, or a reverse proxy (Caddy, nginx) with Let’s Encrypt in front of the app. Plain HTTP on 4175 is fine for quick tests.

## 6. Backups

- **Automated backups:** Enable [weekly Droplet backups](https://docs.digitalocean.com/products/droplets/how-to/enable-backups/) (paid add-on) for whole-disk recovery points.
- **Snapshots:** Take [on-demand snapshots](https://docs.digitalocean.com/products/snapshots/) before upgrades or risky changes.

Backups and snapshots are billed per [current pricing](https://www.digitalocean.com/pricing).

## 7. WebRTC and PeerJS (operational note)

The app’s **PeerJS signaling** targets **`terminal.zed.cafe` on port 443**, not your Droplet. You typically do not open large UDP ranges on the Droplet for that. Serve the app over **HTTPS** in production for a proper browser **secure context**.

## Local build alternative

From the repo: `yarn docker:build` produces `zss:local`. Push to a registry DigitalOcean can pull from, or `docker save` / `docker load` on the Droplet, then use that image name in `docker run`.
