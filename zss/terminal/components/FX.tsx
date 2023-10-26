import {
  EffectComposer,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import React from 'react'

const PHASE = 0.0006

export function FX() {
  return (
    <EffectComposer>
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL} // blend mode
        offset={[-PHASE, PHASE]} // color offset
      />
      <Noise opacity={0.25} blendFunction={BlendFunction.SUBTRACT} />
      <Vignette offset={0.025} darkness={0.6} />
    </EffectComposer>
  )
}
