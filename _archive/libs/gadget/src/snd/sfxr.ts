import { SoundEffect } from 'jsfxr'

import { getAudioSfxOutput, getAudioContext, playAudioBuffer } from './context'

const sfxCache: Record<string, AudioBuffer> = {}

export default function playSfxr(data: string) {
  const audioContext = getAudioContext()
  const audioOutput = getAudioSfxOutput()
  if (!audioContext || !audioOutput) {
    return
  }

  if (!sfxCache[data]) {
    const sfx = new SoundEffect(data)
    sfx.sampleRate = 11025
    const rawBuffer = sfx.getRawBuffer()['normalized']
    sfxCache[data] = audioContext.createBuffer(
      1,
      rawBuffer.length,
      sfx.sampleRate,
    )
    const fillBuffer = sfxCache[data].getChannelData(0)
    for (let i = 0; i < rawBuffer.length; ++i) {
      fillBuffer[i] = rawBuffer[i]
    }
  }

  playAudioBuffer(data, sfxCache[data], true)
}
