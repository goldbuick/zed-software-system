import type { DEVICE } from 'zss/device'
import { apilog, apitoast } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import {
  clearwanixfsamounts,
  haswanixfsamount,
} from 'zss/device/wanixclient/wanixfsamounts'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  apitoast: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: () => 'local-player',
}))

const mockapilog = apilog as jest.Mock
const mockapitoast = apitoast as jest.Mock

describe('handlebindfsa', () => {
  beforeEach(() => {
    clearwanixfsamounts()
    mockapilog.mockClear()
    mockapitoast.mockClear()
  })

  afterEach(() => {
    clearwanixfsamounts()
  })

  it('records mount and toasts when iframe player is empty', async () => {
    const { handlebindfsa } = await import(
      'zss/device/wanixclient/handlers/bindfsa'
    )
    handlebindfsa({} as DEVICE, {
      session: 's',
      player: '',
      id: '1',
      sender: 'x',
      target: 'bindfsa',
      data: { ok: true, dst: 'zed-workspace' },
    } as MESSAGE)
    expect(haswanixfsamount('zed-workspace')).toBe(true)
    expect(mockapilog).toHaveBeenCalledWith(
      expect.anything(),
      'local-player',
      expect.stringContaining('folder mount OK: zed-workspace'),
    )
    expect(mockapitoast).toHaveBeenCalledWith(
      expect.anything(),
      'local-player',
      expect.stringContaining('folder mount OK: zed-workspace'),
    )
  })

  it('toasts failure with local player when iframe player is empty', async () => {
    const { handlebindfsa } = await import(
      'zss/device/wanixclient/handlers/bindfsa'
    )
    handlebindfsa({} as DEVICE, {
      session: 's',
      player: '',
      id: '1',
      sender: 'x',
      target: 'bindfsa',
      data: { ok: false, error: 'wanix room not ready' },
    } as MESSAGE)
    expect(mockapitoast).toHaveBeenCalledWith(
      expect.anything(),
      'local-player',
      expect.stringContaining('folder mount FAILED'),
    )
  })
})
