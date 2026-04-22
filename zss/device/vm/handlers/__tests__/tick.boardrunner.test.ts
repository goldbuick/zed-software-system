import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import * as memorysync from 'zss/device/vm/memorysimsync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunnerlastacktickat,
  boardrunners,
  failedboardrunners,
  tracking,
} from 'zss/device/vm/state'
import * as playermanagement from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { BOOK } from 'zss/memory/types'

jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
}))

function clearboardrunnerstate() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
  for (const k of Object.keys(failedboardrunners)) {
    delete failedboardrunners[k]
  }
  for (const k of Object.keys(tracking)) {
    delete tracking[k]
  }
  for (const k of Object.keys(boardrunnerlastacktickat)) {
    delete boardrunnerlastacktickat[k]
  }
}

describe('handletick boardrunner election', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE
  let mainbook: BOOK

  beforeEach(() => {
    clearboardrunnerstate()
    session.memorywritefreeze(false)
    jest.spyOn(memorysync, 'memorysyncpushdirty').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnertick').mockImplementation(() => {})
    jest.spyOn(api, 'registerboardrunnerask').mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(playermanagement, 'memoryscanplayers')
      .mockImplementation(() => {})
    mainbook = {
      id: 'main',
      name: 'main',
      timestamp: 0,
      activelist: ['p1', 'p2'],
      pages: [],
      flags: {
        p1: { board: 'addr-a' },
        p2: { board: 'addr-a' },
      },
    } as BOOK
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockImplementation((label) => {
        return label === MEMORY_LABEL.MAIN ? mainbook : undefined
      })
    tracking.p1 = 0
    tracking.p2 = 0
  })

  afterEach(() => {
    clearboardrunnerstate()
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
    jest.mocked(memorytickloaders).mockClear()
  })

  it('syncs boardrunners to acked player when pending slot disagrees', () => {
    ackboardrunners['addr-a'] = 'p1'
    boardrunners['addr-a'] = 'p2'

    handletick(vm, msg)

    expect(boardrunners['addr-a']).toBe('p1')
    expect(api.boardrunnerowned).toHaveBeenCalledWith(vm, 'p2', '')
  })

  it('does not displace ack with register ask when already aligned', () => {
    ackboardrunners['addr-a'] = 'p1'
    boardrunners['addr-a'] = 'p1'

    handletick(vm, msg)

    expect(api.registerboardrunnerask).not.toHaveBeenCalled()
  })

  it('evicts tick-confirmed runner when last acktick is stale', () => {
    ackboardrunners['addr-a'] = 'p1'
    boardrunners['addr-a'] = 'p1'
    boardrunnerlastacktickat['addr-a'] = 0
    const nowspy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(BOARDRUNNER_ACKTICK_STALE_MS + 5000)

    handletick(vm, msg)

    expect(memorysync.memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'p1',
      'addr-a',
    )
    nowspy.mockRestore()
  })
})
