import { OrthographicCamera } from '@react-three/drei'
import { addEffect, addAfterEffect } from '@react-three/fiber'
import {
  ChromaticAberration,
  EffectComposer,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import React, { useEffect, useState } from 'react'
import Stats from 'stats.js'
import { STATS_DEV } from 'zss/config'

import { CRTShape, CRTLines } from './crt'
import { Framing } from './framing'
import { Gadget } from './gadget'

export function Terminal() {
  const [stats] = useState(() => new Stats())

  useEffect(() => {
    if (!STATS_DEV) {
      return
    }

    document.body.appendChild(stats.dom)
    stats.showPanel(0)
    stats.dom.style.cssText = 'position:fixed;bottom:0;left:0;'
    const begin = addEffect(() => stats.begin())
    const end = addAfterEffect(() => stats.end())
    return () => {
      document.body.removeChild(stats.dom)
      begin()
      end()
    }
  }, [])

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
      <EffectComposer>
        <ChromaticAberration
          radialModulation
          modulationOffset={0.5}
          offset={[0.0014, 0.0]} // color offset
        />
        {/* @ts-expect-error pls stop */}
        <CRTLines blendFunction={BlendFunction.OVERLAY} />
        {/* @ts-expect-error pls stop */}
        <CRTShape />
        <BrightnessContrast brightness={-0.01} />
      </EffectComposer>
    </>
  )
}
