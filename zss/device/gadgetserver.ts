import { compare, deepClone } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { clearscroll, gadgetplayers, gadgetstate } from 'zss/firmware/gadget'
import {
  GADGET_STATE,
  LAYER,
  SPRITES_TINDEX,
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { memoryobjectreadkind, memoryplayerreadboard } from 'zss/memory'

// tracking gadget state for individual players
const syncstate: Record<string, GADGET_STATE> = {}

const gadgetserverdevice = createdevice('gadgetserver', ['tock'], (message) => {
  switch (message.target) {
    case 'tock':
      // we need to sync gadget here
      gadgetplayers().forEach((player) => {
        const shared = gadgetstate(player)

        // write frame layers
        const layers: LAYER[] = []
        const board = memoryplayerreadboard(player)
        if (board) {
          const tiles = createtiles(player, 0, board.width, board.height)
          layers.push(tiles)
          const shadow = createdither(player, 1, board.width, board.height)
          layers.push(shadow)
          const objects = createsprites(player, 2)
          layers.push(objects)
          const control = createlayercontrol(player, 3)
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
            const kind = memoryobjectreadkind(object)
            const sprite = createsprite(player, 1, id)
            sprite.x = object.x ?? 0
            sprite.y = object.y ?? 0
            sprite.char = object.char ?? kind?.char ?? 0
            sprite.color = object.color ?? kind?.color ?? 0
            sprite.bg = object.bg ?? kind?.bg ?? SPRITES_TINDEX
            objects.sprites.push(sprite)

            // plot shadow
            // if (sprite.bg === SPRITES_TINDEX) {
            //   shadow.alphas[sprite.x + sprite.y * board.width] = 0.75
            // }

            // inform control layer where to focus
            if (id === player) {
              control.focusx = sprite.x
              control.focusy = sprite.y
            }
          })
        }

        // update gadget
        shared.layers = layers

        // write patch
        const patch = compare(syncstate[player] ?? {}, shared)
        if (patch.length) {
          syncstate[player] = deepClone(shared)
          gadgetserverdevice.emit('gadgetclient:patch', patch, player)
        }
      })
      break
    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        gadgetserverdevice.emit('gadgetclient:reset', state, message.player)
      }
      break
    case 'clearscroll':
      if (message.player) {
        clearscroll(message.player)
      }
      break
  }
})
