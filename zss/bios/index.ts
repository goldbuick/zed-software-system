import { COLLISION, COLOR } from 'zss/firmware/wordtypes'
import { createboard, boardcreateobject } from 'zss/memory/board'
import { createbook } from 'zss/memory/book'
import { createcodepage } from 'zss/memory/codepage'

import { randomInteger } from '../mapping/number'

import playercode from './player.txt?raw'
import spincode from './spin.txt?raw'

export const BIOS = createbook('BIOS', [
  createcodepage('@board title', {
    board: createboard((board) => {
      for (let i = 0; i < 32; i++) {
        boardcreateobject(board, {
          x: randomInteger(0, board.width - 1),
          y: randomInteger(0, board.height - 1),
          kind: 'spin',
        })
      }
      return board
    }),
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
