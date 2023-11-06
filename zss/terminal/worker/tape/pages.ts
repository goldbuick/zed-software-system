import maincode from 'bundle-text:./main.txt'
import { indexToX, indexToY } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { createGuid } from 'zss/mapping/guid'
import { CODE_PAGE, CODE_PAGE_TYPE } from 'zss/system/codepage'

/*
collection of hand created code pages
*/

export const TAPE_PAGES: CODE_PAGE[] = [
  {
    id: createGuid(),
    name: 'main',
    entries: [
      {
        id: createGuid(),
        name: 'main',
        type: CODE_PAGE_TYPE.CODE,
        code: maincode,
      },
      {
        id: createGuid(),
        name: 'main',
        type: CODE_PAGE_TYPE.BOARD,
        board: {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          terrain: range(99).map(() => ({
            char: 176,
            color: 1,
          })),
          objects: range(99).map((v, i) => {
            if (indexToX(i, 10) === 3 && indexToY(i, 10) === 4) {
              return {
                char: 1,
                color: 15,
              }
            }
            return undefined
          }),
        },
      },
    ],
  },
]
