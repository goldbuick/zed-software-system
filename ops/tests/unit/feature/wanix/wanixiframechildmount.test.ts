/** @jest-environment jsdom */

jest.mock('zss/feature/wanix/wanixvmassets', () => ({
  readwanixkernelwasmurl: () => '/wanix/kernel.wasm',
}))

import {
  appendwanixgojstasktarget,
  collectzedcafeexportfiles,
  mountwanixsystemtree,
  readzedcafeexportprobe,
  stagezedcafetaskforgojs,
  waitwanixbindmount,
  waitzedcafeexportready,
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
      bootstage: 'export',
      mountKey: 1,
      vmid: 'vm1',
      mem: '512M',
      urls: {
        linux: '/wanix/linux.tgz',
        v86: '/wanix/v86.tgz',
      },
    })
    expect(sys).not.toBeNull()
    if (!sys) {
      throw new Error('expected system')
    }
    expect(sys.querySelector('wanix-vm')).toBeNull()
    expect(
      sys.querySelector('wanix-bind[dst="vm"]'),
    ).not.toBeNull()
    const binds = sys.querySelectorAll(':scope > wanix-bind')
    const filebinds = [...binds].filter((b) => b.getAttribute('type') === 'file')
    expect(filebinds).toHaveLength(1)
    expect(filebinds[0]?.getAttribute('dst')).toBe(WANIX_ZED_CAFE_WASM_RAMFS)
    expect(
      sys.querySelector('wanix-bind[data-zss-zed-cafe-inbox]'),
    ).toBeNull()
  })

  it('vm-boot stage mounts wanix-vm with #ramfs/zed-cafe file binds', () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'vm-active',
      bootstage: 'boot',
      mountKey: 2,
      vmid: 'vm1',
      mem: '512M',
      urls: {
        linux: '/wanix/linux.tgz',
        v86: '/wanix/v86.tgz',
      },
      zedcafe: {
        cmd: '#ramfs/zed-cafe.wasm',
        generation: 1,
        ready: true,
        taskrid: '2',
        guestfiles: [{ path: 'stats.json', data: [123, 125] }],
      },
    })
    if (!sys) {
      throw new Error('expected system')
    }
    expect(sys.querySelector('wanix-vm')).not.toBeNull()
    expect(
      sys.querySelector('wanix-bind[data-zss-zed-cafe-export-ramfs-file]'),
    ).not.toBeNull()
    expect(
      sys.querySelector('wanix-vm wanix-bind[data-zss-zed-cafe-export="vm-staging"]'),
    ).not.toBeNull()
  })

  it('creates gojs task without auto-start attribute', () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'task-ready',
      mountKey: 1,
    })
    if (!sys) {
      throw new Error('expected system')
    }
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
    })
    if (!sys) {
      throw new Error('expected system')
    }
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

  it('waitzedcafeexportready polls until stats.json appears', async () => {
    jest.useFakeTimers()
    let listed = false
    const root = {
      readDir: jest.fn(async (path: string) => {
        if (path === '#task/4/export' && listed) {
          return ['stats.json']
        }
        if (path === '#task/4/export') {
          throw new Error('file does not exist')
        }
        return []
      }),
      readFile: jest.fn(),
      writeFile: jest.fn(),
    }
    const pending = waitzedcafeexportready(root, '4', 2000)
    await jest.advanceTimersByTimeAsync(300)
    listed = true
    await jest.advanceTimersByTimeAsync(300)
    await expect(pending).resolves.toBe(true)
    jest.useRealTimers()
  })

  it('waitzedcafeexportready returns false on timeout', async () => {
    jest.useFakeTimers()
    const root = {
      readDir: jest.fn(async () => {
        throw new Error('file does not exist')
      }),
      readFile: jest.fn(),
      writeFile: jest.fn(),
    }
    const pending = waitzedcafeexportready(root, '4', 500)
    await jest.advanceTimersByTimeAsync(600)
    await expect(pending).resolves.toBe(false)
    jest.useRealTimers()
  })

  it('mounts remote import bind and vm guest virtfs when remotes present', () => {
    const sys = mountwanixsystemtree({
      ...createidlewanixiframestate(),
      phase: 'vm-active',
      bootstage: 'boot',
      mountKey: 3,
      vmid: 'vm1',
      mem: '512M',
      urls: {
        linux: '/wanix/linux.tgz',
        v86: '/wanix/v86.tgz',
      },
      remotes: [
        {
          id: 'remote-1',
          label: 'remote-1',
          url: 'wss://localhost:7777/wanix-remote-9p',
          mountdst: 'remote',
        },
      ],
    })
    if (!sys) {
      throw new Error('expected system')
    }
    expect(
      sys.querySelector('wanix-bind[type="import"][dst="remote"]'),
    ).not.toBeNull()
    expect(
      sys.querySelector(
        'wanix-vm wanix-bind[data-zss-remote-guest="remote-1"]',
      ),
    ).not.toBeNull()
  })

  it('collectzedcafeexportfiles does not readDir json leaf paths', async () => {
    const statsbytes = Uint8Array.from([123, 34, 105, 100, 34, 58, 34, 112, 49, 34, 125, 10])
    const readdirpaths: string[] = []
    const root = {
      readDir: jest.fn(async (path: string) => {
        readdirpaths.push(path)
        if (/\.json$/.test(path)) {
          throw new Error('readdir invalid argument')
        }
        if (path === '#task/4/export') {
          return ['stats.json', 'books/']
        }
        if (path === '#task/4/export/books') {
          return ['book1/']
        }
        if (path === '#task/4/export/books/book1') {
          return ['pages/']
        }
        if (path === '#task/4/export/books/book1/pages') {
          return ['page1/']
        }
        if (path === '#task/4/export/books/book1/pages/page1') {
          return ['stats.json']
        }
        return []
      }),
      readFile: jest.fn(async (path: string) => {
        if (path.endsWith('stats.json')) {
          return statsbytes
        }
        throw new Error(`missing ${path}`)
      }),
    }

    const files = await collectzedcafeexportfiles(root, '4')
    const stats = files.find((file) => file.path === 'stats.json')
    const pagestats = files.find(
      (file) => file.path === 'books/book1/pages/page1/stats.json',
    )

    expect(stats).toBeDefined()
    expect(pagestats).toBeDefined()
    expect(
      readdirpaths.some((path) => /\.json$/.test(path)),
    ).toBe(false)
  })
})
