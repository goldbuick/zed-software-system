import { useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { ChromaticAberrationEffect } from 'postprocessing'
import React from 'react'

let PHASE = 0.005

export function FX() {
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     PHASE = Math.max(0.1, Math.min(0.01, PHASE + Math.random() * 0.001))
  //   }, 100)
  //   return () => {
  //     clearInterval(timer)
  //   }
  // }, [])

  const ref = React.createRef<typeof ChromaticAberrationEffect>()

  useFrame((state, delta) => {
    if (!ref.current) {
      return
    }

    PHASE = PHASE + (1 - Math.random() * 2) * delta * 0.01
    PHASE = Math.max(0.0001, Math.min(0.007, PHASE))
    console.info(PHASE)

    ref.current.offset = [
      -PHASE / window.devicePixelRatio,
      PHASE / window.devicePixelRatio,
    ]
    ref.current.modulationOffset = PHASE
  })

  return (
    <EffectComposer>
      <ChromaticAberration
        ref={ref}
        radialModulation
        modulationOffset={0.5}
        // @ts-expect-error numbers !
        offset={[-PHASE, PHASE]} // color offset
      />
    </EffectComposer>
  )
}
