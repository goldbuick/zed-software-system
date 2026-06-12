import { def, exec, shell, tasksonly } from '../helpers'
import type { TaskDef } from '../types'

export const DEPLOY_TASKS: TaskDef[] = [
  def('deploy:aws-ec2:docker-run', {
    description: 'Run zss on AWS EC2 via Docker',
    tags: ['deploy'],
    run: shell('sh scripts/aws-ec2-docker-run.sh'),
  }),
  def('deploy:cloudflare:brick', {
    description: 'Deploy brick worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'infra/wrangler-brick.toml']),
  }),
  def('deploy:cloudflare:bytes', {
    description: 'Deploy bytes worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'infra/wrangler-bytes.toml']),
  }),
  def('deploy:cloudflare:terminal', {
    description: 'Deploy terminal worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'infra/wrangler-terminal.toml']),
  }),
  def('deploy:cloudflare:zns', {
    description: 'Deploy zns worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'infra/wrangler-zns.toml']),
  }),
  def('deploy:docker:build:image', {
    description: 'Docker build zss:local (internal)',
    run: shell('docker build --no-cache -t zss:local .'),
  }),
  tasksonly('deploy:docker:build', 'Build linux CLI and local Docker image', [
    'cli:build:linux',
    'deploy:docker:build:image',
  ], {
    tags: ['deploy'],
  }),
  def('deploy:docker:run', {
    description: 'Run local Docker container',
    tags: ['deploy'],
    run: shell('sh scripts/docker-run.sh'),
  }),
  def('deploy:docker:shell:exec', {
    description: 'Docker run interactive shell (internal)',
    run: shell('docker run --rm -it --init zss:local ./start.sh'),
  }),
  tasksonly('deploy:docker:shell', 'Build and open shell in local Docker image', [
    'deploy:docker:build',
    'deploy:docker:shell:exec',
  ], {
    tags: ['deploy'],
  }),
  def('deploy:droplet:docker-run', {
    description: 'Run zss on DigitalOcean droplet via Docker',
    tags: ['deploy'],
    run: shell('sh scripts/digitalocean-docker-run.sh'),
  }),
  def('deploy:gcp-cloudrun:run', {
    description: 'Deploy zss to GCP Cloud Run',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-deploy-cloudrun.sh'),
  }),
  def('deploy:gcp-vm:create', {
    description: 'Create GCP VM for zss',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-vm-create.sh'),
  }),
  def('deploy:gcp-vm:docker-run', {
    description: 'Run zss Docker on GCP VM',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-vm-docker-run.sh'),
  }),
  def('deploy:gcp-vm:firewall', {
    description: 'Configure GCP VM firewall rules',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-vm-firewall.sh'),
  }),
  def('deploy:gcp:artifact-repo', {
    description: 'Create GCP artifact registry repo',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-artifact-repo.sh'),
  }),
  def('deploy:gcp:enable-apis', {
    description: 'Enable required GCP APIs',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-enable-apis.sh'),
  }),
  def('deploy:gcp:push', {
    description: 'Push zss image to GCP artifact registry',
    tags: ['deploy'],
    run: shell('sh scripts/gcp-push.sh'),
  }),
  def('deploy:vm:docker-run', {
    description: 'Run zss Docker on generic VM',
    tags: ['deploy'],
    run: shell('sh scripts/vm-zss-docker-run.sh'),
  }),
]
