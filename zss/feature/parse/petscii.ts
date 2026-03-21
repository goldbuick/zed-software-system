/**
 * PETSCII screen import: 40×25 bytes (C64 screen RAM order, left→right, top→bottom).
 * Placed on the first engine board column 0–39; rows 0–24. See ModdingWiki PETSCII.
 */

import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { memorywriteterrain } from 'zss/memory/boardoperations'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

const PETSCII_COLS = 40
const PETSCII_ROWS = 25
const PETSCII_BYTES = PETSCII_COLS * PETSCII_ROWS

/** Map PETSCII screen code to Unicode display char (subset; unmapped → block). */
function petsciitodisplaychar(code: number): string {
  const c = code & 0xff
  if (c >= 0x20 && c <= 0x5f) {
    return String.fromCharCode(c)
  }
  if (c >= 0xa0 && c <= 0xff) {
    return String.fromCharCode(c - 0x40)
  }
  if (c < 0x20) {
    const ctrl = [
      '@',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
      '[',
      '\\',
      ']',
      '^',
      '-',
      ' ',
    ]
    return ctrl[c] ?? '\u2592'
  }
  return '\u2592'
}

export function parsepetscii(
  player: string,
  filename: string,
  content: Uint8Array,
) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }

  const cells = new Uint8Array(PETSCII_BYTES)
  const n = Math.min(content.length, PETSCII_BYTES)
  cells.set(content.subarray(0, n))

  const title = filename.replace(/\.[^.]+$/i, '') || 'petscii'
  const code = `@board ${title}\n@petscii\n`
  const codepage = memorycreatecodepage(code, {})
  memorywritecodepage(contentbook, codepage)
  const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
  if (!ispresent(board)) {
    apitoast(SOFTWARE, player, 'could not create board for PETSCII')
    return
  }

  let i = 0
  for (let y = 0; y < PETSCII_ROWS; ++y) {
    for (let x = 0; x < PETSCII_COLS; ++x) {
      const ch = petsciitodisplaychar(cells[i])
      const char = ch.codePointAt(0) ?? 0x20
      memorywriteterrain(board, {
        x,
        y,
        kind: 'fake',
        char,
        color: 7,
        bg: 0,
      })
      ++i
    }
  }

  apitoast(
    SOFTWARE,
    player,
    `imported PETSCII ${title} into ${contentbook.name} book`,
  )
}
