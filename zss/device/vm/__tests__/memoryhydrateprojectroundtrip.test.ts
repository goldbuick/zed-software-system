/*
Regression: wire documents produced by `projectmemory` survive a second pass
through hydrate or unproject without silently drifting shape or book data.
*/
import { deepcopy } from 'zss/mapping/types'
import { MEMORY_STREAM_ID, memorydirtyclear } from 'zss/memory/memorydirty'
import { memoryresetbooks } from 'zss/memory/session'

import { memoryhydratefromjsonsync } from '../memoryhydrate'
import { projectmemory, unprojectstream } from '../memoryproject'

function stablejson(value: unknown) {
  return JSON.parse(JSON.stringify(value))
}

describe('project ↔ hydrate ↔ project', () => {
  beforeEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('memory stream document round-trips through hydrate twice', () => {
    const seed = {
      operator: 'op-rt',
      halt: true,
      freeze: false,
      software: { main: 'main-id', game: '', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: ['op-rt'],
          pages: [
            {
              id: 'page1',
              code: '@object x\n',
              stats: { type: 'object' },
            },
          ],
          flags: { 'op-rt': { board: 'boardA', hp: 3 } },
        },
      },
    }
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, seed)

    const once = deepcopy(projectmemory()) as Record<string, unknown>

    memoryresetBooksRoundtripPrep()
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, once)

    const twice = projectmemory() as Record<string, unknown>

    expect(stablejson(twice)).toEqual(stablejson(once))
  })
})

describe('project ↔ unproject ↔ project', () => {
  beforeEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('memory stream document round-trips through unproject twice', () => {
    const seed = {
      operator: 'op-ur',
      halt: false,
      freeze: true,
      software: { main: 'main-id', game: '', temp: '' },
      books: {
        'main-id': {
          id: 'main-id',
          name: 'main',
          activelist: ['op-ur'],
          pages: [],
          flags: { 'op-ur': { board: 'boardB' } },
        },
      },
    }
    memoryhydratefromjsonsync(MEMORY_STREAM_ID, seed)

    const once = deepcopy(projectmemory()) as Record<string, unknown>

    memoryresetBooksRoundtripPrep()
    unprojectstream(MEMORY_STREAM_ID, once)

    const twice = projectmemory() as Record<string, unknown>

    expect(stablejson(twice)).toEqual(stablejson(once))
  })
})

/** Clear books then minimal shell so `software.main` still resolves for the next apply. */
function memoryresetBooksRoundtripPrep() {
  memoryresetbooks([])
  memorydirtyclear()
  memoryhydratefromjsonsync(MEMORY_STREAM_ID, {
    software: { main: 'main-id', game: '', temp: '' },
    books: {
      'main-id': {
        id: 'main-id',
        name: 'main',
        activelist: [],
        pages: [],
        flags: {},
      },
    },
  })
}
