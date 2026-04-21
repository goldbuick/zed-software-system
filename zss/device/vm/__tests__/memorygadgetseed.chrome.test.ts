import { initstate } from 'zss/gadget/data/api'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import {
  memoryresetbooks,
  memorywriteoperator,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { gadgetseedsidebarfromviewportpeers } from '../memorygadgetseed'

describe('gadgetseedsidebarfromviewportpeers', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('seeds joiner layers from operator gadgetstore when join has no layers', () => {
    const host = 'pid_host_chrome'
    const joiner = 'pid_join_chrome'

    const hostgadget = initstate()
    hostgadget.layers = [{ id: 'layer1', type: LAYER_TYPE.BLANK }]
    hostgadget.sidebar = [{ chip: 'c', label: 'l' } as never]
    hostgadget.boardname = 'Title'

    const book: BOOK = {
      id: 'main-chrome',
      name: 'main',
      timestamp: 0,
      activelist: [host, joiner],
      pages: [],
      flags: {
        [host]: {},
        [joiner]: {},
        [MEMORY_LABEL.GADGETSTORE]: {
          [host]: hostgadget,
        } as unknown as Record<string, never>,
      },
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-chrome')
    memorywriteoperator(host)

    const seeded = gadgetseedsidebarfromviewportpeers(joiner, initstate())
    expect(seeded.layers?.length).toBe(1)
    expect(seeded.sidebar?.length).toBe(1)
    expect(seeded.boardname).toBe('Title')
  })
})
