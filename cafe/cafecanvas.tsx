import { Canvas, events } from '@react-three/fiber'
import type { ComponentProps } from 'react'
import type { Intersection } from 'three'

import { ViewportSync } from './viewportsync'

const eventmanagerfactory: NonNullable<
  ComponentProps<typeof Canvas>['events']
> = (state) => ({
  ...events(state),
  filter: (items: Intersection[]) => {
    const list = items.filter((item) => item.object.visible)
    const blockingindex = list.findIndex(
      (item) => item.object.userData.blocking,
    )
    const result =
      blockingindex === -1 ? list : list.slice(0, blockingindex + 1)
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

export function CafeCanvas({ children }: { children: React.ReactNode }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      dpr={1}
      flat
      linear
      shadows={false}
      gl={{
        alpha: true,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }}
      events={eventmanagerfactory}
      resize={{ debounce: { resize: 256, scroll: 50 } }}
    >
      <ViewportSync />
      {children}
    </Canvas>
  )
}
