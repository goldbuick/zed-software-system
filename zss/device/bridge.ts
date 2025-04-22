import { ChatClient } from '@twurple/chat'
import IVSBroadcastClient, { Callback } from 'amazon-ivs-web-broadcast'
import { objectFromEntries } from 'ts-extras'
import { createdevice } from 'zss/device'
import { peerserver, peerclient } from 'zss/feature/peer'
import {
  userscreenstart,
  userscreenstop,
  uservoicestart,
  uservoicestop,
} from 'zss/feature/usermedia'
import {
  write,
  writecopyit,
  writeheader,
  writeoption,
} from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { shorturl } from 'zss/mapping/url'
import { NAME } from 'zss/words/types'

import { api_error, vm_loader } from './api'
import { registerreadplayer } from './register'
import { SOFTWARE } from './session'
import { synthbroadcastdestination } from './synth'

let twitchchatclient: MAYBE<ChatClient>
let broadcastclient: MAYBE<IVSBroadcastClient.AmazonIVSBroadcastClient>

async function runnetworkfetch(
  player: string,
  arg: any,
  label: string,
  url: string,
  method: string,
  words: any[],
) {
  let response: MAYBE<Response>
  switch (NAME(method)) {
    case 'get': {
      response = await fetch(url)
      break
    }
    case 'post:json': {
      const entries: [string, any][] = []
      for (let i = 0; i < words.length; i += 2) {
        entries.push([words[i], words[i + 1]])
      }
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectFromEntries(entries)),
      })
      break
    }
  }
  if (!response?.ok) {
    return
  }
  const eventname = `fetch:${label}`
  const [contenttype] = (response.headers.get('content-type') ?? '').split(';')
  switch (contenttype) {
    case 'text/plain': {
      const content = await response.text()
      write(SOFTWARE, player, JSON.stringify(content))
      vm_loader(SOFTWARE, player, arg, 'text', eventname, content)
      break
    }
    case 'application/json': {
      const content = await response.json()
      write(SOFTWARE, player, JSON.stringify(content))
      vm_loader(SOFTWARE, player, arg, 'json', eventname, content)
      break
    }
    case 'application/octet-stream': {
      const content = await response.arrayBuffer()
      vm_loader(
        SOFTWARE,
        player,
        arg,
        'binary',
        eventname,
        new Uint8Array(content),
      )
      break
    }
  }
}

const bridge = createdevice('bridge', [], (message) => {
  if (!bridge.session(message)) {
    return
  }

  // player filter
  const player = registerreadplayer()
  switch (message.target) {
    default:
      if (message.player !== player) {
        return
      }
      break
  }

  switch (message.target) {
    case 'fetch':
      if (isarray(message.data)) {
        // arg, label, url, method, words
        const [maybearg, label, url, method, words] = message.data as [
          any,
          string,
          string,
          string,
          any[],
        ]
        doasync(SOFTWARE, message.player, async () => {
          await runnetworkfetch(
            message.player,
            maybearg,
            label,
            url,
            method,
            words,
          )
        })
      }
      break
    case 'start':
      peerserver(!!message.data, false)
      break
    case 'tab':
      peerserver(!!message.data, true)
      break
    case 'tabopen':
      if (isstring(message.data)) {
        window.open(
          `${location.origin}/join/#${message.data}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      break
    case 'join':
      if (isstring(message.data)) {
        peerclient(message.data, message.player)
      }
      break
    case 'showjoincode':
      doasync(bridge, message.player, async () => {
        if (isarray(message.data)) {
          const [hidden, topic] = message.data as [boolean, string]
          const joinurl = `${location.origin}/join/#${topic}`
          const url = await shorturl(joinurl)
          if (hidden) {
            writecopyit(bridge, message.player, url, `secret join url`, false)
          } else {
            writecopyit(bridge, message.player, url, url)
          }
        }
      })
      break
    case 'talkstart':
      uservoicestart()
      break
    case 'talkstop':
      uservoicestop()
      break
    case 'mediastart':
      userscreenstart()
      break
    case 'mediastop':
      userscreenstop()
      break
    case 'chatstart':
      if (ispresent(twitchchatclient)) {
        api_error(bridge, message.player, 'bridge', 'chat is already started')
      } else if (isstring(message.data)) {
        write(bridge, message.player, `connecting to ${message.data}`)
        twitchchatclient = new ChatClient({ channels: [message.data] })
        twitchchatclient.connect()
        twitchchatclient.onConnect(() => {
          write(bridge, message.player, 'connected')
        })
        twitchchatclient.onDisconnect(() => {
          write(bridge, message.player, 'disconnected')
        })
        twitchchatclient.onMessage((_, user, text) => {
          vm_loader(
            bridge,
            message.player,
            undefined,
            'text',
            `chat:message:${message.data}`,
            `${user}:${text}`,
          )
        })
        twitchchatclient.onAction((_, user, text) => {
          vm_loader(
            bridge,
            message.player,
            undefined,
            'text',
            `chat:action:${message.data}`,
            `${user}:${text}`,
          )
        })
      }
      break
    case 'chatstop':
      if (ispresent(twitchchatclient)) {
        twitchchatclient.quit()
        twitchchatclient = undefined
        write(bridge, message.player, 'chat stopped')
      } else {
        api_error(bridge, message.player, 'bridge', 'chat is already stoped')
      }
      break
    case 'streamstart':
      doasync(bridge, message.player, async () => {
        if (ispresent(broadcastclient)) {
          api_error(bridge, message.player, 'bridge', 'stream is already open')
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
              write(bridge, message.player, state)
            } as Callback,
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ERROR,
            function (error: string) {
              api_error(bridge, message.player, 'bridge', error)
              broadcastclient = undefined
            } as Callback,
          )

          // pull visual content from canvas
          const video = document.querySelector('canvas')
          if (ispresent(video)) {
            await broadcastclient.addImageSource(video, 'video', { index: 1 })
          } else {
            api_error(
              bridge,
              message.player,
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
              bridge,
              message.player,
              'video',
              'unable create media audio node destination',
            )
            broadcastclient = undefined
            return
          }

          // signal success
          write(bridge, message.player, `created client`)
        }
        if (isstring(message.data) && ispresent(broadcastclient)) {
          writeheader(bridge, message.player, 'broadcasting in')
          writeoption(bridge, message.player, '3', '...')
          await waitfor(1000)
          writeoption(bridge, message.player, '2', '...')
          await waitfor(1000)
          writeoption(bridge, message.player, '1', '...')
          await waitfor(1000)
          writeheader(bridge, message.player, 'GOING LIVE')
          await broadcastclient.startBroadcast(
            message.data,
            'https://g.webrtc.live-video.net:4443',
          )
        }
      })
      break
    case 'streamstop':
      if (ispresent(broadcastclient)) {
        broadcastclient.stopBroadcast()
        broadcastclient.delete()
        broadcastclient = undefined
        write(bridge, message.player, `stream stopped`)
      } else {
        api_error(bridge, message.player, 'bridge', 'stream already stopped')
      }
      break
  }
})
