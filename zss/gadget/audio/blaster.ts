import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

const core = new WebRenderer()
const audiocontext = new AudioContext()

export function playchipfreq(freq: number) {
  if (freq) {
    // round & mul for the nice classic sound
    const sq = el.round(el.mul(el.square(freq), 32))
    core.render(sq, sq).catch((e) => console.error(e))
  } else {
    core.render().catch((e) => console.error(e))
  }
}

export async function initaudio() {
  if (audiocontext.state === 'suspended') {
    await audiocontext.resume()
  }
  const node = await core.initialize(audiocontext, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })
  node.connect(audiocontext.destination)
}