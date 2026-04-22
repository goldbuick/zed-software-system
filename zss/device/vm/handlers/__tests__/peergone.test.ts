import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlepeergone } from 'zss/device/vm/handlers/peergone'

describe('handlepeergone', () => {
  const vm = {} as DEVICE

  it('is a no-op (cleanup paths are currently disabled in the handler)', () => {
    expect(() =>
      handlepeergone(vm, { player: 'player-gone' } as MESSAGE),
    ).not.toThrow()
  })
})
