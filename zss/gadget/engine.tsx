import { useDetectGPU } from '@react-three/drei'
import { addAfterEffect, addEffect, useThree } from '@react-three/fiber'
import {
  Bloom,
  EffectComposer,
  Glitch,
  Noise,
  Scanline,
  Vignette,
} from '@react-three/postprocessing'
import { deviceType, primaryInput } from 'detect-it'
import {
  BlendFunction,
  GlitchMode,
  KernelSize,
  VignetteTechnique,
} from 'postprocessing'
import { Fragment, useEffect, useLayoutEffect, useState } from 'react'
import Stats from 'stats.js'
import { RUNTIME, STATS_DEV } from 'zss/config'
import { readconfig, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { CRTShape } from 'zss/gadget/fx/crt'
import { doasync } from 'zss/mapping/func'
import { Tape } from 'zss/tape/component'

import { useDeviceData, useMedia } from './hooks'
import { ScreenUI } from './screenui/component'
import { TapeToast } from './toast'
import { UserFocus } from './userinput'
import { UserScreen } from './userscreen'
import { TapeViewImage } from './viewimage'

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
  const gputier = useDetectGPU({ benchmarksURL: '/benchmarks-min' })

  // read config
  const [forcelowrez, setforcelowrez] = useState(false)
  const [crt, setcrt] = useState(false)
  const [scanlines, setscanlines] = useState(false)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const lowrez = await readconfig('lowrez')
      if (lowrez === 'on') {
        setforcelowrez(true)
      }
      const crt = await readconfig('crt')
      if (crt === 'on') {
        setcrt(true)
      }
      const scanlines = await readconfig('scanlines')
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
    gputier.tier > 2 &&
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

  const { mood } = useMedia()
  return (
    <>
      <UserFocus>
        <UserScreen>
          <ScreenUI />
          <Tape />
          <TapeToast />
          <TapeViewImage />
        </UserScreen>
      </UserFocus>
      {shouldcrt && (
        <EffectComposer multisampling={8}>
          <>
            {mood.includes('dark') && (
              <Fragment key="mood">
                <Glitch
                  delay={[10, 60 * 2]} // min and max glitch delay
                  duration={[0.1, 3.0]} // min and max glitch duration
                  strength={[0, 1]} // min and max glitch strength
                  mode={GlitchMode.SPORADIC} // glitch mode
                  active // turn on/off the effect (switches between "mode" prop and GlitchMode.DISABLED)
                  ratio={0.5} // Threshold for strong glitches, 0 - no weak glitches, 1 - no strong glitches.
                />
                <Noise
                  opacity={0.5}
                  premultiply // enables or disables noise premultiplication
                  blendFunction={BlendFunction.DARKEN} // blend mode
                />
              </Fragment>
            )}
            {mood.includes('bright') && (
              <Fragment key="mood">
                <Bloom
                  intensity={0.5}
                  luminanceThreshold={0.5}
                  kernelSize={KernelSize.VERY_LARGE}
                />
              </Fragment>
            )}
            {scanlines && (
              <Scanline blendFunction={BlendFunction.OVERLAY} density={1.28} />
            )}
          </>
          <Vignette
            technique={VignetteTechnique.ESKIL}
            offset={0.89}
            darkness={0.911}
          />
          <CRTShape viewheight={viewheight} />
        </EffectComposer>
      )}
    </>
  )
}
