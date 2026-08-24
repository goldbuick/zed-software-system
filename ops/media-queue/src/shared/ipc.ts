/**
 * IPC contract shared by the Electron main process, the preload bridge, and the
 * renderer. Defining module for these shapes -- import from here on both sides
 * rather than restating them.
 */

import type { MQ_QUEUE_DISK } from './queue'

export type MQ_JOB_PHASE = 'idle' | 'downloading' | 'ready' | 'error'

/** Progress snapshot for one download job (playback or background prep). */
export type MQ_JOB_STATE = {
  url: string
  phase: MQ_JOB_PHASE
  percent: number
  status: string
  detail: string
  path: string
  error: string
}

/** Playback job state plus on-disk cache size; `url` is not reported. */
export type MQ_DOWNLOAD_STATE = {
  phase: MQ_JOB_PHASE
  percent: number
  status: string
  detail: string
  path: string
  error: string
  cacheBytes: number
}

export type MQ_APP_STATE = {
  download: MQ_DOWNLOAD_STATE
  prep: MQ_JOB_STATE
  cookiesBrowser: string
}

export type MQ_DEV_CONFIG = {
  peeridfile: string
  playbackpath: string
  statustextfile: string
}

export type MQ_PROGRESS_EVENT = {
  percent: number
  eta: string
  status: string
}

export type MQ_READY_EVENT = {
  path: string
  title: string
  /** Track artist when known (audio); empty when absent. */
  artist: string
  /** Album name when known (audio); empty when absent. */
  album: string
  /** Channel or uploader when known (video); empty when absent. */
  channel: string
  audioOnly: boolean
  duration: number
  /** Absolute path to sidecar cover art, or empty when absent. */
  artwork: string
}

export type MQ_ERROR_EVENT = {
  message: string
}

export type MQ_PRUNE_RESULT = {
  deletedCount: number
}

export type MQ_CLEAR_RESULT = {
  deletedCount: number
  freedBytes: number
}

export type MQ_PEER_ID = {
  seed: string
  peerid: string
}

export type MQ_PROBE_META = {
  title: string
  durationsec: number
  /** True when extraction itself failed (DRM, private, geo-block, deleted). */
  failed: boolean
  /** Compact reason for the tape when failed is true. */
  error: string
  /** True when the video track is a still frame, so only audio is worth fetching. */
  audioonly: boolean
}

export type MQ_PLAYLIST_ENTRY = {
  /** Extractor-native id, used to join batch metadata back to this entry. */
  id: string
  url: string
  title: string
  durationsec: number
}

export type MQ_PROBE_BATCH_ENTRY = {
  id: string
  /** Canonical page url -- flat listings sometimes only carry an api url. */
  url: string
  title: string
  durationsec: number
  /** True when the video track is a still frame, so only audio is worth fetching. */
  audioonly: boolean
}

/**
 * Metadata for the leading entries of a playlist, read in one yt-dlp pass.
 * yt-dlp prints nothing for an entry it cannot extract, so an entry absent
 * from `entries` is unplayable and takes `error` as its reason.
 */
export type MQ_PROBE_BATCH = {
  entries: MQ_PROBE_BATCH_ENTRY[]
  error: string
}

export type MQ_PLAYLIST_EXPAND =
  | { kind: 'single' }
  | { kind: 'playlist'; entries: MQ_PLAYLIST_ENTRY[] }

/**
 * One resolved playlist entry during the batch metadata scan. yt-dlp prints a
 * line per entry as it reads it, so these arrive while the scan is still running.
 */
export type MQ_PROBE_PROGRESS = {
  /** 1-based count of entries resolved so far. */
  index: number
  total: number
  entry: MQ_PROBE_BATCH_ENTRY
}

/** Main -> renderer push channels. */
export type MQ_EVENT_NAME =
  | 'mq-download-progress'
  | 'mq-download-ready'
  | 'mq-download-error'
  | 'mq-prep-progress'
  | 'mq-prep-ready'
  | 'mq-prep-error'
  | 'mq-probe-progress'

/** Emit callback handed to DownloadManager so it can push job updates. */
export type MQ_EMIT = (event: MQ_EVENT_NAME, payload: unknown) => void

/** Renderer -> main invoke channels, with argument and result types. */
export type MQ_INVOKE_MAP = {
  get_state: { args: void; result: MQ_APP_STATE }
  copy_text: { args: { text: string }; result: boolean }
  resize_main_window: { args: { contentHeight: number }; result: null }
  set_media_cookies_browser: { args: { browser: string }; result: string }
  start_media_download: {
    args: { url: string; allowlong?: boolean; audioonly?: boolean }
    result: MQ_DOWNLOAD_STATE
  }
  start_media_prep: {
    args: { url: string; allowlong?: boolean; audioonly?: boolean }
    result: MQ_JOB_STATE
  }
  probe_media_meta: { args: { url: string }; result: MQ_PROBE_META }
  probe_media_batch: {
    args: { url: string; count: number }
    result: MQ_PROBE_BATCH
  }
  expand_media_playlist: { args: { url: string }; result: MQ_PLAYLIST_EXPAND }
  cancel_media_download: { args: void; result: MQ_DOWNLOAD_STATE }
  cancel_media_prep: { args: void; result: MQ_JOB_STATE }
  read_media_prep_state: { args: void; result: MQ_JOB_STATE }
  take_media_prep_ready: {
    args: { url: string }
    result: MQ_READY_EVENT | null
  }
  prune_media_queue_cache: {
    args: { urls: string[]; playingUrl: string }
    result: MQ_PRUNE_RESULT
  }
  clear_media_downloads: { args: void; result: MQ_CLEAR_RESULT }
  get_media_download_state: { args: void; result: MQ_DOWNLOAD_STATE }
  read_media_file: { args: { path: string }; result: Uint8Array }
  write_text_file: { args: { path: string; text: string }; result: boolean }
  resolve_mq_peer_id: { args: void; result: MQ_PEER_ID }
  read_media_queue: { args: void; result: MQ_QUEUE_DISK }
  write_media_queue: { args: MQ_QUEUE_DISK; result: boolean }
  get_mq_dev_config: { args: void; result: MQ_DEV_CONFIG }
  mq_dev_peer_open: { args: { id: string }; result: boolean }
  mq_dev_status: { args: { text: string }; result: boolean }
}

export type MQ_INVOKE_COMMAND = keyof MQ_INVOKE_MAP

/**
 * Preload bridge shape on `window`. Named `__TAURI__` for continuity with the
 * original Tauri build of this helper; the renderer calls through it.
 */
export type MQ_BRIDGE = {
  core: {
    invoke<K extends MQ_INVOKE_COMMAND>(
      cmd: K,
      args?: MQ_INVOKE_MAP[K]['args'],
    ): Promise<MQ_INVOKE_MAP[K]['result']>
  }
  event: {
    listen(
      event: MQ_EVENT_NAME,
      handler: (message: { payload: unknown }) => void,
    ): Promise<() => void>
  }
}

/** Dev-only helpers exposed on `window.mqdev`. */
export type MQ_DEV_BRIDGE = MQ_DEV_CONFIG & {
  writetextfile(filepath: string, text: string): Promise<boolean>
}
