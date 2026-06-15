export type WANIX_PHASE = 'idle' | 'running' | 'stopped'

export type WANIX_BINARY = {
  label: string
  entrycmd: string
}

export type WANIX_PENDING = {
  label: string
  kind: 'wasm' | 'bundle'
  bytes: Uint8Array
}

let phase: WANIX_PHASE = 'idle'
let binary: WANIX_BINARY | null = null
let pending: WANIX_PENDING | null = null
let lastexit: number | undefined
let stdinrouting = false

export function readwanixphase(): WANIX_PHASE {
  return phase
}

export function readwanixbinary(): WANIX_BINARY | null {
  return binary
}

export function readwanixpending(): WANIX_PENDING | null {
  return pending
}

export function readwanixlastexit(): number | undefined {
  return lastexit
}

export function readwanixstdinrouting(): boolean {
  return stdinrouting
}

export function iswanixstdinactive(): boolean {
  return phase === 'running' && stdinrouting
}

export function setwanixstdinrouting(on: boolean) {
  stdinrouting = on
}

export function setwanixrunning(entry: WANIX_BINARY) {
  phase = 'running'
  binary = entry
  pending = null
  lastexit = undefined
  stdinrouting = false
}

/** Enable stdin routing when the host detects a blocking read. Returns true on first activation. */
export function enablewanixstdinrouting(): boolean {
  if (phase !== 'running' || stdinrouting) {
    return false
  }
  stdinrouting = true
  return true
}

export function setwanixstopped(exitcode: number) {
  phase = 'stopped'
  lastexit = exitcode
  stdinrouting = false
}

export function setwanixhalted() {
  phase = 'stopped'
  lastexit = undefined
  stdinrouting = false
}

export function setwanixidle() {
  phase = 'idle'
  binary = null
  pending = null
  lastexit = undefined
  stdinrouting = false
}

export function stashwanixpending(entry: WANIX_PENDING) {
  pending = entry
}

export function clearwanixpending() {
  pending = null
}

export function formatwanixstatelines(hostready: boolean): string[] {
  const lines: string[] = []
  lines.push('$graywanix$white — drop a .wasm or .tgz bundle to run it')
  if (phase === 'running' && binary) {
    const stdinlabel = stdinrouting ? '$cyanstdin on' : '$yellowstdin off'
    lines.push(
      `$7 state: $greenrunning $white${binary.label} (${stdinlabel}$white)`,
    )
  } else if (phase === 'stopped' && binary) {
    const exitlabel = lastexit === undefined ? 'halted' : `exit ${lastexit}`
    lines.push(`$7 state: $yellowstopped $white${binary.label} (${exitlabel})`)
  } else if (hostready) {
    lines.push('$7 state: $grayidle $white(sandbox warm — drop to run)')
  } else {
    lines.push('$7 state: $grayidle $white(drop to start)')
  }
  if (pending) {
    lines.push(`$7 pending: $white${pending.label}`)
  }
  lines.push(
    '$7 #wanix stop$white — halt running binary or clear stopped state',
  )
  if (phase === 'running') {
    if (stdinrouting) {
      lines.push(
        '$7 #wanix detach$white — stop routing stdin (task keeps running)',
      )
    } else {
      lines.push(
        '$7 #wanix attach$white — route terminal input to running task',
      )
    }
  }
  return lines
}

/** Test hook — reset module state. */
export function resetwanixsessionfortest() {
  phase = 'idle'
  binary = null
  pending = null
  lastexit = undefined
  stdinrouting = false
}
