import { isofflineaudiocontext } from 'zss/feature/synth/backend/wasm/audiocontextutil'
import {
  OFFLINE_RENDER_QUANTUM,
  createwasmplayscheduler,
  offlinegateendwhen,
  offlinerenderquantumsec,
} from 'zss/feature/synth/backend/wasm/wasmplayscheduler'

describe('isofflineaudiocontext', () => {
  it('detects OfflineAudioContext by length property', () => {
    expect(
      isofflineaudiocontext({ length: 44100 } as unknown as BaseAudioContext),
    ).toBe(true)
    expect(
      isofflineaudiocontext({
        state: 'running',
        currentTime: 0,
      } as BaseAudioContext),
    ).toBe(false)
  })
})

describe('wasmplayscheduler offline', () => {
  it('registers suspend hooks for future events before offline render', () => {
    const suspendmock = jest.fn().mockReturnValue(Promise.resolve())
    const resumemock = jest.fn().mockReturnValue(Promise.resolve())
    const runs: number[] = []

    const offlinectx = {
      currentTime: 0,
      sampleRate: 48000,
      suspend: suspendmock,
      resume: resumemock,
      length: 44100,
    }

    const maxi = {
      audioContext: offlinectx,
    }

    const scheduler = createwasmplayscheduler(maxi as any)
    scheduler.schedule(0, () => runs.push(0))
    scheduler.schedule(0.5, () => runs.push(1))
    scheduler.schedule(0.5, () => runs.push(2))
    scheduler.armofflinerender()

    expect(runs).toEqual([0])
    expect(suspendmock).toHaveBeenCalledTimes(1)
    expect(suspendmock).toHaveBeenCalledWith(
      (128 / 48000) * Math.floor(0.5 / (128 / 48000)),
    )
    expect(resumemock).not.toHaveBeenCalled()
  })

  it('runs suspend callbacks and resumes in handler chain', async () => {
    const runs: number[] = []
    const resumemock = jest.fn().mockResolvedValue(undefined)
    let suspendhandler: (() => void) | undefined

    const offlinectx = {
      currentTime: 0,
      suspend: jest.fn(() => ({
        then: (fn: () => void) => {
          suspendhandler = fn
          return Promise.resolve()
        },
      })),
      resume: resumemock,
      length: 44100,
    }

    const maxi = {
      audioContext: offlinectx,
    }

    const scheduler = createwasmplayscheduler(maxi as any)
    scheduler.schedule(0.25, () => runs.push(1))
    scheduler.armofflinerender()

    suspendhandler?.()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(runs).toEqual([1])
    expect(resumemock).toHaveBeenCalledTimes(1)
  })

  it('merges suspend hooks that share the same render quantum frame', () => {
    const suspendmock = jest.fn().mockReturnValue(Promise.resolve())
    const resumemock = jest.fn().mockReturnValue(Promise.resolve())

    const offlinectx = {
      currentTime: 0,
      sampleRate: 48000,
      suspend: suspendmock,
      resume: resumemock,
      length: 44100,
    }

    const maxi = {
      audioContext: offlinectx,
    }

    const scheduler = createwasmplayscheduler(maxi as any)
    scheduler.schedule(0.205347, () => {})
    scheduler.schedule(0.20534, () => {})
    scheduler.armofflinerender()

    expect(suspendmock).toHaveBeenCalledTimes(1)
  })

  it('offlinegateendwhen floors short notes to one render quantum', () => {
    const sr = 48000
    const quantum = offlinerenderquantumsec(sr)
    expect(OFFLINE_RENDER_QUANTUM).toBe(128)
    expect(quantum).toBeCloseTo(128 / 48000, 8)
    const when = 0.1
    const shortend = when + quantum * 0.25
    expect(offlinegateendwhen(when, shortend, sr)).toBeCloseTo(
      when + quantum,
      8,
    )
    const longend = when + 0.5
    expect(offlinegateendwhen(when, longend, sr)).toBe(longend)
  })

  it('short note-on/off land on different suspend quanta after gate floor', () => {
    const suspendmock = jest.fn().mockReturnValue(Promise.resolve())
    const offlinectx = {
      currentTime: 0,
      sampleRate: 48000,
      suspend: suspendmock,
      resume: jest.fn().mockReturnValue(Promise.resolve()),
      length: 44100,
    }
    const scheduler = createwasmplayscheduler({
      audioContext: offlinectx,
    } as any)
    const when = 0.20534
    const endwhen = offlinegateendwhen(when, when + 0.0001, 48000)
    scheduler.schedule(when, () => {})
    scheduler.schedule(endwhen, () => {})
    scheduler.armofflinerender()
    expect(suspendmock).toHaveBeenCalledTimes(2)
  })
})
