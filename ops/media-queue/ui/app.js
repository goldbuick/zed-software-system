/* global Peer */
;(function () {
  const PEER_HOST = 'terminal.zed.cafe'
  const PROTOCOL = 'mediaqueue/v1'

  const els = {
    localpeer: document.getElementById('localpeer'),
    copypeer: document.getElementById('copypeer'),
    link: document.getElementById('link'),
    detail: document.getElementById('detail'),
    queue: document.getElementById('queue'),
    opencapture: document.getElementById('opencapture'),
    stopcall: document.getElementById('stopcall'),
    openbrowser: document.getElementById('openbrowser'),
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

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  function setlink(text, detail) {
    els.link.textContent = text
    els.detail.textContent = detail || ''
    els.statusbox.classList.toggle('error', text === 'error')
  }

  function renderqueue() {
    if (!queueurls.length) {
      els.queue.value = '(empty)'
      return
    }
    els.queue.value = queueurls
      .map(function (url, i) {
        return (i === queueindex ? '> ' : '  ') + '[' + i + '] ' + url
      })
      .join('\n')
    schedulefitwindow()
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
    }, 0)
  }

  function setpreviewstream(stream) {
    els.preview.srcObject = stream || null
    els.preview.classList.toggle('has-stream', Boolean(stream))
    schedulefitwindow()
  }

  async function fitmainwindow() {
    if (!window.__TAURI__ || !window.__TAURI__.webviewWindow) {
      return
    }
    const root = els.frame || document.body
    try {
      const win = window.__TAURI__.webviewWindow.getCurrentWebviewWindow()
      const dpi = window.__TAURI__.dpi
      const rect = root.getBoundingClientRect()
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      if (width < 1 || height < 1) {
        return
      }
      await win.setSize(new dpi.LogicalSize(width, height))
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
    schedulefitwindow()
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

  function endcall() {
    if (mediacall) {
      try {
        mediacall.close()
      } catch (_) {}
      mediacall = null
    }
    stopmediastream()
    sendstatus('call-stopped')
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
    endcall()
    try {
      mediastream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
    } catch (err) {
      setlink('error', 'capture denied: ' + err)
      sendstatus('capture-denied', String(err))
      return
    }
    setpreviewstream(mediastream)
    mediastream.getVideoTracks().forEach(function (track) {
      track.addEventListener('ended', function () {
        endcall()
        setlink('connected', 'capture ended')
      })
    })
    mediacall = peer.call(cafeid, mediastream, {
      metadata: { kind: 'mediaqueue', source: 'helper' },
    })
    mediacall.on('close', function () {
      mediacall = null
      stopmediastream()
    })
    mediacall.on('error', function (err) {
      setlink('error', 'call: ' + err)
      endcall()
    })
    setlink('calling', cafeid)
    sendstatus('calling', cafeid)
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
        void startcaptureandcall()
        break
      case 'mediaqueue:queue':
        queueurls = Array.isArray(data.urls) ? data.urls.slice() : []
        queueindex = typeof data.index === 'number' ? data.index : 0
        renderqueue()
        break
      case 'mediaqueue:goto':
        queueindex = typeof data.index === 'number' ? data.index : queueindex
        renderqueue()
        void navigatebrowser(data.url)
        break
      case 'mediaqueue:requestcall':
        void startcaptureandcall()
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
      endcall()
      setlink('ready', 'waiting for cafe')
    })
    conn.on('error', function (err) {
      setlink('error', String(err))
    })
  }

  function destroypeer() {
    endcall()
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
      setlink('ready', 'paste id into cafe #media')
      schedulefitwindow()
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

  els.opencapture.addEventListener('click', function () {
    void startcaptureandcall()
  })
  els.stopcall.addEventListener('click', endcall)
  els.openbrowser.addEventListener('click', function () {
    const url =
      queueurls[queueindex] ||
      window.prompt('URL to open in browser window', 'https://')
    if (url) {
      void navigatebrowser(url)
    }
  })

  if (typeof ResizeObserver !== 'undefined' && els.frame) {
    const observer = new ResizeObserver(function () {
      schedulefitwindow()
    })
    observer.observe(els.frame)
  }

  function bootfit() {
    renderqueue()
    startpeer()
    schedulefitwindow()
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(bootfit)
  } else {
    window.addEventListener('load', bootfit)
  }
})()
