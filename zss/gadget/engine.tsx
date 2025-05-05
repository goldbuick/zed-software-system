import { useDetectGPU } from '@react-three/drei'
import { addEffect, addAfterEffect, useThree } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Glitch,
  Noise,
  Scanline,
  Vignette,
} from '@react-three/postprocessing'
import { deviceType, primaryInput } from 'detect-it'
import { BlendFunction, GlitchMode } from 'postprocessing'
import { Fragment, useEffect, useState } from 'react'
import Stats from 'stats.js'
import {
  FORCE_CRT_OFF,
  FORCE_LOW_REZ,
  FORCE_TOUCH_UI,
  RUNTIME,
  STATS_DEV,
} from 'zss/config'
import { CRTShape } from 'zss/gadget/fx/crt'

import { useDeviceConfig, useMedia } from './hooks'
import { PanelLayout } from './panellayout'
import { Tape } from './tape'
import { TapeToast } from './toast'
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
  const gputier = useDetectGPU()

  // config DRAW_CHAR_SCALE
  const minrez = Math.min(viewwidth, viewheight)
  const islowrez = minrez < 600 || FORCE_LOW_REZ
  RUNTIME.DRAW_CHAR_SCALE = islowrez ? 1 : 2

  // config LAYOUT
  const islandscape = viewwidth > viewheight
  const showtouchcontrols =
    FORCE_TOUCH_UI || deviceType === 'touchOnly' || primaryInput === 'touch'

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

  const { mood } = useMedia()
  return (
    <>
      <UserFocus>
        <UserScreen>
          <PanelLayout />
          <Tape />
          <TapeToast />
        </UserScreen>
      </UserFocus>
      {shouldcrt && (
        <EffectComposer>
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
                  premultiply // enables or disables noise premultiplication
                  blendFunction={BlendFunction.ADD} // blend mode
                />
                <ChromaticAberration
                  blendFunction={BlendFunction.NORMAL} // blend mode
                  offset={[0.0005, 0]} // color offset
                />
              </Fragment>
            )}
          </>
          <Vignette eskil offset={0.89} darkness={1.4} />
          <CRTShape viewheight={viewheight} />
        </EffectComposer>
      )}
    </>
  )
}
