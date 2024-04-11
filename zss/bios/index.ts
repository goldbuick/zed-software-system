import playercode from 'bundle-text:./player.txt'
import { COLLISION, COLOR } from 'zss/firmware/wordtypes'
import { createboard } from 'zss/memory/board'
import { createbook } from 'zss/memory/book'
import { createcodepage } from 'zss/memory/codepage'

export const BIOS = createbook('BIOS', [
  createcodepage('@board title', {
    board: createboard(),
  }),
  createcodepage(playercode, {
    object: {
      char: 219,
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
