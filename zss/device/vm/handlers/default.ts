import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { registercopy, vmcli, vmloader } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { parsezipfilelist } from 'zss/feature/parse/file'
import {
  applyzedscroll,
  parsemarkdownforscroll,
} from 'zss/feature/parse/markdownscroll'
import { gadgetstate } from 'zss/gadget/data/api'
import { scrolllinkescapefrag } from 'zss/gadget/data/scrollwritelines'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
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
  memorymoveplayertoboard,
  memoryreadbookplayerboards,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memorymessagechip } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { memorynotestransposescroll } from 'zss/memory/notestransposescroll'
import { memoryadminmenu } from 'zss/memory/utilities'
import { romread } from 'zss/rom'
import { NAME } from 'zss/words/types'

import { handlebookmarkscrollpanel } from './bookmarkscroll'
import { handleeditorbookmarkscrollpanel } from './editorbookmarkscroll'
import { handlezztbridge } from './zzt'

export function handledefault(vm: DEVICE, message: MESSAGE): void {
  const { target, path } = parsetarget(message.target)
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
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      const playerboard = memoryreadplayerboard(path)
      const playerelement = memoryreadobject(playerboard, path)
      if (ispresent(playerboard) && ispresent(playerelement)) {
        const dest = {
          x: playerelement.x ?? 0,
          y: playerelement.y ?? 0,
        }
        memorymoveplayertoboard(mainbook, message.player, playerboard.id, dest)
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
            const escname = scrolllinkescapefrag(name)
            rows.push(
              `!istargetless copyit ${escname};${scrolllinkescapefrag(label)}`,
            )
          }
          applyzedscroll(message.player, rows.join('\n'), 'object list', 'list')
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
            const escname = scrolllinkescapefrag(name)
            rows.push(
              `!istargetless copyit ${escname};${scrolllinkescapefrag(label)}`,
            )
          }
          applyzedscroll(
            message.player,
            rows.join('\n'),
            'terrain list',
            'list',
          )
          break
        }
        case 'charscroll': {
          applyzedscroll(
            message.player,
            '!char charedit;char',
            'chars',
            'refscroll',
          )
          break
        }
        case 'colorscroll': {
          applyzedscroll(
            message.player,
            '!color coloredit;color',
            'colors',
            'refscroll',
          )
          break
        }
        case 'bgscroll': {
          applyzedscroll(message.player, '!bg bgedit;bg', 'bgs', 'refscroll')
          break
        }
        case 'transposescroll': {
          memorynotestransposescroll(message.player)
          break
        }
        default: {
          doasync(vm, message.player, async () => {
            const content = romread(`refscroll:${path}`)
            if (!ispresent(content)) {
              const shared = gadgetstate(message.player)
              shared.scrollname = '$7$7$7 please wait'
              shared.scroll = ['loading $7$7$7']
              const markdowntext = await fetchwiki(path)
              parsemarkdownforscroll(message.player, markdowntext, path)
            } else {
              parsemarkdownforscroll(message.player, content, path)
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
          registercopy(
            vm,
            memoryreadoperator(),
            empty.path.split(',').join(' '),
          )
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
    case 'editorbookmarkscroll':
      handleeditorbookmarkscrollpanel(vm, message, path)
      break
    case 'bookmarkscroll':
      handlebookmarkscrollpanel(vm, message, path)
      break
    default: {
      const invoke = parsetarget(path)
      if (NAME(invoke.target) === 'self' || !invoke.path) {
        message.target = message.target.replace('self:', '')
        memorymessagechip(message)
      } else {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        memorysendtoboards(
          invoke.target,
          invoke.path,
          undefined,
          memoryreadbookplayerboards(mainbook),
        )
      }
      break
    }
  }
}
