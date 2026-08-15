/* global window */
;(function (global) {
  const TARGET_FPS = 24
  const FRAME_MS = Math.floor(1000 / TARGET_FPS)

  let canvas = null
  let ctx = null
  let videostream = null
  let pumphandle = null
  let audiostream = null
  let audiosession = 0
  let audioctx = null
  let audioprocessor = null
  let audiodest = null
  let pcmqueue = []
  let pcmoffset = 0
  let listenhandle = null

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  function listen(event, handler) {
    if (!window.__TAURI__ || !window.__TAURI__.event) {
      return Promise.resolve(function () {})
    }
    return window.__TAURI__.event.listen(event, handler)
  }

  function base64tobytes(b64) {
    const binary = atob(b64)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; ++i) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  }

  function ensurecanvas() {
    if (canvas) {
      return
    }
    canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    ctx = canvas.getContext('2d', { alpha: false })
    videostream = canvas.captureStream(TARGET_FPS)
  }

  async function pumpframe() {
    if (!canvas || !ctx) {
      return
    }
    try {
      const frame = await invoke('capture_browser_frame')
      const rgba = base64tobytes(frame.rgbaB64 || frame.rgba_b64 || '')
      if (!frame.width || !frame.height || !rgba.length) {
        return
      }
      if (canvas.width !== frame.width || canvas.height !== frame.height) {
        canvas.width = frame.width
        canvas.height = frame.height
      }
      const image = new ImageData(
        new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
        frame.width,
        frame.height,
      )
      ctx.putImageData(image, 0, 0)
    } catch (_) {
      // keep pumping; transient snapshot failures are expected during navigation
    }
  }

  function startvideopump() {
    ensurecanvas()
    if (pumphandle) {
      return videostream
    }
    let last = 0
    const tick = function (now) {
      pumphandle = requestAnimationFrame(tick)
      if (now - last < FRAME_MS) {
        return
      }
      last = now
      void pumpframe()
    }
    pumphandle = requestAnimationFrame(tick)
    void pumpframe()
    return videostream
  }

  function stopvideopump() {
    if (pumphandle) {
      cancelAnimationFrame(pumphandle)
      pumphandle = null
    }
    if (videostream) {
      videostream.getTracks().forEach(function (track) {
        track.stop()
      })
      videostream = null
    }
    canvas = null
    ctx = null
  }

  async function startaudiobridge() {
    if (audiostream) {
      return audiostream
    }
    audiosession = await invoke('start_browser_audio')
    audioctx = new AudioContext({ sampleRate: 48000 })
    audiodest = audioctx.createMediaStreamDestination()
    audioprocessor = audioctx.createScriptProcessor(4096, 0, 2)
    audioprocessor.onaudioprocess = function (event) {
      const left = event.outputBuffer.getChannelData(0)
      const right = event.outputBuffer.getChannelData(1)
      let index = 0
      while (index < left.length) {
        if (pcmqueue.length === 0) {
          left[index] = 0
          right[index] = 0
          index += 1
          continue
        }
        const chunk = pcmqueue[0]
        if (pcmoffset >= chunk.length) {
          pcmqueue.shift()
          pcmoffset = 0
          continue
        }
        const sample = chunk[pcmoffset]
        pcmoffset += 1
        left[index] = sample
        right[index] = sample
        index += 1
      }
    }
    audioprocessor.connect(audiodest)
    listenhandle = await listen('mq-audio-pcm', function (event) {
      const payload = event.payload || {}
      if (payload.session !== audiosession) {
        return
      }
      const bytes = base64tobytes(payload.data || '')
      if (!bytes.length) {
        return
      }
      const floats = new Float32Array(
        bytes.buffer,
        bytes.byteOffset,
        Math.floor(bytes.byteLength / 4),
      )
      pcmqueue.push(floats)
      if (pcmqueue.length > 32) {
        pcmqueue.shift()
      }
    })
    await listen('mq-audio-error', function (event) {
      const payload = event.payload || {}
      if (payload.session !== audiosession) {
        return
      }
      window.dispatchEvent(
        new CustomEvent('mq-audio-error', { detail: payload.detail || '' }),
      )
    })
    await audioctx.resume()
    audiostream = audiodest.stream
    return audiostream
  }

  async function stopaudiobridge() {
    if (listenhandle) {
      const unlisten = listenhandle
      listenhandle = null
      if (typeof unlisten === 'function') {
        await unlisten()
      }
    }
    pcmqueue = []
    pcmoffset = 0
    if (audioprocessor) {
      audioprocessor.disconnect()
      audioprocessor.onaudioprocess = null
      audioprocessor = null
    }
    if (audiodest) {
      audiodest.disconnect()
      audiodest = null
    }
    if (audioctx) {
      await audioctx.close()
      audioctx = null
    }
    if (audiostream) {
      audiostream.getTracks().forEach(function (track) {
        track.stop()
      })
      audiostream = null
    }
    try {
      await invoke('stop_browser_audio')
    } catch (_) {}
    audiosession = 0
  }

  async function startbrowsercapture() {
    const video = startvideopump()
    const audio = await startaudiobridge()
    const tracks = []
    video.getVideoTracks().forEach(function (track) {
      tracks.push(track)
    })
    audio.getAudioTracks().forEach(function (track) {
      tracks.push(track)
    })
    return new MediaStream(tracks)
  }

  async function stopbrowsercapture() {
    stopvideopump()
    await stopaudiobridge()
  }

  function waitbrowserready(timeoutms) {
    return new Promise(function (resolve, reject) {
      let done = false
      let unlisten = null
      const timer = setTimeout(function () {
        if (done) {
          return
        }
        done = true
        if (unlisten) {
          void unlisten()
        }
        reject(new Error('browser ready timeout'))
      }, timeoutms)
      void listen('mq-browser-ready', function (event) {
        if (done) {
          return
        }
        done = true
        clearTimeout(timer)
        if (unlisten) {
          void unlisten()
        }
        resolve(event.payload || {})
      }).then(function (off) {
        unlisten = off
      })
    })
  }

  global.mqcapture = {
    startbrowsercapture: startbrowsercapture,
    stopbrowsercapture: stopbrowsercapture,
    waitbrowserready: waitbrowserready,
  }
})(window)
