import {
  BiquadFilter,
  Gain,
  getContext,
  InputNode,
  Oscillator,
  Player,
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

function loadNoiseBuffer() {
  // create a 5-second buffer of noise
  const lengthInSamples = 5 * getContext().sampleRate
  const noiseBuffer = getContext().createBuffer(
    1,
    lengthInSamples,
    getContext().sampleRate,
  )
  const bufferData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < lengthInSamples; ++i) {
    bufferData[i] = 2 * Math.random() - 1 // -1 to +1
  }
  return noiseBuffer
}

function initBandpassFilters(
  modulatorInput: ToneAudioNode,
  carrierInput: ToneAudioNode,
): Gain {
  const startFreq = 1
  const endFreq = 1
  const numBands = 14
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
  for (let i = -32768; i < 32768; i++) {
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

  hpFilterGain = new Gain(0)
  hpFilter.connect(hpFilterGain)

  const outputGain = new Gain(0)

  for (let i = 0; i < frequencybands.length; i++) {
    const modulatorFilter = new BiquadFilter()
    modulatorFilter.type = 'bandpass' // Bandpass filter
    modulatorFilter.frequency.value = frequencybands[i]
    modulatorFilter.Q.value = 6 // 	initial quality
    modulatorInput.connect(modulatorFilter)
    modFilterBands.push(modulatorFilter)

    const secondModulatorFilter = new BiquadFilter()
    secondModulatorFilter.type = 'bandpass' // Bandpass filter
    secondModulatorFilter.frequency.value = frequencybands[i]
    secondModulatorFilter.Q.value = 6 // 	initial quality
    // modulatorFilter.chainedFilter = secondModulatorFilter
    modulatorFilter.connect(secondModulatorFilter)

    // create a post-filtering gain to bump the levels up.
    const modulatorFilterPostGain = new Gain()
    modulatorFilterPostGain.gain.value = 6
    secondModulatorFilter.connect(modulatorFilterPostGain)
    modFilterPostGains.push(modulatorFilterPostGain)

    // Create the sine oscillator for the heterodyne
    const heterodyneOscillator = new Oscillator()
    heterodyneOscillator.type = 'sine'
    heterodyneOscillator.frequency.value = frequencybands[i]
    heterodyneOscillator.start(0)

    // Create the node to multiply the sine by the modulator
    const heterodyne = new Gain()
    modulatorFilterPostGain.connect(heterodyne)
    heterodyne.gain.value = 0.0 // audio-rate inputs are summed with initial intrinsic value
    heterodyneOscillator.connect(heterodyne.gain)

    const heterodynePostGain = new Gain()
    heterodynePostGain.gain.value = 2.0 // GUESS:  boost
    heterodyne.connect(heterodynePostGain)
    heterodynes.push(heterodynePostGain)

    // Create the rectifier node
    const rectifier = new WaveShaper()
    rectifier.curve = rectifierCurve
    heterodynePostGain.connect(rectifier)

    // Create the lowpass filter to mask off the difference (near zero)
    const lpFilter = new BiquadFilter()
    lpFilter.type = 'lowpass' // Lowpass filter
    lpFilter.frequency.value = 5.0 // Guesstimate!  Mask off 20Hz and above.
    lpFilter.Q.value = 1 // don't need a peak
    lpFilters.push(lpFilter)
    rectifier.connect(lpFilter)

    const lpFilterPostGain = new Gain()
    lpFilterPostGain.gain.value = 1.0
    lpFilter.connect(lpFilterPostGain)
    lpFilterPostGains.push(lpFilterPostGain)

    const waveshaper = new WaveShaper()
    waveshaper.curve = waveShaperCurve
    lpFilterPostGain.connect(waveshaper)

    // Create the bandpass filter in the carrier chain
    const carrierFilter = new BiquadFilter()
    carrierFilter.type = 'bandpass'
    carrierFilter.frequency.value = frequencybands[i]
    carrierFilter.Q.value = 6
    carrierBands.push(carrierFilter)
    carrierInput.connect(carrierFilter)

    // We want our carrier filters to be 4th-order filter too.
    const secondCarrierFilter = new BiquadFilter()
    secondCarrierFilter.type = 'bandpass' // Bandpass filter
    secondCarrierFilter.frequency.value = frequencybands[i]
    secondCarrierFilter.Q.value = 6 // 	initial quality
    // carrierFilter.chainedFilter = secondCarrierFilter
    carrierFilter.connect(secondCarrierFilter)

    const carrierFilterPostGain = new Gain()
    carrierFilterPostGain.gain.value = 10.0
    secondCarrierFilter.connect(carrierFilterPostGain)
    carrierFilterPostGains.push(carrierFilterPostGain)

    // Create the carrier band gain node
    const bandGain = new Gain()
    bandGain.gain.value = 0.0

    // audio-rate inputs are summed with initial intrinsic value
    carrierBandGains.push(bandGain)
    carrierFilterPostGain.connect(bandGain)

    // connect the lp controller
    waveshaper.connect(bandGain.gain)

    // up
    bandGain.connect(outputGain)
  }

  return outputGain
}

function createLPInputFilter(output: ToneAudioNode) {
  const lpInputFilter = new BiquadFilter()
  lpInputFilter.connect(output)
  lpInputFilter.frequency.value = 2048
  return lpInputFilter
}

function generateNoiseFloorCurve(floor: number) {
  // "floor" is 0...1
  const curve = new Float32Array(65536)
  const mappedFloor = floor * 32768

  for (let i = 0; i < 32768; i++) {
    const value = i < mappedFloor ? 0 : 1
    curve[32768 - i] = -value
    curve[32768 + i] = value
  }
  curve[0] = curve[1] // fixing up the end.

  return curve
}

function createNoiseGate(connectTo: ToneAudioNode) {
  const inputNode = new Gain()
  const rectifier = new WaveShaper()
  const ngFollower = new BiquadFilter()
  ngFollower.type = 'lowpass'
  ngFollower.frequency.value = 10.0

  const curve = new Float32Array(65536)
  for (let i = -32768; i < 32768; i++)
    curve[i + 32768] = (i > 0 ? i : -i) / 32768
  rectifier.curve = curve
  rectifier.connect(ngFollower)

  const ngGate = new WaveShaper()
  ngGate.curve = generateNoiseFloorCurve(0.01)

  ngFollower.connect(ngGate)

  const gateGain = new Gain()
  gateGain.gain.value = 0.0
  ngGate.connect(gateGain.gain)

  gateGain.connect(connectTo)

  inputNode.connect(rectifier)
  inputNode.connect(gateGain)
  return inputNode
}

export function getvocoder(carrierInput: ToneAudioNode) {
  // const modulatorGain = new Gain(1.0)
  // modulatorGain.connect(carrierInput)
  // // create a noise gate
  // carrierInput.connect(createLPInputFilter(createNoiseGate(modulatorGain)))
  // // attach filter
  // initBandpassFilters(modulatorGain, carrierInput)
  // // setup noise
  // const noise = new Player(loadNoiseBuffer())
  // noise.loop = true
  // const noiseGain = new Gain(0.4)
  // noise.chain(noiseGain, carrierInput)
  // const oscillator = new Oscillator()
  // oscillator.type = 'sawtooth'
  // oscillator.frequency.value = 110
  // oscillator.detune.value = 0
  // const oscillatorGain = new Gain(1.0)
  // oscillator.chain(oscillatorGain, carrierInput)
  // noise.start()
  // oscillator.start()
}
