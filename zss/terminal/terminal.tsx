import { OrthographicCamera, useTexture } from '@react-three/drei'
import { addEffect, addAfterEffect } from '@react-three/fiber'
import { EffectComposer, BrightnessContrast } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import React, { useEffect, useState } from 'react'
import Stats from 'stats.js'
import decoimageurl from 'url:./scratches.jpg'
import { STATS_DEV } from 'zss/config'

import { CRTShape, CRTLines, TextureSplat } from './crt'
import { Framing } from './framing'
import { Gadget } from './gadget'

console.info({ decoimageurl })

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
      <EffectComposer multisampling={0}>
        <CRTLines />
        <CRTShape />
        <TextureSplat
          opacity={0.35}
          texture={splat}
          blendFunction={BlendFunction.OVERLAY}
        />
        <BrightnessContrast brightness={0.1} contrast={0.14} />
      </EffectComposer>
    </>
  )
}

// texture
