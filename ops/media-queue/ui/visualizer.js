/* global window */
;(function (global) {
  const CANVAS_WIDTH = 640
  const CANVAS_HEIGHT = 360
  const CAPTURE_FPS = 30
  const BG = '#0a0a12'
  const GREEN = '#00ff41'
  const CYAN = '#00e5ff'
  const MAGENTA = '#ff00aa'

  let canvasel = null
  let audioel = null
  let bloburl = ''
  let animframe = null
  let capturestream = null
  let audioctx = null
  let analyser = null
  let timedata = null
  let freqdata = null
  let peakhold = null
  let peakdecay = null
  let active = false

  function mimetypefrompath(filepath) {
    const ext = String(filepath || '')
      .split('.')
      .pop()
      .toLowerCase()
    switch (ext) {
      case 'm4a':
        return 'audio/mp4'
      case 'mp3':
        return 'audio/mpeg'
      case 'opus':
        return 'audio/opus'
      case 'webm':
        return 'audio/webm'
      case 'ogg':
        return 'audio/ogg'
      case 'aac':
        return 'audio/aac'
      default:
        return 'audio/mp4'
    }
  }

  function revokebloburl() {
    if (bloburl) {
      URL.revokeObjectURL(bloburl)
      bloburl = ''
    }
  }

  function ensurecanvas() {
    if (canvasel) {
      return canvasel
    }
    canvasel = document.createElement('canvas')
    canvasel.width = CANVAS_WIDTH
    canvasel.height = CANVAS_HEIGHT
    canvasel.style.position = 'fixed'
    canvasel.style.left = '0'
    canvasel.style.top = '0'
    canvasel.style.width = '320px'
    canvasel.style.height = '180px'
    canvasel.style.opacity = '0'
    canvasel.style.pointerEvents = 'none'
    canvasel.style.zIndex = '-1'
    document.body.appendChild(canvasel)
    return canvasel
  }

  function ensureaudio() {
    if (audioel) {
      return audioel
    }
    audioel = document.createElement('audio')
    audioel.style.position = 'fixed'
    audioel.style.left = '0'
    audioel.style.top = '0'
    audioel.style.width = '1px'
    audioel.style.height = '1px'
    audioel.style.opacity = '0'
    audioel.style.pointerEvents = 'none'
    audioel.style.zIndex = '-1'
    document.body.appendChild(audioel)
    return audioel
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
        let detail = 'audio load failed'
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

  function drawscanlines(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    for (let y = 0; y < CANVAS_HEIGHT; y += 3) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 1)
    }
  }

  function drawspectrum(ctx, analysernode, peaks, decay) {
    analysernode.getByteFrequencyData(freqdata)
    const barcount = 48
    const step = Math.floor(freqdata.length / barcount)
    const top = 12
    const bottom = Math.floor(CANVAS_HEIGHT * 0.62)
    const maxh = bottom - top
    const center = CANVAS_WIDTH / 2
    const barw = Math.max(3, Math.floor((center - 24) / barcount) - 1)

    for (let i = 0; i < barcount; i += 1) {
      let sum = 0
      const start = i * step
      for (let j = 0; j < step; j += 1) {
        sum += freqdata[start + j] || 0
      }
      const avg = sum / step / 255
      const h = Math.max(2, Math.floor(avg * maxh))
      if (h > peaks[i]) {
        peaks[i] = h
        decay[i] = 1
      } else {
        decay[i] = Math.max(0, decay[i] - 0.04)
        peaks[i] = Math.max(h, peaks[i] - 2 * decay[i])
      }

      const leftx = center - 16 - (i + 1) * (barw + 1)
      const rightx = center + 16 + i * (barw + 1)
      ctx.fillStyle = GREEN
      ctx.fillRect(leftx, bottom - h, barw, h)
      ctx.fillStyle = CYAN
      ctx.fillRect(rightx, bottom - h, barw, h)
      if (peaks[i] > h + 2) {
        ctx.fillStyle = MAGENTA
        ctx.fillRect(leftx, bottom - peaks[i], barw, 2)
        ctx.fillRect(rightx, bottom - peaks[i], barw, 2)
      }
    }
  }

  function drawscope(ctx, analysernode) {
    analysernode.getByteTimeDomainData(timedata)
    const top = Math.floor(CANVAS_HEIGHT * 0.68)
    const height = CANVAS_HEIGHT - top - 12
    const mid = top + height / 2
    ctx.strokeStyle = GREEN
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < timedata.length; i += 1) {
      const x = (i / (timedata.length - 1)) * (CANVAS_WIDTH - 24) + 12
      const v = (timedata[i] - 128) / 128
      const y = mid + v * (height * 0.42)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    ctx.strokeStyle = CYAN
    ctx.globalAlpha = 0.35
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawframe() {
    if (!active || !canvasel || !analyser) {
      return
    }
    const ctx = canvasel.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    drawscanlines(ctx)
    drawspectrum(ctx, analyser, peakhold, peakdecay)
    drawscope(ctx, analyser)
    animframe = window.requestAnimationFrame(drawframe)
  }

  function stopvisualizer() {
    active = false
    if (animframe) {
      window.cancelAnimationFrame(animframe)
      animframe = null
    }
    if (capturestream) {
      const tracks = capturestream.getTracks()
      for (let i = 0; i < tracks.length; i += 1) {
        tracks[i].stop()
      }
      capturestream = null
    }
    if (audioctx) {
      void audioctx.close().catch(function () {})
      audioctx = null
    }
    analyser = null
    timedata = null
    freqdata = null
    peakhold = null
    peakdecay = null
    if (audioel) {
      try {
        audioel.pause()
      } catch (_) {}
      audioel.removeAttribute('src')
      audioel.load()
      audioel.remove()
      audioel = null
    }
    if (canvasel) {
      canvasel.remove()
      canvasel = null
    }
    revokebloburl()
  }

  async function loadlocalaudio(path, invoke, tobytes) {
    revokebloburl()
    const raw = await invoke('read_media_file', { path: path })
    const bytes = tobytes(raw)
    if (!bytes.length) {
      throw new Error('media file is empty')
    }
    const blob = new Blob([bytes], { type: mimetypefrompath(path) })
    bloburl = URL.createObjectURL(blob)
    const el = ensureaudio()
    el.src = bloburl
    await waitforcanplay(el)
    return el
  }

  async function start(path, deps) {
    stopvisualizer()
    const invoke = deps.invoke
    const tobytes = deps.tobytes
    const el = await loadlocalaudio(path, invoke, tobytes)
    const canvas = ensurecanvas()
    audioctx = new AudioContext()
    analyser = audioctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    timedata = new Uint8Array(analyser.fftSize)
    freqdata = new Uint8Array(analyser.frequencyBinCount)
    peakhold = new Array(48).fill(0)
    peakdecay = new Array(48).fill(0)
    const silent = audioctx.createGain()
    silent.gain.value = 0
    const capturedest = audioctx.createMediaStreamDestination()
    const source = audioctx.createMediaElementSource(el)
    source.connect(analyser)
    analyser.connect(silent)
    silent.connect(audioctx.destination)
    source.connect(capturedest)
    await audioctx.resume()
    await el.play()
    active = true
    drawframe()
    capturestream = canvas.captureStream(CAPTURE_FPS)
    const stream = new MediaStream()
    const videotracks = capturestream.getVideoTracks()
    for (let i = 0; i < videotracks.length; i += 1) {
      stream.addTrack(videotracks[i])
    }
    const audiotracks = capturedest.stream.getAudioTracks()
    for (let i = 0; i < audiotracks.length; i += 1) {
      stream.addTrack(audiotracks[i])
    }
    if (!stream.getVideoTracks().length) {
      throw new Error('visualizer produced no video track')
    }
    if (!stream.getAudioTracks().length) {
      throw new Error('visualizer produced no audio track')
    }
    return {
      stream: stream,
      audio: el,
      canvas: canvas,
    }
  }

  function readaudio() {
    return audioel
  }

  global.mqvisualizer = {
    start: start,
    stop: stopvisualizer,
    readaudio: readaudio,
  }
})(typeof window !== 'undefined' ? window : globalThis)
