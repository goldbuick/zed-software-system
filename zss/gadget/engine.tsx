import { OrthographicCamera, useDetectGPU } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vignette } from '@react-three/postprocessing'
import { deviceType, primaryInput } from 'detect-it'
import { VignetteTechnique } from 'postprocessing'
import { useEffect, useLayoutEffect, useState } from 'react'
import { FORCE_TOUCH_UI, RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { isclimode } from 'zss/feature/detect'
import { storagereadconfig } from 'zss/feature/storage'
import { isjoin } from 'zss/feature/url'
import { useDeviceData } from 'zss/gadget/device'
import { CRTShape } from 'zss/gadget/fx/crt'
import { EffectComposerMain } from 'zss/gadget/graphics/effectcomposer'
import { doasync } from 'zss/mapping/func'
import { createplatform, haltplatform } from 'zss/platform'
import {
  ScreenUILayout,
  ScreenUIScrollLayer,
  ScreenUIScrollProvider,
} from 'zss/screens/screenui/component'
import { TapeComponent } from 'zss/screens/tape/component'

import { Scanlines } from './fx/scanlines'
import { TapeToastConnected } from './toast'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'
import { TapeViewImage } from './viewimage'

export function Engine() {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()

  // runs the SIM
  useEffect(() => {
    createplatform(isjoin(), isclimode())
    return () => {
      haltplatform()
    }
  }, [])

  // detect gpu info
  const gputier = useDetectGPU({ benchmarksURL: '/benchmarks-min' })

  // read config
  const [forcelowrez, setforcelowrez] = useState(false)
  const [crt, setcrt] = useState(false)
  const [scanlines, setscanlines] = useState(false)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const lowrez = await storagereadconfig('lowrez')
      if (lowrez === 'on') {
        setforcelowrez(true)
      }
      const crt = await storagereadconfig('crt')
      if (crt === 'on') {
        setcrt(true)
      }
      const scanlines = await storagereadconfig('scanlines')
      if (scanlines === 'on') {
        setscanlines(true)
      }
    })
  }, [])

  // config DRAW_CHAR_SCALE
  const minrez = Math.min(viewwidth, viewheight)
  const islowrez = forcelowrez || minrez < 600
  RUNTIME.DRAW_CHAR_SCALE = islowrez ? 1 : 2

  // config LAYOUT
  const islandscape = viewwidth > viewheight
  const showtouchcontrols =
    deviceType === 'touchOnly' || primaryInput === 'touch'
  /** True on touch-primary-only devices, or when ZSS_FORCE_TOUCH_UI=true (desktop smoke test for hidden input). */
  const usemobiletextcapture =
    (deviceType === 'touchOnly' && primaryInput === 'touch') || FORCE_TOUCH_UI

  // config FX
  const shouldcrt =
    !islowrez &&
    !showtouchcontrols &&
    crt === true &&
    gputier &&
    (gputier.tier > 2 || gputier.gpu?.includes('apple gpu')) &&
    !gputier.isMobile

  // update device config
  useEffect(() => {
    useDeviceData.setState((state) => {
      return {
        ...state,
        islowrez,
        islandscape,
        showtouchcontrols,
        usemobiletextcapture,
      }
    })
  }, [islowrez, islandscape, showtouchcontrols, usemobiletextcapture])

  return (
    <>
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <UserFocus>
        <UserScreen>
          <ScreenUIScrollProvider>
            <ScreenUILayout />
            <TapeComponent />
            <TapeToastConnected />
            <TapeViewImage />
            <ScreenUIScrollLayer />
          </ScreenUIScrollProvider>
        </UserScreen>
      </UserFocus>
      <EffectComposerMain width={viewwidth} height={viewheight}>
        <>
          {shouldcrt && (
            <>
              {scanlines && <Scanlines />}
              <Vignette
                technique={VignetteTechnique.ESKIL}
                offset={0.89}
                darkness={0.911}
              />
              <CRTShape viewheight={viewheight} />
            </>
          )}
        </>
      </EffectComposerMain>
    </>
  )
}
