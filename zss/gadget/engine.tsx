import { OrthographicCamera, useDetectGPU } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vignette } from '@react-three/postprocessing'
import { deviceType, primaryInput } from 'detect-it'
import { VignetteTechnique } from 'postprocessing'
import { useEffect, useLayoutEffect, useState } from 'react'
import { RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import { isclimode } from 'zss/feature/detect'
import { storagereadconfig } from 'zss/feature/storage'
import { isjoin } from 'zss/feature/url'
import { requestcanvassync } from 'zss/gadget/canvasrelayout'
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
import { isfirefox } from 'zss/words/system'

import { Scanlines } from './fx/scanlines'
import { Rect } from './rect'
import { TapeToast, TapeToastConnected } from './toast'
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
  const usetouchtextsync =
    deviceType === 'touchOnly' && primaryInput === 'touch'

  // config FX
  const shouldcrt =
    !islowrez &&
    !showtouchcontrols &&
    crt === true &&
    gputier &&
    (gputier.tier > 2 || gputier.gpu?.includes('apple gpu')) &&
    !gputier.isMobile

  useLayoutEffect(() => {
    requestcanvassync()
  }, [shouldcrt, islowrez])

  // update device config
  useEffect(() => {
    useDeviceData.setState((state) => {
      return {
        ...state,
        islowrez,
        islandscape,
        showtouchcontrols,
        usetouchtextsync,
      }
    })
  }, [islowrez, islandscape, showtouchcontrols, usetouchtextsync])

  // click to un-mute overlay for firefox
  const [showunmute, setshowunmute] = useState(isfirefox)

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
          {showunmute && (
            <>
              <Rect
                blocking
                opacity={0.5}
                color="black"
                cursor="pointer"
                width={Math.ceil(viewwidth / RUNTIME.DRAW_CHAR_WIDTH())}
                height={Math.ceil(viewheight / RUNTIME.DRAW_CHAR_HEIGHT())}
                onClick={() => {
                  enableaudio()
                  setshowunmute(false)
                }}
              />
              <TapeToast toast="Click to un-mute" />
            </>
          )}
        </UserScreen>
      </UserFocus>
      {shouldcrt && (
        <EffectComposerMain width={viewwidth} height={viewheight}>
          <>
            {scanlines && <Scanlines />}
            <Vignette
              technique={VignetteTechnique.ESKIL}
              offset={0.89}
              darkness={0.911}
            />
            <CRTShape viewheight={viewheight} />
          </>
        </EffectComposerMain>
      )}
    </>
  )
}
