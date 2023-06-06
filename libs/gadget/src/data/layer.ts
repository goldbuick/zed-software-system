import { MAYBE_MAP } from '@zss/yjs/types'

import { GADGET_LAYER } from './types'

/*
 * there are different kinds of layers
 * tiles (xy coords that match width & height of gadget)
 * objects (indivial outlined chars with xy coords with animated transitions)
 * input elements (button, radio button, text input, code edit, with animated transitions)
 * media (png, gif, youtube, soundcloud, tiktok)
 */

// COMMON for all layers

export function getLId(layer: MAYBE_MAP): string {
  return layer?.get('id') || ''
}

export function getLType(layer: MAYBE_MAP): GADGET_LAYER {
  return layer?.get('type') || GADGET_LAYER.BLANK
}

// COMMON for TILES & SPRITES LAYERS
export function setLCharSet(layer: MAYBE_MAP, charSet: string) {
  layer?.set('charSet', charSet)
}

export function getLCharSet(layer: MAYBE_MAP): string {
  return layer?.get('charSet') || ''
}

export function setLDimmed(layer: MAYBE_MAP, dimmed: boolean) {
  layer?.set('dimmed', dimmed)
}

export function getLDimmed(layer: MAYBE_MAP): boolean {
  return layer?.get('dimmed') || false
}
