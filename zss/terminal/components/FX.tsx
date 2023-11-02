import { useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { ChromaticAberrationEffect } from 'postprocessing'
import React from 'react'

let offset = 0
const PHASE = 0.005

export function FX() {
  const ref = React.createRef<typeof ChromaticAberrationEffect>()

  useFrame((state, delta) => {
    if (!ref.current) {
      return
    }

    // PHASE = PHASE + (1 - Math.random() * 2) * delta * 1.0125
    // PHASE = Math.max(0.0001, Math.min(0.004, PHASE))

    // ref.current.offset = [Math.cos(offset) * PHASE, Math.sin(offset) * PHASE]

    ref.current.modulationOffset = 0.1 //Math.abs(Math.cos(offset * 10) * 2)

    offset += delta * 0.1
  })

  return (
    <EffectComposer>
      <ChromaticAberration
        ref={ref}
        radialModulation
        modulationOffset={0.8}
        // @ts-expect-error numbers !
        offset={[-PHASE, PHASE]} // color offset
      />
    </EffectComposer>
  )
}
