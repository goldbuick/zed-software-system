import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

const SYNTH_VARIANT_PARTIALS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]+/

const SYNTH_VARIANTS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*/

export const SYNTH_NAMED_TYPES = [
  'pwm',
  'pulse',
  'retro',
  'buzz',
  'clang',
  'metallic',
  'noise',
  'hollow',
  'bells',
  'doot',
  'algo0',
  'algo1',
  'algo2',
  'algo3',
  'algo4',
  'algo5',
  'algo6',
  'algo7',
  'string',
  'pluck',
  'flute',
  'clarinet',
  'brass',
  'piano',
  'violin',
  'steel',
  'tonewheel',
] as const

const SYNTH_NAMED_TYPE_SET = new Set<string>(SYNTH_NAMED_TYPES)

export function validatesynthtype(
  value: string,
  maybepartials: string | number | number[],
) {
  if (isstring(value)) {
    const type = NAME(value)
    const haspartials = SYNTH_VARIANT_PARTIALS.test(type)

    if (haspartials) {
      return isarray(maybepartials)
    }

    if (SYNTH_NAMED_TYPE_SET.has(type)) {
      return true
    }

    return SYNTH_VARIANTS.test(type)
  }

  return false
}
