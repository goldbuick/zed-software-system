/** Read/send via upstream `<wanix-term>` xterm instance (smoke + iframe child). */

export type WanixTermProbe = {
  readserial: () => string
  sendinput: (text: string) => void
  waitprompt: (timeoutms?: number) => Promise<void>
  focusterm: () => void
  setsize: (cols: number, rows: number) => void
}

type XtermLine = {
  translateToString: (trim?: boolean) => string
}

type XtermBuffer = {
  length: number
  getLine: (index: number) => XtermLine | undefined
}

type XtermInstance = {
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

/** xterm cols/rows for hidden probe hosts — must not be 1px or serial wraps one char per line. */
export const WANIX_PROBE_TERM_COLS = 80
export const WANIX_PROBE_TERM_ROWS = 24

const WANIX_PROBE_TERM_LAYOUT_CSS =
  'position:fixed;left:-9999px;top:0;width:640px;height:480px;opacity:0;pointer-events:none;overflow:hidden'

// Debug overlay (?show=1): keep the term on-screen and opaque instead of parked.
const WANIX_PROBE_TERM_LAYOUT_SHOW_CSS =
  'position:fixed;left:0;top:0;width:640px;height:480px;opacity:1;pointer-events:none;overflow:hidden'

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

  const sendinput = (text: string) => {
    const el = findwanixtermel()
    const term = el?._term
    if (!term) {
      throw new Error('wanix-term probe: xterm not ready')
    }
    term.input(text)
  }

  const setsize = (cols: number, rows: number) => {
    if (cols <= 0 || rows <= 0) {
      return
    }
    const el = findwanixtermel()
    const term = el?._term
    if (!term?.resize) {
      throw new Error('wanix-term probe: xterm not ready')
    }
    term.resize(cols, rows)
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

  return { readserial, sendinput, waitprompt, focusterm, setsize }
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
  | { type: 'zss-wanix-term-chunk'; chunk: string }

export function iswanixtermprobemsg(data: unknown): data is WanixTermProbeMsg {
  if (!data || typeof data !== 'object') {
    return false
  }
  const type = (data as { type?: unknown }).type
  return (
    type === 'zss-wanix-term-probe-rpc' ||
    type === 'zss-wanix-term-probe-rpc-res' ||
    type === 'zss-wanix-term-ready' ||
    type === 'zss-wanix-term-chunk'
  )
}

/** Child iframe: expose probe over postMessage + stream serial diffs to parent. */
export function installwanixtermprobeembed(): WanixTermProbe {
  const probe = installwanixtermprobe()
  let lastserial = ''

  function posttoparent(message: WanixTermProbeMsg) {
    const target =
      window.opener ?? (window.parent !== window ? window.parent : null)
    target?.postMessage(message, window.location.origin)
  }

  function emitserialdiff() {
    ensurewanixtermprobelayout()
    const serial = probe.readserial()
    if (serial.length <= lastserial.length) {
      return
    }
    const chunk = serial.slice(lastserial.length)
    lastserial = serial
    if (chunk.length > 0) {
      posttoparent({ type: 'zss-wanix-term-chunk', chunk })
    }
  }

  const polltimer = setInterval(emitserialdiff, 100)

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
        case 'sendinput': {
          const [text] = (data.args ?? []) as [string]
          probe.sendinput(text)
          emitserialdiff()
          reply({ result: { ok: true } })
          return
        }
        case 'waitprompt': {
          const [ms] = (data.args ?? []) as [number | undefined]
          await probe.waitprompt(ms)
          emitserialdiff()
          reply({ result: { ok: true } })
          return
        }
        case 'focusterm':
          probe.focusterm()
          reply({ result: { ok: true } })
          return
        case 'setsize': {
          const [cols, rows] = (data.args ?? []) as [number, number]
          probe.setsize(cols, rows)
          // The reflow renumbers buffer rows; re-baseline so the next diff does
          // not re-emit the whole buffer to the parent.
          lastserial = probe.readserial()
          reply({ result: { ok: true } })
          return
        }
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
  ensurewanixtermprobelayout()
  const layouttimer = setInterval(ensurewanixtermprobelayout, 250)

  window.addEventListener('beforeunload', () => {
    if (polltimer) {
      clearInterval(polltimer)
    }
    clearInterval(layouttimer)
  })

  return probe
}
