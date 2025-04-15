import { BiquadFilter, Gain, getContext } from 'tone'
import { ispresent, MAYBE } from 'zss/mapping/types'

// const output = getContext().createGain()

// let noiseBuffer: MAYBE<AudioBuffer>
// let noiseGain: MAYBE<GainNode>

// let modulatorInput: MAYBE<GainNode>
// let modulatorNode: MAYBE<GainNode>
const modFilterBands: AudioNode[] = []
const modFilterPostGains: AudioNode[] = []

const heterodynes: AudioNode[] = []
let hpFilterGain: MAYBE<GainNode>

const lpFilters: AudioNode[] = []
const lpFilterPostGains: AudioNode[] = []

const carrierBands: AudioNode[] = []
const carrierFilterPostGains: AudioNode[] = []
const carrierBandGains: AudioNode[] = []

// let carrierInput: MAYBE<GainNode>

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

const startFreq = 1
const endFreq = 1
const numBands = 14
const frequencybands: number[] = []
const totalRangeInCents = (1200 * Math.log(endFreq / startFreq)) / Math.LN2
const centsPerBand = totalRangeInCents / numBands
const scale = Math.pow(2, centsPerBand / 1200) // This is the scaling for successive bands

let currentFreq = startFreq
for (let i = 0; i < numBands; i++) {
  frequencybands.push(currentFreq)
  currentFreq = currentFreq * scale
}

function initBandpassFilters(sourceInput: Gain, carrierInput: Gain) {
  const audiocontext = getContext()

  // Populate with a "curve" that does an abs()
  const n = 65536
  const n2 = n / 2
  const waveShaperCurve = new Float32Array(n)
  for (let i = 0; i < n2; ++i) {
    const x = i / n2
    waveShaperCurve[n2 + i] = x
    waveShaperCurve[n2 - i - 1] = x
  }

  // Set up a high-pass filter to add back in the fricatives, etc.
  // (this isn't used by default in the "production" version, as I hid the slider)
  const hpFilter = new BiquadFilter({
    type: 'highpass',
    frequency: 8000,
    Q: 1,
  })
  sourceInput.connect(hpFilter)

  const hpFilterGain = new Gain(0)
  hpFilter.connect(hpFilterGain)

  const outputGain = audiocontext.createGain()

  const rectifierCurve = new Float32Array(65536)
  for (let i = -32768; i < 32768; i++) {
    rectifierCurve[i + 32768] = (i > 0 ? i : -i) / 32768
  }

  for (let i = 0; i < frequencybands.length; i++) {
    const modulatorFilter = audiocontext.createBiquadFilter()
    modulatorFilter.type = 'bandpass' // Bandpass filter
    modulatorFilter.frequency.value = frequencybands[i]
    modulatorFilter.Q.value = 6 // 	initial quality
    sourceInput.connect(modulatorFilter)
    modFilterBands.push(modulatorFilter)

    const secondModulatorFilter = audiocontext.createBiquadFilter()
    secondModulatorFilter.type = 'bandpass' // Bandpass filter
    secondModulatorFilter.frequency.value = frequencybands[i]
    secondModulatorFilter.Q.value = 6 // 	initial quality
    // modulatorFilter.chainedFilter = secondModulatorFilter
    modulatorFilter.connect(secondModulatorFilter)

    // create a post-filtering gain to bump the levels up.
    const modulatorFilterPostGain = audiocontext.createGain()
    modulatorFilterPostGain.gain.value = 6
    secondModulatorFilter.connect(modulatorFilterPostGain)
    modFilterPostGains.push(modulatorFilterPostGain)

    // Create the sine oscillator for the heterodyne
    const heterodyneOscillator = audiocontext.createOscillator()
    heterodyneOscillator.frequency.value = frequencybands[i]
    heterodyneOscillator.start(0)

    // Create the node to multiply the sine by the modulator
    const heterodyne = audiocontext.createGain()
    modulatorFilterPostGain.connect(heterodyne)
    heterodyne.gain.value = 0.0 // audio-rate inputs are summed with initial intrinsic value
    heterodyneOscillator.connect(heterodyne.gain)

    const heterodynePostGain = audiocontext.createGain()
    heterodynePostGain.gain.value = 2.0 // GUESS:  boost
    heterodyne.connect(heterodynePostGain)
    heterodynes.push(heterodynePostGain)

    // Create the rectifier node
    const rectifier = audiocontext.createWaveShaper()
    rectifier.curve = rectifierCurve
    heterodynePostGain.connect(rectifier)

    // Create the lowpass filter to mask off the difference (near zero)
    const lpFilter = audiocontext.createBiquadFilter()
    lpFilter.type = 'lowpass' // Lowpass filter
    lpFilter.frequency.value = 5.0 // Guesstimate!  Mask off 20Hz and above.
    lpFilter.Q.value = 1 // don't need a peak
    lpFilters.push(lpFilter)
    rectifier.connect(lpFilter)

    const lpFilterPostGain = audiocontext.createGain()
    lpFilterPostGain.gain.value = 1.0
    lpFilter.connect(lpFilterPostGain)
    lpFilterPostGains.push(lpFilterPostGain)

    const waveshaper = audiocontext.createWaveShaper()
    waveshaper.curve = waveShaperCurve
    lpFilterPostGain.connect(waveshaper)

    // Create the bandpass filter in the carrier chain
    const carrierFilter = audiocontext.createBiquadFilter()
    carrierFilter.type = 'bandpass'
    carrierFilter.frequency.value = frequencybands[i]
    carrierFilter.Q.value = 6
    carrierBands.push(carrierFilter)
    carrierInput.connect(carrierFilter)

    // We want our carrier filters to be 4th-order filter too.
    const secondCarrierFilter = audiocontext.createBiquadFilter()
    secondCarrierFilter.type = 'bandpass' // Bandpass filter
    secondCarrierFilter.frequency.value = frequencybands[i]
    secondCarrierFilter.Q.value = 6 // 	initial quality
    // carrierFilter.chainedFilter = secondCarrierFilter
    carrierFilter.connect(secondCarrierFilter)

    const carrierFilterPostGain = audiocontext.createGain()
    carrierFilterPostGain.gain.value = 10.0
    secondCarrierFilter.connect(carrierFilterPostGain)
    carrierFilterPostGains.push(carrierFilterPostGain)

    // Create the carrier band gain node
    const bandGain = audiocontext.createGain()
    carrierBandGains.push(bandGain)
    carrierFilterPostGain.connect(bandGain)
    bandGain.gain.value = 0.0 // audio-rate inputs are summed with initial intrinsic value
    waveshaper.connect(bandGain.gain) // connect the lp controller

    bandGain.connect(outputGain)
  }

  //
}

// function createCarriersAndPlay(output: AudioNode) {
//   const audioContext = getContext()
//   const wavetableSignalGain = audioContext.createGain()

//   const oscillatorNode = audioContext.createOscillator()
//   oscillatorNode.type = 'sawtooth'
//   wavetableSignalGain.gain.value = 0.4

//   oscillatorNode.frequency.value = 110
//   oscillatorNode.detune.value = 0
//   oscillatorNode.connect(wavetableSignalGain)

//   const oscillatorGain = audioContext.createGain()
//   oscillatorGain.gain.value = 1

//   wavetableSignalGain.connect(oscillatorGain)
//   oscillatorGain.connect(output)

//   const noiseNode = audioContext.createBufferSource()
//   if (ispresent(noiseBuffer)) {
//     noiseNode.buffer = noiseBuffer
//     noiseNode.loop = true
//     noiseGain = audioContext.createGain()
//     noiseGain.gain.value = 0.2
//     noiseNode.connect(noiseGain)
//   }

//   if (ispresent(noiseGain)) {
//     noiseGain.connect(output)
//     oscillatorNode.start(0)
//     noiseNode.start(0)
//   }
// }

// export function vocode(input: GainNode): AudioNode {
//   createCarriersAndPlay(input)
//   return output
// }

// // function getUserMedia(dictionary, callback) {
// //   try {
// //     if (!navigator.getUserMedia)
// //       navigator.getUserMedia =
// //         navigator.webkitGetUserMedia || navigator.mozGetUserMedia
// //     navigator.getUserMedia(dictionary, callback, error)
// //   } catch (e) {
// //     alert('getUserMedia threw exception :' + e)
// //   }
// // }

// function convertToMono(input: AudioNode) {
//   const audiocontext = getContext()
//   const splitter = audiocontext.createChannelSplitter(2)
//   const merger = audiocontext.createChannelMerger(2)

//   input.connect(splitter)
//   splitter.connect(merger, 0, 0)
//   splitter.connect(merger, 0, 1)
//   return merger
// }

// function generateNoiseFloorCurve(floor: number) {
//   // "floor" is 0...1

//   const curve = new Float32Array(65536)
//   const mappedFloor = floor * 32768

//   for (let i = 0; i < 32768; i++) {
//     const value = i < mappedFloor ? 0 : 1

//     curve[32768 - i] = -value
//     curve[32768 + i] = value
//   }
//   curve[0] = curve[1] // fixing up the end.

//   return curve
// }

// function createNoiseGate(connectTo: AudioNode) {
//   const audiocontext = getContext()
//   const inputNode = audiocontext.createGain()
//   const rectifier = audiocontext.createWaveShaper()
//   const ngFollower = audiocontext.createBiquadFilter()
//   ngFollower.type = 'lowpass'
//   ngFollower.frequency.value = 10.0

//   const curve = new Float32Array(65536)
//   for (let i = -32768; i < 32768; i++)
//     curve[i + 32768] = (i > 0 ? i : -i) / 32768
//   rectifier.curve = curve
//   rectifier.connect(ngFollower)

//   const ngGate = audiocontext.createWaveShaper()
//   ngGate.curve = generateNoiseFloorCurve(0.01)

//   ngFollower.connect(ngGate)

//   const gateGain = audiocontext.createGain()
//   gateGain.gain.value = 0.0
//   ngGate.connect(gateGain.gain)

//   gateGain.connect(connectTo)

//   inputNode.connect(rectifier)
//   inputNode.connect(gateGain)
//   return inputNode
// }

// let lpInputFilter = null

// // this is ONLY because we have massive feedback without filtering out
// // the top end in live speaker scenarios.
// function createLPInputFilter(output: AudioNode) {
//   lpInputFilter = getContext().createBiquadFilter()
//   lpInputFilter.connect(output)
//   lpInputFilter.frequency.value = 2048
//   return lpInputFilter
// }

// // function gotStream(stream) {
// //   // Create an AudioNode from the stream.
// //   const mediaStreamSource = audioContext.createMediaStreamSource(stream)

// //   modulatorGain = audioContext.createGain()
// //   modulatorGain.gain.value = modulatorGainValue
// //   modulatorGain.connect(modulatorInput)

// //   // make sure the source is mono - some sources will be left-side only
// //   const monoSource = convertToMono(mediaStreamSource)

// //   //create a noise gate
// //   monoSource.connect(createLPInputFilter(createNoiseGate(modulatorGain)))

// //   createCarriersAndPlay(carrierInput)

// //   vocoding = true
// //   liveInput = true

// //   window.requestAnimationFrame(updateAnalysers)
// // }

// // function useLiveInput() {
// //   initAudio() // Make sure audioContext is started.
// //   if (vocoding) {
// //     if (modulatorNode) modulatorNode.stop(0)
// //     shutOffCarrier()
// //     vocoding = false
// //     cancelVocoderUpdates()
// //     if (endOfModulatorTimer) window.clearTimeout(endOfModulatorTimer)
// //     endOfModulatorTimer = 0
// //   } else if (
// //     document.getElementById('carrierpreview').classList.contains('playing')
// //   )
// //     finishPreviewingCarrier()
// //   else if (
// //     document.getElementById('modulatorpreview').classList.contains('playing')
// //   )
// //     finishPreviewingModulator()

// //   getUserMedia(
// //     {
// //       audio: {
// //         mandatory: {
// //           googEchoCancellation: 'false',
// //           googAutoGainControl: 'false',
// //           googNoiseSuppression: 'false',
// //           googHighpassFilter: 'false',
// //         },
// //         optional: [],
// //       },
// //     },
// //     gotStream,
// //   )
// // }

// // window.addEventListener(
// //   'keydown',
// //   function (ev) {
// //     let centOffset
// //     switch (ev.keyCode) {
// //       case 'A'.charCodeAt(0):
// //         centOffset = -700
// //         break
// //       case 'W'.charCodeAt(0):
// //         centOffset = -600
// //         break
// //       case 'S'.charCodeAt(0):
// //         centOffset = -500
// //         break
// //       case 'E'.charCodeAt(0):
// //         centOffset = -400
// //         break
// //       case 'D'.charCodeAt(0):
// //         centOffset = -300
// //         break
// //       case 'R'.charCodeAt(0):
// //         centOffset = -200
// //         break
// //       case 'F'.charCodeAt(0):
// //         centOffset = -100
// //         break
// //       case 'G'.charCodeAt(0):
// //         centOffset = 0
// //         break
// //       case 'Y'.charCodeAt(0):
// //         centOffset = 100
// //         break
// //       case 'H'.charCodeAt(0):
// //         centOffset = 200
// //         break
// //       case 'U'.charCodeAt(0):
// //         centOffset = 300
// //         break
// //       case 'J'.charCodeAt(0):
// //         centOffset = 400
// //         break
// //       case 'K'.charCodeAt(0):
// //         centOffset = 500
// //         break
// //       case 'O'.charCodeAt(0):
// //         centOffset = 600
// //         break
// //       case 'L'.charCodeAt(0):
// //         centOffset = 700
// //         break
// //       case 'P'.charCodeAt(0):
// //         centOffset = 800
// //         break
// //       case 186: // ;
// //         centOffset = 900
// //         break
// //       case 219: // [
// //         centOffset = 1000
// //         break
// //       case 222: // '
// //         centOffset = 1100
// //         break
// //       default:
// //         return
// //     }
// //     const detunegroup = document.getElementById('detunegroup')
// //     $(detunegroup.children[1]).slider('value', centOffset)
// //     updateSlider(detunegroup, centOffset, ' cents')
// //     if (oscillatorNode) oscillatorNode.detune.value = centOffset
// //   },
// //   false,
// // )
