import {
  applywanixtermread,
  clearwanixtermbuffers,
  readwanixtermbuffer,
  readwanixtermbufferkeys,
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

describe('wanixtermbuffer', () => {
  afterEach(() => {
    resetwanixtermbufferfortest()
  })

  it('stores per-session snapshots', () => {
    applywanixtermread('task-a', readsnapshot('hello'))
    expect(readwanixtermbufferkeys()).toEqual(['task-a'])
    expect(readwanixtermbuffer('task-a')?.char[0]).toBe('h'.charCodeAt(0))
  })

  it('dedupes identical digests', () => {
    const first = applywanixtermread('task-a', readsnapshot('hello'))
    const second = applywanixtermread('task-a', readsnapshot('hello'))
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(readwanixtermbuffer('task-a')?.version).toBe(1)
  })

  it('bumps version when digest changes', () => {
    applywanixtermread('task-a', readsnapshot('hello'))
    applywanixtermread('task-a', readsnapshot('hello!'))
    expect(readwanixtermbuffer('task-a')?.version).toBe(2)
  })

  it('clears all sessions', () => {
    applywanixtermread('task-a', readsnapshot('a'))
    applywanixtermread('task-b', readsnapshot('b'))
    clearwanixtermbuffers()
    expect(readwanixtermbufferkeys()).toEqual([])
  })
})
