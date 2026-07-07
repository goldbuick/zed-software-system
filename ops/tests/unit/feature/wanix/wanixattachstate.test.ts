import {
  detachwanixterm,
  readattachedsession,
  resetwanixattachstatefortest,
  setattachedsession,
  subscribewanixattach,
  tryautoattachwanixterm,
} from 'zss/feature/wanix/wanixattachstate'
import {
  applywanixtermread,
  resetwanixtermbufferfortest,
} from 'zss/feature/wanix/wanixtermbuffer'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import { digestwanixtermcells } from 'zss/feature/wanix/wanixtermgridstate'

function readsnapshot(text: string): WanixTermCellsSnapshot {
  const char = [...text].map((ch) => ch.charCodeAt(0))
  const snapshot: WanixTermCellsSnapshot = {
    cols: text.length,
    rows: 1,
    char,
    color: char.map(() => 15),
    bg: char.map(() => 0),
    cursorx: text.length,
    cursory: 0,
    cursorvisible: true,
    scrollbackrows: 0,
    scrollbackchar: [],
    scrollbackcolor: [],
    scrollbackbg: [],
    digest: '',
  }
  snapshot.digest = digestwanixtermcells(snapshot)
  return snapshot
}

describe('wanixattachstate', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
    resetwanixtermbufferfortest()
  })

  it('starts detached', () => {
    expect(readattachedsession()).toBeNull()
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

  it('auto-attaches the first buffered session', () => {
    applywanixtermread('task-a', readsnapshot('hello'))
    tryautoattachwanixterm()
    expect(readattachedsession()).toBe('task-a')
  })
})
