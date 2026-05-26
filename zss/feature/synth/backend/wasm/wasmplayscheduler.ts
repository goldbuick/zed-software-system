import type { MaxiEngine } from './maximilian'

type SCHEDULED_ITEM = {
  when: number
  order: number
  run: () => void
}

function isofflinecontext(
  ctx: BaseAudioContext,
): ctx is OfflineAudioContext {
  return 'length' in ctx
}

function sortscheduled(a: SCHEDULED_ITEM, b: SCHEDULED_ITEM) {
  if (a.when !== b.when) {
    return a.when - b.when
  }
  return a.order - b.order
}

/** Schedule callbacks on AudioContext time (not wall-clock setTimeout). */
export function createwasmplayscheduler(maxi: MaxiEngine) {
  let items: SCHEDULED_ITEM[] = []
  let orderseq = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function clear() {
    items = []
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function pump() {
    timer = undefined
    const now = maxi.audioContext.currentTime
    const due: SCHEDULED_ITEM[] = []
    const pending: SCHEDULED_ITEM[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.when <= now) {
        due.push(item)
      } else {
        pending.push(item)
      }
    }
    items = pending
    due.sort(sortscheduled)
    for (let i = 0; i < due.length; i++) {
      due[i].run()
    }
    arm()
  }

  function arm() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    if (items.length === 0) {
      return
    }
    const now = maxi.audioContext.currentTime
    let nextwhen = items[0].when
    for (let i = 1; i < items.length; i++) {
      if (items[i].when < nextwhen) {
        nextwhen = items[i].when
      }
    }
    const delayms = Math.max(0, (nextwhen - now) * 1000 - 0.25)
    timer = setTimeout(pump, delayms)
  }

  function schedule(when: number, run: () => void) {
    items.push({ when, order: orderseq++, run })
    const now = maxi.audioContext.currentTime
    if (when <= now) {
      pump()
      return
    }
    arm()
  }

  /** Register OfflineAudioContext suspend hooks before startRendering(). */
  function armofflinerender() {
    const ctx = maxi.audioContext
    if (!isofflinecontext(ctx)) {
      throw new Error('armofflinerender requires OfflineAudioContext')
    }

    const sorted = [...items].sort(sortscheduled)
    items = []

    const due: SCHEDULED_ITEM[] = []
    const bywhen = new Map<number, (() => void)[]>()

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      if (item.when <= 0) {
        due.push(item)
        continue
      }
      const runs = bywhen.get(item.when) ?? []
      runs.push(item.run)
      bywhen.set(item.when, runs)
    }

    due.sort(sortscheduled)
    for (let i = 0; i < due.length; i++) {
      due[i].run()
    }

    const times = [...bywhen.keys()].sort((a, b) => a - b)
    for (let i = 0; i < times.length; i++) {
      const when = times[i]
      const runs = bywhen.get(when) ?? []
      ctx.suspend(when).then(() => {
        for (let j = 0; j < runs.length; j++) {
          runs[j]()
        }
        return ctx.resume()
      })
    }
  }

  return { schedule, clear, pump, armofflinerender }
}
