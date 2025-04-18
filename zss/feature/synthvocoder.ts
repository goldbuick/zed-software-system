import {
  Filter,
  Follower,
  Gain,
  Oscillator,
  ToneAudioNode,
  Noise,
  NoiseType,
} from 'tone'
import { NonCustomOscillatorType } from 'tone/build/esm/source/oscillator/OscillatorInterface'

export function getvocoder(
  input: ToneAudioNode,
  frequency: number,
  osckind: NonCustomOscillatorType,
  noisekind: NoiseType,
) {
  // Define a set of center frequencies for the vocoder bands
  let currentFreq = 55
  const numBands = 24
  const totalRangeInCents = (1200 * Math.log(9600 / currentFreq)) / Math.LN2
  const centsPerBand = totalRangeInCents / numBands
  const scale = Math.pow(2, centsPerBand / 1200) // This is the scaling for successive bands
  const bands: number[] = []
  for (let i = 0; i < numBands; i++) {
    bands.push(Math.round(currentFreq))
    currentFreq = currentFreq * scale
  }

  // Arrays to hold our carrier oscillators and their gain modulators
  const vocoderGains: Gain[] = []

  const wiggle = new Oscillator({
    type: osckind,
    frequency,
    detune: 0,
  }).start()

  const noise = new Noise(noisekind).start()

  const inputGain = new Gain(4)
  input.connect(inputGain)

  // For each frequency band, set up a band-pass filter, envelope follower, and a carrier oscillator
  for (let i = 0; i < bands.length; ++i) {
    const freq = bands[i]
    // Create a bandpass filter to isolate the modulator signal for this band
    const bandpass = new Filter({
      frequency: freq,
      type: 'bandpass',
      Q: 10,
    })

    // Create an envelope follower to track the amplitude of the filtered signal
    const follower = new Follower(0.005)

    // Connect the microphone signal to the bandpass filter and then to the follower
    inputGain.connect(bandpass)
    bandpass.connect(follower)

    // Create a gain node with an initial gain of 0.
    // We’ll use the follower output to modulate this gain value.
    const gainNode = new Gain(0)

    // Create a sine oscillator as the carrier for this band, set at the same frequency
    const osc = new Oscillator({
      type: 'sine',
      frequency: freq,
    }).start()

    const modfx = new Filter({
      frequency: freq,
      type: 'bandpass',
      Q: 10,
    })
    noise.connect(modfx)
    wiggle.connect(modfx)

    const modfxGain = new Gain(10)
    modfx.connect(modfxGain)

    // connect to output
    osc.connect(gainNode)
    modfxGain.connect(gainNode)

    // Connect the envelope follower to the gain node's gain AudioParam.
    // This causes the amplitude of the carrier to follow the intensity of the modulator signal.
    follower.connect(gainNode.gain)

    // Save the gain node for mixing
    vocoderGains.push(gainNode)
  }

  // Mix all the modulated carriers together and send to the destination
  const vocoderMixer = new Gain()
  vocoderGains.forEach((gain) => gain.connect(vocoderMixer))

  return vocoderMixer
}
