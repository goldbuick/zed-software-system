import { Param, getContext, optionsFromArguments } from 'tone'
import { Effect, EffectOptions } from 'tone/build/esm/effect/Effect'

import synthfcrushworkleturl from './fcrushworklet.js?url'

type FrequencyCrusherOptions = {
  rate: number
} & EffectOptions

export class FrequencyCrusher extends Effect<FrequencyCrusherOptions> {
  readonly name: string = 'FrequencyCrusher'

  readonly rate: Param<'number'>

  private _audioworkletnode: AudioWorkletNode =
    this.context.createAudioWorkletNode('fcrushprocessor')

  constructor(rate?: number)
  constructor(options?: Partial<FrequencyCrusherOptions>)
  constructor() {
    const options = optionsFromArguments(
      FrequencyCrusher.getDefaults(),
      // eslint-disable-next-line prefer-rest-params
      arguments,
      ['rate'],
    )
    super(options)

    this.rate = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('rate'),
      value: options.rate,
      minValue: 1,
      maxValue: 512,
    })

    this.connectEffect(this._audioworkletnode)
  }

  static getDefaults(): FrequencyCrusherOptions {
    return Object.assign(Effect.getDefaults(), {
      rate: 64,
    })
  }

  /**
   * Clean up.
   */
  dispose(): this {
    super.dispose()
    this._audioworkletnode.disconnect()
    return this
  }
}

export function addfcrushmodule() {
  return getContext().rawContext.audioWorklet.addModule(synthfcrushworkleturl)
}
