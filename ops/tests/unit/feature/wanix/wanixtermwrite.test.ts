const mocktermwrite = jest.fn()
const mockapierror = jest.fn()

jest.mock('zss/feature/wanix/wanixhost', () => ({
  sendwanixtermwrite: (...args: unknown[]) => mocktermwrite(...args),
}))

jest.mock('zss/feature/wanix/wanixsession', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixsession')
  return {
    ...actual,
    iswanixtermraw: jest.fn(() => false),
  }
})

jest.mock('zss/device/api', () => ({
  apierror: (...args: unknown[]) => mockapierror(...args),
}))

import { wanixhandletermwrite } from 'zss/feature/wanix/wanixdrop'
import { wanixtermscreenwritepong } from 'zss/feature/wanix/wanixtermscreen'

jest.mock('zss/feature/wanix/wanixtermscreen', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixtermscreen')
  return {
    ...actual,
    wanixtermscreenwritepong: jest.fn(),
  }
})

describe('wanixhandletermwrite', () => {
  const device = { emit: jest.fn() }
  const player = 'player1'

  beforeEach(() => {
    jest.clearAllMocks()
    mocktermwrite.mockResolvedValue(undefined)
  })

  it('sends line to host without scrollback echo', async () => {
    await wanixhandletermwrite(device, player, 'hello')

    expect(mocktermwrite).toHaveBeenCalledWith('hello')
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('writes pong on screen when line is ping', async () => {
    await wanixhandletermwrite(device, player, 'ping')

    expect(wanixtermscreenwritepong).toHaveBeenCalled()
  })

  it('does not echo when term-write fails', async () => {
    mocktermwrite.mockRejectedValue(new Error('no active task'))

    await wanixhandletermwrite(device, player, 'ping')

    expect(mockapierror).toHaveBeenCalledWith(
      device,
      player,
      'wanix',
      'no active task',
    )
    expect(wanixtermscreenwritepong).not.toHaveBeenCalled()
  })
})
