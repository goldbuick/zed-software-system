import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import * as memorysync from 'zss/device/vm/memorysimsync'
import {
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

function clearvmrunner() {
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

describe('handletick boardrunnerowned on new election', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE
  let mainbook: BOOK

  beforeEach(() => {
    clearvmrunner()
    session.memorywritefreeze(false)
    jest
      .spyOn(memorysync, 'memorypushsimsyncdirty')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncadmitboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(session, 'memoryreadoperator').mockReturnValue('joiner')
    jest
      .spyOn(playermanagement, 'memoryscanplayers')
      .mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnertick').mockImplementation(() => {})
    mainbook = {
      id: 'main',
      name: 'main',
      timestamp: 0,
      activelist: ['joiner'],
      pages: [],
      flags: { joiner: { board: 'board-z' } },
    } as BOOK
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockImplementation((label) => {
        return label === (MEMORY_LABEL.MAIN as string) ? mainbook : undefined
      })
    jest
      .spyOn(playermanagement, 'memoryreadplayers')
      .mockReturnValue(['joiner'])
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockImplementation(
        () =>
          ({ id: 'board-z' }) as BOARD as ReturnType<
            typeof playermanagement.memoryreadplayerboard
          >,
      )
    jest
      .spyOn(playermanagement, 'memoryreadplayersfromboard')
      .mockReturnValue(['joiner'])
    tracking.joiner = 5
  })

  afterEach(() => {
    clearvmrunner()
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
    jest.mocked(memorytickloaders).mockClear()
  })

  it('emits boardrunner:ownedboard to operator sim host (same peer as boardrunnertick)', () => {
    const owned = jest
      .spyOn(api, 'boardrunnerowned')
      .mockImplementation(() => {})

    handletick(vm, msg)

    expect(owned).toHaveBeenCalledWith(
      vm,
      'joiner',
      'board-z',
      memorysync.memorysyncreplstreamidsforboardrunner('board-z'),
    )
  })
})
