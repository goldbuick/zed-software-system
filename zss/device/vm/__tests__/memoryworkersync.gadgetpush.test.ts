/*
Elected runner marks gadget:<joinPid> dirty; worker often has no rxrepl shadow
for that stream id (rows hydrate on clients). Push must still run.
*/
import * as apimod from 'zss/device/api'
import {
  streamreplclientstreammap,
  streamreplflushclientdbfortests,
  streamreplmirrorputlocal,
} from 'zss/device/netsim'
import { rxreplclientsetownplayerfortests } from 'zss/device/rxreplclient'
import { initstate } from 'zss/gadget/data/api'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { deepcopy } from 'zss/mapping/types'
import { creategadgetmemid } from 'zss/memory/flagmemids'
import { gadgetstream, memorydirtyclear } from 'zss/memory/memorydirty'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { projectgadget } from '../memoryproject'
import { memorypushworkersyncpdirty } from '../memoryworkersync'

describe('memoryworkerpushdirty gadget streams', () => {
  afterEach(async () => {
    memoryresetbooks([])
    memorydirtyclear()
    streamreplclientstreammap.clear()
    await streamreplflushclientdbfortests()
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
        [creategadgetmemid(joiner)]: g,
      } as unknown as BOOK['flags'],
    }
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-ws')
    streamreplclientstreammap.clear()
    const gsid = gadgetstream(joiner)
    streamreplmirrorputlocal(gsid, {
      document: deepcopy(projectgadget(joiner)),
      rev: 0,
    })

    rxreplclientsetownplayerfortests(runner)
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const gadgetdoc = mainbook.flags[creategadgetmemid(joiner)] as unknown as {
      layers: { id: string; type: LAYER_TYPE }[]
    }
    gadgetdoc.layers = [
      ...gadgetdoc.layers,
      { id: 'observe_layer', type: LAYER_TYPE.BLANK },
    ]

    const spy = jest
      .spyOn(apimod, 'rxreplpushbatch')
      .mockImplementation(() => {})
    memorypushworkersyncpdirty()

    expect(spy).toHaveBeenCalledTimes(1)
    const call = spy.mock.calls[0]
    expect(call[1]).toBe(runner)
    const batch = call[2] as {
      rows: { streamid: string; document?: unknown }[]
    }
    expect(batch.rows[0].streamid).toBe(gadgetstream(joiner))
    expect(
      (batch.rows[0].document as { layers?: unknown[] })?.layers?.length,
    ).toBe(2)
    spy.mockRestore()
  })
})
