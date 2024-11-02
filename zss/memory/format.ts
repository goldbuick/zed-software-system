import bin from 'typed-binary'
import { api_error } from 'zss/device/api'
import { ispresent, MAYBE, MAYBE_NUMBER, MAYBE_STRING } from 'zss/mapping/types'

import { BOARD_SIZE } from './types'

export enum FORMAT_TYPE {
  // key-less values
  BYTE,
  INT,
  FLOAT,
  STRING,
  // entries
  ENTRYBYTE,
  ENTRYINT,
  ENTRYFLOAT,
  ENTRYSTRING,
  // dynamic arrays
  BYTELIST,
  INTLIST,
  FLOATLIST,
  STRINGLIST,
  // dynamic array of entries
  LIST, // dynamic array
  ENTRYLIST, // dynamic array
  // fixed array of entries
  ENTRYBUCKET,
  // user defined keys
  USERFLOAT,
  USERSTRING,
  USERLIST,
}

export const FORMAT_ENTRY = bin.keyed('FORMAT_ENTRY', (FORMAT_ENTRY) =>
  bin.generic(
    {},
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
      [FORMAT_TYPE.ENTRYBYTE]: bin.object({
        key: bin.byte,
        value: bin.byte,
      }),
      [FORMAT_TYPE.ENTRYINT]: bin.object({
        key: bin.byte,
        value: bin.i32,
      }),
      [FORMAT_TYPE.ENTRYFLOAT]: bin.object({
        key: bin.byte,
        value: bin.f32,
      }),
      [FORMAT_TYPE.ENTRYSTRING]: bin.object({
        key: bin.byte,
        value: bin.string,
      }),
      [FORMAT_TYPE.BYTELIST]: bin.object({
        key: bin.byte,
        value: bin.dynamicArrayOf(bin.byte),
      }),
      [FORMAT_TYPE.INTLIST]: bin.object({
        key: bin.byte,
        value: bin.dynamicArrayOf(bin.i32),
      }),
      [FORMAT_TYPE.FLOATLIST]: bin.object({
        key: bin.byte,
        value: bin.dynamicArrayOf(bin.f32),
      }),
      [FORMAT_TYPE.STRINGLIST]: bin.object({
        key: bin.byte,
        value: bin.dynamicArrayOf(bin.string),
      }),
      [FORMAT_TYPE.LIST]: bin.object({
        value: bin.dynamicArrayOf(FORMAT_ENTRY),
      }),
      [FORMAT_TYPE.ENTRYLIST]: bin.object({
        key: bin.byte,
        value: bin.dynamicArrayOf(FORMAT_ENTRY),
      }),
      [FORMAT_TYPE.ENTRYBUCKET]: bin.object({
        key: bin.byte,
        value: bin.arrayOf(FORMAT_ENTRY, BOARD_SIZE),
      }),
      [FORMAT_TYPE.USERFLOAT]: bin.object({
        name: bin.string,
        value: bin.f32,
      }),
      [FORMAT_TYPE.USERSTRING]: bin.object({
        name: bin.string,
        value: bin.string,
      }),
      [FORMAT_TYPE.USERLIST]: bin.object({
        name: bin.string,
        value: bin.dynamicArrayOf(FORMAT_ENTRY),
      }),
    },
  ),
)

export type FORMAT_ENTRY = bin.Parsed<typeof FORMAT_ENTRY>

export function formatbyte(value: MAYBE_NUMBER): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.BYTE,
    value,
  }
}

export function formatint(value: MAYBE_NUMBER): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.INT,
    value,
  }
}

export function formatfloat(value: MAYBE_NUMBER): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.FLOAT,
    value,
  }
}

export function formatstring(value: MAYBE_STRING): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.STRING,
    value,
  }
}

export function formatentrybyte(
  key: number,
  value: MAYBE_NUMBER,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYBYTE,
    key,
    value,
  }
}

export function formatentryint(
  key: number,
  value: MAYBE_NUMBER,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYINT,
    key,
    value,
  }
}

export function formatentryfloat(
  key: number,
  value: MAYBE_NUMBER,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYFLOAT,
    key,
    value,
  }
}

export function formatentrystring(
  key: number,
  value: MAYBE_STRING,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYSTRING,
    key,
    value,
  }
}

export function formatbytelist(
  key: number,
  value: MAYBE<MAYBE_NUMBER[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.BYTELIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatintlist(
  key: number,
  value: MAYBE<MAYBE_NUMBER[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.INTLIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatfloatlist(
  key: number,
  value: MAYBE<MAYBE_NUMBER[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.FLOATLIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatstringlist(
  key: number,
  value: MAYBE<MAYBE_STRING[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.STRINGLIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatlist(value: MAYBE<FORMAT_ENTRY>[]): MAYBE<FORMAT_ENTRY> {
  return {
    type: FORMAT_TYPE.LIST,
    value: value.filter(ispresent),
  }
}

export function makeentrylist(
  key: number,
  list: MAYBE<FORMAT_ENTRY>,
): MAYBE<FORMAT_ENTRY> {
  if (list?.type !== FORMAT_TYPE.LIST) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYLIST,
    key,
    value: list.value,
  }
}

export function formatentrylist(
  key: number,
  value: MAYBE<MAYBE<FORMAT_ENTRY>[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYLIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatentrybucket(
  key: number,
  value: MAYBE<MAYBE<FORMAT_ENTRY>[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.ENTRYBUCKET,
    key,
    value: value.filter(ispresent),
  }
}

export function formatuserfloat(
  name: string,
  value: MAYBE_NUMBER,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.USERFLOAT,
    name,
    value,
  }
}

export function formatuserstring(
  name: string,
  value: MAYBE_STRING,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.USERSTRING,
    name,
    value,
  }
}

export function formatuserlist(
  name: string,
  value: MAYBE<MAYBE<FORMAT_ENTRY>[]>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.USERLIST,
    name,
    value: value.filter(ispresent),
  }
}

// read / write helpers

export function packbinary(entry: FORMAT_ENTRY): MAYBE<ArrayBuffer> {
  try {
    // @ts-expect-error not sure why?
    const binaryentry = new ArrayBuffer(FORMAT_ENTRY.measure(entry).size)
    const writer = new bin.BufferWriter(binaryentry)
    // @ts-expect-error not sure why?
    FORMAT_ENTRY.write(writer, entry)
    return binaryentry
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackbinary(binary: ArrayBuffer): MAYBE<FORMAT_ENTRY> {
  try {
    const reader = new bin.BufferReader(binary)
    return FORMAT_ENTRY.read(reader)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackformatlist<T>(
  entry: MAYBE<FORMAT_ENTRY>,
  keymap: Record<number, string>,
): MAYBE<T> {
  if (entry?.type !== FORMAT_TYPE.LIST) {
    return
  }

  const obj: Record<string, any> = {}
  for (let i = 0; i < entry.value.length; ++i) {
    const value = entry.value[i]
    switch (value.type) {
      case FORMAT_TYPE.BYTELIST:
      case FORMAT_TYPE.INTLIST:
      case FORMAT_TYPE.FLOATLIST:
      case FORMAT_TYPE.STRINGLIST:
      case FORMAT_TYPE.ENTRYBYTE:
      case FORMAT_TYPE.ENTRYINT:
      case FORMAT_TYPE.ENTRYFLOAT:
      case FORMAT_TYPE.ENTRYSTRING:
      case FORMAT_TYPE.ENTRYLIST:
      case FORMAT_TYPE.ENTRYBUCKET:
        obj[keymap[value.key]] = value.value
        break
      case FORMAT_TYPE.USERFLOAT:
      case FORMAT_TYPE.USERSTRING:
      case FORMAT_TYPE.USERLIST:
        obj[value.name] = value.value
        break
    }
  }

  return obj as MAYBE<T>
}
