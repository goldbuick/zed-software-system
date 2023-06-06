/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGuid } from '@zss/system/mapping/guid'
import { MAYBE_MAP } from '@zss/yjs/types'
import * as Y from 'yjs'

import { GADGET_LAYER } from './types'

type SLSpriteDefault = {
  id?: string
  x: number
  y: number
  char: number
  color: number
  bg: number
}

export function createSLSprite(create: SLSpriteDefault) {
  const id = create.id || createGuid()
  const sprite = new Y.Map<any>()

  sprite.set('id', id)
  sprite.set('x', create.x)
  sprite.set('y', create.y)
  sprite.set('char', create.char)
  sprite.set('color', create.color)
  sprite.set('bg', create.bg)

  return { id, sprite }
}

export function setSLSpriteXY(sprite: MAYBE_MAP, x: number, y: number) {
  sprite?.set('x', x)
  sprite?.set('y', y)
}

export function setSLSpriteChar(sprite: MAYBE_MAP, char: number) {
  sprite?.set('char', char)
}

export function setSLSpriteColor(sprite: MAYBE_MAP, color: number) {
  sprite?.set('color', color)
}

export function setSLSpriteBg(sprite: MAYBE_MAP, bg: number) {
  sprite?.set('bg', bg)
}

export type SLDefault = {
  id?: string
  sprites: SLSpriteDefault[]
}

export function createSL(create: SLDefault) {
  const id = create.id || createGuid()
  const layer = new Y.Map<any>()

  layer.set('id', id)
  layer.set('type', GADGET_LAYER.SPRITES)
  const sprites = new Y.Map<any>()
  create.sprites.map(createSLSprite).forEach((item) => {
    sprites.set(item.id, item.sprite)
  })
  layer.set('sprites', sprites)

  return { id, layer }
}

export function getSLSprites(layer: MAYBE_MAP) {
  return layer?.get('sprites') as MAYBE_MAP
}

export function getSLSpriteIds(layer: MAYBE_MAP) {
  return [...(getSLSprites(layer)?.keys() ?? [])] as string[]
}

export function getSLSprite(layer: MAYBE_MAP, id: string) {
  return getSLSprites(layer)?.get(id) as MAYBE_MAP
}

export type SLSpriteState = SLSpriteDefault & { id: string }

export function getSLState(layer: MAYBE_MAP) {
  if (!layer) {
    return { sprites: [] }
  }

  const sprites: SLSpriteState[] = [
    ...((layer.get('sprites') as MAYBE_MAP)?.values() ?? []),
  ].map((item: MAYBE_MAP) => ({
    id: item?.get('id') ?? '',
    x: item?.get('x') ?? 0,
    y: item?.get('y') ?? 0,
    char: item?.get('char') ?? 0,
    color: item?.get('color') ?? 0,
    bg: item?.get('bg') ?? 0,
  }))

  return {
    sprites,
  }
}
