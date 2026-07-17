import { paneladdress } from 'zss/gadget/data/types'
import { setuppanelitem } from 'zss/screens/panel/common'
import { setuplogitem } from 'zss/screens/tape/common'

import type { LinkSurface } from './types'

/** Position the write pen and set `iseven` from content stripe index. */
export function linkbegin(surface: LinkSurface): void {
  if (surface.layout === 'terminal') {
    setuplogitem(!!surface.active, 0, surface.row, surface.context)
  } else {
    setuppanelitem(surface.sidebar, surface.row, surface.context)
  }
  surface.context.iseven = surface.striperow % 2 === 0
}

/**
 * Even/odd panel control stripe for the whole lead-in (glyph + label).
 * Do not follow with a hardcoded `$ondkblue` — that splits icon vs label bg.
 */
export function linkpanelstripe(surface: LinkSurface): string {
  return surface.context.iseven ? '$dkgreen$onblack' : '$green$ondkgrey'
}

/** Terminal modem prefix or panel two-space lead for action links. */
export function linkactionprefix(surface: LinkSurface): string {
  if (surface.layout === 'terminal') {
    return surface.modemprefix ? `${surface.modemprefix} ` : ''
  }
  return '  '
}

/** Normalize target + trailing args across terminal (type at [1]) vs panel layouts. */
export function linktargetargs(surface: LinkSurface): {
  target: string
  rest: string[]
} {
  const words = surface.words
  const target = `${words[0] ?? ''}`
  if (surface.layout === 'terminal') {
    return { target, rest: words.slice(2).map((w) => `${w}`) }
  }
  return { target, rest: words.slice(1).map((w) => `${w}`) }
}

export function linkmodemaddress(
  surface: LinkSurface,
  target?: string,
): string {
  if (surface.layout === 'terminal') {
    return surface.modemprefix
  }
  const t = target ?? `${surface.words[0] ?? ''}`
  return paneladdress(surface.chip, t)
}

export function linkafterinvoke(surface: LinkSurface): void {
  if (surface.layout === 'panel') {
    surface.sendclose()
  }
}
