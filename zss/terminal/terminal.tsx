import { OrthographicCamera, useTexture } from '@react-three/drei'
import { addEffect, addAfterEffect } from '@react-three/fiber'
import {
  EffectComposer,
  BrightnessContrast,
  SMAA,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, useEffect, useState } from 'react'
import Stats from 'stats.js'
import { STATS_DEV } from 'zss/config'

import { CRTShape, CRTLines, TextureSplat } from './crt'
import { Framing } from './framing'
import { Gadget } from './gadget'
import decoimageurl from './scratches.jpg'

const TUG = 0.0006

export function Terminal() {
  const splat = useTexture(decoimageurl)
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
  }, [stats])

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
      <Suspense fallback={null}>
        <EffectComposer multisampling={0}>
          <CRTLines />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[TUG, -TUG]}
          />
          <CRTShape />
          <TextureSplat
            opacity={0.35}
            texture={splat}
            blendFunction={BlendFunction.OVERLAY}
          />
          <BrightnessContrast brightness={0.1} contrast={0.14} />
          <SMAA />
        </EffectComposer>
      </Suspense>
    </>
  )
}

// texture
