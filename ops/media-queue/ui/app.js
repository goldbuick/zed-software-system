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
  let queueurls = []
  let queueindex = 0
  let cafemediapeerid = ''
  let localpeerid = ''
  let playbackstarted = false
  let pendinggoto = false
  let currentplaybackurl = ''
  let cachebytes = 0
  let downloadinflight = false
  let lastdownloadpct = -1
  let lastdownloadlabel = ''
  let transcodepulsetimer = null
  let downloadpolltimer = null
  let endedvideo = null

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
          const phase = String(
            state && state.phase ? state.phase : 'downloading',
          ).toLowerCase()
          handledownloadprogress({
            percent: Number(state.percent),
            eta: '',
            status: phase === 'downloading' ? 'downloading' : phase,
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
    els.preview.srcObject = stream || null
    els.preview.classList.toggle('has-stream', Boolean(stream))
    schedulefitwindow()
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
        if (sender) {
          void sender.replaceTrack(track)
        } else {
          try {
            pc.addTrack(track, mediastream)
          } catch (_) {}
        }
      })
    })
  }

  function handleplayercall(call) {
    var meta = call.metadata || {}
    if (meta.kind !== 'mediaqueue') {
      return
    }
    var answerstream = mediastream || new MediaStream()
    call.answer(answerstream)
    playercalls.set(call.peer, { call: call, answerstream: answerstream })
    call.on('close', function () {
      playercalls.delete(call.peer)
    })
    call.on('error', function () {
      playercalls.delete(call.peer)
    })
    if (mediastream) {
      publishstreamtoplayers()
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

  async function endcall(opts) {
    clearendedlistener()
    const hadcall = Boolean(playercalls.size > 0 || mediastream || playbackstarted)
    const naturalend = Boolean(opts && opts.natural)
    closeplayercalls()
    stopmediastream()
    if (playbackstarted && window.mqplayback) {
      await window.mqplayback.stopplayback()
      playbackstarted = false
    }
    currentplaybackurl = ''
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
    if (playercalls.size > 0 || mediastream || playbackstarted) {
      await endcall()
    }
    if (!window.mqplayback) {
      setlink('error', 'playback module missing')
      return
    }
    let path = ''
    let playback = null
    try {
      downloadinflight = true
      lastdownloadpct = -1
      lastdownloadlabel = ''
      setlink('extracting', 'starting')
      sendstatus('extracting', 'starting')
      startdownloadpoll()
      const ready = await window.mqplayback.startdownload(url)
      path = ready && ready.path ? ready.path : ''
      handledownloadprogress({ percent: 100, status: 'downloading' })
      sendstatus('download-progress', '100|')
      const shortpath = mediabasename(path)
      setlink('buffering', shortpath)
      sendstatus('buffering', shortpath)
      playback = await window.mqplayback.startplayback(path)
      mediastream = playback.stream
    } catch (err) {
      const phase = path ? 'playback-failed' : 'download-failed'
      const message = shortenerr(err)
      setlink('error', phase + ': ' + message)
      sendstatus(phase, message)
      await endcall()
      return
    } finally {
      downloadinflight = false
      lastdownloadpct = -1
      cleardownloadpulse()
      cleardownloadpoll()
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
    wireplaybackended(playback && playback.video ? playback.video : null)
    publishstreamtoplayers()
    setlink('playing', String(playercalls.size) + ' player(s)')
    sendstatus('playing', String(playercalls.size))
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
      setlink('ready', '#media <peerid> in cafe')
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
