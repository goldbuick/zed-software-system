import { Context, getContext, getTransport, setContext, start } from 'tone'
import { createdevice } from 'zss/device'
import { AUDIO_SYNTH, createsynth, setupsynth } from 'zss/feature/synth'
import { synthvoiceconfig } from 'zss/feature/synth/voiceconfig'
import { FXNAME, synthvoicefxconfig } from 'zss/feature/synth/voicefx'
import {
  selectttsengine,
  ttsclearqueue,
  ttsinfo,
  ttsplay,
  ttsqueue,
} from 'zss/feature/tts'
import { write } from 'zss/feature/writeui'
import { useGadgetClient } from 'zss/gadget/data/state'
import { SYNTH_STATE } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { DEFAULT_BPM, waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { apierror, apilog, synthaudioenabled, vmloader } from './api'
import { registerreadplayer } from './register'

type CustomNavigator = {
  audioSession?: {
    type: string
  }
} & Navigator

let locked = false
let enabled = false

/** Firefox can leave `AudioContext.resume()` pending; resolve when context is running or start() settles. */
function waitforrunningaudiocontext(): Promise<void> {
  const raw = getContext().rawContext as AudioContext
  if (raw.state === 'running') {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      raw.removeEventListener('statechange', onstate)
      resolve()
    }
    const onstate = () => {
      if (raw.state === 'running') {
        finish()
      }
    }
    raw.addEventListener('statechange', onstate)
    start()
      .then(() => {
        if (raw.state === 'running') {
          finish()
        }
      })
      .catch((err: unknown) => {
        raw.removeEventListener('statechange', onstate)
        reject(err instanceof Error ? err : new Error(String(err)))
      })
    if (raw.state === 'running') {
      finish()
    }
  })
}

export function enableaudio() {
  if (enabled || locked) {
    return
  }

  // synth setup
  locked = true
  apilog(synthdevice, registerreadplayer(), 'enabling audio…')

  // create new context (lookAhead gives scheduler more time, reduces glitches on slow devices)
  setContext(new Context({ latencyHint: 'playback', lookAhead: 0.15 }), true)

  const rawcontext = getContext().rawContext as AudioContext
  if (rawcontext.state === 'suspended') {
    void rawcontext.resume()
  }

  waitforrunningaudiocontext()
    .then(() => {
      if (!enabled) {
        // better audio playback for mobile safari
        try {
          const customnavigator = navigator as CustomNavigator
          if (ispresent(customnavigator.audioSession)) {
            customnavigator.audioSession.type = 'playback'
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          //
        }
        // add custom audio worklet modules
        return setupsynth().then(() => {
          // lets rolling
          locked = false
          enabled = true
          synthaudioenabled(synthdevice, registerreadplayer())
        })
      }
    })
    .catch((err: any) => {
      locked = false
      apierror(synthdevice, registerreadplayer(), 'audio', err.toString())
    })
}

let synth: MAYBE<AUDIO_SYNTH>

export function synthbroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return synth?.broadcastdestination
}

const synthdevice = createdevice('synth', [], (message) => {
  if (!synthdevice.session(message)) {
    return
  }

  // validate synth state
  if (enabled && !ispresent(synth)) {
    getTransport().bpm.value = DEFAULT_BPM
    synth = createsynth()
    getTransport().start(0)
  }
  if (!ispresent(synth)) {
    return
  }

  // player filter
  const player = registerreadplayer()
  switch (message.target) {
    case 'audioenabled':
      if (message.player !== player) {
        return
      }
      break
  }

  // use gadget state to current board
  const currentboard = useGadgetClient.getState().gadget.board
  switch (message.target) {
    case 'audioenabled':
      apilog(synthdevice, message.player, 'audio is enabled!')
      doasync(synthdevice, message.player, async () => {
        await waitfor(2000)
        vmloader(
          synthdevice,
          message.player,
          undefined,
          'text',
          'audio:enabled',
          '',
        )
      })
      break
    case 'playvolume':
      if (isarray(message.data)) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          synth.setplayvolume(volume)
        }
      }
      break
    case 'bgplayvolume':
      if (isarray(message.data)) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          synth.setbgplayvolume(volume)
        }
      }
      break
    case 'ttsvolume':
      if (isarray(message.data)) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          synth.setttsvolume(volume)
        }
      }
      break
    case 'audiobuffer':
      if (isarray(message.data)) {
        const [, audiobuffer] = message.data as [string, AudioBuffer]
        if (ispresent(audiobuffer)) {
          synth.addaudiobuffer(audiobuffer)
        }
      }
      break
    case 'play':
      if (isarray(message.data)) {
        const [board, buffer] = message.data as [string, string]
        if (board === '' || board === currentboard) {
          if (buffer.trim() === '') {
            // stop playback
            synth.stopplay()
          } else {
            // add to playback
            synth.addplay(buffer)
          }
        }
      }
      break
    case 'bgplay':
      if (isarray(message.data)) {
        const [board, buffer, quantize] = message.data as [
          string,
          string,
          string,
        ]
        // filter by board
        if (board === '' || board === currentboard) {
          synth.addbgplay(buffer, quantize)
        }
      }
      break
    case 'update':
      if (isarray(message.data)) {
        const [board, synthstate] = message.data as [string, SYNTH_STATE]
        if (board === '' || board === currentboard) {
          // apply voices
          const idxvoices = Object.keys(synthstate.voices).map(Number)
          for (let i = 0; i < idxvoices.length; ++i) {
            const idx = idxvoices[i]
            const voice = synthstate.voices[idx]
            const configs = Object.keys(voice)
            for (let j = 0; j < configs.length; ++j) {
              const config = configs[j]
              const value = voice[config]
              if (NAME(config) !== 'restart') {
                synthvoiceconfig(
                  message.player,
                  synth,
                  idx,
                  config,
                  value ?? '',
                )
              }
            }
          }
          // apply voicefx
          const idxvoicefx = Object.keys(synthstate.voicefx).map(Number)
          for (let i = 0; i < idxvoicefx.length; ++i) {
            const idx = idxvoicefx[i]
            const voicefx = synthstate.voicefx[idx]
            const configs = Object.keys(voicefx)
            for (let j = 0; j < configs.length; ++j) {
              const fxname = configs[j]
              const fxstate = voicefx[fxname]
              const fxconfigs = Object.keys(fxstate)
              for (let k = 0; k < fxconfigs.length; ++k) {
                const fxconfig = fxconfigs[k]
                const fxvalue = fxstate[fxconfig]
                if (NAME(fxconfig) === 'on') {
                  synthvoicefxconfig(
                    message.player,
                    synth,
                    idx,
                    fxname as FXNAME,
                    fxvalue ?? '',
                    '',
                  )
                } else {
                  synthvoicefxconfig(
                    message.player,
                    synth,
                    idx,
                    fxname as FXNAME,
                    fxconfig,
                    fxvalue ?? '',
                  )
                }
              }
            }
          }
        }
      }
      break
    case 'voice':
      if (isarray(message.data)) {
        const [, index, config, value] = message.data as [
          string,
          number,
          number | string,
          number | string | number[],
        ]
        synthvoiceconfig(message.player, synth, index, config, value)
      }
      break
    case 'voicefx':
      if (isarray(message.data)) {
        const [, synthindex, fxname, config, value] = message.data as [
          string,
          number,
          FXNAME,
          number | string,
          number | string,
        ]
        synthvoicefxconfig(
          message.player,
          synth,
          synthindex,
          fxname,
          config,
          value,
        )
      }
      break
    case 'record':
      if (isstring(message.data)) {
        synth.synthrecord(message.data)
      }
      break
    case 'flush':
      synth.synthflush()
      break
    case 'tts':
      doasync(synthdevice, message.player, async () => {
        if (isarray(message.data)) {
          const [board, voice, phrase] = message.data as [string, any, string]
          if (
            phrase.trim() !== '' &&
            (board === '' || board === currentboard)
          ) {
            await ttsplay(message.player, board, voice, phrase)
          }
        }
      })
      break
    case 'ttsinfo':
      doasync(synthdevice, message.player, async () => {
        if (isarray(message.data)) {
          const [, info] = message.data as [string, string]
          const data = await ttsinfo(message.player, info)
          if (isarray(data)) {
            for (let i = 0; i < data.length; i++) {
              write(synthdevice, message.player, `$WHITE${data[i]}`)
            }
          }
        }
      })
      break
    case 'ttsengine':
      if (isarray(message.data)) {
        const [, engine, apikey] = message.data as [string, any, string]
        selectttsengine(engine, apikey)
      }
      break
    case 'ttsqueue':
      if (isarray(message.data)) {
        const [board, voice, phrase] = message.data as [string, any, string]
        if (phrase.trim() !== '' && (board === '' || board === currentboard)) {
          ttsqueue(message.player, board, voice, phrase)
        }
      }
      break
    case 'ttsclearqueue':
      ttsclearqueue()
      break
  }
})
