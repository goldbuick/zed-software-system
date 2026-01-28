import { InferenceSession, Tensor, env } from 'onnxruntime-web'

import { cachedfetch } from './modelcache'
import { phonemize } from './phonemizerparser'
import { RawAudio, normalizePeak, trimSilence } from './utils'

// KittenTTS class for local model
export class KittenTTS {
  voices: { id: string; name: string }[]
  session: InferenceSession | null
  voiceEmbeddings: Record<string, any>
  wasmSession: InferenceSession | null
  tokenizer: any
  vocab: any
  vocabArray: string[]
  static model_path =
    'https://huggingface.co/onnx-community/kitten-tts-nano-0.1-ONNX/resolve/main/onnx/model_quantized.onnx'
  static voices_path = '/tts-model/voices_kitten.json'
  static tokenizer_path = '/tts-model/tokenizer.json'
  result_audio: {
    text: any
    audio: RawAudio
  }[] = []

  constructor(
    voices: { id: string; name: string }[] | undefined,
    session: InferenceSession | null,
    voiceEmbeddings: Record<string, any> | undefined,
  ) {
    this.voices = voices ?? []
    this.session = session
    this.voiceEmbeddings = voiceEmbeddings ?? {}
    this.wasmSession = null // Fallback WASM session\
    this.vocab = {}
    this.vocabArray = []
  }

  static async from_pretrained(
    model_path?: string,
    voices_path?: string,
    tokenizer_path?: string,
    options: {
      device?: 'webgpu' | 'wasm'
    } = {},
  ) {
    try {
      // Import ONNX Runtime Web and caching utility
      model_path ??= KittenTTS.model_path
      voices_path ??= KittenTTS.voices_path
      tokenizer_path ??= KittenTTS.tokenizer_path

      // Use local files in public directory with threading enabled
      env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/`

      // Load model using cached fetch
      const modelResponse = await cachedfetch(model_path)
      const modelBuffer = await modelResponse.bytes()

      // Try WebGPU with better configuration, fallback to WASM
      let session: InferenceSession | null = null
      try {
        if (options.device === 'webgpu') {
          // Try WebGPU with specific settings for better compatibility
          session = await InferenceSession.create(modelBuffer, {
            executionProviders: [
              {
                name: 'webgpu',
                preferredLayout: 'NCHW',
                // Try to improve precision for better audio quality
              },
              'wasm', // Keep WASM as fallback
              'cuda',
              'cpu',
            ],
            // Global session options that might help with precision
            enableProfiling: true,
          })
        } else {
          throw new Error('Using WASM as requested')
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (webgpuError) {
        // Fallback to WASM with explicit configuration

        session = await InferenceSession.create(modelBuffer, {
          executionProviders: [
            {
              name: 'wasm',
            },
            'cuda',
            'cpu',
          ],
        })
      }

      // Load voices from the local voices.json file (also cached)
      const voicesResponse = await cachedfetch(this.voices_path)
      const voicesData = await voicesResponse.json()

      // Transform the voices data into the format we need
      const voices = Object.keys(voicesData).map((key) => ({
        id: key,
        name: key
          .replace('expr-', '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .replace('M', 'Male')
          .replace('F', 'Female'),
      }))

      return new KittenTTS(voices, session, voicesData)
    } catch (error) {
      console.error('Error loading local model:', error)
      // Fallback to default voices without model
      return new KittenTTS([], null, {})
    }
  }

  // Load the tokenizer
  async loadTokenizer() {
    if (!this.tokenizer) {
      try {
        const response = await cachedfetch(KittenTTS.tokenizer_path)
        const tokenizerData = await response.json()

        // Extract the actual vocabulary from the tokenizer
        this.vocab = tokenizerData.model.vocab
        this.vocabArray = []

        // Create reverse mapping
        for (const [char, id] of Object.entries(this.vocab)) {
          this.vocabArray[id as number] = char
        }

        this.tokenizer = tokenizerData
      } catch (error) {
        console.error('Error loading tokenizer:', error)
        this.vocab = {}
        this.vocabArray = []
      }
    }
  }

  // Convert text to phonemes using the phonemizer package
  async textToPhonemes(text: any) {
    const phonemes = await phonemize(text, 'en-us')
    return phonemes
  }

  // Tokenize text using the loaded tokenizer
  async tokenizeText(text: any) {
    await this.loadTokenizer()

    const phonemes = await this.textToPhonemes(text)
    const tokensWithBoundaries = `$${phonemes.join(',')}$`

    // Convert to token IDs
    const tokens = tokensWithBoundaries.split('').map((char) => {
      const tokenId = this.vocab[char]
      if (tokenId === undefined) {
        console.warn(`Unknown character: "${char}", using $ token`)
        return 0 // Use $ token for unknown chars
      }
      return tokenId
    })

    return tokens
  }

  async *stream(
    textStreamer: any,
    options: { voice?: string; speed?: number } = {},
  ) {
    const { voice = 'expr-voice-2-m', speed = 1.0 } = options

    // Process the text stream
    for await (const text of textStreamer) {
      if (text.trim()) {
        try {
          if (this.session && this.voiceEmbeddings[voice]) {
            try {
              const tokenIds = await this.tokenizeText(text)
              const inputIds = new BigInt64Array(
                tokenIds.map((id) => BigInt(id)),
              )
              const speakerEmbedding = new Float32Array(
                this.voiceEmbeddings[voice][0],
              )
              const inputs = {
                input_ids: new Tensor('int64', inputIds, [1, inputIds.length]),
                style: new Tensor('float32', speakerEmbedding, [
                  1,
                  speakerEmbedding.length,
                ]),
                speed: new Tensor('float32', new Float32Array([speed]), [1]),
              }

              let results = await this.session.run(inputs)

              // Extract audio data - we know it's called 'waveform'
              let audioOutput = results.waveform
              let audioData = audioOutput.data

              // Check if WebGPU produced NaN values and fallback to WASM
              if (audioData.length > 0 && isNaN(Number(audioData[0]))) {
                // Create WASM session if we don't have one
                this.wasmSession ??= await InferenceSession.create(
                  KittenTTS.model_path,
                  {
                    executionProviders: ['wasm'],
                  },
                )

                // Retry inference with WASM
                if (this.wasmSession == null)
                  throw new Error('WASM session not created')
                results = await this.wasmSession.run(inputs)
                audioOutput = results.waveform
                audioData = audioOutput.data
              }

              // Use the correct sample rate based on our calculation
              const sampleRate = 24000 // Model generates 24kHz audio

              // Find min/max without causing stack overflow
              let min = audioData[0],
                max = audioData[0]
              for (let i = 1; i < audioData.length; i++) {
                if (audioData[i] < min) min = audioData[i]
                if (audioData[i] > max) max = audioData[i]
              }

              // Apply speed adjustment
              let finalAudioData = new Float32Array(
                Array.from(audioData as ArrayLike<number>),
              )
              if (speed !== 1.0) {
                // Simple time-stretching by resampling
                const newLength = Math.floor(audioData.length / speed)
                finalAudioData = new Float32Array(newLength)
                for (let i = 0; i < newLength; i++) {
                  const srcIndex = Math.floor(i * speed)
                  finalAudioData[i] = Number(
                    audioData[Math.min(srcIndex, audioData.length - 1)],
                  )
                }
              }

              // Clean up NaN values and normalize
              let maxAmplitude = 0
              for (let i = 0; i < finalAudioData.length; i++) {
                if (isNaN(finalAudioData[i])) {
                  finalAudioData[i] = 0 // Replace NaN with silence
                } else {
                  maxAmplitude = Math.max(
                    maxAmplitude,
                    Math.abs(finalAudioData[i]),
                  )
                }
              }

              // Normalize audio if it's too quiet
              if (maxAmplitude > 0 && maxAmplitude < 0.1) {
                const normalizationFactor = 0.5 / maxAmplitude

                for (let i = 0; i < finalAudioData.length; i++) {
                  finalAudioData[i] *= normalizationFactor
                }
              }

              const result = {
                text,
                audio: new RawAudio(finalAudioData, sampleRate),
              }
              this.result_audio.push(result)

              yield result
            } catch (modelError) {
              console.error('Model inference error:', modelError)
              if (
                typeof modelError === 'object' &&
                modelError !== null &&
                'message' in modelError
              ) {
                console.error(
                  'Error details:',
                  (modelError as { message?: string }).message,
                )
              }
            }
          }
        } catch (error) {
          console.error('Error generating audio:', error)
          // Yield silence in case of error
          yield {
            text,
            audio: new RawAudio(new Float32Array(22050), 22050),
          }
        }
      }
    }
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
