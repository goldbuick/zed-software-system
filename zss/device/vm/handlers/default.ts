import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import {
  bridgemediapanel,
  bridgequeuepanel,
  registercopy,
  vmcli,
  vmloader,
  vmplayermovetoboard,
} from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { lastinputtime } from 'zss/device/vm/state'
import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import {
  mediapayloadwithmanage,
  mediarequiremanageonvm,
} from 'zss/feature/mediaqueue/mediaguards'
import { parsezipfilelist } from 'zss/feature/parse/file'
import { scrollwritemarkdownlines } from 'zss/feature/parse/markdownscroll'
import { zsstextline, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { gadgetstate } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { memorylistcodepagewithtype } from 'zss/memory/codepages'
import { memorysendtoboards } from 'zss/memory/gamesend'
import { memoryinspectcommand } from 'zss/memory/inspection'
import { memoryinspectbatchcommand } from 'zss/memory/inspectionbatch'
import { memoryfindany } from 'zss/memory/inspectionfind'
import type { FINDANY_CONFIG } from 'zss/memory/inspectionfind'
import { memorymakeitcommand } from 'zss/memory/inspectionmakeit'
import { memoryinspectremixcommand } from 'zss/memory/inspectionremix'
import {
  memoryreadbookplayerboards,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memorymessagechip } from 'zss/memory/runtime'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { memoryadminmenu } from 'zss/memory/utilities'
import { NAME } from 'zss/words/types'

import { handlebookmarkscrollpanel } from './bookmarkscroll'
import { handleeditorbookmarkscrollpanel } from './editorbookmarkscroll'
import { handleimageimport } from './imageimport'
import { handlezztbridge } from './zzt'

const MAIN_MENU_BACK_HYPERLINK = zsszedlinkline(
  'menu hk b " B " next',
  '$ltgreyBack to main menu',
)

export function handledefault(vm: DEVICE, message: MESSAGE): void {
  const { target, path } = parsetarget(message.target.replace('chip:', ''))
  switch (NAME(target)) {
    case 'adminop': {
      switch (path) {
        case 'dev':
          vmcli(vm, message.player, '#dev')
          break
        case 'gadget':
          vmcli(vm, message.player, '#gadget')
          break
        case 'joincode':
          vmcli(vm, message.player, '#joincode')
          break
      }
      break
    }
    case 'admingoto': {
      const playerboard = memoryreadplayerboard(path)
      const playerelement = memoryreadobject(playerboard, path)
      if (ispresent(playerboard) && ispresent(playerelement)) {
        const dest = {
          x: playerelement.x ?? 0,
          y: playerelement.y ?? 0,
        }
        vmplayermovetoboard(
          SOFTWARE,
          message.player,
          message.player,
          playerboard.id,
          dest,
        )
      }
      break
    }
    case 'refscroll':
      switch (path) {
        case 'adminscroll':
          memoryadminmenu(message.player, lastinputtime)
          break
        case 'objectlistscroll': {
          const pages = memorylistcodepagewithtype(CODE_PAGE_TYPE.OBJECT)
          const rows: string[] = []
          for (let i = 0; i < pages.length; ++i) {
            const codepage = pages[i]
            const name = memoryreadcodepagename(codepage)
            const codelines = codepage.code.split('\n').slice(0, 2)
            const label = `@${name}$ltgrey ${codelines[1] ?? ''}`
            rows.push(zsszedlinkline(`istargetless copyit ${name}`, label))
          }
          rows.push(MAIN_MENU_BACK_HYPERLINK)
          scrollwritelines(
            message.player,
            'object list',
            zsstexttape(rows).trim(),
            'list',
          )
          break
        }
        case 'terrainlistscroll': {
          const pages = memorylistcodepagewithtype(CODE_PAGE_TYPE.TERRAIN)
          const rows: string[] = []
          for (let i = 0; i < pages.length; ++i) {
            const codepage = pages[i]
            const name = memoryreadcodepagename(codepage)
            const codelines = codepage.code.split('\n').slice(0, 2)
            const label = `@${name}$ltgrey ${codelines[1] ?? ''}`
            rows.push(zsszedlinkline(`istargetless copyit ${name}`, label))
          }
          rows.push(MAIN_MENU_BACK_HYPERLINK)
          scrollwritelines(
            message.player,
            'terrain list',
            zsstexttape(rows).trim(),
            'list',
          )
          break
        }
        default: {
          doasync(vm, message.player, async () => {
            scrollwritelines(
              message.player,
              '$7$7$7 please wait',
              'loading $7$7$7',
              'refscroll',
            )
            const markdowntext = await fetchrefscrolltext(path)
            if (!markdowntext.trim()) {
              scrollwritelines(
                message.player,
                path,
                zsstexttape(
                  zsstextline(`$red doc not found`),
                  zsstextline(`$white${path}`),
                ),
                'refscroll',
              )
            } else {
              scrollwritemarkdownlines(message.player, markdowntext, path)
            }
            const shared = gadgetstate(message.player)
            shared.scrollname = path
          })
          break
        }
      }
      break
    case 'batch':
      doasync(vm, message.player, async () => {
        await memoryinspectbatchcommand(path, message.player)
      })
      break
    case 'remix':
      doasync(vm, message.player, async () => {
        await memoryinspectremixcommand(path, message.player)
      })
      break
    case 'empty': {
      const empty = parsetarget(path)
      switch (empty.target) {
        case 'copycoords':
          registercopy(vm, message.player, empty.path.split(',').join(' '))
          break
      }
      break
    }
    case 'inspect':
      memoryinspectcommand(path, message.player)
      break
    case 'gadget':
      if (isarray(message.data)) {
        const [id, area] = message.data as [string, string]
        vmloader(vm, message.player, undefined, 'text', id, area)
      }
      break
    case 'findany':
      doasync(vm, message.player, async () => {
        await memoryfindany(path as keyof FINDANY_CONFIG, message.player)
      })
      break
    case 'makeit':
      memorymakeitcommand(path, message.data ?? '', message.player)
      break
    case 'zztbridge':
      handlezztbridge(vm, message)
      break
    case 'zipfilelist':
      doasync(vm, message.player, async () => {
        await parsezipfilelist(message.player)
      })
      break
    case 'imageimport':
      doasync(vm, message.player, async () => {
        await handleimageimport(vm, message, path)
      })
      break
    case 'editorbookmarkscroll':
      handleeditorbookmarkscrollpanel(vm, message, path)
      break
    case 'bookmarkscroll':
      handlebookmarkscrollpanel(vm, message, path)
      break
    case 'media': {
      const payload =
        message.data && typeof message.data === 'object'
          ? (message.data as Record<string, unknown>)
          : undefined
      bridgemediapanel(
        SOFTWARE,
        message.player,
        path,
        mediapayloadwithmanage(message.player, payload),
      )
      break
    }
    case 'queue': {
      const managepaths = new Set([
        'menu',
        'bind',
        'skip',
        'clear',
        'stop',
        'limit',
      ])
      if (
        managepaths.has(path) &&
        !mediarequiremanageonvm(message.player, 'queue')
      ) {
        break
      }
      if (path === 'bind') {
        const board = memoryreadplayerboard(message.player)
        const payload = (message.data ?? {}) as Record<string, unknown>
        bridgequeuepanel(SOFTWARE, message.player, path, {
          ...mediapayloadwithmanage(message.player, payload),
          boardid: board?.id ?? payload.boardid ?? '',
          boardname: board?.name ?? payload.boardname ?? '',
        })
      } else {
        const payload =
          message.data && typeof message.data === 'object'
            ? (message.data as Record<string, unknown>)
            : undefined
        bridgequeuepanel(
          SOFTWARE,
          message.player,
          path,
          mediapayloadwithmanage(message.player, payload),
        )
      }
      break
    }
    default: {
      // expect that the chip: prefix is already removed from the path
      if (NAME(target) === 'self' || !path) {
        message.target = target.replace('self:', '')
        memorymessagechip(message)
      } else {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const boards = memoryreadbookplayerboards(mainbook)
        memorysendtoboards(message.player, target, path, boards)
      }
      break
    }
  }
}
