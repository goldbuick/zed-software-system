import IVSBroadcastClient, { Callback } from 'amazon-ivs-web-broadcast'
import { createdevice } from 'zss/device'
import { write, writeheader, writeoption } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { api_error } from './api'
import { synthbroadcastdestination } from './synth'

let broadcastclient: MAYBE<IVSBroadcastClient.AmazonIVSBroadcastClient>

const broadcast = createdevice('broadcast', ['second'], (message) => {
  if (!broadcast.session(message)) {
    return
  }
  switch (message.target) {
    case 'startstream':
      doasync(broadcast, async () => {
        if (ispresent(broadcastclient)) {
          api_error(broadcast, 'session', 'session is already open')
        } else {
          const isportrait = window.innerHeight > window.innerWidth
          broadcastclient = IVSBroadcastClient.create({
            streamConfig: isportrait
              ? IVSBroadcastClient.STANDARD_PORTRAIT
              : IVSBroadcastClient.STANDARD_LANDSCAPE,
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
              write(broadcast, state)
            } as Callback,
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ERROR,
            function (error: string) {
              api_error(broadcast, 'connection', error)
              broadcastclient = undefined
            } as Callback,
          )

          // pull visual content from canvas
          const video = document.querySelector('canvas')
          if (ispresent(video)) {
            await broadcastclient.addImageSource(video, 'video', { index: 1 })
          } else {
            api_error(broadcast, 'video', 'unabled to find canvas element')
            broadcastclient = undefined
            return
          }

          // pull audio content from tonejs
          const audio = synthbroadcastdestination()
          if (ispresent(audio)) {
            await broadcastclient.addAudioInputDevice(audio.stream, 'audio')
          } else {
            api_error(
              broadcast,
              'video',
              'unable create media audio node destination',
            )
            broadcastclient = undefined
            return
          }

          // signal success
          write(broadcast, `created client`)
        }
        if (isstring(message.data) && ispresent(broadcastclient)) {
          writeheader(broadcast, 'broadcasting in')
          writeoption(broadcast, '3', '...')
          await waitfor(1000)
          writeoption(broadcast, '2', '...')
          await waitfor(1000)
          writeoption(broadcast, '1', '...')
          await waitfor(1000)
          writeheader(broadcast, 'GOING LIVE')
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
        broadcastclient.delete()
        broadcastclient = undefined
        write(broadcast, `closed client`)
      } else {
        api_error(broadcast, 'session', 'need an active session to stop stream')
      }
      break
  }
})
