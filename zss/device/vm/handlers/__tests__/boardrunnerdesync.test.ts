import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import * as session from 'zss/memory/session'

import { handleboardrunnerdesync } from '../boardrunnerdesync'

describe('handleboardrunnerdesync', () => {
  it('calls boardrunnerpaint with a deepcopy of memory root for the player', () => {
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = { player: 'player-a' } as MESSAGE
    const paint = jest
      .spyOn(api, 'boardrunnerpaint')
      .mockImplementation(jest.fn())

    const live = session.memoryreadroot()
    handleboardrunnerdesync(vm, message)

    expect(paint).toHaveBeenCalledWith(vm, 'player-a', {
      doc: expect.any(Object),
    })
    const payload = paint.mock.calls[0][2] as { doc: unknown }
    expect(payload.doc).not.toBe(live)
    expect(payload).not.toHaveProperty('boundaryid')

    paint.mockRestore()
  })

  it('calls boardrunnerpaint with boundary doc when desync data has boundaryid', () => {
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = {
      player: 'p2',
      data: { boundaryid: 'b-edge' },
    } as unknown as MESSAGE
    const paint = jest
      .spyOn(api, 'boardrunnerpaint')
      .mockImplementation(jest.fn())

    handleboardrunnerdesync(vm, message)

    expect(paint).toHaveBeenCalledWith(
      vm,
      'p2',
      expect.objectContaining({
        boundaryid: 'b-edge',
        doc: expect.any(Object),
      }),
    )

    paint.mockRestore()
  })
})
