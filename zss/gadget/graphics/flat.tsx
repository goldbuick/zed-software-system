import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  Group,
  OrthographicCamera as OrthographicCameraImpl,
  Vector3,
} from 'three'
import { FLAT_CAMERA_ORTHO_ASSERT, RUNTIME } from 'zss/config'
import { layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { BOARD_INSPECTOR_Z_BUFFER } from 'zss/gadget/graphics/boardinspectorz'
import {
  FOCUS_ANIM_RATE,
  initfocusifneeded,
  isfocuspanphase,
  readgridbias,
  stashfocusexitsnap,
  stepfocuswithboardtransition,
} from 'zss/gadget/graphics/camerafocus'
import {
  buildexitpreviewgroups,
  gadgettoexitsnap,
} from 'zss/gadget/graphics/exitpreviewgroups'
import {
  flatcameradevassertboardinortho,
  flatcameratargetfocus,
} from 'zss/gadget/graphics/flatcamerabounds'
import { FlatLayer } from 'zss/gadget/graphics/flatlayer'
import { maptolayerz } from 'zss/gadget/graphics/layerz'
import {
  PANVIEW_IDLE,
  type PanView,
  panviewequals,
  readboardgridforrender,
  resolvepanviewforrender,
  syncliveboardworldoffset,
} from 'zss/gadget/graphics/panviewsync'
import { tickerpublishfromtickers } from 'zss/gadget/graphics/tickeranchors'
import { clamp } from 'zss/mapping/number'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { InspectorComponent } from 'zss/screens/inspector/component'

import { RenderLayer } from './renderlayer'

type GraphicsProps = {
  width: number
  height: number
}

export const FlatGraphics = memo(function FlatGraphics({
  width,
  height,
}: GraphicsProps) {
  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const viewwidth = width * RUNTIME.DRAW_CHAR_WIDTH()
  const viewheight = height * RUNTIME.DRAW_CHAR_HEIGHT()
  const boarddrawwidth = BOARD_WIDTH * drawwidth
  const boarddrawheight = BOARD_HEIGHT * drawheight
  const centerx = viewwidth * -0.5
  const centery = viewheight * -0.5

  const cameraref = useRef<OrthographicCameraImpl>(null)
  const [boardcamera, setboardcamera] = useState<OrthographicCameraImpl | null>(
    null,
  )
  const cornerref = useRef<Group>(null)
  const liveboardref = useRef<Group>(null)
  const zoomref = useRef<Group>(null)
  const underref = useRef<Group>(null)
  const looktarget = useRef(new Vector3())
  const [panview, setpanview] = useState<PanView>(PANVIEW_IDLE)
  const panviewref = useRef(panview)
  panviewref.current = panview

  const bindboardcamera = useCallback((c: OrthographicCameraImpl | null) => {
    cameraref.current = c
    setboardcamera((prev) => (prev === c ? prev : c))
  }, [])

  useFrame((_, delta) => {
    if (
      !cameraref.current ||
      !zoomref.current ||
      !cornerref.current ||
      !underref.current
    ) {
      return
    }

    const gadget = useGadgetClient.getState().gadget
    const control = layersreadcontrol(gadget.layers ?? [])
    const currentboard = gadget.board

    // tracking state
    const userdata = (cameraref.current.userData ??= {})
    if (initfocusifneeded(userdata, control, currentboard)) {
      zoomref.current.scale.setScalar(control.viewscale)
    }

    // zoom
    damp3(zoomref.current.scale, control.viewscale, FOCUS_ANIM_RATE, delta)

    const viewscale = zoomref.current.scale.x
    const { tfocusx, tfocusy } = flatcameratargetfocus({
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      viewscale,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: control.focusx,
      controlfocusy: control.focusy,
    })

    stepfocuswithboardtransition(
      userdata,
      control,
      currentboard,
      tfocusx,
      tfocusy,
      delta,
    )
    stashfocusexitsnap(userdata, gadgettoexitsnap(gadget))

    const bias = readgridbias(userdata)
    const panphase = isfocuspanphase(userdata)
    const nextpanview: PanView = {
      panphase,
      biasdx: bias.dx,
      biasdy: bias.dy,
    }
    // Schedule React commit only -- never flushSync mid-useFrame (remount race = void).
    // Live board offset waits for useLayoutEffect after the strip mounts.
    if (!panviewequals(nextpanview, panviewref.current)) {
      setpanview(nextpanview)
    }
    const visualpan = resolvepanviewforrender(
      panviewref.current,
      userdata,
      currentboard,
    )

    const fx = (userdata.focusx + 0.5) * drawwidth
    const fy = (userdata.focusy + 0.5) * drawheight

    // Focus cell center at portal origin: center + scale * (corner + local) = 0
    const targetcornerx = -centerx / viewscale - fx
    const targetcornery = -centery / viewscale - fy

    if (visualpan.panphase && visualpan.biasdx !== 0) {
      // Cardinal east/west: damp X only; hold Y so corner cannot drift diagonal.
      cornerref.current.position.y = targetcornery
      damp(cornerref.current.position, 'x', targetcornerx, FOCUS_ANIM_RATE, delta)
    } else if (visualpan.panphase && visualpan.biasdy !== 0) {
      cornerref.current.position.x = targetcornerx
      damp(cornerref.current.position, 'y', targetcornery, FOCUS_ANIM_RATE, delta)
    } else {
      damp3(
        cornerref.current.position,
        [targetcornerx, targetcornery, 0],
        FOCUS_ANIM_RATE,
        delta,
      )
    }

    if (FLAT_CAMERA_ORTHO_ASSERT) {
      const boardwscaled = BOARD_WIDTH * drawwidth * viewscale
      const boardhscaled = BOARD_HEIGHT * drawheight * viewscale
      flatcameradevassertboardinortho({
        centerx,
        centery,
        viewscale,
        cornerx: cornerref.current.position.x,
        cornery: cornerref.current.position.y,
        drawwidth,
        drawheight,
        boardwidth: BOARD_WIDTH,
        boardheight: BOARD_HEIGHT,
        viewwidth,
        viewheight,
        cellepsilon: drawwidth * viewscale,
        checkhoriz: viewwidth <= boardwscaled,
        checkvert: viewheight <= boardhscaled,
      })
    }

    const cam = cameraref.current
    cam.up.set(0, 1, 0)
    looktarget.current.set(0, 0, 0)
    cam.position.set(0, 0, 1000)
    cam.lookAt(looktarget.current)
    cam.updateMatrixWorld()

    tickerpublishfromtickers({
      tickers: gadget.tickers ?? [],
      layers: gadget.layers ?? [],
      boardgroup: cornerref.current,
      camera: cam,
      drawwidth,
      drawheight,
      cols: width,
      rows: height,
    })

    // under board corner inset (same framing as iso / mode7 / fpv)
    const xscale = clamp(viewwidth / boarddrawwidth, 1.0, 10.0)
    const yscale = clamp(viewheight / boarddrawheight, 1.0, 10.0)
    const rscale = Math.max(xscale, yscale)
    const rwidth = boarddrawwidth * rscale
    const rheight = boarddrawheight * rscale
    underref.current.position.x = viewwidth - rwidth
    underref.current.position.y = viewheight - rheight
    underref.current.scale.setScalar(rscale)
  })

  // re-render when board or layer counts change (board change must trigger re-render)
  useGadgetClient((state) => state.gadget.board)
  useGadgetClient((state) => state.gadget.over?.length ?? 0)
  useGadgetClient((state) => state.gadget.under?.length ?? 0)
  useGadgetClient((state) => state.gadget.layers?.length ?? 0)
  useGadgetClient((state) => state.gadget.exiteast)
  useGadgetClient((state) => state.gadget.exitwest)
  useGadgetClient((state) => state.gadget.exitnorth)
  useGadgetClient((state) => state.gadget.exitsouth)
  useGadgetClient((state) => state.gadget.exiteast2)
  useGadgetClient((state) => state.gadget.exitwest2)
  useGadgetClient((state) => state.gadget.exitnorth2)
  useGadgetClient((state) => state.gadget.exitsouth2)
  useGadgetClient((state) => state.gadget.exitne)
  useGadgetClient((state) => state.gadget.exitnw)
  useGadgetClient((state) => state.gadget.exitse)
  useGadgetClient((state) => state.gadget.exitsw)

  const { gadget, layercachemap } = useGadgetClient.getState()
  const { over = [], under = [], layers = [] } = gadget
  const camuserdata = cameraref.current?.userData ?? {}
  const boardid = gadget.board ?? ''
  const visualpan = resolvepanviewforrender(panview, camuserdata, boardid)
  const rendergrid = readboardgridforrender(camuserdata, boardid)
  // Live board always at path-relative world slot (no settle snap / bias offset).
  useLayoutEffect(() => {
    syncliveboardworldoffset(
      liveboardref.current,
      cameraref.current?.userData ?? {},
      boardid,
      drawwidth,
      drawheight,
    )
  }, [
    boardid,
    rendergrid.x,
    rendergrid.y,
    visualpan.panphase,
    visualpan.biasdx,
    visualpan.biasdy,
    drawwidth,
    drawheight,
  ])
  const exitpreviewgroups = buildexitpreviewgroups(
    gadget,
    layercachemap,
    drawwidth,
    drawheight,
    {
      boardgridx: rendergrid.x,
      boardgridy: rendergrid.y,
      bias: { dx: visualpan.biasdx, dy: visualpan.biasdy },
      panphase: visualpan.panphase,
    },
  )

  // z of the topmost board layer (must stay in sync with FlatLayer z props below)
  const topoverz =
    over.length > 0 ? 1 + layers.length + (over.length - 1) * 2 : undefined
  const toplayersz = layers.length > 0 ? 1 + (layers.length - 1) * 2 : undefined
  const maintopz = topoverz ?? toplayersz ?? 1
  const exitzbase = maintopz + 2

  let maxcornerz = maintopz
  for (const { preview } of exitpreviewgroups) {
    for (const layer of preview.layers) {
      maxcornerz = Math.max(maxcornerz, exitzbase + maptolayerz(layer, 'flat'))
    }
  }
  const inspectorz = maxcornerz + BOARD_INSPECTOR_Z_BUFFER
  return (
    <>
      <RenderLayer
        camera={boardcamera}
        viewwidth={viewwidth}
        viewheight={viewheight}
        effects={<></>}
      >
        <orthographicCamera
          ref={bindboardcamera}
          left={viewwidth * -0.5}
          right={viewwidth * 0.5}
          top={viewheight * 0.5}
          bottom={viewheight * -0.5}
          near={0.1}
          far={2000}
          position={[0, 0, 1000]}
          onUpdate={(c) => c.updateProjectionMatrix()}
        />
        <group position={[centerx, centery, 0]}>
          <group ref={zoomref}>
            <group ref={cornerref}>
              <group ref={liveboardref}>
                {layers.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    from="layers"
                    id={layer.id}
                    z={1 + i * 2}
                  />
                ))}
                {over.map((layer, i) => (
                  <FlatLayer
                    key={layer.id}
                    from="over"
                    id={layer.id}
                    z={1 + layers.length + i * 2}
                  />
                ))}
              </group>
              {exitpreviewgroups.map(({ key, preview, position }) =>
                preview.layers.length > 0 ? (
                  <group key={key} position={position}>
                    {preview.layers.map((layer) => (
                      <FlatLayer
                        key={layer.id}
                        id={layer.id}
                        layers={preview.layers}
                        z={exitzbase + maptolayerz(layer, 'flat')}
                      />
                    ))}
                  </group>
                ) : null,
              )}
              <InspectorComponent z={inspectorz} />
            </group>
          </group>
        </group>
      </RenderLayer>
      <group ref={underref}>
        {under.map((layer, i) => (
          <FlatLayer key={layer.id} from="under" id={layer.id} z={i * 2} />
        ))}
      </group>
    </>
  )
})
