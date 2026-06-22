export type AUDIO_METRICS = {
  rmsdb: number
  peakdb: number
  length: number
  samplerate: number
  centroidhz: number
  bandlow: number
  bandmid: number
  bandhigh: number
}

const SILENT_DB = -120

export function silentaudiometrics(samplerate: number): AUDIO_METRICS {
  return {
    rmsdb: SILENT_DB,
    peakdb: SILENT_DB,
    length: 0,
    samplerate,
    centroidhz: 0,
    bandlow: 0,
    bandmid: 0,
    bandhigh: 0,
  }
}

export function audiopowermetrics(
  samples: Float32Array,
  samplerate: number,
): AUDIO_METRICS {
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
  const rmsdb = rms > 0 ? 20 * Math.log10(rms) : SILENT_DB
  const peakdb = peak > 0 ? 20 * Math.log10(peak) : SILENT_DB
  const spectral = spectralmetrics(samples, samplerate)
  return {
    rmsdb,
    peakdb,
    length: samples.length,
    samplerate,
    ...spectral,
  }
}

export function audiobuffermetrics(buffer: AudioBuffer): AUDIO_METRICS {
  const ch0 = buffer.getChannelData(0)
  return audiopowermetrics(ch0, buffer.sampleRate)
}

function spectralmetrics(
  samples: Float32Array,
  samplerate: number,
): Pick<AUDIO_METRICS, 'centroidhz' | 'bandlow' | 'bandmid' | 'bandhigh'> {
  if (samples.length < 64) {
    return { centroidhz: 0, bandlow: 0, bandmid: 0, bandhigh: 0 }
  }

  const n = Math.min(2048, samples.length)
  let low = 0
  let mid = 0
  let high = 0
  let weighted = 0
  let total = 0

  for (let k = 1; k < n / 2; k++) {
    let re = 0
    let im = 0
    for (let i = 0; i < n; i++) {
      const phi = (2 * Math.PI * k * i) / n
      re += samples[i] * Math.cos(phi)
      im -= samples[i] * Math.sin(phi)
    }
    const mag = Math.sqrt(re * re + im * im) / n
    if (mag <= 0) {
      continue
    }
    const hz = (k * samplerate) / n
    total += mag
    weighted += mag * hz
    if (hz < 500) {
      low += mag
    } else if (hz < 4000) {
      mid += mag
    } else {
      high += mag
    }
  }

  const bandsum = low + mid + high
  const centroidhz = total > 0 ? weighted / total : 0
  if (bandsum <= 0) {
    return { centroidhz, bandlow: 0, bandmid: 0, bandhigh: 0 }
  }
  return {
    centroidhz,
    bandlow: low / bandsum,
    bandmid: mid / bandsum,
    bandhigh: high / bandsum,
  }
}
