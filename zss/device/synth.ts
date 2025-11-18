import { Context, getTransport, setContext, start } from 'tone'
import { createdevice } from 'zss/device'
import { AUDIO_SYNTH, createsynth, setupsynth } from 'zss/feature/synth'
import { synthvoiceconfig } from 'zss/feature/synth/voiceconfig'
import { FXNAME, synthvoicefxconfig } from 'zss/feature/synth/voicefxconfig'
import {
  selectttsengine,
  ttsclearqueue,
  ttsplay,
  ttsqueue,
} from 'zss/feature/tts'
import { useGadgetClient } from 'zss/gadget/data/state'
import { setAltInterval } from 'zss/gadget/display/anim'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import { api_error, api_log, synth_audioenabled, vm_loader } from './api'
import { registerreadplayer } from './register'

type CustomNavigator = {
  audioSession?: {
    type: string
  }
} & Navigator

let locked = false
let enabled = false
export function enableaudio() {
  if (enabled || locked) {
    return
  }

  // synth setup
  locked = true

  // create new context
  setContext(new Context({ latencyHint: 'playback' }), true)

  // resume audio context
  start()
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
          synth_audioenabled(synthdevice, registerreadplayer())
        })
      }
    })
    .catch((err: any) => {
      locked = false
      api_error(synthdevice, registerreadplayer(), 'audio', err.toString())
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
    synth = createsynth()
    getTransport().start()
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

  // use gadget state to get board filter for synth
  const synthfocus = useGadgetClient.getState().gadget.board
  switch (message.target) {
    case 'audioenabled':
      api_log(synthdevice, message.player, 'audio is enabled!')
      doasync(synthdevice, message.player, async () => {
        await waitfor(2000)
        vm_loader(
          synthdevice,
          message.player,
          undefined,
          'text',
          'audio:enabled',
          '',
        )
      })
      break
    case 'bpm':
      if (isnumber(message.data)) {
        const bpm = Math.round(message.data)
        synth.setbpm(bpm)
        setAltInterval(bpm)
      }
      break
    case 'playvolume':
      if (isnumber(message.data)) {
        synth.setplayvolume(message.data)
      }
      break
    case 'bgplayvolume':
      if (isnumber(message.data)) {
        synth.setbgplayvolume(message.data)
      }
      break
    case 'ttsvolume':
      if (isnumber(message.data)) {
        synth.setttsvolume(message.data)
      }
      break
    case 'play':
      if (isarray(message.data)) {
        const [board, buffer] = message.data as [string, string]
        // board audio filter
        if (board && board !== synthfocus) {
          return
        }
        if (buffer.trim() === '') {
          // stop playback
          synth.stopplay()
        } else {
          // add to playback
          synth.addplay(buffer)
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
        // board audio filter
        if (board && board !== synthfocus) {
          return
        }
        // add to playback
        synth.addbgplay(buffer, quantize)
      }
      break
    case 'voice':
      if (isarray(message.data)) {
        const [index, config, value] = message.data as [
          number,
          number | string,
          number | string | number[],
        ]
        synthvoiceconfig(message.player, synth, index, config, value)
      }
      break
    case 'voicefx':
      if (isarray(message.data)) {
        const [synthindex, fxname, config, value] = message.data as [
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
          const [voice, phrase] = message.data as [any, string]
          await ttsplay(synth, voice, phrase)
        }
      })
      break
    case 'ttsengine':
      doasync(synthdevice, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, apikey] = message.data as [any, string]
          await selectttsengine(engine, apikey)
        }
      })
      break
    case 'ttsqueue':
      if (isarray(message.data)) {
        const [voice, phrase] = message.data as [string, string]
        ttsqueue(synth, voice, phrase)
      }
      break
    case 'ttsclearqueue':
      ttsclearqueue()
      break
  }
})
