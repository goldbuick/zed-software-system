import { Mp3Encoder } from '@breezystack/lamejs'
import { workstatus } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { waitfor } from 'zss/mapping/tick'

export async function converttomp3(buffer: AudioBuffer): Promise<Uint8Array> {
  const player = registerreadplayer()

  const numChannels = buffer.numberOfChannels
  const leftChannel = buffer.getChannelData(0)
  const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel
  const sampleRate = buffer.sampleRate
  const numSamples = leftChannel.length

  const mp3encoder = new Mp3Encoder(2, sampleRate, 128)
  const sampleBlockSize = 1152

  const mp3Data = []

  workstatus(SOFTWARE, player, 'mp3 encode')

  for (let i = 0; i < numSamples; i += sampleBlockSize) {
    if (mp3Data.length % 64 === 0) {
      write(SOFTWARE, player, `encoding chunk (${i}/${numSamples})`)
      const pct = Math.round((i / Math.max(1, numSamples)) * 100)
      workstatus(SOFTWARE, player, `mp3 ${pct}%`)
    }

    const leftChunk = new Int16Array(sampleBlockSize)
    const rightChunk = new Int16Array(sampleBlockSize)
    for (let j = 0; j < sampleBlockSize; j++) {
      const sampleIndex = i + j
      if (sampleIndex < numSamples) {
        leftChunk[j] =
          leftChannel[sampleIndex] < 0
            ? leftChannel[sampleIndex] * 0x8000
            : leftChannel[sampleIndex] * 0x7fff
        rightChunk[j] =
          rightChannel[sampleIndex] < 0
            ? rightChannel[sampleIndex] * 0x8000
            : rightChannel[sampleIndex] * 0x7fff
      }
    }

    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    if (mp3Data.length % 16 === 0) {
      await waitfor(10)
    }
  }

  const finalMp3Buf = mp3encoder.flush()
  if (finalMp3Buf.length > 0) {
    mp3Data.push(finalMp3Buf)
  }

  write(SOFTWARE, player, `total chunks ${mp3Data.length + 1}`)

  await waitfor(100)

  return new Uint8Array(
    mp3Data.reduce((acc, chunk) => {
      const temp = new Uint8Array(acc.length + chunk.length)
      temp.set(acc, 0)
      temp.set(chunk, acc.length)
      return temp
    }, new Uint8Array(0)),
  )
}
