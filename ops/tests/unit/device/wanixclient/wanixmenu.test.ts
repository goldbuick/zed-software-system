jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixmenustate: jest.fn(),
}))

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
} from 'zss/device/wanixclient/wanixmenu'
import type { WanixMenuState } from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

function idlestate(): WanixMenuState {
  return {
    config: createidleroomconfig(),
    ready: false,
    vmrunning: false,
    vm: null,
    stalled: false,
    sessionkeys: [],
    attachedsessionkey: null,
    activesessionkey: null,
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
    it('shows idle header, drop notice, and vm boot link', () => {
      const tape = buildwanixmenutape(idlestate())
      expect(tape).toContain('HEADER:WANIX $YELLOWidle')
      expect(tape).toContain('drop a .wasm or .tgz to start a task')
      expect(tape).toContain('!wanix vm;boot linux in v86')
      expect(tape).not.toContain('Stop all')
      expect(tape).toContain('SECTION:externals')
    })

    it('lists sessions with attach links', () => {
      const tape = buildwanixmenutape({
        ...idlestate(),
        config: {
          ...createidleroomconfig(),
          mode: 'task',
          tasks: [{ id: 'hello-wasm', cmd: '#ramfs/hello.wasm', running: true }],
        },
        ready: true,
        sessionkeys: ['hello-wasm', 'other-wasm'],
        attachedsessionkey: 'hello-wasm',
        activesessionkey: 'other-wasm',
      })
      expect(tape).toContain('SECTION:attach to session')
      expect(tape).toContain('!wanix attach "hello-wasm";hello-wasm')
      expect(tape).toContain('!wanix attach "other-wasm";other-wasm')
      expect(tape).not.toContain('wanix detach')
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
        sessionkeys: [],
        attachedsessionkey: null,
        activesessionkey: null,
      })
      expect(tape).toContain('HEADER:WANIX $YELLOWtask')
      expect(tape).toContain(
        '!wanix stop "hello-wasm";stop $greenhello-wasm — hello.wasm',
      )
      expect(tape).not.toContain('Stop all')
    })

    it('lists two tasks without stop-all', () => {
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
        sessionkeys: [],
        attachedsessionkey: null,
        activesessionkey: null,
      })
      expect(tape).toContain('!wanix stop "hello-wasm";')
      expect(tape).toContain('!wanix stop "greet-wasm";')
      expect(tape).not.toContain('Stop all')
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
        sessionkeys: [],
        attachedsessionkey: null,
        activesessionkey: null,
      })
      expect(tape).toContain('HEADER:WANIX $YELLOWvm')
      expect(tape).toContain('linux-vm 512M vrid=vm-42')
      expect(tape).toContain('!wanix vm stop;')
      expect(tape).not.toContain('!wanix vm;boot linux in v86')
      expect(tape).not.toContain('Stop all')
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
        sessionkeys: [],
        attachedsessionkey: null,
        activesessionkey: null,
      })
      expect(tape).toContain('menu stale')
      expect(tape).toContain('!wanix stop "hello-wasm";')
    })
  })
})
