import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

const core = new WebRenderer()
const audiocontext = new AudioContext()

const chipblaster = {
  freq: 0,
  drum: [] as number[],
}

function rendersq(key: string, freq: any) {
  // round & mul for the nice classic sound
  return el.round({ key }, el.mul(el.square(freq), 16))
}

function renderblaster() {
  const voices: any[] = []

  if (chipblaster.freq !== 0) {
    const sq = rendersq('sound', chipblaster.freq)
    voices.push(sq, sq)
  } else if (chipblaster.drum.length > 0) {
    const sq = rendersq(
      `drums`,
      el.sparseq(
        {
          seq: chipblaster.drum.map((value, tickTime) => ({
            value,
            tickTime,
          })),
        },
        el.train(500),
        0,
      ),
    )
    voices.push(sq, sq)
  }

  core.render(...voices).catch((e) => console.error(e))
}

export function playchipfreq(freq: number) {
  chipblaster.freq = freq
  chipblaster.drum = []
  renderblaster()
}

export function playchipdrum(drum: number[]) {
  chipblaster.freq = 0
  chipblaster.drum = drum.slice()
  renderblaster()
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
