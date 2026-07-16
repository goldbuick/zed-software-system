import {
  createagentdownloadprogressstate,
  formatagentdownloadstatus,
  updateagentdownloadprogress,
} from 'zss/feature/agent/agentdownloadprogress'

describe('agentdownloadprogress', () => {
  it('aggregates concurrent file progress into one overall line', () => {
    const state = createagentdownloadprogressstate()
    expect(
      updateagentdownloadprogress(state, {
        status: 'initiate',
        name: 'model',
        file: 'a.onnx',
      }),
    ).toBe('agent dl 0/1 · 0%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'initiate',
        name: 'model',
        file: 'b.onnx',
      }),
    ).toBe('agent dl 0/2 · 0%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'progress',
        name: 'model',
        file: 'a.onnx',
        progress: 50,
        loaded: 50,
        total: 100,
      }),
    ).toBe('agent dl 0/2 · 50%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'progress',
        name: 'model',
        file: 'b.onnx',
        progress: 0,
        loaded: 0,
        total: 100,
      }),
    ).toBe('agent dl 0/2 · 25%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'done',
        name: 'model',
        file: 'a.onnx',
      }),
    ).toBe('agent dl 1/2 · 50%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'done',
        name: 'model',
        file: 'b.onnx',
      }),
    ).toBe('agent dl 2/2 · 100%')
    expect(formatagentdownloadstatus(state)).toBe('agent dl 2/2 · 100%')
  })

  it('skips duplicate overall lines', () => {
    const state = createagentdownloadprogressstate()
    expect(
      updateagentdownloadprogress(state, {
        status: 'progress',
        name: 'model',
        file: 'a.onnx',
        progress: 10,
      }),
    ).toBe('agent dl 0/1 · 10%')
    expect(
      updateagentdownloadprogress(state, {
        status: 'progress',
        name: 'model',
        file: 'a.onnx',
        progress: 10,
      }),
    ).toBeUndefined()
  })

  it('prefers byte-weighted overall percent when totals exist', () => {
    const state = createagentdownloadprogressstate()
    updateagentdownloadprogress(state, {
      status: 'progress',
      name: 'model',
      file: 'small.bin',
      progress: 100,
      loaded: 10,
      total: 10,
    })
    const line = updateagentdownloadprogress(state, {
      status: 'progress',
      name: 'model',
      file: 'big.bin',
      progress: 0,
      loaded: 0,
      total: 90,
    })
    expect(line).toBe('agent dl 1/2 · 10%')
  })
})
