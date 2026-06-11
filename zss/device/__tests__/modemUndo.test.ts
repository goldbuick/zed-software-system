import {
  consumelocalpatchflag,
  destroymodemfortest,
  getsharedtexthandlefortest,
  getundomanager,
  marknextpatchaslocal,
  modemwriteinitstring,
  registercursorrestore,
  setcursorbeforeedit,
} from 'zss/device/modem'

describe('modemUndo', () => {
  afterAll(() => {
    destroymodemfortest()
  })
  describe('marknextpatchaslocal / consumelocalpatchflag', () => {
    it('consumelocalpatchflag returns false by default', () => {
      expect(consumelocalpatchflag()).toBe(false)
    })

    it('consumelocalpatchflag returns true once after marknextpatchaslocal', () => {
      marknextpatchaslocal()
      expect(consumelocalpatchflag()).toBe(true)
      expect(consumelocalpatchflag()).toBe(false)
    })
  })

  describe('NodeId and SharedTextHandle', () => {
    it('getsharedtexthandlefortest returns handle with nodeId.key', () => {
      modemwriteinitstring('testkey', '')
      const handle = getsharedtexthandlefortest('testkey')
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
      const handle = getsharedtexthandlefortest(codekey)
      expect(handle).toBeDefined()
      const um = getundomanager(codekey)
      expect(um).toBeDefined()

      let restored = -1
      const unsub = registercursorrestore(codekey, (cursor) => {
        restored = cursor
      })

      setcursorbeforeedit(codekey, 0)
      handle!.insert(0, 'ab')
      expect(handle!.toJSON()).toBe('ab')

      um!.undo()
      expect(handle!.toJSON()).toBe('')
      expect(restored).toBe(0)

      unsub()
    })

    it('redo re-applies and restore callback is called', () => {
      const handle = getsharedtexthandlefortest(codekey)
      const um = getundomanager(codekey)
      let restored = -1
      registercursorrestore(codekey, (c) => {
        restored = c
      })

      setcursorbeforeedit(codekey, 0)
      handle!.insert(0, 'xy')
      um!.undo()
      expect(handle!.toJSON()).toBe('')
      um!.redo()
      expect(handle!.toJSON()).toBe('xy')
      expect(restored).toBe(2)
    })
  })
})
