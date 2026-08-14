'use strict'

const ytkey = document.getElementById('ytkey')
const bearer = document.getElementById('bearer')
const statusel = document.getElementById('status')
const detail = document.getElementById('detail')
const whip = document.getElementById('whip')
const logs = document.getElementById('logs')
const statusbox = document.getElementById('statusbox')
const startbtn = document.getElementById('start')
const stopbtn = document.getElementById('stop')

function invoke(cmd, args) {
  return window.__TAURI__.core.invoke(cmd, args)
}

function listen(event, cb) {
  return window.__TAURI__.event.listen(event, (e) => cb(e.payload))
}

function render(state) {
  if (!state) {
    return
  }
  if (document.activeElement !== ytkey) {
    ytkey.value = state.youtubeStreamKey || ''
  }
  bearer.value = state.localBearer || ''
  statusel.textContent = state.status || 'idle'
  detail.textContent = state.statusDetail || ''
  whip.textContent = state.whipUrl || ''
  logs.value = (state.logs || []).join('\n')
  statusbox.classList.toggle('error', state.status === 'error')
  const running = Boolean(state.running)
  startbtn.disabled = running
  stopbtn.disabled = !running
}

async function refresh() {
  render(await invoke('get_state'))
}

document.getElementById('savekey').onclick = async () => {
  render(await invoke('set_youtube_key', { key: ytkey.value }))
}

document.getElementById('copybearer').onclick = async () => {
  await invoke('copy_bearer')
}

document.getElementById('regen').onclick = async () => {
  render(await invoke('regenerate_bearer'))
}

startbtn.onclick = async () => {
  await invoke('set_youtube_key', { key: ytkey.value })
  try {
    render(await invoke('start_relay'))
  } catch (err) {
    detail.textContent = err.message || String(err)
    statusbox.classList.add('error')
  }
}

stopbtn.onclick = async () => {
  render(await invoke('stop_relay'))
}

document.getElementById('releases').onclick = async () => {
  await invoke('open_releases')
}

void listen('relay-state', render)
document.fonts.ready.then(() => {
  void refresh()
})
setInterval(() => {
  void invoke('refresh_logs').then(render).catch(() => {})
}, 1500)
