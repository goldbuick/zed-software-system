/* global window */
;(function (global) {
  let previewel = null
  let hiddenvideo = null
  let playbackpath = ''
  let bloburl = ''
  let playbackactive = false
  let keepalivetimer = null
  let captureaudioctx = null
  let captureaudiodest = null
  let captureaudiosource = null
  let captureaudioel = null

  function attachpreview(el) {
    previewel = el || null
    if (!previewel) {
      return
    }
    previewel.playsInline = true
    previewel.muted = true
    previewel.setAttribute('playsinline', '')
  }

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Electron API missing'))
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

  function decodesourceel() {
    return previewel || hiddenvideo
  }

  function ensurevideo() {
    if (previewel) {
      return previewel
    }
    if (hiddenvideo) {
      return hiddenvideo
    }
    hiddenvideo = document.createElement('video')
    hiddenvideo.playsInline = true
    hiddenvideo.muted = true
    hiddenvideo.setAttribute('playsinline', '')
    hiddenvideo.style.position = 'fixed'
    hiddenvideo.style.left = '0'
    hiddenvideo.style.top = '0'
    hiddenvideo.style.width = '320px'
    hiddenvideo.style.height = '180px'
    hiddenvideo.style.opacity = '0'
    hiddenvideo.style.pointerEvents = 'none'
    hiddenvideo.style.zIndex = '-1'
    document.body.appendChild(hiddenvideo)
    return hiddenvideo
  }

  function stopcaptureaudio() {
    if (captureaudiosource) {
      try {
        captureaudiosource.disconnect()
      } catch (_) {}
      captureaudiosource = null
    }
    if (captureaudiodest) {
      try {
        captureaudiodest.disconnect()
      } catch (_) {}
      captureaudiodest = null
    }
    if (captureaudioctx) {
      void captureaudioctx.close().catch(function () {})
      captureaudioctx = null
    }
    captureaudioel = null
  }

  function stopvideo() {
    playbackactive = false
    stopcaptureaudio()
    if (keepalivetimer) {
      window.clearTimeout(keepalivetimer)
      keepalivetimer = null
    }
    const el = decodesourceel()
    if (!el) {
      playbackpath = ''
      revokebloburl()
      return
    }
    try {
      el.pause()
    } catch (_) {}
    el.removeAttribute('src')
    if (el.srcObject) {
      el.srcObject = null
    }
    el.load()
    if (hiddenvideo) {
      hiddenvideo.remove()
      hiddenvideo = null
    }
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

  function playbackatornear_end(el) {
    if (el.ended) {
      return true
    }
    const duration = el.duration
    if (!Number.isFinite(duration) || duration <= 0) {
      return false
    }
    return el.currentTime >= duration - 0.1
  }

  function resumeplayback() {
    const active = decodesourceel()
    if (!playbackactive || !active || playbackatornear_end(active)) {
      return
    }
    if (active.paused) {
      void active.play().catch(function () {})
    }
  }

  function schedulekeepalive() {
    if (keepalivetimer) {
      window.clearTimeout(keepalivetimer)
    }
    const ms = document.hidden ? 16 : 2000
    keepalivetimer = window.setTimeout(function keepalivetick() {
      resumeplayback()
      if (!playbackactive) {
        keepalivetimer = null
        return
      }
      keepalivetimer = window.setTimeout(keepalivetick, ms)
    }, ms)
  }

  function bindkeepalive(el) {
    if (el.__mqkeepalive) {
      schedulekeepalive()
      return
    }
    el.__mqkeepalive = true
    document.addEventListener('visibilitychange', function () {
      schedulekeepalive()
      resumeplayback()
    })
    window.addEventListener('blur', function () {
      resumeplayback()
    })
    window.addEventListener('focus', function () {
      resumeplayback()
    })
    el.addEventListener('pause', function () {
      if (playbackatornear_end(el)) {
        return
      }
      resumeplayback()
    })
    el.addEventListener('ended', function () {
      playbackactive = false
    })
    schedulekeepalive()
  }

  function wirecaptureaudio(el, stream) {
    if (captureaudioel === el && captureaudiosource) {
      return
    }
    stopcaptureaudio()
    captureaudioctx = new AudioContext()
    captureaudiodest = captureaudioctx.createMediaStreamDestination()
    captureaudiosource = captureaudioctx.createMediaElementSource(el)
    captureaudiosource.connect(captureaudiodest)
    captureaudioel = el
    void captureaudioctx.resume()
    const audiotracks = captureaudiodest.stream.getAudioTracks()
    for (let i = 0; i < audiotracks.length; i++) {
      stream.addTrack(audiotracks[i])
    }
  }

  function capturefromvideo(el) {
    if (typeof el.captureStream !== 'function') {
      throw new Error('video.captureStream not supported')
    }
    // Helper stays silent: never unmute the local decode element.
    el.muted = true
    const stream = new MediaStream()
    wirecaptureaudio(el, stream)
    const captured = el.captureStream()
    const videotracks = captured.getVideoTracks()
    for (let i = 0; i < videotracks.length; i++) {
      stream.addTrack(videotracks[i])
    }
    if (!stream.getVideoTracks().length) {
      throw new Error('video.captureStream produced no video track')
    }
    if (!stream.getAudioTracks().length) {
      throw new Error('video capture produced no audio track')
    }
    return stream
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
    return {
      stream: stream,
      video: el,
      usespreviewsource: Boolean(previewel && el === previewel),
    }
  }

  async function stopplayback() {
    stopvideo()
  }

  global.mqplayback = {
    attachpreview: attachpreview,
    startdownload: startdownload,
    startplayback: startplayback,
    stopplayback: stopplayback,
  }

  void listen('mq-download-progress', function (event) {
    if (typeof global.mqondownloadprogress === 'function') {
      global.mqondownloadprogress(event.payload)
    }
  })
})(typeof window !== 'undefined' ? window : globalThis)
