import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createinfohash,
  resolvemqpeerid,
  writemqnetid,
} from 'ops/media-queue/src/main/lib/peerid'

describe('helper peer id prefix', () => {
  let dir = ''
  let seedfile = ''

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mq-peerid-'))
    seedfile = path.join(dir, 'mq-netid')
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('prefixes advertised PeerJS id with mq_ and leaves the seed file as uuid', () => {
    const seed = '11111111-1111-4111-8111-111111111111'
    writemqnetid(seedfile, seed)
    const resolved = resolvemqpeerid(seedfile)
    expect(resolved.seed).toBe(seed)
    expect(resolved.peerid).toBe(`mq_${createinfohash(seed)}`)
    expect(fs.readFileSync(seedfile, 'utf8').trim()).toBe(seed)
  })

  it('prefixes MQ_PEER_ID override when missing mq_', () => {
    const resolved = resolvemqpeerid(seedfile, 'plainid20charsxxxxxx')
    expect(resolved.seed).toBe('')
    expect(resolved.peerid).toBe('mq_plainid20charsxxxxxx')
  })

  it('does not double prefix an override that already starts with mq_', () => {
    const resolved = resolvemqpeerid(seedfile, 'mq_alreadyprefixed')
    expect(resolved.peerid).toBe('mq_alreadyprefixed')
  })
})
