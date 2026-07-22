import type { DEVICE } from 'zss/device'
import { apierror, workstatus } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { itchiopublish } from 'zss/feature/itchiopublish'
import {
  contenttohashfragment,
  storagenukecontent,
  storagewritecontent,
} from 'zss/feature/storage'
import { isjoin, shorturl, znsset } from 'zss/feature/url'
import { write } from 'zss/feature/writeui'
import {
  zssheaderlines,
  zssoptionline,
  zsstextline,
} from 'zss/feature/zsstextui'
import { waitfor } from 'zss/mapping/tick'
import { isarray, isbook, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

export function handlenuke(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async function () {
    for (const line of zssheaderlines('nuke in')) {
      write(device, message.player, line)
    }
    write(device, message.player, zssoptionline('3', '...'))
    await waitfor(1000)
    write(device, message.player, zssoptionline('2', '...'))
    await waitfor(1000)
    write(device, message.player, zssoptionline('1', '...'))
    await waitfor(1000)
    for (const line of zssheaderlines('BYE')) {
      write(device, message.player, line)
    }
    await waitfor(100)
    storagenukecontent(message.player)
  })
}

export function handlesavemem(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async function () {
    if (isarray(message.data)) {
      const [maybelabel, maybecontent, maybebooks] = message.data
      if (
        isstring(maybelabel) &&
        isstring(maybecontent) &&
        isarray(maybebooks) &&
        maybebooks.every(isbook)
      ) {
        await storagewritecontent(
          message.player,
          maybelabel,
          maybecontent,
          maybecontent,
          maybebooks,
        )
      }
    }
  })
}

export function handleforkmem(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async function () {
    if (isarray(message.data)) {
      const [maybecontent, maybeaddress] = message.data
      if (isstring(maybecontent) && isstring(maybeaddress)) {
        const fragment = await contenttohashfragment(maybecontent)
        const url = maybeaddress
          ? `https://${maybeaddress}/#${fragment}`
          : isjoin()
            ? `${location.origin}/#${fragment}`
            : location.href.replace(/#.*/, `#${fragment}`)
        window.open(url, '_blank')
      }
    }
  })
}

export function handlepublishmem(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [method] = message.data
      switch (NAME(method)) {
        case 'itchio': {
          const [, key, content] = message.data
          if (isstring(key) && isstring(content)) {
            workstatus(device, message.player, `publishing ${key}`)
            await itchiopublish(key, content)
            write(
              device,
              message.player,
              zsstextline(
                `$green${key} has been exported for upload to itch.io`,
              ),
            )
          }
          break
        }
        case 'zns': {
          const [, znsemail, znstoken, key, content] = message.data
          if (
            isstring(znsemail) &&
            isstring(znstoken) &&
            isstring(key) &&
            isstring(content)
          ) {
            workstatus(device, message.player, `publishing ${key}`)
            const result = await znsset(znsemail, znstoken, key, content)
            if (result.success) {
              write(
                device,
                message.player,
                zsstextline(`$green${key} has been published to zns`),
              )
            }
          }
          break
        }
        case 'zns-bytes': {
          const [, znsemail, znstoken, key, content] = message.data
          if (
            isstring(znsemail) &&
            isstring(znstoken) &&
            isstring(key) &&
            isstring(content)
          ) {
            workstatus(device, message.player, `publishing ${key}`)
            const shareurl = new URL(location.href)
            shareurl.hash = content
            const short = await shorturl(shareurl.href)
            const result = await znsset(znsemail, znstoken, key, short)
            if (result.success) {
              write(
                device,
                message.player,
                zsstextline(`$green${key} has been published to zns ${short}`),
              )
            }
          }
          break
        }
        default:
          apierror(
            device,
            message.player,
            'publish',
            `unknown publish method ${method}`,
          )
          break
      }
    }
  })
}
