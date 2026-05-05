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

    expect(paint).toHaveBeenCalledWith(vm, 'player-a', expect.any(Object))
    const payload = paint.mock.calls[0][2]
    expect(payload).not.toBe(live)

    paint.mockRestore()
  })
})
