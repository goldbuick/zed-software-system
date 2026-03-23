import { DEVICE } from 'zss/device'
import { MESSAGE, apilog, registerloginready } from 'zss/device/api'
import { tracking } from 'zss/device/vm/state'
import * as session from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import { memorydecompressbooks } from 'zss/memory/utilities'

import { handlebooks } from '../books'

jest.mock('zss/memory/utilities', () => ({
  memorydecompressbooks: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  registerloginready: jest.fn(),
  apierror: jest.fn(),
}))

const minimalbook: BOOK = {
  id: 'bid_simfreeze',
  name: 'main',
  timestamp: 0,
  activelist: [],
  pages: [],
  flags: {},
}

describe('handlebooks sim freeze', () => {
  const vm = {} as DEVICE
  const player = 'pid_simfreeze_test'

  let resolver: ((books: BOOK[]) => void) | undefined

  const flushmicrotasks = () => Promise.resolve()

  beforeEach(() => {
    session.memorywriteoperator(player)
    session.memorywritesimfreeze(false)
    tracking[player] = 99
    resolver = undefined
    jest.mocked(memorydecompressbooks).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve
        }),
    )
    jest.spyOn(session, 'memoryresetbooks').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.mocked(memorydecompressbooks).mockReset()
    session.memorywritesimfreeze(false)
    delete tracking[player]
  })

  it('sets simfreeze and resets tracking before await, clears freeze in finally after load', async () => {
    const message: MESSAGE = {
      session: '',
      player,
      id: 'm1',
      sender: '',
      target: 'books',
      data: 'fakecompressed',
    }

    handlebooks(vm, message)

    await Promise.resolve()
    expect(session.memoryreadsimfreeze()).toBe(true)
    expect(tracking[player]).toBe(0)

    expect(resolver).toBeDefined()
    resolver!([minimalbook])

    await flushmicrotasks()
    await flushmicrotasks()

    expect(session.memoryreadsimfreeze()).toBe(false)
    expect(registerloginready).toHaveBeenCalledWith(vm, player)
    expect(apilog).toHaveBeenCalled()
    expect(session.memoryresetbooks).toHaveBeenCalledWith([minimalbook])
  })

  it('clears simfreeze in finally when decompress rejects', async () => {
    const consoleerror = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    try {
      jest
        .mocked(memorydecompressbooks)
        .mockImplementation(() => Promise.reject(new Error('decompress fail')))

      const message: MESSAGE = {
        session: '',
        player,
        id: 'm2',
        sender: '',
        target: 'books',
        data: 'bad',
      }

      handlebooks(vm, message)

      await flushmicrotasks()
      await flushmicrotasks()

      expect(session.memoryreadsimfreeze()).toBe(false)
    } finally {
      consoleerror.mockRestore()
    }
  })
})
