import IVSBroadcastClient, { Callback } from 'amazon-ivs-web-broadcast'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { write } from 'zss/words/writeui'

import { api_error } from './api'
import { synthbroadcastdestination } from './synth'

let broadcastclient: MAYBE<IVSBroadcastClient.AmazonIVSBroadcastClient>

const broadcast = createdevice('broadcast', ['second'], (message) => {
  switch (message.target) {
    case 'createsession':
      doasync('broadcast:createsession', async () => {
        if (ispresent(broadcastclient)) {
          api_error(broadcast.name(), 'session', 'session is already open')
        } else {
          const isportrait = window.innerHeight > window.innerWidth
          broadcastclient = IVSBroadcastClient.create({
            streamConfig: isportrait
              ? IVSBroadcastClient.BASIC_PORTRAIT
              : IVSBroadcastClient.BASIC_LANDSCAPE,
            logLevel: IVSBroadcastClient.LOG_LEVEL.DEBUG,
          })

          // event handlers
          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ACTIVE_STATE_CHANGE,
            // @ts-expect-error wow?
            function (activestate: boolean) {
              console.info({ activestate })
            },
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.CONNECTION_STATE_CHANGE,
            function (state: string) {
              write(broadcast.name(), state)
            } as Callback,
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ERROR,
            function (error: string) {
              api_error(broadcast.name(), 'connection', error)
              broadcastclient = undefined
            } as Callback,
          )

          // pull visual content from canvas
          const video = document.querySelector('canvas')
          if (ispresent(video)) {
            await broadcastclient.addImageSource(video, 'video', { index: 1 })
          } else {
            api_error(
              broadcast.name(),
              'video',
              'unabled to find canvas element',
            )
            broadcastclient = undefined
            return
          }

          // pull audio content from tonejs
          const audio = synthbroadcastdestination()
          if (ispresent(audio)) {
            await broadcastclient.addAudioInputDevice(audio.stream, 'audio')
          } else {
            api_error(
              broadcast.name(),
              'video',
              'unable create media audio node destination',
            )
            broadcastclient = undefined
            return
          }

          // signal success
          write(broadcast.name(), `created client`)
        }
      })
      break
    case 'closesession':
      if (ispresent(broadcastclient)) {
        broadcastclient.delete()
        broadcastclient = undefined
        write(broadcast.name(), `closed client`)
      } else {
        api_error(broadcast.name(), 'session', 'session is already closed')
      }
      break
    case 'startstream':
      doasync('broadcast:startstream', async () => {
        if (isstring(message.data) && ispresent(broadcastclient)) {
          await broadcastclient.startBroadcast(
            message.data,
            'https://g.webrtc.live-video.net:4443',
          )
        }
      })
      break
    case 'stopstream':
      if (ispresent(broadcastclient)) {
        broadcastclient.stopBroadcast()
      } else {
        api_error(
          broadcast.name(),
          'session',
          'need an active session to stop stream',
        )
      }
      break
  }
})
