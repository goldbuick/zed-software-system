import { getTransport, start } from 'tone'
import { createdevice } from 'zss/device'
import { AUDIO_SYNTH, createsynth } from 'zss/feature/synth'
import { synthvoiceconfig } from 'zss/feature/synthvoiceconfig'
import { FXNAME, synthvoicefxconfig } from 'zss/feature/synthvoicefxconfig'
import { createsynthworkletnode } from 'zss/feature/synthworkletnodes'
import { playtta, playtts } from 'zss/feature/tts'
import { setAltInterval } from 'zss/gadget/display/anim'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { isarray, isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { api_error, synth_audioenabled, api_info, vm_loader } from './api'
import { registerreadplayer } from './register'

// synth setup

// TODO, wait for this before creating worklet nodes
createsynthworkletnode().catch((err) => {
  api_error(synthdevice, registerreadplayer(), 'audio', err.message)
})

type CustomNavigator = {
  audioSession?: {
    type: string
  }
} & Navigator

let enabled = false
export function enableaudio() {
  if (enabled) {
    return
  }
  start()
    .then(() => {
      if (!enabled) {
        const transport = getTransport()
        enabled = true
        transport.start()
        api_info(synthdevice, registerreadplayer(), 'audio is enabled!')
        setAltInterval(107)
        try {
          const customnavigator = navigator as CustomNavigator
          if (ispresent(customnavigator.audioSession)) {
            customnavigator.audioSession.type = 'playback'
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          //
        }
        synth_audioenabled(synthdevice, registerreadplayer())
      }
    })
    .catch((err: any) => {
      api_error(synthdevice, registerreadplayer(), 'audio', err.message)
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
  if (enabled && !ispresent(synth)) {
    synth = createsynth()
  }
  if (!ispresent(synth)) {
    return
  }
  switch (message.target) {
    case 'audioenabled':
      doasync(synthdevice, message.player, async () => {
        await waitfor(1000)
        vm_loader(
          synthdevice,
          registerreadplayer(),
          undefined,
          'text',
          'audioenabled',
          '',
        )
      })
      break
    case 'bpm':
      if (isnumber(message.data)) {
        setAltInterval(message.data)
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
        const [buffer, bgplay] = message.data as [string, boolean]
        if (buffer === '') {
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
          await playtts(synth, message.data)
        }
      })
      break
    case 'tta':
      doasync(synthdevice, message.player, async () => {
        if (isarray(message.data)) {
          await playtta(message.player, synth, message.data)
        }
      })
      break
  }
})
