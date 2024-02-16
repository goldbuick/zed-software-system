import playercode from 'bundle-text:./player.txt'
import spincode from 'bundle-text:./spin.txt'
import { createboard, createboardobject } from 'zss/board'
import { BOOK } from 'zss/book'
import { CONTENT_TYPE } from 'zss/codepage'
import { SPRITES_SINDEX } from 'zss/gadget/data/types'
import { createguid } from 'zss/mapping/guid'

import { COLOR } from '../firmware/wordtypes'

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
            createboardobject(board, { x: 3, y: 3, kind: 'app:spin' })
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
            color: COLOR.PURPLE,
            bg: SPRITES_SINDEX,
            code: playercode,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.OBJECT,
          name: 'spin',
          value: {
            name: 'spin',
            char: 15,
            color: COLOR.RED,
            bg: SPRITES_SINDEX,
            code: spincode,
          },
        },
      ],
    },
  ],
}
