import { playercallpcreason } from 'ops/media-queue/ui/playercallice'

describe('playercallpcreason', () => {
  it('keeps connecting peers', () => {
    expect(
      playercallpcreason({
        iceConnectionState: 'checking',
        connectionState: 'connecting',
      }),
    ).toBe('connecting')
    expect(playercallpcreason(undefined)).toBe('unknown')
  })

  it('keeps live peers', () => {
    expect(
      playercallpcreason({
        iceConnectionState: 'connected',
        connectionState: 'connected',
      }),
    ).toBe('up')
    expect(
      playercallpcreason({
        iceConnectionState: 'completed',
        connectionState: 'connected',
      }),
    ).toBe('up')
  })

  it('marks failed and closed as dead', () => {
    expect(
      playercallpcreason({
        iceConnectionState: 'failed',
        connectionState: 'failed',
      }),
    ).toBe('dead')
    expect(
      playercallpcreason({
        iceConnectionState: 'closed',
        connectionState: 'closed',
      }),
    ).toBe('dead')
  })

  it('marks ice disconnected so the helper can drop after grace', () => {
    expect(
      playercallpcreason({
        iceConnectionState: 'disconnected',
        connectionState: 'disconnected',
      }),
    ).toBe('disconnected')
  })
})
