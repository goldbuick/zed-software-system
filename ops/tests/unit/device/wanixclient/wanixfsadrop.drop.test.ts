/**
 * @jest-environment jsdom
 */
import { apierror, apilog } from 'zss/device/api'
import { dropwanixfsadirectory } from 'zss/device/wanixclient/wanixfsadrop'
import {
  iswanixready,
  onwanixready,
  waitwanixiframe,
} from 'zss/device/wanixclient/wanixbridge'
import {
  ensurewanixtaskroom,
  readwanixroomconfig,
} from 'zss/device/wanixclient/wanixroom'
import { WANIX_FSA_BIND_REQUEST } from 'zss/feature/wanix/wanixfsapaths'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  apierror: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: () => 'test-player',
}))

jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  iswanixready: jest.fn(),
  onwanixready: jest.fn(),
  waitwanixiframe: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  ensurewanixtaskroom: jest.fn(),
  readwanixroomconfig: jest.fn(),
}))

const mockapilog = apilog as jest.Mock
const mockapierror = apierror as jest.Mock
const mockisready = iswanixready as jest.Mock
const mockonready = onwanixready as jest.Mock
const mockwaitiframe = waitwanixiframe as jest.Mock
const mockensure = ensurewanixtaskroom as jest.Mock
const mockreadconfig = readwanixroomconfig as jest.Mock

describe('dropwanixfsadirectory', () => {
  const mockpostmessage = jest.fn()
  const handle = {
    name: 'zed-workspace',
    kind: 'directory',
  } as FileSystemDirectoryHandle

  beforeEach(() => {
    jest.clearAllMocks()
    mockwaitiframe.mockResolvedValue({ postMessage: mockpostmessage })
    mockreadconfig.mockReturnValue({ mode: 'idle' })
    mockisready.mockReturnValue(false)
    mockonready.mockImplementation((cb: () => void) => {
      mockisready.mockReturnValue(true)
      cb()
    })
  })

  it('stands up the room, waits for ready, then posts the FSA bind', async () => {
    const order: string[] = []
    mockensure.mockImplementation(() => {
      order.push('ensure')
    })
    mockonready.mockImplementation((cb: () => void) => {
      order.push('ready')
      mockisready.mockReturnValue(true)
      cb()
    })
    mockpostmessage.mockImplementation(() => {
      order.push('bind')
    })

    await dropwanixfsadirectory(handle)

    expect(mockensure).toHaveBeenCalled()
    expect(mockpostmessage).toHaveBeenCalledWith(
      expect.objectContaining({
        request: WANIX_FSA_BIND_REQUEST,
        handle,
        dst: 'zed-workspace',
        player: 'test-player',
      }),
      expect.any(String),
    )
    expect(order).toEqual(['ensure', 'ready', 'bind'])
    expect(mockapilog).toHaveBeenCalledWith(
      expect.anything(),
      'test-player',
      expect.stringContaining('standing up task room'),
    )
    expect(mockapilog).toHaveBeenCalledWith(
      expect.anything(),
      'test-player',
      expect.stringContaining('mounting folder'),
    )
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('skips ensure when the room is already active', async () => {
    mockreadconfig.mockReturnValue({ mode: 'task' })
    mockisready.mockReturnValue(true)

    await dropwanixfsadirectory(handle)

    expect(mockensure).not.toHaveBeenCalled()
    expect(mockpostmessage).toHaveBeenCalled()
  })
})
