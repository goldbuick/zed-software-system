import { newQueue } from '@henrygd/queue'
import { EdgeSpeechTTS } from '@lobehub/tts'
import { getContext } from 'tone'
import { createdevice } from 'zss/device'
import { heavyttsrequest, synthaudiobuffer } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { hub } from 'zss/hub'
import { doasync } from 'zss/mapping/func'
import { createsid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

// yap instances
let edgetts: MAYBE<EdgeSpeechTTS>

// engine config
let ttsengine: 'edge' | 'piper' | 'kitten' = 'edge'
let ttsconfig = ''

export function selectttsengine(
  engine: 'edge' | 'piper' | 'kitten',
  config: string,
) {
  ttsengine = engine
  ttsconfig = config
}

function convertarraybytes(bytes: ArrayBuffer) {
  return getContext().decodeAudioData(bytes)
}

export async function requestaudiobuffer(
  player: string,
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
  return new Promise((resolve) => {
    doasync(SOFTWARE, player, async () => {
      const once = createdevice(
        createsid(),
        [],
        (message) => {
          if (message.target === 'heavy:ttsrequest' && message.data) {
            convertarraybytes(message.data).then(resolve).catch(console.error)
          }
          hub.disconnect(once)
        },
        SOFTWARE.session(),
      )
      switch (ttsengine) {
        case 'edge':
          if (!ispresent(edgetts)) {
            edgetts = new EdgeSpeechTTS({ locale: 'en-US' })
          }
          if (ispresent(edgetts)) {
            const timer = setTimeout(() => resolve(undefined), 5000)
            const audiobuffer = await edgetts.createAudio({
              input,
              options: { voice },
            })
            clearTimeout(timer)
            resolve(audiobuffer)
          }
          break
        case 'piper':
          heavyttsrequest(once, player, 'piper', ttsconfig, voice, input)
          break
        case 'kitten':
          heavyttsrequest(once, player, 'kitten', ttsconfig, voice, input)
          break
      }
    })
  })
}

export async function ttsplay(
  player: string,
  voice: string,
  input: string,
): Promise<void> {
  if (input.trim() === '') {
    return
  }
  // play the audio
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  if (ispresent(audiobuffer)) {
    synthaudiobuffer(SOFTWARE, player, audiobuffer)
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  player: string,
  audiobuffer: AudioBuffer,
): Promise<void> {
  // play the audio
  synthaudiobuffer(SOFTWARE, player, audiobuffer)
  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  player: string,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  audioplayqueue
    .add(async () => {
      if (ispresent(audiobuffer)) {
        await audioplaytask(player, audiobuffer)
      }
    })
    .catch(console.error)
}

export function ttsqueue(player: string, voice: string, input: string) {
  audiobufferqueue
    .add(async () => {
      await audiobuffertask(player, voice, input)
    })
    .catch(console.error)
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
