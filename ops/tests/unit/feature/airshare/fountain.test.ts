import {
  airsharebase64urltobytes,
  airsharebytestobase64url,
} from 'zss/feature/airshare/bytes'
import {
  airshareingestframe,
  airsharerecoverpayload,
  createairsharedecoder,
  createairshareencoder,
  encodeairshareframe,
  repairindices,
} from 'zss/feature/airshare/fountain'
import { sha256bytes, sha256equal } from 'zss/feature/airshare/hash'
import {
  airsharestreamidentity,
  parseairshareframe,
  parseairshareheader,
} from 'zss/feature/airshare/protocol'
import { airshareblocksizeforversion } from 'zss/feature/airshare/qrcapacity'

describe('airshare protocol', () => {
  it('round-trips header fields', async () => {
    const payload = new TextEncoder().encode('hello airshare')
    const sha = await sha256bytes(payload)
    const encoder = createairshareencoder(payload, 64, 0x12345678, sha)
    const frame = encodeairshareframe(encoder, 0)
    const parsed = parseairshareframe(frame)
    expect(parsed).not.toBeNull()
    expect(parsed!.header.session).toBe(0x12345678)
    expect(parsed!.header.seq).toBe(0)
    expect(parsed!.header.totallen).toBe(payload.length)
    expect(sha256equal(parsed!.header.sha256, sha)).toBe(true)
    expect(parseairshareheader(frame)?.magic).toBe(0xa2)
  })

  it('rejects wrong magic', () => {
    const bad = new Uint8Array(60)
    bad[0] = 0x00
    expect(parseairshareheader(bad)).toBeNull()
  })
})

describe('airshare fountain', () => {
  it('recovers from a full systematic sweep', async () => {
    const payload = new Uint8Array(500)
    for (let i = 0; i < payload.length; ++i) {
      payload[i] = (i * 17) & 0xff
    }
    const sha = await sha256bytes(payload)
    const encoder = createairshareencoder(payload, 64, 42, sha)
    const first = encodeairshareframe(encoder, 0)
    const header = parseairshareframe(first)!.header
    const decoder = createairsharedecoder(
      header,
      airsharestreamidentity(header),
    )
    for (let seq = 0; seq < encoder.blockcount; ++seq) {
      const result = airshareingestframe(
        decoder,
        encodeairshareframe(encoder, seq),
      )
      expect(result.ok).toBe(true)
    }
    expect(decoder.solved).toBe(encoder.blockcount)
    const recovered = airsharerecoverpayload(decoder)
    expect(recovered).not.toBeNull()
    expect(Array.from(recovered!)).toEqual(Array.from(payload))
    expect(sha256equal(await sha256bytes(recovered!), sha)).toBe(true)
  })

  it('recovers under random erasures using repair frames', async () => {
    const payload = new Uint8Array(1200)
    for (let i = 0; i < payload.length; ++i) {
      payload[i] = (i * 31 + 7) & 0xff
    }
    const sha = await sha256bytes(payload)
    const encoder = createairshareencoder(payload, 100, 99, sha)
    const first = encodeairshareframe(encoder, 0)
    const header = parseairshareframe(first)!.header
    const decoder = createairsharedecoder(
      header,
      airsharestreamidentity(header),
    )
    const drop = new Set([1, 3, 5, 8])
    let seq = 0
    let complete = false
    const limit = encoder.blockcount * 4
    while (!complete && seq < limit) {
      if (!(seq < encoder.blockcount && drop.has(seq))) {
        const result = airshareingestframe(
          decoder,
          encodeairshareframe(encoder, seq),
        )
        complete = result.complete
      }
      seq += 1
    }
    expect(complete).toBe(true)
    const recovered = airsharerecoverpayload(decoder)
    expect(recovered).not.toBeNull()
    expect(Array.from(recovered!)).toEqual(Array.from(payload))
  })

  it('uses deterministic repair indices', () => {
    const a = repairindices(1, 100, 50)
    const b = repairindices(1, 100, 50)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(1)
    expect(a.length).toBeLessThanOrEqual(50)
  })
})

describe('airshare bytes', () => {
  it('round-trips base64url zip bytes', () => {
    const original = new Uint8Array([1, 2, 3, 250, 255, 0, 128])
    const encoded = airsharebytestobase64url(original)
    const decoded = airsharebase64urltobytes(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })
})

describe('airshare qrcapacity', () => {
  it('leaves room for the header', () => {
    const blocksize = airshareblocksizeforversion(27)
    expect(blocksize).toBeGreaterThan(1000)
  })
})
