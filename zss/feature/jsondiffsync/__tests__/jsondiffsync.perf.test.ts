import { compare } from 'fast-json-patch'
import {
  hubprepareoutboundforleaf,
  jsondiffsyncleafapply,
} from 'zss/feature/jsondiffsync/hub'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import {
  filterjsonpatchforsync,
  hasrelevantsyncdiff,
  jsondiffsyncdiff,
} from 'zss/feature/jsondiffsync/patchfilter'
import {
  createhubsession,
  createleafsession,
  hubensureleaf,
} from 'zss/feature/jsondiffsync/session'
import { rebaseapply } from 'zss/feature/jsondiffsync/sync'
import { jsondocumentcopy } from 'zss/mapping/types'

function mklargedoc(pagedepth: number): Record<string, unknown> {
  const pages = []
  for (let i = 0; i < pagedepth; i++) {
    pages.push({
      stats: { ticklayer: i },
      board: {
        objects: {
          [`o${i}`]: { x: i, y: i, category: 't', kinddata: { n: i } },
        },
        terrain: [{ id: `t${i}`, kinddata: {} }],
        charsetpage: i,
        drawlastxy: [i, i],
      },
    })
  }
  return {
    books: {
      B: {
        pages,
        timestamp: 0,
        flags: { inputqueue: [], inputmove: null },
      },
    },
  }
}

function jsondiffsyncdiff_compareonly(
  from: object,
  to: object,
): ReturnType<typeof jsondiffsyncdiff> {
  return filterjsonpatchforsync(compare(from, to))
}

function timeavg(label: string, fn: () => void, iterations: number): number {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const ms = (performance.now() - t0) / iterations
  // eslint-disable-next-line no-console
  console.log(`${label}: ${ms.toFixed(4)}ms / iter (n=${iterations})`)
  return ms
}

const runbench = process.env.ZSS_BENCH === '1'

;(runbench ? describe : describe.skip)(
  'jsondiffsync performance (ZSS_BENCH=1)',
  () => {
    it('rebaseapply, jsondiffsyncdiff, diff strategies, round-trip', () => {
      const depth = 80
      const base = mklargedoc(depth)
      const working = jsondocumentcopy(base)
      const book = working.books as Record<string, unknown>
      const b = book.B as Record<string, unknown>
      const pages = b.pages as Record<string, unknown>[]
      const page0 = pages[0]
      const board = page0.board as Record<string, unknown>
      const objects = board.objects as Record<string, unknown>
      const o0 = objects.o0 as Record<string, unknown>
      o0.x = 999

      const inbound = jsondiffsyncdiff(base, base)
      expect(inbound.length).toBe(0)

      const remote = jsondocumentcopy(base)
      const rbook = remote.books as Record<string, unknown>
      const rB = rbook.B as Record<string, unknown>
      const rpages = rB.pages as Record<string, unknown>[]
      const rpage1 = rpages[1]
      const rboard = rpage1.board as Record<string, unknown>
      const robj = rboard.objects as Record<string, unknown>
      const ro1 = robj.o1 as Record<string, unknown>
      ro1.x = 4242

      const inbound2 = jsondiffsyncdiff(base, remote)
      expect(inbound2.length).toBeGreaterThan(0)

      const iterations = 30
      timeavg(
        'rebaseapply(remote+local)',
        () => {
          rebaseapply(base, working, inbound2)
        },
        iterations,
      )

      timeavg(
        'jsondiffsyncdiff(shadow, working)',
        () => {
          jsondiffsyncdiff(base, working)
        },
        iterations,
      )

      timeavg(
        'hasrelevantsyncdiff + compare (current)',
        () => {
          if (!hasrelevantsyncdiff(base, working)) {
            return
          }
          filterjsonpatchforsync(compare(base, working))
        },
        iterations,
      )

      timeavg(
        'compare + filter only',
        () => {
          jsondiffsyncdiff_compareonly(base, working)
        },
        iterations,
      )

      timeavg(
        'round-trip leaf delta -> hub -> leaf apply',
        () => {
          const ldoc = jsondocumentcopy(base)
          const hubx = createhubsession(jsondocumentcopy(ldoc))
          const leafx = createleafsession('leaf1', jsondocumentcopy(ldoc))
          hubensureleaf(hubx, leafx.peer)
          const wx = leafx.working as Record<string, unknown>
          const wbooks = wx.books as Record<string, unknown>
          const wB = wbooks.B as Record<string, unknown>
          const wps = wB.pages as Record<string, unknown>[]
          const wp0 = wps[0]
          const wboard = wp0.board as Record<string, unknown>
          const wobs = wboard.objects as Record<string, unknown>
          const wo0 = wobs.o0 as Record<string, unknown>
          wo0.y = 7
          const out = leafprepareoutbound(leafx)
          if (out.message?.kind !== 'delta') {
            throw new Error('expected delta')
          }
          const hubmsgs = jsondiffsyncleafapply(hubx, leafx.peer, out.message)
          for (const m of hubmsgs) {
            leafapplyinbound(leafx, m)
          }
          const prep = hubprepareoutboundforleaf(hubx, leafx.peer)
          if (prep.message !== undefined) {
            leafapplyinbound(leafx, prep.message)
          }
        },
        8,
      )
    })
  },
)
