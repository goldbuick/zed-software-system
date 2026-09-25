/**
 * Live vs VOD audio buses.
 * Live = synth + board-TV; VOD = synth only (board-TV excluded).
 */

export type MS_AUDIO_BUSES = {
  live: MediaStream
  vod: MediaStream
  setboardtv: (stream: MediaStream | null) => void
  setsynth: (stream: MediaStream | null) => void
  close: () => void
}

export function createaudiobuses(): MS_AUDIO_BUSES {
  const ctx = new AudioContext()
  const livedest = ctx.createMediaStreamDestination()
  const voddest = ctx.createMediaStreamDestination()
  let synthsource: MediaStreamAudioSourceNode | null = null
  let tvsources: MediaStreamAudioSourceNode | null = null

  function disconnect(node: MediaStreamAudioSourceNode | null) {
    if (!node) {
      return
    }
    try {
      node.disconnect()
    } catch {
      // ignore
    }
  }

  return {
    live: livedest.stream,
    vod: voddest.stream,
    setsynth(stream) {
      disconnect(synthsource)
      synthsource = null
      if (!stream || stream.getAudioTracks().length === 0) {
        return
      }
      synthsource = ctx.createMediaStreamSource(stream)
      synthsource.connect(livedest)
      synthsource.connect(voddest)
    },
    setboardtv(stream) {
      disconnect(tvsources)
      tvsources = null
      if (!stream || stream.getAudioTracks().length === 0) {
        return
      }
      tvsources = ctx.createMediaStreamSource(stream)
      // Live only -- never connect to VOD
      tvsources.connect(livedest)
    },
    close() {
      disconnect(synthsource)
      disconnect(tvsources)
      void ctx.close()
    },
  }
}
