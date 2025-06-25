// https://github.com/jadujoel/sidechain-compressor-audio-worklet/tree/main

/**
 * @class SidechainCompressorProcessor
 * @extends AudioWorkletProcessor
 */
class SidechainCompressorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'threshold',
        defaultValue: -28,
        minValue: -128,
        maxValue: 0,
      },
      {
        name: 'ratio',
        defaultValue: 4,
        minValue: 1,
        maxValue: 128,
      },
      {
        name: 'attack',
        defaultValue: 0.005,
        minValue: 0.0001,
        maxValue: 128,
      },
      {
        name: 'release',
        defaultValue: 0.005,
        minValue: 0.0001,
        maxValue: 128,
      },
      {
        name: 'mix',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: 'makeupGain',
        defaultValue: 0,
        minValue: -128,
        maxValue: 60,
      },
    ]
  }

  /**
   * @constructor
   * AudioWorkletNode constructor.
   */
  constructor() {
    super()

    this.firstTime = true
    this.useLogging = true
    this.sampleRate = 44100
    this.isBypassed = false
    this.useSidechain = true

    this.ratio = 12.0
    this.threshold = -30.0
    this.attack_time = 0.005
    this.release_time = 0.4

    // Initializing Params
    this.wav_pow = 0
    this.instantPower = 0
    this.inputGain = 1.0
    this.makeupGain = 1.0

    // signal

    this.comp_ratio_const = 1.0 - 1.0 / this.ratio

    this.attack_const = Math.exp(-1.0 / (this.attack_time * this.sampleRate))
    this.release_const = Math.exp(-1.0 / (this.release_time * this.sampleRate))
    this.level_lp_const = Math.exp(-1.0 / (this.attack_time * this.sampleRate))

    this.prev_level_lp_pow = 1.0e-6
    this.level_dB = 0.0
    this.above_threshold_dB = 0.0
    this.instant_target_gain_dB = 1.0
    this.gain_linear = 1.0
    this.prev_gain_dB = 0.0
    this.gain_dB = 0.0

    this.one_minus_attack_const = 1 - this.attack_const
    this.one_minus_release_const = 1 - this.release_const

    this.c1 = 0
    this.c2 = 0
  }

  /**
   * System-invoked process callback function.
   * @param  {Array} inputs Incoming audio stream.
   * @param  {Array} outputs Outgoing audio stream.
   * @param  {Record<string, Float32Array>} parameters data.
   * @return {Boolean} Active source flag.
   */
  process(inputs, outputs, parameters) {
    try {
      if (this.firstTime) {
        console.info(
          '[processor]',
          'inputs',
          inputs.length,
          'outputs',
          outputs.length,
          'input',
          inputs[0].length,
          'output',
          outputs[0].length,
        )
      }
      if (this.isBypassed) {
        for (const [ib, inBus] of inputs.entries()) {
          const outbus = outputs[ib]
          for (const [ic, inChannel] of inBus.entries()) {
            const outChannel = outbus[ic]
            for (let sample = 0; sample < inChannel.length; ++sample) {
              outChannel[sample] = inChannel[sample]
            }
          }
        }
        return true
      }
      this.threshold = parameters.threshold[0]
      this.ratio = parameters.ratio[0]
      this.release_time = parameters.release[0]
      this.attack_time = parameters.attack[0]
      this.makeupGain = parameters.makeupGain[0]
      const mix = parameters.mix[0]

      const input = inputs[0]
      const output = outputs[0]

      const isSidechainConnected = inputs[1].length === inputs[0].length
      const useSidechain = isSidechainConnected && this.useSidechain
      const sidechainInput = useSidechain ? 1 : 0

      for (let i = 0; i < input[0].length; ++i) {
        const sidechainMono =
          0.5 * (inputs[sidechainInput][0][i] + inputs[sidechainInput][1][i])
        this.update(sidechainMono)
        const inputL = input[0][i]
        const inputR = input[1][i]
        const compressedL = inputL * this.gain_linear
        const compressedR = inputR * this.gain_linear
        output[0][i] = inputL * (1 - mix) + compressedL * mix
        output[1][i] = inputR * (1 - mix) + compressedR * mix
      }
    } catch (e) {
      if (this.useLogging) {
        console.info(e)
      }
    }
    if (this.firstTime) {
      console.info('[processor]', 'inputs', inputs, 'outputs', outputs)
      this.firstTime = false
    }
    return true
  }

  update(signal) {
    this.attack_const = Math.exp(-1.0 / (this.attack_time * this.sampleRate))
    this.release_const = Math.exp(-1.0 / (this.release_time * this.sampleRate))
    this.level_lp_const = Math.exp(-1.0 / (this.attack_time * this.sampleRate))
    this.one_minus_attack_const = 1 - this.attack_const
    this.one_minus_release_const = 1 - this.release_const
    this.comp_ratio_const = 1.0 - 1.0 / this.ratio

    this.c1 = this.level_lp_const
    this.c2 = 1.0 - this.c1

    this.wav_pow = this.c1 * this.prev_level_lp_pow + this.c2 * signal * signal
    this.prev_level_lp_pow = Math.max(this.wav_pow, 1.0e-6)
    this.level_dB = Math.log10(this.wav_pow) * 10

    this.above_threshold_dB = this.level_dB - this.threshold
    this.instant_target_gain_dB = Math.min(
      this.above_threshold_dB / this.ratio - this.above_threshold_dB,
      0,
    )
    this.gain_dB = this.instant_target_gain_dB

    if (this.gain_dB < this.prev_gain_dB) {
      this.gain_dB =
        this.attack_const * this.prev_gain_dB +
        this.one_minus_attack_const * this.gain_dB
    } else {
      this.gain_dB =
        this.release_const * this.prev_gain_dB +
        this.one_minus_release_const * this.gain_dB
    }

    this.prev_gain_dB = this.gain_dB
    this.gain_linear = Math.pow(10.0, (this.gain_dB + this.makeupGain) / 20.0)
  }
}

registerProcessor('sidechaincompressorprocessor', SidechainCompressorProcessor)
