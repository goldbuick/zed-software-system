import { isjoin } from 'zss/feature/url'

import { JSONSYNC_CHANGED, MESSAGE } from './api'

const LS = 'zssDebugBoardrunnerInbound'
const LS_ROLE = 'zssDebugBoardrunnerInboundRole'

function readls(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(key)
      : null
  } catch {
    return null
  }
}

function jsonsyncHint(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return ''
  }
  const p = data as JSONSYNC_CHANGED
  const sid = typeof p.streamid === 'string' ? p.streamid.slice(0, 48) : '?'
  const reason = p.reason ?? '?'
  return `jsonsync{${sid} ${reason} cv=${p.cv} sv=${p.sv}}`
}

/**
 * Dev-only: log every MESSAGE the main thread posts into the boardrunner worker
 * so you can diff host vs /join/ tabs in two consoles.
 *
 * Enable: `localStorage.setItem('zssDebugBoardrunnerInbound', '1')` — skips
 * `ticktock` / `second`. Use `'all'` to include those.
 *
 * Optional label override:
 * `localStorage.setItem('zssDebugBoardrunnerInboundRole', 'host'|'join')`
 */
export function maybeLogBoardrunnerInbound(message: MESSAGE): void {
  if (!import.meta.env.DEV) {
    return
  }
  const mode = readls(LS)
  if (mode !== '1' && mode !== 'all') {
    return
  }
  if (
    mode === '1' &&
    (message.target === 'ticktock' || message.target === 'second')
  ) {
    return
  }
  const roleOverride = readls(LS_ROLE)
  const role =
    roleOverride === 'host' || roleOverride === 'join'
      ? roleOverride
      : isjoin()
        ? 'join'
        : 'host'
  let extra = ''
  if (message.target === 'jsonsync:changed') {
    extra = jsonsyncHint(message.data)
  } else if (message.target === 'boardrunner:ownedboard' && message.data) {
    extra = `ownedboard(${String(message.data)})`
  }
  console.info(
    `[boardrunner-inbound] ${role}`,
    message.target,
    `player=${message.player}`,
    extra,
  )
}
