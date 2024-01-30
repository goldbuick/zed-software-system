import { useEffect, useState } from 'react'
import {
  MAYBE_MAP,
  MAYBE_TEXT,
  MAYBE_ARRAY,
  MAYBE_NUMBER,
  MAYBE_STRING,
  updateSharedValue,
  joinSharedType,
  joinSharedValue,
} from '../../system/device/shared'

export type { MAYBE_MAP, MAYBE_TEXT, MAYBE_ARRAY, MAYBE_NUMBER, MAYBE_STRING }

export function useSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const [value, setvalue] = useState<T | undefined>(undefined)

  function updatevalue(newvalue: Exclude<T, undefined>) {
    updateSharedValue(guid, key, newvalue)
  }

  useEffect(() => joinSharedValue<T>(guid, key, setvalue), [])

  return [value, updatevalue]
}

export function useSharedType<T extends MAYBE_MAP | MAYBE_TEXT | MAYBE_ARRAY>(
  guid: string,
  key: string,
): [T | undefined] {
  const [value, setvalue] = useState<T | undefined>(undefined)
  const [t, toggle] = useState(0)

  useEffect(
    () =>
      joinSharedType(guid, key, (type) => {
        if (type !== undefined && value === undefined) {
          // @ts-expect-error why?????
          setvalue(type)
        } else {
          toggle(1 - t)
        }
      }),
    [],
  )

  return [value]
}
