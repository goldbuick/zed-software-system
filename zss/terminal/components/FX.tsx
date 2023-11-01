import {
  EffectComposer,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import React from 'react'

const PHASE = 0.0007 / window.devicePixelRatio

export function FX() {
  return (
    <EffectComposer>
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL} // blend mode
        // @ts-expect-error numbers !
        offset={[-PHASE, PHASE]} // color offset
      />
    </EffectComposer>
  )
}
