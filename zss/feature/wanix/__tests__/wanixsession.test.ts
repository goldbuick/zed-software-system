import {
  clearwanixpending,
  enablewanixstdinrouting,
  formatwanixstatelines,
  iswanixstdinactive,
  readwanixbinary,
  readwanixlastexit,
  readwanixpending,
  readwanixphase,
  readwanixstdinrouting,
  resetwanixsessionfortest,
  setwanixhalted,
  setwanixidle,
  setwanixrunning,
  setwanixstdinrouting,
  setwanixstopped,
  stashwanixpending,
} from 'zss/feature/wanix/wanixsession'

describe('wanixsession', () => {
  beforeEach(() => {
    resetwanixsessionfortest()
  })

  it('starts idle with no binary or pending', () => {
    expect(readwanixphase()).toBe('idle')
    expect(readwanixbinary()).toBeNull()
    expect(readwanixpending()).toBeNull()
  })

  it('stash pending while running without changing phase', () => {
    setwanixrunning({ label: 'a.wasm', entrycmd: 'a.wasm' })
    stashwanixpending({
      label: 'b.wasm',
      kind: 'wasm',
      bytes: new Uint8Array([1]),
    })
    expect(readwanixphase()).toBe('running')
    expect(readwanixbinary()?.label).toBe('a.wasm')
    expect(readwanixpending()?.label).toBe('b.wasm')
  })

  it('clears pending on clearwanixpending', () => {
    setwanixrunning({ label: 'a.wasm', entrycmd: 'a.wasm' })
    stashwanixpending({
      label: 'b.wasm',
      kind: 'wasm',
      bytes: new Uint8Array(),
    })
    clearwanixpending()
    expect(readwanixpending()).toBeNull()
    expect(readwanixphase()).toBe('running')
  })

  it('running clears pending and last exit', () => {
    setwanixstopped(0)
    stashwanixpending({
      label: 'next.wasm',
      kind: 'wasm',
      bytes: new Uint8Array(),
    })
    setwanixrunning({ label: 'next.wasm', entrycmd: 'next.wasm' })
    expect(readwanixphase()).toBe('running')
    expect(readwanixpending()).toBeNull()
    expect(readwanixlastexit()).toBeUndefined()
  })

  it('stopped records exit code', () => {
    setwanixrunning({ label: 'demo.wasm', entrycmd: 'demo.wasm' })
    setwanixstopped(42)
    expect(readwanixphase()).toBe('stopped')
    expect(readwanixlastexit()).toBe(42)
  })

  it('halted stops without exit code', () => {
    setwanixrunning({ label: 'demo.wasm', entrycmd: 'demo.wasm' })
    setwanixhalted()
    expect(readwanixphase()).toBe('stopped')
    expect(readwanixlastexit()).toBeUndefined()
  })

  it('idle clears binary pending and exit', () => {
    setwanixstopped(0)
    setwanixidle()
    expect(readwanixphase()).toBe('idle')
    expect(readwanixbinary()).toBeNull()
    expect(readwanixpending()).toBeNull()
    expect(readwanixlastexit()).toBeUndefined()
  })

  it('running starts with stdin routing off until needed', () => {
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    expect(readwanixstdinrouting()).toBe(false)
    expect(iswanixstdinactive()).toBe(false)
  })

  it('enablewanixstdinrouting activates once while running', () => {
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    expect(enablewanixstdinrouting()).toBe(true)
    expect(readwanixstdinrouting()).toBe(true)
    expect(enablewanixstdinrouting()).toBe(false)
  })

  it('detach clears routing without stopping phase', () => {
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    setwanixstdinrouting(false)
    expect(readwanixphase()).toBe('running')
    expect(iswanixstdinactive()).toBe(false)
  })

  it('halted clears stdin routing', () => {
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    setwanixhalted()
    expect(readwanixstdinrouting()).toBe(false)
  })

  it('formatwanixstatelines reflects phase and host readiness', () => {
    expect(formatwanixstatelines(false).join('\n')).toContain('drop to start')
    expect(formatwanixstatelines(true).join('\n')).toContain('sandbox warm')
    setwanixrunning({ label: 'run.wasm', entrycmd: 'run.wasm' })
    expect(formatwanixstatelines(true).join('\n')).toContain('running')
    expect(formatwanixstatelines(true).join('\n')).toContain('stdin off')
    expect(formatwanixstatelines(true).join('\n')).toContain('#wanix attach')
    enablewanixstdinrouting()
    expect(formatwanixstatelines(true).join('\n')).toContain('stdin on')
    expect(formatwanixstatelines(true).join('\n')).toContain('#wanix detach')
    setwanixstopped(0)
    expect(formatwanixstatelines(true).join('\n')).toContain('stopped')
    expect(formatwanixstatelines(true).join('\n')).toContain('run.wasm')
    expect(formatwanixstatelines(true).join('\n')).toContain('exit 0')
    stashwanixpending({
      label: 'pending.wasm',
      kind: 'wasm',
      bytes: new Uint8Array(),
    })
    expect(formatwanixstatelines(true).join('\n')).toContain('pending.wasm')
  })
})
