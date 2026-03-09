import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { registercopy, vmcli, vmloader } from 'zss/device/api'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { parsezipfilelist } from 'zss/feature/parse/file'
import { parsemarkdownforscroll } from 'zss/feature/parse/markdownscroll'
import { romparse, romread, romscroll } from 'zss/feature/rom'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
} from 'zss/gadget/data/api'
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
import { memoryadminmenu } from 'zss/memory/utilities'
import { NAME } from 'zss/words/types'

import { lastinputtime } from '../state'

import { handleZztbridge } from './zzt'

export function handleDefault(vm: DEVICE, message: MESSAGE): void {
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
          for (let i = 0; i < pages.length; ++i) {
            const codepage = pages[i]
            const name = memoryreadcodepagename(codepage)
            const lines = codepage.code.split('\n').slice(0, 2)
            gadgethyperlink(
              message.player,
              'list',
              `@${name}$ltgrey ${lines[1] ?? ''}`,
              ['copyit', name],
            )
          }
          const shared = gadgetstate(message.player)
          shared.scrollname = 'object list'
          shared.scroll = gadgetcheckqueue(message.player)
          break
        }
        case 'terrainlistscroll': {
          const pages = memorylistcodepagewithtype(CODE_PAGE_TYPE.TERRAIN)
          for (let i = 0; i < pages.length; ++i) {
            const codepage = pages[i]
            const name = memoryreadcodepagename(codepage)
            const lines = codepage.code.split('\n').slice(0, 2)
            gadgethyperlink(
              message.player,
              'list',
              `@${name}$ltgrey ${lines[1] ?? ''}`,
              ['copyit', name],
            )
          }
          const shared = gadgetstate(message.player)
          shared.scrollname = 'terrain list'
          shared.scroll = gadgetcheckqueue(message.player)
          break
        }
        case 'charscroll': {
          gadgethyperlink(message.player, 'refscroll', 'char', [
            'char',
            'charedit',
          ])
          const shared = gadgetstate(message.player)
          shared.scrollname = 'chars'
          shared.scroll = gadgetcheckqueue(message.player)
          break
        }
        case 'colorscroll': {
          gadgethyperlink(message.player, 'refscroll', 'color', [
            'color',
            'coloredit',
          ])
          const shared = gadgetstate(message.player)
          shared.scrollname = 'colors'
          shared.scroll = gadgetcheckqueue(message.player)
          break
        }
        case 'bgscroll': {
          gadgethyperlink(message.player, 'refscroll', 'bg', ['bg', 'bgedit'])
          const shared = gadgetstate(message.player)
          shared.scrollname = 'bgs'
          shared.scroll = gadgetcheckqueue(message.player)
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
              parsemarkdownforscroll(message.player, markdowntext)
            } else {
              romparse(romread(`refscroll:${path}`), (line) =>
                romscroll(message.player, line),
              )
            }
            const shared = gadgetstate(message.player)
            shared.scrollname = path
            shared.scroll = gadgetcheckqueue(message.player)
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
      handleZztbridge(vm, message)
      break
    case 'zipfilelist':
      doasync(vm, message.player, async () => {
        await parsezipfilelist(message.player)
      })
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
