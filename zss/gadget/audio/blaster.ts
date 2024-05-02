import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

const core = new WebRenderer()
const audiocontext = new AudioContext()

export function playchipfreq(freq: number) {
  if (freq) {
    const doot = el.blepsquare({ key: 'pcspeaker' }, freq)
    void core.render(doot, doot)
  }

  console.info(freq)
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

  await core.render()
}
