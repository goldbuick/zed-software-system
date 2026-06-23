/**
 * vm-simple.html?embed=1 — term probe + warm halt/respawn for ZSS iframe parent.
 */
import { installwanixtermprobeembed } from 'zss/feature/wanix/wanixtermprobe'

type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
  writeFile: (path: string, data: string) => Promise<void>
}

type WanixSystemElement = HTMLElement & {
  root?: WanixRoot
}

const VM_SPAWN_HTML = `<wanix-vm export="ttyS0" term start></wanix-vm>
<wanix-term path="#vm/1/term" raw></wanix-term>`

function posttoparent(message: object) {
  const target =
    window.opener ?? (window.parent !== window ? window.parent : null)
  target?.postMessage(message, window.location.origin)
}

function readsystem(): WanixSystemElement | null {
  return document.querySelector('wanix-system')
}

function cleartargetels() {
  const sys = readsystem()
  if (!sys) {
    return
  }
  sys
    .querySelectorAll(':scope > wanix-vm, :scope > wanix-term')
    .forEach((el) => el.remove())
}

async function haltvm() {
  const sys = readsystem()
  const root = sys?.root
  if (!root) {
    cleartargetels()
    return
  }
  const entries = await root.readDir('#vm').catch(() => [] as string[])
  for (const name of entries) {
    const rid = name.replace(/\/$/, '')
    if (!rid || rid === 'v86') {
      continue
    }
    try {
      const inner = await root.readDir(`#vm/${rid}`)
      const taskname = inner.find((n) => n.startsWith('task'))
      if (taskname) {
        const taskrid = taskname.replace(/\/$/, '').replace(/^task\/?/, '')
        if (taskrid) {
          await root.writeFile(`#task/${taskrid}/ctl`, 'stop')
        }
      }
    } catch {
      // vm may already be gone
    }
  }
  cleartargetels()
}

function respawnvm() {
  const sys = readsystem()
  if (!sys) {
    throw new Error('wanix vm embed: wanix-system missing')
  }
  if (sys.querySelector('wanix-vm')) {
    return
  }
  sys.insertAdjacentHTML('beforeend', VM_SPAWN_HTML)
}

installwanixtermprobeembed()

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }
  const type = (data as { type?: unknown }).type
  if (type === 'zss-wanix-vm-halt') {
    void haltvm()
    return
  }
  if (type === 'zss-wanix-vm-respawn') {
    try {
      respawnvm()
    } catch (err) {
      posttoparent({
        type: 'zss-wanix-vm-respawn-error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
})
