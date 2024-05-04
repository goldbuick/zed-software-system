import { createdevice } from 'zss/device'
import {
  loadchipdrum,
  onblasterready,
  playchipdrum,
  playchipfreq,
  playchipstop,
} from 'zss/gadget/audio/blaster'
import { bpmtoseconds } from 'zss/gadget/audio/logic'
import { range } from 'zss/mapping/array'
import { randomInteger } from 'zss/mapping/number'
import { isarray, isnumber, isstring } from 'zss/mapping/types'

const pcspeaker = {
  time: 0,
  volume: 1,
  enabled: true,
  blockqueueing: false,
  currentpriority: 0,
  durationcounter: 0,
  buffer: [] as number[],
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

const soundparsenotetable = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
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

// runner
// testing 150 bpm (#play feels better at 300bpm ??)
const RATE = bpmtoseconds(150 * 2)
function soundupdate(delta: number) {
  // 32nd note duration
  pcspeaker.time += delta
  if (pcspeaker.time < RATE) {
    return
  }
  pcspeaker.time %= RATE

  // sound is off
  if (!pcspeaker.enabled) {
    // not enabled
    pcspeaker.isplaying = false
    playchipfreq(0, 0)
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
    playchipfreq(0, 0)
    pcspeaker.isplaying = false
    return
  }

  // read next tone
  const tone = pcspeaker.buffer[pcspeaker.bufferpos++]
  // read next type
  const type = pcspeaker.buffer[pcspeaker.bufferpos++]

  // trigger
  playchipstop()
  if (tone === 0) {
    // rest
  } else if (tone < 240) {
    // doot
    playchipfreq(type, soundfreqtable[tone])
  } else {
    // drum
    playchipdrum(type, tone - 240)
  }

  // how many ticks before change ?
  pcspeaker.durationcounter = pcspeaker.buffer[pcspeaker.bufferpos++]
}

function soundparse(input: string) {
  let notetone = 0
  let notetype = 0
  let noteoctave = 3
  let noteduration = 1

  console.info('soundparse', input)

  const output: number[] = []
  for (let i = 0; i < input.length; ++i) {
    const li = input[i].toLowerCase()
    switch (li) {
      case 't':
        noteduration = 1
        break
      case 's':
        noteduration = 2
        break
      case 'i':
        noteduration = 4
        break
      case 'q':
        noteduration = 8
        break
      case 'h':
        noteduration = 16
        break
      case 'w':
        noteduration = 32
        break
      case '.':
        noteduration = (noteduration * 3) / 2
        break
      case '3':
        noteduration /= 3
        break
      case '+':
        noteoctave = Math.min(noteoctave + 1, 6)
        break
      case '-':
        noteoctave = Math.max(noteoctave - 1, 1)
        break
      case 'x':
        output.push(0, notetype, noteduration)
        break
      case 'z': {
        console.info('****', input)
        const lii = (input[i + 1] ?? '').toLowerCase()
        switch (lii) {
          case '0':
          case '1':
          case '2':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            ++i
            notetype = parseFloat(lii)
            break
        }
        break
      }
      case '0':
      case '1':
      case '2':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        output.push(parseFloat(li) + 240, notetype, noteduration)
        break
      default: {
        notetone =
          soundparsenotetable[li as keyof typeof soundparsenotetable] ?? 0
        switch ((input[i + 1] ?? '').toLowerCase()) {
          case '!':
            ++i
            --notetone
            break
          case '#':
            ++i
            ++notetone
            break
        }
        output.push(noteoctave * 16 + notetone, notetype, noteduration)
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

export function soundstop() {
  pcspeaker.buffer = []
  pcspeaker.isplaying = false
  playchipfreq(0)
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
