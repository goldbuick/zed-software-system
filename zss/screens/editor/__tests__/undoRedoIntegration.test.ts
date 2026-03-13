/**
 * Integration tests: stack + log.undo + rebase + apply against a real CRDT model.
 * Exercises the same flow as useUndoRedo (onFlush → recordpatch, undo/redo with log.undo and applyPatch)
 * to catch issues like garbled text when undo/redo is mixed with edits.
 */

import { Log } from 'json-joy/lib/json-crdt/log/Log'
import { Model } from 'json-joy/lib/json-crdt'
import type { Patch } from 'json-joy/lib/json-crdt-patch'
import {
  consumeLocalPatchFlag,
  markNextPatchAsLocal,
  patchAffectsNode,
  type NodeId,
} from 'zss/device/modem'
import { createundoredostacks } from 'zss/screens/editor/undoRedoStacks'

let testmodel: Model | null = null
let testlog: ReturnType<typeof Log.from> | null = null

jest.mock('zss/device/modem', () => {
  const actual =
    jest.requireActual<typeof import('zss/device/modem')>('zss/device/modem')
  return {
    ...actual,
    getModemLog: () => testlog,
    modemApplyAndSyncPatch: (patch: Patch) => {
      testmodel?.applyPatch(patch)
    },
  }
})

function getstrapi() {
  const model = testlog?.end ?? testmodel
  if (!model) return null
  const root = model.api.obj()
  const codeval = root.get('code') as unknown as {
    get?: () => {
      asStr?: () => {
        view: () => string
        ins: (i: number, t: string) => void
        del: (i: number, len: number) => void
        node: { id: { sid: number; time: number } }
      }
    }
    asStr?: () => {
      view: () => string
      ins: (i: number, t: string) => void
      del: (i: number, len: number) => void
      node: { id: { sid: number; time: number } }
    }
  }
  return codeval?.get?.()?.asStr?.() ?? codeval?.asStr?.() ?? null
}

function getstringcontent(): string {
  const api = getstrapi()
  return api?.view() ?? ''
}

function getnodeid(): NodeId | null {
  const api = getstrapi()
  if (!api?.node?.id) return null
  const id = api.node.id
  return { sid: id.sid, time: id.time }
}

describe('undo/redo integration', () => {
  let stacks: ReturnType<typeof createundoredostacks<Patch>>
  let nodeid: NodeId
  let unsubflush: () => void

  beforeEach(() => {
    testmodel = Model.create()
    testmodel.api.set({})
    testmodel.api.autoFlush(true)
    testmodel.api.obj().set({ code: '' })
    testlog = Log.from(testmodel)
    nodeid = getnodeid()!
    stacks = createundoredostacks<Patch>()

    const log = testlog
    const undocallback = (patch: Patch) => {
      const undoPatch = log.undo(patch)
      testmodel?.applyPatch(undoPatch)
      const redocallback = (dopatch: Patch) => {
        const redoPatch = dopatch.rebase(log.end.clock.time)
        testmodel?.applyPatch(redoPatch)
        const nextundo = (redone: Patch) => {
          const revert = log.undo(redone)
          testmodel?.applyPatch(revert)
          return { redoitem: [redone, redocallback], applied: revert }
        }
        return { undoitem: [redoPatch, nextundo], applied: redoPatch }
      }
      return { redoitem: [patch, redocallback], applied: undoPatch }
    }

    unsubflush = log.end.api.onFlush.listen((patch: Patch) => {
      if (!consumeLocalPatchFlag()) return
      if (!patchAffectsNode(patch, nodeid)) return
      stacks.recordpatch(patch, undocallback)
    })
  })

  afterEach(() => {
    unsubflush()
    testmodel = null
    testlog = null
  })

  function localinsert(text: string): Promise<void> {
    const api = getstrapi()
    if (!api) return Promise.resolve()
    markNextPatchAsLocal()
    const len = api.view().length
    api.ins(len, text)
    return new Promise((r) => setTimeout(r, 0))
  }

  function localdelete(index: number, count: number): Promise<void> {
    const api = getstrapi()
    if (!api) return Promise.resolve()
    markNextPatchAsLocal()
    api.del(index, count)
    return new Promise((r) => setTimeout(r, 0))
  }

  it('insert then undo produces empty string', async () => {
    await localinsert('ab')
    expect(getstringcontent()).toBe('ab')
    expect(stacks.undolength()).toBe(1)
    stacks.undo()
    expect(getstringcontent()).toBe('')
  })

  it('insert, undo, insert (new edit) then undo reverts only second insert', async () => {
    await localinsert('ab')
    stacks.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('x')
    expect(getstringcontent()).toBe('x')
    stacks.undo()
    expect(getstringcontent()).toBe('')
  })

  it('insert, undo, insert, undo, redo leaves only second insert', async () => {
    await localinsert('ab')
    stacks.undo()
    await localinsert('x')
    stacks.undo()
    expect(getstringcontent()).toBe('')
    stacks.redo()
    expect(getstringcontent()).toBe('x')
  })

  it('insert ab, undo, insert x, redo is no-op (redo stack was cleared)', async () => {
    await localinsert('ab')
    stacks.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('x')
    expect(stacks.redolength()).toBe(0)
    const result = stacks.redo()
    expect(result).toBeUndefined()
    expect(getstringcontent()).toBe('x')
  })

  it('two inserts, undo, undo, new insert, undo: only new insert is reverted', async () => {
    await localinsert('a')
    await localinsert('b')
    expect(getstringcontent()).toBe('ab')
    stacks.undo()
    stacks.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('z')
    expect(getstringcontent()).toBe('z')
    stacks.undo()
    expect(getstringcontent()).toBe('')
  })

  describe('undo 5 then type then redo', () => {
    it('after 5 undos, typing clears redo; redo 5 times does nothing', async () => {
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      expect(getstringcontent()).toBe('abcde')
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('')
      expect(stacks.redolength()).toBe(5)
      await localinsert('X')
      expect(getstringcontent()).toBe('X')
      expect(stacks.redolength()).toBe(0)
      expect(stacks.undolength()).toBe(1)
      const r1 = stacks.redo()
      const r2 = stacks.redo()
      const r3 = stacks.redo()
      const r4 = stacks.redo()
      const r5 = stacks.redo()
      expect(r1).toBeUndefined()
      expect(r2).toBeUndefined()
      expect(r3).toBeUndefined()
      expect(r4).toBeUndefined()
      expect(r5).toBeUndefined()
      expect(getstringcontent()).toBe('X')
    })

    it('after 5 undos, type 3 chars, try redo 5: only 3 redos apply (after undoing the 3 first)', async () => {
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      expect(getstringcontent()).toBe('abcde')
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('x')
      await localinsert('y')
      await localinsert('z')
      expect(getstringcontent()).toBe('xyz')
      stacks.undo()
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('')
      expect(stacks.redolength()).toBe(3)
      stacks.redo()
      stacks.redo()
      stacks.redo()
      expect(getstringcontent()).toBe('xyz')
      const r4 = stacks.redo()
      const r5 = stacks.redo()
      expect(r4).toBeUndefined()
      expect(r5).toBeUndefined()
      expect(getstringcontent()).toBe('xyz')
    })

    it('after 5 undos then typing, redo never brings back the original 5 entries', async () => {
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('N')
      await localinsert('E')
      await localinsert('W')
      expect(getstringcontent()).toBe('NEW')
      for (let i = 0; i < 5; i++) {
        stacks.redo()
      }
      expect(getstringcontent()).toBe('NEW')
    })

    it('5 undos, type one, undo that one, redo once: only new char comes back', async () => {
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('Q')
      expect(getstringcontent()).toBe('Q')
      stacks.undo()
      expect(getstringcontent()).toBe('')
      expect(stacks.redolength()).toBe(1)
      stacks.redo()
      expect(getstringcontent()).toBe('Q')
      stacks.redo()
      expect(getstringcontent()).toBe('Q')
    })
  })

  describe('interleaved undo and new edits', () => {
    it('undo 2, type, undo 2 again (of new), redo 2: only new text back', async () => {
      await localinsert('1')
      await localinsert('2')
      await localinsert('3')
      await localinsert('4')
      expect(getstringcontent()).toBe('1234')
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('12')
      await localinsert('a')
      await localinsert('b')
      expect(getstringcontent()).toBe('12ab')
      stacks.undo()
      stacks.undo()
      expect(getstringcontent()).toBe('12')
      stacks.redo()
      stacks.redo()
      expect(getstringcontent()).toBe('12ab')
    })

    it('alternating: each new insert clears redo so only last undone edit can redo', async () => {
      await localinsert('a')
      stacks.undo()
      await localinsert('b')
      stacks.undo()
      await localinsert('c')
      stacks.undo()
      expect(getstringcontent()).toBe('')
      expect(stacks.redolength()).toBe(1)
      stacks.redo()
      expect(getstringcontent()).toBe('c')
      const r2 = stacks.redo()
      const r3 = stacks.redo()
      expect(r2).toBeUndefined()
      expect(r3).toBeUndefined()
      expect(getstringcontent()).toBe('c')
    })
  })
})
