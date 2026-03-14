import { Delay, Freeverb } from 'tone'
import { Effect, EffectOptions } from 'tone/build/esm/effect/Effect'

const DEFAULT_DECAY = 2.5
const DEFAULT_PREDELAY = 0.01
const DEFAULT_WET = 0.5
const MIN_DECAY = 0.001
const DAMPENING_HZ = 3000

export interface FastReverbOptions extends EffectOptions {
  decay: number
  preDelay: number
}

function decaytoroomsize(decay: number): number {
  return Math.min(0.98, 1 - Math.exp(-decay / 2))
}

export class FastReverb extends Effect<FastReverbOptions> {
  readonly name = 'FastReverb'

  private _delay: InstanceType<typeof Delay>
  private _freeverb: InstanceType<typeof Freeverb>
  private _decay: number
  private _predelay: number

  constructor(options?: Partial<FastReverbOptions>) {
    const opts = {
      ...FastReverb.getDefaults(),
      ...(options ?? {}),
    }
    super(opts)

    const decay = Math.max(MIN_DECAY, Number(opts.decay))
    const predelay = Math.max(0, Number(opts.preDelay))

    this._decay = decay
    this._predelay = predelay

    this._delay = new Delay({
      context: this.context,
      delayTime: predelay,
    })
    this._freeverb = new Freeverb({
      context: this.context,
      roomSize: decaytoroomsize(decay),
      dampening: DAMPENING_HZ,
    })

    this.effectSend.chain(this._delay, this._freeverb, this.effectReturn)
    this._internalChannels.push(this._delay, this._freeverb)
  }

  static getDefaults(): FastReverbOptions {
    return {
      ...Effect.getDefaults(),
      decay: DEFAULT_DECAY,
      preDelay: DEFAULT_PREDELAY,
      wet: DEFAULT_WET,
    }
  }

  get decay(): number {
    return this._decay
  }

  set decay(time: number) {
    const t = Math.max(MIN_DECAY, this.toSeconds(time))
    this._decay = t
    this._freeverb.roomSize.value = decaytoroomsize(t)
  }

  get preDelay(): number {
    return this._predelay
  }

  set preDelay(time: number) {
    const t = Math.max(0, this.toSeconds(time))
    this._predelay = t
    this._delay.delayTime.value = t
  }

  dispose(): this {
    this._delay.dispose()
    this._freeverb.dispose()
    super.dispose()
    return this
  }
}
