/*
Elected runner marks gadget:<joinPid> dirty; worker often has no rxrepl shadow
for that stream id (rows hydrate on clients). Push must still run.
*/
import * as apimod from 'zss/device/api'
import { rxreplclientsetownplayerfortests } from 'zss/device/rxreplclient'
import { initstate } from 'zss/gadget/data/api'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import {
  gadgetstream,
  memorydirtyclear,
  memorymarkdirty,
} from 'zss/memory/memorydirty'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { memoryworkerpushdirty } from '../memoryworkersync'

describe('memoryworkerpushdirty gadget streams', () => {
  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
    rxreplclientsetownplayerfortests('')
  })

  it('pushes gadget:<otherPid> without a local rxreplclient stream entry', () => {
    const runner = 'pid_runner_ws'
    const joiner = 'pid_joiner_ws'
    const g = initstate()
    g.layers = [{ id: 'blank1', type: LAYER_TYPE.BLANK }]

    const book: BOOK = {
      id: 'main-ws',
      name: 'main',
      timestamp: 0,
      activelist: [runner, joiner],
      pages: [],
      flags: {
        [MEMORY_LABEL.GADGETSTORE]: {
          [joiner]: g,
        } as unknown as Record<string, never>,
      },
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-ws')

    rxreplclientsetownplayerfortests(runner)
    memorymarkdirty(gadgetstream(joiner))

    const spy = jest
      .spyOn(apimod, 'rxreplpushbatch')
      .mockImplementation(() => {})
    memoryworkerpushdirty()

    expect(spy).toHaveBeenCalledTimes(1)
    const call = spy.mock.calls[0]
    expect(call[1]).toBe(runner)
    const batch = call[2] as {
      rows: { streamid: string; gadget?: { layers?: unknown[] } }[]
    }
    expect(batch.rows[0].streamid).toBe(gadgetstream(joiner))
    expect(batch.rows[0].gadget?.layers?.length).toBe(1)
    spy.mockRestore()
  })
})
