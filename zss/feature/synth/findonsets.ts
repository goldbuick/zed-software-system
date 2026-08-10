/**
 * Amplitude onset detector for #synthrecord note-presence gates.
 * Pure function so Jest can assert without OfflineAudioContext / WASM.
 */
export function findonsets(
  samples: Float32Array,
  samplerate: number,
  threshold = 0.01,
): number[] {
  const onsets: number[] = []
  let armed = true
  for (let i = 0; i < samples.length; i++) {
    const ax = Math.abs(samples[i] ?? 0)
    if (armed && ax >= threshold) {
      onsets.push(i / samplerate)
      armed = false
    } else if (!armed && ax < threshold * 0.25) {
      armed = true
    }
  }
  return onsets
}
