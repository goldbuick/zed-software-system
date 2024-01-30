import { compare, deepClone } from 'fast-json-patch'
import { createDevice } from 'zss/network/device'

import { range } from '/zss/mapping/array'
import { randomInteger } from '/zss/mapping/number'

import {
  GADGET_STATE,
  LAYER,
  createcontrol,
  createsprite,
  createsprites,
  createtiles,
} from '../../gadget/data/types'

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
          layers.push(tiles)
          const objects = createsprites(player, 1)
          layers.push(objects)
          const control = createcontrol(player, 2)
          layers.push(control)

          board.terrain.forEach((tile, i) => {
            if (tile) {
              tiles.char[i] = tile.char ?? 0
              tiles.color[i] = tile.color ?? 0
              tiles.bg[i] = tile.bg ?? 0
            }
          })

          Object.values(board.objects).forEach((object) => {
            // should we have bg transparent or match the bg color of the terrain ?
            const id = object.id ?? ''
            const sprite = createsprite(player, 1, id)
            sprite.char = object.char ?? 0
            sprite.color = object.color ?? 0
            sprite.bg = object.bg ?? -1
            objects.sprites.push(sprite)

            // inform control layer where to focus
            if (id === player) {
              control.focusx = sprite.x
              control.focusy = sprite.y
            }
          })

          // temp alt
          for (let i = 0; i < 1; ++i) {
            const el = board.terrain[randomInteger(0, board.terrain.length - 1)]
            if (el) {
              el.char = randomInteger(0, 255)
            }
          }
          for (let i = 0; i < 4; ++i) {
            const el = board.terrain[randomInteger(0, board.terrain.length - 1)]
            if (el) {
              el.color = randomInteger(0, 15)
            }
          }
          for (let i = 0; i < 8; ++i) {
            const el = board.terrain[randomInteger(0, board.terrain.length - 1)]
            if (el) {
              el.bg = randomInteger(0, 15)
            }
          }
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
