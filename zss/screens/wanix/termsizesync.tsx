import { useLayoutEffect, useRef } from 'react'
import { wanixservertermfit } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { iswanixready, onwanixready } from 'zss/device/wanixclient/wanixbridge'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'

const TERM_FIT_DEBOUNCE_MS = 100

type WanixTermSizeSyncProps = {
  /** Attach panel grid width in cells. Omit when panel closed. */
  width?: number
  /** Attach panel grid height in cells (includes hint bar row). */
  height?: number
}

function readwanixtermgridsize(width: number, height: number) {
  return {
    cols: Math.max(1, width),
    // Bottom row is the hint bar in WanixTermScreen — guest rows must match visible height.
    rows: Math.max(1, height - 1),
  }
}

/** Push termfit from attach panel geometry only (independent of tape). */
export function WanixTermSizeSync({ width, height }: WanixTermSizeSyncProps) {
  const attachpanelopen = useWanixClient((state) => state.attachpanelopen)
  const attachlayout = useWanixClient((state) => state.attachlayout)
  const attachedsessionkey = useWanixClient((state) => state.attachedsessionkey)
  const lastpush = useRef<{ cols: number; rows: number } | null>(null)

  const active =
    attachpanelopen &&
    attachedsessionkey != null &&
    width != null &&
    height != null &&
    width > 0 &&
    height > 0

  const cols = active ? readwanixtermgridsize(width, height).cols : 0
  const rows = active ? readwanixtermgridsize(width, height).rows : 0

  useLayoutEffect(() => {
    lastpush.current = null
  }, [attachedsessionkey])

  useLayoutEffect(() => {
    if (!active) {
      return
    }
    const timer = setTimeout(() => {
      if (lastpush.current?.cols === cols && lastpush.current?.rows === rows) {
        return
      }
      const pushfit = () => {
        wanixservertermfit(SOFTWARE, registerreadplayer(), cols, rows)
        lastpush.current = { cols, rows }
      }
      if (iswanixready()) {
        pushfit()
      } else {
        onwanixready(pushfit)
      }
    }, TERM_FIT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [active, cols, rows, attachlayout, attachedsessionkey])

  return null
}
