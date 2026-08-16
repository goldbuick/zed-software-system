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
    cookiesbrowser: document.getElementById('cookiesbrowser'),
    stopcall: document.getElementById('stopcall'),
    cleardownloads: document.getElementById('cleardownloads'),
    preview: document.getElementById('preview'),
    statusbox: document.getElementById('statusbox'),
    frame: document.querySelector('.frame.mq'),
  }

  let peer = null
  let dataconnection = null
  let mediastream = null
  let playercalls = new Map()
  let pendingplayercalls = new Map()
  let queueurls = []
  let queueindex = 0
  let cafemediapeerid = ''
  let localpeerid = ''
  let playbackstarted = false
  let pendinggoto = false
  let currentplaybackurl = ''
  let currentplaybacktitle = ''
  let cachebytes = 0
  let downloadinflight = false
  let lastdownloadpct = -1
  let lastdownloadlabel = ''
  let transcodepulsetimer = null
  let downloadpolltimer = null
  let endedvideo = null

  let mqdevcache = null

  async function loadmqdevconfig() {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return
    }
    try {
      mqdevcache = await window.__TAURI__.core.invoke('get_mq_dev_config')
    } catch (_) {
      mqdevcache = null
    }
  }

  void loadmqdevconfig()

  function mqdevconfig() {
    if (mqdevcache) {
      return mqdevcache
    }
    return typeof window.mqdev === 'object' && window.mqdev ? window.mqdev : null
  }

  async function writemqdevfile(filepath, text) {
    if (!filepath || !window.__TAURI__ || !window.__TAURI__.core) {
      return
    }
    try {
      await window.__TAURI__.core.invoke('write_text_file', {
        path: filepath,
        text: text,
      })
    } catch (_) {}
  }

  function writemqpeerid(id) {
    if (window.__TAURI__ && window.__TAURI__.core) {
      void window.__TAURI__.core.invoke('mq_dev_peer_open', { id: id })
      return
    }
    var cfg = mqdevconfig()
    if (cfg && cfg.peeridfile) {
      void writemqdevfile(cfg.peeridfile, id)
    }
  }

  function writemqstatus(text) {
    if (window.__TAURI__ && window.__TAURI__.core) {
      void window.__TAURI__.core.invoke('mq_dev_status', { text: text })
      return
    }
    var cfg = mqdevconfig()
    if (cfg && cfg.statustextfile) {
      void writemqdevfile(cfg.statustextfile, text)
    }
  }

  function readdevplaybackpath() {
    var cfg = mqdevconfig()
    return cfg && cfg.playbackpath ? String(cfg.playbackpath).trim() : ''
  }

  function maybeautostartdevfixture() {
    var devpath = readdevplaybackpath()
    if (!devpath || playbackstarted || pendinggoto || !dataconnection) {
      return
    }
    void startplaybackandcall('dev://fixture')
  }

  function clearendedlistener() {
    if (endedvideo && endedvideo.__mqonended) {
      endedvideo.removeEventListener('ended', endedvideo.__mqonended)
      endedvideo.__mqonended = null
    }
    endedvideo = null
  }

  function cleardownloadpoll() {
    if (downloadpolltimer) {
      clearInterval(downloadpolltimer)
      downloadpolltimer = null
    }
  }

  function startdownloadpoll() {
    cleardownloadpoll()
    downloadpolltimer = setInterval(function () {
      if (!downloadinflight) {
        cleardownloadpoll()
        return
      }
      void invoke('get_media_download_state')
        .then(function (state) {
          if (!downloadinflight || !state) {
            return
          }
          handledownloadprogress({
            percent: Number(state.percent),
            eta: state.detail ? String(state.detail) : '',
            status: state.status ? String(state.status) : 'downloading',
          })
        })
        .catch(function () {})
    }, 200)
  }

  function cleardownloadpulse() {
    if (transcodepulsetimer) {
      clearInterval(transcodepulsetimer)
      transcodepulsetimer = null
    }
  }

  function ensuretranscodepulse() {
    if (transcodepulsetimer) {
      return
    }
    transcodepulsetimer = setInterval(function () {
      if (!downloadinflight) {
        cleardownloadpulse()
        return
      }
      const pct = lastdownloadpct >= 0 ? lastdownloadpct : 99
      sendstatus('transcoding', String(pct))
    }, 1500)
  }

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  function mediabasename(path) {
    if (!path) {
      return ''
    }
    const parts = String(path).split(/[/\\]/)
    return parts[parts.length - 1] || path
  }

  function playbacklabel(title, url, path) {
    const trimmed = String(title || '').trim()
    if (trimmed) {
      return trimmed
    }
    const fromurl = urlfallbacklabel(url)
    if (fromurl) {
      return fromurl
    }
    return mediabasename(path)
  }

  function urlfallbacklabel(url) {
    const trimmed = String(url || '').trim()
    if (!trimmed) {
      return ''
    }
    try {
      const parsed = new URL(trimmed)
      const v = parsed.searchParams.get('v')
      if (v) {
        return 'youtube:' + v
      }
      const host = parsed.hostname.replace(/^www\./i, '')
      const path = parsed.pathname.replace(/\/+$/, '')
      const tail = path.split('/').filter(Boolean).pop()
      if (tail) {
        return host + '/' + tail
      }
      return host
    } catch (_) {
      return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed
    }
  }

  function shortenerr(message) {
    const text = String(message)
    const lower = text.toLowerCase()
    if (lower.includes('sign in') || lower.includes('cookies-from-browser')) {
      return 'youtube needs browser login -- pick youtube cookies below'
    }
    if (text.length > 140) {
      return text.slice(0, 137) + '...'
    }
    return text
  }

  function defaultcookiesbrowser() {
    if (/Mac/i.test(navigator.userAgent || '')) {
      return 'safari'
    }
    if (/Win/i.test(navigator.userAgent || '')) {
      return 'chrome'
    }
    return 'chrome'
  }

  async function synccookiessetting() {
    if (!els.cookiesbrowser) {
      return
    }
    const browser = els.cookiesbrowser.value || ''
    try {
      await invoke('set_media_cookies_browser', { browser: browser })
      localStorage.setItem('mq-cookies-browser', browser)
    } catch (_) {}
    schedulefitwindow()
  }

  function initcookiessetting() {
    if (!els.cookiesbrowser) {
      return
    }
    const saved = localStorage.getItem('mq-cookies-browser')
    els.cookiesbrowser.value =
      saved != null ? saved : defaultcookiesbrowser()
    els.cookiesbrowser.addEventListener('change', function () {
      void synccookiessetting()
    })
    void synccookiessetting()
  }

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
    schedulefitwindow()
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
    schedulefitwindow()
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
    schedulefitwindow()
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
    const raw = payload && payload.payload ? payload.payload : payload
    const percent = Number(raw && raw.percent != null ? raw.percent : 0)
    const eta = raw && raw.eta ? raw.eta : ''
    const rawstatus = raw && raw.status ? raw.status : 'downloading'
    const phase =
      rawstatus === 'extracting'
        ? 'extracting'
        : percent >= 99.5 ||
            rawstatus === 'processing' ||
            rawstatus === 'transcoding'
          ? 'transcoding'
          : rawstatus === 'downloading'
            ? 'downloading'
            : rawstatus
    const pct = Math.round(percent || 0)
    const detail =
      phase === 'extracting'
        ? eta || 'starting'
        : formatdownloadprogress(percent, eta, phase)
    const dedupekey = phase + '|' + detail
    if (dedupekey === lastdownloadlabel) {
      return
    }
    lastdownloadlabel = dedupekey
    lastdownloadpct = pct
    setlink(phase, detail)
    if (phase === 'transcoding') {
      ensuretranscodepulse()
      sendstatus('transcoding', String(pct))
      return
    }
    cleardownloadpulse()
    if (phase === 'extracting') {
      sendstatus('extracting', eta || 'starting')
      return
    }
    const progressdetail = String(pct) + (eta ? '|' + eta : '')
    sendstatus('download-progress', progressdetail)
  }

  function sendstatus(status, detail) {
    send({ type: 'mediaqueue:status', status: status, detail: detail })
  }

  function measurecontentheight() {
    if (!els.frame) {
      return 0
    }
    return Math.ceil(els.frame.getBoundingClientRect().height)
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
    if (!stream) {
      els.preview.srcObject = null
    } else {
      const previewstream = new MediaStream(stream.getVideoTracks())
      els.preview.srcObject = previewstream
    }
    els.preview.muted = true
    els.preview.classList.toggle('has-stream', Boolean(stream))
    schedulefitwindow()
  }

  function syncplayerlinkstatus() {
    if (playercalls.size > 0) {
      var playing = String(playercalls.size) + ' player(s)'
      setlink('playing', playing)
      writemqstatus('playing|' + playing)
      return
    }
    if (pendingplayercalls.size > 0) {
      var waiting = String(pendingplayercalls.size) + ' player(s) waiting'
      setlink('waiting', waiting)
      writemqstatus('waiting|' + waiting)
      return
    }
    if (playbackstarted && mediastream) {
      setlink('playing', '0 player(s)')
      writemqstatus('playing|0 player(s)')
      return
    }
    writemqstatus('idle|')
  }

  async function fitmainwindow() {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return
    }
    const contentheight = measurecontentheight()
    if (contentheight < 1) {
      return
    }
    try {
      await invoke('resize_main_window', { contentHeight: contentheight })
    } catch (_) {
      // Browser-only preview.
    }
  }

  function startwindowfitobserver() {
    if (!els.frame || typeof ResizeObserver !== 'function') {
      return
    }
    const observer = new ResizeObserver(function () {
      schedulefitwindow()
    })
    observer.observe(els.frame)
  }

  function closeplayercalls() {
    playercalls.forEach(function (entry) {
      try {
        entry.call.close()
      } catch (_) {}
    })
    playercalls.clear()
  }

  function closependingplayercalls() {
    pendingplayercalls.forEach(function (call) {
      try {
        call.close()
      } catch (_) {}
    })
    pendingplayercalls.clear()
  }

  function wireplayercallcleanup(call, peerid) {
    call.on('close', function () {
      playercalls.delete(peerid)
      pendingplayercalls.delete(peerid)
      syncplayerlinkstatus()
    })
    call.on('error', function () {
      playercalls.delete(peerid)
      pendingplayercalls.delete(peerid)
      syncplayerlinkstatus()
    })
  }

  function answerplayercall(call) {
    if (!mediastream) {
      return false
    }
    call.answer(mediastream)
    playercalls.set(call.peer, { call: call, answerstream: mediastream })
    pendingplayercalls.delete(call.peer)
    return true
  }

  function answerpendingplayercalls() {
    if (!mediastream) {
      return
    }
    pendingplayercalls.forEach(function (call) {
      answerplayercall(call)
    })
    pendingplayercalls.clear()
    publishstreamtoplayers()
    syncplayerlinkstatus()
  }

  function publishstreamtoplayers() {
    if (!mediastream) {
      return
    }
    playercalls.forEach(function (entry) {
      var pc = entry.call.peerConnection
      if (!pc) {
        return
      }
      var senders = pc.getSenders()
      mediastream.getTracks().forEach(function (track) {
        var sender = null
        for (var i = 0; i < senders.length; ++i) {
          if (senders[i].track && senders[i].track.kind === track.kind) {
            sender = senders[i]
            break
          }
        }
        if (sender && sender.track === track) {
          return
        }
        if (sender) {
          try {
            pc.removeTrack(sender)
          } catch (_) {}
        }
        try {
          pc.addTrack(track, mediastream)
        } catch (_) {}
      })
    })
  }

  function handleplayercall(call) {
    var meta = call.metadata || {}
    if (meta.kind !== 'mediaqueue') {
      return
    }
    wireplayercallcleanup(call, call.peer)
    if (answerplayercall(call)) {
      publishstreamtoplayers()
      syncplayerlinkstatus()
      return
    }
    pendingplayercalls.set(call.peer, call)
    syncplayerlinkstatus()
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

  async function endcall(opts) {
    clearendedlistener()
    const hadcall = Boolean(
      playercalls.size > 0 ||
        pendingplayercalls.size > 0 ||
        mediastream ||
        playbackstarted,
    )
    const naturalend = Boolean(opts && opts.natural)
    const keepplayers = Boolean(opts && opts.keepplayers)
    if (!keepplayers) {
      closeplayercalls()
      closependingplayercalls()
    }
    stopmediastream()
    if (playbackstarted && window.mqplayback) {
      await window.mqplayback.stopplayback()
      playbackstarted = false
    }
    currentplaybackurl = ''
    currentplaybacktitle = ''
    if (hadcall && !naturalend) {
      sendstatus('call-stopped')
    }
  }

  function wireplaybackended(sourcevideo) {
    clearendedlistener()
    if (!sourcevideo) {
      return
    }
    endedvideo = sourcevideo
    function onended() {
      clearendedlistener()
      sendstatus('playback-ended', '')
      void endcall({ natural: true })
      setlink('connected', 'playback ended')
    }
    sourcevideo.__mqonended = onended
    sourcevideo.addEventListener('ended', onended)
  }

  async function startplaybackandcall(url) {
    if (!peer || !peer.open) {
      setlink('error', 'peer not ready')
      return
    }
    if (!dataconnection || !dataconnection.open) {
      setlink('waiting', 'cafe not connected yet')
      return
    }
    if (mediastream || playbackstarted) {
      await endcall({ keepplayers: true })
    }
    if (!window.mqplayback) {
      setlink('error', 'playback module missing')
      return
    }
    let path = ''
    let playback = null
    try {
      const devpath = readdevplaybackpath()
      if (devpath) {
        path = devpath
        currentplaybacktitle = 'dev fixture'
        currentplaybackurl = url || 'dev://fixture'
        setlink('buffering', path)
        sendstatus('buffering', path)
        playback = await window.mqplayback.startplayback(path)
        mediastream = playback.stream
      } else {
        downloadinflight = true
        lastdownloadpct = -1
        lastdownloadlabel = ''
        setlink('extracting', 'starting')
        sendstatus('extracting', 'starting')
        startdownloadpoll()
        const ready = await window.mqplayback.startdownload(url)
        path = ready && ready.path ? ready.path : ''
        currentplaybacktitle =
          ready && ready.title ? String(ready.title).trim() : ''
        handledownloadprogress({ percent: 100, status: 'downloading' })
        sendstatus('download-progress', '100|')
        const label = playbacklabel(currentplaybacktitle, url, path)
        setlink('buffering', label)
        sendstatus('buffering', label)
        playback = await window.mqplayback.startplayback(path, {
          audioOnly: Boolean(ready && ready.audioOnly),
        })
        mediastream = playback.stream
      }
    } catch (err) {
      const phase = path ? 'playback-failed' : 'download-failed'
      const message = shortenerr(err)
      setlink('error', phase + ': ' + message)
      sendstatus(phase, message)
      await endcall()
      return
    } finally {
      if (!readdevplaybackpath()) {
        downloadinflight = false
        lastdownloadpct = -1
        cleardownloadpulse()
        cleardownloadpoll()
      }
    }
    playbackstarted = true
    currentplaybackurl = url
    if (playback && playback.usespreviewsource) {
      els.preview.classList.add('has-stream')
      schedulefitwindow()
    } else {
      setpreviewstream(mediastream)
    }
    void refreshcachebytes()
    wireplaybackended(
      playback && playback.video
        ? playback.video
        : playback && playback.audio
          ? playback.audio
          : window.mqplayback && window.mqplayback.readendedelement
            ? window.mqplayback.readendedelement()
            : null,
    )
    answerpendingplayercalls()
    publishstreamtoplayers()
    syncplayerlinkstatus()
    const playinglabel = playbacklabel(currentplaybacktitle, url, path)
    sendstatus('playing', playinglabel)
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
        sendstatus('waiting-for-url', 'add a URL in cafe #media <url>')
        maybeautostartdevfixture()
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
        if (
          playbackstarted &&
          data.url &&
          data.url === currentplaybackurl
        ) {
          break
        }
        void maybeautostartaftergoto(data.url)
        break
      case 'mediaqueue:requestcall':
        if (!playbackstarted && queueurls[queueindex]) {
          void maybeautostartaftergoto(queueurls[queueindex])
        } else if (!playbackstarted) {
          sendstatus('waiting-for-url', 'queue a URL in cafe first')
          maybeautostartdevfixture()
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
      writemqstatus('connected|data open')
      send({
        type: 'mediaqueue:hello',
        protocol: PROTOCOL,
        role: 'helper',
        peerid: localpeerid,
      })
      maybeautostartdevfixture()
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
    peer = new Peer(
      typeof window.mqpeerserveroptions === 'function'
        ? window.mqpeerserveroptions({ debug: 1 })
        : {
            host: PEER_HOST,
            secure: true,
            port: 443,
            debug: 1,
          },
    )
    peer.on('open', function (id) {
      localpeerid = id
      els.localpeer.value = id
      els.copypeer.disabled = false
      setlink('ready', '#queue <peerid> in cafe')
      writemqpeerid(id)
      writemqstatus('ready|peer open')
    })
    peer.on('connection', wiredataconnection)
    peer.on('call', handleplayercall)
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
    const cliline = '#queue "' + localpeerid + '"'
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
    window.mqondownloadprogress = handledownloadprogress
    if (window.mqplayback && window.mqplayback.attachpreview) {
      window.mqplayback.attachpreview(els.preview)
    }
    startwindowfitobserver()
    initcookiessetting()
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
