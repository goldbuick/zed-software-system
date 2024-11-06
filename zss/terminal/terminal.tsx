import { addEffect, addAfterEffect, useThree } from '@react-three/fiber'
import {
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
} from '@react-three/postprocessing'
import { getGPUTier, GetGPUTier } from 'detect-gpu'
import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react'
import Stats from 'stats.js'
import { suspend } from 'suspend-react'
import {
  OrthographicCamera as OrthographicCameraImpl,
  NearestFilter,
  Vector2,
} from 'three'
import { FORCE_CRT_OFF, STATS_DEV } from 'zss/config'
import { useTexture } from 'zss/gadget/components/usetexture'
import { createplatform } from 'zss/platform'

import { CRTShape } from './crt'
import { Framing } from './framing'
import { Gadget } from './gadget'
import decoimageurl from './scratches.jpg'

const TUG = 0.0006
const TUG_VEC = new Vector2(TUG, TUG * -0.5)

const useDetectGPU = (props?: GetGPUTier) =>
  suspend(() => getGPUTier(props), ['useDetectGPU'])

createplatform()

export function Terminal() {
  const viewport = useThree((state) => state.viewport)
  const cameraRef = useRef<OrthographicCameraImpl>(null)
  const { height: viewheight } = viewport.getCurrentViewport()

  const splat = useTexture(decoimageurl)
  splat.minFilter = NearestFilter
  splat.magFilter = NearestFilter

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

  const gputier = useDetectGPU()
  const shouldcrt = !FORCE_CRT_OFF && gputier.tier > 2 && !gputier.isMobile

  const set = useThree(({ set }) => set)
  const size = useThree(({ size }) => size)
  const camera = useThree(({ camera }) => camera)

  useLayoutEffect(() => {
    cameraRef.current?.updateProjectionMatrix()
  })

  useLayoutEffect(() => {
    const oldCam = camera
    set(() => ({ camera: cameraRef.current! }))
    return () => set(() => ({ camera: oldCam }))
  }, [set, camera, cameraRef])

  return (
    <>
      <orthographicCamera
        ref={cameraRef}
        left={size.width / -2}
        right={size.width / 2}
        top={size.height / 2}
        bottom={size.height / -2}
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <Framing>
        <Gadget />
      </Framing>
      {shouldcrt && (
        <Suspense fallback={null}>
          <EffectComposer multisampling={0}>
            <BrightnessContrast brightness={0.04} contrast={0.1} />
            <ChromaticAberration
              // blendFunction={BlendFunction.NORMAL}
              offset={TUG_VEC}
              radialModulation
              modulationOffset={0.5}
            />
            <CRTShape splat={splat} viewheight={viewheight} />
          </EffectComposer>
        </Suspense>
      )}
    </>
  )
}

// texture
