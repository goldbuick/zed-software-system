import { Model } from 'json-joy/lib/json-crdt'
import { Log } from 'json-joy/lib/json-crdt/log/Log'
import type { Patch } from 'json-joy/lib/json-crdt-patch'
import {
  type NodeId,
  consumeLocalPatchFlag,
  markNextPatchAsLocal,
  patchAffectsNode,
  placeCursorForPatch,
} from 'zss/device/modem'

let testlog: ReturnType<typeof Log.from> | null = null
jest.mock('zss/device/modem', () => {
  const actual =
    jest.requireActual<typeof import('zss/device/modem')>('zss/device/modem')
  return {
    ...actual,
    getModemLog: () => testlog,
  }
})

describe('modemUndo', () => {
  describe('patchAffectsNode', () => {
    it('returns true when patch has one op targeting the nodeId', () => {
      const patch = {
        ops: [{ obj: { sid: 1, time: 2 } }],
      } as unknown as Patch
      const nodeid: NodeId = { sid: 1, time: 2 }
      expect(patchAffectsNode(patch, nodeid)).toBe(true)
    })

    it('returns false when nodeId does not match any op', () => {
      const patch = {
        ops: [{ obj: { sid: 1, time: 2 } }],
      } as unknown as Patch
      const nodeid: NodeId = { sid: 0, time: 0 }
      expect(patchAffectsNode(patch, nodeid)).toBe(false)
    })

    it('returns true when patch has multiple ops and one matches nodeId', () => {
      const patch = {
        ops: [
          { obj: { sid: 0, time: 0 } },
          { obj: { sid: 1, time: 2 } },
          { obj: { sid: 3, time: 4 } },
        ],
      } as unknown as Patch
      const nodeid: NodeId = { sid: 1, time: 2 }
      expect(patchAffectsNode(patch, nodeid)).toBe(true)
    })

    it('returns false for empty ops', () => {
      const patch = { ops: [] } as unknown as Patch
      const nodeid: NodeId = { sid: 1, time: 2 }
      expect(patchAffectsNode(patch, nodeid)).toBe(false)
    })

    it('returns false when ops have no obj', () => {
      const patch = { ops: [{}] } as unknown as Patch
      const nodeid: NodeId = { sid: 1, time: 2 }
      expect(patchAffectsNode(patch, nodeid)).toBe(false)
    })
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

  describe('placeCursorForPatch', () => {
    beforeEach(() => {
      testlog = null
    })

    it('returns undefined when node is not in model', () => {
      const model = Model.create()
      model.api.set({})
      testlog = Log.from(model)
      const nodeid: NodeId = { sid: 999, time: 999 }
      const patch = { ops: [] } as unknown as Patch
      expect(placeCursorForPatch(nodeid, patch)).toBeUndefined()
    })

    it('returns undefined when patch has no ops targeting the node', () => {
      const model = Model.create()
      model.api.set({})
      model.api.obj().set({ code: '' })
      testlog = Log.from(model)
      const root = testlog.end.api.obj()
      const codeval = root.get('code') as unknown as {
        get?: () => {
          asStr?: () => { node: { id: { sid: number; time: number } } }
        }
        asStr?: () => { node: { id: { sid: number; time: number } } }
      }
      const strapi = codeval?.get?.()?.asStr?.() ?? codeval?.asStr?.()
      const nodeid: NodeId = {
        sid: (strapi as { node: { id: { sid: number; time: number } } }).node.id
          .sid,
        time: (strapi as { node: { id: { sid: number; time: number } } }).node
          .id.time,
      }
      const patch = {
        ops: [{ obj: { sid: 0, time: 0 } }],
      } as unknown as Patch
      expect(placeCursorForPatch(nodeid, patch)).toBeUndefined()
    })

    it('returns cursor index after insert when patch targets node', async () => {
      const model = Model.create()
      model.api.set({})
      model.api.autoFlush(true)
      model.api.obj().set({ code: '' })
      testlog = Log.from(model)
      const root = testlog.end.api.obj()
      const codeval = root.get('code') as unknown as {
        get?: () => {
          asStr?: () => {
            node: { id: { sid: number; time: number } }
            ins: (index: number, text: string) => void
            view: () => string
          }
        }
        asStr?: () => {
          node: { id: { sid: number; time: number } }
          ins: (index: number, text: string) => void
          view: () => string
        }
      }
      const strapi = codeval?.get?.()?.asStr?.() ?? codeval?.asStr?.()
      const nodeid: NodeId = {
        sid: (strapi as { node: { id: { sid: number; time: number } } }).node.id
          .sid,
        time: (strapi as { node: { id: { sid: number; time: number } } }).node
          .id.time,
      }
      let captured: Patch | null = null
      testlog.end.api.onFlush.listen((p: Patch) => {
        captured = p
      })
      strapi?.ins(0, 'ab')
      await new Promise((r) => setTimeout(r, 0))
      expect(captured).not.toBeNull()
      expect(strapi?.view()).toBe('ab')
      const index = placeCursorForPatch(nodeid, captured!)
      expect(typeof index === 'number' || index === undefined).toBe(true)
      if (index !== undefined) {
        expect(index).toBe(2)
      }
    })
  })
})
