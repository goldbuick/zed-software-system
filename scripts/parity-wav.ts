/** WAV helpers for offline parity scripts (16-bit mono PCM in base64). */

export function decodewav(base64: string): {
  samples: Float32Array
  samplerate: number
} {
  const binary = Buffer.from(base64, 'base64')
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
  const samplerate = view.getUint32(24, true)
  const samplecount = view.getUint32(40, true) / 2
  const samples = new Float32Array(samplecount)
  let offset = 44
  for (let i = 0; i < samplecount; i++) {
    samples[i] = view.getInt16(offset, true) / 0x8000
    offset += 2
  }
  return { samples, samplerate }
}

export function encodewavbase64(
  samples: Float32Array,
  samplerate: number,
): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }
  writeascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeascii(8, 'WAVE')
  writeascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, samplerate, true)
  view.setUint32(28, samplerate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return Buffer.from(buffer).toString('base64')
}
