import {
  consumeLocalPatchFlag,
  destroyModemForTest,
  getSharedTextHandleForTest,
  getUndoManager,
  markNextPatchAsLocal,
  modemwriteinitstring,
  registerCursorRestore,
  setCursorBeforeEdit,
} from 'zss/device/modem'

describe('modemUndo', () => {
  afterAll(() => {
    destroyModemForTest()
  })
  describe('markNextPatchAsLocal / consumeLocalPatchFlag', () => {
    it('consumeLocalPatchFlag returns false by default', () => {
      expect(consumeLocalPatchFlag()).toBe(false)
    })

    it('consumeLocalPatchFlag returns true once after markNextPatchAsLocal', () => {
      markNextPatchAsLocal()
      expect(consumeLocalPatchFlag()).toBe(true)
      expect(consumeLocalPatchFlag()).toBe(false)
    })
  })

  describe('NodeId and SharedTextHandle', () => {
    it('getSharedTextHandleForTest returns handle with nodeId.key', () => {
      modemwriteinitstring('testkey', '')
      const handle = getSharedTextHandleForTest('testkey')
      expect(handle).toBeDefined()
      expect(handle?.nodeId).toEqual({ key: 'testkey' })
      expect(handle?.toJSON()).toBe('')
    })
  })

  describe('UndoManager and cursor restore', () => {
    const codekey = 'testcode'

    beforeEach(() => {
      modemwriteinitstring(codekey, '')
    })

    it('undo reverts insert and restore callback is called with stored cursor', () => {
      const handle = getSharedTextHandleForTest(codekey)
      expect(handle).toBeDefined()
      const um = getUndoManager(codekey)
      expect(um).toBeDefined()

      let restored = -1
      const unsub = registerCursorRestore(codekey, (cursor) => {
        restored = cursor
      })

      setCursorBeforeEdit(codekey, 0)
      handle!.insert(0, 'ab')
      expect(handle!.toJSON()).toBe('ab')

      um!.undo()
      expect(handle!.toJSON()).toBe('')
      expect(restored).toBe(0)

      unsub()
    })

    it('redo re-applies and restore callback is called', () => {
      const handle = getSharedTextHandleForTest(codekey)
      const um = getUndoManager(codekey)
      let restored = -1
      registerCursorRestore(codekey, (c) => {
        restored = c
      })

      setCursorBeforeEdit(codekey, 0)
      handle!.insert(0, 'xy')
      um!.undo()
      expect(handle!.toJSON()).toBe('')
      um!.redo()
      expect(handle!.toJSON()).toBe('xy')
      expect(restored).toBe(2)
    })
  })
})
