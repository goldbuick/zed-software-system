/**
 * @jest-environment jsdom
 */

const resume = jest.fn(() => Promise.resolve())
const start = jest.fn()
const connect = jest.fn()
const createBuffer = jest.fn(() => ({}))
const createBufferSource = jest.fn(() => ({
  buffer: null as unknown,
  connect,
  start,
}))

let mockstate = 'suspended'

class MockAudioContext {
  get state() {
    return mockstate
  }
  get sampleRate() {
    return 48000
  }
  resume = resume
  createBuffer = createBuffer
  createBufferSource = createBufferSource
  destination = {}
}

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Jest AudioContext stub
  ;(globalThis as any).AudioContext = MockAudioContext
})

describe('unlockaudiocontext', () => {
  beforeEach(() => {
    jest.resetModules()
    resume.mockClear()
    start.mockClear()
    connect.mockClear()
    createBuffer.mockClear()
    createBufferSource.mockClear()
    mockstate = 'suspended'
  })

  it('creates context, resumes, and starts a silent buffer when suspended', async () => {
    const {
      unlockaudiocontext,
      resetunlockedaudiocontextfortests,
    } = await import('zss/feature/synth/backend/wasm/audiocontextunlock')
    resetunlockedaudiocontextfortests()

    const ctx = unlockaudiocontext()
    expect(ctx).toBeInstanceOf(MockAudioContext)
    expect(resume).toHaveBeenCalledTimes(1)
    expect(createBuffer).toHaveBeenCalledWith(1, 1, 48000)
    expect(createBufferSource).toHaveBeenCalledTimes(1)
    expect(connect).toHaveBeenCalled()
    expect(start).toHaveBeenCalledWith(0)
  })

  it('second call reuses context and skips silent play when already running', async () => {
    const {
      unlockaudiocontext,
      resetunlockedaudiocontextfortests,
    } = await import('zss/feature/synth/backend/wasm/audiocontextunlock')
    resetunlockedaudiocontextfortests()

    const first = unlockaudiocontext()
    mockstate = 'running'
    resume.mockClear()
    start.mockClear()
    createBuffer.mockClear()

    const second = unlockaudiocontext()
    expect(second).toBe(first)
    expect(resume).not.toHaveBeenCalled()
    expect(createBuffer).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })

  it('second call while still suspended resumes again', async () => {
    const {
      unlockaudiocontext,
      resetunlockedaudiocontextfortests,
    } = await import('zss/feature/synth/backend/wasm/audiocontextunlock')
    resetunlockedaudiocontextfortests()

    unlockaudiocontext()
    resume.mockClear()
    start.mockClear()

    unlockaudiocontext()
    expect(resume).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
  })
})
