import { addEffect, addAfterEffect, useThree, extend } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { getGPUTier, TierResult } from 'detect-gpu'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Stats from 'stats.js'
import { NearestFilter, OrthographicCamera } from 'three'
import { FORCE_CRT_OFF, STATS_DEV } from 'zss/config'
import { api_error } from 'zss/device/api'
import { CRTShape } from 'zss/gadget/fx/crt'
import decoimageurl from 'zss/gadget/fx/scratches.gif'
import { useTexture } from 'zss/gadget/usetexture'
import { createplatform } from 'zss/platform'

import { Framing } from './framing'
import { Gadget } from './gadget'

extend({ OrthographicCamera })

createplatform()

export function Terminal() {
  const viewport = useThree((state) => state.viewport)
  const cameraRef = useRef<OrthographicCamera>(null)
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

  const [gputier, setgputier] = useState<TierResult>()
  useEffect(() => {
    getGPUTier({
      benchmarksURL: '/benchmarks-min',
    })
      .then(setgputier)
      .catch((err) => api_error('gpu', 'detect', err))
  }, [])

  const shouldcrt =
    !FORCE_CRT_OFF && gputier && gputier.tier > 2 && !gputier.isMobile

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
        <EffectComposer>
          <CRTShape splat={splat} viewheight={viewheight} />
        </EffectComposer>
      )}
    </>
  )
}

// texture
