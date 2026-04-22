import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlesecond } from 'zss/device/vm/handlers/second'
import * as playermanagement from 'zss/memory/playermanagement'
import * as session from 'zss/memory/session'

describe('handlesecond', () => {
  const vm = {} as DEVICE
  const message = { player: '' } as MESSAGE

  beforeEach(() => {
    session.memorywritefreeze(false)
    jest.spyOn(playermanagement, 'memoryscanplayers').mockImplementation(() => {})
  })

  afterEach(() => {
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
  })

  it('runs without throwing', () => {
    expect(() => handlesecond(vm, message)).not.toThrow()
  })
})
