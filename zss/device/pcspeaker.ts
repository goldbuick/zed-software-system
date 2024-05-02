import { createdevice } from 'zss/device'
import { playchipfreq } from 'zss/gadget/audio/blaster'
import { randomInteger } from 'zss/mapping/number'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

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
  on(freq: number) {
    playchipfreq(freq)
  },
  off() {
    playchipfreq(0)
  },
}

// setup tables

// notes
const soundfreqtable = new Array(256).fill(0)
const freqc1 = 32.0
const notestep = Math.exp(Math.LN2 / 12.0)
for (let octave = 1; octave <= 15; ++octave) {
  let notebase = Math.exp((octave + 1) * Math.LN2) * freqc1
  for (let note = 0; note <= 11; ++note) {
    soundfreqtable[octave * 16 + note] = Math.floor(notebase)
    notebase *= notestep
  }
}
console.info(soundfreqtable)

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
const sounddrumtable: number[][] = []
sounddrumtable.push([3200])
sounddrumtable.push(new Array(14).map((_, i) => i * 100 + 1000))
sounddrumtable.push(
  new Array(16).map((_, i) => (i % 2) * 1600 + 1600 + (i % 4) * 1600),
)
sounddrumtable.push(new Array(14).map(() => randomInteger(0, 5000) + 500))
const doot = new Array(14).fill(0)
for (let i = 0; i < 7; ++i) {
  doot[i * 2 - 1] = 1600
  doot[i * 2] = randomInteger(0, 1600) + 800
}
sounddrumtable.push(doot)
sounddrumtable.push(
  new Array(14).map((_, i) => (i % 2) * 880 + 880 + (i % 3) * 440),
)
sounddrumtable.push(new Array(14).map((_, i) => 700 - i * 12))
sounddrumtable.push(
  new Array(14).map((_, i) => i * 20 + 1200 - randomInteger(0, i * 40)),
)
sounddrumtable.push(new Array(14).map(() => randomInteger(0, 440) + 220))

// runner
// testing 100 bpm
// middle number is BPM
const RATE = 60 / 150 / 8
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
    pcspeaker.off()
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
    pcspeaker.off()
    pcspeaker.isplaying = false
    return
  }

  // read next tone
  const tone = pcspeaker.buffer[pcspeaker.bufferpos++]
  if (tone === 0) {
    // rest
    pcspeaker.off()
  } else if (tone < 240) {
    // doot
    pcspeaker.on(soundfreqtable[tone - 240])
  } else {
    // drum
  }

  pcspeaker.durationcounter = pcspeaker.buffer[pcspeaker.bufferpos++]
}

function soundparse(input: string) {
  let notetone = 0
  let noteoctave = 3
  let noteduration = 1

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
        output.push(0, noteduration)
        break
      case '0':
      case '1':
      case '2':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        output.push(parseFloat(li) + 240, noteduration)
        break
      default: {
        const tt = li as keyof typeof soundparsenotetable
        const maybenotetone = soundparsenotetable[tt]
        if (ispresent(maybenotetone)) {
          notetone = maybenotetone
          const peek = input[++i] ?? ''
          switch (peek) {
            case '!':
              --notetone
              break
            case '#':
              ++notetone
              break
          }
          output.push(noteoctave * 10 + notetone, noteduration)
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

export function soundstop() {
  pcspeaker.buffer = []
  pcspeaker.isplaying = false
  pcspeaker.off()
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
