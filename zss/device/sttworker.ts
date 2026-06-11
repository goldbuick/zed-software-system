import { createdevice, createmessage } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  disposesttengine,
  ensuresttengine,
  transcribeaudio,
} from 'zss/feature/stt/sttengine'
import { enqueuesttjob } from 'zss/feature/stt/sttjobqueue'
import { STT_MODEL_ID } from 'zss/feature/stt/sttpreset'
import { isarray, isnumber } from 'zss/mapping/types'

function replydisposeack(message: MESSAGE, requestid?: string) {
  if (typeof requestid === 'string') {
    self.postMessage(
      createmessage(
        message.session,
        message.player,
        'stt',
        'platform:stt:disposed',
        { requestid },
      ),
    )
  }
}

const stt = createdevice('stt', [], (message) => {
  if (!stt.session(message)) {
    return
  }

  switch (message.target) {
    case 'ensure':
      enqueuesttjob(async () => {
        try {
          const modelid =
            isarray(message.data) && typeof message.data[0] === 'string'
              ? message.data[0]
              : STT_MODEL_ID
          await ensuresttengine((phase, detail) => {
            stt.reply(message, 'stt:progress', { phase, detail })
          }, modelid)
          stt.reply(message, 'stt:ready', { modelId: modelid })
        } catch (err) {
          stt.reply(message, 'stt:error', {
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })
      break
    case 'transcribe':
      enqueuesttjob(async () => {
        try {
          if (!isarray(message.data) || message.data.length < 2) {
            stt.reply(message, 'stt:error', {
              message: 'bad transcribe payload',
            })
            return
          }
          const samples = message.data[0]
          const samplerate = message.data[1]
          if (!(samples instanceof Float32Array) || !isnumber(samplerate)) {
            stt.reply(message, 'stt:error', {
              message: 'bad transcribe payload',
            })
            return
          }
          const text = await transcribeaudio(
            samples,
            samplerate,
            (phase, detail) => {
              stt.reply(message, 'stt:progress', { phase, detail })
            },
          )
          stt.reply(message, 'stt:result', { text })
        } catch (err) {
          stt.reply(message, 'stt:error', {
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })
      break
    case 'dispose':
      enqueuesttjob(async () => {
        try {
          await disposesttengine()
        } catch (err) {
          console.error('stt dispose failed', err)
        }
        const requestid = (message.data as { requestid?: string })?.requestid
        replydisposeack(message, requestid)
        stt.reply(message, 'stt:disposed', {})
      })
      break
    default:
      break
  }
})
