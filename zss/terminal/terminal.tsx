import { OrthographicCamera } from '@react-three/drei'
import { addEffect, addAfterEffect, useFrame } from '@react-three/fiber'
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  Glitch,
  Vignette,
} from '@react-three/postprocessing'
import {
  BlendFunction,
  GlitchMode,
  KernelSize,
  Resolution,
} from 'postprocessing'
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

  useFrame(() => {})

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
        <Vignette
          offset={0.025} // vignette offset
          darkness={0.42} // vignette darkness
          eskil={false} // Eskil's vignette technique
          blendFunction={BlendFunction.NORMAL} // blend mode
        />
        <CRTLines />
        <CRTShape />
        {/* <Bloom
          intensity={1.0} // The bloom intensity.
          kernelSize={KernelSize.LARGE} // blur kernel size
          resolutionX={Resolution.AUTO_SIZE} // The horizontal resolution.
          resolutionY={Resolution.AUTO_SIZE} // The vertical resolution.
        /> */}
        <BrightnessContrast
          brightness={0.1} // brightness. min: -1, max: 1
          contrast={0.2} // contrast: min -1, max: 1
        />
      </EffectComposer>
    </>
  )
}
