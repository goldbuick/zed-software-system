import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { useRef } from 'react'
import { Group } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { layersreadcontrol, VIEWSCALE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'

import Clipping from '../clipping'
import { TapeTerminalInspector } from '../inspector/component'

import { FlatLayer } from './flatlayer'

type FramedProps = {
  width: number
  height: number
}

export function FlatGraphics({ width, height }: FramedProps) {
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()

  const cornerref = useRef<Group>(null)
  const panref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const recenterref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (
      !cornerref.current ||
      !panref.current ||
      !zoomref.current ||
      !recenterref.current
    ) {
      return
    }

    // camera focus logic
    const control = layersreadcontrol(
      useGadgetClient.getState().gadget.layers ?? [],
    )

    // setup tracking state
    if (!ispresent(panref.current.userData.focusx)) {
      zoomref.current.scale.setScalar(control.viewscale)
      panref.current.userData = {
        focusx: control.focusx,
        focusy: control.focusy,
        tfocusx: control.focusx,
        tfocusy: control.focusy,
        facing: control.facing,
      }
      panref.current.position.set(
        -control.focusx * RUNTIME.DRAW_CHAR_WIDTH(),
        -control.focusy * RUNTIME.DRAW_CHAR_HEIGHT(),
        0,
      )
    }

    const animrate = 0.25
    const focusx = panref.current.userData.focusx
    const focusy = panref.current.userData.focusy
    const fx = focusx * RUNTIME.DRAW_CHAR_WIDTH()
    const fy = focusy * RUNTIME.DRAW_CHAR_HEIGHT()

    // pan
    damp3(panref.current.position, [-fx, -fy, 0], animrate, delta)

    // scale
    const dfocusx = Math.abs(
      panref.current.userData.focusx - panref.current.userData.tfocusx,
    )
    const dfocusy = Math.abs(
      panref.current.userData.focusy - panref.current.userData.tfocusy,
    )
    if (dfocusx < 1 && dfocusy < 1) {
      damp3(zoomref.current.scale, control.viewscale, animrate, delta)
    }
    const viewscale = zoomref.current.scale.x
    console.info({ viewscale })

    const invviewscale = 1 / viewscale
    const scaledelta = Math.abs(viewscale - control.viewscale)
    const isscaling = scaledelta > 0.01
    const isnear = viewscale < (VIEWSCALE.MID as number)

    const sfx = viewscale * RUNTIME.DRAW_CHAR_WIDTH()
    const dfx = sfx - RUNTIME.DRAW_CHAR_WIDTH()
    const ofx = dfx * invviewscale
    const rfx = RUNTIME.DRAW_CHAR_WIDTH() + ofx

    const sfy = viewscale * RUNTIME.DRAW_CHAR_HEIGHT()
    const dfy = sfy - RUNTIME.DRAW_CHAR_HEIGHT()
    const ofy = dfy * invviewscale
    const rfy = RUNTIME.DRAW_CHAR_HEIGHT() + ofy

    // re-center should be zero when scale is 1
    recenterref.current.position.set(fx - focusx * rfx, fy - focusy * rfy, 0)

    // smooth viewscale
    const drawwidth = RUNTIME.DRAW_CHAR_WIDTH() * viewscale
    const drawheight = RUNTIME.DRAW_CHAR_HEIGHT() * viewscale
    const cols = viewwidth / drawwidth
    const rows = viewheight / drawheight

    if (isscaling) {
      // snap to player when zooming
      panref.current.userData.tfocusx = control.focusx + 0.5
      panref.current.userData.tfocusy = control.focusy + 0.5
    }

    // framing
    cornerref.current.position.set(viewwidth * 0.5, viewheight * 0.5, 0)

    if (!isscaling) {
      if (isnear) {
        // centered
        panref.current.userData.tfocusx = control.focusx + 0.5
        panref.current.userData.tfocusy = control.focusy + 0.5
      } else {
        // panning
        const zonex = Math.round(cols * 0.25)
        const zoney = Math.round(rows * 0.25)

        const dx = Math.round(panref.current.userData.tfocusx - control.focusx)
        if (Math.abs(dx) >= zonex) {
          const step = dx < 0 ? zonex : -zonex
          panref.current.userData.tfocusx += step * 2
        }

        const dy = Math.round(panref.current.userData.tfocusy - control.focusy)
        if (Math.abs(dy) >= zoney) {
          const step = dy < 0 ? zoney : -zoney
          panref.current.userData.tfocusy += step * 2
        }
      }
    }

    // edge clamp
    const left = Math.round(cols * 0.5)
    const top = Math.round(rows * 0.5)
    const right = control.width - cols * 0.5
    const bottom = control.height - rows * 0.5
    const marginx = -Math.round((cols - control.width) * 0.5)
    const marginy = -Math.round((rows - control.height) * 0.5)

    if (marginx >= 0) {
      if (panref.current.userData.tfocusx < left) {
        if (isscaling) {
          panref.current.userData.focusx = left
        }
        panref.current.userData.tfocusx = left
      }
      if (panref.current.userData.tfocusx > right) {
        if (isscaling) {
          panref.current.userData.focusx = right
        }
        panref.current.userData.tfocusx = right
      }
    } else {
      panref.current.userData.tfocusx = left + marginx
    }

    if (marginy >= 0) {
      if (panref.current.userData.tfocusy < top) {
        if (isscaling) {
          panref.current.userData.focusy = top
        }
        panref.current.userData.tfocusy = top
      }
      if (panref.current.userData.tfocusy > bottom) {
        if (isscaling) {
          panref.current.userData.focusy = bottom
        }
        panref.current.userData.tfocusy = bottom
      }
    } else {
      panref.current.userData.tfocusy = top + marginy
    }

    // smoothed change in focus
    damp(
      panref.current.userData,
      'focusx',
      panref.current.userData.tfocusx,
      animrate,
    )
    damp(
      panref.current.userData,
      'focusy',
      panref.current.userData.tfocusy,
      animrate,
    )
  })

  // re-render only when layer count changes
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  const {
    over = [],
    under = [],
    layers = [],
  } = useGadgetClient.getState().gadget

  return (
    <Clipping width={viewwidth} height={viewheight}>
      <group ref={cornerref}>
        <group ref={panref}>
          <group ref={zoomref}>
            <group ref={recenterref}>
              <TapeTerminalInspector />
              {under.map((layer, i) => (
                <FlatLayer
                  key={layer.id}
                  from="under"
                  id={layer.id}
                  z={i * 2}
                />
              ))}
              {layers.map((layer, i) => (
                <FlatLayer
                  key={layer.id}
                  from="layers"
                  id={layer.id}
                  z={under.length + i * 2}
                />
              ))}
              {over.map((layer, i) => (
                <FlatLayer
                  key={layer.id}
                  from="over"
                  id={layer.id}
                  z={under.length + layers.length + i * 2}
                />
              ))}
            </group>
          </group>
        </group>
      </group>
    </Clipping>
  )
}
