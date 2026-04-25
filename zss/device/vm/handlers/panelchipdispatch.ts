import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { NAME } from 'zss/words/types'

import { handlebookmarkscrollpanel } from './bookmarkscroll'
import { handleeditorbookmarkscrollpanel } from './editorbookmarkscroll'

export type PANEL_CHIP_ROUTE = { target: string; path: string }

/** First segment is `bookmarkscroll` or `editorbookmarkscroll` (panel chip targets). */
export function parsetargetaspanelchiproute(
  messagetarget: string,
): PANEL_CHIP_ROUTE | undefined {
  const route = parsetarget(messagetarget)
  const ntarget = NAME(route.target)
  if (
    ntarget === NAME('bookmarkscroll') ||
    ntarget === NAME('editorbookmarkscroll')
  ) {
    return route
  }
  return undefined
}

/**
 * Dispatches panel chip routes using the given device for `register:*` emits
 * (VM on sim, or `boardrunner` in the worker).
 */
export function dispatchpanelchipmessage(
  device: DEVICE,
  message: MESSAGE,
  route: PANEL_CHIP_ROUTE,
): void {
  const ntarget = NAME(route.target)
  if (ntarget === NAME('bookmarkscroll')) {
    handlebookmarkscrollpanel(device, message, route.path)
    return
  }
  handleeditorbookmarkscrollpanel(device, message, route.path)
}
