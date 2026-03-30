# Run the ZSS Docker image on AWS EC2

This walkthrough runs the published image [`ellium12/zed-software-system`](https://hub.docker.com/r/ellium12/zed-software-system) on an Ubuntu EC2 instance with **host networking** (no Docker `-p` port mapping). Data lives in a Docker volume mounted at `/data`, matching `ZSS_DATA_DIR` in the image.

## Prerequisites

- AWS account with a billing method (Free Tier may cover `t2.micro` / `t3.micro` in some regions for 12 months for new accounts; confirm [current AWS Free Tier](https://aws.amazon.com/free/)).
- An SSH key pair registered in the target region.

## 1. Security group

Create or edit a security group attached to the instance:

| Type        | Port  | Source     | Notes                          |
|------------|-------|------------|--------------------------------|
| SSH        | 22    | Your IP    | Restrict SSH to known IPs when possible |
| Custom TCP | 4175  | `0.0.0.0/0` or your users | HTTP for the ZSS static server (default `ZSS_SERVER_PORT`) |

Outbound: default (all) is typical.

## 2. Launch the instance

- **AMI:** Ubuntu 22.04 or 24.04 LTS.
- **Instance type:** e.g. `t3.micro` or `t2.micro` (adjust if Playwright/Chromium needs more RAM).
- **Storage:** Default gp3 is fine to start.
- **Key pair:** Your SSH key.
- **Security group:** From step 1.

Note the instance **public IPv4**. Optionally assign an **Elastic IP** for a stable address.

## 3. Install Docker (SSH session)

```bash
ssh -i /path/to/your-key.pem ubuntu@EC2_PUBLIC_IP
```

Install Docker Engine from Docker’s Ubuntu repo ([official install guide](https://docs.docker.com/engine/install/ubuntu/)):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and SSH back in so `docker` runs without `sudo`, or prefix `docker` with `sudo`.

## 4. Run the container

Pull and run in the background with **host network** and a **named volume** for `/data`:

```bash
docker pull ellium12/zed-software-system:latest

docker run -d --name zss --restart unless-stopped \
  --network host \
  -v zss-data:/data \
  -e ZSS_SERVER_PORT=4175 \
  -e ZSS_DATA_DIR=/data \
  ellium12/zed-software-system:latest
```

Open **`http://EC2_PUBLIC_IP:4175`** in a browser.

If a container named `zss` already exists: `docker rm -f zss` before `docker run`.

**Why `--network host`:** On Linux, the process listens on the host’s port directly, so you do not use `-p 4175:4175`. You still must allow **4175** in the security group.

## 5. HTTPS (production)

Browsers expect a **secure context** for many WebRTC-related features. For production, terminate TLS at an **Application Load Balancer** with **ACM**, or put **CloudFront** in front, or use another reverse proxy with a real certificate. Plain HTTP on 4175 is enough for quick testing.

## 6. Backups

- **EBS snapshots:** EC2 → **Volumes** → select the volume → **Actions** → **Create snapshot**. Schedule repeats as needed.
- **AWS Backup:** Use a [backup plan](https://docs.aws.amazon.com/aws-backup/latest/devguide/getting-started.html) for the instance’s EBS volumes for automated retention.

Restoring usually means creating a volume or instance from a snapshot; follow AWS docs for your recovery scenario.

## 7. WebRTC and PeerJS (operational note)

The app loads in the browser; **PeerJS signaling** in this codebase uses **`terminal.zed.cafe` on port 443**, not your EC2 host. You do not open arbitrary UDP ranges on EC2 for that path. Ensure users can reach your site over **HTTPS** in production, and keep the signaling dependency in mind for uptime.

## Local build alternative

To run an image you built yourself: `yarn docker:build` produces `zss:local`; tag and push to a registry, or `docker load` on the instance, then substitute that image name in the `docker run` command above.
