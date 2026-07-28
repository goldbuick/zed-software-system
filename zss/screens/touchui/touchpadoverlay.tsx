import nipplejs from 'nipplejs'
import { useEffect, useMemo, useRef } from 'react'
import {
  useDeviceData,
  type TOUCHPAD_ZONE,
  type TOUCHPADS,
} from 'zss/gadget/device'
import { INPUT_RATE } from 'zss/gadget/userinput'
import { modpositive, snap } from 'zss/mapping/number'
import { useShallow } from 'zustand/react/shallow'

import { handlestickdirsmerged } from './stickinputs'

type Manager = ReturnType<typeof nipplejs.create>

/** Landscape stick vertical center (below midline for thumb reach). */
const LANDSCAPE_PAD_TOP = '68%'

type PadLayout = {
  movezone: TOUCHPAD_ZONE
  shootzone: TOUCHPAD_ZONE
  movesize: number
  shootsize: number
  moveposition: { left: string; top: string }
  shootposition: { left: string; top: string }
}

/**
 * Map nipplejs degrees (0=right, 90=up) to stickinputs degrees (0=left, 90=up).
 */
function snapfromnippleangle(degree: number, force: number): number | null {
  if (force < 0.15) {
    return null
  }
  const stickdeg = modpositive(180 - degree, 360)
  return modpositive(snap(stickdeg, 45), 360)
}

function zonekey(zone: TOUCHPAD_ZONE) {
  return `${zone.left},${zone.top},${zone.width},${zone.height}`
}

function basesizefor(zone: TOUCHPAD_ZONE) {
  return Math.max(24, Math.floor(Math.min(zone.width, zone.height) * 0.7))
}

function buildpadlayout(
  pads: TOUCHPADS,
  islandscape: boolean,
): PadLayout {
  const movebase = basesizefor(pads.move)
  const shootbase = basesizefor(pads.shoot)
  if (!islandscape) {
    return {
      movezone: pads.move,
      shootzone: pads.shoot,
      movesize: movebase,
      shootsize: shootbase,
      moveposition: { left: '50%', top: '50%' },
      shootposition: { left: '50%', top: '50%' },
    }
  }
  const movesize = movebase * 2
  const shootsize = shootbase * 2
  const moveradius = movesize * 0.5
  const shootradius = shootsize * 0.5
  return {
    movezone: {
      left: pads.move.left,
      top: pads.move.top,
      width: pads.move.width + moveradius,
      height: pads.move.height,
    },
    shootzone: {
      left: pads.shoot.left - shootradius,
      top: pads.shoot.top,
      width: pads.shoot.width + shootradius,
      height: pads.shoot.height,
    },
    movesize,
    shootsize,
    moveposition: {
      left: `${pads.move.width}px`,
      top: LANDSCAPE_PAD_TOP,
    },
    shootposition: {
      left: `${shootradius}px`,
      top: LANDSCAPE_PAD_TOP,
    },
  }
}

function layoutkey(layout: PadLayout | null, islandscape: boolean) {
  if (!layout) {
    return ''
  }
  return [
    islandscape ? 'L' : 'P',
    zonekey(layout.movezone),
    zonekey(layout.shootzone),
    layout.movesize,
    layout.shootsize,
    layout.moveposition.left,
    layout.moveposition.top,
    layout.shootposition.left,
    layout.shootposition.top,
  ].join('|')
}

function createmanager(
  zoneel: HTMLDivElement,
  size: number,
  position: { left: string; top: string },
): Manager {
  return nipplejs.create({
    zone: zoneel,
    mode: 'static',
    position,
    size,
    restOpacity: 0.55,
    color: '#ccc',
    dynamicPage: true,
  })
}

/**
 * DOM dual touchpads (MOVE left / SHOOT right) above the WebGL canvas.
 * Joystick visuals/input via nipplejs; merge path stays stickinputs.
 */
export function TouchPadOverlay() {
  const { showtouchcontrols, touchpads, islandscape } = useDeviceData(
    useShallow((state) => ({
      showtouchcontrols: state.showtouchcontrols,
      touchpads: state.touchpads,
      islandscape: state.islandscape,
    })),
  )

  const layout = useMemo(() => {
    if (!touchpads) {
      return null
    }
    return buildpadlayout(touchpads, islandscape)
  }, [touchpads, islandscape])

  const moveref = useRef<HTMLDivElement>(null)
  const shootref = useRef<HTMLDivElement>(null)
  const leftsnap = useRef<number | null>(null)
  const rightsnap = useRef<number | null>(null)
  const leftactive = useRef(false)
  const rightactive = useRef(false)

  const padlayout = layoutkey(layout, islandscape)

  useEffect(() => {
    const moveel = moveref.current
    const shootel = shootref.current
    if (!showtouchcontrols || !layout || !moveel || !shootel) {
      leftsnap.current = null
      rightsnap.current = null
      leftactive.current = false
      rightactive.current = false
      handlestickdirsmerged(null, null, false)
      return
    }

    const movemanager = createmanager(
      moveel,
      layout.movesize,
      layout.moveposition,
    )
    const shootmanager = createmanager(
      shootel,
      layout.shootsize,
      layout.shootposition,
    )

    function applymerged() {
      handlestickdirsmerged(
        leftsnap.current,
        rightsnap.current,
        leftactive.current || rightactive.current,
      )
    }

    movemanager.on('start', () => {
      leftactive.current = true
      applymerged()
    })
    movemanager.on('move', (evt) => {
      leftsnap.current = snapfromnippleangle(
        evt.data.angle.degree,
        evt.data.force,
      )
      applymerged()
    })
    movemanager.on('end', () => {
      leftsnap.current = null
      leftactive.current = false
      applymerged()
    })

    shootmanager.on('start', () => {
      rightactive.current = true
      applymerged()
    })
    shootmanager.on('move', (evt) => {
      rightsnap.current = snapfromnippleangle(
        evt.data.angle.degree,
        evt.data.force,
      )
      applymerged()
    })
    shootmanager.on('end', () => {
      rightsnap.current = null
      rightactive.current = false
      applymerged()
    })

    const timer = window.setInterval(() => {
      if (leftactive.current || rightactive.current) {
        applymerged()
      }
    }, INPUT_RATE)

    return () => {
      window.clearInterval(timer)
      movemanager.destroy()
      shootmanager.destroy()
      leftsnap.current = null
      rightsnap.current = null
      leftactive.current = false
      rightactive.current = false
      handlestickdirsmerged(null, null, false)
    }
    // layout object identity changes; padlayout encodes geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- padlayout is the geometry key
  }, [showtouchcontrols, padlayout])

  if (!showtouchcontrols || !layout) {
    return null
  }

  return (
    <>
      <div
        ref={moveref}
        className="touchpad-zone"
        aria-hidden
        data-touchpad="move"
        style={{
          left: layout.movezone.left,
          top: layout.movezone.top,
          width: layout.movezone.width,
          height: layout.movezone.height,
        }}
      />
      <div
        ref={shootref}
        className="touchpad-zone"
        aria-hidden
        data-touchpad="shoot"
        style={{
          left: layout.shootzone.left,
          top: layout.shootzone.top,
          width: layout.shootzone.width,
          height: layout.shootzone.height,
        }}
      />
    </>
  )
}
