import { applyPatch, compare } from 'fast-json-patch'
import type { Operation } from 'fast-json-patch'
import {
  deepcopy,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

export type JSONSYNC_STREAM_STATE = {
  document: unknown
  expectednextseq: number
}

export type JSONSYNC_RECEIVER_STATE = {
  streams: Map<string, JSONSYNC_STREAM_STATE>
}

export type JSONSYNC_SNAPSHOT_PAYLOAD = {
  streamid: string
  seq: number
  document: unknown
}

export type JSONSYNC_PATCH_PAYLOAD = {
  streamid: string
  seq: number
  ops: Operation[]
}

export type JSONSYNC_APPLY_RESULT =
  | { ok: true; state: JSONSYNC_RECEIVER_STATE }
  | { ok: false; state: JSONSYNC_RECEIVER_STATE; reason: string }

export function jsonsyncstreamkey(streamid: string): string {
  return streamid
}

export function jsonsynccreatereceiverstate(): JSONSYNC_RECEIVER_STATE {
  return { streams: new Map() }
}

export function jsonsyncapplysnapshot(
  state: JSONSYNC_RECEIVER_STATE,
  payload: JSONSYNC_SNAPSHOT_PAYLOAD,
): JSONSYNC_APPLY_RESULT {
  if (!isnumber(payload.seq)) {
    return { ok: false, state, reason: 'seq' }
  }
  if (!isstring(payload.streamid)) {
    return { ok: false, state, reason: 'streamid' }
  }
  const key = jsonsyncstreamkey(payload.streamid)
  const nextexpected = payload.seq + 1
  const newstreams = new Map(state.streams)
  newstreams.set(key, {
    document: deepcopy(payload.document),
    expectednextseq: nextexpected,
  })
  return { ok: true, state: { streams: newstreams } }
}

export function jsonsyncapplypatch(
  state: JSONSYNC_RECEIVER_STATE,
  payload: JSONSYNC_PATCH_PAYLOAD,
): JSONSYNC_APPLY_RESULT {
  if (
    !isnumber(payload.seq) ||
    !isarray(payload.ops) ||
    !isstring(payload.streamid)
  ) {
    return { ok: false, state, reason: 'payload' }
  }
  const key = jsonsyncstreamkey(payload.streamid)
  const stream = state.streams.get(key)
  if (!ispresent(stream)) {
    return { ok: false, state, reason: 'nostream' }
  }
  if (payload.seq !== stream.expectednextseq) {
    return { ok: false, state, reason: 'seq' }
  }
  try {
    const doccopy = deepcopy(stream.document)
    const applied = applyPatch(doccopy, payload.ops, true, true)
    const newstreams = new Map(state.streams)
    newstreams.set(key, {
      document: applied.newDocument,
      expectednextseq: stream.expectednextseq + 1,
    })
    return { ok: true, state: { streams: newstreams } }
  } catch {
    return { ok: false, state, reason: 'patch' }
  }
}

export function jsonsyncbuildpatch(input: {
  previous: unknown
  next: unknown
  seq: number
}): { seq: number; ops: Operation[] } {
  const ops = compare(
    deepcopy(input.previous) as any,
    deepcopy(input.next) as any,
  )
  return { seq: input.seq, ops }
}
