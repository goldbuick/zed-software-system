import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../../../../../')
const PEER_PKG = path.join(REPO_ROOT, 'node_modules', 'peerjs', 'package.json')
const PEER_CANONICAL = path.join(
  REPO_ROOT,
  'node_modules',
  'peerjs',
  'dist',
  'peerjs.min.js',
)
const PEER_VENDOR = path.join(
  REPO_ROOT,
  'ops',
  'media-queue',
  'ui',
  'vendor',
  'peerjs.min.js',
)
const PEER_VERSION = path.join(
  REPO_ROOT,
  'ops',
  'media-queue',
  'ui',
  'vendor',
  'peerjs.version',
)

function filesha256(filepath: string): string {
  return createHash('sha256').update(readFileSync(filepath)).digest('hex')
}

describe('media-queue peerjs vendor', () => {
  it('matches root node_modules peerjs (run ops/media-queue fetch-peerjs on drift)', () => {
    expect(existsSync(PEER_PKG)).toBe(true)
    expect(existsSync(PEER_CANONICAL)).toBe(true)
    expect(existsSync(PEER_VENDOR)).toBe(true)
    expect(existsSync(PEER_VERSION)).toBe(true)

    const canonicalversion = JSON.parse(readFileSync(PEER_PKG, 'utf8')).version
    const vendorversion = readFileSync(PEER_VERSION, 'utf8').trim()

    expect(vendorversion).toBe(canonicalversion)
    expect(filesha256(PEER_CANONICAL)).toBe(filesha256(PEER_VENDOR))
  })
})
