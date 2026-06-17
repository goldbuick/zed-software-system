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
let termrouting = false

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

export function readwanixtermrouting(): boolean {
  return termrouting
}

export function iswanixtermactive(): boolean {
  return phase === 'running' && termrouting
}

export function setwanixtermrouting(on: boolean) {
  termrouting = on
}

export function setwanixrunning(entry: WANIX_BINARY) {
  phase = 'running'
  binary = entry
  pending = null
  lastexit = undefined
  termrouting = true
}

export function setwanixstopped(exitcode: number) {
  phase = 'stopped'
  lastexit = exitcode
  termrouting = false
}

export function setwanixhalted() {
  phase = 'stopped'
  lastexit = undefined
  termrouting = false
}

export function setwanixidle() {
  phase = 'idle'
  binary = null
  pending = null
  lastexit = undefined
  termrouting = false
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
    const termlabel = termrouting ? '$cyanterm attached' : '$yellowterm detached'
    lines.push(
      `$7 state: $greenrunning $white${binary.label} (${termlabel}$white)`,
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
  lines.push('$7 #wanix unbind$white — list and remove mounted archives')
  if (phase === 'running') {
    if (termrouting) {
      lines.push(
        '$7 #wanix detach$white — stop routing terminal input (task keeps running)',
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
  termrouting = false
}
