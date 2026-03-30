import { PANEL_ITEM } from 'zss/gadget/data/types'
import { isarray, isstring } from 'zss/mapping/types'

function stripcodes(s: string): string {
  return s.replace(/\$[a-zA-Z0-9]+/g, '').trim()
}

/** Plain text for one scroll row (strips color codes; hyperlink rows use label slot). */
export function panelitemtoline(item: PANEL_ITEM): string {
  if (isstring(item)) {
    return stripcodes(item)
  }
  if (isarray(item) && item.length > 1 && isstring(item[1])) {
    return String(item[1])
  }
  return ''
}

export function panelscrolltolines(scroll: PANEL_ITEM[] | undefined): string[] {
  if (!scroll?.length) {
    return []
  }
  const lines: string[] = []
  for (let i = 0; i < scroll.length; ++i) {
    const line = panelitemtoline(scroll[i])
    if (line) {
      lines.push(line)
    }
  }
  return lines
}
