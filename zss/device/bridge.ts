import IVSBroadcastClient, { Callback } from 'amazon-ivs-web-broadcast'
import { objectFromEntries } from 'ts-extras'
import { createdevice } from 'zss/device'
import { createblueskyfeedconnector } from 'zss/device/bridge/blueskyfeedconnector'
import type { CHAT_CONNECTOR } from 'zss/device/bridge/chatconnector'
import {
  ALL_CHAT_KINDS,
  CHAT_KIND,
  normalizechatkind,
  parsechatstartpayload,
} from 'zss/device/bridge/chattypes'
import { createmastodonfeedconnector } from 'zss/device/bridge/mastodonfeedconnector'
import { createrssfeedconnector } from 'zss/device/bridge/rssfeedconnector'
import { createtwitchchatconnector } from 'zss/device/bridge/twitchchatconnector'
import type { TWITCH_CHAT_HANDLERS } from 'zss/device/bridge/twitchchatconnector'
import { withclipboard } from 'zss/feature/keyboard'
import {
  netterminalhost,
  netterminaljoin,
  readsubscribetopic,
} from 'zss/feature/netterminal'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { write, writecopyit } from 'zss/feature/writeui'
import {
  zssheaderlines,
  zssoptionline,
  zsstexttablelines,
  zsstexttape,
} from 'zss/feature/zsstextui'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import {
  apierror,
  apilog,
  bridgeshowjoincode,
  bridgetabopen,
  vmloader,
} from './api'
import { registerreadplayer } from './register'
import { SOFTWARE } from './session'
import { synthbroadcastdestination } from './synth'

const chatslots = new Map<CHAT_KIND, CHAT_CONNECTOR>()
let broadcastclient: MAYBE<IVSBroadcastClient.AmazonIVSBroadcastClient>
let broadcastivsconnection = 'idle'
let broadcastlive = false

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
      // apilog(SOFTWARE, player, JSON.stringify(content))
      vmloader(SOFTWARE, player, arg, 'text', eventname, content)
      break
    }
    case 'application/json': {
      const content = await response.json()
      // apilog(SOFTWARE, player, JSON.stringify(content))
      vmloader(SOFTWARE, player, arg, 'json', eventname, content)
      break
    }
    case 'application/octet-stream': {
      const content = await response.arrayBuffer()
      vmloader(
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

function isbridgeheadless() {
  return (
    typeof (window as any).__nodeStorageReadContent === 'function' ||
    typeof (window as any).__nodeStorageReadPlayer === 'function'
  )
}

function joinurlread() {
  const isHeadless = isbridgeheadless()
  const base = isHeadless ? 'https://zed.cafe' : location.origin
  const joinurl = `${base}/join/#${readsubscribetopic()}`
  // also copy joinurl
  const clipboard = withclipboard()
  if (ispresent(clipboard)) {
    clipboard.writeText(joinurl).catch((err) => console.error(err))
  }
  if (isHeadless) {
    const writenode = (
      window as unknown as {
        __nodeWriteJoinUrl?: (u: string) => Promise<void>
      }
    ).__nodeWriteJoinUrl
    if (typeof writenode === 'function') {
      void writenode(joinurl).catch((err) => console.error(err))
    }
  }
  return joinurl
}

function pushchatline(
  player: string,
  routekey: string,
  mode: 'message' | 'action',
  user: string,
  text: string,
) {
  const prefix = mode === 'action' ? 'chat:action' : 'chat:message'
  vmloader(
    bridge,
    player,
    undefined,
    'text',
    `${prefix}:${routekey}`,
    `${user}:${text}`,
  )
}

function makechathandlers(player: string): TWITCH_CHAT_HANDLERS {
  return {
    onconnect: (routekey) => {
      apilog(bridge, player, 'chat connected')
      vmloader(
        bridge,
        player,
        undefined,
        'text',
        `chat:connect:${routekey}`,
        '',
      )
    },
    ondisconnect: (routekey) => {
      apilog(bridge, player, 'chat disconnected')
      vmloader(
        bridge,
        player,
        undefined,
        'text',
        `chat:disconnect:${routekey}`,
        '',
      )
    },
    onmessage: (routekey, mode, user, text) =>
      pushchatline(player, routekey, mode, user, text),
    onerror: (msg) => apierror(bridge, player, 'bridge', msg),
  }
}

function feedpollintervalms(sec: number | undefined) {
  const s =
    typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? sec : 120
  return Math.max(30_000, Math.min(3_600_000, Math.floor(s * 1000)))
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
      doasync(bridge, message.player, async () => {
        await netterminalhost()
        // show join code
        bridgeshowjoincode(SOFTWARE, message.player, !!message.data)
      })
      break
    case 'tab':
      doasync(bridge, message.player, async () => {
        await netterminalhost()
        // open a join tab
        bridgetabopen(SOFTWARE, message.player)
      })
      break
    case 'tabopen': {
      const joinurl = joinurlread()
      window.open(joinurl, '_blank', 'noopener,noreferrer')
      break
    }
    case 'join':
      if (isstring(message.data)) {
        netterminaljoin(message.data)
      }
      break
    case 'showjoincode': {
      const joinurl = joinurlread()
      if (message.data) {
        writecopyit(bridge, message.player, joinurl, `secret join url`, false)
      } else {
        writecopyit(bridge, message.player, joinurl, joinurl)
      }
      break
    }
    case 'chatstart': {
      const parsed = parsechatstartpayload(message.data)
      if (!parsed) {
        apierror(
          bridge,
          message.player,
          'bridge',
          'invalid bridge chat start (need twitch channel string or { kind, routekey, … })',
        )
        break
      }
      const prev = chatslots.get(parsed.kind)
      if (ispresent(prev)) {
        apilog(
          bridge,
          message.player,
          `replacing ${parsed.kind} chat connector`,
        )
        prev.disconnect()
        chatslots.delete(parsed.kind)
      }
      if (parsed.kind === CHAT_KIND.TWITCH) {
        const channel = parsed.channel?.trim() ?? parsed.routekey
        apilog(
          bridge,
          message.player,
          `twitch chat starting routekey=${parsed.routekey} channel=${channel}`,
        )
        chatslots.set(
          CHAT_KIND.TWITCH,
          createtwitchchatconnector(
            parsed.routekey,
            channel,
            makechathandlers(message.player),
          ),
        )
        break
      }
      if (parsed.kind === CHAT_KIND.RSS) {
        const feedurl = parsed.feedurl?.trim() ?? ''
        if (!feedurl) {
          apierror(
            bridge,
            message.player,
            'bridge',
            'rss needs feedurl (browser fetch; URL must allow CORS or be same-origin)',
          )
          break
        }
        let feedok = false
        try {
          new URL(feedurl)
          feedok = true
        } catch {
          feedok = false
        }
        if (!feedok) {
          apierror(bridge, message.player, 'bridge', 'rss feedurl is invalid')
          break
        }
        const pollms = feedpollintervalms(parsed.pollintervalsec)
        apilog(
          bridge,
          message.player,
          `rss feed starting routekey=${parsed.routekey} pollMs=${pollms}`,
        )
        chatslots.set(
          CHAT_KIND.RSS,
          createrssfeedconnector({
            routekey: parsed.routekey,
            feedurl,
            pollintervalms: pollms,
            handlers: makechathandlers(message.player),
          }),
        )
        break
      }
      if (parsed.kind === CHAT_KIND.MASTODON) {
        const instance = parsed.mastodoninstance?.trim() ?? ''
        const account = parsed.mastodonaccount?.trim() ?? ''
        const hashtag = parsed.mastodonhashtag?.trim() ?? ''
        if (!instance || (!account && !hashtag)) {
          apierror(
            bridge,
            message.player,
            'bridge',
            'mastodon needs mastodoninstance and mastodonaccount or mastodonhashtag',
          )
          break
        }
        const pollms = feedpollintervalms(parsed.pollintervalsec)
        apilog(
          bridge,
          message.player,
          `mastodon feed starting routekey=${parsed.routekey} pollMs=${pollms}`,
        )
        chatslots.set(
          CHAT_KIND.MASTODON,
          createmastodonfeedconnector({
            routekey: parsed.routekey,
            instanceorigin: instance,
            hashtag,
            account,
            accesstoken: parsed.mastodontoken,
            pollintervalms: pollms,
            handlers: makechathandlers(message.player),
          }),
        )
        break
      }
      if (parsed.kind === CHAT_KIND.BLUESKY) {
        const handle = parsed.blueskyhandle?.trim() ?? ''
        if (!handle) {
          apierror(
            bridge,
            message.player,
            'bridge',
            'bluesky needs blueskyhandle',
          )
          break
        }
        const feeduri = parsed.blueskyfeeduri?.trim() ?? ''
        if (feeduri && !feeduri.startsWith('at://')) {
          apierror(
            bridge,
            message.player,
            'bridge',
            'blueskyfeeduri must be an at:// URI',
          )
          break
        }
        const pollms = feedpollintervalms(parsed.pollintervalsec)
        apilog(
          bridge,
          message.player,
          `bluesky feed starting routekey=${parsed.routekey} pollMs=${pollms}`,
        )
        chatslots.set(
          CHAT_KIND.BLUESKY,
          createblueskyfeedconnector({
            routekey: parsed.routekey,
            handle,
            feeduri: feeduri !== '' ? feeduri : undefined,
            pollintervalms: pollms,
            handlers: makechathandlers(message.player),
          }),
        )
        break
      }
      break
    }
    case 'chatstop': {
      const kind = normalizechatkind(String(message.data ?? ''))
      if (!kind) {
        apierror(
          bridge,
          message.player,
          'bridge',
          'bridge chat stop requires kind: twitch, rss, mastodon, bluesky',
        )
        break
      }
      const conn = chatslots.get(kind)
      if (!ispresent(conn)) {
        apierror(
          bridge,
          message.player,
          'bridge',
          `chat is already stopped for ${kind}`,
        )
        break
      }
      conn.disconnect()
      chatslots.delete(kind)
      apilog(bridge, message.player, `${kind} chat stopped`)
      break
    }
    case 'chatlist': {
      const rows: string[][] = []
      for (let i = 0; i < ALL_CHAT_KINDS.length; ++i) {
        const k = ALL_CHAT_KINDS[i]
        const slot = chatslots.get(k)
        if (ispresent(slot)) {
          const s = slot.describestatus()
          rows.push([
            k,
            '$GREENconnected',
            s.routekey,
            s.phase ?? '',
            s.detail ?? '',
          ])
        } else {
          rows.push([k, '$GRAYidle', '', '', ''])
        }
      }
      terminalwritelines(
        bridge,
        message.player,
        zsstexttape(
          zssheaderlines('chat connections'),
          zsstexttablelines(rows, [
            'kind',
            'state',
            'routekey',
            'phase',
            'detail',
          ]),
        ),
      )
      break
    }
    case 'streamstart':
      doasync(bridge, message.player, async () => {
        if (ispresent(broadcastclient)) {
          apierror(bridge, message.player, 'bridge', 'stream is already open')
        } else {
          broadcastivsconnection = 'starting'
          broadcastlive = false
          const isportrait = window.innerHeight > window.innerWidth
          const streamconfig = isportrait
            ? IVSBroadcastClient.STANDARD_PORTRAIT
            : IVSBroadcastClient.STANDARD_LANDSCAPE
          broadcastclient = IVSBroadcastClient.create({
            streamConfig: streamconfig,
          })

          // event handlers
          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ACTIVE_STATE_CHANGE,
            // @ts-expect-error wow?
            function (activestate: boolean) {
              broadcastlive = activestate
              console.info({ activestate })
            },
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.CONNECTION_STATE_CHANGE,
            function (state: string) {
              broadcastivsconnection = state
              apilog(bridge, message.player, state)
            } as Callback,
          )

          broadcastclient.on(
            IVSBroadcastClient.BroadcastClientEvents.ERROR,
            function (error: string) {
              broadcastivsconnection = 'error'
              broadcastlive = false
              apierror(bridge, message.player, 'bridge', error)
              broadcastclient = undefined
            } as Callback,
          )

          // pull visual content from canvas
          const video = document.querySelector('canvas')
          if (ispresent(video)) {
            await broadcastclient.addImageSource(video, 'video', { index: 1 })
          } else {
            apierror(
              bridge,
              message.player,
              'video',
              'unabled to find canvas element',
            )
            broadcastclient = undefined
            broadcastivsconnection = 'idle'
            broadcastlive = false
            return
          }

          // pull audio content from tonejs
          const audio = synthbroadcastdestination()
          if (ispresent(audio)) {
            await broadcastclient.addAudioInputDevice(audio.stream, 'audio')
          } else {
            apierror(
              bridge,
              message.player,
              'video',
              'unable create media audio node destination',
            )
            broadcastclient = undefined
            broadcastivsconnection = 'idle'
            broadcastlive = false
            return
          }

          // signal success
          apilog(bridge, message.player, `created client`)
        }
        if (isstring(message.data) && ispresent(broadcastclient)) {
          for (const line of zssheaderlines('broadcasting in')) {
            write(bridge, message.player, line)
          }
          write(bridge, message.player, zssoptionline('3', '...'))
          await waitfor(1000)
          write(bridge, message.player, zssoptionline('2', '...'))
          await waitfor(1000)
          write(bridge, message.player, zssoptionline('1', '...'))
          await waitfor(1000)
          for (const line of zssheaderlines('GOING LIVE')) {
            write(bridge, message.player, line)
          }
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
        broadcastivsconnection = 'idle'
        broadcastlive = false
        apilog(bridge, message.player, `stream stopped`)
      } else {
        apierror(bridge, message.player, 'bridge', 'stream already stopped')
      }
      break
  }
})
