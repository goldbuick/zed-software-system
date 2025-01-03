import { addEffect, addAfterEffect, useThree, extend } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { getGPUTier, TierResult } from 'detect-gpu'
import { deviceType, primaryInput } from 'detect-it'
import { useEffect, useState } from 'react'
import Stats from 'stats.js'
import { NearestFilter, OrthographicCamera } from 'three'
import {
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
  RUNTIME,
  STATS_DEV,
} from 'zss/config'
import { CRTShape } from 'zss/gadget/fx/crt'
import decoimageurl from 'zss/gadget/fx/scratches.gif'
import { useTexture } from 'zss/gadget/usetexture'
import { doasync } from 'zss/mapping/func'

import { PanelLayout } from './panellayout'
import { Tape } from './tape'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'

// include all front-end devices
import 'zss/userspace'

extend({ OrthographicCamera })

export function Terminal() {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()

  // handle showing render stats
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

  // detect gpu info
  const [gputier, setgputier] = useState<TierResult>()
  useEffect(() => {
    doasync('gpudetect', async () => {
      const result = await getGPUTier()
      setgputier(result)
    })
  }, [])

  // config DRAW_CHAR_SCALE
  const minrez = Math.min(viewwidth, viewheight)
  const islowrez = minrez < 600 || FORCE_LOW_REZ
  RUNTIME.DRAW_CHAR_SCALE = islowrez ? 1 : 2

  // config LAYOUT
  const islandscape = viewwidth > viewheight
  const showtouchcontrols =
    FORCE_TOUCH_UI || deviceType === 'hybrid' || primaryInput === 'touch'

  // grit texture
  const splat = useTexture(decoimageurl)
  splat.minFilter = NearestFilter
  splat.magFilter = NearestFilter

  // config FX
  const shouldcrt =
    !FORCE_CRT_OFF &&
    !islowrez &&
    !showtouchcontrols &&
    gputier &&
    gputier.tier > 2 &&
    !gputier.isMobile

  return (
    <>
      <UserFocus>
        <UserScreen
          islandscape={islandscape}
          showtouchcontrols={showtouchcontrols}
        >
          <PanelLayout />
          <Tape />
        </UserScreen>
      </UserFocus>
      {shouldcrt && (
        <EffectComposer>
          <CRTShape splat={splat} viewheight={viewheight} />
        </EffectComposer>
      )}
    </>
  )
}
