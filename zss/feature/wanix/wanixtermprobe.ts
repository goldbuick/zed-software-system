/** Read/send via upstream `<wanix-term>` xterm instance (smoke + iframe child). */

import {
  type WanixTermCellsSnapshot,
  digestwanixtermcells,
  readxtermcellsfromterm,
} from 'zss/feature/wanix/wanixtermcells'

export type WanixTermProbe = {
  readserial: () => string
  readcells: () => WanixTermCellsSnapshot | null
  sendinput: (text: string) => void
  waitprompt: (timeoutms?: number) => Promise<void>
  focusterm: () => void
}

type XtermCell = {
  getChars: () => string
  getWidth: () => number
  getFgColor: () => number
  getBgColor: () => number
}

type XtermLine = {
  length: number
  translateToString: (trim?: boolean) => string
  getCell: (x: number) => XtermCell | undefined
}

type XtermBuffer = {
  length: number
  cursorX: number
  cursorY: number
  getLine: (index: number) => XtermLine | undefined
}

type XtermInstance = {
  cols: number
  rows: number
  buffer: { active: XtermBuffer }
  input: (data: string) => void
  focus: () => void
  resize: (cols: number, rows: number) => void
}

type WanixTermElement = HTMLElement & {
  _term?: XtermInstance | null
  focus?: () => void
}

const LOGIN_PROMPT_RE = /login:/i
const SHELL_PROMPT_RE = /~\s#/

// Fill the iframe viewport so the term's FitAddon fits the xterm grid to the
// host-set iframe pixel size (cols x rows). The iframe itself is hidden/off-screen.
const WANIX_PROBE_TERM_LAYOUT_CSS =
  'position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:0;pointer-events:none;overflow:hidden'

// Debug overlay (?show=1): opaque instead of transparent.
const WANIX_PROBE_TERM_LAYOUT_SHOW_CSS =
  'position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:1;pointer-events:none;overflow:hidden'

function iswanixtermprobeshow(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('show') === '1'
  } catch {
    return false
  }
}

export function applywanixtermprobelayout(el: HTMLElement) {
  el.style.cssText = iswanixtermprobeshow()
    ? WANIX_PROBE_TERM_LAYOUT_SHOW_CSS
    : WANIX_PROBE_TERM_LAYOUT_CSS
}

export function ensurewanixtermprobelayout() {
  const el = findwanixtermel()
  if (el) {
    applywanixtermprobelayout(el)
  }
}

function findwanixtermel(): WanixTermElement | null {
  return document.querySelector('wanix-term')
}

function readxtermsize(): { cols: number; rows: number } | null {
  const term = findwanixtermel()?._term
  if (!term || term.cols <= 0 || term.rows <= 0) {
    return null
  }
  return { cols: term.cols, rows: term.rows }
}

function readxtermserial(term: XtermInstance): string {
  const active = term.buffer.active
  const lines: string[] = []
  for (let i = 0; i < active.length; i++) {
    const line = active.getLine(i)
    if (line) {
      lines.push(line.translateToString(true))
    }
  }
  return lines.join('\n')
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function installwanixtermprobe(): WanixTermProbe {
  const focusterm = () => {
    const el = findwanixtermel()
    el?.focus?.()
    el?._term?.focus()
  }

  const readserial = () => {
    const el = findwanixtermel()
    const term = el?._term
    if (!term) {
      return ''
    }
    return readxtermserial(term)
  }

  const readcells = () => {
    const el = findwanixtermel()
    const term = el?._term
    if (!term) {
      return null
    }
    return readxtermcellsfromterm(term)
  }

  const sendinput = (text: string) => {
    const el = findwanixtermel()
    const term = el?._term
    if (!term) {
      throw new Error('wanix-term probe: xterm not ready')
    }
    term.input(text)
  }

  const waitprompt = async (timeoutms = 600_000) => {
    const deadline = Date.now() + timeoutms
    while (Date.now() < deadline) {
      const serial = readserial()
      if (LOGIN_PROMPT_RE.test(serial) || SHELL_PROMPT_RE.test(serial)) {
        return
      }
      await sleep(500)
    }
    throw new Error(
      `wanix-term probe: login prompt timeout (${timeoutms}ms)\n${readserial().slice(-400)}`,
    )
  }

  return { readserial, readcells, sendinput, waitprompt, focusterm }
}

export type WanixTermProbeMsg =
  | {
      type: 'zss-wanix-term-probe-rpc'
      id: number
      method: string
      args?: unknown[]
    }
  | {
      type: 'zss-wanix-term-probe-rpc-res'
      id: number
      result?: unknown
      error?: string
    }
  | { type: 'zss-wanix-term-ready' }
  | ({ type: 'zss-wanix-term-cells' } & WanixTermCellsSnapshot)

export function iswanixtermprobemsg(data: unknown): data is WanixTermProbeMsg {
  if (!data || typeof data !== 'object') {
    return false
  }
  const type = (data as { type?: unknown }).type
  return (
    type === 'zss-wanix-term-probe-rpc' ||
    type === 'zss-wanix-term-probe-rpc-res' ||
    type === 'zss-wanix-term-ready' ||
    type === 'zss-wanix-term-cells'
  )
}

/** Child iframe: expose probe over postMessage + stream cell snapshots to parent. */
export function installwanixtermprobeembed(): WanixTermProbe {
  const probe = installwanixtermprobe()
  let lastcelldigest = ''
  let lastfitcols = 0
  let lastfitrows = 0

  function logxtermfitsizeifchanged() {
    const size = readxtermsize()
    if (!size) {
      return
    }
    if (size.cols === lastfitcols && size.rows === lastfitrows) {
      return
    }
    lastfitcols = size.cols
    lastfitrows = size.rows
    console.info('[wanix] xterm-fit-size', size)
    lastcelldigest = ''
    emitcellsnapshot()
  }

  function onlayouttick() {
    ensurewanixtermprobelayout()
    logxtermfitsizeifchanged()
  }

  function posttoparent(message: WanixTermProbeMsg) {
    const target =
      window.opener ?? (window.parent !== window ? window.parent : null)
    target?.postMessage(message, window.location.origin)
  }

  function emitcellsnapshot() {
    ensurewanixtermprobelayout()
    const snapshot = probe.readcells()
    if (!snapshot) {
      return
    }
    const digest = digestwanixtermcells(snapshot)
    if (digest === lastcelldigest) {
      return
    }
    lastcelldigest = digest
    posttoparent({ type: 'zss-wanix-term-cells', ...snapshot })
  }

  const polltimer = setInterval(emitcellsnapshot, 50)

  const onprobemessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
      return
    }
    const data = event.data
    if (
      !iswanixtermprobemsg(data) ||
      data.type !== 'zss-wanix-term-probe-rpc'
    ) {
      return
    }
    const source = event.source as Window | null
    if (!source) {
      return
    }
    const reply = (payload: { result?: unknown; error?: string }) => {
      source.postMessage(
        { type: 'zss-wanix-term-probe-rpc-res', id: data.id, ...payload },
        window.location.origin,
      )
    }
    try {
      switch (data.method) {
        case 'readserial':
          reply({ result: probe.readserial() })
          return
        case 'readcells':
          reply({ result: probe.readcells() })
          return
        case 'sendinput': {
          const [text] = (data.args ?? []) as [string]
          probe.sendinput(text)
          emitcellsnapshot()
          reply({ result: { ok: true } })
          return
        }
        case 'waitprompt': {
          const [ms] = (data.args ?? []) as [number | undefined]
          await probe.waitprompt(ms)
          emitcellsnapshot()
          reply({ result: { ok: true } })
          return
        }
        case 'focusterm':
          probe.focusterm()
          reply({ result: { ok: true } })
          return
        default:
          reply({ error: `unknown probe rpc: ${data.method}` })
      }
    } catch (err) {
      reply({
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  window.addEventListener('message', (event) => {
    void onprobemessage(event)
  })

  posttoparent({ type: 'zss-wanix-term-ready' })
  onlayouttick()
  emitcellsnapshot()
  const layouttimer = setInterval(onlayouttick, 250)

  window.addEventListener('beforeunload', () => {
    if (polltimer) {
      clearInterval(polltimer)
    }
    clearInterval(layouttimer)
  })

  return probe
}
