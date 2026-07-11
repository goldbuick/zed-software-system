import { gunzipSync, gzipSync } from 'node:zlib'

import {
  extractwanixtarbytes,
  extractwanixtgz,
  iswanixtarjunkpath,
} from 'zss/device/register/handlers/wanix/wanixtgzextract'

function writeoctalfield(header: Uint8Array, offset: number, length: number, value: number) {
  const text = value.toString(8).padStart(length - 1, '0') + '\0'
  for (let i = 0; i < length; ++i) {
    header[offset + i] = i < text.length ? text.charCodeAt(i) : 0
  }
}

function writetarheader(name: string, size: number, typeflag = 48): Uint8Array {
  const header = new Uint8Array(512)
  const namebytes = new TextEncoder().encode(name)
  header.set(namebytes.subarray(0, Math.min(namebytes.length, 99)))
  writeoctalfield(header, 124, 12, size)
  header[156] = typeflag
  writeoctalfield(header, 148, 8, 0)
  let sum = 0
  for (let i = 0; i < 512; ++i) {
    sum += i >= 148 && i < 156 ? 32 : header[i]
  }
  writeoctalfield(header, 148, 8, sum)
  return header
}

function buildtarmember(name: string, body: Uint8Array, typeflag = 48): Uint8Array {
  const header = writetarheader(name, body.length, typeflag)
  const padded = Math.ceil(body.length / 512) * 512
  const block = new Uint8Array(512 + padded)
  block.set(header, 0)
  block.set(body, 512)
  return block
}

function buildtararchive(members: { name: string; body: Uint8Array; typeflag?: number }[]): Uint8Array {
  const chunks: Uint8Array[] = []
  for (const member of members) {
    chunks.push(buildtarmember(member.name, member.body, member.typeflag))
  }
  chunks.push(new Uint8Array(512))
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const archive = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    archive.set(chunk, offset)
    offset += chunk.length
  }
  return archive
}

describe('wanixtgzextract', () => {
  describe('iswanixtarjunkpath', () => {
    it('skips macos metadata paths', () => {
      expect(iswanixtarjunkpath('__MACOSX/foo')).toBe(true)
      expect(iswanixtarjunkpath('dir/._secret')).toBe(true)
      expect(iswanixtarjunkpath('.DS_Store')).toBe(true)
      expect(iswanixtarjunkpath('bundle/foo.wasm')).toBe(false)
    })
  })

  describe('extractwanixtarbytes', () => {
    it('extracts regular files under prefix', () => {
      const body = new TextEncoder().encode('wasm-bytes')
      const tar = buildtararchive([{ name: 'hello.wasm', body }])
      const files = extractwanixtarbytes(tar, 'bundle-test')
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('bundle-test/hello.wasm')
      expect(new TextDecoder().decode(files[0].bytes)).toBe('wasm-bytes')
    })

    it('skips directories and junk entries', () => {
      const body = new TextEncoder().encode('ok')
      const tar = buildtararchive([
        { name: '__MACOSX/._hello.wasm', body },
        { name: 'nested/', body: new Uint8Array(0), typeflag: 53 },
        { name: 'run.wasm', body },
      ])
      const files = extractwanixtarbytes(tar, 'bundle-x')
      expect(files.map((file) => file.path)).toEqual(['bundle-x/run.wasm'])
    })

    it('extracts multiple wasm files', () => {
      const tar = buildtararchive([
        { name: 'a.wasm', body: new Uint8Array([1]) },
        { name: 'b.wasm', body: new Uint8Array([2]) },
      ])
      const files = extractwanixtarbytes(tar, 'bundle-multi')
      expect(files).toHaveLength(2)
    })

    it('normalizes bsd tar ./ member paths', () => {
      const body = new TextEncoder().encode('wasm-bytes')
      const tar = buildtararchive([{ name: './hello.wasm', body }])
      const files = extractwanixtarbytes(tar, 'bundle-bsd')
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('bundle-bsd/hello.wasm')
    })
  })

  describe('extractwanixtgz', () => {
    it('gunzips and extracts tar payload', async () => {
      if (typeof DecompressionStream === 'undefined') {
        return
      }
      const body = new TextEncoder().encode('from-gzip')
      const tar = buildtararchive([{ name: 'main.wasm', body }])
      const tgz = new Uint8Array(gzipSync(tar))
      const files = await extractwanixtgz(tgz, 'bundle-gz')
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('bundle-gz/main.wasm')
      expect(new TextDecoder().decode(files[0].bytes)).toBe('from-gzip')
    })

    it('matches gunzipSync baseline when DecompressionStream is available', async () => {
      if (typeof DecompressionStream === 'undefined') {
        return
      }
      const tar = buildtararchive([
        { name: 'one.wasm', body: new Uint8Array([9]) },
      ])
      const tgz = new Uint8Array(gzipSync(tar))
      const viaextract = await extractwanixtgz(tgz, 'prefix')
      const viatar = extractwanixtarbytes(new Uint8Array(gunzipSync(tgz)), 'prefix')
      expect(viaextract).toEqual(viatar)
    })
  })
})
