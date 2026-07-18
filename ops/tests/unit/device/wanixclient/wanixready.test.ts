import type { DEVICE } from 'zss/device'
import { wanixclientready } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { handleready } from 'zss/device/wanixclient/handlers/ready'
import { markwanixready } from 'zss/device/wanixclient/wanixbridge'
import { handleready as handlewanixserverready } from 'zss/device/wanixserver/handlers/ready'

jest.mock('zss/device/api', () => ({
  wanixclientready: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  markwanixready: jest.fn(),
}))

const mockmarkwanixready = markwanixready as jest.Mock
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
  })

  it('marks wanix ready without standing up a task room', () => {
    handleready(device, readymessage({ iframe: true }))

    expect(mockmarkwanixready).toHaveBeenCalledTimes(1)
  })

  it('marks ready from the generic platform ready event', () => {
    handleready(device, readymessage())

    expect(mockmarkwanixready).toHaveBeenCalledTimes(1)
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
