import { useEffect, useState } from 'react'
import {
  MODEM_SHARED_TYPE,
  type PresenceState,
  type SharedTextHandle,
  getpresenceforcodepage,
  modempeekvalueforkey,
  modemroothaskey,
  modemsubscribeawarenesschange,
  modemsubscribesyncupdate,
} from 'zss/device/modem'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

type SHARED_TYPE_MAP = {
  [MODEM_SHARED_TYPE.NUMBER]: number
  [MODEM_SHARED_TYPE.STRING]: SharedTextHandle
}

function useWaitForValue<T extends MODEM_SHARED_TYPE>(
  key: string,
  type: T,
): MAYBE<SHARED_TYPE_MAP[T]> {
  const [, settoggle] = useState(0)
  useEffect(() => {
    const handler = () => settoggle((s) => 1 - s)
    return modemsubscribesyncupdate(handler)
  }, [])

  try {
    if (!modemroothaskey(key)) {
      return undefined
    }
    const val = modempeekvalueforkey(key)
    if (val === undefined) {
      return undefined
    }

    if (type === MODEM_SHARED_TYPE.NUMBER) {
      return (typeof val === 'number' ? val : undefined) as MAYBE<
        SHARED_TYPE_MAP[T]
      >
    }
    if (type === MODEM_SHARED_TYPE.STRING) {
      return (
        val && typeof (val as SharedTextHandle).toJSON === 'function'
          ? val
          : undefined
      ) as MAYBE<SHARED_TYPE_MAP[T]>
    }
  } catch {
    // mid-mutation
  }
  return undefined
}

export function useWaitForValueNumber(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.NUMBER>(
    key,
    MODEM_SHARED_TYPE.NUMBER,
  )
  if (!isnumber(value)) {
    return undefined
  }
  return value
}

export function useWaitForValueString(key: string) {
  const value = useWaitForValue<MODEM_SHARED_TYPE.STRING>(
    key,
    MODEM_SHARED_TYPE.STRING,
  )
  if (!ispresent(value) || typeof value?.toJSON !== 'function') {
    return undefined
  }
  return value
}

/** Hook to observe presence for a codepage */
export function usePresence(codepageKey: string | undefined): PresenceState[] {
  const [presence, setPresence] = useState<PresenceState[]>([])

  useEffect(() => {
    if (!codepageKey) {
      setPresence([])
      return
    }
    const update = () => setPresence(getpresenceforcodepage(codepageKey))
    update()
    return modemsubscribeawarenesschange(update)
  }, [codepageKey])

  return presence
}
