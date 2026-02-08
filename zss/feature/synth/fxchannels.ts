import { Channel, getContext } from 'tone'

import { volumetodb } from './fx'

export function createfxchannels(index: number) {
  const prefix = getContext().isOffline ? 'offline' : ''
  const fc = new Channel(volumetodb(0))
  const echo = new Channel(volumetodb(0))
  const reverb = new Channel(volumetodb(0))
  const autofilter = new Channel(volumetodb(0))
  const vibrato = new Channel(volumetodb(0))
  const distortion = new Channel(volumetodb(0))
  const autowah = new Channel(volumetodb(0))
  fc.receive(`${prefix}fc${index}`)
  echo.receive(`${prefix}echo${index}`)
  reverb.receive(`${prefix}reverb${index}`)
  autofilter.receive(`${prefix}autofilter${index}`)
  vibrato.receive(`${prefix}vibrato${index}`)
  distortion.receive(`${prefix}distortion${index}`)
  autowah.receive(`${prefix}autowah${index}`)

  const sendtofx = new Channel()
  sendtofx.send(`${prefix}fc${index}`)
  sendtofx.send(`${prefix}echo${index}`)
  sendtofx.send(`${prefix}reverb${index}`)
  sendtofx.send(`${prefix}autofilter${index}`)
  sendtofx.send(`${prefix}vibrato${index}`)
  sendtofx.send(`${prefix}distortion${index}`)
  sendtofx.send(`${prefix}autowah${index}`)

  function getreplay() {
    return {
      fc: fc.volume.value,
      echo: echo.volume.value,
      reverb: reverb.volume.value,
      autofilter: autofilter.volume.value,
      vibrato: vibrato.volume.value,
      distortion: distortion.volume.value,
      autowah: autowah.volume.value,
    }
  }

  function setreplay(replay: ReturnType<typeof getreplay>) {
    fc.volume.value = replay.fc
    echo.volume.value = replay.echo
    reverb.volume.value = replay.reverb
    autofilter.volume.value = replay.autofilter
    vibrato.volume.value = replay.vibrato
    distortion.volume.value = replay.distortion
    autowah.volume.value = replay.autowah
  }

  function applyreset() {
    fc.volume.value = volumetodb(0)
    echo.volume.value = volumetodb(0)
    reverb.volume.value = volumetodb(0)
    autofilter.volume.value = volumetodb(0)
    vibrato.volume.value = volumetodb(0)
    distortion.volume.value = volumetodb(0)
    autowah.volume.value = volumetodb(0)
  }

  function destroy() {
    fc.dispose()
    echo.dispose()
    reverb.dispose()
    autofilter.dispose()
    vibrato.dispose()
    distortion.dispose()
    autowah.dispose()
    sendtofx.dispose()
  }

  return {
    sendtofx,
    fc,
    echo,
    reverb,
    autofilter,
    vibrato,
    distortion,
    autowah,
    fcrush: fc,
    distort: distortion,
    getreplay,
    setreplay,
    applyreset,
    destroy,
  }
}
