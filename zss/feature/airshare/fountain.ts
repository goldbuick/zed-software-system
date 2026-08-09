/**
 * Systematic-carousel fountain for airshare.
 * seq < K: systematic block seq
 * seq >= K: XOR of a mid-degree subset seeded by (session, seq)
 */

import {
  type AIRSHARE_HEADER,
  packairshareframe,
  parseairshareframe,
} from 'zss/feature/airshare/protocol'

const REPAIR_DEGREE_MIN = 4
const REPAIR_DEGREE_MAX = 24

export type AIRSHARE_ENCODER = {
  session: number
  blockcount: number
  blocksize: number
  totallen: number
  sha256: Uint8Array
  blocks: Uint8Array[]
}

export type AIRSHARE_DECODER = {
  identity: string
  session: number
  blockcount: number
  blocksize: number
  totallen: number
  sha256: Uint8Array
  blocks: (Uint8Array | null)[]
  solved: number
  /** seq -> payload for unsolved coded frames */
  pending: Map<number, { indices: number[]; payload: Uint8Array }>
  seen: Set<number>
}

/** Integer PRNG: mulberry32, deterministic across engines. */
export function airsharerng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedfrom(session: number, seq: number): number {
  return (Math.imul(session >>> 0, 0x9e3779b1) ^ (seq >>> 0)) >>> 0
}

export function repairindices(
  session: number,
  seq: number,
  blockcount: number,
): number[] {
  const rng = airsharerng(seedfrom(session, seq))
  const span = Math.min(
    blockcount,
    REPAIR_DEGREE_MAX - REPAIR_DEGREE_MIN + 1,
  )
  const degree =
    REPAIR_DEGREE_MIN + Math.floor(rng() * span)
  const capped = Math.max(1, Math.min(blockcount, degree))
  const indices: number[] = []
  const used = new Set<number>()
  while (indices.length < capped) {
    const idx = Math.floor(rng() * blockcount)
    if (used.has(idx)) {
      continue
    }
    used.add(idx)
    indices.push(idx)
  }
  indices.sort((a, b) => a - b)
  return indices
}

function xorinto(dest: Uint8Array, src: Uint8Array) {
  for (let i = 0; i < dest.length; ++i) {
    dest[i] ^= src[i]
  }
}

export function createairshareencoder(
  payload: Uint8Array,
  blocksize: number,
  session: number,
  sha256: Uint8Array,
): AIRSHARE_ENCODER {
  if (blocksize < 1 || blocksize > 0xffff) {
    throw new Error('airshare blocksize out of range')
  }
  if (payload.length > 0xffffffff) {
    throw new Error('airshare payload too large')
  }
  const totallen = payload.length
  const blockcount = Math.max(1, Math.ceil(totallen / blocksize) || 1)
  if (blockcount > 0xffff) {
    throw new Error('airshare too many blocks')
  }
  const blocks: Uint8Array[] = []
  for (let i = 0; i < blockcount; ++i) {
    const block = new Uint8Array(blocksize)
    const start = i * blocksize
    const end = Math.min(start + blocksize, totallen)
    if (end > start) {
      block.set(payload.subarray(start, end))
    }
    blocks.push(block)
  }
  return {
    session: session >>> 0,
    blockcount,
    blocksize,
    totallen,
    sha256,
    blocks,
  }
}

export function encodeairshareframe(
  encoder: AIRSHARE_ENCODER,
  seq: number,
): Uint8Array {
  const header: AIRSHARE_HEADER = {
    magic: 0xa2,
    version: 1,
    session: encoder.session,
    seq: seq >>> 0,
    blockcount: encoder.blockcount,
    blocksize: encoder.blocksize,
    totallen: encoder.totallen,
    sha256: encoder.sha256,
  }
  let payload: Uint8Array
  if (seq < encoder.blockcount) {
    payload = encoder.blocks[seq]
  } else {
    const indices = repairindices(encoder.session, seq, encoder.blockcount)
    payload = new Uint8Array(encoder.blocksize)
    for (let i = 0; i < indices.length; ++i) {
      xorinto(payload, encoder.blocks[indices[i]])
    }
  }
  return packairshareframe(header, payload)
}

export function createairsharedecoder(
  header: AIRSHARE_HEADER,
  identity: string,
): AIRSHARE_DECODER {
  return {
    identity,
    session: header.session,
    blockcount: header.blockcount,
    blocksize: header.blocksize,
    totallen: header.totallen,
    sha256: header.sha256.slice(),
    blocks: Array.from({ length: header.blockcount }, () => null),
    solved: 0,
    pending: new Map(),
    seen: new Set(),
  }
}

function trypeel(decoder: AIRSHARE_DECODER) {
  let progressed = true
  while (progressed) {
    progressed = false
    for (const [seq, entry] of decoder.pending) {
      const unknowns: number[] = []
      const reduced = entry.payload.slice()
      for (let i = 0; i < entry.indices.length; ++i) {
        const idx = entry.indices[i]
        const known = decoder.blocks[idx]
        if (known) {
          xorinto(reduced, known)
        } else {
          unknowns.push(idx)
        }
      }
      if (unknowns.length === 0) {
        decoder.pending.delete(seq)
        progressed = true
        continue
      }
      if (unknowns.length === 1) {
        const idx = unknowns[0]
        if (!decoder.blocks[idx]) {
          decoder.blocks[idx] = reduced
          decoder.solved += 1
          progressed = true
        }
        decoder.pending.delete(seq)
        continue
      }
      decoder.pending.set(seq, { indices: unknowns, payload: reduced })
    }
  }
}

export function airshareingestframe(
  decoder: AIRSHARE_DECODER,
  frame: Uint8Array,
): { ok: boolean; complete: boolean } {
  const parsed = parseairshareframe(frame)
  if (!parsed) {
    return { ok: false, complete: false }
  }
  const { header, payload } = parsed
  if (
    header.session !== decoder.session ||
    header.blockcount !== decoder.blockcount ||
    header.blocksize !== decoder.blocksize ||
    header.totallen !== decoder.totallen
  ) {
    return { ok: false, complete: false }
  }
  if (decoder.seen.has(header.seq)) {
    return { ok: true, complete: decoder.solved === decoder.blockcount }
  }
  decoder.seen.add(header.seq)

  if (header.seq < decoder.blockcount) {
    const idx = header.seq
    if (!decoder.blocks[idx]) {
      decoder.blocks[idx] = payload.slice()
      decoder.solved += 1
      trypeel(decoder)
    }
  } else {
    const indices = repairindices(
      decoder.session,
      header.seq,
      decoder.blockcount,
    )
    decoder.pending.set(header.seq, {
      indices,
      payload: payload.slice(),
    })
    trypeel(decoder)
  }
  return {
    ok: true,
    complete: decoder.solved === decoder.blockcount,
  }
}

export function airsharerecoverpayload(
  decoder: AIRSHARE_DECODER,
): Uint8Array | null {
  if (decoder.solved !== decoder.blockcount) {
    return null
  }
  const out = new Uint8Array(decoder.totallen)
  for (let i = 0; i < decoder.blockcount; ++i) {
    const block = decoder.blocks[i]
    if (!block) {
      return null
    }
    const start = i * decoder.blocksize
    const len = Math.min(decoder.blocksize, decoder.totallen - start)
    if (len > 0) {
      out.set(block.subarray(0, len), start)
    }
  }
  return out
}

export function airshareframesneeded(blockcount: number): number {
  return blockcount
}
