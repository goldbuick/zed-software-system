import { createchipid } from 'zss/chip'
import { initstate } from 'zss/gadget/data/api'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { creategadgetmemid, createsynthmemid } from 'zss/memory/flagmemids'
import {
  flagsstream,
  gadgetstream,
  memoryconsumealldirty,
  memorydirtyclear,
  memoryhasdirty,
  memorymarkflagsrecorddirty,
  memorywithsilentwrites,
} from 'zss/memory/memorydirty'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

describe('memorydirty flags/gadget streams (manual marking)', () => {
  afterEach(() => {
    memoryresetbooks([])
    memorydirtyclear()
  })

  it('memorywritebookflag marks gadget stream for *_gadget row', () => {
    const pid = 'pid_obs1_aaaaaaaaaaaaaaaa'
    const main: BOOK = {
      id: 'main-obs-gadget',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [creategadgetmemid(pid)]: initstate(),
      } as unknown as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const g = live.flags[creategadgetmemid(pid)] as { scroll: string[] }
    memorywritebookflag(live, creategadgetmemid(pid), 'scroll', [
      ...g.scroll,
      'nested-line',
    ])

    expect(memoryhasdirty(gadgetstream(pid))).toBe(true)
  })

  it('memorywritebookflag marks flags stream for *_chip row', () => {
    const elid = 'elm_obs_chip_1'
    const chipkey = createchipid(elid)
    const main: BOOK = {
      id: 'main-obs-chip',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [chipkey]: { lb: [1, 2] as unknown as number },
      } as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const bag = live.flags[chipkey] as { lb: number[] }
    memorywritebookflag(live, chipkey, 'lb', [...bag.lb, 3])

    expect(memoryhasdirty(flagsstream(chipkey))).toBe(true)
  })

  it('memorywritebookflag marks flags stream for *_tracking row', () => {
    const boardid = 'brd_track_obs'
    const tid = `${boardid}_tracking`
    const main: BOOK = {
      id: 'main-obs-tracking',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [tid]: { k: ['a'] as string[] },
      } as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const bag = live.flags[tid] as { k: string[] }
    memorywritebookflag(live, tid, 'k', [...bag.k, 'b'])

    expect(memoryhasdirty(flagsstream(tid))).toBe(true)
  })

  it('memorywritebookflag marks flags stream for *_synth row', () => {
    const boardid = 'brd_synth_obs'
    const sid = createsynthmemid(boardid)
    const main: BOOK = {
      id: 'main-obs-synth',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [sid]: { play: [] as [string, number][] },
      } as unknown as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    memorywritebookflag(live, sid, 'play', [['pat', 1]])

    expect(memoryhasdirty(flagsstream(sid))).toBe(true)
  })

  it('in-place flag bag mutation does not mark until memorymarkflagsrecorddirty', () => {
    const pid = 'pid_manual_gadget_bag'
    const main: BOOK = {
      id: 'main-manual-bag',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [creategadgetmemid(pid)]: initstate(),
      } as unknown as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const g = live.flags[creategadgetmemid(pid)] as { scroll: string[] }
    g.scroll.push('raw-mutation')
    expect(memoryhasdirty(gadgetstream(pid))).toBe(false)

    memorymarkflagsrecorddirty(creategadgetmemid(pid))
    expect(memoryhasdirty(gadgetstream(pid))).toBe(true)
  })

  it('does not enqueue dirty while memorywithsilentwrites is active', () => {
    const pid = 'pid_obs2_bbbbbbbbbbbbbbbb'
    const main: BOOK = {
      id: 'main-obs-silent',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [creategadgetmemid(pid)]: initstate(),
      } as unknown as BOOK['flags'],
    }
    memoryresetbooks([main])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, main.id)
    memorydirtyclear()

    memorywithsilentwrites(() => {
      const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
      const g = live.flags[creategadgetmemid(pid)] as { scroll: string[] }
      g.scroll.push('silent')
      memorymarkflagsrecorddirty(creategadgetmemid(pid))
      expect(memoryconsumealldirty()).toEqual([])
    })

    memorydirtyclear()
    const live = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)!
    const g = live.flags[creategadgetmemid(pid)] as { scroll: string[] }
    memorywritebookflag(live, creategadgetmemid(pid), 'scroll', [
      ...g.scroll,
      'after-silent',
    ])
    expect(memoryhasdirty(gadgetstream(pid))).toBe(true)
  })
})
