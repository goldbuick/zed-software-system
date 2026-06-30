/** @jest-environment jsdom */

import { createwanixiframechildcontroller } from 'zss/feature/wanix/wanixiframechildcontroller'

const mockroot = {
  readDir: jest.fn(async () => []),
  readFile: jest.fn(async () => new Uint8Array()),
  writeFile: jest.fn(async () => undefined),
}

describe('wanixiframechildcontroller vm activation', () => {
  it('activatevm does not bump roommountkey or remount room', async () => {
    const controller = createwanixiframechildcontroller()
    const boot = controller.handlerrpc(
      { type: 'zss-wanix-term-rpc', method: 'bootroom', id: 1, args: [{ vmcapable: true }] },
      null,
    )
    controller.onsystemready(mockroot)
    await boot

    const spawn = controller.handlerrpc(
      {
        type: 'zss-wanix-term-rpc',
        method: 'spawnvm',
        id: 2,
        args: ['linux-vm', '512M', []],
      },
      null,
    )
    const beforekey = controller.getstate().roommountkey
    controller.activatevm([{ path: 'stats.json', data: [123, 125] }])
    const next = controller.getstate()
    expect(next.roommountkey).toBe(beforekey)
    expect(next.room).toBe('ready')
    expect(next.vm?.bootstage).toBe('activating')
    controller.onspawnvmerror(new Error('test cleanup'))
    await spawn.catch(() => undefined)
  })

  it('upgradetovmroom preserves zedcafe bootstrap payload', async () => {
    const controller = createwanixiframechildcontroller()
    const boot = controller.handlerrpc(
      {
        type: 'zss-wanix-term-rpc',
        method: 'bootroom',
        id: 1,
        args: [{ vmcapable: false }],
      },
      null,
    )
    controller.onsystemready(mockroot)
    await boot

    const guestfiles = [
      { path: 'stats.json', data: [123, 125] },
      { path: 'books/demo-book1/stats.json', data: [1, 2, 3] },
    ]
    const upgrade = controller.handlerrpc(
      {
        type: 'zss-wanix-term-rpc',
        method: 'bootroom',
        id: 2,
        args: [
          {
            vmcapable: true,
            zedcafe: {
              cmd: '#ramfs/zedcafe.wasm',
              generation: 1,
              ready: false,
              taskrid: null,
              guestfiles,
              inboxbytes: [123, 125, 10],
            },
          },
        ],
      },
      null,
    )
    controller.onsystemready(mockroot)
    await upgrade

    const next = controller.getstate()
    expect(next.vmcapable).toBe(true)
    expect(next.zedcafe?.guestfiles).toEqual(guestfiles)
    expect(next.zedcafe?.inboxbytes).toEqual([123, 125, 10])
  })
})
