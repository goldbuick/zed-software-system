import { createdevice } from 'zss/device'
import { ensuresttengine, transcribeaudio } from 'zss/feature/stt/sttengine'
import { STT_MODEL_ID } from 'zss/feature/stt/sttpreset'
import { isarray, isnumber } from 'zss/mapping/types'

const stt = createdevice('stt', [], (message) => {
  if (!stt.session(message)) {
    return
  }

  switch (message.target) {
    case 'ensure':
      void (async () => {
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
      })()
      break
    case 'transcribe':
      void (async () => {
        try {
          if (!isarray(message.data) || message.data.length < 2) {
            stt.reply(message, 'stt:error', { message: 'bad transcribe payload' })
            return
          }
          const samples = message.data[0]
          const samplerate = message.data[1]
          if (!(samples instanceof Float32Array) || !isnumber(samplerate)) {
            stt.reply(message, 'stt:error', { message: 'bad transcribe payload' })
            return
          }
          const text = await transcribeaudio(samples, samplerate, (phase, detail) => {
            stt.reply(message, 'stt:progress', { phase, detail })
          })
          stt.reply(message, 'stt:result', { text })
        } catch (err) {
          stt.reply(message, 'stt:error', {
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })()
      break
    default:
      break
  }
})
