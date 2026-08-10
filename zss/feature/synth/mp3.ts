import { Mp3Encoder } from '@breezystack/lamejs'
import { workstatus } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { waitfor } from 'zss/mapping/tick'

/** Headroom applied to #synthrecord PCM before lamejs encode. */
export const RECORD_EXPORT_TRIM_DB = -3

/** Scale all channels in-place by a dB gain (e.g. -3). */
export function trimaudiobufferdb(buffer: AudioBuffer, db: number): void {
  const gain = Math.pow(10, db / 20)
  const channels = buffer.numberOfChannels
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      data[i] *= gain
    }
  }
}

export async function converttomp3(buffer: AudioBuffer): Promise<Uint8Array> {
  const player = registerreadplayer()

  const numchannels = buffer.numberOfChannels
  const leftchannel = buffer.getChannelData(0)
  const rightchannel = numchannels > 1 ? buffer.getChannelData(1) : leftchannel
  const samplerate = buffer.sampleRate
  const numsamples = leftchannel.length

  const mp3encoder = new Mp3Encoder(2, samplerate, 128)
  const sampleblocksize = 1152

  const mp3data = []

  workstatus(SOFTWARE, player, 'mp3 encode')

  for (let i = 0; i < numsamples; i += sampleblocksize) {
    if (mp3data.length % 64 === 0) {
      write(SOFTWARE, player, `encoding chunk (${i}/${numsamples})`)
      const pct = Math.round((i / Math.max(1, numsamples)) * 100)
      workstatus(SOFTWARE, player, `mp3 ${pct}%`)
    }

    const leftchunk = new Int16Array(sampleblocksize)
    const rightchunk = new Int16Array(sampleblocksize)
    for (let j = 0; j < sampleblocksize; j++) {
      const sampleindex = i + j
      if (sampleindex < numsamples) {
        leftchunk[j] =
          leftchannel[sampleindex] < 0
            ? leftchannel[sampleindex] * 0x8000
            : leftchannel[sampleindex] * 0x7fff
        rightchunk[j] =
          rightchannel[sampleindex] < 0
            ? rightchannel[sampleindex] * 0x8000
            : rightchannel[sampleindex] * 0x7fff
      }
    }

    const mp3buf = mp3encoder.encodeBuffer(leftchunk, rightchunk)
    if (mp3buf.length > 0) {
      mp3data.push(mp3buf)
    }

    if (mp3data.length % 16 === 0) {
      await waitfor(10)
    }
  }

  const finalmp3buf = mp3encoder.flush()
  if (finalmp3buf.length > 0) {
    mp3data.push(finalmp3buf)
  }

  write(SOFTWARE, player, `total chunks ${mp3data.length + 1}`)

  await waitfor(100)

  return new Uint8Array(
    mp3data.reduce((acc, chunk) => {
      const temp = new Uint8Array(acc.length + chunk.length)
      temp.set(acc, 0)
      temp.set(chunk, acc.length)
      return temp
    }, new Uint8Array(0)),
  )
}
