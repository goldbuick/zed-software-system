import { createdevice } from 'zss/device'
import { createsynthbackend } from 'zss/feature/synth/backend/synthbackendfactory'
import { unlockaudiocontext } from 'zss/feature/synth/backend/wasm/audiocontextunlock'
import { applyboardstate } from 'zss/feature/synth/frontend/applyboardstate'
import {
  type FXNAME,
  type SynthBackend,
} from 'zss/feature/synth/frontend/synthbackend'
import { synthdebugtrace } from 'zss/feature/synth/synthdebugtrace'
import {
  applyttsengineconfig,
  ttsclearqueue,
  ttsinfo,
  ttsplay,
  ttsqueue,
} from 'zss/feature/tts'
import { write } from 'zss/feature/writeui'
import { SYNTH_STATE } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import {
  apierror,
  apilog,
  synthaudioenabled,
  vmloader,
  workstatus,
} from './api'
import { registerreadplayer } from './register'

type CustomNavigator = {
  audioSession?: {
    type: string
  }
} & Navigator

let locked = false
let enabled = false
let backend: MAYBE<SynthBackend>

export function enableaudio() {
  if (enabled || locked) {
    return
  }

  locked = true
  workstatus(synthdevice, registerreadplayer(), 'audio init')
  unlockaudiocontext()

  void createsynthbackend()
    .then((result) => {
      backend = result
      locked = false
      enabled = true
      synthaudioenabled(synthdevice, registerreadplayer())
      try {
        const customnavigator = navigator as CustomNavigator
        if (ispresent(customnavigator.audioSession)) {
          customnavigator.audioSession.type = 'playback'
        }
      } catch {
        //
      }
    })
    .catch((err: unknown) => {
      locked = false
      apierror(
        synthdevice,
        registerreadplayer(),
        'audio',
        err instanceof Error ? err.message : String(err),
      )
    })
}

export function synthbroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return backend?.broadcastdestination()
}

/** Test hook — set synth device routing state without audio boot. */
export function setsynthdeviceteststate(opts: {
  enabled?: boolean
  backend?: SynthBackend
}) {
  if (opts.enabled !== undefined) {
    enabled = opts.enabled
  }
  if (opts.backend !== undefined) {
    backend = opts.backend
  }
}

const synthdevice = createdevice('synth', [], (message) => {
  if (!synthdevice.session(message)) {
    return
  }

  if (!enabled) {
    return
  }

  const currentboard = useGadgetClient.getState().gadget.board
  const player = registerreadplayer()

  switch (message.target) {
    case 'audioenabled':
      if (message.player !== player) {
        return
      }
      doasync(synthdevice, message.player, async () => {
        apilog(synthdevice, message.player, 'audio is enabled!')
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
      if (isarray(message.data) && backend) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          backend.setplayvolume(volume)
        }
      }
      break
    case 'bgplayvolume':
      if (isarray(message.data) && backend) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          backend.setbgplayvolume(volume)
        }
      }
      break
    case 'ttsvolume':
      if (isarray(message.data)) {
        const [, volume] = message.data as [string, number]
        if (isnumber(volume)) {
          backend?.setttsvolume(volume)
        }
      }
      break
    case 'play':
      if (isarray(message.data) && backend) {
        const [board, buffer] = message.data as [string, string]
        const trimmed = buffer.trim()
        if (trimmed === '') {
          synthdebugtrace('C5 stopplay', { board, currentboard, trimmed })
          backend.stopplay()
        } else if (board === '' || board === currentboard) {
          synthdebugtrace('C5 addplay', { board, currentboard, trimmed })
          backend.addplay(trimmed)
        } else {
          synthdebugtrace('C4 dropped addplay', {
            board,
            currentboard,
            trimmed,
          })
        }
      }
      break
    case 'bgplay':
      if (isarray(message.data) && backend) {
        const [board, buffer, quantize] = message.data as [
          string,
          string,
          string,
        ]
        if (board === '' || board === currentboard) {
          backend.addbgplay(buffer, quantize)
        }
      }
      break
    case 'audiobuffer':
      if (isarray(message.data)) {
        const [, audiobuffer] = message.data as [string, AudioBuffer]
        if (ispresent(audiobuffer) && backend) {
          backend.playaudiobuffer(audiobuffer)
        }
      }
      break
    case 'update':
      if (isarray(message.data) && backend) {
        const [board, synthstate] = message.data as [string, SYNTH_STATE]
        if (board === '' || board === currentboard) {
          applyboardstate(backend, synthstate)
        }
      }
      break
    case 'voice':
      if (isarray(message.data) && backend) {
        const [, index, config, value] = message.data as [
          string,
          number,
          number | string,
          number | string | number[],
        ]
        backend.setvoiceconfig(index, config, value)
      }
      break
    case 'voicefx':
      if (isarray(message.data) && backend) {
        const [, synthindex, fxname, config, value] = message.data as [
          string,
          number,
          FXNAME,
          number | string,
          number | string,
        ]
        backend.applyvoicefx(synthindex, fxname, config, value)
      }
      break
    case 'record':
      if (isstring(message.data) && backend) {
        backend.synthrecord(message.data)
      }
      break
    case 'flush':
      backend?.synthflush()
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
        const [, engine, apikey, model] = message.data as [
          string,
          any,
          string,
          string,
        ]
        doasync(synthdevice, message.player, async () => {
          await applyttsengineconfig(
            message.player,
            engine,
            apikey ?? '',
            model,
          )
        })
      }
      break
    case 'ttsclearqueue':
      ttsclearqueue()
      break
    case 'ttsqueue':
      if (isarray(message.data)) {
        const [board, voice, phrase] = message.data as [string, any, string]
        if (phrase.trim() !== '' && (board === '' || board === currentboard)) {
          ttsqueue(message.player, board, voice, phrase)
        }
      }
      break
  }
})

export { synthdevice }
