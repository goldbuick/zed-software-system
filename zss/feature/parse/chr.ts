import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { loadcharsetfrombytes } from 'zss/feature/bytes'
import {
  isfontmaniacom,
  resolvecharsetbytes,
} from './fontmania'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
  memoryreadcodepagename,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { BOOK, CODE_PAGE_TYPE } from 'zss/memory/types'

const WORLD_CHARSET_CODE = '@charset world'

/** Glyphs waiting for the next ZZT/SZT book when font arrives before any book exists. */
let pendingworldglyphs: MAYBE<Uint8Array>

export function charsetimportclearpendingworld() {
  pendingworldglyphs = undefined
}

export function charsetimporttakependingworld(): MAYBE<Uint8Array> {
  const glyphs = pendingworldglyphs
  pendingworldglyphs = undefined
  return glyphs
}

export function charsetimportstagependingworld(glyphs: Uint8Array) {
  pendingworldglyphs = glyphs.slice()
}

function charsetstemfromfilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.(chr|com)$/i, '')
    .replace(/[^a-z0-9_]+/g, '')
}

/**
 * Write glyph bytes as a charset codepage into book.
 * useworldname → @charset world (ZZT companion fonts).
 */
export function charsetimportwritebook(
  book: BOOK,
  glyphs: Uint8Array,
  opts: { useworldname: boolean; filename: string },
): MAYBE<string> {
  const charset = loadcharsetfrombytes(glyphs)
  if (!ispresent(charset)) {
    return undefined
  }
  const code = opts.useworldname
    ? WORLD_CHARSET_CODE
    : `@charset ${charsetstemfromfilename(opts.filename) || 'charset'}`
  const codepage = memorycreatecodepage(code, {})
  const codepagecharset =
    memoryreadcodepagedata<CODE_PAGE_TYPE.CHARSET>(codepage)
  if (!ispresent(codepagecharset)) {
    return undefined
  }
  Object.assign(codepagecharset, charset)
  memorywritecodepage(book, codepage)
  return memoryreadcodepagename(codepage)
}

export function parsechr(
  player: string,
  filename: string,
  content: Uint8Array,
) {
  const glyphs = resolvecharsetbytes(content)
  if (!ispresent(glyphs)) {
    apitoast(SOFTWARE, player, `unable to read charset from ${filename}`)
    return
  }
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }
  const name = charsetimportwritebook(contentbook, glyphs, {
    useworldname: false,
    filename,
  })
  if (!ispresent(name)) {
    apitoast(SOFTWARE, player, `unable to import charset ${filename}`)
    return
  }
  apitoast(
    SOFTWARE,
    player,
    `imported chr file ${name} into ${contentbook.name} book`,
  )
}

/**
 * Font Mania .com (or raw .chr-sized blob named .com) → @charset world.
 * If a ZZT book is not ready yet, stage glyphs for parsezzt/parseszt.
 */
export function parsefontcom(
  player: string,
  filename: string,
  content: Uint8Array,
  targetbook?: BOOK,
) {
  if (isfontmaniacom(content)) {
    const glyphs = resolvecharsetbytes(content)
    if (!ispresent(glyphs)) {
      apitoast(
        SOFTWARE,
        player,
        `font mania ${filename}: need 8x14 glyphs (height 14)`,
      )
      return
    }
    applyworldcharset(player, filename, glyphs, targetbook)
    return
  }
  const glyphs = resolvecharsetbytes(content)
  if (!ispresent(glyphs)) {
    apitoast(SOFTWARE, player, `not a font mania or raw charset: ${filename}`)
    return
  }
  applyworldcharset(player, filename, glyphs, targetbook)
}

function applyworldcharset(
  player: string,
  filename: string,
  glyphs: Uint8Array,
  targetbook?: BOOK,
) {
  const book = targetbook ?? memoryreadfirstcontentbook()
  if (!ispresent(book)) {
    charsetimportstagependingworld(glyphs)
    apitoast(
      SOFTWARE,
      player,
      `staged world charset from ${filename} for next zzt import`,
    )
    return
  }
  const name = charsetimportwritebook(book, glyphs, {
    useworldname: true,
    filename,
  })
  if (!ispresent(name)) {
    apitoast(SOFTWARE, player, `unable to import charset ${filename}`)
    return
  }
  apitoast(
    SOFTWARE,
    player,
    `imported world charset from ${filename} into ${book.name} book`,
  )
}

/** Attach staged or provided world glyphs onto a freshly imported ZZT book. */
export function charsetimportattachworldtobook(
  player: string,
  book: BOOK,
  filename = 'world',
) {
  const glyphs = charsetimporttakependingworld()
  if (!ispresent(glyphs)) {
    return
  }
  const name = charsetimportwritebook(book, glyphs, {
    useworldname: true,
    filename,
  })
  if (ispresent(name)) {
    apitoast(
      SOFTWARE,
      player,
      `attached world charset to ${book.name} book`,
    )
  }
}
