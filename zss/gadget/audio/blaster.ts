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

function nm(key: string, alt: string): { key: string } {
  return { key: `${key}:${alt}` }
}

function cl(key: string, input: any) {
  return el.max(nm(key, 'max'), 0, el.min(nm(key, 'min'), 1, input))
}

function rendersq(key: string, freq: any) {
  // round & mul for the nice classic sound
  const sq = el.square(nm(key, 'sq'), freq)
  const ssq = el.mul(nm(key, 'sqm'), sq, 32)
  const cssq = cl(nm(key, 'cl').key, ssq)
  return cssq
}

function drumname(i: number) {
  return nm('drum', `${i}`).key
}

const drumvalues: Record<string, number[]> = {}

function renderblaster() {
  const voices: any[] = []

  // add doot
  const doot = 'doot'
  voices.push(
    el.mul(
      nm(doot, 'mul'),
      el.ge(chipblaster.freq, 0),
      rendersq(nm(doot, 'voice').key, chipblaster.freq),
    ),
  )

  // add drums
  const drums = Object.keys(drumvalues)
  voices.push(
    ...drums.map((name) => {
      const active = name === chipblaster.drum ? 1 : 0
      return el.mul(
        nm(name, 'mul'),
        el.const({ ...nm(name, 'gate'), value: active }),
        rendersq(
          nm(name, 'voice').key,
          el.seq2(
            {
              ...nm(name, 'seq'),
              loop: false,
              seq: drumvalues[name],
            },
            el.train(1000),
            el.const({ ...nm(name, 'reset'), value: active }),
          ),
        ),
      )
    }),
  )

  // render output
  const out = el.mul(
    nm('mixer', 'gate'),
    0.5,
    el.add(nm('mixer', 'add'), ...voices),
  )
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
