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
      sustain: 0.1,
      release: 0.1,
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

// drumtick

const drumtick = new Tone.PolySynth().toDestination()
drumtick.maxPolyphony = 8
drumtick.set({
  envelope: {
    attack: 0.001,
    decay: 0.001,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'square',
  },
})

function drumticktrigger(time: number) {
  drumtick.triggerAttackRelease('C6', '1i', time)
}

// drumtweet

const drumtweet = new Tone.Synth().toDestination()
drumtick.set({
  envelope: {
    attack: 0.001,
    decay: 0.001,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'square',
  },
})

function drumtweettrigger(time: number) {
  const ramp = Tone.Time('64n').toSeconds()
  drumtweet.triggerAttackRelease('C6', '8n', time)
  drumtweet.frequency.exponentialRampToValueAtTime('C11', ramp + time)
}

// drumcowbell

const drumcowbellfilter = new Tone.Filter(350, 'bandpass').toDestination()

const drumcowbellgain = new Tone.Gain().connect(drumcowbellfilter)
drumcowbellgain.gain.value = 0

const drumcowbell = new Tone.PolySynth().connect(drumcowbellgain)
drumcowbell.maxPolyphony = 8
drumcowbell.set({
  envelope: {
    attack: 0.001,
    decay: 0.01,
    sustain: 0.1,
    release: 0.1,
  },
  oscillator: {
    type: 'square',
  },
})

function drumcowbelltrigger(duration: string, time: number) {
  const ramp = Tone.Time('64n').toSeconds() + Tone.Time(duration).toSeconds()
  drumcowbellgain.gain.setValueAtTime(0.5, time)
  drumcowbellgain.gain.exponentialRampToValueAtTime(0.01, ramp + time)
  drumcowbell.triggerAttackRelease([800, 540], duration, time)
}

// drumclap

const drumclapeq = new Tone.EQ3(-10, 10, -1).toDestination()

const drumclapfilter = new Tone.Filter(800, 'highpass', -12)
drumclapfilter.connect(drumclapeq)

const drumclap = new Tone.NoiseSynth()
drumclap.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.1,
    release: 0.1,
  },
})
drumclap.connect(drumclapfilter)

function drumclaptrigger(duration: string, time: number) {
  drumclap.triggerAttackRelease(duration, time)
}

// drumhisnare

function drumhisnaretrigger(duration: string, time: number) {
  //
}

// drumhiwoodblock

function drumhiwoodblocktrigger(duration: string, time: number) {
  //
}

// drumlowsnare

function drumlowsnaretrigger(duration: string, time: number) {
  //
}

// drumlowtom

// const drumlowtomeq = new Tone.EQ3(-3, 10, -3).toDestination()

const drumlowtomoscgain = new Tone.Gain().toDestination()

const drumlowtomosc = new Tone.PolySynth()
drumlowtomosc.maxPolyphony = 8
drumlowtomosc.set({
  envelope: {
    attack: 0.001,
    decay: 1,
    sustain: 0.01,
    release: 0.01,
  },
  oscillator: {
    type: 'triangle',
  },
})
drumlowtomosc.connect(drumlowtomoscgain)

const drumlowtomnoisefiltergain = new Tone.Gain().toDestination()

const drumlowtomnoisefilter = new Tone.Filter(1000, 'highpass')
drumlowtomnoisefilter.connect(drumlowtomnoisefiltergain)

const drumlowtomnoise = new Tone.NoiseSynth()
drumlowtomnoise.connect(drumlowtomnoisefilter)

function drumlowtomtrigger(time: number) {
  drumlowtomnoise.triggerAttack(time)

  // const duration = Tone.Time('8n').toSeconds()
  // drumlowtomnoisefilter.frequency.setValueAtTime(10000, time)
  // drumlowtomnoisefilter.frequency.exponentialRampToValueAtTime(
  //   10000,
  //   time + duration,
  // )
  // drumlowtomnoisefiltergain.gain.setValueAtTime(1, time)
  // drumlowtomnoisefiltergain.gain.exponentialRampToValueAtTime(
  //   0.1,
  //   time + duration,
  // )
}

// drumlowwoodblock

function drumlowwoodblocktrigger(duration: string, time: number) {
  //
}

// drumbass

const drumbass = new Tone.MembraneSynth().toDestination()

function drumbasstrigger(time: number) {
  drumbass.triggerAttackRelease('C2', '8n', time)
}

// synth setup

// function drumbasstrigger(time: number, value: SYNTH_NOTE_ON) {

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
    switch (note) {
      case 0: // DRUM_TICK
        drumticktrigger(time)
        break
      case 1: // DRUM_TWEET
        drumtweettrigger(time)
        break
      case 2: // DRUM_COWBELL
        drumcowbelltrigger(duration, time)
        break
      case 3: // DRUM_CLAP
        drumclaptrigger(duration, time)
        break
      case 4: // DRUM_HI_SNARE
        drumhisnaretrigger(duration, time)
        break
      case 5: // DRUM_HI_WOODBLOCK
        drumhiwoodblocktrigger(duration, time)
        break
      case 6: // DRUM_LOW_SNARE
        drumlowsnaretrigger(duration, time)
        break
      case 7: // DRUM_LOW_TOM
        drumlowtomtrigger(time)
        break
      case 8: // DRUM_LOW_WOODBLOCK
        drumlowwoodblocktrigger(duration, time)
        break
      case 9: // DRUM_BASS
        drumbasstrigger(time)
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
