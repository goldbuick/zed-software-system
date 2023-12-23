import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
// import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'

import { createDevice } from './device'

export type MAYBE_MAP = Y.Map<any> | undefined
export type MAYBE_TEXT = Y.Text | undefined
export type MAYBE_ARRAY = Y.Array<any> | undefined
export type MAYBE_NUMBER = number | undefined
export type MAYBE_STRING = string | undefined

const docs: Record<string, Y.Doc> = {}

const shareddevice = createDevice('shared', [], (message) => {
  switch (message.target) {
    case 'think':
      break
  }
})

function getvalues(guid: string) {
  if (!docs[guid]) {
    docs[guid] = new Y.Doc({ guid })
  }

  return docs[guid].getMap()
}

export type UNOBSERVE_FUNC = () => void

export function updateShared<T>(guid: string, key: string, value: T) {
  const values = getvalues(guid)
  const current = values.get(key) as T | undefined
  if (current !== value) {
    values.set(key, value)
  }
}

export function observeShared<T>(
  guid: string,
  key: string,
  handler: (value: T | undefined) => void,
): UNOBSERVE_FUNC {
  const values = getvalues(guid)

  function observehandler(events: Y.YEvent<any>[]) {
    const list = events as Y.YMapEvent<any>[]
    for (let i = 0; i < list.length; ++i) {
      if (list[i].keysChanged.has(key)) {
        handler(values.get(key) as T | undefined)
      }
    }
  }

  values.observeDeep(observehandler)
  queueMicrotask(() => handler(values.get(key) as T | undefined))

  return () => {
    values.unobserveDeep(observehandler)
  }
}

export function useShared<T>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const values = getvalues(guid)

  const [value, setvalue] = useState<T | undefined>(
    values.get(key) as T | undefined,
  )

  useEffect(() => {
    function observehandler(events: Y.YEvent<any>[]) {
      const list = events as Y.YMapEvent<any>[]
      for (let i = 0; i < list.length; ++i) {
        if (list[i].keysChanged.has(key)) {
          setvalue(values.get(key) as T | undefined)
        }
      }
    }

    values.observeDeep(observehandler)
    return () => {
      values.unobserveDeep(observehandler)
    }
  }, [])

  function updatevalue(newvalue: Exclude<T, undefined>) {
    values.set(key, newvalue)
  }

  return [value, updatevalue]
}
