import {
  Canvas,
  type RootState,
  createRoot,
  events,
  extend,
} from '@react-three/fiber'
import debounce from 'debounce'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Intersection,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
} from 'three'
import 'zss/rom/vitepopulate'
import { RUNTIME } from 'zss/config'
import { vmcli } from 'zss/device/api'
import {
  register,
  registerreadplayer,
  registersetmyplayerid,
} from 'zss/device/register'
import { isclimode } from 'zss/feature/detect'
import { isjoin } from 'zss/feature/url'
import { forcer3fglresize } from 'zss/gadget/canvasrelayout'
import { useDeviceData } from 'zss/gadget/device'
import { makeeven } from 'zss/mapping/number'
import { createplatform } from 'zss/platform'
import { installe2ebridge } from 'zss/testsupport/e2escrollbridge'
import type { StoreApi } from 'zustand/vanilla'

import { App } from './app'

function shoulde2ebridge(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const q = new URLSearchParams(window.location.search).get('ZSS_E2E')
  if (q === '1' || q === 'true') {
    return true
  }
  return import.meta.env.ZSS_E2E === 'true' || import.meta.env.ZSS_E2E === '1'
}

/** Off unless dev/E2E — `preserveDrawingBuffer` costs bandwidth on some GPUs. */
function shouldpreservedrawingbuffer(): boolean {
  return import.meta.env.DEV || shoulde2ebridge()
}

async function bootheadless(): Promise<void> {
  const g = globalThis as any
  const readplayer = g.__nodeStorageReadPlayer
  if (typeof readplayer === 'function') {
    const playerId = await readplayer()
    registersetmyplayerid(playerId)
  }
  g.__onCliInput = (line: string) => {
    vmcli(register, registerreadplayer(), line)
  }
  await import('zss/userspace')
  createplatform(isjoin(), true)
  g.__nodeReady?.()
}

// Headless path: no WebGL, no Canvas, no UI — just platform + CLI
async function main() {
  if (isclimode()) {
    await bootheadless()
    return
  }

  await import('zss/userspace')

  if (shoulde2ebridge()) {
    installe2ebridge()
  }

  extend({
    Mesh,
    OrthographicCamera,
    Group,
    PlaneGeometry,
    MeshBasicMaterial,
    BufferAttribute,
    BufferGeometry,
    Points,
    BoxGeometry,
    PerspectiveCamera,
    InstancedMesh,
    InstancedBufferAttribute,
    LineSegments,
    LineBasicMaterial,
  })

  const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (
    state,
  ) => ({
    ...events(state),
    filter: (items: Intersection[]) => {
      const list = items.filter((item) => item.object.visible)
      const blockingIndex = list.findIndex(
        (item) => item.object.userData.blocking,
      )
      const result =
        blockingIndex === -1 ? list : list.slice(0, blockingIndex + 1)
      let cursor = 'default'
      result.some((item) => {
        if (item.object.userData.cursor) {
          cursor = item.object.userData.cursor
          return true
        }
        return false
      })
      document.querySelectorAll<HTMLElement>('html, body').forEach((node) => {
        node.style.cursor = cursor
      })
      return result
    },
  })

  const root = createRoot(document.getElementById('frame')!)
  const r3fcontext: { store?: StoreApi<RootState> } = {}

  function applyconfig() {
    const innerwidth = window.innerWidth
    const innerheight = window.innerHeight
    const width = makeeven(innerwidth)
    const height = makeeven(innerheight)
    const safeheight = window.visualViewport
      ? Math.min(innerheight, window.visualViewport.height)
      : innerheight
    const saferows = Math.floor(safeheight / RUNTIME.DRAW_CHAR_HEIGHT())
    useDeviceData.setState({ saferows })
    root
      .configure({
        size: { left: 0, top: 0, width, height },
        events: eventManagerFactory,
        dpr: 1,
        flat: true,
        linear: true,
        shadows: false,
        gl: {
          alpha: true,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: shouldpreservedrawingbuffer(),
        },
      })
      .then(() => {
        forcer3fglresize(r3fcontext.store)
      })
      .catch(console.error)
  }
  const handleresize = debounce(applyconfig, 256)

  function detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
      return !!(window.WebGLRenderingContext && gl)
    } catch {
      return false
    }
  }

  function showWebGLRequired() {
    const frame = document.getElementById('frame')
    if (!frame) {
      return
    }
    frame.style.display = 'none'
    const div = document.createElement('div')
    div.id = 'webgl-required'
    div.innerHTML = `<p>WebGL is not enabled or not supported.</p><p><a href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">Check WebGL support</a></p>`
    document.body.appendChild(div)
  }

  if (!detectWebGL()) {
    showWebGLRequired()
    return
  }

  await root.configure({
    events: eventManagerFactory,
    dpr: 1,
    flat: true,
    linear: true,
    shadows: false,
    gl: {
      alpha: true,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: shouldpreservedrawingbuffer(),
    },
  })

  window.addEventListener('resize', handleresize)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleresize)
    window.visualViewport.addEventListener('scroll', handleresize)
  }
  r3fcontext.store = root.render(<App />)
  // Debounced `handleresize` does not run on first call until `wait` elapses, so the
  // canvas would stay on the sizeless initial `configure` until resize or ~256ms.
  applyconfig()
  requestAnimationFrame(() => {
    applyconfig()
  })
}

main().catch(console.error)
