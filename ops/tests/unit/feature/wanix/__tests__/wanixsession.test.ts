import {
  clearwanixtasks,
  clearwanixvms,
  iswanixtermactive,
  iswanixtermraw,
  readwanixattached,
  readwanixattachedkind,
  readwanixtask,
  readwanixtasks,
  readwanixvm,
  readwanixvms,
  registertask,
  registervm,
  removetask,
  removevm,
  resetwanixsessionfortest,
  setwanixattached,
  setwanixtermrouting,
} from 'zss/feature/wanix/wanixsession'

describe('wanixsession', () => {
  beforeEach(() => {
    resetwanixsessionfortest()
  })

  it('starts with no tasks or attachment', () => {
    expect(readwanixtasks()).toEqual([])
    expect(readwanixvms()).toEqual([])
    expect(readwanixattached()).toBeNull()
    expect(readwanixattachedkind()).toBeNull()
    expect(iswanixtermactive()).toBe(false)
    expect(iswanixtermraw()).toBe(false)
  })

  it('registers and reads tasks', () => {
    registertask({ id: 'hello-wasm', label: 'hello.wasm', entrycmd: 'hello.wasm' })
    expect(readwanixtasks()).toHaveLength(1)
    expect(readwanixtask('hello-wasm')?.label).toBe('hello.wasm')
  })

  it('registers and reads vms', () => {
    registervm({ id: 'linux-vm', label: 'linux-vm', mem: '512M' })
    expect(readwanixvms()).toHaveLength(1)
    expect(readwanixvm('linux-vm')?.mem).toBe('512M')
  })

  it('tracks task attachment and term routing', () => {
    registertask({ id: 'a-wasm', label: 'a.wasm', entrycmd: 'a.wasm' })
    setwanixattached('task', 'a-wasm')
    expect(readwanixattached()).toBe('a-wasm')
    expect(readwanixattachedkind()).toBe('task')
    expect(iswanixtermactive()).toBe(true)
    expect(iswanixtermraw()).toBe(false)
    setwanixtermrouting(false)
    expect(iswanixtermactive()).toBe(false)
    expect(readwanixattached()).toBe('a-wasm')
  })

  it('tracks vm attachment as raw term', () => {
    registervm({ id: 'linux-vm', label: 'linux-vm', mem: '512M' })
    setwanixattached('vm', 'linux-vm')
    expect(readwanixattachedkind()).toBe('vm')
    expect(iswanixtermactive()).toBe(true)
    expect(iswanixtermraw()).toBe(true)
  })

  it('removes task and clears attachment when attached task removed', () => {
    registertask({ id: 'a-wasm', label: 'a.wasm', entrycmd: 'a.wasm' })
    setwanixattached('task', 'a-wasm')
    removetask('a-wasm')
    expect(readwanixtasks()).toEqual([])
    expect(readwanixattached()).toBeNull()
    expect(iswanixtermactive()).toBe(false)
  })

  it('removes vm and clears attachment when attached vm removed', () => {
    registervm({ id: 'linux-vm', label: 'linux-vm', mem: '512M' })
    setwanixattached('vm', 'linux-vm')
    removevm('linux-vm')
    expect(readwanixvms()).toEqual([])
    expect(readwanixattached()).toBeNull()
    expect(iswanixtermraw()).toBe(false)
  })

  it('clearwanixtasks resets task state', () => {
    registertask({ id: 'a-wasm', label: 'a.wasm', entrycmd: 'a.wasm' })
    setwanixattached('task', 'a-wasm')
    clearwanixtasks()
    expect(readwanixtasks()).toEqual([])
    expect(readwanixattached()).toBeNull()
  })

  it('clearwanixvms resets vm state', () => {
    registervm({ id: 'linux-vm', label: 'linux-vm', mem: '512M' })
    setwanixattached('vm', 'linux-vm')
    clearwanixvms()
    expect(readwanixvms()).toEqual([])
    expect(readwanixattached()).toBeNull()
  })
})
