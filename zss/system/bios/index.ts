import gadgetcode from 'bundle-text:./gadget.txt'
import playercode from 'bundle-text:./player.txt'
import { indexToX, indexToY } from 'zss/mapping/2d'
import { range } from 'zss/mapping/array'
import { createGuid } from 'zss/mapping/guid'

import { BOOK } from '../book'
import { CONTENT_TYPE } from '../codepage'

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
  config: [
    { id: createGuid(), name: 'login', value: 'app:gadget' },
    {
      id: createGuid(),
      name: 'firmware',
      value: [
        'gadget',
        'media',
        'assembler',
        // fallback to player global data
        'player',
      ],
    },
  ],
}
