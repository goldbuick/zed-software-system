import { useSyncExternalStore } from 'react'
import {
  mediaqueuehelperconnected,
  mediaqueueisboundboard,
  mediaqueueislistening,
  mediaqueuereadboardtvgatesnapshot,
  mediaqueuereadboardtvhasvideo,
  mediaqueuereadhelperforboard,
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
  hasvideo = mediaqueuereadboardtvhasvideo(),
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

/** Re-renders when helper listen / connect state or board TV video changes. */
export function useBoardTvVisible(gadgetboard: string): boolean {
  useSyncExternalStore(
    mediaqueuesubscribeboardtvgate,
    mediaqueuereadboardtvgatesnapshot,
    mediaqueuereadboardtvgatesnapshot,
  )
  return boardtvshouldshow(gadgetboard)
}
