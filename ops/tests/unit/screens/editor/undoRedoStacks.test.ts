import {
  type RedoStackItem,
  type UndoCallback,
  type UndoStackItem,
  createundoredostacks,
} from 'zss/screens/editor/undoRedoStacks'

type MockPatch = { id: string }

describe('undoRedoStacks', () => {
  describe('recordpatch', () => {
    it('adds one item to undo stack and clears redo stack', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const undocallback = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch(patch, undocallback)
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
    })
  })

  describe('undo', () => {
    it('is no-op when undo stack is empty', () => {
      const stacks = createundoredostacks<MockPatch>()
      const result = stacks.undo()
      expect(result).toBeUndefined()
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(0)
    })

    it('invokes callback with stored patch, moves item to redo, returns applied', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const applied = { id: 'applied-undo' }
      const undocallback = jest.fn((p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied,
      }))
      stacks.recordpatch(patch, undocallback)
      const result = stacks.undo()
      expect(undocallback).toHaveBeenCalledTimes(1)
      expect(undocallback).toHaveBeenCalledWith(patch)
      expect(result).toEqual({ applied })
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(1)
    })
  })

  describe('redo', () => {
    it('is no-op when redo stack is empty', () => {
      const stacks = createundoredostacks<MockPatch>()
      const result = stacks.redo()
      expect(result).toBeUndefined()
    })

    it('invokes callback with stored patch, moves item to undo, returns applied', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const appliedUndo = { id: 'applied-undo' }
      const appliedRedo = { id: 'applied-redo' }
      const redocallback = jest.fn((p: MockPatch) => ({
        undoitem: [
          p,
          (up: MockPatch) => ({
            redoitem: [up, redocallback],
            applied: appliedUndo,
          }),
        ] as UndoStackItem<MockPatch>,
        applied: appliedRedo,
      }))
      stacks.recordpatch(patch, (p) => ({
        redoitem: [p, redocallback],
        applied: appliedUndo,
      }))
      stacks.undo()
      const result = stacks.redo()
      expect(redocallback).toHaveBeenCalledWith(patch)
      expect(result).toEqual({ applied: appliedRedo })
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
    })
  })

  describe('undo then redo', () => {
    it('restores state with symmetric callbacks', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const appliedUndo = { id: 'undo-p1' }
      const appliedRedo = { id: 'redo-p1' }
      const redocallback = (p: MockPatch) => ({
        undoitem: [
          p,
          (up: MockPatch) => ({
            redoitem: [up, redocallback],
            applied: appliedUndo,
          }),
        ] as UndoStackItem<MockPatch>,
        applied: appliedRedo,
      })
      const undocallback = (p: MockPatch) => ({
        redoitem: [p, redocallback],
        applied: appliedUndo,
      })
      stacks.recordpatch(patch, undocallback as UndoCallback<MockPatch>)
      const undoResult = stacks.undo()
      expect(undoResult?.applied).toEqual(appliedUndo)
      expect(stacks.redolength()).toBe(1)
      const redoResult = stacks.redo()
      expect(redoResult?.applied).toEqual(appliedRedo)
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
    })
  })

  describe('callback throws on undo', () => {
    it('pushes item back onto undo stack and returns undefined', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const undocallback = jest.fn(() => {
        throw new Error('undo failed')
      })
      stacks.recordpatch(patch, undocallback)
      const result = stacks.undo()
      expect(result).toBeUndefined()
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
    })
  })

  describe('callback throws on redo', () => {
    it('pushes item back onto redo stack and returns undefined', () => {
      const stacks = createundoredostacks<MockPatch>()
      const patch: MockPatch = { id: 'p1' }
      const redocallback = jest.fn(() => {
        throw new Error('redo failed')
      })
      stacks.recordpatch(patch, (p) => ({
        redoitem: [p, redocallback],
        applied: p,
      }))
      stacks.undo()
      const result = stacks.redo()
      expect(result).toBeUndefined()
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(1)
    })
  })

  describe('multiple recordpatch', () => {
    it('undo pops in LIFO order, then redo in reverse order', () => {
      const stacks = createundoredostacks<MockPatch>()
      const makecallback = (id: string) => (p: MockPatch) => {
        const redocb = (rp: MockPatch) => ({
          undoitem: [rp, makecallback(id)] as UndoStackItem<MockPatch>,
          applied: rp,
        })
        return {
          redoitem: [p, redocb] as RedoStackItem<MockPatch>,
          applied: { id: `undo-${p.id}` },
        }
      }
      stacks.recordpatch(
        { id: 'p1' },
        makecallback('1') as UndoCallback<MockPatch>,
      )
      stacks.recordpatch(
        { id: 'p2' },
        makecallback('2') as UndoCallback<MockPatch>,
      )
      stacks.recordpatch(
        { id: 'p3' },
        makecallback('3') as UndoCallback<MockPatch>,
      )
      expect(stacks.undolength()).toBe(3)
      expect(stacks.undo()?.applied.id).toBe('undo-p3')
      expect(stacks.undo()?.applied.id).toBe('undo-p2')
      expect(stacks.undo()?.applied.id).toBe('undo-p1')
      expect(stacks.undo()).toBeUndefined()
      expect(stacks.redo()?.applied.id).toBe('p1')
      expect(stacks.redo()?.applied.id).toBe('p2')
      expect(stacks.redo()?.applied.id).toBe('p3')
      expect(stacks.redo()).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('empties both stacks', () => {
      const stacks = createundoredostacks<MockPatch>()
      const undocallback = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: p,
      })
      stacks.recordpatch({ id: 'p1' }, undocallback)
      stacks.undo()
      expect(stacks.redolength()).toBe(1)
      stacks.clear()
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(0)
    })
  })

  describe('undo mixed with new edits', () => {
    it('new edit after undo clears redo stack', () => {
      const stacks = createundoredostacks<MockPatch>()
      const undocallback1 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback1], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p1' }, undocallback1 as UndoCallback<MockPatch>)
      stacks.undo()
      expect(stacks.redolength()).toBe(1)
      expect(stacks.undolength()).toBe(0)
      const undocallback2 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback2], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p2' }, undocallback2 as UndoCallback<MockPatch>)
      expect(stacks.redolength()).toBe(0)
      expect(stacks.undolength()).toBe(1)
    })

    it('undo then new edit then undo reverts only the new edit', () => {
      const stacks = createundoredostacks<MockPatch>()
      const undocallback1 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback1], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p1' }, undocallback1 as UndoCallback<MockPatch>)
      stacks.undo()
      const undocallback2 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback2], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p2' }, undocallback2 as UndoCallback<MockPatch>)
      const result = stacks.undo()
      expect(result?.applied.id).toBe('undo-p2')
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(1)
    })

    it('undo then new edit then undo then redo re-applies only the new edit', () => {
      const stacks = createundoredostacks<MockPatch>()
      const undocallback1 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback1], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p1' }, undocallback1 as UndoCallback<MockPatch>)
      stacks.undo()
      const undocallback2 = (p: MockPatch) => ({
        redoitem: [
          p,
          () => ({ undoitem: [p, undocallback2], applied: p }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch({ id: 'p2' }, undocallback2 as UndoCallback<MockPatch>)
      stacks.undo()
      const redoResult = stacks.redo()
      expect(redoResult?.applied.id).toBe('p2')
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
    })

    it('multiple undos then new edit leaves only new patch on undo', () => {
      const stacks = createundoredostacks<MockPatch>()
      const makecallback = (id: string) => (p: MockPatch) => ({
        redoitem: [
          p,
          (rp: MockPatch) => ({
            undoitem: [rp, makecallback(id)] as UndoStackItem<MockPatch>,
            applied: rp,
          }),
        ] as RedoStackItem<MockPatch>,
        applied: { id: `undo-${p.id}` },
      })
      stacks.recordpatch(
        { id: 'p1' },
        makecallback('1') as UndoCallback<MockPatch>,
      )
      stacks.recordpatch(
        { id: 'p2' },
        makecallback('2') as UndoCallback<MockPatch>,
      )
      stacks.undo()
      stacks.undo()
      expect(stacks.undolength()).toBe(0)
      expect(stacks.redolength()).toBe(2)
      stacks.recordpatch(
        { id: 'p3' },
        makecallback('3') as UndoCallback<MockPatch>,
      )
      expect(stacks.undolength()).toBe(1)
      expect(stacks.redolength()).toBe(0)
      const undoResult = stacks.undo()
      expect(undoResult?.applied.id).toBe('undo-p3')
    })
  })
})
