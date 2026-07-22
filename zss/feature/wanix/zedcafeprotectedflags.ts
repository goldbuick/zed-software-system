import { ispid } from 'zss/mapping/guid'

/** Sim-owned flag bags — never export, sync, or import-overwrite from guest. */
export const ZEDCAFE_SIM_ONLY_FLAG_SUFFIXES = [
  '_gadget',
  '_chip',
  '_synth',
  '_layers',
  '_tracking',
] as const

export function issimonlyflagowner(owner: string): boolean {
  for (let i = 0; i < ZEDCAFE_SIM_ONLY_FLAG_SUFFIXES.length; ++i) {
    if (owner.endsWith(ZEDCAFE_SIM_ONLY_FLAG_SUFFIXES[i])) {
      return true
    }
  }
  return false
}

export function issimonlyflagpath(path: string): boolean {
  const segments = path.split('/')
  if (segments.length !== 3 || segments[1] !== 'flags') {
    return false
  }
  const owner = segments[2].replace(/\.json$/, '')
  return issimonlyflagowner(owner)
}

/** Player avatar objects under board/objects/pid_*.json — never peer-sync. */
export function isplayerobjectpath(path: string): boolean {
  const segments = path.split('/')
  if (
    segments.length !== 5 ||
    segments[2] !== 'board' ||
    segments[3] !== 'objects'
  ) {
    return false
  }
  const objid = segments[4].replace(/\.json$/, '')
  return ispid(objid)
}
