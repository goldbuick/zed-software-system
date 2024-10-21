import * as Tone from 'tone'
import { createdevice } from 'zss/device'
import {
  invokeplay,
  parseplay,
  SYNTH_INVOKES,
  SYNTH_NOTE_ON,
} from 'zss/mapping/play'
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
  // for play
  createsynth(),
  // + 8track synths
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  createsynth(),
  // for sfx
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

const drumhisnaredistortion = new Tone.Distortion().toDestination()
drumhisnaredistortion.set({
  distortion: 0.666,
})

const drumhisnareosc = new Tone.Synth()
drumhisnareosc.set({
  envelope: {
    attack: 0,
    decay: 0.1,
    sustain: 0,
    release: 1,
  },
  oscillator: {
    type: 'triangle',
  },
})
drumhisnareosc.connect(drumhisnaredistortion)

const drumhisnarefilter = new Tone.Filter()
drumhisnarefilter.set({
  type: 'highpass',
  frequency: 10000,
})
drumhisnarefilter.connect(drumhisnaredistortion)

const drumhisnarenoise = new Tone.NoiseSynth()
drumhisnarenoise.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
})
drumhisnarenoise.connect(drumhisnarefilter)

function drumhisnaretrigger(duration: string, time: number) {
  const ramp = Tone.Time('512n').toSeconds()
  const ramp2 = Tone.Time('32n').toSeconds()

  drumhisnareosc.triggerAttackRelease(10000, duration, time, 1)
  drumhisnareosc.frequency.exponentialRampToValueAtTime(300, time + ramp)
  drumhisnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

  drumhisnarenoise.triggerAttackRelease('8n', time, 0.333)
  drumhisnarenoise.volume.setValueAtTime(1, time)
  drumhisnarenoise.volume.exponentialRampToValueAtTime(
    0,
    time + Tone.Time('32n').toSeconds(),
  )
}

// drumhiwoodblock

const drumhiwoodblockfilter = new Tone.Filter()
drumhiwoodblockfilter.set({
  type: 'bandpass',
  frequency: 256,
  Q: 0.17,
})
drumhiwoodblockfilter.toDestination()

const drumhiwoodblockclack = new Tone.Synth()
drumhiwoodblockclack.set({
  envelope: {
    attack: 0.001,
    decay: 0.001,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'sawtooth',
  },
})
drumhiwoodblockclack.connect(drumhiwoodblockfilter)

const drumhiwoodblockdonk = new Tone.Synth()
drumhiwoodblockdonk.set({
  envelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'sine',
  },
})
drumhiwoodblockdonk.connect(drumhiwoodblockfilter)

function drumhiwoodblocktrigger(duration: string, time: number) {
  drumhiwoodblockclack.triggerAttackRelease(2000, duration, time)
  drumhiwoodblockclack.frequency.exponentialRampToValueAtTime(
    1000,
    time + Tone.Time('32n').toSeconds(),
  )
  drumhiwoodblockdonk.triggerAttackRelease(999, duration, time)
  drumhiwoodblockdonk.frequency.exponentialRampToValueAtTime(
    888,
    time + Tone.Time('256n').toSeconds(),
  )
}

// drumlowsnare

const drumlowsnaredistortion = new Tone.Distortion().toDestination()
drumlowsnaredistortion.set({
  distortion: 0.876,
})

const drumlowsnareosc = new Tone.Synth()
drumlowsnareosc.set({
  envelope: {
    attack: 0,
    decay: 0.1,
    sustain: 0,
    release: 1,
  },
  oscillator: {
    type: 'triangle',
  },
})
drumlowsnareosc.connect(drumlowsnaredistortion)

const drumlowsnarefilter = new Tone.Filter()
drumlowsnarefilter.set({
  type: 'highpass',
  frequency: 10000,
})
drumlowsnarefilter.connect(drumlowsnaredistortion)

const drumlowsnarenoise = new Tone.NoiseSynth()
drumlowsnarenoise.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
})
drumlowsnarenoise.connect(drumlowsnarefilter)

function drumlowsnaretrigger(duration: string, time: number) {
  const ramp = Tone.Time('512n').toSeconds()
  const ramp2 = Tone.Time('32n').toSeconds()

  drumlowsnareosc.triggerAttackRelease(10000, duration, time, 1)
  drumlowsnareosc.frequency.exponentialRampToValueAtTime(150, time + ramp)
  drumlowsnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

  drumlowsnarenoise.triggerAttackRelease('8n', time, 0.25)
  drumlowsnarenoise.volume.setValueAtTime(1, time)
  drumlowsnarenoise.volume.exponentialRampToValueAtTime(
    0,
    time + Tone.Time('32n').toSeconds(),
  )
}

// drumlowtom

const drumlowtomosc = new Tone.Synth().toDestination()
drumlowtomosc.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'sawtooth',
  },
})

const drumlowtomosc2 = new Tone.Synth().toDestination()
drumlowtomosc.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'triangle',
  },
})

const drumlowtomnoise = new Tone.NoiseSynth().toDestination()
drumlowtomnoise.set({
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
})

function drumlowtomtrigger(duration: string, time: number) {
  const margin = Tone.Time('256n').toSeconds()
  const ramp = Tone.Time(duration).toSeconds() - margin

  drumlowtomosc.triggerAttackRelease('C4', ramp, time, 1)
  drumlowtomosc.frequency.exponentialRampToValueAtTime(
    Tone.Frequency('C0').toFrequency(),
    time + ramp,
  )

  drumlowtomosc2.triggerAttackRelease('C5', ramp, time, 0.5)
  drumlowtomosc2.frequency.exponentialRampToValueAtTime(
    Tone.Frequency('C0').toFrequency(),
    time + ramp,
  )

  const ramp2 = Tone.Time('4n').toSeconds()
  drumlowtomnoise.triggerAttackRelease('8n', time)
  drumlowtomnoise.volume.setValueAtTime(1, time)
  drumlowtomnoise.volume.exponentialRampToValueAtTime(0, time + ramp2)
}

// drumlowwoodblock

const drumlowwoodblockfilter = new Tone.Filter()
drumlowwoodblockfilter.set({
  type: 'bandpass',
  frequency: 256,
  Q: 0.17,
})
drumlowwoodblockfilter.toDestination()

const drumlowwoodblockclack = new Tone.Synth()
drumlowwoodblockclack.set({
  envelope: {
    attack: 0.001,
    decay: 0.001,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'sawtooth',
  },
})
drumlowwoodblockclack.connect(drumlowwoodblockfilter)

const drumlowwoodblockdonk = new Tone.Synth()
drumlowwoodblockdonk.set({
  envelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.001,
    release: 0.1,
  },
  oscillator: {
    type: 'sine',
  },
})
drumlowwoodblockdonk.connect(drumlowwoodblockfilter)

function drumlowwoodblocktrigger(duration: string, time: number) {
  drumlowwoodblockclack.triggerAttackRelease(2000, duration, time)
  drumlowwoodblockclack.frequency.exponentialRampToValueAtTime(
    100,
    time + Tone.Time('32n').toSeconds(),
  )
  drumlowwoodblockdonk.triggerAttackRelease(699, duration, time)
  drumlowwoodblockdonk.frequency.exponentialRampToValueAtTime(
    399,
    time + Tone.Time('256n').toSeconds(),
  )
}

// drumbass

const drumbass = new Tone.MembraneSynth().toDestination()

function drumbasstrigger(time: number) {
  drumbass.triggerAttackRelease('C2', '8n', time)
}

// synth setup

let enabled = false
let enableaudiochecking = false
export async function enableaudio() {
  if (enabled || enableaudiochecking) {
    return
  }
  enableaudiochecking = true
  try {
    await Tone.start()
    const transport = Tone.getTransport()
    transport.bpm.value = 69
    transport.start()
    enabled = true
  } catch (err) {
    //
  }
  enableaudiochecking = false
}

function synthtick(time: number, value: SYNTH_NOTE_ON | null) {
  if (value === null) {
    return
  }
  const [chan, duration, note] = value
  if (isstring(note) && ispresent(SYNTH[chan])) {
    SYNTH[chan].triggerAttackRelease(note, duration, time)
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
        drumlowtomtrigger(duration, time)
        break
      case 8: // DRUM_LOW_WOODBLOCK
        drumlowwoodblocktrigger(duration, time)
        break
      case 9: // DRUM_BASS
        drumbasstrigger(time)
        break
      case -1: // END OF PATTERN
        synth.emit('synth:endofpattern', duration)
        break
    }
  }
}

function synthplaystart(
  invokes: SYNTH_INVOKES,
  time: number | string,
  markendofpattern = false,
) {
  // scan for longest invoke
  let longest = 0
  let longestindex = 0
  if (markendofpattern) {
    for (let i = 0; i < invokes.length; ++i) {
      const count = invokes[i].length
      if (invokes[i].length > longest) {
        longest = count
        longestindex = i
      }
    }
  }
  // invoke synth ops
  for (let i = 0; i < invokes.length; ++i) {
    const pattern = invokeplay(i, invokes[i])
    if (i !== longestindex || !markendofpattern) {
      // only longest pattern keeps end of pattern entry
      pattern.pop()
    }
    if (pattern.length > 0) {
      new Tone.Part(synthtick, pattern).start(time)
    }
  }
}

let synthsmusicplaying = false
const synthsmusicqueue: SYNTH_INVOKES[] = []
let synthsfxpriority = -1

function synthplay(priority: number, buffer: string, time: number | string) {
  const invokes = parseplay(buffer)

  // music queue
  if (priority < 0) {
    if (synthsmusicplaying || synthsmusicqueue.length) {
      // add to music queue
      synthsmusicqueue.push(invokes)
    } else {
      // start music
      synthsmusicplaying = true
      synthplaystart(invokes, time, true)
    }
    return
  }

  // sfx /w priority
  if (synthsfxpriority === -1 || priority >= synthsfxpriority) {
    // invoke
    synthsfxpriority = priority
    synthplaystart(invokes, time)
  }
}

const synth = createdevice('synth', ['second'], (message) => {
  switch (message.target) {
    case 'play':
      if (isarray(message.data)) {
        const [priority, buffer] = message.data as [number, string]
        synthplay(priority, buffer, 0)
      }
      break
    case 'endofpattern':
      // mark as done
      synthsmusicplaying = false
      // check music queue
      if (isstring(message.data) && synthsmusicqueue.length) {
        const invokes = synthsmusicqueue.shift()
        if (ispresent(invokes)) {
          // continue music
          synthsmusicplaying = true
          synthplaystart(
            invokes,
            // shaving ?
            Tone.Time(message.data).toSeconds() - 0.03,
            true,
          )
        }
      }
      break
    // add messages for synth & fx config
  }
})
