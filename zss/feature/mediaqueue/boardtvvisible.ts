import { useSyncExternalStore } from 'react'
import {
  mediaqueuehelperconnected,
  mediaqueueislistening,
  mediaqueuereadboardtvgatesnapshot,
  mediaqueuereadboundboardid,
  mediaqueuesubscribeboardtvgate,
} from 'zss/feature/mediaqueue/listenstate'
import { mediaqueuereadplayerlayerstate } from 'zss/feature/mediaqueue/playerlayerstate'

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
  const layer = mediaqueuereadplayerlayerstate()
  if (layer.helperpeerid && layer.board === gadgetboard) {
    return true
  }

  const bound = mediaqueuereadboundboardid()
  const listening = mediaqueueislistening()
  const helperup = mediaqueuehelperconnected()

  if (!listening || !bound) {
    return hasvideo
  }
  if (gadgetboard !== bound) {
    return false
  }
  return helperup || hasvideo
}

/** Re-renders when helper listen / connect state changes (module singleton). */
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
