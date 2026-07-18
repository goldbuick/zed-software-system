/** @jest-environment jsdom */

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  readzedcafeexportstatscontentready: jest.fn(() => false),
}))

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  kebabcasezedcafedirname: jest.fn(
    (name: string | undefined, id: string) =>
      name ? `${String(name).toLowerCase()}-${id}` : id,
  ),
}))

import {
  resetzedcafestate,
  wireallguestroots,
} from 'zss/device/wanixserver/zedcafehost'
import {
  WANIX_ZEDCAFE_GUEST_MOUNT,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type {
  WanixRoot,
  WanixSystemElement,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'

function mockroot(): WanixRoot & {
  bindcalls: Array<[string, string]>
  unbindcalls: Array<[string, string]>
} {
  const bindcalls: Array<[string, string]> = []
  const unbindcalls: Array<[string, string]> = []
  return {
    bindcalls,
    unbindcalls,
    readDir: async () => [],
    readFile: async () => new Uint8Array(),
    readText: async () => '',
    writeFile: async () => {},
    makeDirAll: async () => {},
    appendFile: async () => {},
    remove: async () => {},
    bind: async (name, newname) => {
      bindcalls.push([name, newname])
    },
    unbind: async (name, newname) => {
      unbindcalls.push([name, newname])
    },
    waitFor: async () => {},
    openReadable: async () => new ReadableStream(),
    openWritable: async () => new WritableStream(),
  }
}

describe('wireallguestroots', () => {
  beforeEach(() => {
    resetzedcafestate()
    document.body.replaceChildren()
  })

  it('binds export src to zedcafe on system and vm task roots', async () => {
    const sysroot = mockroot()
    const vmroot = mockroot()
    const sys = document.createElement('wanix-namespace') as WanixSystemElement
    const vm = document.createElement('wanix-vm') as WanixVmElement
    sys.root = sysroot
    ;(vm as WanixVmElement).task = {
      root: vmroot,
    } as WanixVmElement['task']
    sys.appendChild(vm)
    document.body.appendChild(sys)
    const taskrid = 'task-wire'

    const count = await wireallguestroots(sys, taskrid)

    const src = readwanixzedcafeexportsrc(taskrid)
    expect(count).toBe(2)
    expect(sysroot.bindcalls).toEqual([[src, WANIX_ZEDCAFE_GUEST_MOUNT]])
    expect(vmroot.bindcalls).toEqual([[src, WANIX_ZEDCAFE_GUEST_MOUNT]])
  })

  it('waits for late vm.task.root then binds', async () => {
    const sysroot = mockroot()
    const vmroot = mockroot()
    const sys = document.createElement('wanix-namespace') as WanixSystemElement
    const vm = document.createElement('wanix-vm') as WanixVmElement
    sys.root = sysroot
    ;(vm as WanixVmElement).task = {} as WanixVmElement['task']
    sys.appendChild(vm)
    document.body.appendChild(sys)
    const taskrid = 'task-late-wire'

    setTimeout(() => {
      ;(vm as WanixVmElement).task = {
        root: vmroot,
      } as WanixVmElement['task']
    }, 50)

    const count = await wireallguestroots(sys, taskrid)

    const src = readwanixzedcafeexportsrc(taskrid)
    expect(count).toBe(2)
    expect(sysroot.bindcalls).toEqual([[src, WANIX_ZEDCAFE_GUEST_MOUNT]])
    expect(vmroot.bindcalls).toEqual([[src, WANIX_ZEDCAFE_GUEST_MOUNT]])
  })
})
