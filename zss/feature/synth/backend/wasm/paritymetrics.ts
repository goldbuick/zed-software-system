export type PARITY_AUDIO_METRICS = {
  rmsdb: number
  peakdb: number
  length: number
  samplerate: number
}

export function audiopowermetrics(
  samples: Float32Array,
  samplerate: number,
): PARITY_AUDIO_METRICS {
  let sumsq = 0
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    sumsq += s * s
    const abs = s < 0 ? -s : s
    if (abs > peak) {
      peak = abs
    }
  }
  const rms = samples.length > 0 ? Math.sqrt(sumsq / samples.length) : 0
  const rmsdb = rms > 0 ? 20 * Math.log10(rms) : -120
  const peakdb = peak > 0 ? 20 * Math.log10(peak) : -120
  return { rmsdb, peakdb, length: samples.length, samplerate }
}

export function audiobuffermetrics(buffer: AudioBuffer): PARITY_AUDIO_METRICS {
  const ch0 = buffer.getChannelData(0)
  return audiopowermetrics(ch0, buffer.sampleRate)
}

export function metricswithin(
  actual: PARITY_AUDIO_METRICS,
  expected: PARITY_AUDIO_METRICS,
  rmsdbtol: number,
  peakdbtol: number,
): boolean {
  return (
    Math.abs(actual.rmsdb - expected.rmsdb) <= rmsdbtol &&
    Math.abs(actual.peakdb - expected.peakdb) <= peakdbtol
  )
}
