import { useLayoutEffect, useMemo } from 'react'
import { noop } from 'zss/mapping/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import {
  applyhyperlinksharedmodemsync,
  clearpanelsharedsync,
  resolvehyperlinksharedbridge,
} from './api'

/**
 * Scroll/panel shared widgets (select, range, …) render on the main thread but
 * scroll tape is built in the sim worker. Register modem get/set on the main
 * modem here so left/right toggles invoke bridge set handlers (e.g. admin config).
 */
export function usePanelSharedSync(
  chip: string,
  type: string,
  target: string,
): void {
  const chipname = NAME(chip)
  const typ = NAME(type)
  const readcontextcache = useMemo(
    () => ({
      board: READ_CONTEXT.board,
      element: READ_CONTEXT.element,
      elementfocus: READ_CONTEXT.elementfocus,
    }),
    [],
  )

  useLayoutEffect(() => {
    if (!target) {
      return
    }
    const bridge = resolvehyperlinksharedbridge(chipname, typ)
    applyhyperlinksharedmodemsync(
      chipname,
      typ,
      target,
      bridge?.get ?? (() => 0),
      bridge?.set ?? noop,
      readcontextcache,
    )
    return () => {
      clearpanelsharedsync(chipname, target)
    }
  }, [chipname, typ, target, readcontextcache])
}
