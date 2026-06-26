import { createdevice } from 'zss/device'
import { apierror } from 'zss/device/api'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { isarray, ispresent } from 'zss/mapping/types'

let ttsjobchain: Promise<unknown> = Promise.resolve()

function enqueuettsjob(player: string, job: () => Promise<void>) {
  ttsjobchain = ttsjobchain
    .then(() => job())
    .catch((error: unknown) => {
      console.error(error)
      apierror(
        tts,
        player,
        'crash',
        error instanceof Error ? error.message : String(error),
      )
    })
}

const tts = createdevice('tts', [], (message) => {
  if (!tts.session(message)) {
    return
  }

  switch (message.target) {
    case 'info':
      enqueuettsjob(message.player, async () => {
        if (isarray(message.data)) {
          const [engine, info, config, model] = message.data as [
            engine: 'piper' | 'supertonic' | 'fish',
            info: string,
            config: string,
            model: string,
          ]
          const data = await requestinfo(
            tts,
            message.player,
            engine,
            info,
            config ?? '',
            model ?? '',
          )
          tts.reply(message, 'tts:info', ispresent(data) ? data : [])
        }
      })
      break
    case 'request':
      enqueuettsjob(message.player, async () => {
        if (isarray(message.data)) {
          const [engine, config, voice, phrase, model] = message.data as [
            engine: 'piper' | 'supertonic' | 'fish',
            config: string,
            voice: string,
            phrase: string,
            model: string,
          ]
          const audiobytes = await requestaudiobytes(
            tts,
            message.player,
            engine,
            config,
            voice,
            phrase,
            model ?? '',
          )
          tts.reply(
            message,
            'tts:request',
            ispresent(audiobytes) ? audiobytes : undefined,
          )
        }
      })
      break
    default:
      break
  }
})
