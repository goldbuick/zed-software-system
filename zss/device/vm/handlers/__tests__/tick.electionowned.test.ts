import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import * as memorysync from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  boardrunnerlastacktickat,
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

function clearvmrunner() {
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

describe('handletick boardrunnerowned on new election', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE
  let mainbook: BOOK

  beforeEach(() => {
    clearvmrunner()
    session.memorywritefreeze(false)
    jest.spyOn(memorysync, 'memorysyncpushdirty').mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(playermanagement, 'memoryreadboardrunnerchoices')
      .mockReturnValue({
        runnerchoices: { 'board-z': 'joiner' },
        playeridsbyboard: { 'board-z': ['joiner'] },
      })
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
        return label === MEMORY_LABEL.MAIN ? mainbook : undefined
      })
    tracking.joiner = 0
  })

  afterEach(() => {
    clearvmrunner()
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
    jest.mocked(memorytickloaders).mockClear()
  })

  it('emits boardrunner:ownedboard for newly elected runner', () => {
    const owned = jest
      .spyOn(api, 'boardrunnerowned')
      .mockImplementation(() => {})
    jest.spyOn(api, 'registerboardrunnerask').mockImplementation(() => {})

    handletick(vm, msg)

    expect(owned).toHaveBeenCalledWith(vm, 'joiner', 'board-z')
  })
})
