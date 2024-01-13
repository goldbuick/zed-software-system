import { useEffect, useState } from 'react'
import {
  MAYBE_MAP,
  MAYBE_TEXT,
  MAYBE_ARRAY,
  MAYBE_NUMBER,
  MAYBE_STRING,
  observeSharedValue,
  checkSharedValue,
  observeSharedType,
} from 'zss/system/device/shared'

export type { MAYBE_MAP, MAYBE_TEXT, MAYBE_ARRAY, MAYBE_NUMBER, MAYBE_STRING }

export function useSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const [value, setvalue] = useState<T | undefined>(undefined)

  function updatevalue(newvalue: Exclude<T, undefined>) {
    checkSharedValue(guid, key, newvalue)
  }

  useEffect(() => observeSharedValue<T>(guid, key, setvalue), [])

  return [value, updatevalue]
}

export function useSharedType<T extends MAYBE_MAP | MAYBE_TEXT | MAYBE_ARRAY>(
  guid: string,
  key: string,
): [T | undefined] {
  const [value, setvalue] = useState<T | undefined>(undefined)
  const [t, toggle] = useState(0)

  useEffect(() =>
    observeSharedType(guid, key, (type) => {
      if (type !== undefined && value === undefined) {
        // @ts-expect-error why?????
        setvalue(type)
      } else {
        toggle(1 - t)
      }
    }),
  )

  return [value]
}
