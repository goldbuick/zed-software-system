import {
  compress as compressJson,
  Compressed,
  decompress as decompressJson,
} from 'compress-json'
import deepmerge from 'deepmerge'
import { fromUint8Array, toUint8Array } from 'js-base64'
import { EncoderFull, Decoder } from 'json-joy/esm/json-pack'
import { nanoid } from 'nanoid'

const msgEncode = new EncoderFull()
const msgDecode = new Decoder()

export function setKey<T>(object: Record<string, T>, key: string, value: T) {
  return {
    ...object,
    [key]: value,
  }
}

export function removeKey<T>(object: Record<string, T>, key: string) {
  const updated = {
    ...object,
  }
  delete updated[key]
  return updated
}

export function applyToKey<T extends Record<string, any>>(
  object: T,
  key: string,
  props: Record<string, any>,
): T {
  const value = object[key]
  return {
    ...object,
    [key]: {
      ...value,
      ...props,
    },
  }
}

const combineMerge = (
  target: any[],
  source: any[],
  options: deepmerge.Options,
) => {
  const destination = target.slice()

  source.forEach((item, index) => {
    if (typeof destination[index] === 'undefined') {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
    } else if (options.isMergeableObject?.(item)) {
      destination[index] = deepmerge(target[index], item, options)
    } else if (target.indexOf(item) === -1) {
      destination.push(item)
    }
  })

  return destination
}

export function deepMerge(objects: Record<string, unknown>[]) {
  return deepmerge.all(objects, {
    arrayMerge: combineMerge,
  })
}

export function uniqueKey(object: Record<string, unknown>, size: number) {
  let key
  do {
    key = nanoid(size)
  } while (object[key])
  return key
}

export function objectToHash(data: any) {
  const buffer = msgEncode.encode(compressJson(data))
  return fromUint8Array(buffer)
}

export function hashToObject(data: string) {
  try {
    const buffer = toUint8Array(data)
    const compressed = msgDecode.decode(buffer) as Compressed
    return decompressJson(compressed) as any
  } catch (err) {
    return null
  }
}
