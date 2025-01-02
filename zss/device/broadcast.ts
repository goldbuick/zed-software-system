import IVSBroadcastClient from 'amazon-ivs-web-broadcast'
import { createdevice } from 'zss/device'
import { doasync } from 'zss/mapping/func'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { api_error } from './api'
import { synthbroadcastdestination } from './synth'

let broadcastclient: MAYBE<IVSBroadcastClient.AmazonIVSBroadcastClient>

const broadcast = createdevice('broadcast', ['second'], (message) => {
  switch (message.target) {
    case 'opensession':
      doasync('broadcast:opensession', async () => {
        if (ispresent(broadcastclient)) {
          api_error(broadcast.name(), 'session', 'session is already open')
        } else {
          const isportrait = window.innerHeight > window.innerWidth
          broadcastclient = IVSBroadcastClient.create({
            ingestEndpoint: 'https://g.webrtc.live-video.net:4443',
            streamConfig: isportrait
              ? IVSBroadcastClient.BASIC_PORTRAIT
              : IVSBroadcastClient.BASIC_LANDSCAPE,
            logLevel: IVSBroadcastClient.LOG_LEVEL.DEBUG,
          })

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
          }
        }
      })
      break
    case 'closesession':
      if (ispresent(broadcastclient)) {
        broadcastclient.delete()
        broadcastclient = undefined
      } else {
        api_error(broadcast.name(), 'session', 'session is already closed')
      }
      break
    case 'startstream':
      break
    case 'stopstream':
      break
  }
})
