import { Canvas, createRoot, events, extend } from '@react-three/fiber'
import debounce from 'debounce'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Intersection,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
} from 'three'
import { RUNTIME } from 'zss/config'
import { vmcli } from 'zss/device/api'
import {
  register,
  registerreadplayer,
  registersetmyplayerid,
} from 'zss/device/register'
import { isclimode } from 'zss/feature/detect'
import { isjoin } from 'zss/feature/url'
import { useDeviceData } from 'zss/gadget/device'
import { makeeven } from 'zss/mapping/number'
import { createplatform } from 'zss/platform'

import { App } from './app'

async function bootheadless(): Promise<void> {
  const readplayer = (window as any).__nodeStorageReadPlayer
  if (typeof readplayer === 'function') {
    const playerId = await readplayer()
    registersetmyplayerid(playerId)
  }
  const globby = window as any
  globby.__onCliInput = (line: string) => {
    vmcli(register, registerreadplayer(), line)
  }
  await import('zss/userspace')
  createplatform(isjoin(), true)
  globby.__nodeReady?.()
}

// Headless path: no WebGL, no Canvas, no UI — just platform + CLI
async function main() {
  if (isclimode()) {
    await bootheadless()
    return
  }

  await import('zss/userspace')

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
          preserveDrawingBuffer: true,
        },
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
      preserveDrawingBuffer: true,
    },
  })

  window.addEventListener('resize', handleresize)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleresize)
    window.visualViewport.addEventListener('scroll', handleresize)
  }
  handleresize()
  root.render(<App />)
}

main().catch(console.error)
