import { addEffect, addAfterEffect, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { getGPUTier, TierResult } from 'detect-gpu'
import { deviceType, primaryInput } from 'detect-it'
import { useEffect, useState } from 'react'
import Stats from 'stats.js'
import { NearestFilter } from 'three'
import {
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
  RUNTIME,
  STATS_DEV,
} from 'zss/config'
import { SOFTWARE } from 'zss/device/session'
import { CRTShape } from 'zss/gadget/fx/crt'
import decoimageurl from 'zss/gadget/fx/scratches.gif'
import { useTexture } from 'zss/gadget/usetexture'
import { doasync } from 'zss/mapping/func'

import { useDeviceConfig } from './hooks'
import { PanelLayout } from './panellayout'
import { Tape } from './tape'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'

// include all front-end devices
import 'zss/userspace'

export function Engine() {
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
    doasync(SOFTWARE, async () => {
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
    FORCE_TOUCH_UI || deviceType === 'touchOnly' || primaryInput === 'touch'

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

  // update device config
  useEffect(() => {
    useDeviceConfig.setState((state) => {
      return {
        ...state,
        islowrez,
        islandscape,
        showtouchcontrols,
      }
    })
  }, [islowrez, islandscape, showtouchcontrols])

  return (
    <>
      <UserFocus>
        <UserScreen>
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
