import { Mp3Encoder } from '@breezystack/lamejs'
import { ToneAudioBuffer } from 'tone'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { waitfor } from 'zss/mapping/tick'

import { write } from 'zss/feature/writeui'

// Convert AudioBuffer to MP3 using lamejs
export async function converttomp3(
  buffer: ToneAudioBuffer,
): Promise<Uint8Array> {
  const player = registerreadplayer()

  // Get raw PCM data
  const samples = buffer.getChannelData(0) // Mono for simplicity
  const sampleRate = buffer.sampleRate

  // Initialize MP3 encoder
  const mp3encoder = new Mp3Encoder(1, sampleRate, 128) // mono, sample rate, bitrate
  const sampleBlockSize = 1152 // Must be multiple of 576

  const mp3Data = []

  // Process the audio in chunks
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    if (mp3Data.length % 64 === 0) {
      write(SOFTWARE, player, `encoding chunk (${i}/${samples.length})`)
    }

    // Convert float32 samples to int16
    const sampleChunk = new Int16Array(sampleBlockSize)
    for (let j = 0; j < sampleBlockSize; j++) {
      if (i + j < samples.length) {
        // Scale to int16 range and convert
        sampleChunk[j] =
          samples[i + j] < 0 ? samples[i + j] * 0x8000 : samples[i + j] * 0x7fff
      }
    }

    // Encode the chunk
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    if (mp3Data.length % 16 === 0) {
      await waitfor(10)
    }
  }

  // Finalize the encoding
  const finalMp3Buf = mp3encoder.flush()
  if (finalMp3Buf.length > 0) {
    mp3Data.push(finalMp3Buf)
  }

  write(SOFTWARE, player, `total chunks ${mp3Data.length + 1}`)

  await waitfor(100)

  // Combine all chunks
  return new Uint8Array(
    mp3Data.reduce((acc, chunk) => {
      const temp = new Uint8Array(acc.length + chunk.length)
      temp.set(acc, 0)
      temp.set(chunk, acc.length)
      return temp
    }, new Uint8Array(0)),
  )
}
