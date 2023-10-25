import { Loader } from '@react-three/drei'
import { Canvas, events } from '@react-three/fiber'
import React from 'react'
import useMeasure from 'react-use-measure'
import * as THREE from 'three'
import './main/hubmain'

import { makeEven } from '../mapping/number'

import { Terminal } from './components/Terminal'

const target = new THREE.Vector3()
const facing = new THREE.Vector3()

const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (
  state,
) => ({
  // Default configuration
  ...events(state),

  // The filter can re-order or re-structure the intersections
  filter: (items: THREE.Intersection[]) => {
    const list = items.filter((item) => {
      if (!item.object.visible) {
        return false
      }

      const clippingPlanes: THREE.Plane[] =
        item.object.userData.clippingPlanes ?? []
      if (
        clippingPlanes.some((plane) => {
          plane.projectPoint(item.point, target)
          facing.subVectors(item.point, target).normalize().round()
          return plane.normal.equals(facing) === false
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

export function App() {
  const [ref, bounds] = useMeasure()

  const boundsWidth = makeEven(bounds.width)
  const boundsHeight = makeEven(bounds.height)

  return (
    <>
      <div
        ref={ref}
        className="fixed inset-0"
        onContextMenuCapture={(event) => {
          event.preventDefault()
        }}
      >
        <div
          className="absolute mx-auto"
          style={{
            width: boundsWidth,
            height: boundsHeight,
          }}
        >
          <Canvas
            flat
            linear
            dpr={1}
            shadows={false}
            touch-action="none"
            gl={{
              alpha: false,
              stencil: false,
              antialias: false,
              precision: 'highp',
              preserveDrawingBuffer: true,
              powerPreference: 'high-performance',
            }}
            style={{
              imageRendering: 'pixelated',
            }}
            events={eventManagerFactory}
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true
            }}
          >
            <Terminal />
          </Canvas>
        </div>
      </div>
      <Loader />
    </>
  )
}
