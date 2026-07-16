/** Aggregate Hugging Face multi-file download progress into one status line. */

export type AGENT_DOWNLOAD_FILE_STATE = {
  pct: number
  loaded: number
  total: number
}

export type AGENT_DOWNLOAD_PROGRESS_STATE = {
  files: Map<string, AGENT_DOWNLOAD_FILE_STATE>
  lastoverall: number
  lastline: string
}

export type AGENT_PROGRESS_INFO = {
  status: string
  name?: string
  file?: string
  progress?: number
  loaded?: number
  total?: number
}

export function createagentdownloadprogressstate(): AGENT_DOWNLOAD_PROGRESS_STATE {
  return {
    files: new Map(),
    lastoverall: -1,
    lastline: '',
  }
}

function filekey(info: AGENT_PROGRESS_INFO): string {
  const name = String(info.name ?? '')
  const file = String(info.file ?? '')
  return `${name}-${file}` || file || name || 'unknown'
}

function ensurefile(
  state: AGENT_DOWNLOAD_PROGRESS_STATE,
  key: string,
): AGENT_DOWNLOAD_FILE_STATE {
  let row = state.files.get(key)
  if (!row) {
    row = { pct: 0, loaded: 0, total: 0 }
    state.files.set(key, row)
  }
  return row
}

function readoverallpct(state: AGENT_DOWNLOAD_PROGRESS_STATE): number {
  const rows = [...state.files.values()]
  if (rows.length === 0) {
    return 0
  }
  let loaded = 0
  let total = 0
  let havebytes = false
  for (let i = 0; i < rows.length; ++i) {
    if (rows[i].total > 0) {
      havebytes = true
      loaded += rows[i].loaded
      total += rows[i].total
    }
  }
  if (havebytes && total > 0) {
    return Math.min(100, Math.round((loaded / total) * 100))
  }
  let sum = 0
  for (let i = 0; i < rows.length; ++i) {
    sum += rows[i].pct
  }
  return Math.min(100, Math.round(sum / rows.length))
}

export function formatagentdownloadstatus(
  state: AGENT_DOWNLOAD_PROGRESS_STATE,
): string {
  const total = state.files.size
  let done = 0
  for (const row of state.files.values()) {
    if (row.pct >= 100) {
      done += 1
    }
  }
  const overall = readoverallpct(state)
  if (total <= 0) {
    return `agent dl ${overall}%`
  }
  return `agent dl ${done}/${total} · ${overall}%`
}

/**
 * Update download tracker from a transformers.js ProgressInfo-like event.
 * Returns a status line when the overall view changed; otherwise undefined.
 */
export function updateagentdownloadprogress(
  state: AGENT_DOWNLOAD_PROGRESS_STATE,
  info: AGENT_PROGRESS_INFO,
): string | undefined {
  const key = filekey(info)
  switch (info.status) {
    case 'initiate':
    case 'download': {
      ensurefile(state, key)
      break
    }
    case 'progress': {
      const row = ensurefile(state, key)
      const pct = Math.round(Number(info.progress ?? row.pct) || 0)
      row.pct = Math.max(0, Math.min(100, pct))
      if (typeof info.loaded === 'number') {
        row.loaded = Math.max(0, info.loaded)
      }
      if (typeof info.total === 'number' && info.total > 0) {
        row.total = info.total
        if (typeof info.loaded !== 'number') {
          row.loaded = Math.round((row.pct / 100) * row.total)
        }
      }
      break
    }
    case 'done': {
      const row = ensurefile(state, key)
      row.pct = 100
      if (row.total > 0) {
        row.loaded = row.total
      }
      break
    }
    default:
      return undefined
  }
  const line = formatagentdownloadstatus(state)
  const overall = readoverallpct(state)
  if (line === state.lastline && overall === state.lastoverall) {
    return undefined
  }
  state.lastline = line
  state.lastoverall = overall
  return line
}

export function createagentdownloadprogress(
  onworking: (msg: string) => void,
): (info: AGENT_PROGRESS_INFO) => void {
  const state = createagentdownloadprogressstate()
  return (info) => {
    const line = updateagentdownloadprogress(state, info)
    if (line) {
      onworking(line)
    }
  }
}
