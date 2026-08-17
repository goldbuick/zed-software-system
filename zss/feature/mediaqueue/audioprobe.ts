/** Category A: measure inbound board TV audio without stealing the PeerJS track. */

export async function mediaqueueprobeaudiostream(
  stream: MediaStream | undefined,
  label: string,
): Promise<string> {
  if (!stream) {
    return label + ' stream=null'
  }
  const tracks = stream.getAudioTracks()
  if (!tracks.length) {
    return label + ' a=0'
  }
  const track = tracks[0]
  const meta =
    'a=' +
    tracks.length +
    ' muted=' +
    String(track.muted) +
    ' en=' +
    String(track.enabled) +
    ' state=' +
    track.readyState
  let clone: MediaStreamTrack | null = null
  let ctx: AudioContext | null = null
  try {
    clone = track.clone()
    ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(new MediaStream([clone]))
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    await ctx.resume()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 500)
    })
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    let peak = 0
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = data[i]
      sum += v
      if (v > peak) {
        peak = v
      }
    }
    const avg = Math.round(sum / Math.max(1, data.length))
    return label + ' ' + meta + ' peak=' + peak + ' avg=' + avg
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
    return label + ' ' + meta + ' probe-fail ' + message
  } finally {
    if (clone) {
      try {
        clone.stop()
      } catch {
        // ignore
      }
    }
    if (ctx) {
      void ctx.close().catch(() => {})
    }
  }
}
