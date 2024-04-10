import { useEffect, useState } from 'react'
import {
  MAYBE_SHARED_MAP,
  MAYBE_SHARED_TEXT,
  MAYBE_SHARED_ARRAY,
  updatesharedvalue,
  joinsharedtype,
  joinsharedvalue,
} from 'zss/device/shared'
import { MAYBE_NUMBER, MAYBE_STRING } from 'zss/mapping/types'

export type { MAYBE_SHARED_MAP, MAYBE_SHARED_TEXT, MAYBE_SHARED_ARRAY }

export function useSharedValue<T extends MAYBE_NUMBER | MAYBE_STRING>(
  guid: string,
  key: string,
): [T | undefined, (v: Exclude<T, undefined>) => void] {
  const [value, setvalue] = useState<T | undefined>(undefined)

  function updatevalue(newvalue: Exclude<T, undefined>) {
    updatesharedvalue(guid, key, newvalue)
  }

  useEffect(() => joinsharedvalue<T>(guid, key, setvalue), [])

  return [value, updatevalue]
}

export function useSharedType<
  T extends MAYBE_SHARED_MAP | MAYBE_SHARED_TEXT | MAYBE_SHARED_ARRAY,
>(guid: string, key: string): [T | undefined] {
  const [value, setvalue] = useState<T | undefined>(undefined)
  const [t, toggle] = useState(0)

  useEffect(
    () =>
      joinsharedtype(guid, key, (type) => {
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
