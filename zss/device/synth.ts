import { start, Context, setContext, getTransport } from 'tone'
import { createdevice } from 'zss/device'
import { AUDIO_SYNTH, createsynth } from 'zss/feature/synth'
import { addfcrushmodule } from 'zss/feature/synthfcrushworkletnode'
import { addsidechainmodule } from 'zss/feature/synthsidechainworkletnode'
import { synthvoiceconfig } from 'zss/feature/synthvoiceconfig'
import { FXNAME, synthvoicefxconfig } from 'zss/feature/synthvoicefxconfig'
import { ttsplay } from 'zss/feature/tts'
import { setAltInterval } from 'zss/gadget/display/anim'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import {
  isarray,
  isnumber,
  ispresent,
  isstring,
  MAYBE,
} from 'zss/mapping/types'

import { api_error, synth_audioenabled, vm_loader, api_log } from './api'
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
  setContext(
    new Context({
      lookAhead: 0.25,
      latencyHint: 'playback',
    }),
    true,
  )

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
        return addfcrushmodule()
          .then(() => {
            return addsidechainmodule()
          })
          .then(() => {
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
let synthfocus = ''

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
    case 'focus':
    case 'audioenabled':
      if (message.player !== player) {
        return
      }
      break
  }

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
          'audioenabled',
          '',
        )
      })
      break
    case 'bpm':
      if (isnumber(message.data)) {
        const bpm = message.data
        setAltInterval(bpm)
        getTransport().bpm.value = bpm
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
    case 'focus':
      if (isstring(message.data)) {
        synthfocus = message.data
      }
      break
    case 'play':
      if (isarray(message.data)) {
        const [board, buffer, bgplay] = message.data as [
          string,
          string,
          boolean,
        ]
        // board audio filter
        if (board && board !== synthfocus) {
          return
        }
        if (buffer.trim() === '') {
          // stop playback
          synth.stopplay()
        } else {
          // add to playback
          synth.addplay(buffer, bgplay)
        }
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
    case 'tts':
      doasync(synthdevice, message.player, async () => {
        if (isarray(message.data)) {
          const [voice, phrase] = message.data as [string, string]
          await ttsplay(synth, voice, phrase)
        }
      })
      break
  }
})
