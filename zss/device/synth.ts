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

// config drums

const drumtick = new Tone.PolySynth().toDestination()
drumtick.maxPolyphony = 8
drumtick.set({
  envelope: {
    attack: 0.001,
    decay: 0.001,
    release: 0.001,
    sustain: 0.001,
  },
  oscillator: {
    type: 'square',
  },
})

const drumbass = new Tone.MembraneSynth().toDestination()

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
  if (isnumber(note)) {
    // const timeseconds = Tone.Time(time).toSeconds()
    switch (note) {
      case 0: {
        // DRUM_TICK
        drumtick.triggerAttackRelease('C6', '1i', time)
        break
      }
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
        drumbass.triggerAttackRelease('C2', '8n', time)
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
