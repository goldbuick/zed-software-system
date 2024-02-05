import playercode from 'bundle-text:./player.txt'
import { createboard } from 'zss/board'
import { BOOK } from 'zss/book'
import { CONTENT_TYPE } from 'zss/codepage'
import { SPRITES_TINDEX } from 'zss/gadget/data/types'
import { createguid } from 'zss/mapping/guid'

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25

export const BIOS: BOOK = {
  id: createguid(),
  name: 'BIOS',
  pages: [
    {
      id: createguid(),
      name: 'app',
      entries: [
        {
          id: createguid(),
          type: CONTENT_TYPE.BOARD,
          name: 'title',
          value: createboard(BOARD_WIDTH, BOARD_HEIGHT, (board) => {
            for (let x = 0; x < board.width; ++x) {
              for (let y = 0; y < board.height; ++y) {
                const i = x + y * board.width
                board.terrain[i] = {
                  char: i % 256,
                  color: 15,
                  bg: 8,
                }
              }
            }
            return board
          }),
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.OBJECT,
          name: 'player',
          value: {
            name: 'player',
            char: 2,
            color: 15,
            bg: SPRITES_TINDEX,
            code: playercode,
          },
        },
      ],
    },
  ],
}
