import { createguid } from 'zss/mapping/guid'
import { BOOK } from 'zss/system/book'
import { CONTENT_TYPE } from 'zss/system/codepage'

import { createboard } from '../system/board'

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
          name: 'title',
          type: CONTENT_TYPE.BOARD,
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
      ],
    },
  ],
}
