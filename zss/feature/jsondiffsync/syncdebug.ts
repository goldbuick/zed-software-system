import type { SYNC_MESSAGE } from './types'

/** Set `ZSS_SYNCDEBUG=1` to log hub→leaf payloads (approximate size and op counts). */
export function logjsondiffsyncoutbound(
  player: string,
  source: string,
  message: SYNC_MESSAGE,
): void {
  if (typeof process === 'undefined' || process.env.ZSS_SYNCDEBUG !== '1') {
    return
  }
  let approxbytes = 0
  let opcount: number | string = 'n/a'
  if (message.kind === 'delta') {
    opcount = message.operations.length
    approxbytes = JSON.stringify(message.operations).length
  } else if (message.kind === 'fullsnapshot') {
    approxbytes = JSON.stringify(message.document).length
  }
  // eslint-disable-next-line no-console
  console.info(
    `[jsondiffsync] stream=${message.streamid}${message.boardsynctarget !== undefined ? ` board=${message.boardsynctarget}` : ''} ${source} → ${player} kind=${message.kind} ops=${opcount} approxJsonBytes=${approxbytes}`,
  )
}

/** With `ZSS_SYNCDEBUG=1`, logs when a duplicate `requestsnapshot` is skipped. */
export function logjsondiffsyncdebouncedrequest(player: string): void {
  if (typeof process === 'undefined' || process.env.ZSS_SYNCDEBUG !== '1') {
    return
  }
  // eslint-disable-next-line no-console
  console.info(`[jsondiffsync] debounce requestsnapshot player=${player}`)
}
