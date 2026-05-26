import { createwasmplayscheduler } from '../wasmplayscheduler'

describe('wasmplayscheduler offline', () => {
  it('registers suspend hooks for future events before offline render', () => {
    const suspendmock = jest.fn().mockReturnValue(Promise.resolve())
    const resumemock = jest.fn().mockReturnValue(Promise.resolve())
    const runs: number[] = []

    const offlinectx = {
      currentTime: 0,
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
    expect(suspendmock).toHaveBeenCalledWith(0.5)
  })
})
