import { createdevice } from 'zss/device'
import { playchipfreq } from 'zss/gadget/audio/blaster'
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
  on(freq: number) {
    playchipfreq(freq)
  },
  off() {
    playchipfreq(0)
  },
}

// setup tables

// notes
const soundfreqtable: number[] = []
const freqc1 = 32.0
const notestep = Math.exp(Math.LN2 / 12.0)
for (let octave = 0; octave <= 15; ++octave) {
  let notebase = Math.exp((octave + 1) * Math.LN2) * freqc1
  for (let note = 0; note <= 11; ++note) {
    soundfreqtable[octave * 16 + note] = Math.floor(notebase)
    notebase *= notestep
  }
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
const RATE = ((60 / 150) * 64) / 1000
function soundupdate(delta: number) {
  pcspeaker.time += delta
  if (pcspeaker.time < RATE) {
    return
  }
  pcspeaker.time %= RATE

  if (!pcspeaker.enabled) {
    // not enabled
    pcspeaker.isplaying = false
    pcspeaker.off()
    return
  }

  if (!pcspeaker.isplaying) {
    // not playing
    return
  }

  --pcspeaker.durationcounter
  if (pcspeaker.durationcounter > 0) {
    // still playing
    return
  }

  if (pcspeaker.bufferpos >= pcspeaker.buffer.length) {
    // buffer complete
    pcspeaker.isplaying = false
    pcspeaker.off()
    return
  }

  // read next tone
  const tone = pcspeaker.buffer[pcspeaker.bufferpos++]
  if (tone === 0) {
    pcspeaker.off()
  } else if (tone < 240) {
    pcspeaker.on(soundfreqtable[tone])
  } else {
    // play given drum
    // play given set of freq ...
    // sounddrumtable[tone - 240]
  }

  const duration = pcspeaker.buffer[pcspeaker.bufferpos++]
  pcspeaker.durationcounter = duration
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
        output.push(240 + parseFloat(li), noteduration)
        break
      default: {
        switch (li) {
          case 'c':
          default:
            notetone = 0
            break
          case 'd':
            notetone = 2
            break
          case 'e':
            notetone = 4
            break
          case 'f':
            notetone = 5
            break
          case 'g':
            notetone = 7
            break
          case 'a':
            notetone = 9
            break
          case 'b':
            notetone = 11
            break
        }
        const peek = input[i + 1] ?? ''
        switch (peek.toLowerCase()) {
          case '!':
            ++i
            --notetone
            break
          case '#':
            ++i
            ++notetone
            break
        }
        output.push(noteoctave * 10 + notetone, noteduration)
        break
      }
    }
  }

  return output
}

export function soundplay(priority: number, maybepattern: string) {
  const pattern = soundparse(maybepattern)
  if (pcspeaker.blockqueueing) {
    return
  }

  if (
    pcspeaker.isplaying &&
    priority !== -1 &&
    priority < pcspeaker.currentpriority
  ) {
    return
  }

  if (priority >= 0 || !pcspeaker.isplaying) {
    pcspeaker.currentpriority = priority
    pcspeaker.buffer = pattern
    pcspeaker.bufferpos = 0
    pcspeaker.durationcounter = 1
  } else {
    pcspeaker.buffer = [...pcspeaker.buffer.slice(pcspeaker.bufferpos)]
    pcspeaker.bufferpos = 0
    if (pcspeaker.buffer.length + pattern.length < 255) {
      pcspeaker.buffer.push(...pattern)
    }
  }
  pcspeaker.isplaying = true
}

export function soundstop() {
  pcspeaker.buffer = []
  pcspeaker.isplaying = false
  pcspeaker.off()
}

const TIME_STEP = 10
setInterval(() => soundupdate(TIME_STEP / 1000), TIME_STEP)

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
