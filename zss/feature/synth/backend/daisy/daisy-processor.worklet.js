/**
 * ZSS DaisySP AudioWorklet source — bundled with zss_daisy.js as a classic script
 * (no ES module imports; Firefox-compatible like maximilian maxi-processor.js).
 */

const DAISY_VOICES_LEN = 48
const DAISY_DRUMS_LEN = 20
const DAISY_MASTER_LEN = 3
const DAISY_FX_LEN = 108
const DAISY_VOICE_CFG_LEN = 48
const DAISY_OSC_CFG_LEN = 168
const DAISY_ALGO_CFG_LEN = 208
const DAISY_VIBRATO_LEN = 13

const DAISY_SAB_CHANNEL_OFFSET = {
  zss_voices: 0,
  zss_drums: DAISY_VOICES_LEN,
  zss_master: DAISY_VOICES_LEN + DAISY_DRUMS_LEN,
  zss_fx: DAISY_VOICES_LEN + DAISY_DRUMS_LEN + DAISY_MASTER_LEN,
  zss_voicecfg:
    DAISY_VOICES_LEN + DAISY_DRUMS_LEN + DAISY_MASTER_LEN + DAISY_FX_LEN,
  zss_osccfg:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MASTER_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN,
  zss_algocfg:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MASTER_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN +
    DAISY_OSC_CFG_LEN,
  zss_vibrato:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MASTER_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN +
    DAISY_OSC_CFG_LEN +
    DAISY_ALGO_CFG_LEN,
}

const DAISY_SAB_CHANNEL_LEN = {
  zss_voices: DAISY_VOICES_LEN,
  zss_drums: DAISY_DRUMS_LEN,
  zss_master: DAISY_MASTER_LEN,
  zss_fx: DAISY_FX_LEN,
  zss_voicecfg: DAISY_VOICE_CFG_LEN,
  zss_osccfg: DAISY_OSC_CFG_LEN,
  zss_algocfg: DAISY_ALGO_CFG_LEN,
  zss_vibrato: DAISY_VIBRATO_LEN,
}

const DAISY_EM_INIT_TIMEOUT_SEC = 5

function postdspstage(port, stage) {
  port.postMessage({ zss_dsp_stage: stage })
}

class DaisyProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.sabviews = []
    this.controlview = null
    this.outptr = 0
    this.ready = false
    this.bootstarted = false
    this.pendingwasmbytes = null
    this.eminitstartframe = null
    this.eminiterrposted = false
    const optbytes = options?.processorOptions?.wasmbytes
    if (optbytes) {
      this.pendingwasmbytes = optbytes
      // #region agent log
      this.port.postMessage({
        zss_dsp_stage: 'processor_options_wasm',
        zss_debug: { bytelen: optbytes.byteLength ?? 0 },
      })
      // #endregion
    }
    this.port.onmessage = (event) => this.onmessage(event)
    // #region agent log
    this.port.postMessage({ zss_dsp_stage: 'constructor' })
    // #endregion
  }

  bootwasm(wasmbytes) {
    // #region agent log
    this.port.postMessage({
      zss_dsp_stage: 'bootwasm_enter',
      zss_debug: {
        bootstarted: this.bootstarted,
        hasbytes: !!wasmbytes,
        bytelen: wasmbytes?.byteLength ?? 0,
      },
    })
    // #endregion
    if (this.bootstarted) {
      return
    }
    this.bootstarted = true
    this.eminitstartframe = currentFrame

    if (!wasmbytes) {
      this.port.postMessage({
        zss_dsp_error: 'missing wasm bytes for daisy boot',
      })
      return
    }

    const port = this.port
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const processor = this
    let wasmmodule
    try {
      wasmmodule = new WebAssembly.Module(wasmbytes)
    } catch (err) {
      port.postMessage({ zss_dsp_error: String(err) })
      return
    }
    postdspstage(port, 'module_compiled')

    const wasmbin =
      wasmbytes instanceof ArrayBuffer ? new Uint8Array(wasmbytes) : wasmbytes

    const modcfg = {
      wasmBinary: wasmbin,
      instantiateWasm: (imports, receiveinstance) => {
        try {
          const instance = new WebAssembly.Instance(wasmmodule, imports)
          receiveinstance(instance, wasmmodule)
        } catch (err) {
          port.postMessage({ zss_dsp_error: String(err) })
          throw err
        }
        return {}
      },
      onRuntimeInitialized() {
        try {
          postdspstage(port, 'runtime_init')
          const ptr = modcfg._zss_control_ptr()
          const len = modcfg._zss_control_len()
          const base = ptr >> 3
          processor.controlview = modcfg.HEAPF64.subarray(base, base + len)
          modcfg._zss_init(sampleRate)
          processor.outptr = modcfg._malloc(128 * 4)
          processor.wasm = modcfg
          processor.ready = true
          processor.eminitstartframe = null
          postdspstage(port, 'ready')
          port.postMessage({ zss_dsp_ready: 1 })
        } catch (err) {
          port.postMessage({ zss_dsp_error: String(err) })
        }
      },
    }

    postdspstage(port, 'emscripten_start')

    ZssDaisy(modcfg).catch((err) => {
      port.postMessage({ zss_dsp_error: String(err) })
    })
  }

  checkeminitdeadline() {
    if (
      this.ready ||
      !this.bootstarted ||
      this.eminitstartframe === null ||
      this.eminiterrposted
    ) {
      return
    }
    const elapsed = (currentFrame - this.eminitstartframe) / sampleRate
    if (elapsed >= DAISY_EM_INIT_TIMEOUT_SEC) {
      this.eminiterrposted = true
      this.port.postMessage({
        zss_dsp_error: 'daisy emscripten init timed out',
      })
    }
  }

  onmessage(event) {
    const data = event.data
    // #region agent log
    if (data?.zss_boot) {
      this.port.postMessage({
        zss_dsp_stage: 'onmessage_zss_boot',
        zss_debug: {
          hasbytes: !!data.wasmbytes,
          bytelen: data.wasmbytes?.byteLength ?? 0,
        },
      })
    }
    // #endregion
    if (data?.zss_boot) {
      const wasmbytes = data.wasmbytes ?? this.pendingwasmbytes
      this.pendingwasmbytes = wasmbytes
      this.bootwasm(wasmbytes)
      return
    }
    if (data?.zss_sab_register && data.channelID && data.sab && data.length) {
      const offset = DAISY_SAB_CHANNEL_OFFSET[data.channelID]
      const expected = DAISY_SAB_CHANNEL_LEN[data.channelID]
      if (offset === undefined || expected === undefined) {
        return
      }
      const view = new Float64Array(data.sab, 0, data.length)
      this.sabviews.push({ view, offset, length: expected })
      return
    }
    if (data?.zss_sab_push && data.channelID && data.data) {
      const offset = DAISY_SAB_CHANNEL_OFFSET[data.channelID]
      const expected = DAISY_SAB_CHANNEL_LEN[data.channelID]
      if (offset === undefined || !this.controlview) {
        return
      }
      const len = Math.min(data.data.length, expected ?? data.data.length)
      for (let i = 0; i < len; i++) {
        this.controlview[offset + i] = data.data[i]
      }
    }
  }

  synccontrol() {
    const ctrl = this.controlview
    if (!ctrl) {
      return
    }
    for (let i = 0; i < this.sabviews.length; i++) {
      const { view, offset, length } = this.sabviews[i]
      const n = Math.min(view.length, length)
      for (let j = 0; j < n; j++) {
        ctrl[offset + j] = view[j]
      }
    }
  }

  process(inputs, outputs) {
    this.checkeminitdeadline()
    if (!this.bootstarted && this.pendingwasmbytes) {
      // #region agent log
      this.port.postMessage({ zss_dsp_stage: 'process_boot' })
      // #endregion
      this.bootwasm(this.pendingwasmbytes)
    }
    if (!this.ready || !this.wasm || !this.controlview) {
      return true
    }
    const output = outputs[0]?.[0]
    if (!output) {
      return true
    }
    this.synccontrol()
    const tts = inputs[0]?.[0]
    if (tts && tts.length > 0) {
      const ttsgain =
        this.controlview[DAISY_SAB_CHANNEL_OFFSET.zss_master + 2] / 100
      for (let i = 0; i < output.length; i++) {
        output[i] = tts[i] * ttsgain
      }
    } else {
      for (let i = 0; i < output.length; i++) {
        output[i] = 0
      }
    }
    this.wasm._zss_process(this.outptr, output.length)
    const heap = this.wasm.HEAPF32
    const base = this.outptr >> 2
    for (let i = 0; i < output.length; i++) {
      output[i] += heap[base + i]
    }
    return true
  }
}

registerProcessor('zss-daisy-processor', DaisyProcessor)
