/**
 * Unit checks for media-queue prep cache: dual slots, targeted cancel, prune.
 */
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { DownloadManager, removepartialfiles } from '../src/main/lib/download'

import { MQ_ROOT } from './lib/paths'

const root = MQ_ROOT

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

function assertdistscripts() {
  const pkg = JSON.parse(
    readFileSync(path.join(root, 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> }
  const scripts = pkg.scripts ?? {}
  assert(
    String(scripts['prepare:dist'] || '').includes('electron-vite build'),
    'prepare:dist must run electron-vite build',
  )
  for (const name of ['dist', 'dist:mac', 'dist:win']) {
    const script = scripts[name]
    assert(typeof script === 'string', `${name} script exists`)
    assert(
      script.includes('prepare:dist'),
      `${name} must run prepare:dist so out/main/index.js exists before pack`,
    )
  }
}

function main() {
  assertdistscripts()
  const work = mkdtempSync(path.join(tmpdir(), 'mq-prep-test-'))
  const mgr = new DownloadManager(root, work)

  const keepa = path.join(work, 'mq-keep-a.mp4')
  const keepaart = path.join(work, 'mq-keep-a.jpg')
  const keepb = path.join(work, 'mq-keep-b.mp4')
  const keepbart = path.join(work, 'mq-keep-b.jpg')
  const stray = path.join(work, 'mq-stray.mp4')
  const partial = path.join(work, 'mq-next.part')

  writeFileSync(keepa, 'video-a')
  writeFileSync(keepaart, 'art-a')
  writeFileSync(keepb, 'video-b')
  writeFileSync(keepbart, 'art-b')
  writeFileSync(stray, 'stray')
  writeFileSync(partial, 'partial')

  mgr.seedregistryready('https://a.example', {
    path: keepa,
    title: 'a',
    audioOnly: false,
    artwork: keepaart,
  })
  mgr.seedregistryready('https://b.example', {
    path: keepb,
    title: 'b',
    audioOnly: false,
    artwork: keepbart,
  })

  removepartialfiles(work, [keepa, keepb, keepaart, keepbart, stray])
  assert(existsSync(keepa), 'keepa survives partial cleanup')
  assert(existsSync(keepb), 'keepb survives partial cleanup')
  assert(
    existsSync(stray),
    'unprotected finished file survives partial cleanup',
  )
  assert(!existsSync(partial), 'partial file removed')

  mgr.canceldownload()
  assert(existsSync(keepa), 'canceldownload keeps registry file a')
  assert(existsSync(keepb), 'canceldownload keeps registry file b')

  const pruned = mgr.prunequeuecache(['https://b.example'], 'https://b.example')
  assert(pruned.deletedCount === 2, 'prune removes media and artwork for url a')
  assert(!existsSync(keepa), 'pruned file a deleted')
  assert(!existsSync(keepaart), 'pruned artwork a deleted')
  assert(existsSync(keepb), 'pruned keeps still-queued url b')
  assert(existsSync(keepbart), 'pruned keeps artwork for url b')

  const taken = mgr.takeprepready('https://b.example')
  assert(taken && taken.path === keepb, 'takeprepready returns ready entry')
  assert(
    taken && taken.artwork === keepbart,
    'takeprepready returns artwork path',
  )
  assert(
    !!mgr.readregistryready('https://b.example'),
    'registry entry kept for duplicate short-form reuse',
  )
  const takenagain = mgr.takeprepready('https://b.example')
  assert(
    takenagain && takenagain.path === keepb,
    'second takeprepready reuses same download',
  )
  assert(
    mgr.protectedpaths().includes(keepb),
    'taken path stays protected while registry entry remains',
  )
  assert(
    mgr.protectedpaths().includes(keepbart),
    'taken artwork stays protected while registry entry remains',
  )

  const orphan = path.join(work, 'mq-orphan.mp4')
  writeFileSync(orphan, 'orphan')
  mgr.cancelprep()
  assert(existsSync(keepb), 'cancelprep must not delete claimed playing media')
  assert(existsSync(keepbart), 'cancelprep must not delete claimed artwork')
  assert(!existsSync(orphan), 'cancelprep still removes unprotected mq media')

  rmSync(work, { recursive: true, force: true })
  console.log('ok prep-cache tests passed')
}

main()
