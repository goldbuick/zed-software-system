import { Gain, Param, getContext, optionsFromArguments } from 'tone'
import { Effect, EffectOptions } from 'tone/build/esm/effect/Effect'

import synthsidechainworkleturl from './sidechainworklet.js?url'

type SidechainCompressorOptions = {
  threshold: number
  ratio: number
  attack: number
  release: number
  mix: number
  makeupGain: number
} & EffectOptions

export class SidechainCompressor extends Effect<SidechainCompressorOptions> {
  readonly name: string = 'SidechainCompressor'

  readonly threshold: Param<'number'>
  readonly ratio: Param<'number'>
  readonly attack: Param<'number'>
  readonly release: Param<'number'>
  readonly mix: Param<'number'>
  readonly makeupGain: Param<'number'>

  readonly sidechain: Gain = new Gain()

  private _audioworkletnode: AudioWorkletNode =
    this.context.createAudioWorkletNode('sidechaincompressorprocessor', {
      numberOfInputs: 2,
      outputChannelCount: [2],
    })

  constructor(
    threshold?: number,
    ratio?: number,
    attack?: number,
    release?: number,
    mix?: number,
    makeupGain?: number,
  )
  constructor(options?: Partial<SidechainCompressorOptions>)
  constructor() {
    const options = optionsFromArguments(
      SidechainCompressor.getDefaults(),
      // eslint-disable-next-line prefer-rest-params
      arguments,
      ['threshold', 'ratio', 'attack', 'release', 'mix', 'makeupGain'],
    )
    super(options)

    this.threshold = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('threshold'),
      value: options.threshold,
      minValue: -128,
      maxValue: 0,
    })
    this.ratio = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('ratio'),
      value: options.ratio,
      minValue: 1,
      maxValue: 128,
    })
    this.attack = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('attack'),
      value: options.attack,
      minValue: 0.0001,
      maxValue: 128,
    })
    this.release = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('release'),
      value: options.release,
      minValue: 0.0001,
      maxValue: 128,
    })
    this.mix = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('mix'),
      value: options.mix,
      minValue: 0,
      maxValue: 1,
    })
    this.makeupGain = new Param({
      context: this.context,
      param: this._audioworkletnode.parameters.get('makeupGain'),
      value: options.makeupGain,
      minValue: -128,
      maxValue: 60,
    })

    this.connectEffect(this._audioworkletnode)
    this.sidechain.connect(this._audioworkletnode, 0, 1)
  }

  static getDefaults(): SidechainCompressorOptions {
    return Object.assign(Effect.getDefaults(), {
      threshold: -28,
      ratio: 4,
      attack: 0.005,
      release: 0.005,
      mix: 1,
      makeupGain: 0,
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

export function addsidechainmodule() {
  return getContext().rawContext.audioWorklet.addModule(
    synthsidechainworkleturl,
  )
}
