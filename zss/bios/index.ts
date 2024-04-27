import { COLLISION, COLOR } from 'zss/firmware/wordtypes'
import { pick } from 'zss/mapping/array'
import {
  boardcreate,
  boardobjectcreatefromkind,
  boardterrainsetfromkind,
} from 'zss/memory/board'
import { createbook } from 'zss/memory/book'
import { createcodepage } from 'zss/memory/codepage'

import { randomInteger } from '../mapping/number'

import blonkcode from './blonk.txt?raw'
import bulletcode from './bullet.txt?raw'
import playercode from './player.txt?raw'
import spincode from './spin.txt?raw'

export const BIOS = createbook('BIOS', [
  createcodepage('@board title', {
    board: boardcreate((board) => {
      for (let i = 0; i < 32; i++) {
        const dest = {
          x: randomInteger(0, board.width - 1),
          y: randomInteger(0, board.height - 1),
        }
        boardobjectcreatefromkind(board, dest, 'spin')
      }
      for (let ix = 0; ix < board.width; ++ix) {
        for (let iy = 5; iy < 15; ++iy) {
          boardterrainsetfromkind(
            board,
            { x: ix, y: iy },
            pick('bimp', 'bimp', 'bimp', 'bimp', 'bimp', 'bomp'),
          )
        }
      }
      return board
    }),
  }),
  createcodepage(blonkcode, {
    object: {
      char: 15,
      color: COLOR.WHITE,
      bg: COLOR.BLACK,
    },
  }),
  createcodepage(bulletcode, {
    object: {
      char: 248,
      color: COLOR.WHITE,
      bg: COLOR.SHADOW,
    },
  }),
  createcodepage(playercode, {
    object: {
      char: 219,
      color: COLOR.WHITE,
      bg: COLOR.CLEAR,
    },
  }),
  createcodepage(spincode, {
    object: {
      char: 1,
      color: COLOR.WHITE,
      bg: COLOR.CLEAR,
    },
  }),
  createcodepage('@terrain bimp\n@destructible', {
    terrain: {
      char: 236,
      color: COLOR.WHITE,
      bg: COLOR.DKGREEN,
      collision: COLLISION.SOLID,
    },
  }),
  createcodepage('@terrain bomp', {
    terrain: {
      char: 236,
      color: COLOR.YELLOW,
      bg: COLOR.DKGREEN,
      collision: COLLISION.SOLID,
    },
  }),
  createcodepage('@terrain field', {
    terrain: {
      char: 176,
      color: COLOR.DKGRAY,
      collision: COLLISION.WALK,
    },
  }),
  createcodepage('@terrain wall', {
    terrain: {
      char: 219,
      color: COLOR.CYAN,
      collision: COLLISION.SOLID,
    },
  }),
])
