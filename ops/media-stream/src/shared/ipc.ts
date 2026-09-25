/**
 * IPC contract for media-stream Electron main / preload / renderer.
 */

import type { MS_DESTINATIONS_DISK, MS_ENCODE_PREFS } from './destinations'

export type MS_PEER_ID = {
  seed: string
  peerid: string
}

export type MS_DEST_PUBLIC = {
  id: string
  kind: string
  label: string
  rtmpurl: string
  enabled: boolean
  haskey: boolean
}

export type MS_APP_STATE = {
  peerid: string
  cafeBound: boolean
  streaming: boolean
  destinations: MS_DEST_PUBLIC[]
  encode: MS_ENCODE_PREFS
  status: string
}

export type MS_INVOKE_MAP = {
  resolve_ms_peer_id: {
    args: { overridepeerid?: string }
    result: MS_PEER_ID
  }
  copy_text: {
    args: { text: string }
    result: { ok: boolean }
  }
  read_destinations: {
    args: Record<string, never>
    result: MS_DESTINATIONS_DISK
  }
  write_destinations: {
    args: { disk: MS_DESTINATIONS_DISK }
    result: { ok: boolean }
  }
  ffmpeg_path: {
    args: Record<string, never>
    result: { path: string }
  }
  start_egress: {
    args: Record<string, never>
    result: { ok: boolean; error?: string }
  }
  stop_egress: {
    args: Record<string, never>
    result: { ok: boolean }
  }
  write_text_file: {
    args: { path: string; text: string }
    result: { ok: boolean }
  }
}

export type MS_INVOKE_COMMAND = keyof MS_INVOKE_MAP

export type MS_EVENT_NAME =
  | 'ms_status'
  | 'ms_cafe_bound'
  | 'ms_streaming'
  | 'ms_dest_error'

export type MS_EMIT = (event: MS_EVENT_NAME, payload: unknown) => void

export type MS_BRIDGE = {
  core: {
    invoke: <K extends MS_INVOKE_COMMAND>(
      cmd: K,
      args?: MS_INVOKE_MAP[K]['args'],
    ) => Promise<MS_INVOKE_MAP[K]['result']>
  }
  event: {
    listen: (
      event: MS_EVENT_NAME,
      handler: (message: { payload: unknown }) => void,
    ) => Promise<() => void>
  }
}

export type MS_DEV_BRIDGE = {
  peeridfile: string
}
