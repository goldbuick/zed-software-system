/**
 * ZSS DaisySP AudioWorklet source — bundled with zss_daisy.js as a classic script
 * (no ES module imports; Firefox-compatible like maximilian maxi-processor.js).
 */

// @generated-start daisy-sab-layout
const DAISY_SAB_CHANNEL_OFFSET = {
  "zss_voices": 0,
  "zss_drums": 48,
  "zss_main": 68,
  "zss_fx": 73,
  "zss_voicecfg": 181,
  "zss_osccfg": 261,
  "zss_algocfg": 429,
  "zss_vibrato": 637
}
const DAISY_SAB_CHANNEL_LEN = {
  "zss_voices": 48,
  "zss_drums": 20,
  "zss_main": 5,
  "zss_fx": 108,
  "zss_voicecfg": 80,
  "zss_osccfg": 168,
  "zss_algocfg": 208,
  "zss_vibrato": 13
}
// @generated-end daisy-sab-layout

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
    this.ttsptr = 0
    this.ready = false
    this.bootstarted = false
    this.pendingwasmbytes = null
    this.eminitstartframe = null
    this.eminiterrposted = false
    const optbytes = options?.processorOptions?.wasmbytes
    if (optbytes) {
      this.pendingwasmbytes = optbytes
      postdspstage(this.port, 'processor_options_wasm')
    }
    this.port.onmessage = (event) => this.onmessage(event)
    postdspstage(this.port, 'constructor')
  }

  bootwasm(wasmbytes) {
    if (this.bootstarted) {
      return
    }
    this.bootstarted = true
    this.eminitstartframe = currentFrame
    postdspstage(this.port, 'bootwasm_enter')

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
          processor.ttsptr = modcfg._malloc(128 * 4)
          processor.wasm = modcfg
          processor.ready = true
          processor.eminitstartframe = null
          postdspstage(port, 'ready')
          const razzletag =
            typeof modcfg._zss_razzle_tag === 'function'
              ? modcfg._zss_razzle_tag()
              : 0
          port.postMessage({ zss_dsp_ready: 1, zss_razzle_tag: razzletag })
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
    if (data?.zss_boot) {
      postdspstage(this.port, 'onmessage_zss_boot')
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
      postdspstage(this.port, 'process_boot')
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
    const heap = this.wasm.HEAPF32
    let ttsptr = 0
    if (tts && tts.length > 0 && this.ttsptr) {
      const ttsbase = this.ttsptr >> 2
      const n = Math.min(tts.length, output.length)
      for (let i = 0; i < n; i++) {
        heap[ttsbase + i] = tts[i]
      }
      for (let i = n; i < output.length; i++) {
        heap[ttsbase + i] = 0
      }
      ttsptr = this.ttsptr
    }
    this.wasm._zss_process(this.outptr, output.length, ttsptr)
    const base = this.outptr >> 2
    for (let i = 0; i < output.length; i++) {
      output[i] = heap[base + i]
    }
    return true
  }
}

registerProcessor('zss-daisy-processor', DaisyProcessor)
