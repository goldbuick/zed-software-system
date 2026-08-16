/* global window, mqvisualizer */
;(function (global) {
  let previewel = null
  let hiddenvideo = null
  let playbackpath = ''
  let playbackaudioonly = false
  let bloburl = ''
  let playbackactive = false
  let keepalivetimer = null

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
    if (playbackaudioonly) {
      return null
    }
    return hiddenvideo
  }

  function createdecodevideo() {
    const el = document.createElement('video')
    el.playsInline = true
    el.muted = false
    el.volume = 1
    el.setAttribute('playsinline', '')
    el.style.position = 'fixed'
    el.style.left = '0'
    el.style.top = '0'
    el.style.width = '320px'
    el.style.height = '180px'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '-1'
    document.body.appendChild(el)
    return el
  }

  function ensuredecodevideo() {
    if (!hiddenvideo) {
      hiddenvideo = createdecodevideo()
    }
    return hiddenvideo
  }

  function syncpreview(el) {
    if (!previewel || previewel === el) {
      return
    }
    previewel.muted = true
    previewel.playsInline = true
    previewel.srcObject = null
    if (el.src) {
      previewel.src = el.src
    } else {
      previewel.removeAttribute('src')
    }
    void previewel.play().catch(function () {})
  }

  function stopvisualizer() {
    if (global.mqvisualizer && typeof global.mqvisualizer.stop === 'function') {
      global.mqvisualizer.stop()
    }
  }

  function stopvideo() {
    playbackactive = false
    stopvisualizer()
    if (keepalivetimer) {
      window.clearTimeout(keepalivetimer)
      keepalivetimer = null
    }
    const el = decodesourceel()
    if (!el) {
      playbackpath = ''
      playbackaudioonly = false
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
    playbackaudioonly = false
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

  function mediafileurl(filepath) {
    return 'mqmedia://local/' + encodeURIComponent(filepath)
  }

  async function loadlocalvideo(el, filepath) {
    revokebloburl()
    el.removeAttribute('crossorigin')
    el.src = mediafileurl(filepath)
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
    if (playbackaudioonly) {
      return
    }
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

  function bindaudiokeepalive(el) {
    if (el.__mqaudiokeepalive) {
      return
    }
    el.__mqaudiokeepalive = true
    el.addEventListener('ended', function () {
      playbackactive = false
    })
  }

  function waitforaudiocapture(stream, timeoutms) {
    if (stream.getAudioTracks().length) {
      return Promise.resolve(stream)
    }
    return new Promise(function (resolve, reject) {
      let done = false
      const timer = setTimeout(function () {
        if (done) {
          return
        }
        done = true
        stream.removeEventListener('addtrack', onadd)
        reject(new Error('video.captureStream produced no audio track'))
      }, timeoutms)
      function finish(next) {
        if (done) {
          return
        }
        done = true
        clearTimeout(timer)
        stream.removeEventListener('addtrack', onadd)
        resolve(next)
      }
      function onadd(evt) {
        if (evt.track && evt.track.kind === 'audio') {
          finish(stream)
        }
      }
      stream.addEventListener('addtrack', onadd)
    })
  }

  async function preparelocalcapture(el) {
    el.muted = false
    el.volume = 1
    if (typeof el.setSinkId === 'function') {
      try {
        await el.setSinkId('none')
      } catch (_) {
        // Chromium-only; helper may play quietly if unavailable
      }
    }
  }

  async function capturefromvideo(el) {
    if (typeof el.captureStream !== 'function') {
      throw new Error('video.captureStream not supported')
    }
    await preparelocalcapture(el)
    const stream = el.captureStream()
    if (!stream.getVideoTracks().length) {
      throw new Error('video.captureStream produced no video track')
    }
    await waitforaudiocapture(stream, 5000)
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

  async function startvideoplayback(path) {
    if (playbackpath !== path || playbackaudioonly) {
      stopvideo()
    }
    const el = ensuredecodevideo()
    playbackpath = path
    playbackaudioonly = false
    await loadlocalvideo(el, path)
    syncpreview(el)
    await el.play()
    await waitforvideoframe(el)
    playbackactive = true
    bindkeepalive(el)
    const stream = await capturefromvideo(el)
    return {
      stream: stream,
      video: el,
      audio: null,
      usespreviewsource: false,
    }
  }

  async function startaudiovisualizer(path) {
    if (!global.mqvisualizer || typeof global.mqvisualizer.start !== 'function') {
      throw new Error('visualizer module missing')
    }
    if (playbackpath !== path || !playbackaudioonly) {
      stopvideo()
      playbackpath = path
      playbackaudioonly = true
    }
    const result = await global.mqvisualizer.start(path, {
      invoke: invoke,
      tobytes: tobytes,
    })
    playbackactive = true
    bindaudiokeepalive(result.audio)
    return {
      stream: result.stream,
      video: null,
      audio: result.audio,
      canvas: result.canvas,
      usespreviewsource: false,
    }
  }

  async function startplayback(localpath, opts) {
    const path = (localpath || '').trim()
    if (!path) {
      throw new Error('missing download path')
    }
    const audioonly = Boolean(opts && opts.audioOnly)
    if (audioonly) {
      return startaudiovisualizer(path)
    }
    return startvideoplayback(path)
  }

  async function stopplayback() {
    stopvideo()
  }

  function readendedelement() {
    if (playbackaudioonly && global.mqvisualizer) {
      if (typeof global.mqvisualizer.readaudio === 'function') {
        return global.mqvisualizer.readaudio()
      }
      return null
    }
    return decodesourceel()
  }

  global.mqplayback = {
    attachpreview: attachpreview,
    startdownload: startdownload,
    startplayback: startplayback,
    stopplayback: stopplayback,
    readendedelement: readendedelement,
  }

  void listen('mq-download-progress', function (event) {
    if (typeof global.mqondownloadprogress === 'function') {
      global.mqondownloadprogress(event.payload)
    }
  })
})(typeof window !== 'undefined' ? window : globalThis)
