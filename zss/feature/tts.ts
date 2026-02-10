import { newQueue } from '@henrygd/queue'
import { getContext } from 'tone'
import { createdevice } from 'zss/device'
import { heavyttsinfo, heavyttsrequest, synthaudiobuffer } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createsid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

// engine config
let ttsengine: 'piper' | 'kitten' = 'piper'
let ttsconfig = ''

export function selectttsengine(engine: 'piper' | 'kitten', config: string) {
  ttsengine = engine
  ttsconfig = config
}

function convertarraybytes(bytes: ArrayBuffer) {
  return getContext().decodeAudioData(bytes)
}

async function requestaudiobuffer(
  player: string,
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'heavy:ttsrequest' && message.data) {
          convertarraybytes(message.data).then(resolve).catch(console.error)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    heavyttsrequest(once, player, ttsengine, ttsconfig, voice, input)
  })
}

export function ttsinfo(player: string, info: string) {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'heavy:ttsinfo' && message.data) {
          resolve(message.data)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    heavyttsinfo(once, player, ttsengine, info)
  })
}

export async function ttsplay(
  player: string,
  board: string,
  voice: string,
  input: string,
): Promise<void> {
  if (input.trim() === '') {
    return
  }
  // play the audio
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  if (ispresent(audiobuffer)) {
    synthaudiobuffer(SOFTWARE, player, board, audiobuffer)
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  player: string,
  board: string,
  audiobuffer: AudioBuffer,
): Promise<void> {
  // play the audio
  synthaudiobuffer(SOFTWARE, player, board, audiobuffer)
  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  player: string,
  board: string,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(player, voice, input)
  audioplayqueue
    .add(async () => {
      if (ispresent(audiobuffer)) {
        await audioplaytask(player, board, audiobuffer)
      }
    })
    .catch(console.error)
}

export function ttsqueue(
  player: string,
  board: string,
  voice: string,
  input: string,
) {
  audiobufferqueue
    .add(async () => {
      await audiobuffertask(player, board, voice, input)
    })
    .catch(console.error)
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
