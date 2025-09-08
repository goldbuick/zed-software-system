import { Canvas, events } from '@react-three/fiber'
import debounce from 'debounce'
import { Root, createRoot } from 'react-dom/client'
import { Intersection } from 'three'
import { makeeven } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { App } from './app'

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

let root: MAYBE<Root>

function applyconfig(innerwidth: number, innerheight: number) {
  const frame = document.getElementById('frame')
  if (!ispresent(frame)) {
    return
  }
  const canvaswidth = makeeven(innerwidth)
  const canvasheight = makeeven(innerheight)
  frame.style.width = `${canvaswidth}px`
  frame.style.height = `${canvasheight}px`
  if (!ispresent(root)) {
    root = createRoot(frame)
    root.render(
      <Canvas
        flat
        linear
        dpr={1}
        shadows={false}
        events={eventManagerFactory}
        gl={{
          alpha: true,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: true,
        }}
      >
        <App />
      </Canvas>,
    )
  }
}

const handleresize = debounce(applyconfig, 256)
window.addEventListener('resize', () =>
  handleresize(window.innerWidth, window.innerHeight),
)

handleresize(window.innerWidth, window.innerHeight)
