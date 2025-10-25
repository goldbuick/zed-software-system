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
import { useDeviceData } from 'zss/gadget/hooks'
import { makeeven } from 'zss/mapping/number'

import { App } from './app'

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
  // Default configuration
  ...events(state),

  // The filter can re-order or re-structure the intersections
  filter: (items: Intersection[]) => {
    const list = items.filter((item) => {
      if (!item.object.visible) {
        return false
      }
      return true
    })

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

// @ts-expect-error fuuuu
const root = createRoot(document.getElementById('frame'))

function applyconfig() {
  const innerwidth = window.innerWidth
  const innerheight = window.innerHeight
  const width = makeeven(innerwidth)
  const height = makeeven(innerheight)
  const safeheight = window.visualViewport
    ? Math.min(innerheight, window.visualViewport.height)
    : innerheight
  const saferows = Math.floor(safeheight / RUNTIME.DRAW_CHAR_HEIGHT())
  useDeviceData.setState({
    saferows,
  })
  root
    .configure({
      size: {
        left: 0,
        top: 0,
        width,
        height,
      },
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

async function bootup() {
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
  handleresize()

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleresize)
    window.visualViewport.addEventListener('scroll', handleresize)
  }

  // Initial check
  handleresize()

  root.render(<App />)
}

bootup().catch(console.error)
