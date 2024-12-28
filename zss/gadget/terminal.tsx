import { addEffect, addAfterEffect, useThree, extend } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { getGPUTier, TierResult } from 'detect-gpu'
import { deviceType, primaryInput } from 'detect-it'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Stats from 'stats.js'
import { NearestFilter, OrthographicCamera } from 'three'
import { FORCE_CRT_OFF, RUNTIME, STATS_DEV } from 'zss/config'
import { api_error } from 'zss/device/api'
import { CRTShape } from 'zss/gadget/fx/crt'
import decoimageurl from 'zss/gadget/fx/scratches.gif'
import { useTexture } from 'zss/gadget/usetexture'

import { Layout } from './layout'
import { Tape } from './tape'
import { UserFocus } from './userinput'

// include all front-end devices
import 'zss/userspace'

extend({ OrthographicCamera })

export function Terminal() {
  const { viewport, set, size, camera } = useThree()
  const cameraRef = useRef<OrthographicCamera>(null)
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()

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

  useLayoutEffect(() => {
    const oldCam = camera
    camera.updateProjectionMatrix()
    set(() => ({ camera: cameraRef.current! }))
    return () => set(() => ({ camera: oldCam }))
  }, [set, camera, cameraRef])

  // config DRAW_CHAR_SCALE
  const minrez = Math.min(viewwidth, viewheight)
  const islowrez = minrez < 512
  RUNTIME.DRAW_CHAR_SCALE = islowrez ? 1 : 2

  const islandscape = viewwidth > viewheight

  const shouldcrt =
    !FORCE_CRT_OFF &&
    !islowrez &&
    gputier &&
    gputier.tier > 2 &&
    !gputier.isMobile

  console.info({ shouldcrt, minrez, islowrez, islandscape })

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
      <group scale-x={-1} rotation-z={Math.PI}>
        <group position={[viewwidth * -0.5, viewheight * -0.5, 0]}>
          <UserFocus key={islowrez ? 'lowrez' : 'rez'}>
            <Layout />
            <Tape />
          </UserFocus>
        </group>
      </group>
      {shouldcrt && (
        <EffectComposer>
          <CRTShape splat={splat} viewheight={viewheight} />
        </EffectComposer>
      )}
    </>
  )
}
