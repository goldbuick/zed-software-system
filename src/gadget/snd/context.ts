import { randomNumber } from '@/mapping/number'

const audioContext = new AudioContext()
const mediaStreamAudioDestination = audioContext.createMediaStreamDestination()
const audioOutput = audioContext.createGain()
const audioSfxOutput = audioContext.createGain()

audioOutput.connect(audioContext.destination)
audioOutput.connect(mediaStreamAudioDestination)

audioSfxOutput.connect(audioOutput)

export async function audioStart() {
  return audioContext.resume()
}

export function getAudioContext() {
  return audioContext
}

export function getAudioSfxOutput() {
  return audioSfxOutput
}

export function getAudioMusicOutput() {
  return audioOutput
}

export function getMediaStreamAudioDestination() {
  return mediaStreamAudioDestination
}

export function createAudioSource(buffer: AudioBuffer) {
  const source = audioContext.createBufferSource() // creates a sound source
  source.buffer = buffer // tell the source which sound to play
  source.connect(audioSfxOutput) // connect the source to the context's destination (the speakers)
  return source
}

export async function loadSoundUrl(soundUrl: string) {
  try {
    const request = await fetch(soundUrl)
    const arrayBuffer = await request.arrayBuffer()
    return await audioContext.decodeAudioData(arrayBuffer)
  } catch (err) {
    console.error(err)
  }
}

const players: Record<string, AudioBufferSourceNode> = {}

export function rngPlayRate() {
  const ratio = 1 - randomNumber() * 2
  return 1 + ratio * 0.05
}

export function playAudioBuffer(
  snd: string,
  audioBuffer: AudioBuffer,
  useRng: boolean,
) {
  try {
    if (players[snd]) {
      players[snd].stop()
    }
  } catch (err) {
    // no-op
  }

  players[snd] = createAudioSource(audioBuffer)
  if (useRng) {
    players[snd].playbackRate.value = rngPlayRate()
  }

  try {
    players[snd].start()
  } catch (err) {
    // no-op
  }
}
