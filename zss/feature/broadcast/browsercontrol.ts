import { BROWSER_CONTROL_ORIGIN } from 'zss/feature/broadcast/mediainputaliases'

export type BrowserControlAction = {
  action: 'attach' | 'goto' | 'click' | 'type' | 'back' | 'status'
  origin?: string
  bearer?: string
  url?: string
  x?: number
  y?: number
  text?: string
}

let lastorigin = BROWSER_CONTROL_ORIGIN
let lastbearer = ''

export function readbrowserbearer(): string {
  return lastbearer
}

export function writebrowserauth(origin: string, bearer: string) {
  lastorigin = origin.replace(/\/$/, '')
  lastbearer = bearer
}

function headers(bearer: string): HeadersInit {
  return {
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  }
}

async function readerror(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (text) {
      return text
    }
  } catch {
    /* ignore */
  }
  return `browser sidecar http ${response.status}`
}

export function parsebrowsercontrol(
  data: unknown,
): BrowserControlAction | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const record = data as Record<string, unknown>
  const action = typeof record.action === 'string' ? record.action : ''
  if (
    action !== 'attach' &&
    action !== 'goto' &&
    action !== 'click' &&
    action !== 'type' &&
    action !== 'back' &&
    action !== 'status'
  ) {
    return undefined
  }
  const payload: BrowserControlAction = { action }
  if (typeof record.origin === 'string') {
    payload.origin = record.origin
  }
  if (typeof record.bearer === 'string') {
    payload.bearer = record.bearer
  }
  if (typeof record.url === 'string') {
    payload.url = record.url
  }
  if (typeof record.x === 'number') {
    payload.x = record.x
  }
  if (typeof record.y === 'number') {
    payload.y = record.y
  }
  if (typeof record.text === 'string') {
    payload.text = record.text
  }
  return payload
}

export async function runbrowsercontrol(
  payload: BrowserControlAction,
): Promise<string> {
  const origin = (payload.origin ?? lastorigin).replace(/\/$/, '')
  const bearer = payload.bearer ?? lastbearer
  if (!bearer && payload.action !== 'attach') {
    throw new Error(
      'browser sidecar bearer missing; run: browser attach <bearer>',
    )
  }
  if (payload.action === 'attach') {
    if (!payload.bearer) {
      throw new Error('browser attach needs bearer from the sidecar log')
    }
    writebrowserauth(origin, payload.bearer)
    const response = await fetch(`${origin}/status`, {
      headers: headers(payload.bearer),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    const body = (await response.json()) as { url?: string; title?: string }
    return `browser sidecar ok url=${body.url ?? ''} title=${body.title ?? ''}`
  }

  writebrowserauth(origin, bearer)

  if (payload.action === 'status') {
    const response = await fetch(`${origin}/status`, {
      headers: headers(bearer),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    const body = (await response.json()) as {
      url?: string
      title?: string
      capturing?: boolean
    }
    return `browser url=${body.url ?? ''} title=${body.title ?? ''} capturing=${body.capturing ? 'yes' : 'no'}`
  }

  if (payload.action === 'goto') {
    const url = (payload.url ?? '').trim()
    if (!url) {
      throw new Error('browser goto needs a url')
    }
    const response = await fetch(`${origin}/goto`, {
      method: 'POST',
      headers: headers(bearer),
      body: JSON.stringify({ url }),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    return `browser goto ${url}`
  }

  if (payload.action === 'click') {
    const x = Number(payload.x)
    const y = Number(payload.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('browser click needs x y')
    }
    const response = await fetch(`${origin}/click`, {
      method: 'POST',
      headers: headers(bearer),
      body: JSON.stringify({ x, y }),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    return `browser click ${x} ${y}`
  }

  if (payload.action === 'type') {
    const text = String(payload.text ?? '')
    const response = await fetch(`${origin}/type`, {
      method: 'POST',
      headers: headers(bearer),
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    return `browser type ${text.length} chars`
  }

  if (payload.action === 'back') {
    const response = await fetch(`${origin}/back`, {
      method: 'POST',
      headers: headers(bearer),
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      throw new Error(await readerror(response))
    }
    return 'browser back'
  }

  throw new Error('unknown browser action')
}
