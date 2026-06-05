import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

const SYNTH_VARIANT_PARTIALS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]+/

const SYNTH_VARIANTS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*/

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

    switch (type) {
      case 'pwm':
      case 'pulse':
      case 'retro':
      case 'buzz':
      case 'clang':
      case 'metallic':
      case 'noise':
      case 'hollow':
      case 'bells':
      case 'doot':
      case 'algo0':
      case 'algo1':
      case 'algo2':
      case 'algo3':
      case 'algo4':
      case 'algo5':
      case 'algo6':
      case 'algo7':
      case 'string':
      case 'pluck':
      case 'drip':
      case 'flute':
      case 'clarinet':
      case 'brass':
      case 'panpipe':
      case 'piano':
      case 'epiano':
      case 'timpani':
      case 'violin':
      case 'viola':
      case 'nylon':
      case 'steel':
      case 'tonewheel':
      case 'drawbar':
        return true
      default:
        return SYNTH_VARIANTS.test(type)
    }
  }

  return false
}
