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

  quick note, the idea is the main code page is the glue code
  between other code pages
  and it can define deps etc...

*/

const TAPE_WIDTH = 60
const TAPE_HEIGHT = 25

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
          width: TAPE_WIDTH,
          height: TAPE_HEIGHT,
          terrain: range(TAPE_WIDTH * TAPE_HEIGHT - 1).map(() => ({
            char: 0,
            color: 0,
          })),
          objects: {},
        },
      },
    ],
  },
]