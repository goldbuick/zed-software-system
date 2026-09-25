/** Worker/host-safe media-stream companion session flags. */

let mediastreamstreaming = false
let mediastreamboundpeerid = ''

export function setmediastreamstreaming(active: boolean) {
  mediastreamstreaming = active
}

export function readmediastreamstreaming(): boolean {
  return mediastreamstreaming
}

export function setmediastreamboundpeerid(peerid: string) {
  mediastreamboundpeerid = String(peerid || '').trim()
}

export function readmediastreamboundpeerid(): string {
  return mediastreamboundpeerid
}
