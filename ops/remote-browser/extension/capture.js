let mediastream
let peerconnection

function waitice(pc) {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', onchange)
      resolve()
    }
    const onchange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer)
        finish()
      }
    }
    const timer = setTimeout(finish, 3000)
    pc.addEventListener('icegatheringstatechange', onchange)
  })
}

async function findcontenttabid() {
  const tabs = await chrome.tabs.query({})
  const self = await chrome.tabs.getCurrent()
  const selfid = self && self.id
  const content = tabs.find((tab) => {
    if (tab.id === selfid) {
      return false
    }
    const url = String(tab.url || '')
    return !url.startsWith('chrome-extension://')
  })
  if (!content || typeof content.id !== 'number') {
    throw new Error('content tab not found')
  }
  return content.id
}

async function startcapture() {
  const targettabid = await findcontenttabid()
  const res = await chrome.runtime.sendMessage({
    type: 'streamid',
    targetTabId: targettabid,
  })
  if (!res || res.error) {
    throw new Error(res && res.error ? res.error : 'tab capture stream id failed')
  }
  if (mediastream) {
    for (const track of mediastream.getTracks()) {
      track.stop()
    }
  }
  mediastream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: res.id,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: res.id,
      },
    },
  })
  return {
    audio: mediastream.getAudioTracks().length,
    video: mediastream.getVideoTracks().length,
  }
}

async function whepoffer(sdp) {
  if (!mediastream) {
    throw new Error('tab capture is not running')
  }
  if (peerconnection) {
    peerconnection.close()
    peerconnection = undefined
  }
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' })
  peerconnection = pc
  for (const track of mediastream.getTracks()) {
    pc.addTrack(track, mediastream)
  }
  await pc.setRemoteDescription({ type: 'offer', sdp })
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  await waitice(pc)
  const localsdp = pc.localDescription && pc.localDescription.sdp
  if (!localsdp) {
    throw new Error('missing local sdp')
  }
  return localsdp
}

function stopwhep() {
  if (peerconnection) {
    peerconnection.close()
    peerconnection = undefined
  }
}

function capturing() {
  return Boolean(mediastream && mediastream.active)
}

window.__cafecapture = {
  startcapture,
  whepoffer,
  stopwhep,
  capturing,
}
