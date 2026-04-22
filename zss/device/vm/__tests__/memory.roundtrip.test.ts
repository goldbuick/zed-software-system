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
import {
  MEMORY_STREAM_ID,
  flagsstream,
  memorydirtyclear,
} from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { projectmemory, projectplayerflags } from '../memoryproject'
import { memorysyncreverseproject } from '../memorysimsync'
import { memoryworkerpushdirty } from '../memoryworkersync'

function makebook(): BOOK {
  const pid = 'pid_roundtrip_worker'
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: [pid],
    pages: [],
    flags: { [pid]: { board: 'boardA' } },
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
        expect(player).toBe('pid_roundtrip_worker')
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
    const pid = 'pid_roundtrip_worker'
    const fsid = flagsstream(pid)
    streamreplserverregister(MEMORY_STREAM_ID, projectmemory())
    streamreplserverregister(fsid, projectplayerflags(pid))
    streamreplserveradmitplayer(MEMORY_STREAM_ID, pid, true)
    streamreplserveradmitplayer(fsid, pid, true)
    rxreplclientsetownplayerfortests(pid)
    rxreplclientreadstreams().set(MEMORY_STREAM_ID, {
      document: deepcopy(projectmemory()),
      rev: 0,
    })
    rxreplclientreadstreams().set(fsid, {
      document: deepcopy(projectplayerflags(pid)),
      rev: 0,
    })

    const book = memoryreadbookbyaddress('main-id')
    expect(book).toBeDefined()
    if (!ispresent(book)) {
      return
    }
    memorywritebookflag(book, pid, 'hp', 7)

    memoryworkerpushdirty()
    expect(pushbatchspy).toHaveBeenCalled()

    const finalbook = memoryreadbookbyaddress('main-id')
    expect(finalbook?.flags[pid]).toEqual({ board: 'boardA', hp: 7 })
  })
})
