import * as Tone from 'tone'
import { createdevice } from 'zss/device'
import {
  invokeplay,
  parseplay,
  SYNTH_INVOKES,
  SYNTH_NOTE_ON,
} from 'zss/mapping/play'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

import { tape_info } from './api'

// synth setup

let enabled = false
export function enableaudio() {
  if (enabled) {
    return
  }
  Tone.start()
    .then(() => {
      if (!enabled) {
        const transport = Tone.getTransport()
        transport.bpm.value = 107
        transport.start()
        tape_info('synth', 'audio is enabled!')
        enabled = true
      }
    })
    .catch(() => {})
}

function createsynthplay() {
  const maincompressor = new Tone.Compressor({
    threshold: -20,
    ratio: 12,
    attack: 0,
    release: 0.3,
  })
  maincompressor.toDestination()

  // const reverb = new Tone.Reverb()
  // reverb.set({
  //   wet: 0.125,
  // })
  // reverb.connect(maincompressor)

  // const echo = new Tone.FeedbackDelay()
  // echo.set({
  //   wet: 0.125,
  //   delayTime: '4n.',
  //   maxDelay: '1n',
  //   feedback: 0.371,
  // })
  // echo.connect(reverb)

  // const chorus = new Tone.Chorus()
  // chorus.set({
  //   wet: 0.5,
  //   depth: 0.999,
  //   frequency: 7,
  //   feedback: 0.666,
  // })
  // chorus.connect(maincompressor)

  // const phaser = new Tone.Phaser()
  // phaser.set({
  //   wet: 0.5,
  //   // frequency: 7,
  //   // octaves: 3,
  //   // stages: 10,
  //   Q: 10,
  //   // baseFrequency: 250,
  // })
  // phaser.connect(maincompressor)

  // const distortion = new Tone.Distortion()
  // distortion.set({
  //   wet: 0.25 * 0.25,
  //   distortion: 0.9,
  // })
  // distortion.connect(phaser)

  // const vibrato = new Tone.Vibrato()
  // vibrato.set({
  //   wet: 0.5 * 0,
  //   depth: 0.2,
  // })
  // vibrato.connect(distortion)

  const maingain = new Tone.Gain()
  maingain.connect(maincompressor)

  const drumgain = new Tone.Gain()
  drumgain.connect(maincompressor)

  function createsynth() {
    const synth = new Tone.PolySynth()
    synth.maxPolyphony = 8
    synth.set({
      envelope: {
        attack: 0.01,
        decay: 0.01,
        sustain: 0.5,
        release: 0.01,
      },
      oscillator: {
        // type: 'pulse',
        // width: -0.5,
        // type: 'sine',
        // type: 'square',
        // type: 'triangle',
        // type: 'sawtooth',
        // type: 'fmsine',
        // type: 'fmsquare',
        // type: 'fmtriangle',
        // type: 'fmsawtooth',
        // type: 'amsine',
        // type: 'amsquare',
        // type: 'amtriangle',
        // type: 'amsawtooth',
        // type: 'fatsquare',
        // type: 'fattriangle',
        // type: 'fatsawtooth',
        // type: 'sine14',
        type: 'square14',
        // type: 'triangle14',
        // type: 'sawtooth14',
        // type: 'fmsine14',
        // type: 'fmsquare14',
        // type: 'fmtriangle14',
        // type: 'fmsawtooth14',
        // type: 'amsine14',
        // type: 'amsquare14',
        // type: 'amtriangle14',
        // type: 'amsawtooth14',
        // type: 'custom',
        // harmonicity: 6,
        // partials: [0.75, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15],
        // partials: [
        //   0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15,
        //   0.15, 0.15, 0.15, 0.15, 0.15,
        // ],
      },
    })
    synth.connect(maingain)
    // #play cxcxcxcxcxcxcxcxcxcxcxcxcxcxcx;--pxcxpxcxpxcxpxcxpxcxpxcxpxcx;q9999;i10011001100199
    // #play cxcxcxcxcxcxcx+cxcxcxcxcxcxcxcx;--pxcxpxcxpxcxppcxpxcxpxcxpxcx;q9999;i14011401140199
    // #play cecxcxcxcxcxcx+cecxcecxcecxcxcxf+c+c;--pxcxpxcxpxcxppcxpxcxpxcxpxcx;q9999;i14011401100199
    // #play pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx;q949494949
    // #play fxfxfxfxxxxxcxcxcxcx+xxxx fxfxfxfxxxxxcxcxcxcx;pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx;q949494949
    // #play -fxfxfxfxxxxxcxcxcxcx+xxxx fxfxfxfxxxxxcxcxcxcx;pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx pxpxpxxxxxpxxxxx;q949494949
    return synth
  }

  const SYNTH = [
    // for play
    createsynth(),
    // for sfx
    createsynth(),
    // + 8track synths
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

  const drumtick = new Tone.PolySynth().connect(drumgain)
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

  const drumtweet = new Tone.Synth().connect(drumgain)
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

  const drumcowbellfilter = new Tone.Filter(350, 'bandpass').connect(drumgain)

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

  const drumclapeq = new Tone.EQ3(-10, 10, -1).connect(drumgain)

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

  const drumhisnaredistortion = new Tone.Distortion().connect(drumgain)
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
      sustain: 0,
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
  drumhiwoodblockfilter.connect(drumgain)

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

  const drumlowsnaredistortion = new Tone.Distortion().connect(drumgain)
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

  const drumlowtomosc = new Tone.Synth().connect(drumgain)
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

  const drumlowtomosc2 = new Tone.Synth().connect(drumgain)
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

  const drumlowtomnoise = new Tone.NoiseSynth().connect(drumgain)
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
  drumlowwoodblockfilter.connect(drumgain)

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

  const drumbass = new Tone.MembraneSynth().connect(drumgain)
  drumbass.set({
    octaves: 8,
  })

  function drumbasstrigger(time: number) {
    drumbass.triggerAttackRelease('C1', '8n', time)
  }

  // @ts-expect-error dont care enough right now
  const pacer = new Tone.Part(synthtick)

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
          --pacercount
          if (pacercount === 0) {
            pacertime = -1
          }
          break
      }
    }
  }

  let pacertime = -1
  let pacercount = 0

  function synthplaystart(invokes: SYNTH_INVOKES) {
    // invoke synth ops
    const starttime = pacertime
    for (let i = 0; i < invokes.length; ++i) {
      // inc invoke tracker
      ++pacercount

      // build tone.js pattern
      const pattern = invokeplay(0, starttime, invokes[i])

      // track current max pacertime
      const last = pattern[pattern.length - 1]
      if (ispresent(last)) {
        pacertime = Math.max(pacertime, last[0])
      }

      // write pattern to pacer
      for (let p = 0; p < pattern.length; ++p) {
        const [time, value] = pattern[p]
        pacer.add(time, value)
      }
    }
  }

  let synthsfxpriority = -1
  function synthplay(priority: number, buffer: string) {
    // parse ops
    const invokes = parseplay(buffer)

    // reset note offset
    if (pacertime === -1) {
      pacertime = Tone.getTransport().seconds
    }

    // music queue
    if (priority < 0) {
      synthplaystart(invokes)
      return
    }

    // sfx /w priority
    if (synthsfxpriority === -1 || priority >= synthsfxpriority) {
      synthsfxpriority = priority
      synthplaystart(invokes)
    }
  }

  // start it
  pacer.start(0)

  return synthplay
}

let synthplayfunc: (priority: number, buffer: string) => void | undefined
function usesynthplay() {
  if (enabled && !ispresent(synthplayfunc)) {
    synthplayfunc = createsynthplay()
  }
  return synthplayfunc
}

createdevice('synth', [], (message) => {
  const synthplay = usesynthplay()
  if (!ispresent(synthplay)) {
    return
  }

  switch (message.target) {
    case 'play':
      if (isarray(message.data)) {
        const [priority, buffer] = message.data as [number, string]
        synthplay(priority, buffer)
      }
      break
  }
})
