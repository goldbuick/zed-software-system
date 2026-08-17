/**
 * Copy PeerJS browser bundle from the monorepo root lockfile into ui/vendor/.
 * Cafe bundles the same package via Vite; keep helper script tag in sync.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { MQ_ROOT } from './lib/paths'

type PEERJS_PACKAGE = {
  version?: string
}

const mqroot = MQ_ROOT
const reporoot = path.join(mqroot, '../..')
const peerpkg = path.join(reporoot, 'node_modules', 'peerjs', 'package.json')
const peersrc = path.join(
  reporoot,
  'node_modules',
  'peerjs',
  'dist',
  'peerjs.min.js',
)
const vendordir = path.join(mqroot, 'ui', 'vendor')
const peerdest = path.join(vendordir, 'peerjs.min.js')
const versiondest = path.join(vendordir, 'peerjs.version')

function main() {
  if (!existsSync(peerpkg)) {
    console.error(
      'missing root node_modules/peerjs -- run yarn install at repo root first',
    )
    process.exit(1)
  }
  if (!existsSync(peersrc)) {
    console.error(`missing ${peersrc}`)
    process.exit(1)
  }
  const pkg = JSON.parse(readFileSync(peerpkg, 'utf8')) as PEERJS_PACKAGE
  const version = pkg.version
  if (!version) {
    console.error('peerjs package.json has no version field')
    process.exit(1)
  }
  mkdirSync(vendordir, { recursive: true })
  copyFileSync(peersrc, peerdest)
  writeFileSync(versiondest, `${version}\n`, 'utf8')
  console.log(`peerjs ${version} -> ui/vendor/peerjs.min.js`)
}

main()
