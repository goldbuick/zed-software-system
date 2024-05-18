import { OrthographicCamera, useTexture } from '@react-three/drei'
import { addEffect, addAfterEffect } from '@react-three/fiber'
import {
  EffectComposer,
  BrightnessContrast,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, useEffect, useState } from 'react'
import Stats from 'stats.js'
import { NearestFilter } from 'three'
import { STATS_DEV } from 'zss/config'
import { createplatform } from 'zss/platform'

import { CRTShape, CRTLines } from './crt'
import { Framing } from './framing'
import { Gadget } from './gadget'
import decoimageurl from './scratches.jpg'
import { Splash } from './splash'

const TUG = 0.0006

export function Terminal() {
  const splat = useTexture(decoimageurl)
  splat.minFilter = NearestFilter
  splat.magFilter = NearestFilter

  const [stats] = useState(() => new Stats())
  const [active, setActive] = useState(false)

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
        {active ? (
          <Gadget />
        ) : (
          <Splash
            onBoot={() => {
              createplatform()
              setActive(true)
            }}
          />
        )}
      </Framing>
      <Suspense fallback={null}>
        <EffectComposer multisampling={0}>
          <BrightnessContrast brightness={0.04} contrast={0.1} />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[TUG, -TUG]}
          />
          <CRTLines />
          <CRTShape texture={splat} />
        </EffectComposer>
      </Suspense>
    </>
  )
}

// texture
