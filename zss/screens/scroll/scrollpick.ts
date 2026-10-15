import { PANEL_ITEM } from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'

export const SCROLL_START_HYPERLINK_MAX_INDEX = 8

export function scrollpickstarthyperlinkrow(text: PANEL_ITEM[]): number {
  const startat = text.findIndex((item) => isarray(item))
  if (startat >= 0 && startat <= SCROLL_START_HYPERLINK_MAX_INDEX) {
    return startat
  }
  return 0
}

/** Enter on a plain text line in the scroll panel closes the scroll. */
export function scrolltextlineclosesonenter(
  item: PANEL_ITEM,
  sidebar: boolean,
): boolean {
  return !sidebar && typeof item === 'string'
}
