import { ElemNode, el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'
import { PCSPEAKER_BPM } from 'zss/device/pcspeaker'
import { MAYBE } from 'zss/mapping/types'

import { fxecho, fxreverb, nm } from './logic'
import REVERB1 from './matrix-reverb.wav?arraybuffer'
import REVERB2 from './zoot.wav?arraybuffer'

let coreisready = false
const core = new WebRenderer()

async function loadsamples() {
  await core.updateVirtualFileSystem({
    reverb1: (await audiocontext.decodeAudioData(REVERB1)).getChannelData(0),
    reverb2: (await audiocontext.decodeAudioData(REVERB2)).getChannelData(0),
  })

  // start
  playchipfreq(0)
}

core.on('load', function () {
  coreisready = true
  void loadsamples()
})

const audiocontext = new AudioContext()

const chipblaster = {
  type: 0,
  freq: 0,
  room: 0,
  drum: '',
  loop: false,
}

function rendervoice(name: string, type: number, freq: ElemNode): ElemNode {
  let node: MAYBE<ElemNode> = undefined

  switch (type % 3) {
    default:
      node = el.square(nm(name, 'voice'), freq)
      break
    case 1:
      node = el.saw(nm(name, 'voice'), freq)
      break
    case 2:
      node = el.triangle(nm(name, 'voice'), freq)
      break
  }

  return el.mul(nm(name, 'mul'), 0.85, node)
}

function drumname(i: number) {
  return nm('drum', `${i}`).key
}

const drumvalues: Record<string, number[]> = {}

function renderblaster() {
  const drums = Object.keys(drumvalues)
  if (!drums.length) {
    return
  }

  // set of voices to mix
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
              loop: chipblaster.loop,
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
  let out = el.add(...voices)

  // add room fx
  const fxname1 = nm('room', `${chipblaster.room}:1`).key
  const fxname2 = nm('room', `${chipblaster.room}:2`).key
  switch (chipblaster.room) {
    case 0:
      // no-op
      break
    // echo
    case 1:
      out = fxecho(fxname1, out, 0.2, PCSPEAKER_BPM * 1000)
      break
    case 2:
      out = fxecho(fxname1, out, 0.35, PCSPEAKER_BPM * 1000 * 4)
      break
    case 3:
      out = fxecho(fxname1, out, 0.5, PCSPEAKER_BPM * 1000 * 8)
      break
    // reverb
    case 4:
      out = fxreverb(fxname1, out, 0.2, 'reverb1')
      break
    case 5:
      out = fxreverb(fxname1, out, 0.35, 'reverb1')
      break
    case 6:
      out = fxreverb(fxname1, out, 0.5, 'reverb1')
      break
    // both
    case 7:
      out = fxreverb(
        fxname2,
        fxecho(fxname1, out, 0.2, PCSPEAKER_BPM * 1000),
        0.4,
        'reverb2',
      )
      break
    case 8:
      out = fxreverb(
        fxname2,
        fxecho(fxname1, out, 0.35, PCSPEAKER_BPM * 1000 * 4),
        0.4,
        'reverb2',
      )
      break
    case 9:
      out = fxreverb(
        fxname2,
        fxecho(fxname1, out, 0.5, PCSPEAKER_BPM * 1000 * 8),
        0.4,
        'reverb2',
      )
      break
  }

  // cleanup
  out = el.dcblock(out)

  // done
  core.render(out, out).catch((e) => console.error(e))
}

export function onblasterready(fn: () => void) {
  if (coreisready) {
    fn()
  } else {
    core.on('load', fn)
  }
}

export function loadchipdrum(i: number, drum: number[]) {
  drumvalues[drumname(i)] = [...drum, 0]
}

export function playchipfreq(freq: number) {
  chipblaster.freq = freq
  chipblaster.drum = ''
  renderblaster()
}

export function playchipdrum(drum: number) {
  chipblaster.freq = 0
  chipblaster.drum = drumname(drum)
  renderblaster()
}

export function playchiptype(type: number) {
  chipblaster.type = type
}

export function playchiproom(room: number) {
  chipblaster.room = room
}

export function playchiploop(loop: boolean) {
  chipblaster.loop = loop
}

export function playchipstop() {
  chipblaster.freq = 0
  chipblaster.drum = ''
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
