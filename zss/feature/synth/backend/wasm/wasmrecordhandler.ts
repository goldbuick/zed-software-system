import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { createnameid } from 'zss/mapping/guid'

import { converttomp3 } from '../../mp3'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import type { RECORDING_STATE } from '../../shared/recording'

import type { MaxiEngine } from './maximilian'
import { renderwasmrecord } from './wasmofflinerender'
import type { WASM_REPLAY_STATE } from './wasmreplaystate'

export type WASM_RECORD_DEPS = {
  clearschedules: () => void
  applyreplay: (state: WASM_REPLAY_STATE) => void
  synthreplay: (
    pattern: SYNTH_NOTE_ENTRY[],
    maxtime: number,
    tickhook?: (time: number) => void,
  ) => void
  setplayvolume: (volume: number) => void
  setbgplayvolume: (volume: number) => void
  getreplay: () => WASM_REPLAY_STATE
}

export function createwasmrecordhandler(
  _maxi: MaxiEngine,
  recording: RECORDING_STATE,
  deps: WASM_RECORD_DEPS,
) {
  function synthflush() {
    recording.recordedticks = []
    recording.recordlastpercent = 0
    recording.recordisrendering = 0
  }

  function synthrecord(filename: string) {
    if (recording.recordedticks.length === 0) {
      synthflush()
      return
    }

    const player = registerreadplayer()
    const capturedticks = recording.recordedticks.slice()
    synthflush()

    const times = capturedticks.map((item) => item[0])
    const mintime = Math.min(...times)
    const maxtime = Math.max(...times)
    const duration = Math.ceil(maxtime - mintime + 5.0)

    const offlineticks: SYNTH_NOTE_ENTRY[] = []
    for (let i = 0; i < capturedticks.length; ++i) {
      const [time, value] = capturedticks[i]
      offlineticks.push([time - mintime + 0.1, value])
    }

    const replay = deps.getreplay()

    void (async () => {
      try {
        write(SOFTWARE, player, 'rendering audio')
        deps.clearschedules()

        const audiobuffer = await renderwasmrecord(
          replay,
          offlineticks,
          maxtime,
          duration,
        )

        write(SOFTWARE, player, 'rendering complete, exporting mp3')
        const mp3data = await converttomp3(audiobuffer)

        const anchor = document.createElement('a')
        anchor.href = URL.createObjectURL(
          new Blob([mp3data as BlobPart], { type: 'audio/mp3' }),
        )
        anchor.download = `${filename || createnameid()}.mp3`
        write(SOFTWARE, player, `saving file ${anchor.download}`)
        anchor.click()
      } catch (err) {
        apierror(
          SOFTWARE,
          player,
          'synthrecord',
          err instanceof Error ? err : new Error(String(err)),
        )
      } finally {
        deps.clearschedules()
        recording.recordisrendering = 0
        recording.recordlastpercent = 0
      }
    })()
  }

  return { synthrecord, synthflush }
}
