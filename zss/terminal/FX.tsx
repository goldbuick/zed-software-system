import { useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { ChromaticAberrationEffect } from 'postprocessing'
import React from 'react'

let offset = 0
const PHASE = 0.0015

export function FX() {
  const ref = React.createRef<typeof ChromaticAberrationEffect>()

  useFrame((state, delta) => {
    if (!ref.current) {
      return
    }
    // @ts-expect-error why??
    ref.current.offset = [Math.cos(offset) * PHASE, Math.sin(offset) * PHASE]
    // bump anim
    offset += delta * 0.25
  })

  return (
    <EffectComposer>
      <ChromaticAberration
        ref={ref}
        radialModulation
        // @ts-expect-error numbers !
        offset={[-PHASE, PHASE]} // color offset
      />
    </EffectComposer>
  )
}
