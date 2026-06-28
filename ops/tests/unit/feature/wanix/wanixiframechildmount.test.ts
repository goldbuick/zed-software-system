/** @jest-environment jsdom */

jest.mock('zss/feature/wanix/wanixvmassets', () => ({
  readwanixkernelwasmurl: () => '/wanix/kernel.wasm',
}))

import {
  appendwanixgojstasktarget,
  mountwanixsystemtree,
  readzedcafeexportprobe,
  stagezedcafetaskforgojs,
  waitwanixbindmount,
} from 'zss/feature/wanix/wanixiframechildmount'
import {
  createidlewanixiframestate,
} from 'zss/feature/wanix/wanixiframechildtypes'
import {
  WANIX_ZED_CAFE_INBOX_RAMFS,
  WANIX_ZED_CAFE_WASM_RAMFS,
} from 'zss/feature/wanix/wanixzedcafeconstants'

function mockcontroller() {
  return {
    onzedcafeerror: jest.fn(),
    getroot: () => null,
  }
}

describe('wanixiframechildmount zed-cafe staging', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    if (!URL.createObjectURL) {
      URL.createObjectURL = jest.fn(() => 'blob:test-inbox')
    }
  })

  it('mounts wasm on #ramfs only — no inbox or guest-root staging', () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'vm-active',
      mountKey: 1,
      vmid: 'vm1',
      mem: '512M',
      urls: {
        linux: '/wanix/linux.tgz',
        v86: '/wanix/v86.tgz',
      },
    })
    expect(sys).not.toBeNull()
    const binds = sys!.querySelectorAll(':scope > wanix-bind')
    const filebinds = [...binds].filter((b) => b.getAttribute('type') === 'file')
    expect(filebinds).toHaveLength(1)
    expect(filebinds[0]?.getAttribute('dst')).toBe(WANIX_ZED_CAFE_WASM_RAMFS)
    expect(
      sys!.querySelector('wanix-bind[data-zss-zed-cafe-inbox]'),
    ).toBeNull()
  })

  it('creates gojs task without auto-start attribute', () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'task-ready',
      mountKey: 1,
    })!
    const task = appendwanixgojstasktarget(
      sys,
      'zed-cafe',
      WANIX_ZED_CAFE_WASM_RAMFS,
    )
    expect(task.getAttribute('type')).toBe('gojs')
    expect(task.hasAttribute('start')).toBe(false)
    expect(task.getAttribute('cmd')).toBe('#ramfs/zed-cafe.wasm')
  })

  it('stagezedcafetaskforgojs confirms #ramfs inbox bytes', async () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'task-ready',
      mountKey: 1,
    })!
    const payload = Uint8Array.from([123, 125, 10])
    const root = {
      readDir: jest.fn(),
      readFile: jest.fn(async () => payload),
      writeFile: jest.fn(async () => undefined),
    }
    const controller = mockcontroller()
    const ok = await stagezedcafetaskforgojs(sys, root, controller, '3')
    expect(ok).toBe(true)
    expect(root.readFile).toHaveBeenCalledWith(WANIX_ZED_CAFE_INBOX_RAMFS)
    expect(
      sys.querySelector('wanix-bind[data-zss-zed-cafe-inbox]'),
    ).toBeNull()
  })

  it('readzedcafeexportprobe reports inbox and export state', async () => {
    const root = {
      readDir: jest.fn(async () => ['stats.json']),
      readFile: jest.fn(async () => Uint8Array.from([1, 2, 3])),
      writeFile: jest.fn(),
    }
    const probe = await readzedcafeexportprobe(
      root,
      '3',
      false,
      'zed-cafe.wasm',
    )
    expect(probe.taskrid).toBe('3')
    expect(probe.inbox_ramfs_bytes).toBe(3)
    expect(probe.inbox_task_bytes).toBe(3)
    expect(probe.export_listing).toEqual(['stats.json'])
  })

  it('waitwanixbindmount resolves on mount event', async () => {
    const bind = document.createElement('wanix-bind')
    document.body.appendChild(bind)
    const pending = waitwanixbindmount(bind, 1000)
    bind.dispatchEvent(new Event('mount'))
    await expect(pending).resolves.toBeUndefined()
  })
})
