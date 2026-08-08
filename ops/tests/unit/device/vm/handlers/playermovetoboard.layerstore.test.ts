import type { DEVICE } from 'zss/device'
import { handleplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(() => ({ id: 'main' })),
}))

import { memorymoveplayertoboard } from 'zss/memory/playermanagement'

describe('playermovetoboard handler', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls memorymoveplayertoboard on the main book', () => {
    handleplayermovetoboard(vm, {
      session: '',
      player: 'pid_test',
      id: 'm1',
      target: 'vm:playermovetoboard',
      data: ['pid_test', 'board-dest', { x: 0, y: 12 }],
    })

    expect(memorymoveplayertoboard).toHaveBeenCalledWith(
      { id: 'main' },
      'pid_test',
      'board-dest',
      { x: 0, y: 12 },
    )
  })
})
