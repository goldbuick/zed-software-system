/**
 * Integration tests: Y.UndoManager + modem (getUndoManager, setCursorBeforeEdit, registerCursorRestore).
 * Exercises the same scenarios as before (insert/undo/redo, interleaved edits, redo clear on new edit).
 */

import {
  getSharedTextHandleForTest,
  getUndoManager,
  markNextPatchAsLocal,
  registerCursorRestore,
  resetKeyForTest,
  setCursorBeforeEdit,
} from 'zss/device/modem'

const CODEKEY = 'undoRedoIntegrationCode'

function gettext() {
  return getSharedTextHandleForTest(CODEKEY)
}

function getstringcontent(): string {
  const handle = gettext()
  return handle?.toJSON() ?? ''
}

async function localinsert(text: string): Promise<void> {
  const handle = gettext()
  if (!handle) {
    return
  }
  markNextPatchAsLocal()
  const len = handle.length
  setCursorBeforeEdit(CODEKEY, len)
  handle.insert(len, text)
  await new Promise((r) => setTimeout(r, 0))
}

describe('undo/redo integration', () => {
  function getUm() {
    return getUndoManager(CODEKEY)
  }

  beforeEach(() => {
    resetKeyForTest(CODEKEY)
    getUm()
  })

  it('insert then undo produces empty string', async () => {
    registerCursorRestore(CODEKEY, () => {})
    await localinsert('ab')
    expect(getstringcontent()).toBe('ab')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
  })

  it('insert, undo, insert (new edit) then undo reverts only second insert', async () => {
    registerCursorRestore(CODEKEY, () => {})
    await localinsert('ab')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('x')
    expect(getstringcontent()).toBe('x')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
  })

  it('insert, undo, insert, undo, redo leaves only second insert', async () => {
    registerCursorRestore(CODEKEY, () => {})
    await localinsert('ab')
    getUm()!.undo()
    await localinsert('x')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
    getUm()!.redo()
    expect(getstringcontent()).toBe('x')
  })

  it('insert ab, undo, insert x, redo is no-op (redo stack was cleared)', async () => {
    registerCursorRestore(CODEKEY, () => {})
    await localinsert('ab')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('x')
    getUm()!.redo()
    expect(getstringcontent()).toBe('x')
  })

  it('two inserts, undo, undo, new insert, undo: only new insert is reverted', async () => {
    registerCursorRestore(CODEKEY, () => {})
    await localinsert('a')
    await localinsert('b')
    expect(getstringcontent()).toBe('ab')
    getUm()!.undo()
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
    await localinsert('z')
    expect(getstringcontent()).toBe('z')
    getUm()!.undo()
    expect(getstringcontent()).toBe('')
  })

  describe('undo 5 then type then redo', () => {
    it('after 5 undos, typing clears redo; redo does nothing', async () => {
      registerCursorRestore(CODEKEY, () => {})
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      expect(getstringcontent()).toBe('abcde')
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('X')
      expect(getstringcontent()).toBe('X')
      getUm()!.redo()
      getUm()!.redo()
      getUm()!.redo()
      getUm()!.redo()
      getUm()!.redo()
      expect(getstringcontent()).toBe('X')
    })

    it('after 5 undos, type 3 chars, undo 3, redo 3: back to xyz', async () => {
      registerCursorRestore(CODEKEY, () => {})
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      expect(getstringcontent()).toBe('abcde')
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('x')
      await localinsert('y')
      await localinsert('z')
      expect(getstringcontent()).toBe('xyz')
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      getUm()!.redo()
      getUm()!.redo()
      getUm()!.redo()
      expect(getstringcontent()).toBe('xyz')
    })

    it('5 undos, type one, undo that one, redo once: only new char comes back', async () => {
      registerCursorRestore(CODEKEY, () => {})
      await localinsert('a')
      await localinsert('b')
      await localinsert('c')
      await localinsert('d')
      await localinsert('e')
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      await localinsert('Q')
      expect(getstringcontent()).toBe('Q')
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      getUm()!.redo()
      expect(getstringcontent()).toBe('Q')
      getUm()!.redo()
      expect(getstringcontent()).toBe('Q')
    })
  })

  describe('interleaved undo and new edits', () => {
    it('undo 2, type, undo 2 again (of new), redo 2: only new text back', async () => {
      registerCursorRestore(CODEKEY, () => {})
      await localinsert('1')
      await localinsert('2')
      await localinsert('3')
      await localinsert('4')
      expect(getstringcontent()).toBe('1234')
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('12')
      await localinsert('a')
      await localinsert('b')
      expect(getstringcontent()).toBe('12ab')
      getUm()!.undo()
      getUm()!.undo()
      expect(getstringcontent()).toBe('12')
      getUm()!.redo()
      getUm()!.redo()
      expect(getstringcontent()).toBe('12ab')
    })

    it('alternating: each new insert clears redo so only last undone edit can redo', async () => {
      registerCursorRestore(CODEKEY, () => {})
      await localinsert('a')
      getUm()!.undo()
      await localinsert('b')
      getUm()!.undo()
      await localinsert('c')
      getUm()!.undo()
      expect(getstringcontent()).toBe('')
      getUm()!.redo()
      expect(getstringcontent()).toBe('c')
      getUm()!.redo()
      getUm()!.redo()
      expect(getstringcontent()).toBe('c')
    })
  })
})
