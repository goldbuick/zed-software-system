import {
  registerbookmarkcontentsave,
  registerforkmem,
  registersavemem,
  workstatus,
} from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import { MOSTLY_ZZT_META, museumofzztscreenshoturl } from 'zss/feature/url'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
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

function localcalendardate(d = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function savestate(vm: DEVICELIKE, autosave?: boolean) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const operator = memoryreadoperator()
    workstatus(vm, operator, 'compress url')
    const compressed = await memorycompressbooks(books)
    const historylabel = `${autosave ? 'autosave ' : ''}${new Date().toISOString()} ${mainbook.name} ${compressed.length} chars`
    registersavemem(vm, operator, historylabel, compressed, books)
  }
}

/** Non-operator personal save: compress host books into a URL bookmark on the requester. */
export async function savebookmarkstate(vm: DEVICELIKE, player: string) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    workstatus(vm, player, 'compress url')
    const compressed = await memorycompressbooks(books)
    const bookmarkname = `save of ${mainbook.name} on ${localcalendardate()}`
    registerbookmarkcontentsave(vm, player, bookmarkname, compressed)
  }
}

export async function forkstate(
  vm: DEVICELIKE,
  transfer: string,
  player?: string,
) {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (books.length && ispresent(mainbook)) {
    const target = player ?? memoryreadoperator()
    workstatus(vm, target, 'compress url')
    const content = await memorycompressbooks(books)
    registerforkmem(vm, target, content, transfer)
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
  scrollwritelines(
    player,
    ZZT_BRIDGE,
    `Searching ${'$6'.repeat(randominteger(1, 6))}`,
    'zztbridge',
  )
}

export function writezztcontentlinks(list: MOSTLY_ZZT_META[], player: string) {
  const parts: (string | string[])[] = []
  for (let i = 0; i < list.length; ++i) {
    const entry = list[i]
    const pubtag = `pub: ${new Date(entry.publish_date).toLocaleDateString()}`
    const block: string[] = []
    block.push(`$white${entry.title}`)
    block.push(`$yellow  ${entry.author.join(', ')}`)
    block.push(`$dkgreen  ${entry.genres.join(', ')}`)
    block.push(`$purple  ${pubtag}`)
    if (entry.screenshot) {
      const url = museumofzztscreenshoturl(entry.screenshot)
      block.push(zsszedlinkline(`istargetless viewit ${url}`, entry.screenshot))
    }
    const path = `${entry.letter}/${entry.filename}`
    // Panel rows are [chip, label, target, maybetype, ...args]. Without an explicit
    // maybetype, the path is misread as the widget type and never reaches message.data
    // (fetch becomes /zgames/undefined).
    block.push(zsszedlinkline(`zztimport hyperlink ${path}`, entry.filename))
    block.push(' ')
    parts.push(block)
  }
  scrollwritelines(player, ZZT_BRIDGE, zsstexttape(...parts), 'zztbridge')
}
