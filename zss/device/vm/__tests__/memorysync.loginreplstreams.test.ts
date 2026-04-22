import {
  streamreplserverclearfortests,
  streamreplserverreadstream,
} from 'zss/device/streamreplserver'
import { flagsstream, gadgetstream } from 'zss/memory/memorydirty'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { memorysyncensureloginreplstreams } from '../memorysimsync'

describe('memorysyncensureloginreplstreams', () => {
  afterEach(() => {
    streamreplserverclearfortests()
    memoryresetbooks([])
  })

  it('registers gadget and flags streams and admits the player before any boardrunner ack', () => {
    const joiner = 'pid_joiner_loginrepl'
    const book: BOOK = {
      id: 'main-loginrepl',
      name: 'main',
      timestamp: 0,
      activelist: [joiner],
      pages: [],
      flags: {},
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-loginrepl')

    memorysyncensureloginreplstreams(joiner)

    const g = streamreplserverreadstream(gadgetstream(joiner))
    const f = streamreplserverreadstream(flagsstream(joiner))
    expect(g?.players.has(joiner)).toBe(true)
    expect(f?.players.has(joiner)).toBe(true)
    expect(g?.players.get(joiner)?.writable).toBe(false)
    expect(f?.players.get(joiner)?.writable).toBe(false)
  })
})
