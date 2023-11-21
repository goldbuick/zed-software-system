import gadgetcode from 'bundle-text:./gadget.txt'
import playercode from 'bundle-text:./player.txt'
import { indexToX, indexToY } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { createGuid } from 'zss/mapping/guid'
import { CODE_PAGE, CODE_PAGE_TYPE } from 'zss/system/codepage'

/*

We have 3 multi-user interaction categories here

=======
this is a session with users

1.  LOGIN, terminal user, sends input to hubworker, worker sends gadget state in return
    terminals support multiple users logging in

=======
these are really different firmwares / modes of a session

2.  PILOT, sim user, sends input to SESSION, SESSION sends relevant sim state
    a sim supports multiple users piloting

3.  CREATE, edit user, sends changes to SESSION, SESSION sends relevant edit state

how do we manage what is running in the current session ?
1. refresh page ?
2. built-in cli / ui ?
  1. cli that lists code pages to run
  2. ui that lists code pages to run, or create new code page

  is the thought here to have a bios? 
  so we can write a complete bios.
  how does bios pull in software to run?

  so lets say the core code is the core editor
  which allows you to make other software

*/

export const TAPE_PAGES: CODE_PAGE[] = [
  {
    id: createGuid(),
    name: 'app',
    entries: [
      {
        id: createGuid(),
        name: 'gadget',
        type: CODE_PAGE_TYPE.CODE,
        code: gadgetcode,
      },
      {
        id: createGuid(),
        name: 'title',
        type: CODE_PAGE_TYPE.BOARD,
        board: {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          terrain: range(99).map(() => ({
            char: 176,
            color: 2,
          })),
          objects: range(99).map((v, i) => {
            if (indexToX(i, 10) === 3 && indexToY(i, 10) === 7) {
              return {
                id: createGuid(),
                code: playercode,
                char: 1,
                color: 12,
                bg: 0,
              }
            }
            return undefined
          }),
        },
      },
    ],
  },
]
