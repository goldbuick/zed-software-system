import { createrecentmessageids } from 'zss/device/recentmessageids'
import type { MESSAGE } from 'zss/device/types'
import { ismessage } from 'zss/device/types'

import { DEVICE, createmessage, parsetarget } from './device'
import { runtickbatched } from './gadget/runtickbatched'
import { NAME } from './words/types'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

export type HUB = {
  emit: (
    session: string,
    player: string,
    sender: string,
    target: string,
    data?: any,
  ) => void
  invoke: (message: MESSAGE) => void
  /** Deliver to local devices only; skip BroadcastChannel. For non-cloneable handles only. */
  invokelocal: (message: MESSAGE) => void
  join: (session: string) => void
  leave: () => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

const devices = new Set<DEVICE>()
const recentids = createrecentmessageids()

let channel: BroadcastChannel | undefined
let joinedsession = ''

function hubchannelname(session: string): string {
  return `zss:${session}`
}

function hubshouldbroadcastsession(message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  const itarget = NAME(target)
  return itarget === NAME('sessionreset') || itarget === NAME('ready')
}

function devicemessagedelivers(device: DEVICE, message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  const itarget = NAME(target)
  const itopics = device.topics().map((t) => NAME(t))
  const topicmatch =
    itopics.findIndex((tag) => tag === NAME('all') || tag === itarget) !== -1
  const iname = NAME(device.name())
  const direct =
    device.id() === target || NAME('all') === itarget || iname === itarget
  return topicmatch || direct
}

/** Tick / clock messages: batch React updates from Zustand subscribers. */
function isgameticktarget(message: MESSAGE): boolean {
  const { target, path } = parsetarget(message.target)
  const leaf = path.length > 0 ? path : target
  return leaf === 'ticktock' || leaf === 'second'
}

function shouldpublishonchannel(message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  return NAME(target) !== NAME('ticktock')
}

function deliverlocal(message: MESSAGE): void {
  if (hubshouldbroadcastsession(message)) {
    devices.forEach((device) => device.handle(message))
    return
  }
  devices.forEach((device) => {
    if (devicemessagedelivers(device, message)) {
      device.handle(message)
    }
  })
}

function invokeinternal(message: MESSAGE, publish: boolean): void {
  if (recentids.has(message.id)) {
    return
  }
  recentids.add(message.id)

  const deliver = () => deliverlocal(message)
  if (isgameticktarget(message)) {
    runtickbatched(deliver)
  } else {
    deliver()
  }

  if (publish && channel && shouldpublishonchannel(message)) {
    channel.postMessage(message)
  }
}

function onchannelmessage(event: MessageEvent): void {
  const data = event.data
  if (!ismessage(data)) {
    return
  }
  invokeinternal(data, false)
}

export const hub: HUB = {
  emit(session, player, sender, target, data) {
    hub.invoke(createmessage(session, player, sender, target, data))
  },
  invoke(message) {
    invokeinternal(message, true)
  },
  invokelocal(message) {
    invokeinternal(message, false)
  },
  join(session) {
    if (!session) {
      return
    }
    if (channel && joinedsession === session) {
      return
    }
    hub.leave()
    joinedsession = session
    channel = new BroadcastChannel(hubchannelname(session))
    channel.onmessage = onchannelmessage
  },
  leave() {
    if (channel) {
      channel.close()
      channel = undefined
    }
    joinedsession = ''
    recentids.clear()
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
}
