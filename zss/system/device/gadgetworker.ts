import { compare, deepClone } from 'fast-json-patch'
import {
  GADGET_STATE,
  LAYER,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { createDevice } from 'zss/network/device'

import { clearscroll, gadgetgroups, gadgetstate } from '../firmware/gadget'
import { getprocessboard } from '../firmware/process'

// tracking gadget state for individual players
const syncstate: Record<string, GADGET_STATE> = {}

const gadgetworker = createDevice('gadgetworker', ['tock'], (message) => {
  switch (message.target) {
    case 'tock':
      // we need to sync gadget here
      gadgetgroups().forEach((player) => {
        const shared = gadgetstate(player)

        // write frame layers
        const layers: LAYER[] = []
        const board = getprocessboard(player)
        if (board) {
          const tiles = createtiles(player, 0, board.width, board.height)
          board.terrain.forEach((tile, i) => {
            if (tile) {
              tiles.char[i] = tile.char ?? 0
              tiles.color[i] = tile.color ?? 0
              tiles.bg[i] = tile.bg ?? 0
            }
          })
          layers.push(tiles)

          const objects = createsprites(player, 1)
          Object.values(board.objects).forEach((object) => {
            const sprite = createsprite(player, 1, object.id ?? '')
            sprite.char = object.char ?? 0
            sprite.color = object.color ?? 0
            sprite.bg = object.bg ?? -1
            objects.sprites.push(sprite)
          })
          layers.push(objects)
        }

        // update gadget
        shared.layers = layers

        // write patch
        const patch = compare(syncstate[player] ?? {}, shared)
        if (patch.length) {
          syncstate[player] = deepClone(shared)
          gadgetworker.emit('gadgetmain:patch', patch, player)
        }
      })
      break
    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        gadgetworker.emit('gadgetmain:reset', state, message.player)
      }
      break
    case 'clearscroll':
      if (message.player) {
        clearscroll(message.player)
      }
      break
  }
})
