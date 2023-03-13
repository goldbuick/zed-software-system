// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { getAudioContext, getAudioMusicOutput } from '@/gadget/snd/context'

import { Deque } from './Deque'
import { scaleElementsByFactor, inverseRealFourierTransform } from './FFT'
import {
  FilterCoefficients,
  FrequencyResponse,
  DynamicBiquadFilter,
} from './filtering'
import {
  Dictionary,
  DictionaryArray,
  FilterType,
  EnvelopeType,
  InstrumentType,
  EffectType,
  NoteAutomationIndex,
  Transition,
  Unison,
  Chord,
  Vibrato,
  Envelope,
  AutomationTarget,
  Config,
  getDrumWave,
  drawNoiseSpectrum,
  getArpeggioPitchIndex,
  performIntegral,
  getPulseWidthRatio,
  effectsIncludeTransition,
  effectsIncludeChord,
  effectsIncludePitchShift,
  effectsIncludeDetune,
  effectsIncludeVibrato,
  effectsIncludeNoteFilter,
  effectsIncludeDistortion,
  effectsIncludeBitcrusher,
  effectsIncludePanning,
  effectsIncludeChorus,
  effectsIncludeEcho,
  effectsIncludeReverb,
} from './SynthConfig'

declare global {
  interface Window {
    AudioContext: any
    webkitAudioContext: any
  }
}

const epsilon = 1.0e-24 // For detecting and avoiding float denormals, which have poor performance.

// For performance debugging:
//let samplesAccumulated: number = 0;
//let samplePerformance: number = 0;

const enum CharCode {
  SPACE = 32,
  HASH = 35,
  PERCENT = 37,
  AMPERSAND = 38,
  PLUS = 43,
  DASH = 45,
  DOT = 46,
  NUM_0 = 48,
  NUM_1 = 49,
  NUM_2 = 50,
  NUM_3 = 51,
  NUM_4 = 52,
  NUM_5 = 53,
  NUM_6 = 54,
  NUM_7 = 55,
  NUM_8 = 56,
  NUM_9 = 57,
  EQUALS = 61,
  A = 65,
  B = 66,
  C = 67,
  D = 68,
  E = 69,
  F = 70,
  G = 71,
  H = 72,
  I = 73,
  J = 74,
  K = 75,
  L = 76,
  M = 77,
  N = 78,
  O = 79,
  P = 80,
  Q = 81,
  R = 82,
  S = 83,
  T = 84,
  U = 85,
  V = 86,
  W = 87,
  X = 88,
  Y = 89,
  Z = 90,
  UNDERSCORE = 95,
  a = 97,
  b = 98,
  c = 99,
  d = 100,
  e = 101,
  f = 102,
  g = 103,
  h = 104,
  i = 105,
  j = 106,
  k = 107,
  l = 108,
  m = 109,
  n = 110,
  o = 111,
  p = 112,
  q = 113,
  r = 114,
  s = 115,
  t = 116,
  u = 117,
  v = 118,
  w = 119,
  x = 120,
  y = 121,
  z = 122,
  LEFT_CURLY_BRACE = 123,
  RIGHT_CURLY_BRACE = 125,
}

const enum SongTagCode {
  beatCount = CharCode.a, // added in song url version 2
  bars = CharCode.b, // added in 2
  vibrato = CharCode.c, // added in 2, DEPRECATED
  fadeInOut = CharCode.d, // added in 3 for transition, switched to fadeInOut in 9
  loopEnd = CharCode.e, // added in 2
  eqFilter = CharCode.f, // added in 3
  barCount = CharCode.g, // added in 3
  unison = CharCode.h, // added in 2
  instrumentCount = CharCode.i, // added in 3
  patternCount = CharCode.j, // added in 3
  key = CharCode.k, // added in 2
  loopStart = CharCode.l, // added in 2
  reverb = CharCode.m, // added in 5, DEPRECATED
  channelCount = CharCode.n, // added in 6
  channelOctave = CharCode.o, // added in 3
  patterns = CharCode.p, // added in 2
  effects = CharCode.q, // added in 7
  rhythm = CharCode.r, // added in 2
  scale = CharCode.s, // added in 2
  tempo = CharCode.t, // added in 2
  preset = CharCode.u, // added in 7
  volume = CharCode.v, // added in 2
  wave = CharCode.w, // added in 2

  filterResonance = CharCode.y, // added in 7, DEPRECATED
  drumsetEnvelopes = CharCode.z, // added in 7 for filter envelopes, still used for drumset envelopes
  algorithm = CharCode.A, // added in 6
  feedbackAmplitude = CharCode.B, // added in 6
  chord = CharCode.C, // added in 7, DEPRECATED

  envelopes = CharCode.E, // added in 6 for FM operator envelopes, repurposed in 9 for general envelopes.
  feedbackType = CharCode.F, // added in 6

  harmonics = CharCode.H, // added in 7
  stringSustain = CharCode.I, // added in 9

  pan = CharCode.L, // added between 8 and 9, DEPRECATED

  operatorAmplitudes = CharCode.P, // added in 6
  operatorFrequencies = CharCode.Q, // added in 6

  spectrum = CharCode.S, // added in 7
  startInstrument = CharCode.T, // added in 6

  feedbackEnvelope = CharCode.V, // added in 6, DEPRECATED
  pulseWidth = CharCode.W, // added in 7
}

const base64IntToCharCode: ReadonlyArray<number> = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104,
  105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
  120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95,
]
const base64CharCodeToInt: ReadonlyArray<number> = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2,
  3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44,
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0,
  0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0,
] // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".

class BitFieldReader {
  private _bits: number[] = []
  private _readIndex = 0

  constructor(source: string, startIndex: number, stopIndex: number) {
    for (let i: number = startIndex; i < stopIndex; i++) {
      const value: number = base64CharCodeToInt[source.charCodeAt(i)]
      this._bits.push((value >> 5) & 0x1)
      this._bits.push((value >> 4) & 0x1)
      this._bits.push((value >> 3) & 0x1)
      this._bits.push((value >> 2) & 0x1)
      this._bits.push((value >> 1) & 0x1)
      this._bits.push(value & 0x1)
    }
  }

  public read(bitCount: number): number {
    let result = 0
    while (bitCount > 0) {
      result = result << 1
      result += this._bits[this._readIndex++]
      bitCount--
    }
    return result
  }

  public readLongTail(minValue: number, minBits: number): number {
    let result: number = minValue
    let numBits: number = minBits
    while (this._bits[this._readIndex++]) {
      result += 1 << numBits
      numBits++
    }
    while (numBits > 0) {
      numBits--
      if (this._bits[this._readIndex++]) {
        result += 1 << numBits
      }
    }
    return result
  }

  public readPartDuration(): number {
    return this.readLongTail(1, 3)
  }

  public readLegacyPartDuration(): number {
    return this.readLongTail(1, 2)
  }

  public readPinCount(): number {
    return this.readLongTail(1, 0)
  }

  public readPitchInterval(): number {
    if (this.read(1)) {
      return -this.readLongTail(1, 3)
    } else {
      return this.readLongTail(1, 3)
    }
  }
}

class BitFieldWriter {
  private _index = 0
  private _bits: number[] = []

  public clear() {
    this._index = 0
  }

  public write(bitCount: number, value: number): void {
    bitCount--
    while (bitCount >= 0) {
      this._bits[this._index++] = (value >>> bitCount) & 1
      bitCount--
    }
  }

  public writeLongTail(minValue: number, minBits: number, value: number): void {
    if (value < minValue) throw new Error('value out of bounds')
    value -= minValue
    let numBits: number = minBits
    while (value >= 1 << numBits) {
      this._bits[this._index++] = 1
      value -= 1 << numBits
      numBits++
    }
    this._bits[this._index++] = 0
    while (numBits > 0) {
      numBits--
      this._bits[this._index++] = (value >>> numBits) & 1
    }
  }

  public writePartDuration(value: number): void {
    this.writeLongTail(1, 3, value)
  }

  public writePinCount(value: number): void {
    this.writeLongTail(1, 0, value)
  }

  public writePitchInterval(value: number): void {
    if (value < 0) {
      this.write(1, 1) // sign
      this.writeLongTail(1, 3, -value)
    } else {
      this.write(1, 0) // sign
      this.writeLongTail(1, 3, value)
    }
  }

  public concat(other: BitFieldWriter): void {
    for (let i = 0; i < other._index; i++) {
      this._bits[this._index++] = other._bits[i]
    }
  }

  public encodeBase64(buffer: number[]): number[] {
    for (let i = 0; i < this._index; i += 6) {
      const value: number =
        (this._bits[i] << 5) |
        (this._bits[i + 1] << 4) |
        (this._bits[i + 2] << 3) |
        (this._bits[i + 3] << 2) |
        (this._bits[i + 4] << 1) |
        this._bits[i + 5]
      buffer.push(base64IntToCharCode[value])
    }
    return buffer
  }

  public lengthBase64(): number {
    return Math.ceil(this._index / 6)
  }
}

export interface NotePin {
  interval: number
  time: number
  size: number
}

export function makeNotePin(
  interval: number,
  time: number,
  size: number,
): NotePin {
  return { interval: interval, time: time, size: size }
}

export function clamp(min: number, max: number, val: number): number {
  max = max - 1
  if (val <= max) {
    if (val >= min) return val
    else return min
  } else {
    return max
  }
}

function validateRange(min: number, max: number, val: number): number {
  if (min <= val && val <= max) return val
  throw new Error(`Value ${val} not in range [${min}, ${max}]`)
}

export class Note {
  public pitches: number[]
  public pins: NotePin[]
  public start: number
  public end: number
  public continuesLastPattern: boolean

  public constructor(
    pitch: number,
    start: number,
    end: number,
    size: number,
    fadeout = false,
  ) {
    this.pitches = [pitch]
    this.pins = [
      makeNotePin(0, 0, size),
      makeNotePin(0, end - start, fadeout ? 0 : size),
    ]
    this.start = start
    this.end = end
    this.continuesLastPattern = false
  }

  public pickMainInterval(): number {
    let longestFlatIntervalDuration = 0
    let mainInterval = 0
    for (let pinIndex = 1; pinIndex < this.pins.length; pinIndex++) {
      const pinA: NotePin = this.pins[pinIndex - 1]
      const pinB: NotePin = this.pins[pinIndex]
      if (pinA.interval == pinB.interval) {
        const duration: number = pinB.time - pinA.time
        if (longestFlatIntervalDuration < duration) {
          longestFlatIntervalDuration = duration
          mainInterval = pinA.interval
        }
      }
    }
    if (longestFlatIntervalDuration == 0) {
      let loudestSize = 0
      for (let pinIndex = 0; pinIndex < this.pins.length; pinIndex++) {
        const pin: NotePin = this.pins[pinIndex]
        if (loudestSize < pin.size) {
          loudestSize = pin.size
          mainInterval = pin.interval
        }
      }
    }
    return mainInterval
  }

  public clone(): Note {
    const newNote: Note = new Note(-1, this.start, this.end, Config.noteSizeMax)
    newNote.pitches = this.pitches.concat()
    newNote.pins = []
    for (const pin of this.pins) {
      newNote.pins.push(makeNotePin(pin.interval, pin.time, pin.size))
    }
    newNote.continuesLastPattern = this.continuesLastPattern
    return newNote
  }

  public getEndPinIndex(part: number): number {
    let endPinIndex: number
    for (endPinIndex = 1; endPinIndex < this.pins.length - 1; endPinIndex++) {
      if (this.pins[endPinIndex].time + this.start > part) break
    }
    return endPinIndex
  }
}

export class Pattern {
  public notes: Note[] = []
  public readonly instruments: number[] = [0]

  public cloneNotes(): Note[] {
    const result: Note[] = []
    for (const note of this.notes) {
      result.push(note.clone())
    }
    return result
  }

  public reset(): void {
    this.notes.length = 0
    this.instruments[0] = 0
    this.instruments.length = 1
  }
}

export class Operator {
  public frequency = 0
  public amplitude = 0

  constructor(index: number) {
    this.reset(index)
  }

  public reset(index: number): void {
    this.frequency = 0
    this.amplitude = index <= 1 ? Config.operatorAmplitudeMax : 0
  }
}

export class SpectrumWave {
  public spectrum: number[] = []
  private _wave: Float32Array | null = null
  private _waveIsReady = false

  constructor(isNoiseChannel: boolean) {
    this.reset(isNoiseChannel)
  }

  public reset(isNoiseChannel: boolean): void {
    for (let i = 0; i < Config.spectrumControlPoints; i++) {
      if (isNoiseChannel) {
        this.spectrum[i] = Math.round(
          Config.spectrumMax * (1 / Math.sqrt(1 + i / 3)),
        )
      } else {
        const isHarmonic: boolean =
          i == 0 ||
          i == 7 ||
          i == 11 ||
          i == 14 ||
          i == 16 ||
          i == 18 ||
          i == 21 ||
          i == 23 ||
          i >= 25
        this.spectrum[i] = isHarmonic
          ? Math.max(0, Math.round(Config.spectrumMax * (1 - i / 30)))
          : 0
      }
    }
    this._waveIsReady = false
  }

  public markCustomWaveDirty(): void {
    this._waveIsReady = false
  }

  public getCustomWave(lowestOctave: number): Float32Array {
    if (this._waveIsReady) return this._wave!

    const waveLength: number = Config.spectrumNoiseLength
    if (this._wave == null || this._wave.length != waveLength + 1) {
      this._wave = new Float32Array(waveLength + 1)
    }
    const wave: Float32Array = this._wave

    for (let i = 0; i < waveLength; i++) {
      wave[i] = 0
    }

    const highestOctave = 14
    const falloffRatio = 0.25
    // Nudge the 2/7 and 4/7 control points so that they form harmonic intervals.
    const pitchTweak: number[] = [
      0,
      1 / 7,
      Math.log2(5 / 4),
      3 / 7,
      Math.log2(3 / 2),
      5 / 7,
      6 / 7,
    ]
    function controlPointToOctave(point: number): number {
      return (
        lowestOctave +
        Math.floor(point / Config.spectrumControlPointsPerOctave) +
        pitchTweak[
          (point + Config.spectrumControlPointsPerOctave) %
            Config.spectrumControlPointsPerOctave
        ]
      )
    }

    let combinedAmplitude = 1
    for (let i = 0; i < Config.spectrumControlPoints + 1; i++) {
      const value1: number = i <= 0 ? 0 : this.spectrum[i - 1]
      const value2: number =
        i >= Config.spectrumControlPoints
          ? this.spectrum[Config.spectrumControlPoints - 1]
          : this.spectrum[i]
      const octave1: number = controlPointToOctave(i - 1)
      let octave2: number = controlPointToOctave(i)
      if (i >= Config.spectrumControlPoints)
        octave2 = highestOctave + (octave2 - highestOctave) * falloffRatio
      if (value1 == 0 && value2 == 0) continue

      combinedAmplitude +=
        0.02 *
        drawNoiseSpectrum(
          wave,
          waveLength,
          octave1,
          octave2,
          value1 / Config.spectrumMax,
          value2 / Config.spectrumMax,
          -0.5,
        )
    }
    if (this.spectrum[Config.spectrumControlPoints - 1] > 0) {
      combinedAmplitude +=
        0.02 *
        drawNoiseSpectrum(
          wave,
          waveLength,
          highestOctave +
            (controlPointToOctave(Config.spectrumControlPoints) -
              highestOctave) *
              falloffRatio,
          highestOctave,
          this.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax,
          0,
          -0.5,
        )
    }

    inverseRealFourierTransform(wave, waveLength)
    scaleElementsByFactor(
      wave,
      5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)),
    )

    // Duplicate the first sample at the end for easier wrap-around interpolation.
    wave[waveLength] = wave[0]

    this._waveIsReady = true
    return wave
  }
}

export class HarmonicsWave {
  public harmonics: number[] = []
  private _wave: Float32Array | null = null
  private _waveIsReady = false
  private _generatedForType: InstrumentType

  constructor() {
    this.reset()
  }

  public reset(): void {
    for (let i = 0; i < Config.harmonicsControlPoints; i++) {
      this.harmonics[i] = 0
    }
    this.harmonics[0] = Config.harmonicsMax
    this.harmonics[3] = Config.harmonicsMax
    this.harmonics[6] = Config.harmonicsMax
    this._waveIsReady = false
  }

  public markCustomWaveDirty(): void {
    this._waveIsReady = false
  }

  public getCustomWave(instrumentType: InstrumentType): Float32Array {
    if (this._generatedForType != instrumentType) {
      this._generatedForType = instrumentType
      this._waveIsReady = false
    }
    const harmonicsRendered: number =
      instrumentType == InstrumentType.pickedString
        ? Config.harmonicsRenderedForPickedString
        : Config.harmonicsRendered

    if (this._waveIsReady) return this._wave!

    const waveLength: number = Config.harmonicsWavelength
    const retroWave: Float32Array = getDrumWave(0, null, null)

    if (this._wave == null || this._wave.length != waveLength + 1) {
      this._wave = new Float32Array(waveLength + 1)
    }
    const wave: Float32Array = this._wave

    for (let i = 0; i < waveLength; i++) {
      wave[i] = 0
    }

    const overallSlope = -0.25
    let combinedControlPointAmplitude = 1

    for (
      let harmonicIndex = 0;
      harmonicIndex < harmonicsRendered;
      harmonicIndex++
    ) {
      const harmonicFreq: number = harmonicIndex + 1
      let controlValue: number =
        harmonicIndex < Config.harmonicsControlPoints
          ? this.harmonics[harmonicIndex]
          : this.harmonics[Config.harmonicsControlPoints - 1]
      if (harmonicIndex >= Config.harmonicsControlPoints) {
        controlValue *=
          1 -
          (harmonicIndex - Config.harmonicsControlPoints) /
            (harmonicsRendered - Config.harmonicsControlPoints)
      }
      const normalizedValue: number = controlValue / Config.harmonicsMax
      let amplitude: number =
        Math.pow(2, controlValue - Config.harmonicsMax + 1) *
        Math.sqrt(normalizedValue)
      if (harmonicIndex < Config.harmonicsControlPoints) {
        combinedControlPointAmplitude += amplitude
      }
      amplitude *= Math.pow(harmonicFreq, overallSlope)

      // Multiply all the sine wave amplitudes by 1 or -1 based on the LFSR
      // retro wave (effectively random) to avoid egregiously tall spikes.
      amplitude *= retroWave[harmonicIndex + 589]

      wave[waveLength - harmonicFreq] = amplitude
    }

    inverseRealFourierTransform(wave, waveLength)

    // Limit the maximum wave amplitude.
    const mult: number = 1 / Math.pow(combinedControlPointAmplitude, 0.7)
    for (let i = 0; i < wave.length; i++) wave[i] *= mult

    performIntegral(wave)

    // The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
    wave[waveLength] = wave[0]

    this._waveIsReady = true
    return wave
  }
}

export class FilterControlPoint {
  public freq = 0
  public gain: number = Config.filterGainCenter
  public type: FilterType = FilterType.peak

  public set(freqSetting: number, gainSetting: number): void {
    this.freq = freqSetting
    this.gain = gainSetting
  }

  public getHz(): number {
    return FilterControlPoint.getHzFromSettingValue(this.freq)
  }

  public static getHzFromSettingValue(value: number): number {
    return (
      Config.filterFreqReferenceHz *
      Math.pow(
        2.0,
        (value - Config.filterFreqReferenceSetting) * Config.filterFreqStep,
      )
    )
  }
  public static getSettingValueFromHz(hz: number): number {
    return (
      Math.log2(hz / Config.filterFreqReferenceHz) / Config.filterFreqStep +
      Config.filterFreqReferenceSetting
    )
  }
  public static getRoundedSettingValueFromHz(hz: number): number {
    return Math.max(
      0,
      Math.min(
        Config.filterFreqRange - 1,
        Math.round(FilterControlPoint.getSettingValueFromHz(hz)),
      ),
    )
  }

  public getLinearGain(peakMult = 1.0): number {
    const power: number =
      (this.gain - Config.filterGainCenter) * Config.filterGainStep
    const neutral: number = this.type == FilterType.peak ? 0.0 : -0.5
    const interpolatedPower: number = neutral + (power - neutral) * peakMult
    return Math.pow(2.0, interpolatedPower)
  }
  public static getRoundedSettingValueFromLinearGain(
    linearGain: number,
  ): number {
    return Math.max(
      0,
      Math.min(
        Config.filterGainRange - 1,
        Math.round(
          Math.log2(linearGain) / Config.filterGainStep +
            Config.filterGainCenter,
        ),
      ),
    )
  }

  public toCoefficients(
    filter: FilterCoefficients,
    sampleRate: number,
    freqMult = 1.0,
    peakMult = 1.0,
  ): void {
    const cornerRadiansPerSample: number =
      (2.0 *
        Math.PI *
        Math.max(
          Config.filterFreqMinHz,
          Math.min(Config.filterFreqMaxHz, freqMult * this.getHz()),
        )) /
      sampleRate
    const linearGain: number = this.getLinearGain(peakMult)
    switch (this.type) {
      case FilterType.lowPass:
        filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain)
        break
      case FilterType.highPass:
        filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain)
        break
      case FilterType.peak:
        filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0)
        break
      default:
        throw new Error()
    }
  }

  public getVolumeCompensationMult(): number {
    const octave: number =
      (this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep
    const gainPow: number =
      (this.gain - Config.filterGainCenter) * Config.filterGainStep
    switch (this.type) {
      case FilterType.lowPass:
        const freqRelativeTo8khz: number =
          (Math.pow(2.0, octave) * Config.filterFreqReferenceHz) / 8000.0
        // Reverse the frequency warping from importing legacy simplified filters to imitate how the legacy filter cutoff setting affected volume.
        const warpedFreq: number =
          (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0
        const warpedOctave: number = Math.log2(warpedFreq)
        return Math.pow(
          0.5,
          0.2 * Math.max(0.0, gainPow + 1.0) +
            Math.min(
              0.0,
              Math.max(
                -3.0,
                0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0),
              ),
            ),
        )
      case FilterType.highPass:
        return Math.pow(
          0.5,
          0.125 * Math.max(0.0, gainPow + 1.0) +
            Math.min(
              0.0,
              0.3 *
                (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) +
                0.2 * Math.min(0.0, gainPow + 1.0),
            ),
        )
      case FilterType.peak:
        const distanceFromCenter: number =
          octave + Math.log2(Config.filterFreqReferenceHz / 2000.0)
        const freqLoudness: number = Math.pow(
          1.0 / (1.0 + Math.pow(distanceFromCenter / 3.0, 2.0)),
          2.0,
        )
        return Math.pow(
          0.5,
          0.125 * Math.max(0.0, gainPow) +
            0.1 * freqLoudness * Math.min(0.0, gainPow),
        )
      default:
        throw new Error()
    }
  }
}

export class FilterSettings {
  public readonly controlPoints: FilterControlPoint[] = []
  public controlPointCount = 0

  constructor() {
    this.reset()
  }

  reset(): void {
    this.controlPointCount = 0
  }

  addPoint(type: FilterType, freqSetting: number, gainSetting: number): void {
    let controlPoint: FilterControlPoint
    if (this.controlPoints.length <= this.controlPointCount) {
      controlPoint = new FilterControlPoint()
      this.controlPoints[this.controlPointCount] = controlPoint
    } else {
      controlPoint = this.controlPoints[this.controlPointCount]
    }
    this.controlPointCount++
    controlPoint.type = type
    controlPoint.set(freqSetting, gainSetting)
  }

  public toJsonObject(): Object {
    const filterArray: any[] = []
    for (let i = 0; i < this.controlPointCount; i++) {
      const point: FilterControlPoint = this.controlPoints[i]
      filterArray.push({
        type: Config.filterTypeNames[point.type],
        cutoffHz: Math.round(point.getHz() * 100) / 100,
        linearGain: Math.round(point.getLinearGain() * 10000) / 10000,
      })
    }
    return filterArray
  }

  public fromJsonObject(filterObject: any): void {
    this.controlPoints.length = 0
    if (filterObject) {
      for (const pointObject of filterObject) {
        const point: FilterControlPoint = new FilterControlPoint()
        point.type = Config.filterTypeNames.indexOf(pointObject['type'])
        if (<any>point.type == -1) point.type = FilterType.peak
        if (pointObject['cutoffHz'] != undefined) {
          point.freq = FilterControlPoint.getRoundedSettingValueFromHz(
            pointObject['cutoffHz'],
          )
        } else {
          point.freq = 0
        }
        if (pointObject['linearGain'] != undefined) {
          point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(
            pointObject['linearGain'],
          )
        } else {
          point.gain = Config.filterGainCenter
        }
        this.controlPoints.push(point)
      }
    }
    this.controlPointCount = this.controlPoints.length
  }

  public convertLegacySettings(
    legacyCutoffSetting: number,
    legacyResonanceSetting: number,
    legacyEnv: Envelope,
  ): void {
    this.reset()

    const legacyFilterCutoffMaxHz = 8000 // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
    const legacyFilterMax = 0.95
    const legacyFilterMaxRadians: number =
      Math.asin(legacyFilterMax / 2.0) * 2.0
    const legacyFilterMaxResonance = 0.95
    const legacyFilterCutoffRange = 11
    const legacyFilterResonanceRange = 8

    const resonant: boolean = legacyResonanceSetting > 1
    const firstOrder: boolean = legacyResonanceSetting == 0
    const cutoffAtMax: boolean =
      legacyCutoffSetting == legacyFilterCutoffRange - 1
    const envDecays: boolean =
      legacyEnv.type == EnvelopeType.flare ||
      legacyEnv.type == EnvelopeType.twang ||
      legacyEnv.type == EnvelopeType.decay ||
      legacyEnv.type == EnvelopeType.noteSize

    const standardSampleRate = 48000
    const legacyHz: number =
      legacyFilterCutoffMaxHz *
      Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5)
    const legacyRadians: number = Math.min(
      legacyFilterMaxRadians,
      (2 * Math.PI * legacyHz) / standardSampleRate,
    )

    if (legacyEnv.type == EnvelopeType.none && !resonant && cutoffAtMax) {
      // The response is flat and there's no envelopes, so don't even bother adding any control points.
    } else if (firstOrder) {
      // In general, a 1st order lowpass can be approximated by a 2nd order lowpass
      // with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
      // However, BeepBox's original lowpass filters behaved oddly as they
      // approach the nyquist frequency, so I've devised this curved conversion
      // to guess at a perceptually appropriate new cutoff frequency and gain.
      const extraOctaves = 3.5
      const targetRadians: number = legacyRadians * Math.pow(2.0, extraOctaves)
      const curvedRadians: number =
        targetRadians / (1.0 + targetRadians / Math.PI)
      const curvedHz: number =
        (standardSampleRate * curvedRadians) / (2.0 * Math.PI)
      const freqSetting: number =
        FilterControlPoint.getRoundedSettingValueFromHz(curvedHz)
      const finalHz: number =
        FilterControlPoint.getHzFromSettingValue(freqSetting)
      const finalRadians: number =
        (2.0 * Math.PI * finalHz) / standardSampleRate

      const legacyFilter: FilterCoefficients = new FilterCoefficients()
      legacyFilter.lowPass1stOrderSimplified(legacyRadians)
      const response: FrequencyResponse = new FrequencyResponse()
      response.analyze(legacyFilter, finalRadians)
      const legacyFilterGainAtNewRadians: number = response.magnitude()

      let logGain: number = Math.log2(legacyFilterGainAtNewRadians)
      // Bias slightly toward 2^(-extraOctaves):
      logGain = -extraOctaves + (logGain + extraOctaves) * 0.82
      // Decaying envelopes move the cutoff frequency back into an area where the best approximation of the first order slope requires a lower gain setting.
      if (envDecays) logGain = Math.min(logGain, -1.0)
      const convertedGain: number = Math.pow(2.0, logGain)
      const gainSetting: number =
        FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain)

      this.addPoint(FilterType.lowPass, freqSetting, gainSetting)
    } else {
      const intendedGain: number =
        0.5 /
        (1.0 -
          legacyFilterMaxResonance *
            Math.sqrt(
              Math.max(0.0, legacyResonanceSetting - 1.0) /
                (legacyFilterResonanceRange - 2.0),
            ))
      const invertedGain: number = 0.5 / intendedGain
      const maxRadians: number =
        (2.0 * Math.PI * legacyFilterCutoffMaxHz) / standardSampleRate
      const freqRatio: number = legacyRadians / maxRadians
      const targetRadians: number =
        legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0)
      const curvedRadians: number =
        legacyRadians + (targetRadians - legacyRadians) * invertedGain
      let curvedHz: number
      if (envDecays) {
        curvedHz =
          (standardSampleRate *
            Math.min(curvedRadians, legacyRadians * Math.pow(2, 0.25))) /
          (2.0 * Math.PI)
      } else {
        curvedHz = (standardSampleRate * curvedRadians) / (2.0 * Math.PI)
      }
      const freqSetting: number =
        FilterControlPoint.getRoundedSettingValueFromHz(curvedHz)

      let legacyFilterGain: number
      if (envDecays) {
        legacyFilterGain = intendedGain
      } else {
        const legacyFilter: FilterCoefficients = new FilterCoefficients()
        legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain)
        const response: FrequencyResponse = new FrequencyResponse()
        response.analyze(legacyFilter, curvedRadians)
        legacyFilterGain = response.magnitude()
      }
      if (!resonant)
        legacyFilterGain = Math.min(legacyFilterGain, Math.sqrt(0.5))
      const gainSetting: number =
        FilterControlPoint.getRoundedSettingValueFromLinearGain(
          legacyFilterGain,
        )

      this.addPoint(FilterType.lowPass, freqSetting, gainSetting)
    }
  }
}

export class EnvelopeSettings {
  public target = 0
  public index = 0
  public envelope = 0

  constructor() {
    this.reset()
  }

  reset(): void {
    this.target = 0
    this.index = 0
    this.envelope = 0
  }

  public toJsonObject(): Object {
    const envelopeObject: any = {
      target: Config.instrumentAutomationTargets[this.target].name,
      envelope: Config.envelopes[this.envelope].name,
    }
    if (Config.instrumentAutomationTargets[this.target].maxCount > 1) {
      envelopeObject['index'] = this.index
    }
    return envelopeObject
  }

  public fromJsonObject(envelopeObject: any): void {
    this.reset()

    let target: AutomationTarget =
      Config.instrumentAutomationTargets.dictionary[envelopeObject['target']]
    if (target == null)
      target = Config.instrumentAutomationTargets.dictionary['noteVolume']
    this.target = target.index

    let envelope: Envelope =
      Config.envelopes.dictionary[envelopeObject['envelope']]
    if (envelope == null) envelope = Config.envelopes.dictionary['none']
    this.envelope = envelope.index

    if (envelopeObject['index'] != undefined) {
      this.index = clamp(
        0,
        Config.instrumentAutomationTargets[this.target].maxCount,
        envelopeObject['index'] | 0,
      )
    } else {
      this.index = 0
    }
  }
}

// Settings that were available to old versions of BeepBox but are no longer available in the
// current version that need to be reinterpreted as a group to determine the best way to
// represent them in the current version.
interface LegacySettings {
  filterCutoff?: number
  filterResonance?: number
  filterEnvelope?: Envelope
  pulseEnvelope?: Envelope
  operatorEnvelopes?: Envelope[]
  feedbackEnvelope?: Envelope
}

export class Instrument {
  public type: InstrumentType = InstrumentType.chip
  public preset = 0
  public chipWave = 2
  public chipNoise = 1
  public eqFilter: FilterSettings = new FilterSettings()
  public noteFilter: FilterSettings = new FilterSettings()
  public envelopes: EnvelopeSettings[] = []
  public envelopeCount = 0
  public fadeIn = 0
  public fadeOut: number = Config.fadeOutNeutral
  public transition: number = Config.transitions.dictionary['normal'].index
  public pitchShift = 0
  public detune = 0
  public vibrato = 0
  public unison = 0
  public effects = 0
  public chord = 1
  public volume = 0
  public pan: number = Config.panCenter
  public pulseWidth: number = Config.pulseWidthRange - 1
  public stringSustain = 10
  public distortion = 0
  public bitcrusherFreq = 0
  public bitcrusherQuantization = 0
  public chorus = 0
  public reverb = 0
  public echoSustain = 0
  public echoDelay = 0
  public algorithm = 0
  public feedbackType = 0
  public feedbackAmplitude = 0
  public readonly operators: Operator[] = []
  public readonly spectrumWave: SpectrumWave
  public readonly harmonicsWave: HarmonicsWave = new HarmonicsWave()
  public readonly drumsetEnvelopes: number[] = []
  public readonly drumsetSpectrumWaves: SpectrumWave[] = []

  constructor(isNoiseChannel: boolean) {
    this.spectrumWave = new SpectrumWave(isNoiseChannel)
    for (let i = 0; i < Config.operatorCount; i++) {
      this.operators[i] = new Operator(i)
    }
    for (let i = 0; i < Config.drumCount; i++) {
      this.drumsetEnvelopes[i] = Config.envelopes.dictionary['twang 2'].index
      this.drumsetSpectrumWaves[i] = new SpectrumWave(true)
    }
  }

  public setTypeAndReset(type: InstrumentType, isNoiseChannel: boolean): void {
    this.type = type
    this.preset = type
    this.volume = 0
    this.effects = 0
    this.chorus = Config.chorusRange - 1
    this.reverb = 2
    this.echoSustain = Math.floor((Config.echoSustainRange - 1) * 0.5)
    this.echoDelay = Math.floor((Config.echoDelayRange - 1) * 0.5)
    this.eqFilter.reset()
    this.noteFilter.reset()
    this.distortion = Math.floor((Config.distortionRange - 1) * 0.75)
    this.bitcrusherFreq = Math.floor((Config.bitcrusherFreqRange - 1) * 0.5)
    this.bitcrusherQuantization = Math.floor(
      (Config.bitcrusherQuantizationRange - 1) * 0.5,
    )
    this.pan = Config.panCenter
    this.pitchShift = Config.pitchShiftCenter
    this.detune = Config.detuneCenter
    this.vibrato = 0
    this.unison = 0
    this.stringSustain = 10
    this.fadeIn = 0
    this.fadeOut = Config.fadeOutNeutral
    this.transition = Config.transitions.dictionary['normal'].index
    this.envelopeCount = 0
    switch (type) {
      case InstrumentType.chip:
        this.chipWave = 2
        // TODO: enable the chord effect?
        this.chord = Config.chords.dictionary['arpeggio'].index
        break
      case InstrumentType.fm:
        this.chord = Config.chords.dictionary['custom interval'].index
        this.algorithm = 0
        this.feedbackType = 0
        this.feedbackAmplitude = 0
        for (let i = 0; i < this.operators.length; i++) {
          this.operators[i].reset(i)
        }
        break
      case InstrumentType.noise:
        this.chipNoise = 1
        this.chord = Config.chords.dictionary['arpeggio'].index
        break
      case InstrumentType.spectrum:
        this.chord = Config.chords.dictionary['simultaneous'].index
        this.spectrumWave.reset(isNoiseChannel)
        break
      case InstrumentType.drumset:
        this.chord = Config.chords.dictionary['simultaneous'].index
        for (let i = 0; i < Config.drumCount; i++) {
          this.drumsetEnvelopes[i] =
            Config.envelopes.dictionary['twang 2'].index
          this.drumsetSpectrumWaves[i].reset(isNoiseChannel)
        }
        break
      case InstrumentType.harmonics:
        this.chord = Config.chords.dictionary['simultaneous'].index
        this.harmonicsWave.reset()
        break
      case InstrumentType.pwm:
        this.chord = Config.chords.dictionary['arpeggio'].index
        this.pulseWidth = Config.pulseWidthRange - 1
        break
      case InstrumentType.pickedString:
        this.chord = Config.chords.dictionary['strum'].index
        this.harmonicsWave.reset()
        break
      default:
        throw new Error('Unrecognized instrument type: ' + type)
    }
    // Chip/noise instruments had arpeggio and FM had custom interval but neither
    // explicitly saved the chorus setting beforeSeven so enable it here. The effects
    // will otherwise get overridden when reading SongTagCode.startInstrument.
    if (this.chord != Config.chords.dictionary['simultaneous'].index) {
      // Enable chord if it was used.
      this.effects = this.effects | (1 << EffectType.chord)
    }
  }

  public convertLegacySettings(legacySettings: LegacySettings): void {
    let legacyCutoffSetting: number | undefined = legacySettings.filterCutoff
    let legacyResonanceSetting: number | undefined =
      legacySettings.filterResonance
    let legacyFilterEnv: Envelope | undefined = legacySettings.filterEnvelope
    let legacyPulseEnv: Envelope | undefined = legacySettings.pulseEnvelope
    let legacyOperatorEnvelopes: Envelope[] | undefined =
      legacySettings.operatorEnvelopes
    let legacyFeedbackEnv: Envelope | undefined =
      legacySettings.feedbackEnvelope

    // legacy defaults:
    if (legacyCutoffSetting == undefined)
      legacyCutoffSetting = this.type == InstrumentType.chip ? 6 : 10
    if (legacyResonanceSetting == undefined) legacyResonanceSetting = 0
    if (legacyFilterEnv == undefined)
      legacyFilterEnv = Config.envelopes.dictionary['none']
    if (legacyPulseEnv == undefined)
      legacyPulseEnv =
        Config.envelopes.dictionary[
          this.type == InstrumentType.pwm ? 'twang 2' : 'none'
        ]
    if (legacyOperatorEnvelopes == undefined)
      legacyOperatorEnvelopes = [
        Config.envelopes.dictionary[
          this.type == InstrumentType.fm ? 'note size' : 'none'
        ],
        Config.envelopes.dictionary['none'],
        Config.envelopes.dictionary['none'],
        Config.envelopes.dictionary['none'],
      ]
    if (legacyFeedbackEnv == undefined)
      legacyFeedbackEnv = Config.envelopes.dictionary['none']

    const carrierCount: number = Config.algorithms[this.algorithm].carrierCount
    let noCarriersControlledByNoteSize = true
    let allCarriersControlledByNoteSize = true
    let noteSizeControlsSomethingElse: boolean =
      legacyFilterEnv.type == EnvelopeType.noteSize ||
      legacyPulseEnv.type == EnvelopeType.noteSize
    if (this.type == InstrumentType.fm) {
      noteSizeControlsSomethingElse =
        noteSizeControlsSomethingElse ||
        legacyFeedbackEnv.type == EnvelopeType.noteSize
      for (let i = 0; i < legacyOperatorEnvelopes.length; i++) {
        if (i < carrierCount) {
          if (legacyOperatorEnvelopes[i].type != EnvelopeType.noteSize) {
            allCarriersControlledByNoteSize = false
          } else {
            noCarriersControlledByNoteSize = false
          }
        } else {
          noteSizeControlsSomethingElse =
            noteSizeControlsSomethingElse ||
            legacyOperatorEnvelopes[i].type == EnvelopeType.noteSize
        }
      }
    }

    this.envelopeCount = 0

    if (this.type == InstrumentType.fm) {
      if (allCarriersControlledByNoteSize && noteSizeControlsSomethingElse) {
        this.addEnvelope(
          Config.instrumentAutomationTargets.dictionary['noteVolume'].index,
          0,
          Config.envelopes.dictionary['note size'].index,
        )
      } else if (
        noCarriersControlledByNoteSize &&
        !noteSizeControlsSomethingElse
      ) {
        this.addEnvelope(
          Config.instrumentAutomationTargets.dictionary['none'].index,
          0,
          Config.envelopes.dictionary['note size'].index,
        )
      }
    }

    if (legacyFilterEnv.type == EnvelopeType.none) {
      this.noteFilter.reset()
      this.eqFilter.convertLegacySettings(
        legacyCutoffSetting,
        legacyResonanceSetting,
        legacyFilterEnv,
      )
      this.effects &= ~(1 << EffectType.noteFilter)
    } else {
      this.eqFilter.reset()
      this.noteFilter.convertLegacySettings(
        legacyCutoffSetting,
        legacyResonanceSetting,
        legacyFilterEnv,
      )
      this.effects |= 1 << EffectType.noteFilter
      this.addEnvelope(
        Config.instrumentAutomationTargets.dictionary['noteFilterAllFreqs']
          .index,
        0,
        legacyFilterEnv.index,
      )
    }

    if (legacyPulseEnv.type != EnvelopeType.none) {
      this.addEnvelope(
        Config.instrumentAutomationTargets.dictionary['pulseWidth'].index,
        0,
        legacyPulseEnv.index,
      )
    }

    for (let i = 0; i < legacyOperatorEnvelopes.length; i++) {
      if (i < carrierCount && allCarriersControlledByNoteSize) continue
      if (legacyOperatorEnvelopes[i].type != EnvelopeType.none) {
        this.addEnvelope(
          Config.instrumentAutomationTargets.dictionary['operatorAmplitude']
            .index,
          i,
          legacyOperatorEnvelopes[i].index,
        )
      }
    }

    if (legacyFeedbackEnv.type != EnvelopeType.none) {
      this.addEnvelope(
        Config.instrumentAutomationTargets.dictionary['feedbackAmplitude']
          .index,
        0,
        legacyFeedbackEnv.index,
      )
    }
  }

  public toJsonObject(): Object {
    const instrumentObject: any = {
      type: Config.instrumentTypeNames[this.type],
      volume: (5 - this.volume) * 20,
      eqFilter: this.eqFilter.toJsonObject(),
    }

    if (this.preset != this.type) {
      instrumentObject['preset'] = this.preset
    }

    const effects: string[] = []
    for (const effect of Config.effectOrder) {
      if (this.effects & (1 << effect)) {
        effects.push(Config.effectNames[effect])
      }
    }
    instrumentObject['effects'] = effects

    if (effectsIncludeTransition(this.effects)) {
      instrumentObject['transition'] = Config.transitions[this.transition].name
    }
    if (effectsIncludeChord(this.effects)) {
      instrumentObject['chord'] = this.getChord().name
    }
    if (effectsIncludePitchShift(this.effects)) {
      instrumentObject['pitchShiftSemitones'] = this.pitchShift
    }
    if (effectsIncludeDetune(this.effects)) {
      instrumentObject['detuneCents'] = Synth.detuneToCents(
        this.detune - Config.detuneCenter,
      )
    }
    if (effectsIncludeVibrato(this.effects)) {
      instrumentObject['vibrato'] = Config.vibratos[this.vibrato].name
    }
    if (effectsIncludeNoteFilter(this.effects)) {
      instrumentObject['noteFilter'] = this.noteFilter.toJsonObject()
    }
    if (effectsIncludeDistortion(this.effects)) {
      instrumentObject['distortion'] = Math.round(
        (100 * this.distortion) / (Config.distortionRange - 1),
      )
    }
    if (effectsIncludeBitcrusher(this.effects)) {
      instrumentObject['bitcrusherOctave'] =
        (Config.bitcrusherFreqRange - 1 - this.bitcrusherFreq) *
        Config.bitcrusherOctaveStep
      instrumentObject['bitcrusherQuantization'] = Math.round(
        (100 * this.bitcrusherQuantization) /
          (Config.bitcrusherQuantizationRange - 1),
      )
    }
    if (effectsIncludePanning(this.effects)) {
      instrumentObject['pan'] = Math.round(
        (100 * (this.pan - Config.panCenter)) / Config.panCenter,
      )
    }
    if (effectsIncludeChorus(this.effects)) {
      instrumentObject['chorus'] = Math.round(
        (100 * this.chorus) / (Config.chorusRange - 1),
      )
    }
    if (effectsIncludeEcho(this.effects)) {
      instrumentObject['echoSustain'] = Math.round(
        (100 * this.echoSustain) / (Config.echoSustainRange - 1),
      )
      instrumentObject['echoDelayBeats'] =
        Math.round(
          (1000 * (this.echoDelay + 1) * Config.echoDelayStepTicks) /
            (Config.ticksPerPart * Config.partsPerBeat),
        ) / 1000
    }
    if (effectsIncludeReverb(this.effects)) {
      instrumentObject['reverb'] = Math.round(
        (100 * this.reverb) / (Config.reverbRange - 1),
      )
    }

    if (this.type != InstrumentType.drumset) {
      instrumentObject['fadeInSeconds'] =
        Math.round(10000 * Synth.fadeInSettingToSeconds(this.fadeIn)) / 10000
      instrumentObject['fadeOutTicks'] = Synth.fadeOutSettingToTicks(
        this.fadeOut,
      )
    }

    if (
      this.type == InstrumentType.harmonics ||
      this.type == InstrumentType.pickedString
    ) {
      instrumentObject['harmonics'] = []
      for (let i = 0; i < Config.harmonicsControlPoints; i++) {
        instrumentObject['harmonics'][i] = Math.round(
          (100 * this.harmonicsWave.harmonics[i]) / Config.harmonicsMax,
        )
      }
    }

    if (this.type == InstrumentType.noise) {
      instrumentObject['wave'] = Config.chipNoises[this.chipNoise].name
    } else if (this.type == InstrumentType.spectrum) {
      instrumentObject['spectrum'] = []
      for (let i = 0; i < Config.spectrumControlPoints; i++) {
        instrumentObject['spectrum'][i] = Math.round(
          (100 * this.spectrumWave.spectrum[i]) / Config.spectrumMax,
        )
      }
    } else if (this.type == InstrumentType.drumset) {
      instrumentObject['drums'] = []
      for (let j = 0; j < Config.drumCount; j++) {
        const spectrum: number[] = []
        for (let i = 0; i < Config.spectrumControlPoints; i++) {
          spectrum[i] = Math.round(
            (100 * this.drumsetSpectrumWaves[j].spectrum[i]) /
              Config.spectrumMax,
          )
        }
        instrumentObject['drums'][j] = {
          filterEnvelope: this.getDrumsetEnvelope(j).name,
          spectrum: spectrum,
        }
      }
    } else if (this.type == InstrumentType.chip) {
      instrumentObject['wave'] = Config.chipWaves[this.chipWave].name
      instrumentObject['unison'] = Config.unisons[this.unison].name
    } else if (this.type == InstrumentType.pwm) {
      instrumentObject['pulseWidth'] =
        Math.round(getPulseWidthRatio(this.pulseWidth) * 100 * 100000) / 100000
    } else if (this.type == InstrumentType.pickedString) {
      instrumentObject['unison'] = Config.unisons[this.unison].name
      instrumentObject['stringSustain'] = Math.round(
        (100 * this.stringSustain) / (Config.stringSustainRange - 1),
      )
    } else if (this.type == InstrumentType.harmonics) {
      instrumentObject['unison'] = Config.unisons[this.unison].name
    } else if (this.type == InstrumentType.fm) {
      const operatorArray: Object[] = []
      for (const operator of this.operators) {
        operatorArray.push({
          frequency: Config.operatorFrequencies[operator.frequency].name,
          amplitude: operator.amplitude,
        })
      }
      instrumentObject['algorithm'] = Config.algorithms[this.algorithm].name
      instrumentObject['feedbackType'] =
        Config.feedbacks[this.feedbackType].name
      instrumentObject['feedbackAmplitude'] = this.feedbackAmplitude
      instrumentObject['operators'] = operatorArray
    } else {
      throw new Error('Unrecognized instrument type')
    }

    const envelopes: any[] = []
    for (let i = 0; i < this.envelopeCount; i++) {
      envelopes.push(this.envelopes[i].toJsonObject())
    }
    instrumentObject['envelopes'] = envelopes

    return instrumentObject
  }

  public fromJsonObject(
    instrumentObject: any,
    isNoiseChannel: boolean,
    legacyGlobalReverb = 0,
  ): void {
    if (instrumentObject == undefined) instrumentObject = {}

    let type: InstrumentType = Config.instrumentTypeNames.indexOf(
      instrumentObject['type'],
    )
    if (<any>type == -1)
      type = isNoiseChannel ? InstrumentType.noise : InstrumentType.chip
    this.setTypeAndReset(type, isNoiseChannel)

    if (instrumentObject['preset'] != undefined) {
      this.preset = instrumentObject['preset'] >>> 0
    }

    if (instrumentObject['volume'] != undefined) {
      this.volume = clamp(
        0,
        Config.volumeRange,
        Math.round(5 - (instrumentObject['volume'] | 0) / 20),
      )
    } else {
      this.volume = 0
    }

    if (Array.isArray(instrumentObject['effects'])) {
      let effects = 0
      for (let i = 0; i < instrumentObject['effects'].length; i++) {
        effects =
          effects |
          (1 << Config.effectNames.indexOf(instrumentObject['effects'][i]))
      }
      this.effects = effects & ((1 << EffectType.length) - 1)
    } else {
      // The index of these names is reinterpreted as a bitfield, which relies on reverb and chorus being the first effects!
      const legacyEffectsNames: string[] = [
        'none',
        'reverb',
        'chorus',
        'chorus & reverb',
      ]
      this.effects = legacyEffectsNames.indexOf(instrumentObject['effects'])
      if (this.effects == -1)
        this.effects = this.type == InstrumentType.noise ? 0 : 1
    }

    this.transition = Config.transitions.dictionary['normal'].index // default value.
    const transitionProperty: any =
      instrumentObject['transition'] || instrumentObject['envelope'] // the transition property used to be called envelope, so check that too.
    if (transitionProperty != undefined) {
      let transition: Transition | undefined =
        Config.transitions.dictionary[transitionProperty]
      if (
        instrumentObject['fadeInSeconds'] == undefined ||
        instrumentObject['fadeOutTicks'] == undefined
      ) {
        const legacySettings = (<any>{
          binary: {
            transition: 'interrupt',
            fadeInSeconds: 0.0,
            fadeOutTicks: -1,
          },
          seamless: {
            transition: 'interrupt',
            fadeInSeconds: 0.0,
            fadeOutTicks: -1,
          },
          sudden: {
            transition: 'normal',
            fadeInSeconds: 0.0,
            fadeOutTicks: -3,
          },
          hard: { transition: 'normal', fadeInSeconds: 0.0, fadeOutTicks: -3 },
          smooth: {
            transition: 'normal',
            fadeInSeconds: 0.025,
            fadeOutTicks: -3,
          },
          soft: {
            transition: 'normal',
            fadeInSeconds: 0.025,
            fadeOutTicks: -3,
          },
          // Note that the old slide transition has the same as a new slide transition that is different.
          // Only apply legacy settings if the instrument JSON was created before, based on the presence
          // of the fade in/out fields.
          slide: {
            transition: 'slide in pattern',
            fadeInSeconds: 0.025,
            fadeOutTicks: -3,
          },
          'cross fade': {
            transition: 'normal',
            fadeInSeconds: 0.04,
            fadeOutTicks: 6,
          },
          'hard fade': {
            transition: 'normal',
            fadeInSeconds: 0.0,
            fadeOutTicks: 48,
          },
          'medium fade': {
            transition: 'normal',
            fadeInSeconds: 0.0125,
            fadeOutTicks: 72,
          },
          'soft fade': {
            transition: 'normal',
            fadeInSeconds: 0.06,
            fadeOutTicks: 96,
          },
        })[transitionProperty]
        if (legacySettings != undefined) {
          transition = Config.transitions.dictionary[legacySettings.transition]
          // These may be overridden below.
          this.fadeIn = Synth.secondsToFadeInSetting(
            legacySettings.fadeInSeconds,
          )
          this.fadeOut = Synth.ticksToFadeOutSetting(
            legacySettings.fadeOutTicks,
          )
        }
      }
      if (transition != undefined) this.transition = transition.index

      if (this.transition != Config.transitions.dictionary['normal'].index) {
        // Enable transition if it was used.
        this.effects = this.effects | (1 << EffectType.transition)
      }
    }

    // Overrides legacy settings in transition above.
    if (instrumentObject['fadeInSeconds'] != undefined) {
      this.fadeIn = Synth.secondsToFadeInSetting(
        +instrumentObject['fadeInSeconds'],
      )
    }
    if (instrumentObject['fadeOutTicks'] != undefined) {
      this.fadeOut = Synth.ticksToFadeOutSetting(
        +instrumentObject['fadeOutTicks'],
      )
    }

    {
      // Note that the chord setting may be overridden by instrumentObject["chorus"] below.
      const chordProperty: any = instrumentObject['chord']
      const legacyChordNames: Dictionary<string> = { harmony: 'simultaneous' }
      const chord: Chord | undefined =
        Config.chords.dictionary[legacyChordNames[chordProperty]] ||
        Config.chords.dictionary[chordProperty]
      if (chord != undefined) {
        this.chord = chord.index
      } else {
        // Different instruments have different default chord types based on historical behaviour.
        if (this.type == InstrumentType.noise) {
          this.chord = Config.chords.dictionary['arpeggio'].index
        } else if (this.type == InstrumentType.pickedString) {
          this.chord = Config.chords.dictionary['strum'].index
        } else if (this.type == InstrumentType.chip) {
          this.chord = Config.chords.dictionary['arpeggio'].index
        } else if (this.type == InstrumentType.fm) {
          this.chord = Config.chords.dictionary['custom interval'].index
        } else {
          this.chord = Config.chords.dictionary['simultaneous'].index
        }
      }
    }

    this.unison = Config.unisons.dictionary['none'].index // default value.
    const unisonProperty: any =
      instrumentObject['unison'] ||
      instrumentObject['interval'] ||
      instrumentObject['chorus'] // The unison property has gone by various names in the past.
    if (unisonProperty != undefined) {
      const legacyChorusNames: Dictionary<string> = {
        union: 'none',
        fifths: 'fifth',
        octaves: 'octave',
      }
      const unison: Unison | undefined =
        Config.unisons.dictionary[legacyChorusNames[unisonProperty]] ||
        Config.unisons.dictionary[unisonProperty]
      if (unison != undefined) this.unison = unison.index
    }
    if (instrumentObject['chorus'] == 'custom harmony') {
      // The original chorus setting had an option that now maps to two different settings. Override those if necessary.
      this.unison = Config.unisons.dictionary['hum'].index
      this.chord = Config.chords.dictionary['custom interval'].index
    }
    if (this.chord != Config.chords.dictionary['simultaneous'].index) {
      // Enable chord if it was used.
      this.effects = this.effects | (1 << EffectType.chord)
    }

    if (instrumentObject['pitchShiftSemitones'] != undefined) {
      this.pitchShift = clamp(
        0,
        Config.pitchShiftRange,
        Math.round(+instrumentObject['pitchShiftSemitones']),
      )
    }
    if (instrumentObject['detuneCents'] != undefined) {
      this.detune = clamp(
        0,
        Config.detuneMax + 1,
        Math.round(
          Config.detuneCenter +
            Synth.centsToDetune(+instrumentObject['detuneCents']),
        ),
      )
    }

    this.vibrato = Config.vibratos.dictionary['none'].index // default value.
    const vibratoProperty: any =
      instrumentObject['vibrato'] || instrumentObject['effect'] // The vibrato property was previously called "effect", not to be confused with the current "effects".
    if (vibratoProperty != undefined) {
      const legacyVibratoNames: Dictionary<string> = {
        'vibrato light': 'light',
        'vibrato delayed': 'delayed',
        'vibrato heavy': 'heavy',
      }
      const vibrato: Vibrato | undefined =
        Config.vibratos.dictionary[legacyVibratoNames[unisonProperty]] ||
        Config.vibratos.dictionary[vibratoProperty]
      if (vibrato != undefined) this.vibrato = vibrato.index

      // Old songs may have a vibrato effect without explicitly enabling it.
      if (vibrato != Config.vibratos.dictionary['none']) {
        this.effects = this.effects | (1 << EffectType.vibrato)
      }
    }

    if (instrumentObject['pan'] != undefined) {
      this.pan = clamp(
        0,
        Config.panMax + 1,
        Math.round(
          Config.panCenter +
            ((instrumentObject['pan'] | 0) * Config.panCenter) / 100,
        ),
      )

      // Old songs may have a panning effect without explicitly enabling it.
      if (this.pan != Config.panCenter) {
        this.effects = this.effects | (1 << EffectType.panning)
      }
    } else {
      this.pan = Config.panCenter
    }

    if (instrumentObject['distortion'] != undefined) {
      this.distortion = clamp(
        0,
        Config.distortionRange,
        Math.round(
          ((Config.distortionRange - 1) *
            (instrumentObject['distortion'] | 0)) /
            100,
        ),
      )
    }

    if (instrumentObject['bitcrusherOctave'] != undefined) {
      this.bitcrusherFreq =
        Config.bitcrusherFreqRange -
        1 -
        +instrumentObject['bitcrusherOctave'] / Config.bitcrusherOctaveStep
    }
    if (instrumentObject['bitcrusherQuantization'] != undefined) {
      this.bitcrusherQuantization = clamp(
        0,
        Config.bitcrusherQuantizationRange,
        Math.round(
          ((Config.bitcrusherQuantizationRange - 1) *
            (instrumentObject['bitcrusherQuantization'] | 0)) /
            100,
        ),
      )
    }

    if (instrumentObject['echoSustain'] != undefined) {
      this.echoSustain = clamp(
        0,
        Config.echoSustainRange,
        Math.round(
          ((Config.echoSustainRange - 1) *
            (instrumentObject['echoSustain'] | 0)) /
            100,
        ),
      )
    }
    if (instrumentObject['echoDelayBeats'] != undefined) {
      this.echoDelay = clamp(
        0,
        Config.echoDelayRange,
        Math.round(
          (+instrumentObject['echoDelayBeats'] *
            (Config.ticksPerPart * Config.partsPerBeat)) /
            Config.echoDelayStepTicks -
            1.0,
        ),
      )
    }

    if (instrumentObject['chorus'] != undefined) {
      this.chorus = clamp(
        0,
        Config.chorusRange,
        Math.round(
          ((Config.chorusRange - 1) * (instrumentObject['chorus'] | 0)) / 100,
        ),
      )
    }

    if (instrumentObject['reverb'] != undefined) {
      this.reverb = clamp(
        0,
        Config.reverbRange,
        Math.round(
          ((Config.reverbRange - 1) * (instrumentObject['reverb'] | 0)) / 100,
        ),
      )
    } else {
      if (legacyGlobalReverb == 0) {
        // If the original song reverb was zero, just disable the instrument reverb effect entirely.
        this.effects = this.effects & ~(1 << EffectType.reverb)
      } else {
        this.reverb = legacyGlobalReverb
      }
    }

    if (instrumentObject['pulseWidth'] != undefined) {
      this.pulseWidth = clamp(
        0,
        Config.pulseWidthRange,
        Math.round(
          Math.log2(+instrumentObject['pulseWidth'] / 50) / 0.5 - 1 + 8,
        ),
      )
    } else {
      this.pulseWidth = Config.pulseWidthRange - 1
    }

    if (instrumentObject['harmonics'] != undefined) {
      for (let i = 0; i < Config.harmonicsControlPoints; i++) {
        this.harmonicsWave.harmonics[i] = Math.max(
          0,
          Math.min(
            Config.harmonicsMax,
            Math.round(
              (Config.harmonicsMax * +instrumentObject['harmonics'][i]) / 100,
            ),
          ),
        )
      }
    } else {
      this.harmonicsWave.reset()
    }

    if (instrumentObject['spectrum'] != undefined) {
      for (let i = 0; i < Config.spectrumControlPoints; i++) {
        this.spectrumWave.spectrum[i] = Math.max(
          0,
          Math.min(
            Config.spectrumMax,
            Math.round(
              (Config.spectrumMax * +instrumentObject['spectrum'][i]) / 100,
            ),
          ),
        )
      }
    } else {
      this.spectrumWave.reset(isNoiseChannel)
    }

    if (instrumentObject['stringSustain'] != undefined) {
      this.stringSustain = clamp(
        0,
        Config.stringSustainRange,
        Math.round(
          ((Config.stringSustainRange - 1) *
            (instrumentObject['stringSustain'] | 0)) /
            100,
        ),
      )
    } else {
      this.stringSustain = 10
    }

    if (this.type == InstrumentType.noise) {
      this.chipNoise = Config.chipNoises.findIndex(
        (wave) => wave.name == instrumentObject['wave'],
      )
      if (this.chipNoise == -1) this.chipNoise = 1
    }

    const legacyEnvelopeNames: Dictionary<string> = {
      custom: 'note size',
      steady: 'none',
      'pluck 1': 'twang 1',
      'pluck 2': 'twang 2',
      'pluck 3': 'twang 3',
    }
    const getEnvelope = (name: any): Envelope | undefined =>
      legacyEnvelopeNames[name] != undefined
        ? Config.envelopes.dictionary[legacyEnvelopeNames[name]]
        : Config.envelopes.dictionary[name]

    if (this.type == InstrumentType.drumset) {
      if (instrumentObject['drums'] != undefined) {
        for (let j = 0; j < Config.drumCount; j++) {
          const drum: any = instrumentObject['drums'][j]
          if (drum == undefined) continue

          this.drumsetEnvelopes[j] =
            Config.envelopes.dictionary['twang 2'].index // default value.
          if (drum['filterEnvelope'] != undefined) {
            const envelope: Envelope | undefined = getEnvelope(
              drum['filterEnvelope'],
            )
            if (envelope != undefined) this.drumsetEnvelopes[j] = envelope.index
          }
          if (drum['spectrum'] != undefined) {
            for (let i = 0; i < Config.spectrumControlPoints; i++) {
              this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(
                0,
                Math.min(
                  Config.spectrumMax,
                  Math.round((Config.spectrumMax * +drum['spectrum'][i]) / 100),
                ),
              )
            }
          }
        }
      }
    }

    if (this.type == InstrumentType.chip) {
      const legacyWaveNames: Dictionary<number> = {
        triangle: 1,
        square: 2,
        'pulse wide': 3,
        'pulse narrow': 4,
        sawtooth: 5,
        'double saw': 6,
        'double pulse': 7,
        spiky: 8,
        plateau: 0,
      }
      this.chipWave =
        legacyWaveNames[instrumentObject['wave']] != undefined
          ? legacyWaveNames[instrumentObject['wave']]
          : Config.chipWaves.findIndex(
              (wave) => wave.name == instrumentObject['wave'],
            )
      if (this.chipWave == -1) this.chipWave = 1
    }

    if (this.type == InstrumentType.fm) {
      this.algorithm = Config.algorithms.findIndex(
        (algorithm) => algorithm.name == instrumentObject['algorithm'],
      )
      if (this.algorithm == -1) this.algorithm = 0
      this.feedbackType = Config.feedbacks.findIndex(
        (feedback) => feedback.name == instrumentObject['feedbackType'],
      )
      if (this.feedbackType == -1) this.feedbackType = 0
      if (instrumentObject['feedbackAmplitude'] != undefined) {
        this.feedbackAmplitude = clamp(
          0,
          Config.operatorAmplitudeMax + 1,
          instrumentObject['feedbackAmplitude'] | 0,
        )
      } else {
        this.feedbackAmplitude = 0
      }

      for (let j = 0; j < Config.operatorCount; j++) {
        const operator: Operator = this.operators[j]
        let operatorObject: any = undefined
        if (instrumentObject['operators'] != undefined)
          operatorObject = instrumentObject['operators'][j]
        if (operatorObject == undefined) operatorObject = {}

        operator.frequency = Config.operatorFrequencies.findIndex(
          (freq) => freq.name == operatorObject['frequency'],
        )
        if (operator.frequency == -1) operator.frequency = 0
        if (operatorObject['amplitude'] != undefined) {
          operator.amplitude = clamp(
            0,
            Config.operatorAmplitudeMax + 1,
            operatorObject['amplitude'] | 0,
          )
        } else {
          operator.amplitude = 0
        }
      }
    }

    if (instrumentObject['noteFilter'] != undefined) {
      this.noteFilter.fromJsonObject(instrumentObject['noteFilter'])
    } else {
      this.noteFilter.reset()
    }
    if (Array.isArray(instrumentObject['eqFilter'])) {
      this.eqFilter.fromJsonObject(instrumentObject['eqFilter'])
    } else {
      this.eqFilter.reset()

      const legacySettings: LegacySettings = {}

      // Try converting from legacy filter settings.
      const filterCutoffMaxHz = 8000
      const filterCutoffRange = 11
      const filterResonanceRange = 8
      if (instrumentObject['filterCutoffHz'] != undefined) {
        legacySettings.filterCutoff = clamp(
          0,
          filterCutoffRange,
          Math.round(
            filterCutoffRange -
              1 +
              (2.0 *
                Math.log(
                  (instrumentObject['filterCutoffHz'] | 0) / filterCutoffMaxHz,
                )) /
                Math.LN2,
          ),
        )
      } else {
        legacySettings.filterCutoff = this.type == InstrumentType.chip ? 6 : 10
      }
      if (instrumentObject['filterResonance'] != undefined) {
        legacySettings.filterResonance = clamp(
          0,
          filterResonanceRange,
          Math.round(
            ((filterResonanceRange - 1) *
              (instrumentObject['filterResonance'] | 0)) /
              100,
          ),
        )
      } else {
        legacySettings.filterResonance = 0
      }

      legacySettings.filterEnvelope = getEnvelope(
        instrumentObject['filterEnvelope'],
      )
      legacySettings.pulseEnvelope = getEnvelope(
        instrumentObject['pulseEnvelope'],
      )
      legacySettings.feedbackEnvelope = getEnvelope(
        instrumentObject['feedbackEnvelope'],
      )
      if (Array.isArray(instrumentObject['operators'])) {
        legacySettings.operatorEnvelopes = []
        for (let j = 0; j < Config.operatorCount; j++) {
          let envelope: Envelope | undefined
          if (instrumentObject['operators'][j] != undefined) {
            envelope = getEnvelope(instrumentObject['operators'][j]['envelope'])
          }
          legacySettings.operatorEnvelopes[j] =
            envelope != undefined
              ? envelope
              : Config.envelopes.dictionary['none']
        }
      }

      // Try converting from even older legacy filter settings.
      if (instrumentObject['filter'] != undefined) {
        const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2]
        const legacyToEnvelope: string[] = [
          'none',
          'none',
          'none',
          'none',
          'decay 1',
          'decay 2',
          'decay 3',
        ]
        const filterNames: string[] = [
          'none',
          'bright',
          'medium',
          'soft',
          'decay bright',
          'decay medium',
          'decay soft',
        ]
        const oldFilterNames: Dictionary<number> = {
          'sustain sharp': 1,
          'sustain medium': 2,
          'sustain soft': 3,
          'decay sharp': 4,
        }
        let legacyFilter: number =
          oldFilterNames[instrumentObject['filter']] != undefined
            ? oldFilterNames[instrumentObject['filter']]
            : filterNames.indexOf(instrumentObject['filter'])
        if (legacyFilter == -1) legacyFilter = 0
        legacySettings.filterCutoff = legacyToCutoff[legacyFilter]
        legacySettings.filterEnvelope = getEnvelope(
          legacyToEnvelope[legacyFilter],
        )
        legacySettings.filterResonance = 0
      }

      this.convertLegacySettings(legacySettings)
    }

    if (Array.isArray(instrumentObject['envelopes'])) {
      const envelopeArray: any[] = instrumentObject['envelopes']
      for (let i = 0; i < envelopeArray.length; i++) {
        if (this.envelopeCount >= Config.maxEnvelopeCount) break
        const tempEnvelope: EnvelopeSettings = new EnvelopeSettings()
        tempEnvelope.fromJsonObject(envelopeArray[i])
        this.addEnvelope(
          tempEnvelope.target,
          tempEnvelope.index,
          tempEnvelope.envelope,
        )
      }
    }
  }

  public static frequencyFromPitch(pitch: number): number {
    return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0)
  }

  public static drumsetIndexReferenceDelta(index: number): number {
    return (
      Instrument.frequencyFromPitch(Config.spectrumBasePitch + index * 6) /
      44100
    )
  }

  private static _drumsetIndexToSpectrumOctave(index: number) {
    return 15 + Math.log2(Instrument.drumsetIndexReferenceDelta(index))
  }

  public addEnvelope(target: number, index: number, envelope: number): void {
    if (!this.supportsEnvelopeTarget(target, index)) throw new Error()
    if (this.envelopeCount >= Config.maxEnvelopeCount) throw new Error()
    while (this.envelopes.length <= this.envelopeCount)
      this.envelopes[this.envelopes.length] = new EnvelopeSettings()
    const envelopeSettings: EnvelopeSettings =
      this.envelopes[this.envelopeCount]
    envelopeSettings.target = target
    envelopeSettings.index = index
    envelopeSettings.envelope = envelope
    this.envelopeCount++
  }

  public supportsEnvelopeTarget(target: number, index: number): boolean {
    const automationTarget: AutomationTarget =
      Config.instrumentAutomationTargets[target]
    if (index >= automationTarget.maxCount) {
      return false
    }
    if (
      automationTarget.compatibleInstruments != null &&
      automationTarget.compatibleInstruments.indexOf(this.type) == -1
    ) {
      return false
    }
    if (
      automationTarget.effect != null &&
      (this.effects & (1 << automationTarget.effect)) == 0
    ) {
      return false
    }
    if (automationTarget.isFilter) {
      //if (automationTarget.perNote) {
      if (index >= this.noteFilter.controlPointCount) return false
      //} else {
      //	if (index >= this.eqFilter.controlPointCount)   return false;
      //}
    }
    return true
  }

  public clearInvalidEnvelopeTargets(): void {
    for (
      let envelopeIndex = 0;
      envelopeIndex < this.envelopeCount;
      envelopeIndex++
    ) {
      const target: number = this.envelopes[envelopeIndex].target
      const index: number = this.envelopes[envelopeIndex].index
      if (!this.supportsEnvelopeTarget(target, index)) {
        this.envelopes[envelopeIndex].target =
          Config.instrumentAutomationTargets.dictionary['none'].index
        this.envelopes[envelopeIndex].index = 0
      }
    }
  }

  public warmUp(samplesPerSecond: number): void {
    if (this.type == InstrumentType.noise) {
      getDrumWave(
        this.chipNoise,
        inverseRealFourierTransform,
        scaleElementsByFactor,
      )
    } else if (this.type == InstrumentType.harmonics) {
      this.harmonicsWave.getCustomWave(this.type)
    } else if (this.type == InstrumentType.pickedString) {
      this.harmonicsWave.getCustomWave(this.type)
    } else if (this.type == InstrumentType.spectrum) {
      this.spectrumWave.getCustomWave(8)
    } else if (this.type == InstrumentType.drumset) {
      for (let i = 0; i < Config.drumCount; i++) {
        this.drumsetSpectrumWaves[i].getCustomWave(
          Instrument._drumsetIndexToSpectrumOctave(i),
        )
      }
    }
  }

  public getDrumWave(): Float32Array {
    if (this.type == InstrumentType.noise) {
      return getDrumWave(
        this.chipNoise,
        inverseRealFourierTransform,
        scaleElementsByFactor,
      )
    } else if (this.type == InstrumentType.spectrum) {
      return this.spectrumWave.getCustomWave(8)
    } else {
      throw new Error('Unhandled instrument type in getDrumWave')
    }
  }

  public getDrumsetWave(pitch: number): Float32Array {
    if (this.type == InstrumentType.drumset) {
      return this.drumsetSpectrumWaves[pitch].getCustomWave(
        Instrument._drumsetIndexToSpectrumOctave(pitch),
      )
    } else {
      throw new Error('Unhandled instrument type in getDrumsetWave')
    }
  }

  public getTransition(): Transition {
    return effectsIncludeTransition(this.effects)
      ? Config.transitions[this.transition]
      : Config.transitions.dictionary['normal']
  }

  public getFadeInSeconds(): number {
    return this.type == InstrumentType.drumset
      ? 0.0
      : Synth.fadeInSettingToSeconds(this.fadeIn)
  }

  public getFadeOutTicks(): number {
    return this.type == InstrumentType.drumset
      ? Config.drumsetFadeOutTicks
      : Synth.fadeOutSettingToTicks(this.fadeOut)
  }

  public getChord(): Chord {
    return effectsIncludeChord(this.effects)
      ? Config.chords[this.chord]
      : Config.chords.dictionary['simultaneous']
  }

  public getDrumsetEnvelope(pitch: number): Envelope {
    if (this.type != InstrumentType.drumset)
      throw new Error("Can't getDrumsetEnvelope() for non-drumset.")
    return Config.envelopes[this.drumsetEnvelopes[pitch]]
  }
}

export class Channel {
  public octave = 0
  public readonly instruments: Instrument[] = []
  public readonly patterns: Pattern[] = []
  public readonly bars: number[] = []
  public muted = false
}

export class Song {
  private static readonly _format: string = 'BeepBox'
  private static readonly _oldestVersion: number = 2
  private static readonly _latestVersion: number = 9

  public scale: number
  public key: number
  public tempo: number
  public beatsPerBar: number
  public barCount: number
  public patternsPerChannel: number
  public rhythm: number
  public layeredInstruments: boolean
  public patternInstruments: boolean
  public loopStart: number
  public loopLength: number
  public pitchChannelCount: number
  public noiseChannelCount: number
  public readonly channels: Channel[] = []

  constructor(string?: string) {
    if (string != undefined) {
      this.fromBase64String(string)
    } else {
      this.initToDefault(true)
    }
  }

  public getChannelCount(): number {
    return this.pitchChannelCount + this.noiseChannelCount
  }

  public getMaxInstrumentsPerChannel(): number {
    return Math.max(
      this.layeredInstruments
        ? Config.layeredInstrumentCountMax
        : Config.instrumentCountMin,
      this.patternInstruments
        ? Config.patternInstrumentCountMax
        : Config.instrumentCountMin,
    )
  }

  public getMaxInstrumentsPerPattern(channelIndex: number): number {
    return this.getMaxInstrumentsPerPatternForChannel(
      this.channels[channelIndex],
    )
  }

  public getMaxInstrumentsPerPatternForChannel(channel: Channel): number {
    return this.layeredInstruments
      ? Math.min(Config.layeredInstrumentCountMax, channel.instruments.length)
      : 1
  }

  public getChannelIsNoise(channelIndex: number): boolean {
    return channelIndex >= this.pitchChannelCount
  }

  public initToDefault(andResetChannels = true): void {
    this.scale = 0
    this.key = 0
    this.loopStart = 0
    this.loopLength = 4
    this.tempo = 150
    this.beatsPerBar = 8
    this.barCount = 16
    this.patternsPerChannel = 8
    this.rhythm = 1
    this.layeredInstruments = false
    this.patternInstruments = false

    if (andResetChannels) {
      this.pitchChannelCount = 3
      this.noiseChannelCount = 1
      for (
        let channelIndex = 0;
        channelIndex < this.getChannelCount();
        channelIndex++
      ) {
        const isNoiseChannel: boolean = channelIndex >= this.pitchChannelCount
        if (this.channels.length <= channelIndex) {
          this.channels[channelIndex] = new Channel()
        }
        const channel: Channel = this.channels[channelIndex]
        channel.octave = isNoiseChannel ? 0 : 4 - channelIndex // [4, 3, 2, 0]: Descending octaves with drums at zero in last channel.

        for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
          if (channel.patterns.length <= pattern) {
            channel.patterns[pattern] = new Pattern()
          } else {
            channel.patterns[pattern].reset()
          }
        }
        channel.patterns.length = this.patternsPerChannel

        for (
          let instrument = 0;
          instrument < Config.instrumentCountMin;
          instrument++
        ) {
          if (channel.instruments.length <= instrument) {
            channel.instruments[instrument] = new Instrument(isNoiseChannel)
          }
          channel.instruments[instrument].setTypeAndReset(
            isNoiseChannel ? InstrumentType.noise : InstrumentType.chip,
            isNoiseChannel,
          )
        }
        channel.instruments.length = Config.instrumentCountMin

        for (let bar = 0; bar < this.barCount; bar++) {
          channel.bars[bar] = bar < 4 ? 1 : 0
        }
        channel.bars.length = this.barCount
      }
      this.channels.length = this.getChannelCount()
    }
  }

  public toBase64String(): string {
    let bits: BitFieldWriter
    const buffer: number[] = []

    buffer.push(base64IntToCharCode[Song._latestVersion])
    buffer.push(
      SongTagCode.channelCount,
      base64IntToCharCode[this.pitchChannelCount],
      base64IntToCharCode[this.noiseChannelCount],
    )
    buffer.push(SongTagCode.scale, base64IntToCharCode[this.scale])
    buffer.push(SongTagCode.key, base64IntToCharCode[this.key])
    buffer.push(
      SongTagCode.loopStart,
      base64IntToCharCode[this.loopStart >> 6],
      base64IntToCharCode[this.loopStart & 0x3f],
    )
    buffer.push(
      SongTagCode.loopEnd,
      base64IntToCharCode[(this.loopLength - 1) >> 6],
      base64IntToCharCode[(this.loopLength - 1) & 0x3f],
    )
    buffer.push(
      SongTagCode.tempo,
      base64IntToCharCode[this.tempo >> 6],
      base64IntToCharCode[this.tempo & 63],
    )
    buffer.push(
      SongTagCode.beatCount,
      base64IntToCharCode[this.beatsPerBar - 1],
    )
    buffer.push(
      SongTagCode.barCount,
      base64IntToCharCode[(this.barCount - 1) >> 6],
      base64IntToCharCode[(this.barCount - 1) & 0x3f],
    )
    buffer.push(
      SongTagCode.patternCount,
      base64IntToCharCode[(this.patternsPerChannel - 1) >> 6],
      base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f],
    )
    buffer.push(SongTagCode.rhythm, base64IntToCharCode[this.rhythm])

    buffer.push(
      SongTagCode.instrumentCount,
      base64IntToCharCode[
        ((<any>this.layeredInstruments) << 1) | (<any>this.patternInstruments)
      ],
    )
    if (this.layeredInstruments || this.patternInstruments) {
      for (
        let channelIndex = 0;
        channelIndex < this.getChannelCount();
        channelIndex++
      ) {
        buffer.push(
          base64IntToCharCode[
            this.channels[channelIndex].instruments.length -
              Config.instrumentCountMin
          ],
        )
      }
    }

    buffer.push(SongTagCode.channelOctave)
    for (
      let channelIndex = 0;
      channelIndex < this.pitchChannelCount;
      channelIndex++
    ) {
      buffer.push(base64IntToCharCode[this.channels[channelIndex].octave])
    }

    for (
      let channelIndex = 0;
      channelIndex < this.getChannelCount();
      channelIndex++
    ) {
      for (let i = 0; i < this.channels[channelIndex].instruments.length; i++) {
        const instrument: Instrument =
          this.channels[channelIndex].instruments[i]
        buffer.push(
          SongTagCode.startInstrument,
          base64IntToCharCode[instrument.type],
        )
        buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume])
        buffer.push(
          SongTagCode.preset,
          base64IntToCharCode[instrument.preset >> 6],
          base64IntToCharCode[instrument.preset & 63],
        )

        buffer.push(
          SongTagCode.eqFilter,
          base64IntToCharCode[instrument.eqFilter.controlPointCount],
        )
        for (let j = 0; j < instrument.eqFilter.controlPointCount; j++) {
          const point: FilterControlPoint = instrument.eqFilter.controlPoints[j]
          buffer.push(
            base64IntToCharCode[point.type],
            base64IntToCharCode[point.freq],
            base64IntToCharCode[point.gain],
          )
        }

        // The list of enabled effects is represented as a 12-bit bitfield using two six-bit characters.
        buffer.push(
          SongTagCode.effects,
          base64IntToCharCode[instrument.effects >> 6],
          base64IntToCharCode[instrument.effects & 63],
        )
        if (effectsIncludeNoteFilter(instrument.effects)) {
          buffer.push(
            base64IntToCharCode[instrument.noteFilter.controlPointCount],
          )
          for (let j = 0; j < instrument.noteFilter.controlPointCount; j++) {
            const point: FilterControlPoint =
              instrument.noteFilter.controlPoints[j]
            buffer.push(
              base64IntToCharCode[point.type],
              base64IntToCharCode[point.freq],
              base64IntToCharCode[point.gain],
            )
          }
        }
        if (effectsIncludeTransition(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.transition])
        }
        if (effectsIncludeChord(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.chord])
        }
        if (effectsIncludePitchShift(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.pitchShift])
        }
        if (effectsIncludeDetune(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.detune])
        }
        if (effectsIncludeVibrato(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.vibrato])
        }
        if (effectsIncludeDistortion(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.distortion])
        }
        if (effectsIncludeBitcrusher(instrument.effects)) {
          buffer.push(
            base64IntToCharCode[instrument.bitcrusherFreq],
            base64IntToCharCode[instrument.bitcrusherQuantization],
          )
        }
        if (effectsIncludePanning(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.pan])
        }
        if (effectsIncludeChorus(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.chorus])
        }
        if (effectsIncludeEcho(instrument.effects)) {
          buffer.push(
            base64IntToCharCode[instrument.echoSustain],
            base64IntToCharCode[instrument.echoDelay],
          )
        }
        if (effectsIncludeReverb(instrument.effects)) {
          buffer.push(base64IntToCharCode[instrument.reverb])
        }

        if (instrument.type != InstrumentType.drumset) {
          buffer.push(
            SongTagCode.fadeInOut,
            base64IntToCharCode[instrument.fadeIn],
            base64IntToCharCode[instrument.fadeOut],
          )
        }

        if (
          instrument.type == InstrumentType.harmonics ||
          instrument.type == InstrumentType.pickedString
        ) {
          buffer.push(SongTagCode.harmonics)
          const harmonicsBits: BitFieldWriter = new BitFieldWriter()
          for (let i = 0; i < Config.harmonicsControlPoints; i++) {
            harmonicsBits.write(
              Config.harmonicsControlPointBits,
              instrument.harmonicsWave.harmonics[i],
            )
          }
          harmonicsBits.encodeBase64(buffer)
        }

        if (instrument.type == InstrumentType.chip) {
          buffer.push(
            SongTagCode.wave,
            base64IntToCharCode[instrument.chipWave],
          )
          buffer.push(
            SongTagCode.unison,
            base64IntToCharCode[instrument.unison],
          )
        } else if (instrument.type == InstrumentType.fm) {
          buffer.push(
            SongTagCode.algorithm,
            base64IntToCharCode[instrument.algorithm],
          )
          buffer.push(
            SongTagCode.feedbackType,
            base64IntToCharCode[instrument.feedbackType],
          )
          buffer.push(
            SongTagCode.feedbackAmplitude,
            base64IntToCharCode[instrument.feedbackAmplitude],
          )

          buffer.push(SongTagCode.operatorFrequencies)
          for (let o = 0; o < Config.operatorCount; o++) {
            buffer.push(base64IntToCharCode[instrument.operators[o].frequency])
          }
          buffer.push(SongTagCode.operatorAmplitudes)
          for (let o = 0; o < Config.operatorCount; o++) {
            buffer.push(base64IntToCharCode[instrument.operators[o].amplitude])
          }
        } else if (instrument.type == InstrumentType.noise) {
          buffer.push(
            SongTagCode.wave,
            base64IntToCharCode[instrument.chipNoise],
          )
        } else if (instrument.type == InstrumentType.spectrum) {
          buffer.push(SongTagCode.spectrum)
          const spectrumBits: BitFieldWriter = new BitFieldWriter()
          for (let i = 0; i < Config.spectrumControlPoints; i++) {
            spectrumBits.write(
              Config.spectrumControlPointBits,
              instrument.spectrumWave.spectrum[i],
            )
          }
          spectrumBits.encodeBase64(buffer)
        } else if (instrument.type == InstrumentType.drumset) {
          buffer.push(SongTagCode.drumsetEnvelopes)
          for (let j = 0; j < Config.drumCount; j++) {
            buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]])
          }

          buffer.push(SongTagCode.spectrum)
          const spectrumBits: BitFieldWriter = new BitFieldWriter()
          for (let j = 0; j < Config.drumCount; j++) {
            for (let i = 0; i < Config.spectrumControlPoints; i++) {
              spectrumBits.write(
                Config.spectrumControlPointBits,
                instrument.drumsetSpectrumWaves[j].spectrum[i],
              )
            }
          }
          spectrumBits.encodeBase64(buffer)
        } else if (instrument.type == InstrumentType.harmonics) {
          buffer.push(
            SongTagCode.unison,
            base64IntToCharCode[instrument.unison],
          )
        } else if (instrument.type == InstrumentType.pwm) {
          buffer.push(
            SongTagCode.pulseWidth,
            base64IntToCharCode[instrument.pulseWidth],
          )
        } else if (instrument.type == InstrumentType.pickedString) {
          buffer.push(
            SongTagCode.unison,
            base64IntToCharCode[instrument.unison],
          )
          buffer.push(
            SongTagCode.stringSustain,
            base64IntToCharCode[instrument.stringSustain],
          )
        } else {
          throw new Error('Unknown instrument type.')
        }

        buffer.push(
          SongTagCode.envelopes,
          base64IntToCharCode[instrument.envelopeCount],
        )
        for (
          let envelopeIndex = 0;
          envelopeIndex < instrument.envelopeCount;
          envelopeIndex++
        ) {
          buffer.push(
            base64IntToCharCode[instrument.envelopes[envelopeIndex].target],
          )
          if (
            Config.instrumentAutomationTargets[
              instrument.envelopes[envelopeIndex].target
            ].maxCount > 1
          ) {
            buffer.push(
              base64IntToCharCode[instrument.envelopes[envelopeIndex].index],
            )
          }
          buffer.push(
            base64IntToCharCode[instrument.envelopes[envelopeIndex].envelope],
          )
        }
      }
    }

    buffer.push(SongTagCode.bars)
    bits = new BitFieldWriter()
    let neededBits = 0
    while (1 << neededBits < this.patternsPerChannel + 1) neededBits++
    for (
      let channelIndex = 0;
      channelIndex < this.getChannelCount();
      channelIndex++
    )
      for (let i = 0; i < this.barCount; i++) {
        bits.write(neededBits, this.channels[channelIndex].bars[i])
      }
    bits.encodeBase64(buffer)

    buffer.push(SongTagCode.patterns)
    bits = new BitFieldWriter()
    const shapeBits: BitFieldWriter = new BitFieldWriter()
    const bitsPerNoteSize: number = Song.getNeededBits(Config.noteSizeMax)
    for (
      let channelIndex = 0;
      channelIndex < this.getChannelCount();
      channelIndex++
    ) {
      const channel: Channel = this.channels[channelIndex]
      const maxInstrumentsPerPattern: number =
        this.getMaxInstrumentsPerPattern(channelIndex)
      const neededInstrumentCountBits: number = Song.getNeededBits(
        maxInstrumentsPerPattern - Config.instrumentCountMin,
      )
      const neededInstrumentIndexBits: number = Song.getNeededBits(
        channel.instruments.length - 1,
      )
      const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex)
      const octaveOffset: number = isNoiseChannel
        ? 0
        : channel.octave * Config.pitchesPerOctave
      let lastPitch: number = isNoiseChannel ? 4 : octaveOffset
      const recentPitches: number[] = isNoiseChannel
        ? [4, 6, 7, 2, 3, 8, 0, 10]
        : [0, 7, 12, 19, 24, -5, -12]
      const recentShapes: string[] = []
      for (let i = 0; i < recentPitches.length; i++) {
        recentPitches[i] += octaveOffset
      }
      for (const pattern of channel.patterns) {
        if (this.patternInstruments) {
          const instrumentCount: number = validateRange(
            Config.instrumentCountMin,
            maxInstrumentsPerPattern,
            pattern.instruments.length,
          )
          bits.write(
            neededInstrumentCountBits,
            instrumentCount - Config.instrumentCountMin,
          )
          for (let i = 0; i < instrumentCount; i++) {
            bits.write(neededInstrumentIndexBits, pattern.instruments[i])
          }
        }

        if (pattern.notes.length > 0) {
          bits.write(1, 1)

          let curPart = 0
          for (const note of pattern.notes) {
            if (note.start > curPart) {
              bits.write(2, 0) // rest
              bits.writePartDuration(note.start - curPart)
            }

            shapeBits.clear()

            // 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
            for (let i = 1; i < note.pitches.length; i++) shapeBits.write(1, 1)
            if (note.pitches.length < Config.maxChordSize) shapeBits.write(1, 0)

            shapeBits.writePinCount(note.pins.length - 1)

            shapeBits.write(bitsPerNoteSize, note.pins[0].size)

            let shapePart = 0
            const startPitch: number = note.pitches[0]
            let currentPitch: number = startPitch
            const pitchBends: number[] = []
            for (let i = 1; i < note.pins.length; i++) {
              const pin: NotePin = note.pins[i]
              const nextPitch: number = startPitch + pin.interval
              if (currentPitch != nextPitch) {
                shapeBits.write(1, 1)
                pitchBends.push(nextPitch)
                currentPitch = nextPitch
              } else {
                shapeBits.write(1, 0)
              }
              shapeBits.writePartDuration(pin.time - shapePart)
              shapePart = pin.time
              shapeBits.write(bitsPerNoteSize, pin.size)
            }

            const shapeString: string = String.fromCharCode.apply(
              null,
              shapeBits.encodeBase64([]),
            )
            const shapeIndex: number = recentShapes.indexOf(shapeString)
            if (shapeIndex == -1) {
              bits.write(2, 1) // new shape
              bits.concat(shapeBits)
            } else {
              bits.write(1, 1) // old shape
              bits.writeLongTail(0, 0, shapeIndex)
              recentShapes.splice(shapeIndex, 1)
            }
            recentShapes.unshift(shapeString)
            if (recentShapes.length > 10) recentShapes.pop()

            const allPitches: number[] = note.pitches.concat(pitchBends)
            for (let i = 0; i < allPitches.length; i++) {
              const pitch: number = allPitches[i]
              const pitchIndex: number = recentPitches.indexOf(pitch)
              if (pitchIndex == -1) {
                let interval = 0
                let pitchIter: number = lastPitch
                if (pitchIter < pitch) {
                  while (pitchIter != pitch) {
                    pitchIter++
                    if (recentPitches.indexOf(pitchIter) == -1) interval++
                  }
                } else {
                  while (pitchIter != pitch) {
                    pitchIter--
                    if (recentPitches.indexOf(pitchIter) == -1) interval--
                  }
                }
                bits.write(1, 0)
                bits.writePitchInterval(interval)
              } else {
                bits.write(1, 1)
                bits.write(3, pitchIndex)
                recentPitches.splice(pitchIndex, 1)
              }
              recentPitches.unshift(pitch)
              if (recentPitches.length > 8) recentPitches.pop()

              if (i == note.pitches.length - 1) {
                lastPitch = note.pitches[0]
              } else {
                lastPitch = pitch
              }
            }

            if (note.start == 0) {
              bits.write(1, note.continuesLastPattern ? 1 : 0)
            }

            curPart = note.end
          }

          if (curPart < this.beatsPerBar * Config.partsPerBeat) {
            bits.write(2, 0) // rest
            bits.writePartDuration(
              this.beatsPerBar * Config.partsPerBeat - curPart,
            )
          }
        } else {
          bits.write(1, 0)
        }
      }
    }
    let stringLength: number = bits.lengthBase64()
    const digits: number[] = []
    while (stringLength > 0) {
      digits.unshift(base64IntToCharCode[stringLength & 0x3f])
      stringLength = stringLength >> 6
    }
    buffer.push(base64IntToCharCode[digits.length])
    Array.prototype.push.apply(buffer, digits) // append digits to buffer.
    bits.encodeBase64(buffer)

    const maxApplyArgs = 64000
    if (buffer.length < maxApplyArgs) {
      // Note: Function.apply may break for long argument lists.
      return String.fromCharCode.apply(null, buffer)
    } else {
      let result = ''
      for (let i = 0; i < buffer.length; i += maxApplyArgs) {
        result += String.fromCharCode.apply(
          null,
          buffer.slice(i, i + maxApplyArgs),
        )
      }
      return result
    }
  }

  private static _envelopeFromLegacyIndex(legacyIndex: number): Envelope {
    // I swapped the order of "custom"/"steady", now "none"/"note size".
    if (legacyIndex == 0) legacyIndex = 1
    else if (legacyIndex == 1) legacyIndex = 0
    return Config.envelopes[clamp(0, Config.envelopes.length, legacyIndex)]
  }

  public fromBase64String(compressed: string): void {
    if (compressed == null || compressed == '') {
      this.initToDefault(true)
      return
    }
    let charIndex = 0
    // skip whitespace.
    while (compressed.charCodeAt(charIndex) <= CharCode.SPACE) charIndex++
    // skip hash mark.
    if (compressed.charCodeAt(charIndex) == CharCode.HASH) charIndex++
    // if it starts with curly brace, treat it as JSON.
    if (compressed.charCodeAt(charIndex) == CharCode.LEFT_CURLY_BRACE) {
      this.fromJsonObject(
        JSON.parse(
          charIndex == 0 ? compressed : compressed.substring(charIndex),
        ),
      )
      return
    }

    const version: number =
      base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
    if (
      version == -1 ||
      version > Song._latestVersion ||
      version < Song._oldestVersion
    )
      return
    const beforeThree: boolean = version < 3
    const beforeFour: boolean = version < 4
    const beforeFive: boolean = version < 5
    const beforeSix: boolean = version < 6
    const beforeSeven: boolean = version < 7
    const beforeEight: boolean = version < 8
    const beforeNine: boolean = version < 9
    this.initToDefault(beforeNine)

    if (beforeThree) {
      // Originally, the only instrument transition was "instant" and the only drum wave was "retro".
      for (const channel of this.channels) {
        channel.instruments[0].transition =
          Config.transitions.dictionary['interrupt'].index
        channel.instruments[0].effects |= 1 << EffectType.transition
      }
      this.channels[3].instruments[0].chipNoise = 0
    }

    let legacySettingsCache: LegacySettings[][] | null = null
    if (beforeNine) {
      // Unfortunately, old versions of BeepBox had a variety of different ways of saving
      // filter-and-envelope-related parameters in the URL, and none of them directly
      // correspond to the new way of saving these parameters. We can approximate the old
      // settings by collecting all the old settings for an instrument and passing them to
      // convertLegacySettings(), so I use this data structure to collect the settings
      // for each instrument if necessary.
      legacySettingsCache = []
      for (
        let i: number = legacySettingsCache.length;
        i < this.getChannelCount();
        i++
      ) {
        legacySettingsCache[i] = []
        for (let j = 0; j < Config.instrumentCountMin; j++)
          legacySettingsCache[i][j] = {}
      }
    }

    let legacyGlobalReverb = 0 // beforeNine reverb was song-global, record that reverb here and adapt it to instruments as needed.

    let instrumentChannelIterator = 0
    let instrumentIndexIterator = -1
    let command: SongTagCode
    while (charIndex < compressed.length)
      switch ((command = compressed.charCodeAt(charIndex++))) {
        case SongTagCode.channelCount:
          {
            this.pitchChannelCount =
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            this.noiseChannelCount =
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            this.pitchChannelCount = validateRange(
              Config.pitchChannelCountMin,
              Config.pitchChannelCountMax,
              this.pitchChannelCount,
            )
            this.noiseChannelCount = validateRange(
              Config.noiseChannelCountMin,
              Config.noiseChannelCountMax,
              this.noiseChannelCount,
            )
            for (
              let channelIndex = this.channels.length;
              channelIndex < this.getChannelCount();
              channelIndex++
            ) {
              this.channels[channelIndex] = new Channel()
            }
            this.channels.length = this.getChannelCount()
            if (beforeNine) {
              for (
                let i: number = legacySettingsCache!.length;
                i < this.getChannelCount();
                i++
              ) {
                legacySettingsCache![i] = []
                for (let j = 0; j < Config.instrumentCountMin; j++)
                  legacySettingsCache![i][j] = {}
              }
            }
          }
          break
        case SongTagCode.scale:
          {
            this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            if (beforeThree && this.scale == 10) this.scale = 11
          }
          break
        case SongTagCode.key:
          {
            if (beforeSeven) {
              this.key = clamp(
                0,
                Config.keys.length,
                11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            } else {
              this.key = clamp(
                0,
                Config.keys.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.loopStart:
          {
            if (beforeFive) {
              this.loopStart =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            } else {
              this.loopStart =
                (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) +
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            }
          }
          break
        case SongTagCode.loopEnd:
          {
            if (beforeFive) {
              this.loopLength =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            } else {
              this.loopLength =
                (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) +
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
                1
            }
          }
          break
        case SongTagCode.tempo:
          {
            if (beforeFour) {
              this.tempo = [95, 120, 151, 190][
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              ]
            } else if (beforeSeven) {
              this.tempo = [
                88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222,
                240, 259,
              ][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]]
            } else {
              this.tempo =
                (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            }
            this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, this.tempo)
          }
          break
        case SongTagCode.reverb:
          {
            if (beforeNine) {
              legacyGlobalReverb =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              legacyGlobalReverb = clamp(0, 4, legacyGlobalReverb)
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.beatCount:
          {
            if (beforeThree) {
              this.beatsPerBar = [6, 7, 8, 9, 10][
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              ]
            } else {
              this.beatsPerBar =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1
            }
            this.beatsPerBar = Math.max(
              Config.beatsPerBarMin,
              Math.min(Config.beatsPerBarMax, this.beatsPerBar),
            )
          }
          break
        case SongTagCode.barCount:
          {
            const barCount: number =
              (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) +
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
              1
            this.barCount = validateRange(
              Config.barCountMin,
              Config.barCountMax,
              barCount,
            )
            for (
              let channelIndex = 0;
              channelIndex < this.getChannelCount();
              channelIndex++
            ) {
              for (
                let bar = this.channels[channelIndex].bars.length;
                bar < this.barCount;
                bar++
              ) {
                this.channels[channelIndex].bars[bar] = 1
              }
              this.channels[channelIndex].bars.length = this.barCount
            }
          }
          break
        case SongTagCode.patternCount:
          {
            let patternsPerChannel: number
            if (beforeEight) {
              patternsPerChannel =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1
            } else {
              patternsPerChannel =
                (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) +
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
                1
            }
            this.patternsPerChannel = validateRange(
              1,
              Config.barCountMax,
              patternsPerChannel,
            )
            const channelCount: number = this.getChannelCount()
            for (
              let channelIndex = 0;
              channelIndex < channelCount;
              channelIndex++
            ) {
              const patterns: Pattern[] = this.channels[channelIndex].patterns
              for (
                let pattern = patterns.length;
                pattern < this.patternsPerChannel;
                pattern++
              ) {
                patterns[pattern] = new Pattern()
              }
              patterns.length = this.patternsPerChannel
            }
          }
          break
        case SongTagCode.instrumentCount:
          {
            if (beforeNine) {
              const instrumentsPerChannel: number = validateRange(
                Config.instrumentCountMin,
                Config.patternInstrumentCountMax,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
                  Config.instrumentCountMin,
              )
              this.layeredInstruments = false
              this.patternInstruments = instrumentsPerChannel > 1

              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                const isNoiseChannel: boolean =
                  channelIndex >= this.pitchChannelCount
                for (
                  let instrumentIndex: number =
                    this.channels[channelIndex].instruments.length;
                  instrumentIndex < instrumentsPerChannel;
                  instrumentIndex++
                ) {
                  this.channels[channelIndex].instruments[instrumentIndex] =
                    new Instrument(isNoiseChannel)
                }
                this.channels[channelIndex].instruments.length =
                  instrumentsPerChannel
                if (beforeSix) {
                  for (
                    let instrumentIndex = 0;
                    instrumentIndex < instrumentsPerChannel;
                    instrumentIndex++
                  ) {
                    this.channels[channelIndex].instruments[
                      instrumentIndex
                    ].setTypeAndReset(
                      isNoiseChannel
                        ? InstrumentType.noise
                        : InstrumentType.chip,
                      isNoiseChannel,
                    )
                  }
                }

                for (
                  let j: number = legacySettingsCache![channelIndex].length;
                  j < instrumentsPerChannel;
                  j++
                ) {
                  legacySettingsCache![channelIndex][j] = {}
                }
              }
            } else {
              const instrumentsFlagBits: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              this.layeredInstruments = (instrumentsFlagBits & (1 << 1)) != 0
              this.patternInstruments = (instrumentsFlagBits & (1 << 0)) != 0
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                let instrumentCount = 1
                if (this.layeredInstruments || this.patternInstruments) {
                  instrumentCount = validateRange(
                    Config.instrumentCountMin,
                    this.getMaxInstrumentsPerChannel(),
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
                      Config.instrumentCountMin,
                  )
                }
                const channel: Channel = this.channels[channelIndex]
                const isNoiseChannel: boolean =
                  this.getChannelIsNoise(channelIndex)
                for (
                  let i: number = channel.instruments.length;
                  i < instrumentCount;
                  i++
                ) {
                  channel.instruments[i] = new Instrument(isNoiseChannel)
                }
                channel.instruments.length = instrumentCount
              }
            }
          }
          break
        case SongTagCode.rhythm:
          {
            this.rhythm =
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
          }
          break
        case SongTagCode.channelOctave:
          {
            if (beforeThree) {
              const channelIndex: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              this.channels[channelIndex].octave = clamp(
                0,
                Config.pitchOctaves,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1,
              )
              if (channelIndex >= this.pitchChannelCount)
                this.channels[channelIndex].octave = 0
            } else if (beforeNine) {
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                this.channels[channelIndex].octave = clamp(
                  0,
                  Config.pitchOctaves,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1,
                )
                if (channelIndex >= this.pitchChannelCount)
                  this.channels[channelIndex].octave = 0
              }
            } else {
              for (
                let channelIndex = 0;
                channelIndex < this.pitchChannelCount;
                channelIndex++
              ) {
                this.channels[channelIndex].octave = clamp(
                  0,
                  Config.pitchOctaves,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
            }
          }
          break
        case SongTagCode.startInstrument:
          {
            instrumentIndexIterator++
            if (
              instrumentIndexIterator >=
              this.channels[instrumentChannelIterator].instruments.length
            ) {
              instrumentChannelIterator++
              instrumentIndexIterator = 0
            }
            validateRange(
              0,
              this.channels.length - 1,
              instrumentChannelIterator,
            )
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            const instrumentType: number = validateRange(
              0,
              InstrumentType.length - 1,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )
            instrument.setTypeAndReset(
              instrumentType,
              instrumentChannelIterator >= this.pitchChannelCount,
            )

            if (beforeSeven) {
              instrument.effects = 0
              // the reverb effect was applied to all pitched instruments if nonzero but never explicitly enabled if beforeSeven, so enable it here.
              if (
                legacyGlobalReverb > 0 &&
                !this.getChannelIsNoise(instrumentChannelIterator)
              ) {
                instrument.reverb = legacyGlobalReverb
                instrument.effects |= 1 << EffectType.reverb
              }
              // Chip/noise instruments had arpeggio and FM had custom interval but neither
              // explicitly saved the chorus setting beforeSeven so enable it here.
              if (
                instrument.chord !=
                Config.chords.dictionary['simultaneous'].index
              ) {
                // Enable chord if it was used.
                instrument.effects |= 1 << EffectType.chord
              }
            }
          }
          break
        case SongTagCode.preset:
          {
            const presetValue: number =
              (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            this.channels[instrumentChannelIterator].instruments[
              instrumentIndexIterator
            ].preset = presetValue
          }
          break
        case SongTagCode.wave:
          {
            if (beforeThree) {
              const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0]
              const channelIndex: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              const instrument: Instrument =
                this.channels[channelIndex].instruments[0]
              instrument.chipWave = clamp(
                0,
                Config.chipWaves.length,
                legacyWaves[
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                ] | 0,
              )

              // Version 2 didn't save any settings for settings for filters, or envelopes,
              // just waves, so initialize them here I guess.
              instrument.convertLegacySettings(
                legacySettingsCache![channelIndex][0],
              )
            } else if (beforeSix) {
              const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0]
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                for (const instrument of this.channels[channelIndex]
                  .instruments) {
                  if (channelIndex >= this.pitchChannelCount) {
                    instrument.chipNoise = clamp(
                      0,
                      Config.chipNoises.length,
                      base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                    )
                  } else {
                    instrument.chipWave = clamp(
                      0,
                      Config.chipWaves.length,
                      legacyWaves[
                        base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                      ] | 0,
                    )
                  }
                }
              }
            } else if (beforeSeven) {
              const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0]
              if (instrumentChannelIterator >= this.pitchChannelCount) {
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ].chipNoise = clamp(
                  0,
                  Config.chipNoises.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              } else {
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ].chipWave = clamp(
                  0,
                  Config.chipWaves.length,
                  legacyWaves[
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                  ] | 0,
                )
              }
            } else {
              if (instrumentChannelIterator >= this.pitchChannelCount) {
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ].chipNoise = clamp(
                  0,
                  Config.chipNoises.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              } else {
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ].chipWave = clamp(
                  0,
                  Config.chipWaves.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
            }
          }
          break
        case SongTagCode.eqFilter:
          {
            if (beforeNine) {
              if (beforeSeven) {
                const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2]
                const legacyToEnvelope: string[] = [
                  'none',
                  'none',
                  'none',
                  'none',
                  'decay 1',
                  'decay 2',
                  'decay 3',
                ]

                if (beforeThree) {
                  const channelIndex: number =
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                  const instrument: Instrument =
                    this.channels[channelIndex].instruments[0]
                  const legacySettings: LegacySettings =
                    legacySettingsCache![channelIndex][0]
                  const legacyFilter: number = [1, 3, 4, 5][
                    clamp(
                      0,
                      legacyToCutoff.length,
                      base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                    )
                  ]
                  legacySettings.filterCutoff = legacyToCutoff[legacyFilter]
                  legacySettings.filterResonance = 0
                  legacySettings.filterEnvelope =
                    Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]]
                  instrument.convertLegacySettings(legacySettings)
                } else if (beforeSix) {
                  for (
                    let channelIndex = 0;
                    channelIndex < this.getChannelCount();
                    channelIndex++
                  ) {
                    for (
                      let i = 0;
                      i < this.channels[channelIndex].instruments.length;
                      i++
                    ) {
                      const instrument: Instrument =
                        this.channels[channelIndex].instruments[i]
                      const legacySettings: LegacySettings =
                        legacySettingsCache![channelIndex][i]
                      const legacyFilter: number = clamp(
                        0,
                        legacyToCutoff.length,
                        base64CharCodeToInt[
                          compressed.charCodeAt(charIndex++)
                        ] + 1,
                      )
                      if (channelIndex < this.pitchChannelCount) {
                        legacySettings.filterCutoff =
                          legacyToCutoff[legacyFilter]
                        legacySettings.filterResonance = 0
                        legacySettings.filterEnvelope =
                          Config.envelopes.dictionary[
                            legacyToEnvelope[legacyFilter]
                          ]
                      } else {
                        legacySettings.filterCutoff = 10
                        legacySettings.filterResonance = 0
                        legacySettings.filterEnvelope =
                          Config.envelopes.dictionary['none']
                      }
                      instrument.convertLegacySettings(legacySettings)
                    }
                  }
                } else {
                  const legacyFilter: number = clamp(
                    0,
                    legacyToCutoff.length,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  const instrument: Instrument =
                    this.channels[instrumentChannelIterator].instruments[
                      instrumentIndexIterator
                    ]
                  const legacySettings: LegacySettings =
                    legacySettingsCache![instrumentChannelIterator][
                      instrumentIndexIterator
                    ]
                  legacySettings.filterCutoff = legacyToCutoff[legacyFilter]
                  legacySettings.filterResonance = 0
                  instrument.convertLegacySettings(legacySettings)
                }
              } else {
                const filterCutoffRange = 11
                const instrument: Instrument =
                  this.channels[instrumentChannelIterator].instruments[
                    instrumentIndexIterator
                  ]
                const legacySettings: LegacySettings =
                  legacySettingsCache![instrumentChannelIterator][
                    instrumentIndexIterator
                  ]
                legacySettings.filterCutoff = clamp(
                  0,
                  filterCutoffRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.convertLegacySettings(legacySettings)
              }
            } else {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              const originalControlPointCount: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              instrument.eqFilter.controlPointCount = clamp(
                0,
                Config.filterMaxPoints + 1,
                originalControlPointCount,
              )
              for (
                let i: number = instrument.eqFilter.controlPoints.length;
                i < instrument.eqFilter.controlPointCount;
                i++
              ) {
                instrument.eqFilter.controlPoints[i] = new FilterControlPoint()
              }
              for (let i = 0; i < instrument.eqFilter.controlPointCount; i++) {
                const point: FilterControlPoint =
                  instrument.eqFilter.controlPoints[i]
                point.type = clamp(
                  0,
                  FilterType.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                point.freq = clamp(
                  0,
                  Config.filterFreqRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                point.gain = clamp(
                  0,
                  Config.filterGainRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              for (
                let i: number = instrument.eqFilter.controlPointCount;
                i < originalControlPointCount;
                i++
              ) {
                charIndex += 3
              }
            }
          }
          break
        case SongTagCode.filterResonance:
          {
            if (beforeNine) {
              const filterResonanceRange = 8
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              legacySettings.filterResonance = clamp(
                0,
                filterResonanceRange,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              instrument.convertLegacySettings(legacySettings)
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.drumsetEnvelopes:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            if (beforeNine) {
              if (instrument.type == InstrumentType.drumset) {
                for (let i = 0; i < Config.drumCount; i++) {
                  instrument.drumsetEnvelopes[i] =
                    Song._envelopeFromLegacyIndex(
                      base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                    ).index
                }
              } else {
                // This used to be used for general filter envelopes.
                // The presence of an envelope affects how convertLegacySettings
                // decides the closest possible approximation, so update it.
                const legacySettings: LegacySettings =
                  legacySettingsCache![instrumentChannelIterator][
                    instrumentIndexIterator
                  ]
                legacySettings.filterEnvelope = Song._envelopeFromLegacyIndex(
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.convertLegacySettings(legacySettings)
              }
            } else {
              // This tag is now only used for drumset filter envelopes.
              for (let i = 0; i < Config.drumCount; i++) {
                instrument.drumsetEnvelopes[i] = clamp(
                  0,
                  Config.envelopes.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
            }
          }
          break
        case SongTagCode.pulseWidth:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            instrument.pulseWidth = clamp(
              0,
              Config.pulseWidthRange,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )

            if (beforeNine) {
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              legacySettings.pulseEnvelope = Song._envelopeFromLegacyIndex(
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              instrument.convertLegacySettings(legacySettings)
            }
          }
          break
        case SongTagCode.stringSustain:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            instrument.stringSustain = clamp(
              0,
              Config.stringSustainRange,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )
          }
          break
        case SongTagCode.fadeInOut:
          {
            if (beforeNine) {
              // this tag was used for a combination of transition and fade in/out.
              const legacySettings = [
                {
                  transition: 'interrupt',
                  fadeInSeconds: 0.0,
                  fadeOutTicks: -1,
                },
                { transition: 'normal', fadeInSeconds: 0.0, fadeOutTicks: -3 },
                {
                  transition: 'normal',
                  fadeInSeconds: 0.025,
                  fadeOutTicks: -3,
                },
                {
                  transition: 'slide in pattern',
                  fadeInSeconds: 0.025,
                  fadeOutTicks: -3,
                },
                { transition: 'normal', fadeInSeconds: 0.04, fadeOutTicks: 6 },
                { transition: 'normal', fadeInSeconds: 0.0, fadeOutTicks: 48 },
                {
                  transition: 'normal',
                  fadeInSeconds: 0.0125,
                  fadeOutTicks: 72,
                },
                { transition: 'normal', fadeInSeconds: 0.06, fadeOutTicks: 96 },
              ]
              if (beforeThree) {
                const channelIndex: number =
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                const settings =
                  legacySettings[
                    clamp(
                      0,
                      legacySettings.length,
                      base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                    )
                  ]
                const instrument: Instrument =
                  this.channels[channelIndex].instruments[0]
                instrument.fadeIn = Synth.secondsToFadeInSetting(
                  settings.fadeInSeconds,
                )
                instrument.fadeOut = Synth.ticksToFadeOutSetting(
                  settings.fadeOutTicks,
                )
                instrument.transition =
                  Config.transitions.dictionary[settings.transition].index
                if (
                  instrument.transition !=
                  Config.transitions.dictionary['normal'].index
                ) {
                  // Enable transition if it was used.
                  instrument.effects |= 1 << EffectType.transition
                }
              } else if (beforeSix) {
                for (
                  let channelIndex = 0;
                  channelIndex < this.getChannelCount();
                  channelIndex++
                ) {
                  for (const instrument of this.channels[channelIndex]
                    .instruments) {
                    const settings =
                      legacySettings[
                        clamp(
                          0,
                          legacySettings.length,
                          base64CharCodeToInt[
                            compressed.charCodeAt(charIndex++)
                          ],
                        )
                      ]
                    instrument.fadeIn = Synth.secondsToFadeInSetting(
                      settings.fadeInSeconds,
                    )
                    instrument.fadeOut = Synth.ticksToFadeOutSetting(
                      settings.fadeOutTicks,
                    )
                    instrument.transition =
                      Config.transitions.dictionary[settings.transition].index
                    if (
                      instrument.transition !=
                      Config.transitions.dictionary['normal'].index
                    ) {
                      // Enable transition if it was used.
                      instrument.effects |= 1 << EffectType.transition
                    }
                  }
                }
              } else {
                const settings =
                  legacySettings[
                    clamp(
                      0,
                      legacySettings.length,
                      base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                    )
                  ]
                const instrument: Instrument =
                  this.channels[instrumentChannelIterator].instruments[
                    instrumentIndexIterator
                  ]
                instrument.fadeIn = Synth.secondsToFadeInSetting(
                  settings.fadeInSeconds,
                )
                instrument.fadeOut = Synth.ticksToFadeOutSetting(
                  settings.fadeOutTicks,
                )
                instrument.transition =
                  Config.transitions.dictionary[settings.transition].index
                if (
                  instrument.transition !=
                  Config.transitions.dictionary['normal'].index
                ) {
                  // Enable transition if it was used.
                  instrument.effects |= 1 << EffectType.transition
                }
              }
            } else {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              instrument.fadeIn = clamp(
                0,
                Config.fadeInRange,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              instrument.fadeOut = clamp(
                0,
                Config.fadeOutTicks.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.vibrato:
          {
            if (beforeNine) {
              if (beforeSeven) {
                if (beforeThree) {
                  const legacyEffects: number[] = [0, 3, 2, 0]
                  const legacyEnvelopes: string[] = [
                    'none',
                    'none',
                    'none',
                    'tremolo2',
                  ]
                  const channelIndex: number =
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                  const effect: number = clamp(
                    0,
                    legacyEffects.length,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  const instrument: Instrument =
                    this.channels[channelIndex].instruments[0]
                  const legacySettings: LegacySettings =
                    legacySettingsCache![channelIndex][0]
                  instrument.vibrato = legacyEffects[effect]
                  if (
                    legacySettings.filterEnvelope == undefined ||
                    legacySettings.filterEnvelope.type == EnvelopeType.none
                  ) {
                    // Imitate the legacy tremolo with a filter envelope.
                    legacySettings.filterEnvelope =
                      Config.envelopes.dictionary[legacyEnvelopes[effect]]
                    instrument.convertLegacySettings(legacySettings)
                  }
                  if (
                    instrument.vibrato !=
                    Config.vibratos.dictionary['none'].index
                  ) {
                    // Enable vibrato if it was used.
                    instrument.effects |= 1 << EffectType.vibrato
                  }
                } else if (beforeSix) {
                  const legacyEffects: number[] = [0, 1, 2, 3, 0, 0]
                  const legacyEnvelopes: string[] = [
                    'none',
                    'none',
                    'none',
                    'none',
                    'tremolo5',
                    'tremolo2',
                  ]
                  for (
                    let channelIndex = 0;
                    channelIndex < this.getChannelCount();
                    channelIndex++
                  ) {
                    for (
                      let i = 0;
                      i < this.channels[channelIndex].instruments.length;
                      i++
                    ) {
                      const effect: number = clamp(
                        0,
                        legacyEffects.length,
                        base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                      )
                      const instrument: Instrument =
                        this.channels[channelIndex].instruments[i]
                      const legacySettings: LegacySettings =
                        legacySettingsCache![channelIndex][i]
                      instrument.vibrato = legacyEffects[effect]
                      if (
                        legacySettings.filterEnvelope == undefined ||
                        legacySettings.filterEnvelope.type == EnvelopeType.none
                      ) {
                        // Imitate the legacy tremolo with a filter envelope.
                        legacySettings.filterEnvelope =
                          Config.envelopes.dictionary[legacyEnvelopes[effect]]
                        instrument.convertLegacySettings(legacySettings)
                      }
                      if (
                        instrument.vibrato !=
                        Config.vibratos.dictionary['none'].index
                      ) {
                        // Enable vibrato if it was used.
                        instrument.effects |= 1 << EffectType.vibrato
                      }
                      if (
                        legacyGlobalReverb != 0 &&
                        !this.getChannelIsNoise(channelIndex)
                      ) {
                        // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                        instrument.effects |= 1 << EffectType.reverb
                        instrument.reverb = legacyGlobalReverb
                      }
                    }
                  }
                } else {
                  const legacyEffects: number[] = [0, 1, 2, 3, 0, 0]
                  const legacyEnvelopes: string[] = [
                    'none',
                    'none',
                    'none',
                    'none',
                    'tremolo5',
                    'tremolo2',
                  ]
                  const effect: number = clamp(
                    0,
                    legacyEffects.length,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  const instrument: Instrument =
                    this.channels[instrumentChannelIterator].instruments[
                      instrumentIndexIterator
                    ]
                  const legacySettings: LegacySettings =
                    legacySettingsCache![instrumentChannelIterator][
                      instrumentIndexIterator
                    ]
                  instrument.vibrato = legacyEffects[effect]
                  if (
                    legacySettings.filterEnvelope == undefined ||
                    legacySettings.filterEnvelope.type == EnvelopeType.none
                  ) {
                    // Imitate the legacy tremolo with a filter envelope.
                    legacySettings.filterEnvelope =
                      Config.envelopes.dictionary[legacyEnvelopes[effect]]
                    instrument.convertLegacySettings(legacySettings)
                  }
                  if (
                    instrument.vibrato !=
                    Config.vibratos.dictionary['none'].index
                  ) {
                    // Enable vibrato if it was used.
                    instrument.effects |= 1 << EffectType.vibrato
                  }
                  if (legacyGlobalReverb != 0) {
                    // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                    instrument.effects |= 1 << EffectType.reverb
                    instrument.reverb = legacyGlobalReverb
                  }
                }
              } else {
                const instrument: Instrument =
                  this.channels[instrumentChannelIterator].instruments[
                    instrumentIndexIterator
                  ]
                const vibrato: number = clamp(
                  0,
                  Config.vibratos.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.vibrato = vibrato
                if (
                  instrument.vibrato != Config.vibratos.dictionary['none'].index
                ) {
                  // Enable vibrato if it was used.
                  instrument.effects |= 1 << EffectType.vibrato
                }
              }
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.unison:
          {
            if (beforeThree) {
              const channelIndex: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              this.channels[channelIndex].instruments[0].unison = clamp(
                0,
                Config.unisons.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            } else if (beforeSix) {
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                for (const instrument of this.channels[channelIndex]
                  .instruments) {
                  const originalValue: number =
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                  let unison: number = clamp(
                    0,
                    Config.unisons.length,
                    originalValue,
                  )
                  if (originalValue == 8) {
                    // original "custom harmony" now maps to "hum" and "custom interval".
                    unison = 2
                    instrument.chord = 3
                  }
                  instrument.unison = unison
                }
              }
            } else if (beforeSeven) {
              const originalValue: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              let unison: number = clamp(
                0,
                Config.unisons.length,
                originalValue,
              )
              if (originalValue == 8) {
                // original "custom harmony" now maps to "hum" and "custom interval".
                unison = 2
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ].chord = 3
              }
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ].unison = unison
            } else {
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ].unison = clamp(
                0,
                Config.unisons.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.chord:
          {
            if (beforeNine) {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              instrument.chord = clamp(
                0,
                Config.chords.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              if (
                instrument.chord !=
                Config.chords.dictionary['simultaneous'].index
              ) {
                // Enable chord if it was used.
                instrument.effects |= 1 << EffectType.chord
              }
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.effects:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            if (beforeNine) {
              instrument.effects =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)] &
                ((1 << EffectType.length) - 1)
              if (legacyGlobalReverb == 0) {
                // Disable reverb if legacy song reverb was zero.
                instrument.effects &= ~(1 << EffectType.reverb)
              } else if (effectsIncludeReverb(instrument.effects)) {
                instrument.reverb = legacyGlobalReverb
              }
              if (instrument.pan != Config.panCenter) {
                // Enable panning if panning slider isn't centered.
                instrument.effects |= 1 << EffectType.panning
              }
              if (
                instrument.vibrato != Config.vibratos.dictionary['none'].index
              ) {
                // Enable vibrato if it was used.
                instrument.effects |= 1 << EffectType.panning
              }

              // convertLegacySettings may need to force-enable note filter, call
              // it again here to make sure that this override takes precedence.
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              instrument.convertLegacySettings(legacySettings)
            } else {
              // BeepBox currently uses two base64 characters at 6 bits each for a bitfield representing all the enabled effects.
              if (EffectType.length > 12) throw new Error()
              instrument.effects =
                (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]

              if (effectsIncludeNoteFilter(instrument.effects)) {
                const originalControlPointCount: number =
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                instrument.noteFilter.controlPointCount = clamp(
                  0,
                  Config.filterMaxPoints + 1,
                  originalControlPointCount,
                )
                for (
                  let i: number = instrument.noteFilter.controlPoints.length;
                  i < instrument.noteFilter.controlPointCount;
                  i++
                ) {
                  instrument.noteFilter.controlPoints[i] =
                    new FilterControlPoint()
                }
                for (
                  let i = 0;
                  i < instrument.noteFilter.controlPointCount;
                  i++
                ) {
                  const point: FilterControlPoint =
                    instrument.noteFilter.controlPoints[i]
                  point.type = clamp(
                    0,
                    FilterType.length,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  point.freq = clamp(
                    0,
                    Config.filterFreqRange,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  point.gain = clamp(
                    0,
                    Config.filterGainRange,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                }
                for (
                  let i: number = instrument.noteFilter.controlPointCount;
                  i < originalControlPointCount;
                  i++
                ) {
                  charIndex += 3
                }
              }
              if (effectsIncludeTransition(instrument.effects)) {
                instrument.transition = clamp(
                  0,
                  Config.transitions.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeChord(instrument.effects)) {
                instrument.chord = clamp(
                  0,
                  Config.chords.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludePitchShift(instrument.effects)) {
                instrument.pitchShift = clamp(
                  0,
                  Config.pitchShiftRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeDetune(instrument.effects)) {
                instrument.detune = clamp(
                  0,
                  Config.detuneMax + 1,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeVibrato(instrument.effects)) {
                instrument.vibrato = clamp(
                  0,
                  Config.vibratos.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeDistortion(instrument.effects)) {
                instrument.distortion = clamp(
                  0,
                  Config.distortionRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeBitcrusher(instrument.effects)) {
                instrument.bitcrusherFreq = clamp(
                  0,
                  Config.bitcrusherFreqRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.bitcrusherQuantization = clamp(
                  0,
                  Config.bitcrusherQuantizationRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludePanning(instrument.effects)) {
                instrument.pan = clamp(
                  0,
                  Config.panMax + 1,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeChorus(instrument.effects)) {
                instrument.chorus = clamp(
                  0,
                  Config.chorusRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeEcho(instrument.effects)) {
                instrument.echoSustain = clamp(
                  0,
                  Config.echoSustainRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.echoDelay = clamp(
                  0,
                  Config.echoDelayRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
              if (effectsIncludeReverb(instrument.effects)) {
                instrument.reverb = clamp(
                  0,
                  Config.reverbRange,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
              }
            }
            // Clamp the range.
            instrument.effects &= (1 << EffectType.length) - 1
          }
          break
        case SongTagCode.volume:
          {
            if (beforeThree) {
              const channelIndex: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              const instrument: Instrument =
                this.channels[channelIndex].instruments[0]
              instrument.volume = clamp(
                0,
                Config.volumeRange,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              // legacy mute value:
              if (instrument.volume == 5)
                instrument.volume = Config.volumeRange - 1
            } else if (beforeSix) {
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                for (const instrument of this.channels[channelIndex]
                  .instruments) {
                  instrument.volume = clamp(
                    0,
                    Config.volumeRange,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                  // legacy mute value:
                  if (instrument.volume == 5)
                    instrument.volume = Config.volumeRange - 1
                }
              }
            } else if (beforeSeven) {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              instrument.volume = clamp(
                0,
                Config.volumeRange,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              // legacy mute value:
              if (instrument.volume == 5)
                instrument.volume = Config.volumeRange - 1
            } else {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              instrument.volume = clamp(
                0,
                Config.volumeRange,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.pan:
          {
            if (beforeNine) {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              instrument.pan = clamp(
                0,
                Config.panMax + 1,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.algorithm:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            instrument.algorithm = clamp(
              0,
              Config.algorithms.length,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )
            if (beforeNine) {
              // The algorithm determines the carrier count, which affects how legacy settings are imported.
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              instrument.convertLegacySettings(legacySettings)
            }
          }
          break
        case SongTagCode.feedbackType:
          {
            this.channels[instrumentChannelIterator].instruments[
              instrumentIndexIterator
            ].feedbackType = clamp(
              0,
              Config.feedbacks.length,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )
          }
          break
        case SongTagCode.feedbackAmplitude:
          {
            this.channels[instrumentChannelIterator].instruments[
              instrumentIndexIterator
            ].feedbackAmplitude = clamp(
              0,
              Config.operatorAmplitudeMax + 1,
              base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
            )
          }
          break
        case SongTagCode.feedbackEnvelope:
          {
            if (beforeNine) {
              const instrument: Instrument =
                this.channels[instrumentChannelIterator].instruments[
                  instrumentIndexIterator
                ]
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              legacySettings.feedbackEnvelope = Song._envelopeFromLegacyIndex(
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              instrument.convertLegacySettings(legacySettings)
            } else {
              // Do nothing? This song tag code is deprecated for now.
            }
          }
          break
        case SongTagCode.operatorFrequencies:
          {
            for (let o = 0; o < Config.operatorCount; o++) {
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ].operators[o].frequency = clamp(
                0,
                Config.operatorFrequencies.length,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.operatorAmplitudes:
          {
            for (let o = 0; o < Config.operatorCount; o++) {
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ].operators[o].amplitude = clamp(
                0,
                Config.operatorAmplitudeMax + 1,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
            }
          }
          break
        case SongTagCode.envelopes:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            if (beforeNine) {
              const legacySettings: LegacySettings =
                legacySettingsCache![instrumentChannelIterator][
                  instrumentIndexIterator
                ]
              legacySettings.operatorEnvelopes = []
              for (let o = 0; o < Config.operatorCount; o++) {
                legacySettings.operatorEnvelopes[o] =
                  Song._envelopeFromLegacyIndex(
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
              }
              instrument.convertLegacySettings(legacySettings)
            } else {
              const envelopeCount: number = clamp(
                0,
                Config.maxEnvelopeCount + 1,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              for (let i = 0; i < envelopeCount; i++) {
                const target: number = clamp(
                  0,
                  Config.instrumentAutomationTargets.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                let index = 0
                const maxCount: number =
                  Config.instrumentAutomationTargets[target].maxCount
                if (maxCount > 1) {
                  index = clamp(
                    0,
                    maxCount,
                    base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                  )
                }
                const envelope: number = clamp(
                  0,
                  Config.envelopes.length,
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
                )
                instrument.addEnvelope(target, index, envelope)
              }
            }
          }
          break
        case SongTagCode.spectrum:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            if (instrument.type == InstrumentType.spectrum) {
              const byteCount: number = Math.ceil(
                (Config.spectrumControlPoints *
                  Config.spectrumControlPointBits) /
                  6,
              )
              const bits: BitFieldReader = new BitFieldReader(
                compressed,
                charIndex,
                charIndex + byteCount,
              )
              for (let i = 0; i < Config.spectrumControlPoints; i++) {
                instrument.spectrumWave.spectrum[i] = bits.read(
                  Config.spectrumControlPointBits,
                )
              }
              instrument.spectrumWave.markCustomWaveDirty()
              charIndex += byteCount
            } else if (instrument.type == InstrumentType.drumset) {
              const byteCount: number = Math.ceil(
                (Config.drumCount *
                  Config.spectrumControlPoints *
                  Config.spectrumControlPointBits) /
                  6,
              )
              const bits: BitFieldReader = new BitFieldReader(
                compressed,
                charIndex,
                charIndex + byteCount,
              )
              for (let j = 0; j < Config.drumCount; j++) {
                for (let i = 0; i < Config.spectrumControlPoints; i++) {
                  instrument.drumsetSpectrumWaves[j].spectrum[i] = bits.read(
                    Config.spectrumControlPointBits,
                  )
                }
                instrument.drumsetSpectrumWaves[j].markCustomWaveDirty()
              }
              charIndex += byteCount
            } else {
              throw new Error(
                'Unhandled instrument type for spectrum song tag code.',
              )
            }
          }
          break
        case SongTagCode.harmonics:
          {
            const instrument: Instrument =
              this.channels[instrumentChannelIterator].instruments[
                instrumentIndexIterator
              ]
            const byteCount: number = Math.ceil(
              (Config.harmonicsControlPoints *
                Config.harmonicsControlPointBits) /
                6,
            )
            const bits: BitFieldReader = new BitFieldReader(
              compressed,
              charIndex,
              charIndex + byteCount,
            )
            for (let i = 0; i < Config.harmonicsControlPoints; i++) {
              instrument.harmonicsWave.harmonics[i] = bits.read(
                Config.harmonicsControlPointBits,
              )
            }
            instrument.harmonicsWave.markCustomWaveDirty()
            charIndex += byteCount
          }
          break
        case SongTagCode.bars:
          {
            let subStringLength: number
            if (beforeThree) {
              const channelIndex: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              const barCount: number =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              subStringLength = Math.ceil(barCount * 0.5)
              const bits: BitFieldReader = new BitFieldReader(
                compressed,
                charIndex,
                charIndex + subStringLength,
              )
              for (let i = 0; i < barCount; i++) {
                this.channels[channelIndex].bars[i] = bits.read(3) + 1
              }
            } else if (beforeFive) {
              let neededBits = 0
              while (1 << neededBits < this.patternsPerChannel) neededBits++
              subStringLength = Math.ceil(
                (this.getChannelCount() * this.barCount * neededBits) / 6,
              )
              const bits: BitFieldReader = new BitFieldReader(
                compressed,
                charIndex,
                charIndex + subStringLength,
              )
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                for (let i = 0; i < this.barCount; i++) {
                  this.channels[channelIndex].bars[i] =
                    bits.read(neededBits) + 1
                }
              }
            } else {
              let neededBits = 0
              while (1 << neededBits < this.patternsPerChannel + 1) neededBits++
              subStringLength = Math.ceil(
                (this.getChannelCount() * this.barCount * neededBits) / 6,
              )
              const bits: BitFieldReader = new BitFieldReader(
                compressed,
                charIndex,
                charIndex + subStringLength,
              )
              for (
                let channelIndex = 0;
                channelIndex < this.getChannelCount();
                channelIndex++
              ) {
                for (let i = 0; i < this.barCount; i++) {
                  this.channels[channelIndex].bars[i] = bits.read(neededBits)
                }
              }
            }
            charIndex += subStringLength
          }
          break
        case SongTagCode.patterns:
          {
            let bitStringLength = 0
            let channelIndex: number
            if (beforeThree) {
              channelIndex =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]

              // The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default.
              charIndex++ //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

              bitStringLength =
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
              bitStringLength = bitStringLength << 6
              bitStringLength +=
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
            } else {
              channelIndex = 0
              let bitStringLengthLength: number = validateRange(
                1,
                4,
                base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
              )
              while (bitStringLengthLength > 0) {
                bitStringLength = bitStringLength << 6
                bitStringLength +=
                  base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                bitStringLengthLength--
              }
            }

            const bits: BitFieldReader = new BitFieldReader(
              compressed,
              charIndex,
              charIndex + bitStringLength,
            )
            charIndex += bitStringLength

            const bitsPerNoteSize: number = Song.getNeededBits(
              Config.noteSizeMax,
            )
            while (true) {
              const channel: Channel = this.channels[channelIndex]
              const isNoiseChannel: boolean =
                this.getChannelIsNoise(channelIndex)
              const maxInstrumentsPerPattern: number =
                this.getMaxInstrumentsPerPattern(channelIndex)
              const neededInstrumentCountBits: number = Song.getNeededBits(
                maxInstrumentsPerPattern - Config.instrumentCountMin,
              )
              const neededInstrumentIndexBits: number = Song.getNeededBits(
                channel.instruments.length - 1,
              )

              const octaveOffset: number = isNoiseChannel
                ? 0
                : channel.octave * 12
              let lastPitch: number = isNoiseChannel ? 4 : octaveOffset
              const recentPitches: number[] = isNoiseChannel
                ? [4, 6, 7, 2, 3, 8, 0, 10]
                : [0, 7, 12, 19, 24, -5, -12]
              const recentShapes: any[] = []
              for (let i = 0; i < recentPitches.length; i++) {
                recentPitches[i] += octaveOffset
              }
              for (let i = 0; i < this.patternsPerChannel; i++) {
                const newPattern: Pattern = channel.patterns[i]

                if (beforeNine) {
                  newPattern.instruments[0] = validateRange(
                    0,
                    channel.instruments.length - 1,
                    bits.read(neededInstrumentIndexBits),
                  )
                  newPattern.instruments.length = 1
                } else {
                  if (this.patternInstruments) {
                    const instrumentCount: number = validateRange(
                      Config.instrumentCountMin,
                      maxInstrumentsPerPattern,
                      bits.read(neededInstrumentCountBits) +
                        Config.instrumentCountMin,
                    )
                    for (let j = 0; j < instrumentCount; j++) {
                      newPattern.instruments[j] = validateRange(
                        0,
                        channel.instruments.length - 1,
                        bits.read(neededInstrumentIndexBits),
                      )
                    }
                    newPattern.instruments.length = instrumentCount
                  } else {
                    newPattern.instruments[0] = 0
                    newPattern.instruments.length = Config.instrumentCountMin
                  }
                }

                if (!beforeThree && bits.read(1) == 0) {
                  newPattern.notes.length = 0
                  continue
                }

                let curPart = 0
                const newNotes: Note[] = newPattern.notes
                let noteCount = 0
                while (curPart < this.beatsPerBar * Config.partsPerBeat) {
                  const useOldShape: boolean = bits.read(1) == 1
                  let newNote = false
                  let shapeIndex = 0
                  if (useOldShape) {
                    shapeIndex = validateRange(
                      0,
                      recentShapes.length - 1,
                      bits.readLongTail(0, 0),
                    )
                  } else {
                    newNote = bits.read(1) == 1
                  }

                  if (!useOldShape && !newNote) {
                    const restLength: number = beforeSeven
                      ? (bits.readLegacyPartDuration() * Config.partsPerBeat) /
                        Config.rhythms[this.rhythm].stepsPerBeat
                      : bits.readPartDuration()
                    curPart += restLength
                  } else {
                    let shape: any
                    if (useOldShape) {
                      shape = recentShapes[shapeIndex]
                      recentShapes.splice(shapeIndex, 1)
                    } else {
                      shape = {}

                      shape.pitchCount = 1
                      while (
                        shape.pitchCount < Config.maxChordSize &&
                        bits.read(1) == 1
                      )
                        shape.pitchCount++

                      shape.pinCount = bits.readPinCount()
                      shape.initialSize = bits.read(bitsPerNoteSize)

                      shape.pins = []
                      shape.length = 0
                      shape.bendCount = 0
                      for (let j = 0; j < shape.pinCount; j++) {
                        const pinObj: any = {}
                        pinObj.pitchBend = bits.read(1) == 1
                        if (pinObj.pitchBend) shape.bendCount++
                        shape.length += beforeSeven
                          ? (bits.readLegacyPartDuration() *
                              Config.partsPerBeat) /
                            Config.rhythms[this.rhythm].stepsPerBeat
                          : bits.readPartDuration()
                        pinObj.time = shape.length
                        pinObj.size = bits.read(bitsPerNoteSize)
                        shape.pins.push(pinObj)
                      }
                    }
                    recentShapes.unshift(shape)
                    if (recentShapes.length > 10) recentShapes.pop() // TODO: Use Deque?

                    let note: Note
                    if (newNotes.length <= noteCount) {
                      note = new Note(
                        0,
                        curPart,
                        curPart + shape.length,
                        shape.initialSize,
                      )
                      newNotes[noteCount++] = note
                    } else {
                      note = newNotes[noteCount++]
                      note.start = curPart
                      note.end = curPart + shape.length
                      note.pins[0].size = shape.initialSize
                    }

                    let pitch: number
                    let pitchCount = 0
                    const pitchBends: number[] = [] // TODO: allocate this array only once! keep separate length and iterator index. Use Deque?
                    for (
                      let j = 0;
                      j < shape.pitchCount + shape.bendCount;
                      j++
                    ) {
                      const useOldPitch: boolean = bits.read(1) == 1
                      if (!useOldPitch) {
                        const interval: number = bits.readPitchInterval()
                        pitch = lastPitch
                        let intervalIter: number = interval
                        while (intervalIter > 0) {
                          pitch++
                          while (recentPitches.indexOf(pitch) != -1) pitch++
                          intervalIter--
                        }
                        while (intervalIter < 0) {
                          pitch--
                          while (recentPitches.indexOf(pitch) != -1) pitch--
                          intervalIter++
                        }
                      } else {
                        const pitchIndex: number = validateRange(
                          0,
                          recentPitches.length - 1,
                          bits.read(3),
                        )
                        pitch = recentPitches[pitchIndex]
                        recentPitches.splice(pitchIndex, 1)
                      }

                      recentPitches.unshift(pitch)
                      if (recentPitches.length > 8) recentPitches.pop()

                      if (j < shape.pitchCount) {
                        note.pitches[pitchCount++] = pitch
                      } else {
                        pitchBends.push(pitch)
                      }

                      if (j == shape.pitchCount - 1) {
                        lastPitch = note.pitches[0]
                      } else {
                        lastPitch = pitch
                      }
                    }
                    note.pitches.length = pitchCount
                    pitchBends.unshift(note.pitches[0]) // TODO: Use Deque?

                    let pinCount = 1
                    for (const pinObj of shape.pins) {
                      if (pinObj.pitchBend) pitchBends.shift()

                      const interval: number = pitchBends[0] - note.pitches[0]
                      if (note.pins.length <= pinCount) {
                        note.pins[pinCount++] = makeNotePin(
                          interval,
                          pinObj.time,
                          pinObj.size,
                        )
                      } else {
                        const pin: NotePin = note.pins[pinCount++]
                        pin.interval = interval
                        pin.time = pinObj.time
                        pin.size = pinObj.size
                      }
                    }
                    note.pins.length = pinCount

                    if (note.start == 0 && !beforeNine) {
                      note.continuesLastPattern = bits.read(1) == 1
                    } else {
                      note.continuesLastPattern = false
                    }

                    curPart = validateRange(
                      0,
                      this.beatsPerBar * Config.partsPerBeat,
                      note.end,
                    )
                  }
                }
                newNotes.length = noteCount
              }

              if (beforeThree) {
                break
              } else {
                channelIndex++
                if (channelIndex >= this.getChannelCount()) break
              }
            } // while (true)
          }
          break
        default:
          {
            throw new Error(
              'Unrecognized song tag code ' +
                String.fromCharCode(command) +
                ' at index ' +
                (charIndex - 1),
            )
          }
          break
      }
  }

  public toJsonObject(
    enableIntro = true,
    loopCount = 1,
    enableOutro = true,
  ): Object {
    const channelArray: Object[] = []
    for (
      let channelIndex = 0;
      channelIndex < this.getChannelCount();
      channelIndex++
    ) {
      const channel: Channel = this.channels[channelIndex]
      const instrumentArray: Object[] = []
      const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex)
      for (const instrument of channel.instruments) {
        instrumentArray.push(instrument.toJsonObject())
      }

      const patternArray: Object[] = []
      for (const pattern of channel.patterns) {
        const noteArray: Object[] = []
        for (const note of pattern.notes) {
          const pointArray: Object[] = []
          for (const pin of note.pins) {
            pointArray.push({
              tick:
                ((pin.time + note.start) *
                  Config.rhythms[this.rhythm].stepsPerBeat) /
                Config.partsPerBeat,
              pitchBend: pin.interval,
              volume: Math.round((pin.size * 100) / 3),
            })
          }

          const noteObject: any = {
            pitches: note.pitches,
            points: pointArray,
          }
          if (note.start == 0) {
            noteObject['continuesLastPattern'] = note.continuesLastPattern
          }
          noteArray.push(noteObject)
        }

        const patternObject: any = { notes: noteArray }
        if (this.patternInstruments) {
          patternObject['instruments'] = pattern.instruments.map((i) => i + 1)
        }

        patternArray.push(patternObject)
      }

      const sequenceArray: number[] = []
      if (enableIntro)
        for (let i = 0; i < this.loopStart; i++) {
          sequenceArray.push(channel.bars[i])
        }
      for (let l = 0; l < loopCount; l++)
        for (
          let i: number = this.loopStart;
          i < this.loopStart + this.loopLength;
          i++
        ) {
          sequenceArray.push(channel.bars[i])
        }
      if (enableOutro)
        for (
          let i: number = this.loopStart + this.loopLength;
          i < this.barCount;
          i++
        ) {
          sequenceArray.push(channel.bars[i])
        }

      const channelObject: any = {
        type: isNoiseChannel ? 'drum' : 'pitch',
        instruments: instrumentArray,
        patterns: patternArray,
        sequence: sequenceArray,
      }
      if (!isNoiseChannel) {
        // For compatibility with old versions the octave is offset by one.
        channelObject['octaveScrollBar'] = channel.octave - 1
      }
      channelArray.push(channelObject)
    }

    return {
      format: Song._format,
      version: Song._latestVersion,
      scale: Config.scales[this.scale].name,
      key: Config.keys[this.key].name,
      introBars: this.loopStart,
      loopBars: this.loopLength,
      beatsPerBar: this.beatsPerBar,
      ticksPerBeat: Config.rhythms[this.rhythm].stepsPerBeat,
      beatsPerMinute: this.tempo,
      //"patternCount": this.patternsPerChannel, // derive this from pattern arrays.
      layeredInstruments: this.layeredInstruments,
      patternInstruments: this.patternInstruments,
      channels: channelArray,
    }
  }

  public fromJsonObject(jsonObject: any): void {
    this.initToDefault(true)
    if (!jsonObject) return

    //const version: number = jsonObject["version"] | 0;
    //if (version > Song._latestVersion) return; // Go ahead and try to parse something from the future I guess? JSON is pretty easy-going!

    this.scale = 11 // default to expert.
    if (jsonObject['scale'] != undefined) {
      const oldScaleNames: Dictionary<string> = {
        'romani :)': 'dbl harmonic :)',
        'romani :(': 'dbl harmonic :(',
        enigma: 'strange',
      }
      const scaleName: string =
        oldScaleNames[jsonObject['scale']] != undefined
          ? oldScaleNames[jsonObject['scale']]
          : jsonObject['scale']
      const scale: number = Config.scales.findIndex(
        (scale) => scale.name == scaleName,
      )
      if (scale != -1) this.scale = scale
    }

    if (jsonObject['key'] != undefined) {
      if (typeof jsonObject['key'] == 'number') {
        this.key = ((jsonObject['key'] + 1200) >>> 0) % Config.keys.length
      } else if (typeof jsonObject['key'] == 'string') {
        const key: string = jsonObject['key']
        const letter: string = key.charAt(0).toUpperCase()
        const symbol: string = key.charAt(1).toLowerCase()
        const letterMap: Readonly<Dictionary<number>> = {
          C: 0,
          D: 2,
          E: 4,
          F: 5,
          G: 7,
          A: 9,
          B: 11,
        }
        const accidentalMap: Readonly<Dictionary<number>> = {
          '#': 1,
          '♯': 1,
          b: -1,
          '♭': -1,
        }
        let index: number | undefined = letterMap[letter]
        const offset: number | undefined = accidentalMap[symbol]
        if (index != undefined) {
          if (offset != undefined) index += offset
          if (index < 0) index += 12
          index = index % 12
          this.key = index
        }
      }
    }

    if (jsonObject['beatsPerMinute'] != undefined) {
      this.tempo = clamp(
        Config.tempoMin,
        Config.tempoMax + 1,
        jsonObject['beatsPerMinute'] | 0,
      )
    }

    let legacyGlobalReverb = 0 // In older songs, reverb was song-global, record that here and pass it to Instrument.fromJsonObject() for context.
    if (jsonObject['reverb'] != undefined) {
      legacyGlobalReverb = clamp(0, 4, jsonObject['reverb'] | 0)
    }

    if (jsonObject['beatsPerBar'] != undefined) {
      this.beatsPerBar = Math.max(
        Config.beatsPerBarMin,
        Math.min(Config.beatsPerBarMax, jsonObject['beatsPerBar'] | 0),
      )
    }

    let importedPartsPerBeat = 4
    if (jsonObject['ticksPerBeat'] != undefined) {
      importedPartsPerBeat = jsonObject['ticksPerBeat'] | 0 || 4
      this.rhythm = Config.rhythms.findIndex(
        (rhythm) => rhythm.stepsPerBeat == importedPartsPerBeat,
      )
      if (this.rhythm == -1) {
        this.rhythm = 1
      }
    }

    let maxInstruments = 1
    let maxPatterns = 1
    let maxBars = 1
    if (jsonObject['channels'] != undefined) {
      for (const channelObject of jsonObject['channels']) {
        if (channelObject['instruments'])
          maxInstruments = Math.max(
            maxInstruments,
            channelObject['instruments'].length | 0,
          )
        if (channelObject['patterns'])
          maxPatterns = Math.max(
            maxPatterns,
            channelObject['patterns'].length | 0,
          )
        if (channelObject['sequence'])
          maxBars = Math.max(maxBars, channelObject['sequence'].length | 0)
      }
    }

    if (jsonObject['layeredInstruments'] != undefined) {
      this.layeredInstruments = !!jsonObject['layeredInstruments']
    } else {
      this.layeredInstruments = false
    }
    if (jsonObject['patternInstruments'] != undefined) {
      this.patternInstruments = !!jsonObject['patternInstruments']
    } else {
      this.patternInstruments = maxInstruments > 1
    }
    this.patternsPerChannel = Math.min(maxPatterns, Config.barCountMax)
    this.barCount = Math.min(maxBars, Config.barCountMax)

    if (jsonObject['introBars'] != undefined) {
      this.loopStart = clamp(0, this.barCount, jsonObject['introBars'] | 0)
    }
    if (jsonObject['loopBars'] != undefined) {
      this.loopLength = clamp(
        1,
        this.barCount - this.loopStart + 1,
        jsonObject['loopBars'] | 0,
      )
    }

    const newPitchChannels: Channel[] = []
    const newNoiseChannels: Channel[] = []
    if (jsonObject['channels'] != undefined) {
      for (
        let channelIndex = 0;
        channelIndex < jsonObject['channels'].length;
        channelIndex++
      ) {
        const channelObject: any = jsonObject['channels'][channelIndex]

        const channel: Channel = new Channel()

        let isNoiseChannel = false
        if (channelObject['type'] != undefined) {
          isNoiseChannel = channelObject['type'] == 'drum'
        } else {
          // for older files, assume drums are channel 3.
          isNoiseChannel = channelIndex >= 3
        }
        if (isNoiseChannel) {
          newNoiseChannels.push(channel)
        } else {
          newPitchChannels.push(channel)
        }

        if (channelObject['octaveScrollBar'] != undefined) {
          channel.octave = clamp(
            0,
            Config.pitchOctaves,
            (channelObject['octaveScrollBar'] | 0) + 1,
          )
          if (isNoiseChannel) channel.octave = 0
        }

        if (Array.isArray(channelObject['instruments'])) {
          const instrumentObjects: any[] = channelObject['instruments']
          for (let i = 0; i < instrumentObjects.length; i++) {
            if (i >= this.getMaxInstrumentsPerChannel()) break
            const instrument: Instrument = new Instrument(isNoiseChannel)
            channel.instruments[i] = instrument
            instrument.fromJsonObject(
              instrumentObjects[i],
              isNoiseChannel,
              legacyGlobalReverb,
            )
          }
        }

        for (let i = 0; i < this.patternsPerChannel; i++) {
          const pattern: Pattern = new Pattern()
          channel.patterns[i] = pattern

          let patternObject: any = undefined
          if (channelObject['patterns'])
            patternObject = channelObject['patterns'][i]
          if (patternObject == undefined) continue

          if (this.patternInstruments) {
            if (Array.isArray(patternObject['instruments'])) {
              const instruments: any[] = patternObject['instruments']
              const instrumentCount: number = clamp(
                Config.instrumentCountMin,
                this.getMaxInstrumentsPerPatternForChannel(channel) + 1,
                instruments.length,
              )
              for (let j = 0; j < instrumentCount; j++) {
                pattern.instruments[j] = clamp(
                  0,
                  channel.instruments.length,
                  (instruments[j] | 0) - 1,
                )
              }
              pattern.instruments.length = instrumentCount
            } else {
              pattern.instruments[0] = clamp(
                0,
                channel.instruments.length,
                (patternObject['instrument'] | 0) - 1,
              )
              pattern.instruments.length = 1
            }
          }

          if (patternObject['notes'] && patternObject['notes'].length > 0) {
            const maxNoteCount: number = Math.min(
              this.beatsPerBar * Config.partsPerBeat,
              patternObject['notes'].length >>> 0,
            )

            // TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary.
            let tickClock = 0
            for (let j = 0; j < patternObject['notes'].length; j++) {
              if (j >= maxNoteCount) break

              const noteObject = patternObject['notes'][j]
              if (
                !noteObject ||
                !noteObject['pitches'] ||
                !(noteObject['pitches'].length >= 1) ||
                !noteObject['points'] ||
                !(noteObject['points'].length >= 2)
              ) {
                continue
              }

              const note: Note = new Note(0, 0, 0, 0)
              note.pitches = []
              note.pins = []

              for (let k = 0; k < noteObject['pitches'].length; k++) {
                const pitch: number = noteObject['pitches'][k] | 0
                if (note.pitches.indexOf(pitch) != -1) continue
                note.pitches.push(pitch)
                if (note.pitches.length >= Config.maxChordSize) break
              }
              if (note.pitches.length < 1) continue

              let noteClock: number = tickClock
              let startInterval = 0
              for (let k = 0; k < noteObject['points'].length; k++) {
                const pointObject: any = noteObject['points'][k]
                if (
                  pointObject == undefined ||
                  pointObject['tick'] == undefined
                )
                  continue
                const interval: number =
                  pointObject['pitchBend'] == undefined
                    ? 0
                    : pointObject['pitchBend'] | 0

                const time: number = Math.round(
                  (+pointObject['tick'] * Config.partsPerBeat) /
                    importedPartsPerBeat,
                )

                const size: number =
                  pointObject['volume'] == undefined
                    ? 3
                    : Math.max(
                        0,
                        Math.min(
                          3,
                          Math.round(((pointObject['volume'] | 0) * 3) / 100),
                        ),
                      )

                if (time > this.beatsPerBar * Config.partsPerBeat) continue
                if (note.pins.length == 0) {
                  if (time < noteClock) continue
                  note.start = time
                  startInterval = interval
                } else {
                  if (time <= noteClock) continue
                }
                noteClock = time

                note.pins.push(
                  makeNotePin(
                    interval - startInterval,
                    time - note.start,
                    size,
                  ),
                )
              }
              if (note.pins.length < 2) continue

              note.end = note.pins[note.pins.length - 1].time + note.start

              const maxPitch: number = isNoiseChannel
                ? Config.drumCount - 1
                : Config.maxPitch
              let lowestPitch: number = maxPitch
              let highestPitch = 0
              for (let k = 0; k < note.pitches.length; k++) {
                note.pitches[k] += startInterval
                if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
                  note.pitches.splice(k, 1)
                  k--
                }
                if (note.pitches[k] < lowestPitch) lowestPitch = note.pitches[k]
                if (note.pitches[k] > highestPitch)
                  highestPitch = note.pitches[k]
              }
              if (note.pitches.length < 1) continue

              for (let k = 0; k < note.pins.length; k++) {
                const pin: NotePin = note.pins[k]
                if (pin.interval + lowestPitch < 0) pin.interval = -lowestPitch
                if (pin.interval + highestPitch > maxPitch)
                  pin.interval = maxPitch - highestPitch
                if (k >= 2) {
                  if (
                    pin.interval == note.pins[k - 1].interval &&
                    pin.interval == note.pins[k - 2].interval &&
                    pin.size == note.pins[k - 1].size &&
                    pin.size == note.pins[k - 2].size
                  ) {
                    note.pins.splice(k - 1, 1)
                    k--
                  }
                }
              }

              if (note.start == 0) {
                note.continuesLastPattern =
                  noteObject['continuesLastPattern'] === true
              } else {
                note.continuesLastPattern = false
              }

              pattern.notes.push(note)
              tickClock = note.end
            }
          }
        }
        channel.patterns.length = this.patternsPerChannel

        for (let i = 0; i < this.barCount; i++) {
          channel.bars[i] =
            channelObject['sequence'] != undefined
              ? Math.min(
                  this.patternsPerChannel,
                  channelObject['sequence'][i] >>> 0,
                )
              : 0
        }
        channel.bars.length = this.barCount
      }
    }

    if (newPitchChannels.length > Config.pitchChannelCountMax)
      newPitchChannels.length = Config.pitchChannelCountMax
    if (newNoiseChannels.length > Config.noiseChannelCountMax)
      newNoiseChannels.length = Config.noiseChannelCountMax
    this.pitchChannelCount = newPitchChannels.length
    this.noiseChannelCount = newNoiseChannels.length
    this.channels.length = 0
    Array.prototype.push.apply(this.channels, newPitchChannels)
    Array.prototype.push.apply(this.channels, newNoiseChannels)
  }

  public getPattern(channelIndex: number, bar: number): Pattern | null {
    if (bar < 0 || bar >= this.barCount) return null
    const patternIndex: number = this.channels[channelIndex].bars[bar]
    if (patternIndex == 0) return null
    return this.channels[channelIndex].patterns[patternIndex - 1]
  }

  public getBeatsPerMinute(): number {
    return this.tempo
  }

  public static getNeededBits(maxValue: number): number {
    return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1)
  }
}

class PickedString {
  public delayLine: Float32Array | null = null
  public delayIndex: number
  public allPassSample: number
  public allPassPrevInput: number
  public shelfSample: number
  public shelfPrevInput: number
  public fractionalDelaySample: number
  public prevDelayLength: number
  public delayResetOffset: number

  constructor() {
    this.reset()
  }

  public reset(): void {
    this.delayIndex = -1
    this.allPassSample = 0.0
    this.allPassPrevInput = 0.0
    this.shelfSample = 0.0
    this.shelfPrevInput = 0.0
    this.fractionalDelaySample = 0.0
    this.prevDelayLength = -1.0
    this.delayResetOffset = 0
  }
}

class EnvelopeComputer {
  public noteSecondsStart = 0.0
  public noteSecondsEnd = 0.0
  public noteTicksStart = 0.0
  public noteTicksEnd = 0.0
  public noteSizeStart: number = Config.noteSizeMax
  public noteSizeEnd: number = Config.noteSizeMax
  public prevNoteSize: number = Config.noteSizeMax
  public nextNoteSize: number = Config.noteSizeMax
  private _noteSizeFinal: number = Config.noteSizeMax
  public prevNoteSecondsStart = 0.0
  public prevNoteSecondsEnd = 0.0
  public prevNoteTicksStart = 0.0
  public prevNoteTicksEnd = 0.0
  private _prevNoteSizeFinal: number = Config.noteSizeMax

  public prevSlideStart = false
  public prevSlideEnd = false
  public nextSlideStart = false
  public nextSlideEnd = false
  public prevSlideRatioStart = 0.0
  public prevSlideRatioEnd = 0.0
  public nextSlideRatioStart = 0.0
  public nextSlideRatioEnd = 0.0

  public readonly envelopeStarts: number[] = []
  public readonly envelopeEnds: number[] = []
  public lowpassCutoffDecayVolumeCompensation = 1.0

  constructor(/*private _perNote: boolean*/) {
    //const length: number = this._perNote ? NoteAutomationIndex.length : InstrumentAutomationIndex.length;
    const length: number = NoteAutomationIndex.length
    for (let i = 0; i < length; i++) {
      this.envelopeStarts[i] = 1.0
      this.envelopeEnds[i] = 1.0
    }

    this.reset()
  }

  public reset(): void {
    this.noteSecondsEnd = 0.0
    this.noteTicksEnd = 0.0
    this._noteSizeFinal = Config.noteSizeMax
    this.prevNoteSecondsEnd = 0.0
    this.prevNoteTicksEnd = 0.0
    this._prevNoteSizeFinal = Config.noteSizeMax
  }

  public computeEnvelopes(
    instrument: Instrument,
    currentPart: number,
    tickTimeStart: number,
    tickTimeEnd: number,
    secondsPassing: number,
    tone: Tone | null,
  ): void {
    const transition: Transition = instrument.getTransition()
    if (
      tone != null &&
      tone.atNoteStart &&
      !transition.continues &&
      !tone.forceContinueAtStart
    ) {
      this.prevNoteSecondsEnd = this.noteSecondsEnd
      this.prevNoteTicksEnd = this.noteTicksEnd
      this._prevNoteSizeFinal = this._noteSizeFinal
      this.noteSecondsEnd = 0.0
      this.noteTicksEnd = 0.0
    }
    if (tone != null) {
      if (tone.note != null) {
        this._noteSizeFinal = tone.note.pins[tone.note.pins.length - 1].size
      } else {
        this._noteSizeFinal = Config.noteSizeMax
      }
    }

    const ticksPassing: number = tickTimeEnd - tickTimeStart
    const noteSecondsStart: number = this.noteSecondsEnd
    const noteSecondsEnd: number = noteSecondsStart + secondsPassing
    const noteTicksStart: number = this.noteTicksEnd
    const noteTicksEnd: number = noteTicksStart + ticksPassing
    const prevNoteSecondsStart: number = this.prevNoteSecondsEnd
    const prevNoteSecondsEnd: number = prevNoteSecondsStart + secondsPassing
    const prevNoteTicksStart: number = this.prevNoteTicksEnd
    const prevNoteTicksEnd: number = prevNoteTicksStart + ticksPassing

    const beatsPerTick: number =
      1.0 / (Config.ticksPerPart * Config.partsPerBeat)
    const beatTimeStart: number = beatsPerTick * tickTimeStart
    const beatTimeEnd: number = beatsPerTick * tickTimeEnd

    let noteSizeStart: number = this._noteSizeFinal
    let noteSizeEnd: number = this._noteSizeFinal
    const prevNoteSize: number = this._prevNoteSizeFinal
    let nextNoteSize = 0
    let prevSlideStart = false
    let prevSlideEnd = false
    let nextSlideStart = false
    let nextSlideEnd = false
    let prevSlideRatioStart = 0.0
    let prevSlideRatioEnd = 0.0
    let nextSlideRatioStart = 0.0
    let nextSlideRatioEnd = 0.0
    if (tone != null && tone.note != null && !tone.passedEndOfNote) {
      const endPinIndex: number = tone.note.getEndPinIndex(currentPart)
      const startPin: NotePin = tone.note.pins[endPinIndex - 1]
      const endPin: NotePin = tone.note.pins[endPinIndex]
      const startPinTick: number =
        (tone.note.start + startPin.time) * Config.ticksPerPart
      const endPinTick: number =
        (tone.note.start + endPin.time) * Config.ticksPerPart
      const ratioStart: number =
        (tickTimeStart - startPinTick) / (endPinTick - startPinTick)
      const ratioEnd: number =
        (tickTimeEnd - startPinTick) / (endPinTick - startPinTick)
      noteSizeStart = startPin.size + (endPin.size - startPin.size) * ratioStart
      noteSizeEnd = startPin.size + (endPin.size - startPin.size) * ratioEnd

      if (transition.slides) {
        const noteStartTick: number = tone.noteStartPart * Config.ticksPerPart
        const noteEndTick: number = tone.noteEndPart * Config.ticksPerPart
        const noteLengthTicks: number = noteEndTick - noteStartTick
        const maximumSlideTicks: number = noteLengthTicks * 0.5
        const slideTicks: number = Math.min(
          maximumSlideTicks,
          transition.slideTicks,
        )
        if (tone.prevNote != null && !tone.forceContinueAtStart) {
          if (tickTimeStart - noteStartTick < slideTicks) {
            prevSlideStart = true
            prevSlideRatioStart =
              0.5 * (1.0 - (tickTimeStart - noteStartTick) / slideTicks)
          }
          if (tickTimeEnd - noteStartTick < slideTicks) {
            prevSlideEnd = true
            prevSlideRatioEnd =
              0.5 * (1.0 - (tickTimeEnd - noteStartTick) / slideTicks)
          }
        }
        if (tone.nextNote != null && !tone.forceContinueAtEnd) {
          nextNoteSize = tone.nextNote.pins[0].size
          if (noteEndTick - tickTimeStart < slideTicks) {
            nextSlideStart = true
            nextSlideRatioStart =
              0.5 * (1.0 - (noteEndTick - tickTimeStart) / slideTicks)
          }
          if (noteEndTick - tickTimeEnd < slideTicks) {
            nextSlideEnd = true
            nextSlideRatioEnd =
              0.5 * (1.0 - (noteEndTick - tickTimeEnd) / slideTicks)
          }
        }
      }
    }

    let lowpassCutoffDecayVolumeCompensation = 1.0
    let usedNoteSize = false
    for (
      let envelopeIndex = 0;
      envelopeIndex <= instrument.envelopeCount;
      envelopeIndex++
    ) {
      let automationTarget: AutomationTarget
      let targetIndex: number
      let envelope: Envelope
      if (envelopeIndex == instrument.envelopeCount) {
        if (usedNoteSize /*|| !this._perNote*/) break
        // Special case: if no other envelopes used note size, default to applying it to note volume.
        automationTarget =
          Config.instrumentAutomationTargets.dictionary['noteVolume']
        targetIndex = 0
        envelope = Config.envelopes.dictionary['note size']
      } else {
        const envelopeSettings: EnvelopeSettings =
          instrument.envelopes[envelopeIndex]
        automationTarget =
          Config.instrumentAutomationTargets[envelopeSettings.target]
        targetIndex = envelopeSettings.index
        envelope = Config.envelopes[envelopeSettings.envelope]
        if (envelope.type == EnvelopeType.noteSize) usedNoteSize = true
      }
      if (
        /*automationTarget.perNote == this._perNote &&*/ automationTarget.computeIndex !=
        null
      ) {
        const computeIndex: number = automationTarget.computeIndex + targetIndex
        let envelopeStart: number = EnvelopeComputer.computeEnvelope(
          envelope,
          noteSecondsStart,
          beatTimeStart,
          noteSizeStart,
        )
        let envelopeEnd: number = EnvelopeComputer.computeEnvelope(
          envelope,
          noteSecondsEnd,
          beatTimeEnd,
          noteSizeEnd,
        )

        if (prevSlideStart) {
          const other: number = EnvelopeComputer.computeEnvelope(
            envelope,
            prevNoteSecondsStart,
            beatTimeStart,
            prevNoteSize,
          )
          envelopeStart += (other - envelopeStart) * prevSlideRatioStart
        }
        if (prevSlideEnd) {
          const other: number = EnvelopeComputer.computeEnvelope(
            envelope,
            prevNoteSecondsEnd,
            beatTimeEnd,
            prevNoteSize,
          )
          envelopeEnd += (other - envelopeEnd) * prevSlideRatioEnd
        }
        if (nextSlideStart) {
          const other: number = EnvelopeComputer.computeEnvelope(
            envelope,
            0.0,
            beatTimeStart,
            nextNoteSize,
          )
          envelopeStart += (other - envelopeStart) * nextSlideRatioStart
        }
        if (nextSlideEnd) {
          const other: number = EnvelopeComputer.computeEnvelope(
            envelope,
            0.0,
            beatTimeEnd,
            nextNoteSize,
          )
          envelopeEnd += (other - envelopeEnd) * nextSlideRatioEnd
        }

        this.envelopeStarts[computeIndex] *= envelopeStart
        this.envelopeEnds[computeIndex] *= envelopeEnd

        if (automationTarget.isFilter) {
          const filterSettings: FilterSettings =
            /*this._perNote ?*/ instrument.noteFilter /*: instrument.eqFilter*/
          if (
            filterSettings.controlPointCount > targetIndex &&
            filterSettings.controlPoints[targetIndex].type == FilterType.lowPass
          ) {
            lowpassCutoffDecayVolumeCompensation = Math.max(
              lowpassCutoffDecayVolumeCompensation,
              EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(
                envelope,
              ),
            )
          }
        }
      }
    }

    this.noteSecondsStart = noteSecondsStart
    this.noteSecondsEnd = noteSecondsEnd
    this.noteTicksStart = noteTicksStart
    this.noteTicksEnd = noteTicksEnd
    this.prevNoteSecondsStart = prevNoteSecondsStart
    this.prevNoteSecondsEnd = prevNoteSecondsEnd
    this.prevNoteTicksStart = prevNoteTicksStart
    this.prevNoteTicksEnd = prevNoteTicksEnd
    this.prevNoteSize = prevNoteSize
    this.nextNoteSize = nextNoteSize
    this.noteSizeStart = noteSizeStart
    this.noteSizeEnd = noteSizeEnd
    this.prevSlideStart = prevSlideStart
    this.prevSlideEnd = prevSlideEnd
    this.nextSlideStart = nextSlideStart
    this.nextSlideEnd = nextSlideEnd
    this.prevSlideRatioStart = prevSlideRatioStart
    this.prevSlideRatioEnd = prevSlideRatioEnd
    this.nextSlideRatioStart = nextSlideRatioStart
    this.nextSlideRatioEnd = nextSlideRatioEnd
    this.lowpassCutoffDecayVolumeCompensation =
      lowpassCutoffDecayVolumeCompensation
  }

  public clearEnvelopes(instrument: Instrument): void {
    for (
      let envelopeIndex = 0;
      envelopeIndex < instrument.envelopeCount;
      envelopeIndex++
    ) {
      const envelopeSettings: EnvelopeSettings =
        instrument.envelopes[envelopeIndex]
      const automationTarget: AutomationTarget =
        Config.instrumentAutomationTargets[envelopeSettings.target]
      if (
        /*automationTarget.perNote == this._perNote &&*/ automationTarget.computeIndex !=
        null
      ) {
        const computeIndex: number =
          automationTarget.computeIndex + envelopeSettings.index
        this.envelopeStarts[computeIndex] = 1.0
        this.envelopeEnds[computeIndex] = 1.0
      }
    }
    //if (this._perNote) {
    // As a special case, note volume may be altered even if there was no envelope for it.
    this.envelopeStarts[NoteAutomationIndex.noteVolume] = 1.0
    this.envelopeEnds[NoteAutomationIndex.noteVolume] = 1.0
    //}
  }

  public static computeEnvelope(
    envelope: Envelope,
    time: number,
    beats: number,
    noteSize: number,
  ): number {
    switch (envelope.type) {
      case EnvelopeType.noteSize:
        return Synth.noteSizeToVolumeMult(noteSize)
      case EnvelopeType.none:
        return 1.0
      case EnvelopeType.twang:
        return 1.0 / (1.0 + time * envelope.speed)
      case EnvelopeType.swell:
        return 1.0 - 1.0 / (1.0 + time * envelope.speed)
      case EnvelopeType.tremolo:
        return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5
      case EnvelopeType.tremolo2:
        return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25
      case EnvelopeType.punch:
        return Math.max(1.0, 2.0 - time * 10.0)
      case EnvelopeType.flare:
        const attack: number = 0.25 / Math.sqrt(envelope.speed)
        return time < attack
          ? time / attack
          : 1.0 / (1.0 + (time - attack) * envelope.speed)
      case EnvelopeType.decay:
        return Math.pow(2, -envelope.speed * time)
      default:
        throw new Error('Unrecognized operator envelope type.')
    }
  }

  public static getLowpassCutoffDecayVolumeCompensation(
    envelope: Envelope,
  ): number {
    // This is a little hokey in the details, but I designed it a while ago and keep it
    // around for compatibility. This decides how much to increase the volume (or
    // expression) to compensate for a decaying lowpass cutoff to maintain perceived
    // volume overall.
    if (envelope.type == EnvelopeType.decay)
      return 1.25 + 0.025 * envelope.speed
    if (envelope.type == EnvelopeType.twang) return 1.0 + 0.02 * envelope.speed
    return 1.0
  }
}

class Tone {
  public instrumentIndex: number
  public readonly pitches: number[] = Array(Config.maxChordSize).fill(0)
  public pitchCount = 0
  public chordSize = 0
  public drumsetPitch: number | null = null
  public note: Note | null = null
  public prevNote: Note | null = null
  public nextNote: Note | null = null
  public prevNotePitchIndex = 0
  public nextNotePitchIndex = 0
  public freshlyAllocated = true
  public atNoteStart = false
  public isOnLastTick = false // Whether the tone is finished fading out and ready to be freed.
  public passedEndOfNote = false
  public forceContinueAtStart = false
  public forceContinueAtEnd = false
  public noteStartPart = 0
  public noteEndPart = 0
  public ticksSinceReleased = 0
  public liveInputSamplesHeld = 0
  public lastInterval = 0
  public sample = 0.0
  public readonly phases: number[] = []
  public readonly phaseDeltas: number[] = []
  public readonly expressionStarts: number[] = []
  public readonly expressionDeltas: number[] = []
  public readonly phaseDeltaScales: number[] = []
  public prevVibrato: number | null = null
  public pulseWidth = 0.0
  public pulseWidthDelta = 0.0
  public readonly pickedStrings: PickedString[] = []

  public readonly noteFilters: DynamicBiquadFilter[] = []
  public noteFilterCount = 0
  public initialNoteFilterInput1 = 0.0
  public initialNoteFilterInput2 = 0.0

  public specialIntervalMult = 0.0
  public specialIntervalExpressionMult = 1.0
  public readonly feedbackOutputs: number[] = []
  public feedbackMult = 0.0
  public feedbackDelta = 0.0

  public readonly envelopeComputer: EnvelopeComputer =
    new EnvelopeComputer(/*true*/)

  constructor() {
    this.reset()
  }

  public reset(): void {
    this.sample = 0.0
    const maxWaves: number = Math.max(Config.maxChordSize, Config.operatorCount)
    for (let i = 0; i < maxWaves; i++) {
      this.phases[i] = 0.0
      this.feedbackOutputs[i] = 0.0
    }
    for (let i = 0; i < this.noteFilterCount; i++) {
      this.noteFilters[i].resetOutput()
    }
    this.noteFilterCount = 0
    this.initialNoteFilterInput1 = 0.0
    this.initialNoteFilterInput2 = 0.0
    this.liveInputSamplesHeld = 0
    for (const pickedString of this.pickedStrings) {
      pickedString.reset()
    }
    this.envelopeComputer.reset()
    this.prevVibrato = null
    this.drumsetPitch = null
  }
}

class InstrumentState {
  public instrument: Instrument

  public awake = false // Whether the instrument's effects-processing loop should continue.
  public computed = false // Whether the effects-processing parameters are up-to-date for the current synth run.
  public tonesAddedInThisTick = false // Whether any instrument tones are currently active.
  public flushingDelayLines = false // If no tones were active recently, enter a mode where the delay lines are filled with zeros to reset them for later use.
  public deactivateAfterThisTick = false // Whether the instrument is ready to be deactivated because the delay lines, if any, are fully zeroed.
  public attentuationProgress = 0.0 // How long since an active tone introduced an input signal to the delay lines, normalized from 0 to 1 based on how long to wait until the delay lines signal will have audibly dissapated.
  public flushedSamples = 0 // How many delay line samples have been flushed to zero.
  public readonly activeTones: Deque<Tone> = new Deque<Tone>()
  public readonly releasedTones: Deque<Tone> = new Deque<Tone>() // Tones that are in the process of fading out after the corresponding notes ended.
  public readonly liveInputTones: Deque<Tone> = new Deque<Tone>() // Tones that are initiated by a source external to the loaded song data.

  public eqFilterVolumeStart = 1.0
  public eqFilterVolumeDelta = 0.0
  public mixVolumeStart = 1.0
  public mixVolumeDelta = 0.0
  public delayInputMultStart = 0.0
  public delayInputMultDelta = 0.0

  public distortionStart = 0.0
  public distortionEnd = 0.0
  public distortionFractionalInput1 = 0.0
  public distortionFractionalInput2 = 0.0
  public distortionFractionalInput3 = 0.0
  public distortionPrevInput = 0.0
  public distortionNextOutput = 0.0

  public bitcrusherPrevInput = 0.0
  public bitcrusherCurrentOutput = 0.0
  public bitcrusherPhase = 1.0
  public bitcrusherPhaseDelta = 0.0
  public bitcrusherPhaseDeltaScale = 1.0
  public bitcrusherScale = 1.0
  public bitcrusherScaleScale = 1.0
  public bitcrusherFoldLevel = 1.0
  public bitcrusherFoldLevelScale = 1.0

  public readonly eqFilters: DynamicBiquadFilter[] = []
  public eqFilterCount = 0
  public initialEqFilterInput1 = 0.0
  public initialEqFilterInput2 = 0.0

  public panningDelayLine: Float32Array | null = null
  public panningDelayPos = 0
  public panningVolumeStartL = 0.0
  public panningVolumeStartR = 0.0
  public panningVolumeDeltaL = 0.0
  public panningVolumeDeltaR = 0.0
  public panningOffsetStartL = 0.0
  public panningOffsetStartR = 0.0
  public panningOffsetDeltaL = 0.0
  public panningOffsetDeltaR = 0.0

  public chorusDelayLineL: Float32Array | null = null
  public chorusDelayLineR: Float32Array | null = null
  public chorusDelayLineDirty = false
  public chorusDelayPos = 0
  public chorusPhase = 0
  public chorusStart = 0
  public chorusEnd = 0

  public echoDelayLineL: Float32Array | null = null
  public echoDelayLineR: Float32Array | null = null
  public echoDelayLineDirty = false
  public echoDelayPos = 0
  public echoDelayOffsetStart = 0
  public echoDelayOffsetEnd = 0
  public echoDelayOffsetLastTick = 0
  public echoDelayOffsetRatio = 0.0
  public echoDelayOffsetRatioDelta = 0.0
  public echoDelayOffsetLastTickIsComputed = false
  public echoMultStart = 0.0
  public echoMultDelta = 0.0
  public echoShelfA1 = 0.0
  public echoShelfB0 = 0.0
  public echoShelfB1 = 0.0
  public echoShelfSampleL = 0.0
  public echoShelfSampleR = 0.0
  public echoShelfPrevInputL = 0.0
  public echoShelfPrevInputR = 0.0

  public reverbDelayLine: Float32Array | null = null
  public reverbDelayLineDirty = false
  public reverbDelayPos = 0
  public reverbMultStart = 0.0
  public reverbMultDelta = 0.0
  public reverbShelfA1 = 0.0
  public reverbShelfB0 = 0.0
  public reverbShelfB1 = 0.0
  public reverbShelfSample0 = 0.0
  public reverbShelfSample1 = 0.0
  public reverbShelfSample2 = 0.0
  public reverbShelfSample3 = 0.0
  public reverbShelfPrevInput0 = 0.0
  public reverbShelfPrevInput1 = 0.0
  public reverbShelfPrevInput2 = 0.0
  public reverbShelfPrevInput3 = 0.0

  //public readonly envelopeComputer: EnvelopeComputer = new EnvelopeComputer(false);

  public allocateNecessaryBuffers(
    synth: Synth,
    instrument: Instrument,
    samplesPerTick: number,
  ): void {
    if (effectsIncludePanning(instrument.effects)) {
      if (
        this.panningDelayLine == null ||
        this.panningDelayLine.length < synth.panningDelayBufferSize
      ) {
        this.panningDelayLine = new Float32Array(synth.panningDelayBufferSize)
      }
    }
    if (effectsIncludeChorus(instrument.effects)) {
      if (
        this.chorusDelayLineL == null ||
        this.chorusDelayLineL.length < synth.chorusDelayBufferSize
      ) {
        this.chorusDelayLineL = new Float32Array(synth.chorusDelayBufferSize)
      }
      if (
        this.chorusDelayLineR == null ||
        this.chorusDelayLineR.length < synth.chorusDelayBufferSize
      ) {
        this.chorusDelayLineR = new Float32Array(synth.chorusDelayBufferSize)
      }
    }
    if (effectsIncludeEcho(instrument.effects)) {
      // account for tempo and delay automation changing delay length during a tick?
      const safeEchoDelaySteps: number = Math.max(
        Config.echoDelayRange >> 1,
        instrument.echoDelay + 1,
      ) // The delay may be very short now, but if it increases later make sure we have enough sample history.
      const baseEchoDelayBufferSize: number = Synth.fittingPowerOfTwo(
        safeEchoDelaySteps * Config.echoDelayStepTicks * samplesPerTick,
      )
      const safeEchoDelayBufferSize: number = baseEchoDelayBufferSize * 2 // If the tempo or delay changes and we suddenly need a longer delay, make sure that we have enough sample history to accomodate the longer delay.

      if (this.echoDelayLineL == null || this.echoDelayLineR == null) {
        this.echoDelayLineL = new Float32Array(safeEchoDelayBufferSize)
        this.echoDelayLineR = new Float32Array(safeEchoDelayBufferSize)
      } else if (
        this.echoDelayLineL.length < safeEchoDelayBufferSize ||
        this.echoDelayLineR.length < safeEchoDelayBufferSize
      ) {
        // The echo delay length may change whlie the song is playing if tempo changes,
        // so buffers may need to be reallocated, but we don't want to lose any echoes
        // so we need to copy the contents of the old buffer to the new one.
        const newDelayLineL: Float32Array = new Float32Array(
          safeEchoDelayBufferSize,
        )
        const newDelayLineR: Float32Array = new Float32Array(
          safeEchoDelayBufferSize,
        )
        const oldMask: number = this.echoDelayLineL.length - 1

        for (let i = 0; i < this.echoDelayLineL.length; i++) {
          newDelayLineL[i] =
            this.echoDelayLineL[(this.echoDelayPos + i) & oldMask]
          newDelayLineR[i] =
            this.echoDelayLineL[(this.echoDelayPos + i) & oldMask]
        }

        this.echoDelayPos = this.echoDelayLineL.length
        this.echoDelayLineL = newDelayLineL
        this.echoDelayLineR = newDelayLineR
      }
    }
    if (effectsIncludeReverb(instrument.effects)) {
      // TODO: Make reverb delay line sample rate agnostic. Maybe just double buffer size for 96KHz? Adjust attenuation and shelf cutoff appropriately?
      if (this.reverbDelayLine == null) {
        this.reverbDelayLine = new Float32Array(Config.reverbDelayBufferSize)
      }
    }
  }

  public deactivate(): void {
    this.bitcrusherPrevInput = 0.0
    this.bitcrusherCurrentOutput = 0.0
    this.bitcrusherPhase = 1.0
    for (let i = 0; i < this.eqFilterCount; i++) {
      this.eqFilters[i].resetOutput()
    }
    this.eqFilterCount = 0
    this.initialEqFilterInput1 = 0.0
    this.initialEqFilterInput2 = 0.0
    this.distortionFractionalInput1 = 0.0
    this.distortionFractionalInput2 = 0.0
    this.distortionFractionalInput3 = 0.0
    this.distortionPrevInput = 0.0
    this.distortionNextOutput = 0.0
    this.panningDelayPos = 0
    if (this.panningDelayLine != null)
      for (let i = 0; i < this.panningDelayLine.length; i++)
        this.panningDelayLine[i] = 0.0
    this.echoDelayOffsetLastTickIsComputed = false
    this.echoShelfSampleL = 0.0
    this.echoShelfSampleR = 0.0
    this.echoShelfPrevInputL = 0.0
    this.echoShelfPrevInputR = 0.0
    this.reverbShelfSample0 = 0.0
    this.reverbShelfSample1 = 0.0
    this.reverbShelfSample2 = 0.0
    this.reverbShelfSample3 = 0.0
    this.reverbShelfPrevInput0 = 0.0
    this.reverbShelfPrevInput1 = 0.0
    this.reverbShelfPrevInput2 = 0.0
    this.reverbShelfPrevInput3 = 0.0

    this.awake = false
    this.flushingDelayLines = false
    this.deactivateAfterThisTick = false
    this.attentuationProgress = 0.0
    this.flushedSamples = 0
  }

  public resetAllEffects(): void {
    this.deactivate()

    if (this.chorusDelayLineDirty) {
      for (let i = 0; i < this.chorusDelayLineL!.length; i++)
        this.chorusDelayLineL![i] = 0.0
      for (let i = 0; i < this.chorusDelayLineR!.length; i++)
        this.chorusDelayLineR![i] = 0.0
    }
    if (this.echoDelayLineDirty) {
      for (let i = 0; i < this.echoDelayLineL!.length; i++)
        this.echoDelayLineL![i] = 0.0
      for (let i = 0; i < this.echoDelayLineR!.length; i++)
        this.echoDelayLineR![i] = 0.0
    }
    if (this.reverbDelayLineDirty) {
      for (let i = 0; i < this.reverbDelayLine!.length; i++)
        this.reverbDelayLine![i] = 0.0
    }

    this.chorusPhase = 0.0
  }

  public compute(
    synth: Synth,
    instrument: Instrument,
    samplesPerTick: number,
    runLength: number,
    tone: Tone | null,
  ): void {
    this.computed = true

    this.allocateNecessaryBuffers(synth, instrument, samplesPerTick)

    const samplesPerSecond: number = synth.samplesPerSecond
    const tickSampleCountdown: number = synth.tickSampleCountdown
    const tickRemainingStart: number = tickSampleCountdown / samplesPerTick
    const tickRemainingEnd: number =
      (tickSampleCountdown - runLength) / samplesPerTick

    //const ticksIntoBar: number = synth.getTicksIntoBar();
    //const tickTimeStart: number = ticksIntoBar + (1.0 - tickRemainingStart);
    //const tickTimeEnd:   number = ticksIntoBar + (1.0 - tickRemainingEnd);
    //const secondsPerTick: number = samplesPerTick / synth.samplesPerSecond;
    //const currentPart: number = synth.getCurrentPart();
    //this.envelopeComputer.computeEnvelopes(instrument, currentPart, tickTimeStart, tickTimeEnd, secondsPerTick * (tickTimeEnd - tickTimeStart), tone);
    //const envelopeStarts: number[] = this.envelopeComputer.envelopeStarts;
    //const envelopeEnds: number[] = this.envelopeComputer.envelopeEnds;

    const usesDistortion: boolean = effectsIncludeDistortion(instrument.effects)
    const usesBitcrusher: boolean = effectsIncludeBitcrusher(instrument.effects)
    const usesPanning: boolean = effectsIncludePanning(instrument.effects)
    const usesChorus: boolean = effectsIncludeChorus(instrument.effects)
    const usesEcho: boolean = effectsIncludeEcho(instrument.effects)
    const usesReverb: boolean = effectsIncludeReverb(instrument.effects)

    if (usesDistortion) {
      this.distortionStart = Math.min(
        1.0,
        /*envelopeStarts[InstrumentAutomationIndex.distortion] **/ instrument.distortion /
          (Config.distortionRange - 1),
      )
      this.distortionEnd = Math.min(
        1.0,
        /*envelopeEnds[  InstrumentAutomationIndex.distortion] **/ instrument.distortion /
          (Config.distortionRange - 1),
      )
    }

    if (usesBitcrusher) {
      const freqSettingStart: number =
        instrument.bitcrusherFreq /** Math.sqrt(envelopeStarts[InstrumentAutomationIndex.bitcrusherFrequency])*/
      const freqSettingEnd: number =
        instrument.bitcrusherFreq /** Math.sqrt(envelopeEnds[  InstrumentAutomationIndex.bitcrusherFrequency])*/
      const quantizationSettingStart: number =
        instrument.bitcrusherQuantization /** Math.sqrt(envelopeStarts[InstrumentAutomationIndex.bitcrusherQuantization])*/
      const quantizationSettingEnd: number =
        instrument.bitcrusherQuantization /** Math.sqrt(envelopeEnds[  InstrumentAutomationIndex.bitcrusherQuantization])*/

      const basePitch: number = Config.keys[synth.song!.key].basePitch // TODO: What if there's a key change mid-song?
      const freqStart: number =
        Instrument.frequencyFromPitch(basePitch + 60) *
        Math.pow(
          2.0,
          (Config.bitcrusherFreqRange - 1 - freqSettingStart) *
            Config.bitcrusherOctaveStep,
        )
      const freqEnd: number =
        Instrument.frequencyFromPitch(basePitch + 60) *
        Math.pow(
          2.0,
          (Config.bitcrusherFreqRange - 1 - freqSettingEnd) *
            Config.bitcrusherOctaveStep,
        )
      const phaseDeltaStart: number = Math.min(
        1.0,
        freqStart / samplesPerSecond,
      )
      const phaseDeltaEnd: number = Math.min(1.0, freqEnd / samplesPerSecond)
      this.bitcrusherPhaseDelta = phaseDeltaStart
      this.bitcrusherPhaseDeltaScale = Math.pow(
        phaseDeltaEnd / phaseDeltaStart,
        1.0 / runLength,
      )

      const scaleStart: number =
        2.0 *
        Config.bitcrusherBaseVolume *
        Math.pow(
          2.0,
          1.0 -
            Math.pow(
              2.0,
              (Config.bitcrusherQuantizationRange -
                1 -
                quantizationSettingStart) *
                0.5,
            ),
        )
      const scaleEnd: number =
        2.0 *
        Config.bitcrusherBaseVolume *
        Math.pow(
          2.0,
          1.0 -
            Math.pow(
              2.0,
              (Config.bitcrusherQuantizationRange -
                1 -
                quantizationSettingEnd) *
                0.5,
            ),
        )
      this.bitcrusherScale = scaleStart
      this.bitcrusherScaleScale = Math.pow(
        scaleEnd / scaleStart,
        1.0 / runLength,
      )

      const foldLevelStart: number =
        2.0 *
        Config.bitcrusherBaseVolume *
        Math.pow(
          1.5,
          Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart,
        )
      const foldLevelEnd: number =
        2.0 *
        Config.bitcrusherBaseVolume *
        Math.pow(
          1.5,
          Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd,
        )
      this.bitcrusherFoldLevel = foldLevelStart
      this.bitcrusherFoldLevelScale = Math.pow(
        foldLevelEnd / foldLevelStart,
        1.0 / runLength,
      )
    }

    let eqFilterVolume = 1.0 //this.envelopeComputer.lowpassCutoffDecayVolumeCompensation;
    const eqFilterSettings: FilterSettings = instrument.eqFilter
    //const eqAllFreqsEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterAllFreqs];
    //const eqAllFreqsEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterAllFreqs];
    for (let i = 0; i < eqFilterSettings.controlPointCount; i++) {
      //const eqFreqEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterFreq0 + i];
      //const eqFreqEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterFreq0 + i];
      //const eqPeakEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterGain0 + i];
      //const eqPeakEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterGain0 + i];
      const point: FilterControlPoint = eqFilterSettings.controlPoints[i]
      point.toCoefficients(
        Synth.tempFilterStartCoefficients,
        samplesPerSecond,
        /*eqAllFreqsEnvelopeStart * eqFreqEnvelopeStart*/ 1.0,
        /*eqPeakEnvelopeStart*/ 1.0,
      )
      point.toCoefficients(
        Synth.tempFilterEndCoefficients,
        samplesPerSecond,
        /*eqAllFreqsEnvelopeEnd   * eqFreqEnvelopeEnd*/ 1.0,
        /*eqPeakEnvelopeEnd*/ 1.0,
      )
      if (this.eqFilters.length <= i)
        this.eqFilters[i] = new DynamicBiquadFilter()
      this.eqFilters[i].loadCoefficientsWithGradient(
        Synth.tempFilterStartCoefficients,
        Synth.tempFilterEndCoefficients,
        1.0 / runLength,
      )
      eqFilterVolume *= point.getVolumeCompensationMult()
    }
    this.eqFilterCount = eqFilterSettings.controlPointCount
    eqFilterVolume = Math.min(3.0, eqFilterVolume)

    const mainInstrumentVolume: number = Synth.instrumentVolumeToVolumeMult(
      instrument.volume,
    )
    this.mixVolumeStart =
      mainInstrumentVolume /** envelopeStarts[InstrumentAutomationIndex.mixVolume]*/
    const mixVolumeEnd =
      mainInstrumentVolume /** envelopeEnds[  InstrumentAutomationIndex.mixVolume]*/
    this.mixVolumeDelta = (mixVolumeEnd - this.mixVolumeStart) / runLength

    let eqFilterVolumeStart: number = eqFilterVolume
    let eqFilterVolumeEnd: number = eqFilterVolume
    let delayInputMultStart = 1.0
    let delayInputMultEnd = 1.0

    if (usesPanning) {
      //const panEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.panning] * 2.0 - 1.0;
      //const panEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.panning] * 2.0 - 1.0;
      const pan: number = (instrument.pan - Config.panCenter) / Config.panCenter
      const panStart: number = Math.max(
        -1.0,
        Math.min(1.0, pan /** panEnvelopeStart*/),
      )
      const panEnd: number = Math.max(
        -1.0,
        Math.min(1.0, pan /** panEnvelopeEnd  */),
      )
      const volumeStartL: number =
        Math.cos((1 + panStart) * Math.PI * 0.25) * 1.414
      const volumeStartR: number =
        Math.cos((1 - panStart) * Math.PI * 0.25) * 1.414
      const volumeEndL: number = Math.cos((1 + panEnd) * Math.PI * 0.25) * 1.414
      const volumeEndR: number = Math.cos((1 - panEnd) * Math.PI * 0.25) * 1.414
      const maxDelaySamples: number =
        samplesPerSecond * Config.panDelaySecondsMax
      const delayStart: number = panStart * maxDelaySamples
      const delayEnd: number = panEnd * maxDelaySamples
      const delayStartL: number = Math.max(0.0, delayStart)
      const delayStartR: number = Math.max(0.0, -delayStart)
      const delayEndL: number = Math.max(0.0, delayEnd)
      const delayEndR: number = Math.max(0.0, -delayEnd)

      this.panningVolumeStartL = volumeStartL
      this.panningVolumeStartR = volumeStartR
      this.panningVolumeDeltaL = (volumeEndL - volumeStartL) / runLength
      this.panningVolumeDeltaR = (volumeEndR - volumeStartR) / runLength
      this.panningOffsetStartL = delayStartL
      this.panningOffsetStartR = delayStartR
      this.panningOffsetDeltaL = (delayEndL - delayStartL) / runLength
      this.panningOffsetDeltaR = (delayEndR - delayStartR) / runLength
    }

    if (usesChorus) {
      //const chorusEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.chorus];
      //const chorusEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.chorus];
      const chorusStart: number = Math.min(
        1.0,
        /*chorusEnvelopeStart **/ instrument.chorus / (Config.chorusRange - 1),
      )
      const chorusEnd: number = Math.min(
        1.0,
        /*chorusEnvelopeEnd   **/ instrument.chorus / (Config.chorusRange - 1),
      )
      this.chorusStart = chorusStart * 0.6 + Math.pow(chorusStart, 6.0) * 0.4
      this.chorusEnd = chorusEnd * 0.6 + Math.pow(chorusEnd, 6.0) * 0.4
    }

    let maxEchoMult = 0.0
    if (usesEcho) {
      //const echoSustainEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.echoSustain];
      //const echoSustainEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.echoSustain];
      const echoMultStart: number =
        Math.min(
          1.0,
          Math.pow(
            /*echoSustainEnvelopeStart **/ instrument.echoSustain /
              Config.echoSustainRange,
            1.1,
          ),
        ) * 0.9
      const echoMultEnd: number =
        Math.min(
          1.0,
          Math.pow(
            /*echoSustainEnvelopeEnd   **/ instrument.echoSustain /
              Config.echoSustainRange,
            1.1,
          ),
        ) * 0.9
      this.echoMultStart = echoMultStart
      this.echoMultDelta = (echoMultEnd - echoMultStart) / runLength
      maxEchoMult = Math.max(echoMultStart, echoMultEnd)

      // TODO: After computing a tick's settings once for multiple run lengths (which is
      // good for audio worklet threads), compute the echo delay envelopes at tick (or
      // part) boundaries to interpolate between two delay taps.
      //const echoDelayEnvelopeStart:   number = envelopeStarts[InstrumentAutomationIndex.echoDelay];
      //const echoDelayEnvelopeEnd:     number = envelopeEnds[  InstrumentAutomationIndex.echoDelay];
      const echoDelayOffset: number = Math.round(
        (instrument.echoDelay + 1) * Config.echoDelayStepTicks * samplesPerTick,
      )
      if (this.echoDelayOffsetLastTickIsComputed) {
        this.echoDelayOffsetStart = this.echoDelayOffsetLastTick
      } else {
        this.echoDelayOffsetStart = echoDelayOffset
      }
      if (synth.isAtEndOfTick) {
        this.echoDelayOffsetLastTick = echoDelayOffset
        this.echoDelayOffsetLastTickIsComputed = true
      }
      this.echoDelayOffsetEnd = echoDelayOffset

      this.echoDelayOffsetRatio = 1.0 - tickRemainingStart
      this.echoDelayOffsetRatioDelta =
        (tickRemainingStart - tickRemainingEnd) / runLength

      const shelfRadians: number =
        (2.0 * Math.PI * Config.echoShelfHz) / synth.samplesPerSecond
      Synth.tempFilterStartCoefficients.highShelf1stOrder(
        shelfRadians,
        Config.echoShelfGain,
      )
      this.echoShelfA1 = Synth.tempFilterStartCoefficients.a[1]
      this.echoShelfB0 = Synth.tempFilterStartCoefficients.b[0]
      this.echoShelfB1 = Synth.tempFilterStartCoefficients.b[1]
    }

    let maxReverbMult = 0.0
    if (usesReverb) {
      //const reverbEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.reverb];
      //const reverbEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.reverb];
      const reverbStart: number =
        Math.min(
          1.0,
          Math.pow(
            /*reverbEnvelopeStart **/ instrument.reverb / Config.reverbRange,
            0.667,
          ),
        ) * 0.425
      const reverbEnd: number =
        Math.min(
          1.0,
          Math.pow(
            /*reverbEnvelopeEnd   **/ instrument.reverb / Config.reverbRange,
            0.667,
          ),
        ) * 0.425
      this.reverbMultStart = reverbStart
      this.reverbMultDelta = (reverbEnd - reverbStart) / runLength
      maxReverbMult = Math.max(reverbStart, reverbEnd)

      const shelfRadians: number =
        (2.0 * Math.PI * Config.reverbShelfHz) / synth.samplesPerSecond
      Synth.tempFilterStartCoefficients.highShelf1stOrder(
        shelfRadians,
        Config.reverbShelfGain,
      )
      this.reverbShelfA1 = Synth.tempFilterStartCoefficients.a[1]
      this.reverbShelfB0 = Synth.tempFilterStartCoefficients.b[0]
      this.reverbShelfB1 = Synth.tempFilterStartCoefficients.b[1]
    }

    if (this.tonesAddedInThisTick) {
      this.attentuationProgress = 0.0
      this.flushedSamples = 0
      this.flushingDelayLines = false
    } else if (!this.flushingDelayLines) {
      // If this instrument isn't playing tones anymore, the volume can fade out by the
      // end of the first tick. It's possible for filters and the panning delay line to
      // continue past the end of the tone but they should have mostly dissipated by the
      // end of the tick anyway.
      if (this.attentuationProgress == 0.0) {
        eqFilterVolumeStart *= tickRemainingStart
        eqFilterVolumeEnd *= tickRemainingEnd
      } else {
        eqFilterVolumeStart = 0.0
        eqFilterVolumeEnd = 0.0
      }

      const attenuationThreshold: number = 1.0 / 256.0 // when the delay line signal has attenuated this much, it should be inaudible and should be flushed to zero.
      const halfLifeMult: number = -Math.log2(attenuationThreshold)
      let delayDuration = 0.0

      if (usesChorus) {
        delayDuration += Config.chorusMaxDelay
      }

      if (usesEcho) {
        const averageDelaySeconds: number =
          ((this.echoDelayOffsetStart + this.echoDelayOffsetEnd) * 0.5) /
          samplesPerSecond
        const attenuationPerSecond: number = Math.pow(
          maxEchoMult,
          1.0 / averageDelaySeconds,
        )
        const halfLife: number = -1.0 / Math.log2(attenuationPerSecond)
        const echoDuration: number = halfLife * halfLifeMult
        delayDuration += echoDuration
      }

      if (usesReverb) {
        const averageMult: number = maxReverbMult * 2.0
        const averageDelaySeconds: number =
          Config.reverbDelayBufferSize / 4.0 / samplesPerSecond
        const attenuationPerSecond: number = Math.pow(
          averageMult,
          1.0 / averageDelaySeconds,
        )
        const halfLife: number = -1.0 / Math.log2(attenuationPerSecond)
        const reverbDuration: number = halfLife * halfLifeMult
        delayDuration += reverbDuration
      }

      const secondsInTick: number = samplesPerTick / samplesPerSecond
      const progressInTick: number = secondsInTick / delayDuration
      const progressAtEndOfTick: number =
        this.attentuationProgress + progressInTick
      if (progressAtEndOfTick >= 1.0) {
        delayInputMultStart *= tickRemainingStart
        delayInputMultEnd *= tickRemainingEnd
      }
      if (synth.isAtEndOfTick) {
        this.attentuationProgress = progressAtEndOfTick
        if (this.attentuationProgress >= 1.0) {
          this.flushingDelayLines = true
        }
      }
    } else {
      // Flushing delay lines to zero since the signal has mostly dissipated.
      eqFilterVolumeStart = 0.0
      eqFilterVolumeEnd = 0.0
      delayInputMultStart = 0.0
      delayInputMultEnd = 0.0

      let totalDelaySamples = 0
      if (usesChorus) totalDelaySamples += synth.chorusDelayBufferSize
      if (usesEcho) totalDelaySamples += this.echoDelayLineL!.length
      if (usesReverb) totalDelaySamples += Config.reverbDelayBufferSize

      this.flushedSamples += runLength
      if (this.flushedSamples >= totalDelaySamples) {
        this.deactivateAfterThisTick = true
      }
    }

    this.eqFilterVolumeStart = eqFilterVolumeStart
    this.eqFilterVolumeDelta =
      (eqFilterVolumeEnd - eqFilterVolumeStart) / runLength
    this.delayInputMultStart = delayInputMultStart
    this.delayInputMultDelta =
      (delayInputMultEnd - delayInputMultStart) / runLength
  }
}

class ChannelState {
  public readonly instruments: InstrumentState[] = []
  public muted = false
  public singleSeamlessInstrument: number | null = null // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
}

export class Synth {
  private syncSongState(): void {
    const channelCount: number = this.song!.getChannelCount()
    for (let i: number = this.channels.length; i < channelCount; i++) {
      this.channels[i] = new ChannelState()
    }
    this.channels.length = channelCount
    for (let i = 0; i < channelCount; i++) {
      const channel: Channel = this.song!.channels[i]
      const channelState: ChannelState = this.channels[i]
      for (
        let j: number = channelState.instruments.length;
        j < channel.instruments.length;
        j++
      ) {
        channelState.instruments[j] = new InstrumentState()
      }
      channelState.instruments.length = channel.instruments.length

      if (channelState.muted != channel.muted) {
        channelState.muted = channel.muted
        if (channelState.muted) {
          for (const instrumentState of channelState.instruments) {
            instrumentState.resetAllEffects()
          }
        }
      }
    }
  }

  private warmUpSynthesizer(song: Song | null): void {
    if (song != null) {
      this.syncSongState()
      const samplesPerTick: number = this.getSamplesPerTick()
      for (let j = 0; j < song.getChannelCount(); j++) {
        for (let i = 0; i < song.channels[j].instruments.length; i++) {
          const instrument: Instrument = song.channels[j].instruments[i]
          const instrumentState: InstrumentState =
            this.channels[j].instruments[i]
          Synth.getInstrumentSynthFunction(instrument)
          instrument.warmUp(this.samplesPerSecond)
          instrumentState.allocateNecessaryBuffers(
            this,
            instrument,
            samplesPerTick,
          )
        }
      }
    }
  }

  private static operatorAmplitudeCurve(amplitude: number): number {
    return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0
  }

  public samplesPerSecond = 44100
  public stringDelayBufferSize: number
  public stringDelayBufferMask: number
  public panningDelayBufferSize: number
  public panningDelayBufferMask: number
  public chorusDelayBufferSize: number
  public chorusDelayBufferMask: number
  // TODO: reverb

  public song: Song | null = null
  public liveInputDuration = 0
  public liveInputStarted = false
  public liveInputPitches: number[] = []
  public liveInputChannel = 0
  public liveInputInstruments: number[] = []
  public loopRepeatCount = -1
  public volume = 1.0

  private playheadInternal = 0.0
  private bar = 0
  private prevBar: number | null = null
  private nextBar: number | null = null
  private beat = 0
  private part = 0
  private tick = 0
  public isAtStartOfTick = true
  public isAtEndOfTick = true
  public tickSampleCountdown = 0
  private isPlayingSong = false
  private liveInputEndTime = 0.0
  private browserAutomaticallyClearsAudioBuffer = true // Assume true until proven otherwise. Older Chrome does not clear the buffer so it needs to be cleared manually.

  public static readonly tempFilterStartCoefficients: FilterCoefficients =
    new FilterCoefficients()
  public static readonly tempFilterEndCoefficients: FilterCoefficients =
    new FilterCoefficients()
  private tempDrumSetControlPoint: FilterControlPoint = new FilterControlPoint()
  public tempFrequencyResponse: FrequencyResponse = new FrequencyResponse()

  private static readonly fmSynthFunctionCache: Dictionary<Function> = {}
  private static readonly effectsFunctionCache: Function[] = Array(1 << 7).fill(
    undefined,
  ) // keep in sync with the number of post-process effects.
  private static readonly pickedStringFunctionCache: Function[] =
    Array(3).fill(undefined) // keep in sync with the number of unison voices.

  private readonly channels: ChannelState[] = []
  private readonly tonePool: Deque<Tone> = new Deque<Tone>()
  private readonly tempMatchedPitchTones: Array<Tone | null> = Array(
    Config.maxChordSize,
  ).fill(null)

  private limit = 0.0

  private tempMonoInstrumentSampleBuffer: Float32Array | null = null

  public audioCtx: AudioContext | null = null
  private scriptNode: ScriptProcessorNode | null = null

  public get playing(): boolean {
    return this.isPlayingSong
  }

  public get playhead(): number {
    return this.playheadInternal
  }

  public set playhead(value: number) {
    if (this.song != null) {
      this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value))
      let remainder: number = this.playheadInternal
      this.bar = Math.floor(remainder)
      remainder = this.song.beatsPerBar * (remainder - this.bar)
      this.beat = Math.floor(remainder)
      remainder = Config.partsPerBeat * (remainder - this.beat)
      this.part = Math.floor(remainder)
      remainder = Config.ticksPerPart * (remainder - this.part)
      this.tick = Math.floor(remainder)
      const samplesPerTick: number = this.getSamplesPerTick()
      remainder = samplesPerTick * (remainder - this.tick)
      this.tickSampleCountdown = samplesPerTick - remainder
      this.prevBar = null
    }
  }

  public getSamplesPerBar(): number {
    if (this.song == null) throw new Error()
    return (
      this.getSamplesPerTick() *
      Config.ticksPerPart *
      Config.partsPerBeat *
      this.song.beatsPerBar
    )
  }

  public getTicksIntoBar(): number {
    return (
      (this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart +
      this.tick
    )
  }
  public getCurrentPart(): number {
    return this.beat * Config.partsPerBeat + this.part
  }

  public getTotalBars(enableIntro: boolean, enableOutro: boolean): number {
    if (this.song == null) throw new Error()
    let bars: number = this.song.loopLength * (this.loopRepeatCount + 1)
    if (enableIntro) bars += this.song.loopStart
    if (enableOutro)
      bars += this.song.barCount - (this.song.loopStart + this.song.loopLength)
    return bars
  }

  constructor(song: Song | string | null = null) {
    this.computeDelayBufferSizes()
    if (song != null) this.setSong(song)
  }

  public setSong(song: Song | string): void {
    if (typeof song == 'string') {
      this.song = new Song(song)
    } else if (song instanceof Song) {
      this.song = song
    }
    this.prevBar = null
  }

  private computeDelayBufferSizes(): void {
    this.stringDelayBufferSize = Synth.fittingPowerOfTwo(
      this.samplesPerSecond / Instrument.frequencyFromPitch(0),
    )
    this.stringDelayBufferMask = this.stringDelayBufferSize - 1
    this.panningDelayBufferSize = Synth.fittingPowerOfTwo(
      this.samplesPerSecond * Config.panDelaySecondsMax,
    )
    this.panningDelayBufferMask = this.panningDelayBufferSize - 1
    this.chorusDelayBufferSize = Synth.fittingPowerOfTwo(
      this.samplesPerSecond * Config.chorusMaxDelay,
    )
    this.chorusDelayBufferMask = this.chorusDelayBufferSize - 1
  }

  public activateAudio(): void {
    if (this.audioCtx == null || this.scriptNode == null) {
      this.audioCtx = getAudioContext() ?? null
      if (this.audioCtx) {
        this.samplesPerSecond = this.audioCtx.sampleRate
        this.scriptNode = this.audioCtx.createScriptProcessor(2048, 0, 2) // 2048, 0 input channels, 2 output channels
        this.scriptNode.onaudioprocess = this.audioProcessCallback
        this.scriptNode.channelCountMode = 'explicit'
        this.scriptNode.channelInterpretation = 'speakers'

        const audioOutput = getAudioMusicOutput()
        if (audioOutput) {
          this.scriptNode.connect(audioOutput)
        }
      }

      this.computeDelayBufferSizes()
    }
    this.audioCtx?.resume()
  }

  private deactivateAudio(): void {
    if (this.scriptNode != null) {
      const audioOutput = getAudioMusicOutput()
      if (audioOutput) {
        this.scriptNode.disconnect(audioOutput)
      }
      this.scriptNode = null
    }
  }

  public maintainLiveInput(): void {
    this.activateAudio()
    this.liveInputEndTime = performance.now() + 10000.0
  }

  public play(): void {
    if (this.isPlayingSong) return
    this.isPlayingSong = true
    this.activateAudio()
    this.warmUpSynthesizer(this.song)
  }

  public pause(): void {
    if (!this.isPlayingSong) return
    this.isPlayingSong = false
  }

  public snapToStart(): void {
    this.bar = 0
    this.snapToBar()
  }

  public goToBar(bar: number): void {
    this.bar = bar
    this.playheadInternal = this.bar
    this.prevBar = null
  }

  public snapToBar(): void {
    this.playheadInternal = this.bar
    this.beat = 0
    this.part = 0
    this.tick = 0
    this.tickSampleCountdown = 0
    this.isAtStartOfTick = true
    this.prevBar = null
  }

  public resetEffects(): void {
    this.limit = 0.0
    this.freeAllTones()
    if (this.song != null) {
      for (const channelState of this.channels) {
        for (const instrumentState of channelState.instruments) {
          instrumentState.resetAllEffects()
        }
      }
    }
  }

  public jumpIntoLoop(): void {
    if (!this.song) return
    if (
      this.bar < this.song.loopStart ||
      this.bar >= this.song.loopStart + this.song.loopLength
    ) {
      const oldBar: number = this.bar
      this.bar = this.song.loopStart
      this.playheadInternal += this.bar - oldBar
      this.prevBar = null
    }
  }

  public goToNextBar(): void {
    if (!this.song) return
    this.prevBar = this.bar
    const oldBar: number = this.bar
    this.bar++
    if (this.bar >= this.song.barCount) {
      this.bar = 0
    }
    this.playheadInternal += this.bar - oldBar
  }

  public goToPrevBar(): void {
    if (!this.song) return
    this.prevBar = null
    const oldBar: number = this.bar
    this.bar--
    if (this.bar < 0 || this.bar >= this.song.barCount) {
      this.bar = this.song.barCount - 1
    }
    this.playheadInternal += this.bar - oldBar
  }

  private audioProcessCallback = (audioProcessingEvent: any): void => {
    const outputBuffer = audioProcessingEvent.outputBuffer
    const outputDataL: Float32Array = outputBuffer.getChannelData(0)
    const outputDataR: Float32Array = outputBuffer.getChannelData(1)

    if (
      this.browserAutomaticallyClearsAudioBuffer &&
      (outputDataL[0] != 0.0 ||
        outputDataR[0] != 0.0 ||
        outputDataL[outputBuffer.length - 1] != 0.0 ||
        outputDataR[outputBuffer.length - 1] != 0.0)
    ) {
      // If the buffer is ever initially nonzero, then this must be an older browser that doesn't automatically clear the audio buffer.
      this.browserAutomaticallyClearsAudioBuffer = false
    }
    if (!this.browserAutomaticallyClearsAudioBuffer) {
      // If this browser does not clear the buffer automatically, do so manually before continuing.
      const length: number = outputBuffer.length
      for (let i = 0; i < length; i++) {
        outputDataL[i] = 0.0
        outputDataR[i] = 0.0
      }
    }

    const isPlayingLiveTones = performance.now() < this.liveInputEndTime
    if (!isPlayingLiveTones && !this.isPlayingSong) {
      this.deactivateAudio()
    } else {
      this.synthesize(
        outputDataL,
        outputDataR,
        outputBuffer.length,
        this.isPlayingSong,
      )
    }
  }

  public synthesize(
    outputDataL: Float32Array,
    outputDataR: Float32Array,
    outputBufferLength: number,
    playSong = true,
  ): void {
    if (this.song == null) {
      for (let i = 0; i < outputBufferLength; i++) {
        outputDataL[i] = 0.0
        outputDataR[i] = 0.0
      }
      this.deactivateAudio()
      return
    }

    const song: Song = this.song
    const samplesPerTick: number = this.getSamplesPerTick()
    let ended = false

    // Check the bounds of the playhead:
    while (this.tickSampleCountdown <= 0)
      this.tickSampleCountdown += samplesPerTick
    if (this.tickSampleCountdown > samplesPerTick)
      this.tickSampleCountdown = samplesPerTick
    if (playSong) {
      if (this.beat >= song.beatsPerBar) {
        this.bar++
        this.beat = 0
        this.part = 0
        this.tick = 0
        this.tickSampleCountdown = samplesPerTick

        if (
          this.loopRepeatCount != 0 &&
          this.bar == song.loopStart + song.loopLength
        ) {
          this.bar = song.loopStart
          if (this.loopRepeatCount > 0) this.loopRepeatCount--
        }
      }
      if (this.bar >= song.barCount) {
        this.bar = 0
        if (this.loopRepeatCount != -1) {
          ended = true
          this.pause()
        }
      }
    }

    //const synthStartTime: number = performance.now();

    this.syncSongState()

    if (
      this.tempMonoInstrumentSampleBuffer == null ||
      this.tempMonoInstrumentSampleBuffer.length < outputBufferLength
    ) {
      this.tempMonoInstrumentSampleBuffer = new Float32Array(outputBufferLength)
    }

    // Post processing parameters:
    const volume: number = +this.volume
    const limitDecay: number = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond)
    const limitRise: number =
      1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond)
    let limit: number = +this.limit

    let bufferIndex = 0
    while (bufferIndex < outputBufferLength && !ended) {
      this.nextBar = this.bar + 1
      if (
        this.loopRepeatCount != 0 &&
        this.nextBar == song.loopStart + song.loopLength
      ) {
        this.nextBar = song.loopStart
      }
      if (this.nextBar >= song.barCount) this.nextBar = null

      const samplesLeftInBuffer: number = outputBufferLength - bufferIndex
      const samplesLeftInTick: number = Math.ceil(this.tickSampleCountdown)
      const runLength: number = Math.min(samplesLeftInTick, samplesLeftInBuffer)
      this.isAtEndOfTick = runLength >= this.tickSampleCountdown
      for (
        let channelIndex = 0;
        channelIndex < song.getChannelCount();
        channelIndex++
      ) {
        const channel: Channel = song.channels[channelIndex]
        const channelState: ChannelState = this.channels[channelIndex]

        this.determineCurrentActiveTones(song, channelIndex, playSong)
        this.determineLiveInputTones(song, channelIndex)

        for (
          let instrumentIndex = 0;
          instrumentIndex < channel.instruments.length;
          instrumentIndex++
        ) {
          const instrument: Instrument = channel.instruments[instrumentIndex]
          const instrumentState: InstrumentState =
            channelState.instruments[instrumentIndex]
          let tonesPlayedInThisInstrument = 0

          for (let i = 0; i < instrumentState.activeTones.count(); i++) {
            const tone: Tone = instrumentState.activeTones.get(i)
            this.playTone(
              song,
              channelIndex,
              samplesPerTick,
              bufferIndex,
              runLength,
              tone,
              false,
              false,
            )
            tonesPlayedInThisInstrument++
          }

          for (let i = 0; i < instrumentState.liveInputTones.count(); i++) {
            const tone: Tone = instrumentState.liveInputTones.get(i)
            this.playTone(
              song,
              channelIndex,
              samplesPerTick,
              bufferIndex,
              runLength,
              tone,
              false,
              false,
            )
            tonesPlayedInThisInstrument++
          }

          for (let i = 0; i < instrumentState.releasedTones.count(); i++) {
            const tone: Tone = instrumentState.releasedTones.get(i)
            if (
              tone.ticksSinceReleased >= Math.abs(instrument.getFadeOutTicks())
            ) {
              this.freeReleasedTone(instrumentState, i)
              i--
              continue
            }
            const shouldFadeOutFast: boolean =
              tonesPlayedInThisInstrument >= Config.maximumTonesPerChannel
            this.playTone(
              song,
              channelIndex,
              samplesPerTick,
              bufferIndex,
              runLength,
              tone,
              true,
              shouldFadeOutFast,
            )
            tonesPlayedInThisInstrument++
          }

          if (instrumentState.awake) {
            if (!instrumentState.computed) {
              instrumentState.compute(
                this,
                instrument,
                samplesPerTick,
                runLength,
                null,
              )
            }

            Synth.effectsSynth(
              this,
              outputDataL,
              outputDataR,
              bufferIndex,
              runLength,
              instrument,
              instrumentState,
            )

            instrumentState.computed = false
            //instrumentState.envelopeComputer.clearEnvelopes(instrument);
          }
        }
      }

      // Post processing:
      const runEnd: number = bufferIndex + runLength
      for (let i: number = bufferIndex; i < runEnd; i++) {
        // A compressor/limiter.
        const sampleL = outputDataL[i]
        const sampleR = outputDataR[i]
        const abs: number = Math.max(Math.abs(sampleL), Math.abs(sampleR))
        limit +=
          (abs - limit) * (limit < abs ? limitRise : limitDecay * (1.0 + limit))
        const limitedVolume =
          volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25)
        outputDataL[i] = sampleL * limitedVolume
        outputDataR[i] = sampleR * limitedVolume
      }

      bufferIndex += runLength

      this.isAtStartOfTick = false
      this.tickSampleCountdown -= runLength
      if (this.tickSampleCountdown <= 0) {
        this.isAtStartOfTick = true

        // Track how long tones have been released, and free ones that are marked as ending.
        // Also reset awake InstrumentStates that didn't have any Tones during this tick.
        for (const channelState of this.channels) {
          for (const instrumentState of channelState.instruments) {
            for (let i = 0; i < instrumentState.releasedTones.count(); i++) {
              const tone: Tone = instrumentState.releasedTones.get(i)
              if (tone.isOnLastTick) {
                this.freeReleasedTone(instrumentState, i)
                i--
              } else {
                tone.ticksSinceReleased++
              }
            }
            if (instrumentState.deactivateAfterThisTick) {
              instrumentState.deactivate()
            }
            instrumentState.tonesAddedInThisTick = false
          }
        }

        this.tick++
        this.tickSampleCountdown += samplesPerTick
        if (this.tick == Config.ticksPerPart) {
          this.tick = 0
          this.part++
          this.liveInputDuration--

          if (this.part == Config.partsPerBeat) {
            this.part = 0

            if (playSong) {
              this.beat++
              if (this.beat == song.beatsPerBar) {
                // bar changed, reset for next bar:
                this.beat = 0
                this.prevBar = this.bar
                this.bar++
                if (
                  this.loopRepeatCount != 0 &&
                  this.bar == song.loopStart + song.loopLength
                ) {
                  this.bar = song.loopStart
                  if (this.loopRepeatCount > 0) this.loopRepeatCount--
                }
                if (this.bar >= song.barCount) {
                  this.bar = 0
                  if (this.loopRepeatCount != -1) {
                    ended = true
                    this.resetEffects()
                    this.pause()
                  }
                }
              }
            }
          }
        }
      }
    }

    // Avoid persistent denormal or NaN values.
    if (!Number.isFinite(limit) || Math.abs(limit) < epsilon) limit = 0.0
    this.limit = limit

    if (playSong) {
      this.playheadInternal =
        (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 +
          this.part) /
          Config.partsPerBeat +
          this.beat) /
          song.beatsPerBar +
        this.bar
    }

    /*
		const synthDuration: number = performance.now() - synthStartTime;
		// Performance measurements:
		samplesAccumulated += outputBufferLength;
		samplePerformance += synthDuration;
		
		if (samplesAccumulated >= 44100 * 4) {
			const secondsGenerated = samplesAccumulated / 44100;
			const secondsRequired = samplePerformance / 1000;
			const ratio = secondsRequired / secondsGenerated;
			console.log(ratio);
			samplePerformance = 0;
			samplesAccumulated = 0;
		}
		*/
  }

  private freeTone(tone: Tone): void {
    this.tonePool.pushBack(tone)
  }

  private newTone(): Tone {
    if (this.tonePool.count() > 0) {
      const tone: Tone = this.tonePool.popBack()
      tone.freshlyAllocated = true
      return tone
    }
    return new Tone()
  }

  private releaseTone(instrumentState: InstrumentState, tone: Tone): void {
    instrumentState.releasedTones.pushFront(tone)
    tone.atNoteStart = false
    tone.passedEndOfNote = true
  }

  private freeReleasedTone(
    instrumentState: InstrumentState,
    toneIndex: number,
  ): void {
    this.freeTone(instrumentState.releasedTones.get(toneIndex))
    instrumentState.releasedTones.remove(toneIndex)
  }

  public freeAllTones(): void {
    for (const channelState of this.channels) {
      for (const instrumentState of channelState.instruments) {
        while (instrumentState.activeTones.count() > 0)
          this.freeTone(instrumentState.activeTones.popBack())
        while (instrumentState.releasedTones.count() > 0)
          this.freeTone(instrumentState.releasedTones.popBack())
        while (instrumentState.liveInputTones.count() > 0)
          this.freeTone(instrumentState.liveInputTones.popBack())
      }
    }
  }

  private determineLiveInputTones(song: Song, channelIndex: number): void {
    const channel: Channel = song.channels[channelIndex]
    const channelState: ChannelState = this.channels[channelIndex]
    const pitches: number[] = this.liveInputPitches

    for (
      let instrumentIndex = 0;
      instrumentIndex < channel.instruments.length;
      instrumentIndex++
    ) {
      const instrumentState: InstrumentState =
        channelState.instruments[instrumentIndex]
      const toneList: Deque<Tone> = instrumentState.liveInputTones
      let toneCount = 0
      if (
        this.liveInputDuration > 0 &&
        channelIndex == this.liveInputChannel &&
        pitches.length > 0 &&
        this.liveInputInstruments.indexOf(instrumentIndex) != -1
      ) {
        const instrument: Instrument = channel.instruments[instrumentIndex]

        if (instrument.getChord().singleTone) {
          let tone: Tone
          if (toneList.count() <= toneCount) {
            tone = this.newTone()
            toneList.pushBack(tone)
          } else if (
            !instrument.getTransition().isSeamless &&
            this.liveInputStarted
          ) {
            this.releaseTone(instrumentState, toneList.get(toneCount))
            tone = this.newTone()
            toneList.set(toneCount, tone)
          } else {
            tone = toneList.get(toneCount)
          }
          toneCount++

          for (let i = 0; i < pitches.length; i++) {
            tone.pitches[i] = pitches[i]
          }
          tone.pitchCount = pitches.length
          tone.chordSize = 1
          tone.instrumentIndex = instrumentIndex
          tone.note = tone.prevNote = tone.nextNote = null
          tone.atNoteStart = this.liveInputStarted
          tone.forceContinueAtStart = false
          tone.forceContinueAtEnd = false
        } else {
          //const transition: Transition = instrument.getTransition();
          for (let i = 0; i < pitches.length; i++) {
            //const strumOffsetParts: number = i * instrument.getChord().strumParts;

            let tone: Tone
            if (toneList.count() <= toneCount) {
              tone = this.newTone()
              toneList.pushBack(tone)
            } else if (
              !instrument.getTransition().isSeamless &&
              this.liveInputStarted
            ) {
              this.releaseTone(instrumentState, toneList.get(toneCount))
              tone = this.newTone()
              toneList.set(toneCount, tone)
            } else {
              tone = toneList.get(toneCount)
            }
            toneCount++

            tone.pitches[0] = pitches[i]
            tone.pitchCount = 1
            tone.chordSize = pitches.length
            tone.instrumentIndex = instrumentIndex
            tone.note = tone.prevNote = tone.nextNote = null
            tone.atNoteStart = this.liveInputStarted
            tone.forceContinueAtStart = false
            tone.forceContinueAtEnd = false
          }
        }
      }

      while (toneList.count() > toneCount) {
        this.releaseTone(instrumentState, toneList.popBack())
      }
    }

    this.liveInputStarted = false
  }

  // Returns the chord type of the instrument in the adjacent pattern if it is compatible for a
  // seamless transition across patterns, otherwise returns null.
  private adjacentPatternHasCompatibleInstrumentTransition(
    song: Song,
    channel: Channel,
    pattern: Pattern,
    otherPattern: Pattern,
    instrumentIndex: number,
    transition: Transition,
    chord: Chord,
    note: Note,
    otherNote: Note,
    forceContinue: boolean,
  ): Chord | null {
    if (
      song.patternInstruments &&
      otherPattern.instruments.indexOf(instrumentIndex) == -1
    ) {
      // The adjacent pattern does not contain the same instrument as the current pattern.

      if (
        pattern.instruments.length > 1 ||
        otherPattern.instruments.length > 1
      ) {
        // The current or adjacent pattern contains more than one instrument, don't bother
        // trying to connect them.
        return null
      }
      // Otherwise, the two patterns each contain one instrument, but not the same instrument.
      // Try to connect them.
      const otherInstrument: Instrument =
        channel.instruments[otherPattern.instruments[0]]

      if (forceContinue) {
        // Even non-seamless instruments can be connected across patterns if forced.
        return otherInstrument.getChord()
      }

      // Otherwise, check that both instruments are seamless across patterns.
      const otherTransition: Transition = otherInstrument.getTransition()
      if (
        transition.includeAdjacentPatterns &&
        otherTransition.includeAdjacentPatterns &&
        otherTransition.slides == transition.slides
      ) {
        return otherInstrument.getChord()
      } else {
        return null
      }
    } else {
      // If both patterns contain the same instrument, check that it is seamless across patterns.
      return forceContinue || transition.includeAdjacentPatterns ? chord : null
    }
  }

  public static adjacentNotesHaveMatchingPitches(
    firstNote: Note,
    secondNote: Note,
  ): boolean {
    if (firstNote.pitches.length != secondNote.pitches.length) return false
    const firstNoteInterval: number =
      firstNote.pins[firstNote.pins.length - 1].interval
    for (const pitch of firstNote.pitches) {
      if (secondNote.pitches.indexOf(pitch + firstNoteInterval) == -1)
        return false
    }
    return true
  }

  private determineCurrentActiveTones(
    song: Song,
    channelIndex: number,
    playSong: boolean,
  ): void {
    const channel: Channel = song.channels[channelIndex]
    const channelState: ChannelState = this.channels[channelIndex]
    const pattern: Pattern | null = song.getPattern(channelIndex, this.bar)
    const currentPart: number = this.getCurrentPart()
    const currentTick: number = this.tick + Config.ticksPerPart * currentPart
    let note: Note | null = null
    let prevNote: Note | null = null
    let nextNote: Note | null = null

    if (playSong && pattern != null && !channel.muted) {
      for (let i = 0; i < pattern.notes.length; i++) {
        if (pattern.notes[i].end <= currentPart) {
          prevNote = pattern.notes[i]
        } else if (
          pattern.notes[i].start <= currentPart &&
          pattern.notes[i].end > currentPart
        ) {
          note = pattern.notes[i]
        } else if (pattern.notes[i].start > currentPart) {
          nextNote = pattern.notes[i]
          break
        }
      }

      if (note != null) {
        if (prevNote != null && prevNote.end != note.start) prevNote = null
        if (nextNote != null && nextNote.start != note.end) nextNote = null
      }
    }

    // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
    if (
      pattern != null &&
      (!song.layeredInstruments ||
        channel.instruments.length == 1 ||
        (song.patternInstruments && pattern.instruments.length == 1))
    ) {
      const newInstrumentIndex: number = song.patternInstruments
        ? pattern.instruments[0]
        : 0
      if (
        channelState.singleSeamlessInstrument != null &&
        channelState.singleSeamlessInstrument != newInstrumentIndex &&
        channelState.singleSeamlessInstrument < channelState.instruments.length
      ) {
        const sourceInstrumentState: InstrumentState =
          channelState.instruments[channelState.singleSeamlessInstrument]
        const destInstrumentState: InstrumentState =
          channelState.instruments[newInstrumentIndex]
        while (sourceInstrumentState.activeTones.count() > 0) {
          destInstrumentState.activeTones.pushFront(
            sourceInstrumentState.activeTones.popBack(),
          )
        }
      }
      channelState.singleSeamlessInstrument = newInstrumentIndex
    } else {
      channelState.singleSeamlessInstrument = null
    }

    for (
      let instrumentIndex = 0;
      instrumentIndex < channel.instruments.length;
      instrumentIndex++
    ) {
      const instrumentState: InstrumentState =
        channelState.instruments[instrumentIndex]
      const toneList: Deque<Tone> = instrumentState.activeTones
      let toneCount = 0
      if (
        note != null &&
        (!song.patternInstruments ||
          pattern!.instruments.indexOf(instrumentIndex) != -1)
      ) {
        const instrument: Instrument = channel.instruments[instrumentIndex]
        let prevNoteForThisInstrument: Note | null = prevNote
        let nextNoteForThisInstrument: Note | null = nextNote

        const partsPerBar: number = Config.partsPerBeat * song.beatsPerBar
        const transition: Transition = instrument.getTransition()
        const chord: Chord = instrument.getChord()
        let forceContinueAtStart = false
        let forceContinueAtEnd = false
        let tonesInPrevNote = 0
        let tonesInNextNote = 0
        if (note.start == 0) {
          // If the beginning of the note coincides with the beginning of the pattern,
          // look for an adjacent note at the end of the previous pattern.
          const prevPattern: Pattern | null =
            this.prevBar == null
              ? null
              : song.getPattern(channelIndex, this.prevBar)
          if (prevPattern != null) {
            const lastNote: Note | null =
              prevPattern.notes.length <= 0
                ? null
                : prevPattern.notes[prevPattern.notes.length - 1]
            if (lastNote != null && lastNote.end == partsPerBar) {
              const patternForcesContinueAtStart: boolean =
                note.continuesLastPattern &&
                Synth.adjacentNotesHaveMatchingPitches(lastNote, note)
              const chordOfCompatibleInstrument: Chord | null =
                this.adjacentPatternHasCompatibleInstrumentTransition(
                  song,
                  channel,
                  pattern!,
                  prevPattern,
                  instrumentIndex,
                  transition,
                  chord,
                  note,
                  lastNote,
                  patternForcesContinueAtStart,
                )
              if (chordOfCompatibleInstrument != null) {
                prevNoteForThisInstrument = lastNote
                tonesInPrevNote = chordOfCompatibleInstrument.singleTone
                  ? 1
                  : prevNoteForThisInstrument.pitches.length
                forceContinueAtStart = patternForcesContinueAtStart
              }
            }
          }
        } else if (prevNoteForThisInstrument != null) {
          tonesInPrevNote = chord.singleTone
            ? 1
            : prevNoteForThisInstrument.pitches.length
        }
        if (note.end == partsPerBar) {
          // If the end of the note coincides with the end of the pattern, look for an
          // adjacent note at the beginning of the next pattern.
          const nextPattern: Pattern | null =
            this.nextBar == null
              ? null
              : song.getPattern(channelIndex, this.nextBar)
          if (nextPattern != null) {
            const firstNote: Note | null =
              nextPattern.notes.length <= 0 ? null : nextPattern.notes[0]
            if (firstNote != null && firstNote.start == 0) {
              const nextPatternForcesContinueAtStart: boolean =
                firstNote.continuesLastPattern &&
                Synth.adjacentNotesHaveMatchingPitches(note, firstNote)
              const chordOfCompatibleInstrument: Chord | null =
                this.adjacentPatternHasCompatibleInstrumentTransition(
                  song,
                  channel,
                  pattern!,
                  nextPattern,
                  instrumentIndex,
                  transition,
                  chord,
                  note,
                  firstNote,
                  nextPatternForcesContinueAtStart,
                )
              if (chordOfCompatibleInstrument != null) {
                nextNoteForThisInstrument = firstNote
                tonesInNextNote = chordOfCompatibleInstrument.singleTone
                  ? 1
                  : nextNoteForThisInstrument.pitches.length
                forceContinueAtEnd = nextPatternForcesContinueAtStart
              }
            }
          }
        } else if (nextNoteForThisInstrument != null) {
          tonesInNextNote = chord.singleTone
            ? 1
            : nextNoteForThisInstrument.pitches.length
        }

        if (chord.singleTone) {
          const atNoteStart: boolean =
            Config.ticksPerPart * note.start == currentTick &&
            this.isAtStartOfTick
          let tone: Tone
          if (toneList.count() <= toneCount) {
            tone = this.newTone()
            toneList.pushBack(tone)
          } else if (
            atNoteStart &&
            ((!transition.isSeamless && !forceContinueAtStart) ||
              prevNoteForThisInstrument == null)
          ) {
            const oldTone: Tone = toneList.get(toneCount)
            if (oldTone.isOnLastTick) {
              this.freeTone(oldTone)
            } else {
              this.releaseTone(instrumentState, oldTone)
            }
            tone = this.newTone()
            toneList.set(toneCount, tone)
          } else {
            tone = toneList.get(toneCount)
          }
          toneCount++

          for (let i = 0; i < note.pitches.length; i++) {
            tone.pitches[i] = note.pitches[i]
          }
          tone.pitchCount = note.pitches.length
          tone.chordSize = 1
          tone.instrumentIndex = instrumentIndex
          tone.note = note
          tone.noteStartPart = note.start
          tone.noteEndPart = note.end
          tone.prevNote = prevNoteForThisInstrument
          tone.nextNote = nextNoteForThisInstrument
          tone.prevNotePitchIndex = 0
          tone.nextNotePitchIndex = 0
          tone.atNoteStart = atNoteStart
          tone.passedEndOfNote = false
          tone.forceContinueAtStart = forceContinueAtStart
          tone.forceContinueAtEnd = forceContinueAtEnd
        } else {
          const transition: Transition = instrument.getTransition()

          if (
            ((transition.isSeamless &&
              !transition.slides &&
              chord.strumParts == 0) ||
              forceContinueAtStart) &&
            Config.ticksPerPart * note.start == currentTick &&
            this.isAtStartOfTick &&
            prevNoteForThisInstrument != null
          ) {
            // The tones are about to seamlessly transition to a new note. The pitches
            // from the old note may or may not match any of the pitches in the new
            // note, and not necessarily in order, but if any do match, they'll sound
            // better if those tones continue to have the same pitch. Attempt to find
            // the right spot for each old tone in the new chord if possible.

            for (let i = 0; i < toneList.count(); i++) {
              const tone: Tone = toneList.get(i)
              const pitch: number = tone.pitches[0] + tone.lastInterval
              for (let j = 0; j < note.pitches.length; j++) {
                if (note.pitches[j] == pitch) {
                  this.tempMatchedPitchTones[j] = tone
                  toneList.remove(i)
                  i--
                  break
                }
              }
            }

            // Any tones that didn't get matched should just fill in the gaps.
            while (toneList.count() > 0) {
              const tone: Tone = toneList.popFront()
              for (let j = 0; j < this.tempMatchedPitchTones.length; j++) {
                if (this.tempMatchedPitchTones[j] == null) {
                  this.tempMatchedPitchTones[j] = tone
                  break
                }
              }
            }
          }

          let strumOffsetParts = 0
          for (let i = 0; i < note.pitches.length; i++) {
            let prevNoteForThisTone: Note | null =
              tonesInPrevNote > i ? prevNoteForThisInstrument : null
            let noteForThisTone: Note = note
            let nextNoteForThisTone: Note | null =
              tonesInNextNote > i ? nextNoteForThisInstrument : null
            let noteStartPart: number = noteForThisTone.start + strumOffsetParts
            let passedEndOfNote = false

            // Strumming may mean that a note's actual start time may be after the
            // note's displayed start time. If the note start hasn't been reached yet,
            // carry over the previous tone if available and seamless, otherwise skip
            // the new tone until it is ready to start.
            if (noteStartPart > currentPart) {
              if (
                toneList.count() > i &&
                (transition.isSeamless || forceContinueAtStart) &&
                prevNoteForThisTone != null
              ) {
                // Continue the previous note's chord until the current one takes over.
                nextNoteForThisTone = noteForThisTone
                noteForThisTone = prevNoteForThisTone
                prevNoteForThisTone = null
                noteStartPart = noteForThisTone.start + strumOffsetParts
                passedEndOfNote = true
              } else {
                // This and the rest of the tones in the chord shouldn't start yet.
                break
              }
            }

            let noteEndPart: number = noteForThisTone.end
            if (
              (transition.isSeamless || forceContinueAtStart) &&
              nextNoteForThisTone != null
            ) {
              noteEndPart = Math.min(
                Config.partsPerBeat * this.song!.beatsPerBar,
                noteEndPart + strumOffsetParts,
              )
            }
            if (
              (!transition.continues && !forceContinueAtStart) ||
              prevNoteForThisTone == null
            ) {
              strumOffsetParts += chord.strumParts
            }

            const atNoteStart: boolean =
              Config.ticksPerPart * noteStartPart == currentTick &&
              this.isAtStartOfTick
            let tone: Tone
            if (this.tempMatchedPitchTones[toneCount] != null) {
              tone = this.tempMatchedPitchTones[toneCount]!
              this.tempMatchedPitchTones[toneCount] = null
              toneList.pushBack(tone)
            } else if (toneList.count() <= toneCount) {
              tone = this.newTone()
              toneList.pushBack(tone)
            } else if (
              atNoteStart &&
              ((!transition.isSeamless && !forceContinueAtStart) ||
                prevNoteForThisTone == null)
            ) {
              const oldTone: Tone = toneList.get(toneCount)
              if (oldTone.isOnLastTick) {
                this.freeTone(oldTone)
              } else {
                this.releaseTone(instrumentState, oldTone)
              }
              tone = this.newTone()
              toneList.set(toneCount, tone)
            } else {
              tone = toneList.get(toneCount)
            }
            toneCount++

            tone.pitches[0] = noteForThisTone.pitches[i]
            tone.pitchCount = 1
            tone.chordSize = noteForThisTone.pitches.length
            tone.instrumentIndex = instrumentIndex
            tone.note = noteForThisTone
            tone.noteStartPart = noteStartPart
            tone.noteEndPart = noteEndPart
            tone.prevNote = prevNoteForThisTone
            tone.nextNote = nextNoteForThisTone
            tone.prevNotePitchIndex = i
            tone.nextNotePitchIndex = i
            tone.atNoteStart = atNoteStart
            tone.passedEndOfNote = passedEndOfNote
            tone.forceContinueAtStart =
              forceContinueAtStart && prevNoteForThisTone != null
            tone.forceContinueAtEnd =
              forceContinueAtEnd && nextNoteForThisTone != null
          }
        }
      }

      // Automatically free or release seamless tones if there's no new note to take over.
      while (toneList.count() > toneCount) {
        const tone: Tone = toneList.popBack()
        const channel: Channel = song.channels[channelIndex]
        if (
          tone.instrumentIndex < channel.instruments.length &&
          !tone.isOnLastTick
        ) {
          const instrumentState: InstrumentState =
            this.channels[channelIndex].instruments[tone.instrumentIndex]
          this.releaseTone(instrumentState, tone)
        } else {
          this.freeTone(tone)
        }
      }

      for (
        let i: number = toneCount;
        i < this.tempMatchedPitchTones.length;
        i++
      ) {
        const oldTone: Tone | null = this.tempMatchedPitchTones[i]
        if (oldTone != null) {
          if (oldTone.isOnLastTick) {
            this.freeTone(oldTone)
          } else {
            this.releaseTone(instrumentState, oldTone)
          }
          this.tempMatchedPitchTones[i] = null
        }
      }
    }
  }

  private playTone(
    song: Song,
    channelIndex: number,
    samplesPerTick: number,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    released: boolean,
    shouldFadeOutFast: boolean,
  ): void {
    const channel: Channel = song.channels[channelIndex]
    const channelState: ChannelState = this.channels[channelIndex]
    const instrument: Instrument = channel.instruments[tone.instrumentIndex]
    const instrumentState: InstrumentState =
      channelState.instruments[tone.instrumentIndex]

    instrumentState.awake = true
    instrumentState.tonesAddedInThisTick = true
    if (!instrumentState.computed) {
      instrumentState.compute(this, instrument, samplesPerTick, runLength, tone)
    }

    Synth.computeTone(
      this,
      song,
      channelIndex,
      samplesPerTick,
      runLength,
      tone,
      released,
      shouldFadeOutFast,
    )
    const synthesizer: Function = Synth.getInstrumentSynthFunction(instrument)
    synthesizer(this, bufferIndex, runLength, tone, instrument)
    tone.envelopeComputer.clearEnvelopes(instrument)
  }

  private static computeChordExpression(chordSize: number): number {
    return 1.0 / ((chordSize - 1) * 0.25 + 1.0)
  }

  private static computeTone(
    synth: Synth,
    song: Song,
    channelIndex: number,
    samplesPerTick: number,
    runLength: number,
    tone: Tone,
    released: boolean,
    shouldFadeOutFast: boolean,
  ): void {
    const channel: Channel = song.channels[channelIndex]
    const instrument: Instrument = channel.instruments[tone.instrumentIndex]
    const transition: Transition = instrument.getTransition()
    const chord: Chord = instrument.getChord()
    const chordExpression: number = chord.singleTone
      ? 1.0
      : Synth.computeChordExpression(tone.chordSize)
    const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex)
    const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1
    const secondsPerPart: number =
      (Config.ticksPerPart * samplesPerTick) / synth.samplesPerSecond
    const sampleTime: number = 1.0 / synth.samplesPerSecond
    const beatsPerPart: number = 1.0 / Config.partsPerBeat
    const tickSampleCountdown: number = synth.tickSampleCountdown
    const startRatio: number = 1.0 - tickSampleCountdown / samplesPerTick
    const endRatio: number =
      1.0 - (tickSampleCountdown - runLength) / samplesPerTick
    const ticksIntoBar: number = synth.getTicksIntoBar()
    const partTimeTickStart: number = ticksIntoBar / Config.ticksPerPart
    const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart
    const partTimeStart: number =
      partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio
    const partTimeEnd: number =
      partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio
    const currentPart: number = synth.getCurrentPart()

    tone.specialIntervalMult = 1.0
    tone.specialIntervalExpressionMult = 1.0

    let toneIsOnLastTick: boolean = shouldFadeOutFast
    let intervalStart = 0.0
    let intervalEnd = 0.0
    let transitionExpressionStart = 1.0
    let transitionExpressionEnd = 1.0
    let chordExpressionStart: number = chordExpression
    let chordExpressionEnd: number = chordExpression

    let expressionReferencePitch = 16 // A low "E" as a MIDI pitch.
    let basePitch: number = Config.keys[song.key].basePitch
    let baseExpression = 1.0
    let pitchDamping = 48
    if (instrument.type == InstrumentType.spectrum) {
      baseExpression = Config.spectrumBaseExpression
      if (isNoiseChannel) {
        basePitch = Config.spectrumBasePitch
        baseExpression *= 2.0 // Note: spectrum is louder for drum channels than pitch channels!
      }
      expressionReferencePitch = Config.spectrumBasePitch
      pitchDamping = 28
    } else if (instrument.type == InstrumentType.drumset) {
      basePitch = Config.spectrumBasePitch
      baseExpression = Config.drumsetBaseExpression
      expressionReferencePitch = basePitch
    } else if (instrument.type == InstrumentType.noise) {
      basePitch = Config.chipNoises[instrument.chipNoise].basePitch
      baseExpression = Config.noiseBaseExpression
      expressionReferencePitch = basePitch
      pitchDamping = Config.chipNoises[instrument.chipNoise].isSoft
        ? 24.0
        : 60.0
    } else if (instrument.type == InstrumentType.fm) {
      baseExpression = Config.fmBaseExpression
    } else if (instrument.type == InstrumentType.chip) {
      baseExpression = Config.chipBaseExpression
    } else if (instrument.type == InstrumentType.harmonics) {
      baseExpression = Config.harmonicsBaseExpression
    } else if (instrument.type == InstrumentType.pwm) {
      baseExpression = Config.pwmBaseExpression
    } else if (instrument.type == InstrumentType.pickedString) {
      baseExpression = Config.pickedStringBaseExpression
    } else {
      throw new Error('Unknown instrument type in computeTone.')
    }

    if (
      (tone.atNoteStart &&
        !transition.isSeamless &&
        !tone.forceContinueAtStart) ||
      tone.freshlyAllocated
    ) {
      tone.reset()
    }
    tone.freshlyAllocated = false

    const maxWaves: number = Math.max(Config.maxChordSize, Config.operatorCount)
    for (let i = 0; i < maxWaves; i++) {
      tone.phaseDeltas[i] = 0.0
      tone.expressionStarts[i] = 0.0
      tone.expressionDeltas[i] = 0.0
      tone.phaseDeltaScales[i] = 0.0
    }

    if (released) {
      const startTicksSinceReleased: number =
        tone.ticksSinceReleased + startRatio
      const endTicksSinceReleased: number = tone.ticksSinceReleased + endRatio
      intervalStart = intervalEnd = tone.lastInterval
      const fadeOutTicks: number = Math.abs(instrument.getFadeOutTicks())
      transitionExpressionStart = Synth.noteSizeToVolumeMult(
        (1.0 - startTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax,
      )
      transitionExpressionEnd = Synth.noteSizeToVolumeMult(
        (1.0 - endTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax,
      )

      if (shouldFadeOutFast) {
        transitionExpressionStart *= 1.0 - startRatio
        transitionExpressionEnd *= 1.0 - endRatio
      }

      if (tone.ticksSinceReleased + 1 >= fadeOutTicks) toneIsOnLastTick = true
    } else if (tone.note == null) {
      transitionExpressionStart = transitionExpressionEnd = 1
      tone.lastInterval = 0
      tone.ticksSinceReleased = 0
      tone.liveInputSamplesHeld += runLength
    } else {
      const note: Note = tone.note
      const nextNote: Note | null = tone.nextNote

      const noteStartPart: number = tone.noteStartPart
      const noteEndPart: number = tone.noteEndPart

      const endPinIndex: number = note.getEndPinIndex(currentPart)
      const startPin: NotePin = note.pins[endPinIndex - 1]
      const endPin: NotePin = note.pins[endPinIndex]
      const noteStartTick: number = noteStartPart * Config.ticksPerPart
      const noteEndTick: number = noteEndPart * Config.ticksPerPart
      const pinStart: number =
        (note.start + startPin.time) * Config.ticksPerPart
      const pinEnd: number = (note.start + endPin.time) * Config.ticksPerPart

      tone.ticksSinceReleased = 0

      const tickTimeStart: number =
        currentPart * Config.ticksPerPart + synth.tick
      const tickTimeEnd: number =
        currentPart * Config.ticksPerPart + synth.tick + 1
      const noteTicksPassedTickStart: number = tickTimeStart - noteStartTick
      const noteTicksPassedTickEnd: number = tickTimeEnd - noteStartTick
      const pinRatioStart: number = Math.min(
        1.0,
        (tickTimeStart - pinStart) / (pinEnd - pinStart),
      )
      const pinRatioEnd: number = Math.min(
        1.0,
        (tickTimeEnd - pinStart) / (pinEnd - pinStart),
      )
      let transitionExpressionTickStart = 1.0
      let transitionExpressionTickEnd = 1.0
      const intervalTickStart: number =
        startPin.interval +
        (endPin.interval - startPin.interval) * pinRatioStart
      const intervalTickEnd: number =
        startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd
      tone.lastInterval = intervalTickEnd

      if (
        (!transition.isSeamless && !tone.forceContinueAtEnd) ||
        nextNote == null
      ) {
        const fadeOutTicks: number = -instrument.getFadeOutTicks()
        if (fadeOutTicks > 0.0) {
          // If the tone should fade out before the end of the note, do so here.
          const noteLengthTicks: number = noteEndTick - noteStartTick
          transitionExpressionTickStart *= Math.min(
            1.0,
            (noteLengthTicks - noteTicksPassedTickStart) / fadeOutTicks,
          )
          transitionExpressionTickEnd *= Math.min(
            1.0,
            (noteLengthTicks - noteTicksPassedTickEnd) / fadeOutTicks,
          )
          if (tickTimeEnd >= noteStartTick + noteLengthTicks)
            toneIsOnLastTick = true
        }
      }

      intervalStart =
        intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio
      intervalEnd =
        intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio
      transitionExpressionStart =
        transitionExpressionTickStart +
        (transitionExpressionTickEnd - transitionExpressionTickStart) *
          startRatio
      transitionExpressionEnd =
        transitionExpressionTickStart +
        (transitionExpressionTickEnd - transitionExpressionTickStart) * endRatio
    }

    tone.isOnLastTick = toneIsOnLastTick

    // Compute envelopes *after* resetting the tone, otherwise the envelope computer gets reset too!
    const envelopeComputer: EnvelopeComputer = tone.envelopeComputer
    envelopeComputer.computeEnvelopes(
      instrument,
      currentPart,
      Config.ticksPerPart * partTimeStart,
      Config.ticksPerPart * partTimeEnd,
      secondsPerPart * (partTimeEnd - partTimeStart),
      tone,
    )
    const envelopeStarts: number[] = tone.envelopeComputer.envelopeStarts
    const envelopeEnds: number[] = tone.envelopeComputer.envelopeEnds

    if (tone.note != null && transition.slides) {
      // Slide interval and chordExpression at the start and/or end of the note if necessary.
      const prevNote: Note | null = tone.prevNote
      const nextNote: Note | null = tone.nextNote
      if (prevNote != null) {
        const intervalDiff: number =
          prevNote.pitches[tone.prevNotePitchIndex] +
          prevNote.pins[prevNote.pins.length - 1].interval -
          tone.pitches[0]
        if (envelopeComputer.prevSlideStart)
          intervalStart += intervalDiff * envelopeComputer.prevSlideRatioStart
        if (envelopeComputer.prevSlideEnd)
          intervalEnd += intervalDiff * envelopeComputer.prevSlideRatioEnd
        if (!chord.singleTone) {
          const chordSizeDiff: number = prevNote.pitches.length - tone.chordSize
          if (envelopeComputer.prevSlideStart)
            chordExpressionStart = Synth.computeChordExpression(
              tone.chordSize +
                chordSizeDiff * envelopeComputer.prevSlideRatioStart,
            )
          if (envelopeComputer.prevSlideEnd)
            chordExpressionEnd = Synth.computeChordExpression(
              tone.chordSize +
                chordSizeDiff * envelopeComputer.prevSlideRatioEnd,
            )
        }
      }
      if (nextNote != null) {
        const intervalDiff: number =
          nextNote.pitches[tone.nextNotePitchIndex] -
          (tone.pitches[0] + tone.note.pins[tone.note.pins.length - 1].interval)
        if (envelopeComputer.nextSlideStart)
          intervalStart += intervalDiff * envelopeComputer.nextSlideRatioStart
        if (envelopeComputer.nextSlideEnd)
          intervalEnd += intervalDiff * envelopeComputer.nextSlideRatioEnd
        if (!chord.singleTone) {
          const chordSizeDiff: number = nextNote.pitches.length - tone.chordSize
          if (envelopeComputer.nextSlideStart)
            chordExpressionStart = Synth.computeChordExpression(
              tone.chordSize +
                chordSizeDiff * envelopeComputer.nextSlideRatioStart,
            )
          if (envelopeComputer.nextSlideEnd)
            chordExpressionEnd = Synth.computeChordExpression(
              tone.chordSize +
                chordSizeDiff * envelopeComputer.nextSlideRatioEnd,
            )
        }
      }
    }

    if (effectsIncludePitchShift(instrument.effects)) {
      const pitchShift: number =
        Config.justIntonationSemitones[instrument.pitchShift] / intervalScale
      const envelopeStart: number =
        envelopeStarts[NoteAutomationIndex.pitchShift]
      const envelopeEnd: number = envelopeEnds[NoteAutomationIndex.pitchShift]
      intervalStart += pitchShift * envelopeStart
      intervalEnd += pitchShift * envelopeEnd
    }
    if (effectsIncludeDetune(instrument.effects)) {
      const envelopeStart: number = envelopeStarts[NoteAutomationIndex.detune]
      const envelopeEnd: number = envelopeEnds[NoteAutomationIndex.detune]
      intervalStart +=
        (Synth.detuneToCents(
          (instrument.detune - Config.detuneCenter) * envelopeStart,
        ) *
          Config.pitchesPerOctave) /
        (12.0 * 100.0)
      intervalEnd +=
        (Synth.detuneToCents(
          (instrument.detune - Config.detuneCenter) * envelopeEnd,
        ) *
          Config.pitchesPerOctave) /
        (12.0 * 100.0)
    }

    if (effectsIncludeVibrato(instrument.effects)) {
      const delayTicks: number = Config.vibratos[instrument.vibrato].delayTicks
      const vibratoAmplitude: number =
        Config.vibratos[instrument.vibrato].amplitude

      // To maintain pitch continuity, (mostly for picked string which retriggers impulse
      // otherwise) remember the vibrato at the end of this run and reuse it at the start
      // of the next run if available.
      let vibratoStart: number
      if (tone.prevVibrato != null) {
        vibratoStart = tone.prevVibrato
      } else {
        const lfoStart: number = Synth.getLFOAmplitude(
          instrument,
          secondsPerPart * partTimeStart,
        )
        const vibratoDepthEnvelopeStart: number =
          envelopeStarts[NoteAutomationIndex.vibratoDepth]
        vibratoStart = vibratoAmplitude * lfoStart * vibratoDepthEnvelopeStart
        if (delayTicks > 0.0) {
          const ticksUntilVibratoStart: number =
            delayTicks - envelopeComputer.noteTicksStart
          vibratoStart *= Math.max(
            0.0,
            Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0),
          )
        }
      }

      const lfoEnd: number = Synth.getLFOAmplitude(
        instrument,
        secondsPerPart * partTimeEnd,
      )
      const vibratoDepthEnvelopeEnd: number =
        envelopeEnds[NoteAutomationIndex.vibratoDepth]
      let vibratoEnd: number =
        vibratoAmplitude * lfoEnd * vibratoDepthEnvelopeEnd
      if (delayTicks > 0.0) {
        const ticksUntilVibratoEnd: number =
          delayTicks - envelopeComputer.noteTicksEnd
        vibratoEnd *= Math.max(
          0.0,
          Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0),
        )
      }
      tone.prevVibrato = vibratoEnd

      intervalStart += vibratoStart
      intervalEnd += vibratoEnd
    }

    if (
      (!transition.isSeamless && !tone.forceContinueAtStart) ||
      tone.prevNote == null
    ) {
      // Fade in the beginning of the note.
      const fadeInSeconds: number = instrument.getFadeInSeconds()
      if (fadeInSeconds > 0.0) {
        transitionExpressionStart *= Math.min(
          1.0,
          envelopeComputer.noteSecondsStart / fadeInSeconds,
        )
        transitionExpressionEnd *= Math.min(
          1.0,
          envelopeComputer.noteSecondsEnd / fadeInSeconds,
        )
      }
    }

    if (
      instrument.type == InstrumentType.drumset &&
      tone.drumsetPitch == null
    ) {
      // It's possible that the note will change while the user is editing it,
      // but the tone's pitches don't get updated because the tone has already
      // ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
      tone.drumsetPitch = tone.pitches[0]
      if (tone.note != null) tone.drumsetPitch += tone.note.pickMainInterval()
      tone.drumsetPitch = Math.max(
        0,
        Math.min(Config.drumCount - 1, tone.drumsetPitch),
      )
    }

    let noteFilterExpression: number =
      envelopeComputer.lowpassCutoffDecayVolumeCompensation
    if (!effectsIncludeNoteFilter(instrument.effects)) {
      tone.noteFilterCount = 0
    } else {
      const noteFilterSettings: FilterSettings = instrument.noteFilter

      const noteAllFreqsEnvelopeStart: number =
        envelopeStarts[NoteAutomationIndex.noteFilterAllFreqs]
      const noteAllFreqsEnvelopeEnd: number =
        envelopeEnds[NoteAutomationIndex.noteFilterAllFreqs]
      for (let i = 0; i < noteFilterSettings.controlPointCount; i++) {
        const noteFreqEnvelopeStart: number =
          envelopeStarts[NoteAutomationIndex.noteFilterFreq0 + i]
        const noteFreqEnvelopeEnd: number =
          envelopeEnds[NoteAutomationIndex.noteFilterFreq0 + i]
        const notePeakEnvelopeStart: number =
          envelopeStarts[NoteAutomationIndex.noteFilterGain0 + i]
        const notePeakEnvelopeEnd: number =
          envelopeEnds[NoteAutomationIndex.noteFilterGain0 + i]
        const point: FilterControlPoint = noteFilterSettings.controlPoints[i]
        point.toCoefficients(
          Synth.tempFilterStartCoefficients,
          synth.samplesPerSecond,
          noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart,
          notePeakEnvelopeStart,
        )
        point.toCoefficients(
          Synth.tempFilterEndCoefficients,
          synth.samplesPerSecond,
          noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd,
          notePeakEnvelopeEnd,
        )
        if (tone.noteFilters.length <= i)
          tone.noteFilters[i] = new DynamicBiquadFilter()
        tone.noteFilters[i].loadCoefficientsWithGradient(
          Synth.tempFilterStartCoefficients,
          Synth.tempFilterEndCoefficients,
          1.0 / runLength,
        )
        noteFilterExpression *= point.getVolumeCompensationMult()
      }
      tone.noteFilterCount = noteFilterSettings.controlPointCount
    }

    if (instrument.type == InstrumentType.drumset) {
      const drumsetFilterEnvelope: Envelope = instrument.getDrumsetEnvelope(
        tone.drumsetPitch!,
      )
      // If the drumset lowpass cutoff decays, compensate by increasing expression.
      noteFilterExpression *=
        EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(
          drumsetFilterEnvelope,
        )

      // Drumset filters use the same envelope timing as the rest of the envelopes, but do not include support for slide transitions.
      let drumsetFilterEnvelopeStart: number = EnvelopeComputer.computeEnvelope(
        drumsetFilterEnvelope,
        envelopeComputer.noteSecondsStart,
        beatsPerPart * partTimeStart,
        envelopeComputer.noteSizeStart,
      )
      let drumsetFilterEnvelopeEnd: number = EnvelopeComputer.computeEnvelope(
        drumsetFilterEnvelope,
        envelopeComputer.noteSecondsEnd,
        beatsPerPart * partTimeEnd,
        envelopeComputer.noteSizeEnd,
      )

      // Apply slide interpolation to drumset envelope.
      if (envelopeComputer.prevSlideStart) {
        const other: number = EnvelopeComputer.computeEnvelope(
          drumsetFilterEnvelope,
          envelopeComputer.prevNoteSecondsStart,
          beatsPerPart * partTimeStart,
          envelopeComputer.prevNoteSize,
        )
        drumsetFilterEnvelopeStart +=
          (other - drumsetFilterEnvelopeStart) *
          envelopeComputer.prevSlideRatioStart
      }
      if (envelopeComputer.prevSlideEnd) {
        const other: number = EnvelopeComputer.computeEnvelope(
          drumsetFilterEnvelope,
          envelopeComputer.prevNoteSecondsEnd,
          beatsPerPart * partTimeEnd,
          envelopeComputer.prevNoteSize,
        )
        drumsetFilterEnvelopeEnd +=
          (other - drumsetFilterEnvelopeEnd) *
          envelopeComputer.prevSlideRatioEnd
      }
      if (envelopeComputer.nextSlideStart) {
        const other: number = EnvelopeComputer.computeEnvelope(
          drumsetFilterEnvelope,
          0.0,
          beatsPerPart * partTimeStart,
          envelopeComputer.nextNoteSize,
        )
        drumsetFilterEnvelopeStart +=
          (other - drumsetFilterEnvelopeStart) *
          envelopeComputer.nextSlideRatioStart
      }
      if (envelopeComputer.nextSlideEnd) {
        const other: number = EnvelopeComputer.computeEnvelope(
          drumsetFilterEnvelope,
          0.0,
          beatsPerPart * partTimeEnd,
          envelopeComputer.nextNoteSize,
        )
        drumsetFilterEnvelopeEnd +=
          (other - drumsetFilterEnvelopeEnd) *
          envelopeComputer.nextSlideRatioEnd
      }

      const point: FilterControlPoint = synth.tempDrumSetControlPoint
      point.type = FilterType.lowPass
      point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(0.5)
      point.freq = FilterControlPoint.getRoundedSettingValueFromHz(8000.0)
      // Drumset envelopes are warped to better imitate the legacy simplified 2nd order lowpass at ~48000Hz that I used to use.
      point.toCoefficients(
        Synth.tempFilterStartCoefficients,
        synth.samplesPerSecond,
        drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart),
        1.0,
      )
      point.toCoefficients(
        Synth.tempFilterEndCoefficients,
        synth.samplesPerSecond,
        drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd),
        1.0,
      )
      if (tone.noteFilters.length == tone.noteFilterCount)
        tone.noteFilters[tone.noteFilterCount] = new DynamicBiquadFilter()
      tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(
        Synth.tempFilterStartCoefficients,
        Synth.tempFilterEndCoefficients,
        1.0 / runLength,
      )
      tone.noteFilterCount++
    }

    noteFilterExpression = Math.min(3.0, noteFilterExpression)

    if (instrument.type == InstrumentType.fm) {
      // phase modulation!

      let sineExpressionBoost = 1.0
      let totalCarrierExpression = 0.0

      let arpeggioInterval = 0
      const arpeggiates: boolean = chord.arpeggiates
      if (tone.pitchCount > 1 && arpeggiates) {
        const arpeggio: number = Math.floor(
          (synth.tick + synth.part * Config.ticksPerPart) /
            Config.rhythms[song.rhythm].ticksPerArpeggio,
        )
        arpeggioInterval =
          tone.pitches[
            getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)
          ] - tone.pitches[0]
      }

      const carrierCount: number =
        Config.algorithms[instrument.algorithm].carrierCount
      for (let i = 0; i < Config.operatorCount; i++) {
        const associatedCarrierIndex: number =
          Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1
        const pitch: number =
          tone.pitches[
            arpeggiates
              ? 0
              : i < tone.pitchCount
              ? i
              : associatedCarrierIndex < tone.pitchCount
              ? associatedCarrierIndex
              : 0
          ]
        const freqMult =
          Config.operatorFrequencies[instrument.operators[i].frequency].mult
        const interval =
          Config.operatorCarrierInterval[associatedCarrierIndex] +
          arpeggioInterval
        const pitchStart: number =
          basePitch + (pitch + intervalStart) * intervalScale + interval
        const pitchEnd: number =
          basePitch + (pitch + intervalEnd) * intervalScale + interval
        const baseFreqStart: number = Instrument.frequencyFromPitch(pitchStart)
        const baseFreqEnd: number = Instrument.frequencyFromPitch(pitchEnd)
        const hzOffset: number =
          Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset
        const targetFreqStart: number = freqMult * baseFreqStart + hzOffset
        const targetFreqEnd: number = freqMult * baseFreqEnd + hzOffset

        const freqEnvelopeStart: number =
          envelopeStarts[NoteAutomationIndex.operatorFrequency0 + i]
        const freqEnvelopeEnd: number =
          envelopeEnds[NoteAutomationIndex.operatorFrequency0 + i]
        let freqStart: number
        let freqEnd: number
        if (freqEnvelopeStart != 1.0 || freqEnvelopeEnd != 1.0) {
          freqStart =
            Math.pow(
              2.0,
              Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart,
            ) * baseFreqStart
          freqEnd =
            Math.pow(
              2.0,
              Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd,
            ) * baseFreqEnd
        } else {
          freqStart = targetFreqStart
          freqEnd = targetFreqEnd
        }
        tone.phaseDeltas[i] = freqStart * sampleTime * Config.sineWaveLength
        tone.phaseDeltaScales[i] = Math.pow(
          freqEnd / freqStart,
          1.0 / runLength,
        )

        const amplitudeCurve: number = Synth.operatorAmplitudeCurve(
          instrument.operators[i].amplitude,
        )
        const amplitudeMult: number =
          amplitudeCurve *
          Config.operatorFrequencies[instrument.operators[i].frequency]
            .amplitudeSign
        let expressionStart: number = amplitudeMult
        let expressionEnd: number = amplitudeMult
        if (i < carrierCount) {
          // carrier
          const pitchExpressionStart: number = Math.pow(
            2.0,
            -(pitchStart - expressionReferencePitch) / pitchDamping,
          )
          const pitchExpressionEnd: number = Math.pow(
            2.0,
            -(pitchEnd - expressionReferencePitch) / pitchDamping,
          )
          expressionStart *=
            baseExpression *
            pitchExpressionStart *
            transitionExpressionStart *
            noteFilterExpression *
            chordExpressionStart
          expressionEnd *=
            baseExpression *
            pitchExpressionEnd *
            transitionExpressionEnd *
            noteFilterExpression *
            chordExpressionEnd
          expressionStart *= envelopeStarts[NoteAutomationIndex.noteVolume]
          expressionEnd *= envelopeEnds[NoteAutomationIndex.noteVolume]

          totalCarrierExpression += amplitudeCurve
        } else {
          // modulator
          expressionStart *= Config.sineWaveLength * 1.5
          expressionEnd *= Config.sineWaveLength * 1.5

          sineExpressionBoost *=
            1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15)
        }

        expressionStart *=
          envelopeStarts[NoteAutomationIndex.operatorAmplitude0 + i]
        expressionEnd *=
          envelopeEnds[NoteAutomationIndex.operatorAmplitude0 + i]

        tone.expressionStarts[i] = expressionStart
        tone.expressionDeltas[i] = (expressionEnd - expressionStart) / runLength
      }

      sineExpressionBoost *=
        (Math.pow(2.0, 2.0 - (1.4 * instrument.feedbackAmplitude) / 15.0) -
          1.0) /
        3.0
      sineExpressionBoost *=
        1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0)
      sineExpressionBoost = 1.0 + sineExpressionBoost * 3.0
      for (let i = 0; i < carrierCount; i++) {
        tone.expressionStarts[i] *= sineExpressionBoost
        tone.expressionDeltas[i] *= sineExpressionBoost
      }

      const feedbackAmplitude: number =
        (Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude) / 15.0
      const feedbackStart: number =
        feedbackAmplitude *
        envelopeStarts[NoteAutomationIndex.feedbackAmplitude]
      const feedbackEnd: number =
        feedbackAmplitude * envelopeEnds[NoteAutomationIndex.feedbackAmplitude]
      tone.feedbackMult = feedbackStart
      tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength
    } else {
      const basePhaseDeltaScale: number = Math.pow(
        2.0,
        ((intervalEnd - intervalStart) * intervalScale) / 12.0 / runLength,
      )

      let pitch: number = tone.pitches[0]
      if (tone.pitchCount > 1 && (chord.arpeggiates || chord.customInterval)) {
        const arpeggio: number = Math.floor(
          (synth.tick + synth.part * Config.ticksPerPart) /
            Config.rhythms[song.rhythm].ticksPerArpeggio,
        )
        if (chord.customInterval) {
          const intervalOffset: number =
            tone.pitches[
              1 +
                getArpeggioPitchIndex(
                  tone.pitchCount - 1,
                  song.rhythm,
                  arpeggio,
                )
            ] - tone.pitches[0]
          tone.specialIntervalMult = Math.pow(2.0, intervalOffset / 12.0)
          tone.specialIntervalExpressionMult = Math.pow(
            2.0,
            -intervalOffset / pitchDamping,
          )
        } else {
          pitch =
            tone.pitches[
              getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)
            ]
        }
      }

      const startPitch: number =
        basePitch + (pitch + intervalStart) * intervalScale
      const endPitch: number = basePitch + (pitch + intervalEnd) * intervalScale
      const pitchExpressionStart: number = Math.pow(
        2.0,
        -(startPitch - expressionReferencePitch) / pitchDamping,
      )
      const pitchExpressionEnd: number = Math.pow(
        2.0,
        -(endPitch - expressionReferencePitch) / pitchDamping,
      )
      let settingsExpressionMult: number = baseExpression * noteFilterExpression

      if (instrument.type == InstrumentType.noise) {
        settingsExpressionMult *=
          Config.chipNoises[instrument.chipNoise].expression
      }
      if (instrument.type == InstrumentType.chip) {
        settingsExpressionMult *=
          Config.chipWaves[instrument.chipWave].expression
      }
      if (instrument.type == InstrumentType.pwm) {
        const basePulseWidth: number = getPulseWidthRatio(instrument.pulseWidth)
        const pulseWidthStart: number =
          basePulseWidth * envelopeStarts[NoteAutomationIndex.pulseWidth]
        const pulseWidthEnd: number =
          basePulseWidth * envelopeEnds[NoteAutomationIndex.pulseWidth]
        tone.pulseWidth = pulseWidthStart
        tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength
      }
      if (instrument.type == InstrumentType.pickedString) {
        // Increase expression to compensate for string decay.
        settingsExpressionMult *= Math.pow(
          2.0,
          0.7 *
            (1.0 - instrument.stringSustain / (Config.stringSustainRange - 1)),
        )

        const unison: Unison = Config.unisons[instrument.unison]
        for (
          let i: number = tone.pickedStrings.length;
          i < unison.voices;
          i++
        ) {
          tone.pickedStrings[i] = new PickedString()
        }

        if (
          tone.atNoteStart &&
          !transition.continues &&
          !tone.forceContinueAtStart
        ) {
          for (const pickedString of tone.pickedStrings) {
            // Force the picked string to retrigger the attack impulse at the start of the note.
            pickedString.delayIndex = -1
          }
        }
      }

      const startFreq: number = Instrument.frequencyFromPitch(startPitch)
      if (
        instrument.type == InstrumentType.chip ||
        instrument.type == InstrumentType.harmonics ||
        instrument.type == InstrumentType.pickedString
      ) {
        // These instruments have two waves at different frequencies for the unison feature.
        const unison: Unison = Config.unisons[instrument.unison]
        const voiceCountExpression: number =
          instrument.type == InstrumentType.pickedString
            ? 1
            : unison.voices / 2.0
        settingsExpressionMult *= unison.expression * voiceCountExpression
        const unisonEnvelopeStart = envelopeStarts[NoteAutomationIndex.unison]
        const unisonEnvelopeEnd = envelopeEnds[NoteAutomationIndex.unison]
        const unisonAStart: number = Math.pow(
          2.0,
          ((unison.offset + unison.spread) * unisonEnvelopeStart) / 12.0,
        )
        const unisonAEnd: number = Math.pow(
          2.0,
          ((unison.offset + unison.spread) * unisonEnvelopeEnd) / 12.0,
        )
        const unisonBStart: number =
          Math.pow(
            2.0,
            ((unison.offset - unison.spread) * unisonEnvelopeStart) / 12.0,
          ) * tone.specialIntervalMult
        const unisonBEnd: number =
          Math.pow(
            2.0,
            ((unison.offset - unison.spread) * unisonEnvelopeEnd) / 12.0,
          ) * tone.specialIntervalMult
        tone.phaseDeltas[0] = startFreq * sampleTime * unisonAStart
        tone.phaseDeltas[1] = startFreq * sampleTime * unisonBStart
        tone.phaseDeltaScales[0] =
          basePhaseDeltaScale *
          Math.pow(unisonAEnd / unisonAStart, 1.0 / runLength)
        tone.phaseDeltaScales[1] =
          basePhaseDeltaScale *
          Math.pow(unisonBEnd / unisonBStart, 1.0 / runLength)
      } else {
        tone.phaseDeltas[0] = startFreq * sampleTime
        tone.phaseDeltaScales[0] = basePhaseDeltaScale
      }

      const expressionStart: number =
        settingsExpressionMult *
        transitionExpressionStart *
        chordExpressionStart *
        pitchExpressionStart *
        envelopeStarts[NoteAutomationIndex.noteVolume]
      const expressionEnd: number =
        settingsExpressionMult *
        transitionExpressionEnd *
        chordExpressionEnd *
        pitchExpressionEnd *
        envelopeEnds[NoteAutomationIndex.noteVolume]
      tone.expressionStarts[0] = expressionStart
      tone.expressionDeltas[0] = (expressionEnd - expressionStart) / runLength
    }
  }

  public static getLFOAmplitude(
    instrument: Instrument,
    secondsIntoBar: number,
  ): number {
    let effect = 0.0
    for (const vibratoPeriodSeconds of Config.vibratos[instrument.vibrato]
      .periodsSeconds) {
      effect += Math.sin(
        (Math.PI * 2.0 * secondsIntoBar) / vibratoPeriodSeconds,
      )
    }
    return effect
  }

  private static getInstrumentSynthFunction(instrument: Instrument): Function {
    if (instrument.type == InstrumentType.fm) {
      const fingerprint: string =
        instrument.algorithm + '_' + instrument.feedbackType
      if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
        const synthSource: string[] = []

        for (const line of Synth.fmSourceTemplate) {
          if (line.indexOf('// CARRIER OUTPUTS') != -1) {
            const outputs: string[] = []
            for (
              let j = 0;
              j < Config.algorithms[instrument.algorithm].carrierCount;
              j++
            ) {
              outputs.push('operator' + j + 'Scaled')
            }
            synthSource.push(
              line.replace('/*operator#Scaled*/', outputs.join(' + ')),
            )
          } else if (
            line.indexOf('// INSERT OPERATOR COMPUTATION HERE') != -1
          ) {
            for (let j: number = Config.operatorCount - 1; j >= 0; j--) {
              for (const operatorLine of Synth.operatorSourceTemplate) {
                if (operatorLine.indexOf('/* + operator@Scaled*/') != -1) {
                  let modulators = ''
                  for (const modulatorNumber of Config.algorithms[
                    instrument.algorithm
                  ].modulatedBy[j]) {
                    modulators +=
                      ' + operator' + (modulatorNumber - 1) + 'Scaled'
                  }

                  const feedbackIndices: ReadonlyArray<number> =
                    Config.feedbacks[instrument.feedbackType].indices[j]
                  if (feedbackIndices.length > 0) {
                    modulators += ' + feedbackMult * ('
                    const feedbacks: string[] = []
                    for (const modulatorNumber of feedbackIndices) {
                      feedbacks.push(
                        'operator' + (modulatorNumber - 1) + 'Output',
                      )
                    }
                    modulators += feedbacks.join(' + ') + ')'
                  }
                  synthSource.push(
                    operatorLine
                      .replace(/\#/g, j + '')
                      .replace('/* + operator@Scaled*/', modulators),
                  )
                } else {
                  synthSource.push(operatorLine.replace(/\#/g, j + ''))
                }
              }
            }
          } else if (line.indexOf('#') != -1) {
            for (let j = 0; j < Config.operatorCount; j++) {
              synthSource.push(line.replace(/\#/g, j + ''))
            }
          } else {
            synthSource.push(line)
          }
        }

        //console.log(synthSource.join("\n"));

        Synth.fmSynthFunctionCache[fingerprint] = new Function(
          'synth',
          'bufferIndex',
          'runLength',
          'tone',
          'instrument',
          synthSource.join('\n'),
        )
      }
      return Synth.fmSynthFunctionCache[fingerprint]
    } else if (instrument.type == InstrumentType.chip) {
      return Synth.chipSynth
    } else if (instrument.type == InstrumentType.harmonics) {
      return Synth.harmonicsSynth
    } else if (instrument.type == InstrumentType.pwm) {
      return Synth.pulseWidthSynth
    } else if (instrument.type == InstrumentType.pickedString) {
      return Synth.pickedStringSynth
    } else if (instrument.type == InstrumentType.noise) {
      return Synth.noiseSynth
    } else if (instrument.type == InstrumentType.spectrum) {
      return Synth.spectrumSynth
    } else if (instrument.type == InstrumentType.drumset) {
      return Synth.drumsetSynth
    } else {
      throw new Error('Unrecognized instrument type: ' + instrument.type)
    }
  }

  private static chipSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!
    const wave: Float64Array = Config.chipWaves[instrument.chipWave].samples
    const waveLength: number = wave.length - 1 // The first sample is duplicated at the end, don't double-count it.

    const unisonSign: number =
      tone.specialIntervalExpressionMult *
      Config.unisons[instrument.unison].sign
    if (instrument.unison == 0 && !instrument.getChord().customInterval)
      tone.phases[1] = tone.phases[0]
    let phaseDeltaA: number = tone.phaseDeltas[0] * waveLength
    let phaseDeltaB: number = tone.phaseDeltas[1] * waveLength
    const phaseDeltaScaleA: number = +tone.phaseDeltaScales[0]
    const phaseDeltaScaleB: number = +tone.phaseDeltaScales[1]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]
    let phaseA: number = (tone.phases[0] % 1) * waveLength
    let phaseB: number = (tone.phases[1] % 1) * waveLength

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    const phaseAInt: number = phaseA | 0
    const phaseBInt: number = phaseB | 0
    const indexA: number = phaseAInt % waveLength
    const indexB: number = phaseBInt % waveLength
    const phaseRatioA: number = phaseA - phaseAInt
    const phaseRatioB: number = phaseB - phaseBInt
    let prevWaveIntegralA: number = +wave[indexA]
    let prevWaveIntegralB: number = +wave[indexB]
    prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA
    prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      phaseA += phaseDeltaA
      phaseB += phaseDeltaB

      const phaseAInt: number = phaseA | 0
      const phaseBInt: number = phaseB | 0
      const indexA: number = phaseAInt % waveLength
      const indexB: number = phaseBInt % waveLength
      let nextWaveIntegralA: number = wave[indexA]
      let nextWaveIntegralB: number = wave[indexB]
      const phaseRatioA: number = phaseA - phaseAInt
      const phaseRatioB: number = phaseB - phaseBInt
      nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA
      nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB
      const waveA: number =
        (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA
      const waveB: number =
        (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB
      prevWaveIntegralA = nextWaveIntegralA
      prevWaveIntegralB = nextWaveIntegralB

      const inputSample: number = waveA + waveB * unisonSign
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phaseDeltaA *= phaseDeltaScaleA
      phaseDeltaB *= phaseDeltaScaleB

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phaseA / waveLength
    tone.phases[1] = phaseB / waveLength

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static harmonicsSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!
    const wave: Float32Array = instrument.harmonicsWave.getCustomWave(
      instrument.type,
    )
    const waveLength: number = wave.length - 1 // The first sample is duplicated at the end, don't double-count it.

    const unisonSign: number =
      tone.specialIntervalExpressionMult *
      Config.unisons[instrument.unison].sign
    if (instrument.unison == 0 && !instrument.getChord().customInterval)
      tone.phases[1] = tone.phases[0]
    let phaseDeltaA: number = tone.phaseDeltas[0] * waveLength
    let phaseDeltaB: number = tone.phaseDeltas[1] * waveLength
    const phaseDeltaScaleA: number = +tone.phaseDeltaScales[0]
    const phaseDeltaScaleB: number = +tone.phaseDeltaScales[1]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]
    let phaseA: number = (tone.phases[0] % 1) * waveLength
    let phaseB: number = (tone.phases[1] % 1) * waveLength

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    const phaseAInt: number = phaseA | 0
    const phaseBInt: number = phaseB | 0
    const indexA: number = phaseAInt % waveLength
    const indexB: number = phaseBInt % waveLength
    const phaseRatioA: number = phaseA - phaseAInt
    const phaseRatioB: number = phaseB - phaseBInt
    let prevWaveIntegralA: number = +wave[indexA]
    let prevWaveIntegralB: number = +wave[indexB]
    prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA
    prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      phaseA += phaseDeltaA
      phaseB += phaseDeltaB

      const phaseAInt: number = phaseA | 0
      const phaseBInt: number = phaseB | 0
      const indexA: number = phaseAInt % waveLength
      const indexB: number = phaseBInt % waveLength
      let nextWaveIntegralA: number = wave[indexA]
      let nextWaveIntegralB: number = wave[indexB]
      const phaseRatioA: number = phaseA - phaseAInt
      const phaseRatioB: number = phaseB - phaseBInt
      nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA
      nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB
      const waveA: number =
        (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA
      const waveB: number =
        (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB
      prevWaveIntegralA = nextWaveIntegralA
      prevWaveIntegralB = nextWaveIntegralB

      const inputSample: number = waveA + waveB * unisonSign
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phaseDeltaA *= phaseDeltaScaleA
      phaseDeltaB *= phaseDeltaScaleB

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phaseA / waveLength
    tone.phases[1] = phaseB / waveLength

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static pickedStringSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    // This algorithm is similar to the Karpluss-Strong algorithm in principle, but with an
    // all-pass filter for dispersion and with more control over the impulse.

    const voiceCount: number = Config.unisons[instrument.unison].voices
    let pickedStringFunction: Function =
      Synth.pickedStringFunctionCache[voiceCount]
    if (pickedStringFunction == undefined) {
      let pickedStringSource = ''

      pickedStringSource += `
				
				const Config = beepbox.Config;
				const Synth = beepbox.Synth;
				const NoteAutomationStringSustainIndex = ${NoteAutomationIndex.stringSustain};
				const voiceCount = ${voiceCount};
				const data = synth.tempMonoInstrumentSampleBuffer;
				
				const delayBufferMask = synth.stringDelayBufferMask >>> 0;
				
				const sustainEnvelopeStart = tone.envelopeComputer.envelopeStarts[NoteAutomationStringSustainIndex];
				const sustainEnvelopeEnd   = tone.envelopeComputer.envelopeEnds[  NoteAutomationStringSustainIndex];
				const stringDecayStart = 1.0 - Math.min(1.0, sustainEnvelopeStart * instrument.stringSustain / (Config.stringSustainRange - 1));
				const stringDecayEnd   = 1.0 - Math.min(1.0, sustainEnvelopeEnd   * instrument.stringSustain / (Config.stringSustainRange - 1));
				
				let pickedString# = tone.pickedStrings[#];
				
				if (pickedString#.delayLine == null || pickedString#.delayLine.length < synth.stringDelayBufferSize) pickedString#.delayLine = new Float32Array(synth.stringDelayBufferSize);
				const delayLine# = pickedString#.delayLine;
				const prevDelayLength# = +pickedString#.prevDelayLength;
				let allPassSample# = +pickedString#.allPassSample;
				let allPassPrevInput# = +pickedString#.allPassPrevInput;
				let shelfSample# = +pickedString#.shelfSample;
				let shelfPrevInput# = +pickedString#.shelfPrevInput;
				let fractionalDelaySample# = +pickedString#.fractionalDelaySample;
				
				let expression = +tone.expressionStarts[0];
				const expressionDelta = +tone.expressionDeltas[0];
				
				const phaseDeltaStart# = +tone.phaseDeltas[#];
				const phaseDeltaScale# = +tone.phaseDeltaScales[#];
				const phaseDeltaEnd# = phaseDeltaStart# * Math.pow(phaseDeltaScale#, runLength);
				
				const radiansPerSampleStart# = Math.PI * 2.0 * phaseDeltaStart#;
				const radiansPerSampleEnd#   = Math.PI * 2.0 * phaseDeltaEnd#;
				
				const centerHarmonicStart# = radiansPerSampleStart# * 2.0;
				const centerHarmonicEnd#   = radiansPerSampleEnd# * 2.0;
				
				const allPassCenter = 2.0 * Math.PI * Config.pickedStringDispersionCenterFreq / synth.samplesPerSecond;
				const allPassRadiansStart# = Math.min(Math.PI, radiansPerSampleStart# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleStart#, Config.pickedStringDispersionFreqScale));
				const allPassRadiansEnd# = Math.min(Math.PI, radiansPerSampleEnd# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleEnd#, Config.pickedStringDispersionFreqScale));
				
				const shelfRadians = 2.0 * Math.PI * Config.pickedStringShelfHz / synth.samplesPerSecond;
				const decayCurveStart = (Math.pow(100.0, stringDecayStart) - 1.0) / 99.0;
				const decayCurveEnd   = (Math.pow(100.0, stringDecayEnd  ) - 1.0) / 99.0;
				const decayRateStart# = Math.pow(0.5, decayCurveStart * shelfRadians / radiansPerSampleStart#);
				const decayRateEnd#   = Math.pow(0.5, decayCurveEnd   * shelfRadians / radiansPerSampleEnd#);
				const shelfGainStart# = Math.pow(decayRateStart#, Config.stringDecayRate);
				const shelfGainEnd#   = Math.pow(decayRateEnd#,   Config.stringDecayRate);
				const expressionDecayStart# = Math.pow(decayRateStart#, 0.002);
				const expressionDecayEnd#   = Math.pow(decayRateEnd#,   0.002);`

      for (let voice = 0; voice < voiceCount; voice++) {
        pickedStringSource += `
				
				Synth.tempFilterStartCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#);
				let allPassG# = +Synth.tempFilterStartCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansEnd#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#);
				const allPassGEnd# = +Synth.tempFilterEndCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;
				
				Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, shelfGainStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#)
				let shelfA1# = +Synth.tempFilterStartCoefficients.a[1]
				let shelfB0# = Synth.tempFilterStartCoefficients.b[0] * expressionDecayStart#
				let shelfB1# = Synth.tempFilterStartCoefficients.b[1] * expressionDecayStart#
				const shelfPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.highShelf1stOrder(shelfRadians, shelfGainEnd#)
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#)
				const shelfA1End# = +Synth.tempFilterEndCoefficients.a[1]
				const shelfB0End# = Synth.tempFilterEndCoefficients.b[0] * expressionDecayEnd#
				const shelfB1End# = Synth.tempFilterEndCoefficients.b[1] * expressionDecayEnd#
				const shelfPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;`.replace(
          /\#/g,
          String(voice),
        )
      }

      pickedStringSource += `
				
				const periodLengthStart# = 1.0 / phaseDeltaStart#;
				const periodLengthEnd# = 1.0 / phaseDeltaEnd#;
				let delayLength# = periodLengthStart# - allPassPhaseDelayStart# - shelfPhaseDelayStart#;
				const delayLengthEnd# = periodLengthEnd# - allPassPhaseDelayEnd# - shelfPhaseDelayEnd#;
				
				const delayLengthDelta# = (delayLengthEnd# - delayLength#) / runLength;
				const allPassGDelta# = (allPassGEnd# - allPassG#) / runLength;
				const shelfA1Delta# = (shelfA1End# - shelfA1#) / runLength;
				const shelfB0Delta# = (shelfB0End# - shelfB0#) / runLength;
				const shelfB1Delta# = (shelfB1End# - shelfB1#) / runLength;
				
				const filters = tone.noteFilters;
				const filterCount = tone.noteFilterCount|0;
				let initialFilterInput1 = +tone.initialNoteFilterInput1;
				let initialFilterInput2 = +tone.initialNoteFilterInput2;
				const applyFilters = Synth.applyFilters;
				
				const pitchChanged# = Math.abs(Math.log2(delayLength# / prevDelayLength#)) > 0.01;
				let delayIndex# = pickedString#.delayIndex|0;`

      for (let voice = 0; voice < voiceCount; voice++) {
        pickedStringSource += `
					
				if (delayIndex# == -1 || pitchChanged#)  {
					// -1 delay index means the tone was reset.
					// Also, if the pitch changed suddenly (e.g. from seamless or arpeggio) then reset the wave.
					
					delayIndex# = 0;
					allPassSample# = 0.0;
					allPassPrevInput# = 0.0;
					shelfSample# = 0.0;
					shelfPrevInput# = 0.0;
					fractionalDelaySample# = 0.0;
					
					// Clear away a region of the delay buffer for the new impulse.
					const startImpulseFrom = -delayLength#;
					const startZerosFrom = Math.floor(startImpulseFrom - periodLengthStart# / 2);
					const stopZerosAt = Math.ceil(startZerosFrom + periodLengthStart# * 2);
					pickedString#.delayResetOffset = stopZerosAt; // And continue clearing the area in front of the delay line.
					for (let i = startZerosFrom; i <= stopZerosAt; i++) {
						delayLine#[i & delayBufferMask] = 0.0;
					}
					
					const impulseWave = instrument.harmonicsWave.getCustomWave(instrument.type);
					const impulseWaveLength = impulseWave.length - 1; // The first sample is duplicated at the end, don't double-count it.
					const impulsePhaseDelta = impulseWaveLength / periodLengthStart#;
					if (delayLine#.length <= Math.ceil(periodLengthStart# * 2)) {
						throw new Error("Picked string delay buffer too small to contain wave, buffer: " + impulseWaveLength + ", period: " + periodLengthStart#);
					}
					
					const fadeDuration = Math.min(periodLengthStart# * 0.2, synth.samplesPerSecond * 0.003);
					const startImpulseFromSample = Math.ceil(startImpulseFrom);
					const stopImpulseAt = startImpulseFrom + periodLengthStart# + fadeDuration;
					const stopImpulseAtSample = stopImpulseAt;
					let impulsePhase = (startImpulseFromSample - startImpulseFrom) * impulsePhaseDelta;
					let prevWaveIntegral = 0.0;
					for (let i = startImpulseFromSample; i <= stopImpulseAtSample; i++) {
						const impulsePhaseInt = impulsePhase|0;
						const index = impulsePhaseInt % impulseWaveLength;
						let nextWaveIntegral = impulseWave[index];
						const phaseRatio = impulsePhase - impulsePhaseInt;
						nextWaveIntegral += (impulseWave[index+1] - nextWaveIntegral) * phaseRatio;
						const sample = (nextWaveIntegral - prevWaveIntegral) / impulsePhaseDelta;
						const fadeIn = Math.min(1.0, (i - startImpulseFrom) / fadeDuration);
						const fadeOut = Math.min(1.0, (stopImpulseAt - i) / fadeDuration);
						const combinedFade = fadeIn * fadeOut;
						const curvedFade = combinedFade * combinedFade * (3.0 - 2.0 * combinedFade); // A cubic sigmoid from 0 to 1.
						delayLine#[i & delayBufferMask] += sample * curvedFade;
						prevWaveIntegral = nextWaveIntegral;
						impulsePhase += impulsePhaseDelta;
					}
				}
				delayIndex# = (delayIndex# & delayBufferMask) + synth.stringDelayBufferSize;`.replace(
          /\#/g,
          String(voice),
        )
      }

      pickedStringSource += `
				
				const unisonSign = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
				const delayResetOffset# = pickedString#.delayResetOffset|0;
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					const targetSampleTime# = delayIndex# - delayLength#;
					const lowerIndex# = (targetSampleTime# + 0.125) | 0; // Offset to improve stability of all-pass filter.
					const upperIndex# = lowerIndex# + 1;
					const fractionalDelay# = upperIndex# - targetSampleTime#;
					const fractionalDelayG# = (1.0 - fractionalDelay#) / (1.0 + fractionalDelay#); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
					const prevInput# = delayLine#[lowerIndex# & delayBufferMask];
					const input# = delayLine#[upperIndex# & delayBufferMask];
					fractionalDelaySample# = fractionalDelayG# * input# + prevInput# - fractionalDelayG# * fractionalDelaySample#;
					
					allPassSample# = fractionalDelaySample# * allPassG# + allPassPrevInput# - allPassG# * allPassSample#;
					allPassPrevInput# = fractionalDelaySample#;
					
					shelfSample# = shelfB0# * allPassSample# + shelfB1# * shelfPrevInput# - shelfA1# * shelfSample#;
					shelfPrevInput# = allPassSample#;
					
					delayLine#[delayIndex# & delayBufferMask] += shelfSample#;
					delayLine#[(delayIndex# + delayResetOffset#) & delayBufferMask] = 0.0;
					delayIndex#++;
					
					const inputSample = (`

      const sampleList: string[] = []
      for (let voice = 0; voice < voiceCount; voice++) {
        sampleList.push(
          'fractionalDelaySample' + voice + (voice == 1 ? ' * unisonSign' : ''),
        )
      }

      pickedStringSource += sampleList.join(' + ')

      pickedStringSource += `) * expression;
					const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;
					data[sampleIndex] += sample;
					
					expression += expressionDelta;
					delayLength# += delayLengthDelta#;
					allPassG# += allPassGDelta#;
					shelfA1# += shelfA1Delta#;
					shelfB0# += shelfB0Delta#;
					shelfB1# += shelfB1Delta#;
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);
				if (!Number.isFinite(allPassSample#) || Math.abs(allPassSample#) < epsilon) allPassSample# = 0.0;
				if (!Number.isFinite(allPassPrevInput#) || Math.abs(allPassPrevInput#) < epsilon) allPassPrevInput# = 0.0;
				if (!Number.isFinite(shelfSample#) || Math.abs(shelfSample#) < epsilon) shelfSample# = 0.0;
				if (!Number.isFinite(shelfPrevInput#) || Math.abs(shelfPrevInput#) < epsilon) shelfPrevInput# = 0.0;
				if (!Number.isFinite(fractionalDelaySample#) || Math.abs(fractionalDelaySample#) < epsilon) fractionalDelaySample# = 0.0;
				pickedString#.allPassSample = allPassSample#;
				pickedString#.allPassPrevInput = allPassPrevInput#;
				pickedString#.shelfSample = shelfSample#;
				pickedString#.shelfPrevInput = shelfPrevInput#;
				pickedString#.fractionalDelaySample = fractionalDelaySample#;
				pickedString#.delayIndex = delayIndex#;
				pickedString#.prevDelayLength = delayLength#;
				
				synth.sanitizeFilters(filters);
				tone.initialNoteFilterInput1 = initialFilterInput1;
				tone.initialNoteFilterInput2 = initialFilterInput2;`

      // Duplicate lines containing "#" for each voice and replace the "#" with the voice index.
      pickedStringSource = pickedStringSource.replace(/^.*\#.*$/gm, (line) => {
        const lines = []
        for (let voice = 0; voice < voiceCount; voice++) {
          lines.push(line.replace(/\#/g, String(voice)))
        }
        return lines.join('\n')
      })

      //console.log(pickedStringSource);
      pickedStringFunction = new Function(
        'synth',
        'bufferIndex',
        'runLength',
        'tone',
        'instrument',
        pickedStringSource,
      )
      Synth.pickedStringFunctionCache[voiceCount] = pickedStringFunction
    }

    pickedStringFunction(synth, bufferIndex, runLength, tone, instrument)
  }

  private static effectsSynth(
    synth: Synth,
    outputDataL: Float32Array,
    outputDataR: Float32Array,
    bufferIndex: number,
    runLength: number,
    instrument: Instrument,
    instrumentState: InstrumentState,
  ): void {
    // TODO: If automation is involved, don't assume sliders will stay at zero.
    const usesDistortion: boolean =
      effectsIncludeDistortion(instrument.effects) && instrument.distortion != 0
    const usesBitcrusher: boolean = effectsIncludeBitcrusher(instrument.effects)
    const usesEqFilter: boolean = instrumentState.eqFilterCount > 0
    const usesPanning: boolean =
      effectsIncludePanning(instrument.effects) &&
      instrument.pan != Config.panCenter
    const usesChorus: boolean =
      effectsIncludeChorus(instrument.effects) && instrument.chorus != 0
    const usesEcho: boolean =
      effectsIncludeEcho(instrument.effects) && instrument.echoSustain != 0
    const usesReverb: boolean =
      effectsIncludeReverb(instrument.effects) && instrument.reverb != 0
    let signature = 0
    if (usesDistortion) signature = signature | 1
    signature = signature << 1
    if (usesBitcrusher) signature = signature | 1
    signature = signature << 1
    if (usesEqFilter) signature = signature | 1
    signature = signature << 1
    if (usesPanning) signature = signature | 1
    signature = signature << 1
    if (usesChorus) signature = signature | 1
    signature = signature << 1
    if (usesEcho) signature = signature | 1
    signature = signature << 1
    if (usesReverb) signature = signature | 1

    let effectsFunction: Function = Synth.effectsFunctionCache[signature]
    if (effectsFunction == undefined) {
      let effectsSource = ''

      const usesDelays: boolean = usesChorus || usesReverb || usesEcho

      effectsSource += `
				const tempMonoInstrumentSampleBuffer = synth.tempMonoInstrumentSampleBuffer;
				
				let mixVolume = +instrumentState.mixVolumeStart;
				const mixVolumeDelta = +instrumentState.mixVolumeDelta;`

      if (usesDelays) {
        effectsSource += `
				
				let delayInputMult = +instrumentState.delayInputMultStart;
				const delayInputMultDelta = +instrumentState.delayInputMultDelta;`
      }

      if (usesDistortion) {
        // Distortion can sometimes create noticeable aliasing.
        // It seems the established industry best practice for distortion antialiasing
        // is to upsample the inputs ("zero stuffing" followed by a brick wall lowpass
        // at the original nyquist frequency), perform the distortion, then downsample
        // (the lowpass again followed by dropping in-between samples). This is
        // "mathematically correct" in that it preserves only the intended frequencies,
        // but it has several unfortunate tradeoffs depending on the choice of filter,
        // introducing latency and/or time smearing, since no true brick wall filter
        // exists. For the time being, I've opted to instead generate in-between input
        // samples using fractional delay all-pass filters, and after distorting them,
        // I "downsample" these with a simple weighted sum.

        effectsSource += `
				
				const distortionBaseVolume = +beepbox.Config.distortionBaseVolume;
				const distortionStart = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionStart) - 1.0) / 19.0, 2.0)
				const distortionEnd   = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionEnd  ) - 1.0) / 19.0, 2.0)
				let distortion = distortionStart;
				const distortionDelta = (distortionEnd - distortionStart) / runLength;
				const distortionDriveStart = (1.0 + 2.0 * instrumentState.distortionStart) / distortionBaseVolume;
				const distortionDriveEnd   = (1.0 + 2.0 * instrumentState.distortionEnd)   / distortionBaseVolume;
				let distortionDrive = distortionDriveStart;
				const distortionDriveDelta = (distortionDriveEnd - distortionDriveStart) / runLength;
				const distortionFractionalResolution = 4.0;
				const distortionOversampleCompensation = distortionBaseVolume / distortionFractionalResolution;
				const distortionFractionalDelay1 = 1.0 / distortionFractionalResolution;
				const distortionFractionalDelay2 = 2.0 / distortionFractionalResolution;
				const distortionFractionalDelay3 = 3.0 / distortionFractionalResolution;
				const distortionFractionalDelayG1 = (1.0 - distortionFractionalDelay1) / (1.0 + distortionFractionalDelay1); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG2 = (1.0 - distortionFractionalDelay2) / (1.0 + distortionFractionalDelay2); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG3 = (1.0 - distortionFractionalDelay3) / (1.0 + distortionFractionalDelay3); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionNextOutputWeight1 = Math.cos(Math.PI * distortionFractionalDelay1) * 0.5 + 0.5;
				const distortionNextOutputWeight2 = Math.cos(Math.PI * distortionFractionalDelay2) * 0.5 + 0.5;
				const distortionNextOutputWeight3 = Math.cos(Math.PI * distortionFractionalDelay3) * 0.5 + 0.5;
				const distortionPrevOutputWeight1 = 1.0 - distortionNextOutputWeight1;
				const distortionPrevOutputWeight2 = 1.0 - distortionNextOutputWeight2;
				const distortionPrevOutputWeight3 = 1.0 - distortionNextOutputWeight3;
				
				let distortionFractionalInput1 = +instrumentState.distortionFractionalInput1;
				let distortionFractionalInput2 = +instrumentState.distortionFractionalInput2;
				let distortionFractionalInput3 = +instrumentState.distortionFractionalInput3;
				let distortionPrevInput = +instrumentState.distortionPrevInput;
				let distortionNextOutput = +instrumentState.distortionNextOutput;`
      }

      if (usesBitcrusher) {
        effectsSource += `
				
				let bitcrusherPrevInput = +instrumentState.bitcrusherPrevInput;
				let bitcrusherCurrentOutput = +instrumentState.bitcrusherCurrentOutput;
				let bitcrusherPhase = +instrumentState.bitcrusherPhase;
				let bitcrusherPhaseDelta = +instrumentState.bitcrusherPhaseDelta;
				const bitcrusherPhaseDeltaScale = +instrumentState.bitcrusherPhaseDeltaScale;
				let bitcrusherScale = +instrumentState.bitcrusherScale;
				const bitcrusherScaleScale = +instrumentState.bitcrusherScaleScale;
				let bitcrusherFoldLevel = +instrumentState.bitcrusherFoldLevel;
				const bitcrusherFoldLevelScale = +instrumentState.bitcrusherFoldLevelScale;`
      }

      if (usesEqFilter) {
        effectsSource += `
				
				let filters = instrumentState.eqFilters;
				const filterCount = instrumentState.eqFilterCount|0;
				let initialFilterInput1 = +instrumentState.initialEqFilterInput1;
				let initialFilterInput2 = +instrumentState.initialEqFilterInput2;
				const applyFilters = beepbox.Synth.applyFilters;`
      }

      // The eq filter volume is also used to fade out the instrument state, so always include it.
      effectsSource += `
				
				let eqFilterVolume = +instrumentState.eqFilterVolumeStart;
				const eqFilterVolumeDelta = +instrumentState.eqFilterVolumeDelta;`

      if (usesPanning) {
        effectsSource += `
				
				const panningMask = synth.panningDelayBufferMask >>> 0;
				const panningDelayLine = instrumentState.panningDelayLine;
				let panningDelayPos = instrumentState.panningDelayPos & panningMask;
				let   panningVolumeL      = +instrumentState.panningVolumeStartL;
				let   panningVolumeR      = +instrumentState.panningVolumeStartR;
				const panningVolumeDeltaL = +instrumentState.panningVolumeDeltaL;
				const panningVolumeDeltaR = +instrumentState.panningVolumeDeltaR;
				let   panningOffsetL      = panningDelayPos - instrumentState.panningOffsetStartL + synth.panningDelayBufferSize;
				let   panningOffsetR      = panningDelayPos - instrumentState.panningOffsetStartR + synth.panningDelayBufferSize;
				const panningOffsetDeltaL = 1.0 - instrumentState.panningOffsetDeltaL;
				const panningOffsetDeltaR = 1.0 - instrumentState.panningOffsetDeltaR;`
      }

      if (usesChorus) {
        effectsSource += `
				
				const chorusMask = synth.chorusDelayBufferMask >>> 0;
				const chorusDelayLineL = instrumentState.chorusDelayLineL;
				const chorusDelayLineR = instrumentState.chorusDelayLineR;
				instrumentState.chorusDelayLineDirty = true;
				let chorusDelayPos = instrumentState.chorusDelayPos & chorusMask;
				
				const chorusStart = +instrumentState.chorusStart;
				const chorusEnd   = +instrumentState.chorusEnd;
				let chorusVoiceMult = chorusStart;
				const chorusVoiceMultDelta = (chorusEnd - chorusStart) / runLength;
				let chorusCombinedMult = 1.0 / Math.sqrt(3.0 * chorusStart * chorusStart + 1.0);
				const chorusCombinedMultEnd = 1.0 / Math.sqrt(3.0 * chorusEnd * chorusEnd + 1.0);
				const chorusCombinedMultDelta = (chorusCombinedMultEnd - chorusCombinedMult) / runLength;
				
				const chorusDuration = +beepbox.Config.chorusPeriodSeconds;
				const chorusAngle = Math.PI * 2.0 / (chorusDuration * synth.samplesPerSecond);
				const chorusRange = synth.samplesPerSecond * beepbox.Config.chorusDelayRange;
				const chorusOffset0 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][0] * chorusRange;
				const chorusOffset1 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][1] * chorusRange;
				const chorusOffset2 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][2] * chorusRange;
				const chorusOffset3 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][0] * chorusRange;
				const chorusOffset4 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][1] * chorusRange;
				const chorusOffset5 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][2] * chorusRange;
				let chorusPhase = instrumentState.chorusPhase % (Math.PI * 2.0);
				let chorusTap0Index = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]);
				let chorusTap1Index = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]);
				let chorusTap2Index = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]);
				let chorusTap3Index = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]);
				let chorusTap4Index = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]);
				let chorusTap5Index = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]);
				chorusPhase += chorusAngle * runLength;
				const chorusTap0End = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]) + runLength;
				const chorusTap1End = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]) + runLength;
				const chorusTap2End = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]) + runLength;
				const chorusTap3End = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]) + runLength;
				const chorusTap4End = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]) + runLength;
				const chorusTap5End = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]) + runLength;
				const chorusTap0Delta = (chorusTap0End - chorusTap0Index) / runLength;
				const chorusTap1Delta = (chorusTap1End - chorusTap1Index) / runLength;
				const chorusTap2Delta = (chorusTap2End - chorusTap2Index) / runLength;
				const chorusTap3Delta = (chorusTap3End - chorusTap3Index) / runLength;
				const chorusTap4Delta = (chorusTap4End - chorusTap4Index) / runLength;
				const chorusTap5Delta = (chorusTap5End - chorusTap5Index) / runLength;`
      }

      if (usesEcho) {
        effectsSource += `
				
				let echoMult = +instrumentState.echoMultStart;
				const echoMultDelta = +instrumentState.echoMultDelta;
				
				const echoDelayLineL = instrumentState.echoDelayLineL;
				const echoDelayLineR = instrumentState.echoDelayLineR;
				const echoMask = (echoDelayLineL.length - 1) >>> 0;
				instrumentState.echoDelayLineDirty = true;
				
				let echoDelayPos = instrumentState.echoDelayPos & echoMask;
				const echoDelayOffsetStart = (echoDelayLineL.length - instrumentState.echoDelayOffsetStart) & echoMask;
				const echoDelayOffsetEnd   = (echoDelayLineL.length - instrumentState.echoDelayOffsetEnd) & echoMask;
				let echoDelayOffsetRatio = +instrumentState.echoDelayOffsetRatio;
				const echoDelayOffsetRatioDelta = +instrumentState.echoDelayOffsetRatioDelta;
				
				const echoShelfA1 = +instrumentState.echoShelfA1;
				const echoShelfB0 = +instrumentState.echoShelfB0;
				const echoShelfB1 = +instrumentState.echoShelfB1;
				let echoShelfSampleL = +instrumentState.echoShelfSampleL;
				let echoShelfSampleR = +instrumentState.echoShelfSampleR;
				let echoShelfPrevInputL = +instrumentState.echoShelfPrevInputL;
				let echoShelfPrevInputR = +instrumentState.echoShelfPrevInputR;`
      }

      if (usesReverb) {
        effectsSource += `
				
				const reverbMask = beepbox.Config.reverbDelayBufferMask >>> 0; //TODO: Dynamic reverb buffer size.
				const reverbDelayLine = instrumentState.reverbDelayLine;
				instrumentState.reverbDelayLineDirty = true;
				let reverbDelayPos = instrumentState.reverbDelayPos & reverbMask;
				
				let reverb = +instrumentState.reverbMultStart;
				const reverbDelta = +instrumentState.reverbMultDelta;
				
				const reverbShelfA1 = +instrumentState.reverbShelfA1;
				const reverbShelfB0 = +instrumentState.reverbShelfB0;
				const reverbShelfB1 = +instrumentState.reverbShelfB1;
				let reverbShelfSample0 = +instrumentState.reverbShelfSample0;
				let reverbShelfSample1 = +instrumentState.reverbShelfSample1;
				let reverbShelfSample2 = +instrumentState.reverbShelfSample2;
				let reverbShelfSample3 = +instrumentState.reverbShelfSample3;
				let reverbShelfPrevInput0 = +instrumentState.reverbShelfPrevInput0;
				let reverbShelfPrevInput1 = +instrumentState.reverbShelfPrevInput1;
				let reverbShelfPrevInput2 = +instrumentState.reverbShelfPrevInput2;
				let reverbShelfPrevInput3 = +instrumentState.reverbShelfPrevInput3;`
      }

      effectsSource += `
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					let sample = tempMonoInstrumentSampleBuffer[sampleIndex];
					tempMonoInstrumentSampleBuffer[sampleIndex] = 0.0;`

      if (usesDistortion) {
        effectsSource += `
					
					const distortionReverse = 1.0 - distortion;
					const distortionNextInput = sample * distortionDrive;
					sample = distortionNextOutput;
					distortionNextOutput = distortionNextInput / (distortionReverse * Math.abs(distortionNextInput) + distortion);
					distortionFractionalInput1 = distortionFractionalDelayG1 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG1 * distortionFractionalInput1;
					distortionFractionalInput2 = distortionFractionalDelayG2 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG2 * distortionFractionalInput2;
					distortionFractionalInput3 = distortionFractionalDelayG3 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG3 * distortionFractionalInput3;
					const distortionOutput1 = distortionFractionalInput1 / (distortionReverse * Math.abs(distortionFractionalInput1) + distortion);
					const distortionOutput2 = distortionFractionalInput2 / (distortionReverse * Math.abs(distortionFractionalInput2) + distortion);
					const distortionOutput3 = distortionFractionalInput3 / (distortionReverse * Math.abs(distortionFractionalInput3) + distortion);
					distortionNextOutput += distortionOutput1 * distortionNextOutputWeight1 + distortionOutput2 * distortionNextOutputWeight2 + distortionOutput3 * distortionNextOutputWeight3;
					sample += distortionOutput1 * distortionPrevOutputWeight1 + distortionOutput2 * distortionPrevOutputWeight2 + distortionOutput3 * distortionPrevOutputWeight3;
					sample *= distortionOversampleCompensation;
					distortionPrevInput = distortionNextInput;
					distortion += distortionDelta;
					distortionDrive += distortionDriveDelta;`
      }

      if (usesBitcrusher) {
        effectsSource += `
					
					bitcrusherPhase += bitcrusherPhaseDelta;
					if (bitcrusherPhase < 1.0) {
						bitcrusherPrevInput = sample;
						sample = bitcrusherCurrentOutput;
					} else {
						bitcrusherPhase = bitcrusherPhase % 1.0;
						const ratio = bitcrusherPhase / bitcrusherPhaseDelta;
						
						const lerpedInput = sample + (bitcrusherPrevInput - sample) * ratio;
						bitcrusherPrevInput = sample;
						
						const bitcrusherWrapLevel = bitcrusherFoldLevel * 4.0;
						const wrappedSample = (((lerpedInput + bitcrusherFoldLevel) % bitcrusherWrapLevel) + bitcrusherWrapLevel) % bitcrusherWrapLevel;
						const foldedSample = bitcrusherFoldLevel - Math.abs(bitcrusherFoldLevel * 2.0 - wrappedSample);
						const scaledSample = foldedSample / bitcrusherScale;
						const oldValue = bitcrusherCurrentOutput;
						const newValue = (((scaledSample > 0 ? scaledSample + 1 : scaledSample)|0)-.5) * bitcrusherScale;
						
						sample = oldValue + (newValue - oldValue) * ratio;
						bitcrusherCurrentOutput = newValue;
					}
					bitcrusherPhaseDelta *= bitcrusherPhaseDeltaScale;
					bitcrusherScale *= bitcrusherScaleScale;
					bitcrusherFoldLevel *= bitcrusherFoldLevelScale;`
      }

      if (usesEqFilter) {
        effectsSource += `
					
					const inputSample = sample;
					sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;`
      }

      // The eq filter volume is also used to fade out the instrument state, so always include it.
      effectsSource += `
					
					sample *= eqFilterVolume;
					eqFilterVolume += eqFilterVolumeDelta;`

      if (usesPanning) {
        effectsSource += `
					
					panningDelayLine[panningDelayPos] = sample;
					const panningRatioL  = panningOffsetL % 1;
					const panningRatioR  = panningOffsetR % 1;
					const panningTapLA   = panningDelayLine[(panningOffsetL) & panningMask];
					const panningTapLB   = panningDelayLine[(panningOffsetL + 1) & panningMask];
					const panningTapRA   = panningDelayLine[(panningOffsetR) & panningMask];
					const panningTapRB   = panningDelayLine[(panningOffsetR + 1) & panningMask];
					const panningTapL    = panningTapLA + (panningTapLB - panningTapLA) * panningRatioL;
					const panningTapR    = panningTapRA + (panningTapRB - panningTapRA) * panningRatioR;
					let sampleL = panningTapL * panningVolumeL;
					let sampleR = panningTapR * panningVolumeR;
					panningDelayPos = (panningDelayPos + 1) & panningMask;
					panningVolumeL += panningVolumeDeltaL;
					panningVolumeR += panningVolumeDeltaR;
					panningOffsetL += panningOffsetDeltaL;
					panningOffsetR += panningOffsetDeltaR;`
      } else {
        effectsSource += `
					
					let sampleL = sample;
					let sampleR = sample;`
      }

      if (usesChorus) {
        effectsSource += `
					
					const chorusTap0Ratio = chorusTap0Index % 1;
					const chorusTap1Ratio = chorusTap1Index % 1;
					const chorusTap2Ratio = chorusTap2Index % 1;
					const chorusTap3Ratio = chorusTap3Index % 1;
					const chorusTap4Ratio = chorusTap4Index % 1;
					const chorusTap5Ratio = chorusTap5Index % 1;
					const chorusTap0A = chorusDelayLineL[(chorusTap0Index) & chorusMask];
					const chorusTap0B = chorusDelayLineL[(chorusTap0Index + 1) & chorusMask];
					const chorusTap1A = chorusDelayLineL[(chorusTap1Index) & chorusMask];
					const chorusTap1B = chorusDelayLineL[(chorusTap1Index + 1) & chorusMask];
					const chorusTap2A = chorusDelayLineL[(chorusTap2Index) & chorusMask];
					const chorusTap2B = chorusDelayLineL[(chorusTap2Index + 1) & chorusMask];
					const chorusTap3A = chorusDelayLineR[(chorusTap3Index) & chorusMask];
					const chorusTap3B = chorusDelayLineR[(chorusTap3Index + 1) & chorusMask];
					const chorusTap4A = chorusDelayLineR[(chorusTap4Index) & chorusMask];
					const chorusTap4B = chorusDelayLineR[(chorusTap4Index + 1) & chorusMask];
					const chorusTap5A = chorusDelayLineR[(chorusTap5Index) & chorusMask];
					const chorusTap5B = chorusDelayLineR[(chorusTap5Index + 1) & chorusMask];
					const chorusTap0 = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
					const chorusTap1 = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
					const chorusTap2 = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
					const chorusTap3 = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;
					const chorusTap4 = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;
					const chorusTap5 = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;
					chorusDelayLineL[chorusDelayPos] = sampleL * delayInputMult;
					chorusDelayLineR[chorusDelayPos] = sampleR * delayInputMult;
					sampleL = chorusCombinedMult * (sampleL + chorusVoiceMult * (chorusTap1 - chorusTap0 - chorusTap2));
					sampleR = chorusCombinedMult * (sampleR + chorusVoiceMult * (chorusTap4 - chorusTap3 - chorusTap5));
					chorusDelayPos = (chorusDelayPos + 1) & chorusMask;
					chorusTap0Index += chorusTap0Delta;
					chorusTap1Index += chorusTap1Delta;
					chorusTap2Index += chorusTap2Delta;
					chorusTap3Index += chorusTap3Delta;
					chorusTap4Index += chorusTap4Delta;
					chorusTap5Index += chorusTap5Delta;
					chorusVoiceMult += chorusVoiceMultDelta;
					chorusCombinedMult += chorusCombinedMultDelta;`
      }

      if (usesEcho) {
        effectsSource += `
					
					const echoTapStartIndex = (echoDelayPos + echoDelayOffsetStart) & echoMask;
					const echoTapEndIndex   = (echoDelayPos + echoDelayOffsetEnd  ) & echoMask;
					const echoTapStartL = echoDelayLineL[echoTapStartIndex];
					const echoTapEndL   = echoDelayLineL[echoTapEndIndex];
					const echoTapStartR = echoDelayLineR[echoTapStartIndex];
					const echoTapEndR   = echoDelayLineR[echoTapEndIndex];
					const echoTapL = (echoTapStartL + (echoTapEndL - echoTapStartL) * echoDelayOffsetRatio) * echoMult;
					const echoTapR = (echoTapStartR + (echoTapEndR - echoTapStartR) * echoDelayOffsetRatio) * echoMult;
					
					echoShelfSampleL = echoShelfB0 * echoTapL + echoShelfB1 * echoShelfPrevInputL - echoShelfA1 * echoShelfSampleL;
					echoShelfSampleR = echoShelfB0 * echoTapR + echoShelfB1 * echoShelfPrevInputR - echoShelfA1 * echoShelfSampleR;
					echoShelfPrevInputL = echoTapL;
					echoShelfPrevInputR = echoTapR;
					sampleL += echoShelfSampleL;
					sampleR += echoShelfSampleR;
					
					echoDelayLineL[echoDelayPos] = sampleL * delayInputMult;
					echoDelayLineR[echoDelayPos] = sampleR * delayInputMult;
					echoDelayPos = (echoDelayPos + 1) & echoMask;
					echoDelayOffsetRatio += echoDelayOffsetRatioDelta;
					echoMult += echoMultDelta;`
      }

      if (usesReverb) {
        effectsSource += `
					
					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					const reverbDelayPos1 = (reverbDelayPos +  3041) & reverbMask;
					const reverbDelayPos2 = (reverbDelayPos +  6426) & reverbMask;
					const reverbDelayPos3 = (reverbDelayPos + 10907) & reverbMask;
					const reverbSample0 = (reverbDelayLine[reverbDelayPos]);
					const reverbSample1 = reverbDelayLine[reverbDelayPos1];
					const reverbSample2 = reverbDelayLine[reverbDelayPos2];
					const reverbSample3 = reverbDelayLine[reverbDelayPos3];
					const reverbTemp0 = -(reverbSample0 + sampleL) + reverbSample1;
					const reverbTemp1 = -(reverbSample0 + sampleR) - reverbSample1;
					const reverbTemp2 = -reverbSample2 + reverbSample3;
					const reverbTemp3 = -reverbSample2 - reverbSample3;
					const reverbShelfInput0 = (reverbTemp0 + reverbTemp2) * reverb;
					const reverbShelfInput1 = (reverbTemp1 + reverbTemp3) * reverb;
					const reverbShelfInput2 = (reverbTemp0 - reverbTemp2) * reverb;
					const reverbShelfInput3 = (reverbTemp1 - reverbTemp3) * reverb;
					reverbShelfSample0 = reverbShelfB0 * reverbShelfInput0 + reverbShelfB1 * reverbShelfPrevInput0 - reverbShelfA1 * reverbShelfSample0;
					reverbShelfSample1 = reverbShelfB0 * reverbShelfInput1 + reverbShelfB1 * reverbShelfPrevInput1 - reverbShelfA1 * reverbShelfSample1;
					reverbShelfSample2 = reverbShelfB0 * reverbShelfInput2 + reverbShelfB1 * reverbShelfPrevInput2 - reverbShelfA1 * reverbShelfSample2;
					reverbShelfSample3 = reverbShelfB0 * reverbShelfInput3 + reverbShelfB1 * reverbShelfPrevInput3 - reverbShelfA1 * reverbShelfSample3;
					reverbShelfPrevInput0 = reverbShelfInput0;
					reverbShelfPrevInput1 = reverbShelfInput1;
					reverbShelfPrevInput2 = reverbShelfInput2;
					reverbShelfPrevInput3 = reverbShelfInput3;
					reverbDelayLine[reverbDelayPos1] = reverbShelfSample0 * delayInputMult;
					reverbDelayLine[reverbDelayPos2] = reverbShelfSample1 * delayInputMult;
					reverbDelayLine[reverbDelayPos3] = reverbShelfSample2 * delayInputMult;
					reverbDelayLine[reverbDelayPos ] = reverbShelfSample3 * delayInputMult;
					reverbDelayPos = (reverbDelayPos + 1) & reverbMask;
					sampleL += reverbSample1 + reverbSample2 + reverbSample3;
					sampleR += reverbSample0 + reverbSample2 - reverbSample3;
					reverb += reverbDelta;`
      }

      effectsSource += `
					
					outputDataL[sampleIndex] += sampleL * mixVolume;
					outputDataR[sampleIndex] += sampleR * mixVolume;
					mixVolume += mixVolumeDelta;`

      if (usesDelays) {
        effectsSource += `
					
					delayInputMult += delayInputMultDelta;`
      }

      effectsSource += `
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);`

      if (usesDistortion) {
        effectsSource += `
				
				if (!Number.isFinite(distortionFractionalInput1) || Math.abs(distortionFractionalInput1) < epsilon) distortionFractionalInput1 = 0.0;
				if (!Number.isFinite(distortionFractionalInput2) || Math.abs(distortionFractionalInput2) < epsilon) distortionFractionalInput2 = 0.0;
				if (!Number.isFinite(distortionFractionalInput3) || Math.abs(distortionFractionalInput3) < epsilon) distortionFractionalInput3 = 0.0;
				if (!Number.isFinite(distortionPrevInput) || Math.abs(distortionPrevInput) < epsilon) distortionPrevInput = 0.0;
				if (!Number.isFinite(distortionNextOutput) || Math.abs(distortionNextOutput) < epsilon) distortionNextOutput = 0.0;
				
				instrumentState.distortionFractionalInput1 = distortionFractionalInput1;
				instrumentState.distortionFractionalInput2 = distortionFractionalInput2;
				instrumentState.distortionFractionalInput3 = distortionFractionalInput3;
				instrumentState.distortionPrevInput = distortionPrevInput;
				instrumentState.distortionNextOutput = distortionNextOutput;`
      }

      if (usesBitcrusher) {
        effectsSource += `
					
				if (Math.abs(bitcrusherPrevInput) < epsilon) bitcrusherPrevInput = 0.0;
				if (Math.abs(bitcrusherCurrentOutput) < epsilon) bitcrusherCurrentOutput = 0.0;
				instrumentState.bitcrusherPrevInput = bitcrusherPrevInput;
				instrumentState.bitcrusherCurrentOutput = bitcrusherCurrentOutput;
				instrumentState.bitcrusherPhase = bitcrusherPhase;`
      }

      if (usesEqFilter) {
        effectsSource += `
					
				synth.sanitizeFilters(filters);
				// The filter input here is downstream from another filter so we
				// better make sure it's safe too.
				if (!(initialFilterInput1 < 100) || !(initialFilterInput2 < 100)) {
					initialFilterInput1 = 0.0;
					initialFilterInput2 = 0.0;
				}
				if (Math.abs(initialFilterInput1) < epsilon) initialFilterInput1 = 0.0;
				if (Math.abs(initialFilterInput2) < epsilon) initialFilterInput2 = 0.0;
				instrumentState.initialEqFilterInput1 = initialFilterInput1;
				instrumentState.initialEqFilterInput2 = initialFilterInput2;`
      }

      if (usesPanning) {
        effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(panningDelayLine, panningDelayPos, panningMask);
				instrumentState.panningDelayPos = panningDelayPos;`
      }

      if (usesChorus) {
        effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineL, chorusDelayPos, chorusMask);
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineR, chorusDelayPos, chorusMask);
				instrumentState.chorusPhase = chorusPhase;
				instrumentState.chorusDelayPos = chorusDelayPos;`
      }

      if (usesEcho) {
        effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(echoDelayLineL, echoDelayPos, echoMask);
				beepbox.Synth.sanitizeDelayLine(echoDelayLineR, echoDelayPos, echoMask);
				instrumentState.echoDelayPos = echoDelayPos;
				
				if (!Number.isFinite(echoShelfSampleL) || Math.abs(echoShelfSampleL) < epsilon) echoShelfSampleL = 0.0;
				if (!Number.isFinite(echoShelfSampleR) || Math.abs(echoShelfSampleR) < epsilon) echoShelfSampleR = 0.0;
				if (!Number.isFinite(echoShelfPrevInputL) || Math.abs(echoShelfPrevInputL) < epsilon) echoShelfPrevInputL = 0.0;
				if (!Number.isFinite(echoShelfPrevInputR) || Math.abs(echoShelfPrevInputR) < epsilon) echoShelfPrevInputR = 0.0;
				instrumentState.echoShelfSampleL = echoShelfSampleL;
				instrumentState.echoShelfSampleR = echoShelfSampleR;
				instrumentState.echoShelfPrevInputL = echoShelfPrevInputL;
				instrumentState.echoShelfPrevInputR = echoShelfPrevInputR;`
      }

      if (usesReverb) {
        effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos        , reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  3041, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  6426, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos + 10907, reverbMask);
				instrumentState.reverbDelayPos  = reverbDelayPos;
				
				if (!Number.isFinite(reverbShelfSample0) || Math.abs(reverbShelfSample0) < epsilon) reverbShelfSample0 = 0.0;
				if (!Number.isFinite(reverbShelfSample1) || Math.abs(reverbShelfSample1) < epsilon) reverbShelfSample1 = 0.0;
				if (!Number.isFinite(reverbShelfSample2) || Math.abs(reverbShelfSample2) < epsilon) reverbShelfSample2 = 0.0;
				if (!Number.isFinite(reverbShelfSample3) || Math.abs(reverbShelfSample3) < epsilon) reverbShelfSample3 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput0) || Math.abs(reverbShelfPrevInput0) < epsilon) reverbShelfPrevInput0 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput1) || Math.abs(reverbShelfPrevInput1) < epsilon) reverbShelfPrevInput1 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput2) || Math.abs(reverbShelfPrevInput2) < epsilon) reverbShelfPrevInput2 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput3) || Math.abs(reverbShelfPrevInput3) < epsilon) reverbShelfPrevInput3 = 0.0;
				instrumentState.reverbShelfSample0 = reverbShelfSample0;
				instrumentState.reverbShelfSample1 = reverbShelfSample1;
				instrumentState.reverbShelfSample2 = reverbShelfSample2;
				instrumentState.reverbShelfSample3 = reverbShelfSample3;
				instrumentState.reverbShelfPrevInput0 = reverbShelfPrevInput0;
				instrumentState.reverbShelfPrevInput1 = reverbShelfPrevInput1;
				instrumentState.reverbShelfPrevInput2 = reverbShelfPrevInput2;
				instrumentState.reverbShelfPrevInput3 = reverbShelfPrevInput3;`
      }

      //console.log(effectsSource);
      effectsFunction = new Function(
        'synth',
        'outputDataL',
        'outputDataR',
        'bufferIndex',
        'runLength',
        'instrument',
        'instrumentState',
        effectsSource,
      )
      Synth.effectsFunctionCache[signature] = effectsFunction
    }

    effectsFunction(
      synth,
      outputDataL,
      outputDataR,
      bufferIndex,
      runLength,
      instrument,
      instrumentState,
    )
  }

  private static pulseWidthSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!

    let phaseDelta: number = tone.phaseDeltas[0]
    const phaseDeltaScale: number = +tone.phaseDeltaScales[0]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]
    let phase: number = tone.phases[0] % 1

    let pulseWidth: number = tone.pulseWidth
    const pulseWidthDelta: number = tone.pulseWidthDelta

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      const sawPhaseA: number = phase % 1
      const sawPhaseB: number = (phase + pulseWidth) % 1

      let pulseWave: number = sawPhaseB - sawPhaseA

      // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing.
      if (sawPhaseA < phaseDelta) {
        var t = sawPhaseA / phaseDelta
        pulseWave += (t + t - t * t - 1) * 0.5
      } else if (sawPhaseA > 1.0 - phaseDelta) {
        var t = (sawPhaseA - 1.0) / phaseDelta
        pulseWave += (t + t + t * t + 1) * 0.5
      }
      if (sawPhaseB < phaseDelta) {
        var t = sawPhaseB / phaseDelta
        pulseWave -= (t + t - t * t - 1) * 0.5
      } else if (sawPhaseB > 1.0 - phaseDelta) {
        var t = (sawPhaseB - 1.0) / phaseDelta
        pulseWave -= (t + t + t * t + 1) * 0.5
      }

      const inputSample: number = pulseWave
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phase += phaseDelta
      phaseDelta *= phaseDeltaScale
      pulseWidth += pulseWidthDelta

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phase

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static fmSourceTemplate: string[] = (
    `
		const data = synth.tempMonoInstrumentSampleBuffer;
		const sineWave = beepbox.Config.sineWave;
		
		// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
		let operator#Phase       = +((tone.phases[#] % 1) + 1000) * beepbox.Config.sineWaveLength;
		let operator#PhaseDelta  = +tone.phaseDeltas[#];
		let operator#PhaseDeltaScale = +tone.phaseDeltaScales[#];
		let operator#OutputMult  = +tone.expressionStarts[#];
		const operator#OutputDelta = +tone.expressionDeltas[#];
		let operator#Output      = +tone.feedbackOutputs[#];
		let feedbackMult         = +tone.feedbackMult;
		const feedbackDelta      = +tone.feedbackDelta;
		
		const filters = tone.noteFilters;
		const filterCount = tone.noteFilterCount|0;
		let initialFilterInput1 = +tone.initialNoteFilterInput1;
		let initialFilterInput2 = +tone.initialNoteFilterInput2;
		const applyFilters = beepbox.Synth.applyFilters;
		
		const stopIndex = bufferIndex + runLength;
		for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
			// INSERT OPERATOR COMPUTATION HERE
			const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
			
			const inputSample = fmOutput;
			const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
			initialFilterInput2 = initialFilterInput1;
			initialFilterInput1 = inputSample;
			
			feedbackMult += feedbackDelta;
			operator#OutputMult += operator#OutputDelta;
			operator#Phase += operator#PhaseDelta;
			operator#PhaseDelta *= operator#PhaseDeltaScale;
			
			data[sampleIndex] += sample;
		}
		
		tone.phases[#] = operator#Phase / ` +
    Config.sineWaveLength +
    `;
		tone.feedbackOutputs[#] = operator#Output;
		
		synth.sanitizeFilters(filters);
		tone.initialNoteFilterInput1 = initialFilterInput1;
		tone.initialNoteFilterInput2 = initialFilterInput2;
	`
  ).split('\n')

  private static operatorSourceTemplate: string[] = (
    `
			const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
			const operator#PhaseInt = operator#PhaseMix|0;
			const operator#Index    = operator#PhaseInt & ` +
    Config.sineWaveMask +
    `;
			const operator#Sample   = sineWave[operator#Index];
			operator#Output         = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
			const operator#Scaled   = operator#OutputMult * operator#Output;
	`
  ).split('\n')

  private static noiseSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!
    const wave: Float32Array = instrument.getDrumWave()
    let phaseDelta: number = +tone.phaseDeltas[0]
    const phaseDeltaScale: number = +tone.phaseDeltaScales[0]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]
    let phase: number = (tone.phases[0] % 1) * Config.chipNoiseLength
    if (tone.phases[0] == 0) {
      // Zero phase means the tone was reset, just give noise a random start phase instead.
      phase = Math.random() * Config.chipNoiseLength
    }
    const phaseMask: number = Config.chipNoiseLength - 1
    let noiseSample: number = +tone.sample

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    // This is for a "legacy" style simplified 1st order lowpass filter with
    // a cutoff frequency that is relative to the tone's fundamental frequency.
    const pitchRelativefilter: number = Math.min(
      1.0,
      tone.phaseDeltas[0] *
        Config.chipNoises[instrument.chipNoise].pitchFilterMult,
    )

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      const waveSample: number = wave[phase & phaseMask]

      noiseSample += (waveSample - noiseSample) * pitchRelativefilter

      const inputSample: number = noiseSample
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phase += phaseDelta
      phaseDelta *= phaseDeltaScale

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phase / Config.chipNoiseLength
    tone.sample = noiseSample

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static spectrumSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!
    const wave: Float32Array = instrument.getDrumWave()
    let phaseDelta: number = tone.phaseDeltas[0] * (1 << 7)
    const phaseDeltaScale: number = +tone.phaseDeltaScales[0]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]
    let noiseSample: number = +tone.sample

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    let phase: number = (tone.phases[0] % 1) * Config.spectrumNoiseLength
    // Zero phase means the tone was reset, just give noise a random start phase instead.
    if (tone.phases[0] == 0)
      phase =
        Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) +
        phaseDelta
    const phaseMask: number = Config.spectrumNoiseLength - 1

    // This is for a "legacy" style simplified 1st order lowpass filter with
    // a cutoff frequency that is relative to the tone's fundamental frequency.
    const pitchRelativefilter: number = Math.min(1.0, phaseDelta)

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      const phaseInt: number = phase | 0
      const index: number = phaseInt & phaseMask
      let waveSample: number = wave[index]
      const phaseRatio: number = phase - phaseInt
      waveSample += (wave[index + 1] - waveSample) * phaseRatio

      noiseSample += (waveSample - noiseSample) * pitchRelativefilter

      const inputSample: number = noiseSample
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phase += phaseDelta
      phaseDelta *= phaseDeltaScale

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phase / Config.spectrumNoiseLength
    tone.sample = noiseSample

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static drumsetSynth(
    synth: Synth,
    bufferIndex: number,
    runLength: number,
    tone: Tone,
    instrument: Instrument,
  ): void {
    const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!
    const wave: Float32Array = instrument.getDrumsetWave(tone.drumsetPitch!)
    let phaseDelta: number =
      tone.phaseDeltas[0] /
      Instrument.drumsetIndexReferenceDelta(tone.drumsetPitch!)
    const phaseDeltaScale: number = +tone.phaseDeltaScales[0]
    let expression: number = +tone.expressionStarts[0]
    const expressionDelta: number = +tone.expressionDeltas[0]

    const filters: DynamicBiquadFilter[] = tone.noteFilters
    const filterCount: number = tone.noteFilterCount | 0
    let initialFilterInput1: number = +tone.initialNoteFilterInput1
    let initialFilterInput2: number = +tone.initialNoteFilterInput2
    const applyFilters: Function = Synth.applyFilters

    let phase: number = (tone.phases[0] % 1) * Config.spectrumNoiseLength
    // Zero phase means the tone was reset, just give noise a random start phase instead.
    if (tone.phases[0] == 0)
      phase =
        Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) +
        phaseDelta
    const phaseMask: number = Config.spectrumNoiseLength - 1

    const stopIndex: number = bufferIndex + runLength
    for (
      let sampleIndex: number = bufferIndex;
      sampleIndex < stopIndex;
      sampleIndex++
    ) {
      const phaseInt: number = phase | 0
      const index: number = phaseInt & phaseMask
      let noiseSample: number = wave[index]
      const phaseRatio: number = phase - phaseInt
      noiseSample += (wave[index + 1] - noiseSample) * phaseRatio

      const inputSample: number = noiseSample
      const sample: number = applyFilters(
        inputSample,
        initialFilterInput1,
        initialFilterInput2,
        filterCount,
        filters,
      )
      initialFilterInput2 = initialFilterInput1
      initialFilterInput1 = inputSample

      phase += phaseDelta
      phaseDelta *= phaseDeltaScale

      const output: number = sample * expression
      expression += expressionDelta

      data[sampleIndex] += output
    }

    tone.phases[0] = phase / Config.spectrumNoiseLength

    synth.sanitizeFilters(filters)
    tone.initialNoteFilterInput1 = initialFilterInput1
    tone.initialNoteFilterInput2 = initialFilterInput2
  }

  private static findRandomZeroCrossing(
    wave: Float32Array,
    waveLength: number,
  ): number {
    let phase: number = Math.random() * waveLength
    const phaseMask: number = waveLength - 1

    // Spectrum and drumset waves sounds best when they start at a zero crossing,
    // otherwise they pop. Try to find a zero crossing.
    let indexPrev: number = phase & phaseMask
    let wavePrev: number = wave[indexPrev]
    const stride = 16
    for (
      let attemptsRemaining = 128;
      attemptsRemaining > 0;
      attemptsRemaining--
    ) {
      const indexNext: number = (indexPrev + stride) & phaseMask
      const waveNext: number = wave[indexNext]
      if (wavePrev * waveNext <= 0.0) {
        // Found a zero crossing! Now let's narrow it down to two adjacent sample indices.
        for (let i = 0; i < stride; i++) {
          const innerIndexNext: number = (indexPrev + 1) & phaseMask
          const innerWaveNext: number = wave[innerIndexNext]
          if (wavePrev * innerWaveNext <= 0.0) {
            // Found the zero crossing again! Now let's find the exact intersection.
            const slope: number = innerWaveNext - wavePrev
            phase = indexPrev
            if (Math.abs(slope) > 0.00000001) {
              phase += -wavePrev / slope
            }
            phase = Math.max(0, phase) % waveLength
            break
          } else {
            indexPrev = innerIndexNext
            wavePrev = innerWaveNext
          }
        }
        break
      } else {
        indexPrev = indexNext
        wavePrev = waveNext
      }
    }

    return phase
  }

  public static instrumentVolumeToVolumeMult(instrumentVolume: number): number {
    return instrumentVolume == Config.volumeRange - 1
      ? 0.0
      : Math.pow(2, Config.volumeLogScale * instrumentVolume)
  }
  public static volumeMultToInstrumentVolume(volumeMult: number): number {
    return volumeMult <= 0.0
      ? Config.volumeRange - 1
      : Math.min(
          Config.volumeRange - 2,
          Math.log2(volumeMult) / Config.volumeLogScale,
        )
  }
  public static noteSizeToVolumeMult(size: number): number {
    return Math.pow(Math.max(0.0, size) / Config.noteSizeMax, 1.5)
  }
  public static volumeMultToNoteSize(volumeMult: number): number {
    return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * Config.noteSizeMax
  }

  public static fadeInSettingToSeconds(setting: number): number {
    return 0.0125 * (0.95 * setting + 0.05 * setting * setting)
  }
  public static secondsToFadeInSetting(seconds: number): number {
    return clamp(
      0,
      Config.fadeInRange,
      Math.round((-0.95 + Math.sqrt(0.9025 + (0.2 * seconds) / 0.0125)) / 0.1),
    )
  }
  public static fadeOutSettingToTicks(setting: number): number {
    return Config.fadeOutTicks[setting]
  }
  public static ticksToFadeOutSetting(ticks: number): number {
    let lower: number = Config.fadeOutTicks[0]
    if (ticks <= lower) return 0
    for (let i = 1; i < Config.fadeOutTicks.length; i++) {
      const upper: number = Config.fadeOutTicks[i]
      if (ticks <= upper) return ticks < (lower + upper) / 2 ? i - 1 : i
      lower = upper
    }
    return Config.fadeOutTicks.length - 1
  }

  public static detuneToCents(detune: number): number {
    return (detune * (Math.abs(detune) + 1)) / 2
  }
  public static centsToDetune(cents: number): number {
    return (Math.sign(cents) * (Math.sqrt(1 + 8 * Math.abs(cents)) - 1)) / 2.0
  }

  private getSamplesPerTick(): number {
    if (this.song == null) return 0
    const beatsPerMinute: number = this.song.getBeatsPerMinute()
    const beatsPerSecond: number = beatsPerMinute / 60.0
    const partsPerSecond: number = Config.partsPerBeat * beatsPerSecond
    const tickPerSecond: number = Config.ticksPerPart * partsPerSecond
    return this.samplesPerSecond / tickPerSecond
  }

  public static fittingPowerOfTwo(x: number): number {
    return 1 << (32 - Math.clz32(Math.ceil(x) - 1))
  }

  private sanitizeFilters(filters: DynamicBiquadFilter[]): void {
    let reset = false
    for (const filter of filters) {
      const output1: number = Math.abs(filter.output1)
      const output2: number = Math.abs(filter.output2)
      // If either is a large value, Infinity, or NaN, then just reset all filter history.
      if (!(output1 < 100) || !(output2 < 100)) {
        reset = true
        break
      }
      if (output1 < epsilon) filter.output1 = 0.0
      if (output2 < epsilon) filter.output2 = 0.0
    }
    if (reset) {
      for (const filter of filters) {
        filter.output1 = 0.0
        filter.output2 = 0.0
      }
    }
  }

  public static sanitizeDelayLine(
    delayLine: Float32Array,
    lastIndex: number,
    mask: number,
  ): void {
    while (true) {
      lastIndex--
      const index: number = lastIndex & mask
      const sample: number = Math.abs(delayLine[index])
      if (Number.isFinite(sample) && (sample == 0.0 || sample >= epsilon)) break
      delayLine[index] = 0.0
    }
  }

  public static applyFilters(
    sample: number,
    input1: number,
    input2: number,
    filterCount: number,
    filters: DynamicBiquadFilter[],
  ): number {
    for (let i = 0; i < filterCount; i++) {
      const filter: DynamicBiquadFilter = filters[i]
      const output1: number = filter.output1
      const output2: number = filter.output2
      const a1: number = filter.a1
      const a2: number = filter.a2
      const b0: number = filter.b0
      const b1: number = filter.b1
      const b2: number = filter.b2
      sample =
        b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2
      filter.a1 = a1 + filter.a1Delta
      filter.a2 = a2 + filter.a2Delta
      filter.b0 = b0 + filter.b0Delta
      filter.b1 = b1 + filter.b1Delta
      filter.b2 = b2 + filter.b2Delta
      filter.output2 = output1
      filter.output1 = sample
      // Updating the input values is waste if the next filter doesn't exist...
      input2 = output2
      input1 = output1
    }
    return sample
  }
}

// When compiling synth.ts as a standalone module named "beepbox", expose these imported classes as members to JavaScript:
export {
  Dictionary,
  DictionaryArray,
  FilterType,
  EnvelopeType,
  InstrumentType,
  Transition,
  Chord,
  Envelope,
  Config,
}
