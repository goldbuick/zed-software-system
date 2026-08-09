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
const frame = document.querySelector('.frame')

function fitwindow() {
  if (!frame) {
    return
  }
  const rect = frame.getBoundingClientRect()
  void window.relay.resizeToContent(rect.width, rect.height)
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
  detail.textContent = state.statusdetail || ''
  whip.textContent = state.whipUrl || ''
  logs.value = (state.logs || []).join('\n')
  statusbox.classList.toggle('error', state.status === 'error')
  const running = Boolean(state.running)
  startbtn.disabled = running
  stopbtn.disabled = !running
}

async function refresh() {
  render(await window.relay.getState())
  requestAnimationFrame(fitwindow)
}

document.getElementById('savekey').onclick = async () => {
  render(await window.relay.setYoutubeKey(ytkey.value))
}

document.getElementById('copybearer').onclick = async () => {
  await window.relay.copyBearer()
}

document.getElementById('regen').onclick = async () => {
  render(await window.relay.regenerateBearer())
}

startbtn.onclick = async () => {
  await window.relay.setYoutubeKey(ytkey.value)
  try {
    render(await window.relay.start())
  } catch (err) {
    detail.textContent = err.message || String(err)
    statusbox.classList.add('error')
  }
  requestAnimationFrame(fitwindow)
}

stopbtn.onclick = async () => {
  render(await window.relay.stop())
  requestAnimationFrame(fitwindow)
}

document.getElementById('releases').onclick = async () => {
  await window.relay.openReleases()
}

window.relay.onState(render)
document.fonts.ready.then(() => {
  void refresh()
  fitwindow()
})
window.addEventListener('load', fitwindow)
setInterval(() => {
  void window.relay.refreshLogs().then(render)
}, 2000)
