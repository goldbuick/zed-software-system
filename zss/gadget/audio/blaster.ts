import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

const core = new WebRenderer()

export function playchipfreq(freq: number) {
  if (freq) {
    void core.render(el.blepsquare(freq))
  } else {
    void core.render()
  }
}

export async function initaudio() {
  const audiocontext = new AudioContext()

  const node = await core.initialize(audiocontext, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })

  node.connect(audiocontext.destination)

  // await core.render(el.cycle(440))
}
