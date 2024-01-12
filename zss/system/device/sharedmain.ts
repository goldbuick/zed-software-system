import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { useEffect, useState } from 'react'
import * as syncprotocol from 'y-protocols/sync'
import * as Y from 'yjs'
import { createDevice } from 'zss/network/device'

import { MAYBE_NUMBER, MAYBE_STRING } from '../shared'

// react hooks

export function useSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const values = getValues(guid, true)
  const [value, setvalue] = useState<T | undefined>(
    getValueFromMap<T>(values, key),
  )

  useEffect(() => {
    function observehandler(event: Y.YMapEvent<any>) {
      if (event.keysChanged.has(key)) {
        const v = getValueFromMap<T>(values, key)
        setvalue(v)
      }
    }

    values.observe(observehandler)
    return () => {
      values.unobserve(observehandler)
    }
  }, [])

  function updatevalue(newvalue: Exclude<T, undefined>) {
    setValueOnMap(values, key, newvalue)
  }

  return [value, updatevalue]
}

export function useSharedType<T>(guid: string, key: string): [T] {
  const values = getValues(guid, true)
  const type = values.get(key) as T
  const [t, toggle] = useState(0)

  useEffect(() => {
    function observehandler() {
      toggle(1 - t)
    }

    // @ts-expect-error will figure out how to type this later
    type?.observeDeep(observehandler)
    return () => {
      // @ts-expect-error will figure out how to type this later
      type?.unobserveDeep(observehandler)
    }
  }, [])

  return [values.get(key) as T]
}
