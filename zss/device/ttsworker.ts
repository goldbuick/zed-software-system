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
          const [engine, info] = message.data as [
            engine: 'piper' | 'supertonic',
            info: string,
          ]
          const data = await requestinfo(tts, message.player, engine, info)
          tts.reply(message, 'tts:info', ispresent(data) ? data : [])
        }
      })
      break
    case 'request':
      enqueuettsjob(message.player, async () => {
        if (isarray(message.data)) {
          const [engine, config, voice, phrase] = message.data as [
            engine: 'piper' | 'supertonic',
            config: string,
            voice: string,
            phrase: string,
          ]
          const audiobytes = await requestaudiobytes(
            tts,
            message.player,
            engine,
            config,
            voice,
            phrase,
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
