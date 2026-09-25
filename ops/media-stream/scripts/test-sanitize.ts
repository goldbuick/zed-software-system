import assert from 'node:assert/strict'

import { vodexcludesboardtv } from '../src/shared/audiobus'
import {
  msdestinationsanitize,
  msdestinationsdefault,
  msdestinationspublic,
} from '../src/shared/destinations'

function testdestsanitize() {
  const bad = msdestinationsanitize({
    destinations: [
      { id: 'x', kind: 'nope', streamkey: 'k' },
      {
        id: 'youtube',
        kind: 'youtube',
        label: 'YT',
        rtmpurl: 'rtmps://a.rtmp.youtube.com/live2',
        streamkey: 'secret',
        enabled: true,
      },
    ],
    encode: { enhanced: false, dualformat: true, cropoffsetx: 2 },
  })
  assert.equal(bad.destinations.length, 1)
  assert.equal(bad.destinations[0].kind, 'youtube')
  assert.equal(bad.encode.cropoffsetx, 1)
  assert.equal(bad.encode.dualformat, true)
  const pub = msdestinationspublic(bad)
  assert.equal(
    (pub.destinations[0] as { streamkey?: string }).streamkey,
    undefined,
  )
  assert.equal(pub.destinations[0].haskey, true)
}

function testdefault() {
  const d = msdestinationsdefault()
  assert.ok(d.destinations.some((x) => x.kind === 'tiktok'))
  assert.ok(d.destinations.some((x) => x.kind === 'twitch'))
}

function testvodbus() {
  assert.equal(vodexcludesboardtv(['a', 'b'], ['tv1']), true)
  assert.equal(vodexcludesboardtv(['a', 'tv1'], ['tv1']), false)
}

testdestsanitize()
testdefault()
testvodbus()
console.log('media-stream sanitize tests ok')
