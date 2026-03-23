import { useLayoutEffect, useMemo } from 'react'
import { noop } from 'zss/mapping/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

import {
  applyhyperlinksharedmodemsync,
  parseterminalmodemprefix,
  resolvehyperlinksharedbridge,
} from './api'

/**
 * When a tape line’s prefix is `chip:target` (first `:` only; `target` must not
 * contain `:`), registers the same modem observe/init + bridge get/set path as
 * scroll `gadgethyperlink` for shared hyperlink types. No-op if prefix is invalid.
 */
export function usehyperlinksharedsync(prefix: string, type: string): void {
  const parsed = useMemo(() => parseterminalmodemprefix(prefix), [prefix])
  const typ = NAME(type)

  useLayoutEffect(() => {
    if (!parsed) {
      return
    }
    const bridge = resolvehyperlinksharedbridge(parsed.chip, typ)
    const getforchip = bridge?.get ?? (() => 0 as WORD)
    const setforchip = bridge?.set ?? noop
    const readcontextcache = {
      board: READ_CONTEXT.board,
      element: READ_CONTEXT.element,
      elementfocus: READ_CONTEXT.elementfocus,
    }
    applyhyperlinksharedmodemsync(
      parsed.chip,
      typ,
      parsed.target,
      getforchip,
      setforchip,
      readcontextcache,
    )
  }, [parsed, typ])
}
