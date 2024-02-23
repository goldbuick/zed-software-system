import playercode from 'bundle-text:./player.txt'
import spincode from 'bundle-text:./spin.txt'
import testercode from 'bundle-text:./tester.txt'
import { createboard, createboardobject } from 'zss/board'
import { BOOK } from 'zss/book'
import { CONTENT_TYPE } from 'zss/codepage'
import { createguid } from 'zss/mapping/guid'

import { COLLISION, COLOR } from '../firmware/wordtypes'
import { pick } from '../mapping/array'
import { randomInteger } from '../mapping/number'

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
            for (let i = 0; i < board.terrain.length; ++i) {
              board.terrain[i] = {
                kind: pick(
                  'app:field',
                  'app:field',
                  'app:field',
                  'app:field',
                  'app:field',
                  'app:field',
                  'app:field',
                  'app:wall',
                ),
              }
            }
            for (let i = 0; i < 24; i++) {
              createboardobject(board, {
                x: randomInteger(0, board.width - 1),
                y: randomInteger(0, board.height - 1),
                kind: pick('app:spin', 'app:tester'),
              })
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
            color: COLOR.PURPLE,
            bg: COLOR.CLEAR,
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
            bg: COLOR.CLEAR,
            code: spincode,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.OBJECT,
          name: 'tester',
          value: {
            name: 'tester',
            char: 21,
            color: COLOR.BLUE,
            bg: COLOR.CLEAR,
            code: testercode,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.TERRAIN,
          name: 'field',
          value: {
            name: 'field',
            char: 176,
            color: COLOR.DKYELLOW,
            collision: COLLISION.WALK,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.TERRAIN,
          name: 'wall',
          value: {
            name: 'wall',
            char: 219,
            color: COLOR.CYAN,
            collision: COLLISION.SOLID,
          },
        },
      ],
    },
  ],
}
