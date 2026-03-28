import { useEffect } from 'react'
import { modemwriteinitstring } from 'zss/device/modem'
import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
} from 'zss/feature/bookmarks'
import { paneladdress } from 'zss/gadget/data/types'

/** Compact label like `Mon 3:45p` for bookmark default. */
export function bookmarktimelabel(now: Date): string {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    now.getDay()
  ]
  const hour = now.getHours()
  const minute = now.getMinutes()
  const isam = hour < 12
  let hr12 = hour % 12
  if (hr12 === 0) {
    hr12 = 12
  }
  const mm = minute < 10 ? `0${minute}` : `${minute}`
  const suffix = isam ? 'a' : 'p'
  return `${weekday} ${hr12}:${mm}${suffix}`
}

export function useBookmarkDefaultNameSync(
  scrollname: string,
  boardname: string,
) {
  useEffect(() => {
    if (scrollname !== BOOKMARK_SCROLL_SCROLLNAME) {
      return
    }
    const board = boardname.trim()
    const defaultname = board
      ? `${board} - ${bookmarktimelabel(new Date())}`
      : ''
    modemwriteinitstring(
      paneladdress(BOOKMARK_SCROLL_CHIP, BOOKMARK_NAME_TARGET),
      defaultname,
    )
  }, [scrollname, boardname])
}
