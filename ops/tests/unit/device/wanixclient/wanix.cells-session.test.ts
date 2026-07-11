import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'

describe('wanixclient cells/session', () => {
  it('handlewanixcells applies term read', async () => {
    const termbuffer = await import('zss/device/wanixclient/wanixtermbuffer')
    const apply = jest
      .spyOn(termbuffer, 'applywanixtermread')
      .mockImplementation(() => {})
    const { handlewanixcells } = await import(
      'zss/device/wanixclient/handlers/cells'
    )
    const snapshot = {
      cols: 1,
      rows: 1,
      digest: 'x',
      char: [65],
      color: [7],
      bg: [0],
    } as WanixTermCellsSnapshot
    handlewanixcells({} as DEVICE, {
      session: 's',
      player: '',
      id: '1',
      sender: 'x',
      target: 'cells',
      data: { sessionkey: 'task1', snapshot },
    } as MESSAGE)
    expect(apply).toHaveBeenCalledWith('task1', snapshot)
    apply.mockRestore()
  })

  it('handlewanixsession applies session message', async () => {
    const sessionevents = await import('zss/device/wanixclient/wanixdisplay')
    const apply = jest
      .spyOn(sessionevents, 'applywanixsessionmessage')
      .mockImplementation(() => {})
    const { handlewanixsession } = await import(
      'zss/device/wanixclient/handlers/session'
    )
    handlewanixsession({} as DEVICE, {
      session: 's',
      player: '',
      id: '1',
      sender: 'x',
      target: 'session',
      data: { event: 'open', sessionkey: 'vm1' },
    } as MESSAGE)
    expect(apply).toHaveBeenCalledWith({ event: 'open', sessionkey: 'vm1' })
    apply.mockRestore()
  })
})
