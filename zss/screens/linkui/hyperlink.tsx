import { useCallback, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { NAME } from 'zss/words/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkactionprefix, linkafterinvoke, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

/**
 * Panel hyperlinks call sendclose after invoke unless the first data word is
 * `next` (same keep-open flag as LinkHotkey). Use when the chip action writes
 * a replacement scroll — otherwise vm:clearscroll races and wipes it.
 */
export function LinkHyperlink({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words.map((v) => maptovalue(v, ''))
  const [target, ...rawdata] = words
  const keepopen = NAME(`${rawdata[0] ?? ''}`) === 'next'
  const data = keepopen ? rawdata.slice(1) : rawdata
  const tcolor = inputcolor(!!surface.active)
  const modem = useMemo(
    () => parseterminalmodemprefix(surface.modemprefix),
    [surface.modemprefix],
  )

  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 ${tcolor}${surface.label}${surface.layout === 'panel' ? '\n' : ''}`,
    surface.context,
    true,
  )

  const invoke = useCallback(() => {
    const run = () => {
      if (surface.layout === 'terminal') {
        surface.sendmessage(modem?.chip ?? '', target, data)
      } else {
        surface.sendmessage(surface.chip, target, data)
        if (!keepopen) {
          linkafterinvoke(surface)
        }
      }
    }
    if (surface.layout === 'terminal') {
      setTimeout(run, 100)
    } else {
      run()
    }
  }, [surface, modem?.chip, target, data, keepopen])

  return surface.active ? <UserInput OK_BUTTON={invoke} /> : null
}
