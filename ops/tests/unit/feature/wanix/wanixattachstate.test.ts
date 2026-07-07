import {
  cyclewanixattachedsession,
  detachwanixterm,
  readattachedsession,
  readwanixactivesession,
  resetwanixattachforidle,
  resetwanixattachstatefortest,
  setattachedsession,
  setwanixactivesession,
  subscribewanixattach,
} from 'zss/feature/wanix/wanixattachstate'

describe('wanixattachstate', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
  })

  it('starts detached with no active session', () => {
    expect(readattachedsession()).toBeNull()
    expect(readwanixactivesession()).toBeNull()
  })

  it('sets and detaches a session', () => {
    setattachedsession('task-a')
    expect(readattachedsession()).toBe('task-a')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
  })

  it('notifies subscribers', () => {
    const seen: Array<string | null> = []
    const unsubscribe = subscribewanixattach(() => {
      seen.push(readattachedsession())
    })
    setattachedsession('task-a')
    detachwanixterm()
    unsubscribe()
    expect(seen).toEqual(['task-a', null])
  })

  it('auto-attaches when worker sets active and nothing is attached', () => {
    setwanixactivesession('linux-vm')
    expect(readattachedsession()).toBe('linux-vm')
    expect(readwanixactivesession()).toBe('linux-vm')
  })

  it('does not steal focus when already attached', () => {
    setattachedsession('task-a')
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixactivesession()).toBe('task-b')
  })

  it('does not auto-attach after manual detach', () => {
    setwanixactivesession('task-a')
    detachwanixterm()
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBeNull()
  })

  it('allows auto-attach again after idle reset', () => {
    setwanixactivesession('task-a')
    detachwanixterm()
    resetwanixattachforidle()
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBe('task-b')
  })

  it('cyclewanixattachedsession no-ops on empty list', () => {
    cyclewanixattachedsession([], 1)
    expect(readattachedsession()).toBeNull()
  })

  it('cyclewanixattachedsession attaches first when nothing attached', () => {
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession attaches last when nothing attached and going back', () => {
    cyclewanixattachedsession(['task-a', 'task-b'], -1)
    expect(readattachedsession()).toBe('task-b')
  })

  it('cyclewanixattachedsession wraps forward', () => {
    setattachedsession('task-b')
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession wraps backward', () => {
    setattachedsession('task-a')
    cyclewanixattachedsession(['task-a', 'task-b'], -1)
    expect(readattachedsession()).toBe('task-b')
  })

  it('cyclewanixattachedsession attaches first when current not in list', () => {
    setattachedsession('missing')
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession clears userdetached', () => {
    setwanixactivesession('task-a')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })
})
