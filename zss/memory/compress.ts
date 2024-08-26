import { fromBase64, toBase64 } from '@smithy/util-base64'
import { gzipSync, gunzipSync } from 'fflate'
import * as bin from 'typed-binary'

import { BOOK } from './book'

const binword = bin.keyed('bin-word', (binword) =>
  bin.generic(
    {},
    {
      wordnumber: bin.object({
        value: bin.i32,
      }),
      wordstring: bin.object({
        value: bin.string,
      }),
      wordarray: bin.object({
        value: bin.dynamicArrayOf(binword),
      }),
    },
  ),
)

const binwordentry = bin.keyed('bin-word-entry', (binwordentry) =>
  bin.generic(
    {
      name: bin.string,
    },
    {
      wordnumber: bin.object({
        value: bin.i32,
      }),
      wordstring: bin.object({
        value: bin.string,
      }),
      wordarray: bin.object({
        value: bin.dynamicArrayOf(binwordentry),
      }),
    },
  ),
)

const binelement = bin.object({
  // this element is an instance of an element type
  kind: bin.optional(bin.string),
  // objects only
  id: bin.optional(bin.string),
  x: bin.optional(bin.byte),
  y: bin.optional(bin.byte),
  lx: bin.optional(bin.byte),
  ly: bin.optional(bin.byte),
  code: bin.optional(bin.string),
  // this is a unique name for this instance
  name: bin.optional(bin.string),
  // display
  char: bin.optional(bin.byte),
  color: bin.optional(bin.byte),
  bg: bin.optional(bin.byte),
  // interaction
  pushable: bin.optional(bin.bool),
  collision: bin.optional(bin.byte),
  destructible: bin.optional(bin.bool),
  // custom
  stats: bin.optional(
    bin.object({
      p1: bin.optional(binword),
      p2: bin.optional(binword),
      p3: bin.optional(binword),
      cycle: bin.optional(binword),
      stepx: bin.optional(binword),
      stepy: bin.optional(binword),
      player: bin.optional(binword),
      sender: bin.optional(binword),
      inputmove: bin.optional(binword),
      inputalt: bin.optional(binword),
      inputctrl: bin.optional(binword),
      inputshift: bin.optional(binword),
      inputok: bin.optional(binword),
      inputcancel: bin.optional(binword),
      inputmenu: bin.optional(binword),
      data: bin.optional(binword),
      custom: bin.optional(bin.dynamicArrayOf(binwordentry)),
    }),
  ),
})

const binbitmap = bin.object({
  id: bin.string,
  width: bin.u32,
  height: bin.u32,
  size: bin.u32,
  bits: bin.dynamicArrayOf(bin.byte),
})

const binbook = bin.object({
  id: bin.string,
  name: bin.string,
  tags: bin.dynamicArrayOf(bin.string),
  flags: bin.dynamicArrayOf(
    bin.object({
      player: bin.string,
      values: bin.dynamicArrayOf(binwordentry),
    }),
  ),
  players: bin.dynamicArrayOf(
    bin.object({
      player: bin.string,
      board: bin.string,
    }),
  ),
  pages: bin.dynamicArrayOf(
    bin.object({
      // all pages have id, code, and tags
      id: bin.string,
      code: bin.string,
      tags: bin.dynamicArrayOf(bin.string),
      // content data
      board: bin.optional(
        bin.object({
          id: bin.string,
          // dimensions
          x: bin.optional(bin.byte),
          y: bin.optional(bin.byte),
          width: bin.optional(bin.byte),
          height: bin.optional(bin.byte),
          // specifics
          terrain: bin.dynamicArrayOf(binelement),
          objects: bin.dynamicArrayOf(binelement),
          // custom
          stats: bin.optional(bin.dynamicArrayOf(binwordentry)),
        }),
      ),
      object: bin.optional(binelement),
      terrain: bin.optional(binelement),
      charset: bin.optional(binbitmap),
      palette: bin.optional(binbitmap),
      eighttrack: bin.optional(
        bin.object({
          id: bin.string,
          sequences: bin.dynamicArrayOf(
            bin.object({
              patterns: bin.dynamicArrayOf(
                bin.object({
                  tracks: bin.dynamicArrayOf(bin.string),
                }),
              ),
            }),
          ),
        }),
      ),
      // common parsed values
      stats: bin.optional(
        bin.object({
          type: bin.optional(bin.byte),
          name: bin.optional(bin.string),
          // custom
          custom: bin.optional(bin.dynamicArrayOf(binwordentry)),
        }),
      ),
    }),
  ),
})

const binbooks = bin.dynamicArrayOf(binbook)

// Type alias for ease-of-use
export type BIN_BOOKS = bin.Parsed<typeof binbooks>

export function compressbooks(books: BOOK[]): string {
  try {
    const mappedbooks = books.map((book) => ({
      ...book,
      //
    }))
    const buffer = new ArrayBuffer(binbooks.measure(mappedbooks).size)
    const writer = new bin.BufferWriter(buffer)
    binbooks.write(writer, mappedbooks)
    const bytes = gunzipSync(new Uint8Array(buffer))
    return toBase64(bytes)
  } catch (err) {
    console.error(err)
    return ''
  }
}

// import json into book
export function decompressbooks(base64bytes: string): BOOK[] {
  try {
    const bytes = fromBase64(base64bytes)
    const reader = new bin.BufferReader(bytes.buffer)
    const mappedbooks = binbooks.read(reader)
    console.info(mappedbooks)
    return []
  } catch (err) {
    console.error(err)
    return []
  }
}
