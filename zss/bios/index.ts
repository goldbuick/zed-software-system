import playercode from 'bundle-text:./player.txt'
import { COLLISION, COLOR } from 'zss/firmware/wordtypes'
import { createguid } from 'zss/mapping/guid'
import { createboard } from 'zss/memory/board'
import { BOOK } from 'zss/memory/book'

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25

/*
Let's make a terminal stack
What is a terminal stack ?
It is a collection of named book slots
such that each book is being either run or editied
the fun part is a book can target another book / sim
and that is how we get generalized software
*/

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
            return board
          }),
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.OBJECT,
          name: 'player',
          value: {
            char: 219,
            color: COLOR.WHITE,
            bg: COLOR.SHADOW,
            code: playercode,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.TERRAIN,
          name: 'field',
          value: {
            char: 176,
            color: COLOR.DKGRAY,
            collision: COLLISION.WALK,
          },
        },
        {
          id: createguid(),
          type: CONTENT_TYPE.TERRAIN,
          name: 'wall',
          value: {
            char: 219,
            color: COLOR.CYAN,
            collision: COLLISION.SOLID,
          },
        },
      ],
    },
  ],
}
