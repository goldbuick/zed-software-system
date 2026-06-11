import { isofflineaudiocontext } from './audiocontextutil'
type AUDIOCTX_ENGINE = { audioContext: BaseAudioContext }

type SCHEDULED_ITEM = {
  when: number
  order: number
  run: () => void
}

const OFFLINE_RENDER_QUANTUM = 128

function offlinesuspendtime(ctx: OfflineAudioContext, when: number): number {
  const quantum = OFFLINE_RENDER_QUANTUM / ctx.sampleRate
  return Math.floor(when / quantum) * quantum
}

function sortscheduled(a: SCHEDULED_ITEM, b: SCHEDULED_ITEM) {
  if (a.when !== b.when) {
    return a.when - b.when
  }
  return a.order - b.order
}

/** Schedule callbacks on AudioContext time (not wall-clock setTimeout). */
export function createwasmplayscheduler(engine: AUDIOCTX_ENGINE) {
  let items: SCHEDULED_ITEM[] = []
  let samplerenderqueue: SCHEDULED_ITEM[] = []
  let samplerenderidx = 0
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
    const now = engine.audioContext.currentTime
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
    const now = engine.audioContext.currentTime
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
    const now = engine.audioContext.currentTime
    if (when <= now) {
      pump()
      return
    }
    arm()
  }

  function pumpat(time: number) {
    while (
      samplerenderidx < samplerenderqueue.length &&
      samplerenderqueue[samplerenderidx].when <= time
    ) {
      samplerenderqueue[samplerenderidx].run()
      samplerenderidx++
    }
  }

  /** Queue scheduled callbacks for sample-accurate offline processor render. */
  function armsamplerender() {
    samplerenderqueue = [...items].sort(sortscheduled)
    items = []
    samplerenderidx = 0
    pumpat(0)
  }

  function runsamplerender(
    totalframes: number,
    samplerate: number,
    perframe?: () => void,
  ) {
    for (let f = 0; f <= totalframes; f++) {
      pumpat(f / samplerate)
      perframe?.()
    }
    samplerenderqueue = []
    samplerenderidx = 0
  }

  /** Register OfflineAudioContext suspend hooks before startRendering(). */
  function armofflinerender() {
    const ctx = engine.audioContext
    if (!isofflineaudiocontext(ctx)) {
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
      const frame = offlinesuspendtime(ctx, item.when)
      const runs = bywhen.get(frame) ?? []
      runs.push(item.run)
      bywhen.set(frame, runs)
    }

    due.sort(sortscheduled)
    for (let i = 0; i < due.length; i++) {
      due[i].run()
    }

    const times = [...bywhen.keys()].sort((a, b) => a - b)
    let handlerchain: Promise<void> = Promise.resolve()
    for (let i = 0; i < times.length; i++) {
      const when = times[i]
      const runs = bywhen.get(when) ?? []
      void ctx.suspend(when).then(() => {
        handlerchain = handlerchain.then(async () => {
          for (let j = 0; j < runs.length; j++) {
            runs[j]()
          }
          await ctx.resume()
        })
        return handlerchain
      })
    }
  }

  return {
    schedule,
    clear,
    pump,
    armofflinerender,
    armsamplerender,
    runsamplerender,
    pumpat,
  }
}
