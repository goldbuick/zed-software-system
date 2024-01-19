import logincode from 'bundle-text:./login.txt'
import { range } from 'zss/mapping/array'
import { createGuid } from 'zss/mapping/guid'

import { BOOK } from '../book'
import { CONTENT_TYPE } from '../codepage'

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25
const BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT

export const BIOS: BOOK = {
  id: createGuid(),
  name: 'BIOS',
  flags: [],
  pages: [
    {
      id: createGuid(),
      name: 'app',
      entries: [
        {
          id: createGuid(),
          name: 'login',
          type: CONTENT_TYPE.CODE,
          value: logincode,
        },
        {
          id: createGuid(),
          name: 'title',
          type: CONTENT_TYPE.BOARD,
          value: {
            x: 0,
            y: 0,
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            terrain: range(BOARD_SIZE - 1).map(() => ({
              char: 0,
              color: 0,
            })),
            objects: {},
          },
        },
      ],
    },
  ],
}
