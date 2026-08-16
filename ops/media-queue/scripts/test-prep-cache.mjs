#!/usr/bin/env node
/**
 * Unit checks for media-queue prep cache: dual slots, targeted cancel, prune.
 */
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { DownloadManager, removepartialfiles } = require('../src/lib/download.cjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

function main() {
  const work = mkdtempSync(path.join(tmpdir(), 'mq-prep-test-'))
  const mgr = new DownloadManager(root, work)

  const keepa = path.join(work, 'mq-keep-a.mp4')
  const keepb = path.join(work, 'mq-keep-b.mp4')
  const stray = path.join(work, 'mq-stray.mp4')
  const partial = path.join(work, 'mq-next.part')

  writeFileSync(keepa, 'video-a')
  writeFileSync(keepb, 'video-b')
  writeFileSync(stray, 'stray')
  writeFileSync(partial, 'partial')

  mgr.seedregistryready('https://a.example', {
    path: keepa,
    title: 'a',
    audioOnly: false,
  })
  mgr.seedregistryready('https://b.example', {
    path: keepb,
    title: 'b',
    audioOnly: false,
  })

  removepartialfiles(work, [keepa, keepb, stray])
  assert(existsSync(keepa), 'keepa survives partial cleanup')
  assert(existsSync(keepb), 'keepb survives partial cleanup')
  assert(existsSync(stray), 'unprotected finished file survives partial cleanup')
  assert(!existsSync(partial), 'partial file removed')

  mgr.canceldownload()
  assert(existsSync(keepa), 'canceldownload keeps registry file a')
  assert(existsSync(keepb), 'canceldownload keeps registry file b')

  const pruned = mgr.prunequeuecache(['https://b.example'], 'https://b.example')
  assert(pruned.deletedCount === 1, 'prune removes one shifted-off url')
  assert(!existsSync(keepa), 'pruned file a deleted')
  assert(existsSync(keepb), 'pruned keeps still-queued url b')

  const taken = mgr.takeprepready('https://b.example')
  assert(taken && taken.path === keepb, 'takeprepready returns ready entry')
  assert(!mgr.readregistryready('https://b.example'), 'registry entry consumed')

  rmSync(work, { recursive: true, force: true })
  console.log('ok prep-cache tests passed')
}

main()
