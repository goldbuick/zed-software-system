/** @jest-environment jsdom */
jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
  storagewriteconfigstring: jest.fn(),
}))

import { MEDIAQUEUE_DEFAULT_TV_VOLUME } from 'zss/feature/mediaqueue/constants'
import {
  mediaqueueattachremoteaudio,
  mediaqueueclearremoteaudio,
  mediaqueuereadmediavolume,
  mediaqueuesetmediavolume,
  restoremediavolfromstorage,
  storemediavolconfig,
} from 'zss/feature/mediaqueue/boardtvaudio'
import {
  storagereadconfigstring,
  storagewriteconfigstring,
} from 'zss/feature/storage'

describe('board TV audio volume', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaqueuesetmediavolume(MEDIAQUEUE_DEFAULT_TV_VOLUME)
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
  })

  it('defaults board TV volume below synth play volume', () => {
    expect(MEDIAQUEUE_DEFAULT_TV_VOLUME).toBeLessThan(50)
    expect(mediaqueuereadmediavolume()).toBe(25)
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

  it('mediaqueuesetmediavolume updates active remote audio gain', () => {
    class MockAudioTrack {
      kind = 'audio'
      stop() {}
    }
    class MockMediaStream {
      constructor(public tracks: MockAudioTrack[]) {}
      getTracks() {
        return this.tracks
      }
    }
    global.MediaStream = MockMediaStream as never
    mediaqueueattachremoteaudio([new MockAudioTrack()])
    const audio = document.querySelector('audio')
    expect(audio).toBeTruthy()
    mediaqueuesetmediavolume(50)
    expect(audio?.volume).toBe(0.5)
    mediaqueuesetmediavolume(0)
    expect(audio?.volume).toBe(0)
    mediaqueueclearremoteaudio()
  })
})
