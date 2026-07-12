import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'

describe('wanixclient drop handlers', () => {
  it('registry wires dropdone and binddrop result handlers', async () => {
    const { wanixclienthandlers } = await import(
      'zss/device/wanixclient/handlers/registry'
    )
    expect(typeof wanixclienthandlers.dropdone).toBe('function')
    expect(typeof wanixclienthandlers.binddrop).toBe('function')
    expect(wanixclienthandlers.drop).toBeUndefined()
  })

  it('handledropdone applies drop result', async () => {
    const room = await import('zss/device/wanixclient/wanixroom')
    const apply = jest.spyOn(room, 'applywanixdropdone').mockImplementation(() => {})
    const { handledropdone } = await import(
      'zss/device/wanixclient/handlers/dropdone'
    )
    const device = {} as DEVICE
    handledropdone(device, {
      session: 's',
      player: 'p1',
      id: '1',
      sender: 'x',
      target: 'dropdone',
      data: {
        taskid: 't1',
        cmd: '#ramfs/a.wasm',
        spawns: [{ taskid: 't1', cmd: '#ramfs/a.wasm' }],
      },
    } as MESSAGE)
    expect(apply).toHaveBeenCalled()
    apply.mockRestore()
  })

  it('handlebinddrop logs success result from iframe', async () => {
    const api = await import('zss/device/api')
    const log = jest.spyOn(api, 'apilog').mockImplementation(() => true)
    const { handlebinddrop } = await import(
      'zss/device/wanixclient/handlers/binddrop'
    )
    handlebinddrop({} as DEVICE, {
      session: 's',
      player: 'p1',
      id: '1',
      sender: 'x',
      target: 'binddrop',
      data: {
        ok: true,
        sessionkey: 'task1',
        dst: 'input/level.png',
      },
    } as MESSAGE)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
