import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apitoast,
  vmbookmarkscroll,
  vmclearscroll,
  vmeditorbookmarkscroll,
} from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { modemreadtextsync } from 'zss/device/modem'
import { syncterminalbookmarkpins } from 'zss/device/register/helpers/bootstrap'
import { registerreadplayer } from 'zss/device/registerplayer'
import {
  runbookmarkcopytogame,
  runbookmarkurlnavigate,
} from 'zss/device/runbookmark'
import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  appendeditorbookmark,
  appendterminalbookmark,
  appendurlbookmark,
  readbookmarksfromstorage,
  removebookmarkbyid,
  runterminalbookmarkclibyid,
} from 'zss/feature/bookmarks'
import { paneladdress } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'

export function handlebookmarkscroll(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const blob = await readbookmarksfromstorage()
    vmbookmarkscroll(
      device,
      registerreadplayer(),
      blob.url,
      message.data ? blob.editor : [],
    )
  })
}

export function handleeditorbookmarkscroll(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [codepagename, codepagepath] = message.data
      if (isstring(codepagename) && isarray(codepagepath)) {
        const blob = await readbookmarksfromstorage()
        vmeditorbookmarkscroll(
          device,
          registerreadplayer(),
          blob.editor,
          codepagename,
          codepagepath,
        )
      }
    }
  })
}

export function handlebookmarkclisave(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const line = message.data
    if (!isstring(line) || !line.trim()) {
      apitoast(device, registerreadplayer(), 'nothing to bookmark')
      return
    }
    await appendterminalbookmark(line)
    await syncterminalbookmarkpins()
    apitoast(device, registerreadplayer(), `bookmarked $green${line}`)
    vmclearscroll(device, registerreadplayer())
  })
}

export function handlebookmarkclirun(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    let pinid: MAYBE<string>
    if (isarray(message.data)) {
      const arr = message.data as unknown[]
      const last = arr[arr.length - 1]
      if (isstring(last)) {
        pinid = last
      }
    } else if (isstring(message.data)) {
      pinid = message.data
    }
    if (!pinid) {
      return
    }
    await runterminalbookmarkclibyid(device, registerreadplayer(), pinid)
  })
}

export function handlebookmarkcodepagesave(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [type, title, codepage] = message.data
      if (isstring(type) && isstring(title) && ispresent(codepage)) {
        await appendeditorbookmark({
          type,
          title,
          codepage,
        })
        apitoast(device, registerreadplayer(), `bookmarked $green${title}`)
        vmclearscroll(device, registerreadplayer())
      }
    }
  })
}

export function handlebookmarkcodepagecopytogame(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isstring(message.data)) {
      await runbookmarkcopytogame(device, registerreadplayer(), message.data)
      vmclearscroll(device, registerreadplayer())
    }
  })
}

export function handlebookmarkurlsave(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const addr = paneladdress(BOOKMARK_SCROLL_CHIP, BOOKMARK_NAME_TARGET)
    const rawname = modemreadtextsync(addr).trim()
    if (!rawname.length) {
      apitoast(device, registerreadplayer(), 'enter a bookmark name first')
      return
    }
    await appendurlbookmark(rawname, location.href)
    apitoast(device, registerreadplayer(), `bookmarked $green${rawname}`)
    vmclearscroll(device, registerreadplayer())
  })
}

export function handlebookmarkurlnavigate(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isstring(message.data)) {
      await runbookmarkurlnavigate(device, registerreadplayer(), message.data)
      vmclearscroll(device, registerreadplayer())
    }
  })
}

export function handlebookmarkdelete(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const id = message.data
    if (!isstring(id)) {
      return
    }
    const ok = await removebookmarkbyid(id)
    if (ok) {
      apitoast(device, registerreadplayer(), 'bookmark removed')
      await syncterminalbookmarkpins()
      vmclearscroll(device, registerreadplayer())
    }
  })
}
