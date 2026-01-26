import { OrthographicCamera, useDetectGPU } from '@react-three/drei'
import { addAfterEffect, addEffect, useThree } from '@react-three/fiber'
import { Vignette } from '@react-three/postprocessing'
import { deviceType, primaryInput } from 'detect-it'
import { VignetteTechnique } from 'postprocessing'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Stats from 'stats.js'
import { OrthographicCamera as OrthographicCameraImpl } from 'three'
import { RUNTIME, STATS_DEV } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { isjoin } from 'zss/feature/url'
import { CRTShape } from 'zss/gadget/fx/crt'
import { doasync } from 'zss/mapping/func'
import { createplatform, haltplatform } from 'zss/platform'
import { ScreenUIComponent } from 'zss/screens/screenui/component'
import { TapeComponent } from 'zss/screens/tape/component'
import { isfirefox, islinux } from 'zss/words/system'

import { useTape } from './data/state'
import { Scanlines } from './fx/scanlines'
import { EffectComposerMain } from './graphics/effectcomposermain'
import { useDeviceData } from './hooks'
import { Rect } from './rect'
import { TapeToast } from './toast'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'
import { TapeViewImage } from './viewimage'

// include all front-end devices
import 'zss/userspace'

export function Engine() {
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()

  // runs the SIM
  useEffect(() => {
    createplatform(isjoin())
    return () => {
      haltplatform()
    }
  }, [])

  // handle showing render stats
  const [stats] = useState(() => new Stats())
  useEffect(() => {
    if (!STATS_DEV) {
      return
    }
    document.body.appendChild(stats.dom)
    stats.showPanel(0)
    stats.dom.style.cssText = 'position:fixed;bottom:0;left:0;z-index:2;'
    const begin = addEffect(() => stats.begin())
    const end = addAfterEffect(() => stats.end())
    return () => {
      document.body.removeChild(stats.dom)
      begin()
      end()
    }
  }, [stats])

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
      if (crt === 'on' && !islinux) {
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
      }
    })
  }, [islowrez, islandscape, showtouchcontrols])

  // current toast message
  const { toast } = useTape()

  // click to un-mute overlay for firefox
  const [showunmute, setshowunmute] = useState(isfirefox)

  const cameraref = useRef<OrthographicCameraImpl>(null)
  return (
    <>
      <OrthographicCamera
        ref={cameraref}
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <UserFocus>
        <UserScreen>
          <ScreenUIComponent />
          <TapeComponent />
          <TapeToast toast={toast} />
          <TapeViewImage />
          {showunmute && (
            <>
              <Rect
                blocking
                opacity={0.5}
                color="black"
                cursor="pointer"
                width={Math.ceil(viewwidth / RUNTIME.DRAW_CHAR_WIDTH())}
                height={Math.ceil(viewheight / RUNTIME.DRAW_CHAR_HEIGHT())}
                onClick={() => setshowunmute(false)}
              />
              <TapeToast toast="Click to un-mute" />
            </>
          )}
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
