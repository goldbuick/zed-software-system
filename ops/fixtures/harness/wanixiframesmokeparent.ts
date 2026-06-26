/** Playwright harness parent — mock WebGL + hidden iframe host + VM login smoke. */
/* eslint-disable no-console -- harness status logging */
import { iswanixtermiframemsg } from 'zss/feature/wanix/wanixtermiframeprotocol'
import {
  type WanixTermProbeMsg,
  iswanixtermprobemsg,
} from 'zss/feature/wanix/wanixtermprobe'
import { readwanixvmasseturls } from 'zss/feature/wanix/wanixvmassets'

const RPC_TIMEOUT_MS = 600_000

function log(line: string) {
  const el = document.getElementById('status')
  if (el) {
    el.textContent = line
  }
  console.log('[wanix-iframe-smoke]', line)
}

function startmockwebgl() {
  const canvas = document.getElementById('frame') as HTMLCanvasElement | null
  if (!canvas) {
    return
  }
  const gl =
    canvas.getContext('webgl') ??
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
  if (!gl) {
    log('webgl unavailable')
    return
  }
  let hue = 0
  const draw = () => {
    hue = (hue + 0.4) % 360
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.08 + (hue % 60) / 600, 0.04, 0.12 + (hue % 40) / 500, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    requestAnimationFrame(draw)
  }
  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)
  draw()
  log('mock webgl running')
}

let rpcseq = 0
const lifewaiters = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>()
const probewaiters = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>()

function childwindow(): Window {
  const frame = document.getElementById(
    'wanix-child',
  ) as HTMLIFrameElement | null
  const w = frame?.contentWindow
  if (!w) {
    throw new Error('wanix iframe child missing')
  }
  return w
}

function postchild(message: object) {
  childwindow().postMessage(message, window.location.origin)
}

function liferpc<T>(method: string, args: unknown[] = []): Promise<T> {
  const id = ++rpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      lifewaiters.delete(id)
      reject(new Error(`iframe rpc timeout: ${method}`))
    }, RPC_TIMEOUT_MS)
    lifewaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    postchild({ type: 'zss-wanix-term-rpc', id, method, args })
  })
}

function probecall<T>(method: string, args: unknown[] = []): Promise<T> {
  const id = ++rpcseq
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      probewaiters.delete(id)
      reject(new Error(`probe rpc timeout: ${method}`))
    }, RPC_TIMEOUT_MS)
    probewaiters.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    postchild({
      type: 'zss-wanix-term-probe-rpc',
      id,
      method,
      args,
    } satisfies WanixTermProbeMsg)
  })
}

async function waitchildready() {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('wanix iframe child ready timeout'))
    }, 120_000)
    const onmsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      if (
        iswanixtermprobemsg(event.data) &&
        event.data.type === 'zss-wanix-term-ready'
      ) {
        clearTimeout(timer)
        window.removeEventListener('message', onmsg)
        resolve()
      }
    }
    window.addEventListener('message', onmsg)
  })
}

async function runsmoke() {
  startmockwebgl()
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
      return
    }
    const data = event.data
    if (iswanixtermiframemsg(data) && data.type === 'zss-wanix-term-rpc-res') {
      const waiter = lifewaiters.get(data.id)
      if (!waiter) {
        return
      }
      lifewaiters.delete(data.id)
      if (data.error) {
        waiter.reject(new Error(data.error))
        return
      }
      waiter.resolve(data.result)
      return
    }
    if (
      iswanixtermprobemsg(data) &&
      data.type === 'zss-wanix-term-probe-rpc-res'
    ) {
      const waiter = probewaiters.get(data.id)
      if (!waiter) {
        return
      }
      probewaiters.delete(data.id)
      if (data.error) {
        waiter.reject(new Error(data.error))
        return
      }
      waiter.resolve(data.result)
    }
  })

  log('waiting for wanix iframe child…')
  await waitchildready()
  log('child ready — prep vm space…')
  await liferpc('prepvm', [readwanixvmasseturls()])
  log('vm space ready — spawning vm…')
  await liferpc('spawnvm', ['linux-vm', '512M'])
  log('vm spawned — waiting for login prompt…')
  await probecall('waitprompt', [600_000])
  log('login prompt seen — sending root login…')
  await probecall('sendinput', ['root'])
  await probecall('sendinput', ['\r'])
  await probecall('sendinput', ['\r'])
  await probecall('sendinput', ['id'])
  await probecall('sendinput', ['\r'])
  const serial = await probecall<string>('readserial', [])
  if (!serial.includes('uid=')) {
    throw new Error(`expected uid= in serial:\n${serial.slice(-800)}`)
  }
  log('iframe term smoke ok — uid= seen')
  const w = window as Window & { __WANIX_IFRAME_SMOKE_OK__?: boolean }
  w.__WANIX_IFRAME_SMOKE_OK__ = true
}

runsmoke().catch((err) => {
  log(String(err))
  const w = window as Window & { __WANIX_IFRAME_SMOKE_ERROR__?: string }
  w.__WANIX_IFRAME_SMOKE_ERROR__ = String(err)
})
