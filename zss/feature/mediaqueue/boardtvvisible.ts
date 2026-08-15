import {
  mediaqueueislistening,
  mediaqueuereadboundboardid,
} from 'zss/feature/mediaqueue/listenstate'

export function mediaqueuehasvideo(
  screen: Record<string, unknown>,
): boolean {
  return Object.values(screen).some(
    (entry) => entry instanceof HTMLVideoElement,
  )
}

/** True when the board TV should render on this gadget board. */
export function boardtvshouldshow(
  gadgetboard: string,
  hasvideo: boolean,
): boolean {
  if (!hasvideo) {
    return false
  }
  const bound = mediaqueuereadboundboardid()
  if (!mediaqueueislistening() || !bound) {
    return true
  }
  return gadgetboard === bound
}
