import type { DEVICE } from 'zss/device'
import { wanixclientready } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { handleready } from 'zss/device/wanixclient/handlers/ready'
import { markwanixready } from 'zss/device/wanixclient/wanixbridge'
import {
  ensurewanixtaskroom,
  readwanixroomconfig,
} from 'zss/device/wanixclient/wanixroom'
import { handleready as handlewanixserverready } from 'zss/device/wanixserver/handlers/ready'

jest.mock('zss/device/api', () => ({
  wanixclientready: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  markwanixready: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  ensurewanixtaskroom: jest.fn(),
  readwanixroomconfig: jest.fn(),
}))

const mockmarkwanixready = markwanixready as jest.Mock
const mockensurewanixtaskroom = ensurewanixtaskroom as jest.Mock
const mockreadwanixroomconfig = readwanixroomconfig as jest.Mock
const mockwanixclientready = wanixclientready as jest.Mock
const device = {} as DEVICE

function readymessage(data?: unknown): MESSAGE {
  return {
    session: 'session',
    player: 'player',
    id: 'message',
    sender: 'sender',
    target: 'ready',
    data,
  }
}

describe('wanixclient ready', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockreadwanixroomconfig.mockReturnValue({ mode: 'idle' })
  })

  it('starts the zedcafe task room after the iframe handshake', () => {
    handleready(device, readymessage({ iframe: true }))

    expect(mockmarkwanixready).toHaveBeenCalledTimes(1)
    expect(mockensurewanixtaskroom).toHaveBeenCalledWith(device, 'player')
  })

  it('does not restart an active room', () => {
    mockreadwanixroomconfig.mockReturnValue({ mode: 'task' })

    handleready(device, readymessage({ iframe: true }))

    expect(mockensurewanixtaskroom).not.toHaveBeenCalled()
  })

  it('does not start from the generic platform ready event', () => {
    handleready(device, readymessage())

    expect(mockmarkwanixready).toHaveBeenCalledTimes(1)
    expect(mockensurewanixtaskroom).not.toHaveBeenCalled()
  })
})

describe('wanixserver ready', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('identifies the iframe handshake to the client', () => {
    handlewanixserverready(device, readymessage())

    expect(mockwanixclientready).toHaveBeenCalledWith(device, 'player', {
      iframe: true,
    })
  })
})
