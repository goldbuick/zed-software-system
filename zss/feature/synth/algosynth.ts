import {
  AmplitudeEnvelope,
  Envelope,
  EnvelopeOptions,
  Gain,
  Multiply,
  OmniOscillator,
  Signal,
  Synth,
  SynthOptions,
  ToneAudioNode,
  ToneAudioNodeOptions,
  Unit,
  optionsFromArguments,
} from 'tone'
import { omitFromObject } from 'tone/build/esm/core/util/Defaults'
import { RecursivePartial, readOnly } from 'tone/build/esm/core/util/Interface'
import { Monophonic } from 'tone/build/esm/instrument/Monophonic'
import { OmniOscillatorSynthOptions } from 'tone/build/esm/source/oscillator/OscillatorInterface'
import { Source } from 'tone/build/esm/source/Source'
import { MAYBE } from 'zss/mapping/types'

export type AlgoSynthOptions = {
  algorithm: number
  harmonicity: Unit.Positive
  modulationIndex: Unit.Positive
  oscillator1: OmniOscillatorSynthOptions
  oscillator2: OmniOscillatorSynthOptions
  oscillator3: OmniOscillatorSynthOptions
  oscillator4: OmniOscillatorSynthOptions
  envelope1: Omit<EnvelopeOptions, keyof ToneAudioNodeOptions>
  envelope2: Omit<EnvelopeOptions, keyof ToneAudioNodeOptions>
  envelope3: Omit<EnvelopeOptions, keyof ToneAudioNodeOptions>
  envelope4: Omit<EnvelopeOptions, keyof ToneAudioNodeOptions>
} & Omit<SynthOptions, 'oscillator' | 'envelope'>

export class AlgoSynth extends Monophonic<AlgoSynthOptions> {
  readonly name: string = 'AlgoSynth'

  /**
   * Operators for the synth
   */
  protected _operator1: Synth
  protected _operator2: Synth
  protected _operator3: Synth
  protected _operator4: Synth

  /**
   * The node where the modulation happens
   */
  protected _modulation1: MAYBE<Gain>
  protected _modulation2: MAYBE<Gain>
  protected _modulation3: MAYBE<Gain>

  /**
   * The operator oscillator
   */
  readonly oscillator1: OmniOscillator<any>
  readonly oscillator2: OmniOscillator<any>
  readonly oscillator3: OmniOscillator<any>
  readonly oscillator4: OmniOscillator<any>

  /**
   * The operator envelope
   */
  readonly envelope1: AmplitudeEnvelope
  readonly envelope2: AmplitudeEnvelope
  readonly envelope3: AmplitudeEnvelope
  readonly envelope4: AmplitudeEnvelope

  /**
   * The frequency control
   */
  readonly frequency: Signal<'frequency'>

  /**
   * The detune in cents
   */
  readonly detune: Signal<'cents'>

  /**
   * The modulation index which essentially the depth or amount of the modulation. It is the
   * ratio of the frequency of the modulating signal (mf) to the amplitude of the
   * modulating signal (ma) -- as in ma/mf.
   */
  readonly modulationIndex: Multiply

  /**
   * Harmonicity is the ratio between the two voices. A harmonicity of
   * 1 is no change. Harmonicity = 2 means a change of an octave.
   * @example
   * const amSynth = new Tone.AMSynth().toDestination();
   * // pitch the modulator an octave below oscillator
   * amSynth.harmonicity.value = 0.5;
   * amSynth.triggerAttackRelease("C5", "4n");
   */
  readonly harmonicity: Multiply

  constructor(options?: RecursivePartial<AlgoSynthOptions>)
  constructor() {
    // eslint-disable-next-line prefer-rest-params
    const options = optionsFromArguments(AlgoSynth.getDefaults(), arguments)
    super(options)

    // create operators
    this._operator1 = new Synth({
      context: this.context,
      oscillator: options.oscillator1,
      envelope: options.envelope1,
      volume: -10,
    })
    this.oscillator1 = this._operator1.oscillator
    this.envelope1 = this._operator1.envelope

    this._operator2 = new Synth({
      context: this.context,
      oscillator: options.oscillator2,
      envelope: options.envelope2,
      volume: -10,
    })
    this.oscillator2 = this._operator2.oscillator
    this.envelope2 = this._operator2.envelope

    this._operator3 = new Synth({
      context: this.context,
      oscillator: options.oscillator3,
      envelope: options.envelope3,
      volume: -10,
    })
    this.oscillator3 = this._operator3.oscillator
    this.envelope3 = this._operator3.envelope

    this._operator4 = new Synth({
      context: this.context,
      oscillator: options.oscillator4,
      envelope: options.envelope4,
      onsilence: () => this.onsilence(this),
      volume: -10,
    })
    this.oscillator4 = this._operator4.oscillator
    this.envelope4 = this._operator4.envelope

    this.frequency = new Signal({
      context: this.context,
      units: 'frequency',
    })
    this.detune = new Signal({
      context: this.context,
      value: options.detune,
      units: 'cents',
    })
    this.modulationIndex = new Multiply({
      context: this.context,
      value: options.modulationIndex,
    })
    this.harmonicity = new Multiply({
      context: this.context,
      value: options.harmonicity,
      minValue: 0,
    })

    this._modulation1 = new Gain({
      context: this.context,
      gain: 0,
    })
    this._modulation2 = new Gain({
      context: this.context,
      gain: 0,
    })
    this._modulation3 = new Gain({
      context: this.context,
      gain: 0,
    })

    // wire up frequency
    switch (options.algorithm) {
      case 0:
      case 1:
      case 2:
      case 3:
        this.frequency.chain(this.harmonicity, this._operator1.frequency)
        this.frequency.chain(this.harmonicity, this._operator2.frequency)
        this.frequency.chain(this.harmonicity, this._operator3.frequency)
        // operator 4 is the carrier
        break
      case 4:
        this.frequency.chain(this.harmonicity, this._operator1.frequency)
        this.frequency.chain(this.harmonicity, this._operator3.frequency)
        // operator 2 and 4 are carriers
        this.frequency.connect(this._operator2.frequency)
        break
      case 5:
        this.frequency.chain(this.harmonicity, this._operator1.frequency)
        // last 3 operators are carriers
        this.frequency.connect(this._operator2.frequency)
        this.frequency.connect(this._operator3.frequency)
        break
      case 6:
        this.frequency.chain(this.harmonicity, this._operator1.frequency)
        // last 3 operators are carriers
        this.frequency.connect(this._operator2.frequency)
        this.frequency.connect(this._operator3.frequency)
        break
      case 7:
        // all operators are carriers
        this.frequency.connect(this._operator1.frequency)
        this.frequency.connect(this._operator2.frequency)
        this.frequency.connect(this._operator3.frequency)
        break
    }
    // operator 4 is always a carrier
    this.frequency.connect(this._operator4.frequency)

    // tweak the gain of the modulators
    this.frequency.chain(this.modulationIndex, this._modulation1)
    this.frequency.chain(this.modulationIndex, this._modulation2)
    this.frequency.chain(this.modulationIndex, this._modulation3)

    // wire up detune
    this.detune.fan(
      this._operator1.detune,
      this._operator2.detune,
      this._operator3.detune,
      this._operator4.detune,
    )

    // wire up modulation
    switch (options.algorithm) {
      case 0:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator2.frequency)
        // 2
        this._operator2.connect(this._modulation2.gain)
        this._modulation2.connect(this._operator3.frequency)
        // 3
        this._operator3.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 1:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator3.frequency)
        // 2
        this._operator2.connect(this._modulation2.gain)
        this._modulation2.connect(this._operator3.frequency)
        // 3
        this._operator3.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 2:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator4.frequency)
        // 2
        this._operator2.connect(this._modulation2.gain)
        this._modulation2.connect(this._operator3.frequency)
        // 3
        this._operator3.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 3:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator4.frequency)
        // 2
        this._operator2.connect(this._modulation2.gain)
        this._modulation2.connect(this._operator4.frequency)
        // 3
        this._operator3.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 4:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator2.frequency)
        // 3
        this._operator3.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 5:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator2.frequency)
        // 2
        this._operator1.connect(this._modulation2.gain)
        this._modulation2.connect(this._operator3.frequency)
        // 3
        this._operator1.connect(this._modulation3.gain)
        this._modulation3.connect(this._operator4.frequency)
        break
      case 6:
        // 1
        this._operator1.connect(this._modulation1.gain)
        this._modulation1.connect(this._operator2.frequency)
        break
    }

    // wire up output
    switch (options.algorithm) {
      case 0:
      case 1:
      case 2:
      case 3:
        this._operator4.connect(this.output)
        break
      case 4:
        this._operator2.connect(this.output)
        this._operator4.connect(this.output)
        break
      case 5:
      case 6:
        this._operator2.connect(this.output)
        this._operator3.connect(this.output)
        this._operator4.connect(this.output)
        break
      case 7:
        this._operator1.connect(this.output)
        this._operator2.connect(this.output)
        this._operator3.connect(this.output)
        this._operator4.connect(this.output)
        break
    }

    readOnly(this, [
      'oscillator1',
      'oscillator2',
      'oscillator3',
      'oscillator4',
      'envelope1',
      'envelope2',
      'envelope3',
      'envelope4',
      'frequency',
      'harmonicity',
      'detune',
    ])
  }

  static getDefaults(): AlgoSynthOptions {
    return Object.assign(Monophonic.getDefaults(), {
      algorithm: 0,
      harmonicity: 2,
      modulationIndex: 1,
      oscillator1: Object.assign(
        omitFromObject(OmniOscillator.getDefaults(), [
          ...Object.keys(Source.getDefaults()),
          'frequency',
          'detune',
        ]),
        {
          type: 'sine',
        },
      ) as OmniOscillatorSynthOptions,
      oscillator2: Object.assign(
        omitFromObject(OmniOscillator.getDefaults(), [
          ...Object.keys(Source.getDefaults()),
          'frequency',
          'detune',
        ]),
        {
          type: 'sine',
        },
      ) as OmniOscillatorSynthOptions,
      oscillator3: Object.assign(
        omitFromObject(OmniOscillator.getDefaults(), [
          ...Object.keys(Source.getDefaults()),
          'frequency',
          'detune',
        ]),
        {
          type: 'sine',
        },
      ) as OmniOscillatorSynthOptions,
      oscillator4: Object.assign(
        omitFromObject(OmniOscillator.getDefaults(), [
          ...Object.keys(Source.getDefaults()),
          'frequency',
          'detune',
        ]),
        {
          type: 'sine',
        },
      ) as OmniOscillatorSynthOptions,
      envelope1: Object.assign(
        omitFromObject(
          Envelope.getDefaults(),
          Object.keys(ToneAudioNode.getDefaults()),
        ),
        {
          attack: 0.01,
          decay: 0.01,
          sustain: 1,
          release: 0.5,
        },
      ),
      envelope2: Object.assign(
        omitFromObject(
          Envelope.getDefaults(),
          Object.keys(ToneAudioNode.getDefaults()),
        ),
        {
          attack: 0.01,
          decay: 0.01,
          sustain: 1,
          release: 0.5,
        },
      ),
      envelope3: Object.assign(
        omitFromObject(
          Envelope.getDefaults(),
          Object.keys(ToneAudioNode.getDefaults()),
        ),
        {
          attack: 0.01,
          decay: 0.01,
          sustain: 1,
          release: 0.5,
        },
      ),
      envelope4: Object.assign(
        omitFromObject(
          Envelope.getDefaults(),
          Object.keys(ToneAudioNode.getDefaults()),
        ),
        {
          attack: 0.01,
          decay: 0.01,
          sustain: 1,
          release: 0.5,
        },
      ),
    })
  }

  /**
   * Trigger the attack portion of the note
   */
  protected _triggerEnvelopeAttack(time: Unit.Seconds, velocity: number): void {
    // @ts-expect-error yes
    this._operator1._triggerEnvelopeAttack(time, velocity)
    // @ts-expect-error yes
    this._operator2._triggerEnvelopeAttack(time, velocity)
    // @ts-expect-error yes
    this._operator3._triggerEnvelopeAttack(time, velocity)
    // @ts-expect-error yes
    this._operator4._triggerEnvelopeAttack(time, velocity)
  }

  /**
   * Trigger the release portion of the note
   */
  protected _triggerEnvelopeRelease(time: Unit.Seconds) {
    // @ts-expect-error yes
    this._operator1._triggerEnvelopeRelease(time)
    // @ts-expect-error yes
    this._operator2._triggerEnvelopeRelease(time)
    // @ts-expect-error yes
    this._operator3._triggerEnvelopeRelease(time)
    // @ts-expect-error yes
    this._operator4._triggerEnvelopeRelease(time)
    return this
  }

  getLevelAtTime(time: Unit.Time): Unit.NormalRange {
    time = this.toSeconds(time)
    return this.envelope4.getValueAtTime(time)
  }

  dispose(): this {
    super.dispose()
    this._operator1.dispose()
    this._operator2.dispose()
    this._operator3.dispose()
    this._operator4.dispose()
    this._modulation1?.dispose()
    this._modulation2?.dispose()
    this._modulation3?.dispose()
    this.frequency.dispose()
    this.detune.dispose()
    this.harmonicity.dispose()
    return this
  }
}
