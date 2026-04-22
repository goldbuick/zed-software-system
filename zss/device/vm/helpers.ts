import { DEVICELIKE, registerforkmem, registersavemem } from 'zss/device/api'
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

import { memorysyncadmitboardrunner } from './memorysimsync'

export const ZZT_BRIDGE = `$176$176$177$177$178 ZZT BRIDGE $178$177$177$176$176`

export function boardrunnersendsnapshot(
  player: string,
  boardaddress: string,
): void {
  memorysyncadmitboardrunner(player, boardaddress)
}

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
