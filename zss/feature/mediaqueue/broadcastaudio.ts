import type { WebBroadcastClient } from 'zss/feature/broadcast/webbroadcastclient'
import { MAYBE, ispresent } from 'zss/mapping/types'

const MEDIAQUEUE_BROADCAST_AUDIO_NAME = 'mediaqueue'

let broadcastclient: MAYBE<WebBroadcastClient>
let attachedstream: MAYBE<MediaStream>
let synctail: Promise<void> = Promise.resolve()

/** Bridge sets this next to the live WebBroadcastClient; cleared on stream stop. */
export function mediaqueuesetbroadcastclient(
  client: MAYBE<WebBroadcastClient>,
) {
  broadcastclient = client
  if (!ispresent(client)) {
    attachedstream = undefined
  }
}

export function mediaqueuesetbroadcastaudiogain(gain: number) {
  if (!ispresent(broadcastclient)) {
    return
  }
  broadcastclient.setaudioinputgain(
    MEDIAQUEUE_BROADCAST_AUDIO_NAME,
    Math.max(0, Math.min(1, gain)),
  )
}

async function applybroadcastaudiosync(
  stream: MAYBE<MediaStream>,
  gain: number,
) {
  if (!ispresent(broadcastclient)) {
    attachedstream = undefined
    return
  }
  const tracks = ispresent(stream) ? stream.getAudioTracks() : []
  const next = tracks.length > 0 ? stream : undefined
  if (next === attachedstream) {
    mediaqueuesetbroadcastaudiogain(gain)
    return
  }
  if (ispresent(attachedstream)) {
    broadcastclient.removeaudioinputdevice(MEDIAQUEUE_BROADCAST_AUDIO_NAME)
    attachedstream = undefined
  }
  if (!ispresent(next)) {
    return
  }
  await broadcastclient.addaudioinputdevice(
    next,
    MEDIAQUEUE_BROADCAST_AUDIO_NAME,
  )
  attachedstream = next
  mediaqueuesetbroadcastaudiogain(gain)
}

/** Mix board TV audio into the live broadcast compositor, or remove it. */
export function mediaqueuesyncbroadcastaudio(
  stream: MAYBE<MediaStream>,
  gain: number,
) {
  synctail = synctail.then(
    () => applybroadcastaudiosync(stream, gain),
    () => applybroadcastaudiosync(stream, gain),
  )
}
