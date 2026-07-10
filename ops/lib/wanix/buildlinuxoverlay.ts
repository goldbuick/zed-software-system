import { execFileSync } from 'node:child_process'
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs'
import path from 'node:path'

import { CAFE_PUBLIC_WANIX_DIR } from 'ops/lib/cafepublicpaths'
import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'

const LINUX_OVERLAY_DIR = path.join(WANIX_FIXTURES_DIR, 'linux')
const LINUX_OVERLAY_DOCKERFILE = path.join(LINUX_OVERLAY_DIR, 'Dockerfile')
const LINUX_OVERLAY_IMAGE = 'zedcafe-linux-overlay-build'
const LINUX_OVERLAY_CONTAINER = 'zedcafe-linux-overlay'
const LINUX_OVERLAY_FILENAME = 'zedcafe-linux-overlay.tgz'

const DOCKER_CANDIDATES = [
  process.env.DOCKER_CMD,
  '/usr/local/bin/docker',
  '/Applications/Docker.app/Contents/Resources/bin/docker',
  'docker',
].filter(
  (value): value is string => typeof value === 'string' && value.length > 0,
)

const STAGING_OVERLAY = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  LINUX_OVERLAY_FILENAME,
)
const PUBLIC_OVERLAY = path.join(CAFE_PUBLIC_WANIX_DIR, LINUX_OVERLAY_FILENAME)

function readdocker(): string {
  for (const candidate of DOCKER_CANDIDATES) {
    if (candidate === 'docker') {
      try {
        const resolved = execFileSync('command', ['-v', 'docker'], {
          encoding: 'utf8',
        }).trim()
        if (resolved) {
          return resolved
        }
      } catch {
        // try next candidate
      }
      continue
    }
    if (!existsSync(candidate)) {
      continue
    }
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    'docker not found — install Docker to build zedcafe-linux-overlay.tgz',
  )
}

function requirelinuxoverlayfixture(): void {
  if (!existsSync(LINUX_OVERLAY_DOCKERFILE)) {
    throw new Error(`missing ${LINUX_OVERLAY_DOCKERFILE}`)
  }
}

/**
 * Build zedcafe-linux-overlay.tgz (Alpine i386 jq/curl/wget + zedcafe shell tools)
 * into ops/public/wanix/ and copy to cafe/public/wanix/ for VM room binds.
 */
export function buildwanixlinuxoverlay(): void {
  const docker = readdocker()
  requirelinuxoverlayfixture()

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })
  mkdirSync(CAFE_PUBLIC_WANIX_DIR, { recursive: true })

  process.stdout.write(
    `docker build ${LINUX_OVERLAY_DIR} -> ${LINUX_OVERLAY_FILENAME}\n`,
  )
  execFileSync(
    docker,
    [
      'build',
      '--platform',
      'linux/386',
      '-t',
      LINUX_OVERLAY_IMAGE,
      '-f',
      LINUX_OVERLAY_DOCKERFILE,
      LINUX_OVERLAY_DIR,
    ],
    { stdio: 'inherit' },
  )

  execFileSync(docker, ['rm', '-f', LINUX_OVERLAY_CONTAINER], {
    stdio: 'ignore',
  })
  execFileSync(docker, [
    'create',
    '--name',
    LINUX_OVERLAY_CONTAINER,
    LINUX_OVERLAY_IMAGE,
  ])

  try {
    execFileSync(docker, [
      'cp',
      `${LINUX_OVERLAY_CONTAINER}:/${LINUX_OVERLAY_FILENAME}`,
      STAGING_OVERLAY,
    ])
  } finally {
    execFileSync(docker, ['rm', '-f', LINUX_OVERLAY_CONTAINER], {
      stdio: 'ignore',
    })
  }

  copyFileSync(STAGING_OVERLAY, PUBLIC_OVERLAY)
  process.stdout.write(
    `${LINUX_OVERLAY_FILENAME} written to ${STAGING_OVERLAY} (copied to ${PUBLIC_OVERLAY})\n`,
  )
}
