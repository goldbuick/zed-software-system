import {
  BiquadFilter,
  Gain,
  Noise,
  Oscillator,
  ToneAudioNode,
  WaveShaper,
} from 'tone'
import { MAYBE } from 'zss/mapping/types'

const modFilterBands: BiquadFilter[] = []
const modFilterPostGains: Gain[] = []

const heterodynes: Gain[] = []

let hpFilterGain: MAYBE<Gain>

const lpFilters: BiquadFilter[] = []
const lpFilterPostGains: Gain[] = []

const carrierBands: BiquadFilter[] = []
const carrierBandGains: Gain[] = []
const carrierFilterPostGains: Gain[] = []

function initBandpassFilters(
  modulatorInput: ToneAudioNode,
  carrierInput: ToneAudioNode,
): Gain {
  const startFreq = 50
  const endFreq = 7040
  const numBands = 32
  const frequencybands: number[] = []
  const totalRangeInCents = (1200 * Math.log(endFreq / startFreq)) / Math.LN2
  const centsPerBand = totalRangeInCents / numBands
  // This is the scaling for successive bands
  const scale = Math.pow(2, centsPerBand / 1200)

  let currentFreq = startFreq
  for (let i = 0; i < numBands; i++) {
    frequencybands.push(currentFreq)
    currentFreq = currentFreq * scale
  }

  // Populate with a "curve" that does an abs()
  const n = 65536
  const n2 = n / 2
  const waveShaperCurve = new Float32Array(n)
  for (let i = 0; i < n2; ++i) {
    const x = i / n2
    waveShaperCurve[n2 + i] = x
    waveShaperCurve[n2 - i - 1] = x
  }

  const rectifierCurve = new Float32Array(65536)
  for (let i = -32768; i < 32768; ++i) {
    rectifierCurve[i + 32768] = (i > 0 ? i : -i) / 32768
  }

  // Set up a high-pass filter to add back in the fricatives, etc.
  // (this isn't used by default in the "production" version, as I hid the slider)
  const hpFilter = new BiquadFilter({
    type: 'highpass',
    frequency: 8000,
    Q: 1,
  })
  modulatorInput.connect(hpFilter)

  hpFilterGain = new Gain(2)
  hpFilter.connect(hpFilterGain)
  hpFilterGain.toDestination()

  const outputGain = new Gain()

  for (let i = 0; i < frequencybands.length; i++) {
    const modulatorFilter = new BiquadFilter({
      type: 'bandpass',
      frequency: frequencybands[i],
      Q: 1, // 	initial quality
    })
    modulatorInput.connect(modulatorFilter)

    modFilterBands.push(modulatorFilter)

    const secondModulatorFilter = new BiquadFilter({
      type: 'bandpass',
      frequency: frequencybands[i],
      Q: 1, // 	initial quality
    })
    modulatorFilter.connect(secondModulatorFilter)

    // create a post-filtering gain to bump the levels up.
    const modulatorFilterPostGain = new Gain(6)
    secondModulatorFilter.connect(modulatorFilterPostGain)

    modFilterPostGains.push(modulatorFilterPostGain)

    // Create the sine oscillator for the heterodyne
    const heterodyneOscillator = new Oscillator({
      type: 'sine',
      frequency: frequencybands[i],
    })
    heterodyneOscillator.start()

    // Create the node to multiply the sine by the modulator
    const heterodyne = new Gain()
    modulatorFilterPostGain.connect(heterodyne)
    heterodyneOscillator.connect(heterodyne.gain)

    const heterodynePostGain = new Gain(2)
    heterodyne.connect(heterodynePostGain)

    heterodynes.push(heterodynePostGain)

    // Create the rectifier node
    const rectifier = new WaveShaper({
      curve: rectifierCurve,
    })
    heterodynePostGain.connect(rectifier)

    // Create the lowpass filter to mask off the difference (near zero)
    const lpFilter = new BiquadFilter({
      type: 'lowpass',
      frequency: 5.0, // Guesstimate!  Mask off 20Hz and above.
      Q: 1,
    })
    rectifier.connect(lpFilter)

    lpFilters.push(lpFilter)

    const lpFilterPostGain = new Gain()
    lpFilter.connect(lpFilterPostGain)

    lpFilterPostGains.push(lpFilterPostGain)

    const waveshaper = new WaveShaper({ curve: waveShaperCurve })
    lpFilterPostGain.connect(waveshaper)

    // Create the bandpass filter in the carrier chain
    const carrierFilter = new BiquadFilter({
      type: 'bandpass',
      frequency: frequencybands[i],
      Q: 1, // 	initial quality
    })
    carrierInput.connect(carrierFilter)

    carrierBands.push(carrierFilter)

    // We want our carrier filters to be 4th-order filter too.
    const secondCarrierFilter = new BiquadFilter({
      type: 'bandpass', // Bandpass filter
      frequency: frequencybands[i],
      Q: 1, // 	initial quality
    })
    carrierFilter.connect(secondCarrierFilter)

    const carrierFilterPostGain = new Gain(10)
    secondCarrierFilter.connect(carrierFilterPostGain)

    carrierFilterPostGains.push(carrierFilterPostGain)

    // Create the carrier band gain node
    const carrierBandGain = new Gain()
    carrierFilterPostGain.connect(carrierBandGain)

    carrierBandGains.push(carrierBandGain)

    // connect the lp controller
    waveshaper.connect(carrierBandGain.gain)

    // connect the output
    carrierBandGain.connect(outputGain)
  }

  return outputGain
}

export function getvocoder(userinput: ToneAudioNode) {
  const lpInputFilter = new BiquadFilter({ frequency: 2048 })
  userinput.connect(lpInputFilter)

  const lpInputFilterPostGain = new Gain()
  lpInputFilter.connect(lpInputFilterPostGain)

  // setup a carrier wave
  const carrier = new Gain(4)

  // setup noise
  const noise = new Noise('white')

  const noisegain = new Gain(0.2)
  noise.chain(noisegain, carrier)
  noise.start()

  const oscillator = new Oscillator({
    type: 'sawtooth',
    frequency: 100,
    detune: 0,
  })

  const oscillatorGain = new Gain(0.66)
  oscillator.chain(oscillatorGain, carrier)
  oscillator.start()

  // attach filter
  return initBandpassFilters(lpInputFilterPostGain, carrier)
}
