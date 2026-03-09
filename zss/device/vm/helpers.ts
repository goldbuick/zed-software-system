import { DEVICELIKE, registerforkmem, registersavemem } from 'zss/device/api'
import { MOSTLY_ZZT_META, museumofzztscreenshoturl } from 'zss/feature/url'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { randominteger } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memorycompressbooks } from 'zss/memory/utilities'

export const ZZT_BRIDGE = `$176$176$177$177$178 ZZT BRIDGE $178$177$177$176$176`

export async function savestate(vm: DEVICELIKE, autosave?: boolean) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const compressed = await memorycompressbooks(books)
    const historylabel = `${autosave ? 'autosave ' : ''}${new Date().toISOString()} ${mainbook.name} ${compressed.length} chars`
    registersavemem(vm, memoryreadoperator(), historylabel, compressed, books)
  }
}

export async function forkstate(vm: DEVICELIKE, transfer: string) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const content = await memorycompressbooks(books)
    registerforkmem(vm, memoryreadoperator(), content, transfer)
  }
}

export async function compressedbookstate(): Promise<string> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    return await memorycompressbooks(books)
  }
  return ''
}

export function writezztcontentwait(player: string) {
  gadgettext(player, `Searching ${'$6'.repeat(randominteger(1, 6))}`)
  const shared = gadgetstate(player)
  shared.scrollname = ZZT_BRIDGE
  shared.scroll = gadgetcheckqueue(player)
}

export function writezztcontentlinks(list: MOSTLY_ZZT_META[], player: string) {
  for (let i = 0; i < list.length; ++i) {
    const entry = list[i]
    const pubtag = `pub: ${new Date(entry.publish_date).toLocaleDateString()}`
    gadgettext(player, `$white${entry.title}`)
    gadgettext(player, `$yellow  ${entry.author.join(', ')}`)
    gadgettext(player, `$dkgreen  ${entry.genres.join(', ')}`)
    gadgettext(player, `$purple  ${pubtag}`)
    if (entry.screenshot) {
      gadgethyperlink(player, 'zztbridge', entry.screenshot, [
        'viewit',
        museumofzztscreenshoturl(entry.screenshot),
      ])
    }
    gadgethyperlink(player, 'zztbridge', entry.filename, [
      'zztimport',
      '',
      `${entry.letter}/${entry.filename}`,
    ])
    gadgettext(player, ' ')
  }
  const shared = gadgetstate(player)
  shared.scrollname = ZZT_BRIDGE
  shared.scroll = gadgetcheckqueue(player)
}
