import playercode from 'bundle-text:./player.txt'
import { createguid } from 'zss/mapping/guid'
import { createboard } from 'zss/system/board'
import { BOOK } from 'zss/system/book'
import { CONTENT_TYPE } from 'zss/system/codepage'

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25

export const BIOS: BOOK = {
  id: createguid(),
  name: 'BIOS',
  flags: [],
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
            char: 1,
            color: 15,
            bg: -1,
            code: playercode,
          },
        },
      ],
    },
  ],
}
