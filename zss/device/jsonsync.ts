import { createdevice } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import {
  JSONSYNC_PATCH_PAYLOAD,
  type JSONSYNC_RECEIVER_STATE,
  JSONSYNC_SNAPSHOT_PAYLOAD,
  jsonsyncapplypatch,
  jsonsyncapplysnapshot,
  jsonsynccreatereceiverstate,
  jsonsyncstreamkey,
} from 'zss/feature/jsonsync'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

export type JSONSYNC_ONUPDATE = (args: {
  player: string
  streamid: string
  document: unknown
  expectednextseq: number
}) => void

export type JSONSYNC_ONNEEDSNAPSHOT = (args: {
  message: MESSAGE
  streamid: string
}) => void

let receiverstate: JSONSYNC_RECEIVER_STATE = jsonsynccreatereceiverstate()
let onupdate: MAYBE<JSONSYNC_ONUPDATE>
let onneedsnapshot: MAYBE<JSONSYNC_ONNEEDSNAPSHOT>

export function jsonsyncsethooks(hooks: {
  onupdate?: JSONSYNC_ONUPDATE
  onneedsnapshot?: JSONSYNC_ONNEEDSNAPSHOT
}) {
  onupdate = hooks.onupdate
  onneedsnapshot = hooks.onneedsnapshot
}

export function jsonsyncreadreceiverstate(): JSONSYNC_RECEIVER_STATE {
  return receiverstate
}

export function jsonsyncresetreceiverstate() {
  receiverstate = jsonsynccreatereceiverstate()
}

const jsonsyncdevice = createdevice('jsonsync', [], (message) => {
  if (!jsonsyncdevice.session(message)) {
    return
  }

  switch (message.target) {
    case 'snapshot': {
      const payload = message.data as JSONSYNC_SNAPSHOT_PAYLOAD
      const result = jsonsyncapplysnapshot(receiverstate, payload)
      if (result.ok) {
        receiverstate = result.state
        const key = jsonsyncstreamkey(payload.streamid)
        const stream = receiverstate.streams.get(key)
        if (ispresent(stream)) {
          onupdate?.({
            player: message.player,
            streamid: key,
            document: stream.document,
            expectednextseq: stream.expectednextseq,
          })
        }
      } else {
        jsonsyncdevice.reply(message, 'needsnapshot', {
          streamid: payload.streamid,
        })
      }
      break
    }
    case 'patch': {
      const payload = message.data as JSONSYNC_PATCH_PAYLOAD
      const result = jsonsyncapplypatch(receiverstate, payload)
      if (result.ok) {
        receiverstate = result.state
        const key = jsonsyncstreamkey(payload.streamid)
        const stream = receiverstate.streams.get(key)
        if (ispresent(stream)) {
          onupdate?.({
            player: message.player,
            streamid: key,
            document: stream.document,
            expectednextseq: stream.expectednextseq,
          })
        }
      } else {
        jsonsyncdevice.reply(message, 'needsnapshot', {
          streamid: payload.streamid,
        })
      }
      break
    }
    case 'needsnapshot': {
      const data = message.data as { streamid?: string } | undefined
      const streamid = isstring(data?.streamid) ? data.streamid : ''
      onneedsnapshot?.({ message, streamid })
      break
    }
    default:
      break
  }
})
