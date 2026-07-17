import { PANEL_ITEM, paneladdress } from 'zss/gadget/data/types'
import { isarray, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { readlinkeditingkey } from 'zss/screens/linkui/linkediting'
import {
  isexpandablelinktype,
  linkexpandrowheight,
  resolvelinktypeandwords,
} from 'zss/screens/linkui/linktypes'

export function panelitemlinkmeta(item: PANEL_ITEM):
  | {
      linktype: string
      words: string[]
      chip: string
      editkey: string
    }
  | undefined {
  if (!isarray(item)) {
    return undefined
  }
  const [chip, label, ...rest] = item
  if (!isstring(chip) || !isstring(label)) {
    return undefined
  }
  const { linktype, words } = resolvelinktypeandwords(
    rest.map((w) => maptostring(w)),
  )
  const target = words[0] ?? ''
  return {
    linktype,
    words,
    chip,
    editkey: paneladdress(chip, target),
  }
}

export function scrollitemrowheight(
  item: PANEL_ITEM,
  editingkey: string,
): number {
  const meta = panelitemlinkmeta(item)
  if (!meta || !isexpandablelinktype(meta.linktype)) {
    return 1
  }
  const editing = editingkey !== '' && editingkey === meta.editkey
  return linkexpandrowheight(meta.linktype, editing)
}

export function scrollrowheights(
  items: PANEL_ITEM[],
  editingkey = readlinkeditingkey(),
): number[] {
  return items.map((item) => scrollitemrowheight(item, editingkey))
}

/** Cumulative Y for each item (length = items.length + 1 for total). */
export function scrollrowyprefix(heights: number[]): number[] {
  const prefix = [0]
  for (let i = 0; i < heights.length; ++i) {
    prefix.push(prefix[i] + heights[i])
  }
  return prefix
}

export type ScrollVisibleWindow = {
  offset: number
  visible: PANEL_ITEM[]
  /** Draw Y within panel for each visible item */
  rowys: number[]
  /** Selected item draw Y within panel (for cursor) */
  selectedrowy: number
  striperowbase: number
}

/**
 * Cursor-anchored height-budget viewport. Always includes the cursor item
 * (even when expanded taller than the panel), then grows upward / downward
 * while the sum of row heights fits in `panelheight`.
 */
export function scrollvisiblewindow(
  items: PANEL_ITEM[],
  cursor: number,
  panelheight: number,
  editingkey = readlinkeditingkey(),
): ScrollVisibleWindow {
  if (items.length === 0) {
    return {
      offset: 0,
      visible: [],
      rowys: [],
      selectedrowy: 0,
      striperowbase: 0,
    }
  }

  const heights = scrollrowheights(items, editingkey)
  const safeCursor = Math.max(0, Math.min(cursor, items.length - 1))
  const cursorh = heights[safeCursor] ?? 1

  let start = safeCursor
  let end = safeCursor
  let used = cursorh

  while (start > 0) {
    const nexth = heights[start - 1] ?? 1
    if (used + nexth > panelheight) {
      break
    }
    start -= 1
    used += nexth
  }

  while (end < items.length - 1) {
    const nexth = heights[end + 1] ?? 1
    if (used + nexth > panelheight) {
      break
    }
    end += 1
    used += nexth
  }

  const visible: PANEL_ITEM[] = []
  const rowys: number[] = []
  let y = 0
  let selectedrowy = 0
  for (let i = start; i <= end; ++i) {
    rowys.push(y)
    visible.push(items[i])
    if (i === safeCursor) {
      selectedrowy = y
    }
    y += heights[i] ?? 1
  }

  return {
    offset: start,
    visible,
    rowys,
    selectedrowy,
    striperowbase: start,
  }
}
