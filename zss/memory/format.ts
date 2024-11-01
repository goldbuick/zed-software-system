import bin from 'typed-binary'

import { BOARD_SIZE } from './types'

export enum FORMAT_TYPE {
  BYTE,
  INT,
  FLOAT,
  STRING,
  // dynamic arrays
  BYTELIST,
  INTLIST,
  FLOATLIST,
  STRINGLIST,
  // dynamic array of entries
  ENTRYLIST, // dynamic array
  // fixed array of entries
  ENTRYBUCKET,
}

export const FORMAT_ENTRY = bin.keyed('formatentry', (formatentry) =>
  bin.generic(
    {
      key: bin.byte,
    },
    {
      [FORMAT_TYPE.BYTE]: bin.object({
        value: bin.byte,
      }),
      [FORMAT_TYPE.INT]: bin.object({
        value: bin.i32,
      }),
      [FORMAT_TYPE.FLOAT]: bin.object({
        value: bin.f32,
      }),
      [FORMAT_TYPE.STRING]: bin.object({
        value: bin.string,
      }),
      [FORMAT_TYPE.BYTELIST]: bin.object({
        value: bin.dynamicArrayOf(bin.byte),
      }),
      [FORMAT_TYPE.INTLIST]: bin.object({
        value: bin.dynamicArrayOf(bin.i32),
      }),
      [FORMAT_TYPE.FLOATLIST]: bin.object({
        value: bin.dynamicArrayOf(bin.f32),
      }),
      [FORMAT_TYPE.STRINGLIST]: bin.object({
        value: bin.dynamicArrayOf(bin.string),
      }),
      [FORMAT_TYPE.ENTRYLIST]: bin.object({
        value: bin.dynamicArrayOf(formatentry),
      }),
      [FORMAT_TYPE.ENTRYBUCKET]: bin.object({
        value: bin.arrayOf(formatentry, BOARD_SIZE),
      }),
    },
  ),
)

export type FORMAT_ENTRY = bin.Parsed<typeof FORMAT_ENTRY>

export function formatbyte(key: number, value: number): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.BYTE,
    key,
    value,
  }
}

export function formatint(key: number, value: number): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.INT,
    key,
    value,
  }
}

export function formatfloat(key: number, value: number): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.FLOAT,
    key,
    value,
  }
}

export function formatstring(key: number, value: string): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.STRING,
    key,
    value,
  }
}

export function formatbytelist(key: number, value: number[]): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.BYTELIST,
    key,
    value,
  }
}

export function formatintlist(key: number, value: number[]): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.INTLIST,
    key,
    value,
  }
}

export function formatfloatlist(key: number, value: number[]): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.FLOATLIST,
    key,
    value,
  }
}

export function formatstringlist(key: number, value: string[]): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.STRINGLIST,
    key,
    value,
  }
}

export function formatentrylist(
  key: number,
  value: FORMAT_ENTRY[],
): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.ENTRYLIST,
    key,
    value,
  }
}

export function formatentrybucket(
  key: number,
  value: FORMAT_ENTRY[],
): FORMAT_ENTRY {
  return {
    type: FORMAT_TYPE.ENTRYBUCKET,
    key,
    value,
  }
}

// // convert to binary
// const binbook = new ArrayBuffer(BIN_BOOK.measure(exportedbook).size)
// const writer = new bin.BufferWriter(binbook)
// BIN_BOOK.write(writer, exportedbook)

// // uncompress book
// const binbook = await file.async('arraybuffer')
// // read binary
// const reader = new bin.BufferReader(binbook)
// // convert back to json
// const book = importbook(BIN_BOOK.read(reader))
