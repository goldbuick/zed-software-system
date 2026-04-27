import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import * as memorysync from 'zss/device/vm/memorysimsync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import * as playermanagement from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { BOARD, BOOK } from 'zss/memory/types'

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
  for (const k of Object.keys(tracking)) {
    delete tracking[k]
  }
  for (const k of Object.keys(skipboardrunners)) {
    delete skipboardrunners[k]
  }
}

describe('handletick boardrunner election', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE
  let mainbook: BOOK

  beforeEach(() => {
    clearboardrunnerstate()
    session.memorywritefreeze(false)
    jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnertick').mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncadmitboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(session, 'memoryreadoperator').mockReturnValue('p1')
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
        return label === (MEMORY_LABEL.MAIN as string) ? mainbook : undefined
      })
    jest.spyOn(playermanagement, 'memoryreadplayers').mockReturnValue(['p1'])
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockImplementation(
        () =>
          ({ id: 'addr-a' }) as BOARD as ReturnType<
            typeof playermanagement.memoryreadplayerboard
          >,
      )
    jest
      .spyOn(playermanagement, 'memoryreadplayersfromboard')
      .mockReturnValue(['p1'])
    tracking.p1 = 10
  })

  afterEach(() => {
    clearboardrunnerstate()
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
    jest.mocked(memorytickloaders).mockClear()
  })

  it('elects a boardrunner when the board has no ack timestamp', () => {
    handletick(vm, msg)

    expect(boardrunners['addr-a']).toBe('p1')
    expect(typeof ackboardrunners['addr-a']).toBe('number')
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'p1',
      'addr-a',
    )
    expect(api.boardrunnerowned).toHaveBeenCalledWith(vm, 'p1', [
      'addr-a',
      expect.any(Array),
    ])
  })

  it('marks skip when the last ack timestamp is stale', () => {
    const stale = 1_000
    ackboardrunners['addr-a'] = stale
    boardrunners['addr-a'] = 'p1'
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(stale + BOARDRUNNER_ACKTICK_STALE_MS + 1)

    handletick(vm, msg)

    expect(skipboardrunners.p1).toBe(true)
    expect(ackboardrunners['addr-a']).toBeUndefined()
    expect(boardrunners['addr-a']).toBeUndefined()
  })

  it('revokes and re-elects when recorded runner is not on the board', () => {
    boardrunners['addr-a'] = 'ghost'
    ackboardrunners['addr-a'] = Date.now()
    jest.spyOn(playermanagement, 'memoryreadplayers').mockReturnValue(['p1'])
    jest
      .spyOn(playermanagement, 'memoryreadplayersfromboard')
      .mockReturnValue(['p1'])

    handletick(vm, msg)

    expect(boardrunners['addr-a']).toBe('p1')
    expect(typeof ackboardrunners['addr-a']).toBe('number')
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'p1',
      'addr-a',
    )
  })
})
