import { events, Canvas } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import { Intersection, Plane, Vector3 } from 'three'
import unmuteAudio from 'unmute-ios-audio'
import { ispresent } from 'zss/mapping/types'

import { App } from './app'

unmuteAudio()

const target = new Vector3()
const facing = new Vector3()

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

      const clippingPlanes: Plane[] = item.object.userData.clippingPlanes ?? []
      if (
        clippingPlanes.some((plane) => {
          plane.projectPoint(item.point, target)
          facing.subVectors(item.point, target).normalize().round()
          target.copy(plane.normal).round()
          const isfacing = target.equals(facing)
          return isfacing === false
        })
      ) {
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

const frame = document.getElementById('frame')
if (ispresent(frame)) {
  createRoot(frame).render(
    <Canvas
      flat
      linear
      shadows={false}
      events={eventManagerFactory}
      gl={{
        alpha: true,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
    >
      <App />
    </Canvas>,
  )
}
