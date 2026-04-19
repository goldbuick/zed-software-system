/*
phase 2 round-trip coverage: a worker-side flag mutation reaches the
server's authoritative MEMORY within one tick via rxrepl push_batch +
reverse-projection.
*/
import * as apimod from 'zss/device/api'
import {
  streamreplawaitclientpersistqueue,
  streamreplclientstreammap,
  streamreplflushclientdbfortests,
} from 'zss/device/jsonsyncdb'
import {
  rxreplclientreadstreams,
  rxreplclientsetownplayerfortests,
} from 'zss/device/rxreplclient'
import {
  streamreplpublishfrommemory,
  streamreplserveradmitplayer,
  streamreplserverclearfortests,
  streamreplserverregister,
} from 'zss/device/streamreplserver'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { MEMORY_STREAM_ID, memorydirtyclear } from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { MEMORY_SYNC_TOPKEYS, projectmemory } from '../memoryproject'
import { memorysyncreverseproject } from '../memorysync'
import { memoryworkerpushdirty } from '../memoryworkersync'

function makebook(): BOOK {
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags: { p1: { board: 'boardA' } },
  }
}

describe('phase 2 worker -> server round-trip', () => {
  let pushbatchspy: jest.SpyInstance

  beforeEach(async () => {
    memoryresetbooks([makebook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()
    streamreplserverclearfortests()
    rxreplclientsetownplayerfortests('')
    streamreplclientstreammap.clear()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
    pushbatchspy = jest
      .spyOn(apimod, 'rxreplpushbatch')
      .mockImplementation((_dev, player, batch) => {
        expect(player).toBe('p1')
        for (let i = 0; i < batch.rows.length; ++i) {
          const row = batch.rows[i]
          const doc =
            'gadget' in row
              ? row.gadget
              : (row as { document: unknown }).document
          memorysyncreverseproject(row.streamid, doc)
          streamreplpublishfrommemory(row.streamid)
        }
      })
  })

  afterEach(async () => {
    pushbatchspy.mockRestore()
    memoryresetbooks([])
    memorydirtyclear()
    streamreplserverclearfortests()
    rxreplclientsetownplayerfortests('')
    streamreplclientstreammap.clear()
    await streamreplawaitclientpersistqueue()
    await streamreplflushclientdbfortests()
  })

  it('worker flag mutation lands in MEMORY via push_batch + reverseproject', () => {
    streamreplserverregister(MEMORY_STREAM_ID, projectmemory(), {
      topkeys: [...MEMORY_SYNC_TOPKEYS],
    })
    streamreplserveradmitplayer(MEMORY_STREAM_ID, 'p1', true)
    rxreplclientsetownplayerfortests('p1')
    rxreplclientreadstreams().set(MEMORY_STREAM_ID, {
      document: deepcopy(projectmemory()),
      rev: 0,
    })

    const book = memoryreadbookbyaddress('main-id')
    expect(book).toBeDefined()
    if (!ispresent(book)) {
      return
    }
    memorywritebookflag(book, 'p1', 'hp', 7)

    memoryworkerpushdirty()
    expect(pushbatchspy).toHaveBeenCalled()

    const finalbook = memoryreadbookbyaddress('main-id')
    expect(finalbook?.flags.p1).toEqual({ board: 'boardA', hp: 7 })
  })
})
