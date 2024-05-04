import { ElemNode, el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'
import { MAYBE } from 'zss/mapping/types'

import { nm } from './logic'

let coreisready = false
const core = new WebRenderer()
core.on('load', () => {
  coreisready = true
})

const audiocontext = new AudioContext()

const chipblaster = {
  freq: 0,
  type: 0,
  drum: '',
}

function rendervoice(key: string, type: number, freq: ElemNode): ElemNode {
  let node: MAYBE<ElemNode> = undefined

  switch (type % 3) {
    default:
      node = el.square(nm(key, 'voice'), freq)
      break
    case 1:
      node = el.saw(nm(key, 'voice'), freq)
      break
    case 2:
      node = el.triangle(nm(key, 'voice'), freq)
      break
  }

  return node
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
      rendervoice(nm(doot, 'voice').key, chipblaster.type, chipblaster.freq),
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
        rendervoice(
          nm(name, 'voice').key,
          chipblaster.type,
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
  const out = el.add(...voices)
  const dcblockout = el.dcblock(out)
  const gainout = el.mul(dcblockout, 2)
  core.render(gainout, gainout).catch((e) => console.error(e))
}

export function onblasterready(fn: () => void) {
  if (coreisready) {
    fn()
  } else {
    core.on('load', fn)
  }
}

export function playchipfreq(type: number, freq: number) {
  chipblaster.type = type
  chipblaster.freq = freq
  chipblaster.drum = ''
  renderblaster()
}

export function loadchipdrum(i: number, drum: number[]) {
  drumvalues[drumname(i)] = [...drum, 0]
}

export function playchipdrum(type: number, drum: number) {
  chipblaster.type = type
  chipblaster.freq = 0
  chipblaster.drum = drumname(drum)
  renderblaster()
}

export function playchipstop() {
  chipblaster.freq = 0
  chipblaster.drum = ''
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

  core.on('load', () => playchipfreq(0, 0))
}
