import { Time } from 'tone'

const BASE_NOTE = '64n'

/** Duration as Tone notation (e.g. `"4n"`). Main-thread only — uses Tone.js. */
export function durationnotation(duration: number) {
  return Time({ [BASE_NOTE]: duration }).toNotation()
}

/** Duration in seconds from 64th-note units. Main-thread only — uses Tone.js. */
export function durationseconds(duration: number) {
  return Time({ [BASE_NOTE]: duration }).toSeconds()
}
