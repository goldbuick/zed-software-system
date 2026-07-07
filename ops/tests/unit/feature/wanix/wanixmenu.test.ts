jest.mock('zss/feature/zsstextui', () => ({
  zssheaderlines: (header: string) => [`HEADER:${header}`],
  zsssectionlines: (section: string) => [`SECTION:${section}`],
  zsstextline: (text: string) => `TEXT:${text}`,
  zsstexttape: (...parts: (string | string[])[]) => {
    const out: string[] = []
    for (const part of parts) {
      if (Array.isArray(part)) {
        out.push(...part)
      } else {
        out.push(part)
      }
    }
    return out.join('\n')
  },
  zsszedlinkline: (command: string, label: string) => `!${command};${label}`,
}))

import {
  buildwanixmenutape,
  readwanixtasklabel,
} from 'zss/feature/wanix/wanixmenutape'
import type { WanixMenuState } from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

function idlestate(): WanixMenuState {
  return {
    config: createidleroomconfig(),
    ready: false,
    vmrunning: false,
    vm: null,
    stalled: false,
  }
}

describe('wanixmenu', () => {
  describe('readwanixtasklabel', () => {
    it('combines task id and cmd basename', () => {
      expect(
        readwanixtasklabel({
          id: 'hello-wasm',
          cmd: '#ramfs/hello.wasm',
        }),
      ).toBe('hello-wasm — hello.wasm')
    })
  })

  describe('buildwanixmenutape', () => {
    it('shows idle header, empty tasks, and vm boot link', () => {
      const tape = buildwanixmenutape(idlestate())
      expect(tape).toContain('HEADER:WANIX — idle')
      expect(tape).toContain('no tasks running')
      expect(tape).toContain('!wanix vm;Boot Linux in v86')
      expect(tape).not.toContain('Stop all')
      expect(tape).not.toContain('SECTION:Control')
    })

    it('lists one task with per-task stop link', () => {
      const tape = buildwanixmenutape({
        config: {
          ...createidleroomconfig(),
          mode: 'task',
          tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm', running: true }],
        },
        ready: true,
        vmrunning: false,
        vm: null,
        stalled: false,
      })
      expect(tape).toContain('HEADER:WANIX — task')
      expect(tape).toContain('!wanix stop "hello-wasm";Stop hello-wasm — hello.wasm')
      expect(tape).toContain('!wanix stop;Stop all')
      expect(tape).not.toContain('Stop all (')
    })

    it('lists two tasks without stop-all under Tasks', () => {
      const tape = buildwanixmenutape({
        config: {
          ...createidleroomconfig(),
          mode: 'task',
          tasks: [
            { id: 'hello-wasm', cmd: '#ramfs/hello.wasm', running: true },
            { id: 'greet-wasm', cmd: '#ramfs/greet.wasm', running: true },
          ],
        },
        ready: true,
        vmrunning: false,
        vm: null,
        stalled: false,
      })
      expect(tape).toContain('!wanix stop "hello-wasm";')
      expect(tape).toContain('!wanix stop "greet-wasm";')
      expect(tape).toContain('!wanix stop;Stop all')
    })

    it('shows running vm status and stop link', () => {
      const tape = buildwanixmenutape({
        config: {
          ...createidleroomconfig(),
          mode: 'vm',
          vm: { id: 'linux-vm', mem: '512M', active: true },
        },
        ready: true,
        vmrunning: true,
        vm: {
          running: true,
          vmid: 'linux-vm',
          vrid: 'vm-42',
          mem: '512M',
        },
        stalled: false,
      })
      expect(tape).toContain('HEADER:WANIX — vm')
      expect(tape).toContain('linux-vm 512M vrid=vm-42')
      expect(tape).toContain('!wanix vm stop;Stop Linux VM')
      expect(tape).not.toContain('!wanix vm;Boot Linux in v86')
      expect(tape).toContain('!wanix stop;Stop all')
    })

    it('shows stalled footnote with local tasks', () => {
      const tape = buildwanixmenutape({
        config: {
          ...createidleroomconfig(),
          mode: 'task',
          tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm', running: true }],
        },
        ready: false,
        vmrunning: false,
        vm: null,
        stalled: true,
      })
      expect(tape).toContain('wanix starting')
      expect(tape).toContain('!wanix stop "hello-wasm";')
    })
  })
})
