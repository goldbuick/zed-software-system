import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import {
  MAYBE_MAP,
  MAYBE_TEXT,
  MAYBE_ARRAY,
  MAYBE_NUMBER,
  MAYBE_STRING,
  getValues,
  getValueFromMap,
  setValueOnMap,
} from 'zss/system/device/shared'

export type { MAYBE_MAP, MAYBE_TEXT, MAYBE_ARRAY, MAYBE_NUMBER, MAYBE_STRING }

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
