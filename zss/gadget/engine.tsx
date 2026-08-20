import { OrthographicCamera, useDetectGPU } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { deviceType, primaryInput } from 'detect-it'
import { damp } from 'maath/easing'
import { VignetteEffect } from 'postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RUNTIME } from 'zss/config'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { isclimode } from 'zss/feature/detect'
import { storagereadconfig } from 'zss/feature/storage'
import { isjoin } from 'zss/feature/url'
import { useDeviceData } from 'zss/gadget/device'
import { CRTShape } from 'zss/gadget/fx/crt'
import { useCRTAnim } from 'zss/gadget/fx/crtanim'
import { EffectComposerMain } from 'zss/gadget/graphics/effectcomposer'
import { PerfHud } from 'zss/perf/hud'
import { createplatform, haltplatform } from 'zss/platform'
import { ScreenUILayout } from 'zss/screens/screenui/layout'
import { ScreenUIScrollLayer } from 'zss/screens/screenui/scrolllayer'
import { ScreenUIScrollProvider } from 'zss/screens/screenui/scrollprovider'
import { TapeComponent } from 'zss/screens/tape/component'

import { AirshareView } from './airshareview'
import { BoardFadeOverlay } from './boardfadeoverlay'
import { Scanlines } from './fx/scanlines'
import { useMedia } from './media'
import { TapeToastConnected } from './toast'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'
import { TapeViewImage } from './viewimage'
import { WorkStatusBadgeConnected } from './workstatus'

const VIGNETTE_DARKNESS_LIGHT = 0.44
const VIGNETTE_DARKNESS_DARK = 0.66
/** maath damp smoothTime -- seconds to approach target. */
const VIGNETTE_ANIM_RATE = 0.997

function MoodVignette({ dark }: { dark: boolean }) {
  const target = dark ? VIGNETTE_DARKNESS_DARK : VIGNETTE_DARKNESS_LIGHT
  const targetref = useRef(target)
  targetref.current = target
  const effect = useMemo(
    () =>
      new VignetteEffect({
        offset: 0.001,
        darkness: target,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot; damp drives darkness
    [],
  )
  useEffect(() => () => effect.dispose(), [effect])
  useFrame((_, delta) => {
    const darkness = effect.uniforms.get('darkness')
    if (!darkness) {
      return
    }
    damp(darkness, 'value', targetref.current, VIGNETTE_ANIM_RATE, delta)
  })
  return <primitive object={effect} dispose={null} />
}

export function Engine() {
  const { mood } = useMedia()
  const { viewport } = useThree()
  const { width: viewwidth, height: viewheight } = viewport.getCurrentViewport()
  const crtref = useRef<any>(null)

  useEffect(() => {
    return useCRTAnim.subscribe((s) => {
      const fx = crtref.current
      if (!fx) {
        return
      }
      const u = fx.uniforms
      u.get('curveamptarget').value = s.curveamp.target
      u.get('curveampstart').value = s.curveamp.start
      u.get('curveampduration').value = s.curveamp.duration
    })
  }, [])

  // runs the SIM
  useEffect(() => {
    createplatform(isjoin(), isclimode())
    return () => {
      haltplatform()
    }
  }, [])

  // detect gpu info
  const gputier = useDetectGPU()

  // read config
  const [forcelowrez, setforcelowrez] = useState(false)
  const [forcetouchui, setforcetouchui] = useState(false)
  const [crt, setcrt] = useState(false)
  const [scanlines, setscanlines] = useState(false)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const lowrez = await storagereadconfig('lowrez')
      if (lowrez === 'on') {
        setforcelowrez(true)
      }
      const touchui = await storagereadconfig('touchui')
      if (touchui === 'on') {
        setforcetouchui(true)
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
    deviceType === 'touchOnly' || primaryInput === 'touch' || forcetouchui
  /** Touch-primary devices, durable touchui. */
  const usemobiletextcapture =
    (deviceType === 'touchOnly' && primaryInput === 'touch') || forcetouchui

  // config FX
  const shouldcrt =
    !islowrez &&
    !showtouchcontrols &&
    crt === true &&
    gputier &&
    (gputier.tier > 2 || gputier.gpu?.includes('apple gpu')) &&
    !gputier.isMobile

  // update device config + touch sidebar defaults
  useEffect(() => {
    useDeviceData.setState((state) => {
      // Touch: stats always open (portrait push + landscape column). Desktop: open.
      const sidebaropen = true
      return {
        ...state,
        islowrez,
        islandscape,
        showtouchcontrols,
        crtactive: !!shouldcrt,
        usemobiletextcapture,
        sidebaropen,
        sidebarclosing: false,
      }
    })
  }, [
    islowrez,
    islandscape,
    showtouchcontrols,
    shouldcrt,
    usemobiletextcapture,
  ])

  return (
    <>
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
      />
      <PerfHud />
      <UserFocus>
        <UserScreen>
          <ScreenUIScrollProvider>
            <ScreenUILayout />
            <TapeComponent />
            <TapeToastConnected />
            <WorkStatusBadgeConnected />
            <TapeViewImage />
            <AirshareView />
            <ScreenUIScrollLayer />
            <BoardFadeOverlay />
          </ScreenUIScrollProvider>
        </UserScreen>
      </UserFocus>
      <EffectComposerMain width={viewwidth} height={viewheight}>
        <>
          {shouldcrt && (
            <>
              {scanlines && <Scanlines />}
              <MoodVignette dark={mood.includes('dark')} />
              <CRTShape
                ref={crtref}
                viewheight={viewheight}
                curvebase={0.005}
              />
            </>
          )}
        </>
      </EffectComposerMain>
    </>
  )
}
