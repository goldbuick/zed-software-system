/* global Peer, mqcapture */
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
  let capturestarted = false
  let pendinggoto = false

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  const MAIN_HEIGHT_IDLE = 464
  const MAIN_HEIGHT_PREVIEW = 604

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

  async function navigatebrowser(url) {
    if (!url) {
      return
    }
    try {
      await invoke('open_browser', { url: url })
      sendstatus('navigated', url)
    } catch (err) {
      setlink('error', String(err))
      sendstatus('navigate-error', String(err))
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
    const hadcall = Boolean(mediacall || mediastream || capturestarted)
    if (mediacall) {
      try {
        mediacall.close()
      } catch (_) {}
      mediacall = null
    }
    stopmediastream()
    if (capturestarted && window.mqcapture) {
      await window.mqcapture.stopbrowsercapture()
      capturestarted = false
    }
    if (hadcall) {
      sendstatus('call-stopped')
    }
  }

  async function startcaptureandcall() {
    const cafeid = (cafemediapeerid || '').trim()
    if (!peer || !peer.open) {
      setlink('error', 'peer not ready')
      return
    }
    if (!cafeid) {
      setlink('waiting', 'cafe not connected yet')
      return
    }
    if (mediacall || mediastream || capturestarted) {
      await endcall()
    }
    if (!window.mqcapture) {
      setlink('error', 'capture module missing')
      return
    }
    try {
      mediastream = await window.mqcapture.startbrowsercapture()
    } catch (err) {
      setlink('error', 'capture failed: ' + err)
      sendstatus('capture-denied', String(err))
      return
    }
    capturestarted = true
    setpreviewstream(mediastream)
    mediastream.getVideoTracks().forEach(function (track) {
      track.addEventListener('ended', function () {
        void endcall()
        setlink('connected', 'capture ended')
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
    setlink('capturing', cafeid)
    sendstatus('capturing', cafeid)
  }

  async function maybeautostartaftergoto(url) {
    if (capturestarted || pendinggoto) {
      return
    }
    pendinggoto = true
    try {
      if (!window.mqcapture) {
        return
      }
      const ready = window.mqcapture.waitbrowserready(20000)
      await navigatebrowser(url)
      await ready
      await new Promise(function (resolve) {
        setTimeout(resolve, 500)
      })
      await startcaptureandcall()
    } catch (err) {
      setlink('error', String(err))
      sendstatus('capture-denied', String(err))
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
        sendstatus('waiting-for-url', 'add a URL in cafe #media scroll')
        break
      case 'mediaqueue:queue':
        queueurls = Array.isArray(data.urls) ? data.urls.slice() : []
        queueindex = typeof data.index === 'number' ? data.index : 0
        renderqueue()
        break
      case 'mediaqueue:goto':
        queueindex = typeof data.index === 'number' ? data.index : queueindex
        renderqueue()
        void maybeautostartaftergoto(data.url)
        break
      case 'mediaqueue:requestcall':
        if (!capturestarted && queueurls[queueindex]) {
          void maybeautostartaftergoto(queueurls[queueindex])
        } else if (!capturestarted) {
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
    try {
      await invoke('copy_text', { text: localpeerid })
      setlink(els.link.textContent, 'copied to clipboard')
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

  function bootfit() {
    renderqueue()
    startpeer()
    window.addEventListener('mq-audio-error', function (event) {
      sendstatus('audio-denied', event.detail || '')
    })
    void fitmainwindow()
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(bootfit)
  } else {
    window.addEventListener('load', bootfit)
  }
})()
