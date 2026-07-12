import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

describe('wanixclient drop handlers', () => {
  it('registry wires drop and binddrop', async () => {
    const { wanixclienthandlers } = await import(
      'zss/device/wanixclient/handlers/registry'
    )
    expect(typeof wanixclienthandlers.drop).toBe('function')
    expect(typeof wanixclienthandlers.binddrop).toBe('function')
  })

  it('handledrop calls handlewanixdrop with flat message args', async () => {
    const room = await import('zss/device/wanixclient/wanixroom')
    const drop = jest.spyOn(room, 'handlewanixdrop').mockResolvedValue({
      taskid: 't1',
      cmd: '#ramfs/a.wasm',
      spawns: [{ taskid: 't1', cmd: '#ramfs/a.wasm' }],
    })
    const doasyncmod = await import('zss/device/doasync')
    jest
      .spyOn(doasyncmod, 'doasync')
      .mockImplementation((_device, _player, fn) => {
        void fn()
      })
    const { handledrop } = await import(
      'zss/device/wanixclient/handlers/drop'
    )
    const bytes = new Uint8Array([0, 97, 115, 109])
    const device = {} as DEVICE
    handledrop(device, {
      session: 's',
      player: 'p1',
      id: '1',
      sender: 'x',
      target: 'drop',
      data: ['a.wasm', 'wasm', bytes],
    } as MESSAGE)
    expect(drop).toHaveBeenCalledWith(
      { label: 'a.wasm', kind: 'wasm', bytes },
      device,
      'p1',
    )
    drop.mockRestore()
  })

  it('handlebinddrop resolves session and bind paths', async () => {
    const display = await import('zss/device/wanixclient/wanixdisplay')
    jest.spyOn(display, 'readattachedsession').mockReturnValue('task1')
    const room = await import('zss/device/wanixclient/wanixroom')
    const bind = jest.spyOn(room, 'handlewanixbinddrop').mockResolvedValue({
      ok: true,
      sessionkey: 'task1',
      kind: 'task',
      dst: 'input/level.png',
    })
    const doasyncmod = await import('zss/device/doasync')
    jest
      .spyOn(doasyncmod, 'doasync')
      .mockImplementation((_device, _player, fn) => {
        void fn()
      })
    const { handlebinddrop } = await import(
      'zss/device/wanixclient/handlers/binddrop'
    )
    const bytes = new Uint8Array([1, 2, 3])
    handlebinddrop({} as DEVICE, {
      session: 's',
      player: 'p1',
      id: '1',
      sender: 'x',
      target: 'binddrop',
      data: ['level.png', bytes],
    } as MESSAGE)
    expect(bind).toHaveBeenCalledWith(
      {
        label: 'level.png',
        kind: 'file',
        bytes,
        dst: 'input/level.png',
        perm: '0644',
      },
      'task1',
    )
    bind.mockRestore()
  })
})
