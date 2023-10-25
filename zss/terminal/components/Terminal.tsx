import { OrthographicCamera, Stats } from '@react-three/drei'
import {
  EffectComposer,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import React from 'react'

import { STATS_DEV } from '/zss/config'

import { Framing } from './Framing'
import { Gadget } from './Gadget'

const PHASE = 0.001

export function Terminal() {
  return (
    <>
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <Framing>
        <Gadget />
      </Framing>
      {STATS_DEV && <Stats />}
      <EffectComposer>
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL} // blend mode
          offset={[-PHASE, PHASE]} // color offset
        />
      </EffectComposer>
    </>
  )
}
