import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useRef, useState } from 'react'
import { Group, Plane, Vector3 } from 'three'

type ClippingSet = Plane[]

const subVectors = new Vector3()
const ClippingContext = createContext<ClippingSet>([])

export function useClipping() {
  return useContext(ClippingContext)
}

type Props = {
  width?: number
  height?: number
} & JSX.IntrinsicElements['group']

export default function Clipping({
  width = 0,
  height = 0,
  children,
  ...props
}: Props) {
  const ref = useRef<Group>(null)

  const [clippingPlanes] = useState<ClippingSet>(() => {
    const planes: ClippingSet = []
    if (width) {
      planes.push(new Plane(), new Plane())
    }
    if (height) {
      planes.push(new Plane(), new Plane())
    }
    return planes
  })

  const [vecs] = useState<Vector3[]>(() => [
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  ])

  useFrame(() => {
    if (ref.current) {
      const center = ref.current.localToWorld(vecs[0].set(0, 0, 0))
      const sides = []
      if (width) {
        const halfWidth = width * 0.5
        sides.push(
          ref.current.localToWorld(vecs[3].set(halfWidth, 0, 0)),
          ref.current.localToWorld(vecs[4].set(-halfWidth, 0, 0)),
        )
      }
      if (height) {
        const halfHeight = height * 0.5
        sides.push(
          ref.current.localToWorld(vecs[1].set(0, halfHeight, 0)),
          ref.current.localToWorld(vecs[2].set(0, -halfHeight, 0)),
        )
      }
      for (let i = 0; i < clippingPlanes.length; i += 1) {
        clippingPlanes[i].setFromNormalAndCoplanarPoint(
          subVectors.subVectors(center, sides[i]).normalize(),
          sides[i],
        )
      }
    }
  })

  return (
    <ClippingContext.Provider value={clippingPlanes}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <group position={[width * 0.5, height * 0.5, 0]}>
        <group ref={ref} {...props}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <group position={[width * -0.5, height * -0.5, 0]}>{children}</group>
        </group>
      </group>
    </ClippingContext.Provider>
  )
}
