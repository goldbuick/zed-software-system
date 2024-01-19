import gadgetcode from 'bundle-text:./gadget.txt'
import playercode from 'bundle-text:./player.txt'
import { indexToX, indexToY } from 'zss/mapping/2d'
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
  pages: [
    {
      id: createGuid(),
      name: 'app',
      entries: [
        {
          id: createGuid(),
          name: 'gadget',
          type: CONTENT_TYPE.CODE,
          value: gadgetcode,
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
  config: [{ id: createGuid(), name: 'login', value: 'app:gadget' }],
}
