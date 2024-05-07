import { createdevice } from 'zss/device'
import {
  loadchipdrum,
  onblasterready,
  playchipdrum,
  playchipfreq,
  playchiploop,
  playchiproom,
  playchipstop,
  playchiptype,
} from 'zss/gadget/audio/blaster'
import { bpmtoseconds } from 'zss/gadget/audio/logic'
import { range } from 'zss/mapping/array'
import { randomInteger } from 'zss/mapping/number'
import {
  MAYBE_NUMBER,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

type PCNOTE = {
  type: number
  freq: number
  room: number
  loop: boolean
  duration: number
}

const pcspeaker = {
  time: 0,
  volume: 1,
  enabled: true,
  blockqueueing: false,
  currentpriority: 0,
  durationcounter: 0,
  buffer: [] as PCNOTE[],
  bufferpos: 0,
  isplaying: false,
}

// setup tables

// notes
const soundfreqtable = new Array(256).fill(0)
const freqc1 = 32.0
const notestep = Math.exp(Math.LN2 / 12.0)
for (let octave = 1; octave <= 15; ++octave) {
  let notebase = Math.exp(octave * Math.LN2) * freqc1
  for (let note = 0; note <= 11; ++note) {
    soundfreqtable[octave * 16 + note] = Math.floor(notebase)
    notebase *= notestep
  }
}

// drums
onblasterready(() => {
  let drumindex = 0
  loadchipdrum(drumindex++, [3200])
  loadchipdrum(
    drumindex++,
    range(1, 14).map((i) => i * 100 + 1000),
  )
  loadchipdrum(
    drumindex++,
    range(1, 16).map((i) => (i % 2) * 1600 + 1600 + (i % 4) * 1600),
  )
  // empty 'cause 3 is taken
  loadchipdrum(drumindex++, [])
  loadchipdrum(
    drumindex++,
    range(1, 14).map(() => randomInteger(0, 5000) + 500),
  )
  const doot = range(0, 16).fill(0)
  range(1, 8).forEach((i) => {
    doot[i * 2 - 1] = 1600
    doot[i * 2] = randomInteger(0, 1600) + 800
  })
  loadchipdrum(drumindex++, doot)
  loadchipdrum(
    drumindex++,
    range(1, 14).map((i) => (i % 2) * 880 + 880 + (i % 3) * 440),
  )
  loadchipdrum(
    drumindex++,
    range(1, 14).map((i) => 700 - i * 12),
  )
  loadchipdrum(
    drumindex++,
    range(1, 14).map((i) => i * 20 + 1200 - randomInteger(0, i * 40)),
  )
  loadchipdrum(
    drumindex++,
    range(1, 14).map(() => randomInteger(0, 440) + 220),
  )
  console.info('loaded', drumindex, 'drums')
})

// testing 150 bpm (#play feels better at 300bpm ??)
export const PCSPEAKER_BPM = bpmtoseconds(150)

// runner
function soundupdate(delta: number) {
  // 32nd note duration
  const rate = PCSPEAKER_BPM * 0.5
  pcspeaker.time += delta
  if (pcspeaker.time < rate) {
    return
  }
  pcspeaker.time %= rate

  // sound is off
  if (!pcspeaker.enabled) {
    // not enabled
    pcspeaker.isplaying = false
    playchipstop()
    return
  }

  // sound is playing
  if (!pcspeaker.isplaying) {
    // not playing
    return
  }

  // sound is X number of updates
  --pcspeaker.durationcounter
  if (pcspeaker.durationcounter > 0) {
    // still playing
    return
  }

  if (pcspeaker.bufferpos >= pcspeaker.buffer.length) {
    // buffer complete
    playchipstop()
    pcspeaker.isplaying = false
    return
  }

  // read next action
  const action = pcspeaker.buffer[pcspeaker.bufferpos++]

  // setup
  playchiptype(action.type)
  playchiproom(action.room)
  playchiploop(action.loop)

  // trigger
  playchipstop()
  if (action.freq === 0) {
    // rest
  } else if (action.freq < 240) {
    // doot
    playchipfreq(soundfreqtable[action.freq])
  } else {
    // drum
    playchipdrum(action.freq - 240)
  }

  // how many ticks before change ?
  pcspeaker.durationcounter = action.duration
}

const soundparsenotetable = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
}

function soundparsenumeric(input: string): MAYBE_NUMBER {
  const value = parseFloat(input)
  return !Number.isNaN(value) ? value : undefined
}

function soundparse(input: string) {
  const note: PCNOTE = {
    type: 0,
    freq: 0,
    room: 0,
    loop: false,
    duration: 1,
  }
  let notetone = 0
  let noteoctave = 3

  const output: PCNOTE[] = []
  for (let i = 0; i < input.length; ++i) {
    const li = input[i].toLowerCase()
    const lii = (input[i + 1] ?? '').toLowerCase()
    switch (li) {
      case 't':
        note.duration = 1
        break
      case 's':
        note.duration = 2
        break
      case 'i':
        note.duration = 4
        break
      case 'q':
        note.duration = 8
        break
      case 'h':
        note.duration = 16
        break
      case 'w':
        note.duration = 32
        break
      case '.':
        note.duration = (note.duration * 3) / 2
        break
      case '3':
        note.duration /= 3
        break
      case '+':
        noteoctave = Math.min(noteoctave + 1, 6)
        break
      case '-':
        noteoctave = Math.max(noteoctave - 1, 1)
        break
      case 'x':
        output.push({ ...note, freq: 0 })
        break
      case 'l':
        note.loop = true
        break
      case 'z': {
        const value = soundparsenumeric(lii)
        if (ispresent(value)) {
          ++i
          note.type = value
        }
        break
      }
      case 'r': {
        const value = soundparsenumeric(lii)
        if (ispresent(value)) {
          ++i
          note.room = value
        }
        break
      }
      default: {
        const value = soundparsenumeric(li)
        if (ispresent(value)) {
          output.push({ ...note, freq: value + 240 })
        } else {
          notetone =
            soundparsenotetable[li as keyof typeof soundparsenotetable] ?? 0
          switch (lii) {
            case '!':
              ++i
              --notetone
              break
            case '#':
              ++i
              ++notetone
              break
          }
          output.push({ ...note, freq: noteoctave * 16 + notetone })
        }
        break
      }
    }
  }

  return output
}

export function soundplay(priority: number, maybepattern: string) {
  // skip empty strings
  if (!maybepattern) {
    return
  }

  // skip when sounds are blocked
  if (pcspeaker.blockqueueing) {
    return
  }

  // filter based on priority
  if (
    pcspeaker.isplaying &&
    priority !== -1 &&
    priority < pcspeaker.currentpriority
  ) {
    return
  }

  // parse and queue up data
  const pattern = soundparse(maybepattern)
  if (priority >= 0 || !pcspeaker.isplaying) {
    // start new sound
    pcspeaker.currentpriority = priority
    pcspeaker.buffer = pattern
    pcspeaker.bufferpos = 0
    pcspeaker.durationcounter = 1
  } else {
    // queue pattern
    pcspeaker.buffer = pcspeaker.buffer.slice(pcspeaker.bufferpos)
    pcspeaker.bufferpos = 0
    pcspeaker.buffer.push(...pattern)
  }

  // we blastin
  pcspeaker.isplaying = true
}

let tm = performance.now()
setInterval(() => {
  const nxt = performance.now()
  const delta = (nxt - tm) / 1000
  tm = nxt
  soundupdate(delta)
}, 10)

createdevice('pcspeaker', [], (message) => {
  switch (message.target) {
    case 'play':
      if (isarray(message.data)) {
        const [priority, buffer] = message.data
        if (isnumber(priority) && isstring(buffer)) {
          soundplay(priority, buffer)
        }
      }
      break
  }
})
