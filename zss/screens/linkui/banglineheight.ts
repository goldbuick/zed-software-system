import { parsezedlinkline } from 'zss/feature/zedlinkparse'
import { paneladdress } from 'zss/gadget/data/types'
import {
  isexpandablelinktype,
  linkexpandrowheight,
  resolvelinktypeandwords,
} from 'zss/screens/linkui/linktypes'
import { readlinkeditingkey } from 'zss/screens/linkui/linkediting'

/** Modem / panel address for an expandable bang line, if any. */
export function banglineeditkey(line: string): string | undefined {
  const trimmed = line.trim()
  if (!trimmed.startsWith('!')) {
    return undefined
  }
  const parsed = parsezedlinkline(trimmed)
  if (!parsed) {
    return undefined
  }
  const { linktype, words } = resolvelinktypeandwords(parsed.words)
  if (!isexpandablelinktype(linktype)) {
    return undefined
  }
  if (parsed.modemprefix.trim().length > 0) {
    return parsed.modemprefix
  }
  const target = words[0] ?? ''
  return paneladdress(parsed.chip, target)
}

export function banglineexpandheight(
  line: string,
  editingkey = readlinkeditingkey(),
): number {
  const trimmed = line.trim()
  if (!trimmed.startsWith('!')) {
    return 0
  }
  const parsed = parsezedlinkline(trimmed)
  if (!parsed) {
    return 1
  }
  const { linktype } = resolvelinktypeandwords(parsed.words)
  if (!isexpandablelinktype(linktype)) {
    return 1
  }
  const key = banglineeditkey(trimmed)
  const editing = key !== undefined && key === editingkey && editingkey !== ''
  return linkexpandrowheight(linktype, editing)
}
