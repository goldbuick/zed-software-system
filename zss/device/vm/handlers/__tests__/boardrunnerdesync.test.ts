import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import * as boundaries from 'zss/memory/boundaries'
import * as session from 'zss/memory/session'

import { handleboardrunnerdesync } from '../boardrunnerdesync'

jest.mock('zss/memory/boundaries', () => ({
  memoryboundaryget: jest.fn(),
}))

describe('handleboardrunnerdesync', () => {
  afterEach(() => {
    jest.mocked(boundaries.memoryboundaryget).mockReset()
  })

  it('calls boardrunnerpaint with memory root payload for the player', () => {
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = { player: 'player-a' } as MESSAGE
    const paint = jest
      .spyOn(api, 'boardrunnerpaint')
      .mockImplementation(jest.fn())

    const live = session.memoryreadroot()
    handleboardrunnerdesync(vm, message)

    expect(paint).toHaveBeenCalledWith(vm, 'player-a', live)

    paint.mockRestore()
  })

  it('calls boardrunnerpaint with boundary payload when message.data is a boundary id', () => {
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const doc = { synced: true }
    jest.mocked(boundaries.memoryboundaryget).mockReturnValue(doc)
    const message = {
      player: 'p2',
      data: 'b-edge',
    } as unknown as MESSAGE
    const paint = jest
      .spyOn(api, 'boardrunnerpaint')
      .mockImplementation(jest.fn())

    handleboardrunnerdesync(vm, message)

    expect(boundaries.memoryboundaryget).toHaveBeenCalledWith('b-edge')
    expect(paint).toHaveBeenCalledWith(vm, 'p2', doc, 'b-edge')

    paint.mockRestore()
  })
})
