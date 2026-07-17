import { useLayoutEffect, useMemo } from 'react'
import { noop } from 'zss/mapping/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

import {
  applyhyperlinksharedmodemsync,
  clearpanelsharedsync,
  parseterminalmodemprefix,
  resolvehyperlinksharedbridge,
} from './api'

/**
 * Shared modem observe/init + bridge get/set for hyperlink widgets on tape or
 * scroll. Pass either a tape `chip:target` modem prefix, or explicit chip/target.
 */
export function useHyperlinkSharedSync(
  type: string,
  opts: { modemprefix: string } | { chip: string; target: string },
): void {
  const typ = NAME(type)
  const parsedprefix =
    'modemprefix' in opts
      ? parseterminalmodemprefix(opts.modemprefix)
      : undefined
  const chip =
    'modemprefix' in opts ? (parsedprefix?.chip ?? '') : NAME(opts.chip)
  const target =
    'modemprefix' in opts ? (parsedprefix?.target ?? '') : opts.target

  const readcontextcache = useMemo(
    () => ({
      board: READ_CONTEXT.board,
      element: READ_CONTEXT.element,
      elementfocus: READ_CONTEXT.elementfocus,
    }),
    [],
  )

  useLayoutEffect(() => {
    if (!chip || !target) {
      return
    }
    const bridge = resolvehyperlinksharedbridge(chip, typ)
    const getforchip = bridge?.get ?? (() => 0 as WORD)
    const setforchip = bridge?.set ?? noop
    applyhyperlinksharedmodemsync(
      chip,
      typ,
      target,
      getforchip,
      setforchip,
      readcontextcache,
    )
    return () => {
      clearpanelsharedsync(chip, target)
    }
  }, [chip, typ, target, readcontextcache])
}
