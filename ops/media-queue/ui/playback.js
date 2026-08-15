/* global window */
;(function (global) {
  let video = null
  let playbackpath = ''
  let bloburl = ''
  let canvas = null
  let canvasctx = null
  let capturetimer = null
  let capturevfc = false
  let capturestream = null
  let audiocontext = null
  let playbackactive = false
  let keepalivetimer = null

  const CAPTURE_MS = 33

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

  function revokebloburl() {
    if (bloburl) {
      URL.revokeObjectURL(bloburl)
      bloburl = ''
    }
  }

  function stopcapture() {
    capturevfc = false
    if (capturetimer) {
      clearInterval(capturetimer)
      capturetimer = null
    }
    if (capturestream) {
      capturestream.getTracks().forEach(function (track) {
        track.stop()
      })
      capturestream = null
    }
    if (audiocontext) {
      void audiocontext.close().catch(function () {})
      audiocontext = null
    }
    if (keepalivetimer) {
      clearInterval(keepalivetimer)
      keepalivetimer = null
    }
    if (canvas) {
      canvas.remove()
      canvas = null
      canvasctx = null
    }
  }

  function ensurevideo() {
    if (video) {
      return video
    }
    video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.setAttribute('playsinline', '')
    video.style.position = 'fixed'
    video.style.left = '-9999px'
    video.style.top = '0'
    video.style.width = '1px'
    video.style.height = '1px'
    video.style.opacity = '0'
    video.style.pointerEvents = 'none'
    document.body.appendChild(video)
    return video
  }

  function stopvideo() {
    playbackactive = false
    stopcapture()
    if (!video) {
      playbackpath = ''
      revokebloburl()
      return
    }
    try {
      video.pause()
    } catch (_) {}
    video.removeAttribute('src')
    video.load()
    video.remove()
    video = null
    playbackpath = ''
    revokebloburl()
  }

  function waitforcanplay(el) {
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve()
    }
    return new Promise(function (resolve, reject) {
      function cleanup() {
        el.removeEventListener('canplay', onready)
        el.removeEventListener('error', onerror)
      }
      function onready() {
        cleanup()
        resolve()
      }
      function onerror() {
        cleanup()
        let detail = 'video load failed'
        if (el.error) {
          detail += ' (code ' + el.error.code + ')'
          if (el.error.message) {
            detail += ': ' + el.error.message
          }
        }
        reject(new Error(detail))
      }
      el.addEventListener('canplay', onready)
      el.addEventListener('error', onerror)
    })
  }

  function waitforvideoframe(el) {
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      return Promise.resolve()
    }
    return new Promise(function (resolve, reject) {
      function cleanup() {
        el.removeEventListener('loadeddata', onready)
        el.removeEventListener('error', onerror)
      }
      function onready() {
        cleanup()
        resolve()
      }
      function onerror() {
        cleanup()
        reject(new Error('video frame size unavailable'))
      }
      el.addEventListener('loadeddata', onready)
      el.addEventListener('error', onerror)
    })
  }

  function tobytes(raw) {
    if (raw instanceof ArrayBuffer) {
      return new Uint8Array(raw)
    }
    if (raw instanceof Uint8Array) {
      return raw
    }
    if (Array.isArray(raw)) {
      return new Uint8Array(raw)
    }
    throw new Error('unexpected media file payload')
  }

  async function loadlocalvideo(el, path) {
    revokebloburl()
    const raw = await invoke('read_media_file', { path: path })
    const bytes = tobytes(raw)
    if (!bytes.length) {
      throw new Error('media file is empty')
    }
    const blob = new Blob([bytes], { type: 'video/mp4' })
    bloburl = URL.createObjectURL(blob)
    el.removeAttribute('crossorigin')
    el.src = bloburl
    await waitforcanplay(el)
  }

  function resumeplayback(el) {
    if (!playbackactive || !el || el.ended) {
      return
    }
    if (el.paused) {
      void el.play().catch(function () {})
    }
    if (audiocontext && audiocontext.state === 'suspended') {
      void audiocontext.resume().catch(function () {})
    }
  }

  function bindkeepalive(el) {
    if (el.__mqkeepalive) {
      return
    }
    el.__mqkeepalive = true
    document.addEventListener('visibilitychange', function () {
      resumeplayback(el)
    })
    window.addEventListener('blur', function () {
      resumeplayback(el)
    })
    window.addEventListener('focus', function () {
      resumeplayback(el)
    })
    el.addEventListener('pause', function () {
      resumeplayback(el)
    })
    if (keepalivetimer) {
      clearInterval(keepalivetimer)
    }
    keepalivetimer = setInterval(function () {
      resumeplayback(el)
    }, 2000)
  }

  function drawframe(el) {
    if (!canvas || !canvasctx || !el || !playbackactive) {
      return
    }
    if (el.ended) {
      return
    }
    resumeplayback(el)
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      if (canvas.width !== el.videoWidth || canvas.height !== el.videoHeight) {
        canvas.width = el.videoWidth
        canvas.height = el.videoHeight
      }
      canvasctx.drawImage(el, 0, 0, canvas.width, canvas.height)
    }
  }

  function startcanvasloop(el) {
    capturevfc = false
    if (capturetimer) {
      clearInterval(capturetimer)
      capturetimer = null
    }
    if (typeof el.requestVideoFrameCallback === 'function') {
      capturevfc = true
      function loop() {
        if (!capturevfc || !playbackactive || !canvas) {
          return
        }
        drawframe(el)
        if (!el.ended) {
          el.requestVideoFrameCallback(loop)
        }
      }
      el.requestVideoFrameCallback(loop)
      return
    }
    capturetimer = setInterval(function () {
      drawframe(el)
    }, CAPTURE_MS)
  }

  function capturefromcanvas(el) {
    stopcapture()
    const width = el.videoWidth > 0 ? el.videoWidth : 1280
    const height = el.videoHeight > 0 ? el.videoHeight : 720
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.position = 'fixed'
    canvas.style.left = '-9999px'
    canvas.style.top = '0'
    canvas.style.width = '1px'
    canvas.style.height = '1px'
    canvas.style.opacity = '0'
    canvas.style.pointerEvents = 'none'
    document.body.appendChild(canvas)
    canvasctx = canvas.getContext('2d')
    if (!canvasctx) {
      throw new Error('canvas 2d context unavailable')
    }
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('canvas captureStream not supported')
    }
    capturestream = canvas.captureStream(30)
    startcanvasloop(el)

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) {
      try {
        audiocontext = new AudioCtx()
        const source = audiocontext.createMediaElementSource(el)
        const dest = audiocontext.createMediaStreamDestination()
        source.connect(dest)
        const audio = dest.stream.getAudioTracks()[0]
        if (audio) {
          capturestream.addTrack(audio)
        }
      } catch (_) {}
    }

    return capturestream
  }

  function capturefromvideo(el) {
    if (typeof el.captureStream === 'function') {
      return el.captureStream()
    }
    if (typeof el.webkitCaptureStream === 'function') {
      return el.webkitCaptureStream()
    }
    return capturefromcanvas(el)
  }

  function waitfordownload(timeoutms) {
    return new Promise(function (resolve, reject) {
      let done = false
      let unlistenready = null
      let unlistenerror = null
      let timer = null

      function finish(fn, value) {
        if (done) {
          return
        }
        done = true
        if (timer) {
          clearTimeout(timer)
        }
        const ready = unlistenready
        const error = unlistenerror
        unlistenready = null
        unlistenerror = null
        Promise.all([
          ready ? ready() : Promise.resolve(),
          error ? error() : Promise.resolve(),
        ]).finally(function () {
          fn(value)
        })
      }

      timer = setTimeout(function () {
        finish(reject, new Error('download timed out'))
      }, timeoutms)

      Promise.all([
        listen('mq-download-ready', function (event) {
          finish(resolve, event.payload || {})
        }),
        listen('mq-download-error', function (event) {
          const message =
            (event.payload && event.payload.message) || 'download failed'
          finish(reject, new Error(message))
        }),
      ]).then(function (unsubs) {
        if (done) {
          unsubs[0]()
          unsubs[1]()
          return
        }
        unlistenready = unsubs[0]
        unlistenerror = unsubs[1]
      })
    })
  }

  async function startdownload(url) {
    await invoke('cancel_media_download')
    const pending = waitfordownload(600000)
    await invoke('start_media_download', { url: url })
    return pending
  }

  async function startplayback(localpath) {
    const path = (localpath || '').trim()
    if (!path) {
      throw new Error('missing download path')
    }
    let el = ensurevideo()
    if (playbackpath !== path) {
      stopvideo()
      el = ensurevideo()
      playbackpath = path
      await loadlocalvideo(el, path)
    }
    await el.play()
    await waitforvideoframe(el)
    playbackactive = true
    bindkeepalive(el)
    const stream = capturefromvideo(el)
    if (!stream || !stream.getVideoTracks().length) {
      throw new Error('playback produced no video track')
    }
    return { stream: stream, video: el }
  }

  async function stopplayback() {
    stopvideo()
  }

  global.mqplayback = {
    startdownload: startdownload,
    startplayback: startplayback,
    stopplayback: stopplayback,
  }
})(typeof window !== 'undefined' ? window : globalThis)
