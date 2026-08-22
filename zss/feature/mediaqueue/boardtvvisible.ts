import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  boardtvslidegateinitial,
  boardtvslidegateonclosed,
  boardtvslidegatestep,
} from 'zss/feature/mediaqueue/boardtvslidegate'
import {
  mediaqueuehelperconnected,
  mediaqueueisboundboard,
  mediaqueueislistening,
  mediaqueuenotifyboardtvgate,
  mediaqueuereadboardtvgatesnapshot,
  mediaqueuereadhelperforboard,
  mediaqueuesubscribeboardtvgate,
} from 'zss/feature/mediaqueue/listenstate'
import { mediaqueuereadplayerlayerstate } from 'zss/feature/mediaqueue/playerlayerstate'

let boardtvslideactive = false

export function mediaqueuesetboardtvslideactive(active: boolean) {
  if (boardtvslideactive === active) {
    return
  }
  boardtvslideactive = active
  mediaqueuenotifyboardtvgate()
}

export function mediaqueuereadboardtvslideactive(): boolean {
  return boardtvslideactive
}

export function mediaqueuehasvideo(screen: Record<string, unknown>): boolean {
  return Object.values(screen).some(
    (entry) => entry instanceof HTMLVideoElement,
  )
}

/** True when the board TV should render on this gadget board. */
export function boardtvshouldshow(
  gadgetboard: string,
  hasvideo: boolean,
): boolean {
  const board = gadgetboard.trim()
  if (!board) {
    return false
  }
  const layer = mediaqueuereadplayerlayerstate()
  if (layer.helperpeerid && layer.board === board) {
    return true
  }

  if (!mediaqueueislistening() || !mediaqueueisboundboard(board)) {
    return false
  }
  const helper = mediaqueuereadhelperforboard(board)
  return mediaqueuehelperconnected(helper) || hasvideo
}

/** Re-renders when helper listen / connect / slide-active state changes. */
export function useBoardTvVisible(
  gadgetboard: string,
  hasvideo: boolean,
): boolean {
  useSyncExternalStore(
    mediaqueuesubscribeboardtvgate,
    mediaqueuereadboardtvgatesnapshot,
    mediaqueuereadboardtvgatesnapshot,
  )
  return boardtvshouldshow(gadgetboard, hasvideo)
}

/**
 * FPV ceiling skip: keep ceiling off while the TV is sliding closed so the
 * roof does not pop in mid-exit.
 */
export function useBoardTvSkipCeiling(
  gadgetboard: string,
  hasvideo: boolean,
): boolean {
  useSyncExternalStore(
    mediaqueuesubscribeboardtvgate,
    mediaqueuereadboardtvgatesnapshot,
    mediaqueuereadboardtvgatesnapshot,
  )
  return (
    boardtvshouldshow(gadgetboard, hasvideo) ||
    mediaqueuereadboardtvslideactive()
  )
}

/** Hold-while-closing gate for BoardTvSink (tape PanelSlide lifecycle). */
export function useBoardTvSlideGate(wantshow: boolean) {
  const [gate, setgate] = useState(boardtvslidegateinitial)

  useEffect(() => {
    setgate((prev) => boardtvslidegatestep(prev, wantshow))
  }, [wantshow])

  useEffect(() => {
    mediaqueuesetboardtvslideactive(gate.active)
    return () => {
      mediaqueuesetboardtvslideactive(false)
    }
  }, [gate.active])

  return {
    active: gate.active,
    shouldclose: gate.shouldclose,
    onclosed() {
      setgate(boardtvslidegateonclosed())
    },
  }
}
