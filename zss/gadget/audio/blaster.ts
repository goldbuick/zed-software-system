import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'

let coreisready = false
const core = new WebRenderer()
core.on('load', () => {
  coreisready = true
})

const audiocontext = new AudioContext()

const chipblaster = {
  freq: 0,
  drum: '',
}

function rendersq(key: string, freq: any) {
  // round & mul for the nice classic sound
  return el.mul(el.square(freq), 0.1)
}

function drumname(i: number) {
  return `drum${i}`
}

const drumvalues: Record<string, number[]> = {}

function renderblaster() {
  const voices: any[] = []

  // add doot
  voices.push(
    el.mul(el.ge(chipblaster.freq, 0), rendersq('doot', chipblaster.freq)),
  )

  // add drums
  const drums = Object.keys(drumvalues)
  voices.push(
    ...drums.map((name) => {
      const active = name === chipblaster.drum
      return el.mul(
        1, // active ? 1 : 0,
        rendersq(
          name,
          el.seq2(
            { seq: drumvalues[name], offset: 0 },
            el.train(500),
            active ? 1 : 0,
          ),
        ),
      )
    }),
  )

  // render output
  const out = el.add(...voices)
  core.render(out, out).catch((e) => console.error(e))
}

export function onblasterready(fn: () => void) {
  if (coreisready) {
    fn()
  } else {
    core.on('load', fn)
  }
}

export function playchipfreq(freq: number) {
  chipblaster.freq = freq
  chipblaster.drum = ''
  renderblaster()
}

export function loadchipdrum(i: number, drum: number[]) {
  drumvalues[drumname(i)] = [...drum, 0]
}

export function playchipdrum(drum: number) {
  chipblaster.freq = 0
  chipblaster.drum = drumname(drum)
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

  core.on('load', () => playchipfreq(0))
}
