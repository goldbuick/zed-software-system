import * as Tone from 'tone'
import { createdevice } from 'zss/device'
import { invokeplay, parseplay, SYNTH_NOTE_ON } from 'zss/mapping/play'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

function createsynth() {
  const synth = new Tone.PolySynth().toDestination()
  synth.maxPolyphony = 8
  synth.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      release: 0.1,
      sustain: 0.1,
    },
    oscillator: {
      type: 'square',
    },
  })
  return synth
}

const SYNTH = [
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
]

const DRUMS = {
  // DRUM_TICK
  [0]: new Tone.Oscillator().toDestination(),
  // DRUM_TWEET
  [1]: 0,
  // DRUM_COWBELL
  [2]: 0,
  // DRUM_CLAP
  [3]: 0,
  // DRUM_HI_SNARE
  [4]: 0,
  // DRUM_HI_WOODBLOCK
  [5]: 0,
  // DRUM_LOW_TOM
  [6]: 0,
  // DRUM_LOW_SNARE
  [7]: 0,
  // DRUM_LOW_WOODBLOCK
  [8]: 0,
  // DRUM_BASS
  [9]: new Tone.MembraneSynth().toDestination(),
}

// config drums
const HHF = 40
const HHF_PARTIALS = [2, 3, 4.16, 5.43, 6.79, 8.21]

DRUMS[0].set({
  type: 'square',
  partials: HHF_PARTIALS.map((item) => item * HHF),
})

let enabled = false
export async function enableaudio() {
  if (enabled) {
    return
  }
  try {
    await Tone.start()
    const transport = Tone.getTransport()
    transport.bpm.value = 69
    transport.start()
    enabled = true
  } catch (err) {
    //
  }
}

function synthtick(time: number, value: SYNTH_NOTE_ON | null) {
  if (value === null) {
    return
  }
  const [synth, duration, note] = value
  if (isstring(note) && ispresent(SYNTH[synth])) {
    SYNTH[synth].triggerAttackRelease(note, duration, time)
  }
  if (isnumber(note) && DRUMS[note as keyof typeof DRUMS]) {
    switch (note) {
      case 0: // DRUM_TICK
        DRUMS[0].start(time)
        DRUMS[0].stop('+256n')
        break
      case 1: // DRUM_TWEET
        break
      case 2: // DRUM_COWBELL
        break
      case 3: // DRUM_CLAP
        break
      case 4: // DRUM_HI_SNARE
        break
      case 5: // DRUM_HI_WOODBLOCK
        break
      case 6: // DRUM_LOW_TOM
        break
      case 7: // DRUM_LOW_SNARE
        break
      case 8: // DRUM_LOW_WOODBLOCK
        break
      case 9: // DRUM_BASS
        DRUMS[9].triggerAttackRelease('C2', '8n', time)
        break
    }
  }
}

function synthplay(priority: number, buffer: string) {
  // TODO: manage which synth gets notes
  // make interrupting #bgplay work
  // make empty play stop sounds

  const invokes = parseplay(buffer)
  for (let i = 0; i < invokes.length; ++i) {
    const pattern = invokeplay(i, invokes[i])
    if (pattern.length > 0) {
      new Tone.Part(synthtick, pattern).start('0')
    }
  }
}

createdevice('synth', ['second'], (message) => {
  switch (message.target) {
    case 'play':
      if (isarray(message.data)) {
        const [priority, buffer] = message.data as [number, string]
        synthplay(priority, buffer)
      }
      break
    // add messages for synth & fx config
  }
})
