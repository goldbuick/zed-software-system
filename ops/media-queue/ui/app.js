/* global Peer */
;(function () {
  const PEER_HOST = 'terminal.zed.cafe'
  const PROTOCOL = 'mediaqueue/v1'

  const els = {
    cafepeer: document.getElementById('cafepeer'),
    savepeer: document.getElementById('savepeer'),
    connect: document.getElementById('connect'),
    disconnect: document.getElementById('disconnect'),
    localpeer: document.getElementById('localpeer'),
    link: document.getElementById('link'),
    detail: document.getElementById('detail'),
    queue: document.getElementById('queue'),
    opencapture: document.getElementById('opencapture'),
    stopcall: document.getElementById('stopcall'),
    openbrowser: document.getElementById('openbrowser'),
    preview: document.getElementById('preview'),
  }

  let peer = null
  let dataconnection = null
  let mediastream = null
  let mediacall = null
  let queueurls = []
  let queueindex = 0

  function invoke(cmd, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri API missing'))
    }
    return window.__TAURI__.core.invoke(cmd, args || {})
  }

  function setlink(text, detail) {
    els.link.textContent = text
    els.detail.textContent = detail || ''
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
    els.preview.srcObject = null
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
    const cafeid = (els.cafepeer.value || '').trim()
    if (!peer || !peer.open) {
      setlink('error', 'connect peer first')
      return
    }
    if (!cafeid) {
      setlink('error', 'cafe peer id required')
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
    els.preview.srcObject = mediastream
    mediastream.getVideoTracks().forEach(function (track) {
      track.addEventListener('ended', function () {
        endcall()
        setlink('connected', 'capture ended')
      })
    })
    mediacall = peer.call(cafeid, mediastream)
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
        setlink('connected', 'cafe hello')
        send({
          type: 'mediaqueue:hello',
          protocol: PROTOCOL,
          role: 'helper',
          peerid: peer && peer.id ? peer.id : '',
        })
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
        peerid: peer && peer.id ? peer.id : '',
      })
    })
    conn.on('data', handlecafemessage)
    conn.on('close', function () {
      if (dataconnection === conn) {
        dataconnection = null
      }
      setlink('idle', 'data closed')
    })
    conn.on('error', function (err) {
      setlink('error', String(err))
    })
  }

  function destroypeer() {
    endcall()
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
    els.localpeer.textContent = '-'
    setlink('idle', '')
  }

  function connectpeer() {
    const cafeid = (els.cafepeer.value || '').trim()
    if (!cafeid) {
      setlink('error', 'cafe peer id required')
      return
    }
    destroypeer()
    setlink('dialing', PEER_HOST)
    peer = new Peer({
      host: PEER_HOST,
      secure: true,
      port: 443,
      debug: 1,
    })
    peer.on('open', function (id) {
      els.localpeer.textContent = id
      setlink('peer open', 'connecting data...')
      const conn = peer.connect(cafeid, { reliable: true })
      wiredataconnection(conn)
    })
    peer.on('error', function (err) {
      setlink('error', (err && err.type) || String(err))
    })
    peer.on('disconnected', function () {
      setlink('disconnected', 'signaling lost')
    })
  }

  async function hydrate() {
    try {
      const state = await invoke('get_state')
      if (state && state.cafePeerId) {
        els.cafepeer.value = state.cafePeerId
      }
    } catch (_) {
      // Browser-only preview without Tauri.
    }
    renderqueue()
  }

  els.savepeer.addEventListener('click', function () {
    const peerid = (els.cafepeer.value || '').trim()
    invoke('set_cafe_peer_id', { peerId: peerid })
      .then(function () {
        setlink(els.link.textContent, 'saved peer id')
      })
      .catch(function (err) {
        setlink('error', String(err))
      })
  })

  els.connect.addEventListener('click', connectpeer)
  els.disconnect.addEventListener('click', destroypeer)
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

  void hydrate()
})()
