import { InferenceSession, Tensor, env } from 'onnxruntime-web'

import { cachedFetch } from './modelcache'
import { phonemize } from './phonemizerparser'
import { RawAudio, normalizePeak, trimSilence } from './utils'

// Piper TTS class for local model
export class PiperTTS {
  voiceConfig: any
  session: InferenceSession | null
  phonemeIdMap: null
  result_audio: { audio: RawAudio; text: string }[] = []
  static modelPath = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx`
  static configPath = `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json`
  constructor(voiceConfig: null, session: InferenceSession | null) {
    this.voiceConfig = voiceConfig
    this.session = session
    this.phonemeIdMap = null
  }

  static async from_pretrained(modelPath?: string, configPath?: string) {
    try {
      // Import ONNX Runtime Web and caching utility
      modelPath ??= this.modelPath
      configPath ??= this.configPath

      // Use local files in public directory with threading enabled
      env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/`

      // Load model and config
      const [modelResponse, configResponse] = await Promise.all([
        cachedFetch(modelPath),
        cachedFetch(configPath),
      ])

      const [modelBuffer, voiceConfig] = await Promise.all([
        modelResponse.bytes(),
        configResponse.json(),
      ])

      // Create ONNX session with WASM execution provider
      const session = await InferenceSession.create(modelBuffer, {
        executionProviders: [
          {
            name: 'wasm',
          },
          'cuda',
          'cpu',
        ],
      })

      return new PiperTTS(voiceConfig, session)
    } catch (error) {
      console.error('Error loading Piper model:', error)
      throw error
    }
  }

  // Convert                                                                                                                                                           to phonemes using the phonemizer package
  async textToPhonemes(text: string) {
    if (this.voiceConfig.phoneme_type === 'text') {
      // Text phonemes - just return normalized characters
      return [Array.from(text.normalize('NFD'))]
    }

    // Use phonemizer for espeak-style phonemes
    const voice = this.voiceConfig.espeak?.voice ?? 'en-us'
    const phonemes = await phonemize(text, voice)

    // Handle different return types from phonemizer
    let phonemeText
    if (typeof phonemes === 'string') {
      phonemeText = phonemes
    } else if (Array.isArray(phonemes)) {
      // Join the array elements - each element is a phonemized sentence
      phonemeText = phonemes.join(' ')
    } else if (
      phonemes &&
      typeof phonemes === 'object' &&
      !Array.isArray(phonemes)
    ) {
      // If it's an object, try to extract text or phonemes property
      if ('text' in phonemes) {
        phonemeText = (phonemes as { text: string }).text
      } else if ('phonemes' in phonemes) {
        phonemeText = (phonemes as { phonemes: string }).phonemes
      } else {
        phonemeText = String(phonemes)
      }
    } else {
      console.warn('Unexpected phonemes format:', phonemes)
      phonemeText = String(phonemes || text)
    }

    // Split into sentences and convert to character arrays
    const sentences = phonemeText
      .split(/[.!?]+/)
      .filter((s: string) => s.trim())
    return sentences.map((sentence: string) =>
      Array.from(sentence.trim().normalize('NFD')),
    )
  }

  // Convert phonemes to IDs using the phoneme ID map
  phonemesToIds(textPhonemes: any) {
    if (!this.voiceConfig?.phoneme_id_map) {
      throw new Error('Phoneme ID map not available')
    }

    const idMap = this.voiceConfig.phoneme_id_map
    const BOS = '^'
    const EOS = '$'
    const PAD = '_'

    const phonemeIds = []

    for (const sentencePhonemes of textPhonemes) {
      phonemeIds.push(idMap[BOS])
      phonemeIds.push(idMap[PAD])

      for (const phoneme of sentencePhonemes) {
        if (phoneme in idMap) {
          phonemeIds.push(idMap[phoneme])
          phonemeIds.push(idMap[PAD])
        }
      }

      phonemeIds.push(idMap[EOS])
    }

    return phonemeIds
  }

  async *stream(
    textStreamer: any,
    options: {
      speakerId?: number
      lengthScale?: number
      noiseScale?: number
      noiseWScale?: number
    } = {
      speakerId: 0,
      lengthScale: 1.0,
      noiseScale: 0.667,
      noiseWScale: 0.8,
    },
  ) {
    const {
      speakerId = 0,
      lengthScale = 1.0,
      noiseScale = 0.667,
      noiseWScale = 0.8,
    } = options

    // Process the text stream
    for await (const text of textStreamer) {
      if (text.trim()) {
        try {
          if (this.session && this.voiceConfig) {
            // Convert text to phonemes then to IDs
            const textPhonemes = await this.textToPhonemes(text)
            const phonemeIds = this.phonemesToIds(textPhonemes)

            // Prepare tensors for Piper model
            const inputs: Record<string, any> = {
              input: new Tensor(
                'int64',
                new BigInt64Array(phonemeIds.map((id) => BigInt(id))),
                [1, phonemeIds.length],
              ),
              input_lengths: new Tensor(
                'int64',
                BigInt64Array.from([BigInt(phonemeIds.length)]),
                [1],
              ),
              scales: new Tensor(
                'float32',
                Float32Array.from([noiseScale, lengthScale, noiseWScale]),
                [3],
              ),
            }

            // Add speaker ID for multi-speaker models
            if (this.voiceConfig.num_speakers > 1) {
              inputs.sid = new Tensor(
                'int64',
                BigInt64Array.from([BigInt(speakerId)]),
                [1],
              )
            }

            const results = await this.session.run(inputs)

            // Extract audio data
            const audioOutput = results.output
            const audioData = audioOutput.data

            // Use the sample rate from config
            const sampleRate = this.voiceConfig.audio.sample_rate

            // Clean up audio data

            const finalAudioData = new Float32Array(
              Array.from(audioData as Float32Array),
            )
            const result = {
              text,
              audio: new RawAudio(finalAudioData, sampleRate),
            }

            this.result_audio.push(result)
            yield result
          }
        } catch (error) {
          console.error('Error generating audio:', error)
          // Yield silence in case of error
          const result = {
            text,
            audio: new RawAudio(new Float32Array(22050), 22050),
          }
          this.result_audio.push(result)
          yield result
        }
      }
    }
  }

  // Get available speakers for multi-speaker models
  getSpeakers() {
    if (!this.voiceConfig || this.voiceConfig.num_speakers <= 1) {
      return [{ id: 0, name: 'Voice 1' }]
    }

    const speakerIdMap = this.voiceConfig.speaker_id_map ?? {}
    return Object.entries(speakerIdMap)
      .sort(([, a], [, b]) => Number(a) - Number(b)) // Sort by speaker ID (0, 1, 2, ...)
      .map(([originalId, id]) => ({
        id,
        name: `Voice ${Number(id) + 1}`,
        originalId,
      }))
  }
  merge_audio() {
    let audio: RawAudio | null = null
    if (this.result_audio.length > 0) {
      try {
        const originalSamplingRate = this.result_audio[0].audio.sampling_rate
        const length = this.result_audio.reduce(
          (sum, chunk) => sum + chunk.audio.length,
          0,
        )
        let waveform = new Float32Array(length)
        let offset = 0
        for (const { audio } of this.result_audio) {
          waveform.set(audio.audio, offset)
          offset += audio.length
        }

        // Normalize peaks & trim silence
        normalizePeak(waveform, 0.9)
        waveform = trimSilence(
          waveform,
          0.002,
          Math.floor(originalSamplingRate * 0.02),
        ) // 20ms padding

        // Create a new merged RawAudio with the original sample rate
        audio = new RawAudio(waveform, originalSamplingRate)

        return audio
      } catch (error) {
        console.error('Error processing audio chunks:', error)
        return null
      }
    }
  }

  async close() {
    if (this.session) {
      await this.session.release()
      this.session = null
    }
  }

  getAudio() {
    return this.result_audio
  }
  clearAudio() {
    this.result_audio = []
  }
}
