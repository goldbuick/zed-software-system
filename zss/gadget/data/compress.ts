import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { MAYBE } from 'zss/mapping/types'

import { GADGET_STATE, LAYER, SPRITE } from './types'

enum GADGET_SPRITE_KEYS {
  id,
  x,
  y,
  char,
  color,
  bg,
  stat,
  pid,
}

function exportsprite(sprite: MAYBE<SPRITE>): MAYBE<FORMAT_OBJECT> {
  return formatobject(sprite, GADGET_SPRITE_KEYS)
}

function importsprite(sprite: MAYBE<FORMAT_OBJECT>): MAYBE<SPRITE> {
  return unformatobject(sprite, GADGET_SPRITE_KEYS)
}

enum GADGET_LAYER_KEYS {
  id,
  type,
  tag,
  width,
  height,
  char,
  color,
  bg,
  stats,
  sprites,
  alphas,
  mime,
  media,
  focusx,
  focusy,
  focusid,
  viewscale,
  graphics,
  facing,
}

function exportlayer(layer: MAYBE<LAYER>): MAYBE<FORMAT_OBJECT> {
  return formatobject(layer, GADGET_LAYER_KEYS, {
    sprites: (sprites) => sprites.map(exportsprite),
  })
}

function importlayer(layer: MAYBE<FORMAT_OBJECT>): MAYBE<LAYER> {
  return unformatobject(layer, GADGET_LAYER_KEYS, {
    sprites: (sprites) => sprites.map(importsprite),
  })
}

enum GADGET_STATE_KEYS {
  id,
  board,
  over,
  under,
  layers,
  tickers,
  scrollname,
  scroll,
  sidebar,
  synthstate,
}

export function exportgadgetstate(
  gadget: MAYBE<GADGET_STATE>,
): MAYBE<FORMAT_OBJECT> {
  return formatobject(gadget, GADGET_STATE_KEYS, {
    layers: (layers) => layers.map(exportlayer),
  })
}

export function importgadgetstate(
  gadget: MAYBE<FORMAT_OBJECT>,
): MAYBE<GADGET_STATE> {
  return unformatobject(gadget, GADGET_STATE_KEYS, {
    layers: (layers) => layers.map(importlayer),
  })
}
