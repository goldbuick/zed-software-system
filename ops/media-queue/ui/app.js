/* global Peer, mqplayback */
;(function () {
  const PEER_HOST = 'terminal.zed.cafe'
  const PROTOCOL = 'mediaqueue/v1'

  const els = {
    localpeer: document.getElementById('localpeer'),
    copypeer: document.getElementById('copypeer'),
    link: document.getElementById('link'),
    detail: document.getElementById('detail'),
    queue: document.getElementById('queue'),
    stopcall: document.getElementById('stopcall'),
    cleardownloads: document.getElementById('cleardownloads'),
    preview: document.getElementById('preview'),
    statusbox: document.getElementById('statusbox'),
    frame: document.querySelector('.frame.mq'),
  }

  let peer = null
  let dataconnection = null
  let mediastream = null
  let mediacall = null
  let queueurls = []
  let queueindex = 0
  let cafemediapeerid = ''
  let localpeerid = ''
  let playbackstarted = false
  let pendinggoto = false
  let cachebytes = 0
  let downloadinflight = false
  let lastdownloadpct = -1

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  const MAIN_HEIGHT_IDLE = 464
  const MAIN_HEIGHT_PREVIEW = 604

  function formatbytes(bytes) {
    if (!bytes || bytes < 1) {
      return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024
      unit += 1
    }
    return value.toFixed(unit === 0 ? 0 : 1) + ' ' + units[unit]
  }

  function updateclearlabel() {
    if (!els.cleardownloads) {
      return
    }
    const label =
      cachebytes > 0
        ? 'Clear downloads (' + formatbytes(cachebytes) + ')'
        : 'Clear downloads'
    els.cleardownloads.textContent = label
  }

  async function refreshcachebytes() {
    try {
      const state = await invoke('get_media_download_state')
      cachebytes = state && state.cacheBytes ? state.cacheBytes : 0
      updateclearlabel()
    } catch (_) {
      cachebytes = 0
      updateclearlabel()
    }
  }

  function setlink(text, detail) {
    els.link.textContent = text
    els.detail.textContent = detail || ''
    els.statusbox.classList.toggle('error', text === 'error')
  }

  function renderqueue() {
    if (!queueurls.length) {
      els.queue.value = '(empty)'
    } else {
      els.queue.value = queueurls
        .map(function (url, i) {
          return (i === queueindex ? '> ' : '  ') + '[' + i + '] ' + url
        })
        .join('\n')
    }
  }

  function send(msg) {
    if (!dataconnection || !dataconnection.open) {
      return
    }
    dataconnection.send(msg)
  }

  function formatdownloadprogress(percent, eta, phase) {
    const pct = Math.max(0, Math.min(100, Math.round(percent || 0)))
    let line = (phase || 'downloading') + ' ' + pct + '%'
    if (eta) {
      line += ' eta ' + eta
    }
    return line
  }

  function handledownloadprogress(payload) {
    if (!downloadinflight) {
      return
    }
    const percent = payload && payload.percent ? payload.percent : 0
    const eta = payload && payload.eta ? payload.eta : ''
    const phase =
      percent >= 99.5
        ? 'transcoding'
        : payload && payload.status
          ? payload.status
          : 'downloading'
    const line = formatdownloadprogress(percent, eta, phase)
    setlink(phase, line)
    const pct = Math.round(percent || 0)
    if (pct !== lastdownloadpct && (pct - lastdownloadpct >= 5 || pct >= 99)) {
      lastdownloadpct = pct
      const detail = String(pct) + (eta ? '|' + eta : '')
      sendstatus('download-progress', detail)
    }
  }

  function sendstatus(status, detail) {
    send({ type: 'mediaqueue:status', status: status, detail: detail })
  }

  let fitwindowtimer = null
  function schedulefitwindow() {
    if (fitwindowtimer) {
      clearTimeout(fitwindowtimer)
    }
    fitwindowtimer = setTimeout(function () {
      fitwindowtimer = null
      void fitmainwindow()
    }, 16)
  }

  function setpreviewstream(stream) {
    els.preview.srcObject = stream || null
    els.preview.classList.toggle('has-stream', Boolean(stream))
    schedulefitwindow()
  }

  async function fitmainwindow() {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return
    }
    const height = els.preview.classList.contains('has-stream')
      ? MAIN_HEIGHT_PREVIEW
      : MAIN_HEIGHT_IDLE
    try {
      await invoke('resize_main_window', { height: height })
    } catch (_) {
      // Browser-only preview.
    }
  }

  function stopmediastream() {
    if (mediastream) {
      mediastream.getTracks().forEach(function (t) {
        t.stop()
      })
      mediastream = null
    }
    setpreviewstream(null)
  }

  async function endcall() {
    const hadcall = Boolean(mediacall || mediastream || playbackstarted)
    if (mediacall) {
      try {
        mediacall.close()
      } catch (_) {}
      mediacall = null
    }
    stopmediastream()
    if (playbackstarted && window.mqplayback) {
      await window.mqplayback.stopplayback()
      playbackstarted = false
    }
    if (hadcall) {
      sendstatus('call-stopped')
    }
  }

  async function startplaybackandcall(url) {
    const cafeid = (cafemediapeerid || '').trim()
    if (!peer || !peer.open) {
      setlink('error', 'peer not ready')
      return
    }
    if (!cafeid) {
      setlink('waiting', 'cafe not connected yet')
      return
    }
    if (mediacall || mediastream || playbackstarted) {
      await endcall()
    }
    if (!window.mqplayback) {
      setlink('error', 'playback module missing')
      return
    }
    let path = ''
    try {
      downloadinflight = true
      lastdownloadpct = -1
      setlink('downloading', url)
      sendstatus('downloading', url)
      const ready = await window.mqplayback.startdownload(url)
      path = ready && ready.path ? ready.path : ''
      setlink('buffering', path)
      sendstatus('buffering', path)
      const playback = await window.mqplayback.startplayback(path)
      mediastream = playback.stream
    } catch (err) {
      const phase = path ? 'playback-failed' : 'download-failed'
      setlink('error', phase + ': ' + err)
      sendstatus(phase, String(err))
      return
    } finally {
      downloadinflight = false
      lastdownloadpct = -1
    }
    playbackstarted = true
    setpreviewstream(mediastream)
    void refreshcachebytes()
    mediastream.getVideoTracks().forEach(function (track) {
      track.addEventListener('ended', function () {
        sendstatus('playback-ended', '')
        void endcall()
        setlink('connected', 'playback ended')
      })
    })
    mediacall = peer.call(cafeid, mediastream, {
      metadata: { kind: 'mediaqueue', source: 'helper' },
    })
    mediacall.on('close', function () {
      mediacall = null
      void endcall()
    })
    mediacall.on('error', function (err) {
      setlink('error', 'call: ' + err)
      void endcall()
    })
    setlink('playing', cafeid)
    sendstatus('playing', cafeid)
  }

  async function maybeautostartaftergoto(url) {
    if (pendinggoto || !url) {
      return
    }
    pendinggoto = true
    try {
      await startplaybackandcall(url)
    } catch (err) {
      setlink('error', String(err))
      sendstatus('download-failed', String(err))
    } finally {
      pendinggoto = false
    }
  }

  function handlecafemessage(data) {
    if (!data || typeof data !== 'object') {
      return
    }
    switch (data.type) {
      case 'mediaqueue:hello':
        if (data.role === 'cafe' && data.peerid) {
          cafemediapeerid = data.peerid
        }
        setlink('connected', 'cafe hello')
        send({
          type: 'mediaqueue:hello',
          protocol: PROTOCOL,
          role: 'helper',
          peerid: localpeerid,
        })
        sendstatus('waiting-for-url', 'add a URL in cafe #media')
        break
      case 'mediaqueue:queue':
        queueurls = Array.isArray(data.urls) ? data.urls.slice() : []
        queueindex = typeof data.index === 'number' ? data.index : 0
        renderqueue()
        if (
          queueurls.length === 0 &&
          (playbackstarted || mediacall || mediastream)
        ) {
          void endcall()
          setlink('connected', 'queue empty')
        }
        break
      case 'mediaqueue:goto':
        queueindex = typeof data.index === 'number' ? data.index : queueindex
        renderqueue()
        void maybeautostartaftergoto(data.url)
        break
      case 'mediaqueue:requestcall':
        if (!playbackstarted && queueurls[queueindex]) {
          void maybeautostartaftergoto(queueurls[queueindex])
        } else if (!playbackstarted) {
          sendstatus('waiting-for-url', 'queue a URL in cafe first')
        }
        break
      default:
        break
    }
  }

  function wiredataconnection(conn) {
    if (dataconnection && dataconnection !== conn) {
      try {
        dataconnection.close()
      } catch (_) {}
    }
    dataconnection = conn
    conn.on('open', function () {
      setlink('connected', 'data open')
      send({
        type: 'mediaqueue:hello',
        protocol: PROTOCOL,
        role: 'helper',
        peerid: localpeerid,
      })
    })
    conn.on('data', handlecafemessage)
    conn.on('close', function () {
      if (dataconnection === conn) {
        dataconnection = null
      }
      cafemediapeerid = ''
      void endcall()
      setlink('ready', 'waiting for cafe')
    })
    conn.on('error', function (err) {
      setlink('error', String(err))
    })
  }

  function destroypeer() {
    void endcall()
    cafemediapeerid = ''
    if (dataconnection) {
      try {
        dataconnection.close()
      } catch (_) {}
      dataconnection = null
    }
    if (peer) {
      try {
        peer.destroy()
      } catch (_) {}
      peer = null
    }
    localpeerid = ''
    els.localpeer.value = 'restarting...'
    els.copypeer.disabled = true
    setlink('idle', '')
  }

  function startpeer() {
    destroypeer()
    setlink('starting', PEER_HOST)
    peer = new Peer({
      host: PEER_HOST,
      secure: true,
      port: 443,
      debug: 1,
    })
    peer.on('open', function (id) {
      localpeerid = id
      els.localpeer.value = id
      els.copypeer.disabled = false
      setlink('ready', '#media <peerid> in cafe')
    })
    peer.on('connection', wiredataconnection)
    peer.on('error', function (err) {
      setlink('error', (err && err.type) || String(err))
    })
    peer.on('disconnected', function () {
      setlink('disconnected', 'signaling lost -- reconnecting')
      try {
        peer.reconnect()
      } catch (_) {
        startpeer()
      }
    })
  }

  async function copypeerid() {
    if (!localpeerid) {
      return
    }
    const cliline = '#media "' + localpeerid + '"'
    try {
      await invoke('copy_text', { text: cliline })
      setlink(els.link.textContent, 'copied to clipboard')
    } catch (err) {
      setlink('error', String(err))
    }
  }

  async function cleardownloadcache() {
    try {
      await endcall()
      const result = await invoke('clear_media_downloads')
      const count = result && result.deletedCount ? result.deletedCount : 0
      const freed = result && result.freedBytes ? result.freedBytes : 0
      cachebytes = 0
      updateclearlabel()
      setlink('ready', 'cleared ' + count + ' file(s), freed ' + formatbytes(freed))
    } catch (err) {
      setlink('error', String(err))
    }
  }

  els.copypeer.addEventListener('click', function () {
    void copypeerid()
  })
  els.stopcall.addEventListener('click', function () {
    void endcall()
  })
  if (els.cleardownloads) {
    els.cleardownloads.addEventListener('click', function () {
      void cleardownloadcache()
    })
  }

  function bootfit() {
    renderqueue()
    startpeer()
    void refreshcachebytes()
    if (window.__TAURI__ && window.__TAURI__.event) {
      void window.__TAURI__.event.listen('mq-download-progress', function (event) {
        handledownloadprogress(event && event.payload ? event.payload : null)
        void refreshcachebytes()
      })
    }
    void fitmainwindow()
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(bootfit)
  } else {
    window.addEventListener('load', bootfit)
  }
})()
