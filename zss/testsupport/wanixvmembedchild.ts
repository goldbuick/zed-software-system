import { openwanixvmtermstreams, sendwanixterminput, sendwanixvmline, setwanixvmexithandler } from 'zss/feature/wanix/wanixhost'
import { setwanixvmtermforwarder } from 'zss/feature/wanix/wanixhosttermforward'
import {
  iswanixvmiframemsg,
  type WANIX_VM_IFRAME_RPC,
} from 'zss/feature/wanix/wanixvmiframeprotocol'
import { installewanixe2ebridge } from 'zss/testsupport/wanixe2ebridge'

type WanixE2eBridge = {
  prepwanixhostvm: (urls: { linux: string; v86: string }) => Promise<void>
  spawnwanixhostvm: (opts?: {
    vmid?: string
    mem?: string
    attach?: boolean
    wait?: boolean
    skiptermconnect?: boolean
  }) => Promise<{ vmid: string; code?: number }>
  haltwanixhostvm: (vmid?: string) => Promise<void>
}

function bridge(): WanixE2eBridge {
  const e = (window as Window & { __zss_e2e?: WanixE2eBridge }).__zss_e2e
  if (!e) {
    throw new Error('wanix vm embed: __zss_e2e bridge missing')
  }
  return e
}

function posttoparent(message: object) {
  const target =
    window.opener ??
    (window.parent !== window ? window.parent : null)
  target?.postMessage(message, window.location.origin)
}

async function handlerrpc(data: WANIX_VM_IFRAME_RPC, source: MessageEventSource | null) {
  if (!source || typeof (source as Window).postMessage !== 'function') {
    return
  }
  const reply = (payload: { result?: unknown; error?: string }) => {
    ;(source as Window).postMessage(
      { type: 'zss-wanix-vm-rpc-res', id: data.id, ...payload },
      window.location.origin,
    )
  }
  try {
    const e = bridge()
    switch (data.method) {
      case 'prep': {
        const [urls] = data.args as [{ linux: string; v86: string }]
        await e.prepwanixhostvm(urls)
        reply({ result: { ok: true } })
        return
      }
      case 'spawn': {
        const [opts] = data.args as [
          {
            vmid?: string
            mem?: string
            attach?: boolean
            wait?: boolean
            skiptermconnect?: boolean
          }?,
        ]
        const result = await e.spawnwanixhostvm({
          ...opts,
          attach: false,
        })
        reply({ result })
        return
      }
      case 'openvmterm': {
        const [vmid] = data.args as [string]
        await openwanixvmtermstreams(vmid)
        reply({ result: { ok: true } })
        return
      }
      case 'halt': {
        const [vmid] = data.args as [string | undefined]
        await e.haltwanixhostvm(vmid)
        reply({ result: { ok: true } })
        return
      }
      case 'terminput': {
        const [text] = data.args as [string]
        await sendwanixterminput(text)
        reply({ result: { ok: true } })
        return
      }
      case 'termline': {
        const [line] = data.args as [string]
        await sendwanixterminput(line.endsWith('\r') ? line : `${line}\r`)
        reply({ result: { ok: true } })
        return
      }
      default:
        reply({ error: `unknown rpc: ${data.method}` })
    }
  } catch (err) {
    reply({
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Hidden iframe child — run wanix VM isolated from parent R3F WebGL. */
export function installwanixvmembedchild() {
  installewanixe2ebridge()

  setwanixvmtermforwarder((vmid, chunk) => {
    posttoparent({ type: 'zss-wanix-vm-term', vmid, chunk })
  })

  setwanixvmexithandler((vmid, code) => {
    posttoparent({ type: 'zss-wanix-vm-exit', vmid, code })
  })

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
      return
    }
    const data = event.data
    if (!iswanixvmiframemsg(data) || data.type !== 'zss-wanix-vm-rpc') {
      return
    }
    void handlerrpc(data, event.source)
  })

  posttoparent({ type: 'zss-wanix-vm-ready' })
}
