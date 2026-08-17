/** @jest-environment jsdom */
jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
  storagewriteconfigstring: jest.fn(),
}))
jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

import { apilog } from 'zss/device/api'
import { MEDIAQUEUE_DEFAULT_TV_VOLUME } from 'zss/feature/mediaqueue/constants'
import {
  mediaqueuebindremotevideo,
  mediaqueueclearremotevideo,
  mediaqueuereadmainvolume,
  mediaqueuereadmediavolume,
  mediaqueueresumeaudio,
  mediaqueuesetmainvolume,
  mediaqueuesetmediavolume,
  restoremediavolfromstorage,
  storemediavolconfig,
} from 'zss/feature/mediaqueue/boardtvaudio'
import { WASM_DEFAULT_MAIN_VOLUME } from 'zss/feature/synth/backend/wasm/wasmmainsab'
import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'

function setpaused(video: HTMLVideoElement, paused: boolean) {
  Object.defineProperty(video, 'paused', { value: paused, configurable: true })
}

async function flushplaypromise() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function playblockedlogs(): string[] {
  return jest
    .mocked(apilog)
    .mock.calls.map((call) => String(call[2] ?? ''))
    .filter((line) => line.includes('play blocked'))
}

describe('board TV audio volume', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaqueuesetmainvolume(WASM_DEFAULT_MAIN_VOLUME)
    mediaqueuesetmediavolume(MEDIAQUEUE_DEFAULT_TV_VOLUME)
    mediaqueueclearremotevideo()
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
  })

  it('defaults board TV volume below synth play trim', () => {
    expect(MEDIAQUEUE_DEFAULT_TV_VOLUME).toBeLessThan(90)
    expect(mediaqueuereadmediavolume()).toBe(20)
    expect(mediaqueuereadmainvolume()).toBe(50)
  })

  it('storemediavolconfig writes config_mediavol', () => {
    storemediavolconfig(15)
    expect(storagewriteconfigstring).toHaveBeenCalledWith('mediavol', '15')
  })

  it('restoremediavolfromstorage applies saved mediavol', async () => {
    jest.mocked(storagereadconfigstring).mockResolvedValue('10')
    await restoremediavolfromstorage()
    expect(mediaqueuereadmediavolume()).toBe(10)
  })

  it('restoremediavolfromstorage uses default when missing', async () => {
    jest.mocked(storagereadconfigstring).mockResolvedValue(undefined)
    await restoremediavolfromstorage()
    expect(mediaqueuereadmediavolume()).toBe(MEDIAQUEUE_DEFAULT_TV_VOLUME)
  })

  it('mediaqueuesetmediavolume updates active remote video gain', () => {
    const video = document.createElement('video')
    mediaqueuesetmainvolume(100)
    mediaqueuebindremotevideo(video)
    mediaqueuesetmediavolume(50)
    expect(video.volume).toBe(0.5)
    expect(video.muted).toBe(false)
    mediaqueuesetmediavolume(0)
    expect(video.volume).toBe(0)
    mediaqueueclearremotevideo()
  })

  it('main volume scales board TV gain with mediavol', () => {
    const video = document.createElement('video')
    mediaqueuesetmainvolume(50)
    mediaqueuesetmediavolume(50)
    mediaqueuebindremotevideo(video)
    expect(video.volume).toBe(0.25)
    mediaqueuesetmainvolume(100)
    expect(video.volume).toBe(0.5)
    mediaqueueclearremotevideo()
  })
})

describe('board TV playback retry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaqueueclearremotevideo()
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
  })

  it('leaves a playing video alone instead of restarting it', () => {
    const video = document.createElement('video')
    setpaused(video, false)
    mediaqueuebindremotevideo(video)
    mediaqueueresumeaudio()
    expect(video.pause).not.toHaveBeenCalled()
    expect(video.play).not.toHaveBeenCalled()
    expect(video.muted).toBe(false)
    mediaqueueclearremotevideo()
  })

  it('plays a paused video once per resume', () => {
    const video = document.createElement('video')
    setpaused(video, true)
    mediaqueuebindremotevideo(video)
    expect(video.play).toHaveBeenCalledTimes(1)
    expect(video.pause).not.toHaveBeenCalled()
    mediaqueueclearremotevideo()
  })

  it('stays quiet when a play is superseded by a later load', async () => {
    const aborted = new DOMException(
      'The play() request was interrupted by a call to pause().',
      'AbortError',
    )
    HTMLMediaElement.prototype.play = jest.fn().mockRejectedValue(aborted)
    const video = document.createElement('video')
    setpaused(video, true)
    mediaqueuebindremotevideo(video)
    await flushplaypromise()
    expect(playblockedlogs()).toEqual([])
    mediaqueueclearremotevideo()
  })

  it('reports a real autoplay block so the player can click', async () => {
    const blocked = new DOMException(
      'play() failed because the user did not interact with the document first.',
      'NotAllowedError',
    )
    HTMLMediaElement.prototype.play = jest.fn().mockRejectedValue(blocked)
    const video = document.createElement('video')
    setpaused(video, true)
    mediaqueuebindremotevideo(video)
    await flushplaypromise()
    expect(playblockedlogs()).toHaveLength(1)
    mediaqueueclearremotevideo()
  })
})
