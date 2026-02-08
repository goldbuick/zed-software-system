import { Offline } from 'tone'
import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { createnameid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE } from 'zss/mapping/types'

import { converttomp3 } from './mp3'
import { SYNTH_NOTE_ENTRY } from './playnotation'
import type { SourceFxSetup } from './sourcefxsetup'
import type { RecordingState } from './tickhandler'

export type SynthFactory = () => {
  setplayvolume: (v: number) => void
  applyreplay: (source: any[], fxchain: any, fx: any[]) => void
  synthreplay: (pattern: SYNTH_NOTE_ENTRY[], maxtime: number) => void
  destroy: () => void
}

export function createRecordHandler(
  sourceFx: SourceFxSetup,
  recording: RecordingState,
  setupsynth: () => Promise<void>,
  createsynth: SynthFactory,
) {
  const { SOURCE, FX, FXCHAIN } = sourceFx

  function synthflush() {
    recording.recordedticks = []
    recording.recordlastpercent = 0
    recording.recordisrendering = 0
  }

  function synthrecord(filename: string) {
    if (recording.recordedticks.length) {
      const player = registerreadplayer()
      const times = recording.recordedticks.map((item) => item[0])
      const mintime = Math.min(...times)
      const maxtime = Math.max(...times)
      const duration = Math.ceil(maxtime - mintime + 5.0)

      const offlineticks: SYNTH_NOTE_ENTRY[] = []
      for (let i = 0; i < recording.recordedticks.length; ++i) {
        const [time, value] = recording.recordedticks[i]
        offlineticks.push([time - mintime + 0.1, value])
      }

      const sourcereplay = SOURCE.map((item) => item.getreplay())
      const fxchainreplay = FXCHAIN.getreplay()
      const fxreplay = FX.map((item) => item.getreplay())
      let audio: MAYBE<ReturnType<SynthFactory>>

      Offline(async ({ transport }) => {
        write(SOFTWARE, player, 'create synth')
        await setupsynth()
        audio = createsynth()

        write(SOFTWARE, player, 'synth waiting for setup')
        await waitfor(2000)

        audio.setplayvolume(80)
        audio.applyreplay(sourcereplay, fxchainreplay, fxreplay)
        audio.synthreplay(offlineticks, maxtime)

        write(SOFTWARE, player, 'rendering audio')
        transport.start(0)
      }, duration)
        .then((buffer) => {
          write(SOFTWARE, player, 'rendering complete, exporting mp3')
          const mp3Data = converttomp3(buffer)
          return mp3Data
        })
        .then((mp3Data) => {
          const anchor = document.createElement('a')
          anchor.href = URL.createObjectURL(
            new Blob([mp3Data as BlobPart], { type: 'audio/mp3' }),
          )
          anchor.download = `${filename || createnameid()}.mp3`
          write(SOFTWARE, player, `saving file ${anchor.download}`)

          anchor.click()

          audio?.destroy()
        })
        .catch((err) => {
          apierror(SOFTWARE, player, 'synthrecord', err)
        })
    }

    synthflush()
  }

  return { synthrecord, synthflush }
}
